#!/usr/bin/env node
/**
 * Faire Product Sync Cron
 * Pushes pending products from faire_product_data to connected Faire brands.
 * Faire uses wholesale_price_cents (prices in cents).
 *
 * Schedule: every 15 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const faireApiService = require('../src/services/faireService');

const BATCH_SIZE = 20;

async function run() {
  console.log('[faire-sync-products] Starting product sync…');

  const [rows] = await db.execute(`
    SELECT
      fpd.product_id, fpd.user_id, fpd.faire_title, fpd.faire_description,
      fpd.faire_wholesale_price, fpd.faire_retail_price, fpd.faire_product_id,
      fpd.faire_category, fpd.faire_minimum_order_quantity,
      p.name, p.price, p.sku, p.description,
      fia.allocated_quantity,
      fus.shop_id, fus.access_token
    FROM faire_product_data fpd
    JOIN products p ON fpd.product_id = p.id
    LEFT JOIN faire_inventory_allocations fia ON p.id = fia.product_id AND fia.user_id = fpd.user_id
    JOIN faire_user_shops fus ON fpd.user_id = fus.user_id AND fus.is_active = 1
    WHERE fpd.sync_status IN ('pending', 'ready_for_api_sync') AND fpd.is_active = 1
    ORDER BY fpd.updated_at ASC
    LIMIT ?
  `, [BATCH_SIZE]);

  console.log(`[faire-sync-products] Found ${rows.length} pending products`);
  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const accessToken = await faireApiService.getShopAccessToken(row.shop_id, row.user_id);
      const [images] = await db.execute(
        'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC',
        [row.product_id]
      );

      const payload = {
        name: row.faire_title || row.name,
        description: row.faire_description || row.description || '',
        wholesale_price_cents: Math.round((parseFloat(row.faire_wholesale_price || row.price) || 0) * 100),
        retail_price_cents: row.faire_retail_price ? Math.round(parseFloat(row.faire_retail_price) * 100) : null,
        minimum_order_quantity: row.faire_minimum_order_quantity || 1,
        images: images.map(i => ({ url: i.image_url }))
      };

      let result;
      if (row.faire_product_id) {
        result = await faireApiService.updateProduct(accessToken, row.faire_product_id, payload);
      } else {
        result = await faireApiService.createProduct(accessToken, payload);
        if (result && result.id) {
          await db.execute(
            'UPDATE faire_product_data SET faire_product_id = ? WHERE product_id = ? AND user_id = ?',
            [result.id, row.product_id, row.user_id]
          );
        }
      }

      await db.execute(
        `UPDATE faire_product_data SET sync_status = 'synced', last_sync_at = NOW(), last_sync_error = NULL WHERE product_id = ? AND user_id = ?`,
        [row.product_id, row.user_id]
      );

      await db.execute(`
        INSERT INTO faire_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'product', 'push', ?, 'success', 'Cron: synced to Faire')
      `, [row.user_id, row.product_id]);
      synced++;
    } catch (err) {
      console.error(`[faire-sync-products] Error syncing product ${row.product_id}:`, err.message);
      await db.execute(
        `UPDATE faire_product_data SET last_sync_error = ?, last_sync_at = NOW() WHERE product_id = ? AND user_id = ?`,
        [err.message, row.product_id, row.user_id]
      );
      await db.execute(`
        INSERT INTO faire_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'product', 'push', ?, 'failed', ?)
      `, [row.user_id, row.product_id, err.message]);
      failed++;
    }
  }

  console.log(`[faire-sync-products] Done: ${synced} synced, ${failed} failed`);
  process.exit(0);
}

run().catch(err => {
  console.error('[faire-sync-products] Fatal:', err);
  process.exit(1);
});
