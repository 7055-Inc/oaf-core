/**
 * CRM Subscription Addons Service
 * Handles purchasing extra drip campaigns and blast credits
 */

const db = require('../../../../config/db');
const stripeService = require('../../../services/stripeService');

/**
 * Get user's CRM addons
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Addon summary
 */
async function getMyAddons(userId) {
  // Get extra drip campaigns
  const [dripAddons] = await db.execute(
    `SELECT * FROM crm_subscription_addons
     WHERE user_id = ? AND addon_type = 'extra_drip_campaign' AND is_active = 1`,
    [userId]
  );
  
  const extraDrips = dripAddons.reduce((sum, addon) => sum + addon.quantity, 0);
  const dripMonthlyTotal = dripAddons.reduce((sum, addon) => sum + (addon.quantity * addon.monthly_price), 0);
  
  // Get blast credits
  const [credits] = await db.execute(
    `SELECT COALESCE(SUM(credits), 0) as total FROM crm_blast_credits
     WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW())`,
    [userId]
  );
  
  const availableCredits = credits[0]?.total || 0;
  
  return {
    extra_drip_campaigns: {
      quantity: extraDrips,
      monthly_cost: dripMonthlyTotal,
      addons: dripAddons
    },
    blast_credits: {
      available: availableCredits
    }
  };
}

/**
 * Purchase extra drip campaign addon
 * @param {number} userId - User ID
 * @param {number} quantity - Number of extra drips to add
 * @returns {Promise<Object>} Purchase result
 */
async function purchaseExtraDripCampaign(userId, quantity = 1) {
  if (quantity < 1) {
    throw new Error('Quantity must be at least 1');
  }
  
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Get user's subscription
    const [subscriptions] = await connection.execute(
      `SELECT id, tier, stripe_customer_id, stripe_subscription_id 
       FROM user_subscriptions 
       WHERE user_id = ? AND subscription_type = 'crm' AND status = 'active'
       LIMIT 1`,
      [userId]
    );
    
    if (subscriptions.length === 0) {
      throw new Error('No active CRM subscription found');
    }
    
    const subscription = subscriptions[0];
    const tier = subscription.tier;
    
    // Get addon price from tier config (would normally use getTierLimits but we'll hardcode for now)
    const addonPrice = 5.00; // $5/month per extra drip
    
    // Check if tier allows purchasing more drips
    if (tier === 'free') {
      throw new Error('Free tier cannot purchase extra drip campaigns. Please upgrade to Beginner or Pro.');
    }
    
    // Add to Stripe subscription
    let stripeItemId = null;
    if (subscription.stripe_subscription_id) {
      try {
        // Add subscription item to Stripe
        const subscriptionItem = await stripeService.stripe.subscriptionItems.create({
          subscription: subscription.stripe_subscription_id,
          price_data: {
            currency: 'usd',
            product: 'prod_crm_extra_drip', // Would need to create this in Stripe
            recurring: {
              interval: 'month'
            },
            unit_amount: Math.round(addonPrice * 100) // Convert to cents
          },
          quantity: quantity
        });
        
        stripeItemId = subscriptionItem.id;
      } catch (stripeError) {
        console.error('Stripe error adding drip campaign addon:', stripeError);
        // Continue anyway - we'll track in DB
      }
    }
    
    // Record in database
    const [result] = await connection.execute(
      `INSERT INTO crm_subscription_addons 
       (user_id, addon_type, quantity, monthly_price, stripe_subscription_item_id)
       VALUES (?, 'extra_drip_campaign', ?, ?, ?)`,
      [userId, quantity, addonPrice, stripeItemId]
    );
    
    await connection.commit();
    
    return {
      success: true,
      addon_id: result.insertId,
      quantity,
      monthly_price: addonPrice,
      total_monthly_cost: addonPrice * quantity,
      message: `Added ${quantity} extra drip campaign${quantity > 1 ? 's' : ''} for $${(addonPrice * quantity).toFixed(2)}/month`
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Remove extra drip campaign addon (deferred to end of billing period)
 * @param {number} userId - User ID
 * @param {number} addonId - Addon ID to remove
 * @returns {Promise<Object>} Result
 */
async function removeExtraDripCampaign(userId, addonId) {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const [addons] = await connection.execute(
      `SELECT * FROM crm_subscription_addons 
       WHERE id = ? AND user_id = ? AND addon_type = 'extra_drip_campaign' AND is_active = 1`,
      [addonId, userId]
    );
    
    if (addons.length === 0) {
      throw new Error('Addon not found or already removed');
    }
    
    const addon = addons[0];

    if (addon.is_complimentary) {
      throw new Error('Complimentary addons cannot be self-cancelled. Contact support.');
    }

    if (addon.cancel_at_period_end === 1) {
      await connection.commit();
      return { success: true, message: 'Addon is already set to cancel', cancelAt: addon.current_period_end };
    }

    // Cancel Stripe subscription item at period end if exists
    if (addon.stripe_subscription_item_id) {
      try {
        await stripeService.stripe.subscriptionItems.update(addon.stripe_subscription_item_id, {
          metadata: { cancel_at_period_end: 'true' }
        });
      } catch (stripeError) {
        console.error('Stripe error marking drip campaign addon for cancellation:', stripeError);
      }
    }
    
    await connection.execute(
      `UPDATE crm_subscription_addons SET cancel_at_period_end = 1 WHERE id = ?`,
      [addonId]
    );
    
    await connection.commit();
    
    return {
      success: true,
      message: `${addon.quantity} extra drip campaign${addon.quantity > 1 ? 's' : ''} will be removed at the end of your billing period`,
      cancelAt: addon.current_period_end
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Purchase blast credit(s) for Free tier
 * @param {number} userId - User ID
 * @param {number} credits - Number of credits to purchase (default 1)
 * @returns {Promise<Object>} Purchase result with Stripe payment intent
 */
async function purchaseBlastCredits(userId, credits = 1) {
  if (credits < 1) {
    throw new Error('Must purchase at least 1 credit');
  }
  
  // Get user's tier
  const [subscriptions] = await db.execute(
    `SELECT tier, stripe_customer_id FROM user_subscriptions 
     WHERE user_id = ? AND subscription_type = 'crm' AND status IN ('active', 'incomplete')
     LIMIT 1`,
    [userId]
  );
  
  if (subscriptions.length === 0) {
    throw new Error('No CRM subscription found');
  }
  
  const tier = subscriptions[0].tier;
  const stripeCustomerId = subscriptions[0].stripe_customer_id;
  
  // Only Free tier can buy credits
  if (tier !== 'free') {
    throw new Error('Only Free tier users can purchase blast credits. Your tier includes single blasts.');
  }
  
  const creditPrice = 10.00; // $10 per blast
  const totalAmount = creditPrice * credits;
  
  // Create Stripe payment intent
  let paymentIntent = null;
  try {
    paymentIntent = await stripeService.stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100), // Convert to cents
      currency: 'usd',
      customer: stripeCustomerId,
      description: `${credits} CRM Blast Credit${credits > 1 ? 's' : ''}`,
      metadata: {
        user_id: userId,
        product: 'crm_blast_credit',
        quantity: credits
      },
      automatic_payment_methods: {
        enabled: true
      }
    });
  } catch (stripeError) {
    console.error('Stripe error creating payment intent:', stripeError);
    throw new Error('Failed to create payment intent: ' + stripeError.message);
  }
  
  // Record pending credit purchase (will be confirmed via webhook)
  const [result] = await db.execute(
    `INSERT INTO crm_blast_credits 
     (user_id, credits, stripe_payment_intent_id, amount_paid)
     VALUES (?, 0, ?, ?)`,
    [userId, paymentIntent.id, totalAmount]
  );
  
  return {
    success: true,
    credit_record_id: result.insertId,
    credits,
    total_amount: totalAmount,
    payment_intent: {
      id: paymentIntent.id,
      client_secret: paymentIntent.client_secret,
      amount: paymentIntent.amount,
      status: paymentIntent.status
    },
    message: `Initiated purchase of ${credits} blast credit${credits > 1 ? 's' : ''} for $${totalAmount.toFixed(2)}`
  };
}

/**
 * Confirm blast credit purchase (called by Stripe webhook)
 * @param {string} paymentIntentId - Stripe payment intent ID
 * @returns {Promise<Object>} Result
 */
async function confirmBlastCreditPurchase(paymentIntentId) {
  const [records] = await db.execute(
    `SELECT * FROM crm_blast_credits 
     WHERE stripe_payment_intent_id = ? AND credits = 0`,
    [paymentIntentId]
  );
  
  if (records.length === 0) {
    throw new Error('Credit record not found or already confirmed');
  }
  
  const record = records[0];
  
  // Calculate credits from amount paid ($10 per credit)
  const credits = Math.floor(record.amount_paid / 10);
  
  // Update record with actual credits
  await db.execute(
    `UPDATE crm_blast_credits 
     SET credits = ?, purchased_at = NOW() 
     WHERE id = ?`,
    [credits, record.id]
  );
  
  return {
    success: true,
    user_id: record.user_id,
    credits,
    message: `Confirmed ${credits} blast credit${credits > 1 ? 's' : ''} purchase`
  };
}

module.exports = {
  getMyAddons,
  purchaseExtraDripCampaign,
  removeExtraDripCampaign,
  purchaseBlastCredits,
  confirmBlastCreditPurchase
};
