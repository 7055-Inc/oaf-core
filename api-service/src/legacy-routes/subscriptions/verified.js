const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const verifyToken = require('../../middleware/jwt');

/**
 * @fileoverview Verified subscription management routes
 * 
 * Handles verified artist subscription functionality including:
 * - Terms and conditions acceptance tracking
 * - Latest terms version retrieval
 * - User terms acceptance verification
 * - Terms acceptance recording with duplicate protection
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

// ============================================================================
// VERIFIED SUBSCRIPTION ROUTES (UNIVERSAL FLOW)
// ============================================================================
// Unified system for both Verified and Marketplace subscriptions
// - Verified tier ($50/year): verified permission only
// - Marketplace tier (free): verified + marketplace permissions
// - Single application table: marketplace_applications
// - Manual approval workflow grants permissions based on tier

/**
 * Get user's verified subscription status (UNIVERSAL FLOW)
 * @route GET /api/subscriptions/verified/my
 * @access Private
 * @returns {Object} Complete subscription status for checklist controller
 */
router.get('/my', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const stripeService = require('../../services/stripeService');
    
    // Get subscription record
    const [subscriptions] = await db.execute(`
      SELECT 
        us.id,
        us.status,
        us.tier,
        us.tier_price,
        us.stripe_customer_id,
        us.created_at
      FROM user_subscriptions us
      WHERE us.user_id = ? AND us.subscription_type = 'verified'
      LIMIT 1
    `, [userId]);
    
    const subscription = subscriptions[0] || null;
    
    // Check terms acceptance based on tier
    let termsAccepted = false;
    const userTier = subscription?.tier;
    
    if (userTier === 'Marketplace Seller') {
      // Marketplace needs BOTH marketplace and verification terms accepted
      const [marketplaceTerms] = await db.execute(`
        SELECT uta.id
        FROM user_terms_acceptance uta
        JOIN terms_versions tv ON uta.terms_version_id = tv.id
        WHERE uta.user_id = ? AND uta.subscription_type = 'marketplace' AND tv.is_current = 1
      `, [userId]);
      
      const [verificationTerms] = await db.execute(`
        SELECT uta.id
        FROM user_terms_acceptance uta
        JOIN terms_versions tv ON uta.terms_version_id = tv.id
        WHERE uta.user_id = ? AND uta.subscription_type = 'verified' AND tv.is_current = 1
      `, [userId]);
      
      termsAccepted = marketplaceTerms.length > 0 && verificationTerms.length > 0;
    } else if (userTier === 'Verified Artist') {
      // Verified needs only verification terms
      const [verificationTerms] = await db.execute(`
        SELECT uta.id
        FROM user_terms_acceptance uta
        JOIN terms_versions tv ON uta.terms_version_id = tv.id
        WHERE uta.user_id = ? AND uta.subscription_type = 'verified' AND tv.is_current = 1
      `, [userId]);
      
      termsAccepted = verificationTerms.length > 0;
    }
    
    // Get card on file
    let cardLast4 = null;
    const customerIdSource = subscription?.stripe_customer_id || 
      (await db.execute(`
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
    
    // Check application status from marketplace_applications
    let applicationStatus = null;
    const [application] = await db.execute(`
      SELECT 
        marketplace_status,
        verification_status,
        created_at
      FROM marketplace_applications
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);
    
    if (application.length > 0) {
      const app = application[0];
      // Check which status to use based on tier
      if (subscription?.tier === 'Marketplace Seller') {
        applicationStatus = app.marketplace_status;
      } else if (subscription?.tier === 'Verified Artist') {
        applicationStatus = app.verification_status;
      } else {
        // No tier selected yet - check both (if either approved, show approved)
        applicationStatus = (app.marketplace_status === 'approved' || app.verification_status === 'approved') 
          ? 'approved' 
          : (app.marketplace_status || app.verification_status);
      }
    }
    
    // Check permissions
    const [permissions] = await db.execute(`
      SELECT verified, marketplace FROM user_permissions WHERE user_id = ?
    `, [userId]);
    
    let hasPermission = permissions.length > 0 && permissions[0].verified === 1;
    
    // Auto-grant permissions if application approved
    if (subscription && termsAccepted && cardLast4 && applicationStatus === 'approved') {
      const tier = subscription.tier;
      
      if (tier === 'Marketplace Seller') {
        // Grant both verified and marketplace
        await db.execute(`
          INSERT INTO user_permissions (user_id, verified, marketplace) 
          VALUES (?, 1, 1) 
          ON DUPLICATE KEY UPDATE verified = 1, marketplace = 1
        `, [userId]);
        hasPermission = true;
      } else if (tier === 'Verified Artist') {
        // Grant only verified
        await db.execute(`
          INSERT INTO user_permissions (user_id, verified) 
          VALUES (?, 1) 
          ON DUPLICATE KEY UPDATE verified = 1
        `, [userId]);
        hasPermission = true;
      }
      
      // Activate subscription if incomplete
      if (subscription.status === 'incomplete') {
        await db.execute(`
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
        application_status: applicationStatus
      },
      has_permission: hasPermission
    });
    
  } catch (error) {
    console.error('Error fetching verified subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
  }
});

/**
 * Select pricing tier (UNIVERSAL FLOW)
 * @route POST /api/subscriptions/verified/select-tier
 * @access Private
 * @returns {Object} Tier selection confirmation
 */
router.post('/select-tier', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { subscription_type, tier_name, tier_price } = req.body;
    
    // Use 'verified' to match database enum
    const normalizedType = 'verified';
    
    if (!subscription_type) {
      return res.status(400).json({ success: false, error: 'subscription_type is required' });
    }
    
    // Validate tier
    const validTiers = ['Marketplace Seller', 'Verified Artist'];
    if (!validTiers.includes(tier_name)) {
      return res.status(400).json({ success: false, error: 'Invalid tier' });
    }
    
    // Check for existing subscription
    const [existing] = await db.execute(`
      SELECT id FROM user_subscriptions 
      WHERE user_id = ? AND subscription_type = ?
      LIMIT 1
    `, [userId, normalizedType]);
    
    if (existing.length > 0) {
      // Update existing
      await db.execute(`
        UPDATE user_subscriptions 
        SET tier = ?, tier_price = ?, status = 'incomplete'
        WHERE id = ?
      `, [tier_name, tier_price || 0, existing[0].id]);
      
      return res.json({ success: true, action: 'updated', subscription_id: existing[0].id });
    } else {
      // Create new
      const [result] = await db.execute(`
        INSERT INTO user_subscriptions 
        (user_id, subscription_type, tier, tier_price, status)
        VALUES (?, ?, ?, ?, 'incomplete')
      `, [userId, normalizedType, tier_name, tier_price || 0]);
      
      return res.json({ success: true, action: 'created', subscription_id: result.insertId });
    }
    
  } catch (error) {
    console.error('Error selecting tier:', error);
    res.status(500).json({ success: false, error: 'Failed to select tier' });
  }
});

/**
 * Check if user has accepted the latest verified/marketplace terms
 * @route GET /api/subscriptions/verified/terms-check?tier_context=<tier_name>
 * @access Private
 * @query tier_context - Optional: Which tier context to check ("Verified Artist" or "Marketplace Seller")
 * @returns {Object} Terms acceptance status and terms to accept
 * 
 * Logic:
 * - If tier_context provided, use that to determine terms
 * - Otherwise fall back to saved tier in database
 * - Verified Artist tier → needs 'verified' terms only
 * - Marketplace Seller tier → needs BOTH 'marketplace' AND 'verified' terms
 */
router.get('/terms-check', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const tierContext = req.query.tier_context; // Hint from frontend about which page they're on
    
    // Check user's selected tier from DB
    const [subscription] = await db.execute(`
      SELECT tier FROM user_subscriptions 
      WHERE user_id = ? AND subscription_type = 'verified'
      LIMIT 1
    `, [userId]);
    
    // Use tierContext if provided (frontend knows which page user is on)
    // Otherwise use saved tier from database
    const userTier = tierContext || subscription[0]?.tier;
    
    // Determine which terms are needed based on tier
    let requiredTermsTypes = [];
    if (userTier === 'Marketplace Seller') {
      // Marketplace needs BOTH marketplace and verification terms
      requiredTermsTypes = ['marketplace', 'verified'];
    } else if (userTier === 'Verified Artist') {
      // Verified Artist needs ONLY verification terms
      requiredTermsTypes = ['verified'];
    } else {
      // No tier selected yet - default to verification only
      requiredTermsTypes = ['verified'];
    }
    
    // Get all required terms
    const placeholders = requiredTermsTypes.map(() => '?').join(',');
    const [allTerms] = await db.execute(`
      SELECT id, subscription_type, title, content, version, created_at
      FROM terms_versions 
      WHERE subscription_type IN (${placeholders}) AND is_current = 1
      ORDER BY subscription_type
    `, requiredTermsTypes);
    
    if (allTerms.length === 0) {
      return res.status(404).json({ 
        error: 'No terms found',
        details: `Required terms types: ${requiredTermsTypes.join(', ')}`
      });
    }
    
    // Check acceptance for each required term
    const termsWithAcceptance = [];
    let allAccepted = true;
    
    for (const term of allTerms) {
    const [acceptance] = await db.execute(`
      SELECT id, accepted_at
      FROM user_terms_acceptance 
        WHERE user_id = ? AND subscription_type = ? AND terms_version_id = ?
      `, [userId, term.subscription_type, term.id]);
      
      const isAccepted = acceptance.length > 0;
      if (!isAccepted) allAccepted = false;
      
      termsWithAcceptance.push({
        id: term.id,
        subscription_type: term.subscription_type,
        title: term.title,
        content: term.content,
        version: term.version,
        created_at: term.created_at,
        accepted: isAccepted,
        accepted_at: acceptance[0]?.accepted_at || null
      });
    }

    res.json({
      success: true,
      termsAccepted: allAccepted,
      terms: termsWithAcceptance,
      tier: userTier || null
    });

  } catch (error) {
    console.error('Error checking verified terms acceptance:', error);
    res.status(500).json({ error: 'Failed to check terms acceptance' });
  }
});

/**
 * Record user acceptance of verified/marketplace terms
 * @route POST /api/subscriptions/verified/terms-accept
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

    // Get the terms version to determine subscription type
    const [termsCheck] = await db.execute(`
      SELECT id, subscription_type FROM terms_versions 
      WHERE id = ? AND subscription_type IN ('verified', 'marketplace')
    `, [terms_version_id]);

    if (termsCheck.length === 0) {
      return res.status(404).json({ error: 'Invalid terms version' });
    }
    
    const subscriptionType = termsCheck[0].subscription_type;

    // Record acceptance (INSERT IGNORE to handle duplicate attempts)
    await db.execute(`
      INSERT IGNORE INTO user_terms_acceptance (user_id, subscription_type, terms_version_id, accepted_at)
      VALUES (?, ?, ?, NOW())
    `, [userId, subscriptionType, terms_version_id]);

    res.json({
      success: true,
      message: 'Terms acceptance recorded successfully'
    });

  } catch (error) {
    console.error('Error recording verified terms acceptance:', error);
    res.status(500).json({ error: 'Failed to record terms acceptance' });
  }
});

/**
 * Submit application for verification/marketplace
 * @route POST /api/subscriptions/verified/marketplace-applications/submit
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} req.body - Application data (work_description, media IDs, etc)
 * @param {Object} res - Express response object
 * @returns {Object} Application submission confirmation
 */
router.post('/marketplace-applications/submit', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      work_description,
      additional_info,
      raw_materials_media_id,
      work_process_1_media_id,
      work_process_2_media_id,
      work_process_3_media_id,
      artist_at_work_media_id,
      booth_display_media_id,
      artist_working_video_media_id,
      artist_bio_video_media_id
    } = req.body;

    if (!work_description) {
      return res.status(400).json({ error: 'work_description is required' });
    }

    // Check if user already has an application
    const [existing] = await db.execute(`
      SELECT id FROM marketplace_applications WHERE user_id = ?
    `, [userId]);

    if (existing.length > 0) {
      // Update existing application
      await db.execute(`
        UPDATE marketplace_applications 
        SET 
          work_description = ?,
          additional_info = ?,
          raw_materials_media_id = ?,
          work_process_1_media_id = ?,
          work_process_2_media_id = ?,
          work_process_3_media_id = ?,
          artist_at_work_media_id = ?,
          booth_display_media_id = ?,
          artist_working_video_media_id = ?,
          artist_bio_video_media_id = ?,
          marketplace_status = 'pending',
          verification_status = 'pending',
          updated_at = NOW()
        WHERE user_id = ?
      `, [
        work_description,
        additional_info || null,
        raw_materials_media_id || null,
        work_process_1_media_id || null,
        work_process_2_media_id || null,
        work_process_3_media_id || null,
        artist_at_work_media_id || null,
        booth_display_media_id || null,
        artist_working_video_media_id || null,
        artist_bio_video_media_id || null,
        userId
      ]);

      return res.json({
        success: true,
        message: 'Application updated successfully',
        application_id: existing[0].id,
        status: 'pending'
      });
    } else {
      // Create new application
      const [result] = await db.execute(`
        INSERT INTO marketplace_applications (
          user_id,
          work_description,
          additional_info,
          raw_materials_media_id,
          work_process_1_media_id,
          work_process_2_media_id,
          work_process_3_media_id,
          artist_at_work_media_id,
          booth_display_media_id,
          artist_working_video_media_id,
          artist_bio_video_media_id,
          marketplace_status,
          verification_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
      `, [
        userId,
        work_description,
        additional_info || null,
        raw_materials_media_id || null,
        work_process_1_media_id || null,
        work_process_2_media_id || null,
        work_process_3_media_id || null,
        artist_at_work_media_id || null,
        booth_display_media_id || null,
        artist_working_video_media_id || null,
        artist_bio_video_media_id || null
      ]);

      return res.json({
        success: true,
        message: 'Application submitted successfully',
        application_id: result.insertId,
        status: 'pending'
      });
    }

  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

/**
 * Cancel verification subscription (works for both Verified and Marketplace)
 * @route POST /api/subscriptions/verified/cancel
 * @access Private
 * @description Marks subscription for cancellation at end of current period
 */
router.post('/cancel', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user's verification subscription
    const [subscriptions] = await db.execute(`
      SELECT id, status, current_period_end, cancel_at_period_end, tier 
      FROM user_subscriptions 
      WHERE user_id = ? AND subscription_type = 'verified'
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

    const tierName = subscription.tier || 'verified';
    res.json({
      success: true,
      message: `Your ${tierName} subscription will be canceled at the end of your billing period`,
      cancelAt: subscription.current_period_end,
      note: 'You will retain access until ' + (subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'the end of your billing period')
    });

  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

module.exports = router;
