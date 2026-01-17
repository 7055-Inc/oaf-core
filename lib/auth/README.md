# Frontend Auth Module

## Overview

Frontend authentication utilities for the Brakebee platform.

**Location:** `lib/auth/`

---

## Files

| File | Purpose |
|------|---------|
| `index.js` | Main exports (import from here) |
| `tokens.js` | Token storage, retrieval, expiration |
| `refresh.js` | Token refresh with race condition handling |
| `requests.js` | Authenticated API requests |
| `impersonation.js` | Admin impersonation (will move to admin module) |

---

## Usage

```javascript
// Import from the module
import { 
  getAuthToken, 
  authenticatedApiRequest,
  getCurrentUser,
  clearAuthTokens 
} from '../lib/auth';

// Make authenticated API call
const response = await authenticatedApiRequest('/api/v2/products', {
  method: 'GET'
});

// Get current user info
const user = getCurrentUser();
// { userId: 123, roles: ['vendor'], permissions: ['vendor', 'shipping'] }

// Check if logged in
const token = getAuthToken();
if (!token) {
  // Redirect to login
}
```

---

## Exports

### Token Management (`tokens.js`)

| Function | Description |
|----------|-------------|
| `getAuthToken()` | Get JWT from cookies/localStorage |
| `getRefreshToken()` | Get refresh token |
| `storeTokens(token, refreshToken)` | Store both tokens |
| `clearAuthTokens()` | Clear all tokens (logout) |
| `isTokenExpired(token)` | Check if JWT is expired |
| `decodeToken(token)` | Decode JWT payload |
| `getCurrentUser()` | Get user info from token |
| `getCookie(name)` | Get any cookie value |

### Token Refresh (`refresh.js`)

| Function | Description |
|----------|-------------|
| `refreshAuthToken()` | Refresh JWT using refresh token |
| `getValidAuthToken()` | Get valid token, refresh if needed |
| `startTokenRefreshTimer()` | Start auto-refresh (called automatically) |

### API Requests (`requests.js`)

| Function | Description |
|----------|-------------|
| `authenticatedApiRequest(url, options)` | Make auth'd request with CSRF |

### Impersonation (`impersonation.js`)

| Function | Description |
|----------|-------------|
| `startImpersonation(userId, reason)` | Start impersonating user |
| `stopImpersonation()` | Return to admin session |
| `getImpersonationStatus()` | Check impersonation state |

---

## Backward Compatibility

`lib/csrf.js` re-exports all auth functions for backward compatibility.

**Old code (still works):**
```javascript
import { getAuthToken, authenticatedApiRequest } from '../lib/csrf';
```

**New code (preferred):**
```javascript
import { getAuthToken, authenticatedApiRequest } from '../lib/auth';
```

After refactor, update all imports to use `lib/auth` directly.
