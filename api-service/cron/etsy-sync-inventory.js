#!/usr/bin/env node
/**
 * Etsy Inventory Sync Cron
 * Pushes allocated inventory quantities to Etsy listings.
 *
 * Schedule: every 30 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const etsyApiService = require('../src/services/etsyService');

async function run() {
  console.log('[etsy-sync-inventory] Starting inventory sync…');

  const [rows] = await db.execute(`
    SELECT
      eia.product_id, eia.user_id, eia.shop_id, eia.allocated_quantity,
      epd.etsy_listing_id
    FROM etsy_inventory_allocations eia
    JOIN etsy_product_data epd ON eia.product_id = epd.product_id AND eia.user_id = epd.user_id
    WHERE epd.etsy_listing_id IS NOT NULL AND epd.is_active = 1
  `);

  console.log(`[etsy-sync-inventory] Found ${rows.length} allocations to sync`);
  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const accessToken = await etsyApiService.getShopAccessToken(row.shop_id, row.user_id);

      const currentInventory = await etsyApiService.getListingInventory(row.etsy_listing_id, accessToken);

      const products = currentInventory.products || [];
      if (products.length > 0) {
        const updatedProducts = products.map(p => ({
          ...p,
          offerings: (p.offerings || []).map(o => ({
            ...o,
            quantity: row.allocated_quantity
          }))
        }));

        await etsyApiService.updateListingInventory(row.etsy_listing_id, {
          products: updatedProducts
        }, accessToken);
      }

      await db.execute(`
        UPDATE etsy_product_data SET etsy_quantity = ?, last_sync_at = NOW() WHERE product_id = ? AND user_id = ?
      `, [row.allocated_quantity, row.product_id, row.user_id]);

      await db.execute(`
        INSERT INTO etsy_sync_logs (user_id, shop_id, sync_type, operation, reference_id, status, message)
        VALUES (?, ?, 'inventory', 'push', ?, 'success', ?)
      `, [row.user_id, row.shop_id, row.product_id, `Cron: set qty ${row.allocated_quantity}`]);
      synced++;
    } catch (err) {
      console.error(`[etsy-sync-inventory] Error for product ${row.product_id}:`, err.message);
      await db.execute(`
        INSERT INTO etsy_sync_logs (user_id, shop_id, sync_type, operation, reference_id, status, message)
        VALUES (?, ?, 'inventory', 'push', ?, 'failed', ?)
      `, [row.user_id, row.shop_id, row.product_id, err.message]);
      failed++;
    }
  }

  console.log(`[etsy-sync-inventory] Done: ${synced} synced, ${failed} failed`);
  process.exit(0);
}

run().catch(err => {
  console.error('[etsy-sync-inventory] Fatal:', err);
  process.exit(1);
});
