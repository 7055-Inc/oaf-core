/**
 * CRM Subscription Configuration
 * 
 * Configuration for the ChecklistController-based subscription flow.
 * Used by CRMSubscriptionGate component.
 */

const { getAllTiersForDisplay } = require('../../../lib/crm/tierConfig');

export const crmSubscriptionTiers = getAllTiersForDisplay();

/**
 * Base config for CRM subscription (tier/terms/card flow).
 * dashboardComponent is set by caller (gate uses page content).
 */
export function getCRMSubscriptionConfig(dashboardComponent) {
  return {
    displayName: 'CRM & Email Marketing',
    subtitle: 'Collect, manage, and engage your audience with professional email marketing tools',
    autoApprove: true,  // No application required
    dashboardComponent,
    tiers: crmSubscriptionTiers,
    applicationFields: null,  // No application form needed
    applicationEndpoint: null,
    applicationMethod: null,
    subscriptionApiBase: 'api/v2/crm-subscription'
  };
}
