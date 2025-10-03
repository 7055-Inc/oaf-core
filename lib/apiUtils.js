/**
 * API Utility Functions
 * Centralized API request helpers using environment variables
 */

import { config, getApiUrl } from './config.js';
import { authenticatedApiRequest, secureApiRequest } from './csrf.js';

/**
 * Make a standard API request to our backend
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export const apiRequest = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  return await secureApiRequest(url, options);
};

/**
 * Make an authenticated API request to our backend
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export const authApiRequest = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  return await authenticatedApiRequest(url, options);
};

/**
 * Common API endpoints for easy reference
 */
export const API_ENDPOINTS = {
  // Authentication
  AUTH_EXCHANGE: 'auth/exchange',
  AUTH_REFRESH: 'auth/refresh',
  CSRF_TOKEN: 'csrf-token',
  
  // Users
  USERS_ME: 'users/me',
  USERS_PROFILE: 'users/profile',
  
  // Cart
  CART: 'cart',
  CART_COUNT: 'cart/count',
  
  // Products
  PRODUCTS: 'products',
  MARKETPLACE_PRODUCTS: 'marketplace-products',
  
  // Orders
  ORDERS: 'orders',
  
  // Events
  EVENTS: 'events',
  APPLICATIONS: 'applications',
  
  // Dashboard
  DASHBOARD: 'dashboard',
  DASHBOARD_WIDGETS_LAYOUT: 'api/dashboard-widgets/layout',
  DASHBOARD_WIDGETS_DATA: 'api/dashboard-widgets/widget-data',
  DASHBOARD_WIDGETS_ADD: 'api/dashboard-widgets/add-widget',
  DASHBOARD_WIDGETS_REMOVE: 'api/dashboard-widgets/remove-widget',
  DASHBOARD_WIDGETS_SHORTCUT_ADD: 'api/dashboard-widgets/add',
  DASHBOARD_WIDGETS_SHORTCUT_REMOVE: 'api/dashboard-widgets/remove',
  
  // Media
  MEDIA: 'media',
  IMAGES: 'api/images', // Special case for smart media
  
  // Admin
  ADMIN: 'admin',
  
  // Subscriptions
  SUBSCRIPTIONS_MARKETPLACE: 'subscriptions/marketplace',
  SUBSCRIPTIONS_SHIPPING: 'subscriptions/shipping',
  SUBSCRIPTIONS_WEBSITES: 'subscriptions/websites',
  SUBSCRIPTIONS_WHOLESALE: 'subscriptions/wholesale',
};

/**
 * Helper function to handle API responses consistently
 * @param {Response} response - Fetch response
 * @returns {Promise<any>} Parsed JSON or throws error
 */
export const handleApiResponse = async (response) => {
  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // Use the raw text if it's not JSON
      if (errorText) {
        errorMessage = errorText;
      }
    }
    
    throw new Error(errorMessage);
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  
  return await response.text();
};

/**
 * Convenience function for GET requests
 * @param {string} endpoint - API endpoint
 * @param {boolean} authenticated - Whether to use authenticated request
 * @returns {Promise<any>} Parsed response
 */
export const apiGet = async (endpoint, authenticated = false) => {
  const request = authenticated ? authApiRequest : apiRequest;
  const response = await request(endpoint, { method: 'GET' });
  return await handleApiResponse(response);
};

/**
 * Convenience function for POST requests
 * @param {string} endpoint - API endpoint
 * @param {any} data - Request body data
 * @param {boolean} authenticated - Whether to use authenticated request
 * @returns {Promise<any>} Parsed response
 */
export const apiPost = async (endpoint, data, authenticated = false) => {
  const request = authenticated ? authApiRequest : apiRequest;
  const response = await request(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return await handleApiResponse(response);
};

/**
 * Convenience function for PUT requests
 * @param {string} endpoint - API endpoint
 * @param {any} data - Request body data
 * @param {boolean} authenticated - Whether to use authenticated request
 * @returns {Promise<any>} Parsed response
 */
export const apiPut = async (endpoint, data, authenticated = true) => {
  const request = authenticated ? authApiRequest : apiRequest;
  const response = await request(endpoint, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return await handleApiResponse(response);
};

/**
 * Convenience function for DELETE requests
 * @param {string} endpoint - API endpoint
 * @param {boolean} authenticated - Whether to use authenticated request
 * @returns {Promise<any>} Parsed response
 */
export const apiDelete = async (endpoint, authenticated = true) => {
  const request = authenticated ? authApiRequest : apiRequest;
  const response = await request(endpoint, { method: 'DELETE' });
  return await handleApiResponse(response);
};

export default {
  apiRequest,
  authApiRequest,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  handleApiResponse,
  API_ENDPOINTS,
};
