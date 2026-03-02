#!/usr/bin/env node
/**
 * Etsy Product Sync Cron
 * Pushes pending products from etsy_product_data to connected Etsy shops as draft listings.
 *
 * Schedule: every 15 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const etsyApiService = require('../src/services/etsyService');
const { decrypt } = require('../src/utils/encryption');

const BATCH_SIZE = 20;

async function run() {
  console.log('[etsy-sync-products] Starting product sync…');

  const [rows] = await db.execute(`
    SELECT
      epd.product_id, epd.user_id, epd.shop_id, epd.etsy_listing_id,
      epd.etsy_title, epd.etsy_description, epd.etsy_price, epd.etsy_quantity,
      epd.etsy_sku, epd.etsy_tags, epd.etsy_materials,
      epd.etsy_category_id, epd.etsy_taxonomy_id, epd.etsy_shipping_profile_id,
      p.name, p.price, p.sku, p.description,
      eia.allocated_quantity,
      eus.shop_id as shop_ext_id, eus.access_token, eus.refresh_token, eus.token_expires_at
    FROM etsy_product_data epd
    JOIN products p ON epd.product_id = p.id
    LEFT JOIN etsy_inventory_allocations eia ON p.id = eia.product_id AND eia.user_id = epd.user_id
    JOIN etsy_user_shops eus ON epd.shop_id = eus.shop_id AND epd.user_id = eus.user_id AND eus.is_active = 1
    WHERE epd.sync_status IN ('pending', 'ready_for_api_sync') AND epd.is_active = 1
    ORDER BY epd.updated_at ASC
    LIMIT ?
  `, [BATCH_SIZE]);

  console.log(`[etsy-sync-products] Found ${rows.length} pending products`);
  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const accessToken = await etsyApiService.getShopAccessToken(row.shop_id, row.user_id);

      let tags = [];
      try { tags = typeof row.etsy_tags === 'string' ? JSON.parse(row.etsy_tags) : (row.etsy_tags || []); } catch (e) { /* ignore */ }
      let materials = [];
      try { materials = typeof row.etsy_materials === 'string' ? JSON.parse(row.etsy_materials) : (row.etsy_materials || []); } catch (e) { /* ignore */ }

      const quantity = row.allocated_quantity || row.etsy_quantity || 1;

      const payload = {
        title: row.etsy_title || row.name,
        description: row.etsy_description || row.description || '',
        price: parseFloat(row.etsy_price || row.price),
        quantity,
        sku: [row.etsy_sku || `BRK-${row.sku || row.product_id}`],
        tags: tags.slice(0, 13),
        materials: materials.slice(0, 13),
        who_made: 'i_did',
        when_made: 'made_to_order',
        is_supply: false,
        state: 'draft'
      };

      if (row.etsy_taxonomy_id) payload.taxonomy_id = parseInt(row.etsy_taxonomy_id);
      if (row.etsy_shipping_profile_id) payload.shipping_profile_id = parseInt(row.etsy_shipping_profile_id);

      let result;
      if (row.etsy_listing_id) {
        result = await etsyApiService.updateListing(row.shop_id, row.etsy_listing_id, payload, accessToken);
      } else {
        result = await etsyApiService.createDraftListing(row.shop_id, payload, accessToken);
        if (result && result.listing_id) {
          await db.execute(
            'UPDATE etsy_product_data SET etsy_listing_id = ? WHERE product_id = ? AND user_id = ?',
            [String(result.listing_id), row.product_id, row.user_id]
          );
        }
      }

      await db.execute(
        `UPDATE etsy_product_data SET sync_status = 'synced', listing_state = 'draft', last_sync_at = NOW(), last_sync_error = NULL WHERE product_id = ? AND user_id = ?`,
        [row.product_id, row.user_id]
      );

      await db.execute(`
        INSERT INTO etsy_sync_logs (user_id, shop_id, sync_type, operation, reference_id, status, message)
        VALUES (?, ?, 'product', 'push', ?, 'success', 'Cron: synced to Etsy')
      `, [row.user_id, row.shop_id, row.product_id]);

      synced++;
    } catch (err) {
      console.error(`[etsy-sync-products] Error syncing product ${row.product_id}:`, err.message);
      await db.execute(
        `UPDATE etsy_product_data SET last_sync_error = ?, last_sync_at = NOW() WHERE product_id = ? AND user_id = ?`,
        [err.message, row.product_id, row.user_id]
      );
      await db.execute(`
        INSERT INTO etsy_sync_logs (user_id, shop_id, sync_type, operation, reference_id, status, message)
        VALUES (?, ?, 'product', 'push', ?, 'failed', ?)
      `, [row.user_id, row.shop_id, row.product_id, err.message]);
      failed++;
    }
  }

  console.log(`[etsy-sync-products] Done: ${synced} synced, ${failed} failed`);
  process.exit(0);
}

run().catch(err => {
  console.error('[etsy-sync-products] Fatal:', err);
  process.exit(1);
});
