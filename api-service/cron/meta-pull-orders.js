#!/usr/bin/env node
/**
 * Meta Order Pull Cron
 * Pulls recent orders from connected Meta Commerce accounts.
 *
 * Schedule: every 30 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const metaApiService = require('../src/services/metaService');

async function run() {
  console.log('[meta-pull-orders] Starting order pull…');

  const [shops] = await db.execute(
    'SELECT user_id, shop_id, access_token, meta_user_id FROM meta_user_shops WHERE is_active = 1'
  );

  console.log(`[meta-pull-orders] Found ${shops.length} active shops`);
  let totalSynced = 0;

  for (const shop of shops) {
    try {
      const accessToken = await metaApiService.getShopAccessToken(shop.shop_id, shop.user_id);
      const ordersData = await metaApiService.getOrders(accessToken, shop.meta_user_id);
      const orders = ordersData.data || ordersData.orders || ordersData || [];

      let shopSynced = 0;
      for (const order of orders) {
        const metaOrderId = order.id;
        const [existing] = await db.execute(
          'SELECT id FROM meta_orders WHERE meta_order_id = ?', [metaOrderId]
        );

        if (existing.length === 0) {
          const shipping = order.shipping_address || {};
          await db.execute(`
            INSERT INTO meta_orders
              (user_id, shop_id, meta_order_id, order_status, customer_name,
               shipping_address1, shipping_city, shipping_state, shipping_zip, shipping_country,
               total_amount, currency, order_data, meta_created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            shop.user_id, shop.shop_id, metaOrderId,
            order.order_status || 'CREATED',
            shipping.name || null,
            shipping.street1 || null,
            shipping.city || null,
            shipping.state || null,
            shipping.postal_code || null,
            shipping.country || 'US',
            order.estimated_payment?.subtotal?.amount || 0,
            order.estimated_payment?.subtotal?.currency || 'USD',
            JSON.stringify(order),
            order.created || null
          ]);

          const [insertedOrder] = await db.execute(
            'SELECT id FROM meta_orders WHERE meta_order_id = ? LIMIT 1', [metaOrderId]
          );
          if (insertedOrder.length > 0) {
            const items = order.items?.data || order.items || [];
            for (const item of items) {
              await db.execute(`
                INSERT INTO meta_order_items
                  (meta_order_id, meta_item_id, product_name, quantity, unit_price, line_total)
                VALUES (?, ?, ?, ?, ?, ?)
              `, [
                insertedOrder[0].id, item.id || null,
                item.product_name || 'Unknown', item.quantity || 1,
                parseFloat(item.price_per_unit?.amount || 0),
                parseFloat(item.price_per_unit?.amount || 0) * (item.quantity || 1)
              ]);
            }
          }
          shopSynced++;
        } else {
          await db.execute(
            'UPDATE meta_orders SET order_status = ?, order_data = ?, updated_at = CURRENT_TIMESTAMP WHERE meta_order_id = ?',
            [order.order_status || 'CREATED', JSON.stringify(order), metaOrderId]
          );
        }
      }

      if (shopSynced > 0) {
        await db.execute(`
          INSERT INTO meta_sync_logs (user_id, sync_type, operation, status, message)
          VALUES (?, 'orders', 'pull', 'success', ?)
        `, [shop.user_id, `Cron: pulled ${shopSynced} new orders`]);
      }

      await db.execute(
        'UPDATE meta_user_shops SET last_sync_at = NOW() WHERE shop_id = ? AND user_id = ?',
        [shop.shop_id, shop.user_id]
      );
      totalSynced += shopSynced;
    } catch (err) {
      console.error(`[meta-pull-orders] Error for shop ${shop.shop_id}:`, err.message);
      await db.execute(`
        INSERT INTO meta_sync_logs (user_id, sync_type, operation, status, message)
        VALUES (?, 'orders', 'pull', 'failed', ?)
      `, [shop.user_id, err.message]);
    }
  }

  console.log(`[meta-pull-orders] Done: ${totalSynced} new orders across ${shops.length} shops`);
  process.exit(0);
}

run().catch(err => {
  console.error('[meta-pull-orders] Fatal:', err);
  process.exit(1);
});
