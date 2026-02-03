/**
 * Email API Client
 * Frontend API functions for email management
 */

import { authenticatedApiRequest } from '../auth';
import { getApiUrl } from '../config';

const EMAIL_BASE = '/api/v2/email';

// ============================================================================
// STATS & OVERVIEW
// ============================================================================

/**
 * Get email system statistics
 */
export async function getStats() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${EMAIL_BASE}/stats`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch stats');
  }

  return await response.json();
}

/**
 * Get recent email activity
 */
export async function getRecentActivity(limit = 20) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${EMAIL_BASE}/recent?limit=${limit}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch recent activity');
  }

  return await response.json();
}

// ============================================================================
// TEMPLATES
// ============================================================================

/**
 * Get all email templates
 */
export async function getTemplates() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${EMAIL_BASE}/templates`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch templates');
  }

  return await response.json();
}

/**
 * Get single template
 */
export async function getTemplate(id) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${EMAIL_BASE}/templates/${id}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch template');
  }

  return await response.json();
}

/**
 * Update template
 */
export async function updateTemplate(id, data) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${EMAIL_BASE}/templates/${id}`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update template');
  }

  return await response.json();
}

/**
 * Create template
 */
export async function createTemplate(data) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${EMAIL_BASE}/templates`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to create template');
  }

  return await response.json();
}

/**
 * Delete template
 */
export async function deleteTemplate(id) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${EMAIL_BASE}/templates/${id}`),
    { method: 'DELETE' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete template');
  }

  return await response.json();
}

/**
 * Get available layouts
 */
export async function getLayouts() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${EMAIL_BASE}/layouts`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch layouts');
  }

  return await response.json();
}

// ============================================================================
// LOGS
// ============================================================================

/**
 * Get email logs with filters
 */
export async function getLogs(filters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.status) params.append('status', filters.status);
  if (filters.templateId) params.append('template_id', filters.templateId);
  if (filters.startDate) params.append('start_date', filters.startDate);
  if (filters.endDate) params.append('end_date', filters.endDate);
  if (filters.page) params.append('page', filters.page);
  if (filters.limit) params.append('limit', filters.limit);

  const queryString = params.toString();
  const response = await authenticatedApiRequest(
    getApiUrl(`${EMAIL_BASE}/logs${queryString ? `?${queryString}` : ''}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch logs');
  }

  return await response.json();
}

/**
 * Get single log entry
 */
export async function getLog(id) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${EMAIL_BASE}/logs/${id}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch log');
  }

  return await response.json();
}

// ============================================================================
// SENDING
// ============================================================================

/**
 * Send preview email
 */
export async function sendPreview(data) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${EMAIL_BASE}/send-preview`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to send preview');
  }

  return await response.json();
}

/**
 * Resend email from logs
 */
export async function resendEmail(logId, overrideEmail = null) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${EMAIL_BASE}/resend/${logId}`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: overrideEmail })
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to resend email');
  }

  return await response.json();
}

/**
 * Send test email using template
 */
export async function sendTestEmail(recipient, templateKey, testData = {}) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${EMAIL_BASE}/test`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient, templateKey, testData })
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to send test email');
  }

  return await response.json();
}

// ============================================================================
// QUEUE
// ============================================================================

/**
 * Get queue status
 */
export async function getQueue() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${EMAIL_BASE}/queue`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch queue');
  }

  return await response.json();
}

/**
 * Process queue manually
 */
export async function processQueue() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${EMAIL_BASE}/queue/process`),
    { method: 'POST' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to process queue');
  }

  return await response.json();
}

// ============================================================================
// BOUNCES
// ============================================================================

/**
 * Get bounce data
 */
export async function getBounces() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${EMAIL_BASE}/bounces`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch bounces');
  }

  return await response.json();
}

/**
 * Unblacklist domain
 */
export async function unblacklistDomain(domain) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${EMAIL_BASE}/bounces/unblacklist`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ domain })
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to unblacklist domain');
  }

  return await response.json();
}
