#!/usr/bin/env node
/**
 * Etsy Tracking Sync Cron
 * Pushes tracking/shipment data for shipped order items to Etsy.
 * Uses the "Create Receipt Shipment" endpoint.
 *
 * Schedule: every 30 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const etsyApiService = require('../src/services/etsyService');

async function run() {
  console.log('[etsy-sync-tracking] Starting tracking sync…');

  const [items] = await db.execute(`
    SELECT
      eoi.id as item_id, eoi.tracking_number, eoi.tracking_carrier,
      eo.id as order_db_id, eo.etsy_receipt_id, eo.user_id, eo.shop_id
    FROM etsy_order_items eoi
    JOIN etsy_orders eo ON eoi.order_id = eo.id
    JOIN etsy_user_shops eus ON eo.user_id = eus.user_id AND eo.shop_id = eus.shop_id AND eus.is_active = 1
    WHERE eoi.tracking_number IS NOT NULL
      AND eoi.tracking_number != ''
      AND eoi.tracking_synced_at IS NULL
      AND eoi.status IN ('shipped', 'processing')
  `);

  console.log(`[etsy-sync-tracking] Found ${items.length} items with unsynced tracking`);
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const accessToken = await etsyApiService.getShopAccessToken(item.shop_id, item.user_id);

      await etsyApiService.createReceiptShipment(item.shop_id, item.etsy_receipt_id, {
        tracking_code: item.tracking_number,
        carrier_name: item.tracking_carrier || 'other'
      }, accessToken);

      await db.execute(
        'UPDATE etsy_order_items SET tracking_synced_at = NOW(), status = ? WHERE id = ?',
        ['shipped', item.item_id]
      );

      await db.execute(`
        INSERT INTO etsy_sync_logs (user_id, shop_id, sync_type, operation, reference_id, status, message)
        VALUES (?, ?, 'order', 'tracking', ?, 'success', ?)
      `, [item.user_id, item.shop_id, item.item_id, `Cron: tracking ${item.tracking_number} pushed`]);
      synced++;
    } catch (err) {
      console.error(`[etsy-sync-tracking] Error for item ${item.item_id}:`, err.message);
      await db.execute(`
        INSERT INTO etsy_sync_logs (user_id, shop_id, sync_type, operation, reference_id, status, message)
        VALUES (?, ?, 'order', 'tracking', ?, 'failed', ?)
      `, [item.user_id, item.shop_id, item.item_id, err.message]);
      failed++;
    }
  }

  console.log(`[etsy-sync-tracking] Done: ${synced} synced, ${failed} failed`);
  process.exit(0);
}

run().catch(err => {
  console.error('[etsy-sync-tracking] Fatal:', err);
  process.exit(1);
});
