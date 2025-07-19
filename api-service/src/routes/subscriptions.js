const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');
const stripeService = require('../services/stripeService');

// GET /subscriptions/my - Get current user's subscription
router.get('/my', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    const [subscriptions] = await db.execute(`
      SELECT 
        us.*,
        GROUP_CONCAT(
          JSON_OBJECT(
            'id', si.id,
            'item_type', si.item_type,
            'stripe_price_id', si.stripe_price_id,
            'quantity', si.quantity,
            'persona_id', si.persona_id
          )
        ) as subscription_items
      FROM user_subscriptions us
      LEFT JOIN subscription_items si ON us.id = si.subscription_id
      WHERE us.user_id = ? AND us.status IN ('active', 'trialing', 'past_due')
      GROUP BY us.id
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [userId]);

    if (subscriptions.length === 0) {
      return res.json({ 
        subscription: null,
        connect_balance: await stripeService.getConnectAccountBalance(userId)
      });
    }

    const subscription = subscriptions[0];
    
    // Parse subscription items
    if (subscription.subscription_items) {
      try {
        subscription.subscription_items = subscription.subscription_items.split(',').map(item => JSON.parse(item));
      } catch (error) {
        subscription.subscription_items = [];
      }
    } else {
      subscription.subscription_items = [];
    }

    // Get Connect balance information
    const connectBalance = await stripeService.getConnectAccountBalance(userId);

    res.json({ 
      subscription,
      connect_balance: connectBalance
    });
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// POST /subscriptions/create - Create new verification subscription
router.post('/create', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { persona_count = 0, payment_method_id = null } = req.body;

    // Get user details
    const [users] = await db.execute('SELECT email, first_name, last_name FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || null;

    // Check if user already has an active subscription
    const [existing] = await db.execute(
      'SELECT id FROM user_subscriptions WHERE user_id = ? AND status IN ("active", "trialing", "incomplete") LIMIT 1',
      [userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already has an active subscription' });
    }

    // Get price IDs from Stripe setup
    const products = await stripeService.setupSubscriptionProducts();
    const basePriceId = products.find(p => p.product.id === 'verification_base')?.price.id;
    const personaPriceId = products.find(p => p.product.id === 'verification_persona')?.price.id;

    if (!basePriceId) {
      throw new Error('Base verification price not found');
    }

    // Build price IDs array
    const priceIds = [basePriceId];
    if (persona_count > 0 && personaPriceId) {
      for (let i = 0; i < persona_count; i++) {
        priceIds.push(personaPriceId);
      }
    }

    // Create Stripe subscription
    const stripeSubscription = await stripeService.createVerificationSubscription(
      userId, 
      user.email, 
      userName, 
      priceIds, 
      payment_method_id
    );

    // Create database record
    const [result] = await db.execute(`
      INSERT INTO user_subscriptions (
        user_id, stripe_subscription_id, stripe_customer_id, subscription_type,
        status, current_period_start, current_period_end
      ) VALUES (?, ?, ?, 'verification', ?, FROM_UNIXTIME(?), FROM_UNIXTIME(?))
    `, [
      userId,
      stripeSubscription.id,
      stripeSubscription.customer,
      stripeSubscription.status,
      stripeSubscription.current_period_start,
      stripeSubscription.current_period_end
    ]);

    const subscriptionId = result.insertId;

    // Create subscription items
    const items = [
      { item_type: 'verification_base', stripe_price_id: basePriceId, quantity: 1 }
    ];

    if (persona_count > 0 && personaPriceId) {
      items.push({
        item_type: 'verification_persona',
        stripe_price_id: personaPriceId,
        quantity: persona_count
      });
    }

    for (const item of items) {
      await db.execute(`
        INSERT INTO subscription_items (subscription_id, stripe_price_id, item_type, quantity)
        VALUES (?, ?, ?, ?)
      `, [subscriptionId, item.stripe_price_id, item.item_type, item.quantity]);
    }

    res.json({
      success: true,
      subscription: {
        id: subscriptionId,
        stripe_subscription_id: stripeSubscription.id,
        status: stripeSubscription.status,
        client_secret: stripeSubscription.latest_invoice?.payment_intent?.client_secret,
        items: items
      }
    });

  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// PUT /subscriptions/payment-preference - Update payment preference
router.put('/payment-preference', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { prefer_connect_balance } = req.body;

    if (typeof prefer_connect_balance !== 'boolean') {
      return res.status(400).json({ error: 'prefer_connect_balance must be a boolean' });
    }

    // Get current subscription
    const [subscriptions] = await db.execute(
      'SELECT id FROM user_subscriptions WHERE user_id = ? AND status IN ("active", "trialing") LIMIT 1',
      [userId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    // Update payment preference
    await db.execute(
      'UPDATE user_subscriptions SET prefer_connect_balance = ? WHERE id = ?',
      [prefer_connect_balance, subscriptions[0].id]
    );

    // Get updated balance info
    const connectBalance = await stripeService.getConnectAccountBalance(userId);

    res.json({
      success: true,
      prefer_connect_balance,
      connect_balance: connectBalance
    });

  } catch (error) {
    console.error('Error updating payment preference:', error);
    res.status(500).json({ error: 'Failed to update payment preference' });
  }
});

// PUT /subscriptions/update-personas - Update persona count
router.put('/update-personas', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { persona_count } = req.body;

    if (typeof persona_count !== 'number' || persona_count < 0) {
      return res.status(400).json({ error: 'Invalid persona count' });
    }

    // Get current subscription
    const [subscriptions] = await db.execute(
      'SELECT * FROM user_subscriptions WHERE user_id = ? AND status IN ("active", "trialing") LIMIT 1',
      [userId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const subscription = subscriptions[0];

    // Get products for price IDs
    const products = await stripeService.setupSubscriptionProducts();
    const basePriceId = products.find(p => p.product.id === 'verification_base')?.price.id;
    const personaPriceId = products.find(p => p.product.id === 'verification_persona')?.price.id;

    // Build updated price IDs
    const priceIds = [basePriceId];
    if (persona_count > 0 && personaPriceId) {
      for (let i = 0; i < persona_count; i++) {
        priceIds.push(personaPriceId);
      }
    }

    // Update Stripe subscription
    const updatedStripeSubscription = await stripeService.updateVerificationSubscription(
      subscription.stripe_subscription_id,
      priceIds
    );

    // Update database items
    await db.execute('DELETE FROM subscription_items WHERE subscription_id = ?', [subscription.id]);

    const items = [
      { item_type: 'verification_base', stripe_price_id: basePriceId, quantity: 1 }
    ];

    if (persona_count > 0 && personaPriceId) {
      items.push({
        item_type: 'verification_persona',
        stripe_price_id: personaPriceId,
        quantity: persona_count
      });
    }

    for (const item of items) {
      await db.execute(`
        INSERT INTO subscription_items (subscription_id, stripe_price_id, item_type, quantity)
        VALUES (?, ?, ?, ?)
      `, [subscription.id, item.stripe_price_id, item.item_type, item.quantity]);
    }

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: updatedStripeSubscription.status,
        items: items
      }
    });

  } catch (error) {
    console.error('Error updating subscription personas:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// POST /subscriptions/cancel - Cancel subscription
router.post('/cancel', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { immediately = false } = req.body;

    // Get current subscription
    const [subscriptions] = await db.execute(
      'SELECT * FROM user_subscriptions WHERE user_id = ? AND status IN ("active", "trialing") LIMIT 1',
      [userId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const subscription = subscriptions[0];

    // Cancel in Stripe
    const canceledSubscription = await stripeService.cancelVerificationSubscription(
      subscription.stripe_subscription_id,
      immediately
    );

    // Update database
    const updateFields = immediately 
      ? { status: 'canceled', canceled_at: new Date() }
      : { cancel_at_period_end: true };

    const updateQuery = immediately
      ? 'UPDATE user_subscriptions SET status = "canceled", canceled_at = NOW() WHERE id = ?'
      : 'UPDATE user_subscriptions SET cancel_at_period_end = TRUE WHERE id = ?';

    await db.execute(updateQuery, [subscription.id]);

    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: canceledSubscription.status,
        cancel_at_period_end: canceledSubscription.cancel_at_period_end,
        canceled_at: canceledSubscription.canceled_at
      }
    });

  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// GET /subscriptions/connect-balance - Get Connect account balance
router.get('/connect-balance', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const connectBalance = await stripeService.getConnectAccountBalance(userId);
    
    res.json({ connect_balance: connectBalance });
  } catch (error) {
    console.error('Error fetching Connect balance:', error);
    res.status(500).json({ error: 'Failed to fetch Connect balance' });
  }
});

// GET /subscriptions/prices - Get available subscription prices
router.get('/prices', async (req, res) => {
  try {
    const products = await stripeService.setupSubscriptionProducts();
    
    const prices = products.map(({ product, price }) => ({
      product_id: product.id,
      price_id: price.id,
      name: product.name,
      description: product.description,
      amount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring.interval,
      type: product.metadata.type
    }));

    res.json({ prices });
  } catch (error) {
    console.error('Error fetching subscription prices:', error);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

// Admin routes
// GET /subscriptions/admin/all - Get all subscriptions (admin only)
router.get('/admin/all', verifyToken, requirePermission('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status = null } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT 
        us.*,
        u.email, u.first_name, u.last_name,
        COUNT(si.id) as item_count
      FROM user_subscriptions us
      JOIN users u ON us.user_id = u.id
      LEFT JOIN subscription_items si ON us.id = si.subscription_id
    `;

    const params = [];
    if (status) {
      query += ' WHERE us.status = ?';
      params.push(status);
    }

    query += `
      GROUP BY us.id
      ORDER BY us.created_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(parseInt(limit), offset);

    const [subscriptions] = await db.execute(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM user_subscriptions us';
    if (status) {
      countQuery += ' WHERE us.status = ?';
    }
    const [countResult] = await db.execute(countQuery, status ? [status] : []);
    const total = countResult[0].total;

    res.json({
      subscriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Error fetching all subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

module.exports = router; 