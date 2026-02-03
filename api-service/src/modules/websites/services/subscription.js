/**
 * Websites module - subscription service
 */

const db = require('../../../../config/db');
const stripeService = require('../../../services/stripeService');

async function getMySubscription(userId) {
  const [subscriptions] = await db.query(`
    SELECT us.id, us.status, us.tier, us.tier_price, us.stripe_customer_id, us.created_at
    FROM user_subscriptions us
    WHERE us.user_id = ? AND us.subscription_type = 'websites'
    LIMIT 1
  `, [userId]);
  const subscription = subscriptions[0] || null;
  const [termsCheck] = await db.query(`
    SELECT uta.id FROM user_terms_acceptance uta
    JOIN terms_versions tv ON uta.terms_version_id = tv.id
    WHERE uta.user_id = ? AND uta.subscription_type = 'websites' AND tv.is_current = 1
    LIMIT 1
  `, [userId]);
  const termsAccepted = termsCheck.length > 0;
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
    } catch (e) { console.error('Error fetching payment method:', e); }
  }
  const [perms] = await db.query('SELECT sites FROM user_permissions WHERE user_id = ?', [userId]);
  let hasPermission = perms.length > 0 && perms[0].sites === 1;
  if (subscription && termsAccepted && cardLast4) {
    if (!hasPermission) {
      await db.query(
        'INSERT INTO user_permissions (user_id, sites) VALUES (?, 1) ON DUPLICATE KEY UPDATE sites = 1',
        [userId]
      );
      hasPermission = true;
    }
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
      application_status: 'approved'
    },
    has_permission: hasPermission
  };
}

async function selectTier(userId, body) {
  const { subscription_type, tier_name, tier_price } = body;
  if (!subscription_type || subscription_type !== 'websites') {
    const err = new Error('Invalid subscription_type');
    err.statusCode = 400;
    throw err;
  }
  const [existing] = await db.query(
    'SELECT id FROM user_subscriptions WHERE user_id = ? AND subscription_type = ? LIMIT 1',
    [userId, subscription_type]
  );
  if (existing.length > 0) {
    await db.query(
      'UPDATE user_subscriptions SET tier = ?, tier_price = ?, status = ? WHERE id = ?',
      [tier_name, tier_price || 0, 'incomplete', existing[0].id]
    );
    return { success: true, action: 'updated', subscription_id: existing[0].id };
  }
  const [result] = await db.query(
    'INSERT INTO user_subscriptions (user_id, subscription_type, tier, tier_price, status) VALUES (?, ?, ?, ?, ?)',
    [userId, subscription_type, tier_name, tier_price || 0, 'incomplete']
  );
  return { success: true, action: 'created', subscription_id: result.insertId };
}

async function getTermsCheck(userId) {
  const [latestTerms] = await db.query(`
    SELECT id, title, content, version, created_at
    FROM terms_versions
    WHERE subscription_type = 'websites' AND is_current = 1
    ORDER BY created_at DESC LIMIT 1
  `);
  if (latestTerms.length === 0) {
    const err = new Error('No websites terms found');
    err.statusCode = 404;
    throw err;
  }
  const terms = latestTerms[0];
  const [acceptance] = await db.query(
    'SELECT id FROM user_terms_acceptance WHERE user_id = ? AND subscription_type = ? AND terms_version_id = ?',
    [userId, 'websites', terms.id]
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
    [termsVersionId, 'websites']
  );
  if (termsCheck.length === 0) {
    const err = new Error('Invalid terms version');
    err.statusCode = 404;
    throw err;
  }
  await db.query(
    "INSERT IGNORE INTO user_terms_acceptance (user_id, subscription_type, terms_version_id, accepted_at) VALUES (?, 'websites', ?, NOW())",
    [userId, termsVersionId]
  );
  return { success: true, message: 'Terms acceptance recorded successfully' };
}

const VALID_TIERS = ['Starter Plan', 'Professional Plan', 'Business Plan', 'Promoter Plan', 'Promoter Business Plan'];

async function changeTier(userId, body) {
  const { new_tier_name, new_tier_price } = body;
  if (!new_tier_name || new_tier_price === undefined) {
    const err = new Error('new_tier_name and new_tier_price are required');
    err.statusCode = 400;
    throw err;
  }
  if (!VALID_TIERS.includes(new_tier_name)) {
    const err = new Error('Invalid tier name');
    err.statusCode = 400;
    throw err;
  }
  const [subscription] = await db.query(`
    SELECT id, tier, tier_price FROM user_subscriptions
    WHERE user_id = ? AND subscription_type = 'websites' AND status = 'active'
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
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemaining = daysInMonth - now.getDate();
  const dailyOld = parseFloat(current.tier_price) / daysInMonth;
  const dailyNew = parseFloat(new_tier_price) / daysInMonth;
  const proratedAmount = (dailyNew - dailyOld) * daysRemaining;
  await db.execute(
    'UPDATE user_subscriptions SET tier = ?, tier_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [new_tier_name, new_tier_price, current.id]
  );
  return {
    success: true,
    message: 'Tier changed successfully',
    old_tier: current.tier,
    new_tier: new_tier_name,
    old_price: parseFloat(current.tier_price),
    new_price: parseFloat(new_tier_price),
    prorated_amount: parseFloat(proratedAmount.toFixed(2)),
    billing_note: 'Your new tier is now active. The prorated difference will be reflected in your next monthly billing cycle on the 20th.'
  };
}

async function cancelSubscription(userId) {
  const [subscription] = await db.query(
    'SELECT id, status FROM user_subscriptions WHERE user_id = ? AND subscription_type = ? LIMIT 1',
    [userId, 'websites']
  );
  if (subscription.length === 0) {
    const err = new Error('No website subscription found');
    err.statusCode = 404;
    throw err;
  }
  const [perm] = await db.query('SELECT sites FROM user_permissions WHERE user_id = ?', [userId]);
  if (perm.length === 0 || !perm[0].sites) {
    const err = new Error('No active sites subscription found');
    err.statusCode = 400;
    throw err;
  }
  await db.query('UPDATE user_permissions SET sites = 0 WHERE user_id = ?', [userId]);
  await db.query(
    'UPDATE user_subscriptions SET status = ? WHERE id = ?',
    ['canceled', subscription[0].id]
  );
  return {
    success: true,
    message: 'Website subscription cancelled successfully',
    note: 'You will retain access until the end of your current billing period.'
  };
}

// ============================================================================
// GET SUBSCRIPTION STATUS
// ============================================================================

async function getSubscriptionStatus(userId) {
  const [permission] = await db.query('SELECT sites FROM user_permissions WHERE user_id = ?', [userId]);
  const hasSubscription = permission.length > 0 && permission[0].sites;
  let sitesCount = 0;
  if (hasSubscription) {
    const [sites] = await db.query(
      'SELECT COUNT(*) as count FROM sites WHERE user_id = ? AND status != ?',
      [userId, 'deleted']
    );
    sitesCount = sites[0].count;
  }
  return {
    success: true,
    hasSubscription,
    sitesCount,
    status: hasSubscription ? 'active' : 'inactive'
  };
}

module.exports = {
  getMySubscription,
  selectTier,
  getTermsCheck,
  acceptTerms,
  changeTier,
  cancelSubscription,
  getSubscriptionStatus
};
