/**
 * Subscriptions API client
 * Handles shipping subscription API calls
 */

import { authApiRequest } from '../apiUtils';

/**
 * Get shipping subscription status
 */
export async function getShippingSubscription() {
  const response = await authApiRequest('api/v2/commerce/subscriptions/shipping/my');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch shipping subscription');
  return data;
}

/**
 * Update shipping preferences (Connect balance preference)
 */
export async function updateShippingPreferences(preferConnectBalance) {
  const response = await authApiRequest('api/v2/commerce/subscriptions/shipping/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferConnectBalance })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update preferences');
  return data;
}
