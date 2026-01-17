/**
 * Mobile App Configuration
 * Reads from expo-constants (set in app.config.js via environment variables)
 * 
 * Required environment variables:
 *   API_BASE_URL - API server URL
 *   FRONTEND_URL - Web frontend URL
 */

import Constants from 'expo-constants';

// Get config from expo-constants
const expoConfig = Constants.expoConfig?.extra || {};

// Validate required configuration
if (!expoConfig.apiBaseUrl) {
  throw new Error('API_BASE_URL environment variable is required. Set it when starting Expo.');
}
if (!expoConfig.frontendUrl) {
  throw new Error('FRONTEND_URL environment variable is required. Set it when starting Expo.');
}

export const config = {
  // API Base URL
  API_BASE_URL: expoConfig.apiBaseUrl,
  
  // Frontend URL - for web links (forgot password, etc.)
  FRONTEND_URL: expoConfig.frontendUrl,
  
  // Environment
  ENVIRONMENT: expoConfig.environment,
  
  // v2 API endpoints
  AUTH_LOGIN: '/api/v2/auth/login',
  AUTH_REFRESH: '/api/v2/auth/refresh',
  AUTH_LOGOUT: '/api/v2/auth/logout',
  AUTH_VALIDATE: '/api/v2/auth/validate',
};

/**
 * Get full API URL for an endpoint
 * @param {string} endpoint - API endpoint path
 * @returns {string} Full URL
 */
export function getApiUrl(endpoint) {
  const baseUrl = config.API_BASE_URL.replace(/\/$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

/**
 * Get full frontend URL for a path
 * @param {string} path - Frontend path
 * @returns {string} Full URL
 */
export function getFrontendUrl(path) {
  const baseUrl = config.FRONTEND_URL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

/**
 * Check if running in development mode
 * @returns {boolean}
 */
export function isDevelopment() {
  return config.ENVIRONMENT === 'development' || config.ENVIRONMENT === 'staging';
}

export default config;
