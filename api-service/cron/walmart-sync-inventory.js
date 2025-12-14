#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(process.cwd(), 'api-service/.env') });
const db = require('../config/db');
const walmartService = require('../src/services/walmartService');

/**
 * @fileoverview Walmart Inventory Sync
 * 
 * Cron job to sync inventory levels to Walmart Marketplace.
 * Runs every 15 minutes.
 * 
 * Flow:
 * 1. Find active Walmart products
 * 2. Calculate available inventory (allocated - sold)
 * 3. Push inventory updates to Walmart
 */

const BATCH_SIZE = 100;

async function syncInventoryToWalmart() {
  console.log('[Walmart Inventory] Starting inventory sync to Walmart...');
  console.log(`[Walmart Inventory] Environment: ${process.env.WALMART_ENV || 'sandbox'}`);
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  try {
    // Find active Walmart products with inventory allocations
    const [products] = await db.query(`
      SELECT 
        wcp.id as walmart_id,
        wcp.product_id,
        p.sku,
        
        -- Allocated quantity from vendors
        COALESCE(SUM(wia.allocated_quantity), 0) as total_allocated,
        
        -- Sold quantity on Walmart (pending + shipped orders)
        COALESCE((
          SELECT SUM(woi.quantity)
          FROM walmart_order_items woi
          JOIN walmart_orders wo ON woi.walmart_order_id = wo.id
          WHERE woi.product_id = wcp.product_id
            AND wo.status IN ('created', 'acknowledged', 'shipped')
        ), 0) as sold_quantity
        
      FROM walmart_corporate_products wcp
      JOIN products p ON p.id = wcp.product_id
      LEFT JOIN walmart_inventory_allocations wia ON wcp.product_id = wia.product_id
      
      WHERE wcp.is_active = 1
        AND wcp.listing_status = 'active'
        AND wcp.sync_status = 'synced'
        AND p.status = 'active'
      
      GROUP BY wcp.id, wcp.product_id, p.sku
      
      ORDER BY wcp.id ASC
      LIMIT ${BATCH_SIZE}
    `);

    console.log(`[Walmart Inventory] Found ${products.length} products to sync`);

    if (products.length === 0) {
      console.log('[Walmart Inventory] No products to sync');
      return { success: true, synced: 0, errors: 0 };
    }

    // Build inventory update items
    const inventoryItems = products.map(product => {
      const availableQty = Math.max(0, product.total_allocated - product.sold_quantity);
      return {
        sku: `BRK-${product.sku}`,
        quantity: availableQty
      };
    });

    // Push to Walmart API
    console.log(`[Walmart Inventory] Pushing ${inventoryItems.length} inventory updates...`);
    
    try {
      const result = await walmartService.bulkUpdateInventory(inventoryItems);
      
      console.log(`[Walmart Inventory] Inventory feed submitted: ${result.feedId || 'pending'}`);
      successCount = inventoryItems.length;
      
      // Log sync
      await db.query(`
        INSERT INTO walmart_sync_logs 
        (user_id, sync_type, items_count, feed_id, operation, status, started_at, completed_at, created_at)
        VALUES (NULL, 'inventory', ?, ?, 'push', 'success', ?, NOW(), NOW())
      `, [inventoryItems.length, result.feedId || null, new Date(startTime)]);
      
    } catch (apiError) {
      console.error('[Walmart Inventory] API Error:', apiError.message);
      errorCount = inventoryItems.length;
      
      // Log failed sync
      await db.query(`
        INSERT INTO walmart_sync_logs 
        (user_id, sync_type, items_count, operation, status, message, started_at, completed_at, created_at)
        VALUES (NULL, 'inventory', ?, 'push', 'error', ?, ?, NOW(), NOW())
      `, [inventoryItems.length, apiError.message.substring(0, 500), new Date(startTime)]);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Walmart Inventory] Completed: ${successCount} synced, ${errorCount} errors in ${duration}s`);

    return { success: true, synced: successCount, errors: errorCount, duration };

  } catch (error) {
    console.error('[Walmart Inventory] Fatal error:', error);
    return { success: false, error: error.message };
  }
}

// Run
syncInventoryToWalmart()
  .then(result => {
    console.log('[Walmart Inventory] Done:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('[Walmart Inventory] Uncaught error:', error);
    process.exit(1);
  });

