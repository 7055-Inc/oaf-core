#!/usr/bin/env node
/**
 * Meta Product Sync Cron
 * Pushes pending products from meta_product_data to connected Meta catalogs.
 * Meta uses "X.XX USD" price format for catalog products.
 *
 * Schedule: every 15 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const metaApiService = require('../src/services/metaService');

const BATCH_SIZE = 20;

async function run() {
  console.log('[meta-sync-products] Starting product sync…');

  const [rows] = await db.execute(`
    SELECT
      mpd.product_id, mpd.user_id, mpd.meta_title, mpd.meta_description,
      mpd.meta_price, mpd.meta_product_id, mpd.meta_category,
      p.name, p.price, p.sku, p.description,
      mia.allocated_quantity,
      mus.shop_id, mus.access_token, mus.catalog_id
    FROM meta_product_data mpd
    JOIN products p ON mpd.product_id = p.id
    LEFT JOIN meta_inventory_allocations mia ON p.id = mia.product_id AND mia.user_id = mpd.user_id
    JOIN meta_user_shops mus ON mpd.user_id = mus.user_id AND mus.is_active = 1
    WHERE mpd.sync_status IN ('pending', 'ready_for_api_sync') AND mpd.is_active = 1
    ORDER BY mpd.updated_at ASC
    LIMIT ?
  `, [BATCH_SIZE]);

  console.log(`[meta-sync-products] Found ${rows.length} pending products`);
  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const accessToken = await metaApiService.getShopAccessToken(row.shop_id, row.user_id);
      const [images] = await db.execute(
        'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC',
        [row.product_id]
      );

      const priceNum = parseFloat(row.meta_price || row.price) || 0;
      const quantity = row.allocated_quantity || 0;

      const payload = {
        retailer_id: `BRK-${row.sku}`,
        name: row.meta_title || row.name,
        description: row.meta_description || row.description || '',
        price: `${priceNum.toFixed(2)} USD`,
        availability: quantity > 0 ? 'in stock' : 'out of stock',
        image_url: images.length > 0 ? images[0].image_url : null,
        category: row.meta_category || null
      };

      let result;
      if (row.meta_product_id) {
        result = await metaApiService.updateProduct(accessToken, row.meta_product_id, payload);
      } else {
        result = await metaApiService.createProduct(accessToken, row.catalog_id, payload);
        if (result && result.id) {
          await db.execute(
            'UPDATE meta_product_data SET meta_product_id = ? WHERE product_id = ? AND user_id = ?',
            [result.id, row.product_id, row.user_id]
          );
        }
      }

      await db.execute(
        `UPDATE meta_product_data SET sync_status = 'synced', last_sync_at = NOW(), last_sync_error = NULL WHERE product_id = ? AND user_id = ?`,
        [row.product_id, row.user_id]
      );

      await db.execute(`
        INSERT INTO meta_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'product', 'push', ?, 'success', 'Cron: synced to Meta')
      `, [row.user_id, row.product_id]);
      synced++;
    } catch (err) {
      console.error(`[meta-sync-products] Error syncing product ${row.product_id}:`, err.message);
      await db.execute(
        `UPDATE meta_product_data SET last_sync_error = ?, last_sync_at = NOW() WHERE product_id = ? AND user_id = ?`,
        [err.message, row.product_id, row.user_id]
      );
      await db.execute(`
        INSERT INTO meta_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'product', 'push', ?, 'failed', ?)
      `, [row.user_id, row.product_id, err.message]);
      failed++;
    }
  }

  console.log(`[meta-sync-products] Done: ${synced} synced, ${failed} failed`);
  process.exit(0);
}

run().catch(err => {
  console.error('[meta-sync-products] Fatal:', err);
  process.exit(1);
});
