#!/usr/bin/env node
/**
 * Meta Inventory Sync Cron
 * Pushes allocated inventory quantities to Meta catalog products.
 *
 * Schedule: every 30 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const metaApiService = require('../src/services/metaService');

async function run() {
  console.log('[meta-sync-inventory] Starting inventory sync…');

  const [rows] = await db.execute(`
    SELECT
      mia.product_id, mia.user_id, mia.allocated_quantity,
      mpd.meta_product_id,
      mus.shop_id
    FROM meta_inventory_allocations mia
    JOIN meta_product_data mpd ON mia.product_id = mpd.product_id AND mia.user_id = mpd.user_id
    JOIN meta_user_shops mus ON mia.user_id = mus.user_id AND mus.is_active = 1
    WHERE mpd.meta_product_id IS NOT NULL AND mpd.is_active = 1
  `);

  console.log(`[meta-sync-inventory] Found ${rows.length} allocations to sync`);
  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const accessToken = await metaApiService.getShopAccessToken(row.shop_id, row.user_id);

      await metaApiService.updateProductInventory(accessToken, row.meta_product_id, row.allocated_quantity);

      await db.execute(`
        INSERT INTO meta_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'inventory', 'push', ?, 'success', ?)
      `, [row.user_id, row.product_id, `Cron: set qty ${row.allocated_quantity}`]);
      synced++;
    } catch (err) {
      console.error(`[meta-sync-inventory] Error for product ${row.product_id}:`, err.message);
      await db.execute(`
        INSERT INTO meta_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'inventory', 'push', ?, 'failed', ?)
      `, [row.user_id, row.product_id, err.message]);
      failed++;
    }
  }

  console.log(`[meta-sync-inventory] Done: ${synced} synced, ${failed} failed`);
  process.exit(0);
}

run().catch(err => {
  console.error('[meta-sync-inventory] Fatal:', err);
  process.exit(1);
});
