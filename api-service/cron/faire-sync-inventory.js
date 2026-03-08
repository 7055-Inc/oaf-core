#!/usr/bin/env node
/**
 * Faire Inventory Sync Cron
 * Pushes allocated inventory quantities to Faire product options.
 *
 * Schedule: every 30 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const faireApiService = require('../src/services/faireService');

async function run() {
  console.log('[faire-sync-inventory] Starting inventory sync…');

  const [rows] = await db.execute(`
    SELECT
      fia.product_id, fia.user_id, fia.allocated_quantity,
      fpd.faire_product_id,
      fus.shop_id
    FROM faire_inventory_allocations fia
    JOIN faire_product_data fpd ON fia.product_id = fpd.product_id AND fia.user_id = fpd.user_id
    JOIN faire_user_shops fus ON fia.user_id = fus.user_id AND fus.is_active = 1
    WHERE fpd.faire_product_id IS NOT NULL AND fpd.is_active = 1
  `);

  console.log(`[faire-sync-inventory] Found ${rows.length} allocations to sync`);
  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const accessToken = await faireApiService.getShopAccessToken(row.shop_id, row.user_id);

      const options = await faireApiService.listProductOptions(accessToken, row.faire_product_id);
      const optionsList = options.options || options || [];

      for (const opt of optionsList) {
        if (opt.id) {
          await faireApiService.updateProductOption(accessToken, opt.id, {
            available_quantity: row.allocated_quantity
          });
        }
      }

      await db.execute(`
        INSERT INTO faire_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'inventory', 'push', ?, 'success', ?)
      `, [row.user_id, row.product_id, `Cron: set qty ${row.allocated_quantity}`]);
      synced++;
    } catch (err) {
      console.error(`[faire-sync-inventory] Error for product ${row.product_id}:`, err.message);
      await db.execute(`
        INSERT INTO faire_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'inventory', 'push', ?, 'failed', ?)
      `, [row.user_id, row.product_id, err.message]);
      failed++;
    }
  }

  console.log(`[faire-sync-inventory] Done: ${synced} synced, ${failed} failed`);
  process.exit(0);
}

run().catch(err => {
  console.error('[faire-sync-inventory] Fatal:', err);
  process.exit(1);
});
