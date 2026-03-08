#!/usr/bin/env node
/**
 * eBay Tracking Sync Cron
 * Pushes tracking/fulfillment data to eBay for shipped order items.
 * Schedule: every 30 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const ebayApiService = require('../src/services/ebayService');

async function run() {
  console.log('[ebay-sync-tracking] Starting…');
  const [items] = await db.execute(`
    SELECT eoi.id as item_id, eoi.ebay_line_item_id, eoi.tracking_number, eoi.tracking_carrier,
           eo.ebay_order_id as ext_order_id, eo.user_id, eo.shop_id
    FROM ebay_order_items eoi
    JOIN ebay_orders eo ON eoi.ebay_order_id = eo.id
    WHERE eoi.tracking_number IS NOT NULL AND eoi.tracking_number != ''
      AND eoi.tracking_synced_at IS NULL AND eoi.status IN ('shipped', 'processing')
  `);

  console.log(`[ebay-sync-tracking] ${items.length} items with unsynced tracking`);
  let synced = 0, failed = 0;

  for (const item of items) {
    try {
      const accessToken = await ebayApiService.getShopAccessToken(item.shop_id, item.user_id);
      await ebayApiService.createShippingFulfillment(accessToken, item.ext_order_id, {
        lineItems: [{ lineItemId: item.ebay_line_item_id, quantity: 1 }],
        shippingCarrierCode: item.tracking_carrier || 'OTHER',
        trackingNumber: item.tracking_number
      });
      await db.execute(`UPDATE ebay_order_items SET tracking_synced_at = NOW(), status = 'shipped' WHERE id = ?`, [item.item_id]);
      await db.execute(`INSERT INTO ebay_sync_logs (user_id, sync_type, operation, reference_id, status, message) VALUES (?, 'tracking', 'push', ?, 'success', ?)`,
        [item.user_id, item.item_id, `Tracking ${item.tracking_number}`]);
      synced++;
    } catch (err) {
      console.error(`[ebay-sync-tracking] Error item ${item.item_id}:`, err.message);
      await db.execute(`INSERT INTO ebay_sync_logs (user_id, sync_type, operation, reference_id, status, message) VALUES (?, 'tracking', 'push', ?, 'error', ?)`,
        [item.user_id, item.item_id, err.message]);
      failed++;
    }
  }

  console.log(`[ebay-sync-tracking] Done: ${synced} synced, ${failed} failed`);
  process.exit(0);
}

run().catch(err => { console.error('[ebay-sync-tracking] Fatal:', err); process.exit(1); });
