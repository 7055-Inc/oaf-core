# Auth Module

## Overview

The Auth module handles all authentication and authorization for the Brakebee platform.

**Status:** 🔄 In Progress (Backend ✅ | Frontend ✅ | Integration 🔄)

---

## ✅ Completed

### Backend Module (`api-service/src/modules/auth/`)
- ✅ `helpers/permissions.js` - Permission constants & inheritance rules
- ✅ `services/permissions.js` - Permission building (replaces 4x duplicated code)
- ✅ `services/jwt.js` - JWT create/verify/decode
- ✅ `services/session.js` - Refresh token rotation
- ✅ `services/user.js` - User lookup/creation
- ✅ `middleware/requireAuth.js` - JWT verification (replaces `jwt.js`)
- ✅ `middleware/requirePermission.js` - Permission checking
- ✅ `middleware/requireRole.js` - Role checking
- ✅ `routes.js` - v2 API endpoints
- ✅ `index.js` - Module exports with backward compat aliases
- ✅ **Mounted at `/api/v2/auth/*`** in `server.js`

### Frontend Module (`lib/auth/`)
- ✅ `tokens.js` - Token storage, retrieval, expiration
- ✅ `refresh.js` - Token refresh with race condition handling
- ✅ `requests.js` - `authenticatedApiRequest` with CSRF
- ✅ `impersonation.js` - Admin impersonation
- ✅ `index.js` - Clean exports + auto-start refresh timer

### Components Reorganized
- ✅ `components/auth/LoginModal.js` - Moved from `components/login/`
- ✅ `components/admin/ImpersonationExitButton.js` - Moved from root
- ✅ `components/profiles/CookieBanner.js` - Moved from root

### Integration
- ✅ `middleware/checklist.js` - Now uses v2 `/api/v2/auth/validate`
- ✅ `lib/csrf.js` - Re-exports auth functions for backward compat

---

> **Note:** This README is at `/modules/auth/` (root level) for planning reference.
> The actual implementation is at `api-service/src/modules/auth/` (backend)
> and `lib/auth/` (frontend).

---

## Current System Analysis

### Backend Components (`api-service/src/`)

| Current Location | Purpose | Lines | Target |
|------------------|---------|-------|--------|
| `routes/auth.js` | Token exchange, refresh, cookie consent | 604 | `modules/auth/routes.js` |
| `middleware/jwt.js` | JWT verification middleware | 28 | `modules/auth/middleware/requireAuth.js` |
| `middleware/permissions.js` | Permission checking | 149 | `modules/auth/middleware/requirePermission.js` |
| `middleware/prefix.js` | **API KEY auth** (3rd party) | 34 | `modules/auth/middleware/requireApiKey.js` |
| `middleware/rateLimiter.js` | Auth rate limiters | 233 | `modules/shared/middleware/rateLimiter.js` |
| `middleware/csrfProtection.js` | CSRF protection | 297 | `modules/shared/middleware/csrf.js` |
| `middleware/secureLogger.js` | Secure logging | 213 | `modules/shared/middleware/logger.js` ⚠️ FIX HARDCODED PATH |

### Frontend Auth Gates (`middleware/`)

| Current Location | Purpose | Lines | Target |
|------------------|---------|-------|--------|
| `middleware.js` | Edge middleware entry | 49 | Keep - update imports |
| `middleware/checklist.js` | **AUTH GATE** - validates token, checks Draft/Terms/Profile/Announcements/Permissions | 222 | Refactor to use `lib/auth/` |
| `middleware/maintenanceMode.js` | Maintenance + admin bypass | 206 | Keep - uses auth for bypass |

### Frontend Utilities (`lib/`)

| Current Location | Purpose | Lines | Target |
|------------------|---------|-------|--------|
| `lib/firebase.js` | Firebase initialization | 12 | Keep as-is |
| `lib/config.js` | Central config | 92 | Keep as-is |
| `lib/csrf.js` | **MEGA FILE** - tokens, CSRF, impersonation | 601 | Split into `lib/auth/*.js` + `lib/shared/csrf.js` |
| `lib/apiUtils.js` | API helpers | 185 | Keep - uses `lib/auth/` |

### Mobile App (`mobile-app/`)

| Current Location | Purpose | Lines | Issues |
|------------------|---------|-------|--------|
| `lib/firebase.js` | Firebase init | 12 | ⚠️ Hardcoded credentials |
| `lib/auth.js` | Token management | 95 | ⚠️ Hardcoded `api.beemeeart.com` |
| `components/LoginScreen.js` | Login UI | 326 | ⚠️ Hardcoded URL |
| `components/SignupScreen.js` | Signup UI | 330 | ⚠️ Hardcoded URL |

### Two Auth Systems

The platform has **two separate authentication systems**:

| System | Middleware | Used By | Token Type |
|--------|------------|---------|------------|
| **JWT Auth** | `jwt.js` | Web app, Mobile app | JWT in `Authorization: Bearer` header |
| **API Key Auth** | `prefix.js` | Third-party integrations | `publicKey:privateKey` in Authorization header |

Both set `req.userId` and `req.permissions` but work differently.

### Frontend Auth Gate (`middleware/checklist.js`)

The frontend has a **multi-step auth gate** that runs on EVERY protected page request:

```
Token exists? ──NO──► /login
       │
      YES
       ▼
Token valid? (calls /api/v2/auth/validate) ──NO──► /login
       │
      YES
       ▼
User is Draft? ──YES──► /user-type-selection
       │
       NO
       ▼
Terms accepted? ──NO──► /terms-acceptance
       │
      YES
       ▼
Profile complete? ──NO──► /profile-completion
       │
      YES
       ▼
Announcements acknowledged? ──NO──► /announcement-acknowledgment
       │
      YES
       ▼
Has required permissions? ──NO──► /dashboard
       │
      YES
       ▼
ACCESS GRANTED
```

### Current Backend Endpoints (v1)

```
POST /auth/exchange              - Login via Google/email OR validate token
POST /auth/refresh               - Refresh access token
POST /auth/cookie-consent/anonymous  - Log anonymous cookie consent
POST /auth/cookie-consent/user   - Update user cookie consent
GET  /auth/cookie-consent/status - Get cookie consent status
```

### Current Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     CURRENT AUTH FLOW                           │
└─────────────────────────────────────────────────────────────────┘

1. LOGIN
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ Firebase │────►│ Frontend │────►│  /auth   │
   │  Auth    │     │  Token   │     │ /exchange│
   └──────────┘     └──────────┘     └────┬─────┘
                                          │
                    ┌─────────────────────┘
                    ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  • Verify Firebase token                                     │
   │  • Find/create user in database                              │
   │  • Create profiles (user, artist, promoter, etc.)            │
   │  • Generate JWT (1hr) + refresh token (7d)                   │
   │  • Return tokens to frontend                                 │
   └──────────────────────────────────────────────────────────────┘

2. TOKEN VALIDATION (per-request)
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ Request  │────►│ jwt.js   │────►│  Route   │
   │ + Bearer │     │middleware│     │ Handler  │
   └──────────┘     └────┬─────┘     └──────────┘
                         │
                         ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  • Verify JWT signature                                      │
   │  • Extract userId, roles, permissions                        │
   │  • Handle impersonation context                              │
   │  • Attach to req object                                      │
   └──────────────────────────────────────────────────────────────┘

3. TOKEN REFRESH
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ Refresh  │────►│  /auth   │────►│  New     │
   │  Token   │     │ /refresh │     │  Tokens  │
   └──────────┘     └────┬─────┘     └──────────┘
                         │
                         ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  • Verify refresh token hash in database                     │
   │  • Check expiration (7 days)                                 │
   │  • Handle race condition (30s grace period)                  │
   │  • Rotate refresh token                                      │
   │  • Return new access + refresh tokens                        │
   └──────────────────────────────────────────────────────────────┘
```

---

## Issues with Current System

### Architecture Issues
1. **Duplicated permission logic** - Same permission building code appears 4x (auth.js 3x, admin.js 1x)
2. **Mixed concerns** - Cookie consent mixed with authentication
3. **No service layer** - Business logic directly in route handlers
4. **Verbose error handling** - Repeated try/catch blocks
5. **Hardcoded permission list** - All permissions listed in 4 places

### Critical Bugs
6. **Hardcoded path in secureLogger.js** - `/var/www/main/api-service/logs/` breaks staging
7. **Hardcoded URLs in mobile app** - `api.beemeeart.com` in 4 files, no staging/dev support
8. **Hardcoded Firebase config** - `mobile-app/lib/firebase.js` has credentials in code

### Technical Debt
9. **`lib/csrf.js` is 601 lines** - Contains 5+ concerns (tokens, CSRF, impersonation, refresh, cookies)
10. **No logout endpoint** - Only client-side token clearing, no server-side invalidation
11. **No token blacklist** - Compromised tokens can't be invalidated before expiry

---

## New Module Structure

### Backend (api-service/src/modules/auth/)

```
api-service/src/modules/auth/
├── index.js                    # Module exports (router + services + middleware)
├── routes.js                   # Single routes file (RESTful CRUD)
├── services/
│   ├── index.js                # Re-exports all services
│   ├── jwt.js                  # JWT creation, validation
│   ├── firebase.js             # Firebase token verification
│   ├── permissions.js          # Permission building and checking
│   └── session.js              # Session/refresh token management
├── middleware/
│   ├── index.js                # Re-exports all middleware
│   ├── requireAuth.js          # Require authenticated user
│   ├── requirePermission.js    # Require specific permission
│   └── requireRole.js          # Require specific role
├── helpers/
│   └── permissions.js          # Permission list, inheritance rules
├── validation/
│   └── auth.js                 # Request validation schemas
├── types.js                    # JSDoc type definitions
└── README.md                   # This file
```

### Frontend (lib/auth/)

```
lib/auth/
├── index.js                    # Re-exports all auth utilities
├── tokens.js                   # getAuthToken, clearAuthTokens, isTokenExpired
├── refresh.js                  # refreshAuthToken, startTokenRefreshTimer
├── api.js                      # authenticatedApiRequest, secureApiRequest
└── impersonation.js            # startImpersonation, stopImpersonation, getImpersonationStatus
```

### Mobile (mobile-app/lib/auth/)

```
mobile-app/lib/auth/
├── index.js                    # Re-exports
├── tokens.js                   # AsyncStorage instead of localStorage
├── refresh.js                  # Same API as web
└── api.js                      # makeAuthenticatedRequest
```

---

## New Endpoints (v2)

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v2/auth/login` | Exchange OAuth token for JWT |
| `POST` | `/api/v2/auth/logout` | Invalidate refresh tokens |
| `POST` | `/api/v2/auth/refresh` | Refresh access token |
| `GET` | `/api/v2/auth/me` | Get current user info |

### Consent (may move to profiles module)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v2/auth/consent` | Get consent status |
| `POST` | `/api/v2/auth/consent` | Update consent |

---

## Types

```javascript
/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} email
 * @property {string[]} roles - ['buyer', 'artist', 'vendor', 'admin', 'promoter']
 * @property {string[]} permissions - ['vendor', 'events', 'shipping', etc.]
 * @property {boolean} emailVerified
 */

/**
 * @typedef {Object} AuthTokens
 * @property {string} accessToken - JWT (1 hour expiry)
 * @property {string} refreshToken - Random token (7 day expiry)
 * @property {number} expiresIn - Seconds until access token expires
 * @property {number} userId
 */

/**
 * @typedef {Object} TokenPayload
 * @property {number} userId
 * @property {string[]} roles
 * @property {string[]} permissions
 * @property {boolean} [isImpersonating]
 * @property {number} [originalUserId]
 * @property {number} [impersonationLogId]
 */

/**
 * @typedef {Object} LoginRequest
 * @property {'google'|'email'} provider
 * @property {string} token - Firebase ID token
 * @property {string} [email] - Required for email provider
 */
```

---

## Permission System

### Available Permissions

| Permission | Description | Granted By |
|------------|-------------|------------|
| `vendor` | Can sell products | Subscription |
| `events` | Can manage events | Subscription or promoter role |
| `shipping` | Can use shipping features | Vendor subscription |
| `stripe_connect` | Can receive payments | Vendor or events permission |
| `marketplace` | Listed on marketplace | Vendor permission |
| `sites` | Can create artist site | Subscription |
| `professional_sites` | Advanced site features | Subscription |
| `verified` | Verified artist badge | Manual approval |
| `manage_sites` | Admin: manage all sites | Admin role |
| `manage_content` | Admin: manage content | Admin role |
| `manage_system` | Admin: system settings | Admin role |

### Permission Inheritance

```javascript
// Automatic permission grants
admin role      → all permissions
promoter role   → events, stripe_connect
vendor perm     → shipping, stripe_connect, marketplace
events perm     → stripe_connect
```

---

## Migration Checklist

### Phase 0: Fix Critical Bugs (Before Refactor)
- [ ] Fix hardcoded path in `api-service/src/middleware/secureLogger.js` (lines 24, 35)
- [ ] Fix hardcoded URLs in `mobile-app/lib/auth.js` (line 31)
- [ ] Fix hardcoded URLs in `mobile-app/components/LoginScreen.js` (line 55)
- [ ] Fix hardcoded URLs in `mobile-app/components/SignupScreen.js` (line 57)
- [ ] Move Firebase config from code to environment in `mobile-app/lib/firebase.js`

### Phase 1: Create Backend Services
- [ ] `api-service/src/modules/auth/services/index.js` - Service exports
- [ ] `api-service/src/modules/auth/services/jwt.js` - Extract JWT logic
- [ ] `api-service/src/modules/auth/services/permissions.js` - Consolidate permission building (eliminate 4x duplication)
- [ ] `api-service/src/modules/auth/services/session.js` - Extract refresh token logic
- [ ] `api-service/src/modules/auth/services/firebase.js` - Firebase verification
- [ ] `api-service/src/modules/auth/services/apiKey.js` - API Key auth (from prefix.js)
- [ ] `api-service/src/modules/auth/helpers/permissions.js` - Permission constants

### Phase 2: Create Backend Middleware
- [ ] `api-service/src/modules/auth/middleware/index.js` - Middleware exports
- [ ] `api-service/src/modules/auth/middleware/requireAuth.js` - Replace jwt.js
- [ ] `api-service/src/modules/auth/middleware/requirePermission.js` - Replace permissions.js
- [ ] `api-service/src/modules/auth/middleware/requireRole.js` - Role-based middleware
- [ ] `api-service/src/modules/auth/middleware/requireApiKey.js` - Replace prefix.js

### Phase 3: Create Backend Routes (v2)
- [ ] `api-service/src/modules/auth/index.js` - Module entry point
- [ ] `api-service/src/modules/auth/routes.js` - Clean RESTful routes
- [ ] Add `POST /api/v2/auth/logout` - Server-side token invalidation
- [ ] Mount at `/api/v2/auth` in server.js

### Phase 4: Create Frontend Modules
- [ ] `lib/auth/index.js` - Frontend auth exports
- [ ] `lib/auth/tokens.js` - Token storage utilities
- [ ] `lib/auth/refresh.js` - Token refresh logic
- [ ] `lib/auth/api.js` - Authenticated request helpers
- [ ] `lib/auth/impersonation.js` - Impersonation utilities
- [ ] `lib/shared/csrf.js` - CSRF-only (simplified)

### Phase 5: Update Frontend Auth Gate
- [ ] `middleware/checklist.js` - Refactor to use `lib/auth/`
- [ ] `middleware/maintenanceMode.js` - Use shared auth utilities

### Phase 6: Migrate Consumers
- [ ] `pages/login.js` - Use `lib/auth`
- [ ] `pages/signup.js` - Use `lib/auth`
- [ ] `pages/logout.js` - Use `lib/auth` + call logout endpoint
- [ ] `components/login/LoginModal.js` - Use `lib/auth`
- [ ] `components/ImpersonationExitButton.js` - Use `lib/auth/impersonation`
- [ ] `lib/apiUtils.js` - Update imports

### Phase 7: Migrate Mobile App
- [ ] `mobile-app/lib/auth/index.js` - Create module structure
- [ ] `mobile-app/lib/auth/tokens.js` - AsyncStorage version
- [ ] `mobile-app/lib/auth/refresh.js` - Mirror web
- [ ] `mobile-app/lib/auth/api.js` - Mirror web
- [ ] `mobile-app/lib/config.js` - Create central config (no hardcoded URLs)
- [ ] `mobile-app/components/LoginScreen.js` - Use new module
- [ ] `mobile-app/components/SignupScreen.js` - Use new module

### Phase 8: Cleanup
- [ ] Add deprecation to `/auth/*` routes
- [ ] Delete `api-service/src/routes/auth.js`
- [ ] Delete `api-service/src/middleware/jwt.js`
- [ ] Delete `api-service/src/middleware/permissions.js`
- [ ] Delete `api-service/src/middleware/prefix.js`
- [ ] Delete old parts of `lib/csrf.js`
- [ ] Update ARCHITECTURE.md

---

## Dependencies

### Backend module depends on:
- `api-service/src/modules/shared/services/db.js` - Database connection
- `api-service/src/modules/shared/middleware/errorHandler.js` - Error handling
- `api-service/src/modules/shared/utils/validation.js` - Input validation

### Other modules depend on this:
- All backend modules use `requireAuth` middleware
- All backend modules use `requirePermission` middleware

### Frontend module depends on:
- `lib/shared/config.js` - API URL configuration
- `lib/shared/csrf.js` - CSRF token management

---

## Notes

- Cookie consent → Move to Profiles module (user preferences)
- Impersonation endpoints → Stay in Admin module (admin uses auth services)
- CSRF protection → `api-service/src/modules/shared/middleware/csrf.js` (backend)
- CSRF fetch → `lib/shared/csrf.js` (frontend)
