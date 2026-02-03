/**
 * Commerce API Client
 * 
 * Frontend wrapper functions for the v2 Commerce API.
 * Handles orders and returns operations.
 */

import { authenticatedApiRequest } from '../auth';
import { getApiUrl } from '../config';

const COMMERCE_BASE = '/api/v2/commerce';

// =============================================================================
// ORDERS
// =============================================================================

/**
 * Fetch customer's orders
 * @param {Object} options - Query options
 * @returns {Promise<{orders: Array, pagination: Object}>}
 */
export async function fetchMyOrders(options = {}) {
  const { page = 1, limit = 20, status = 'all' } = options;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (status && status !== 'all') {
    params.append('status', status);
  }

  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/orders/my?${params}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch orders');
  }

  const data = await response.json();
  return {
    orders: data.data || [],
    pagination: data.pagination || {},
  };
}

/**
 * Fetch a single order by ID
 * @param {number} orderId
 * @returns {Promise<Object>}
 */
export async function fetchOrder(orderId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/orders/${orderId}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch order');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Fetch all orders (admin only)
 * @param {Object} options - Query options
 * @returns {Promise<{orders: Array, pagination: Object}>}
 */
export async function fetchAdminOrders(options = {}) {
  const { page = 1, limit = 20, status = 'all' } = options;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (status && status !== 'all') {
    params.append('status', status);
  }

  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/admin/orders?${params}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch orders');
  }

  const data = await response.json();
  return {
    orders: data.data || [],
    pagination: data.pagination || {},
  };
}

// =============================================================================
// RETURNS
// =============================================================================

/**
 * Fetch customer's return requests
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
export async function fetchMyReturns(options = {}) {
  const { status = 'all' } = options;

  const params = new URLSearchParams();
  if (status && status !== 'all') {
    params.append('status', status);
  }

  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/returns/my?${params}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch returns');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Create a return request
 * @param {Object} returnData - Return request data
 * @returns {Promise<Object>}
 */
export async function createReturn(returnData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/returns`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(returnData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create return request');
  }

  return response.json();
}

/**
 * Add message to return case
 * @param {number} returnId - Return ID
 * @param {string} message - Message content
 * @returns {Promise<Object>}
 */
export async function addReturnMessage(returnId, message) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/returns/${returnId}/message`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to add message');
  }

  return response.json();
}

/**
 * Get return label URL
 * @param {number} returnId - Return ID
 * @returns {string}
 */
export function getReturnLabelUrl(returnId) {
  return getApiUrl(`${COMMERCE_BASE}/returns/${returnId}/label`);
}

// =============================================================================
// SALES (Vendor Orders)
// =============================================================================

/**
 * Fetch vendor's orders (sales)
 * @param {Object} options - Query options
 * @returns {Promise<{orders: Array, pagination: Object}>}
 */
export async function fetchVendorSales(options = {}) {
  const { status = 'all', page = 1, limit = 50 } = options;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (status && status !== 'all') {
    params.append('status', status);
  }

  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/sales?${params}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch sales');
  }

  const data = await response.json();
  return {
    orders: data.data || [],
    pagination: data.pagination || {},
  };
}

/**
 * Fetch vendor sales statistics
 * @returns {Promise<Object>}
 */
export async function fetchVendorStats() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/sales/stats`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch stats');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Fetch order item details for shipping
 * @param {number} itemId - Order item ID
 * @returns {Promise<Object>}
 */
export async function fetchOrderItemDetails(itemId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/sales/items/${itemId}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch item details');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Mark order item as shipped
 * @param {number} itemId - Order item ID
 * @param {Object} trackingData - Tracking information
 * @returns {Promise<Object>}
 */
export async function markItemShipped(itemId, trackingData = {}) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/sales/items/${itemId}/ship`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackingData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to mark as shipped');
  }

  return response.json();
}

/**
 * Update tracking for an order item
 * @param {number} itemId - Order item ID
 * @param {Object} trackingData - Tracking information
 * @returns {Promise<Object>}
 */
export async function updateItemTracking(itemId, trackingData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/sales/items/${itemId}/tracking`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trackingData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update tracking');
  }

  return response.json();
}

// =============================================================================
// SHIPPING (Sub-module)
// =============================================================================

/**
 * Get shipping rates for an order item
 * @param {number} itemId - Order item ID
 * @param {Array} packages - Optional package dimensions
 * @returns {Promise<Array>}
 */
export async function fetchShippingRates(itemId, packages = []) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/shipping/rates`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_id: itemId, packages }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch rates');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Get vendor's shipping labels
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
export async function fetchShippingLabels(options = {}) {
  const { status, limit = 100 } = options;

  const params = new URLSearchParams({ limit: String(limit) });
  if (status) params.append('status', status);

  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/shipping/labels?${params}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch labels');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Purchase a shipping label
 * @param {number} itemId - Order item ID
 * @param {Object} selectedRate - Selected shipping rate
 * @param {Array} packages - Package dimensions
 * @returns {Promise<Object>}
 */
export async function purchaseShippingLabel(itemId, selectedRate, packages = []) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/shipping/labels`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_id: itemId,
        selected_rate: selectedRate,
        packages
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to purchase label');
  }

  return response.json();
}

/**
 * Cancel a shipping label
 * @param {number} labelId - Label ID
 * @returns {Promise<Object>}
 */
export async function cancelShippingLabel(labelId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/shipping/labels/${labelId}/cancel`),
    { method: 'POST' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to cancel label');
  }

  return response.json();
}

/**
 * Get shipping label PDF URL
 * @param {string} filename - Label filename
 * @returns {string}
 */
export function getShippingLabelUrl(filename) {
  return getApiUrl(`${COMMERCE_BASE}/shipping/labels/${filename}`);
}

// =============================================================================
// VENDOR RETURNS (Sub-module)
// =============================================================================

/**
 * Fetch vendor's return requests
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
export async function fetchVendorReturns(options = {}) {
  const { status = 'all', limit = 100 } = options;

  const params = new URLSearchParams({ limit: String(limit) });
  if (status && status !== 'all') params.append('status', status);

  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/returns/vendor?${params}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch returns');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Fetch vendor return statistics
 * @returns {Promise<Object>}
 */
export async function fetchVendorReturnStats() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/returns/vendor/stats`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch stats');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Add vendor message to return case
 * @param {number} returnId - Return ID
 * @param {string} message - Message content
 * @returns {Promise<Object>}
 */
export async function addVendorReturnMessage(returnId, message) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/returns/${returnId}/vendor-message`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to add message');
  }

  return response.json();
}

/**
 * Mark return as received by vendor
 * @param {number} returnId - Return ID
 * @returns {Promise<Object>}
 */
export async function markReturnReceived(returnId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/returns/${returnId}/receive`),
    { method: 'POST' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to mark as received');
  }

  return response.json();
}

// =============================================================================
// SHIPPING HUB
// =============================================================================

/**
 * Fetch shipping subscription status
 * @returns {Promise<Object>}
 */
export async function fetchShippingSubscription() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/shipping/subscription`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch subscription');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Fetch all labels (order + standalone)
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
export async function fetchAllShippingLabels(options = {}) {
  const { limit = 100, type = 'all' } = options;

  const params = new URLSearchParams({ limit: String(limit) });
  if (type && type !== 'all') params.append('type', type);

  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/shipping/all-labels?${params}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch labels');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Fetch shipping label statistics
 * @returns {Promise<Object>}
 */
export async function fetchShippingLabelStats() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/shipping/stats`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch stats');
  }

  const data = await response.json();
  return data.data;
}

// =============================================================================
// STANDALONE SHIPPING LABELS
// =============================================================================

/**
 * Fetch vendor's return address (ship-from address)
 * @returns {Promise<Object>}
 */
export async function fetchVendorAddress() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/shipping/vendor-address`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch vendor address');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Save vendor shipping preferences
 * @param {Object} preferences - Shipping preferences
 * @returns {Promise<Object>}
 */
export async function saveShippingPreferences(preferences) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/shipping/preferences`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to save preferences');
  }

  return response.json();
}

/**
 * Fetch standalone shipping labels (not tied to orders)
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
export async function fetchStandaloneLabels(options = {}) {
  const { limit = 100 } = options;

  const params = new URLSearchParams({ limit: String(limit) });

  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/shipping/standalone-labels?${params}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch standalone labels');
  }

  const data = await response.json();
  return data.data || [];
}

/**
 * Create a standalone shipping label
 * @param {Object} labelData - Label data (shipper, recipient, packages, rate)
 * @returns {Promise<Object>}
 */
export async function createStandaloneLabel(labelData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/shipping/standalone-labels`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(labelData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create label');
  }

  return response.json();
}

/**
 * Calculate shipping rates for standalone labels
 * @param {Object} rateData - Address and package info
 * @returns {Promise<Array>}
 */
export async function calculateStandaloneRates(rateData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/shipping/standalone-rates`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rateData),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to calculate rates');
  }

  const data = await response.json();
  return data.data || [];
}

// =============================================================================
// COUPONS (vendor)
// =============================================================================

export async function fetchMyCoupons() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/coupons/my`),
    { method: 'GET' }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch coupons');
  return { coupons: data.coupons || [] };
}

export async function createCoupon(couponData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/coupons`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(couponData),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to create coupon');
  return data;
}

export async function updateCoupon(couponId, updates) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/coupons/${couponId}`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to update coupon');
  return data;
}

export async function deleteCoupon(couponId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/coupons/${couponId}`),
    { method: 'DELETE' }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to delete coupon');
  return data;
}

// =============================================================================
// PROMOTION INVITATIONS (vendor)
// =============================================================================

export async function fetchPromotionInvitations() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/promotions/invitations`),
    { method: 'GET' }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to fetch invitations');
  return { invitations: data.invitations || [] };
}

export async function respondToPromotionInvitation(invitationId, body) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${COMMERCE_BASE}/promotions/invitations/${invitationId}/respond`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Failed to respond');
  return data;
}
