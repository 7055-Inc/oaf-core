#!/usr/bin/env node
/**
 * Amazon Order Pull Cron
 * Pulls recent orders from connected Amazon seller accounts.
 *
 * Schedule: every 30 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const amazonApiService = require('../src/services/amazonService');

async function run() {
  console.log('[amazon-pull-orders] Starting order pull…');

  const [shops] = await db.execute(
    'SELECT user_id, shop_id, selling_partner_id, access_token FROM amazon_user_shops WHERE is_active = 1'
  );

  console.log(`[amazon-pull-orders] Found ${shops.length} active shops`);
  let totalSynced = 0;

  for (const shop of shops) {
    try {
      const accessToken = await amazonApiService.getShopAccessToken(shop.shop_id, shop.user_id);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const ordersData = await amazonApiService.getOrders(accessToken, {
        CreatedAfter: thirtyDaysAgo,
        MaxResultsPerPage: 100
      });
      const orders = ordersData.payload?.Orders || [];

      let shopSynced = 0;
      for (const order of orders) {
        const amazonOrderId = order.AmazonOrderId;
        const [existing] = await db.execute(
          'SELECT id FROM amazon_orders WHERE amazon_order_id = ?', [amazonOrderId]
        );

        if (existing.length === 0) {
          const shipping = order.ShippingAddress || {};
          await db.execute(`
            INSERT INTO amazon_orders
              (user_id, shop_id, amazon_order_id, order_status, customer_name,
               shipping_address1, shipping_city, shipping_state, shipping_zip, shipping_country,
               total_amount, currency, order_data, amazon_created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            shop.user_id, shop.shop_id, amazonOrderId,
            order.OrderStatus || 'Pending',
            shipping.Name || null,
            shipping.AddressLine1 || null,
            shipping.City || null,
            shipping.StateOrRegion || null,
            shipping.PostalCode || null,
            shipping.CountryCode || 'US',
            parseFloat(order.OrderTotal?.Amount) || 0,
            order.OrderTotal?.CurrencyCode || 'USD',
            JSON.stringify(order),
            order.PurchaseDate || null
          ]);

          try {
            const itemsData = await amazonApiService.getOrderItems(accessToken, amazonOrderId);
            const items = itemsData.payload?.OrderItems || [];
            const [insertedOrder] = await db.execute(
              'SELECT id FROM amazon_orders WHERE amazon_order_id = ? LIMIT 1', [amazonOrderId]
            );
            if (insertedOrder.length > 0) {
              for (const item of items) {
                const sellerSku = item.SellerSKU || '';
                const asin = item.ASIN || '';
                let productId = null;
                let vendorId = shop.user_id;

                if (sellerSku || asin) {
                  const [matched] = await db.execute(
                    `SELECT product_id, user_id FROM amazon_product_data 
                     WHERE (amazon_sku = ? OR amazon_asin = ?) AND amazon_sku != '' 
                     LIMIT 1`,
                    [sellerSku, asin]
                  );
                  if (matched.length > 0) {
                    productId = matched[0].product_id;
                    vendorId = matched[0].user_id;
                  }
                }

                await db.execute(`
                  INSERT INTO amazon_order_items
                    (amazon_order_id, amazon_order_item_id, asin, sku, product_id, vendor_id,
                     product_name, quantity, unit_price, line_total)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                  insertedOrder[0].id,
                  item.OrderItemId, asin, sellerSku, productId, vendorId,
                  item.Title || 'Unknown', item.QuantityOrdered || 1,
                  parseFloat(item.ItemPrice?.Amount) || 0,
                  parseFloat(item.ItemPrice?.Amount) || 0
                ]);
              }
            }
          } catch (itemErr) {
            console.error(`[amazon-pull-orders] Failed to fetch items for ${amazonOrderId}:`, itemErr.message);
          }
          shopSynced++;
        } else {
          await db.execute(
            'UPDATE amazon_orders SET order_status = ?, order_data = ?, updated_at = CURRENT_TIMESTAMP WHERE amazon_order_id = ?',
            [order.OrderStatus || 'Pending', JSON.stringify(order), amazonOrderId]
          );
        }
      }

      if (shopSynced > 0) {
        await db.execute(`
          INSERT INTO amazon_sync_logs (user_id, sync_type, operation, status, message)
          VALUES (?, 'orders', 'pull', 'success', ?)
        `, [shop.user_id, `Cron: pulled ${shopSynced} new orders`]);
      }

      await db.execute(
        'UPDATE amazon_user_shops SET last_sync_at = NOW() WHERE shop_id = ? AND user_id = ?',
        [shop.shop_id, shop.user_id]
      );

      totalSynced += shopSynced;
    } catch (err) {
      console.error(`[amazon-pull-orders] Error for shop ${shop.shop_id}:`, err.message);
      await db.execute(`
        INSERT INTO amazon_sync_logs (user_id, sync_type, operation, status, message)
        VALUES (?, 'orders', 'pull', 'failed', ?)
      `, [shop.user_id, err.message]);
    }
  }

  console.log(`[amazon-pull-orders] Done: ${totalSynced} new orders across ${shops.length} shops`);
  process.exit(0);
}

run().catch(err => {
  console.error('[amazon-pull-orders] Fatal:', err);
  process.exit(1);
});
