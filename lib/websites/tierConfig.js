/**
 * Shared Website Subscription Tier Configuration
 * Single source of truth for tier pricing, features, and enforcement
 * 
 * Used by:
 * - Backend: api-service/src/modules/websites/services/sites.js (enforcement)
 * - Frontend: modules/websites/components/* (display)
 */

const websitesSubscriptionTiers = {
  free: {
    id: 'free',
    displayName: 'Free',
    description: 'Basic website with limited customization',
    price: 0,
    priceId: null,
    features: [
      '1 custom website',
      'No custom domains',
      'Basic template selection',
      'Standard support'
    ],
    
    // Backend enforcement properties
    max_sites: 1,
    max_custom_domains: 0,
    allow_basic_customization: false,
    allow_advanced_customization: false,
    allow_custom_css: false,
    allow_addons: false,
    
    permissions: {
      hasSites: true,
      hasManageSites: false,
      hasProfessionalSites: false
    }
  },
  
  basic: {
    id: 'basic',
    displayName: 'Basic',
    description: 'Multiple sites with color & font customization',
    price: 9.99,
    priceId: 'price_basic_monthly_2024',
    features: [
      '3 custom websites',
      'Up to 1 custom domain',
      'Color & font customization',
      'All templates & addons',
      'Email support'
    ],
    
    max_sites: 3,
    max_custom_domains: 1,
    allow_basic_customization: true,
    allow_advanced_customization: false,
    allow_custom_css: false,
    allow_addons: true,
    
    permissions: {
      hasSites: true,
      hasManageSites: true,
      hasProfessionalSites: false
    }
  },
  
  professional: {
    id: 'professional',
    displayName: 'Professional',
    description: 'Unlimited sites with full customization & custom CSS',
    price: 29.99,
    priceId: 'price_professional_monthly_2024',
    features: [
      'Unlimited websites',
      'Unlimited custom domains',
      'Full layout customization',
      'Custom CSS support',
      'All templates & addons',
      'Priority support'
    ],
    
    max_sites: 999,
    max_custom_domains: 999,
    allow_basic_customization: true,
    allow_advanced_customization: true,
    allow_custom_css: true,
    allow_addons: true,
    
    permissions: {
      hasSites: true,
      hasManageSites: true,
      hasProfessionalSites: true
    }
  }
};

/**
 * Get tier limits for backend enforcement
 * @param {string} tierName - Tier ID (free, basic, professional)
 * @returns {object} Tier limits and permissions
 */
function getTierLimits(tierName) {
  const tier = websitesSubscriptionTiers[tierName] || websitesSubscriptionTiers.free;
  return {
    max_sites: tier.max_sites,
    max_custom_domains: tier.max_custom_domains,
    allow_basic_customization: tier.allow_basic_customization,
    allow_advanced_customization: tier.allow_advanced_customization,
    allow_custom_css: tier.allow_custom_css,
    allow_addons: tier.allow_addons,
    permissions: tier.permissions
  };
}

/**
 * Get tier display data for frontend
 * @param {string} tierName - Tier ID
 * @returns {object} Tier display properties
 */
function getTierForDisplay(tierName) {
  const tier = websitesSubscriptionTiers[tierName];
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
  return Object.values(websitesSubscriptionTiers).map(tier => ({
    id: tier.id,
    displayName: tier.displayName,
    description: tier.description,
    price: tier.price,
    priceId: tier.priceId,
    features: tier.features
  }));
}

module.exports = {
  websitesSubscriptionTiers,
  getTierLimits,
  getTierForDisplay,
  getAllTiersForDisplay
};
