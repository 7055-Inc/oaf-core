const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const verifyToken = require('../../middleware/jwt');
const { requirePermission } = require('../../middleware/permissions');
const stripeService = require('../../services/stripeService');

/**
 * @fileoverview Shipping subscription management routes
 * 
 * Handles comprehensive shipping subscription functionality including:
 * - Vendor address management for shipping labels
 * - Terms and conditions acceptance tracking
 * - Subscription lifecycle management (signup, activation, cancellation)
 * - Payment method management and preferences
 * - Shipping label purchase processing with dual payment methods
 * - Label library management (order and standalone labels)
 * - Purchase history and refund processing
 * - Connect balance integration for vendor payments
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

// ============================================================================
// SHIPPING SUBSCRIPTION MANAGEMENT
// ============================================================================

/**
 * Get vendor shipping settings for Ship From address prefill
 * @route GET /api/subscriptions/shipping/vendor-address
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Vendor shipping address details for label creation
 */
router.get('/vendor-address', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Check if user has vendor permission and shipping settings
    const [vendorSettings] = await db.query(`
      SELECT 
        return_company_name as name,
        return_address_line_1 as street,
        return_address_line_2 as address_line_2,
        return_city as city,
        return_state as state,
        return_postal_code as zip,
        return_country as country,
        return_phone as phone
      FROM vendor_ship_settings 
      WHERE vendor_id = ?
    `, [userId]);

    if (vendorSettings.length === 0) {
      return res.json({
        success: true,
        has_vendor_address: false,
        address: null
      });
    }

    const settings = vendorSettings[0];
    
    // Check if address is complete (required fields filled)
    const isComplete = settings.name && settings.street && settings.city && 
                      settings.state && settings.zip && settings.country;

    res.json({
      success: true,
      has_vendor_address: true,
      address: isComplete ? settings : null,
      incomplete_address: !isComplete ? settings : null
    });

  } catch (error) {
    console.error('Error fetching vendor address:', error);
    res.status(500).json({ error: 'Failed to fetch vendor address' });
  }
});

/**
 * Check if user has accepted latest shipping terms
 * @route GET /api/subscriptions/shipping/terms-check
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Terms acceptance status and latest terms details
 */
router.get('/terms-check', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get latest shipping terms version
    const [latestTerms] = await db.query(`
      SELECT id, title, content, version, created_at
      FROM terms_versions 
      WHERE subscription_type = 'shipping_labels' AND is_current = 1
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (latestTerms.length === 0) {
      return res.status(404).json({ error: 'No shipping terms found' });
    }

    const terms = latestTerms[0];

    // Check if user has accepted these terms
    const [acceptance] = await db.query(`
      SELECT id, accepted_at
      FROM user_terms_acceptance 
      WHERE user_id = ? AND subscription_type = 'shipping_labels' AND terms_version_id = ?
    `, [userId, terms.id]);

    const termsAccepted = acceptance.length > 0;

    res.json({
      success: true,
      termsAccepted,
      latestTerms: {
        id: terms.id,
        title: terms.title,
        content: terms.content,
        version: terms.version,
        created_at: terms.created_at
      }
    });

  } catch (error) {
    console.error('Error checking shipping terms acceptance:', error);
    res.status(500).json({ error: 'Failed to check terms acceptance' });
  }
});

/**
 * Get current shipping terms content
 * @route GET /api/subscriptions/shipping/terms
 * @access Public
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Current shipping terms and conditions
 */
router.get('/terms', async (req, res) => {
  try {
    // Get current shipping terms
    const [terms] = await db.query(`
      SELECT id, version, title, content, created_at
      FROM terms_versions 
      WHERE is_current = TRUE AND subscription_type = 'shipping_labels'
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (terms.length === 0) {
      return res.status(404).json({ error: 'No current shipping terms found' });
    }

    res.json({
      success: true,
      terms: terms[0]
    });
  } catch (error) {
    console.error('Error fetching shipping terms:', error);
    res.status(500).json({ error: 'Failed to fetch shipping terms' });
  }
});

/**
 * Get user's shipping subscription status
 * @route GET /api/subscriptions/shipping/my
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Complete shipping subscription details with purchase history
 */
router.get('/my', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Check if user has accepted shipping terms first
    const [termsAcceptance] = await db.query(`
      SELECT uta.id, uta.accepted_at
      FROM user_terms_acceptance uta
      JOIN terms_versions tv ON uta.terms_version_id = tv.id
      WHERE uta.user_id = ? AND uta.subscription_type = 'shipping_labels' AND tv.is_current = TRUE
    `, [userId]);

    const hasAcceptedTerms = termsAcceptance.length > 0;

    // Auto-grant permission logic: if user has card + terms, ensure they have permission
    // NOTE: We no longer auto-create subscriptions here - that's handled by select-tier and application steps
    if (hasAcceptedTerms) {
      // Check if user has any valid payment method (from any subscription)
      const [anySubscription] = await db.query(`
        SELECT stripe_customer_id FROM user_subscriptions 
        WHERE user_id = ? AND stripe_customer_id IS NOT NULL 
        LIMIT 1
      `, [userId]);

      if (anySubscription.length > 0) {
        // User has card + terms - ensure permission is granted
        await db.query(`
          INSERT INTO user_permissions (user_id, shipping) 
          VALUES (?, 1) 
          ON DUPLICATE KEY UPDATE shipping = 1
        `, [userId]);
        
        // Also activate any incomplete shipping subscription
        await db.query(`
          UPDATE user_subscriptions 
          SET status = 'active' 
          WHERE user_id = ? 
            AND subscription_type = 'shipping_labels' 
            AND status = 'incomplete'
        `, [userId]);
      }
    }

    // NOW get user's shipping subscription (after ensuring it exists)
    const [subscriptions] = await db.query(`
      SELECT 
        us.*,
        up.shipping as has_permission
      FROM user_subscriptions us
      LEFT JOIN user_permissions up ON us.user_id = up.user_id
      WHERE us.user_id = ? AND us.subscription_type = 'shipping_labels' AND us.status = 'active'
      ORDER BY us.created_at DESC
      LIMIT 1
    `, [userId]);

    if (subscriptions.length === 0) {
      // Check if user has permission but no active subscription
      const [permissions] = await db.query(
        'SELECT shipping FROM user_permissions WHERE user_id = ?',
        [userId]
      );

      // Get card info even without active shipping subscription
      let cardLast4 = null;
      const [anyCustomer] = await db.query(`
        SELECT stripe_customer_id FROM user_subscriptions 
        WHERE user_id = ? AND stripe_customer_id IS NOT NULL 
        LIMIT 1
      `, [userId]);

      if (anyCustomer.length > 0) {
        try {
          const paymentMethods = await stripeService.stripe.paymentMethods.list({
            customer: anyCustomer[0].stripe_customer_id,
            type: 'card',
            limit: 1
          });
          if (paymentMethods.data.length > 0) {
            cardLast4 = paymentMethods.data[0].card.last4;
          }
        } catch (error) {
          console.error('Error fetching payment method:', error);
        }
      }
      
      return res.json({
        subscription: {
          id: null,
          status: 'inactive',
          tier: null,
          tierPrice: null,
          cardLast4: cardLast4,
          preferConnectBalance: false,
          hasStripeConnect: req.permissions && req.permissions.includes('stripe_connect'),
          termsAccepted: hasAcceptedTerms,
          termsAcceptedAt: termsAcceptance[0]?.accepted_at || null,
          createdAt: null
        },
        has_permission: permissions.length > 0 && permissions[0].shipping === 1,
        connect_balance: { available: 0, pending: 0 }
      });
    }

    const subscription = subscriptions[0];

    // Get Connect balance if user has stripe_connect permission
    let connectBalance = { available: 0, pending: 0 };
    if (req.permissions && req.permissions.includes('stripe_connect')) {
      try {
        connectBalance = await stripeService.getConnectAccountBalance(userId);
      } catch (error) {
        console.error('Error fetching Connect balance:', error);
        connectBalance = { available: 0, pending: 0 };
      }
    }

    // Get recent label purchases (last 10)
    const [purchases] = await db.query(`
      SELECT 
        slp.id,
        slp.amount,
        slp.payment_method,
        slp.created_at,
        sl.tracking_number,
        sl.carrier,
        sl.status as label_status
      FROM shipping_label_purchases slp
      JOIN shipping_labels sl ON slp.shipping_label_id = sl.id
      WHERE slp.subscription_id = ?
      ORDER BY slp.created_at DESC
      LIMIT 10
    `, [subscription.id]);

    // Get Connect balance purchases from vendor_transactions
    const [connectPurchasesRaw] = await db.query(`
      SELECT 
        vt.id,
        vt.amount,
        vt.created_at,
        sl.tracking_number,
        sl.carrier,
        sl.status as label_status,
        'connect_balance' as payment_method
      FROM vendor_transactions vt
      JOIN shipping_labels sl ON vt.id = sl.vendor_transaction_id
      WHERE vt.vendor_id = ? AND vt.transaction_type = 'shipping_charge'
      ORDER BY vt.created_at DESC
      LIMIT 10
    `, [userId]);

    // Return raw purchase data - let frontend handle formatting
    const cardPurchases = purchases.map(p => ({
      id: p.id,
      source: 'card',
      date: p.created_at,
      amount: p.amount,
      payment_method: p.payment_method,
      tracking_number: p.tracking_number,
      carrier: p.carrier,
      status: p.label_status
    }));

    const connectPurchases = connectPurchasesRaw.map(p => ({
      id: p.id,
      source: 'connect',
      date: p.created_at,
      amount: p.amount,
      payment_method: p.payment_method,
      tracking_number: p.tracking_number,
      carrier: p.carrier,
      status: p.label_status
    }));

    // Get card last 4 digits from Stripe if customer exists
    let cardLast4 = null;
    if (subscription.stripe_customer_id) {
      try {
        const paymentMethods = await stripeService.stripe.paymentMethods.list({
          customer: subscription.stripe_customer_id,
          type: 'card',
          limit: 1
        });
        if (paymentMethods.data.length > 0) {
          cardLast4 = paymentMethods.data[0].card.last4;
        }
      } catch (error) {
        console.error('Error fetching payment method:', error);
      }
    }

    res.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        tier: subscription.tier,
        tierPrice: subscription.tier_price,
        cardLast4: cardLast4,
        preferConnectBalance: subscription.prefer_connect_balance,
        hasStripeConnect: req.permissions && req.permissions.includes('stripe_connect'),
        termsAccepted: hasAcceptedTerms,
        termsAcceptedAt: termsAcceptance[0]?.accepted_at || null,
        createdAt: subscription.created_at
      },
      card_purchases: cardPurchases,
      connect_purchases: connectPurchases,
      has_permission: subscription.has_permission === 1,
      connect_balance: connectBalance
    });

  } catch (error) {
    console.error('Error fetching shipping subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription data' });
  }
});

/**
 * Select/Update tier for shipping subscription
 * @route POST /api/subscriptions/shipping/select-tier
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.body.tier_name - Name of the selected tier
 * @param {number} req.body.tier_price - Price of the selected tier
 * @param {Object} res - Express response object
 * @returns {Object} Tier selection confirmation
 */
router.post('/select-tier', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { subscription_type, tier_name, tier_price } = req.body;

    // Validate subscription_type is provided
    if (!subscription_type) {
      return res.status(400).json({
        success: false,
        error: 'subscription_type is required'
      });
    }

    // Check if user already has a subscription record for THIS subscription type
    const [existing] = await db.query(`
      SELECT id, tier, stripe_customer_id 
      FROM user_subscriptions 
      WHERE user_id = ? AND subscription_type = ?
      LIMIT 1
    `, [userId, subscription_type]);

    if (existing.length > 0) {
      // SAFETY FIX: Update existing subscription with tier
      // This handles users who have permissions but no tier set
      await db.query(`
        UPDATE user_subscriptions 
        SET tier = ?, tier_price = ?
        WHERE id = ?
      `, [tier_name || subscription_type, tier_price || 0, existing[0].id]);

      return res.json({
        success: true,
        message: 'Tier updated successfully',
        subscription_id: existing[0].id,
        action: 'updated'
      });
    } else {
      // Create new subscription record with tier for THIS subscription type
      const [result] = await db.query(`
        INSERT INTO user_subscriptions (
          user_id, subscription_type, tier, tier_price, status
        ) VALUES (?, ?, ?, ?, 'incomplete')
      `, [userId, subscription_type, tier_name || subscription_type, tier_price || 0]);

      return res.json({
        success: true,
        message: 'Tier selected successfully',
        subscription_id: result.insertId,
        action: 'created'
      });
    }

  } catch (error) {
    console.error('Error selecting tier:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to select tier',
      details: error.message 
    });
  }
});

/**
 * Activate shipping subscription after payment setup
 * @route POST /api/subscriptions/shipping/activate
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.body.setup_intent_id - Stripe setup intent ID
 * @param {Object} res - Express response object
 * @returns {Object} Activation confirmation
 */
router.post('/activate', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { setup_intent_id } = req.body;

    if (!setup_intent_id) {
      return res.status(400).json({ error: 'setup_intent_id is required' });
    }

    // Verify the setup intent is successful
    const setupIntent = await stripeService.stripe.setupIntents.retrieve(setup_intent_id);
    
    if (setupIntent.status !== 'succeeded') {
      return res.status(400).json({ error: 'Setup intent not successful' });
    }

    // Check if user has accepted shipping terms
    const [termsAcceptance] = await db.query(`
      SELECT uta.id
      FROM user_terms_acceptance uta
      JOIN terms_versions tv ON uta.terms_version_id = tv.id
      WHERE uta.user_id = ? AND uta.subscription_type = 'shipping_labels' AND tv.is_current = TRUE
    `, [userId]);

    if (termsAcceptance.length === 0) {
      return res.status(400).json({ 
        error: 'Shipping terms must be accepted before activation',
        requires_terms: true
      });
    }

    // Use transaction to ensure atomic activation
    await db.query('START TRANSACTION');
    
    try {
      // Use atomic operation to prevent race conditions with webhook
      // This will only activate if status is still 'incomplete'
      const [result] = await db.query(
        'UPDATE user_subscriptions SET status = "active" WHERE user_id = ? AND subscription_type = "shipping_labels" AND status = "incomplete"',
        [userId]
      );

      if (result.affectedRows === 0) {
        await db.query('ROLLBACK');
        
        // Check if already active (webhook may have processed first)
        const [existing] = await db.query(
          'SELECT id, status FROM user_subscriptions WHERE user_id = ? AND subscription_type = "shipping_labels"',
          [userId]
        );
        
        if (existing.length > 0 && existing[0].status === 'active') {
          return res.json({
            success: true,
            message: 'Shipping subscription already activated',
            already_active: true
          });
        } else {
          return res.status(404).json({ error: 'No incomplete subscription found' });
        }
      }

      // Grant shipping permission (idempotent operation)
      await db.query(`
        INSERT INTO user_permissions (user_id, shipping) 
        VALUES (?, 1) 
        ON DUPLICATE KEY UPDATE shipping = 1
      `, [userId]);
      
      // Commit the transaction
      await db.query('COMMIT');
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

    res.json({
      success: true,
      message: 'Shipping subscription activated successfully'
    });

  } catch (error) {
    console.error('Error activating shipping subscription:', error);
    res.status(500).json({ error: 'Failed to activate subscription' });
  }
});

/**
 * Check shipping subscription eligibility and setup
 * @route POST /api/subscriptions/shipping/signup
 * @access Private
 * @param {Object} req - Express request object
 * @param {boolean} req.body.preferConnectBalance - Prefer Connect balance for payments
 * @param {boolean} req.body.acceptTerms - Accept shipping terms
 * @param {Object} res - Express response object
 * @returns {Object} Subscription setup details or activation confirmation
 */
router.post('/signup', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { preferConnectBalance = false, acceptTerms = false } = req.body;

    // Check if user already has an ACTIVE shipping subscription (ignore incomplete ones)
    const [existing] = await db.query(
      'SELECT id FROM user_subscriptions WHERE user_id = ? AND subscription_type = "shipping_labels" AND status = "active"',
      [userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Shipping subscription already exists' });
    }

    // Clean up any incomplete shipping subscriptions for this user
    await db.query(
      'DELETE FROM user_subscriptions WHERE user_id = ? AND subscription_type = "shipping_labels" AND status = "incomplete"',
      [userId]
    );

    // Get user info
    const [users] = await db.query(
      'SELECT username FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];

    // Check if user already has a Stripe customer with valid payment method
    let customer = null;
    let hasValidPaymentMethod = false;

    try {
      // Look for existing Stripe customer from other subscriptions
      const [existingCustomers] = await db.query(
        'SELECT DISTINCT stripe_customer_id FROM user_subscriptions WHERE user_id = ? AND stripe_customer_id IS NOT NULL',
        [userId]
      );

      if (existingCustomers.length > 0) {
        const customerId = existingCustomers[0].stripe_customer_id;
        
        // Check if customer has valid payment methods in Stripe
        const paymentMethods = await stripeService.stripe.paymentMethods.list({
          customer: customerId,
          type: 'card',
        });

        if (paymentMethods.data.length > 0) {
          customer = { id: customerId };
          hasValidPaymentMethod = true;
        }
      }
    } catch (error) {
      console.error('Error checking existing payment methods:', error);
    }

    if (hasValidPaymentMethod && acceptTerms) {
      // Record terms acceptance first
      const [currentTerms] = await db.query(`
        SELECT id FROM terms_versions 
        WHERE is_current = TRUE AND subscription_type = 'shipping_labels'
        ORDER BY created_at DESC LIMIT 1
      `);

      if (currentTerms.length > 0) {
        // Check if not already accepted
        const [existingAcceptance] = await db.query(`
          SELECT id FROM user_terms_acceptance 
          WHERE user_id = ? AND subscription_type = 'shipping_labels' AND terms_version_id = ?
        `, [userId, currentTerms[0].id]);

        if (existingAcceptance.length === 0) {
          await db.query(`
            INSERT INTO user_terms_acceptance (
              user_id, subscription_type, terms_version_id, accepted_at, ip_address, user_agent
            ) VALUES (?, 'shipping_labels', ?, CURRENT_TIMESTAMP, ?, ?)
          `, [userId, currentTerms[0].id, req.ip || null, req.get('User-Agent') || null]);
        }
      }

      // User has card on file and accepted terms - activate immediately
      const [result] = await db.query(`
        INSERT INTO user_subscriptions (
          user_id, stripe_customer_id, subscription_type, status, prefer_connect_balance
        ) VALUES (?, ?, 'shipping_labels', 'active', ?)
      `, [userId, customer.id, preferConnectBalance ? 1 : 0]);

      // Grant shipping permission
      await db.query(`
        INSERT INTO user_permissions (user_id, shipping) 
        VALUES (?, 1) 
        ON DUPLICATE KEY UPDATE shipping = 1
      `, [userId]);

      return res.json({
        success: true,
        subscription_id: result.insertId,
        activated: true,
        message: 'Shipping subscription activated successfully!'
      });

    } else if (hasValidPaymentMethod && !acceptTerms) {
      // User has card but needs to accept terms
      return res.json({
        success: true,
        has_payment_method: true,
        needs_terms: true,
        message: 'Please accept the shipping service terms to activate.'
      });

    } else {
      // User needs to add a payment method
      if (!customer) {
        customer = await stripeService.createOrGetCustomer(userId, user.username, user.username);
      }

      // Create setup intent for payment method collection
      const setupIntent = await stripeService.stripe.setupIntents.create({
        customer: customer.id,
        payment_method_types: ['card'],
        usage: 'off_session',
        metadata: {
          user_id: userId.toString(),
          subscription_type: 'shipping_labels',
          platform: 'beemeeart'
        }
      });

      // Create subscription record (status will be 'incomplete' until payment method is set up)
      const [result] = await db.query(`
        INSERT INTO user_subscriptions (
          user_id, stripe_customer_id, subscription_type, status, prefer_connect_balance
        ) VALUES (?, ?, 'shipping_labels', 'incomplete', ?)
      `, [userId, customer.id, preferConnectBalance ? 1 : 0]);

      return res.json({
        success: true,
        subscription_id: result.insertId,
        has_payment_method: false,
        setup_intent: {
          id: setupIntent.id,
          client_secret: setupIntent.client_secret
        },
        message: 'Add a payment method to activate shipping subscription.'
      });
    }

  } catch (error) {
    console.error('Error creating shipping subscription:', error);
    res.status(500).json({ 
      error: 'Failed to create subscription',
      details: error.message 
    });
  }
});

/**
 * Accept shipping subscription terms
 * @route POST /api/subscriptions/shipping/accept-terms
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.body.ip_address - User's IP address for audit
 * @param {string} req.body.user_agent - User's browser agent for audit
 * @param {Object} res - Express response object
 * @returns {Object} Terms acceptance confirmation
 */
router.post('/accept-terms', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { ip_address, user_agent } = req.body;

    // Get current shipping terms version
    const [currentTerms] = await db.query(`
      SELECT id FROM terms_versions 
      WHERE is_current = TRUE AND subscription_type = 'shipping_labels'
      ORDER BY created_at DESC LIMIT 1
    `);

    if (currentTerms.length === 0) {
      return res.status(400).json({ error: 'No current shipping terms found' });
    }

    const termsVersionId = currentTerms[0].id;

    // Check if user has already accepted these terms
    const [existing] = await db.query(`
      SELECT id FROM user_terms_acceptance 
      WHERE user_id = ? AND subscription_type = 'shipping_labels' AND terms_version_id = ?
    `, [userId, termsVersionId]);

    if (existing.length > 0) {
      return res.json({
        success: true,
        message: 'Terms already accepted',
        accepted_at: existing[0].accepted_at
      });
    }

    // Record terms acceptance
    await db.query(`
      INSERT INTO user_terms_acceptance (
        user_id, subscription_type, terms_version_id, accepted_at, ip_address, user_agent
      ) VALUES (?, 'shipping_labels', ?, CURRENT_TIMESTAMP, ?, ?)
    `, [userId, termsVersionId, ip_address || null, user_agent || null]);

    // Check if user now meets all requirements for activation
    const [subscriptions] = await db.query(`
      SELECT id, stripe_customer_id FROM user_subscriptions 
      WHERE user_id = ? AND subscription_type = 'shipping_labels' AND status = 'incomplete'
    `, [userId]);

    let activated = false;
    if (subscriptions.length > 0) {
      const subscription = subscriptions[0];
      
      // Check if user has valid payment method
      if (subscription.stripe_customer_id) {
        try {
          const paymentMethods = await stripeService.stripe.paymentMethods.list({
            customer: subscription.stripe_customer_id,
            type: 'card',
            limit: 1
          });

          if (paymentMethods.data.length > 0) {
            // User has both terms and payment method - activate subscription
            await db.query('START TRANSACTION');
            
            try {
              await db.query(
                'UPDATE user_subscriptions SET status = "active" WHERE id = ?',
                [subscription.id]
              );
              
              await db.query(`
                INSERT INTO user_permissions (user_id, shipping) 
                VALUES (?, 1) 
                ON DUPLICATE KEY UPDATE shipping = 1
              `, [userId]);
              
              await db.query('COMMIT');
              activated = true;
            } catch (error) {
              await db.query('ROLLBACK');
              throw error;
            }
          }
        } catch (stripeError) {
          console.error('Error checking payment methods during terms acceptance:', stripeError);
        }
      }
    }

    res.json({
      success: true,
      message: 'Shipping terms accepted successfully',
      activated: activated,
      terms_version_id: termsVersionId
    });

  } catch (error) {
    console.error('Error accepting shipping terms:', error);
    res.status(500).json({ error: 'Failed to accept terms' });
  }
});

/**
 * Update payment method preferences
 * @route PUT /api/subscriptions/shipping/preferences
 * @access Private (requires shipping permission)
 * @param {Object} req - Express request object
 * @param {boolean} req.body.preferConnectBalance - Prefer Connect balance for payments
 * @param {Object} res - Express response object
 * @returns {Object} Updated preferences confirmation
 */
router.put('/preferences', verifyToken, requirePermission('shipping'), async (req, res) => {
  try {
    const userId = req.userId;
    const { preferConnectBalance } = req.body;

    // Only allow Connect balance preference if user has stripe_connect permission
    const allowConnectBalance = req.permissions && req.permissions.includes('stripe_connect') 
      ? preferConnectBalance : false;

    const [result] = await db.query(`
      UPDATE user_subscriptions 
      SET prefer_connect_balance = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND subscription_type = 'shipping_labels'
    `, [allowConnectBalance ? 1 : 0, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Shipping subscription not found' });
    }

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      prefer_connect_balance: allowConnectBalance
    });

  } catch (error) {
    console.error('Error updating shipping preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * Update payment method (create new setup intent)
 * @route POST /api/subscriptions/shipping/update-payment-method
 * @access Private (requires shipping permission)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Setup intent for payment method update
 */
router.post('/update-payment-method', verifyToken, requirePermission('shipping'), async (req, res) => {
  try {
    const userId = req.userId;

    // Get user's subscription
    const [subscriptions] = await db.query(
      'SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = ? AND subscription_type = "shipping_labels" AND status = "active"',
      [userId]
    );

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'Shipping subscription not found' });
    }

    const customerId = subscriptions[0].stripe_customer_id;

    // Create new setup intent
    const setupIntent = await stripeService.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        user_id: userId.toString(),
        subscription_type: 'shipping_labels',
        action: 'update_payment_method',
        platform: 'beemeeart'
      }
    });

    res.json({
      success: true,
      setup_intent: {
        id: setupIntent.id,
        client_secret: setupIntent.client_secret
      },
      message: 'Setup intent created for payment method update'
    });

  } catch (error) {
    console.error('Error creating payment method update intent:', error);
    res.status(500).json({ error: 'Failed to create payment method update' });
  }
});

/**
 * Cancel shipping subscription
 * @route DELETE /api/subscriptions/shipping/cancel
 * @access Private (requires shipping permission)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Cancellation confirmation
 */
router.delete('/cancel', verifyToken, requirePermission('shipping'), async (req, res) => {
  try {
    const userId = req.userId;

    // Update subscription status and revoke permission
    await db.query('START TRANSACTION');

    try {
      // Cancel subscription
      await db.query(`
        UPDATE user_subscriptions 
        SET status = 'canceled', canceled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND subscription_type = 'shipping_labels'
      `, [userId]);

      // Revoke shipping permission
      await db.query(
        'UPDATE user_permissions SET shipping = 0 WHERE user_id = ?',
        [userId]
      );

      await db.query('COMMIT');

      res.json({
        success: true,
        message: 'Shipping subscription canceled successfully'
      });

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error canceling shipping subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ============================================================================
// SHIPPING LABEL PAYMENT PROCESSING
// ============================================================================

/**
 * Process payment for shipping label
 * @route POST /api/subscriptions/shipping/purchase-label
 * @access Private (requires shipping permission)
 * @param {Object} req - Express request object
 * @param {number} req.body.shippingLabelId - Shipping label ID to purchase
 * @param {number} req.body.amount - Payment amount
 * @param {Object} res - Express response object
 * @returns {Object} Payment processing result
 */
router.post('/purchase-label', verifyToken, requirePermission('shipping'), async (req, res) => {
  try {
    const userId = req.userId;
    const { shippingLabelId, amount } = req.body;

    if (!shippingLabelId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid shipping label ID and amount required' });
    }

    // Get user's subscription
    const [subscriptions] = await db.query(`
      SELECT id, stripe_customer_id, prefer_connect_balance 
      FROM user_subscriptions 
      WHERE user_id = ? AND subscription_type = 'shipping_labels' AND status = 'active'
    `, [userId]);

    if (subscriptions.length === 0) {
      return res.status(400).json({ error: 'Active shipping subscription required' });
    }

    const subscription = subscriptions[0];

    // Verify shipping label exists and belongs to user
    const [labels] = await db.query(
      'SELECT id, cost, vendor_id FROM shipping_labels WHERE id = ? AND vendor_id = ?',
      [shippingLabelId, userId]
    );

    if (labels.length === 0) {
      return res.status(404).json({ error: 'Shipping label not found or access denied' });
    }

    const label = labels[0];

    // Validate amount matches label cost
    if (Math.abs(parseFloat(amount) - parseFloat(label.cost)) > 0.01) {
      return res.status(400).json({ error: 'Amount does not match label cost' });
    }

    let paymentResult;

    // Try Connect balance first if preferred and user has permission
    if (subscription.prefer_connect_balance && req.permissions.includes('stripe_connect')) {
      try {
        paymentResult = await stripeService.processSubscriptionPaymentWithConnectBalance(
          userId,
          null, // No Stripe subscription for shipping
          Math.round(amount * 100) // Convert to cents
        );

        if (paymentResult.success) {
          // Create vendor transaction record
          const [vtResult] = await db.query(`
            INSERT INTO vendor_transactions (
              vendor_id, transaction_type, amount, status, created_at
            ) VALUES (?, 'shipping_charge', ?, 'completed', CURRENT_TIMESTAMP)
          `, [userId, amount]);

          // Link to shipping label
          await db.query(
            'UPDATE shipping_labels SET vendor_transaction_id = ? WHERE id = ?',
            [vtResult.insertId, shippingLabelId]
          );

          return res.json({
            success: true,
            payment_method: 'connect_balance',
            amount: amount,
            shipping_label_id: shippingLabelId,
            transaction_id: vtResult.insertId
          });
        }
      } catch (connectError) {
        // Connect balance payment failed, falling back to card
      }
    }

    // Fall back to card payment
    const paymentIntent = await stripeService.stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      customer: subscription.stripe_customer_id,
      payment_method_types: ['card'],
      confirmation_method: 'automatic',
      confirm: true,
      off_session: true, // Use saved payment method
      metadata: {
        user_id: userId.toString(),
        shipping_label_id: shippingLabelId.toString(),
        subscription_id: subscription.id.toString(),
        platform: 'beemeeart'
      }
    });

    // Create shipping label purchase record
    const [purchaseResult] = await db.query(`
      INSERT INTO shipping_label_purchases (
        subscription_id, shipping_label_id, stripe_payment_intent_id, 
        amount, status, payment_method
      ) VALUES (?, ?, ?, ?, 'pending', 'card')
    `, [subscription.id, shippingLabelId, paymentIntent.id, amount]);

    if (paymentIntent.status === 'succeeded') {
      // Update purchase status
      await db.query(
        'UPDATE shipping_label_purchases SET status = "succeeded" WHERE id = ?',
        [purchaseResult.insertId]
      );

      res.json({
        success: true,
        payment_method: 'card',
        amount: amount,
        shipping_label_id: shippingLabelId,
        payment_intent_id: paymentIntent.id,
        purchase_id: purchaseResult.insertId
      });
    } else {
      res.json({
        success: false,
        requires_action: paymentIntent.status === 'requires_action',
        payment_intent: {
          id: paymentIntent.id,
          client_secret: paymentIntent.client_secret,
          status: paymentIntent.status
        }
      });
    }

  } catch (error) {
    console.error('Error processing label payment:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({ 
        error: 'Card payment failed',
        decline_code: error.decline_code,
        message: error.message
      });
    }

    res.status(500).json({ 
      error: 'Failed to process payment',
      details: error.message 
    });
  }
});

/**
 * Get unified label library (both order and standalone labels)
 * @route GET /api/subscriptions/shipping/all-labels
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Combined list of order and standalone shipping labels
 */
router.get('/all-labels', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get all labels for this user (both order and standalone) - based on working /my-labels endpoint
    const [allLabels] = await db.query(`
      (SELECT 
        sl.id as db_id,
        'order' as type,
        sl.order_id,
        sl.order_item_id,
        sl.tracking_number,
        sl.label_file_path,
        sl.service_name,
        sl.cost,
        sl.status,
        sl.created_at,
        sa.recipient_name as customer_name,
        oi.product_name,
        oi.quantity
      FROM shipping_labels sl
      JOIN order_items oi ON sl.order_item_id = oi.id
      JOIN orders o ON sl.order_id = o.id
      JOIN shipping_addresses sa ON o.id = sa.order_id
      WHERE sl.vendor_id = ?)
      
      UNION ALL
      
      (SELECT 
        ssl.id as db_id,
        'standalone' as type,
        NULL as order_id,
        NULL as order_item_id,
        ssl.tracking_number,
        ssl.label_file_path,
        ssl.service_name,
        ssl.cost,
        ssl.status,
        ssl.created_at,
        'N/A' as customer_name,
        'Standalone Label' as product_name,
        1 as quantity
      FROM standalone_shipping_labels ssl
      WHERE ssl.user_id = ?)
      
      ORDER BY created_at DESC
    `, [userId, userId]);

    res.json({ 
      success: true, 
      labels: allLabels
    });

  } catch (error) {
    console.error('Error fetching unified labels:', error);
    res.status(500).json({ error: 'Failed to fetch labels' });
  }
});

/**
 * Get standalone label library
 * @route GET /api/subscriptions/shipping/standalone-labels
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} List of standalone shipping labels
 */
router.get('/standalone-labels', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get standalone labels for this user
    const [standaloneLabels] = await db.query(`
      SELECT 
        sl.id as db_id,
        'standalone' as type,
        sl.label_id,
        sl.tracking_number,
        sl.label_file_path,
        sl.service_name,
        sl.cost,
        sl.status,
        sl.created_at,
        'N/A' as customer_name,
        'Standalone Label' as product_name,
        1 as quantity
      FROM standalone_shipping_labels sl
      WHERE sl.user_id = ?
      ORDER BY sl.created_at DESC
    `, [userId]);

    res.json({ 
      success: true, 
      labels: standaloneLabels
    });

  } catch (error) {
    console.error('Error fetching standalone labels:', error);
    res.status(500).json({ error: 'Failed to fetch standalone labels' });
  }
});

/**
 * Get shipping label purchase history
 * @route GET /api/subscriptions/shipping/purchases
 * @access Private (requires shipping permission)
 * @param {Object} req - Express request object
 * @param {number} req.query.limit - Number of records to return (default: 50)
 * @param {number} req.query.offset - Number of records to skip (default: 0)
 * @param {Object} res - Express response object
 * @returns {Object} Purchase history with card and Connect balance transactions
 */
router.get('/purchases', verifyToken, requirePermission('shipping'), async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 50, offset = 0 } = req.query;

    // Get user's subscription
    const [subscriptions] = await db.query(
      'SELECT id FROM user_subscriptions WHERE user_id = ? AND subscription_type = "shipping_labels" AND status = "active"',
      [userId]
    );

    if (subscriptions.length === 0) {
      return res.json({ purchases: [], total: 0 });
    }

    const subscriptionId = subscriptions[0].id;

    // Get card purchases
    const [cardPurchases] = await db.query(`
      SELECT 
        slp.id,
        slp.amount,
        slp.status,
        slp.decline_reason,
        slp.created_at,
        sl.tracking_number,
        sl.carrier,
        sl.service_name,
        sl.status as label_status,
        'card' as payment_method
      FROM shipping_label_purchases slp
      JOIN shipping_labels sl ON slp.shipping_label_id = sl.id
      WHERE slp.subscription_id = ?
      ORDER BY slp.created_at DESC
      LIMIT ? OFFSET ?
    `, [subscriptionId, parseInt(limit), parseInt(offset)]);

    // Get Connect balance purchases
    const [connectPurchases] = await db.query(`
      SELECT 
        vt.id,
        vt.amount,
        vt.status,
        vt.created_at,
        sl.tracking_number,
        sl.carrier,
        sl.service_name,
        sl.status as label_status,
        'connect_balance' as payment_method,
        NULL as decline_reason
      FROM vendor_transactions vt
      JOIN shipping_labels sl ON vt.id = sl.vendor_transaction_id
      WHERE vt.vendor_id = ? AND vt.transaction_type = 'shipping_charge'
      ORDER BY vt.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)]);

    // Return raw data separately - let frontend handle combination/sorting
    res.json({
      card_purchases: cardPurchases.map(p => ({
        id: p.id,
        source: 'card',
        amount: p.amount,
        status: p.status,
        decline_reason: p.decline_reason,
        payment_method: p.payment_method,
        tracking_number: p.tracking_number,
        carrier: p.carrier,
        service_name: p.service_name,
        label_status: p.label_status,
        created_at: p.created_at
      })),
      connect_purchases: connectPurchases.map(p => ({
        id: p.id,
        source: 'connect',
        amount: p.amount,
        status: p.status,
        decline_reason: p.decline_reason,
        payment_method: p.payment_method,
        tracking_number: p.tracking_number,
        carrier: p.carrier,
        service_name: p.service_name,
        label_status: p.label_status,
        created_at: p.created_at
      })),
      total_card: cardPurchases.length,
      total_connect: connectPurchases.length,
      limit: parseInt(limit)
    });

  } catch (error) {
    console.error('Error fetching purchase history:', error);
    res.status(500).json({ error: 'Failed to fetch purchase history' });
  }
});

/**
 * Process refund for shipping label purchase
 * @route POST /api/subscriptions/shipping/refund
 * @access Private (requires shipping permission)
 * @param {Object} req - Express request object
 * @param {number} req.body.purchaseId - Purchase ID to refund
 * @param {number} req.body.amount - Refund amount
 * @param {string} req.body.reason - Refund reason
 * @param {Object} res - Express response object
 * @returns {Object} Refund processing result
 */
router.post('/refund', verifyToken, requirePermission('shipping'), async (req, res) => {
  try {
    const userId = req.userId;
    const { purchaseId, amount, reason = 'requested_by_customer' } = req.body;

    if (!purchaseId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid purchase ID and amount required' });
    }

    // Get purchase details
    const [purchases] = await db.query(`
      SELECT 
        slp.id, slp.stripe_payment_intent_id, slp.amount as total_amount,
        slp.status, slp.payment_method,
        us.id as subscription_id
      FROM shipping_label_purchases slp
      JOIN user_subscriptions us ON slp.subscription_id = us.id
      WHERE slp.id = ? AND us.user_id = ? AND us.subscription_type = 'shipping_labels' AND us.status = 'active'
    `, [purchaseId, userId]);

    if (purchases.length === 0) {
      return res.status(404).json({ error: 'Purchase not found or access denied' });
    }

    const purchase = purchases[0];

    if (purchase.status !== 'succeeded') {
      return res.status(400).json({ error: 'Can only refund succeeded purchases' });
    }

    if (amount > purchase.total_amount) {
      return res.status(400).json({ error: 'Refund amount exceeds purchase amount' });
    }

    let refundResult;

    if (purchase.payment_method === 'connect_balance') {
      // For Connect balance, create reversing vendor_transaction
      const [vtResult] = await db.query(`
        INSERT INTO vendor_transactions (
          vendor_id, transaction_type, amount, status, reference_id, created_at
        ) VALUES (?, 'shipping_refund', ?, 'completed', ?, CURRENT_TIMESTAMP)
      `, [userId, amount, purchase.id]);

      refundResult = { success: true, refund_id: vtResult.insertId, method: 'connect_balance' };
    } else {
      // For card payments, use Stripe refund
      const refund = await stripeService.stripe.refunds.create({
        payment_intent: purchase.stripe_payment_intent_id,
        amount: Math.round(amount * 100),
        reason: reason,
        metadata: {
          user_id: userId.toString(),
          purchase_id: purchase.id.toString()
        }
      });

      refundResult = { success: true, refund_id: refund.id, method: 'card' };
    }

    // Update purchase status (if full refund)
    const newStatus = amount === purchase.total_amount ? 'refunded' : 'partially_refunded';
    await db.query(`
      UPDATE shipping_label_purchases 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newStatus, purchase.id]);

    res.json({
      success: true,
      refund: refundResult,
      amount: amount
    });

  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ error: 'Failed to process refund', details: error.message });
  }
});

/**
 * Create standalone shipping label (not attached to order)
 * @route POST /api/subscriptions/shipping/create-standalone-label
 * @access Private (requires shipping permission)
 * @param {Object} req - Express request object
 * @param {Object} req.body.shipper_address - Sender address details
 * @param {Object} req.body.recipient_address - Recipient address details
 * @param {Array} req.body.packages - Package specifications
 * @param {Object} req.body.selected_rate - Selected shipping rate
 * @param {boolean} req.body.force_card_payment - Force card payment over Connect balance
 * @param {Object} res - Express response object
 * @returns {Object} Created label details and payment confirmation
 */
router.post('/create-standalone-label', verifyToken, requirePermission('shipping'), async (req, res) => {
  try {
    const userId = req.userId;
    const { shipper_address, recipient_address, packages, selected_rate, force_card_payment = false } = req.body;

    if (!shipper_address || !recipient_address || !packages || !selected_rate) {
      return res.status(400).json({ error: 'Shipper address, recipient address, packages, and selected rate are required' });
    }

    // Get user's subscription
    const [subscriptions] = await db.query(`
      SELECT id, stripe_customer_id, prefer_connect_balance 
      FROM user_subscriptions 
      WHERE user_id = ? AND subscription_type = 'shipping_labels' AND status = 'active'
    `, [userId]);

    if (subscriptions.length === 0) {
      return res.status(400).json({ error: 'Active shipping subscription required' });
    }

    const subscription = subscriptions[0];

    // Use shipper address provided by frontend (no fallback)
    // Frontend should prefill from vendor settings or require user input

    // Check Connect balance for standalone labels (prevent negative balance)
    let canUseConnectBalance = false;
    if (!force_card_payment && subscription.prefer_connect_balance && req.permissions.includes('stripe_connect')) {
      try {
        const connectBalance = await stripeService.getConnectAccountBalance(userId);
        const labelCostCents = Math.round(selected_rate.cost * 100);
        
        // For standalone labels, prevent negative balance
        if (connectBalance.available >= labelCostCents) {
          canUseConnectBalance = true;
        }
      } catch (error) {
        console.error('Error checking Connect balance:', error);
      }
    }

    let paymentResult;
    let paymentMethod;

    // Try Connect balance first if available and sufficient
    if (canUseConnectBalance) {
      try {
        paymentResult = await stripeService.processSubscriptionPaymentWithConnectBalance(
          userId,
          null, // No Stripe subscription for standalone labels
          Math.round(selected_rate.cost * 100) // Convert to cents
        );

        if (paymentResult.success) {
          paymentMethod = 'connect_balance';
        } else {
          // Connect balance failed, fall back to card
          canUseConnectBalance = false;
        }
      } catch (connectError) {
        console.error('Connect balance payment failed:', connectError);
        canUseConnectBalance = false;
      }
    }

    // Fall back to card payment if Connect balance not used or failed
    if (!canUseConnectBalance) {
      const paymentIntent = await stripeService.stripe.paymentIntents.create({
        amount: Math.round(selected_rate.cost * 100), // Convert to cents
        currency: 'usd',
        customer: subscription.stripe_customer_id,
        payment_method_types: ['card'],
        confirmation_method: 'automatic',
        confirm: true,
        off_session: true, // Use saved payment method
        metadata: {
          user_id: userId.toString(),
          subscription_id: subscription.id.toString(),
          label_type: 'standalone',
          platform: 'beemeeart'
        }
      });

      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ 
          error: 'Payment failed',
          decline_code: paymentIntent.last_payment_error?.decline_code,
          message: paymentIntent.last_payment_error?.message
        });
      }

      paymentResult = { payment_intent_id: paymentIntent.id };
      paymentMethod = 'card';
    }

    // Create shipping label via existing shipping service (but store in standalone table)
    const shippingService = require('../../services/shippingService');
    
    const shipment = {
      shipper: { name: shipper_address.name, address: shipper_address },
      recipient: { name: recipient_address.name, address: recipient_address },
      packages: packages,
      user_id: userId, // Use user_id for standalone labels
      is_standalone: true // Flag to use standalone table
    };

    const labelData = await shippingService.purchaseStandaloneLabel(selected_rate.carrier, shipment, selected_rate);

    // Record payment in appropriate table
    if (paymentMethod === 'connect_balance') {
      // Create vendor transaction record (for standalone labels, this tracks the payment)
      const [vtResult] = await db.query(`
        INSERT INTO vendor_transactions (
          vendor_id, transaction_type, amount, status, created_at
        ) VALUES (?, 'shipping_charge', ?, 'completed', CURRENT_TIMESTAMP)
      `, [userId, selected_rate.cost]);

      // For standalone labels, record the Connect balance payment
      await db.query(`
        INSERT INTO shipping_label_purchases (
          subscription_id, shipping_label_id, stripe_payment_intent_id, 
          amount, status, payment_method
        ) VALUES (?, ?, NULL, ?, 'succeeded', 'connect_balance')
      `, [subscription.id, labelData.labelId, selected_rate.cost]);
    } else {
      // Create shipping label purchase record for card payments
      await db.query(`
        INSERT INTO shipping_label_purchases (
          subscription_id, shipping_label_id, stripe_payment_intent_id, 
          amount, status, payment_method
        ) VALUES (?, ?, ?, ?, 'succeeded', 'card')
      `, [subscription.id, labelData.labelId, paymentResult.payment_intent_id, selected_rate.cost]);
    }

    res.json({
      success: true,
      label: {
        id: labelData.labelId,
        tracking_number: labelData.trackingNumber,
        carrier: selected_rate.carrier,
        service: selected_rate.service,
        cost: selected_rate.cost,
        label_url: labelData.labelUrl
      },
      payment_method: paymentMethod,
      amount: selected_rate.cost
    });

  } catch (error) {
    console.error('Error creating standalone label:', error);
    
    // Handle specific Stripe errors
    if (error.type === 'StripeCardError') {
      return res.status(400).json({ 
        error: 'Card payment failed',
        decline_code: error.decline_code,
        message: error.message
      });
    }

    res.status(500).json({ 
      error: 'Failed to create label',
      details: error.message 
    });
  }
});

/**
 * Cancel shipping subscription
 * @route POST /api/subscriptions/shipping/cancel
 * @access Private
 * @description Marks subscription for cancellation at end of current period
 */
router.post('/cancel', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user's shipping subscription
    const [subscriptions] = await db.execute(`
      SELECT id, status, current_period_end, cancel_at_period_end 
      FROM user_subscriptions 
      WHERE user_id = ? AND subscription_type = 'shipping_labels'
      LIMIT 1
    `, [userId]);

    if (subscriptions.length === 0) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const subscription = subscriptions[0];

    // Check if already canceled
    if (subscription.cancel_at_period_end === 1) {
      return res.json({
        success: true,
        message: 'Subscription is already set to cancel',
        cancelAt: subscription.current_period_end
      });
    }

    // Mark for cancellation at period end
    await db.execute(`
      UPDATE user_subscriptions 
      SET cancel_at_period_end = 1, 
          canceled_at = NOW()
      WHERE id = ?
    `, [subscription.id]);

    res.json({
      success: true,
      message: 'Subscription will be canceled at the end of your billing period',
      cancelAt: subscription.current_period_end,
      note: 'You will retain access until ' + (subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'the end of your billing period')
    });

  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

module.exports = router;
