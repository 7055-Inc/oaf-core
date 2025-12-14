#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(process.cwd(), 'api-service/.env') });
const db = require('../config/db');
const walmartService = require('../src/services/walmartService');
const { calculateWalmartPrice } = require('../src/utils/walmartPricing');

/**
 * @fileoverview Walmart Product Sync
 * 
 * Cron job to push pending products to Walmart Marketplace.
 * Runs every 30 minutes.
 * 
 * Flow:
 * 1. Find products with sync_status = 'pending' in walmart_corporate_products
 * 2. Build Walmart-formatted product data
 * 3. Push to Walmart via feed API
 * 4. Update sync status
 */

const BATCH_SIZE = 50;

async function syncProductsToWalmart() {
  console.log('[Walmart Sync] Starting product sync to Walmart...');
  console.log(`[Walmart Sync] Environment: ${process.env.WALMART_ENV || 'sandbox'}`);
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  try {
    // Find products pending sync
    const [pendingProducts] = await db.query(`
      SELECT 
        wcp.id as walmart_id,
        wcp.product_id,
        wcp.walmart_title,
        wcp.walmart_description,
        wcp.walmart_price,
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
        
        -- Feed metadata for identifiers
        pfm.gtin,
        pfm.mpn,
        pfm.identifier_exists,
        pfm.google_product_category,
        pfm.condition,
        
        -- Vendor brand
        COALESCE(ap.business_name, 'Brakebee Marketplace') as brand,
        
        -- Allocated inventory
        COALESCE(wia.allocated_quantity, 0) as allocated_quantity
        
      FROM walmart_corporate_products wcp
      JOIN products p ON p.id = wcp.product_id
      LEFT JOIN product_feed_metadata pfm ON p.id = pfm.product_id
      LEFT JOIN users u ON p.vendor_id = u.id
      LEFT JOIN artist_profiles ap ON u.id = ap.user_id
      LEFT JOIN walmart_inventory_allocations wia ON wcp.product_id = wia.product_id AND wia.user_id = p.vendor_id
      
      WHERE wcp.sync_status = 'pending'
        AND wcp.is_active = 1
        AND wcp.listing_status IN ('pending', 'active')
        AND p.status = 'active'
      
      ORDER BY wcp.created_at ASC
      LIMIT ${BATCH_SIZE}
    `);

    console.log(`[Walmart Sync] Found ${pendingProducts.length} products pending sync`);

    if (pendingProducts.length === 0) {
      console.log('[Walmart Sync] No products to sync');
      return { success: true, synced: 0, errors: 0 };
    }

    // Build Walmart feed items
    const feedItems = [];
    
    for (const product of pendingProducts) {
      try {
        // Calculate price using our pricing utility
        const walmartPrice = product.walmart_price || 
          calculateWalmartPrice({ price: product.retail_price, wholesale_price: product.wholesale_price });
        
        // Build Walmart item structure
        const walmartItem = {
          sku: `BRK-${product.sku}`, // Prefix to avoid conflicts
          productName: product.walmart_title || product.name,
          shortDescription: (product.walmart_description || product.description || '').substring(0, 1000),
          price: walmartPrice.toFixed(2),
          brand: product.brand,
          condition: product.condition || 'New',
          
          // Product identifiers
          productIdentifiers: product.gtin ? {
            productIdType: 'GTIN',
            productId: product.gtin
          } : null,
          
          // Only include MPN if no GTIN
          mpn: !product.gtin && product.mpn ? product.mpn : null,
          
          // Shipping dimensions
          shippingWeight: product.weight || 1,
          
          // Inventory
          quantity: product.allocated_quantity || 0
        };

        feedItems.push({
          walmartId: product.walmart_id,
          productId: product.product_id,
          item: walmartItem
        });

      } catch (itemError) {
        console.error(`[Walmart Sync] Error building item ${product.product_id}:`, itemError.message);
        errorCount++;
        
        await db.query(`
          UPDATE walmart_corporate_products 
          SET sync_status = 'error', 
              sync_error = ?,
              last_sync_attempt = NOW()
          WHERE id = ?
        `, [itemError.message.substring(0, 255), product.walmart_id]);
      }
    }

    if (feedItems.length === 0) {
      console.log('[Walmart Sync] No valid items to push');
      return { success: true, synced: 0, errors: errorCount };
    }

    // Push to Walmart API
    console.log(`[Walmart Sync] Pushing ${feedItems.length} items to Walmart...`);
    
    try {
      const feedResult = await walmartService.pushProducts(feedItems.map(f => f.item));
      
      console.log(`[Walmart Sync] Feed submitted: ${feedResult.feedId || 'pending'}`);
      
      // Update sync status for all items in this batch
      for (const feedItem of feedItems) {
        await db.query(`
          UPDATE walmart_corporate_products 
          SET sync_status = 'synced',
              walmart_feed_id = ?,
              last_sync_at = NOW(),
              last_sync_attempt = NOW()
          WHERE id = ?
        `, [feedResult.feedId || null, feedItem.walmartId]);
        
        successCount++;
      }
      
      // Log sync to walmart_sync_logs
      await db.query(`
        INSERT INTO walmart_sync_logs 
        (user_id, sync_type, items_count, feed_id, operation, status, started_at, completed_at, created_at)
        VALUES (NULL, 'product', ?, ?, 'push', 'success', ?, NOW(), NOW())
      `, [feedItems.length, feedResult.feedId || null, new Date(startTime)]);
      
    } catch (apiError) {
      console.error('[Walmart Sync] API Error:', apiError.message);
      
      // Mark all items as error
      for (const feedItem of feedItems) {
        await db.query(`
          UPDATE walmart_corporate_products 
          SET sync_status = 'error',
              sync_error = ?,
              last_sync_attempt = NOW()
          WHERE id = ?
        `, [apiError.message.substring(0, 255), feedItem.walmartId]);
        
        errorCount++;
      }
      
      // Log failed sync
      await db.query(`
        INSERT INTO walmart_sync_logs 
        (user_id, sync_type, items_count, operation, status, message, started_at, completed_at, created_at)
        VALUES (NULL, 'product', ?, 'push', 'error', ?, ?, NOW(), NOW())
      `, [feedItems.length, apiError.message.substring(0, 500), new Date(startTime)]);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Walmart Sync] Completed: ${successCount} synced, ${errorCount} errors in ${duration}s`);

    return { success: true, synced: successCount, errors: errorCount, duration };

  } catch (error) {
    console.error('[Walmart Sync] Fatal error:', error);
    return { success: false, error: error.message };
  }
}

// Run
syncProductsToWalmart()
  .then(result => {
    console.log('[Walmart Sync] Done:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('[Walmart Sync] Uncaught error:', error);
    process.exit(1);
  });

