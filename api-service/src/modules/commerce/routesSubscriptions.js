/**
 * Subscription Routes (Verified, Shipping, Marketplace)
 * Mounted at /subscriptions within commerce module
 * Full path: /api/v2/commerce/subscriptions/...
 *
 * ChecklistController uses: ${base}/subscription/my, /subscription/select-tier, etc.
 * Direct callers use: /verified/my, /verified/terms-check, etc.
 * Both patterns are supported via Express array routes.
 */

const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const { requireAuth } = require('../auth/middleware');

// ============================================================================
// VERIFIED SUBSCRIPTION
// ============================================================================

router.get(['/verified/subscription/my', '/verified/my'], requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const stripeService = require('../../services/stripeService');

    const [subscriptions] = await db.execute(
      `SELECT id, status, tier, tier_price, stripe_customer_id, created_at
       FROM user_subscriptions WHERE user_id = ? AND subscription_type = 'verified' LIMIT 1`, [userId]);
    const subscription = subscriptions[0] || null;

    let termsAccepted = false;
    const userTier = subscription?.tier;
    if (userTier === 'Marketplace Seller') {
      const [mt] = await db.execute(`SELECT uta.id FROM user_terms_acceptance uta JOIN terms_versions tv ON uta.terms_version_id = tv.id WHERE uta.user_id = ? AND uta.subscription_type = 'marketplace' AND tv.is_current = 1`, [userId]);
      const [vt] = await db.execute(`SELECT uta.id FROM user_terms_acceptance uta JOIN terms_versions tv ON uta.terms_version_id = tv.id WHERE uta.user_id = ? AND uta.subscription_type = 'verified' AND tv.is_current = 1`, [userId]);
      termsAccepted = mt.length > 0 && vt.length > 0;
    } else if (userTier === 'Verified Artist') {
      const [vt] = await db.execute(`SELECT uta.id FROM user_terms_acceptance uta JOIN terms_versions tv ON uta.terms_version_id = tv.id WHERE uta.user_id = ? AND uta.subscription_type = 'verified' AND tv.is_current = 1`, [userId]);
      termsAccepted = vt.length > 0;
    }

    let cardLast4 = null;
    const customerIdSource = subscription?.stripe_customer_id ||
      (await db.execute(`SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = ? AND stripe_customer_id IS NOT NULL LIMIT 1`, [userId]))[0]?.[0]?.stripe_customer_id;
    if (customerIdSource) {
      try {
        const pm = await stripeService.stripe.paymentMethods.list({ customer: customerIdSource, type: 'card', limit: 1 });
        if (pm.data.length > 0) cardLast4 = pm.data[0].card.last4;
      } catch (e) { console.error('Error fetching payment method:', e); }
    }

    let applicationStatus = null;
    const [application] = await db.execute(`SELECT marketplace_status, verification_status, created_at FROM marketplace_applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`, [userId]);
    if (application.length > 0) {
      const app = application[0];
      if (subscription?.tier === 'Marketplace Seller') applicationStatus = app.marketplace_status;
      else if (subscription?.tier === 'Verified Artist') applicationStatus = app.verification_status;
      else applicationStatus = (app.marketplace_status === 'approved' || app.verification_status === 'approved') ? 'approved' : (app.marketplace_status || app.verification_status);
    }

    const [permissions] = await db.execute(`SELECT verified, marketplace FROM user_permissions WHERE user_id = ?`, [userId]);
    let hasPermission = permissions.length > 0 && permissions[0].verified === 1;

    if (subscription && termsAccepted && cardLast4 && applicationStatus === 'approved') {
      const tier = subscription.tier;
      if (tier === 'Marketplace Seller') {
        await db.execute(`INSERT INTO user_permissions (user_id, verified, marketplace) VALUES (?, 1, 1) ON DUPLICATE KEY UPDATE verified = 1, marketplace = 1`, [userId]);
        hasPermission = true;
      } else if (tier === 'Verified Artist') {
        await db.execute(`INSERT INTO user_permissions (user_id, verified) VALUES (?, 1) ON DUPLICATE KEY UPDATE verified = 1`, [userId]);
        hasPermission = true;
      }
      if (subscription.status === 'incomplete') {
        await db.execute(`UPDATE user_subscriptions SET status = 'active' WHERE id = ?`, [subscription.id]);
        subscription.status = 'active';
      }
    }

    res.json({
      subscription: {
        id: subscription?.id || null, status: subscription?.status || 'inactive',
        tier: subscription?.tier || null, tierPrice: subscription?.tier_price || null,
        termsAccepted, cardLast4, application_status: applicationStatus
      },
      has_permission: hasPermission
    });
  } catch (error) {
    console.error('Error fetching verified subscription:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch subscription' });
  }
});

router.post('/verified/subscription/select-tier', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { subscription_type, tier_name, tier_price } = req.body;
    if (!subscription_type) return res.status(400).json({ success: false, error: 'subscription_type is required' });

    const validTiers = ['Marketplace Seller', 'Verified Artist'];
    if (!validTiers.includes(tier_name)) return res.status(400).json({ success: false, error: 'Invalid tier' });

    const [existing] = await db.execute(`SELECT id FROM user_subscriptions WHERE user_id = ? AND subscription_type = 'verified' LIMIT 1`, [userId]);
    if (existing.length > 0) {
      await db.execute(`UPDATE user_subscriptions SET tier = ?, tier_price = ?, status = 'incomplete' WHERE id = ?`, [tier_name, tier_price || 0, existing[0].id]);
      return res.json({ success: true, action: 'updated', subscription_id: existing[0].id });
    }
    const [result] = await db.execute(`INSERT INTO user_subscriptions (user_id, subscription_type, tier, tier_price, status) VALUES (?, 'verified', ?, ?, 'incomplete')`, [userId, tier_name, tier_price || 0]);
    res.json({ success: true, action: 'created', subscription_id: result.insertId });
  } catch (error) {
    console.error('Error selecting tier:', error);
    res.status(500).json({ success: false, error: 'Failed to select tier' });
  }
});

router.get(['/verified/subscription/terms-check', '/verified/terms-check'], requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const tierContext = req.query.tier_context;
    const [subscription] = await db.execute(`SELECT tier FROM user_subscriptions WHERE user_id = ? AND subscription_type = 'verified' LIMIT 1`, [userId]);
    const userTier = tierContext || subscription[0]?.tier;

    let requiredTermsTypes = ['verified'];
    if (userTier === 'Marketplace Seller') requiredTermsTypes = ['marketplace', 'verified'];

    const placeholders = requiredTermsTypes.map(() => '?').join(',');
    const [allTerms] = await db.execute(`SELECT id, subscription_type, title, content, version, created_at FROM terms_versions WHERE subscription_type IN (${placeholders}) AND is_current = 1 ORDER BY subscription_type`, requiredTermsTypes);
    if (allTerms.length === 0) return res.status(404).json({ error: 'No terms found' });

    const termsWithAcceptance = [];
    let allAccepted = true;
    for (const term of allTerms) {
      const [acceptance] = await db.execute(`SELECT id, accepted_at FROM user_terms_acceptance WHERE user_id = ? AND subscription_type = ? AND terms_version_id = ?`, [userId, term.subscription_type, term.id]);
      const isAccepted = acceptance.length > 0;
      if (!isAccepted) allAccepted = false;
      termsWithAcceptance.push({ id: term.id, subscription_type: term.subscription_type, title: term.title, content: term.content, version: term.version, created_at: term.created_at, accepted: isAccepted, accepted_at: acceptance[0]?.accepted_at || null });
    }
    res.json({ success: true, termsAccepted: allAccepted, terms: termsWithAcceptance, latestTerms: termsWithAcceptance[0] || null, tier: userTier || null });
  } catch (error) {
    console.error('Error checking verified terms:', error);
    res.status(500).json({ error: 'Failed to check terms acceptance' });
  }
});

router.post(['/verified/subscription/terms-accept', '/verified/terms-accept'], requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { terms_version_id } = req.body;
    if (!terms_version_id) return res.status(400).json({ error: 'terms_version_id is required' });

    const [termsCheck] = await db.execute(`SELECT id, subscription_type FROM terms_versions WHERE id = ? AND subscription_type IN ('verified', 'marketplace')`, [terms_version_id]);
    if (termsCheck.length === 0) return res.status(404).json({ error: 'Invalid terms version' });

    await db.execute(`INSERT IGNORE INTO user_terms_acceptance (user_id, subscription_type, terms_version_id, accepted_at) VALUES (?, ?, ?, NOW())`, [userId, termsCheck[0].subscription_type, terms_version_id]);
    res.json({ success: true, message: 'Terms acceptance recorded successfully' });
  } catch (error) {
    console.error('Error recording terms acceptance:', error);
    res.status(500).json({ error: 'Failed to record terms acceptance' });
  }
});

router.post('/verified/subscription/cancel', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const [subscriptions] = await db.execute(`SELECT id, status, current_period_end, cancel_at_period_end, tier FROM user_subscriptions WHERE user_id = ? AND subscription_type = 'verified' LIMIT 1`, [userId]);
    if (subscriptions.length === 0) return res.status(404).json({ error: 'No active subscription found' });

    const sub = subscriptions[0];
    if (sub.cancel_at_period_end === 1) return res.json({ success: true, message: 'Subscription is already set to cancel', cancelAt: sub.current_period_end });

    await db.execute(`UPDATE user_subscriptions SET cancel_at_period_end = 1, canceled_at = NOW() WHERE id = ?`, [sub.id]);
    res.json({ success: true, message: `Your ${sub.tier || 'verified'} subscription will be canceled at the end of your billing period`, cancelAt: sub.current_period_end });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

router.get('/verified/marketplace-applications', requireAuth, async (req, res) => {
  try {
    const [apps] = await db.execute(`SELECT id, user_id, work_description, marketplace_status, verification_status, created_at, updated_at FROM marketplace_applications WHERE user_id = ? ORDER BY created_at DESC`, [req.userId]);
    res.json(apps);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

router.post(['/verified/marketplace-applications/submit', '/verified/marketplace-applications/:id/submit'], requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { work_description, additional_info, raw_materials_media_id, work_process_1_media_id, work_process_2_media_id, work_process_3_media_id, artist_at_work_media_id, booth_display_media_id, artist_working_video_media_id, artist_bio_video_media_id } = req.body;
    if (!work_description) return res.status(400).json({ error: 'work_description is required' });

    const [existing] = await db.execute(`SELECT id FROM marketplace_applications WHERE user_id = ?`, [userId]);
    const mediaParams = [work_description, additional_info || null, raw_materials_media_id || null, work_process_1_media_id || null, work_process_2_media_id || null, work_process_3_media_id || null, artist_at_work_media_id || null, booth_display_media_id || null, artist_working_video_media_id || null, artist_bio_video_media_id || null];

    if (existing.length > 0) {
      await db.execute(`UPDATE marketplace_applications SET work_description = ?, additional_info = ?, raw_materials_media_id = ?, work_process_1_media_id = ?, work_process_2_media_id = ?, work_process_3_media_id = ?, artist_at_work_media_id = ?, booth_display_media_id = ?, artist_working_video_media_id = ?, artist_bio_video_media_id = ?, marketplace_status = 'pending', verification_status = 'pending', updated_at = NOW() WHERE user_id = ?`, [...mediaParams, userId]);
      return res.json({ success: true, message: 'Application updated successfully', id: existing[0].id, application_id: existing[0].id, status: 'pending' });
    }
    const [result] = await db.execute(`INSERT INTO marketplace_applications (user_id, work_description, additional_info, raw_materials_media_id, work_process_1_media_id, work_process_2_media_id, work_process_3_media_id, artist_at_work_media_id, booth_display_media_id, artist_working_video_media_id, artist_bio_video_media_id, marketplace_status, verification_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')`, [userId, ...mediaParams]);
    res.json({ success: true, message: 'Application submitted successfully', id: result.insertId, application_id: result.insertId, status: 'pending' });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// ============================================================================
// SHIPPING SUBSCRIPTION
// ============================================================================

router.get(['/shipping/subscription/my', '/shipping/my'], requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const stripeService = require('../../services/stripeService');

    const [termsAcceptance] = await db.query(`SELECT uta.id, uta.accepted_at FROM user_terms_acceptance uta JOIN terms_versions tv ON uta.terms_version_id = tv.id WHERE uta.user_id = ? AND uta.subscription_type = 'shipping_labels' AND tv.is_current = TRUE`, [userId]);
    const hasAcceptedTerms = termsAcceptance.length > 0;

    if (hasAcceptedTerms) {
      const [anySub] = await db.query(`SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = ? AND stripe_customer_id IS NOT NULL LIMIT 1`, [userId]);
      if (anySub.length > 0) {
        await db.query(`INSERT INTO user_permissions (user_id, shipping) VALUES (?, 1) ON DUPLICATE KEY UPDATE shipping = 1`, [userId]);
        await db.query(`UPDATE user_subscriptions SET status = 'active' WHERE user_id = ? AND subscription_type = 'shipping_labels' AND status = 'incomplete'`, [userId]);
      }
    }

    const [subscriptions] = await db.query(`SELECT us.*, up.shipping as has_permission FROM user_subscriptions us LEFT JOIN user_permissions up ON us.user_id = up.user_id WHERE us.user_id = ? AND us.subscription_type = 'shipping_labels' AND us.status = 'active' ORDER BY us.created_at DESC LIMIT 1`, [userId]);

    if (subscriptions.length === 0) {
      const [permissions] = await db.query('SELECT shipping FROM user_permissions WHERE user_id = ?', [userId]);
      let cardLast4 = null;
      const [anyCustomer] = await db.query(`SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = ? AND stripe_customer_id IS NOT NULL LIMIT 1`, [userId]);
      if (anyCustomer.length > 0) {
        try { const pm = await stripeService.stripe.paymentMethods.list({ customer: anyCustomer[0].stripe_customer_id, type: 'card', limit: 1 }); if (pm.data.length > 0) cardLast4 = pm.data[0].card.last4; } catch (e) { console.error('Error fetching payment method:', e); }
      }
      return res.json({ subscription: { id: null, status: 'inactive', tier: null, tierPrice: null, cardLast4, preferConnectBalance: false, hasStripeConnect: req.permissions?.includes('stripe_connect'), termsAccepted: hasAcceptedTerms, termsAcceptedAt: termsAcceptance[0]?.accepted_at || null, createdAt: null }, has_permission: permissions.length > 0 && permissions[0].shipping === 1, connect_balance: { available: 0, pending: 0 } });
    }

    const subscription = subscriptions[0];
    let connectBalance = { available: 0, pending: 0 };
    if (req.permissions?.includes('stripe_connect')) { try { connectBalance = await stripeService.getConnectAccountBalance(userId); } catch (e) { connectBalance = { available: 0, pending: 0 }; } }

    let cardLast4 = null;
    if (subscription.stripe_customer_id) {
      try { const pm = await stripeService.stripe.paymentMethods.list({ customer: subscription.stripe_customer_id, type: 'card', limit: 1 }); if (pm.data.length > 0) cardLast4 = pm.data[0].card.last4; } catch (e) { console.error('Error fetching payment method:', e); }
    }

    res.json({
      subscription: { id: subscription.id, status: subscription.status, tier: subscription.tier, tierPrice: subscription.tier_price, cardLast4, preferConnectBalance: subscription.prefer_connect_balance, hasStripeConnect: req.permissions?.includes('stripe_connect'), termsAccepted: hasAcceptedTerms, termsAcceptedAt: termsAcceptance[0]?.accepted_at || null, createdAt: subscription.created_at },
      has_permission: subscription.has_permission === 1,
      connect_balance: connectBalance
    });
  } catch (error) {
    console.error('Error fetching shipping subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription data' });
  }
});

router.post('/shipping/subscription/select-tier', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { subscription_type, tier_name, tier_price } = req.body;
    if (!subscription_type) return res.status(400).json({ success: false, error: 'subscription_type is required' });

    const [existing] = await db.query(`SELECT id, tier, stripe_customer_id FROM user_subscriptions WHERE user_id = ? AND subscription_type = ? LIMIT 1`, [userId, subscription_type]);
    if (existing.length > 0) {
      await db.query(`UPDATE user_subscriptions SET tier = ?, tier_price = ? WHERE id = ?`, [tier_name || subscription_type, tier_price || 0, existing[0].id]);
      return res.json({ success: true, message: 'Tier updated successfully', subscription_id: existing[0].id, action: 'updated' });
    }
    const [result] = await db.query(`INSERT INTO user_subscriptions (user_id, subscription_type, tier, tier_price, status) VALUES (?, ?, ?, ?, 'incomplete')`, [userId, subscription_type, tier_name || subscription_type, tier_price || 0]);
    res.json({ success: true, message: 'Tier selected successfully', subscription_id: result.insertId, action: 'created' });
  } catch (error) {
    console.error('Error selecting tier:', error);
    res.status(500).json({ success: false, error: 'Failed to select tier' });
  }
});

router.get('/shipping/subscription/terms-check', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const [latestTerms] = await db.query(`SELECT id, title, content, version, created_at FROM terms_versions WHERE subscription_type = 'shipping_labels' AND is_current = 1 ORDER BY created_at DESC LIMIT 1`);
    if (latestTerms.length === 0) return res.status(404).json({ error: 'No shipping terms found' });
    const terms = latestTerms[0];
    const [acceptance] = await db.query(`SELECT id, accepted_at FROM user_terms_acceptance WHERE user_id = ? AND subscription_type = 'shipping_labels' AND terms_version_id = ?`, [userId, terms.id]);
    const termsAccepted = acceptance.length > 0;
    res.json({ success: true, termsAccepted, latestTerms: { id: terms.id, title: terms.title, content: terms.content, version: terms.version, created_at: terms.created_at }, terms: [{ id: terms.id, subscription_type: 'shipping_labels', title: terms.title, content: terms.content, version: terms.version, created_at: terms.created_at, accepted: termsAccepted }] });
  } catch (error) {
    console.error('Error checking shipping terms:', error);
    res.status(500).json({ error: 'Failed to check terms acceptance' });
  }
});

router.post('/shipping/subscription/terms-accept', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const { terms_version_id, ip_address, user_agent } = req.body;
    const stripeService = require('../../services/stripeService');

    let termsVersionId = terms_version_id;
    if (!termsVersionId) {
      const [currentTerms] = await db.query(`SELECT id FROM terms_versions WHERE is_current = TRUE AND subscription_type = 'shipping_labels' ORDER BY created_at DESC LIMIT 1`);
      if (currentTerms.length === 0) return res.status(400).json({ error: 'No current shipping terms found' });
      termsVersionId = currentTerms[0].id;
    }

    const [existing] = await db.query(`SELECT id, accepted_at FROM user_terms_acceptance WHERE user_id = ? AND subscription_type = 'shipping_labels' AND terms_version_id = ?`, [userId, termsVersionId]);
    if (existing.length > 0) return res.json({ success: true, message: 'Terms already accepted', accepted_at: existing[0].accepted_at });

    await db.query(`INSERT INTO user_terms_acceptance (user_id, subscription_type, terms_version_id, accepted_at, ip_address, user_agent) VALUES (?, 'shipping_labels', ?, CURRENT_TIMESTAMP, ?, ?)`, [userId, termsVersionId, ip_address || null, user_agent || null]);

    let activated = false;
    const [subscriptions] = await db.query(`SELECT id, stripe_customer_id FROM user_subscriptions WHERE user_id = ? AND subscription_type = 'shipping_labels' AND status = 'incomplete'`, [userId]);
    if (subscriptions.length > 0 && subscriptions[0].stripe_customer_id) {
      try {
        const pm = await stripeService.stripe.paymentMethods.list({ customer: subscriptions[0].stripe_customer_id, type: 'card', limit: 1 });
        if (pm.data.length > 0) {
          await db.query('START TRANSACTION');
          try {
            await db.query('UPDATE user_subscriptions SET status = "active" WHERE id = ?', [subscriptions[0].id]);
            await db.query(`INSERT INTO user_permissions (user_id, shipping) VALUES (?, 1) ON DUPLICATE KEY UPDATE shipping = 1`, [userId]);
            await db.query('COMMIT');
            activated = true;
          } catch (e) { await db.query('ROLLBACK'); throw e; }
        }
      } catch (e) { console.error('Error checking payment methods:', e); }
    }
    res.json({ success: true, message: 'Shipping terms accepted successfully', activated, terms_version_id: termsVersionId });
  } catch (error) {
    console.error('Error accepting shipping terms:', error);
    res.status(500).json({ error: 'Failed to accept terms' });
  }
});

router.post(['/shipping/subscription/cancel', '/shipping/cancel'], requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const [subscriptions] = await db.execute(`SELECT id, status, current_period_end, cancel_at_period_end FROM user_subscriptions WHERE user_id = ? AND subscription_type = 'shipping_labels' LIMIT 1`, [userId]);
    if (subscriptions.length === 0) return res.status(404).json({ error: 'No active subscription found' });
    const sub = subscriptions[0];
    if (sub.cancel_at_period_end === 1) return res.json({ success: true, message: 'Subscription is already set to cancel', cancelAt: sub.current_period_end });
    await db.execute(`UPDATE user_subscriptions SET cancel_at_period_end = 1, canceled_at = NOW() WHERE id = ?`, [sub.id]);
    res.json({ success: true, message: 'Subscription will be canceled at the end of your billing period', cancelAt: sub.current_period_end });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

router.get('/shipping/vendor-address', requireAuth, async (req, res) => {
  try {
    const [vendorSettings] = await db.query(`SELECT return_company_name as name, return_address_line_1 as street, return_address_line_2 as address_line_2, return_city as city, return_state as state, return_postal_code as zip, return_country as country, return_phone as phone FROM vendor_ship_settings WHERE vendor_id = ?`, [req.userId]);
    if (vendorSettings.length === 0) return res.json({ success: true, has_vendor_address: false, address: null });
    const s = vendorSettings[0];
    const isComplete = s.name && s.street && s.city && s.state && s.zip && s.country;
    res.json({ success: true, has_vendor_address: true, address: isComplete ? s : null, incomplete_address: !isComplete ? s : null });
  } catch (error) {
    console.error('Error fetching vendor address:', error);
    res.status(500).json({ error: 'Failed to fetch vendor address' });
  }
});

router.put('/shipping/preferences', requireAuth, async (req, res) => {
  try {
    const { preferConnectBalance } = req.body;
    const allowConnect = req.permissions?.includes('stripe_connect') ? preferConnectBalance : false;
    const [result] = await db.query(`UPDATE user_subscriptions SET prefer_connect_balance = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND subscription_type = 'shipping_labels'`, [allowConnect ? 1 : 0, req.userId]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Shipping subscription not found' });
    res.json({ success: true, message: 'Preferences updated successfully', prefer_connect_balance: allowConnect });
  } catch (error) {
    console.error('Error updating shipping preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

router.get('/shipping/standalone-labels', requireAuth, async (req, res) => {
  try {
    const [labels] = await db.query(`SELECT sl.id as db_id, 'standalone' as type, sl.label_id, sl.tracking_number, sl.label_file_path, sl.service_name, sl.cost, sl.status, sl.created_at, 'N/A' as customer_name, 'Standalone Label' as product_name, 1 as quantity FROM standalone_shipping_labels sl WHERE sl.user_id = ? ORDER BY sl.created_at DESC`, [req.userId]);
    res.json({ success: true, labels });
  } catch (error) {
    console.error('Error fetching standalone labels:', error);
    res.status(500).json({ error: 'Failed to fetch standalone labels' });
  }
});

router.post('/shipping/create-standalone-label', requireAuth, async (req, res) => {
  try {
    const userId = req.userId;
    const stripeService = require('../../services/stripeService');
    const { shipper_address, recipient_address, packages, selected_rate, force_card_payment = false } = req.body;
    if (!shipper_address || !recipient_address || !packages || !selected_rate) return res.status(400).json({ error: 'Shipper address, recipient address, packages, and selected rate are required' });

    const [subscriptions] = await db.query(`SELECT id, stripe_customer_id, prefer_connect_balance FROM user_subscriptions WHERE user_id = ? AND subscription_type = 'shipping_labels' AND status = 'active'`, [userId]);
    if (subscriptions.length === 0) return res.status(400).json({ error: 'Active shipping subscription required' });
    const subscription = subscriptions[0];

    let canUseConnectBalance = false;
    if (!force_card_payment && subscription.prefer_connect_balance && req.permissions?.includes('stripe_connect')) {
      try {
        const cb = await stripeService.getConnectAccountBalance(userId);
        if (cb.available >= Math.round(selected_rate.cost * 100)) canUseConnectBalance = true;
      } catch (e) { console.error('Error checking Connect balance:', e); }
    }

    let paymentResult, paymentMethod;
    if (canUseConnectBalance) {
      try {
        paymentResult = await stripeService.processSubscriptionPaymentWithConnectBalance(userId, null, Math.round(selected_rate.cost * 100));
        if (paymentResult.success) paymentMethod = 'connect_balance';
        else canUseConnectBalance = false;
      } catch (e) { console.error('Connect balance payment failed:', e); canUseConnectBalance = false; }
    }
    if (!canUseConnectBalance) {
      const pi = await stripeService.stripe.paymentIntents.create({ amount: Math.round(selected_rate.cost * 100), currency: 'usd', customer: subscription.stripe_customer_id, payment_method_types: ['card'], confirmation_method: 'automatic', confirm: true, off_session: true, metadata: { user_id: userId.toString(), subscription_id: subscription.id.toString(), label_type: 'standalone', platform: 'brakebee' } });
      if (pi.status !== 'succeeded') return res.status(400).json({ error: 'Payment failed', decline_code: pi.last_payment_error?.decline_code, message: pi.last_payment_error?.message });
      paymentResult = { payment_intent_id: pi.id };
      paymentMethod = 'card';
    }

    const shippingService = require('../../services/shippingService');
    const shipment = { shipper: { name: shipper_address.name, address: shipper_address }, recipient: { name: recipient_address.name, address: recipient_address }, packages, user_id: userId, is_standalone: true };
    const labelData = await shippingService.purchaseStandaloneLabel(selected_rate.carrier, shipment, selected_rate);

    if (paymentMethod === 'connect_balance') {
      await db.query(`INSERT INTO vendor_transactions (vendor_id, transaction_type, amount, status, created_at) VALUES (?, 'shipping_charge', ?, 'completed', CURRENT_TIMESTAMP)`, [userId, selected_rate.cost]);
      await db.query(`INSERT INTO shipping_label_purchases (subscription_id, shipping_label_id, stripe_payment_intent_id, amount, status, payment_method) VALUES (?, ?, NULL, ?, 'succeeded', 'connect_balance')`, [subscription.id, labelData.labelId, selected_rate.cost]);
    } else {
      await db.query(`INSERT INTO shipping_label_purchases (subscription_id, shipping_label_id, stripe_payment_intent_id, amount, status, payment_method) VALUES (?, ?, ?, ?, 'succeeded', 'card')`, [subscription.id, labelData.labelId, paymentResult.payment_intent_id, selected_rate.cost]);
    }

    res.json({ success: true, label: { id: labelData.labelId, tracking_number: labelData.trackingNumber, carrier: selected_rate.carrier, service: selected_rate.service, cost: selected_rate.cost, label_url: labelData.labelUrl }, payment_method: paymentMethod, amount: selected_rate.cost });
  } catch (error) {
    console.error('Error creating standalone label:', error);
    if (error.type === 'StripeCardError') return res.status(400).json({ error: 'Card payment failed', decline_code: error.decline_code, message: error.message });
    res.status(500).json({ error: 'Failed to create label', details: error.message });
  }
});

// ============================================================================
// MARKETPLACE SUBSCRIPTION (uses verified tables with marketplace context)
// ============================================================================

router.get('/marketplace/subscription/my', requireAuth, async (req, res) => {
  req.query.tier_context = req.query.tier_context || 'Marketplace Seller';
  const handler = router.stack.find(l => l.route && l.route.path && (Array.isArray(l.route.path) ? l.route.path.includes('/verified/subscription/my') : l.route.path === '/verified/subscription/my') && l.route.methods.get);
  if (handler) {
    const stack = handler.route.stack;
    return stack[stack.length - 1].handle(req, res);
  }
  res.status(500).json({ error: 'Route handler not found' });
});

router.post('/marketplace/subscription/select-tier', requireAuth, async (req, res) => {
  req.body.subscription_type = req.body.subscription_type || 'verified';
  const handler = router.stack.find(l => l.route && l.route.path === '/verified/subscription/select-tier' && l.route.methods.post);
  if (handler) {
    const stack = handler.route.stack;
    return stack[stack.length - 1].handle(req, res);
  }
  res.status(500).json({ error: 'Route handler not found' });
});

router.get('/marketplace/subscription/terms-check', requireAuth, async (req, res) => {
  req.query.tier_context = req.query.tier_context || 'Marketplace Seller';
  const handler = router.stack.find(l => l.route && l.route.path && (Array.isArray(l.route.path) ? l.route.path.includes('/verified/subscription/terms-check') : l.route.path === '/verified/subscription/terms-check') && l.route.methods.get);
  if (handler) {
    const stack = handler.route.stack;
    return stack[stack.length - 1].handle(req, res);
  }
  res.status(500).json({ error: 'Route handler not found' });
});

router.post('/marketplace/subscription/terms-accept', requireAuth, async (req, res) => {
  const handler = router.stack.find(l => l.route && l.route.path && (Array.isArray(l.route.path) ? l.route.path.includes('/verified/subscription/terms-accept') : l.route.path === '/verified/subscription/terms-accept') && l.route.methods.post);
  if (handler) {
    const stack = handler.route.stack;
    return stack[stack.length - 1].handle(req, res);
  }
  res.status(500).json({ error: 'Route handler not found' });
});

// ============================================================================
// WHOLESALE SUBSCRIPTION ROUTES
// ============================================================================

router.get('/wholesale/terms-check', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [latestTerms] = await db.execute(`
      SELECT id, title, content, version, created_at
      FROM terms_versions
      WHERE subscription_type = 'wholesale' AND is_current = 1
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (latestTerms.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'No wholesale terms found' } });
    }

    const terms = latestTerms[0];

    const [acceptance] = await db.execute(`
      SELECT id, accepted_at
      FROM user_terms_acceptance
      WHERE user_id = ? AND subscription_type = 'wholesale' AND terms_version_id = ?
    `, [userId, terms.id]);

    res.json({
      success: true,
      data: {
        termsAccepted: acceptance.length > 0,
        latestTerms: {
          id: terms.id,
          title: terms.title,
          content: terms.content,
          version: terms.version,
          created_at: terms.created_at
        }
      }
    });
  } catch (error) {
    console.error('Error checking wholesale terms:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to check terms acceptance' } });
  }
});

router.post('/wholesale/terms-accept', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { terms_version_id } = req.body;

    if (!terms_version_id) {
      return res.status(400).json({ success: false, error: { message: 'terms_version_id is required' } });
    }

    const [termsCheck] = await db.execute(`
      SELECT id FROM terms_versions
      WHERE id = ? AND subscription_type = 'wholesale'
    `, [terms_version_id]);

    if (termsCheck.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'Invalid terms version' } });
    }

    await db.execute(`
      INSERT IGNORE INTO user_terms_acceptance (user_id, subscription_type, terms_version_id, accepted_at)
      VALUES (?, 'wholesale', ?, NOW())
    `, [userId, terms_version_id]);

    res.json({ success: true, data: { message: 'Terms acceptance recorded successfully' } });
  } catch (error) {
    console.error('Error recording wholesale terms acceptance:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to record terms acceptance' } });
  }
});

router.post('/wholesale/apply', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      business_name, business_type, tax_id, business_address,
      business_city, business_state, business_zip, business_phone,
      business_email, contact_name, contact_title, years_in_business,
      business_description, product_categories, expected_order_volume,
      website_url, resale_certificate, additional_info
    } = req.body;

    const requiredFields = [
      'business_name', 'business_type', 'tax_id', 'business_address',
      'business_city', 'business_state', 'business_zip', 'business_phone',
      'business_email', 'contact_name', 'years_in_business',
      'business_description', 'product_categories', 'expected_order_volume'
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ success: false, error: { message: `${field} is required` } });
      }
    }

    const [existingApp] = await db.execute(`
      SELECT id, status FROM wholesale_applications
      WHERE user_id = ? AND status IN ('pending', 'approved', 'under_review')
    `, [userId]);

    if (existingApp.length > 0) {
      return res.status(400).json({
        success: false,
        error: { message: `You already have a ${existingApp[0].status} wholesale application` }
      });
    }

    const [result] = await db.execute(`
      INSERT INTO wholesale_applications (
        user_id, business_name, business_type, tax_id, business_address,
        business_city, business_state, business_zip, business_phone, business_email,
        contact_name, contact_title, years_in_business, business_description,
        product_categories, expected_order_volume, website_url, resale_certificate,
        additional_info, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      userId, business_name, business_type, tax_id, business_address,
      business_city, business_state, business_zip, business_phone, business_email,
      contact_name, contact_title, years_in_business, business_description,
      product_categories, expected_order_volume, website_url, resale_certificate,
      additional_info
    ]);

    res.json({
      success: true,
      data: { message: 'Wholesale application submitted successfully', application_id: result.insertId }
    });
  } catch (error) {
    console.error('Error submitting wholesale application:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to submit application' } });
  }
});

module.exports = router;
