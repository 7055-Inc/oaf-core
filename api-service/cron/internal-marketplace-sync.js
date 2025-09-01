#!/usr/bin/env node

/**
 * Internal Marketplace Sync Cron Job
 * 
 * Runs every 5 minutes to sync between marketplace tables and main system:
 * 1. Merge unprocessed marketplace returns into main returns system
 * 2. Merge unprocessed marketplace orders into main orders system  
 * 3. Push tracking updates from main orders back to marketplace tables
 * 4. Update inventory sync timestamps
 * 
 * Usage:
 *   node internal-marketplace-sync.js [--dry-run] [--marketplace=tiktok|etsy|amazon]
 * 
 * Cron example (run every 5 minutes):
 *   0,5,10,15,20,25,30,35,40,45,50,55 * * * * cd /var/www/main && node api-service/scripts/internal-marketplace-sync.js
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

class InternalMarketplaceSync {
  constructor(dryRun = false, specificMarketplace = null) {
    this.dryRun = dryRun;
    this.specificMarketplace = specificMarketplace;
    this.db = null;
    this.stats = {
      returnsMerged: 0,
      ordersMerged: 0,
      trackingUpdated: 0,
      inventoryUpdated: 0,
      productsSynced: 0,
      errors: 0
    };
  }

  async init() {
    try {
      this.db = await mysql.createConnection(dbConfig);
      console.log(`[${new Date().toISOString()}] ✅ Internal sync connected to database`);
      
      if (this.dryRun) {
        console.log(`[${new Date().toISOString()}] 🏃 Dry-run mode: No actual changes will be made`);
      }
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ Initialization failed:`, error);
      throw error;
    }
  }

  async syncAllMarketplaces() {
    const marketplaces = this.specificMarketplace ? [this.specificMarketplace] : ['tiktok', 'etsy', 'amazon'];
    
    for (const marketplace of marketplaces) {
      console.log(`[${new Date().toISOString()}] 🔄 Internal sync for ${marketplace.toUpperCase()}`);
      
      try {
        // 1. Merge marketplace returns to main system
        await this.mergeMarketplaceReturns(marketplace);
        
        // 2. Merge marketplace orders to main system
        await this.mergeMarketplaceOrders(marketplace);
        
        // 3. Push tracking updates back to marketplace tables
        await this.updateMarketplaceTracking(marketplace);
        
        // 4. Update inventory sync flags
        await this.updateInventoryFlags(marketplace);
        
        // 5. Sync product configuration changes
        await this.syncProductChanges(marketplace);
        
        console.log(`[${new Date().toISOString()}] ✅ Internal sync completed for ${marketplace.toUpperCase()}`);
        
      } catch (error) {
        console.error(`[${new Date().toISOString()}] ❌ Error in internal sync for ${marketplace}:`, error);
        this.stats.errors++;
      }
    }
  }

  async mergeMarketplaceReturns(marketplace) {
    if (marketplace === 'tiktok') {
      // Find unprocessed TikTok returns
      const [unprocessedReturns] = await this.db.execute(`
        SELECT 
          tr.id,
          tr.user_id,
          tr.tiktok_return_id,
          tr.tiktok_order_id,
          tr.return_data,
          tr.return_reason,
          tr.return_status,
          to_table.main_order_id
        FROM tiktok_returns tr
        JOIN tiktok_orders to_table ON tr.tiktok_order_id = to_table.tiktok_order_id
        WHERE tr.processed_to_main = 0
        AND to_table.main_order_id IS NOT NULL
        ORDER BY tr.created_at ASC
      `);
      
      console.log(`[${new Date().toISOString()}] 🔄 Found ${unprocessedReturns.length} TikTok returns to merge`);
      
      for (const tikTokReturn of unprocessedReturns) {
        try {
          if (!this.dryRun) {
            // Get order details for vendor_id and order_item_id
            const [orderDetails] = await this.db.execute(`
              SELECT oi.id as order_item_id, oi.vendor_id, o.user_id
              FROM orders o
              JOIN order_items oi ON o.id = oi.order_id
              WHERE o.id = ?
              LIMIT 1
            `, [tikTokReturn.main_order_id]);
            
            if (orderDetails.length === 0) {
              console.log(`[${new Date().toISOString()}] ⚠️  No order details found for main_order_id ${tikTokReturn.main_order_id}`);
              continue;
            }
            
            const orderDetail = orderDetails[0];
            
            // Map TikTok return status to main system status
            let mainReturnStatus = 'approved'; // Auto-approve TikTok returns
            if (tikTokReturn.return_status === 'completed') {
              mainReturnStatus = 'processed';
            }
            
            // Insert into main returns table
            const [insertResult] = await this.db.execute(`
              INSERT INTO returns (
                order_id,
                order_item_id,
                user_id,
                vendor_id,
                marketplace_source,
                return_reason,
                return_status,
                return_data,
                created_at
              ) VALUES (?, ?, ?, ?, 'tiktok', ?, ?, ?, NOW())
            `, [
              tikTokReturn.main_order_id,
              orderDetail.order_item_id,
              tikTokReturn.user_id,
              orderDetail.vendor_id,
              tikTokReturn.return_reason || 'TikTok return request',
              mainReturnStatus,
              JSON.stringify({
                tiktok_return_id: tikTokReturn.tiktok_return_id,
                tiktok_order_id: tikTokReturn.tiktok_order_id,
                original_data: tikTokReturn.return_data
              })
            ]);
            
            const mainReturnId = insertResult.insertId;
            
            // Update TikTok return as processed
            await this.db.execute(`
              UPDATE tiktok_returns 
              SET processed_to_main = 1, main_return_id = ?
              WHERE id = ?
            `, [mainReturnId, tikTokReturn.id]);
            
            this.stats.returnsMerged++;
            console.log(`[${new Date().toISOString()}] ✅ Merged TikTok return ${tikTokReturn.tiktok_return_id} → main return ${mainReturnId}`);
            
          } else {
            console.log(`[${new Date().toISOString()}] 🏃 [DRY RUN] Would merge TikTok return ${tikTokReturn.tiktok_return_id}`);
            this.stats.returnsMerged++;
          }
          
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error merging TikTok return ${tikTokReturn.id}:`, error);
          this.stats.errors++;
        }
      }
    }
  }

  async mergeMarketplaceOrders(marketplace) {
    if (marketplace === 'tiktok') {
      // Find unprocessed TikTok orders
      const [unprocessedOrders] = await this.db.execute(`
        SELECT 
          id,
          user_id,
          tiktok_order_id,
          order_data,
          customer_email,
          customer_name,
          shipping_address,
          total_amount,
          currency,
          order_status
        FROM tiktok_orders
        WHERE processed_to_main = 0
        ORDER BY created_at ASC
      `);
      
      console.log(`[${new Date().toISOString()}] 📦 Found ${unprocessedOrders.length} TikTok orders to merge`);
      
      for (const tikTokOrder of unprocessedOrders) {
        try {
          if (!this.dryRun) {
            // Parse order_data JSON to get line items
            let orderItems = [];
            try {
              const orderData = JSON.parse(tikTokOrder.order_data || '{}');
              orderItems = orderData.line_items || [];
            } catch (parseError) {
              console.error(`[${new Date().toISOString()}] ❌ Error parsing order data for ${tikTokOrder.tiktok_order_id}:`, parseError);
              continue;
            }
            
            // Create main order
            const [orderResult] = await this.db.execute(`
              INSERT INTO orders (
                user_id, 
                status, 
                total_amount, 
                currency,
                customer_email,
                customer_name,
                shipping_address,
                marketplace_source,
                marketplace_order_id,
                created_at
              ) VALUES (?, 'paid', ?, ?, ?, ?, ?, 'tiktok', ?, NOW())
            `, [
              tikTokOrder.user_id,
              tikTokOrder.total_amount,
              tikTokOrder.currency || 'USD',
              tikTokOrder.customer_email,
              tikTokOrder.customer_name,
              tikTokOrder.shipping_address,
              tikTokOrder.tiktok_order_id
            ]);
            
            const mainOrderId = orderResult.insertId;
            
            // Create order items
            for (const item of orderItems) {
              await this.db.execute(`
                INSERT INTO order_items (
                  order_id,
                  product_id,
                  vendor_id,
                  quantity,
                  price,
                  total_price,
                  marketplace_item_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
              `, [
                mainOrderId,
                item.product_id,
                item.vendor_id || tikTokOrder.user_id,
                item.quantity,
                item.price,
                item.total_price,
                item.tiktok_item_id
              ]);
            }
            
            // Update TikTok order as processed
            await this.db.execute(`
              UPDATE tiktok_orders 
              SET processed_to_main = 1, main_order_id = ?
              WHERE id = ?
            `, [mainOrderId, tikTokOrder.id]);
            
            this.stats.ordersMerged++;
            console.log(`[${new Date().toISOString()}] ✅ Merged TikTok order ${tikTokOrder.tiktok_order_id} → main order ${mainOrderId}`);
            
          } else {
            console.log(`[${new Date().toISOString()}] 🏃 [DRY RUN] Would merge TikTok order ${tikTokOrder.tiktok_order_id}`);
            this.stats.ordersMerged++;
          }
          
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error merging TikTok order ${tikTokOrder.id}:`, error);
          this.stats.errors++;
        }
      }
    }
    
    // TODO: Add Amazon order merging
    // if (marketplace === 'amazon') { ... }
    
    // TODO: Add Etsy order merging  
    // if (marketplace === 'etsy') { ... }
  }

  async updateMarketplaceTracking(marketplace) {
    if (marketplace === 'tiktok') {
      // Find orders with new tracking that needs to be synced back to TikTok tables
      const [trackingUpdates] = await this.db.execute(`
        SELECT DISTINCT
          to_table.id as tiktok_order_table_id,
          to_table.tiktok_order_id,
          oit.tracking_number,
          oit.carrier,
          oit.last_status,
          oit.updated_at
        FROM tiktok_orders to_table
        JOIN orders o ON to_table.main_order_id = o.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN order_item_tracking oit ON oi.id = oit.order_item_id
        WHERE to_table.tracking_synced_at IS NULL 
        OR oit.updated_at > to_table.tracking_synced_at
      `);
      
      console.log(`[${new Date().toISOString()}] 📤 Found ${trackingUpdates.length} tracking updates to sync back to TikTok tables`);
      
      for (const tracking of trackingUpdates) {
        try {
          if (!this.dryRun) {
            // Update TikTok order table with tracking info
            await this.db.execute(`
              UPDATE tiktok_orders 
              SET tracking_synced_at = NOW()
              WHERE id = ?
            `, [tracking.tiktok_order_table_id]);
          }
          
          this.stats.trackingUpdated++;
          console.log(`[${new Date().toISOString()}] 📤 Updated tracking sync for TikTok order ${tracking.tiktok_order_id}`);
          
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error updating tracking for order ${tracking.tiktok_order_id}:`, error);
          this.stats.errors++;
        }
      }
    }
  }

  async updateInventoryFlags(marketplace) {
    if (marketplace === 'tiktok') {
      // Update inventory sync flags for products that need it
      const [inventoryUpdates] = await this.db.execute(`
        SELECT 
          tpd.product_id,
          tpd.user_id,
          tia.allocated_quantity,
          pi.qty_available
        FROM tiktok_product_data tpd
        JOIN tiktok_inventory_allocations tia ON tpd.product_id = tia.product_id AND tpd.user_id = tia.user_id
        JOIN product_inventory pi ON tpd.product_id = pi.product_id
        WHERE tpd.sync_status = 'synced'
        AND (tpd.inventory_synced_at IS NULL OR tpd.inventory_synced_at < DATE_SUB(NOW(), INTERVAL 1 HOUR))
      `);
      
      console.log(`[${new Date().toISOString()}] 📊 Found ${inventoryUpdates.length} TikTok products needing inventory flag updates`);
      
      for (const inventory of inventoryUpdates) {
        try {
          if (!this.dryRun) {
            // Just update the flag - the external API sync will handle the actual TikTok API call
            await this.db.execute(`
              UPDATE tiktok_product_data 
              SET inventory_synced_at = NOW()
              WHERE product_id = ? AND user_id = ?
            `, [inventory.product_id, inventory.user_id]);
          }
          
          this.stats.inventoryUpdated++;
          
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error updating inventory flag for product ${inventory.product_id}:`, error);
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

  async syncProductChanges(marketplace) {
    if (marketplace === 'tiktok') {
      // Find TikTok products with pending sync status (user made changes)
      const [pendingProducts] = await this.db.execute(`
        SELECT 
          tpd.product_id,
          tpd.user_id,
          tpd.tiktok_title,
          tpd.tiktok_description,
          tpd.tiktok_price,
          tpd.sync_status
        FROM tiktok_product_data tpd
        WHERE tpd.sync_status = 'pending'
        ORDER BY tpd.updated_at ASC
      `);
      
      console.log(`[${new Date().toISOString()}] 🔄 Found ${pendingProducts.length} TikTok products with pending changes`);
      
      for (const product of pendingProducts) {
        try {
          if (!this.dryRun) {
            // Mark as ready for external API sync
            await this.db.execute(`
              UPDATE tiktok_product_data 
              SET sync_status = 'ready_for_api_sync'
              WHERE product_id = ? AND user_id = ?
            `, [product.product_id, product.user_id]);
          }
          
          this.stats.productsSynced++;
          console.log(`[${new Date().toISOString()}] 🔄 Marked TikTok product ${product.product_id} ready for API sync`);
          
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
    console.log(`[${new Date().toISOString()}] 📊 Internal Sync Statistics:`);
    console.log(`   Returns Merged: ${this.stats.returnsMerged}`);
    console.log(`   Orders Merged: ${this.stats.ordersMerged}`);
    console.log(`   Tracking Updated: ${this.stats.trackingUpdated}`);
    console.log(`   Inventory Flags Updated: ${this.stats.inventoryUpdated}`);
    console.log(`   Products Synced: ${this.stats.productsSynced}`);
    console.log(`   Errors: ${this.stats.errors}`);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const marketplaceArg = args.find(arg => arg.startsWith('--marketplace='));
  const specificMarketplace = marketplaceArg ? marketplaceArg.split('=')[1] : null;
  
  const sync = new InternalMarketplaceSync(dryRun, specificMarketplace);
  
  try {
    await sync.init();
    await sync.syncAllMarketplaces();
    sync.printStats();
    
    console.log(`[${new Date().toISOString()}] ✅ Internal marketplace sync completed`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ❌ Internal marketplace sync failed:`, error);
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

module.exports = InternalMarketplaceSync;
