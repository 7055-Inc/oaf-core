/**
 * CRM Subscription Service
 * Handles tier selection, terms acceptance, and permission management
 */

const db = require('../../../../config/db');
const stripeService = require('../../../services/stripeService');

// CRM Tier Configuration
const CRM_TIERS = {
  free: {
    id: 'free',
    displayName: 'Free',
    price: 0,
    priceId: null,
    max_subscribers: 250,
    max_emails_per_month: 250,
    max_drip_campaigns: 0,
    max_single_blasts: 0, // Pay per send
    features: {
      basic_analytics: true,
      advanced_analytics: false,
      ab_testing: false,
      pay_per_blast: true,
      blast_price: 10.00
    }
  },
  beginner: {
    id: 'beginner',
    displayName: 'Beginner',
    price: 25,
    priceId: 'price_crm_beginner_monthly_2024',
    max_subscribers: 1000,
    max_emails_per_month: 2500,
    max_drip_campaigns: 1,
    max_single_blasts: 10,
    features: {
      basic_analytics: true,
      advanced_analytics: false,
      ab_testing: false,
      pay_per_blast: false,
      addon_drip_price: 5.00
    }
  },
  pro: {
    id: 'pro',
    displayName: 'Pro',
    price: 45,
    priceId: 'price_crm_pro_monthly_2024',
    max_subscribers: 10000,
    max_emails_per_month: 20000,
    max_drip_campaigns: 10,
    max_single_blasts: 999999, // Unlimited
    features: {
      basic_analytics: true,
      advanced_analytics: true,
      ab_testing: true,
      pay_per_blast: false,
      addon_drip_price: 5.00
    }
  }
};

async function getMySubscription(userId) {
  // Get subscription
  const [subscriptions] = await db.query(`
    SELECT us.id, us.status, us.tier, us.tier_price, us.stripe_customer_id, us.created_at
    FROM user_subscriptions us
    WHERE us.user_id = ? AND us.subscription_type = 'crm'
    LIMIT 1
  `, [userId]);
  
  const subscription = subscriptions[0] || null;
  
  // Check terms acceptance
  const [termsCheck] = await db.query(`
    SELECT uta.id FROM user_terms_acceptance uta
    JOIN terms_versions tv ON uta.terms_version_id = tv.id
    WHERE uta.user_id = ? AND uta.subscription_type = 'crm' AND tv.is_current = 1
    LIMIT 1
  `, [userId]);
  
  const termsAccepted = termsCheck.length > 0;
  
  // Get card on file
  let cardLast4 = null;
  const cust = subscription?.stripe_customer_id ||
    (await db.query(
      'SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = ? AND stripe_customer_id IS NOT NULL LIMIT 1',
      [userId]
    ))[0]?.[0]?.stripe_customer_id;
    
  if (cust) {
    try {
      const pm = await stripeService.stripe.paymentMethods.list({
        customer: cust, type: 'card', limit: 1
      });
      if (pm.data.length > 0) cardLast4 = pm.data[0].card.last4;
    } catch (e) { 
      console.error('Error fetching payment method:', e); 
    }
  }
  
  // Check permission
  const [perms] = await db.query('SELECT crm FROM user_permissions WHERE user_id = ?', [userId]);
  let hasPermission = perms.length > 0 && perms[0].crm === 1;
  
  // Auto-grant permission if subscription is complete
  if (subscription && termsAccepted && cardLast4) {
    if (!hasPermission) {
      await db.query(
        'INSERT INTO user_permissions (user_id, crm) VALUES (?, 1) ON DUPLICATE KEY UPDATE crm = 1',
        [userId]
      );
      hasPermission = true;
    }
    
    // Activate subscription if incomplete
    if (subscription.status === 'incomplete') {
      await db.query('UPDATE user_subscriptions SET status = ? WHERE id = ?', ['active', subscription.id]);
      subscription.status = 'active';
    }
  }
  
  const tier = subscription?.tier != null && String(subscription.tier).trim() !== ''
    ? String(subscription.tier).trim()
    : null;
    
  return {
    subscription: {
      id: subscription?.id ?? null,
      status: subscription?.status || 'inactive',
      tier,
      tierPrice: subscription?.tier_price != null ? Number(subscription.tier_price) : null,
      termsAccepted: Boolean(termsAccepted),
      cardLast4: cardLast4 != null && String(cardLast4).trim() !== '' ? String(cardLast4).trim() : null,
      application_status: 'approved' // CRM doesn't require application
    },
    has_permission: hasPermission,
    tier_limits: tier ? CRM_TIERS[tier] : null
  };
}

async function selectTier(userId, body) {
  const { subscription_type, tier_name, tier_price } = body;
  
  if (!subscription_type || subscription_type !== 'crm') {
    const err = new Error('Invalid subscription_type');
    err.statusCode = 400;
    throw err;
  }
  
  // Validate tier
  if (!CRM_TIERS[tier_name]) {
    const err = new Error('Invalid tier name');
    err.statusCode = 400;
    throw err;
  }
  
  const tierConfig = CRM_TIERS[tier_name];
  const isFree = tier_name === 'free';
  
  // Free tier is immediately active, paid tiers are incomplete until card/payment
  const initialStatus = isFree ? 'active' : 'incomplete';
  
  const [existing] = await db.query(
    'SELECT id FROM user_subscriptions WHERE user_id = ? AND subscription_type = ? LIMIT 1',
    [userId, subscription_type]
  );
  
  if (existing.length > 0) {
    await db.query(
      'UPDATE user_subscriptions SET tier = ?, tier_price = ?, status = ? WHERE id = ?',
      [tier_name, tier_price || 0, initialStatus, existing[0].id]
    );
    
    // Grant CRM permission immediately for Free tier
    if (isFree) {
      await db.query(
        'INSERT INTO user_permissions (user_id, crm) VALUES (?, 1) ON DUPLICATE KEY UPDATE crm = 1',
        [userId]
      );
    }
    
    return { success: true, action: 'updated', subscription_id: existing[0].id, is_free: isFree };
  }
  
  const [result] = await db.query(
    'INSERT INTO user_subscriptions (user_id, subscription_type, tier, tier_price, status) VALUES (?, ?, ?, ?, ?)',
    [userId, subscription_type, tier_name, tier_price || 0, initialStatus]
  );
  
  // Grant CRM permission immediately for Free tier
  if (isFree) {
    await db.query(
      'INSERT INTO user_permissions (user_id, crm) VALUES (?, 1) ON DUPLICATE KEY UPDATE crm = 1',
      [userId]
    );
  }
  
  return { success: true, action: 'created', subscription_id: result.insertId, is_free: isFree };
}

async function getTermsCheck(userId) {
  const [latestTerms] = await db.query(`
    SELECT id, title, content, version, created_at
    FROM terms_versions
    WHERE subscription_type = 'crm' AND is_current = 1
    ORDER BY created_at DESC LIMIT 1
  `);
  
  if (latestTerms.length === 0) {
    const err = new Error('No CRM terms found');
    err.statusCode = 404;
    throw err;
  }
  
  const terms = latestTerms[0];
  const [acceptance] = await db.query(
    'SELECT id FROM user_terms_acceptance WHERE user_id = ? AND subscription_type = ? AND terms_version_id = ?',
    [userId, 'crm', terms.id]
  );
  
  return {
    success: true,
    termsAccepted: acceptance.length > 0,
    latestTerms: {
      id: terms.id,
      title: terms.title,
      content: terms.content,
      version: terms.version,
      created_at: terms.created_at
    }
  };
}

async function acceptTerms(userId, termsVersionId) {
  if (!termsVersionId) {
    const err = new Error('terms_version_id is required');
    err.statusCode = 400;
    throw err;
  }
  
  const [termsCheck] = await db.query(
    'SELECT id FROM terms_versions WHERE id = ? AND subscription_type = ?',
    [termsVersionId, 'crm']
  );
  
  if (termsCheck.length === 0) {
    const err = new Error('Invalid terms version');
    err.statusCode = 404;
    throw err;
  }
  
  await db.query(
    "INSERT IGNORE INTO user_terms_acceptance (user_id, subscription_type, terms_version_id, accepted_at) VALUES (?, 'crm', ?, NOW())",
    [userId, termsVersionId]
  );
  
  return { success: true, message: 'Terms acceptance recorded successfully' };
}

async function changeTier(userId, body) {
  const { new_tier_name, new_tier_price } = body;
  
  if (!new_tier_name || new_tier_price === undefined) {
    const err = new Error('new_tier_name and new_tier_price are required');
    err.statusCode = 400;
    throw err;
  }
  
  if (!CRM_TIERS[new_tier_name]) {
    const err = new Error('Invalid tier name');
    err.statusCode = 400;
    throw err;
  }
  
  const [subscription] = await db.query(`
    SELECT id, tier, tier_price FROM user_subscriptions
    WHERE user_id = ? AND subscription_type = 'crm' AND status = 'active'
    LIMIT 1
  `, [userId]);
  
  if (subscription.length === 0) {
    const err = new Error('No active subscription found');
    err.statusCode = 404;
    throw err;
  }
  
  const current = subscription[0];
  
  if (current.tier === new_tier_name) {
    const err = new Error('Already on this tier');
    err.statusCode = 400;
    throw err;
  }
  
  // TODO: Check if downgrade requires confirmation (e.g., exceeds new limits)
  // For now, allow all tier changes
  
  await db.query(
    'UPDATE user_subscriptions SET tier = ?, tier_price = ? WHERE id = ?',
    [new_tier_name, new_tier_price, current.id]
  );
  
  return {
    success: true,
    message: 'Tier changed successfully',
    new_tier: new_tier_name,
    new_price: new_tier_price
  };
}

async function cancelSubscription(userId) {
  const [subscription] = await db.query(`
    SELECT id, current_period_end, cancel_at_period_end, is_complimentary
    FROM user_subscriptions
    WHERE user_id = ? AND subscription_type = 'crm' AND status IN ('active','incomplete')
    LIMIT 1
  `, [userId]);

  if (subscription.length === 0) {
    const err = new Error('No active subscription found');
    err.statusCode = 404;
    throw err;
  }

  const sub = subscription[0];

  if (sub.is_complimentary) {
    const err = new Error('Complimentary subscriptions cannot be self-cancelled. Contact support.');
    err.statusCode = 400;
    throw err;
  }

  if (sub.cancel_at_period_end === 1) {
    return { success: true, message: 'Subscription is already set to cancel', cancelAt: sub.current_period_end };
  }

  await db.query(
    'UPDATE user_subscriptions SET cancel_at_period_end = 1, canceled_at = NOW() WHERE id = ?',
    [sub.id]
  );

  return {
    success: true,
    message: 'Your CRM subscription will be canceled at the end of your billing period',
    cancelAt: sub.current_period_end
  };
}

module.exports = {
  CRM_TIERS,
  getMySubscription,
  selectTier,
  getTermsCheck,
  acceptTerms,
  changeTier,
  cancelSubscription
};
