/**
 * CSRF Token Management Utility
 * Handles fetching and including CSRF tokens in API requests
 */

import { config, getApiUrl, getCookieConfig } from './config.js';

let cachedCsrfToken = null;
let tokenExpiry = null;
let refreshInProgress = false;

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

    const response = await fetch(getApiUrl('csrf-token'), {
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
 * Check if JWT token is expired or about to expire
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is expired or expires in < 5 minutes
 */
export function isTokenExpired(token) {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Math.floor(Date.now() / 1000);
    const expiry = payload.exp;
    
    // Consider token expired if it expires in next 5 minutes
    return !expiry || (expiry - now) < 300;
  } catch (e) {
    return true;
  }
}

/**
 * Refresh the JWT token using the refresh token
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
    const refreshToken = getCookie('refreshToken') || localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      return null;
    }

    const response = await fetch(getApiUrl('auth/refresh'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken }),
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Token refresh failed:', error);
      
      // Clear invalid tokens
      clearAuthTokens();
      return null;
    }

    const data = await response.json();
    
    // Update tokens in both localStorage and cookies
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    const cookieConfig = getCookieConfig();
    document.cookie = `token=${data.token}; path=/; domain=${cookieConfig.domain}; ${cookieConfig.secure ? 'secure;' : ''} samesite=${cookieConfig.sameSite}; max-age=7200`;
    document.cookie = `refreshToken=${data.refreshToken}; path=/; domain=${cookieConfig.domain}; ${cookieConfig.secure ? 'secure;' : ''} samesite=${cookieConfig.sameSite}; max-age=604800`;
    
    return data.token;
    
  } catch (error) {
    console.error('Error refreshing token:', error);
    clearAuthTokens();
    return null;
  } finally {
    refreshInProgress = false;
  }
}

/**
 * Clear all authentication tokens
 */
export function clearAuthTokens() {
  // Clear localStorage
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  
  // Clear cookies
  const cookieConfig = getCookieConfig();
  const expiredCookie = `expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${cookieConfig.domain}`;
  document.cookie = `token=; ${expiredCookie}`;
  document.cookie = `refreshToken=; ${expiredCookie}`;
  document.cookie = `csrf-token=; ${expiredCookie}`;
  document.cookie = `csrf-secret=; ${expiredCookie}`;
  
  // Clear cached CSRF token
  clearCsrfToken();
  
  // Dispatch custom event to notify all components about logout
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('auth-logout'));
  }
}

/**
 * Get auth token from cookies (robust parsing)
 * @returns {string|null} JWT token
 */
export function getAuthToken() {
  if (typeof document === 'undefined') return null;
  
  // Try cookies first (used by middleware)
  const cookieToken = getCookie('token');
  if (cookieToken) return cookieToken;
  
  // Fall back to localStorage
  const localToken = localStorage.getItem('token');
  if (localToken) {
    // Sync to cookie for middleware
    const cookieConfig = getCookieConfig();
    document.cookie = `token=${localToken}; path=/; domain=${cookieConfig.domain}; ${cookieConfig.secure ? 'secure;' : ''} samesite=${cookieConfig.sameSite}`;
    return localToken;
  }
  
  return null;
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
      
      // Preserve original Content-Type header
      const originalContentType = options.headers?.['Content-Type'] || options.headers?.['content-type'];
      
      // Add CSRF token to headers
      options.headers = {
        ...options.headers,
        'X-CSRF-Token': csrfToken
      };
      
      // Also add to body if it's form data
      if (options.body) {
        if (typeof options.body === 'string') {
          try {
            const bodyData = JSON.parse(options.body);
            bodyData._csrf = csrfToken;
            options.body = JSON.stringify(bodyData);
            
            // Restore original Content-Type header after JSON.stringify
            if (originalContentType) {
              options.headers['Content-Type'] = originalContentType;
            }
          } catch (e) {
            // Body isn't JSON, handle as needed
            console.warn('Could not add CSRF token to request body');
          }
        } else if (options.body instanceof FormData) {
          // Add CSRF token to FormData
          options.body.append('_csrf', csrfToken);
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
      
      // Check if it's a CSRF error and retry once
      const errorText = await response.text();
      if (errorText.includes('security token') || errorText.includes('CSRF')) {
        // Retry the request with a fresh CSRF token
        try {
          const newCsrfToken = await fetchCsrfToken();
          
          // Preserve original Content-Type header for retry
          const originalContentType = options.headers?.['Content-Type'] || options.headers?.['content-type'];
          
          options.headers = {
            ...options.headers,
            'X-CSRF-Token': newCsrfToken
          };
          
          // Also update body if needed
          if (options.body) {
            if (typeof options.body === 'string') {
              try {
                const bodyData = JSON.parse(options.body);
                bodyData._csrf = newCsrfToken;
                options.body = JSON.stringify(bodyData);
                
                // Restore original Content-Type header after JSON.stringify
                if (originalContentType) {
                  options.headers['Content-Type'] = originalContentType;
                }
              } catch (e) {
                // Body isn't JSON, handle as needed
              }
            } else if (options.body instanceof FormData) {
              // Update CSRF token in FormData
              options.body.set('_csrf', newCsrfToken);
            }
          }
          
          // Retry the request
          return await fetch(url, options);
        } catch (retryError) {
          throw new Error('Security token expired. Please refresh the page and try again.');
        }
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
 * Get cookie value by name (robust parsing)
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value
 */
export function getCookie(name) {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return cookieValue || null;
    }
  }
  return null;
}

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

/**
 * Auto-refresh tokens periodically
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

/**
 * Start impersonating a user (admin only)
 * @param {number} targetUserId - ID of user to impersonate
 * @param {string} reason - Optional reason for impersonation
 * @returns {Promise<Object>} Impersonation result
 */
export async function startImpersonation(targetUserId, reason = '') {
  try {
    const token = await getValidAuthToken();
    
    if (!token) {
      throw new Error('Authentication required');
    }

    // Store current admin token before impersonating
    const currentToken = getAuthToken();
    const currentRefreshToken = getCookie('refreshToken') || localStorage.getItem('refreshToken');
    
    if (currentToken) {
      localStorage.setItem('originalAdminToken', currentToken);
    }
    if (currentRefreshToken) {
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
        // Response body already consumed or not JSON
        errorMessage = `Server returned ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();

    // Replace current token with impersonation token
    localStorage.setItem('token', data.token);
    const cookieConfig = getCookieConfig();
    document.cookie = `token=${data.token}; ${getCookieConfig()}; max-age=7200`;
    
    // Clear refresh token during impersonation (impersonation tokens can't be refreshed)
    // This prevents auto-refresh from reverting back to admin session
    localStorage.removeItem('refreshToken');
    document.cookie = `refreshToken=; ${getCookieConfig()}; max-age=0`;

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
      const originalToken = localStorage.getItem('originalAdminToken');
      const originalRefreshToken = localStorage.getItem('originalAdminRefreshToken');
      
      if (originalToken) {
        localStorage.setItem('token', originalToken);
        localStorage.removeItem('originalAdminToken');
        
        const cookieConfig = getCookieConfig();
        document.cookie = `token=${originalToken}; path=/; domain=${cookieConfig.domain}; ${cookieConfig.secure ? 'secure;' : ''} samesite=${cookieConfig.sameSite}`;
      }
      
      if (originalRefreshToken) {
        localStorage.setItem('refreshToken', originalRefreshToken);
        localStorage.removeItem('originalAdminRefreshToken');
        
        const cookieConfig = getCookieConfig();
        document.cookie = `refreshToken=${originalRefreshToken}; path=/; domain=${cookieConfig.domain}; ${cookieConfig.secure ? 'secure;' : ''} samesite=${cookieConfig.sameSite}`;
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
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      if (payload.isImpersonating) {
        return {
          isImpersonating: true,
          originalUserId: payload.originalUserId,
          impersonatedUserId: payload.userId,
          impersonatedUsername: payload.username
        };
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

// Start the auto-refresh timer
if (typeof window !== 'undefined') {
  startTokenRefreshTimer();
} 