/**
 * Authenticated API Requests
 * Handles API requests with both JWT and CSRF protection
 */

import { getValidAuthToken, refreshAuthToken } from './refresh.js';
import { clearAuthTokens } from './tokens.js';
import { secureApiRequest } from '../csrf.js';

/**
 * Make authenticated API request with both JWT and CSRF protection
 * @param {string} url - API endpoint URL  
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export async function authenticatedApiRequest(url, options = {}) {
  const token = await getValidAuthToken();
  
  if (!token) {
    throw new Error('Authentication required. Please log in.');
  }

  // Add Authorization header
  options.headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };

  try {
    // Use secure API request which handles CSRF
    const response = await secureApiRequest(url, options);
    
    // If we get a 401, the token might be invalid
    if (response.status === 401) {
      
      // Try to refresh token
      const newToken = await refreshAuthToken();
      
      if (newToken) {
        // Retry the request with new token
        options.headers.Authorization = `Bearer ${newToken}`;
        return await secureApiRequest(url, options);
      } else {
        // Refresh failed, redirect to login (but not if already on login page)
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        throw new Error('Authentication expired. Please log in again.');
      }
    }
    
    return response;
  } catch (error) {
    // If it's an auth error, handle appropriately
    if (error.message.includes('401') || error.message.includes('Authentication')) {
      clearAuthTokens();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    throw error;
  }
}
