/**
 * Finances API Client
 * v2 API for vendor financial data
 */

import { authenticatedApiRequest } from '../csrf';
import { getApiUrl } from '../config';

const FINANCES_BASE = '/api/v2/finances';

/**
 * Fetch vendor's balance and financial overview
 * @returns {Promise<Object>}
 */
export async function fetchBalance() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${FINANCES_BASE}/balance`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch balance');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Fetch earnings metrics
 * @returns {Promise<Object>}
 */
export async function fetchEarnings() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${FINANCES_BASE}/earnings`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch earnings');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Fetch transaction history
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
export async function fetchTransactions(options = {}) {
  const { page = 1, limit = 50, type, status } = options;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });
  if (type) params.append('type', type);
  if (status) params.append('status', status);

  const response = await authenticatedApiRequest(
    getApiUrl(`${FINANCES_BASE}/transactions?${params}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch transactions');
  }

  const data = await response.json();
  return {
    transactions: data.data || [],
    pagination: data.pagination
  };
}

/**
 * Fetch payout history
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
export async function fetchPayouts(options = {}) {
  const { page = 1, limit = 20 } = options;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });

  const response = await authenticatedApiRequest(
    getApiUrl(`${FINANCES_BASE}/payouts?${params}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch payouts');
  }

  const data = await response.json();
  return {
    payouts: data.data || [],
    pending: data.pending,
    pagination: data.pagination
  };
}

// =============================================================================
// COMMISSION MANAGEMENT (Admin)
// =============================================================================

/**
 * Fetch all commission rates (admin only)
 * @returns {Promise<Object>}
 */
export async function fetchCommissionRates() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${FINANCES_BASE}/commission-rates`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch commission rates');
  }

  return await response.json();
}

/**
 * Create a new commission rate setting (admin only)
 * @param {Object} data - { user_id, user_type, commission_rate, fee_structure, notes }
 * @returns {Promise<Object>}
 */
export async function createCommissionRate(data) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${FINANCES_BASE}/commission-rates`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create commission rate');
  }

  return await response.json();
}

/**
 * Update a single commission rate (admin only)
 * @param {number} settingId - financial_settings.id
 * @param {Object} updates - { commission_rate, fee_structure, notes }
 * @returns {Promise<Object>}
 */
export async function updateCommissionRate(settingId, updates) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${FINANCES_BASE}/commission-rates/${settingId}`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update commission rate');
  }

  return await response.json();
}

/**
 * Bulk update commission rates (admin only)
 * @param {Array} updates - Array of { id, commission_rate, fee_structure, notes }
 * @returns {Promise<Object>}
 */
export async function bulkUpdateCommissionRates(updates) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${FINANCES_BASE}/commission-rates/bulk`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to bulk update commission rates');
  }

  return await response.json();
}

// =============================================================================
// ADMIN REFUNDS
// =============================================================================

/**
 * Fetch all payments for admin refund management
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
export async function fetchAdminPayments(options = {}) {
  const { days = 90, type = 'all', search = '', page = 1, limit = 50, sort = 'created_at', order = 'desc' } = options;

  const params = new URLSearchParams({
    days: String(days),
    type,
    page: String(page),
    limit: String(limit),
    sort,
    order
  });
  if (search) params.append('search', search);

  const response = await authenticatedApiRequest(
    getApiUrl(`${FINANCES_BASE}/admin/payments?${params}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch payments');
  }

  const data = await response.json();
  return {
    payments: data.data || [],
    pagination: data.pagination
  };
}

/**
 * Get a single payment details
 * @param {string} paymentType - Type of payment
 * @param {number} paymentId - Payment ID
 * @returns {Promise<Object>}
 */
export async function fetchAdminPayment(paymentType, paymentId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${FINANCES_BASE}/admin/payments/${paymentType}/${paymentId}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch payment details');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Process a refund for a payment
 * @param {string} paymentType - Type of payment
 * @param {number} paymentId - Payment ID
 * @param {number} amount - Refund amount
 * @param {string} reason - Refund reason
 * @returns {Promise<Object>}
 */
export async function processAdminRefund(paymentType, paymentId, amount, reason = '') {
  const response = await authenticatedApiRequest(
    getApiUrl(`${FINANCES_BASE}/admin/payments/${paymentType}/${paymentId}/refund`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, reason })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to process refund');
  }

  return await response.json();
}

/**
 * Fetch list of processed refunds
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
export async function fetchAdminRefunds(options = {}) {
  const { page = 1, limit = 50, search = '' } = options;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });
  if (search) params.append('search', search);

  const response = await authenticatedApiRequest(
    getApiUrl(`${FINANCES_BASE}/admin/refunds?${params}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch refunds');
  }

  const data = await response.json();
  return {
    refunds: data.data || [],
    stats: data.stats,
    pagination: data.pagination
  };
}
