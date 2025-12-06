#!/usr/bin/env node

require('dotenv').config({ path: require('path').resolve(process.cwd(), 'api-service/.env') });
const db = require('../config/db');
const stripeService = require('../src/services/stripeService');

/**
 * @fileoverview Process Pending Vendor Transfers
 * 
 * Hourly cron job to create Stripe transfers for orders that:
 * 1. Are fully shipped (all items have tracking)
 * 2. Have passed the 3-day delay period
 */

const BATCH_SIZE = 50;

async function processPendingVendorTransfers() {
  console.log('[Transfers] Starting pending vendor transfers processing...');
  const startTime = Date.now();
  let successCount = 0;
  let errorCount = 0;
  let totalTransfers = 0;

  try {
    // Find orders eligible for transfer
    const [eligibleOrders] = await db.execute(`
      SELECT 
        o.id, 
        o.stripe_charge_id, 
        o.transfer_status,
        o.transfer_eligible_date
      FROM orders o
      WHERE o.transfer_status = 'pending_transfer'
        AND o.transfer_eligible_date <= NOW()
        AND o.stripe_charge_id IS NOT NULL
      ORDER BY o.transfer_eligible_date ASC
      LIMIT ${BATCH_SIZE}
    `);

    console.log(`[Transfers] Found ${eligibleOrders.length} orders eligible for transfer`);

    if (eligibleOrders.length === 0) {
      console.log('[Transfers] No pending transfers to process');
      return { success: true, processed: 0, transfers: 0, errors: 0 };
    }

    for (const order of eligibleOrders) {
      try {
        console.log(`[Transfers] Processing order ${order.id}...`);

        // Process the transfer
        const transfers = await stripeService.processVendorTransfersWithDelay(
          order.id, 
          order.stripe_charge_id,
          0 // No additional delay - vendor's own payout schedule applies
        );

        // Update order status
        await db.execute(`
          UPDATE orders 
          SET transfer_status = 'transferred',
              transferred_at = NOW()
          WHERE id = ?
        `, [order.id]);

        successCount++;
        totalTransfers += transfers.length;
        
        console.log(`[Transfers] ✅ Order ${order.id}: ${transfers.length} transfer(s) created`);

      } catch (error) {
        errorCount++;
        console.error(`[Transfers] ❌ Error processing order ${order.id}:`, error.message);
        
        // Log error to database for admin review
        await db.execute(`
          UPDATE orders 
          SET transfer_status = 'failed',
              transfer_error = ?
          WHERE id = ?
        `, [error.message.substring(0, 255), order.id]);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Transfers] Completed: ${successCount} orders, ${totalTransfers} transfers, ${errorCount} errors in ${duration}s`);

    return { success: true, processed: successCount, transfers: totalTransfers, errors: errorCount, duration };

  } catch (error) {
    console.error('[Transfers] Fatal error:', error);
    return { success: false, error: error.message };
  }
}

// Run
processPendingVendorTransfers()
  .then(result => {
    console.log('[Transfers] Done:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('[Transfers] Uncaught error:', error);
    process.exit(1);
  });

