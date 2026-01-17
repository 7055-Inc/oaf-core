/**
 * Admin Impersonation
 * Handles admin user impersonation functionality
 * 
 * Note: This will eventually move to lib/admin/ or modules/admin/lib/
 * but is kept here for now as it's tightly coupled with auth tokens
 */

import { getApiUrl, getCookieConfig } from '../config.js';
import { 
  getAuthToken, 
  getCookie, 
  setCookie, 
  deleteCookie,
  decodeToken 
} from './tokens.js';
import { getValidAuthToken } from './refresh.js';

// Import authenticatedApiRequest dynamically to avoid circular dependency
let authenticatedApiRequest = null;

/**
 * Set the authenticated request function (called from index.js)
 * @param {Function} fn - The authenticatedApiRequest function
 */
export function setAuthenticatedRequestFn(fn) {
  authenticatedApiRequest = fn;
}

/**
 * Start impersonating a user (admin only)
 * @param {number} targetUserId - ID of user to impersonate
 * @param {string} reason - Optional reason for impersonation
 * @returns {Promise<Object>} Impersonation result
 */
export async function startImpersonation(targetUserId, reason = '') {
  if (!authenticatedApiRequest) {
    throw new Error('Auth module not initialized');
  }
  
  try {
    const token = await getValidAuthToken();
    
    if (!token) {
      throw new Error('Authentication required');
    }

    // Store current admin token before impersonating
    const currentToken = getAuthToken();
    const currentRefreshToken = getCookie('refreshToken') || 
      (typeof localStorage !== 'undefined' ? localStorage.getItem('refreshToken') : null);
    
    if (currentToken && typeof localStorage !== 'undefined') {
      localStorage.setItem('originalAdminToken', currentToken);
    }
    if (currentRefreshToken && typeof localStorage !== 'undefined') {
      localStorage.setItem('originalAdminRefreshToken', currentRefreshToken);
    }

    // Call impersonation API
    const response = await authenticatedApiRequest(
      getApiUrl(`admin/impersonate/${targetUserId}`),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      }
    );

    if (!response.ok) {
      let errorMessage = 'Failed to start impersonation';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        errorMessage = `Server returned ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Replace current token with impersonation token
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('token', data.token);
    }
    setCookie('token', data.token, 7200);
    
    // Clear refresh token during impersonation (impersonation tokens can't be refreshed)
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('refreshToken');
    }
    deleteCookie('refreshToken');

    // Small delay to ensure tokens are saved before any redirects
    await new Promise(resolve => setTimeout(resolve, 100));

    return data;
  } catch (error) {
    console.error('Error starting impersonation:', error);
    throw error;
  }
}

/**
 * Stop impersonating and return to admin session
 * @returns {Promise<boolean>} Success status
 */
export async function stopImpersonation() {
  if (!authenticatedApiRequest) {
    throw new Error('Auth module not initialized');
  }
  
  try {
    // Call stop-impersonation endpoint
    const response = await authenticatedApiRequest(
      getApiUrl('admin/stop-impersonation'),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (data.success) {
      // Restore original admin token
      const originalToken = typeof localStorage !== 'undefined' 
        ? localStorage.getItem('originalAdminToken') 
        : null;
      const originalRefreshToken = typeof localStorage !== 'undefined'
        ? localStorage.getItem('originalAdminRefreshToken')
        : null;
      
      if (originalToken) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('token', originalToken);
          localStorage.removeItem('originalAdminToken');
        }
        setCookie('token', originalToken, 7200);
      }
      
      if (originalRefreshToken) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('refreshToken', originalRefreshToken);
          localStorage.removeItem('originalAdminRefreshToken');
        }
        setCookie('refreshToken', originalRefreshToken, 604800);
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error stopping impersonation:', error);
    return false;
  }
}

/**
 * Check if currently impersonating
 * @returns {Object|null} Impersonation info or null
 */
export function getImpersonationStatus() {
  try {
    const token = getAuthToken();
    if (!token) return null;
    
    const payload = decodeToken(token);
    if (!payload) return null;
    
    if (payload.isImpersonating) {
      return {
        isImpersonating: true,
        originalUserId: payload.originalUserId,
        impersonatedUserId: payload.userId,
        impersonatedUsername: payload.username
      };
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Check if admin has stored original token (for showing exit button)
 * @returns {boolean}
 */
export function hasOriginalAdminToken() {
  if (typeof localStorage === 'undefined') return false;
  return !!localStorage.getItem('originalAdminToken');
}
