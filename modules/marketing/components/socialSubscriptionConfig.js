/**
 * Social Central Subscription Config
 * Provides the configuration object for ChecklistController.
 * Same pattern as websitesSubscriptionConfig.js
 */

const { getAllSocialTiersForDisplay } = require('../../../lib/social-central/tierConfig');

export const socialSubscriptionTiers = getAllSocialTiersForDisplay();

/**
 * Base config for Social Central subscription (tier/terms/card flow).
 * dashboardComponent is set by the caller (gate passes page content).
 */
export function getSocialSubscriptionConfig(dashboardComponent) {
  return {
    displayName: 'Social Central',
    subtitle: 'AI-powered social media marketing for artists and creators',
    autoApprove: true,  // No application step needed
    dashboardComponent,
    tiers: socialSubscriptionTiers,
    applicationFields: null,
    applicationEndpoint: null,
    applicationMethod: null,
    subscriptionApiBase: 'api/v2/marketing',
  };
}
