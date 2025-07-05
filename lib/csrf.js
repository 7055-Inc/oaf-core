/**
 * CSRF Token Management Utility
 * Handles fetching and including CSRF tokens in API requests
 */

let cachedCsrfToken = null;
let tokenExpiry = null;

/**
 * Fetch CSRF token from server
 * @returns {Promise<string>} CSRF token
 */
export async function fetchCsrfToken() {
  try {
    // Check if we have a cached token that's still valid
    const now = Date.now();
    if (cachedCsrfToken && tokenExpiry && now < tokenExpiry) {
      return cachedCsrfToken;
    }

    const response = await fetch('https://api2.onlineartfestival.com/csrf-token', {
      method: 'GET',
      credentials: 'include', // Important for cookies
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }

    const data = await response.json();
    cachedCsrfToken = data.csrfToken;
    
    // Cache token for 50 minutes (tokens expire in 1 hour)
    tokenExpiry = now + (50 * 60 * 1000);
    
    return cachedCsrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}

/**
 * Clear cached CSRF token (use when token becomes invalid)
 */
export function clearCsrfToken() {
  cachedCsrfToken = null;
  tokenExpiry = null;
}

/**
 * Make a secure API request with CSRF protection
 * @param {string} url - API endpoint URL
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export async function secureApiRequest(url, options = {}) {
  const method = options.method || 'GET';
  
  // Only add CSRF token for state-changing methods
  const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
  
  if (needsCsrf) {
    try {
      const csrfToken = await fetchCsrfToken();
      
      // Add CSRF token to headers
      options.headers = {
        ...options.headers,
        'X-CSRF-Token': csrfToken
      };
      
      // Also add to body if it's form data
      if (options.body && typeof options.body === 'string') {
        try {
          const bodyData = JSON.parse(options.body);
          bodyData._csrf = csrfToken;
          options.body = JSON.stringify(bodyData);
        } catch (e) {
          // Body isn't JSON, handle as needed
          console.warn('Could not add CSRF token to request body');
        }
      }
    } catch (error) {
      console.error('Failed to add CSRF token to request:', error);
      // Continue with request even if CSRF token fails
      // Server will return 403 which we can handle
    }
  }

  // Add credentials for cookie-based auth
  options.credentials = 'include';

  try {
    const response = await fetch(url, options);
    
    // If we get a 403, it might be due to invalid CSRF token
    if (response.status === 403) {
      clearCsrfToken();
      
      // Show user-friendly error message
      const errorText = await response.text();
      if (errorText.includes('security token') || errorText.includes('CSRF')) {
        throw new Error('Security token expired. Please refresh the page and try again.');
      }
    }
    
    return response;
  } catch (error) {
    // If request fails due to CSRF, clear token and suggest refresh
    if (error.message.includes('security token') || error.message.includes('CSRF')) {
      clearCsrfToken();
    }
    throw error;
  }
}

/**
 * Get auth token from cookies
 * @returns {string|null} JWT token
 */
export function getAuthToken() {
  if (typeof document === 'undefined') return null;
  return document.cookie.split('token=')[1]?.split(';')[0] || null;
}

/**
 * Make authenticated API request with both JWT and CSRF protection
 * @param {string} url - API endpoint URL  
 * @param {object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export async function authenticatedApiRequest(url, options = {}) {
  const token = getAuthToken();
  
  if (!token) {
    throw new Error('Authentication required. Please log in.');
  }

  // Add Authorization header
  options.headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };

  // Use secure API request which handles CSRF
  return await secureApiRequest(url, options);
}

/**
 * Show user-friendly error message for CSRF failures
 * @param {Error} error - The error that occurred
 */
export function handleCsrfError(error) {
  if (error.message.includes('security token') || 
      error.message.includes('CSRF') ||
      error.message.includes('403')) {
    
    // Show a user-friendly message
    alert('Your session has expired for security reasons. Please refresh the page and try again.');
    
    // Optionally redirect to current page to refresh
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }
} 