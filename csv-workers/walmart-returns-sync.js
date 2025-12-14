#!/usr/bin/env node
/**
 * Walmart Returns Sync
 * 
 * Polls Walmart for returns and creates internal return records.
 * 
 * Run every hour via cron
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
    'WM_QOS.CORRELATION_ID': `brakebee-return-${Date.now()}`
  };
}

/**
 * Fetch returns from Walmart
 */
async function fetchWalmartReturns() {
  const headers = await getHeaders();
  
  // Get returns from last 30 days
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const params = new URLSearchParams({
    limit: 100,
    returnCreationStartDate: startDate.toISOString()
  });
  
  try {
    const response = await axios.get(
      `${WALMART_BASE_URL}/v3/returns?${params}`,
      { headers }
    );
    
    return response.data.list?.elements?.returnOrder || [];
  } catch (error) {
    console.error('Error fetching Walmart returns:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Check if return already exists
 */
async function returnExists(walmartReturnId) {
  const [rows] = await db.query(
    'SELECT id FROM walmart_returns WHERE walmart_return_order_id = ?',
    [walmartReturnId]
  );
  return rows.length > 0;
}

/**
 * Find internal order by Walmart purchase order ID
 */
async function findInternalOrder(purchaseOrderId) {
  const [rows] = await db.query(
    'SELECT main_order_id FROM walmart_orders WHERE walmart_purchase_order_id = ?',
    [purchaseOrderId]
  );
  return rows[0]?.main_order_id || null;
}

/**
 * Find order item by product SKU and order ID
 */
async function findOrderItem(orderId, sku) {
  const [rows] = await db.query(
    `SELECT oi.id, oi.product_id, oi.vendor_id, oi.quantity, oi.price
     FROM order_items oi
     JOIN products p ON oi.product_id = p.id
     WHERE oi.order_id = ? AND p.sku = ?
     LIMIT 1`,
    [orderId, sku]
  );
  return rows[0] || null;
}

/**
 * Handle vendor payout for return
 * - If payout is still pending (within 30 days): cancel it
 * - If payout already processed: create deduction transaction
 */
async function handleVendorPayoutForReturn(connection, orderId, vendorId, refundAmount) {
  // Find pending vendor transaction for this order
  const [pendingTx] = await connection.execute(
    `SELECT id, amount, status, payout_date 
     FROM vendor_transactions 
     WHERE order_id = ? AND vendor_id = ? AND transaction_type = 'sale'
     ORDER BY created_at DESC LIMIT 1`,
    [orderId, vendorId]
  );
  
  if (pendingTx.length === 0) {
    console.log(`    No vendor transaction found for order ${orderId}`);
    return { action: 'none', reason: 'no_transaction' };
  }
  
  const tx = pendingTx[0];
  
  if (tx.status === 'pending') {
    // Transaction still pending - cancel it
    await connection.execute(
      `UPDATE vendor_transactions 
       SET status = 'cancelled', 
           updated_at = NOW()
       WHERE id = ?`,
      [tx.id]
    );
    
    console.log(`    ✓ Cancelled pending payout of $${tx.amount} (was scheduled for ${tx.payout_date})`);
    return { action: 'cancelled', amount: tx.amount };
    
  } else if (tx.status === 'paid_out') {
    // Already paid - create deduction transaction
    const deductionAmount = Math.min(parseFloat(tx.amount), refundAmount);
    
    await connection.execute(
      `INSERT INTO vendor_transactions 
       (vendor_id, order_id, transaction_type, amount, status, created_at)
       VALUES (?, ?, 'return_deduction', ?, 'pending', NOW())`,
      [vendorId, orderId, -deductionAmount]
    );
    
    console.log(`    ✓ Created return deduction of -$${deductionAmount} (original payout was $${tx.amount})`);
    return { action: 'deduction', amount: deductionAmount };
    
  } else {
    console.log(`    Transaction status is '${tx.status}' - no action taken`);
    return { action: 'none', reason: `status_${tx.status}` };
  }
}

/**
 * Create internal return record
 */
async function createReturn(walmartReturn, orderId, orderItem) {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const returnOrderId = walmartReturn.returnOrderId;
    const returnReason = walmartReturn.returnOrderLines?.[0]?.returnReason || 'Customer Return';
    const returnQuantity = parseInt(walmartReturn.returnOrderLines?.[0]?.returnQuantity?.amount || 1);
    const refundAmount = parseFloat(walmartReturn.returnOrderLines?.[0]?.refundAmount?.amount || 0);
    
    // Create return record in returns table (if exists) or walmart_returns
    await connection.execute(
      `INSERT INTO walmart_returns 
       (order_id, order_item_id, walmart_return_order_id, walmart_purchase_order_id,
        return_reason, return_quantity, refund_amount, return_status, raw_return_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, NOW())`,
      [
        orderId,
        orderItem?.id || null,
        returnOrderId,
        walmartReturn.purchaseOrderId,
        returnReason,
        returnQuantity,
        refundAmount,
        JSON.stringify(walmartReturn)
      ]
    );
    
    // Update order item status if found
    if (orderItem) {
      await connection.execute(
        `UPDATE order_items SET status = 'return_requested' WHERE id = ?`,
        [orderItem.id]
      );
      
      // Handle vendor payout cancellation/deduction
      const payoutResult = await handleVendorPayoutForReturn(
        connection, 
        orderId, 
        orderItem.vendor_id, 
        refundAmount
      );
      console.log(`    Payout action: ${payoutResult.action}`);
    }
    
    await connection.commit();
    
    console.log(`  ✓ Created return for order #${orderId}: ${returnOrderId}`);
    return true;
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Ensure walmart_returns table exists
 */
async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS walmart_returns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT,
      order_item_id INT,
      walmart_return_order_id VARCHAR(100) NOT NULL UNIQUE,
      walmart_purchase_order_id VARCHAR(100),
      return_reason VARCHAR(255),
      return_quantity INT DEFAULT 1,
      refund_amount DECIMAL(10,2),
      return_status ENUM('pending', 'received', 'refunded', 'rejected') DEFAULT 'pending',
      refund_processed_at DATETIME,
      raw_return_data JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      
      INDEX idx_order_id (order_id),
      INDEX idx_walmart_return (walmart_return_order_id),
      INDEX idx_status (return_status)
    )
  `);
}

/**
 * Main sync function
 */
async function syncReturns() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting Walmart returns sync...`);
  
  try {
    // Ensure table exists
    await ensureTable();
    
    // Fetch returns from Walmart
    console.log('Fetching returns from Walmart...');
    const walmartReturns = await fetchWalmartReturns();
    console.log(`Found ${walmartReturns.length} returns`);
    
    let imported = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const returnOrder of walmartReturns) {
      const returnOrderId = returnOrder.returnOrderId;
      
      try {
        // Check if already imported
        if (await returnExists(returnOrderId)) {
          skipped++;
          continue;
        }
        
        console.log(`Processing return ${returnOrderId}...`);
        
        // Find internal order
        const orderId = await findInternalOrder(returnOrder.purchaseOrderId);
        
        if (!orderId) {
          console.warn(`  ⚠ No internal order found for ${returnOrder.purchaseOrderId}`);
          // Still create return record for tracking
        }
        
        // Find order item
        let orderItem = null;
        if (orderId) {
          const sku = returnOrder.returnOrderLines?.[0]?.item?.sku;
          if (sku) {
            orderItem = await findOrderItem(orderId, sku);
          }
        }
        
        // Create return
        await createReturn(returnOrder, orderId, orderItem);
        imported++;
        
      } catch (error) {
        console.error(`  ✗ Error processing return ${returnOrderId}:`, error.message);
        errors++;
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[${new Date().toISOString()}] Returns sync complete!`);
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
    await syncReturns();
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

module.exports = { syncReturns };

