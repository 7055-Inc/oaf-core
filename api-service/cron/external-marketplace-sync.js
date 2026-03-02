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
require('dotenv').config({ path: path.resolve(process.cwd(), 'api-service/.env') });
const mysql = require('mysql2/promise');
const { decrypt } = require('../src/utils/encryption');
const tiktokApiService = require('../src/services/tiktokService');

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
      const [shops] = await this.db.execute(`
        SELECT user_id, shop_id, access_token, last_order_sync
        FROM tiktok_user_shops
        WHERE access_token IS NOT NULL AND is_active = 1
      `);

      console.log(`[${new Date().toISOString()}] Found ${shops.length} TikTok shops to sync orders`);

      for (const shop of shops) {
        try {
          const sinceTs = shop.last_order_sync
            ? Math.floor(new Date(shop.last_order_sync).getTime() / 1000)
            : Math.floor((Date.now() - 30 * 86400000) / 1000);

          const ordersData = await tiktokApiService.getOrders(shop.shop_id, shop.user_id, {
            create_time_from: sinceTs,
            page_size: 100
          });

          const orders = ordersData.orders || ordersData.order_list || [];
          let imported = 0;

          for (const order of orders) {
            const orderId = order.order_id || order.id;
            const [existing] = await this.db.execute(
              'SELECT id FROM tiktok_orders WHERE tiktok_order_id = ?', [orderId]
            );

            if (existing.length === 0) {
              const customerName = order.recipient_address?.name || null;
              const shippingAddr = order.recipient_address || null;

              if (!this.dryRun) {
                await this.db.execute(`
                  INSERT INTO tiktok_orders
                    (user_id, tiktok_shop_id, tiktok_order_id, order_status, total_amount,
                     customer_name, customer_email, shipping_address, order_data, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, FROM_UNIXTIME(?))
                `, [
                  shop.user_id, shop.shop_id, orderId,
                  order.order_status || order.status,
                  order.payment?.total_amount || 0,
                  customerName, order.buyer_email || null,
                  shippingAddr ? JSON.stringify(shippingAddr) : null,
                  JSON.stringify(order),
                  order.create_time || Math.floor(Date.now() / 1000)
                ]);
                imported++;
              }
            } else {
              if (!this.dryRun) {
                await this.db.execute(
                  'UPDATE tiktok_orders SET order_status = ?, order_data = ? WHERE tiktok_order_id = ?',
                  [order.order_status || order.status, JSON.stringify(order), orderId]
                );
              }
            }
          }

          if (!this.dryRun) {
            await this.db.execute(
              'UPDATE tiktok_user_shops SET last_order_sync = NOW() WHERE user_id = ? AND shop_id = ?',
              [shop.user_id, shop.shop_id]
            );
          }

          this.stats.ordersImported += imported;
          console.log(`[${new Date().toISOString()}] Imported ${imported} orders for shop ${shop.shop_id}`);

        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error importing orders for shop ${shop.shop_id}:`, error.message);
          this.stats.errors++;
        }
      }
    }
  }

  async importReturnsFromAPI(marketplace) {
    if (marketplace === 'tiktok') {
      const [shops] = await this.db.execute(`
        SELECT user_id, shop_id, access_token, last_return_sync
        FROM tiktok_user_shops
        WHERE access_token IS NOT NULL AND is_active = 1
      `);

      console.log(`[${new Date().toISOString()}] Found ${shops.length} TikTok shops to sync returns`);

      for (const shop of shops) {
        try {
          const sinceTs = shop.last_return_sync
            ? Math.floor(new Date(shop.last_return_sync).getTime() / 1000)
            : Math.floor((Date.now() - 30 * 86400000) / 1000);

          const returnsData = await tiktokApiService.getReturns(shop.shop_id, shop.user_id, {
            create_time_from: sinceTs,
            page_size: 50
          });

          const returns = returnsData.reverse_order_list || returnsData.returns || [];
          let imported = 0;

          for (const ret of returns) {
            const returnId = ret.reverse_order_id || ret.return_id || ret.id;
            const [existing] = await this.db.execute(
              'SELECT id FROM tiktok_returns WHERE tiktok_return_id = ?', [returnId]
            );

            if (existing.length === 0 && !this.dryRun) {
              await this.db.execute(`
                INSERT INTO tiktok_returns
                  (user_id, tiktok_return_id, tiktok_order_id, return_data,
                   return_reason, return_status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, NOW())
              `, [
                shop.user_id, returnId,
                ret.order_id || null,
                JSON.stringify(ret),
                ret.reason || ret.cancel_reason || null,
                ret.status || ret.reverse_order_status || 'pending'
              ]);
              imported++;
            }
          }

          if (!this.dryRun) {
            await this.db.execute(
              'UPDATE tiktok_user_shops SET last_return_sync = NOW() WHERE user_id = ? AND shop_id = ?',
              [shop.user_id, shop.shop_id]
            );
          }

          this.stats.returnsImported += imported;
          console.log(`[${new Date().toISOString()}] Imported ${imported} returns for shop ${shop.shop_id}`);

        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error importing returns for shop ${shop.shop_id}:`, error.message);
          this.stats.errors++;
        }
      }
    }
  }

  async pushTrackingToAPI(marketplace) {
    if (marketplace === 'tiktok') {
      const [trackingUpdates] = await this.db.execute(`
        SELECT DISTINCT
          to_table.tiktok_order_id,
          to_table.user_id,
          oit.tracking_number,
          oit.carrier,
          tus.shop_id
        FROM tiktok_orders to_table
        JOIN orders o ON to_table.main_order_id = o.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN order_item_tracking oit ON oi.id = oit.order_item_id
        JOIN tiktok_user_shops tus ON to_table.user_id = tus.user_id AND tus.is_active = 1
        WHERE to_table.tracking_synced_at IS NOT NULL
          AND oit.tracking_number IS NOT NULL
          AND (to_table.api_tracking_pushed_at IS NULL OR oit.updated_at > to_table.api_tracking_pushed_at)
      `);

      console.log(`[${new Date().toISOString()}] Found ${trackingUpdates.length} tracking updates to push to TikTok API`);

      for (const tracking of trackingUpdates) {
        try {
          if (!this.dryRun) {
            await tiktokApiService.shipOrder(tracking.shop_id, tracking.user_id, tracking.tiktok_order_id, {
              tracking_number: tracking.tracking_number,
              shipping_provider_id: tracking.carrier || 'OTHER'
            });

            await this.db.execute(
              'UPDATE tiktok_orders SET api_tracking_pushed_at = NOW() WHERE tiktok_order_id = ?',
              [tracking.tiktok_order_id]
            );
          }

          this.stats.trackingPushed++;
          console.log(`[${new Date().toISOString()}] Pushed tracking ${tracking.tracking_number} to TikTok order ${tracking.tiktok_order_id}`);

        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error pushing tracking for ${tracking.tiktok_order_id}:`, error.message);
          this.stats.errors++;
        }
      }
    }
  }

  async pushInventoryToAPI(marketplace) {
    if (marketplace === 'tiktok') {
      const [inventoryUpdates] = await this.db.execute(`
        SELECT
          tpd.product_id, tpd.user_id, tpd.tiktok_product_id, tpd.tiktok_sku_id,
          tia.allocated_quantity, pi.qty_available,
          tus.shop_id
        FROM tiktok_product_data tpd
        JOIN tiktok_inventory_allocations tia ON tpd.product_id = tia.product_id AND tpd.user_id = tia.user_id
        JOIN product_inventory pi ON tpd.product_id = pi.product_id
        JOIN tiktok_user_shops tus ON tpd.user_id = tus.user_id AND tus.is_active = 1
        WHERE tpd.sync_status = 'synced'
          AND tpd.tiktok_product_id IS NOT NULL
          AND tpd.inventory_synced_at IS NOT NULL
          AND (tpd.api_inventory_pushed_at IS NULL OR tpd.inventory_synced_at > tpd.api_inventory_pushed_at)
      `);

      console.log(`[${new Date().toISOString()}] Found ${inventoryUpdates.length} inventory updates to push to TikTok API`);

      for (const inv of inventoryUpdates) {
        try {
          const qty = Math.min(inv.allocated_quantity || 0, inv.qty_available || 0);

          if (!this.dryRun) {
            await tiktokApiService.updateInventory(
              inv.shop_id, inv.user_id,
              inv.tiktok_product_id,
              inv.tiktok_sku_id || inv.tiktok_product_id,
              qty
            );

            await this.db.execute(
              'UPDATE tiktok_product_data SET api_inventory_pushed_at = NOW() WHERE product_id = ? AND user_id = ?',
              [inv.product_id, inv.user_id]
            );
          }

          this.stats.inventoryPushed++;
          console.log(`[${new Date().toISOString()}] Pushed ${qty} units to TikTok product ${inv.tiktok_product_id}`);

        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error pushing inventory for product ${inv.product_id}:`, error.message);
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
      const [productsToSync] = await this.db.execute(`
        SELECT
          tpd.product_id, tpd.user_id, tpd.tiktok_product_id,
          tpd.tiktok_title, tpd.tiktok_description, tpd.tiktok_price,
          tpd.tiktok_tags, tpd.tiktok_category_id, tpd.is_active,
          tus.shop_id
        FROM tiktok_product_data tpd
        JOIN tiktok_user_shops tus ON tpd.user_id = tus.user_id AND tus.is_active = 1
        WHERE tpd.sync_status = 'ready_for_api_sync'
          AND tus.access_token IS NOT NULL
        ORDER BY tpd.updated_at ASC
      `);

      console.log(`[${new Date().toISOString()}] Found ${productsToSync.length} TikTok products ready for API sync`);

      for (const product of productsToSync) {
        try {
          const productData = {
            title: product.tiktok_title,
            description: product.tiktok_description,
            category_id: product.tiktok_category_id,
            skus: [{
              price: { amount: Math.round((product.tiktok_price || 0) * 100), currency: 'USD' }
            }]
          };

          if (!this.dryRun) {
            if (product.tiktok_product_id) {
              await tiktokApiService.updateProduct(product.shop_id, product.user_id, product.tiktok_product_id, productData);
            } else {
              const result = await tiktokApiService.createProduct(product.shop_id, product.user_id, productData);
              if (result.product_id) {
                await this.db.execute(
                  'UPDATE tiktok_product_data SET tiktok_product_id = ? WHERE product_id = ? AND user_id = ?',
                  [result.product_id, product.product_id, product.user_id]
                );
              }
            }

            await this.db.execute(
              'UPDATE tiktok_product_data SET sync_status = "synced", api_synced_at = NOW() WHERE product_id = ? AND user_id = ?',
              [product.product_id, product.user_id]
            );
          }

          this.stats.productsPushed++;
          console.log(`[${new Date().toISOString()}] Synced product ${product.product_id} to TikTok`);

        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error syncing product ${product.product_id}:`, error.message);
          if (!this.dryRun) {
            await this.db.execute(
              'UPDATE tiktok_product_data SET sync_status = "error", last_sync_error = ? WHERE product_id = ? AND user_id = ?',
              [error.message?.substring(0, 500), product.product_id, product.user_id]
            );
          }
          this.stats.errors++;
        }
      }
    }
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
