/**
 * Marketing API Client
 * Frontend API functions for marketing content submissions and newsletter
 */

import { authenticatedApiRequest } from '../auth';
import { getApiUrl } from '../config';

const MARKETING_BASE = '/api/v2/marketing';

// ============================================================================
// NEWSLETTER
// ============================================================================

/**
 * Subscribe to newsletter
 * @param {string} email - Email address to subscribe
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function subscribeToNewsletter(email) {
  const response = await fetch(getApiUrl(`${MARKETING_BASE}/newsletter/subscribe`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.message || 'Failed to subscribe');
  }

  return data;
}

// ============================================================================
// CONTENT SUBMISSIONS
// ============================================================================

/**
 * Get user info for form prefill
 */
export async function getUserInfo() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${MARKETING_BASE}/user-info`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch user info');
  }

  const data = await response.json();
  return data;
}

/**
 * Submit marketing content with files
 * @param {FormData} formData - Form data with files and metadata
 */
export async function submitContent(formData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${MARKETING_BASE}/submit`),
    {
      method: 'POST',
      body: formData,
      // Don't set Content-Type - browser will set it with boundary for multipart
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to submit content');
  }

  return await response.json();
}

/**
 * Get current user's submissions
 */
export async function getMySubmissions() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${MARKETING_BASE}/my-submissions`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch submissions');
  }

  return await response.json();
}

/**
 * Get all submissions (admin)
 */
export async function getAllSubmissions(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.userId) params.append('user_id', filters.userId);
  if (filters.limit) params.append('limit', filters.limit);
  if (filters.offset) params.append('offset', filters.offset);
  
  const queryString = params.toString();
  const endpoint = `${MARKETING_BASE}/admin/submissions${queryString ? `?${queryString}` : ''}`;
  
  const response = await authenticatedApiRequest(
    getApiUrl(endpoint),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch submissions');
  }

  return await response.json();
}

/**
 * Get single submission (admin)
 */
export async function getSubmission(id) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${MARKETING_BASE}/admin/submissions/${id}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to fetch submission');
  }

  return await response.json();
}

/**
 * Update admin notes on submission
 */
export async function updateAdminNotes(id, adminNotes) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${MARKETING_BASE}/admin/submissions/${id}/notes`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ admin_notes: adminNotes })
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update notes');
  }

  return await response.json();
}

/**
 * Update submission status
 */
export async function updateStatus(id, status) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${MARKETING_BASE}/admin/submissions/${id}/status`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to update status');
  }

  return await response.json();
}

/**
 * Delete submission
 */
export async function deleteSubmission(id) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${MARKETING_BASE}/admin/submissions/${id}`),
    { method: 'DELETE' }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Failed to delete submission');
  }

  return await response.json();
}

/**
 * Get media URL (handles smart serving or temp fallback)
 */
export function getMediaUrl(imagePath) {
  if (!imagePath) return null;
  
  // If it's already a full URL, return as-is
  if (imagePath.startsWith('http')) return imagePath;
  
  // Otherwise, construct URL from API base
  return getApiUrl(imagePath);
}
