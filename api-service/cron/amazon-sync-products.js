#!/usr/bin/env node
/**
 * Amazon Product Sync Cron
 * Pushes pending products from amazon_product_data to Amazon via Listings API.
 *
 * Schedule: every 15 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const amazonApiService = require('../src/services/amazonService');

const BATCH_SIZE = 20;

async function run() {
  console.log('[amazon-sync-products] Starting product sync…');

  const [rows] = await db.execute(`
    SELECT
      apd.product_id, apd.user_id, apd.amazon_title, apd.amazon_description,
      apd.amazon_price, apd.amazon_asin, apd.amazon_sku,
      apd.amazon_category, apd.amazon_brand, apd.amazon_condition,
      p.name, p.price, p.sku, p.description,
      aia.allocated_quantity,
      aus.shop_id, aus.selling_partner_id, aus.access_token
    FROM amazon_product_data apd
    JOIN products p ON apd.product_id = p.id
    LEFT JOIN amazon_inventory_allocations aia ON p.id = aia.product_id AND aia.user_id = apd.user_id
    JOIN amazon_user_shops aus ON apd.user_id = aus.user_id AND aus.is_active = 1
    WHERE apd.sync_status IN ('pending', 'ready_for_api_sync') AND apd.is_active = 1
    ORDER BY apd.updated_at ASC
    LIMIT ?
  `, [BATCH_SIZE]);

  console.log(`[amazon-sync-products] Found ${rows.length} pending products`);
  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const accessToken = await amazonApiService.getShopAccessToken(row.shop_id, row.user_id);
      const sku = row.amazon_sku || `BRK-${row.sku || row.product_id}`;
      const sellerId = row.selling_partner_id;

      const listingBody = {
        productType: row.amazon_category || 'PRODUCT',
        requirements: 'LISTING',
        attributes: {
          item_name: [{ value: row.amazon_title || row.name }],
          brand_name: [{ value: row.amazon_brand || 'Brakebee' }],
          list_price: [{ value: parseFloat(row.amazon_price || row.price), currency: 'USD' }],
          condition_type: [{ value: row.amazon_condition || 'new_new' }],
          product_description: [{ value: row.amazon_description || row.description || '' }],
          fulfillment_availability: [{
            fulfillment_channel_code: 'DEFAULT',
            quantity: row.allocated_quantity || 0
          }]
        }
      };

      await amazonApiService.putListingsItem(accessToken, sellerId, sku, listingBody);

      await db.execute(
        `UPDATE amazon_product_data SET amazon_sku = ?, sync_status = 'synced', last_sync_at = NOW(), last_sync_error = NULL WHERE product_id = ? AND user_id = ?`,
        [sku, row.product_id, row.user_id]
      );

      await db.execute(`
        INSERT INTO amazon_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'product', 'push', ?, 'success', 'Cron: synced to Amazon')
      `, [row.user_id, row.product_id]);
      synced++;
    } catch (err) {
      console.error(`[amazon-sync-products] Error syncing product ${row.product_id}:`, err.message);
      await db.execute(
        `UPDATE amazon_product_data SET last_sync_error = ?, last_sync_at = NOW() WHERE product_id = ? AND user_id = ?`,
        [err.message, row.product_id, row.user_id]
      );
      await db.execute(`
        INSERT INTO amazon_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'product', 'push', ?, 'failed', ?)
      `, [row.user_id, row.product_id, err.message]);
      failed++;
    }
  }

  console.log(`[amazon-sync-products] Done: ${synced} synced, ${failed} failed`);
  process.exit(0);
}

run().catch(err => {
  console.error('[amazon-sync-products] Fatal:', err);
  process.exit(1);
});
