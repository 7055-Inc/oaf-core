#!/usr/bin/env node
/**
 * Walmart Vendor Payouts
 * 
 * Daily cron job to process vendor payouts for Walmart orders.
 * Transfers funds from platform balance to vendor Connect accounts
 * 30 days after order (matching Walmart's payment hold).
 * 
 * Flow:
 * - Jan 1: Walmart order comes in, vendor_transaction created with payout_date = Jan 31
 * - Jan 31: This cron finds eligible transactions, transfers from platform → vendor Connect
 * - Vendor's own payout settings take over from there
 */

const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '../api-service/.env') });

const db = require('../api-service/config/db');
const stripeService = require('../api-service/src/services/stripeService');

// Use stripe instance from stripeService
const stripe = stripeService.stripe;

/**
 * Find eligible Walmart transactions ready for payout
 * - payout_date has passed (for sales)
 * - status is 'pending'
 * - transaction is linked to a Walmart order (via walmart_orders table)
 * - includes return_deduction transactions to offset payouts
 */
async function findEligiblePayouts() {
  const [rows] = await db.query(`
    SELECT 
      vt.id,
      vt.vendor_id,
      vt.order_id,
      vt.amount,
      vt.payout_date,
      vt.transaction_type,
      vs.stripe_account_id,
      up.display_name as vendor_name,
      wo.walmart_purchase_order_id
    FROM vendor_transactions vt
    JOIN vendor_settings vs ON vt.vendor_id = vs.vendor_id
    LEFT JOIN user_profiles up ON vt.vendor_id = up.user_id
    INNER JOIN walmart_orders wo ON vt.order_id = wo.main_order_id
    WHERE vt.status = 'pending'
      AND vt.transaction_type IN ('sale', 'return_deduction')
      AND (
        (vt.transaction_type = 'sale' AND vt.payout_date <= CURDATE())
        OR vt.transaction_type = 'return_deduction'
      )
      AND vs.stripe_account_id IS NOT NULL
      AND vs.stripe_account_verified = 1
    ORDER BY vt.vendor_id, vt.payout_date ASC
    LIMIT 100
  `);
  
  return rows;
}

/**
 * Group transactions by vendor and calculate net payout
 * Applies return deductions against pending sales
 */
function groupPayoutsByVendor(payouts) {
  const vendorGroups = {};
  
  for (const payout of payouts) {
    if (!vendorGroups[payout.vendor_id]) {
      vendorGroups[payout.vendor_id] = {
        vendor_id: payout.vendor_id,
        vendor_name: payout.vendor_name,
        stripe_account_id: payout.stripe_account_id,
        transactions: [],
        totalPayout: 0,
        totalDeductions: 0
      };
    }
    
    vendorGroups[payout.vendor_id].transactions.push(payout);
    
    if (payout.transaction_type === 'sale') {
      vendorGroups[payout.vendor_id].totalPayout += parseFloat(payout.amount);
    } else if (payout.transaction_type === 'return_deduction') {
      // Deductions are stored as negative, so we add them
      vendorGroups[payout.vendor_id].totalDeductions += Math.abs(parseFloat(payout.amount));
    }
  }
  
  // Calculate net for each vendor
  for (const vendorId of Object.keys(vendorGroups)) {
    const group = vendorGroups[vendorId];
    group.netPayout = group.totalPayout - group.totalDeductions;
  }
  
  return vendorGroups;
}

/**
 * Create Stripe transfer from platform to vendor Connect account
 */
async function createVendorTransfer(vendorStripeAccountId, amountDollars, metadata) {
  const amountCents = Math.round(amountDollars * 100);
  
  const transfer = await stripe.transfers.create({
    amount: amountCents,
    currency: 'usd',
    destination: vendorStripeAccountId,
    metadata: {
      source: 'walmart_order',
      ...metadata
    }
  });
  
  return transfer;
}

/**
 * Mark transaction as completed with Stripe transfer ID
 */
async function markTransactionCompleted(transactionId, stripeTransferId) {
  await db.query(
    `UPDATE vendor_transactions 
     SET status = 'completed', 
         stripe_transfer_id = ?
     WHERE id = ?`,
    [stripeTransferId, transactionId]
  );
}

/**
 * Mark transaction as failed
 */
async function markTransactionFailed(transactionId, errorMessage) {
  await db.query(
    `UPDATE vendor_transactions 
     SET status = 'failed'
     WHERE id = ?`,
    [transactionId]
  );
  // Log error for debugging
  console.error(`  Transaction ${transactionId} failed: ${errorMessage}`);
}

/**
 * Main payout processing function
 */
async function processWalmartPayouts() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting Walmart vendor payouts...`);
  
  let processed = 0;
  let totalAmount = 0;
  let errors = 0;
  let deductionsApplied = 0;
  
  try {
    // Find eligible transactions
    console.log('Finding eligible Walmart payouts...');
    const eligiblePayouts = await findEligiblePayouts();
    console.log(`Found ${eligiblePayouts.length} transactions ready for payout`);
    
    if (eligiblePayouts.length === 0) {
      console.log('No payouts to process');
      return { success: true, processed: 0, amount: 0, errors: 0 };
    }
    
    // Group by vendor and calculate net payouts
    const vendorGroups = groupPayoutsByVendor(eligiblePayouts);
    console.log(`Processing ${Object.keys(vendorGroups).length} vendors`);
    
    // Process each vendor
    for (const [vendorId, group] of Object.entries(vendorGroups)) {
      try {
        const vendorName = group.vendor_name || `Vendor #${vendorId}`;
        
        console.log(`\n${vendorName}:`);
        console.log(`  Sales: $${group.totalPayout.toFixed(2)}`);
        console.log(`  Deductions: -$${group.totalDeductions.toFixed(2)}`);
        console.log(`  Net payout: $${group.netPayout.toFixed(2)}`);
        
        // Verify vendor has Stripe Connect account
        if (!group.stripe_account_id) {
          console.warn(`  ⚠ No Stripe Connect account - skipping`);
          continue;
        }
        
        // Only transfer if net is positive
        if (group.netPayout <= 0) {
          console.log(`  ⚠ Net payout is $0 or negative - marking transactions as applied`);
          
          // Mark all transactions as completed (deductions fully applied)
          for (const tx of group.transactions) {
            await markTransactionCompleted(tx.id, `NET_ZERO_${Date.now()}`);
          }
          deductionsApplied += group.totalDeductions;
          continue;
        }
        
        // Create transfer for net amount
        const transfer = await createVendorTransfer(
          group.stripe_account_id,
          group.netPayout,
          {
            vendor_id: vendorId.toString(),
            transaction_count: group.transactions.length.toString(),
            gross_amount: group.totalPayout.toFixed(2),
            deductions: group.totalDeductions.toFixed(2)
          }
        );
        
        // Mark all transactions as completed
        for (const tx of group.transactions) {
          await markTransactionCompleted(tx.id, transfer.id);
        }
        
        processed++;
        totalAmount += group.netPayout;
        deductionsApplied += group.totalDeductions;
        
        console.log(`  ✓ Transfer ${transfer.id} created - $${group.netPayout.toFixed(2)}`);
        
      } catch (error) {
        errors++;
        console.error(`  ✗ Error processing vendor ${vendorId}:`, error.message);
        
        // Mark all transactions as failed for admin review
        for (const tx of group.transactions) {
          await markTransactionFailed(tx.id, error.message);
        }
      }
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n[${new Date().toISOString()}] Walmart payouts complete!`);
    console.log(`  - Vendors processed: ${processed}`);
    console.log(`  - Total transferred: $${totalAmount.toFixed(2)}`);
    console.log(`  - Deductions applied: $${deductionsApplied.toFixed(2)}`);
    console.log(`  - Errors: ${errors}`);
    console.log(`  - Duration: ${duration}s`);
    
    return { 
      success: true, 
      processed, 
      amount: totalAmount, 
      deductionsApplied,
      errors,
      duration 
    };
    
  } catch (error) {
    console.error('Fatal error:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const result = await processWalmartPayouts();
    await db.end();
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('Fatal error:', error.message);
    await db.end();
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { processWalmartPayouts };

