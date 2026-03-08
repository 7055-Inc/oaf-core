#!/usr/bin/env node
/**
 * eBay Inventory Sync Cron
 * Pushes allocated inventory to eBay via Inventory API.
 * Schedule: every 30 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const ebayApiService = require('../src/services/ebayService');

async function run() {
  console.log('[ebay-sync-inventory] Starting…');
  const [rows] = await db.execute(`
    SELECT eia.product_id, eia.user_id, eia.allocated_quantity,
           p.sku, epd.ebay_listing_id,
           eus.shop_id
    FROM ebay_inventory_allocations eia
    JOIN ebay_product_data epd ON eia.product_id = epd.product_id AND eia.user_id = epd.user_id
    JOIN products p ON eia.product_id = p.id
    JOIN ebay_user_shops eus ON eia.user_id = eus.user_id AND eus.is_active = 1
    WHERE epd.is_active = 1 AND epd.ebay_listing_id IS NOT NULL
  `);

  console.log(`[ebay-sync-inventory] ${rows.length} allocations`);
  let synced = 0, failed = 0;

  for (const row of rows) {
    try {
      const accessToken = await ebayApiService.getShopAccessToken(row.shop_id, row.user_id);
      const sku = `BRK-${row.sku || row.product_id}`;

      let existing = {};
      try {
        existing = await ebayApiService.getInventoryItem(accessToken, sku);
      } catch (getErr) {
        if (getErr.response?.status !== 404) throw getErr;
      }

      const merged = {
        ...existing,
        availability: {
          ...(existing.availability || {}),
          shipToLocationAvailability: { quantity: row.allocated_quantity }
        }
      };
      delete merged.sku;

      await ebayApiService.createOrReplaceInventoryItem(accessToken, sku, merged);
      await db.execute(`INSERT INTO ebay_sync_logs (user_id, sync_type, operation, reference_id, status, message) VALUES (?, 'inventory', 'push', ?, 'success', ?)`,
        [row.user_id, row.product_id, `Cron: qty ${row.allocated_quantity}`]);
      synced++;
    } catch (err) {
      console.error(`[ebay-sync-inventory] Error ${row.product_id}:`, err.message);
      await db.execute(`INSERT INTO ebay_sync_logs (user_id, sync_type, operation, reference_id, status, message) VALUES (?, 'inventory', 'push', ?, 'error', ?)`,
        [row.user_id, row.product_id, err.message]);
      failed++;
    }
  }

  console.log(`[ebay-sync-inventory] Done: ${synced} synced, ${failed} failed`);
  process.exit(0);
}

run().catch(err => { console.error('[ebay-sync-inventory] Fatal:', err); process.exit(1); });
