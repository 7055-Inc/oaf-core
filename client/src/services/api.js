/**
 * API configuration and utility functions
 * This file centralizes API URL handling to ensure consistent endpoint access
 * 
 * Endpoint Formatting:
 * - Endpoints should be provided without the version prefix
 * - Example: '/auth/session' will become 'https://main.onlineartfestival.com/v1/auth/session'
 * - Do not include 'v1' or 'api' in the endpoint - these are handled automatically
 * - Leading slashes are optional and will be cleaned up
 */

// Get the base URL from environment variables or use an empty string (for relative URLs)
const BASE_URL = 'https://main.onlineartfestival.com';
const API_VERSION = 'v1';
export const API_BASE_URL = BASE_URL;

/**
 * Builds a complete API URL by combining the base URL with the endpoint
 * @param {string} endpoint - The API endpoint (should start with a slash)
 * @returns {string} The complete URL
 */
export const getApiUrl = (endpoint) => {
  // Clean the endpoint by removing leading slashes
  const cleanEndpoint = endpoint.replace(/^\/+/, '');
  
  // Remove any existing version prefixes (/v1/, /api/v1/, etc.)
  const endpointWithoutVersion = cleanEndpoint.replace(/^(api\/)?v1\//, '');
  
  // If the endpoint already has /v1/, use it as is
  if (cleanEndpoint.startsWith('v1/')) {
    return `${BASE_URL}/${cleanEndpoint}`;
  }
  
  // Construct the final URL with the correct version prefix
  const finalUrl = `${BASE_URL}/v1/${endpointWithoutVersion}`;
  
  console.log('API URL Construction:', {
    originalEndpoint: endpoint,
    cleanEndpoint,
    endpointWithoutVersion,
    baseUrl: BASE_URL,
    finalUrl
  });
  
  return finalUrl;
};

/**
 * Makes a fetch request to the API
 * @param {string} endpoint - The API endpoint (starting with slash)
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} The fetch promise
 */
export const apiFetch = async (endpoint, options = {}) => {
  const url = getApiUrl(endpoint);
  console.log('Making API Request:', {
    url,
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body
  });
  
  try {
    const response = await fetch(url, options);
    
    // Clone the response before reading it
    const responseClone = response.clone();
    
    // Read the response body for logging
    const responseData = await responseClone.json();
    console.log('API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      url: response.url,
      data: responseData
    });
    
    // Return the original response for the caller to handle
    return response;
  } catch (error) {
    console.error('API Request Failed:', {
      url,
      error: error.message,
      stack: error.stack
    });
    throw error;
  }
}; 