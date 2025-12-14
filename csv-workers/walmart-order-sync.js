#!/usr/bin/env node
/**
 * Walmart Order Sync
 * 
 * Polls Walmart for new orders, imports them into the internal order system,
 * and auto-acknowledges them.
 * 
 * Run every 15 minutes via cron
 */

const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '../api-service/.env') });

const db = require('../api-service/config/db');
const axios = require('axios');

// Walmart API configuration
const WALMART_BASE_URL = 'https://marketplace.walmartapis.com';
const CLIENT_ID = process.env.WALMART_CLIENT_ID;
const CLIENT_SECRET = process.env.WALMART_CLIENT_SECRET;

// Platform user ID for Walmart orders (system user)
const WALMART_PLATFORM_USER_ID = process.env.WALMART_PLATFORM_USER_ID || 1;

/**
 * Get Walmart access token
 */
async function getWalmartToken() {
  const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
  
  const response = await axios.post(
    `${WALMART_BASE_URL}/v3/token`,
    'grant_type=client_credentials',
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'WM_SVC.NAME': 'Brakebee Marketplace'
      }
    }
  );
  
  return response.data.access_token;
}

/**
 * Get headers for Walmart API calls
 */
async function getHeaders() {
  const token = await getWalmartToken();
  return {
    'WM_SEC.ACCESS_TOKEN': token,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'WM_SVC.NAME': 'Brakebee Marketplace',
    'WM_QOS.CORRELATION_ID': `brakebee-order-${Date.now()}`
  };
}

/**
 * Fetch released orders from Walmart (ready to fulfill)
 */
async function fetchWalmartOrders() {
  const headers = await getHeaders();
  
  // Get orders from last 7 days that are released (ready to ship)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  const params = new URLSearchParams({
    limit: 100,
    createdStartDate: startDate.toISOString()
  });
  
  try {
    const response = await axios.get(
      `${WALMART_BASE_URL}/v3/orders/released?${params}`,
      { headers }
    );
    
    return response.data.list?.elements?.order || [];
  } catch (error) {
    console.error('Error fetching Walmart orders:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Check if order already exists in our system
 */
async function orderExists(walmartOrderId) {
  const [rows] = await db.query(
    'SELECT id FROM walmart_orders WHERE walmart_purchase_order_id = ? OR walmart_order_id = ?',
    [walmartOrderId, walmartOrderId]
  );
  return rows.length > 0;
}

/**
 * Find product by SKU (includes wholesale price for Walmart commission calc)
 */
async function findProductBySku(sku) {
  const [rows] = await db.query(
    `SELECT p.id, p.vendor_id, p.price, p.wholesale_price, p.name
     FROM products p
     WHERE p.sku = ?
     LIMIT 1`,
    [sku]
  );
  return rows[0] || null;
}

/**
 * Calculate vendor payout for Walmart order
 * - If wholesale price exists: vendor gets wholesale price
 * - If only retail: vendor gets retail - 15%
 */
function calculateVendorPayout(product, quantity) {
  if (product.wholesale_price && parseFloat(product.wholesale_price) > 0) {
    // Vendor gets wholesale price
    return parseFloat(product.wholesale_price) * quantity;
  }
  // Vendor gets 85% of retail (15% commission)
  return parseFloat(product.price) * 0.85 * quantity;
}

/**
 * Calculate platform commission for Walmart order
 */
function calculatePlatformCommission(product, walmartPrice, quantity) {
  const vendorPayout = calculateVendorPayout(product, quantity);
  // Platform keeps the difference between Walmart price and vendor payout
  return (walmartPrice * quantity) - vendorPayout;
}

/**
 * Import a Walmart order into our system
 */
async function importOrder(walmartOrder) {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const purchaseOrderId = walmartOrder.purchaseOrderId;
    const customerOrderId = walmartOrder.customerOrderId;
    const orderDate = new Date(walmartOrder.orderDate);
    
    // Get shipping info
    const shippingInfo = walmartOrder.shippingInfo?.postalAddress || {};
    
    // Calculate totals from order lines
    let totalAmount = 0;
    let shippingAmount = 0;
    const orderLines = walmartOrder.orderLines?.orderLine || [];
    
    for (const line of orderLines) {
      const charges = line.charges?.charge || [];
      for (const charge of charges) {
        if (charge.chargeType === 'PRODUCT') {
          totalAmount += parseFloat(charge.chargeAmount?.amount || 0);
        } else if (charge.chargeType === 'SHIPPING') {
          shippingAmount += parseFloat(charge.chargeAmount?.amount || 0);
        }
      }
    }
    
    // Create main order record
    const [orderResult] = await connection.execute(
      `INSERT INTO orders 
       (user_id, total_amount, shipping_amount, tax_amount, platform_fee_amount, status, created_at)
       VALUES (?, ?, ?, 0, 0, 'paid', ?)`,
      [WALMART_PLATFORM_USER_ID, totalAmount, shippingAmount, orderDate]
    );
    
    const orderId = orderResult.insertId;
    
    // Create order items (vendor transactions created when shipped via tracking-sync)
    for (const line of orderLines) {
      const sku = line.item?.sku;
      const quantity = parseInt(line.orderLineQuantity?.amount || 1);
      
      // Find product in our system
      const product = await findProductBySku(sku);
      
      if (!product) {
        console.warn(`  SKU not found: ${sku} - skipping line`);
        continue;
      }
      
      // Get line price from Walmart
      let walmartPrice = 0;
      const charges = line.charges?.charge || [];
      for (const charge of charges) {
        if (charge.chargeType === 'PRODUCT') {
          walmartPrice = parseFloat(charge.chargeAmount?.amount || 0);
        }
      }
      
      // Calculate commission for order item (payout calculated at ship time)
      const commissionAmount = calculatePlatformCommission(product, walmartPrice / quantity, quantity);
      const commissionRate = walmartPrice > 0 ? (commissionAmount / walmartPrice) * 100 : 15;
      
      // Create order item (vendor transaction created when tracking sent)
      await connection.execute(
        `INSERT INTO order_items 
         (order_id, product_id, vendor_id, quantity, price, shipping_cost, commission_rate, commission_amount, status)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, 'pending')`,
        [
          orderId,
          product.id,
          product.vendor_id,
          quantity,
          walmartPrice / quantity, // unit price (Walmart selling price)
          commissionRate.toFixed(2),
          commissionAmount.toFixed(2)
        ]
      );
      
      console.log(`    Item: ${product.name} - $${(walmartPrice/quantity).toFixed(2)} x ${quantity}`);
    }
    
    // Create shipping address
    await connection.execute(
      `INSERT INTO shipping_addresses 
       (order_id, recipient_name, address_line_1, address_line_2, city, state, postal_code, country)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        shippingInfo.name || 'Walmart Customer',
        shippingInfo.address1 || '',
        shippingInfo.address2 || '',
        shippingInfo.city || '',
        shippingInfo.state || '',
        shippingInfo.postalCode || '',
        shippingInfo.country || 'USA'
      ]
    );
    
    // Create walmart_orders tracking record (using existing table schema)
    await connection.execute(
      `INSERT INTO walmart_orders 
       (user_id, is_corporate, walmart_order_id, walmart_purchase_order_id, order_data, 
        customer_email, customer_name, shipping_address, total_amount, currency,
        order_status, acknowledged_at, processed_to_main, main_order_id, created_at)
       VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, 'USD', 'acknowledged', NOW(), 1, ?, NOW())`,
      [
        WALMART_PLATFORM_USER_ID,
        customerOrderId,
        purchaseOrderId,
        JSON.stringify(walmartOrder),
        shippingInfo.email || '',
        shippingInfo.name || 'Walmart Customer',
        JSON.stringify(shippingInfo),
        totalAmount,
        orderId
      ]
    );
    
    await connection.commit();
    
    console.log(`  ✓ Imported order ${purchaseOrderId} → internal #${orderId}`);
    return orderId;
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Acknowledge order with Walmart
 */
async function acknowledgeOrder(purchaseOrderId) {
  const headers = await getHeaders();
  
  try {
    await axios.post(
      `${WALMART_BASE_URL}/v3/orders/${purchaseOrderId}/acknowledge`,
      {},
      { headers }
    );
    console.log(`  ✓ Acknowledged order ${purchaseOrderId} with Walmart`);
    return true;
  } catch (error) {
    console.error(`  ✗ Failed to acknowledge ${purchaseOrderId}:`, error.response?.data || error.message);
    return false;
  }
}

/**
 * Ensure walmart_orders table exists (table already exists with full schema)
 */
async function ensureTable() {
  // Table already exists with existing schema - no creation needed
  return;
}

/**
 * Main sync function
 */
async function syncOrders() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting Walmart order sync...`);
  
  try {
    // Ensure tracking table exists
    await ensureTable();
    
    // Fetch orders from Walmart
    console.log('Fetching released orders from Walmart...');
    const walmartOrders = await fetchWalmartOrders();
    console.log(`Found ${walmartOrders.length} released orders`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const order of walmartOrders) {
      const purchaseOrderId = order.purchaseOrderId;
      
      try {
        // Check if already imported
        if (await orderExists(purchaseOrderId)) {
          skipped++;
          continue;
        }
        
        console.log(`Importing order ${purchaseOrderId}...`);
        
        // Import order
        await importOrder(order);
        
        // Acknowledge with Walmart
        await acknowledgeOrder(purchaseOrderId);
        
        imported++;
        
      } catch (error) {
        console.error(`  ✗ Error importing ${purchaseOrderId}:`, error.message);
        errors++;
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[${new Date().toISOString()}] Order sync complete!`);
    console.log(`  - Imported: ${imported}`);
    console.log(`  - Skipped (already exists): ${skipped}`);
    console.log(`  - Errors: ${errors}`);
    console.log(`  - Duration: ${duration}s`);
    
    return { imported, skipped, errors };
    
  } catch (error) {
    console.error('Fatal error:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await syncOrders();
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error.message);
    await db.end();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { syncOrders };

