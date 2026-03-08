#!/usr/bin/env node
/**
 * Amazon Tracking Sync Cron
 * Pushes tracking/fulfillment data for shipped order items to Amazon.
 * Uses the Feeds API with POST_ORDER_FULFILLMENT_DATA feed type.
 *
 * Schedule: every 30 minutes (when activated)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../config/db');
const amazonApiService = require('../src/services/amazonService');
const axios = require('axios');

async function run() {
  console.log('[amazon-sync-tracking] Starting tracking sync…');

  const [items] = await db.execute(`
    SELECT
      aoi.id as item_id, aoi.tracking_number, aoi.tracking_carrier,
      aoi.amazon_order_item_id,
      ao.amazon_order_id as ext_order_id, ao.user_id, ao.shop_id
    FROM amazon_order_items aoi
    JOIN amazon_orders ao ON aoi.amazon_order_id = ao.id
    JOIN amazon_user_shops aus ON ao.user_id = aus.user_id AND ao.shop_id = aus.shop_id AND aus.is_active = 1
    WHERE aoi.tracking_number IS NOT NULL
      AND aoi.tracking_number != ''
      AND aoi.tracking_synced_at IS NULL
      AND aoi.status IN ('shipped', 'processing')
  `);

  console.log(`[amazon-sync-tracking] Found ${items.length} items with unsynced tracking`);
  let synced = 0;
  let failed = 0;

  for (const item of items) {
    try {
      const accessToken = await amazonApiService.getShopAccessToken(item.shop_id, item.user_id);

      const [shopInfo] = await db.execute(
        'SELECT selling_partner_id, shop_id FROM amazon_user_shops WHERE user_id = ? AND shop_id = ? LIMIT 1',
        [item.user_id, item.shop_id]
      );
      const merchantId = shopInfo[0]?.selling_partner_id || shopInfo[0]?.shop_id || item.shop_id;

      const feedXml = `<?xml version="1.0" encoding="UTF-8"?>
<AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="amzn-envelope.xsd">
  <Header><DocumentVersion>1.01</DocumentVersion><MerchantIdentifier>${merchantId}</MerchantIdentifier></Header>
  <MessageType>OrderFulfillment</MessageType>
  <Message>
    <MessageID>1</MessageID>
    <OrderFulfillment>
      <AmazonOrderID>${item.ext_order_id}</AmazonOrderID>
      <FulfillmentDate>${new Date().toISOString()}</FulfillmentDate>
      <FulfillmentData>
        <CarrierName>${item.tracking_carrier || 'Other'}</CarrierName>
        <ShipperTrackingNumber>${item.tracking_number}</ShipperTrackingNumber>
      </FulfillmentData>
      <Item>
        <AmazonOrderItemCode>${item.amazon_order_item_id}</AmazonOrderItemCode>
      </Item>
    </OrderFulfillment>
  </Message>
</AmazonEnvelope>`;

      const docResult = await amazonApiService.createFeedDocument(accessToken, 'text/xml; charset=UTF-8');
      if (docResult.payload?.url) {
        await axios.put(docResult.payload.url, feedXml, {
          headers: { 'Content-Type': 'text/xml; charset=UTF-8' }
        });
        await amazonApiService.createFeed(accessToken, 'POST_ORDER_FULFILLMENT_DATA', docResult.payload.feedDocumentId);
      }

      await db.execute(
        'UPDATE amazon_order_items SET tracking_synced_at = NOW(), status = ? WHERE id = ?',
        ['shipped', item.item_id]
      );

      await db.execute(`
        INSERT INTO amazon_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'orders', 'tracking', ?, 'success', ?)
      `, [item.user_id, item.item_id, `Cron: tracking ${item.tracking_number} pushed`]);
      synced++;
    } catch (err) {
      console.error(`[amazon-sync-tracking] Error for item ${item.item_id}:`, err.message);
      await db.execute(`
        INSERT INTO amazon_sync_logs (user_id, sync_type, operation, reference_id, status, message)
        VALUES (?, 'orders', 'tracking', ?, 'failed', ?)
      `, [item.user_id, item.item_id, err.message]);
      failed++;
    }
  }

  console.log(`[amazon-sync-tracking] Done: ${synced} synced, ${failed} failed`);
  process.exit(0);
}

run().catch(err => {
  console.error('[amazon-sync-tracking] Fatal:', err);
  process.exit(1);
});
