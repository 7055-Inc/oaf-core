#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(process.cwd(), 'api-service/.env') });
const db = require('../config/db');
const wayfairApiService = require('../src/services/wayfairService');
const fs = require('fs').promises;
const path = require('path');

/**
 * @fileoverview Wayfair Registration Retry (Corporate Model)
 *
 * Cron job to retry failed Wayfair shipping registrations.
 * Runs every 5 minutes. Handles the ~8% label generation failure rate.
 *
 * Flow:
 * 1. Find orders with registration_status = 'failed' and attempts < 5
 * 2. Apply exponential backoff based on attempt count
 * 3. Before retrying, check labelGenerationEvents to see if Wayfair
 *    actually processed a previous request (handles timeout-but-succeeded)
 * 4. If labels already exist, download and store them
 * 5. If not, re-register with Wayfair
 * 6. After 5 failures, mark as 'error' for admin review
 */

const BACKOFF_MINUTES = [0, 5, 15, 30, 60];

async function retryFailedRegistrations() {
  console.log('[Wayfair Retry] Starting registration retry...');
  const startTime = Date.now();
  let retried = 0;
  let recovered = 0;
  let stillFailing = 0;

  try {
    const [failedOrders] = await db.query(`
      SELECT id, wayfair_po_number, registration_attempts,
        TIMESTAMPDIFF(MINUTE, last_registration_attempt_at, NOW()) as minutes_since_attempt,
        main_order_id
      FROM wayfair_orders
      WHERE registration_status = 'failed'
        AND registration_attempts < 5
      ORDER BY last_registration_attempt_at ASC
      LIMIT 20
    `);

    console.log(`[Wayfair Retry] Found ${failedOrders.length} failed registrations`);

    for (const order of failedOrders) {
      const attempt = order.registration_attempts || 0;
      const backoffMin = BACKOFF_MINUTES[Math.min(attempt, BACKOFF_MINUTES.length - 1)];

      if (order.minutes_since_attempt != null && order.minutes_since_attempt < backoffMin) {
        console.log(`[Wayfair Retry] PO ${order.wayfair_po_number}: waiting (${backoffMin - order.minutes_since_attempt}min remaining)`);
        continue;
      }

      console.log(`[Wayfair Retry] PO ${order.wayfair_po_number}: attempt ${attempt + 1}`);

      try {
        const poNumeric = order.wayfair_po_number.replace(/^[A-Za-z]+/, '');
        const events = await wayfairApiService.getLabelGenerationEvents(
          [{ field: 'poNumber', equals: poNumeric }], 1
        );

        if (events.length > 0) {
          console.log(`[Wayfair Retry] PO ${order.wayfair_po_number}: found existing label event, recovering`);
          const event = events[0];
          const label = event.generatedShippingLabels?.[0] || {};
          const labelUrl = event.consolidatedShippingLabel?.url || null;

          let localLabelPath = null;
          if (labelUrl) {
            try {
              const pdfBuffer = await wayfairApiService.downloadDocument(labelUrl);
              const labelsDir = path.join(__dirname, '../labels');
              await fs.mkdir(labelsDir, { recursive: true });

              const [items] = await db.query(
                'SELECT vendor_id FROM wayfair_order_items WHERE order_id = ? LIMIT 1',
                [order.id]
              );
              const vendorId = items[0]?.vendor_id || 0;
              const fileName = `user_${vendorId}_order_${order.main_order_id || order.id}_${Date.now()}.pdf`;
              await fs.writeFile(path.join(labelsDir, fileName), pdfBuffer);
              localLabelPath = `/labels/${fileName}`;

              if (order.main_order_id) {
                const [mainItems] = await db.query(
                  'SELECT id FROM order_items WHERE order_id = ? LIMIT 1', [order.main_order_id]
                );
                const mainItemId = mainItems[0]?.id || null;

                await db.query(`
                  INSERT INTO shipping_labels
                    (order_id, order_item_id, vendor_id, package_sequence, carrier,
                     service_code, service_name, tracking_number, label_file_path,
                     label_format, cost, currency, status)
                  VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, 'pdf', 0, 'USD', 'purchased')
                `, [
                  order.main_order_id, mainItemId, vendorId,
                  label.carrierCode || 'wayfair',
                  label.carrierCode || 'WAYFAIR',
                  label.carrier || 'Wayfair Prepaid',
                  label.trackingNumber || null,
                  localLabelPath
                ]);

                if (mainItemId && label.trackingNumber) {
                  await db.query(`
                    INSERT INTO order_item_tracking
                      (order_item_id, carrier, tracking_number, tracking_method)
                    VALUES (?, ?, ?, 'marketplace_label')
                    ON DUPLICATE KEY UPDATE
                      carrier = VALUES(carrier),
                      tracking_number = VALUES(tracking_number),
                      tracking_method = 'marketplace_label'
                  `, [mainItemId, label.carrierCode || 'wayfair', label.trackingNumber]);
                }
              }
            } catch (dlErr) {
              console.error(`[Wayfair Retry] Label download failed:`, dlErr.message);
            }
          }

          await db.query(`
            UPDATE wayfair_orders SET
              registration_status = 'registered', registered_at = NOW(),
              label_event_id = ?, wayfair_carrier = ?, wayfair_carrier_code = ?,
              wayfair_tracking_number = ?, shipping_label_url = ?,
              packing_slip_url = ?, bol_url = ?, last_registration_error = NULL
            WHERE id = ?
          `, [
            event.id, label.carrier || null, label.carrierCode || null,
            label.trackingNumber || null, labelUrl,
            event.purchaseOrder?.packingSlipUrl || null,
            event.billOfLading?.url || null, order.id
          ]);

          recovered++;
          continue;
        }

        const pickupDate = new Date();
        pickupDate.setDate(pickupDate.getDate() + 1);
        const pickupStr = pickupDate.toISOString().replace('T', ' ').replace('Z', '0 +00:00');

        const [units] = await db.query(
          'SELECT * FROM wayfair_shipping_units WHERE wayfair_order_id = ? ORDER BY group_identifier, sequence_identifier',
          [order.id]
        );

        const wayfairUnits = units.map(u => ({
          partNumber: u.part_number,
          unitType: u.unit_type,
          weight: { value: parseFloat(u.weight_value), unit: u.weight_unit },
          dimensions: {
            length: { value: parseFloat(u.length_value), unit: u.dimension_unit },
            width: { value: parseFloat(u.width_value), unit: u.dimension_unit },
            height: { value: parseFloat(u.height_value), unit: u.dimension_unit }
          },
          groupIdentifier: u.group_identifier,
          sequenceIdentifier: u.sequence_identifier
        }));

        const event = await wayfairApiService.registerOrder(
          order.wayfair_po_number,
          null,
          pickupStr,
          wayfairUnits.length > 0 ? wayfairUnits : undefined
        );

        const label = event.generatedShippingLabels?.[0] || {};

        await db.query(`
          UPDATE wayfair_orders SET
            registration_status = 'registered', registered_at = NOW(),
            label_event_id = ?, wayfair_carrier = ?, wayfair_carrier_code = ?,
            wayfair_tracking_number = ?,
            shipping_label_url = ?, packing_slip_url = ?, bol_url = ?,
            last_registration_error = NULL
          WHERE id = ?
        `, [
          event.id, label.carrier || null, label.carrierCode || null,
          label.trackingNumber || null,
          event.consolidatedShippingLabel?.url || null,
          event.purchaseOrder?.packingSlipUrl || null,
          event.billOfLading?.url || null, order.id
        ]);

        retried++;
        console.log(`[Wayfair Retry] PO ${order.wayfair_po_number}: registration succeeded`);

      } catch (err) {
        const newAttempts = attempt + 1;
        const newStatus = newAttempts >= 5 ? 'error' : 'failed';

        await db.query(`
          UPDATE wayfair_orders SET
            registration_status = ?, registration_attempts = ?,
            last_registration_error = ?, last_registration_attempt_at = NOW()
          WHERE id = ?
        `, [newStatus, newAttempts, err.message?.substring(0, 1000), order.id]);

        stillFailing++;
        console.error(`[Wayfair Retry] PO ${order.wayfair_po_number}: attempt ${newAttempts} failed: ${err.message}`);
      }
    }

    await db.query(`
      INSERT INTO wayfair_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (NULL, 'shipment', 'retry', 'success', ?)
    `, [`Retry complete: ${retried} succeeded, ${recovered} recovered, ${stillFailing} still failing`]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Wayfair Retry] Done: ${retried} retried, ${recovered} recovered, ${stillFailing} still failing in ${duration}s`);

    return { success: true, retried, recovered, stillFailing, duration };

  } catch (error) {
    console.error('[Wayfair Retry] Fatal error:', error);
    return { success: false, error: error.message };
  }
}

retryFailedRegistrations()
  .then(result => {
    console.log('[Wayfair Retry] Result:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('[Wayfair Retry] Uncaught error:', error);
    process.exit(1);
  });
