# Module Architecture Guide

## Overview

This document defines the rules and patterns for the Brakebee modular refactoring. The goal is to transform scattered, tightly-coupled code into clean, reusable "plug & play" modules.

---

## Core Principles

1. **Modules are self-contained** - Each module owns its routes, logic, and types
2. **Shared code is explicit** - Common utilities live in a dedicated `shared/` module
3. **Gradual migration** - New modules integrate with old system during transition
4. **Delete as you go** - Remove old code once new module is stable
5. **Mobile-first API design** - APIs work for web, mobile, and third-party consumers
6. **Backend/Frontend separation** - Clear boundaries between API and client code

---

## Backend vs Frontend Separation

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Express API)                        │
│                    api-service/src/modules/                         │
├─────────────────────────────────────────────────────────────────────┤
│  • Runs on Node.js server                                           │
│  • HTTP request handling (routes)                                   │
│  • Database access (services)                                       │
│  • JWT creation/verification                                        │
│  • Business logic                                                   │
│  • NEVER runs in browser                                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ HTTP / JSON
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      FRONTEND (Next.js + Mobile)                    │
│                      lib/ + components/ + pages/                    │
├─────────────────────────────────────────────────────────────────────┤
│  • Runs in browser / React Native                                   │
│  • Makes API calls (lib/*/api.js)                                   │
│  • Token storage (localStorage, cookies, AsyncStorage)              │
│  • UI components                                                    │
│  • NEVER accesses database directly                                 │
└─────────────────────────────────────────────────────────────────────┘
```

### What Goes Where

| Concern | Backend (`api-service/src/modules/`) | Frontend (`lib/`, `components/`) |
|---------|--------------------------------------|----------------------------------|
| JWT creation | ✅ `auth/services/jwt.js` | ❌ Never |
| JWT verification | ✅ `auth/middleware/requireAuth.js` | ❌ Never |
| JWT storage | ❌ Stateless | ✅ `lib/auth/tokens.js` |
| Token refresh call | ✅ `auth/routes.js` handles | ✅ `lib/auth/refresh.js` calls |
| Permission building | ✅ `auth/services/permissions.js` | ❌ Never |
| Database queries | ✅ All services | ❌ Never |
| CSRF validation | ✅ `shared/middleware/csrf.js` | ❌ Never |
| CSRF fetch | ❌ Never | ✅ `lib/shared/csrf.js` |
| Firebase verify | ✅ `auth/services/firebase.js` | ❌ Never |
| Firebase login UI | ❌ Never | ✅ `components/auth/LoginModal.js` |

---

## Directory Structure

The architecture separates **backend** (API) from **frontend** (Next.js/Mobile), with mirrored module structures:

```
/var/www/staging/
│
├── api-service/src/
│   │
│   └── modules/                  # BACKEND MODULES (Express API)
│       │
│       ├── auth/                 # Authentication module
│       │   ├── index.js          # Module exports (router + services)
│       │   ├── routes.js         # Express routes (/api/v2/auth/*)
│       │   ├── services/         # Business logic
│       │   │   ├── index.js      # Re-exports all services
│       │   │   ├── firebase.js   # Firebase auth operations
│       │   │   ├── jwt.js        # JWT creation/validation
│       │   │   ├── session.js    # Session management
│       │   │   └── permissions.js # Role/permission checks
│       │   ├── middleware/       # Auth-specific middleware
│       │   │   ├── index.js      # Re-exports all middleware
│       │   │   ├── requireAuth.js # Require authenticated user
│       │   │   ├── requirePermission.js
│       │   │   └── requireRole.js # Require specific role
│       │   ├── helpers/          # Utility functions
│       │   │   └── permissions.js # Permission constants, inheritance
│       │   ├── validation/       # Request validation schemas
│       │   │   └── auth.js
│       │   ├── types.js          # JSDoc type definitions
│       │   └── README.md         # Module documentation
│       │
│       ├── users/                # User management module
│       │   ├── index.js
│       │   ├── routes.js
│       │   ├── services/
│       │   │   ├── users.js      # User CRUD
│       │   │   ├── profiles.js   # Profile management
│       │   │   ├── personas.js   # Artist personas
│       │   │   └── verification.js
│       │   ├── middleware/
│       │   ├── helpers/
│       │   └── validation/
│       │
│       ├── catalog/              # ✅ Product catalog module
│       │   ├── index.js
│       │   ├── routes.js
│       │   ├── services/
│       │   │   ├── index.js
│       │   │   ├── product.js
│       │   │   ├── category.js
│       │   │   ├── collection.js
│       │   │   └── importExport.js
│       │   └── README.md
│       │
│       ├── csv/                  # ✅ Bulk import/export module
│       │   ├── index.js
│       │   ├── routes.js
│       │   ├── worker.js         # Integrated Bull queue worker
│       │   ├── services/
│       │   │   ├── index.js
│       │   │   ├── queue.js      # Bull queue setup
│       │   │   ├── jobs.js       # Job tracking
│       │   │   ├── processor.js  # Main job router
│       │   │   ├── parsers.js    # CSV/Excel parsing
│       │   │   ├── products.js   # Product import
│       │   │   ├── inventory.js  # Inventory import
│       │   │   ├── templates.js  # Template generation
│       │   │   └── reports.js    # Saved reports
│       │   └── README.md
│       │
│       ├── commerce/             # Commerce module
│       │   ├── index.js
│       │   ├── routes.js
│       │   └── services/
│       │
│       ├── events/               # Events module
│       │   ├── index.js
│       │   ├── routes.js
│       │   └── services/
│       │
│       ├── websites/             # Artist websites module
│       │   ├── index.js
│       │   ├── routes.js
│       │   └── services/
│       │
│       ├── content/              # Content module
│       │   ├── index.js
│       │   ├── routes.js
│       │   └── services/
│       │
│       ├── marketing/            # Marketing module
│       │   ├── index.js
│       │   ├── routes.js
│       │   └── services/
│       │
│       ├── admin/                # Admin module
│       │   ├── index.js
│       │   ├── routes.js
│       │   └── services/
│       │
│       └── shared/               # SHARED: Cross-module utilities
│           ├── middleware/
│           │   ├── index.js      # Re-exports all middleware
│           │   ├── errorHandler.js
│           │   ├── rateLimiter.js
│           │   ├── csrf.js
│           │   └── logger.js
│           ├── services/
│           │   ├── index.js      # Re-exports all services
│           │   ├── db.js
│           │   ├── email.js
│           │   ├── stripe.js
│           │   └── storage.js
│           └── utils/
│               ├── index.js
│               ├── validation.js
│               └── pagination.js
│
│
├── lib/                          # FRONTEND MODULES (Next.js)
│   │
│   ├── auth/                     # Mirrors api-service/src/modules/auth
│   │   ├── index.js              # Re-exports all auth utilities
│   │   ├── tokens.js             # getAuthToken, clearAuthTokens, isTokenExpired
│   │   ├── refresh.js            # refreshAuthToken, startTokenRefreshTimer
│   │   ├── api.js                # authenticatedApiRequest
│   │   └── impersonation.js      # start/stop impersonation
│   │
│   ├── users/                    # User management API helpers
│   │   ├── index.js
│   │   └── api.js                # User, profile, persona API calls
│   │
│   ├── catalog/                  # Product API helpers
│   │   ├── index.js
│   │   └── api.js
│   │
│   ├── csv/                      # Bulk import/export API helpers
│   │   ├── index.js
│   │   └── api.js
│   │
│   ├── commerce/                 # Cart/checkout helpers
│   │   ├── index.js
│   │   ├── api.js
│   │   └── cart.js               # Cart state management
│   │
│   └── shared/                   # Shared frontend utilities
│       ├── index.js
│       ├── csrf.js               # CSRF token fetch/cache
│       ├── config.js             # Environment config
│       └── apiUtils.js           # Base API utilities
│
│
├── components/                   # FRONTEND UI COMPONENTS
│   │
│   ├── auth/                     # Auth components
│   │   ├── LoginModal.js
│   │   ├── SignupForm.js
│   │   └── ImpersonationExitButton.js
│   │
│   ├── profiles/                 # Profile components
│   │   ├── EditProfile.js
│   │   └── AvatarUpload.js
│   │
│   ├── catalog/                  # Catalog components
│   │   ├── ProductCard.js
│   │   ├── ProductGrid.js
│   │   └── ProductForm/
│   │
│   ├── commerce/                 # Commerce components
│   │   ├── CartDrawer.js
│   │   ├── CheckoutForm.js
│   │   └── OrderSummary.js
│   │
│   └── shared/                   # Reusable UI components
│       ├── Button/
│       ├── Modal/
│       └── Form/
│
│
├── mobile-app/
│   └── lib/                      # MOBILE (mirrors web lib/)
│       ├── auth/
│       │   ├── index.js
│       │   ├── tokens.js         # AsyncStorage instead of localStorage
│       │   ├── refresh.js
│       │   └── api.js
│       └── shared/
│
│
├── modules/                      # FRONTEND MODULES (ongoing)
│   │
│   ├── styles/                   # Global styles module
│   │   └── global.css            # ✅ Site-wide styles (imported in _app.js)
│   │
│   └── dashboard/                # Dashboard UI module (page-based)
│       ├── index.js              # ✅ Module exports
│       ├── config/
│       │   └── menuConfig.js     # ✅ Permission-based menu structure
│       ├── components/
│       │   ├── index.js          # ✅ Component exports
│       │   ├── layout/           # ✅ Shell, sidebar, navigation
│       │   │   ├── index.js
│       │   │   ├── DashboardShell.js  # ✅ Main wrapper
│       │   │   ├── DashboardHeader.js # ✅ Global styles + Breadcrumb
│       │   │   ├── DashboardFooter.js # ✅ With policy links
│       │   │   ├── Sidebar.js         # ✅ Collapsible nav
│       │   │   └── SidebarMenu.js     # ✅ Config-driven menu
│       │   ├── widgets/          # ✅ Widget system (migrated)
│       │   │   ├── WidgetGrid.js
│       │   │   ├── WidgetRenderer.js
│       │   │   └── items/
│       │   ├── shared/           # ✅ Dashboard-specific reusables
│       │   ├── users/            # ✅ User management section
│       │   ├── catalog/          # ✅ Product management section
│       │   ├── commerce/         # Orders section (TODO)
│       │   ├── events/           # Events section (TODO)
│       │   ├── websites/         # Sites section (TODO)
│       │   └── admin/            # Admin section (TODO)
│       ├── hooks/
│       ├── styles/
│       │   └── dashboard.css     # ✅ Dashboard layout (imported in _app.js)
│       └── README.md             # ✅ Updated documentation
│
│
└── api-service/src/
    ├── modules/                  # NEW (above)
    ├── routes/                   # OLD: Legacy routes (migrate from here)
    └── middleware/               # OLD: Legacy middleware (migrate from here)
```

---

## Users Module Specification

The Users module is the second core module after Auth. It encompasses all user management functionality including profiles, personas, verification, and admin user management.

### Current Inventory (Pre-Refactor)

**Backend API Routes:**
| File | Lines | Purpose |
|------|-------|---------|
| `routes/users.js` | ~1700 | User CRUD, profile management, completion status |
| `routes/personas.js` | ~300 | Artist personas (sub-profiles) |
| `routes/admin.js` | various | User management admin endpoints |

**Frontend Pages:**
| Path | Purpose |
|------|---------|
| `/profile/[id]` | Public profile view |
| `/profile/edit` | Profile editing |
| `/profile/setup` | Initial profile setup |
| `/profile-completion` | Required fields completion |
| `/user-type-selection` | Choose artist/community/promoter |

**Dashboard Components (Current Slide-ins):**

*My Account Section:*
- `EditProfile.js` - Edit own profile
- `ViewProfile.js` - View own profile  
- `EmailPreferences.js` - Email settings
- `PaymentSettings.js` - Payment methods
- `ShippingSettings.js` - Shipping addresses
- `MyOrders.js` - Order history

*Admin Section:*
- `ManageUsers.js` - Full user management (~1195 lines)
- `ManagePermissions.js` - Permission toggles (~207 lines)

### Backend Structure: `api-service/src/modules/users/`

```
users/
├── index.js              # Module entry point
├── routes.js             # v2 RESTful endpoints (/api/v2/users/*)
├── README.md             # Module documentation
├── services/
│   ├── index.js          # Re-exports all services
│   ├── user.js           # User CRUD operations
│   ├── profile.js        # Profile management
│   ├── persona.js        # Artist personas
│   ├── completion.js     # Profile completion logic
│   └── verification.js   # Email/identity verification
├── middleware/
│   ├── index.js
│   └── requireProfile.js # Require complete profile
├── helpers/
│   ├── index.js
│   └── profileTypes.js   # Artist/community/promoter type logic
└── validation/
    └── schemas.js        # Request validation schemas
```

### Frontend Utilities: `lib/users/`

```
users/
├── index.js              # Re-exports all utilities
├── api.js                # API wrapper functions
└── types.js              # JSDoc type definitions
```

### Dashboard Components: `modules/dashboard/components/users/`

```
users/
├── index.js              # Re-exports all components
├── ProfileView.js        # View own profile (page)
├── ProfileEdit.js        # Edit own profile (page)
├── EmailPreferences.js   # Email settings (page)
├── PaymentSettings.js    # Payment methods (page)
├── ShippingSettings.js   # Shipping addresses (page)
├── OrderHistory.js       # Order history (page)
├── PersonaManager.js     # Manage personas (page, vendor only)
└── admin/
    ├── index.js
    ├── UserList.js       # Admin user list (page)
    ├── UserDetail.js     # Admin user detail/edit (page)
    └── PermissionManager.js # Permission management (page)
```

### Dashboard Menu Structure (Users Section)

```javascript
// In modules/dashboard/config/menuConfig.js
{
  id: 'users',
  label: 'Users',
  href: '/dashboard/users',
  items: [
    { label: 'My Profile', href: '/dashboard/users/profile' },
    { label: 'Edit Profile', href: '/dashboard/users/profile/edit' },
    { label: 'My Personas', href: '/dashboard/users/personas', permission: 'vendor' },
    { label: 'Email Preferences', href: '/dashboard/users/email' },
    { label: 'Payment Settings', href: '/dashboard/users/payments' },
    { label: 'Shipping Addresses', href: '/dashboard/users/shipping' },
    { label: 'Order History', href: '/dashboard/users/orders' },
    // Admin only
    { label: 'User Management', href: '/dashboard/users/admin', adminOnly: true },
    { label: 'Permissions', href: '/dashboard/users/admin/permissions', adminOnly: true },
  ]
}
```

### v2 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v2/users/me` | Get current user's full profile |
| `PUT` | `/api/v2/users/me` | Update current user's profile |
| `GET` | `/api/v2/users/me/completion` | Get profile completion status |
| `GET` | `/api/v2/users/:id` | Get public profile (limited fields) |
| `GET` | `/api/v2/users/me/personas` | Get current user's personas |
| `POST` | `/api/v2/users/me/personas` | Create new persona |
| `PUT` | `/api/v2/users/me/personas/:id` | Update persona |
| `DELETE` | `/api/v2/users/me/personas/:id` | Delete persona |
| `GET` | `/api/v2/users` | List users (admin only) |
| `GET` | `/api/v2/users/:id/full` | Get full user data (admin only) |
| `PUT` | `/api/v2/users/:id` | Update any user (admin only) |
| `DELETE` | `/api/v2/users/:id` | Delete user (admin only) |
| `PUT` | `/api/v2/users/:id/permissions` | Update user permissions (admin only) |

### Implementation Phases

**Phase 1: Backend Module** ✅ Complete
- [x] Create module directory structure
- [x] Extract services from `routes/users.js`
- [x] Extract services from `routes/personas.js`
- [x] Create v2 RESTful endpoints (30+ endpoints)
- [x] Create backward-compatible wrappers for old routes

**Phase 2: Frontend Utilities** ✅ Complete
- [x] Build `lib/users/api.js` wrapper functions
- [x] Update existing pages to use new utilities

**Phase 3: Dashboard Pages** ✅ Complete
- [x] Convert `EditProfile` slide-in to page (accordion-based ProfileForm)
- [x] Convert `ViewProfile` slide-in to page
- [x] Convert remaining My Account items (Email, Payment, Shipping)
- [x] Convert admin `ManageUsers` to page
- [x] Convert admin `ManagePersonas` to page
- [x] Add Verification hub page

**Phase 4: Menu Integration** ✅ Complete
- [x] Add Users section to `menuConfig.js`
- [x] Create dashboard route pages
- [x] Add user-type color coding (admin=green, artist=purple, promoter=orange)
- [x] Remove old slide-in menu items

**Phase 5: Cleanup** ✅ Complete
- [x] Delete old slide-in components (EditProfile, ViewProfile, EmailPreferences, PaymentSettings, ShippingSettings)
- [x] Update onboarding widgets to use page navigation
- [x] Update documentation
- [ ] Delete wrapper files (after migration period)
- [ ] Delete legacy route files (after migration period)

---

## Catalog Module Specification

The Catalog module handles product management including products, categories, user collections, and import/export functionality.

### Backend Structure: `api-service/src/modules/catalog/`

```
catalog/
├── index.js              # Module entry point
├── routes.js             # v2 RESTful endpoints (/api/v2/catalog/*)
├── README.md             # Module documentation
└── services/
    ├── index.js          # Re-exports all services
    ├── product.js        # Product CRUD operations
    ├── category.js       # Category operations
    ├── collection.js     # User/vendor collections
    └── importExport.js   # CSV/Excel export, templates
```

### Frontend Structure

**API Client (`lib/catalog/`):**
```
catalog/
├── index.js              # Re-exports all functions
└── api.js                # All v2 API calls
```

**Public Components (`components/catalog/`):**
```
catalog/
├── index.js              # Re-exports components
├── ProductCard.js        # Single product display
└── ProductGrid.js        # Grid of products
```

**Dashboard Components (`modules/dashboard/components/catalog/`):**
```
catalog/
├── index.js              # Re-exports components
├── ProductList.js        # Product listing with filters
├── CollectionsManager.js # Manage user collections
├── CatalogImportExport.js # Bulk import/export
└── product-form/         # Product create/edit form
    ├── index.js
    ├── ProductFormContext.js
    ├── ProductStatusHeader.js
    └── sections/         # Form sections
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/catalog/products` | List products |
| GET | `/api/v2/catalog/products/:id` | Get product |
| POST | `/api/v2/catalog/products` | Create product |
| PATCH | `/api/v2/catalog/products/:id` | Update product |
| DELETE | `/api/v2/catalog/products/:id` | Delete product |
| GET | `/api/v2/catalog/categories` | List categories |
| GET | `/api/v2/catalog/collections` | List user collections |
| POST | `/api/v2/catalog/collections` | Create collection |
| PUT | `/api/v2/catalog/collections/:id` | Update collection |
| DELETE | `/api/v2/catalog/collections/:id` | Delete collection |
| POST | `/api/v2/catalog/export` | Export products |
| GET | `/api/v2/catalog/public/products` | Public product listing |

### Implementation Status

**Phase 1: Backend Module** ✅ Complete
- [x] Create module directory structure
- [x] Extract services from legacy `routes/products.js`
- [x] Create v2 RESTful routes
- [x] Create README.md

**Phase 2: Frontend Utilities** ✅ Complete
- [x] Build `lib/catalog/api.js` wrapper functions
- [x] All functions use v2 endpoints only

**Phase 3: Dashboard Components** ✅ Complete
- [x] ProductList with v2 API
- [x] ProductForm with v2 API
- [x] CollectionsManager with v2 API
- [x] CatalogImportExport with v2 API

**Phase 4: Public Components** ✅ Complete
- [x] Create `components/catalog/`
- [x] ProductCard component
- [x] ProductGrid component

**Phase 5: Cleanup** (Pending)
- [ ] Delete old components (`components/dashboard/manage-my-store/`)
- [ ] Remove old menu items pointing to legacy components
- [ ] Delete legacy route files (after migration period)

---

## CSV Module Specification

### Overview

Bulk import/export module for CSV and Excel file processing. Runs as an integrated worker within the API service, using direct service calls to other modules instead of HTTP API requests.

### Key Feature: Integrated Worker

Unlike the old standalone `csv-workers` service that made HTTP calls with JWT/CSRF, this module's worker runs within the API process and calls module services directly:

```javascript
// Old approach (csv-workers service)
const response = await makeAPICall('/products', {
  method: 'POST',
  body: JSON.stringify(productPayload)
}, userJWT, userRefreshToken);

// New approach (integrated worker)
const { productService } = require('../catalog');
const product = await productService.create(vendorId, productData);
```

Benefits:
- No JWT refresh handling needed
- No CSRF token overhead
- Shared database connection pool
- Simpler error handling
- Better performance

### Backend Structure (`api-service/src/modules/csv/`)

```
csv/
├── index.js              # Module exports
├── routes.js             # API endpoints
├── worker.js             # Bull queue consumer (starts with server)
├── services/
│   ├── index.js          # Service exports
│   ├── queue.js          # Bull queue setup
│   ├── jobs.js           # Job tracking
│   ├── processor.js      # Main job router
│   ├── parsers.js        # CSV/Excel parsing
│   ├── products.js       # Product import (uses catalog module)
│   ├── inventory.js      # Inventory import (uses catalog module)
│   ├── templates.js      # Template generation
│   └── reports.js        # Saved reports CRUD
└── README.md
```

### Frontend Structure

```
lib/csv/
├── index.js              # Re-exports all functions
└── api.js                # uploadFile, getJobStatus, downloadTemplate, etc.
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v2/csv/upload` | Upload CSV/Excel for processing |
| GET | `/api/v2/csv/jobs/:jobId` | Get job status |
| DELETE | `/api/v2/csv/jobs/:jobId` | Delete job |
| GET | `/api/v2/csv/templates/:jobType` | Download import template |
| GET | `/api/v2/csv/reports` | List saved reports |
| POST | `/api/v2/csv/reports` | Save report config |
| DELETE | `/api/v2/csv/reports/:reportId` | Delete saved report |

### Job Types

| Type | Permission | Uses Module |
|------|------------|-------------|
| `product_upload` | vendor | `catalog.productService` |
| `inventory_upload` | vendor | `catalog.productService` |
| `user_upload` | admin | `users.userService` (pending) |
| `event_upload` | vendor | `events.eventService` (pending) |

### Implementation Status

**Phase 1: Module Structure** ✅
- [x] Create module directory structure
- [x] Create index.js, routes.js, worker.js
- [x] Create services (queue, jobs, parsers, processor)

**Phase 2: Product/Inventory Processing** ✅
- [x] Product import using `catalog.productService`
- [x] Inventory import using `catalog.productService`
- [x] Direct service calls (no HTTP)

**Phase 3: API Routes** ✅
- [x] Upload endpoint
- [x] Job status endpoint
- [x] Template download endpoint
- [x] Saved reports CRUD

**Phase 4: Frontend Integration** ✅
- [x] Create `lib/csv/api.js`
- [x] Update `CatalogImportExport` component to use v2 API

**Phase 5: Cleanup** (Pending)
- [ ] Stop old `csv-worker` PM2 process
- [ ] Delete `csv-workers/` directory
- [ ] Remove old `/csv/*` routes from server.js

---

## Module Structure Rules

### 1. Index.js Pattern (Clean Imports)

Every module and subfolder has an `index.js` that re-exports its contents. This enables clean imports:

```javascript
// GOOD: Clean imports via index.js
const { requireAuth, requirePermission } = require('../auth');
const { jwtService, sessionService } = require('../auth/services');

// BAD: Direct file imports (avoid)
const requireAuth = require('../auth/middleware/requireAuth');
const jwtService = require('../auth/services/jwt');
```

#### Module Entry Point (`index.js`)

```javascript
// api-service/src/modules/auth/index.js
const router = require('./routes');
const services = require('./services');
const middleware = require('./middleware');

module.exports = {
  // Router for mounting
  router,
  
  // Services for cross-module use
  ...services,
  
  // Middleware exports
  ...middleware,
  
  // Backward compatibility alias
  verifyToken: middleware.requireAuth,
};
```

#### Services Index

```javascript
// api-service/src/modules/auth/services/index.js
module.exports = {
  jwtService: require('./jwt'),
  sessionService: require('./session'),
  permissionsService: require('./permissions'),
  firebaseService: require('./firebase'),
};
```

#### Middleware Index

```javascript
// api-service/src/modules/auth/middleware/index.js
module.exports = {
  requireAuth: require('./requireAuth'),
  requirePermission: require('./requirePermission'),
  requireRole: require('./requireRole'),
};
```

#### Frontend Module Index

```javascript
// lib/auth/index.js
export * from './tokens';
export * from './refresh';
export * from './api';
export * from './impersonation';

// Named default exports
export { getAuthToken, clearAuthTokens, isTokenExpired } from './tokens';
export { refreshAuthToken, startTokenRefreshTimer } from './refresh';
export { authenticatedApiRequest, secureApiRequest } from './api';
```

### 2. Import Patterns

| Importing From | Pattern | Example |
|----------------|---------|---------|
| Same module | Relative | `require('./services/jwt')` |
| Other module | Via index | `require('../auth')` |
| Shared | Via index | `require('../shared/services')` |
| Frontend lib | ES import | `import { getAuthToken } from '../../lib/auth'` |

### 3. Routes File (`routes.js`)

All routes are versioned and prefixed:

```javascript
// modules/auth/routes.js
const express = require('express');
const router = express.Router();

// All routes automatically prefixed with /api/v2/auth
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refreshToken);
router.get('/me', requireAuth, authController.getCurrentUser);

module.exports = router;
```

### 4. Services (Business Logic)

Services contain pure business logic, no HTTP concerns:

```javascript
// modules/auth/services/jwt.js
const jwt = require('jsonwebtoken');

/**
 * Create access token for user
 * @param {User} user - User object
 * @returns {string} JWT token
 */
function createAccessToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
}

/**
 * Validate and decode token
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
function validateToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

module.exports = { createAccessToken, validateToken };
```

### 5. Types (JSDoc Type Definitions)

Use JSDoc for type documentation (works with VS Code IntelliSense):

```javascript
// modules/auth/types.js

/**
 * @typedef {Object} User
 * @property {number} id - User ID
 * @property {string} email - User email
 * @property {string} role - User role (buyer|artist|vendor|admin)
 * @property {boolean} emailVerified - Email verification status
 */

/**
 * @typedef {Object} AuthTokens
 * @property {string} accessToken - Short-lived access token
 * @property {string} refreshToken - Long-lived refresh token
 * @property {number} expiresIn - Access token expiry (seconds)
 */

/**
 * @typedef {Object} LoginRequest
 * @property {string} email - User email
 * @property {string} password - User password
 */

module.exports = {};  // Types only, no runtime exports
```

---

## API Standards (RESTful CRUD)

Our API follows **RESTful conventions** for third-party compatibility. Each module has **one routes file** that defines clean CRUD endpoints, with business logic extracted to helpers/services.

### URL Structure

```
/api/v2/{module}/{resource}
/api/v2/{module}/{resource}/{id}
/api/v2/{module}/{resource}/{id}/{sub-resource}
```

### HTTP Methods (CRUD)

| Method | Action | URL Pattern | Example |
|--------|--------|-------------|---------|
| `GET` | List all | `/api/v2/catalog/products` | Get all products |
| `GET` | Get one | `/api/v2/catalog/products/:id` | Get product by ID |
| `POST` | Create | `/api/v2/catalog/products` | Create new product |
| `PUT` | Replace | `/api/v2/catalog/products/:id` | Replace entire product |
| `PATCH` | Update | `/api/v2/catalog/products/:id` | Update specific fields |
| `DELETE` | Delete | `/api/v2/catalog/products/:id` | Delete product |

### Standard Response Format

```javascript
// Success response
{
  "success": true,
  "data": { ... },           // Single object or array
  "meta": {                  // Optional metadata
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [             // Optional field-level errors
      { "field": "email", "message": "Must be valid email" }
    ]
  }
}
```

### HTTP Status Codes

| Code | Usage |
|------|-------|
| `200` | Success (GET, PUT, PATCH) |
| `201` | Created (POST) |
| `204` | No Content (DELETE) |
| `400` | Bad Request (validation errors) |
| `401` | Unauthorized (not logged in) |
| `403` | Forbidden (no permission) |
| `404` | Not Found |
| `409` | Conflict (duplicate, etc.) |
| `422` | Unprocessable Entity (business logic error) |
| `429` | Too Many Requests (rate limited) |
| `500` | Internal Server Error |

### Route File Architecture

Each module has ONE `routes.js` file with clean CRUD endpoints:

```javascript
// modules/catalog/routes.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../shared/middleware/auth');
const { validate } = require('../shared/middleware/validator');
const productService = require('./services/products');
const productHelpers = require('./helpers/products');
const { productSchema, productUpdateSchema } = require('./validation/products');

// ============================================================================
// PRODUCTS CRUD
// ============================================================================

/**
 * GET /api/v2/catalog/products
 * List products with filtering, sorting, pagination
 */
router.get('/products', async (req, res, next) => {
  try {
    const filters = productHelpers.parseFilters(req.query);
    const pagination = productHelpers.parsePagination(req.query);
    
    const result = await productService.list(filters, pagination);
    
    res.json({
      success: true,
      data: result.products,
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v2/catalog/products/:id
 * Get single product by ID
 */
router.get('/products/:id', async (req, res, next) => {
  try {
    const product = await productService.getById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' }
      });
    }
    
    res.json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v2/catalog/products
 * Create new product
 */
router.post('/products', 
  requireAuth, 
  validate(productSchema),
  async (req, res, next) => {
    try {
      const product = await productService.create(req.user.id, req.body);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v2/catalog/products/:id
 * Update product fields
 */
router.patch('/products/:id',
  requireAuth,
  validate(productUpdateSchema),
  async (req, res, next) => {
    try {
      const product = await productService.update(
        req.params.id, 
        req.user.id, 
        req.body
      );
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/v2/catalog/products/:id
 * Delete product
 */
router.delete('/products/:id',
  requireAuth,
  async (req, res, next) => {
    try {
      await productService.delete(req.params.id, req.user.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
```

### Module File Hierarchy

```
modules/catalog/
├── index.js              # Module entry point
├── routes.js             # ONE file: all CRUD endpoints
├── services/             # Business logic (called by routes)
│   ├── products.js       # Product CRUD operations
│   ├── categories.js     # Category operations
│   └── inventory.js      # Inventory operations
├── helpers/              # Route helpers (keep routes clean)
│   ├── products.js       # Filter parsing, formatting
│   └── pagination.js     # Pagination helpers
├── validation/           # Request validation schemas
│   ├── products.js       # Product validation rules
│   └── categories.js     # Category validation rules
├── types.js              # JSDoc type definitions
└── README.md             # Module documentation
```

### Layer Responsibilities

```
┌─────────────────────────────────────────────────────────────────┐
│                         ROUTES (routes.js)                      │
│  • HTTP handling only                                           │
│  • Request parsing                                              │
│  • Response formatting                                          │
│  • Error handling                                               │
│  • NO business logic                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     HELPERS (helpers/*.js)                      │
│  • Parse query params → filter objects                          │
│  • Format data for responses                                    │
│  • Validation helpers                                           │
│  • Utility functions for routes                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICES (services/*.js)                     │
│  • Business logic                                               │
│  • Database operations                                          │
│  • External API calls                                           │
│  • Reusable across routes                                       │
│  • NO HTTP concerns                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE (shared/db.js)                    │
└─────────────────────────────────────────────────────────────────┘
```

### Query Parameters (Standard)

| Parameter | Usage | Example |
|-----------|-------|---------|
| `page` | Page number | `?page=2` |
| `limit` | Items per page | `?limit=20` |
| `sort` | Sort field | `?sort=created_at` |
| `order` | Sort direction | `?order=desc` |
| `search` | Text search | `?search=painting` |
| `filter[field]` | Field filter | `?filter[status]=active` |
| `include` | Related data | `?include=category,images` |
| `fields` | Sparse fieldsets | `?fields=id,name,price` |

### Auth Header

```
Authorization: Bearer {access_token}
```

### OpenAPI Compatibility

Each module can export OpenAPI schema for documentation:

```javascript
// modules/catalog/openapi.js
module.exports = {
  paths: {
    '/api/v2/catalog/products': {
      get: {
        summary: 'List products',
        tags: ['Catalog'],
        parameters: [...],
        responses: {...}
      },
      post: {
        summary: 'Create product',
        tags: ['Catalog'],
        requestBody: {...},
        responses: {...}
      }
    }
  }
};
```

### Mounting Modules

```javascript
// api-service/src/server.js (updated)

// Legacy routes (v1 - no version prefix)
app.use('/auth', require('./routes/auth'));           // OLD
app.use('/products', require('./routes/products'));   // OLD

// New modular routes (v2)
app.use('/api/v2/auth', require('./modules/auth').router);
app.use('/api/v2/profiles', require('./modules/profiles').router);
app.use('/api/v2/catalog', require('./modules/catalog').router);
// ... etc
```

---

## Migration Strategy

### Phase 1: Create Module Shell
```
1. Create module directory structure
2. Create index.js, routes.js, types.js
3. Create README.md with module spec
```

### Phase 2: Extract Services
```
1. Identify business logic in old routes
2. Extract to service files
3. Add JSDoc types
4. Write basic tests
```

### Phase 3: Create v2 Routes
```
1. Create new routes calling services
2. Mount at /api/v2/{module}
3. Test new endpoints
```

### Phase 4: Migrate Consumers
```
1. Update frontend to use v2 endpoints
2. Update mobile app
3. Add deprecation headers to v1
```

### Phase 5: Cleanup
```
1. Remove old route file
2. Remove old middleware
3. Update documentation
```

### Example Migration Tracking

```markdown
## Auth Module Migration

### Files to Migrate
- [x] api-service/src/routes/auth.js → modules/auth/routes.js
- [ ] api-service/src/middleware/auth.js → modules/auth/middleware/
- [ ] lib/firebase.js → modules/auth/services/firebase.js
- [ ] lib/csrf.js → modules/shared/middleware/csrf.js

### New Files Created
- [x] modules/auth/index.js
- [x] modules/auth/routes.js
- [ ] modules/auth/services/jwt.js
- [ ] modules/auth/services/firebase.js
- [ ] modules/auth/middleware/requireAuth.js

### Consumers to Update
- [ ] pages/login.js
- [ ] pages/signup.js
- [ ] components/login/LoginModal.js
- [ ] mobile-app/components/LoginScreen.js
```

---

## Cross-Module Communication

### Importing from Other Modules

```javascript
// api-service/src/modules/commerce/services/checkout.js
const { jwtService, sessionService } = require('../../auth');
const { productService } = require('../../catalog');

async function createCheckout(userId, cartItems) {
  // Use auth service to validate user
  const user = await jwtService.validateToken(token);
  
  // Use catalog service to validate products
  const products = await productService.validateProducts(cartItems);
  
  // ... checkout logic
}
```

### Shared Services

```javascript
// api-service/src/modules/shared/services/email.js
const nodemailer = require('nodemailer');

async function sendEmail({ to, subject, html }) {
  // Email sending logic
}

module.exports = { sendEmail };

// Usage in any module (via index):
const { email } = require('../shared/services');
await email.sendEmail({ to, subject, html });
```

---

## Frontend Component Rules

### Shared Components Location

```
components/
├── shared/                 # Truly reusable (no business logic)
│   ├── Button/
│   │   ├── Button.js
│   │   ├── Button.module.css
│   │   └── index.js
│   ├── Modal/
│   ├── Form/
│   │   ├── Input.js
│   │   ├── Select.js
│   │   └── Checkbox.js
│   └── ...
│
├── auth/                   # Auth-specific components
│   ├── LoginForm.js
│   ├── SignupForm.js
│   └── ...
│
├── catalog/                # Catalog-specific components
│   ├── ProductCard.js
│   ├── ProductGrid.js
│   └── ...
│
└── commerce/               # Commerce-specific components
    ├── CartItem.js
    ├── CheckoutForm.js
    └── ...
```

### CSS Architecture (Global-First)

**Strategy:** Avoid component-level `.module.css` files. Use global styles:

1. **`modules/styles/global.css`** - Site-wide styles (buttons, forms, tables, modals)
2. **`modules/dashboard/styles/dashboard.css`** - Dashboard layout styles
3. **Module-specific styles** only when truly unique to a single component

**Rules:**
- New components use global CSS class names directly (no `styles.className`)
- Buttons use global `.secondary`, forms use global form classes
- Layout uses `dashboard.css` classes (`.dashboard-header`, `.sidebar-menu`, etc.)
- Only create `.module.css` if a component has truly unique, non-reusable styles

**CSS Variables (in global.css):**

```css
:root {
  /* Brand Colors */
  --primary-color: #055474;
  --secondary-color: #3E1C56;
  --text-color: #333333;
  --success-color: #198754;
  
  /* Typography */
  --font-heading: 'Permanent Marker', cursive;
  --font-body: 'Nunito Sans', sans-serif;
  
  /* Design Tokens */
  --border-radius-sm: 2px;
  --border-radius-md: 4px;
  --shadow-soft: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```

---

## Module Checklist Template

When creating a new module, use this checklist:

```markdown
## [Module Name] Module

### Setup
- [ ] Create directory: `modules/{name}/`
- [ ] Create `index.js` (module entry)
- [ ] Create `routes.js` (API routes)
- [ ] Create `types.js` (type definitions)
- [ ] Create `README.md` (documentation)
- [ ] Create `services/` directory

### Services
- [ ] Identify all business logic
- [ ] Create service files
- [ ] Add JSDoc documentation
- [ ] Handle errors properly

### Routes
- [ ] Define v2 endpoints
- [ ] Add input validation
- [ ] Add proper error responses
- [ ] Mount in server.js

### Migration
- [ ] List old files to migrate
- [ ] Update frontend consumers
- [ ] Update mobile consumers
- [ ] Add deprecation to v1
- [ ] Delete old files

### Documentation
- [ ] Document all endpoints
- [ ] Document types
- [ ] Add examples
- [ ] Update ARCHITECTURE.md
```

---

## Backward Compatibility & Migration

### Wrapper Files (Temporary)

During refactoring, old files become **thin wrappers** that re-export from new modules. This allows 100+ existing files to work without immediate changes:

| Old File | Now Re-exports From | Consumer Count |
|----------|---------------------|----------------|
| `api-service/src/middleware/jwt.js` | `modules/auth/middleware/requireAuth` | 44 files |
| `api-service/src/middleware/permissions.js` | `modules/auth/middleware/` + `services/` | 30 files |
| `lib/csrf.js` (auth functions) | `lib/auth/*` | 81 files |

**How it works:**
```javascript
// OLD: api-service/src/middleware/jwt.js (now a wrapper)
const requireAuth = require('../modules/auth/middleware/requireAuth');
module.exports = requireAuth;  // Same export signature, new implementation
```

**Rules:**
1. **New code** should import from `modules/auth` directly
2. **Existing code** continues to work via wrappers (no immediate changes needed)
3. **Update imports when you touch a file** - as you refactor files into other modules (profiles, catalog, etc.), update their auth imports to use the new paths
4. **After ALL modules refactored**, delete wrapper files in final cleanup pass

### Aliased Exports (Temporary)

During the refactor, some modules export **both old and new names** for the same function:

| Module | Old Name | New Name | Usage |
|--------|----------|----------|-------|
| Auth | `verifyToken` | `requireAuth` | JWT middleware |

**Rules:**
1. **New code** should use the new name (`requireAuth`)
2. **Existing code** can keep using old name (wrappers handle it)
3. **Update to new names when you touch a file** during other module refactors
4. **After ALL modules refactored**, remove old aliases in final cleanup pass

### Post-Refactor Cleanup Checklist

**TIMING: Only after ALL modules are refactored** (profiles, catalog, commerce, events, websites, marketing, admin, etc.). During refactoring, wrappers stay in place. This checklist is the FINAL step:

**Auth Module Wrappers (remove after all consumers migrated):**
- [ ] `api-service/src/middleware/jwt.js` → Delete (44 files import this)
- [ ] `api-service/src/middleware/permissions.js` → Delete (30 files import this)
- [ ] `lib/csrf.js` auth re-exports → Remove lines 193-218 (81 files import auth from here)
- [ ] `api-service/src/routes/auth.js` → Delete legacy v1 routes (24KB)

**Alias Cleanup:**
- [ ] Search for `verifyToken` usage → replace with `requireAuth`
- [ ] Remove `verifyToken` alias from `modules/auth/index.js`
- [ ] Search for any other deprecated aliases

**Import Path Updates:**
- [ ] Update all `require('./middleware/jwt')` → `require('./modules/auth')`
- [ ] Update all `require('./middleware/permissions')` → `require('./modules/auth')`
- [ ] Update all `import from 'lib/csrf'` auth imports → `import from 'lib/auth'`

**File Cleanup:**
- [ ] Remove empty/deprecated files from `api-service/src/routes/`
- [ ] Remove empty/deprecated files from `api-service/src/middleware/`
- [ ] Update documentation to remove migration notes

---

## Related Documents

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System overview
- [REFACTOR_WORKFLOW.md](./REFACTOR_WORKFLOW.md) - Development workflow
- [database/schema.sql](../database/schema.sql) - Database schema
