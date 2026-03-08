/**
 * Communications API Client
 * v2 API for tickets and support
 */

import { authenticatedApiRequest } from '../csrf';
import { getApiUrl } from '../config';

const COMMS_BASE = '/api/v2/communications';

// ============================================================================
// USER TICKET FUNCTIONS
// ============================================================================

/**
 * Fetch user's tickets
 */
export async function fetchTickets(options = {}) {
  const { status, limit = 50, offset = 0 } = options;

  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });
  if (status && status !== 'all') params.append('status', status);

  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMS_BASE}/tickets?${params}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch tickets');
  }

  const data = await response.json();
  return {
    tickets: data.data || [],
    pagination: data.pagination
  };
}

/**
 * Fetch ticket notifications
 */
export async function fetchTicketNotifications() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMS_BASE}/tickets/notifications`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch notifications');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Create a new ticket
 */
export async function createTicket(ticketData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMS_BASE}/tickets`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ticketData)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create ticket');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Fetch single ticket with messages
 */
export async function fetchTicket(ticketId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMS_BASE}/tickets/${ticketId}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch ticket');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Add message to ticket
 */
export async function addTicketMessage(ticketId, message) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMS_BASE}/tickets/${ticketId}/messages`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to add message');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Close a ticket
 */
export async function closeTicket(ticketId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMS_BASE}/tickets/${ticketId}/close`),
    { method: 'POST' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to close ticket');
  }

  return true;
}

// ============================================================================
// ADMIN TICKET FUNCTIONS
// ============================================================================

/**
 * Fetch all tickets (admin)
 */
export async function fetchAllTickets(options = {}) {
  const { status, ticket_type, search, limit = 50, offset = 0 } = options;

  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });
  if (status && status !== 'all') params.append('status', status);
  if (ticket_type && ticket_type !== 'all') params.append('ticket_type', ticket_type);
  if (search) params.append('search', search);

  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMS_BASE}/admin/tickets?${params}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch tickets');
  }

  const data = await response.json();
  return {
    tickets: data.data || [],
    status_counts: data.status_counts || {},
    pagination: data.pagination
  };
}

/**
 * Fetch single ticket (admin)
 */
export async function fetchAdminTicket(ticketId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMS_BASE}/admin/tickets/${ticketId}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch ticket');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Add admin message/reply
 */
export async function addAdminMessage(ticketId, message, isInternal = false) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMS_BASE}/admin/tickets/${ticketId}/messages`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, is_internal: isInternal })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to add message');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Update ticket (admin)
 */
export async function updateTicket(ticketId, updates) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMS_BASE}/admin/tickets/${ticketId}`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update ticket');
  }

  return true;
}
