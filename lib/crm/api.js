/**
 * CRM Subscription API Helper Functions
 * Frontend API client for CRM subscription management
 */

import { authApiRequest } from '../apiUtils';

const API_BASE = '/api/v2/crm-subscription';

/**
 * Get my CRM subscription status
 * @returns {Promise<object>} Subscription data
 */
export async function fetchCRMSubscription() {
  const response = await authApiRequest(`${API_BASE}/subscription/my`);
  if (!response.ok) {
    throw new Error('Failed to fetch CRM subscription');
  }
  return await response.json();
}

/**
 * Select a CRM tier (step 1 of subscription flow)
 * @param {string} tierName - Tier ID (beginner, pro)
 * @param {number} tierPrice - Tier price
 * @returns {Promise<object>} Result
 */
export async function selectCRMTier(tierName, tierPrice) {
  const response = await authApiRequest(`${API_BASE}/subscription/select-tier`, {
    method: 'POST',
    body: JSON.stringify({
      subscription_type: 'crm',
      tier_name: tierName,
      tier_price: tierPrice
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to select tier');
  }
  
  return await response.json();
}

/**
 * Get CRM terms check
 * @returns {Promise<object>} Terms data
 */
export async function fetchCRMTermsCheck() {
  const response = await authApiRequest(`${API_BASE}/subscription/terms-check`);
  if (!response.ok) {
    throw new Error('Failed to fetch terms');
  }
  return await response.json();
}

/**
 * Accept CRM terms (step 2 of subscription flow)
 * @param {number} termsVersionId - Terms version ID
 * @returns {Promise<object>} Result
 */
export async function acceptCRMTerms(termsVersionId) {
  const response = await authApiRequest(`${API_BASE}/subscription/accept-terms`, {
    method: 'POST',
    body: JSON.stringify({ terms_version_id: termsVersionId })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to accept terms');
  }
  
  return await response.json();
}

/**
 * Change CRM tier (for active subscriptions)
 * @param {string} newTierName - New tier ID
 * @param {number} newTierPrice - New tier price
 * @returns {Promise<object>} Result
 */
export async function changeCRMTier(newTierName, newTierPrice) {
  const response = await authApiRequest(`${API_BASE}/subscription/change-tier`, {
    method: 'POST',
    body: JSON.stringify({
      new_tier_name: newTierName,
      new_tier_price: newTierPrice
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to change tier');
  }
  
  return await response.json();
}

/**
 * Cancel CRM subscription
 * @returns {Promise<object>} Result
 */
export async function cancelCRMSubscription() {
  const response = await authApiRequest(`${API_BASE}/subscription/cancel`, {
    method: 'POST',
    body: JSON.stringify({})
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to cancel subscription');
  }
  
  return await response.json();
}
