#!/usr/bin/env node
/**
 * Etsy Order Pull Cron
 * Pulls recent receipts (orders) from connected Etsy shops into etsy_orders / etsy_order_items.
 *
 * Schedule: every 30 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const etsyApiService = require('../src/services/etsyService');

async function run() {
  console.log('[etsy-pull-orders] Starting order pull…');

  const [shops] = await db.execute(
    'SELECT user_id, shop_id, access_token FROM etsy_user_shops WHERE is_active = 1'
  );

  console.log(`[etsy-pull-orders] Found ${shops.length} active shops`);
  let totalSynced = 0;

  for (const shop of shops) {
    try {
      const accessToken = await etsyApiService.getShopAccessToken(shop.shop_id, shop.user_id);

      const receiptsData = await etsyApiService.getShopReceipts(shop.shop_id, accessToken, {
        limit: 100,
        was_paid: true
      });

      const receipts = receiptsData.results || [];
      let shopSynced = 0;

      for (const receipt of receipts) {
        const receiptId = String(receipt.receipt_id);
        const [existing] = await db.execute(
          'SELECT id FROM etsy_orders WHERE etsy_receipt_id = ?',
          [receiptId]
        );

        if (existing.length === 0) {
          let orderStatus = 'pending';
          if (receipt.was_shipped) orderStatus = 'shipped';
          else if (receipt.was_paid) orderStatus = 'paid';

          await db.execute(`
            INSERT INTO etsy_orders
              (user_id, shop_id, etsy_receipt_id, buyer_user_id, buyer_email,
               ship_name, ship_address_1, ship_address_2, ship_city, ship_state, ship_zip, ship_country,
               order_status, payment_status, subtotal, shipping_cost, tax, total, order_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            shop.user_id, shop.shop_id, receiptId,
            receipt.buyer_user_id ? String(receipt.buyer_user_id) : null,
            receipt.buyer_email || null,
            receipt.name || null,
            receipt.first_line || null,
            receipt.second_line || null,
            receipt.city || null,
            receipt.state || null,
            receipt.zip || null,
            receipt.country_iso || 'US',
            orderStatus,
            receipt.was_paid ? 'paid' : 'unpaid',
            parseFloat(receipt.subtotal?.amount || 0) / 100,
            parseFloat(receipt.shipping_cost?.amount || 0) / 100,
            parseFloat(receipt.tax_cost?.amount || 0) / 100,
            parseFloat(receipt.grandtotal?.amount || 0) / 100,
            receipt.create_timestamp ? new Date(receipt.create_timestamp * 1000) : new Date()
          ]);

          const [inserted] = await db.execute(
            'SELECT id FROM etsy_orders WHERE etsy_receipt_id = ? LIMIT 1',
            [receiptId]
          );

          if (inserted.length > 0) {
            const transactions = receipt.transactions || [];
            for (const txn of transactions) {
              const listingId = txn.listing_id ? String(txn.listing_id) : null;
              let productId = null;
              let vendorId = shop.user_id;

              if (listingId) {
                const [matched] = await db.execute(
                  'SELECT product_id, user_id FROM etsy_product_data WHERE etsy_listing_id = ? LIMIT 1',
                  [listingId]
                );
                if (matched.length > 0) {
                  productId = matched[0].product_id;
                  vendorId = matched[0].user_id;
                }
              }

              await db.execute(`
                INSERT INTO etsy_order_items
                  (order_id, product_id, vendor_id, etsy_transaction_id, etsy_listing_id, product_name,
                   quantity, unit_price, total_price)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                inserted[0].id,
                productId,
                vendorId,
                txn.transaction_id ? String(txn.transaction_id) : null,
                listingId,
                txn.title || 'Unknown',
                txn.quantity || 1,
                parseFloat(txn.price?.amount || 0) / 100,
                (parseFloat(txn.price?.amount || 0) / 100) * (txn.quantity || 1)
              ]);
            }
          }
          shopSynced++;
        } else {
          let orderStatus = 'pending';
          if (receipt.was_shipped) orderStatus = 'shipped';
          else if (receipt.was_paid) orderStatus = 'paid';

          await db.execute(
            'UPDATE etsy_orders SET order_status = ?, updated_at = CURRENT_TIMESTAMP WHERE etsy_receipt_id = ?',
            [orderStatus, receiptId]
          );
        }
      }

      if (shopSynced > 0) {
        await db.execute(`
          INSERT INTO etsy_sync_logs (user_id, shop_id, sync_type, operation, status, message)
          VALUES (?, ?, 'order', 'pull', 'success', ?)
        `, [shop.user_id, shop.shop_id, `Cron: pulled ${shopSynced} new orders`]);
      }

      await db.execute(
        'UPDATE etsy_user_shops SET last_orders_sync_at = NOW(), last_sync_at = NOW() WHERE shop_id = ? AND user_id = ?',
        [shop.shop_id, shop.user_id]
      );

      totalSynced += shopSynced;
    } catch (err) {
      console.error(`[etsy-pull-orders] Error for shop ${shop.shop_id}:`, err.message);
      await db.execute(`
        INSERT INTO etsy_sync_logs (user_id, shop_id, sync_type, operation, status, message)
        VALUES (?, ?, 'order', 'pull', 'failed', ?)
      `, [shop.user_id, shop.shop_id, err.message]);
    }
  }

  console.log(`[etsy-pull-orders] Done: ${totalSynced} new orders across ${shops.length} shops`);
  process.exit(0);
}

run().catch(err => {
  console.error('[etsy-pull-orders] Fatal:', err);
  process.exit(1);
});
