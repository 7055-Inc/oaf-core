/**
 * Addon Connector Subscription Service
 * Thin adapter that composites user_addons + terms + Stripe
 * into the response shape ChecklistController expects.
 */

const db = require('../../../../config/db');
const stripeService = require('../../../services/stripeService');

const VALID_CONNECTOR_SLUGS = [
  'walmart-connector',
  'wayfair-connector',
  'tiktok-connector',
  'etsy-connector',
  'shopify-connector',
  'ebay-connector',
  'amazon-connector',
  'faire-connector',
  'meta-connector'
];

async function validateAddonSlug(addonSlug) {
  if (!VALID_CONNECTOR_SLUGS.includes(addonSlug)) {
    const err = new Error('Invalid connector addon slug');
    err.statusCode = 400;
    throw err;
  }
  const [rows] = await db.execute(
    'SELECT id, addon_name, addon_slug, monthly_price FROM website_addons WHERE addon_slug = ? AND user_level = 1 AND is_active = 1',
    [addonSlug]
  );
  if (rows.length === 0) {
    const err = new Error('Connector addon not found');
    err.statusCode = 404;
    throw err;
  }
  return rows[0];
}

/**
 * Composite subscription status from existing tables.
 * Row in user_addons = "tier selected". is_active=1 = fully subscribed.
 * Auto-activates when tier + terms + card are all satisfied.
 */
async function getMySubscription(userId, addonSlug) {
  const addon = await validateAddonSlug(addonSlug);

  // 1. Check user_addons for this slug (row exists = tier selected)
  const [addonRows] = await db.execute(
    'SELECT id, is_active, activated_at FROM user_addons WHERE user_id = ? AND addon_slug = ?',
    [userId, addonSlug]
  );
  const addonRow = addonRows[0] || null;
  const tierSelected = addonRow !== null;

  // 2. Check terms acceptance (shared across all addons)
  const [termsCheck] = await db.execute(`
    SELECT uta.id FROM user_terms_acceptance uta
    JOIN terms_versions tv ON uta.terms_version_id = tv.id
    WHERE uta.user_id = ? AND uta.subscription_type = 'addons' AND tv.is_current = 1
    LIMIT 1
  `, [userId]);
  const termsAccepted = termsCheck.length > 0;

  // 3. Check card on file via Stripe
  let cardLast4 = null;
  const [custRows] = await db.execute(
    'SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = ? AND stripe_customer_id IS NOT NULL LIMIT 1',
    [userId]
  );
  const customerId = custRows[0]?.stripe_customer_id || null;
  if (customerId) {
    try {
      const pm = await stripeService.stripe.paymentMethods.list({
        customer: customerId, type: 'card', limit: 1
      });
      if (pm.data.length > 0) cardLast4 = pm.data[0].card.last4;
    } catch (e) {
      console.error('Error fetching payment method for addon subscription:', e.message);
    }
  }

  // 4. Auto-activate: all three satisfied and not yet active
  if (tierSelected && termsAccepted && cardLast4 && addonRow && !addonRow.is_active) {
    await db.execute(
      'UPDATE user_addons SET is_active = 1, activated_at = CURRENT_TIMESTAMP, deactivated_at = NULL WHERE id = ?',
      [addonRow.id]
    );
  }

  const isActive = tierSelected && termsAccepted && cardLast4 !== null;

  return {
    subscription: {
      id: addonRow?.id ?? null,
      status: isActive ? 'active' : (tierSelected ? 'incomplete' : 'inactive'),
      tier: tierSelected ? addon.addon_name : null,
      tierPrice: tierSelected ? Number(addon.monthly_price) : null,
      termsAccepted: Boolean(termsAccepted),
      cardLast4: cardLast4 != null ? String(cardLast4).trim() : null,
      application_status: 'approved'
    }
  };
}

/**
 * Record tier selection by inserting a pending user_addons row.
 * is_active=0 means "tier selected, subscription pending."
 */
async function selectTier(userId, addonSlug) {
  const addon = await validateAddonSlug(addonSlug);

  await db.execute(
    `INSERT INTO user_addons (user_id, addon_slug, is_active, subscription_source)
     VALUES (?, ?, 0, 'marketplace_subscription')
     ON DUPLICATE KEY UPDATE
       activated_at = CASE WHEN is_active = 0 THEN activated_at ELSE CURRENT_TIMESTAMP END,
       deactivated_at = NULL,
       subscription_source = 'marketplace_subscription'`,
    [userId, addonSlug]
  );

  return { success: true, action: 'tier_selected', addon_name: addon.addon_name };
}

/**
 * Check if user has accepted the current addon terms.
 */
async function getTermsCheck(userId) {
  const [latestTerms] = await db.execute(`
    SELECT id, title, content, version, created_at
    FROM terms_versions
    WHERE subscription_type = 'addons' AND is_current = 1
    ORDER BY created_at DESC LIMIT 1
  `);

  if (latestTerms.length === 0) {
    const err = new Error('No addon terms found');
    err.statusCode = 404;
    throw err;
  }

  const terms = latestTerms[0];
  const [acceptance] = await db.execute(
    'SELECT id FROM user_terms_acceptance WHERE user_id = ? AND subscription_type = ? AND terms_version_id = ?',
    [userId, 'addons', terms.id]
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

/**
 * Record terms acceptance for addons.
 */
async function acceptTerms(userId, termsVersionId) {
  if (!termsVersionId) {
    const err = new Error('terms_version_id is required');
    err.statusCode = 400;
    throw err;
  }

  const [termsCheck] = await db.execute(
    'SELECT id FROM terms_versions WHERE id = ? AND subscription_type = ?',
    [termsVersionId, 'addons']
  );
  if (termsCheck.length === 0) {
    const err = new Error('Invalid terms version');
    err.statusCode = 404;
    throw err;
  }

  await db.execute(
    "INSERT IGNORE INTO user_terms_acceptance (user_id, subscription_type, terms_version_id, accepted_at) VALUES (?, 'addons', ?, NOW())",
    [userId, termsVersionId]
  );

  return { success: true, message: 'Addon terms acceptance recorded' };
}

module.exports = {
  getMySubscription,
  selectTier,
  getTermsCheck,
  acceptTerms
};
