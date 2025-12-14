#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(process.cwd(), 'api-service/.env') });
const db = require('../config/db');
const walmartService = require('../src/services/walmartService');

/**
 * @fileoverview Walmart Tracking Sync (Corporate Model)
 * 
 * Cron job to push tracking numbers from vendors to Walmart.
 * Runs every 15 minutes.
 * 
 * Flow:
 * 1. Find walmart_order_items with tracking but not synced to Walmart
 * 2. Group by order (purchaseOrderId)
 * 3. Push tracking to Walmart via Ship Order Lines API
 * 4. Update sync status
 */

const BATCH_SIZE = 50;

async function syncTrackingToWalmart() {
  console.log('[Walmart Tracking] Starting tracking sync to Walmart...');
  console.log(`[Walmart Tracking] Environment: ${process.env.WALMART_ENV || 'sandbox'}`);
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  try {
    // Find items with tracking that haven't been synced
    const [itemsToSync] = await db.query(`
      SELECT 
        woi.id as item_id,
        woi.walmart_order_id,
        woi.walmart_line_number,
        woi.quantity,
        woi.tracking_number,
        woi.tracking_carrier,
        wo.walmart_purchase_order_id
      FROM walmart_order_items woi
      JOIN walmart_orders wo ON woi.walmart_order_id = wo.id
      WHERE woi.status = 'shipped'
        AND woi.tracking_number IS NOT NULL
        AND woi.tracking_synced_at IS NULL
        AND wo.is_corporate = 1
      ORDER BY woi.shipped_at ASC
      LIMIT ${BATCH_SIZE}
    `);

    console.log(`[Walmart Tracking] Found ${itemsToSync.length} items with tracking to sync`);

    if (itemsToSync.length === 0) {
      console.log('[Walmart Tracking] No tracking to sync');
      return { success: true, synced: 0, errors: 0 };
    }

    // Group items by purchase order
    const orderGroups = {};
    for (const item of itemsToSync) {
      const poId = item.walmart_purchase_order_id;
      if (!orderGroups[poId]) {
        orderGroups[poId] = [];
      }
      orderGroups[poId].push(item);
    }

    // Process each order
    for (const [purchaseOrderId, items] of Object.entries(orderGroups)) {
      try {
        console.log(`[Walmart Tracking] Syncing ${items.length} items for order ${purchaseOrderId}`);

        // Build shipment info for Walmart API
        const shipmentInfo = {
          orderLines: items.map(item => ({
            lineNumber: item.walmart_line_number,
            quantity: item.quantity,
            carrier: mapCarrierName(item.tracking_carrier),
            trackingNumber: item.tracking_number,
            trackingUrl: getTrackingUrl(item.tracking_carrier, item.tracking_number)
          }))
        };

        // Push to Walmart
        await walmartService.shipOrder(purchaseOrderId, shipmentInfo);

        // Update sync status for all items
        for (const item of items) {
          await db.query(`
            UPDATE walmart_order_items 
            SET tracking_synced_at = NOW()
            WHERE id = ?
          `, [item.item_id]);
          
          successCount++;
        }

        // Update order status if all items shipped
        const [remaining] = await db.query(`
          SELECT COUNT(*) as count 
          FROM walmart_order_items 
          WHERE walmart_order_id = ? AND status != 'shipped'
        `, [items[0].walmart_order_id]);

        if (remaining[0].count === 0) {
          await db.query(`
            UPDATE walmart_orders 
            SET order_status = 'shipped'
            WHERE id = ?
          `, [items[0].walmart_order_id]);
        }

        console.log(`[Walmart Tracking] ✅ Order ${purchaseOrderId} tracking synced`);

      } catch (orderError) {
        console.error(`[Walmart Tracking] Error syncing order ${purchaseOrderId}:`, orderError.message);
        errorCount += items.length;
      }
    }

    // Log sync
    await db.query(`
      INSERT INTO walmart_sync_logs 
      (user_id, sync_type, items_count, operation, status, started_at, completed_at, created_at)
      VALUES (NULL, 'tracking', ?, 'push', 'success', ?, NOW(), NOW())
    `, [successCount, new Date(startTime)]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Walmart Tracking] Completed: ${successCount} synced, ${errorCount} errors in ${duration}s`);

    return { success: true, synced: successCount, errors: errorCount, duration };

  } catch (error) {
    console.error('[Walmart Tracking] Fatal error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Map our carrier names to Walmart's expected format
 */
function mapCarrierName(carrier) {
  const carrierMap = {
    'usps': 'USPS',
    'ups': 'UPS',
    'fedex': 'FedEx',
    'dhl': 'DHL',
    'ontrac': 'OnTrac',
    'lasership': 'LaserShip'
  };
  return carrierMap[carrier?.toLowerCase()] || carrier || 'Other';
}

/**
 * Generate tracking URL for common carriers
 */
function getTrackingUrl(carrier, trackingNumber) {
  const urlMap = {
    'usps': `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`,
    'ups': `https://www.ups.com/track?tracknum=${trackingNumber}`,
    'fedex': `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
    'dhl': `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}`
  };
  return urlMap[carrier?.toLowerCase()] || null;
}

// Run
syncTrackingToWalmart()
  .then(result => {
    console.log('[Walmart Tracking] Done:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('[Walmart Tracking] Uncaught error:', error);
    process.exit(1);
  });

