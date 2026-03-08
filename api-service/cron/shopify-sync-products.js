#!/usr/bin/env node
/**
 * Shopify Product Sync Cron
 * Pushes pending products from shopify_product_data to connected Shopify stores.
 * Mirrors walmart-sync-products.js pattern for OAuth connectors.
 *
 * Schedule: every 15 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const shopifyApiService = require('../src/services/shopifyService');
const { decrypt } = require('../src/utils/encryption');

const BATCH_SIZE = 20;

async function run() {
  console.log('[shopify-sync-products] Starting product sync…');

  const [rows] = await db.execute(`
    SELECT
      spd.product_id, spd.user_id, spd.shopify_title, spd.shopify_description,
      spd.shopify_price, spd.shopify_tags, spd.shopify_product_type, spd.shopify_product_id,
      p.name, p.price, p.sku, p.description, p.weight, p.weight_unit,
      sia.allocated_quantity,
      sus.shop_id, sus.shop_domain, sus.access_token
    FROM shopify_product_data spd
    JOIN products p ON spd.product_id = p.id
    LEFT JOIN shopify_inventory_allocations sia ON p.id = sia.product_id AND sia.user_id = spd.user_id
    JOIN shopify_user_shops sus ON spd.user_id = sus.user_id AND sus.is_active = 1
    WHERE spd.sync_status = 'pending' AND spd.is_active = 1
    ORDER BY spd.updated_at ASC
    LIMIT ?
  `, [BATCH_SIZE]);

  console.log(`[shopify-sync-products] Found ${rows.length} pending products`);
  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const accessToken = decrypt(row.access_token);
      const [images] = await db.execute(
        'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC',
        [row.product_id]
      );

      const payload = {
        title: row.shopify_title || row.name,
        body_html: row.shopify_description || row.description || '',
        product_type: row.shopify_product_type || 'Art',
        tags: row.shopify_tags || '',
        variants: [{
          price: row.shopify_price || row.price,
          sku: `BRK-${row.sku || row.product_id}`,
          inventory_quantity: row.allocated_quantity || 0,
          inventory_management: 'shopify'
        }],
        images: images.map(img => ({ src: img.image_url }))
      };

      let result;
      if (row.shopify_product_id) {
        result = await shopifyApiService.updateProduct(row.shop_domain, accessToken, row.shopify_product_id, payload);
      } else {
        result = await shopifyApiService.createProduct(row.shop_domain, accessToken, payload);
        await db.execute(
          `UPDATE shopify_product_data SET shopify_product_id = ? WHERE product_id = ? AND user_id = ?`,
          [result.id, row.product_id, row.user_id]
        );
      }

      await db.execute(
        `UPDATE shopify_product_data SET sync_status = 'synced', last_sync_at = NOW(), last_sync_error = NULL WHERE product_id = ? AND user_id = ?`,
        [row.product_id, row.user_id]
      );

      await db.execute(`
        INSERT INTO shopify_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'product', 'push', ?, 'success', 'Cron: synced to Shopify')
      `, [row.user_id, row.product_id]);

      synced++;
    } catch (err) {
      console.error(`[shopify-sync-products] Error syncing product ${row.product_id}:`, err.message);
      await db.execute(
        `UPDATE shopify_product_data SET last_sync_error = ?, last_sync_at = NOW() WHERE product_id = ? AND user_id = ?`,
        [err.message, row.product_id, row.user_id]
      );
      await db.execute(`
        INSERT INTO shopify_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'product', 'push', ?, 'error', ?)
      `, [row.user_id, row.product_id, err.message]);
      failed++;
    }
  }

  console.log(`[shopify-sync-products] Done: ${synced} synced, ${failed} failed`);
  process.exit(0);
}

run().catch(err => {
  console.error('[shopify-sync-products] Fatal:', err);
  process.exit(1);
});
