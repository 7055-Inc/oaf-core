#!/usr/bin/env node
/**
 * Amazon Inventory Sync Cron
 * Pushes allocated inventory quantities to Amazon via Listings API patches.
 *
 * Schedule: every 30 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const amazonApiService = require('../src/services/amazonService');

async function run() {
  console.log('[amazon-sync-inventory] Starting inventory sync…');

  const [rows] = await db.execute(`
    SELECT
      aia.product_id, aia.user_id, aia.allocated_quantity,
      apd.amazon_sku,
      aus.shop_id, aus.selling_partner_id
    FROM amazon_inventory_allocations aia
    JOIN amazon_product_data apd ON aia.product_id = apd.product_id AND aia.user_id = apd.user_id
    JOIN amazon_user_shops aus ON aia.user_id = aus.user_id AND aus.is_active = 1
    WHERE apd.amazon_sku IS NOT NULL AND apd.is_active = 1
  `);

  console.log(`[amazon-sync-inventory] Found ${rows.length} allocations to sync`);
  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const accessToken = await amazonApiService.getShopAccessToken(row.shop_id, row.user_id);

      await amazonApiService.patchListingsItem(accessToken, row.selling_partner_id, row.amazon_sku, {
        productType: 'PRODUCT',
        patches: [{
          op: 'replace',
          path: '/attributes/fulfillment_availability',
          value: [{
            fulfillment_channel_code: 'DEFAULT',
            quantity: row.allocated_quantity
          }]
        }]
      });

      await db.execute(`
        INSERT INTO amazon_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'inventory', 'push', ?, 'success', ?)
      `, [row.user_id, row.product_id, `Cron: set qty ${row.allocated_quantity}`]);
      synced++;
    } catch (err) {
      console.error(`[amazon-sync-inventory] Error for product ${row.product_id}:`, err.message);
      await db.execute(`
        INSERT INTO amazon_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'inventory', 'push', ?, 'failed', ?)
      `, [row.user_id, row.product_id, err.message]);
      failed++;
    }
  }

  console.log(`[amazon-sync-inventory] Done: ${synced} synced, ${failed} failed`);
  process.exit(0);
}

run().catch(err => {
  console.error('[amazon-sync-inventory] Fatal:', err);
  process.exit(1);
});
