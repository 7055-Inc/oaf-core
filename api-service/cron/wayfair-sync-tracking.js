#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(process.cwd(), 'api-service/.env') });
const db = require('../config/db');
const wayfairService = require('../src/services/wayfairService');

/**
 * @fileoverview Wayfair Tracking Sync (Corporate Model)
 *
 * Cron job to push tracking numbers from vendors to Wayfair.
 * Runs every 15 minutes.
 *
 * Flow:
 * 1. Find wayfair_order_items with tracking but not synced
 * 2. Group by PO number
 * 3. Push shipment ASN to Wayfair via GraphQL
 * 4. Update sync status
 */

const BATCH_SIZE = 50;

async function syncTrackingToWayfair() {
  console.log('[Wayfair Tracking] Starting tracking sync to Wayfair...');
  console.log(`[Wayfair Tracking] Environment: ${process.env.WAYFAIR_ENV || 'sandbox'}`);
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  try {
    // For registered orders, use Wayfair-assigned tracking from wayfair_orders.
    // For non-registered orders, fall back to vendor-supplied tracking on items.
    const [itemsToSync] = await db.query(`
      SELECT
        woi.id as item_id,
        woi.order_id as wayfair_order_id,
        woi.wayfair_sku as sku,
        woi.quantity,
        COALESCE(wo.wayfair_tracking_number, woi.tracking_number) as tracking_number,
        COALESCE(wo.wayfair_carrier_code, woi.tracking_carrier) as tracking_carrier,
        wo.wayfair_po_number,
        wo.registration_status
      FROM wayfair_order_items woi
      JOIN wayfair_orders wo ON woi.order_id = wo.id
      WHERE woi.tracking_synced_at IS NULL
        AND wo.is_corporate = 1
        AND (
          (woi.status = 'shipped' AND woi.tracking_number IS NOT NULL)
          OR (wo.registration_status = 'registered' AND wo.wayfair_tracking_number IS NOT NULL)
        )
      ORDER BY woi.shipped_at ASC
      LIMIT ${BATCH_SIZE}
    `);

    console.log(`[Wayfair Tracking] Found ${itemsToSync.length} items with tracking to sync`);

    if (itemsToSync.length === 0) {
      console.log('[Wayfair Tracking] No tracking to sync');
      return { success: true, synced: 0, errors: 0 };
    }

    const orderGroups = {};
    for (const item of itemsToSync) {
      const poNum = item.wayfair_po_number;
      if (!orderGroups[poNum]) orderGroups[poNum] = [];
      orderGroups[poNum].push(item);
    }

    for (const [poNumber, items] of Object.entries(orderGroups)) {
      try {
        console.log(`[Wayfair Tracking] Syncing ${items.length} items for PO ${poNumber}`);

        const shipmentData = {
          poNumber,
          trackingNumber: items[0].tracking_number,
          carrier: mapCarrierName(items[0].tracking_carrier),
          shipDate: new Date().toISOString(),
          items: items.map(item => ({
            sku: item.sku,
            quantity: item.quantity
          }))
        };

        await wayfairService.sendShipment(shipmentData);

        for (const item of items) {
          await db.query(
            'UPDATE wayfair_order_items SET tracking_synced_at = NOW() WHERE id = ?',
            [item.item_id]
          );
          successCount++;
        }

        const [remaining] = await db.query(
          "SELECT COUNT(*) as count FROM wayfair_order_items WHERE order_id = ? AND status != 'shipped'",
          [items[0].wayfair_order_id]
        );

        if (remaining[0].count === 0) {
          await db.query(
            "UPDATE wayfair_orders SET order_status = 'shipped' WHERE id = ?",
            [items[0].wayfair_order_id]
          );
        }

        console.log(`[Wayfair Tracking] PO ${poNumber} tracking synced`);

      } catch (orderError) {
        console.error(`[Wayfair Tracking] Error syncing PO ${poNumber}:`, orderError.message);
        errorCount += items.length;
      }
    }

    await db.query(`
      INSERT INTO wayfair_sync_logs
      (user_id, sync_type, operation, status, message)
      VALUES (NULL, 'shipment', 'push', 'success', ?)
    `, [`Synced ${successCount} tracking updates in ${((Date.now() - startTime) / 1000).toFixed(2)}s`]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Wayfair Tracking] Completed: ${successCount} synced, ${errorCount} errors in ${duration}s`);

    return { success: true, synced: successCount, errors: errorCount, duration };

  } catch (error) {
    console.error('[Wayfair Tracking] Fatal error:', error);
    return { success: false, error: error.message };
  }
}

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

syncTrackingToWayfair()
  .then(result => {
    console.log('[Wayfair Tracking] Done:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('[Wayfair Tracking] Uncaught error:', error);
    process.exit(1);
  });
