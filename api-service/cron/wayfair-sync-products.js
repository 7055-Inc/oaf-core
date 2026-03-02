#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(process.cwd(), 'api-service/.env') });
const db = require('../config/db');
const wayfairService = require('../src/services/wayfairService');

/**
 * @fileoverview Wayfair Product Sync
 *
 * Cron job to push pending products to Wayfair via GraphQL API.
 * Runs every 30 minutes.
 *
 * Flow:
 * 1. Find products with sync_status = 'pending' in wayfair_corporate_products
 * 2. Build Wayfair-formatted product data
 * 3. Push to Wayfair via GraphQL mutation
 * 4. Update sync status
 */

const BATCH_SIZE = 50;

function calculateWayfairPrice(product) {
  const wholesale = parseFloat(product.wholesale_price) || 0;
  const retail = parseFloat(product.retail_price) || 0;
  if (wholesale > 0) return Math.round(wholesale * 2 * 100) / 100;
  return Math.round(retail * 1.2 * 100) / 100;
}

async function syncProductsToWayfair() {
  console.log('[Wayfair Sync] Starting product sync to Wayfair...');
  console.log(`[Wayfair Sync] Environment: ${process.env.WAYFAIR_ENV || 'sandbox'}`);
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  try {
    const [pendingProducts] = await db.query(`
      SELECT 
        wcp.id as wayfair_id,
        wcp.product_id,
        wcp.wayfair_sku,
        wcp.wayfair_part_number,
        wcp.wayfair_title,
        wcp.wayfair_description,
        wcp.wayfair_short_description,
        wcp.wayfair_price,
        wcp.wayfair_brand,
        wcp.wayfair_category,
        wcp.wayfair_color,
        wcp.wayfair_material,
        wcp.wayfair_key_features,
        wcp.wayfair_main_image_url,
        wcp.wayfair_additional_images,
        wcp.wayfair_dimensions,
        wcp.wayfair_shipping_weight,
        wcp.wayfair_shipping_length,
        wcp.wayfair_shipping_width,
        wcp.wayfair_shipping_height,
        wcp.listing_status,
        wcp.sync_status,

        p.sku,
        p.name,
        p.description,
        p.price as retail_price,
        p.wholesale_price,
        p.width,
        p.height,
        p.depth,
        p.weight,

        COALESCE(ap.business_name, 'Brakebee Marketplace') as brand,
        COALESCE(wia.allocated_quantity, 0) as allocated_quantity

      FROM wayfair_corporate_products wcp
      JOIN products p ON p.id = wcp.product_id
      LEFT JOIN users u ON p.vendor_id = u.id
      LEFT JOIN artist_profiles ap ON u.id = ap.user_id
      LEFT JOIN wayfair_inventory_allocations wia ON wcp.product_id = wia.product_id AND wia.user_id = p.vendor_id

      WHERE wcp.sync_status = 'pending'
        AND wcp.is_active = 1
        AND wcp.listing_status IN ('pending', 'listed')
        AND p.status = 'active'

      ORDER BY wcp.created_at ASC
      LIMIT ${BATCH_SIZE}
    `);

    console.log(`[Wayfair Sync] Found ${pendingProducts.length} products pending sync`);

    if (pendingProducts.length === 0) {
      console.log('[Wayfair Sync] No products to sync');
      return { success: true, synced: 0, errors: 0 };
    }

    for (const product of pendingProducts) {
      try {
        const wayfairPrice = parseFloat(product.wayfair_price) ||
          calculateWayfairPrice(product);

        const productData = {
          wayfair_sku: product.wayfair_sku || `WAYFAIR-${product.product_id}`,
          wayfair_part_number: product.wayfair_part_number || product.wayfair_sku,
          wayfair_title: product.wayfair_title || product.name,
          wayfair_description: product.wayfair_description || product.description || '',
          wayfair_short_description: product.wayfair_short_description || '',
          wayfair_brand: product.wayfair_brand || product.brand,
          wayfair_category: product.wayfair_category,
          wayfair_price: wayfairPrice,
          wayfair_color: product.wayfair_color,
          wayfair_material: product.wayfair_material,
          wayfair_key_features: product.wayfair_key_features,
          wayfair_main_image_url: product.wayfair_main_image_url,
          wayfair_additional_images: product.wayfair_additional_images,
          wayfair_dimensions: product.wayfair_dimensions,
          wayfair_shipping_weight: product.wayfair_shipping_weight || product.weight,
          wayfair_shipping_length: product.wayfair_shipping_length,
          wayfair_shipping_width: product.wayfair_shipping_width,
          wayfair_shipping_height: product.wayfair_shipping_height,
          width: product.width,
          height: product.height,
          depth: product.depth,
          weight: product.weight
        };

        await wayfairService.syncProduct(productData);

        await db.query(`
          UPDATE wayfair_corporate_products
          SET sync_status = 'synced',
              last_sync_at = NOW(),
              last_sync_error = NULL,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [product.wayfair_id]);

        successCount++;

      } catch (itemError) {
        console.error(`[Wayfair Sync] Error syncing product ${product.product_id}:`, itemError.message);
        errorCount++;

        await db.query(`
          UPDATE wayfair_corporate_products
          SET sync_status = 'failed',
              last_sync_error = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [itemError.message.substring(0, 500), product.wayfair_id]);
      }
    }

    await db.query(`
      INSERT INTO wayfair_sync_logs
      (user_id, sync_type, operation, status, message)
      VALUES (NULL, 'product', 'push', ?, ?)
    `, [
      errorCount === 0 ? 'success' : 'warning',
      `${successCount} synced, ${errorCount} errors in ${((Date.now() - startTime) / 1000).toFixed(2)}s`
    ]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Wayfair Sync] Completed: ${successCount} synced, ${errorCount} errors in ${duration}s`);

    return { success: true, synced: successCount, errors: errorCount, duration };

  } catch (error) {
    console.error('[Wayfair Sync] Fatal error:', error);
    return { success: false, error: error.message };
  }
}

syncProductsToWayfair()
  .then(result => {
    console.log('[Wayfair Sync] Done:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('[Wayfair Sync] Uncaught error:', error);
    process.exit(1);
  });
