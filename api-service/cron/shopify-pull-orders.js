#!/usr/bin/env node
/**
 * Shopify Order Pull Cron
 * Pulls recent orders from connected Shopify stores into shopify_orders / shopify_order_items.
 *
 * Schedule: every 30 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const shopifyApiService = require('../src/services/shopifyService');
const { decrypt } = require('../src/utils/encryption');

async function run() {
  console.log('[shopify-pull-orders] Starting order pull…');

  const [shops] = await db.execute(
    `SELECT user_id, shop_id, shop_domain, access_token FROM shopify_user_shops WHERE is_active = 1`
  );

  console.log(`[shopify-pull-orders] Found ${shops.length} active shops`);
  let totalSynced = 0;

  for (const shop of shops) {
    try {
      const accessToken = decrypt(shop.access_token);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const orders = await shopifyApiService.getOrders(shop.shop_domain, accessToken, {
        created_at_min: thirtyDaysAgo, limit: 100
      });

      let shopSynced = 0;
      for (const order of orders) {
        const shopifyOrderId = String(order.id);
        const [existing] = await db.execute(
          'SELECT id FROM shopify_orders WHERE shopify_order_id = ?',
          [shopifyOrderId]
        );

        if (existing.length === 0) {
          const shipping = order.shipping_address || {};
          await db.execute(`
            INSERT INTO shopify_orders
              (user_id, shop_id, shopify_order_id, shopify_order_number, order_status,
               customer_name, shipping_address1, shipping_address2, shipping_city,
               shipping_state, shipping_zip, shipping_country, shipping_phone,
               total_amount, currency, order_data, shopify_created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            shop.user_id, shop.shop_id, shopifyOrderId,
            order.order_number || order.name,
            order.fulfillment_status || 'unfulfilled',
            order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : null,
            shipping.address1 || null, shipping.address2 || null,
            shipping.city || null, shipping.province || null, shipping.zip || null,
            shipping.country_code || 'US', shipping.phone || null,
            parseFloat(order.total_price) || 0, order.currency || 'USD',
            JSON.stringify(order), order.created_at
          ]);

          for (const item of (order.line_items || [])) {
            const [inserted] = await db.execute('SELECT id FROM shopify_orders WHERE shopify_order_id = ? LIMIT 1', [shopifyOrderId]);
            if (inserted.length > 0) {
              await db.execute(`
                INSERT INTO shopify_order_items
                  (shopify_order_id, shopify_line_item_id, sku, product_name, quantity, unit_price, line_total)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `, [
                inserted[0].id, String(item.id), item.sku || '',
                item.title || item.name, item.quantity,
                parseFloat(item.price) || 0,
                (parseFloat(item.price) || 0) * item.quantity
              ]);
            }
          }
          shopSynced++;
        } else {
          await db.execute(
            `UPDATE shopify_orders SET order_status = ?, order_data = ?, updated_at = CURRENT_TIMESTAMP WHERE shopify_order_id = ?`,
            [order.fulfillment_status || 'unfulfilled', JSON.stringify(order), shopifyOrderId]
          );
        }
      }

      if (shopSynced > 0) {
        await db.execute(`
          INSERT INTO shopify_sync_logs (user_id, sync_type, operation, status, message)
          VALUES (?, 'orders', 'pull', 'success', ?)
        `, [shop.user_id, `Cron: pulled ${shopSynced} new orders`]);
      }

      await db.execute(
        `UPDATE shopify_user_shops SET last_sync_at = NOW() WHERE shop_id = ? AND user_id = ?`,
        [shop.shop_id, shop.user_id]
      );

      totalSynced += shopSynced;
    } catch (err) {
      console.error(`[shopify-pull-orders] Error for shop ${shop.shop_domain}:`, err.message);
      await db.execute(`
        INSERT INTO shopify_sync_logs (user_id, sync_type, operation, status, message)
        VALUES (?, 'orders', 'pull', 'error', ?)
      `, [shop.user_id, err.message]);
    }
  }

  console.log(`[shopify-pull-orders] Done: ${totalSynced} new orders across ${shops.length} shops`);
  process.exit(0);
}

run().catch(err => {
  console.error('[shopify-pull-orders] Fatal:', err);
  process.exit(1);
});
