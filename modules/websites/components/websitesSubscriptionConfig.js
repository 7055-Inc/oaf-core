/**
 * Website Subscription Tiers Display Configuration
 * Imports from shared config to ensure consistency
 */

const { getAllTiersForDisplay } = require('../../../lib/websites/tierConfig');

export const websitesSubscriptionTiers = getAllTiersForDisplay();

/**
 * Base config for websites subscription (tier/terms/card flow).
 * dashboardComponent is set by caller (gate uses page content).
 */
export function getWebsitesSubscriptionConfig(dashboardComponent) {
  return {
    displayName: 'Website Subscription',
    subtitle: 'Create stunning artist websites with your OAF data',
    autoApprove: true,
    dashboardComponent,
    tiers: websitesSubscriptionTiers,
    applicationFields: null,
    applicationEndpoint: null,
    applicationMethod: null,
    subscriptionApiBase: 'api/v2/websites'
  };
}
