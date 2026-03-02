#!/usr/bin/env node
/**
 * Meta Tracking Sync Cron
 * Pushes tracking/shipment data for shipped order items to Meta Commerce.
 *
 * Schedule: every 30 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const metaApiService = require('../src/services/metaService');

async function run() {
  console.log('[meta-sync-tracking] Starting tracking sync…');

  const [items] = await db.execute(`
    SELECT
      moi.id as item_id, moi.tracking_number, moi.tracking_carrier,
      mo.meta_order_id as ext_order_id, mo.user_id, mo.shop_id
    FROM meta_order_items moi
    JOIN meta_orders mo ON moi.meta_order_id = mo.id
    JOIN meta_user_shops mus ON mo.user_id = mus.user_id AND mo.shop_id = mus.shop_id AND mus.is_active = 1
    WHERE moi.tracking_number IS NOT NULL
      AND moi.tracking_number != ''
      AND moi.tracking_synced_at IS NULL
      AND moi.status IN ('shipped', 'processing')
  `);

  console.log(`[meta-sync-tracking] Found ${items.length} items with unsynced tracking`);
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const accessToken = await metaApiService.getShopAccessToken(item.shop_id, item.user_id);

      await metaApiService.createShipment(accessToken, item.ext_order_id, {
        tracking_number: item.tracking_number,
        carrier: item.tracking_carrier || 'OTHER'
      });

      await db.execute(
        'UPDATE meta_order_items SET tracking_synced_at = NOW(), status = ? WHERE id = ?',
        ['shipped', item.item_id]
      );

      await db.execute(`
        INSERT INTO meta_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'orders', 'tracking', ?, 'success', ?)
      `, [item.user_id, item.item_id, `Cron: tracking ${item.tracking_number} pushed`]);
      synced++;
    } catch (err) {
      console.error(`[meta-sync-tracking] Error for item ${item.item_id}:`, err.message);
      await db.execute(`
        INSERT INTO meta_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'orders', 'tracking', ?, 'failed', ?)
      `, [item.user_id, item.item_id, err.message]);
      failed++;
    }
  }

  console.log(`[meta-sync-tracking] Done: ${synced} synced, ${failed} failed`);
  process.exit(0);
}

run().catch(err => {
  console.error('[meta-sync-tracking] Fatal:', err);
  process.exit(1);
});
