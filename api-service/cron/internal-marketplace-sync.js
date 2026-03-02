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
require('dotenv').config({ path: path.resolve(process.cwd(), 'api-service/.env') });
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
    const marketplaces = this.specificMarketplace ? [this.specificMarketplace] : ['tiktok', 'etsy', 'amazon', 'walmart', 'wayfair', 'ebay', 'faire', 'meta'];
    
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
          let orderItems = [];
          try {
            const orderData = typeof tikTokOrder.order_data === 'string'
              ? JSON.parse(tikTokOrder.order_data || '{}')
              : tikTokOrder.order_data || {};
            orderItems = orderData.line_items || orderData.item_list || [];
          } catch (parseError) {
            console.error(`[${new Date().toISOString()}] Error parsing order data for ${tikTokOrder.tiktok_order_id}:`, parseError);
            continue;
          }

          if (!this.dryRun) {
            const [orderResult] = await this.db.execute(`
              INSERT INTO orders (
                user_id, status, total_amount, currency,
                marketplace_source, external_order_id, created_at
              ) VALUES (?, 'paid', ?, ?, 'tiktok', ?, NOW())
            `, [
              tikTokOrder.user_id,
              tikTokOrder.total_amount || 0,
              tikTokOrder.currency || 'USD',
              tikTokOrder.tiktok_order_id
            ]);

            const mainOrderId = orderResult.insertId;

            for (const item of orderItems) {
              const productId = item.product_id || null;
              const vendorId = item.vendor_id || tikTokOrder.user_id;
              const qty = parseInt(item.quantity) || 1;
              const price = parseFloat(item.price || item.sale_price || 0);
              const productName = item.product_name || item.name || null;

              await this.db.execute(`
                INSERT INTO order_items (
                  order_id, product_id, vendor_id, quantity, price,
                  commission_rate, commission_amount, status, product_name
                ) VALUES (?, ?, ?, ?, ?, 0, 0, 'pending', ?)
              `, [mainOrderId, productId, vendorId, qty, price, productName]);
            }

            await this.db.execute(`
              UPDATE tiktok_orders
              SET processed_to_main = 1, main_order_id = ?
              WHERE id = ?
            `, [mainOrderId, tikTokOrder.id]);

            this.stats.ordersMerged++;
            console.log(`[${new Date().toISOString()}] Merged TikTok order ${tikTokOrder.tiktok_order_id} -> main order ${mainOrderId}`);
          } else {
            console.log(`[${new Date().toISOString()}] [DRY RUN] Would merge TikTok order ${tikTokOrder.tiktok_order_id}`);
            this.stats.ordersMerged++;
          }

        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error merging TikTok order ${tikTokOrder.id}:`, error);
          this.stats.errors++;
        }
      }
    }
    
    if (marketplace === 'etsy') {
      const [unprocessedOrders] = await this.db.execute(`
        SELECT 
          eo.id, eo.user_id, eo.shop_id, eo.etsy_receipt_id,
          eo.buyer_email, eo.ship_name,
          eo.total, eo.order_status
        FROM etsy_orders eo
        WHERE eo.processed_to_main = 0
        ORDER BY eo.created_at ASC
      `);

      console.log(`[${new Date().toISOString()}] 📦 Found ${unprocessedOrders.length} Etsy orders to merge`);

      for (const etsyOrder of unprocessedOrders) {
        try {
          const [items] = await this.db.execute(`
            SELECT eoi.id as item_id, eoi.product_id, eoi.vendor_id,
              eoi.etsy_listing_id, eoi.quantity, eoi.unit_price, eoi.total_price,
              eoi.product_name
            FROM etsy_order_items eoi
            WHERE eoi.order_id = ?
          `, [etsyOrder.id]);

          if (!this.dryRun) {
            const [orderResult] = await this.db.execute(`
              INSERT INTO orders (
                user_id, status, total_amount, currency,
                marketplace_source, external_order_id, created_at
              ) VALUES (?, 'paid', ?, 'USD', 'etsy', ?, NOW())
            `, [
              etsyOrder.user_id,
              etsyOrder.total || 0,
              etsyOrder.etsy_receipt_id
            ]);

            const mainOrderId = orderResult.insertId;

            for (const item of items) {
              const vendorId = item.vendor_id || etsyOrder.user_id;
              await this.db.execute(`
                INSERT INTO order_items (
                  order_id, product_id, vendor_id, quantity, price,
                  commission_rate, commission_amount, status, product_name
                ) VALUES (?, ?, ?, ?, ?, 0, 0, 'pending', ?)
              `, [mainOrderId, item.product_id, vendorId, item.quantity, item.unit_price, item.product_name]);
            }

            await this.db.execute(`
              UPDATE etsy_orders SET processed_to_main = 1, main_order_id = ? WHERE id = ?
            `, [mainOrderId, etsyOrder.id]);

            this.stats.ordersMerged++;
            console.log(`[${new Date().toISOString()}] ✅ Etsy receipt ${etsyOrder.etsy_receipt_id} → main order ${mainOrderId}`);
          } else {
            console.log(`[${new Date().toISOString()}] 🏃 [DRY RUN] Would merge Etsy receipt ${etsyOrder.etsy_receipt_id}`);
            this.stats.ordersMerged++;
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error merging Etsy order ${etsyOrder.id}:`, error);
          this.stats.errors++;
        }
      }
    }

    if (marketplace === 'amazon') {
      const [unprocessedOrders] = await this.db.execute(`
        SELECT 
          ao.id, ao.user_id, ao.shop_id, ao.amazon_order_id,
          ao.customer_name, ao.total_amount, ao.currency, ao.order_status
        FROM amazon_orders ao
        WHERE ao.processed_to_main = 0
        ORDER BY ao.created_at ASC
      `);

      console.log(`[${new Date().toISOString()}] 📦 Found ${unprocessedOrders.length} Amazon orders to merge`);

      for (const amazonOrder of unprocessedOrders) {
        try {
          const [items] = await this.db.execute(`
            SELECT aoi.id as item_id, aoi.product_id, aoi.vendor_id,
              aoi.asin, aoi.sku, aoi.quantity, aoi.unit_price, aoi.line_total,
              aoi.product_name
            FROM amazon_order_items aoi
            WHERE aoi.amazon_order_id = ?
          `, [amazonOrder.id]);

          if (!this.dryRun) {
            const [orderResult] = await this.db.execute(`
              INSERT INTO orders (
                user_id, status, total_amount, currency,
                marketplace_source, external_order_id, created_at
              ) VALUES (?, 'paid', ?, ?, 'amazon', ?, NOW())
            `, [
              amazonOrder.user_id,
              amazonOrder.total_amount || 0,
              amazonOrder.currency || 'USD',
              amazonOrder.amazon_order_id
            ]);

            const mainOrderId = orderResult.insertId;

            for (const item of items) {
              const vendorId = item.vendor_id || amazonOrder.user_id;
              await this.db.execute(`
                INSERT INTO order_items (
                  order_id, product_id, vendor_id, quantity, price,
                  commission_rate, commission_amount, status, product_name
                ) VALUES (?, ?, ?, ?, ?, 0, 0, 'pending', ?)
              `, [mainOrderId, item.product_id, vendorId, item.quantity, item.unit_price, item.product_name]);
            }

            await this.db.execute(`
              UPDATE amazon_orders SET processed_to_main = 1, main_order_id = ? WHERE id = ?
            `, [mainOrderId, amazonOrder.id]);

            this.stats.ordersMerged++;
            console.log(`[${new Date().toISOString()}] ✅ Amazon order ${amazonOrder.amazon_order_id} → main order ${mainOrderId}`);
          } else {
            console.log(`[${new Date().toISOString()}] 🏃 [DRY RUN] Would merge Amazon order ${amazonOrder.amazon_order_id}`);
            this.stats.ordersMerged++;
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error merging Amazon order ${amazonOrder.id}:`, error);
          this.stats.errors++;
        }
      }
    }

    if (marketplace === 'walmart') {
      // Walmart uses corporate model: orders belong to Brakebee's account,
      // line items are routed to individual vendors. We create one main order
      // per vendor per walmart order so each vendor sees their items.
      const [unprocessedOrders] = await this.db.execute(`
        SELECT wo.id, wo.walmart_order_id, wo.walmart_purchase_order_id,
          wo.total_amount, wo.currency, wo.order_status
        FROM walmart_orders wo
        WHERE wo.processed_to_main = 0
        ORDER BY wo.created_at ASC
      `);
      
      console.log(`[${new Date().toISOString()}] 📦 Found ${unprocessedOrders.length} Walmart orders to merge`);
      
      for (const walmartOrder of unprocessedOrders) {
        try {
          // Get items grouped by vendor
          const [items] = await this.db.execute(`
            SELECT woi.id as item_id, woi.product_id, woi.vendor_id, woi.sku,
              woi.walmart_line_number, woi.quantity, woi.unit_price, woi.line_total,
              p.name as product_name
            FROM walmart_order_items woi
            LEFT JOIN products p ON woi.product_id = p.id
            WHERE woi.walmart_order_id = ?
          `, [walmartOrder.id]);

          if (items.length === 0) {
            console.log(`[${new Date().toISOString()}] ⚠️  No items for Walmart order ${walmartOrder.walmart_order_id}`);
            continue;
          }

          // Group items by vendor_id
          const vendorGroups = {};
          for (const item of items) {
            if (!vendorGroups[item.vendor_id]) vendorGroups[item.vendor_id] = [];
            vendorGroups[item.vendor_id].push(item);
          }

          if (!this.dryRun) {
            let firstMainOrderId = null;

            for (const [vendorId, vendorItems] of Object.entries(vendorGroups)) {
              const vendorTotal = vendorItems.reduce((sum, i) => sum + parseFloat(i.line_total), 0);

              const [orderResult] = await this.db.execute(`
                INSERT INTO orders (
                  user_id, status, total_amount, currency,
                  marketplace_source, external_order_id, created_at
                ) VALUES (?, 'paid', ?, ?, 'walmart', ?, NOW())
              `, [vendorId, vendorTotal, walmartOrder.currency || 'USD', walmartOrder.walmart_order_id]);

              const mainOrderId = orderResult.insertId;
              if (!firstMainOrderId) firstMainOrderId = mainOrderId;

              for (const item of vendorItems) {
                await this.db.execute(`
                  INSERT INTO order_items (
                    order_id, product_id, vendor_id, quantity, price,
                    commission_rate, commission_amount, status, product_name
                  ) VALUES (?, ?, ?, ?, ?, 0, 0, 'pending', ?)
                `, [mainOrderId, item.product_id, item.vendor_id, item.quantity, item.unit_price, item.product_name]);
              }

              console.log(`[${new Date().toISOString()}] ✅ Walmart order ${walmartOrder.walmart_order_id} → vendor ${vendorId} → main order ${mainOrderId}`);
            }

            // Mark walmart order as processed
            await this.db.execute(`
              UPDATE walmart_orders SET processed_to_main = 1, main_order_id = ? WHERE id = ?
            `, [firstMainOrderId, walmartOrder.id]);

            this.stats.ordersMerged++;
          } else {
            console.log(`[${new Date().toISOString()}] 🏃 [DRY RUN] Would merge Walmart order ${walmartOrder.walmart_order_id} for ${Object.keys(vendorGroups).length} vendors`);
            this.stats.ordersMerged++;
          }

        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error merging Walmart order ${walmartOrder.id}:`, error);
          this.stats.errors++;
        }
      }
    }

    if (marketplace === 'wayfair') {
      const [unprocessedOrders] = await this.db.execute(`
        SELECT wo.id, wo.wayfair_po_number, wo.total, wo.order_status
        FROM wayfair_orders wo
        WHERE wo.processed_to_main = 0
        ORDER BY wo.created_at ASC
      `);

      console.log(`[${new Date().toISOString()}] 📦 Found ${unprocessedOrders.length} Wayfair orders to merge`);

      for (const wayfairOrder of unprocessedOrders) {
        try {
          const [items] = await this.db.execute(`
            SELECT woi.id as item_id, woi.product_id, woi.vendor_id,
              woi.quantity, woi.unit_price, woi.total_price, woi.product_name
            FROM wayfair_order_items woi
            WHERE woi.order_id = ?
          `, [wayfairOrder.id]);

          if (items.length === 0) continue;

          const vendorGroups = {};
          for (const item of items) {
            if (!vendorGroups[item.vendor_id]) vendorGroups[item.vendor_id] = [];
            vendorGroups[item.vendor_id].push(item);
          }

          if (!this.dryRun) {
            let firstMainOrderId = null;

            for (const [vendorId, vendorItems] of Object.entries(vendorGroups)) {
              const vendorTotal = vendorItems.reduce((sum, i) => sum + parseFloat(i.total_price || 0), 0);

              const [orderResult] = await this.db.execute(`
                INSERT INTO orders (
                  user_id, status, total_amount, currency,
                  marketplace_source, external_order_id, created_at
                ) VALUES (?, 'paid', ?, 'USD', 'wayfair', ?, NOW())
              `, [vendorId, vendorTotal, wayfairOrder.wayfair_po_number]);

              const mainOrderId = orderResult.insertId;
              if (!firstMainOrderId) firstMainOrderId = mainOrderId;

              for (const item of vendorItems) {
                await this.db.execute(`
                  INSERT INTO order_items (
                    order_id, product_id, vendor_id, quantity, price,
                    commission_rate, commission_amount, status, product_name
                  ) VALUES (?, ?, ?, ?, ?, 0, 0, 'pending', ?)
                `, [mainOrderId, item.product_id, item.vendor_id, item.quantity, item.unit_price, item.product_name]);
              }

              console.log(`[${new Date().toISOString()}] ✅ Wayfair PO ${wayfairOrder.wayfair_po_number} → vendor ${vendorId} → main order ${mainOrderId}`);
            }

            await this.db.execute(`
              UPDATE wayfair_orders SET processed_to_main = 1, main_order_id = ? WHERE id = ?
            `, [firstMainOrderId, wayfairOrder.id]);

            this.stats.ordersMerged++;
          } else {
            console.log(`[${new Date().toISOString()}] 🏃 [DRY RUN] Would merge Wayfair PO ${wayfairOrder.wayfair_po_number}`);
            this.stats.ordersMerged++;
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error merging Wayfair order ${wayfairOrder.id}:`, error);
          this.stats.errors++;
        }
      }
    }

    if (marketplace === 'ebay') {
      const [unprocessedOrders] = await this.db.execute(`
        SELECT eo.id, eo.user_id, eo.shop_id, eo.ebay_order_id,
          eo.total_amount, eo.currency, eo.order_status
        FROM ebay_orders eo WHERE eo.processed_to_main = 0 ORDER BY eo.created_at ASC
      `);
      console.log(`[${new Date().toISOString()}] 📦 Found ${unprocessedOrders.length} eBay orders to merge`);
      for (const ebayOrder of unprocessedOrders) {
        try {
          const [items] = await this.db.execute(`
            SELECT eoi.id as item_id, eoi.product_id, eoi.vendor_id,
              eoi.quantity, eoi.unit_price, eoi.line_total, eoi.product_name
            FROM ebay_order_items eoi WHERE eoi.ebay_order_id = ?
          `, [ebayOrder.id]);
          if (!this.dryRun) {
            const [orderResult] = await this.db.execute(`
              INSERT INTO orders (user_id, status, total_amount, currency,
                marketplace_source, external_order_id, created_at)
              VALUES (?, 'paid', ?, ?, 'ebay', ?, NOW())
            `, [ebayOrder.user_id, ebayOrder.total_amount || 0, ebayOrder.currency || 'USD', ebayOrder.ebay_order_id]);
            const mainOrderId = orderResult.insertId;
            for (const item of items) {
              await this.db.execute(`
                INSERT INTO order_items (order_id, product_id, vendor_id, quantity, price,
                  commission_rate, commission_amount, status, product_name)
                VALUES (?, ?, ?, ?, ?, 0, 0, 'pending', ?)
              `, [mainOrderId, item.product_id, item.vendor_id || ebayOrder.user_id, item.quantity, item.unit_price, item.product_name]);
            }
            await this.db.execute(`UPDATE ebay_orders SET processed_to_main = 1, main_order_id = ? WHERE id = ?`, [mainOrderId, ebayOrder.id]);
            this.stats.ordersMerged++;
            console.log(`[${new Date().toISOString()}] ✅ eBay order ${ebayOrder.ebay_order_id} → main order ${mainOrderId}`);
          } else {
            console.log(`[${new Date().toISOString()}] 🏃 [DRY RUN] Would merge eBay order ${ebayOrder.ebay_order_id}`);
            this.stats.ordersMerged++;
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error merging eBay order ${ebayOrder.id}:`, error);
          this.stats.errors++;
        }
      }
    }

    if (marketplace === 'faire') {
      const [unprocessedOrders] = await this.db.execute(`
        SELECT fo.id, fo.user_id, fo.shop_id, fo.faire_order_id,
          fo.total_amount, fo.currency, fo.order_status
        FROM faire_orders fo WHERE fo.processed_to_main = 0 ORDER BY fo.created_at ASC
      `);
      console.log(`[${new Date().toISOString()}] 📦 Found ${unprocessedOrders.length} Faire orders to merge`);
      for (const faireOrder of unprocessedOrders) {
        try {
          const [items] = await this.db.execute(`
            SELECT foi.id as item_id, foi.product_id, foi.vendor_id,
              foi.quantity, foi.unit_price, foi.line_total, foi.product_name
            FROM faire_order_items foi WHERE foi.faire_order_id = ?
          `, [faireOrder.id]);
          if (!this.dryRun) {
            const [orderResult] = await this.db.execute(`
              INSERT INTO orders (user_id, status, total_amount, currency,
                marketplace_source, external_order_id, created_at)
              VALUES (?, 'paid', ?, ?, 'faire', ?, NOW())
            `, [faireOrder.user_id, faireOrder.total_amount || 0, faireOrder.currency || 'USD', faireOrder.faire_order_id]);
            const mainOrderId = orderResult.insertId;
            for (const item of items) {
              await this.db.execute(`
                INSERT INTO order_items (order_id, product_id, vendor_id, quantity, price,
                  commission_rate, commission_amount, status, product_name)
                VALUES (?, ?, ?, ?, ?, 0, 0, 'pending', ?)
              `, [mainOrderId, item.product_id, item.vendor_id || faireOrder.user_id, item.quantity, item.unit_price, item.product_name]);
            }
            await this.db.execute(`UPDATE faire_orders SET processed_to_main = 1, main_order_id = ? WHERE id = ?`, [mainOrderId, faireOrder.id]);
            this.stats.ordersMerged++;
            console.log(`[${new Date().toISOString()}] ✅ Faire order ${faireOrder.faire_order_id} → main order ${mainOrderId}`);
          } else {
            console.log(`[${new Date().toISOString()}] 🏃 [DRY RUN] Would merge Faire order ${faireOrder.faire_order_id}`);
            this.stats.ordersMerged++;
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error merging Faire order ${faireOrder.id}:`, error);
          this.stats.errors++;
        }
      }
    }

    if (marketplace === 'meta') {
      const [unprocessedOrders] = await this.db.execute(`
        SELECT mo.id, mo.user_id, mo.shop_id, mo.meta_order_id,
          mo.total_amount, mo.currency, mo.order_status
        FROM meta_orders mo WHERE mo.processed_to_main = 0 ORDER BY mo.created_at ASC
      `);
      console.log(`[${new Date().toISOString()}] 📦 Found ${unprocessedOrders.length} Meta orders to merge`);
      for (const metaOrder of unprocessedOrders) {
        try {
          const [items] = await this.db.execute(`
            SELECT moi.id as item_id, moi.product_id, moi.vendor_id,
              moi.quantity, moi.unit_price, moi.line_total, moi.product_name
            FROM meta_order_items moi WHERE moi.meta_order_id = ?
          `, [metaOrder.id]);
          if (!this.dryRun) {
            const [orderResult] = await this.db.execute(`
              INSERT INTO orders (user_id, status, total_amount, currency,
                marketplace_source, external_order_id, created_at)
              VALUES (?, 'paid', ?, ?, 'meta', ?, NOW())
            `, [metaOrder.user_id, metaOrder.total_amount || 0, metaOrder.currency || 'USD', metaOrder.meta_order_id]);
            const mainOrderId = orderResult.insertId;
            for (const item of items) {
              await this.db.execute(`
                INSERT INTO order_items (order_id, product_id, vendor_id, quantity, price,
                  commission_rate, commission_amount, status, product_name)
                VALUES (?, ?, ?, ?, ?, 0, 0, 'pending', ?)
              `, [mainOrderId, item.product_id, item.vendor_id || metaOrder.user_id, item.quantity, item.unit_price, item.product_name]);
            }
            await this.db.execute(`UPDATE meta_orders SET processed_to_main = 1, main_order_id = ? WHERE id = ?`, [mainOrderId, metaOrder.id]);
            this.stats.ordersMerged++;
            console.log(`[${new Date().toISOString()}] ✅ Meta order ${metaOrder.meta_order_id} → main order ${mainOrderId}`);
          } else {
            console.log(`[${new Date().toISOString()}] 🏃 [DRY RUN] Would merge Meta order ${metaOrder.meta_order_id}`);
            this.stats.ordersMerged++;
          }
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error merging Meta order ${metaOrder.id}:`, error);
          this.stats.errors++;
        }
      }
    }
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

    if (marketplace === 'amazon') {
      const [trackingUpdates] = await this.db.execute(`
        SELECT
          ao.id as amazon_order_table_id,
          ao.amazon_order_id,
          aoi.id as amazon_item_id,
          aoi.product_id,
          oit.tracking_number,
          oit.carrier as tracking_carrier,
          oit.shipped_at
        FROM amazon_orders ao
        JOIN orders o ON ao.main_order_id = o.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN order_item_tracking oit ON oi.id = oit.order_item_id
        JOIN amazon_order_items aoi ON aoi.amazon_order_id = ao.id AND aoi.product_id = oi.product_id
        WHERE aoi.tracking_synced_at IS NULL
          AND aoi.tracking_number IS NULL
          AND oit.tracking_number IS NOT NULL
          AND ao.processed_to_main = 1
      `);

      console.log(`[${new Date().toISOString()}] 📤 Found ${trackingUpdates.length} tracking updates to sync back to Amazon tables`);

      for (const tracking of trackingUpdates) {
        try {
          if (!this.dryRun) {
            await this.db.execute(`
              UPDATE amazon_order_items
              SET tracking_number = ?, tracking_carrier = ?, status = 'shipped'
              WHERE id = ?
            `, [tracking.tracking_number, tracking.tracking_carrier, tracking.amazon_item_id]);
          }
          this.stats.trackingUpdated++;
          console.log(`[${new Date().toISOString()}] 📤 Copied tracking to Amazon item ${tracking.amazon_item_id} (order ${tracking.amazon_order_id})`);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error copying tracking for Amazon item ${tracking.amazon_item_id}:`, error);
          this.stats.errors++;
        }
      }
    }

    if (marketplace === 'walmart') {
      // When a vendor adds tracking through the main order flow (order_item_tracking),
      // copy it back to walmart_order_items so the walmart-sync-tracking cron can push it to Walmart API.
      const [trackingUpdates] = await this.db.execute(`
        SELECT
          wo.id as walmart_order_table_id,
          wo.walmart_order_id,
          woi.id as walmart_item_id,
          woi.product_id,
          oit.tracking_number,
          oit.carrier as tracking_carrier,
          oit.shipped_at
        FROM walmart_orders wo
        JOIN orders o ON wo.main_order_id = o.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN order_item_tracking oit ON oi.id = oit.order_item_id
        JOIN walmart_order_items woi ON woi.walmart_order_id = wo.id AND woi.product_id = oi.product_id
        WHERE woi.tracking_synced_at IS NULL
          AND woi.tracking_number IS NULL
          AND oit.tracking_number IS NOT NULL
          AND wo.processed_to_main = 1
      `);

      console.log(`[${new Date().toISOString()}] 📤 Found ${trackingUpdates.length} tracking updates to sync back to Walmart tables`);

      for (const tracking of trackingUpdates) {
        try {
          if (!this.dryRun) {
            await this.db.execute(`
              UPDATE walmart_order_items
              SET tracking_number = ?, tracking_carrier = ?, status = 'shipped', shipped_at = COALESCE(?, NOW())
              WHERE id = ?
            `, [tracking.tracking_number, tracking.tracking_carrier, tracking.shipped_at, tracking.walmart_item_id]);
          }

          this.stats.trackingUpdated++;
          console.log(`[${new Date().toISOString()}] 📤 Copied tracking to Walmart item ${tracking.walmart_item_id} (order ${tracking.walmart_order_id})`);

        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error copying tracking for Walmart item ${tracking.walmart_item_id}:`, error);
          this.stats.errors++;
        }
      }
    }

    if (marketplace === 'etsy') {
      const [trackingUpdates] = await this.db.execute(`
        SELECT
          eo.id as etsy_order_table_id,
          eo.etsy_receipt_id,
          eoi.id as etsy_item_id,
          eoi.product_id,
          oit.tracking_number,
          oit.carrier as tracking_carrier,
          oit.shipped_at
        FROM etsy_orders eo
        JOIN orders o ON eo.main_order_id = o.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN order_item_tracking oit ON oi.id = oit.order_item_id
        JOIN etsy_order_items eoi ON eoi.order_id = eo.id AND eoi.product_id = oi.product_id
        WHERE eoi.tracking_synced_at IS NULL
          AND eoi.tracking_number IS NULL
          AND oit.tracking_number IS NOT NULL
          AND eo.processed_to_main = 1
      `);

      console.log(`[${new Date().toISOString()}] 📤 Found ${trackingUpdates.length} tracking updates to sync back to Etsy tables`);

      for (const tracking of trackingUpdates) {
        try {
          if (!this.dryRun) {
            await this.db.execute(`
              UPDATE etsy_order_items
              SET tracking_number = ?, tracking_carrier = ?, status = 'shipped'
              WHERE id = ?
            `, [tracking.tracking_number, tracking.tracking_carrier, tracking.etsy_item_id]);
          }
          this.stats.trackingUpdated++;
          console.log(`[${new Date().toISOString()}] 📤 Copied tracking to Etsy item ${tracking.etsy_item_id} (receipt ${tracking.etsy_receipt_id})`);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error copying tracking for Etsy item ${tracking.etsy_item_id}:`, error);
          this.stats.errors++;
        }
      }
    }

    if (marketplace === 'wayfair') {
      const [trackingUpdates] = await this.db.execute(`
        SELECT
          wo.id as wayfair_order_table_id,
          wo.wayfair_po_number,
          woi.id as wayfair_item_id,
          woi.product_id,
          oit.tracking_number,
          oit.carrier as tracking_carrier,
          oit.shipped_at
        FROM wayfair_orders wo
        JOIN orders o ON wo.main_order_id = o.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN order_item_tracking oit ON oi.id = oit.order_item_id
        JOIN wayfair_order_items woi ON woi.order_id = wo.id AND woi.product_id = oi.product_id
        WHERE woi.tracking_synced_at IS NULL
          AND woi.tracking_number IS NULL
          AND oit.tracking_number IS NOT NULL
          AND wo.processed_to_main = 1
      `);

      console.log(`[${new Date().toISOString()}] 📤 Found ${trackingUpdates.length} tracking updates to sync back to Wayfair tables`);

      for (const tracking of trackingUpdates) {
        try {
          if (!this.dryRun) {
            await this.db.execute(`
              UPDATE wayfair_order_items
              SET tracking_number = ?, tracking_carrier = ?, status = 'shipped', shipped_at = COALESCE(?, NOW())
              WHERE id = ?
            `, [tracking.tracking_number, tracking.tracking_carrier, tracking.shipped_at, tracking.wayfair_item_id]);
          }
          this.stats.trackingUpdated++;
          console.log(`[${new Date().toISOString()}] 📤 Copied tracking to Wayfair item ${tracking.wayfair_item_id} (PO ${tracking.wayfair_po_number})`);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error copying tracking for Wayfair item ${tracking.wayfair_item_id}:`, error);
          this.stats.errors++;
        }
      }
    }

    for (const mp of ['ebay', 'faire', 'meta']) {
      if (marketplace !== mp) continue;
      const cfg = {
        ebay:  { table: 'ebay_orders',  items: 'ebay_order_items',  orderId: 'ebay_order_id',  itemJoinCol: 'ebay_order_id', label: 'eBay' },
        faire: { table: 'faire_orders', items: 'faire_order_items', orderId: 'faire_order_id', itemJoinCol: 'faire_order_id', label: 'Faire' },
        meta:  { table: 'meta_orders',  items: 'meta_order_items',  orderId: 'meta_order_id',  itemJoinCol: 'meta_order_id', label: 'Meta' }
      }[mp];

      const [trackingUpdates] = await this.db.execute(`
        SELECT
          mpo.id as mp_order_id, mpo.${cfg.orderId} as ext_order_id,
          mpi.id as mp_item_id, mpi.product_id,
          oit.tracking_number, oit.carrier as tracking_carrier, oit.shipped_at
        FROM ${cfg.table} mpo
        JOIN orders o ON mpo.main_order_id = o.id
        JOIN order_items oi ON o.id = oi.order_id
        JOIN order_item_tracking oit ON oi.id = oit.order_item_id
        JOIN ${cfg.items} mpi ON mpi.${cfg.itemJoinCol} = mpo.id AND mpi.product_id = oi.product_id
        WHERE mpi.tracking_synced_at IS NULL
          AND mpi.tracking_number IS NULL
          AND oit.tracking_number IS NOT NULL
          AND mpo.processed_to_main = 1
      `);

      console.log(`[${new Date().toISOString()}] 📤 Found ${trackingUpdates.length} tracking updates to sync back to ${cfg.label} tables`);

      for (const tracking of trackingUpdates) {
        try {
          if (!this.dryRun) {
            await this.db.execute(`
              UPDATE ${cfg.items} SET tracking_number = ?, tracking_carrier = ?, status = 'shipped' WHERE id = ?
            `, [tracking.tracking_number, tracking.tracking_carrier, tracking.mp_item_id]);
          }
          this.stats.trackingUpdated++;
          console.log(`[${new Date().toISOString()}] 📤 Copied tracking to ${cfg.label} item ${tracking.mp_item_id}`);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error copying tracking for ${cfg.label} item ${tracking.mp_item_id}:`, error);
          this.stats.errors++;
        }
      }
    }
  }

  async updateInventoryFlags(marketplace) {
    if (marketplace === 'etsy') {
      const [inventoryUpdates] = await this.db.execute(`
        SELECT 
          epd.product_id,
          epd.user_id,
          eia.allocated_quantity,
          pi.qty_available
        FROM etsy_product_data epd
        JOIN etsy_inventory_allocations eia ON epd.product_id = eia.product_id AND epd.user_id = eia.user_id
        JOIN product_inventory pi ON epd.product_id = pi.product_id
        WHERE epd.sync_status = 'synced'
        AND epd.etsy_listing_id IS NOT NULL
        AND (epd.last_sync_at IS NULL OR epd.last_sync_at < DATE_SUB(NOW(), INTERVAL 1 HOUR))
      `);

      console.log(`[${new Date().toISOString()}] 📊 Found ${inventoryUpdates.length} Etsy products needing inventory flag updates`);

      for (const inventory of inventoryUpdates) {
        try {
          if (!this.dryRun) {
            await this.db.execute(`
              UPDATE etsy_product_data 
              SET last_sync_at = NOW()
              WHERE product_id = ? AND user_id = ?
            `, [inventory.product_id, inventory.user_id]);
          }
          this.stats.inventoryUpdated++;
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error updating Etsy inventory flag for product ${inventory.product_id}:`, error);
          this.stats.errors++;
        }
      }
    }

    if (marketplace === 'amazon') {
      const [inventoryUpdates] = await this.db.execute(`
        SELECT 
          apd.product_id,
          apd.user_id,
          aia.allocated_quantity,
          pi.qty_available
        FROM amazon_product_data apd
        JOIN amazon_inventory_allocations aia ON apd.product_id = aia.product_id AND apd.user_id = aia.user_id
        JOIN product_inventory pi ON apd.product_id = pi.product_id
        WHERE apd.sync_status = 'synced'
        AND apd.amazon_asin IS NOT NULL
        AND (apd.last_sync_at IS NULL OR apd.last_sync_at < DATE_SUB(NOW(), INTERVAL 1 HOUR))
      `);

      console.log(`[${new Date().toISOString()}] 📊 Found ${inventoryUpdates.length} Amazon products needing inventory flag updates`);

      for (const inventory of inventoryUpdates) {
        try {
          if (!this.dryRun) {
            await this.db.execute(`
              UPDATE amazon_product_data 
              SET last_sync_at = NOW()
              WHERE product_id = ? AND user_id = ?
            `, [inventory.product_id, inventory.user_id]);
          }
          this.stats.inventoryUpdated++;
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error updating Amazon inventory flag for product ${inventory.product_id}:`, error);
          this.stats.errors++;
        }
      }
    }

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

    for (const mp of ['ebay', 'faire', 'meta']) {
      if (marketplace !== mp) continue;
      const cfg = {
        ebay:  { pd: 'ebay_product_data',  ia: 'ebay_inventory_allocations',  label: 'eBay' },
        faire: { pd: 'faire_product_data', ia: 'faire_inventory_allocations', label: 'Faire' },
        meta:  { pd: 'meta_product_data',  ia: 'meta_inventory_allocations',  label: 'Meta' }
      }[mp];

      const [inventoryUpdates] = await this.db.execute(`
        SELECT mpd.product_id, mpd.user_id, mia.allocated_quantity, pi.qty_available
        FROM ${cfg.pd} mpd
        JOIN ${cfg.ia} mia ON mpd.product_id = mia.product_id AND mpd.user_id = mia.user_id
        JOIN product_inventory pi ON mpd.product_id = pi.product_id
        WHERE mpd.sync_status = 'synced'
        AND (mpd.last_sync_at IS NULL OR mpd.last_sync_at < DATE_SUB(NOW(), INTERVAL 1 HOUR))
      `);

      console.log(`[${new Date().toISOString()}] 📊 Found ${inventoryUpdates.length} ${cfg.label} products needing inventory flag updates`);

      for (const inventory of inventoryUpdates) {
        try {
          if (!this.dryRun) {
            await this.db.execute(`UPDATE ${cfg.pd} SET last_sync_at = NOW() WHERE product_id = ? AND user_id = ?`,
              [inventory.product_id, inventory.user_id]);
          }
          this.stats.inventoryUpdated++;
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error updating ${cfg.label} inventory flag for product ${inventory.product_id}:`, error);
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
    
    if (marketplace === 'etsy') {
      const [pendingProducts] = await this.db.execute(`
        SELECT 
          epd.product_id,
          epd.user_id,
          epd.etsy_title,
          epd.sync_status
        FROM etsy_product_data epd
        WHERE epd.sync_status = 'pending'
        ORDER BY epd.updated_at ASC
      `);

      console.log(`[${new Date().toISOString()}] 🔄 Found ${pendingProducts.length} Etsy products with pending changes`);

      for (const product of pendingProducts) {
        try {
          if (!this.dryRun) {
            await this.db.execute(`
              UPDATE etsy_product_data 
              SET sync_status = 'ready_for_api_sync'
              WHERE product_id = ? AND user_id = ?
            `, [product.product_id, product.user_id]);
          }
          this.stats.productsSynced++;
          console.log(`[${new Date().toISOString()}] 🔄 Marked Etsy product ${product.product_id} ready for API sync`);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error syncing Etsy product ${product.product_id}:`, error);
          this.stats.errors++;
        }
      }
    }

    if (marketplace === 'amazon') {
      const [pendingProducts] = await this.db.execute(`
        SELECT 
          apd.product_id,
          apd.user_id,
          apd.amazon_title,
          apd.sync_status
        FROM amazon_product_data apd
        WHERE apd.sync_status = 'pending'
        ORDER BY apd.updated_at ASC
      `);

      console.log(`[${new Date().toISOString()}] 🔄 Found ${pendingProducts.length} Amazon products with pending changes`);

      for (const product of pendingProducts) {
        try {
          if (!this.dryRun) {
            await this.db.execute(`
              UPDATE amazon_product_data 
              SET sync_status = 'ready_for_api_sync'
              WHERE product_id = ? AND user_id = ?
            `, [product.product_id, product.user_id]);
          }
          this.stats.productsSynced++;
          console.log(`[${new Date().toISOString()}] 🔄 Marked Amazon product ${product.product_id} ready for API sync`);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error syncing Amazon product ${product.product_id}:`, error);
          this.stats.errors++;
        }
      }
    }

    for (const mp of ['ebay', 'faire', 'meta']) {
      if (marketplace !== mp) continue;
      const cfg = {
        ebay:  { pd: 'ebay_product_data',  label: 'eBay' },
        faire: { pd: 'faire_product_data', label: 'Faire' },
        meta:  { pd: 'meta_product_data',  label: 'Meta' }
      }[mp];

      const [pendingProducts] = await this.db.execute(`
        SELECT product_id, user_id, sync_status
        FROM ${cfg.pd} WHERE sync_status = 'pending' ORDER BY updated_at ASC
      `);

      console.log(`[${new Date().toISOString()}] 🔄 Found ${pendingProducts.length} ${cfg.label} products with pending changes`);

      for (const product of pendingProducts) {
        try {
          if (!this.dryRun) {
            await this.db.execute(`UPDATE ${cfg.pd} SET sync_status = 'ready_for_api_sync' WHERE product_id = ? AND user_id = ?`,
              [product.product_id, product.user_id]);
          }
          this.stats.productsSynced++;
          console.log(`[${new Date().toISOString()}] 🔄 Marked ${cfg.label} product ${product.product_id} ready for API sync`);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] ❌ Error syncing ${cfg.label} product ${product.product_id}:`, error);
          this.stats.errors++;
        }
      }
    }
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
