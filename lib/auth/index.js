/**
 * Auth Module (Frontend)
 * Main entry point for all authentication utilities
 * 
 * Usage:
 *   import { getAuthToken, authenticatedApiRequest } from '../lib/auth';
 */

// Token management
export {
  getCookie,
  setCookie,
  deleteCookie,
  getAuthToken,
  getRefreshToken,
  storeTokens,
  clearAuthTokens,
  isTokenExpired,
  decodeToken,
  getCurrentUser,
} from './tokens.js';

// Token refresh
export {
  refreshAuthToken,
  getValidAuthToken,
  startTokenRefreshTimer,
} from './refresh.js';

// Authenticated requests
export { authenticatedApiRequest } from './requests.js';

// Impersonation (admin functionality)
import { setAuthenticatedRequestFn } from './impersonation.js';
import { authenticatedApiRequest } from './requests.js';

// Initialize impersonation module with request function
setAuthenticatedRequestFn(authenticatedApiRequest);

export {
  startImpersonation,
  stopImpersonation,
  getImpersonationStatus,
  hasOriginalAdminToken,
} from './impersonation.js';

// Start auto-refresh timer when module loads (browser only)
import { startTokenRefreshTimer } from './refresh.js';
if (typeof window !== 'undefined') {
  startTokenRefreshTimer();
}
