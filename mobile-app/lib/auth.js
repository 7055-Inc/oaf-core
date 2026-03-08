/**
 * Mobile App Auth Utilities
 * Handles token storage, refresh, and authenticated requests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { config, getApiUrl } from './config';

// Auto-refresh tokens before they expire
let refreshTimer = null;

export const setupAutoRefresh = () => {
  // Refresh token every 50 minutes (tokens expire in 1 hour)
  if (refreshTimer) clearInterval(refreshTimer);
  
  refreshTimer = setInterval(async () => {
    await refreshAuthToken();
  }, 50 * 60 * 1000); // 50 minutes
};

export const clearAutoRefresh = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
};

/**
 * Refresh the auth token using refresh token
 * Uses v2 API endpoint
 */
export const refreshAuthToken = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      console.log('No refresh token available');
      return false;
    }

    const response = await fetch(getApiUrl(config.AUTH_REFRESH), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      console.error('Token refresh failed');
      await clearAuthTokens();
      return false;
    }

    const result = await response.json();
    
    // Handle v2 response format: { success, data: { accessToken, refreshToken } }
    if (!result.success || !result.data) {
      console.error('Invalid refresh response');
      await clearAuthTokens();
      return false;
    }
    
    // Update tokens
    await AsyncStorage.setItem('token', result.data.accessToken);
    await AsyncStorage.setItem('refreshToken', result.data.refreshToken);
    
    console.log('Token refreshed successfully');
    return true;
    
  } catch (error) {
    console.error('Error refreshing token:', error);
    await clearAuthTokens();
    return false;
  }
};

/**
 * Clear all auth tokens
 */
export const clearAuthTokens = async () => {
  clearAutoRefresh();
  await AsyncStorage.multiRemove(['token', 'refreshToken', 'userId']);
};

/**
 * Get stored auth token
 */
export const getAuthToken = async () => {
  return await AsyncStorage.getItem('token');
};

/**
 * Store auth tokens from v2 login response
 * @param {Object} data - Response data from v2 auth/login
 */
export const storeAuthTokens = async (data) => {
  await AsyncStorage.setItem('token', data.accessToken);
  await AsyncStorage.setItem('refreshToken', data.refreshToken);
  if (data.user?.userId) {
    await AsyncStorage.setItem('userId', data.user.userId.toString());
  }
};

/**
 * Make an authenticated API request
 * Automatically handles token refresh on 401
 */
export const makeAuthenticatedRequest = async (url, options = {}) => {
  let token = await AsyncStorage.getItem('token');
  
  if (!token) {
    throw new Error('No authentication token');
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  let response = await fetch(url, {
    ...options,
    headers
  });

  // If 401, try to refresh token and retry
  if (response.status === 401) {
    const refreshed = await refreshAuthToken();
    
    if (refreshed) {
      token = await AsyncStorage.getItem('token');
      headers.Authorization = `Bearer ${token}`;
      
      response = await fetch(url, {
        ...options,
        headers
      });
    }
  }

  return response;
};
