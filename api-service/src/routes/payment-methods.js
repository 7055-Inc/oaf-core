const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const stripeService = require('../services/stripeService');

/**
 * @fileoverview Payment Methods Management Routes
 * 
 * Handles payment method operations for card-on-file functionality:
 * - Get user's payment methods
 * - Create setup intents for new cards
 * - Confirm card setup completion
 * - Update default payment method
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

/**
 * Get user's payment methods
 * @route GET /api/users/payment-methods
 * @access Private
 * @returns {Object} List of user's payment methods
 */
router.get('/users/payment-methods', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get user's Stripe customer ID
    const [subscriptions] = await db.execute(`
      SELECT stripe_customer_id 
      FROM user_subscriptions 
      WHERE user_id = ? AND stripe_customer_id IS NOT NULL 
      LIMIT 1
    `, [userId]);
    
    if (subscriptions.length === 0) {
      return res.json({
        success: true,
        paymentMethods: []
      });
    }
    
    const customerId = subscriptions[0].stripe_customer_id;
    
    // Get payment methods from Stripe
    const paymentMethods = await stripeService.stripe.paymentMethods.list({
      customer: customerId,
      type: 'card'
    });
    
    // Format payment methods for frontend
    const formattedMethods = paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      exp_month: pm.card.exp_month,
      exp_year: pm.card.exp_year,
      is_default: pm.id === paymentMethods.data[0].id // First one is default
    }));
    
    res.json({
      success: true,
      paymentMethods: formattedMethods
    });
    
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch payment methods' 
    });
  }
});

/**
 * Create a setup intent for adding a new payment method
 * @route POST /api/payment-methods/create-setup-intent
 * @access Private
 * @param {string} req.body.subscription_type - Type of subscription (optional)
 * @returns {Object} Setup intent with client secret
 */
router.post('/payment-methods/create-setup-intent', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { subscription_type } = req.body;
    
    // Get or create Stripe customer
    const [users] = await db.execute('SELECT username FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ 
        success: false,
        error: 'User not found' 
      });
    }
    
    const user = users[0];
    let customerId;
    
    // Check for existing customer ID
    const [existingCustomers] = await db.execute(`
      SELECT stripe_customer_id 
      FROM user_subscriptions 
      WHERE user_id = ? AND stripe_customer_id IS NOT NULL 
      LIMIT 1
    `, [userId]);
    
    if (existingCustomers.length > 0) {
      customerId = existingCustomers[0].stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripeService.createOrGetCustomer(
        userId,
        user.email || user.username,
        user.username
      );
      customerId = customer.id;
    }
    
    // Create setup intent
    const setupIntent = await stripeService.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        user_id: userId.toString(),
        subscription_type: subscription_type || 'general',
        platform: 'beemeeart'
      }
    });
    
    res.json({
      success: true,
      setupIntent: {
        id: setupIntent.id,
        client_secret: setupIntent.client_secret,
        status: setupIntent.status
      },
      customer_id: customerId
    });
    
  } catch (error) {
    console.error('Error creating setup intent:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create setup intent',
      details: error.message 
    });
  }
});

/**
 * Confirm payment method setup was completed
 * @route POST /api/payment-methods/confirm-setup
 * @access Private
 * @param {string} req.body.setup_intent_id - Setup intent ID
 * @param {string} req.body.subscription_type - Type of subscription
 * @returns {Object} Confirmation of payment method saved
 */
router.post('/payment-methods/confirm-setup', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { setup_intent_id, subscription_type } = req.body;
    
    if (!setup_intent_id) {
      return res.status(400).json({ 
        success: false,
        error: 'Setup intent ID is required' 
      });
    }
    
    // Retrieve the setup intent from Stripe
    const setupIntent = await stripeService.stripe.setupIntents.retrieve(setup_intent_id);
    
    if (setupIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        success: false,
        error: 'Setup intent not completed',
        status: setupIntent.status 
      });
    }
    
    const customerId = setupIntent.customer;
    const paymentMethodId = setupIntent.payment_method;
    
    // Set as default payment method
    await stripeService.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId
      }
    });
    
    // Update or create subscription record with customer ID if needed
    if (subscription_type) {
      const [existing] = await db.execute(`
        SELECT id FROM user_subscriptions 
        WHERE user_id = ? AND subscription_type = ?
      `, [userId, subscription_type]);
      
      if (existing.length === 0) {
        // Create subscription record
        await db.execute(`
          INSERT INTO user_subscriptions (
            user_id, stripe_customer_id, subscription_type, status
          ) VALUES (?, ?, ?, 'incomplete')
        `, [userId, customerId, subscription_type]);
      } else {
        // Update existing record
        await db.execute(`
          UPDATE user_subscriptions 
          SET stripe_customer_id = ?
          WHERE id = ?
        `, [customerId, existing[0].id]);
      }
    }
    
    res.json({
      success: true,
      message: 'Payment method saved successfully',
      payment_method_id: paymentMethodId
    });
    
  } catch (error) {
    console.error('Error confirming setup:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to confirm payment method setup',
      details: error.message 
    });
  }
});

module.exports = router;