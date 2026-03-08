#!/usr/bin/env node
/**
 * Shopify Tracking Sync Cron
 * Pushes tracking/fulfillment data for shipped order items to Shopify stores.
 *
 * Schedule: every 30 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const shopifyApiService = require('../src/services/shopifyService');
const { decrypt } = require('../src/utils/encryption');

async function run() {
  console.log('[shopify-sync-tracking] Starting tracking sync…');

  const [items] = await db.execute(`
    SELECT
      soi.id as item_id, soi.shopify_order_id, soi.tracking_number, soi.tracking_carrier,
      so.shopify_order_id as ext_order_id, so.user_id, so.shop_id,
      sus.shop_domain, sus.access_token
    FROM shopify_order_items soi
    JOIN shopify_orders so ON soi.shopify_order_id = so.id
    JOIN shopify_user_shops sus ON so.user_id = sus.user_id AND so.shop_id = sus.shop_id AND sus.is_active = 1
    WHERE soi.tracking_number IS NOT NULL
      AND soi.tracking_number != ''
      AND soi.tracking_synced_at IS NULL
      AND soi.status IN ('shipped', 'processing')
  `);

  console.log(`[shopify-sync-tracking] Found ${items.length} items with unsynced tracking`);
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const accessToken = decrypt(item.access_token);
      await shopifyApiService.createFulfillment(item.shop_domain, accessToken, item.ext_order_id, {
        tracking_number: item.tracking_number,
        tracking_company: item.tracking_carrier || 'Other',
        notify_customer: true
      });

      await db.execute(
        `UPDATE shopify_order_items SET tracking_synced_at = NOW(), status = 'shipped' WHERE id = ?`,
        [item.item_id]
      );

      await db.execute(`
        INSERT INTO shopify_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'tracking', 'push', ?, 'success', ?)
      `, [item.user_id, item.item_id, `Cron: tracking ${item.tracking_number} pushed`]);
      synced++;
    } catch (err) {
      console.error(`[shopify-sync-tracking] Error for item ${item.item_id}:`, err.message);
      await db.execute(`
        INSERT INTO shopify_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'tracking', 'push', ?, 'error', ?)
      `, [item.user_id, item.item_id, err.message]);
      failed++;
    }
  }

  console.log(`[shopify-sync-tracking] Done: ${synced} synced, ${failed} failed`);
  process.exit(0);
}

run().catch(err => {
  console.error('[shopify-sync-tracking] Fatal:', err);
  process.exit(1);
});
