/**
 * Affiliate Commission Service
 * 
 * Handles affiliate commission recording, calculation, and balance management.
 * Called by Stripe webhook after successful payment to create commission records.
 * 
 * @author Brakebee Development Team
 * @version 1.0.0
 */

const db = require('../../config/db');
const EmailService = require('./emailService');

const emailService = new EmailService();

/**
 * Record affiliate commissions for an order
 * Called after payment_intent.succeeded webhook for e-commerce orders
 * 
 * @param {number} orderId - The order ID to process
 * @param {string} paymentIntentId - Stripe payment intent ID
 * @returns {Promise<Object>} Summary of commissions recorded
 */
async function recordAffiliateCommissions(orderId, paymentIntentId) {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get order items with affiliate attribution
    const [orderItems] = await connection.execute(`
      SELECT 
        oi.id as order_item_id,
        oi.product_id,
        oi.vendor_id,
        oi.price as order_item_amount,
        oi.commission_rate,
        oi.commission_amount as platform_commission,
        oi.affiliate_id,
        oi.affiliate_source,
        a.id as affiliate_account_id,
        a.commission_rate as affiliate_rate,
        a.user_id as affiliate_user_id,
        a.payout_method
      FROM order_items oi
      LEFT JOIN affiliates a ON oi.affiliate_id = a.id
      WHERE oi.order_id = ?
        AND oi.affiliate_id IS NOT NULL
        AND a.status = 'active'
    `, [orderId]);
    
    if (orderItems.length === 0) {
      await connection.commit();
      return { 
        success: true, 
        commissions_created: 0, 
        message: 'No affiliate-attributed items in order' 
      };
    }
    
    // Get global settings for payout delay
    const [settingsRows] = await connection.execute(
      'SELECT payout_delay_days FROM affiliate_settings WHERE id = 1'
    );
    const payoutDelayDays = settingsRows[0]?.payout_delay_days || 30;
    
    // Calculate eligible date (order date + delay)
    const eligibleDate = new Date();
    eligibleDate.setDate(eligibleDate.getDate() + payoutDelayDays);
    const eligibleDateStr = eligibleDate.toISOString().split('T')[0];
    
    const commissionsCreated = [];
    
    for (const item of orderItems) {
      // Calculate affiliate commission: (platform_commission × affiliate_rate / 100)
      const platformCommission = parseFloat(item.platform_commission) || 0;
      const affiliateRate = parseFloat(item.affiliate_rate) || 20.00;
      const grossAmount = (platformCommission * affiliateRate) / 100;
      const netAmount = grossAmount; // No deductions for now
      
      if (grossAmount <= 0) {
        continue; // Skip if no commission earned
      }
      
      // Create commission record
      const [result] = await connection.execute(`
        INSERT INTO affiliate_commissions (
          affiliate_id,
          order_id,
          order_item_id,
          order_item_amount,
          platform_commission,
          affiliate_rate,
          gross_amount,
          net_amount,
          status,
          eligible_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
      `, [
        item.affiliate_account_id,
        orderId,
        item.order_item_id,
        item.order_item_amount,
        platformCommission,
        affiliateRate,
        grossAmount,
        netAmount,
        eligibleDateStr
      ]);
      
      // Update affiliate balances
      await connection.execute(`
        UPDATE affiliates 
        SET 
          pending_balance = pending_balance + ?,
          total_earnings = total_earnings + ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [netAmount, netAmount, item.affiliate_account_id]);
      
      commissionsCreated.push({
        commission_id: result.insertId,
        affiliate_id: item.affiliate_account_id,
        affiliate_user_id: item.affiliate_user_id,
        order_item_id: item.order_item_id,
        amount: netAmount,
        eligible_date: eligibleDateStr
      });
    }
    
    // Mark referral as converted (if exists)
    await connection.execute(`
      UPDATE affiliate_referrals 
      SET converted = TRUE 
      WHERE affiliate_id IN (
        SELECT DISTINCT affiliate_id FROM order_items WHERE order_id = ? AND affiliate_id IS NOT NULL
      )
      AND converted = FALSE
      ORDER BY created_at DESC
      LIMIT 1
    `, [orderId]);
    
    await connection.commit();
    
    // Send email notifications (outside transaction)
    for (const commission of commissionsCreated) {
      await sendCommissionNotification(commission, orderId);
    }
    
    return {
      success: true,
      commissions_created: commissionsCreated.length,
      total_commission: commissionsCreated.reduce((sum, c) => sum + c.amount, 0),
      commissions: commissionsCreated
    };
    
  } catch (error) {
    await connection.rollback();
    console.error('Error recording affiliate commissions:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Send email notification for commission earned
 * 
 * @param {Object} commission - Commission details
 * @param {number} orderId - Order ID
 */
async function sendCommissionNotification(commission, orderId) {
  try {
    // Get affiliate user info for email
    const [userRows] = await db.execute(`
      SELECT 
        u.id,
        u.username as email,
        up.first_name
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ?
    `, [commission.affiliate_user_id]);
    
    if (userRows.length === 0) return;
    
    const user = userRows[0];
    
    // Get order date
    const [orderRows] = await db.execute(
      'SELECT created_at FROM orders WHERE id = ?',
      [orderId]
    );
    
    const orderDate = orderRows[0]?.created_at 
      ? new Date(orderRows[0].created_at).toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })
      : 'Today';
    
    // Queue the email
    await emailService.queueEmail(user.id, 'affiliate_commission_earned', {
      first_name: user.first_name || 'Affiliate',
      commission_amount: commission.amount.toFixed(2),
      order_date: orderDate,
      affiliate_rate: '20', // Could be dynamic based on commission record
      eligible_date: new Date(commission.eligible_date).toLocaleDateString('en-US', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }),
      dashboard_link: `${process.env.FRONTEND_URL || 'https://brakebee.com'}/dashboard?section=affiliates`
    }, {
      priority: 2 // High priority for transactional emails
    });
    
  } catch (error) {
    // Don't throw - email is secondary to commission recording
    console.error('Failed to send affiliate commission notification:', error);
  }
}

/**
 * Handle order refund - cancel or clawback affiliate commissions
 * Called when an order is refunded
 * 
 * @param {number} orderId - The order ID being refunded
 * @param {Array<number>} itemIds - Optional: specific item IDs being refunded (null = full refund)
 * @returns {Promise<Object>} Summary of commissions affected
 */
async function handleOrderRefund(orderId, itemIds = null) {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Build query based on full or partial refund
    let query = `
      SELECT 
        ac.id,
        ac.affiliate_id,
        ac.net_amount,
        ac.status,
        ac.paid_date,
        a.payout_method
      FROM affiliate_commissions ac
      JOIN affiliates a ON ac.affiliate_id = a.id
      WHERE ac.order_id = ?
    `;
    const params = [orderId];
    
    if (itemIds && itemIds.length > 0) {
      query += ` AND ac.order_item_id IN (${itemIds.map(() => '?').join(',')})`;
      params.push(...itemIds);
    }
    
    const [commissions] = await connection.execute(query, params);
    
    const cancelled = [];
    const clawbacks = [];
    
    for (const commission of commissions) {
      if (commission.status === 'pending' || commission.status === 'eligible') {
        // Not yet paid - simply cancel
        await connection.execute(`
          UPDATE affiliate_commissions 
          SET status = 'cancelled', 
              status_reason = 'Order refunded',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [commission.id]);
        
        // Reduce pending balance
        await connection.execute(`
          UPDATE affiliates 
          SET pending_balance = pending_balance - ?,
              total_earnings = total_earnings - ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [commission.net_amount, commission.net_amount, commission.affiliate_id]);
        
        cancelled.push(commission.id);
        
      } else if (commission.status === 'paid') {
        // Already paid - create clawback
        await connection.execute(`
          UPDATE affiliate_commissions 
          SET status = 'clawback',
              status_reason = 'Order refunded after payout',
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [commission.id]);
        
        // Create negative clawback record
        await connection.execute(`
          INSERT INTO affiliate_commissions (
            affiliate_id,
            order_id,
            order_item_id,
            order_item_amount,
            platform_commission,
            affiliate_rate,
            gross_amount,
            net_amount,
            status,
            status_reason,
            eligible_date
          ) SELECT 
            affiliate_id,
            order_id,
            order_item_id,
            0,
            0,
            affiliate_rate,
            -gross_amount,
            -net_amount,
            'pending',
            'Clawback for refunded order',
            CURDATE()
          FROM affiliate_commissions
          WHERE id = ?
        `, [commission.id]);
        
        // Reduce paid balance, add to pending (negative)
        await connection.execute(`
          UPDATE affiliates 
          SET paid_balance = paid_balance - ?,
              pending_balance = pending_balance - ?,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [commission.net_amount, commission.net_amount, commission.affiliate_id]);
        
        // For site credit users, also update their credit balance
        if (commission.payout_method === 'site_credit') {
          await connection.execute(`
            UPDATE user_credits 
            SET balance = balance - ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE user_id = (SELECT user_id FROM affiliates WHERE id = ?)
          `, [commission.net_amount, commission.affiliate_id]);
          
          // Record the debit transaction
          const [affiliateUser] = await connection.execute(
            'SELECT user_id FROM affiliates WHERE id = ?',
            [commission.affiliate_id]
          );
          
          if (affiliateUser.length > 0) {
            const [creditBalance] = await connection.execute(
              'SELECT balance FROM user_credits WHERE user_id = ?',
              [affiliateUser[0].user_id]
            );
            
            await connection.execute(`
              INSERT INTO user_credit_transactions (
                user_id, amount, balance_after, transaction_type, 
                reference_type, reference_id, description
              ) VALUES (?, ?, ?, 'affiliate_clawback', 'affiliate_commissions', ?, ?)
            `, [
              affiliateUser[0].user_id,
              -commission.net_amount,
              creditBalance[0]?.balance || 0,
              commission.id,
              `Clawback for refunded order #${orderId}`
            ]);
          }
        }
        
        clawbacks.push(commission.id);
      }
    }
    
    await connection.commit();
    
    // Send cancellation notifications for all affected commissions
    for (const commission of commissions) {
      await sendCancellationNotification(commission, orderId);
    }
    
    return {
      success: true,
      cancelled: cancelled.length,
      clawbacks: clawbacks.length,
      cancelled_ids: cancelled,
      clawback_ids: clawbacks
    };
    
  } catch (error) {
    await connection.rollback();
    console.error('Error handling affiliate refund:', error);
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Send email notification for cancelled commission
 * 
 * @param {Object} commission - Commission details
 * @param {number} orderId - Order ID
 */
async function sendCancellationNotification(commission, orderId) {
  try {
    // Get affiliate user info for email
    const [userRows] = await db.execute(`
      SELECT 
        u.id,
        up.first_name
      FROM users u
      JOIN affiliates a ON a.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE a.id = ?
    `, [commission.affiliate_id]);
    
    if (userRows.length === 0) return;
    
    const user = userRows[0];
    
    await emailService.queueEmail(user.id, 'affiliate_commission_cancelled', {
      first_name: user.first_name || 'Affiliate',
      commission_amount: parseFloat(commission.net_amount).toFixed(2),
      cancellation_reason: commission.status === 'paid' ? 'Order refunded after payout (clawback)' : 'Order refunded by customer',
      dashboard_link: `${process.env.FRONTEND_URL || 'https://brakebee.com'}/dashboard?section=affiliates`
    }, {
      priority: 2
    });
    
  } catch (error) {
    // Don't throw - notification is secondary
    console.error('Error sending cancellation notification:', error);
  }
}

/**
 * Get affiliate statistics for a user
 * 
 * @param {number} affiliateId - Affiliate account ID
 * @returns {Promise<Object>} Affiliate statistics
 */
async function getAffiliateStats(affiliateId) {
  const [stats] = await db.execute(`
    SELECT 
      COUNT(*) as total_commissions,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_count,
      SUM(CASE WHEN status = 'pending' THEN net_amount ELSE 0 END) as pending_amount,
      SUM(CASE WHEN status = 'paid' THEN net_amount ELSE 0 END) as paid_amount,
      SUM(net_amount) as total_earned
    FROM affiliate_commissions
    WHERE affiliate_id = ? AND status != 'cancelled'
  `, [affiliateId]);
  
  const [clickStats] = await db.execute(`
    SELECT 
      COUNT(*) as total_clicks,
      COUNT(DISTINCT session_id) as unique_visitors,
      SUM(CASE WHEN converted = TRUE THEN 1 ELSE 0 END) as conversions
    FROM affiliate_referrals
    WHERE affiliate_id = ?
  `, [affiliateId]);
  
  return {
    ...stats[0],
    ...clickStats[0],
    conversion_rate: clickStats[0].unique_visitors > 0 
      ? ((clickStats[0].conversions / clickStats[0].unique_visitors) * 100).toFixed(2)
      : 0
  };
}

module.exports = {
  recordAffiliateCommissions,
  handleOrderRefund,
  getAffiliateStats,
  sendCommissionNotification
};
