#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(process.cwd(), 'api-service/.env') });
const db = require('../config/db');
const walmartService = require('../src/services/walmartService');

/**
 * @fileoverview Walmart Order Pull (Corporate Model)
 * 
 * Cron job to pull new orders from Brakebee's Walmart Marketplace account.
 * Runs every 10 minutes.
 * 
 * Flow:
 * 1. Get released orders from Walmart API (Brakebee's account)
 * 2. Match products to our catalog
 * 3. Create walmart_orders (is_corporate=1, user_id=NULL)
 * 4. Create walmart_order_items with vendor_id for each line
 * 5. Acknowledge orders on Walmart
 * 6. Vendors see their items in dashboard and add tracking
 */

async function pullWalmartOrders() {
  console.log('[Walmart Orders] Starting order pull from Walmart (Corporate)...');
  console.log(`[Walmart Orders] Environment: ${process.env.WALMART_ENV || 'sandbox'}`);
  const startTime = Date.now();
  let newOrders = 0;
  let errorCount = 0;

  try {
    // Get released orders from Walmart
    const response = await walmartService.getReleasedOrders({ limit: 100 });
    
    const orders = response?.list?.elements?.order || [];
    console.log(`[Walmart Orders] Found ${orders.length} released orders`);

    if (orders.length === 0) {
      console.log('[Walmart Orders] No new orders');
      return { success: true, imported: 0, errors: 0 };
    }

    for (const walmartOrder of orders) {
      try {
        const purchaseOrderId = walmartOrder.purchaseOrderId;
        const walmartOrderId = walmartOrder.customerOrderId || purchaseOrderId;
        
        // Check if already imported
        const [existing] = await db.query(
          'SELECT id FROM walmart_orders WHERE walmart_order_id = ? OR walmart_purchase_order_id = ?',
          [walmartOrderId, purchaseOrderId]
        );
        
        if (existing.length > 0) {
          console.log(`[Walmart Orders] Order ${purchaseOrderId} already imported, skipping`);
          continue;
        }

        // Parse order lines and match to our products
        const orderLines = walmartOrder.orderLines?.orderLine || [];
        const orderItems = [];
        let orderTotal = 0;

        for (const line of orderLines) {
          const sku = line.item?.sku?.replace(/^BRK-/, '') || ''; // Remove our prefix
          
          // Find product in our catalog
          const [products] = await db.query(
            'SELECT id, vendor_id, price FROM products WHERE sku = ? AND status = "active"',
            [sku]
          );

          if (products.length === 0) {
            console.warn(`[Walmart Orders] SKU ${sku} not found in catalog`);
            continue;
          }

          const product = products[0];
          const quantity = parseInt(line.orderLineQuantity?.amount) || 1;
          const unitPrice = parseFloat(line.charges?.charge?.[0]?.chargeAmount?.amount) || product.price;
          const lineTotal = unitPrice * quantity;

          orderItems.push({
            product_id: product.id,
            vendor_id: product.vendor_id,
            sku: sku,
            quantity: quantity,
            unit_price: unitPrice,
            line_total: lineTotal,
            walmart_line_number: line.lineNumber
          });

          orderTotal += lineTotal;
        }

        if (orderItems.length === 0) {
          console.warn(`[Walmart Orders] No valid items in order ${purchaseOrderId}`);
          errorCount++;
          continue;
        }

        // Create walmart_order record (Corporate: user_id=NULL, is_corporate=1)
        const shippingAddress = walmartOrder.shippingInfo?.postalAddress || {};
        
        const [orderResult] = await db.query(`
          INSERT INTO walmart_orders (
            user_id,
            is_corporate,
            walmart_order_id,
            walmart_purchase_order_id,
            order_data,
            customer_email,
            customer_name,
            shipping_address,
            total_amount,
            currency,
            order_status,
            created_at
          ) VALUES (NULL, 1, ?, ?, ?, ?, ?, ?, ?, 'USD', 'created', NOW())
        `, [
          walmartOrderId,
          purchaseOrderId,
          JSON.stringify(walmartOrder),
          walmartOrder.shippingInfo?.email || null,
          shippingAddress.name || null,
          JSON.stringify(shippingAddress),
          orderTotal
        ]);

        const dbOrderId = orderResult.insertId;

        // Create order items with vendor routing
        for (const item of orderItems) {
          await db.query(`
            INSERT INTO walmart_order_items (
              walmart_order_id,
              product_id,
              vendor_id,
              sku,
              walmart_line_number,
              quantity,
              unit_price,
              line_total,
              status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
          `, [
            dbOrderId,
            item.product_id,
            item.vendor_id,
            item.sku,
            item.walmart_line_number,
            item.quantity,
            item.unit_price,
            item.line_total
          ]);
        }

        // Acknowledge order on Walmart
        try {
          await walmartService.acknowledgeOrder(purchaseOrderId);
          
          await db.query(
            'UPDATE walmart_orders SET order_status = ?, acknowledged_at = NOW() WHERE id = ?',
            ['acknowledged', dbOrderId]
          );
          
          console.log(`[Walmart Orders] ✅ Order ${purchaseOrderId} imported and acknowledged`);
        } catch (ackError) {
          console.warn(`[Walmart Orders] Order ${purchaseOrderId} imported but acknowledge failed:`, ackError.message);
        }

        newOrders++;

      } catch (orderError) {
        console.error(`[Walmart Orders] Error processing order:`, orderError.message);
        errorCount++;
      }
    }

    // Log sync
    await db.query(`
      INSERT INTO walmart_sync_logs 
      (user_id, sync_type, items_count, operation, status, started_at, completed_at, created_at)
      VALUES (NULL, 'order', ?, 'pull', 'success', ?, NOW(), NOW())
    `, [newOrders, new Date(startTime)]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Walmart Orders] Completed: ${newOrders} imported, ${errorCount} errors in ${duration}s`);

    return { success: true, imported: newOrders, errors: errorCount, duration };

  } catch (error) {
    console.error('[Walmart Orders] Fatal error:', error);
    return { success: false, error: error.message };
  }
}

// Run
pullWalmartOrders()
  .then(result => {
    console.log('[Walmart Orders] Done:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('[Walmart Orders] Uncaught error:', error);
    process.exit(1);
  });

