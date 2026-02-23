/**
 * Events API Client - v2
 * Frontend wrapper for event management API calls
 */

import { getApiUrl } from '../config';
import { authenticatedApiRequest } from '../csrf';

const API_BASE = getApiUrl();

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Fetch all active event types
 */
export async function fetchEventTypes() {
  const response = await fetch(`${API_BASE}/api/v2/events/types`);
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to fetch event types');
  }
  return data.data;
}

/**
 * Fetch upcoming (future) active events (v2 GET /api/v2/events/upcoming).
 * For carousel, browse/find, sitemap.
 */
export async function fetchUpcomingEvents(options = {}) {
  const params = new URLSearchParams();
  params.set('limit', String(options.limit ?? 20));
  params.set('offset', String(options.offset ?? 0));

  const response = await fetch(`${API_BASE}/api/v2/events/upcoming?${params.toString()}`);
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to fetch upcoming events');
  }
  return Array.isArray(data.data) ? data.data : [];
}

/**
 * Fetch upcoming events for browse/find new (v2). Same as fetchUpcomingEvents with higher default limit.
 */
export async function fetchBrowseEvents(options = {}) {
  return fetchUpcomingEvents({ limit: options.limit ?? 200, offset: options.offset ?? 0 });
}

// ============================================================================
// EVENT CRUD
// ============================================================================

/**
 * Fetch event by ID with images
 */
export async function fetchEvent(eventId) {
  const response = await fetch(`${API_BASE}/api/v2/events/${eventId}`);
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to fetch event');
  }
  return data.data;
}

/**
 * Fetch current user's events (promoter)
 */
export async function fetchMyEvents() {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/mine`);
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to fetch events');
  }
  return data.data;
}

/**
 * Create new event
 */
export async function createEvent(eventData) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to create event');
  }
  return data.data;
}

/**
 * Update event (partial)
 */
export async function updateEvent(eventId, eventData) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/${eventId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to update event');
  }
  return data.data;
}

/**
 * Archive event (soft delete)
 */
export async function archiveEvent(eventId) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/${eventId}`, {
    method: 'DELETE'
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to archive event');
  }
  return data;
}

// ============================================================================
// ARTIST CUSTOM EVENTS (personal calendar items)
// ============================================================================

/**
 * Fetch artist's custom personal events (v2 GET /api/v2/events/custom)
 */
export async function fetchCustomEvents() {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/custom`);
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to fetch custom events');
  }
  return Array.isArray(data.data) ? data.data : [];
}

/**
 * Create a custom personal event (v2 POST /api/v2/events/custom)
 * @param {Object} eventData - event_name, event_start_date, event_end_date, venue_name, city, state, website, promoter_name, promoter_email, notify_promoter
 */
export async function createCustomEvent(eventData) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to create custom event');
  }
  return data.data;
}

/**
 * Update a custom personal event (v2 PUT /api/v2/events/custom/:id)
 */
export async function updateCustomEvent(eventId, eventData) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/custom/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to update custom event');
  }
  return data.data;
}

/**
 * Delete a custom personal event (v2 DELETE /api/v2/events/custom/:id)
 */
export async function deleteCustomEvent(eventId) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/custom/${eventId}`, {
    method: 'DELETE'
  });
  const data = await response.json();
  if (!response.ok || (data.success === false && data.error)) {
    throw new Error(data.error?.message || 'Failed to delete custom event');
  }
}

// ============================================================================
// JURY PACKETS
// ============================================================================

/**
 * Fetch current user's jury packets
 */
export async function fetchJuryPackets() {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/jury-packets`);
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to fetch jury packets');
  }
  return data.data;
}

/**
 * Fetch single jury packet by id
 */
export async function fetchJuryPacket(id) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/jury-packets/${id}`);
  const data = await response.json();
  if (!data.success) {
    if (data.error?.code === 'NOT_FOUND') {
      throw new Error('Jury packet not found');
    }
    throw new Error(data.error?.message || 'Failed to fetch jury packet');
  }
  return data.data;
}

/**
 * Create jury packet
 * @param {Object} payload - { packet_name, packet_data?, photos_data?, persona_id? }
 */
export async function createJuryPacket(payload) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/jury-packets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to create jury packet');
  }
  return data.data;
}

/**
 * Update jury packet
 * @param {string|number} id - Packet id
 * @param {Object} payload - { packet_name, packet_data?, photos_data?, persona_id? }
 */
export async function updateJuryPacket(id, payload) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/jury-packets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to update jury packet');
  }
  return data.data;
}

/**
 * Delete jury packet
 */
export async function deleteJuryPacket(id) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/jury-packets/${id}`, {
    method: 'DELETE'
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to delete jury packet');
  }
  return data.data;
}

/**
 * Upload files for jury packet / application (legacy endpoint)
 * @param {File[]} files - Files to upload
 * @returns {Promise<string[]>} URLs
 */
export async function uploadJuryPacketFiles(files) {
  const formData = new FormData();
  [].concat(files).forEach(file => formData.append('images', file));
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/jury-packets/upload`, {
    method: 'POST',
    body: formData
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Failed to upload');
  return data.data?.urls || [];
}

// ============================================================================
// APPLICATION FIELDS
// ============================================================================

/**
 * Fetch application fields for an event
 */
export async function fetchApplicationFields(eventId) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/${eventId}/application-fields`);
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to fetch application fields');
  }
  return data.data;
}

/**
 * Add application field to an event
 */
export async function addApplicationField(eventId, fieldData) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/${eventId}/application-fields`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fieldData)
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to add application field');
  }
  return data.data;
}

/**
 * Clear all application fields for an event
 */
export async function clearApplicationFields(eventId) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/${eventId}/application-fields`, {
    method: 'DELETE'
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to clear application fields');
  }
  return data;
}

// ============================================================================
// AVAILABLE ADD-ONS
// ============================================================================

/**
 * Fetch available add-ons for an event
 */
export async function fetchAvailableAddons(eventId) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/${eventId}/available-addons`);
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to fetch available addons');
  }
  return data.data;
}

/**
 * Add available add-on to an event
 */
export async function addAvailableAddon(eventId, addonData) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/${eventId}/available-addons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(addonData)
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to add available addon');
  }
  return data.data;
}

/**
 * Clear all add-ons for an event
 */
export async function clearAvailableAddons(eventId) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/${eventId}/available-addons`, {
    method: 'DELETE'
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to clear available addons');
  }
  return data;
}

// ============================================================================
// IMAGES
// ============================================================================

/**
 * Fetch event images
 */
export async function fetchEventImages(eventId) {
  const response = await fetch(`${API_BASE}/api/v2/events/${eventId}/images`);
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to fetch event images');
  }
  return data.data;
}

/**
 * Fetch event categories (public event page)
 */
export async function fetchEventCategories(eventId) {
  const response = await fetch(`${API_BASE}/api/v2/events/${eventId}/categories`);
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to fetch event categories');
  }
  return Array.isArray(data.data) ? data.data : [];
}

/**
 * Fetch exhibiting artists for event (public event page)
 */
export async function fetchEventArtists(eventId) {
  const response = await fetch(`${API_BASE}/api/v2/events/${eventId}/artists`);
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to fetch event artists');
  }
  return Array.isArray(data.data) ? data.data : [];
}

/**
 * Fetch artist's event applications (public profile display)
 */
export async function fetchArtistEventApplications(artistId) {
  const response = await fetch(`${API_BASE}/api/v2/events/artist/${artistId}/applications`);
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to fetch artist event applications');
  }
  return Array.isArray(data.data) ? data.data : [];
}

// ============================================================================
// EVENT TICKETS (public list + purchase)
// ============================================================================

/**
 * Fetch available tickets for an event (v2 GET /api/v2/events/:id/tickets)
 */
export async function fetchEventTickets(eventId) {
  const response = await fetch(`${API_BASE}/api/v2/events/${eventId}/tickets`);
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to fetch tickets');
  }
  return Array.isArray(data.data) ? data.data : [];
}

/**
 * Create payment intent for ticket purchase (v2 POST /api/v2/events/:id/tickets/:ticketId/purchase)
 * @param {string|number} eventId
 * @param {string|number} ticketId
 * @param {Object} payload - { buyer_email, buyer_name?, quantity }
 * @returns {Promise<{ payment_intent: object, ticket_info: object }>}
 */
export async function purchaseEventTicket(eventId, ticketId, payload) {
  const response = await fetch(`${API_BASE}/api/v2/events/${eventId}/tickets/${ticketId}/purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      buyer_email: payload.buyer_email,
      buyer_name: payload.buyer_name || '',
      quantity: payload.quantity ?? 1
    })
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || data.error?.code || 'Failed to process purchase');
  }
  return { payment_intent: data.payment_intent, ticket_info: data.ticket_info };
}

/**
 * Upload event images
 */
export async function uploadEventImages(files, eventId = 'new') {
  const formData = new FormData();
  files.forEach(file => {
    formData.append('images', file);
  });

  const response = await authenticatedApiRequest(
    `${API_BASE}/api/v2/events/upload?event_id=${eventId}`,
    {
      method: 'POST',
      body: formData
    }
  );
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to upload images');
  }
  return data.data.urls;
}

// ============================================================================
// ADMIN
// ============================================================================

/**
 * Fetch all events (admin only)
 */
export async function fetchAllEvents({ status, limit = 50, offset = 0, search } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (limit) params.set('limit', limit.toString());
  if (offset) params.set('offset', offset.toString());
  if (search) params.set('search', search);

  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/admin/all?${params.toString()}`);
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to fetch events');
  }
  return data;
}

// ============================================================================
// EVENT CLAIM (artist custom event → promoter claims)
// ============================================================================

/**
 * Verify event claim token (public).
 * @param {string} token - Claim token from email link
 * @returns {Promise<{ valid: boolean, event?: object }>} valid and event details, or valid: false with error
 */
export async function verifyClaimToken(token) {
  const response = await fetch(`${API_BASE}/api/v2/events/claim/verify/${token}`);
  const data = await response.json();
  if (!response.ok) {
    return { valid: false, error: data.error?.message || data.error || 'Invalid or expired claim link' };
  }
  return data;
}

/**
 * Claim artist custom event as new draft event (promoter). Requires auth.
 * @param {string} token - Claim token
 * @returns {Promise<{ redirect_url: string }>}
 */
export async function claimNew(token) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/claim/new/${token}`, {
    method: 'POST'
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to claim event');
  }
  return { redirect_url: data.redirect_url };
}

/**
 * Link artist custom event to existing promoter event. Requires auth.
 * @param {string} token - Claim token
 * @param {number} eventId - Existing event ID to link to
 * @returns {Promise<{ event_id: number, event_title: string }>}
 */
export async function linkExistingClaim(token, eventId) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/claim/link/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event_id: eventId })
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error?.message || 'Failed to link event');
  }
  return { event_id: data.event_id, event_title: data.event_title };
}

// ============================================================================
// ADMIN: UNCLAIMED EVENTS (Promoter Onboarding)
// ============================================================================

/**
 * Fetch unclaimed events (admin only)
 * Events created by admin pending promoter claim
 */
export async function fetchUnclaimedEvents() {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/admin/unclaimed`);
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to fetch unclaimed events');
  }
  return data.data;
}

/**
 * Resend claim email for an unclaimed event (admin only)
 * @param {number} eventId - Event ID
 */
export async function resendClaimEmail(eventId) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/admin/unclaimed/${eventId}/resend`, {
    method: 'POST'
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to resend claim email');
  }
  return data;
}

/**
 * Delete unclaimed event and draft promoter (admin only)
 * @param {number} eventId - Event ID
 */
export async function deleteUnclaimedEvent(eventId) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/admin/unclaimed/${eventId}`, {
    method: 'DELETE'
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to delete unclaimed event');
  }
  return data;
}

/**
 * Check for duplicate events before creating a custom event
 * @param {Object} eventData - Event details to check
 * @returns {Array} matches - Potential duplicate matches
 */
export async function checkDuplicateEvents(eventData) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/custom/check-duplicates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to check duplicates');
  }
  return data.data.matches;
}

/**
 * Append current user to an existing custom event claim group
 * @param {number} customEventId - The custom event ID to join
 */
export async function appendArtistToClaim(customEventId) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/custom/${customEventId}/append-artist`, {
    method: 'POST'
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to join event claim');
  }
  return data;
}

/**
 * Request to be verified as exhibiting at an event
 * @param {number} eventId - Event ID
 */
export async function requestExhibiting(eventId) {
  const response = await authenticatedApiRequest(`${API_BASE}/api/v2/events/${eventId}/request-exhibiting`, {
    method: 'POST'
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || 'Failed to submit exhibiting request');
  }
  return data;
}
