#!/usr/bin/env node

/**
 * @fileoverview Process Affiliate Payouts
 * 
 * Daily cron job to process eligible affiliate commissions.
 * 
 * Eligibility criteria:
 * 1. Commission status = 'pending'
 * 2. eligible_date <= today
 * 3. Associated order is shipped (completed)
 * 
 * Payout methods:
 * - Stripe: Transfer to affiliate's connected account
 * - Site Credit: Add to user_credits balance
 * 
 * @schedule Daily at 2:00 AM
 * @author Brakebee Development Team
 */

require('dotenv').config({ path: require('path').resolve(process.cwd(), 'api-service/.env') });
const db = require('../config/db');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const EmailService = require('../src/services/emailService');

const emailService = new EmailService();

const BATCH_SIZE = 100;

async function processAffiliatePayouts() {
  console.log('[Affiliate Payouts] Starting payout processing...');
  const startTime = Date.now();
  
  const stats = {
    eligible: 0,
    processed: 0,
    skipped: 0,
    stripe_payouts: 0,
    credit_payouts: 0,
    errors: 0,
    total_amount: 0
  };

  const connection = await db.getConnection();

  try {
    // Get eligible commissions grouped by affiliate
    // Only process if the order is shipped (completed)
    const [eligibleCommissions] = await db.execute(`
      SELECT 
        ac.id as commission_id,
        ac.affiliate_id,
        ac.order_id,
        ac.order_item_id,
        ac.net_amount,
        ac.status,
        ac.status_reason,
        a.user_id as affiliate_user_id,
        a.payout_method,
        a.stripe_account_id,
        a.pending_balance,
        o.status as order_status,
        o.id as order_id
      FROM affiliate_commissions ac
      JOIN affiliates a ON ac.affiliate_id = a.id
      JOIN orders o ON ac.order_id = o.id
      WHERE ac.status = 'pending'
        AND ac.eligible_date <= CURDATE()
        AND a.status = 'active'
      ORDER BY a.id, ac.eligible_date ASC
      LIMIT ${BATCH_SIZE}
    `);

    stats.eligible = eligibleCommissions.length;
    console.log(`[Affiliate Payouts] Found ${stats.eligible} eligible commission(s)`);

    if (eligibleCommissions.length === 0) {
      console.log('[Affiliate Payouts] No eligible payouts to process');
      return { success: true, ...stats };
    }

    // Group commissions by affiliate for batched payouts
    const affiliateGroups = new Map();
    
    for (const commission of eligibleCommissions) {
      // Check if order is shipped
      if (commission.order_status !== 'shipped') {
        // Update status reason and skip
        await db.execute(`
          UPDATE affiliate_commissions 
          SET status_reason = ?
          WHERE id = ?
        `, [
          `Payout delayed - Order status: ${commission.order_status}`,
          commission.commission_id
        ]);
        stats.skipped++;
        continue;
      }

      // Check for cancelled/refunded orders
      if (['cancelled', 'refunded'].includes(commission.order_status)) {
        await connection.beginTransaction();
        try {
          await connection.execute(`
            UPDATE affiliate_commissions 
            SET status = 'cancelled',
                status_reason = 'Order was ${commission.order_status}',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [commission.commission_id]);

          // Reduce affiliate balances
          await connection.execute(`
            UPDATE affiliates 
            SET pending_balance = pending_balance - ?,
                total_earnings = total_earnings - ?
            WHERE id = ?
          `, [commission.net_amount, commission.net_amount, commission.affiliate_id]);

          await connection.commit();
          stats.skipped++;
          continue;
        } catch (err) {
          await connection.rollback();
          throw err;
        }
      }

      // Group by affiliate
      if (!affiliateGroups.has(commission.affiliate_id)) {
        affiliateGroups.set(commission.affiliate_id, {
          affiliate_id: commission.affiliate_id,
          user_id: commission.affiliate_user_id,
          payout_method: commission.payout_method,
          stripe_account_id: commission.stripe_account_id,
          commissions: []
        });
      }
      affiliateGroups.get(commission.affiliate_id).commissions.push(commission);
    }

    // Process each affiliate's payouts
    for (const [affiliateId, group] of affiliateGroups) {
      const totalAmount = group.commissions.reduce((sum, c) => sum + parseFloat(c.net_amount), 0);
      
      if (totalAmount <= 0) continue;

      console.log(`[Affiliate Payouts] Processing affiliate ${affiliateId}: $${totalAmount.toFixed(2)} (${group.commissions.length} commission(s))`);

      try {
        await connection.beginTransaction();

        let payoutId;

        if (group.payout_method === 'stripe') {
          // Process Stripe payout
          payoutId = await processStripePayout(connection, group, totalAmount);
          stats.stripe_payouts++;
        } else {
          // Process site credit payout
          payoutId = await processSiteCreditPayout(connection, group, totalAmount);
          stats.credit_payouts++;
        }

        // Update commissions as paid
        const commissionIds = group.commissions.map(c => c.commission_id);
        await connection.execute(`
          UPDATE affiliate_commissions 
          SET status = 'paid',
              paid_date = CURDATE(),
              payout_id = ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id IN (${commissionIds.map(() => '?').join(',')})
        `, [payoutId, ...commissionIds]);

        // Update affiliate balances
        await connection.execute(`
          UPDATE affiliates 
          SET pending_balance = pending_balance - ?,
              paid_balance = paid_balance + ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [totalAmount, totalAmount, affiliateId]);

        await connection.commit();

        stats.processed += group.commissions.length;
        stats.total_amount += totalAmount;

        // Send payout notification (outside transaction)
        await sendPayoutNotification(group, totalAmount, payoutId);

        console.log(`[Affiliate Payouts] ✅ Affiliate ${affiliateId}: Paid $${totalAmount.toFixed(2)} via ${group.payout_method}`);

      } catch (error) {
        await connection.rollback();
        stats.errors++;
        console.error(`[Affiliate Payouts] ❌ Error processing affiliate ${affiliateId}:`, error.message);

        // Mark commissions with error
        for (const commission of group.commissions) {
          await db.execute(`
            UPDATE affiliate_commissions 
            SET status_reason = ?
            WHERE id = ?
          `, [`Payout error: ${error.message.substring(0, 200)}`, commission.commission_id]);
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Affiliate Payouts] Completed in ${duration}s:`, stats);

    return { success: true, ...stats, duration };

  } catch (error) {
    console.error('[Affiliate Payouts] Fatal error:', error);
    return { success: false, error: error.message, ...stats };
  } finally {
    connection.release();
  }
}

/**
 * Process Stripe transfer payout for an affiliate
 */
async function processStripePayout(connection, group, totalAmount) {
  const { affiliate_id, stripe_account_id, commissions } = group;

  if (!stripe_account_id) {
    throw new Error('No Stripe account connected');
  }

  // Create payout record
  const [payoutResult] = await connection.execute(`
    INSERT INTO affiliate_payouts (
      affiliate_id, total_amount, commission_count, 
      payout_method, status, scheduled_for
    ) VALUES (?, ?, ?, 'stripe', 'processing', NOW())
  `, [affiliate_id, totalAmount, commissions.length]);

  const payoutId = payoutResult.insertId;

  try {
    // Create Stripe transfer
    const transfer = await stripe.transfers.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'usd',
      destination: stripe_account_id,
      description: `Affiliate commission payout - ${commissions.length} commission(s)`,
      metadata: {
        affiliate_id: affiliate_id.toString(),
        payout_id: payoutId.toString(),
        commission_count: commissions.length.toString()
      }
    });

    // Update payout record with transfer ID
    await connection.execute(`
      UPDATE affiliate_payouts 
      SET stripe_transfer_id = ?,
          status = 'completed',
          processed_at = NOW()
      WHERE id = ?
    `, [transfer.id, payoutId]);

    return payoutId;

  } catch (stripeError) {
    // Update payout as failed
    await connection.execute(`
      UPDATE affiliate_payouts 
      SET status = 'failed',
          failure_reason = ?,
          processed_at = NOW()
      WHERE id = ?
    `, [stripeError.message, payoutId]);

    throw stripeError;
  }
}

/**
 * Process site credit payout for a community affiliate
 */
async function processSiteCreditPayout(connection, group, totalAmount) {
  const { affiliate_id, user_id, commissions } = group;

  // Create payout record
  const [payoutResult] = await connection.execute(`
    INSERT INTO affiliate_payouts (
      affiliate_id, total_amount, commission_count, 
      payout_method, status, scheduled_for
    ) VALUES (?, ?, ?, 'site_credit', 'processing', NOW())
  `, [affiliate_id, totalAmount, commissions.length]);

  const payoutId = payoutResult.insertId;

  try {
    // Ensure user_credits record exists
    await connection.execute(`
      INSERT INTO user_credits (user_id, balance, lifetime_earned)
      VALUES (?, 0, 0)
      ON DUPLICATE KEY UPDATE user_id = user_id
    `, [user_id]);

    // Update credit balance
    await connection.execute(`
      UPDATE user_credits 
      SET balance = balance + ?,
          lifetime_earned = lifetime_earned + ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `, [totalAmount, totalAmount, user_id]);

    // Get new balance for transaction record
    const [balanceRow] = await connection.execute(
      'SELECT balance FROM user_credits WHERE user_id = ?',
      [user_id]
    );
    const newBalance = balanceRow[0]?.balance || totalAmount;

    // Create credit transaction record
    const [creditTxResult] = await connection.execute(`
      INSERT INTO user_credit_transactions (
        user_id, amount, balance_after, transaction_type,
        reference_type, reference_id, description
      ) VALUES (?, ?, ?, 'affiliate_commission', 'affiliate_payouts', ?, ?)
    `, [
      user_id,
      totalAmount,
      newBalance,
      payoutId,
      `Affiliate commission payout - ${commissions.length} commission(s)`
    ]);

    // Update payout record
    await connection.execute(`
      UPDATE affiliate_payouts 
      SET site_credit_transaction_id = ?,
          status = 'completed',
          processed_at = NOW()
      WHERE id = ?
    `, [creditTxResult.insertId, payoutId]);

    return payoutId;

  } catch (error) {
    // Update payout as failed
    await connection.execute(`
      UPDATE affiliate_payouts 
      SET status = 'failed',
          failure_reason = ?,
          processed_at = NOW()
      WHERE id = ?
    `, [error.message, payoutId]);

    throw error;
  }
}

/**
 * Send payout notification email
 */
async function sendPayoutNotification(group, totalAmount, payoutId) {
  try {
    // Get user info
    const [userRows] = await db.execute(`
      SELECT 
        u.id,
        up.first_name
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ?
    `, [group.user_id]);

    if (userRows.length === 0) return;

    const user = userRows[0];

    // Get new balance for site credit users
    let newBalance = null;
    if (group.payout_method === 'site_credit') {
      const [balanceRows] = await db.execute(
        'SELECT balance FROM user_credits WHERE user_id = ?',
        [group.user_id]
      );
      newBalance = balanceRows[0]?.balance;
    }

    await emailService.queueEmail(user.id, 'affiliate_payout_processed', {
      first_name: user.first_name || 'Affiliate',
      payout_amount: totalAmount.toFixed(2),
      commission_count: group.commissions.length,
      payout_method: group.payout_method === 'stripe' ? 'Stripe Transfer' : 'Site Credit',
      new_balance: newBalance ? newBalance.toFixed(2) : null,
      stripe_message: group.payout_method === 'stripe' ? 'Funds will arrive in 2-3 business days.' : null,
      credit_message: group.payout_method === 'site_credit' ? `Your site credit balance is now $${newBalance?.toFixed(2)}. Use it on your next purchase!` : null,
      dashboard_link: `${process.env.FRONTEND_URL || 'https://brakebee.com'}/dashboard?section=affiliates`
    }, {
      priority: 2
    });

  } catch (error) {
    console.error('[Affiliate Payouts] Failed to send notification:', error);
    // Don't throw - notification is secondary
  }
}

// Run
processAffiliatePayouts()
  .then(result => {
    console.log('[Affiliate Payouts] Done:', result);
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('[Affiliate Payouts] Uncaught error:', error);
    process.exit(1);
  });
