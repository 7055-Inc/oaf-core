#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(process.cwd(), 'api-service/.env') });
const db = require('../config/db');
const wayfairService = require('../src/services/wayfairService');

/**
 * @fileoverview Wayfair Inventory Sync
 *
 * Cron job to sync inventory levels to Wayfair.
 * Runs every 15 minutes.
 *
 * Flow:
 * 1. Find active Wayfair products that are synced
 * 2. Calculate available inventory (allocated - sold)
 * 3. Bulk push inventory updates to Wayfair via GraphQL
 */

const BATCH_SIZE = 100;

async function syncInventoryToWayfair() {
  console.log('[Wayfair Inventory] Starting inventory sync to Wayfair...');
  console.log(`[Wayfair Inventory] Environment: ${process.env.WAYFAIR_ENV || 'sandbox'}`);
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;

  try {
    const [products] = await db.query(`
      SELECT
        wcp.id as wayfair_id,
        wcp.product_id,
        wcp.wayfair_sku,

        COALESCE(SUM(wia.allocated_quantity), 0) as total_allocated,

        COALESCE((
          SELECT SUM(woi.quantity)
          FROM wayfair_order_items woi
          JOIN wayfair_orders wo ON woi.order_id = wo.id
          WHERE woi.product_id = wcp.product_id
            AND wo.order_status IN ('pending', 'accepted', 'shipped')
        ), 0) as sold_quantity

      FROM wayfair_corporate_products wcp
      JOIN products p ON p.id = wcp.product_id
      LEFT JOIN wayfair_inventory_allocations wia ON wcp.product_id = wia.product_id

      WHERE wcp.is_active = 1
        AND wcp.listing_status = 'listed'
        AND wcp.sync_status = 'synced'
        AND p.status = 'active'

      GROUP BY wcp.id, wcp.product_id, wcp.wayfair_sku
      ORDER BY wcp.id ASC
      LIMIT ${BATCH_SIZE}
    `);

    console.log(`[Wayfair Inventory] Found ${products.length} products to sync`);

    if (products.length === 0) {
      console.log('[Wayfair Inventory] No products to sync');
      return { success: true, synced: 0, errors: 0 };
    }

    const inventoryItems = products.map(product => ({
      sku: product.wayfair_sku,
      quantity: Math.max(0, product.total_allocated - product.sold_quantity)
    }));

    console.log(`[Wayfair Inventory] Pushing ${inventoryItems.length} inventory updates...`);

    try {
      const result = await wayfairService.bulkUpdateInventory(inventoryItems);

      console.log(`[Wayfair Inventory] Inventory update submitted:`, result?.bulkUpdateInventory?.successCount || 'pending');
      successCount = inventoryItems.length;

      await db.query(`
        INSERT INTO wayfair_sync_logs
        (user_id, sync_type, operation, status, message)
        VALUES (NULL, 'inventory', 'push', 'success', ?)
      `, [`Synced ${inventoryItems.length} items in ${((Date.now() - startTime) / 1000).toFixed(2)}s`]);

    } catch (apiError) {
      console.error('[Wayfair Inventory] API Error:', apiError.message);
      errorCount = inventoryItems.length;

      await db.query(`
        INSERT INTO wayfair_sync_logs
        (user_id, sync_type, operation, status, message)
        VALUES (NULL, 'inventory', 'push', 'failed', ?)
      `, [apiError.message.substring(0, 500)]);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Wayfair Inventory] Completed: ${successCount} synced, ${errorCount} errors in ${duration}s`);

    return { success: true, synced: successCount, errors: errorCount, duration };

  } catch (error) {
    console.error('[Wayfair Inventory] Fatal error:', error);
    return { success: false, error: error.message };
  }
}

syncInventoryToWayfair()
  .then(result => {
    console.log('[Wayfair Inventory] Done:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('[Wayfair Inventory] Uncaught error:', error);
    process.exit(1);
  });
