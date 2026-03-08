#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(process.cwd(), 'api-service/.env') });
const db = require('../config/db');
const wayfairService = require('../src/services/wayfairService');

/**
 * @fileoverview Wayfair Order Pull (Corporate Model)
 *
 * Cron job to pull new purchase orders from Brakebee's Wayfair supplier account.
 * Runs every 10 minutes.
 *
 * Flow:
 * 1. Get purchase orders from Wayfair GraphQL API
 * 2. Match line-item SKUs to our catalog
 * 3. Create wayfair_orders (is_corporate=1, user_id=NULL)
 * 4. Create wayfair_order_items with vendor_id for each line
 * 5. Accept orders on Wayfair
 * 6. Vendors see their items in dashboard and add tracking
 */

async function pullWayfairOrders() {
  console.log('[Wayfair Orders] Starting order pull from Wayfair (Corporate)...');
  console.log(`[Wayfair Orders] Environment: ${process.env.WAYFAIR_ENV || 'sandbox'}`);
  const startTime = Date.now();
  let newOrders = 0;
  let errorCount = 0;

  try {
    const response = await wayfairService.getPurchaseOrders({ limit: 100, status: 'open' });
    const orders = response?.getDropshipPurchaseOrders?.orders || [];
    console.log(`[Wayfair Orders] Found ${orders.length} purchase orders`);

    if (orders.length === 0) {
      console.log('[Wayfair Orders] No new orders');
      return { success: true, imported: 0, errors: 0 };
    }

    for (const wayfairOrder of orders) {
      try {
        const poNumber = wayfairOrder.poNumber;

        const [existing] = await db.query(
          'SELECT id FROM wayfair_orders WHERE wayfair_po_number = ?',
          [poNumber]
        );

        if (existing.length > 0) {
          continue;
        }

        const orderLines = wayfairOrder.items || [];
        const orderItems = [];
        let orderTotal = 0;

        for (const line of orderLines) {
          const sku = (line.sku || '').replace(/^WAYFAIR-/, '');

          const [products] = await db.query(
            `SELECT p.id, p.vendor_id, p.price, p.name
             FROM products p
             JOIN wayfair_corporate_products wcp ON p.id = wcp.product_id
             WHERE (wcp.wayfair_sku = ? OR wcp.wayfair_sku = ?) AND p.status = 'active'
             LIMIT 1`,
            [line.sku, `WAYFAIR-${sku}`]
          );

          if (products.length === 0) {
            console.warn(`[Wayfair Orders] SKU ${line.sku} not found in catalog`);
            continue;
          }

          const product = products[0];
          const quantity = parseInt(line.quantity) || 1;
          const unitPrice = parseFloat(line.unitPrice) || product.price;
          const lineTotal = unitPrice * quantity;

          orderItems.push({
            product_id: product.id,
            vendor_id: product.vendor_id,
            product_name: product.name,
            sku: line.sku,
            part_number: line.partNumber || line.sku,
            quantity,
            unit_price: unitPrice,
            line_total: lineTotal
          });

          orderTotal += lineTotal;
        }

        if (orderItems.length === 0) {
          console.warn(`[Wayfair Orders] No valid items in PO ${poNumber}`);
          errorCount++;
          continue;
        }

        const shippingAddress = wayfairOrder.shippingAddress || {};

        const [orderResult] = await db.query(`
          INSERT INTO wayfair_orders (
            user_id, is_corporate, wayfair_po_number, wayfair_po_date,
            order_data, customer_name,
            customer_address_1, customer_address_2,
            customer_city, customer_state, customer_zip, customer_country, customer_phone,
            total, order_status, ship_by_date, delivery_by_date,
            registration_status, created_at
          ) VALUES (NULL, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, 'unregistered', NOW())
        `, [
          poNumber,
          wayfairOrder.poDate || wayfairOrder.orderDate || null,
          JSON.stringify(wayfairOrder),
          shippingAddress.name || null,
          shippingAddress.address1 || null,
          shippingAddress.address2 || null,
          shippingAddress.city || null,
          shippingAddress.state || null,
          shippingAddress.zip || null,
          shippingAddress.country || 'US',
          shippingAddress.phone || null,
          orderTotal,
          wayfairOrder.estimatedShipDate || null,
          wayfairOrder.scheduledDeliveryDate || null
        ]);

        const dbOrderId = orderResult.insertId;

        for (const item of orderItems) {
          await db.query(`
            INSERT INTO wayfair_order_items (
              order_id, product_id, vendor_id, wayfair_sku, wayfair_part_number,
              product_name, quantity, unit_price, total_price, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
          `, [
            dbOrderId, item.product_id, item.vendor_id,
            item.sku, item.part_number, item.product_name || null,
            item.quantity, item.unit_price, item.line_total
          ]);
        }

        try {
          await wayfairService.acceptOrder(poNumber);
          await db.query(
            'UPDATE wayfair_orders SET order_status = ?, acknowledged_at = NOW() WHERE id = ?',
            ['accepted', dbOrderId]
          );
          console.log(`[Wayfair Orders] PO ${poNumber} imported and accepted`);
        } catch (ackError) {
          console.warn(`[Wayfair Orders] PO ${poNumber} imported but accept failed:`, ackError.message);
        }

        newOrders++;

      } catch (orderError) {
        console.error('[Wayfair Orders] Error processing order:', orderError.message);
        errorCount++;
      }
    }

    await db.query(`
      INSERT INTO wayfair_sync_logs
      (user_id, sync_type, operation, status, message)
      VALUES (NULL, 'order', 'pull', 'success', ?)
    `, [`Imported ${newOrders} orders in ${((Date.now() - startTime) / 1000).toFixed(2)}s`]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Wayfair Orders] Completed: ${newOrders} imported, ${errorCount} errors in ${duration}s`);

    return { success: true, imported: newOrders, errors: errorCount, duration };

  } catch (error) {
    console.error('[Wayfair Orders] Fatal error:', error);
    return { success: false, error: error.message };
  }
}

pullWayfairOrders()
  .then(result => {
    console.log('[Wayfair Orders] Done:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('[Wayfair Orders] Uncaught error:', error);
    process.exit(1);
  });
