#!/usr/bin/env node
/**
 * Walmart Tracking Sync
 * 
 * Pushes tracking info to Walmart when vendors ship orders.
 * Finds shipped order items that haven't been synced to Walmart yet.
 * 
 * Run every 30 minutes via cron
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
    'WM_QOS.CORRELATION_ID': `brakebee-track-${Date.now()}`
  };
}

/**
 * Find shipped orders with tracking that haven't been synced to Walmart
 */
async function findUnsentTracking() {
  const [rows] = await db.query(`
    SELECT 
      wo.id as walmart_order_id,
      wo.walmart_purchase_order_id,
      wo.main_order_id,
      oi.id as order_item_id,
      oi.product_id,
      oi.vendor_id,
      oi.quantity,
      oi.price,
      oi.status as item_status,
      oit.carrier,
      oit.tracking_number,
      oit.created_at as tracking_created,
      p.sku,
      p.wholesale_price
    FROM walmart_orders wo
    JOIN order_items oi ON wo.main_order_id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    LEFT JOIN order_item_tracking oit ON oi.id = oit.order_item_id
    WHERE wo.order_status = 'acknowledged'
      AND oi.status = 'shipped'
      AND oit.tracking_number IS NOT NULL
      AND wo.tracking_sent_at IS NULL
    ORDER BY wo.main_order_id
  `);
  
  return rows;
}

/**
 * Calculate vendor payout for Walmart order
 * - If wholesale price exists: vendor gets wholesale price
 * - If only retail: vendor gets retail - 15%
 */
function calculateVendorPayout(wholesalePrice, retailPrice, quantity) {
  if (wholesalePrice && parseFloat(wholesalePrice) > 0) {
    return parseFloat(wholesalePrice) * quantity;
  }
  return parseFloat(retailPrice) * 0.85 * quantity;
}

/**
 * Create vendor transaction for shipped Walmart order (30-day hold from ship date)
 */
async function createVendorTransaction(vendorId, orderId, amount) {
  const payoutDate = new Date();
  payoutDate.setDate(payoutDate.getDate() + 30);
  
  await db.query(
    `INSERT INTO vendor_transactions 
     (vendor_id, order_id, transaction_type, amount, status, payout_date, created_at)
     VALUES (?, ?, 'sale', ?, 'pending', ?, NOW())`,
    [vendorId, orderId, amount.toFixed(2), payoutDate]
  );
  
  return payoutDate;
}

/**
 * Map carrier name to Walmart carrier code
 */
function mapCarrier(carrier) {
  const carrierMap = {
    'usps': 'USPS',
    'ups': 'UPS',
    'fedex': 'FedEx',
    'dhl': 'DHL',
    'ontrac': 'OnTrac',
    'lasership': 'LaserShip',
    'amazon': 'Amazon Logistics',
    'other': 'Other'
  };
  
  const normalized = (carrier || '').toLowerCase().trim();
  return carrierMap[normalized] || 'Other';
}

/**
 * Push tracking to Walmart
 */
async function pushTracking(purchaseOrderId, lineNumber, trackingInfo) {
  const headers = await getHeaders();
  
  const payload = {
    orderShipment: {
      orderLines: [{
        lineNumber: lineNumber.toString(),
        orderLineStatuses: {
          orderLineStatus: [{
            status: 'Shipped',
            statusQuantity: {
              unitOfMeasurement: 'EACH',
              amount: trackingInfo.quantity.toString()
            },
            trackingInfo: {
              shipDateTime: new Date().toISOString(),
              carrierName: {
                carrier: mapCarrier(trackingInfo.carrier)
              },
              methodCode: 'Standard',
              trackingNumber: trackingInfo.trackingNumber,
              trackingURL: trackingInfo.trackingUrl || ''
            }
          }]
        }
      }]
    }
  };
  
  try {
    const response = await axios.post(
      `${WALMART_BASE_URL}/v3/orders/${purchaseOrderId}/shipping`,
      payload,
      { headers }
    );
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message 
    };
  }
}

/**
 * Mark tracking as sent
 */
async function markTrackingSent(walmartOrderId) {
  await db.query(
    `UPDATE walmart_orders 
     SET order_status = 'shipped', tracking_sent_at = NOW() 
     WHERE id = ?`,
    [walmartOrderId]
  );
}

/**
 * Main sync function
 */
async function syncTracking() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting Walmart tracking sync...`);
  
  try {
    // Find orders with tracking to sync
    console.log('Finding unsent tracking info...');
    const trackingItems = await findUnsentTracking();
    console.log(`Found ${trackingItems.length} items with tracking to sync`);
    
    let synced = 0;
    let errors = 0;
    
    // Group by Walmart order
    const orderGroups = {};
    for (const item of trackingItems) {
      if (!orderGroups[item.walmart_purchase_order_id]) {
        orderGroups[item.walmart_purchase_order_id] = {
          walmartOrderId: item.walmart_order_id,
          items: []
        };
      }
      orderGroups[item.walmart_purchase_order_id].items.push(item);
    }
    
    // Process each order
    for (const [purchaseOrderId, orderData] of Object.entries(orderGroups)) {
      console.log(`Processing order ${purchaseOrderId}...`);
      
      let allSuccess = true;
      
      for (let i = 0; i < orderData.items.length; i++) {
        const item = orderData.items[i];
        const lineNumber = i + 1;
        
        const result = await pushTracking(purchaseOrderId, lineNumber, {
          quantity: item.quantity,
          carrier: item.carrier,
          trackingNumber: item.tracking_number,
          trackingUrl: null
        });
        
        if (result.success) {
          console.log(`  ✓ Line ${lineNumber}: ${item.tracking_number}`);
          
          // Create vendor transaction with 30-day hold from ship date
          const vendorPayout = calculateVendorPayout(
            item.wholesale_price, 
            item.price, 
            item.quantity
          );
          const payoutDate = await createVendorTransaction(
            item.vendor_id, 
            item.main_order_id, 
            vendorPayout
          );
          console.log(`    Vendor payout: $${vendorPayout.toFixed(2)} (available ${payoutDate.toLocaleDateString()})`);
          
          synced++;
        } else {
          console.error(`  ✗ Line ${lineNumber} failed:`, result.error);
          errors++;
          allSuccess = false;
        }
      }
      
      // Mark order as shipped if all lines synced
      if (allSuccess) {
        await markTrackingSent(orderData.walmartOrderId);
        console.log(`  ✓ Order marked as shipped`);
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[${new Date().toISOString()}] Tracking sync complete!`);
    console.log(`  - Synced: ${synced}`);
    console.log(`  - Errors: ${errors}`);
    console.log(`  - Duration: ${duration}s`);
    
    return { synced, errors };
    
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
    await syncTracking();
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

module.exports = { syncTracking };

