/**
 * Social Central Subscription Tier Configuration
 * Single source of truth for tier pricing, features, and limits
 *
 * Used by:
 * - Backend: api-service/src/modules/marketing/utils/tierEnforcement.js
 * - Frontend: pages/dashboard/marketing/social-central/subscription.js
 */

const socialTiers = {
  free: {
    id: 'free',
    displayName: 'Free',
    description: 'Explore Social Central — manual posting only',
    price: 0,
    priceId: null,
    features: [
      'Connect 1 social platform',
      'Build-a-Post (manual only)',
      '5 posts per month',
      'Media Library (10 assets)',
      'Community support',
    ],

    // Enforcement limits
    max_connections: 1,
    max_posts_per_month: 5,
    max_assets: 10,
    max_campaigns: 0,
    has_ai_caption: false,
    has_ai_campaigns: false,
    has_scheduling: false,
    has_analytics: false,
    has_calendar: false,
    has_media_pipeline: false,
    has_crm_integration: false,
  },

  starter: {
    id: 'starter',
    displayName: 'Starter',
    description: 'AI-assisted social media for growing artists',
    price: 19,
    priceId: 'price_social_starter_monthly_2025',
    popular: true,
    features: [
      'Connect up to 3 platforms',
      '30 posts per month',
      'AI Caption Generator',
      '2 AI campaigns per month',
      'Media Library (100 assets)',
      'Post scheduling',
      'Basic analytics',
      'Standard support',
    ],

    max_connections: 3,
    max_posts_per_month: 30,
    max_assets: 100,
    max_campaigns: 2,
    has_ai_caption: true,
    has_ai_campaigns: true,
    has_scheduling: true,
    has_analytics: true,
    has_calendar: true,
    has_media_pipeline: false,
    has_crm_integration: false,
  },

  pro: {
    id: 'pro',
    displayName: 'Pro',
    description: 'Full AI marketing suite for serious creators',
    price: 49,
    priceId: 'price_social_pro_monthly_2025',
    features: [
      'Connect all platforms',
      '150 posts per month',
      'AI Caption Generator',
      '10 AI campaigns per month',
      'Media Library (500 assets)',
      'AI media matching & composition',
      'Post scheduling + calendar',
      'Advanced analytics',
      'Priority support',
    ],

    max_connections: 99,
    max_posts_per_month: 150,
    max_assets: 500,
    max_campaigns: 10,
    has_ai_caption: true,
    has_ai_campaigns: true,
    has_scheduling: true,
    has_analytics: true,
    has_calendar: true,
    has_media_pipeline: true,
    has_crm_integration: false,
  },

  admin: {
    id: 'admin',
    displayName: 'Admin',
    description: 'Corporate-level marketing with full platform intelligence',
    price: 0,
    priceId: null,
    adminOnly: true,
    features: [
      'Unlimited platforms',
      'Unlimited posts',
      'Unlimited AI campaigns',
      'Unlimited media assets',
      'AI media matching & composition',
      'CRM email integration',
      'Full sitewide analytics',
      'Ad spend advisor',
      'All Leo AI intelligence',
      'Internal admin tools',
    ],

    max_connections: 999,
    max_posts_per_month: 999999,
    max_assets: 999999,
    max_campaigns: 999999,
    has_ai_caption: true,
    has_ai_campaigns: true,
    has_scheduling: true,
    has_analytics: true,
    has_calendar: true,
    has_media_pipeline: true,
    has_crm_integration: true,
  },
};

/**
 * Get tier limits for backend enforcement
 */
function getSocialTierLimits(tierName) {
  const tier = socialTiers[tierName] || socialTiers.free;
  return {
    max_connections: tier.max_connections,
    max_posts_per_month: tier.max_posts_per_month,
    max_assets: tier.max_assets,
    max_campaigns: tier.max_campaigns,
    has_ai_caption: tier.has_ai_caption,
    has_ai_campaigns: tier.has_ai_campaigns,
    has_scheduling: tier.has_scheduling,
    has_analytics: tier.has_analytics,
    has_calendar: tier.has_calendar,
    has_media_pipeline: tier.has_media_pipeline,
    has_crm_integration: tier.has_crm_integration,
  };
}

/**
 * Get tier display data for frontend
 */
function getSocialTierForDisplay(tierName) {
  const tier = socialTiers[tierName];
  if (!tier) return null;
  return {
    id: tier.id,
    displayName: tier.displayName,
    description: tier.description,
    price: tier.price,
    priceId: tier.priceId,
    features: tier.features,
    popular: tier.popular || false,
    adminOnly: tier.adminOnly || false,
  };
}

/**
 * Get all tiers for pricing display
 */
function getAllSocialTiersForDisplay() {
  return Object.values(socialTiers)
    .filter(t => !t.adminOnly)
    .map(tier => ({
      id: tier.id,
      displayName: tier.displayName,
      description: tier.description,
      price: tier.price,
      priceId: tier.priceId,
      features: tier.features,
      popular: tier.popular || false,
    }));
}

module.exports = {
  socialTiers,
  getSocialTierLimits,
  getSocialTierForDisplay,
  getAllSocialTiersForDisplay,
};
