/**
 * Shared CRM Subscription Tier Configuration
 * Single source of truth for tier pricing, features, and limits
 * 
 * Used by:
 * - Backend: api-service/src/modules/crm-subscription/services/subscription.js
 * - Frontend: modules/crm/components/* (display)
 */

const crmSubscriptionTiers = {
  free: {
    id: 'free',
    displayName: 'Free',
    description: 'Try out email marketing with basic features',
    price: 0,
    priceId: null, // No Stripe price ID for free tier
    features: [
      'Up to 250 subscribers',
      'Up to 250 emails per month',
      'Email signup forms',
      'Single blast campaigns ($10 each)',
      'Basic email template (Simple Announcement)',
      'Community support'
    ],
    
    // Backend enforcement properties
    max_subscribers: 250,
    max_emails_per_month: 250,
    max_drip_campaigns: 0,
    max_single_blasts: 0, // 0 = pay per send
    has_basic_analytics: true,
    has_advanced_analytics: false,
    has_ab_testing: false,
    pay_per_blast: true,
    blast_price: 10.00
  },
  
  beginner: {
    id: 'beginner',
    displayName: 'Beginner',
    description: 'Perfect for artists starting to build their mailing list',
    price: 25,
    priceId: 'price_crm_beginner_monthly_2024',
    features: [
      'Up to 1,000 subscribers',
      'Up to 2,500 emails per month',
      '1 drip campaign included',
      'Up to 10 single blast campaigns per month',
      'Email signup forms',
      'Subscriber management',
      'Basic analytics',
      'Email templates',
      'Buy additional drips for $5/month each',
      'Standard support'
    ],
    
    // Backend enforcement properties
    max_subscribers: 1000,
    max_emails_per_month: 2500,
    max_drip_campaigns: 1,
    max_single_blasts: 10,
    has_basic_analytics: true,
    has_advanced_analytics: false,
    has_ab_testing: false,
    pay_per_blast: false,
    addon_drip_price: 5.00
  },
  
  pro: {
    id: 'pro',
    displayName: 'Pro',
    description: 'For established artists with growing audiences',
    price: 45,
    priceId: 'price_crm_pro_monthly_2024',
    features: [
      'Up to 10,000 subscribers',
      'Up to 20,000 emails per month',
      '10 drip campaigns included',
      'Unlimited single blast campaigns',
      'Email signup forms',
      'Subscriber management',
      'Advanced analytics & reporting',
      'A/B testing',
      'Email templates',
      'Buy additional drips for $5/month each',
      'Priority support'
    ],
    
    max_subscribers: 10000,
    max_emails_per_month: 20000,
    max_drip_campaigns: 10,
    max_single_blasts: 999999, // Unlimited
    has_basic_analytics: true,
    has_advanced_analytics: true,
    has_ab_testing: true,
    pay_per_blast: false,
    addon_drip_price: 5.00
  }
};

/**
 * Get tier limits for backend enforcement
 * @param {string} tierName - Tier ID (free, beginner, pro)
 * @returns {object} Tier limits and features
 */
function getTierLimits(tierName) {
  const tier = crmSubscriptionTiers[tierName] || crmSubscriptionTiers.free;
  return {
    max_subscribers: tier.max_subscribers,
    max_emails_per_month: tier.max_emails_per_month,
    max_drip_campaigns: tier.max_drip_campaigns,
    max_single_blasts: tier.max_single_blasts,
    has_basic_analytics: tier.has_basic_analytics,
    has_advanced_analytics: tier.has_advanced_analytics,
    has_ab_testing: tier.has_ab_testing,
    pay_per_blast: tier.pay_per_blast || false,
    blast_price: tier.blast_price || 0,
    addon_drip_price: tier.addon_drip_price || 0
  };
}

/**
 * Get tier display data for frontend
 * @param {string} tierName - Tier ID
 * @returns {object} Tier display properties
 */
function getTierForDisplay(tierName) {
  const tier = crmSubscriptionTiers[tierName];
  if (!tier) return null;
  
  return {
    id: tier.id,
    displayName: tier.displayName,
    description: tier.description,
    price: tier.price,
    priceId: tier.priceId,
    features: tier.features
  };
}

/**
 * Get all tiers for pricing display
 * @returns {array} All tiers with display properties
 */
function getAllTiersForDisplay() {
  return Object.values(crmSubscriptionTiers).map(tier => ({
    id: tier.id,
    displayName: tier.displayName,
    description: tier.description,
    price: tier.price,
    priceId: tier.priceId,
    features: tier.features
  }));
}

module.exports = {
  crmSubscriptionTiers,
  getTierLimits,
  getTierForDisplay,
  getAllTiersForDisplay
};
