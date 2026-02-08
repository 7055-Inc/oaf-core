/**
 * Websites module - subscription service
 */

const db = require('../../../../config/db');
const stripeService = require('../../../services/stripeService');
const { enforceAllLimits } = require('../utils/tierEnforcement');

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
  const { new_tier_name, new_tier_price, preview } = body;
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

  // Map tier names to standard tier keys for enforcement
  const tierMap = {
    'Starter Plan': 'free',
    'Professional Plan': 'basic',
    'Business Plan': 'professional',
    'Promoter Plan': 'basic',
    'Promoter Business Plan': 'professional'
  };
  const currentStandardTier = tierMap[current.tier] || 'free';
  const newStandardTier = tierMap[new_tier_name] || 'free';

  // Check if this is a downgrade by comparing tier limits
  const { getMaxSites, getTierLevel } = require('../utils/tierEnforcement');
  const currentMaxSites = getMaxSites(currentStandardTier);
  const newMaxSites = getMaxSites(newStandardTier);
  const currentTierLevel = getTierLevel(currentStandardTier);
  const newTierLevel = getTierLevel(newStandardTier);

  const isDowngrade = newMaxSites < currentMaxSites || newTierLevel < currentTierLevel;

  // If this is a downgrade, check what will be affected
  if (isDowngrade && !preview) {
    // Get active sites that will be deactivated
    const [activeSites] = await db.query(
      'SELECT id, site_name, created_at FROM sites WHERE user_id = ? AND status = "active" ORDER BY created_at ASC',
      [userId]
    );
    
    const sitesToDeactivate = activeSites.length > newMaxSites ? activeSites.slice(0, activeSites.length - newMaxSites) : [];

    // Get active addons that will be disabled (those requiring higher tier)
    const [activeAddons] = await db.query(`
      SELECT 
        sa.id as site_addon_id,
        sa.site_id,
        wa.addon_name,
        wa.tier_required,
        s.site_name
      FROM site_addons sa
      JOIN website_addons wa ON sa.addon_id = wa.id
      JOIN sites s ON sa.site_id = s.id
      WHERE s.user_id = ? AND sa.is_active = 1
    `, [userId]);

    const addonsToDisable = activeAddons.filter(addon => {
      const requiredTierLevel = getTierLevel(addon.tier_required);
      return newTierLevel < requiredTierLevel;
    });

    // If anything will be affected, require confirmation
    if (sitesToDeactivate.length > 0 || addonsToDisable.length > 0) {
      return {
        success: false,
        requires_confirmation: true,
        message: 'This downgrade will affect your active sites and/or addons.',
        current_tier: current.tier,
        new_tier: new_tier_name,
        current_price: parseFloat(current.tier_price),
        new_price: parseFloat(new_tier_price),
        sites_to_deactivate: sitesToDeactivate.map(s => ({
          id: s.id,
          name: s.site_name,
          created_at: s.created_at
        })),
        addons_to_disable: addonsToDisable.map(a => ({
          addon_name: a.addon_name,
          site_name: a.site_name,
          tier_required: a.tier_required
        })),
        new_site_limit: newMaxSites
      };
    }
  }

  // If preview mode, just return the impact without making changes
  if (preview) {
    const [activeSites] = await db.query(
      'SELECT id, site_name, created_at FROM sites WHERE user_id = ? AND status = "active" ORDER BY created_at ASC',
      [userId]
    );
    
    const sitesToDeactivate = activeSites.length > newMaxSites ? activeSites.slice(0, activeSites.length - newMaxSites) : [];

    const [activeAddons] = await db.query(`
      SELECT 
        sa.id as site_addon_id,
        sa.site_id,
        wa.addon_name,
        wa.tier_required,
        s.site_name
      FROM site_addons sa
      JOIN website_addons wa ON sa.addon_id = wa.id
      JOIN sites s ON sa.site_id = s.id
      WHERE s.user_id = ? AND sa.is_active = 1
    `, [userId]);

    const addonsToDisable = activeAddons.filter(addon => {
      const requiredTierLevel = getTierLevel(addon.tier_required);
      return newTierLevel < requiredTierLevel;
    });

    return {
      success: true,
      preview: true,
      current_tier: current.tier,
      new_tier: new_tier_name,
      current_price: parseFloat(current.tier_price),
      new_price: parseFloat(new_tier_price),
      sites_to_deactivate: sitesToDeactivate.map(s => ({
        id: s.id,
        name: s.site_name,
        created_at: s.created_at
      })),
      addons_to_disable: addonsToDisable.map(a => ({
        addon_name: a.addon_name,
        site_name: a.site_name,
        tier_required: a.tier_required
      })),
      new_site_limit: newMaxSites
    };
  }

  // Proceed with actual tier change
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

  // Immediately enforce tier limits (sites + addons)
  let enforcement = null;
  try {
    enforcement = await enforceAllLimits(userId, newStandardTier);
  } catch (enforcementError) {
    console.error('Tier enforcement error:', enforcementError);
    // Don't fail the tier change if enforcement fails
  }

  const response = {
    success: true,
    message: 'Tier changed successfully',
    old_tier: current.tier,
    new_tier: new_tier_name,
    old_price: parseFloat(current.tier_price),
    new_price: parseFloat(new_tier_price),
    prorated_amount: parseFloat(proratedAmount.toFixed(2)),
    billing_note: 'Your new tier is now active. The prorated difference will be reflected in your next monthly billing cycle on the 20th.'
  };

  // Add enforcement details if any sites or addons were affected
  if (enforcement) {
    if (enforcement.totalSitesDeactivated > 0) {
      response.sites_deactivated = enforcement.totalSitesDeactivated;
      response.deactivated_site_names = enforcement.sites.deactivatedSites.map(s => s.name);
    }
    if (enforcement.totalAddonsDisabled > 0) {
      response.addons_disabled = enforcement.totalAddonsDisabled;
      response.disabled_addon_names = enforcement.addons.disabledAddons.map(a => a.addon_name);
    }
  }

  return response;
}

async function confirmTierChange(userId, body) {
  const { new_tier_name, new_tier_price, confirmed } = body;
  
  if (!confirmed) {
    const err = new Error('Tier change must be confirmed');
    err.statusCode = 400;
    throw err;
  }

  // Execute the tier change without preview
  return await changeTier(userId, { new_tier_name, new_tier_price, preview: false });
}

async function cancelSubscription(userId, body = {}) {
  const { preview } = body;
  const [subscription] = await db.query(
    'SELECT id, status, tier FROM user_subscriptions WHERE user_id = ? AND subscription_type = ? LIMIT 1',
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

  // Get details of what will be affected
  const [activeSites] = await db.query(
    'SELECT id, site_name, created_at FROM sites WHERE user_id = ? AND status = "active"',
    [userId]
  );
  
  const [activeAddons] = await db.query(`
    SELECT 
      sa.id as site_addon_id,
      wa.addon_name,
      s.site_name
    FROM site_addons sa
    JOIN website_addons wa ON sa.addon_id = wa.id
    JOIN sites s ON sa.site_id = s.id
    WHERE s.user_id = ? AND sa.is_active = 1
  `, [userId]);

  // If preview mode or requires confirmation, return preview data
  if (preview || (!body.confirmed && (activeSites.length > 0 || activeAddons.length > 0))) {
    return {
      success: false,
      requires_confirmation: true,
      message: 'Cancelling will deactivate all your sites and disable all addons.',
      current_tier: subscription[0].tier,
      sites_to_deactivate: activeSites.map(s => ({
        id: s.id,
        name: s.site_name,
        created_at: s.created_at
      })),
      addons_to_disable: activeAddons.map(a => ({
        addon_name: a.addon_name,
        site_name: a.site_name
      })),
      total_sites: activeSites.length,
      total_addons: activeAddons.length
    };
  }

  // Proceed with actual cancellation
  await db.query('UPDATE user_permissions SET sites = 0 WHERE user_id = ?', [userId]);
  await db.query(
    'UPDATE user_subscriptions SET status = ? WHERE id = ?',
    ['canceled', subscription[0].id]
  );

  // Immediately enforce cancellation: deactivate ALL sites and addons
  let sitesDeactivated = 0;
  let addonsDisabled = 0;
  try {
    sitesDeactivated = activeSites.length;
    
    if (sitesDeactivated > 0) {
      await db.query(
        'UPDATE sites SET status = "draft" WHERE user_id = ? AND status = "active"',
        [userId]
      );
    }

    addonsDisabled = activeAddons.length;

    if (addonsDisabled > 0) {
      await db.query(`
        UPDATE site_addons sa
        JOIN sites s ON sa.site_id = s.id
        SET sa.is_active = 0, sa.deactivated_at = CURRENT_TIMESTAMP
        WHERE s.user_id = ? AND sa.is_active = 1
      `, [userId]);
    }
  } catch (enforcementError) {
    console.error('Cancellation enforcement error:', enforcementError);
    // Don't fail the cancellation if enforcement fails
  }

  const response = {
    success: true,
    message: 'Website subscription cancelled successfully',
    note: 'You will retain access until the end of your current billing period.'
  };

  // Add enforcement details
  if (sitesDeactivated > 0) {
    response.sites_deactivated = sitesDeactivated;
    response.deactivated_site_names = activeSites.map(s => s.site_name);
  }
  if (addonsDisabled > 0) {
    response.addons_disabled = addonsDisabled;
    response.disabled_addon_names = activeAddons.map(a => a.addon_name);
  }

  return response;
}

async function confirmCancellation(userId, body) {
  const { confirmed } = body;
  
  if (!confirmed) {
    const err = new Error('Cancellation must be confirmed');
    err.statusCode = 400;
    throw err;
  }

  // Execute the cancellation without preview
  return await cancelSubscription(userId, { confirmed: true });
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
  confirmTierChange,
  cancelSubscription,
  confirmCancellation,
  getSubscriptionStatus
};
