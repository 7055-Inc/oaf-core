/**
 * Social Central Tier Enforcement Utility
 * Checks and enforces feature/limit gates based on user's Social subscription tier.
 *
 * Mirrors the CRM tier enforcement pattern (email-marketing/utils/tierEnforcement.js).
 */

const db = require('../../../../config/db');
const { getSocialTierLimits } = require('../../../../../lib/social-central/tierConfig');

// ─────────────────────────────────────────────────────────────────────────────
// Core: resolve user tier
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the user's Social Central tier and computed limits.
 * Admin users automatically get the 'admin' tier.
 */
async function getUserSocialTier(userId, isAdmin = false) {
  if (isAdmin) {
    return { tier: 'admin', limits: getSocialTierLimits('admin') };
  }

  const [rows] = await db.execute(
    `SELECT tier FROM user_subscriptions
     WHERE user_id = ? AND subscription_type = 'social' AND status IN ('active','trialing','incomplete')
     ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  const tier = rows.length > 0 ? rows[0].tier : 'free';
  return { tier, limits: getSocialTierLimits(tier) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Limit checks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Can the user connect another social platform?
 */
async function checkConnectionLimit(userId, isAdmin = false) {
  const { tier, limits } = await getUserSocialTier(userId, isAdmin);

  const [countResult] = await db.execute(
    `SELECT COUNT(*) as total FROM social_connections WHERE owner_type = 'user' AND owner_id = ? AND status = 'active'`,
    [userId]
  );
  const current = countResult[0].total;
  return {
    allowed: current < limits.max_connections,
    current,
    limit: limits.max_connections,
    tier,
  };
}

/**
 * Can the user create another post this month?
 */
async function checkPostLimit(userId, isAdmin = false) {
  const { tier, limits } = await getUserSocialTier(userId, isAdmin);

  const [countResult] = await db.execute(
    `SELECT COUNT(*) as total FROM marketing_content
     WHERE created_by IN ('manual','human','ai','claude')
       AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')
       AND campaign_id IN (SELECT id FROM marketing_campaigns WHERE owner_id = ?)
       OR (campaign_id IS NULL AND id IN (
         SELECT mc.id FROM marketing_content mc
         JOIN marketing_campaigns mcamp ON mc.campaign_id = mcamp.id
         WHERE mcamp.owner_id = ?
       ))`,
    [userId, userId]
  );
  // Simplified count — just count all content created this month associated with user
  const current = countResult[0]?.total || 0;
  return {
    allowed: current < limits.max_posts_per_month,
    current,
    limit: limits.max_posts_per_month,
    tier,
  };
}

/**
 * Can the user create another AI campaign?
 */
async function checkCampaignLimit(userId, isAdmin = false) {
  const { tier, limits } = await getUserSocialTier(userId, isAdmin);

  const [countResult] = await db.execute(
    `SELECT COUNT(*) as total FROM marketing_campaigns
     WHERE owner_id = ?
       AND created_at >= DATE_FORMAT(NOW(), '%Y-%m-01')`,
    [userId]
  );
  const current = countResult[0]?.total || 0;
  return {
    allowed: current < limits.max_campaigns,
    current,
    limit: limits.max_campaigns,
    tier,
  };
}

/**
 * Can the user upload another media asset?
 */
async function checkAssetLimit(userId, isAdmin = false) {
  const { tier, limits } = await getUserSocialTier(userId, isAdmin);

  const [countResult] = await db.execute(
    `SELECT COUNT(*) as total FROM marketing_assets WHERE user_id = ?`,
    [userId]
  );
  const current = countResult[0]?.total || 0;
  return {
    allowed: current < limits.max_assets,
    current,
    limit: limits.max_assets,
    tier,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature gates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check whether a specific feature is available for the user's tier.
 * Returns { allowed, tier, feature }.
 */
async function checkFeatureAccess(userId, featureName, isAdmin = false) {
  const { tier, limits } = await getUserSocialTier(userId, isAdmin);
  const allowed = !!limits[featureName];
  return { allowed, tier, feature: featureName };
}

// ─────────────────────────────────────────────────────────────────────────────
// Express middleware factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Middleware that enforces a specific feature gate.
 * Usage: router.post('/ai/caption', requireAuth, requireSocialFeature('has_ai_caption'), handler)
 */
function requireSocialFeature(featureName) {
  return async (req, res, next) => {
    try {
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
      const { allowed, tier } = await checkFeatureAccess(req.userId, featureName, isAdmin);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          error: `This feature requires a higher Social Central tier. Current: ${tier}`,
          tier,
          requiredFeature: featureName,
          upgrade: true,
        });
      }

      req.socialTier = tier;
      next();
    } catch (error) {
      console.error('Tier enforcement error:', error);
      next(); // fail open — don't block users on enforcement errors
    }
  };
}

/**
 * Middleware that enforces a limit (connections, posts, campaigns, assets).
 * Usage: router.post('/content', requireAuth, requireSocialLimit('post'), handler)
 */
function requireSocialLimit(limitType) {
  const checkers = {
    connection: checkConnectionLimit,
    post: checkPostLimit,
    campaign: checkCampaignLimit,
    asset: checkAssetLimit,
  };

  return async (req, res, next) => {
    try {
      const checker = checkers[limitType];
      if (!checker) return next();

      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'super_admin';
      const result = await checker(req.userId, isAdmin);

      if (!result.allowed) {
        return res.status(403).json({
          success: false,
          error: `${limitType} limit reached (${result.current}/${result.limit}). Upgrade your Social Central plan.`,
          tier: result.tier,
          current: result.current,
          limit: result.limit,
          upgrade: true,
        });
      }

      req.socialTier = result.tier;
      next();
    } catch (error) {
      console.error('Limit enforcement error:', error);
      next(); // fail open
    }
  };
}

module.exports = {
  getUserSocialTier,
  checkConnectionLimit,
  checkPostLimit,
  checkCampaignLimit,
  checkAssetLimit,
  checkFeatureAccess,
  requireSocialFeature,
  requireSocialLimit,
};
