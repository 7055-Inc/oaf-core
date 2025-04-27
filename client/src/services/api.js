/**
 * API configuration and utility functions
 * This file centralizes API URL handling to ensure consistent endpoint access
 * 
 * Endpoint Formatting:
 * - Endpoints should be provided without the version prefix
 * - Example: '/auth/session' will become 'https://api2.onlineartfestival.com/v1/auth/session'
 * - Do not include 'v1' or 'api' in the endpoint - these are handled automatically
 * - Leading slashes are optional and will be cleaned up
 */

import { tokenService } from './tokenService';

// Get the base URLs from environment variables or use defaults
const API2_BASE_URL = process.env.REACT_APP_API2_BASE_URL || 'https://api2.onlineartfestival.com';
const MAIN_BASE_URL = process.env.REACT_APP_MAIN_BASE_URL || 'https://main.onlineartfestival.com';
const API_VERSION = 'v1';

/**
 * Builds a complete API URL by combining the base URL with the endpoint
 * @param {string} endpoint - The API endpoint (should start with a slash)
 * @returns {string} The complete URL
 */
export const getApiUrl = (endpoint) => {
  if (!endpoint) {
    throw new Error('Endpoint is required');
  }

  // Clean the endpoint by removing leading slashes
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  
  // Remove any existing version prefixes (/v1/, /api/v1/, etc.)
  const endpointWithoutVersion = cleanEndpoint.replace(/^(api\/)?v1\//, '');
  
  // Special handling for token endpoints - these go to the main server
  if (cleanEndpoint.startsWith('tokens/')) {
    return `${MAIN_BASE_URL}/api/${cleanEndpoint}`;
  }
  
  // If the endpoint already has /v1/, use it as is
  if (cleanEndpoint.startsWith('v1/')) {
    return `${API2_BASE_URL}/${cleanEndpoint}`;
  }
  
  // Construct the final URL with the correct version prefix
  const finalUrl = `${API2_BASE_URL}/v1/${endpointWithoutVersion}`;
  
  // Validate the URL
  try {
    new URL(finalUrl);
    return finalUrl;
  } catch (error) {
    throw new Error(`Invalid URL constructed: ${finalUrl}`);
  }
};

/**
 * Makes a fetch request to the API
 * @param {string} endpoint - The API endpoint (starting with slash)
 * @param {Object} options - Fetch options
 * @param {string} [token] - Optional API token for authenticated requests
 * @returns {Promise<any>} The fetch promise
 */
export const apiFetch = async (endpoint, options = {}, token = null) => {
  try {
    // If no token provided and this is not a token exchange request, try to get one
    if (!token && !endpoint.startsWith('/token/')) {
      try {
        // Wait for any ongoing token exchange to complete
        if (tokenService.isExchanging()) {
          console.log('apiFetch: Waiting for token exchange to complete...');
          await new Promise(resolve => {
            const checkExchange = () => {
              if (!tokenService.isExchanging()) {
                resolve();
              } else {
                setTimeout(checkExchange, 100);
              }
            };
            checkExchange();
          });
        }
        token = await tokenService.getApi2Token();
      } catch (error) {
        console.error('Failed to get API2 token:', error);
        throw error;
      }
    }

    // Set up headers
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers
    };

    // Get the full API URL
    const url = getApiUrl(endpoint);

    // Make the request
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    return response;
  } catch (error) {
    console.error('API request error:', { endpoint, error: error.message, stack: error.stack });
    throw error;
  }
}; 