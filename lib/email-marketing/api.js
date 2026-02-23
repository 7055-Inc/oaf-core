/**
 * Email Marketing API Client
 * 
 * Frontend wrapper functions for the v2 Email Marketing API.
 * All functions call /api/v2/email-marketing endpoints.
 */

import { authenticatedApiRequest } from '../auth';
import { getApiUrl } from '../config';

const EMAIL_BASE = '/api/v2/email-marketing';

// =============================================================================
// SUBSCRIBERS
// =============================================================================

/**
 * List subscribers with filtering
 * @param {Object} params - Query params { tags, status, search, page, limit }
 * @returns {Promise<Object>} { subscribers, pagination }
 */
export async function fetchSubscribers(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.tags && params.tags.length > 0) {
    params.tags.forEach(tag => queryParams.append('tags[]', tag));
  }
  if (params.status) queryParams.append('status', params.status);
  if (params.search) queryParams.append('search', params.search);
  if (params.page) queryParams.append('page', String(params.page));
  if (params.limit) queryParams.append('limit', String(params.limit));

  const url = queryParams.toString() 
    ? `${EMAIL_BASE}/subscribers?${queryParams}` 
    : `${EMAIL_BASE}/subscribers`;

  const response = await authenticatedApiRequest(getApiUrl(url), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch subscribers');
  return data;
}

/**
 * Add a new subscriber
 * @param {Object} subscriberData - { email, first_name, last_name, tags, custom_fields }
 * @returns {Promise<Object>}
 */
export async function addSubscriber(subscriberData) {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/subscribers`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subscriberData),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to add subscriber');
  return data;
}

/**
 * Update subscriber
 * @param {number} id - User list ID
 * @param {Object} updates - { first_name, last_name, custom_fields }
 * @returns {Promise<Object>}
 */
export async function updateSubscriber(id, updates) {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/subscribers/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to update subscriber');
  return data;
}

/**
 * Remove subscriber (unsubscribe)
 * @param {number} id - User list ID
 * @returns {Promise<Object>}
 */
export async function removeSubscriber(id) {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/subscribers/${id}`), {
    method: 'DELETE',
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to remove subscriber');
  return data;
}

/**
 * Import subscribers from CSV data
 * @param {Object} importData - { csv_data: [...], options: { auto_tags, skip_duplicates } }
 * @returns {Promise<Object>} { imported, skipped, errors }
 */
export async function importSubscribers(importData) {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/subscribers/import`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(importData),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to import subscribers');
  return data;
}

/**
 * Export subscribers to CSV
 * @param {Object} params - Export filters { tags, status }
 * @returns {Promise<Blob>} CSV file blob
 */
export async function exportSubscribers(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.tags && params.tags.length > 0) {
    params.tags.forEach(tag => queryParams.append('tags[]', tag));
  }
  if (params.status) queryParams.append('status', params.status);

  const url = queryParams.toString() 
    ? `${EMAIL_BASE}/subscribers/export?${queryParams}` 
    : `${EMAIL_BASE}/subscribers/export`;

  const response = await authenticatedApiRequest(getApiUrl(url), { method: 'GET' });
  
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to export subscribers');
  }
  
  return response.blob();
}

// =============================================================================
// TAGS
// =============================================================================

/**
 * Fetch all unique tags for user
 * @returns {Promise<Object>} { tags: Array }
 */
export async function fetchTags() {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/tags`), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch tags');
  return data;
}

/**
 * Add tags to subscriber
 * @param {number} id - User list ID
 * @param {string[]} tags - Array of tags
 * @returns {Promise<Object>}
 */
export async function addTagsToSubscriber(id, tags) {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/subscribers/${id}/tags`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to add tags');
  return data;
}

/**
 * Remove tags from subscriber
 * @param {number} id - User list ID
 * @param {string[]} tags - Array of tags
 * @returns {Promise<Object>}
 */
export async function removeTagsFromSubscriber(id, tags) {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/subscribers/${id}/tags`), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to remove tags');
  return data;
}

/**
 * Bulk tag subscribers matching filter
 * @param {Object} filter - { tags, status }
 * @param {string[]} tagsToAdd - Tags to add
 * @returns {Promise<Object>} { updated_count }
 */
export async function bulkTagSubscribers(filter, tagsToAdd) {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/subscribers/bulk-tag`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filter, tags: tagsToAdd }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to bulk tag');
  return data;
}

// =============================================================================
// FORMS
// =============================================================================

/**
 * List user's email collection forms
 * @returns {Promise<Object>} { forms: Array }
 */
export async function fetchForms() {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/forms`), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch forms');
  return data;
}

/**
 * Create email collection form
 * @param {Object} formData - Form configuration
 * @returns {Promise<Object>}
 */
export async function createForm(formData) {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/forms`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to create form');
  return data;
}

/**
 * Update email collection form
 * @param {number} id - Form ID
 * @param {Object} updates - Form updates
 * @returns {Promise<Object>}
 */
export async function updateForm(id, updates) {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/forms/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to update form');
  return data;
}

/**
 * Delete email collection form
 * @param {number} id - Form ID
 * @returns {Promise<Object>}
 */
export async function deleteForm(id) {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/forms/${id}`), {
    method: 'DELETE',
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to delete form');
  return data;
}

/**
 * Get form embed code
 * @param {number} id - Form ID
 * @returns {Promise<Object>} { html_embed, script_embed, react_embed }
 */
export async function getFormEmbedCode(id) {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/forms/${id}/embed-code`), {
    method: 'GET',
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to get embed code');
  return data;
}

// =============================================================================
// EMAIL TEMPLATES (tier-based)
// =============================================================================

/**
 * Fetch CRM email templates available for current user's tier
 * @returns {Promise<Object>} { templates: Array, tier: string }
 */
export async function fetchEmailTemplates() {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/templates`), {
    method: 'GET',
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch templates');
  return data;
}

// =============================================================================
// CAMPAIGNS
// =============================================================================

/**
 * List campaigns
 * @param {Object} params - Query params { type, status, page, limit }
 * @returns {Promise<Object>} { campaigns, pagination }
 */
export async function fetchCampaigns(params = {}) {
  const queryParams = new URLSearchParams();
  if (params.type) queryParams.append('type', params.type);
  if (params.status) queryParams.append('status', params.status);
  if (params.page) queryParams.append('page', String(params.page));
  if (params.limit) queryParams.append('limit', String(params.limit));

  const url = queryParams.toString() 
    ? `${EMAIL_BASE}/campaigns?${queryParams}` 
    : `${EMAIL_BASE}/campaigns`;

  const response = await authenticatedApiRequest(getApiUrl(url), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch campaigns');
  return data;
}

/**
 * Create single blast campaign
 * @param {Object} campaignData - { name, subject_line, template_key, target_list_filter }
 * @returns {Promise<Object>}
 */
export async function createSingleBlast(campaignData) {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/campaigns/single-blast`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(campaignData),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to create campaign');
  return data;
}

/**
 * Schedule campaign for later
 * @param {number} id - Campaign ID
 * @param {string} datetime - ISO datetime string
 * @returns {Promise<Object>}
 */
export async function scheduleCampaign(id, datetime) {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/campaigns/${id}/schedule`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scheduled_send_at: datetime }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to schedule campaign');
  return data;
}

/**
 * Send campaign immediately
 * @param {number} id - Campaign ID
 * @returns {Promise<Object>}
 */
export async function sendCampaignNow(id) {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/campaigns/${id}/send-now`), {
    method: 'POST',
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to send campaign');
  return data;
}

/**
 * Get campaign recipients (preview)
 * @param {number} id - Campaign ID
 * @returns {Promise<Object>} { recipients: Array, count }
 */
export async function getRecipients(id) {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/campaigns/${id}/recipients`), {
    method: 'GET',
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to get recipients');
  return data;
}

// =============================================================================
// ANALYTICS
// =============================================================================

/**
 * Get analytics overview
 * @returns {Promise<Object>} { total_subscribers, active_subscribers, open_rate, click_rate }
 */
export async function fetchAnalyticsOverview() {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/analytics/overview`), {
    method: 'GET',
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch analytics overview');
  return data;
}

/**
 * Get campaign analytics
 * @param {number} id - Campaign ID
 * @returns {Promise<Object>} Campaign stats
 */
export async function fetchCampaignAnalytics(id) {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/analytics/campaigns/${id}`), {
    method: 'GET',
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch campaign analytics');
  return data;
}

/**
 * Get list growth data
 * @param {number} days - Number of days (default 30)
 * @returns {Promise<Object>} { growth_data: Array }
 */
export async function fetchListGrowth(days = 30) {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/analytics/list-growth?days=${days}`), {
    method: 'GET',
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch list growth');
  return data;
}

/**
 * Get engagement data
 * @returns {Promise<Object>} { engagement_data: Array }
 */
export async function fetchEngagement() {
  const response = await authenticatedApiRequest(getApiUrl(`${EMAIL_BASE}/analytics/engagement`), {
    method: 'GET',
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch engagement data');
  return data;
}
