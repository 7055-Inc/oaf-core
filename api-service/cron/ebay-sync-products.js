#!/usr/bin/env node
/**
 * eBay Product Sync Cron
 * Pushes pending products from ebay_product_data to connected eBay accounts.
 * Schedule: every 15 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const ebayApiService = require('../src/services/ebayService');

const BATCH_SIZE = 20;

async function run() {
  console.log('[ebay-sync-products] Starting…');

  const [rows] = await db.execute(`
    SELECT epd.product_id, epd.user_id, epd.ebay_title, epd.ebay_description,
           epd.ebay_price, epd.ebay_category_id, epd.ebay_condition, epd.ebay_listing_id, epd.ebay_offer_id,
           p.name, p.price, p.sku, p.description,
           eia.allocated_quantity,
           eus.shop_id, eus.access_token, eus.refresh_token, eus.token_expires_at
    FROM ebay_product_data epd
    JOIN products p ON epd.product_id = p.id
    LEFT JOIN ebay_inventory_allocations eia ON p.id = eia.product_id AND eia.user_id = epd.user_id
    JOIN ebay_user_shops eus ON epd.user_id = eus.user_id AND eus.is_active = 1
    WHERE epd.sync_status IN ('pending', 'ready_for_api_sync') AND epd.is_active = 1
    ORDER BY epd.updated_at ASC LIMIT ?
  `, [BATCH_SIZE]);

  console.log(`[ebay-sync-products] ${rows.length} pending`);
  let synced = 0, failed = 0;

  for (const row of rows) {
    try {
      const accessToken = await ebayApiService.getShopAccessToken(row.shop_id, row.user_id);
      const [images] = await db.execute(
        'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC', [row.product_id]
      );

      const sku = `BRK-${row.sku || row.product_id}`;
      await ebayApiService.createOrReplaceInventoryItem(accessToken, sku, {
        product: {
          title: row.ebay_title || row.name,
          description: row.ebay_description || row.description || '',
          imageUrls: images.map(i => i.image_url)
        },
        condition: row.ebay_condition || 'NEW',
        availability: { shipToLocationAvailability: { quantity: row.allocated_quantity || 0 } }
      });

      if (!row.ebay_listing_id) {
        try {
          const offerResult = await ebayApiService.createOffer(accessToken, {
            sku, marketplaceId: 'EBAY_US', format: 'FIXED_PRICE',
            listingDescription: row.ebay_description || row.description || '',
            categoryId: row.ebay_category_id || null,
            pricingSummary: { price: { value: String(row.ebay_price || row.price), currency: 'USD' } },
            availableQuantity: row.allocated_quantity || 0
          });
          const pub = await ebayApiService.publishOffer(accessToken, offerResult.offerId);
          await db.execute(
            `UPDATE ebay_product_data SET ebay_listing_id = ?, ebay_offer_id = ?, sync_status = 'synced', last_sync_at = NOW(), last_sync_error = NULL WHERE product_id = ? AND user_id = ?`,
            [pub.listingId || offerResult.offerId, offerResult.offerId, row.product_id, row.user_id]
          );
        } catch (offerErr) {
          await db.execute(
            `UPDATE ebay_product_data SET sync_status = 'synced', last_sync_at = NOW(), last_sync_error = ? WHERE product_id = ? AND user_id = ?`,
            [`Inventory ok, offer failed: ${offerErr.message}`, row.product_id, row.user_id]
          );
        }
      } else {
        await db.execute(
          `UPDATE ebay_product_data SET sync_status = 'synced', last_sync_at = NOW(), last_sync_error = NULL WHERE product_id = ? AND user_id = ?`,
          [row.product_id, row.user_id]
        );
      }

      await db.execute(`INSERT INTO ebay_sync_logs (user_id, sync_type, operation, reference_id, status, message) VALUES (?, 'product', 'push', ?, 'success', 'Cron: synced')`, [row.user_id, row.product_id]);
      synced++;
    } catch (err) {
      console.error(`[ebay-sync-products] Error ${row.product_id}:`, err.message);
      await db.execute(`UPDATE ebay_product_data SET last_sync_error = ?, last_sync_at = NOW() WHERE product_id = ? AND user_id = ?`, [err.message, row.product_id, row.user_id]);
      await db.execute(`INSERT INTO ebay_sync_logs (user_id, sync_type, operation, reference_id, status, message) VALUES (?, 'product', 'push', ?, 'error', ?)`, [row.user_id, row.product_id, err.message]);
      failed++;
    }
  }

  console.log(`[ebay-sync-products] Done: ${synced} synced, ${failed} failed`);
  process.exit(0);
}

run().catch(err => { console.error('[ebay-sync-products] Fatal:', err); process.exit(1); });
