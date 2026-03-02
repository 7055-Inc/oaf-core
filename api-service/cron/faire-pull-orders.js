#!/usr/bin/env node
/**
 * Faire Order Pull Cron
 * Pulls recent orders from connected Faire brands.
 *
 * Schedule: every 30 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const faireApiService = require('../src/services/faireService');

async function run() {
  console.log('[faire-pull-orders] Starting order pull…');

  const [shops] = await db.execute(
    'SELECT user_id, shop_id, access_token FROM faire_user_shops WHERE is_active = 1'
  );

  console.log(`[faire-pull-orders] Found ${shops.length} active brands`);
  let totalSynced = 0;

  for (const shop of shops) {
    try {
      const accessToken = await faireApiService.getShopAccessToken(shop.shop_id, shop.user_id);
      const ordersData = await faireApiService.listOrders(accessToken, { limit: 50 });
      const orders = ordersData.orders || ordersData || [];

      let shopSynced = 0;
      for (const order of orders) {
        const faireOrderId = order.id;
        const [existing] = await db.execute(
          'SELECT id FROM faire_orders WHERE faire_order_id = ?', [faireOrderId]
        );

        if (existing.length === 0) {
          const shipping = order.address || {};
          await db.execute(`
            INSERT INTO faire_orders
              (user_id, shop_id, faire_order_id, order_status, customer_name,
               shipping_address1, shipping_city, shipping_state, shipping_zip, shipping_country,
               total_amount, currency, order_data, faire_created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            shop.user_id, shop.shop_id, faireOrderId,
            order.state || 'NEW',
            shipping.name || null,
            shipping.address1 || null,
            shipping.city || null,
            shipping.state || null,
            shipping.postal_code || null,
            shipping.country_code || 'US',
            (order.payout_costs?.total_payout?.amount_cents || 0) / 100,
            order.payout_costs?.total_payout?.currency || 'USD',
            JSON.stringify(order),
            order.created_at || null
          ]);

          const [insertedOrder] = await db.execute(
            'SELECT id FROM faire_orders WHERE faire_order_id = ? LIMIT 1', [faireOrderId]
          );
          if (insertedOrder.length > 0) {
            for (const item of (order.items || [])) {
              await db.execute(`
                INSERT INTO faire_order_items
                  (faire_order_id, faire_item_id, product_name, quantity, unit_price, line_total)
                VALUES (?, ?, ?, ?, ?, ?)
              `, [
                insertedOrder[0].id, item.id || null,
                item.product_name || 'Unknown', item.quantity || 1,
                (item.price_cents || 0) / 100,
                ((item.price_cents || 0) * (item.quantity || 1)) / 100
              ]);
            }
          }
          shopSynced++;
        } else {
          await db.execute(
            'UPDATE faire_orders SET order_status = ?, order_data = ?, updated_at = CURRENT_TIMESTAMP WHERE faire_order_id = ?',
            [order.state || 'NEW', JSON.stringify(order), faireOrderId]
          );
        }
      }

      if (shopSynced > 0) {
        await db.execute(`
          INSERT INTO faire_sync_logs (user_id, sync_type, operation, status, message)
          VALUES (?, 'orders', 'pull', 'success', ?)
        `, [shop.user_id, `Cron: pulled ${shopSynced} new orders`]);
      }

      await db.execute(
        'UPDATE faire_user_shops SET last_sync_at = NOW() WHERE shop_id = ? AND user_id = ?',
        [shop.shop_id, shop.user_id]
      );
      totalSynced += shopSynced;
    } catch (err) {
      console.error(`[faire-pull-orders] Error for brand ${shop.shop_id}:`, err.message);
      await db.execute(`
        INSERT INTO faire_sync_logs (user_id, sync_type, operation, status, message)
        VALUES (?, 'orders', 'pull', 'failed', ?)
      `, [shop.user_id, err.message]);
    }
  }

  console.log(`[faire-pull-orders] Done: ${totalSynced} new orders across ${shops.length} brands`);
  process.exit(0);
}

run().catch(err => {
  console.error('[faire-pull-orders] Fatal:', err);
  process.exit(1);
});
