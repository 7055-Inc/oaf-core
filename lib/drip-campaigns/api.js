/**
 * Drip Campaigns API Client
 * 
 * Frontend wrapper functions for drip campaign management.
 * All functions call /api/v2/drip-campaigns endpoints.
 */

import { authenticatedApiRequest } from '../auth';
import { getApiUrl } from '../config';

const DRIP_BASE = '/api/v2/drip-campaigns';

// =============================================================================
// CAMPAIGNS
// =============================================================================

/**
 * Fetch user's campaigns with optional filtering
 * @param {Object} filters - Query params { status, search, page, limit }
 * @returns {Promise<Object>} { campaigns, pagination }
 */
export async function fetchMyCampaigns(filters = {}) {
  const queryParams = new URLSearchParams();
  if (filters.status) queryParams.append('status', filters.status);
  if (filters.search) queryParams.append('search', filters.search);
  if (filters.page) queryParams.append('page', String(filters.page));
  if (filters.limit) queryParams.append('limit', String(filters.limit));

  const url = queryParams.toString() 
    ? `${DRIP_BASE}/my-campaigns?${queryParams}` 
    : `${DRIP_BASE}/my-campaigns`;

  const response = await authenticatedApiRequest(getApiUrl(url), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch campaigns');
  return data;
}

/**
 * Fetch single campaign by ID
 * @param {number} id - Campaign ID
 * @returns {Promise<Object>} Campaign data
 */
export async function fetchMyCampaign(id) {
  const response = await authenticatedApiRequest(getApiUrl(`${DRIP_BASE}/my-campaigns/${id}`), {
    method: 'GET'
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch campaign');
  return data;
}

/**
 * Create new drip campaign
 * @param {Object} campaignData - Campaign configuration
 * @returns {Promise<Object>}
 */
export async function createCampaign(campaignData) {
  const response = await authenticatedApiRequest(getApiUrl(`${DRIP_BASE}/my-campaigns`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(campaignData)
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to create campaign');
  return data;
}

/**
 * Update existing campaign
 * @param {number} id - Campaign ID
 * @param {Object} updates - Campaign updates
 * @returns {Promise<Object>}
 */
export async function updateCampaign(id, updates) {
  const response = await authenticatedApiRequest(getApiUrl(`${DRIP_BASE}/my-campaigns/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to update campaign');
  return data;
}

/**
 * Delete campaign
 * @param {number} id - Campaign ID
 * @returns {Promise<Object>}
 */
export async function deleteCampaign(id) {
  const response = await authenticatedApiRequest(getApiUrl(`${DRIP_BASE}/my-campaigns/${id}`), {
    method: 'DELETE'
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to delete campaign');
  return data;
}

/**
 * Get campaign analytics
 * @param {number} id - Campaign ID
 * @returns {Promise<Object>} Analytics data
 */
export async function getCampaignAnalytics(id) {
  const response = await authenticatedApiRequest(getApiUrl(`${DRIP_BASE}/my-campaigns/${id}/analytics`), {
    method: 'GET'
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch analytics');
  return data;
}

/**
 * Update campaign status (activate, pause)
 * @param {number} id - Campaign ID
 * @param {string} status - New status (active, paused, draft)
 * @returns {Promise<Object>}
 */
export async function updateCampaignStatus(id, status) {
  return updateCampaign(id, { status });
}
