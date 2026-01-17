/**
 * Auth Token Refresh
 * Handles JWT token refresh logic with race condition handling
 */

import { getApiUrl } from '../config.js';
import { 
  getAuthToken, 
  getRefreshToken, 
  storeTokens, 
  clearAuthTokens, 
  isTokenExpired 
} from './tokens.js';

let refreshInProgress = false;

/**
 * Refresh the JWT token using the refresh token
 * Handles race conditions when multiple tabs are open
 * 
 * @returns {Promise<string|null>} New JWT token or null if refresh failed
 */
export async function refreshAuthToken() {
  if (refreshInProgress) {
    // Wait for ongoing refresh
    return new Promise((resolve) => {
      const checkRefresh = () => {
        if (!refreshInProgress) {
          resolve(getAuthToken());
        } else {
          setTimeout(checkRefresh, 100);
        }
      };
      checkRefresh();
    });
  }

  refreshInProgress = true;
  
  try {
    const refreshToken = getRefreshToken();
    
    if (!refreshToken) {
      return null;
    }

    const response = await fetch(getApiUrl('api/v2/auth/refresh'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include'
    });

    if (!response.ok) {
      // Clear invalid tokens
      clearAuthTokens();
      return null;
    }

    const result = await response.json();
    
    // Handle v2 response format: { success, data: { accessToken, refreshToken } }
    if (!result.success || !result.data) {
      clearAuthTokens();
      return null;
    }
    
    // Store new tokens
    storeTokens(result.data.accessToken, result.data.refreshToken);
    
    return result.data.accessToken;
    
  } catch (error) {
    console.error('Error refreshing token:', error);
    clearAuthTokens();
    return null;
  } finally {
    refreshInProgress = false;
  }
}

/**
 * Get a valid auth token, refreshing if necessary
 * @returns {Promise<string|null>} Valid JWT token or null if authentication failed
 */
export async function getValidAuthToken() {
  let token = getAuthToken();
  
  if (!token) {
    return null;
  }
  
  // Check if token needs refresh
  if (isTokenExpired(token)) {
    token = await refreshAuthToken();
    
    if (!token) {
      // Refresh failed, redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return null;
    }
  }
  
  return token;
}

/**
 * Auto-refresh tokens periodically
 * Call this once on app initialization
 */
export function startTokenRefreshTimer() {
  if (typeof window === 'undefined') return;
  
  const checkAndRefresh = async () => {
    const token = getAuthToken();
    if (token && isTokenExpired(token)) {
      await refreshAuthToken();
    }
  };
  
  // Check every 1 minute to prevent timing gaps
  setInterval(checkAndRefresh, 1 * 60 * 1000);
  
  // Also check on page focus
  window.addEventListener('focus', checkAndRefresh);
}
