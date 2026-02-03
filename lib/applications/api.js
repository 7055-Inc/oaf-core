/**
 * Applications API Client - v2
 * Frontend wrapper for event applications API calls
 */

import { getApiUrl } from '../config';
import { secureApiRequest, authenticatedApiRequest } from '../csrf';

const API_BASE = getApiUrl();

// ============================================================================
// ARTIST APPLICATIONS
// ============================================================================

/**
 * Fetch current user's applications
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status
 */
export async function fetchMyApplications({ status } = {}) {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.set('status', status);
  
  const url = `${API_BASE}/api/v2/applications/mine${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await authenticatedApiRequest(url);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to fetch applications');
  }
  return data.data;
}

/**
 * Fetch application statistics
 */
export async function fetchApplicationStats() {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/applications/stats`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to fetch application stats');
  }
  return data.data;
}

/**
 * Fetch single application by ID
 * @param {number} applicationId - Application ID
 */
export async function fetchApplication(applicationId) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/applications/${applicationId}`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to fetch application');
  }
  return data.data;
}

/**
 * Delete a draft application
 * @param {number} applicationId - Application ID
 */
export async function deleteApplication(applicationId) {
  const response = await secureApiRequest(`${API_BASE}/api/v2/applications/${applicationId}`, {
    method: 'DELETE'
  });
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to delete application');
  }
  return data;
}

/**
 * Get application stats for an event (public)
 * @param {number} eventId - Event ID
 */
export async function getEventApplicationStats(eventId) {
  const response = await fetch(`${API_BASE}/api/applications/events/${eventId}/stats`);
  if (!response.ok) throw new Error('Failed to fetch application stats');
  const data = await response.json();
  return data.stats || null;
}

/**
 * Apply to an event (from scratch)
 * @param {number} eventId - Event ID
 * @param {Object} body - artist_statement, portfolio_url, additional_info, additional_notes, persona_id
 */
export async function applyToEvent(eventId, body) {
  const response = await secureApiRequest(`${API_BASE}/api/applications/events/${eventId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to submit application');
  return data;
}

/**
 * Apply to an event using a jury packet
 * @param {number} eventId - Event ID
 * @param {number} packetId - Jury packet ID
 * @param {Object} body - additional_info, additional_notes
 */
export async function applyWithPacket(eventId, packetId, body = {}) {
  const response = await secureApiRequest(`${API_BASE}/api/applications/apply-with-packet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: eventId,
      packet_id: packetId,
      additional_info: body.additional_info || '',
      additional_notes: body.additional_notes || ''
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to submit application');
  return data;
}

/**
 * Add addon request to an application
 * @param {number} applicationId - Application ID
 * @param {Object} body - available_addon_id, requested, notes
 */
export async function addAddonRequest(applicationId, body) {
  const response = await secureApiRequest(`${API_BASE}/api/applications/${applicationId}/addon-requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to save add-on request');
  }
  return response.json();
}

/**
 * Create Stripe payment intent for application/jury fees (legacy)
 * @param {number} applicationId - Application ID
 * @returns {Promise<{ client_secret: string }>}
 */
export async function createApplicationPaymentIntent(applicationId) {
  const response = await secureApiRequest(`${API_BASE}/api/applications/${applicationId}/create-payment-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create payment intent');
  return { client_secret: data.client_secret };
}

/**
 * Confirm application payment after Stripe success (legacy)
 * @param {number} applicationId - Application ID
 * @param {string} paymentIntentId - Stripe payment intent ID
 */
export async function confirmApplicationPayment(applicationId, paymentIntentId) {
  const response = await secureApiRequest(`${API_BASE}/api/applications/${applicationId}/confirm-payment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payment_intent_id: paymentIntentId })
  });
  if (!response.ok) throw new Error('Failed to confirm payment');
}

/**
 * Update application (draft) - legacy PATCH
 * @param {number} applicationId - Application ID
 * @param {Object} body - artist_statement, portfolio_url, additional_info, additional_notes, etc.
 */
export async function updateApplication(applicationId, body) {
  const response = await secureApiRequest(`${API_BASE}/api/applications/${applicationId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update application');
  }
  return response.json();
}

// ============================================================================
// PROMOTER: EVENTS RECEIVING APPLICATIONS & APPLICATION MANAGEMENT
// ============================================================================

/**
 * Fetch promoter's events that accept applications (v2: uses events/mine, filter client-side)
 * @param {number} _promoterId - Unused; current user is implied by auth for v2 /mine
 */
export async function fetchPromoterEventsWithApplications(_promoterId) {
  const events = await fetchMyEvents();
  return (events || []).filter(e => e.allow_applications === 1 || e.allow_applications === true);
}

/**
 * Fetch applications for an event (promoter view)
 * @param {number} eventId - Event ID
 */
export async function fetchEventApplications(eventId) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/applications/events/${eventId}/applications`);
  if (!response.ok) throw new Error('Failed to fetch applications');
  const data = await response.json();
  return data.applications || [];
}

/**
 * Update application status (promoter: accept, reject, etc.)
 * @param {number} applicationId - Application ID
 * @param {string} status - New status
 * @param {string} [juryComments] - Optional jury comments
 */
export async function updateApplicationStatus(applicationId, status, juryComments = '') {
  const response = await secureApiRequest(`${API_BASE}/api/applications/${applicationId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, jury_comments: juryComments })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update application status');
  }
}

// ============================================================================
// ADMIN: ALL APPLICATIONS
// ============================================================================

/**
 * Fetch all applications (admin only), with sort, search, filter, pagination
 * @param {Object} params - status, search, sort, order, limit, offset
 */
export async function fetchAdminApplications(params = {}) {
  const q = new URLSearchParams();
  if (params.status && params.status !== 'all') q.set('status', params.status);
  if (params.search) q.set('search', params.search);
  if (params.sort) q.set('sort', params.sort);
  if (params.order) q.set('order', params.order);
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.offset != null) q.set('offset', String(params.offset));
  const url = `${API_BASE}/api/v2/applications/admin/all${q.toString() ? `?${q.toString()}` : ''}`;
  const response = await authenticatedApiRequest(url);
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to fetch applications');
  return { data: data.data, pagination: data.pagination || {} };
}

/**
 * Fetch single application full detail (admin only)
 * @param {number} applicationId - Application ID
 */
export async function fetchAdminApplicationDetail(applicationId) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/applications/admin/${applicationId}`);
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to fetch application');
  return data.data;
}
