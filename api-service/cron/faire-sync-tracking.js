#!/usr/bin/env node
/**
 * Faire Tracking Sync Cron
 * Pushes tracking/shipment data for shipped order items to Faire.
 *
 * Schedule: every 30 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const faireApiService = require('../src/services/faireService');

async function run() {
  console.log('[faire-sync-tracking] Starting tracking sync…');

  const [items] = await db.execute(`
    SELECT
      foi.id as item_id, foi.tracking_number, foi.tracking_carrier,
      fo.faire_order_id as ext_order_id, fo.user_id, fo.shop_id
    FROM faire_order_items foi
    JOIN faire_orders fo ON foi.faire_order_id = fo.id
    JOIN faire_user_shops fus ON fo.user_id = fus.user_id AND fo.shop_id = fus.shop_id AND fus.is_active = 1
    WHERE foi.tracking_number IS NOT NULL
      AND foi.tracking_number != ''
      AND foi.tracking_synced_at IS NULL
      AND foi.status IN ('shipped', 'processing')
  `);

  console.log(`[faire-sync-tracking] Found ${items.length} items with unsynced tracking`);
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const accessToken = await faireApiService.getShopAccessToken(item.shop_id, item.user_id);

      await faireApiService.createShipment(accessToken, item.ext_order_id, {
        tracking_code: item.tracking_number,
        carrier: item.tracking_carrier || 'OTHER'
      });

      await db.execute(
        'UPDATE faire_order_items SET tracking_synced_at = NOW(), status = ? WHERE id = ?',
        ['shipped', item.item_id]
      );

      await db.execute(`
        INSERT INTO faire_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'orders', 'tracking', ?, 'success', ?)
      `, [item.user_id, item.item_id, `Cron: tracking ${item.tracking_number} pushed`]);
      synced++;
    } catch (err) {
      console.error(`[faire-sync-tracking] Error for item ${item.item_id}:`, err.message);
      await db.execute(`
        INSERT INTO faire_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'orders', 'tracking', ?, 'failed', ?)
      `, [item.user_id, item.item_id, err.message]);
      failed++;
    }
  }

  console.log(`[faire-sync-tracking] Done: ${synced} synced, ${failed} failed`);
  process.exit(0);
}

run().catch(err => {
  console.error('[faire-sync-tracking] Fatal:', err);
  process.exit(1);
});
