/**
 * Tier Enforcement Utilities
 * Shared functions for enforcing tier limits on sites and addons
 * Used by both API endpoints and cron jobs
 */

const db = require('../../../../config/db');

// Tier hierarchy for comparison
const TIER_HIERARCHY = {
  free: 0,
  basic: 1,
  professional: 2
};

// Tier limits (synced with /lib/websites/tierConfig.js)
const TIER_LIMITS = {
  free: { max_sites: 1 },
  basic: { max_sites: 3 },
  professional: { max_sites: 999 }
};

/**
 * Get tier level for comparison
 */
function getTierLevel(tier) {
  if (!tier || tier === 'null' || tier === '') return TIER_HIERARCHY.free;
  const normalizedTier = tier.toLowerCase().trim();
  return TIER_HIERARCHY[normalizedTier] ?? TIER_HIERARCHY.free;
}

/**
 * Get max sites for a tier
 */
function getMaxSites(tier) {
  if (!tier || tier === 'null' || tier === '') return TIER_LIMITS.free.max_sites;
  const normalizedTier = tier.toLowerCase().trim();
  return TIER_LIMITS[normalizedTier]?.max_sites ?? TIER_LIMITS.free.max_sites;
}

/**
 * Enforce site limits for a user
 * Deactivates oldest sites if user exceeds their tier limit
 * 
 * @param {number} userId - User ID
 * @param {string} userTier - User's subscription tier (free, basic, professional)
 * @returns {object} - Enforcement results
 */
async function enforceSiteLimits(userId, userTier) {
  // Check if user is admin (unlimited sites)
  const [adminCheck] = await db.query(
    'SELECT user_type FROM users WHERE id = ?',
    [userId]
  );
  
  if (adminCheck[0]?.user_type === 'admin') {
    return { 
      sitesDeactivated: 0, 
      reason: 'admin_unlimited',
      deactivatedSites: []
    };
  }

  const maxSites = getMaxSites(userTier);
  
  // Get active sites count
  const [activeSites] = await db.query(
    'SELECT COUNT(*) as count FROM sites WHERE user_id = ? AND status = "active"',
    [userId]
  );
  
  const activeCount = activeSites[0].count;
  
  if (activeCount <= maxSites) {
    return { 
      sitesDeactivated: 0, 
      activeCount, 
      maxSites,
      deactivatedSites: []
    };
  }

  // Need to deactivate excess sites (keep newest, deactivate oldest)
  const sitesToDeactivate = activeCount - maxSites;
  
  const [sitesToUpdate] = await db.query(
    'SELECT id, site_name FROM sites WHERE user_id = ? AND status = "active" ORDER BY created_at ASC LIMIT ?',
    [userId, sitesToDeactivate]
  );

  if (sitesToUpdate.length > 0) {
    const siteIds = sitesToUpdate.map(s => s.id);
    await db.query(
      `UPDATE sites SET status = 'draft' WHERE id IN (${siteIds.map(() => '?').join(',')})`,
      siteIds
    );
  }

  return {
    sitesDeactivated: sitesToUpdate.length,
    activeCount,
    maxSites,
    deactivatedSites: sitesToUpdate.map(s => ({ id: s.id, name: s.site_name }))
  };
}

/**
 * Enforce addon tier requirements for a user
 * Disables addons that require a higher tier than user's current tier
 * 
 * @param {number} userId - User ID
 * @param {string} userTier - User's subscription tier (free, basic, professional)
 * @returns {object} - Enforcement results
 */
async function enforceAddonLimits(userId, userTier) {
  const userTierLevel = getTierLevel(userTier);

  // Get all active addons for this user's sites
  const [activeAddons] = await db.query(`
    SELECT 
      sa.id as site_addon_id,
      sa.site_id,
      sa.addon_id,
      wa.addon_name,
      wa.tier_required,
      s.site_name
    FROM site_addons sa
    JOIN website_addons wa ON sa.addon_id = wa.id
    JOIN sites s ON sa.site_id = s.id
    WHERE s.user_id = ? AND sa.is_active = 1
  `, [userId]);

  const addonsToDisable = [];

  for (const addon of activeAddons) {
    const requiredTierLevel = getTierLevel(addon.tier_required);
    
    // If user's tier is lower than required tier, disable addon
    if (userTierLevel < requiredTierLevel) {
      addonsToDisable.push(addon);
    }
  }

  if (addonsToDisable.length > 0) {
    const siteAddonIds = addonsToDisable.map(a => a.site_addon_id);
    await db.query(
      `UPDATE site_addons SET is_active = 0, deactivated_at = CURRENT_TIMESTAMP WHERE id IN (${siteAddonIds.map(() => '?').join(',')})`,
      siteAddonIds
    );
  }

  return {
    addonsDisabled: addonsToDisable.length,
    disabledAddons: addonsToDisable.map(a => ({
      site_addon_id: a.site_addon_id,
      addon_name: a.addon_name,
      site_name: a.site_name,
      tier_required: a.tier_required
    }))
  };
}

/**
 * Enforce all limits (sites + addons) for a user
 * Convenience function that calls both enforceSiteLimits and enforceAddonLimits
 * 
 * @param {number} userId - User ID
 * @param {string} userTier - User's subscription tier
 * @returns {object} - Combined enforcement results
 */
async function enforceAllLimits(userId, userTier) {
  const siteResult = await enforceSiteLimits(userId, userTier);
  const addonResult = await enforceAddonLimits(userId, userTier);

  return {
    sites: siteResult,
    addons: addonResult,
    totalSitesDeactivated: siteResult.sitesDeactivated,
    totalAddonsDisabled: addonResult.addonsDisabled
  };
}

module.exports = {
  getTierLevel,
  getMaxSites,
  enforceSiteLimits,
  enforceAddonLimits,
  enforceAllLimits
};
