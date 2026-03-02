#!/usr/bin/env node
/**
 * Shopify Inventory Sync Cron
 * Pushes allocated inventory quantities to Shopify stores.
 *
 * Schedule: every 30 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const shopifyApiService = require('../src/services/shopifyService');
const { decrypt } = require('../src/utils/encryption');

async function run() {
  console.log('[shopify-sync-inventory] Starting inventory sync…');

  const [rows] = await db.execute(`
    SELECT
      sia.product_id, sia.user_id, sia.allocated_quantity,
      spd.shopify_product_id,
      sus.shop_domain, sus.access_token
    FROM shopify_inventory_allocations sia
    JOIN shopify_product_data spd ON sia.product_id = spd.product_id AND sia.user_id = spd.user_id
    JOIN shopify_user_shops sus ON sia.user_id = sus.user_id AND sus.is_active = 1
    WHERE spd.shopify_product_id IS NOT NULL AND spd.is_active = 1
  `);

  console.log(`[shopify-sync-inventory] Found ${rows.length} allocations to sync`);
  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const accessToken = decrypt(row.access_token);
      const product = await shopifyApiService.getProduct(row.shop_domain, accessToken, row.shopify_product_id);

      if (product.variants && product.variants.length > 0) {
        const variant = product.variants[0];
        if (variant.inventory_item_id) {
          const locations = await shopifyApiService.getLocations(row.shop_domain, accessToken);
          if (locations.length > 0) {
            await shopifyApiService.setInventoryLevel(
              row.shop_domain, accessToken,
              locations[0].id, variant.inventory_item_id,
              row.allocated_quantity
            );
          }
        }
      }

      await db.execute(`
        INSERT INTO shopify_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'inventory', 'push', ?, 'success', ?)
      `, [row.user_id, row.product_id, `Cron: set qty ${row.allocated_quantity}`]);
      synced++;
    } catch (err) {
      console.error(`[shopify-sync-inventory] Error for product ${row.product_id}:`, err.message);
      await db.execute(`
        INSERT INTO shopify_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'inventory', 'push', ?, 'error', ?)
      `, [row.user_id, row.product_id, err.message]);
      failed++;
    }
  }

  console.log(`[shopify-sync-inventory] Done: ${synced} synced, ${failed} failed`);
  process.exit(0);
}

run().catch(err => {
  console.error('[shopify-sync-inventory] Fatal:', err);
  process.exit(1);
});
