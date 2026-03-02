#!/usr/bin/env node
/**
 * eBay Order Pull Cron
 * Pulls recent orders from connected eBay accounts.
 * Schedule: every 30 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const ebayApiService = require('../src/services/ebayService');

async function run() {
  console.log('[ebay-pull-orders] Starting…');
  const [shops] = await db.execute('SELECT user_id, shop_id FROM ebay_user_shops WHERE is_active = 1');
  console.log(`[ebay-pull-orders] ${shops.length} active accounts`);
  let total = 0;

  for (const shop of shops) {
    try {
      const accessToken = await ebayApiService.getShopAccessToken(shop.shop_id, shop.user_id);
      const ordersData = await ebayApiService.getOrders(accessToken, { limit: 50 });
      const orders = ordersData.orders || [];
      let shopSynced = 0;

      for (const order of orders) {
        const eid = order.orderId;
        const [ex] = await db.execute('SELECT id FROM ebay_orders WHERE ebay_order_id = ?', [eid]);
        if (ex.length === 0) {
          const s = order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo || {};
          await db.execute(`
            INSERT INTO ebay_orders (user_id, shop_id, ebay_order_id, order_status, customer_name,
              shipping_address1, shipping_city, shipping_state, shipping_zip, shipping_country,
              total_amount, currency, order_data, ebay_created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            shop.user_id, shop.shop_id, eid,
            order.orderFulfillmentStatus || 'NOT_STARTED',
            s.fullName || null,
            s.contactAddress?.addressLine1 || null, s.contactAddress?.city || null,
            s.contactAddress?.stateOrProvince || null, s.contactAddress?.postalCode || null,
            s.contactAddress?.countryCode || 'US',
            parseFloat(order.pricingSummary?.total?.value) || 0,
            order.pricingSummary?.total?.currency || 'USD',
            JSON.stringify(order), order.creationDate || null
          ]);
          for (const item of (order.lineItems || [])) {
            const [ins] = await db.execute('SELECT id FROM ebay_orders WHERE ebay_order_id = ? LIMIT 1', [eid]);
            if (ins.length > 0) {
              await db.execute(`INSERT INTO ebay_order_items (ebay_order_id, ebay_line_item_id, sku, product_name, quantity, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [ins[0].id, item.lineItemId, item.sku || '', item.title, item.quantity, parseFloat(item.lineItemCost?.value) || 0, parseFloat(item.total?.value) || 0]);
            }
          }
          shopSynced++;
        } else {
          await db.execute(`UPDATE ebay_orders SET order_status = ?, order_data = ?, updated_at = CURRENT_TIMESTAMP WHERE ebay_order_id = ?`,
            [order.orderFulfillmentStatus || 'NOT_STARTED', JSON.stringify(order), eid]);
        }
      }

      if (shopSynced > 0) {
        await db.execute(`INSERT INTO ebay_sync_logs (user_id, sync_type, operation, status, message) VALUES (?, 'orders', 'pull', 'success', ?)`, [shop.user_id, `Cron: ${shopSynced} new orders`]);
      }
      await db.execute(`UPDATE ebay_user_shops SET last_sync_at = NOW() WHERE shop_id = ? AND user_id = ?`, [shop.shop_id, shop.user_id]);
      total += shopSynced;
    } catch (err) {
      console.error(`[ebay-pull-orders] Error ${shop.shop_id}:`, err.message);
      await db.execute(`INSERT INTO ebay_sync_logs (user_id, sync_type, operation, status, message) VALUES (?, 'orders', 'pull', 'error', ?)`, [shop.user_id, err.message]);
    }
  }

  console.log(`[ebay-pull-orders] Done: ${total} new orders`);
  process.exit(0);
}

run().catch(err => { console.error('[ebay-pull-orders] Fatal:', err); process.exit(1); });
