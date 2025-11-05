const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const verifyToken = require('../../middleware/jwt');

/**
 * @fileoverview Website subscription management routes
 * 
 * Handles website/sites subscription functionality including:
 * - Terms and conditions acceptance tracking for website services
 * - Website subscription creation with plan selection and addon management
 * - Permission management for site creation and management
 * - User-level and site-level addon activation
 * - Subscription cancellation and permission revocation
 * - Subscription status checking with site count tracking
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

// ============================================================================
// SITES SUBSCRIPTION ROUTES
// ============================================================================
// All routes for website/sites subscription management
// Modular approach - all sites subscription logic contained here

/**
 * Get user's website subscription status (UNIVERSAL FLOW)
 * @route GET /api/subscriptions/websites/my
 * @access Private
 * @returns {Object} Complete subscription status for checklist controller
 */
router.get('/my', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const stripeService = require('../../services/stripeService');
    
    // Get subscription record
    const [subscriptions] = await db.query(`
      SELECT 
        us.id,
        us.status,
        us.tier,
        us.tier_price,
        us.stripe_customer_id,
        us.created_at
      FROM user_subscriptions us
      WHERE us.user_id = ? AND us.subscription_type = 'websites'
      LIMIT 1
    `, [userId]);
    
    const subscription = subscriptions[0] || null;
    
    // Check terms acceptance
    const [termsCheck] = await db.query(`
      SELECT uta.id, uta.accepted_at
      FROM user_terms_acceptance uta
      JOIN terms_versions tv ON uta.terms_version_id = tv.id
      WHERE uta.user_id = ? AND uta.subscription_type = 'sites' AND tv.is_current = 1
      LIMIT 1
    `, [userId]);
    
    const termsAccepted = termsCheck.length > 0;
    
    // Get card on file (check any subscription for stripe_customer_id)
    let cardLast4 = null;
    const customerIdSource = subscription?.stripe_customer_id || 
      (await db.query(`
        SELECT stripe_customer_id FROM user_subscriptions 
        WHERE user_id = ? AND stripe_customer_id IS NOT NULL 
        LIMIT 1
      `, [userId]))[0]?.[0]?.stripe_customer_id;
    
    if (customerIdSource) {
      try {
        const paymentMethods = await stripeService.stripe.paymentMethods.list({
          customer: customerIdSource,
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
    
    // Check permission
    const [permissions] = await db.query(`
      SELECT sites FROM user_permissions WHERE user_id = ?
    `, [userId]);
    
    let hasPermission = permissions.length > 0 && permissions[0].sites === 1;
    
    // Auto-grant permission and activate subscription if all conditions met
    if (subscription && termsAccepted && cardLast4) {
      // Grant permission if not already granted
      if (!hasPermission) {
        await db.query(`
          INSERT INTO user_permissions (user_id, sites) 
          VALUES (?, 1) 
          ON DUPLICATE KEY UPDATE sites = 1
        `, [userId]);
        hasPermission = true;
      }
      
      // Activate subscription if incomplete
      if (subscription.status === 'incomplete') {
        await db.query(`
          UPDATE user_subscriptions 
          SET status = 'active' 
          WHERE id = ?
        `, [subscription.id]);
        subscription.status = 'active';
      }
    }
    
    res.json({
      subscription: {
        id: subscription?.id || null,
        status: subscription?.status || 'inactive',
        tier: subscription?.tier || null,
        tierPrice: subscription?.tier_price || null,
        termsAccepted: termsAccepted,
        cardLast4: cardLast4,
        application_status: 'approved'  // Websites are auto-approved
      },
      has_permission: hasPermission
    });
    
  } catch (error) {
    console.error('Error fetching websites subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
  }
});

/**
 * Select pricing tier (UNIVERSAL FLOW)
 * @route POST /api/subscriptions/websites/select-tier
 * @access Private
 * @returns {Object} Tier selection confirmation
 */
router.post('/select-tier', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { subscription_type, tier_name, tier_price } = req.body;
    
    if (!subscription_type || subscription_type !== 'websites') {
      return res.status(400).json({ success: false, error: 'Invalid subscription_type' });
    }
    
    // Check for existing subscription
    const [existing] = await db.query(`
      SELECT id FROM user_subscriptions 
      WHERE user_id = ? AND subscription_type = ?
      LIMIT 1
    `, [userId, subscription_type]);
    
    if (existing.length > 0) {
      // Update existing
      await db.query(`
        UPDATE user_subscriptions 
        SET tier = ?, tier_price = ?, status = 'incomplete'
        WHERE id = ?
      `, [tier_name, tier_price || 0, existing[0].id]);
      
      return res.json({ success: true, action: 'updated', subscription_id: existing[0].id });
    } else {
      // Create new
      const [result] = await db.query(`
        INSERT INTO user_subscriptions 
        (user_id, subscription_type, tier, tier_price, status)
        VALUES (?, ?, ?, ?, 'incomplete')
      `, [userId, subscription_type, tier_name, tier_price || 0]);
      
      return res.json({ success: true, action: 'created', subscription_id: result.insertId });
    }
    
  } catch (error) {
    console.error('Error selecting tier:', error);
    res.status(500).json({ success: false, error: 'Failed to select tier' });
  }
});

/**
 * Check if user has accepted the latest website terms
 * @route GET /api/subscriptions/websites/terms-check
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Terms acceptance status and latest terms details
 */
router.get('/terms-check', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get latest sites terms version
    const [latestTerms] = await db.query(`
      SELECT id, title, content, version, created_at
      FROM terms_versions 
      WHERE subscription_type = 'sites' AND is_current = 1
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (latestTerms.length === 0) {
      return res.status(404).json({ error: 'No sites terms found' });
    }

    const terms = latestTerms[0];

    // Check if user has accepted these terms
    const [acceptance] = await db.query(`
      SELECT id, accepted_at
      FROM user_terms_acceptance 
      WHERE user_id = ? AND subscription_type = 'sites' AND terms_version_id = ?
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
    console.error('Error checking sites terms acceptance:', error);
    res.status(500).json({ error: 'Failed to check terms acceptance' });
  }
});

/**
 * Record user acceptance of website terms
 * @route POST /api/subscriptions/websites/terms-accept
 * @access Private
 * @param {Object} req - Express request object
 * @param {number} req.body.terms_version_id - ID of the terms version being accepted
 * @param {Object} res - Express response object
 * @returns {Object} Confirmation of terms acceptance recording
 */
router.post('/terms-accept', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { terms_version_id } = req.body;

    if (!terms_version_id) {
      return res.status(400).json({ error: 'terms_version_id is required' });
    }

    // Verify the terms version exists and is for sites
    const [termsCheck] = await db.query(`
      SELECT id FROM terms_versions 
      WHERE id = ? AND subscription_type = 'sites'
    `, [terms_version_id]);

    if (termsCheck.length === 0) {
      return res.status(404).json({ error: 'Invalid terms version' });
    }

    // Record acceptance (INSERT IGNORE to handle duplicate attempts)
    await db.query(`
      INSERT IGNORE INTO user_terms_acceptance (user_id, subscription_type, terms_version_id, accepted_at)
      VALUES (?, 'sites', ?, NOW())
    `, [userId, terms_version_id]);

    res.json({
      success: true,
      message: 'Terms acceptance recorded successfully'
    });

  } catch (error) {
    console.error('Error recording sites terms acceptance:', error);
    res.status(500).json({ error: 'Failed to record terms acceptance' });
  }
});



/**
 * Create website subscription and grant sites permission
 * @route POST /api/subscriptions/websites/signup
 * @access Private
 * @deprecated Use universal flow (/select-tier + /my) instead
 * @param {Object} req - Express request object
 * @param {string} req.body.plan_name - Selected subscription plan name
 * @param {Array} req.body.permissions - Requested permissions array (DEPRECATED - now uses tier)
 * @param {Array} req.body.selected_addons - Selected addon IDs
 * @param {Object} req.body.pricing - Pricing details
 * @param {string} req.body.payment_method_id - Stripe payment method ID
 * @param {Object} req.body.auto_applied_discount - Applied discount details
 * @param {Object} res - Express response object
 * @returns {Object} Subscription creation confirmation with permissions
 */
router.post('/signup', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { 
      plan_name, 
      selected_addons, 
      pricing, 
      payment_method_id,
      auto_applied_discount
    } = req.body;

    if (!plan_name) {
      return res.status(400).json({ error: 'plan_name is required' });
    }

    // Validate plan name
    const validPlans = ['Starter Plan', 'Professional Plan', 'Business Plan', 'Promoter Plan', 'Promoter Business Plan'];
    if (!validPlans.includes(plan_name)) {
      return res.status(400).json({ error: 'Invalid plan name' });
    }

    // Check if user already has sites permission
    const [existingPermission] = await db.query(`
      SELECT sites FROM user_permissions WHERE user_id = ?
    `, [userId]);

    if (existingPermission.length > 0 && existingPermission[0].sites) {
      return res.status(400).json({ error: 'User already has active sites subscription' });
    }

    // TODO: Integrate with Stripe for payment processing
    // For now, we'll simulate successful payment and grant permissions

    // UNIVERSAL FLOW: Grant single 'sites' permission
    // Tier-based feature gating handled by checking user_subscriptions.tier
    if (existingPermission.length > 0) {
      await db.query(`
        UPDATE user_permissions SET sites = 1 WHERE user_id = ?
      `, [userId]);
    } else {
      await db.query(`
        INSERT INTO user_permissions (user_id, sites) VALUES (?, 1)
      `, [userId]);
    }

    // Process selected addons - separate user-level from site-level addons
    if (selected_addons && selected_addons.length > 0) {
      // Get addon details to determine which are user-level vs site-level
      const addonIds = selected_addons.join(',');
      const [addonDetails] = await db.query(`
        SELECT id, addon_slug, user_level, addon_name 
        FROM website_addons 
        WHERE id IN (${selected_addons.map(() => '?').join(',')}) AND is_active = 1
      `, selected_addons);

      // Activate user-level addons immediately
      const userLevelAddons = addonDetails.filter(addon => addon.user_level === 1);
      if (userLevelAddons.length > 0) {
        for (const addon of userLevelAddons) {
          await db.query(`
            INSERT INTO user_addons (user_id, addon_slug, subscription_source) 
            VALUES (?, ?, 'website_subscription')
            ON DUPLICATE KEY UPDATE 
              is_active = 1, 
              activated_at = CURRENT_TIMESTAMP,
              deactivated_at = NULL,
              subscription_source = 'website_subscription'
          `, [userId, addon.addon_slug]);
        }
      }

      // Store site-level addons for when user creates their first site
      const siteLevelAddons = addonDetails.filter(addon => addon.user_level === 0);
      if (siteLevelAddons.length > 0) {
        // TODO: Store in pending_site_addons table when implemented
        // For now, these will be applied when user creates their first site
      }
    }

    // Apply discount if provided
    if (auto_applied_discount) {
      // TODO: Store discount application in database
    }

    // Get updated user permissions for response
    const [updatedPermissions] = await db.query(`
      SELECT * FROM user_permissions WHERE user_id = ?
    `, [userId]);

    const permissions = [];
    if (updatedPermissions.length > 0) {
      const perms = updatedPermissions[0];
      if (perms.vendor) permissions.push('vendor');
      if (perms.events) permissions.push('events');
      if (perms.stripe_connect) permissions.push('stripe_connect');
      if (perms.manage_content) permissions.push('manage_content');
      if (perms.manage_system) permissions.push('manage_system');
      if (perms.verified) permissions.push('verified');
      if (perms.sites) permissions.push('sites');
      if (perms.shipping) permissions.push('shipping');
    }

    res.json({
      success: true,
      message: `Successfully subscribed to ${plan_name}. Feature access is controlled by tier: ${plan_name}`,
      subscription_id: `sites_${userId}_${Date.now()}`, // Temporary ID until Stripe integration
      permissions: permissions,
      tier: plan_name,  // NEW: Return tier for feature gating
      plan_name: plan_name,
      selected_addons: selected_addons || [],
      total_price: pricing?.total || 0,
      discount_applied: auto_applied_discount?.amount || 0
    });

  } catch (error) {
    console.error('Error creating sites subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

/**
 * Cancel website subscription and revoke sites permission
 * @route POST /api/subscriptions/websites/cancel
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Cancellation confirmation
 */
router.post('/cancel', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Check if user has sites permission
    const [existingPermission] = await db.query(`
      SELECT sites FROM user_permissions WHERE user_id = ?
    `, [userId]);

    if (existingPermission.length === 0 || !existingPermission[0].sites) {
      return res.status(400).json({ error: 'No active sites subscription found' });
    }

    // TODO: Cancel Stripe subscription when integrated

    // Revoke sites permission
    await db.query(`
      UPDATE user_permissions SET sites = 0 WHERE user_id = ?
    `, [userId]);

    res.json({
      success: true,
      message: 'Sites subscription cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling sites subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

/**
 * Get current website subscription status
 * @route GET /api/subscriptions/websites/status
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Subscription status with site count
 */
router.get('/status', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Check sites permission
    const [permission] = await db.query(`
      SELECT sites FROM user_permissions WHERE user_id = ?
    `, [userId]);

    const hasSubscription = permission.length > 0 && permission[0].sites;

    // If has subscription, get sites count
    let sitesCount = 0;
    if (hasSubscription) {
      const [sites] = await db.query(`
        SELECT COUNT(*) as count FROM sites WHERE user_id = ? AND status != 'deleted'
      `, [userId]);
      sitesCount = sites[0].count;
    }

    res.json({
      success: true,
      hasSubscription,
      sitesCount,
      status: hasSubscription ? 'active' : 'inactive'
    });

  } catch (error) {
    console.error('Error getting sites subscription status:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

/**
 * Cancel website subscription
 * @route POST /api/subscriptions/websites/cancel
 * @access Private
 * @description Marks subscription for cancellation at end of current period
 */
router.post('/cancel', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user's website subscription
    const [subscriptions] = await db.execute(`
      SELECT id, status, current_period_end, cancel_at_period_end 
      FROM user_subscriptions 
      WHERE user_id = ? AND subscription_type = 'websites'
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
