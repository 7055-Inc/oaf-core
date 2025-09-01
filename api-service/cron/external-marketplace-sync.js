#!/usr/bin/env node

/**
 * External Marketplace API Sync Cron Job
 * 
 * Runs every 30 minutes to sync with external marketplace APIs:
 * 1. Import new orders from TikTok API → tiktok_orders table
 * 2. Import new returns from TikTok API → tiktok_returns table
 * 3. Push tracking updates from tiktok_orders → TikTok API
 * 4. Push inventory updates from tiktok_product_data → TikTok API
 * 
 * Usage:
 *   node external-marketplace-sync.js [--dry-run] [--marketplace=tiktok|etsy|amazon]
 * 
 * Cron example (run every 30 minutes):
 *   0,30 * * * * cd /var/www/main && node api-service/cron/external-marketplace-sync.js
 */

const path = require('path');
const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || '10.128.0.31',
  user: process.env.DB_USER || 'oafuser',
  password: process.env.DB_PASS || 'oafpass',
  database: process.env.DB_NAME || 'oaf',
  timezone: 'Z'
};

class ExternalMarketplaceSync {
  constructor(dryRun = false, specificMarketplace = null) {
    this.dryRun = dryRun;
    this.specificMarketplace = specificMarketplace;
    this.db = null;
    this.stats = {
      ordersImported: 0,
      returnsImported: 0,
      trackingPushed: 0,
      inventoryPushed: 0,
      productsPushed: 0,
      errors: 0
    };
  }

  async init() {
    try {
      this.db = await mysql.createConnection(dbConfig);
      console.log(`[${new Date().toISOString()}] ✅ External API sync connected to database`);
      
      if (this.dryRun) {
        console.log(`[${new Date().toISOString()}] 🏃 Dry-run mode: No actual API calls will be made`);
      }
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Initialization failed:`, error);
      throw error;
    }
  }

  async syncAllMarketplaces() {
    const marketplaces = this.specificMarketplace ? [this.specificMarketplace] : ['tiktok', 'etsy', 'amazon'];
    
    for (const marketplace of marketplaces) {
      console.log(`[${new Date().toISOString()}] 🌐 External API sync for ${marketplace.toUpperCase()}`);
      
      try {
        // 1. Import orders from marketplace API
        await this.importOrdersFromAPI(marketplace);
        
        // 2. Import returns from marketplace API
        await this.importReturnsFromAPI(marketplace);
        
        // 3. Push tracking updates to marketplace API
        await this.pushTrackingToAPI(marketplace);
        
        // 4. Push inventory updates to marketplace API
        await this.pushInventoryToAPI(marketplace);
        
        // 5. Push product updates to marketplace API
        await this.pushProductUpdatesToAPI(marketplace);
        
        console.log(`[${new Date().toISOString()}] ✅ External API sync completed for ${marketplace.toUpperCase()}`);
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Error in external API sync for ${marketplace}:`, error);
        this.stats.errors++;
      }
    }
  }

  async importOrdersFromAPI(marketplace) {
    if (marketplace === 'tiktok') {
      // Get all connected TikTok shops that need order sync
      const [shops] = await this.db.execute(`
        SELECT user_id, tiktok_shop_id, access_token, last_order_sync
        FROM tiktok_user_shops 
        WHERE access_token IS NOT NULL 
        AND is_active = 1
      `);
      
      console.log(`[${new Date().toISOString()}] 🏪 Found ${shops.length} TikTok shops to sync orders`);
      
      for (const shop of shops) {
        try {
          // TODO: When TikTok API is approved, implement:
          // const newOrders = await this.fetchTikTokOrders(shop);
          // await this.processTikTokOrders(newOrders, shop);
          
          console.log(`[${new Date().toISOString()}] 📦 [PLACEHOLDER] Would import orders for shop ${shop.tiktok_shop_id} (user ${shop.user_id})`);
          
          if (!this.dryRun) {
            // Update last sync timestamp
            await this.db.execute(`
              UPDATE tiktok_user_shops 
              SET last_order_sync = NOW()
              WHERE user_id = ? AND tiktok_shop_id = ?
            `, [shop.user_id, shop.tiktok_shop_id]);
          }
          
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error importing orders for shop ${shop.tiktok_shop_id}:`, error);
          this.stats.errors++;
        }
      }
    }
  }

  async importReturnsFromAPI(marketplace) {
    if (marketplace === 'tiktok') {
      // Get all connected TikTok shops that need return sync
      const [shops] = await this.db.execute(`
        SELECT user_id, tiktok_shop_id, access_token, last_return_sync
        FROM tiktok_user_shops 
        WHERE access_token IS NOT NULL 
        AND is_active = 1
      `);
      
      console.log(`[${new Date().toISOString()}] 🏪 Found ${shops.length} TikTok shops to sync returns`);
      
      for (const shop of shops) {
        try {
          // TODO: When TikTok API is approved, implement:
          // const newReturns = await this.fetchTikTokReturns(shop);
          // await this.processTikTokReturns(newReturns, shop);
          
          console.log(`[${new Date().toISOString()}] 🔄 [PLACEHOLDER] Would import returns for shop ${shop.tiktok_shop_id} (user ${shop.user_id})`);
          
          if (!this.dryRun) {
            // Update last sync timestamp
            await this.db.execute(`
              UPDATE tiktok_user_shops 
              SET last_return_sync = NOW()
              WHERE user_id = ? AND tiktok_shop_id = ?
            `, [shop.user_id, shop.tiktok_shop_id]);
          }
          
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error importing returns for shop ${shop.tiktok_shop_id}:`, error);
          this.stats.errors++;
        }
      }
    }
  }

  async pushTrackingToAPI(marketplace) {
    if (marketplace === 'tiktok') {
      // Find orders with tracking that needs to be pushed to TikTok API
      const [trackingUpdates] = await this.db.execute(`
        SELECT DISTINCT
          to_table.tiktok_order_id,
          to_table.user_id,
          oit.tracking_number,
          oit.carrier,
          oit.last_status,
          oit.updated_at,
          tus.access_token,
          tus.tiktok_shop_id
        FROM tiktok_orders to_table
        JOIN orders o ON to_table.main_order_id = o.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN order_item_tracking oit ON oi.id = oit.order_item_id
        JOIN tiktok_user_shops tus ON to_table.user_id = tus.user_id
        WHERE to_table.tracking_synced_at IS NOT NULL
        AND (to_table.api_tracking_pushed_at IS NULL OR oit.updated_at > to_table.api_tracking_pushed_at)
      `);
      
      console.log(`[${new Date().toISOString()}] 📤 Found ${trackingUpdates.length} tracking updates to push to TikTok API`);
      
      for (const tracking of trackingUpdates) {
        try {
          // TODO: When TikTok API is approved, implement:
          // await this.pushTikTokTracking(tracking);
          
          console.log(`[${new Date().toISOString()}] 📤 [PLACEHOLDER] Would push tracking ${tracking.tracking_number} to TikTok order ${tracking.tiktok_order_id}`);
          
          if (!this.dryRun) {
            // Update API push timestamp
            await this.db.execute(`
              UPDATE tiktok_orders 
              SET api_tracking_pushed_at = NOW()
              WHERE tiktok_order_id = ?
            `, [tracking.tiktok_order_id]);
          }
          
          this.stats.trackingPushed++;
          
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error pushing tracking for order ${tracking.tiktok_order_id}:`, error);
          this.stats.errors++;
        }
      }
    }
  }

  async pushInventoryToAPI(marketplace) {
    if (marketplace === 'tiktok') {
      // Find products with inventory that needs to be pushed to TikTok API
      const [inventoryUpdates] = await this.db.execute(`
        SELECT 
          tpd.product_id,
          tpd.user_id,
          tpd.tiktok_product_id,
          tia.allocated_quantity,
          pi.qty_available,
          tus.access_token,
          tus.tiktok_shop_id
        FROM tiktok_product_data tpd
        JOIN tiktok_inventory_allocations tia ON tpd.product_id = tia.product_id AND tpd.user_id = tia.user_id
        JOIN product_inventory pi ON tpd.product_id = pi.product_id
        JOIN tiktok_user_shops tus ON tpd.user_id = tus.user_id
        WHERE tpd.sync_status = 'synced'
        AND tpd.tiktok_product_id IS NOT NULL
        AND tpd.inventory_synced_at IS NOT NULL
        AND (tpd.api_inventory_pushed_at IS NULL OR tpd.inventory_synced_at > tpd.api_inventory_pushed_at)
      `);
      
      console.log(`[${new Date().toISOString()}] 📊 Found ${inventoryUpdates.length} inventory updates to push to TikTok API`);
      
      for (const inventory of inventoryUpdates) {
        try {
          // Calculate available quantity for TikTok
          const availableForTikTok = Math.min(
            inventory.allocated_quantity || 0,
            inventory.qty_available || 0
          );
          
          // TODO: When TikTok API is approved, implement:
          // await this.pushTikTokInventory(inventory.tiktok_product_id, availableForTikTok, inventory.access_token);
          
          console.log(`[${new Date().toISOString()}] 📊 [PLACEHOLDER] Would push inventory ${availableForTikTok} units to TikTok product ${inventory.tiktok_product_id}`);
          
          if (!this.dryRun) {
            // Update API push timestamp
            await this.db.execute(`
              UPDATE tiktok_product_data 
              SET api_inventory_pushed_at = NOW()
              WHERE product_id = ? AND user_id = ?
            `, [inventory.product_id, inventory.user_id]);
          }
          
          this.stats.inventoryPushed++;
          
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error pushing inventory for product ${inventory.product_id}:`, error);
          this.stats.errors++;
        }
      }
    }
  }

  async cleanup() {
    if (this.db) {
      await this.db.end();
    }
  }

  async pushProductUpdatesToAPI(marketplace) {
    if (marketplace === 'tiktok') {
      // Find products ready for API sync
      const [productsToSync] = await this.db.execute(`
        SELECT 
          tpd.product_id,
          tpd.user_id,
          tpd.tiktok_product_id,
          tpd.tiktok_title,
          tpd.tiktok_description,
          tpd.tiktok_price,
          tpd.tiktok_tags,
          tpd.tiktok_category_id,
          tpd.is_active,
          tus.access_token,
          tus.tiktok_shop_id
        FROM tiktok_product_data tpd
        JOIN tiktok_user_shops tus ON tpd.user_id = tus.user_id
        WHERE tpd.sync_status = 'ready_for_api_sync'
        AND tus.access_token IS NOT NULL
        ORDER BY tpd.updated_at ASC
      `);
      
      console.log(`[${new Date().toISOString()}] 🔄 Found ${productsToSync.length} TikTok products ready for API sync`);
      
      for (const product of productsToSync) {
        try {
          // TODO: When TikTok API is approved, implement:
          // if (product.tiktok_product_id) {
          //   await this.updateTikTokProduct(product);
          // } else {
          //   await this.createTikTokProduct(product);
          // }
          
          console.log(`[${new Date().toISOString()}] 🔄 [PLACEHOLDER] Would sync product ${product.product_id} to TikTok`);
          
          if (!this.dryRun) {
            // Update sync status
            await this.db.execute(`
              UPDATE tiktok_product_data 
              SET sync_status = 'synced', api_synced_at = NOW()
              WHERE product_id = ? AND user_id = ?
            `, [product.product_id, product.user_id]);
          }
          
          this.stats.productsPushed++;
          
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error syncing product ${product.product_id}:`, error);
          this.stats.errors++;
        }
      }
    }
    
    // TODO: Add Amazon product sync
    // if (marketplace === 'amazon') { ... }
    
    // TODO: Add Etsy product sync  
    // if (marketplace === 'etsy') { ... }
  }

  printStats() {
    console.log(`[${new Date().toISOString()}] 📊 External API Sync Statistics:`);
    console.log(`   Orders Imported: ${this.stats.ordersImported}`);
    console.log(`   Returns Imported: ${this.stats.returnsImported}`);
    console.log(`   Tracking Pushed: ${this.stats.trackingPushed}`);
    console.log(`   Inventory Pushed: ${this.stats.inventoryPushed}`);
    console.log(`   Products Pushed: ${this.stats.productsPushed}`);
    console.log(`   Errors: ${this.stats.errors}`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const marketplaceArg = args.find(arg => arg.startsWith('--marketplace='));
  const specificMarketplace = marketplaceArg ? marketplaceArg.split('=')[1] : null;
  
  const sync = new ExternalMarketplaceSync(dryRun, specificMarketplace);
  
  try {
    await sync.init();
    await sync.syncAllMarketplaces();
    sync.printStats();
    
    console.log(`[${new Date().toISOString()}] ✅ External marketplace API sync completed`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ External marketplace API sync failed:`, error);
    process.exit(1);
  } finally {
    await sync.cleanup();
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(`[${new Date().toISOString()}] 🛑 Received SIGINT, shutting down gracefully...`);
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log(`[${new Date().toISOString()}] 🛑 Received SIGTERM, shutting down gracefully...`);
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = ExternalMarketplaceSync;
