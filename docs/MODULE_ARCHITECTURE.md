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
│       │   │   ├── permissions.js # Role/permission checks
│       │   │   └── keys.js        # API keys (list, create, toggle, delete)
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
│       ├── commerce/             # ✅ Commerce module (orders, sales, shipping, returns)
│       │   ├── index.js
│       │   ├── routes.js
│       │   └── services/
│       │       ├── index.js
│       │       ├── orders.js     # Customer order history
│       │       ├── sales.js      # Vendor order management
│       │       ├── shipping.js   # Rates, labels, tracking
│       │       └── returns.js    # Customer & vendor returns
│       │
│       ├── finances/             # ✅ Finances module (balance, payouts, transactions)
│       │   ├── index.js
│       │   ├── routes.js
│       │   └── services/
│       │       └── index.js      # Balance, transactions, payouts, earnings
│       │
│       ├── communications/       # ✅ Communications module (tickets, support)
│       │   ├── index.js
│       │   ├── routes.js
│       │   └── services/
│       │       ├── index.js
│       │       └── tickets.js    # User & admin ticket management
│       │
│       ├── events/               # Events module
│       │   ├── index.js
│       │   ├── routes.js
│       │   └── services/
│       │
│       ├── applications/        # Event applications (artist); backend done, full rebuild TBD
│       │   ├── index.js
│       │   ├── routes.js
│       │   └── services/
│       │       └── index.js
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
│   ├── commerce/                 # ✅ Commerce API helpers
│   │   ├── index.js
│   │   ├── api.js                # Orders, sales, shipping, returns
│   │   └── cart.js               # Cart state management
│   │
│   ├── finances/                 # ✅ Finances API helpers
│   │   ├── index.js
│   │   └── api.js                # Balance, transactions, payouts
│   │
│   ├── communications/           # ✅ Communications API helpers
│   │   ├── index.js
│   │   └── api.js                # User & admin ticket functions
│   │
│   ├── subscriptions/            # ✅ Subscriptions API helpers
│   │   ├── index.js
│   │   └── api.js                # Shipping, verified, marketplace, addons
│   │
│   ├── marketing/                # ✅ Marketing API helpers
│   │   ├── index.js
│   │   └── api.js                # User submissions, admin management
│   │
│   ├── email/                    # ✅ Email API helpers
│   │   ├── index.js
│   │   └── api.js                # Templates, logs, send preview, resend
│   │
│   └── shared/                   # Shared frontend utilities
│       ├── index.js
│       ├── csrf.js               # CSRF token fetch/cache
│       ├── config.js             # Environment config
│       └── apiUtils.js           # Base API utilities
│
│
├── components/                   # FRONTEND UI COMPONENTS (legacy + public-facing)
│   │                             # Domain components moved to modules/; this holds:
│   │                             # - Public page components (Header, Footer, carousels)
│   │                             # - Thin wrapper files for backward compatibility
│   │
│   ├── admin/                    # Admin UI (ImpersonationExitButton)
│   ├── dashboard/                # Dashboard component wrappers → modules/dashboard
│   ├── layouts/                  # Layout components (MainLayout, DashboardLayout)
│   ├── profiles/                 # Profile wrappers (CookieBanner)
│   ├── search/                   # Search UI (SearchModal, SearchBar, SearchResults)
│   ├── shared/                   # Shared UI (ContactArtistModal)
│   ├── stripe/                   # Stripe UI (StripeCardSetup)
│   ├── subscriptions/            # Subscription flow (ChecklistController, dashboards)
│   ├── users/                    # @deprecated wrapper → modules/shared
│   │   └── index.js              # Re-exports ProfileDisplay, AboutTheArtist, SocialLinks
│   ├── Header.js, Footer.js      # Site header/footer
│   ├── *Carousel.js              # Product carousels (public pages)
│   └── ...
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
│   │   ├── global.css            # ✅ Site-wide styles (imported in _app.js)
│   │   ├── forms.css             # Form elements, cards, grids
│   │   ├── buttons.css           # Button variants
│   │   ├── tables.css            # Data tables, pagination
│   │   ├── modals.css            # Modal overlays
│   │   ├── alerts.css            # Alerts, banners, toasts
│   │   ├── states.css            # Loading, empty, error states
│   │   ├── tabs.css              # Tab navigation
│   │   └── carousels.css         # ✅ Artist carousel, skeleton loading
│   │
│   ├── catalog/                  # ✅ Catalog module
│   │   ├── index.js              # Module exports
│   │   └── components/           # Product management components
│   │
│   ├── commerce/                 # ✅ Commerce module
│   │   ├── index.js              # Module exports
│   │   └── components/           # Orders, sales, shipping, returns
│   │
│   ├── communications/           # ✅ Communications module
│   │   ├── index.js              # Module exports
│   │   └── components/           # Tickets, support, articles
│   │
│   ├── events/                   # ✅ Events module
│   │   ├── index.js              # Module exports
│   │   └── components/           # Event management, applications, tickets
│   │
│   ├── finances/                 # ✅ Finances module
│   │   ├── index.js              # Module exports
│   │   └── components/           # Payouts, earnings, transactions
│   │
│   ├── users/                    # ✅ Users module
│   │   ├── index.js              # Module exports
│   │   └── components/           # Profiles, personas, settings
│   │
│   ├── websites/                 # ✅ Websites module
│   │   ├── index.js              # Module exports
│   │   └── components/           # Site management, customization
│   │
│   ├── applications/             # ✅ Applications module
│   │   ├── index.js              # Module exports
│   │   └── components/           # Event application system
│   │       ├── application-form/ # Artist application form
│   │       ├── applications-received/ # Promoter applicant management
│   │       ├── ApplicationStatus.js
│   │       ├── MyApplications.js
│   │       ├── JuryPackets.js
│   │       ├── MyApplicants.js
│   │       └── AdminAllApplications.js
│   │
│   ├── subscriptions/            # ✅ Subscriptions module
│   │   ├── index.js              # Module exports
│   │   └── components/
│   │       ├── SubscriptionOverview.js    # Main management page
│   │       ├── SubscriptionCard.js        # Row component
│   │       └── ConnectBalancePreference.js # Payment preference
│   │
│   ├── marketing/                # ✅ Marketing module
│   │   ├── index.js              # Module exports
│   │   └── components/
│   │       ├── ShareContent.js           # User submission form + history
│   │       ├── AdminMediaLibrary.js      # Admin review interface
│   │       └── AdminPromotions.js        # Admin promotions, sales, coupons
│   │
│   ├── shared/                   # ✅ Shared UI module (cross-module components)
│   │   ├── index.js              # Module exports
│   │   ├── AccordionSection.js   # Collapsible form sections
│   │   ├── ArtistCarousel.js     # Featured artists (homepage, v2 API)
│   │   ├── AboutTheArtist.js     # Artist info card (product pages, v2 API)
│   │   ├── ProfileDisplay.js     # Public profile view
│   │   ├── SocialLinks.js        # Social media icon links
│   │   └── block-editor/         # Rich content editor (BlockEditor.js)
│   │
│   └── dashboard/                # Dashboard UI module (menu shell only)
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
│       │   ├── shared/           # Re-exports from modules/shared/
│       │   └── admin/            # TODO: move to modules/admin/
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

### Module Components: `modules/users/components/`

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
├── verified/             # Verified Artist sub-module
│   ├── index.js          # Re-exports verified components
│   ├── verifiedConfig.js # ChecklistController config ($50/year)
│   ├── VerifiedSubscription.js  # Gate component with permission check
│   └── VerifiedDashboard.js     # Status dashboard for approved users
└── admin/
    ├── index.js
    ├── UserList.js       # Admin user list (page)
    ├── UserDetail.js     # Admin user detail/edit (page)
    └── PermissionManager.js # Permission management (page)
```

**Verified Artist Sub-module** ✅
- [x] `VerifiedSubscription.js` - gate component with permission check:
  - Has verified permission → shows `VerifiedDashboard` directly
  - No permission → shows application flow via `ChecklistController`
- [x] `VerifiedDashboard.js` - verified status dashboard with global styles
- [x] `verifiedConfig.js` - configuration for ChecklistController ($50/year tier)
- [x] Page at `/dashboard/users/verified`
- [x] Conditional menu label: "Get Verified" (no permission) / "Verified Status" (has permission)
- [x] Uses legacy backend routes: `/api/subscriptions/verified/*` for application

### Dashboard Menu Structure (Users Section)

```javascript
// In modules/dashboard/config/menuConfig.js
{
  id: 'users',
  label: 'My Account',
  href: '/dashboard/users',
  items: [
    { label: 'My Profile', href: '/dashboard/users/profile' },
    { label: 'Edit Profile', href: '/dashboard/users/profile/edit' },
    { label: 'Artist Personas', href: '/dashboard/users/personas', userTypes: ['artist'] },
    { label: 'Email Preferences', href: '/dashboard/users/email' },
    { label: 'Payment Settings', href: '/dashboard/users/payments' },
    { label: 'Shipping Settings', href: '/dashboard/users/shipping' },
    // Conditional label: "Get Verified" / "Verified Status" based on verified permission
    { href: '/dashboard/users/verified', userTypes: ['admin', 'artist'], labelCondition: {...} },
    // Conditional label: "Apply for Wholesale" / "Wholesale Status" based on wholesale permission
    { href: '/dashboard/account/wholesale-application', labelCondition: {...} },
    // Admin only
    { label: 'Manage Users', href: '/dashboard/users/manage', adminOnly: true },
    { label: 'Act As...', href: '/dashboard/users/manage?action=impersonate', adminOnly: true },
    { label: 'All Personas', href: '/dashboard/users/personas/manage', adminOnly: true },
    { label: 'Manage Commissions', href: '/dashboard/users/commissions', adminOnly: true },
    { label: 'API Keys', href: '/dashboard/users/api-keys', adminOnly: true },
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
├── routesCuration.js     # ✅ Product curation routes (/api/v2/catalog/curation/*)
├── routesWalmart.js      # Walmart connector routes
├── routesTiktok.js       # TikTok connector routes
├── README.md             # Module documentation
└── services/
    ├── index.js          # Re-exports all services
    ├── product.js        # Product CRUD operations
    ├── category.js       # ✅ Full category management (CRUD, content, SEO, products)
    ├── collection.js     # User/vendor collections
    ├── importExport.js   # CSV/Excel export, templates
    └── curation.js       # ✅ Marketplace product curation (sorting into art/crafts)
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

**Module Components (`modules/catalog/components/`):**
```
catalog/
├── index.js              # Module exports
└── components/
    ├── index.js              # Re-exports components
    ├── ProductList.js        # Product listing with filters
    ├── CollectionsManager.js # Manage user collections
    ├── CatalogImportExport.js # Bulk import/export
    ├── CategoryManagement.js # ✅ Admin category management (CRUD, content, SEO, products)
    ├── VariationSelector.js  # Public product page variation picker (global styles)
    ├── VariationManager.js   # Product form variation types/values (global styles)
    ├── VariationBulkEditor.js # Product form bulk-edit variations (global styles; forms.css)
    ├── addons/               # Marketplace connectors
    │   ├── index.js
    │   ├── WalmartConnector.js      # Vendor: Walmart listings
    │   ├── WalmartConnectorAdmin.js # Admin: Walmart feed management
    │   ├── TikTokConnector.js       # Vendor: TikTok Shop
    │   └── TikTokConnectorAdmin.js  # Admin: TikTok feed management
    └── product-form/         # Product create/edit form
        ├── index.js
        ├── ProductFormContext.js
        ├── ProductStatusHeader.js
        └── sections/         # Form sections (includes connectors/WalmartSection, TikTokSection)
```
**Pages:** Catalog > Addons: `pages/dashboard/catalog/addons/walmart.js`, `walmart-admin.js`, `tiktok.js`, `tiktok-admin.js`. Catalog > Categories: `pages/dashboard/catalog/categories/index.js` (admin-only). **Menu:** `menuConfig.js` Catalog > Addons > Walmart Connector, Walmart Connector Admin, TikTok Connector, TikTok Connector Admin; Catalog > Categories (admin-only, moved from System menu).

### API Endpoints

**Products:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/catalog/products` | List products |
| GET | `/api/v2/catalog/products/:id` | Get product |
| POST | `/api/v2/catalog/products` | Create product |
| PATCH | `/api/v2/catalog/products/:id` | Update product |
| DELETE | `/api/v2/catalog/products/:id` | Delete product |
| GET | `/api/v2/catalog/public/products` | Public product listing |
| POST | `/api/v2/catalog/export` | Export products |

**Categories (admin-only for write operations):**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/catalog/categories` | List categories (public; format=list\|tree\|flat\|all) |
| GET | `/api/v2/catalog/categories/:id` | Get category (public) |
| POST | `/api/v2/catalog/categories` | Create category (admin) |
| PUT | `/api/v2/catalog/categories/:id` | Update category (admin) |
| DELETE | `/api/v2/catalog/categories/:id` | Delete category (admin) |
| GET | `/api/v2/catalog/categories/:id/content` | Get category content (public) |
| PUT | `/api/v2/catalog/categories/:id/content` | Update category content (admin) |
| GET | `/api/v2/catalog/categories/:id/seo` | Get category SEO (public) |
| PUT | `/api/v2/catalog/categories/:id/seo` | Update category SEO (admin) |
| GET | `/api/v2/catalog/categories/:id/products` | Get products in category (public) |
| POST | `/api/v2/catalog/categories/:id/products` | Add product to category (admin) |
| DELETE | `/api/v2/catalog/categories/:id/products/:productId` | Remove product from category (admin) |
| GET | `/api/v2/catalog/categories/search-products` | Search products for category (admin) |
| GET | `/api/v2/catalog/categories/search-vendors` | Search vendors for featuring (admin) |
| GET | `/api/v2/catalog/categories/change-log` | Category change log (admin) |
| POST | `/api/v2/catalog/categories/upload` | Upload category images (admin) |

**Collections:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/catalog/collections` | List user collections |
| POST | `/api/v2/catalog/collections` | Create collection |
| PUT | `/api/v2/catalog/collections/:id` | Update collection |
| DELETE | `/api/v2/catalog/collections/:id` | Delete collection |

**Product Curation (admin-only):**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/catalog/curation/stats` | Get curation statistics (unsorted/art/crafts counts) |
| GET | `/api/v2/catalog/curation/products` | List products by category (unsorted/art/crafts) |
| PUT | `/api/v2/catalog/curation/products/:id/categorize` | Move product to category |
| PUT | `/api/v2/catalog/curation/products/bulk` | Bulk categorize products |
| GET | `/api/v2/catalog/curation/log` | Get curation history log |

**Curation Page:** System > Curate (`/dashboard/system/curate`) - Admin-only page for sorting marketplace products into Art and Crafts categories. Uses `ProductCuration` component from `modules/catalog/components/`. Menu notification shows `unsorted_products` count.

### Walmart Connector (Catalog Addon, v2)

Walmart marketplace addon lives under catalog: `/api/v2/catalog/walmart/*`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/catalog/walmart/categories` | Walmart taxonomy (cached) |
| POST | `/api/v2/catalog/walmart/categories/refresh` | Force refresh taxonomy cache |
| GET | `/api/v2/catalog/walmart/products` | Vendor's products with Walmart data |
| GET | `/api/v2/catalog/walmart/products/:id` | Single product Walmart data |
| POST | `/api/v2/catalog/walmart/products/:id` | Create/update Walmart listing |
| PUT | `/api/v2/catalog/walmart/products/:id` | Update Walmart listing |
| DELETE | `/api/v2/catalog/walmart/products/:id` | Remove (60-day cooldown) |
| GET | `/api/v2/catalog/walmart/allocations` | Inventory allocations |
| GET | `/api/v2/catalog/walmart/admin/products` | Admin: all vendors (manage_system) |
| POST | `/api/v2/catalog/walmart/admin/products/:id/activate` | Admin: activate for feed |
| POST | `/api/v2/catalog/walmart/admin/products/:id/pause` | Admin: pause listing |
| PUT | `/api/v2/catalog/walmart/admin/products/:id` | Admin: edit title/description/price |

- **Backend:** `api-service/src/modules/catalog/services/walmart.js`, `routesWalmart.js`; mounted at `/walmart` on catalog router.
- **Frontend:** `lib/catalog` exports `fetchWalmartCategories`, `fetchWalmartProducts`, `saveWalmartProduct`, `removeWalmartProduct`, `fetchWalmartAdminProducts`, `activateWalmartProduct`, `pauseWalmartProduct`, `updateWalmartAdminProduct`. Dashboard: Catalog > Addons > Walmart Connector, Walmart Connector Admin; product form WalmartSection uses v2.
- **Legacy:** `/api/walmart` (routes/walmart.js) can be removed after verification; all consumers use v2.

### TikTok Connector (Catalog Addon, v2)

TikTok Shop addon lives under catalog: `/api/v2/catalog/tiktok/*`. Artist/vendor connector page plus admin feed management (parallel to Walmart).

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/catalog/tiktok/oauth/authorize` | Start OAuth (pending approval) |
| GET | `/api/v2/catalog/tiktok/oauth/callback` | OAuth callback (redirect) |
| GET | `/api/v2/catalog/tiktok/shops` | User's TikTok shop connections |
| GET | `/api/v2/catalog/tiktok/products` | Vendor's products with TikTok data |
| POST | `/api/v2/catalog/tiktok/products/:productId` | Create/update TikTok product data + allocation |
| GET | `/api/v2/catalog/tiktok/inventory` | Inventory allocations |
| POST | `/api/v2/catalog/tiktok/inventory/:productId` | Update single allocation |
| POST | `/api/v2/catalog/tiktok/allocations/bulk` | Bulk update allocations |
| GET | `/api/v2/catalog/tiktok/logs` | Sync logs |
| GET | `/api/v2/catalog/tiktok/admin/products` | Admin: all vendors (manage_system) |
| POST | `/api/v2/catalog/tiktok/admin/products/:productId/activate` | Admin: activate for feed |
| POST | `/api/v2/catalog/tiktok/admin/products/:productId/pause` | Admin: pause listing |
| PUT | `/api/v2/catalog/tiktok/admin/products/:productId` | Admin: edit title/description/price |

- **Backend:** `api-service/src/modules/catalog/services/tiktok.js` (includes `adminListProducts`, `adminActivate`, `adminPause`, `adminUpdateProduct`), `routesTiktok.js`; mounted at `/tiktok` on catalog router.
- **Frontend:** `lib/catalog` exports `fetchTikTokShops`, `fetchTikTokProducts`, `saveTikTokProduct`, `tiktokOAuthAuthorize`, `fetchTikTokAllocations`, `saveTikTokAllocation`, `bulkTikTokAllocations`, `fetchTikTokLogs`, `fetchTikTokAdminProducts`, `activateTikTokProduct`, `pauseTikTokProduct`, `updateTikTokAdminProduct`. Dashboard: Catalog > Addons > TikTok Connector (artist/vendor), TikTok Connector Admin (admin-only); product form TikTokSection (local state only).
- **Legacy:** `/api/tiktok` (routes/tiktok.js) can be removed after verification; all consumers use v2.

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

**Phase 5: Cleanup** (Partial) ✅
- [x] Delete old `MyProducts.js`, `AddProduct.js`, `CatalogManager.js`
- [x] Delete old `ManageInventory.js`, `InventoryLog.js`
- [x] Remove old menu items pointing to legacy components
- [x] Articles & Blogs moved to Communications; Promotions moved to Business Center (v2)
- [ ] Delete remaining `manage-my-store/` files (TikTok, Walmart)
- [ ] Delete legacy route files (after migration period)

**Phase 6: Category Management** ✅ Complete
- [x] Extended `category.js` service with full CRUD, content, SEO, products
- [x] Added v2 category routes to `routes.js`
- [x] Added category API functions to `lib/catalog/api.js`
- [x] Created `CategoryManagement.js` component in `modules/catalog/components/`
- [x] Created dashboard page at `/dashboard/catalog/categories`
- [x] Moved "Categories" from System menu to Catalog menu
- [x] Deleted old `components/dashboard/manage-system/components/CategoryManagement.js`
- [x] Deleted old `components/dashboard/manage-system/components/ManageCategories.js`
- [x] Deleted old `components/dashboard/manage-system/components/CategoryChangeLog.js`
- [x] Deleted legacy `/api/categories` route file and removed from server.js

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

## Commerce Module Specification

The Commerce module handles customer orders, vendor sales management, shipping, returns, and **promotions** (vendor coupons and promotion invitations). Promotions were moved from the old **Manage My Store** section to **Business Center > Promotions**; the dashboard uses v2 endpoints (`/api/v2/commerce/coupons/*`, `/api/v2/commerce/promotions/*`). Legacy `vendor/coupons` and `vendor/promotions` routes remain in `api-service/src/routes/vendor.js` for backward compatibility; new dashboard uses v2 only.

### Backend Structure: `api-service/src/modules/commerce/`

```
commerce/
├── index.js              # Module entry point
├── routes.js             # v2 RESTful endpoints (/api/v2/commerce/*)
├── routesCoupons.js      # Vendor coupons & promotions (/api/v2/commerce/coupons/*, /promotions/*)
├── routesWholesale.js    # Wholesale applications (/api/v2/commerce/wholesale/*)
└── services/
    ├── index.js          # Re-exports all services
    ├── orders.js         # Customer order history
    ├── sales.js          # Vendor order management
    ├── shipping.js       # Rates, labels, tracking, shipping hub
    ├── returns.js        # Customer & vendor returns
    └── wholesale.js      # Wholesale application management
```

### Frontend Structure

**API Client (`lib/commerce/`):**
```
commerce/
├── index.js              # Re-exports all functions
└── api.js                # All v2 API calls
```

**Module Components (`modules/commerce/components/`):**
```
commerce/
├── index.js              # Re-exports components
├── MyOrders.js           # Customer order history
├── MySales.js            # Vendor order management
├── MyApplicants.js       # Promoter: manage applications received (re-exported from applications module)
├── ShippingHub.js        # Unified shipping dashboard
├── VendorReturns.js      # Vendor return management
├── ReturnRequestModal.js # Customer return request
├── AdminAllOrders.js     # Admin all orders view
├── AdminReturns.js       # Admin return management (assistance cases, all returns)
├── PromotionsManagement.js # Coupons & promotion invitations (vendor; Business Center > Promotions)
│
├── shipping/             # Shipping Labels sub-module (standalone labels)
│   ├── index.js          # Re-exports shipping components
│   ├── shippingLabelsConfig.js  # ChecklistController config
│   ├── ShippingLabelsSubscription.js  # Gate component using ChecklistController
│   ├── ShippingLabelsDashboard.js     # Main dashboard (creator + library)
│   ├── StandaloneLabelCreator.js      # Form to create labels
│   └── StandaloneLabelLibrary.js      # List of purchased labels
│
└── marketplace/          # Marketplace Subscription sub-module (TODO)
    ├── index.js          # Re-exports marketplace components
    ├── marketplaceConfig.js  # ChecklistController config
    ├── MarketplaceSubscription.js  # Gate component
    ├── MarketplaceApplication.js   # Application form for artists
    └── AdminMarketplace.js         # Admin approval/rejection interface
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/commerce/orders` | Customer order history |
| GET | `/api/v2/commerce/orders/:id` | Single order details |
| GET | `/api/v2/commerce/sales` | Vendor orders (sales) |
| PATCH | `/api/v2/commerce/sales/:itemId/ship` | Update tracking info |
| GET | `/api/v2/commerce/shipping/rates` | Get shipping rates |
| GET | `/api/v2/commerce/shipping/labels` | Vendor's shipping labels |
| POST | `/api/v2/commerce/shipping/labels` | Purchase shipping label |
| POST | `/api/v2/commerce/shipping/labels/:id/cancel` | Cancel label |
| GET | `/api/v2/commerce/shipping/subscription` | Shipping subscription status |
| GET | `/api/v2/commerce/shipping/all-labels` | All labels (order + standalone) |
| GET | `/api/v2/commerce/shipping/stats` | Label statistics |
| GET | `/api/v2/commerce/returns` | Customer return history |
| POST | `/api/v2/commerce/returns` | Create return request |
| GET | `/api/v2/commerce/returns/vendor` | Vendor's returns |
| POST | `/api/v2/commerce/returns/:id/vendor-message` | Add vendor message |
| POST | `/api/v2/commerce/returns/:id/receive` | Mark return received |
| GET | `/api/v2/commerce/coupons/my` | Vendor's coupons |
| POST | `/api/v2/commerce/coupons` | Create coupon |
| PUT | `/api/v2/commerce/coupons/:id` | Update coupon (incl. toggle active) |
| DELETE | `/api/v2/commerce/coupons/:id` | Delete coupon |
| GET | `/api/v2/commerce/coupons/products` | Vendor's products (for coupon scope) |
| GET | `/api/v2/commerce/coupons/:id/analytics` | Coupon usage analytics |
| GET | `/api/v2/commerce/promotions/invitations` | Vendor's promotion invitations |
| POST | `/api/v2/commerce/promotions/invitations/:id/respond` | Accept/reject invitation |
| GET | `/api/v2/commerce/wholesale/applications` | Admin: wholesale applications |
| GET | `/api/v2/commerce/wholesale/applications/:id` | Admin: single application |
| PUT | `/api/v2/commerce/wholesale/applications/:id/approve` | Admin: approve application |
| PUT | `/api/v2/commerce/wholesale/applications/:id/deny` | Admin: deny application |
| GET | `/api/v2/commerce/wholesale/stats` | Admin: application statistics |
| POST | `/api/v2/commerce/wholesale/apply` | Customer: submit application |
| GET | `/api/v2/commerce/wholesale/my-status` | Customer: application status |

### Implementation Status

**Phase 1-4: Complete** ✅
- [x] Backend services and routes
- [x] Frontend API client
- [x] Dashboard components
- [x] Menu integration under "Business Center"

**Phase 5: Cleanup** ✅
- [x] Delete old `ManageOrders.js`
- [x] Delete old `MyOrders.js`
- [x] Update old menu to redirect

**Shipping Labels Sub-module** ✅
- [x] Migrated from subscriptions to `modules/commerce/components/shipping/`
- [x] Added v2 API functions to `lib/commerce/api.js`
- [x] Added backend routes to `api-service/src/modules/commerce/routes.js`
- [x] Created page at `/dashboard/commerce/shipping-labels`
- [x] Menu entry under "Business Center > Shipping"

**Marketplace Sub-module** ✅
- [x] Migrated from subscriptions to `modules/commerce/components/marketplace/`
- [x] `MarketplaceSubscription.js` - gate component with permission check:
  - Has marketplace permission → shows `MarketplaceDashboard` directly
  - No permission → shows application flow via `ChecklistController`
- [x] `MarketplaceDashboard.js` - approved seller dashboard with global styles
- [x] `AdminMarketplace.js` - combined admin interface for Marketplace, Verified, AND Wholesale applications:
  - Top-level tabs: "🏪 Marketplace" | "✓ Verified" | "🏢 Wholesale"
  - Status filter tabs: Pending | Approved | Denied
  - Review modal with applicant info, work description, jury media (marketplace/verified) or business details (wholesale)
  - Approve/Deny actions with permission granting
  - Revoke access functionality
- [x] `marketplaceConfig.js` - configuration for ChecklistController
- [x] Artist page at `/dashboard/commerce/marketplace`
- [x] Admin page at `/dashboard/commerce/marketplace-applications` (handles both types)
- [x] Conditional menu label: "Join the Marketplace" (no permission) / "Marketplace Settings" (has permission)
- [x] Admin menu: "Marketplace Applications" under Business Center
- [x] Uses legacy backend routes:
  - Marketplace: `/api/admin/marketplace/applications/*`
  - Verified: `/api/admin/verified/applications/*`

**Wholesale Applications Sub-module** ✅
- [x] v2 API at `/api/v2/commerce/wholesale/*` (services/wholesale.js, routesWholesale.js)
- [x] Wholesale tab added to AdminMarketplace component (admin review interface)
- [x] Customer application page at `/dashboard/account/wholesale-application`
  - Shows application status (pending/approved/denied)
  - Full business application form using global styles
  - Uses v2 API for submission and status check
- [x] Menu entry: My Account > "Apply for Wholesale" / "Wholesale Status" (conditional label)
- [x] Deleted old `components/dashboard/admin/components/WholesaleApplications.js`
- [x] Old AdminMenu wholesale slide-in removed (redirects to marketplace-applications?type=wholesale)

**Admin all-orders view** ✅
- [x] `GET /api/v2/commerce/admin/orders` (requireRole('admin'))
- [x] `orders.getAllOrders()` in commerce services
- [x] `fetchAdminOrders()` in lib/commerce
- [x] `AdminAllOrders.js` component; page at `/dashboard/commerce/all-orders`
- [x] Menu: Business Center → All Orders (adminOnly); `/dashboard/commerce/admin` redirects to all-orders

---

## Subscriptions Module Specification

The Subscriptions module manages subscription plans (Website, Shipping, Verified, Marketplace) and add-ons.

### Backend Structure

Legacy routes at `api-service/src/routes/subscriptions/` (shipping.js, verified.js, marketplace.js, wholesale.js) remain mounted for backward compatibility. Wholesale applications now have a v2 API at `/api/v2/commerce/wholesale/*` used by the admin interface (AdminMarketplace Wholesale tab) and customer application page.

### Frontend Structure

**API Client (`lib/subscriptions/`):**
```
subscriptions/
├── index.js              # Re-exports all functions
└── api.js                # All subscription API calls:
                          # - getAllSubscriptions()
                          # - getShippingSubscription(), cancelShippingSubscription()
                          # - getVerifiedSubscription(), selectVerifiedTier(), cancelVerifiedSubscription()
                          # - getAvailableAddons(), activateAddon(), deactivateAddon()
```

**Module Components (`modules/subscriptions/components/`):**
```
subscriptions/
├── index.js              # Re-exports components
├── SubscriptionOverview.js  # Main management table (replaces ManageSubscriptions slide-in)
├── SubscriptionCard.js      # Table row component
└── ConnectBalancePreference.js # Payment method preference
```

### Dashboard Pages

| Path | Component | Description |
|------|-----------|-------------|
| `/dashboard/subscriptions` | SubscriptionOverview | Main subscription management |

### Menu Structure

```javascript
{
  id: 'subscriptions',
  label: 'Subscriptions',
  href: '/dashboard/subscriptions',
  icon: 'fa-credit-card',
  userTypes: ['admin', 'artist', 'promoter'],
  items: [
    { label: 'Manage', href: '/dashboard/subscriptions' },
  ]
}
```

### Implementation Status

**Phase 1: Frontend Module** ✅ Complete
- [x] Create `lib/subscriptions/api.js` — getShippingSubscription, updateShippingPreferences
- [x] Create `lib/subscriptions/index.js` — re-exports api.js
- [x] Create `modules/subscriptions/components/SubscriptionOverview.js` — unified subscriptions + addons table
- [x] Create `modules/subscriptions/components/SubscriptionCard.js` — table row component
- [x] Create `modules/subscriptions/components/ConnectBalancePreference.js` — Connect balance toggle
- [x] Create `/dashboard/subscriptions` page with SubscriptionOverview

**Phase 2: Migrate from Slide-ins** ✅ Complete
- [x] ManageSubscriptions → `/dashboard/subscriptions` (SubscriptionOverview)
- [x] Remove MySubscriptionsMenu from old sidebar
- [x] Shipping Labels → moved to Commerce module (`/dashboard/commerce/shipping-labels`)
- [x] Marketplace → moved to Commerce module (`/dashboard/commerce/marketplace`)
- [ ] Verified Artist still uses slide-in (page wrapper at `/dashboard/subscriptions/verified`)

**Phase 3: Cleanup** ✅ Complete
- [x] Delete `MySubscriptionsMenu.js`
- [x] Delete `ManageSubscriptions.js` (replaced by SubscriptionOverview)
- [x] Delete `WebsitesSubscription.js` (websites use v2 gate)
- [x] Shipping Labels migrated to `modules/commerce/components/shipping/` sub-module
- [x] Marketplace migrated to `modules/commerce/components/marketplace/` sub-module
- [ ] Migrate Verified Artist subscription to dedicated page

---

## Finances Module Specification

The Finances module handles vendor financial data including balance, transactions, payouts, earnings metrics, commission management, and admin refund processing.

### Backend Structure: `api-service/src/modules/finances/`

```
finances/
├── index.js              # Module entry point
├── routes.js             # v2 RESTful endpoints (/api/v2/finances/*)
├── routesRefunds.js      # Admin payment/refund routes (/api/v2/finances/admin/*)
└── services/
    ├── index.js          # Balance, transactions, payouts, earnings, commissions
    └── refunds.js        # Admin payment listing and refund processing
```

### Frontend Structure

**API Client (`lib/finances/`):**
```
finances/
├── index.js              # Re-exports all functions
└── api.js                # fetchBalance, fetchTransactions, fetchPayouts, fetchEarnings,
                          # fetchCommissionRates, createCommissionRate, updateCommissionRate,
                          # fetchAdminPayments, processAdminRefund, fetchAdminRefunds
```

**Module Components (`modules/finances/components/`):**
```
finances/
├── index.js              # Re-exports components
├── PayoutsEarnings.js    # Balance overview, earnings, payout history
├── TransactionHistory.js # Filterable transaction table
└── AdminRefunds.js       # Admin payment listing and refund processing (all payment types)
```

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/finances/balance` | Current balance & financial overview |
| GET | `/api/v2/finances/earnings` | This month's earnings metrics |
| GET | `/api/v2/finances/transactions` | Transaction history with filters |
| GET | `/api/v2/finances/payouts` | Payout history |
| GET | `/api/v2/finances/commission-rates` | Admin: List all commission rates |
| POST | `/api/v2/finances/commission-rates` | Admin: Create commission rate |
| PUT | `/api/v2/finances/commission-rates/:id` | Admin: Update commission rate |
| PUT | `/api/v2/finances/commission-rates/bulk` | Admin: Bulk update commission rates |
| GET | `/api/v2/finances/admin/payments` | Admin: List all payments (90 days, filterable) |
| GET | `/api/v2/finances/admin/payments/:type/:id` | Admin: Get payment details |
| POST | `/api/v2/finances/admin/payments/:type/:id/refund` | Admin: Process refund |
| GET | `/api/v2/finances/admin/refunds` | Admin: List processed refunds |

### Dashboard Pages

| Page | Path | Description |
|------|------|-------------|
| Admin Refunds | `/dashboard/service/refunds` | Unified refund interface for all payment types |

### Admin Refunds Feature

The Admin Refunds system provides a unified interface for processing refunds across all payment types:

**Payment Types Supported:**
- **Checkout** (orders): Product purchases
- **App Fee**: Event application fees
- **Booth Fee**: Event booth payments
- **Subscription**: Subscription charges

**Features:**
- Lists all payments from last 90 days (configurable to 30/60/90/180/365 days)
- Filter by payment type
- Search by customer name, email, or payment ID
- Shows original amount, already refunded, and eligible refund balance
- Partial refunds supported (validates against eligible amount)
- Two tabs: "Eligible Payments" and "Refunds Processed"
- Refund history with stats (total refunds, total amount in last 90 days)

**Database:**
- New `stripe_refunds` table tracks all refunds centrally
- Migration at `database/migrations/add_stripe_refunds_table.sql`

### Implementation Status

**Phase 1-4: Complete** ✅
- [x] Backend services and routes
- [x] Frontend API client
- [x] Dashboard components
- [x] Menu integration under "Business Center > Payouts & Earnings / Transactions"

**Phase 5: Cleanup** ✅
- [x] Delete old `MyFinancesMenu.js`
- [x] Delete old `PayoutsEarnings.js`
- [x] Delete old `TransactionHistory.js`
- [x] Delete `components/dashboard/my-finances/` directory

**Phase 6: Admin Refunds** ✅
- [x] Backend services for payment listing across all types
- [x] Backend routes for admin refund processing
- [x] `stripe_refunds` table migration for centralized refund tracking
- [x] AdminRefunds component with two tabs
- [x] Dashboard page at `/dashboard/service/refunds`
- [x] Menu entry under Service > Refunds
- [x] Old ApplicationRefunds component deleted

---

## Communications Module Specification

The Communications module handles support tickets for both users and admins.

### Backend Structure: `api-service/src/modules/communications/`

```
communications/
├── index.js              # Module entry point
├── routes.js             # v2 RESTful endpoints (/api/v2/communications/*)
└── services/
    ├── index.js          # Re-exports all services
    └── tickets.js        # User & admin ticket management
```

### Frontend Structure

**API Client (`lib/communications/`):**
```
communications/
├── index.js              # Re-exports all functions
└── api.js                # User ticket functions + admin functions
```

**Module Components (`modules/communications/components/`):**
```
communications/
├── index.js              # Re-exports components
├── MyTickets.js          # User's ticket list with filters
├── TicketDetail.js       # Single ticket view with messaging
└── AdminTickets.js       # Admin ticket management
```

### API Endpoints

**User Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/communications/tickets` | User's tickets |
| GET | `/api/v2/communications/tickets/notifications` | Notification counts |
| POST | `/api/v2/communications/tickets` | Create ticket |
| GET | `/api/v2/communications/tickets/:id` | Single ticket with messages |
| POST | `/api/v2/communications/tickets/:id/messages` | Add message |
| POST | `/api/v2/communications/tickets/:id/close` | Close ticket |

**Admin Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/communications/admin/tickets` | All tickets with filters |
| GET | `/api/v2/communications/admin/tickets/:id` | Ticket with internal notes |
| POST | `/api/v2/communications/admin/tickets/:id/messages` | Admin reply/note |
| PATCH | `/api/v2/communications/admin/tickets/:id` | Update status/priority |

### Dashboard Pages

| Path | Component | Description |
|------|-----------|-------------|
| `/dashboard/communications/tickets` | MyTickets | User's ticket list |
| `/dashboard/communications/tickets/[id]` | TicketDetail | Single ticket view |
| `/dashboard/communications/admin` | AdminTickets | Admin management |

### Menu Structure

```javascript
{
  id: 'communications',
  label: 'Communications',
  href: '/dashboard/communications',
  items: [
    { label: 'Help Center', href: 'https://staging.brakebee.com/help', external: true },
    { label: 'My Tickets', href: '/dashboard/communications/tickets' },
    { label: 'All Tickets', href: '/dashboard/communications/admin', adminOnly: true },
    { label: 'Articles & Blogs', href: '/dashboard/communications/articles', permission: 'sites' },
  ]
}
```

### Implementation Status

**Phase 1-4: Complete** ✅
- [x] Backend services and routes
- [x] Frontend API client
- [x] Dashboard components (MyTickets, TicketDetail, AdminTickets)
- [x] Dashboard pages
- [x] Menu integration with external Help Center link

**Phase 5: Cleanup** ✅
- [x] Delete old `MyAccountMenu.js`
- [x] Delete `components/dashboard/my-account/` directory
- [x] Update old admin SupportTickets slidein to redirect

---

## System Module Specification

The System module handles site-wide administrative functions including homepage management and system settings.

### Backend Structure: `api-service/src/modules/system/`

```
system/
├── index.js              # Module entry point
├── routes.js             # v2 RESTful endpoints (/api/v2/system/*)
└── services/
    ├── index.js          # Re-exports all services
    ├── hero.js           # Hero settings (text, videos, CTA)
    └── announcements.js  # Site announcements management
```

### Frontend Structure

**API Client (`lib/system/`):**
```
system/
├── index.js              # Re-exports all functions
└── api.js                # Hero + Announcements API functions
```

**Module Components (`modules/system/components/`):**
```
system/
├── index.js                    # Re-exports all components
└── components/
    ├── index.js                # Re-exports components
    └── homepage/
        ├── index.js            # Re-exports homepage components
        ├── Homepage.js         # Combined tabbed interface
        ├── HeroSettings.js     # Homepage hero management
        └── Announcements.js    # Site announcements management
```

### API Endpoints (v2)

**Hero Settings:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/system/hero` | Get hero configuration |
| PUT | `/api/v2/system/hero` | Save hero text and video config |
| POST | `/api/v2/system/hero/videos` | Upload hero videos |
| DELETE | `/api/v2/system/hero/videos/:videoId` | Delete a hero video |

**Announcements:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/system/announcements` | List all announcements (admin) |
| POST | `/api/v2/system/announcements` | Create announcement |
| PUT | `/api/v2/system/announcements/:id` | Update announcement |
| DELETE | `/api/v2/system/announcements/:id` | Delete announcement |
| GET | `/api/v2/system/announcements/:id/stats` | Announcement statistics |
| GET | `/api/v2/system/announcements/pending` | User's pending announcements |
| GET | `/api/v2/system/announcements/check-pending` | Check pending status |
| POST | `/api/v2/system/announcements/:id/acknowledge` | Acknowledge announcement |
| POST | `/api/v2/system/announcements/:id/remind-later` | Set reminder |
| GET | `/api/v2/system/terms` | List all terms versions |
| GET | `/api/v2/system/terms/stats` | Terms statistics |
| GET | `/api/v2/system/terms/:id` | Get single terms version |
| POST | `/api/v2/system/terms` | Create terms version |
| PUT | `/api/v2/system/terms/:id` | Update terms version |
| PUT | `/api/v2/system/terms/:id/set-current` | Set terms as current |
| DELETE | `/api/v2/system/terms/:id` | Delete terms version |

### Dashboard Pages

| Path | Component | Description |
|------|-----------|-------------|
| `/dashboard/system/homepage` | Homepage | Combined hero & announcements management |
| `/dashboard/system/email` | EmailCore | Email templates, logs, queue, bounces |
| `/dashboard/system/terms` | TermsCore | Terms & conditions version management |

### Menu Structure

```javascript
{
  id: 'service',
  label: 'Service',
  href: '/dashboard/service',
  icon: 'fa-cog',
  adminOnly: true,
  items: [
    { label: 'Homepage', href: '/dashboard/service/homepage', adminOnly: true },
    { label: 'Admin Event Review', href: '/dashboard/service/event-reviews', adminOnly: true },
  ]
}
```

### Implementation Status

**Phase 1: Backend v2 Module** ✅
- [x] Backend module structure (`api-service/src/modules/system/`)
- [x] Hero service with file-based storage
- [x] Announcements service with database operations
- [x] v2 routes registered at `/api/v2/system/*`
- [x] CSRF protection applied

**Phase 2: Frontend v2 Integration** ✅
- [x] Frontend API client (`lib/system/api.js`)
- [x] HeroSettings component using v2 API
- [x] Announcements component using v2 API
- [x] Combined Homepage tabbed interface
- [x] Service > Homepage menu entry
- [x] Removed duplicate Announcements entry from System menu

**Phase 3: Terms & Conditions** ✅
- [x] Backend service (`api-service/src/modules/system/services/terms.js`)
- [x] v2 routes at `/api/v2/system/terms/*`
- [x] Frontend API client (`lib/system/api.js`)
- [x] TermsCore component (`modules/system/components/terms/`)
- [x] Dashboard page at `/dashboard/system/terms`
- [x] Menu integration under "System"
- [x] Old ManageTermsCore deleted

**Phase 4: Future System Components** ⏳
- [ ] Categories management (move from manage-system)

*Note: Maintenance Mode was removed from staging (not needed for staging workflow).*

---

## Email Module Specification

The Email module provides admin-only email system management including template editing, email history/logs, send previews, resend capability, queue management, and bounce tracking.

### Backend Structure: `api-service/src/modules/email/`

```
email/
├── index.js              # Module entry point
├── routes.js             # v2 RESTful endpoints (/api/v2/email/*)
└── services/
    ├── index.js          # Re-exports all services
    ├── templates.js      # Template CRUD, stats
    └── logs.js           # Email logs, stats, recent activity
```

### Frontend Structure

**API Client (`lib/email/`):**
```
email/
├── index.js              # Re-exports all functions
└── api.js                # Templates, logs, send preview, resend, queue, bounces
```

**Module Components (`modules/system/components/email/`):**
```
email/
├── index.js              # Module exports
├── EmailCore.js          # Main tabbed interface
├── OverviewTab.js        # Stats, queue status, recent activity
├── TemplatesTab.js       # Template list, edit (HTML), send preview
├── LogsTab.js            # Searchable history, filter, pagination, resend
├── QueueTab.js           # Queue stats, manual processing
└── BouncesTab.js         # Bounce data, unblacklist domains
```

### Database Tables

**`email_templates`:**
- `id`, `template_key`, `name`, `priority_level`, `can_compile`
- `is_transactional`, `subject_template`, `body_template`, `layout_key`, `created_at`

**`email_log`:**
- `id`, `user_id`, `email_address`, `template_id`, `subject`
- `sent_at`, `status` (sent/failed/bounced), `attempt_count`, `error_message`, `smtp_response`

**`email_queue`:**
- Queue entries for scheduled/delayed email sending

**`email_tracking`:**
- Bounce tracking, hard/soft bounces, blacklist status

### v2 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/email/stats` | System statistics |
| GET | `/api/v2/email/recent` | Recent email activity |
| GET | `/api/v2/email/templates` | List all templates |
| GET | `/api/v2/email/templates/:id` | Get template with stats |
| PUT | `/api/v2/email/templates/:id` | Update template |
| POST | `/api/v2/email/templates` | Create template |
| DELETE | `/api/v2/email/templates/:id` | Delete template |
| GET | `/api/v2/email/layouts` | Available layouts |
| GET | `/api/v2/email/logs` | Searchable logs (paginated) |
| GET | `/api/v2/email/logs/:id` | Single log entry |
| POST | `/api/v2/email/send-preview` | Send preview email |
| POST | `/api/v2/email/resend/:id` | Resend logged email |
| POST | `/api/v2/email/test` | Send test with template key |
| GET | `/api/v2/email/queue` | Queue status |
| POST | `/api/v2/email/queue/process` | Process queue manually |
| GET | `/api/v2/email/bounces` | Bounce data |
| POST | `/api/v2/email/bounces/unblacklist` | Remove domain from blacklist |

### Dashboard Integration

**Menu Location:** System > Email Management

**Page Route:** `/dashboard/system/email`

### Legacy Routes

- `/emails/preferences` - User email preferences (stays - different concern)
- Old `ManageEmailCore` slide-in redirects to new page

### Implementation Status

**Phase 1: Backend v2 Module** ✅
- [x] Backend module structure (`api-service/src/modules/email/`)
- [x] Templates service (CRUD, stats)
- [x] Logs service (paginated, search, filters)
- [x] v2 routes registered at `/api/v2/email/*`
- [x] CSRF protection applied

**Phase 2: Frontend v2 Integration** ✅
- [x] Frontend API client (`lib/email/api.js`)
- [x] EmailCore tabbed interface
- [x] OverviewTab with stats
- [x] TemplatesTab with editing and preview
- [x] LogsTab with search, filter, pagination, resend
- [x] QueueTab and BouncesTab

**Phase 3: Menu & Cleanup** ✅
- [x] Menu integration under "System"
- [x] Dashboard page at `/dashboard/system/email`
- [x] Old slide-in redirects to new page

---

## Marketing Module Specification

The Marketing module handles user-submitted promotional content. Users can upload images and videos that may be used for marketing purposes, and admins can review and manage all submissions.

### Backend Structure: `api-service/src/modules/marketing/`

```
marketing/
├── routes.js             # v2 RESTful endpoints (/api/v2/marketing/*)
└── services/
    └── content.js        # Submission management, media handling
```

### Frontend Structure

**API Client (`lib/marketing/`):**
```
marketing/
├── index.js              # Re-exports all functions
└── api.js                # All v2 API calls
```

**Module Components (`modules/marketing/components/`):**
```
marketing/
├── index.js              # Module exports
├── ShareContent.js       # User submission form + history
├── AdminMediaLibrary.js  # Admin review interface
└── AdminPromotions.js    # Admin promotions, site-wide sales, coupons (admin only)
```

### Database Tables

**`marketing_content_submissions`:**
- `id`, `user_id`, `email`, `first_name`, `last_name`, `business_name`
- `ip_address`, `description`, `consent_given`, `admin_notes`
- `status` (pending/reviewed/approved/rejected), `created_at`, `updated_at`

**`marketing_content_media`:**
- `id`, `submission_id`, `image_path`, `original_filename`
- `media_type` (image/video), `mime_type`, `file_size`, `created_at`

### v2 API Endpoints

**User Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/marketing/user-info` | Get user info for form prefill |
| POST | `/api/v2/marketing/submit` | Submit content (up to 5 files) |
| GET | `/api/v2/marketing/my-submissions` | User's submission history |

**Admin Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/marketing/admin/submissions` | All submissions with filters |
| GET | `/api/v2/marketing/admin/submissions/:id` | Single submission details |
| PUT | `/api/v2/marketing/admin/submissions/:id/notes` | Update in-house notes |
| PUT | `/api/v2/marketing/admin/submissions/:id/status` | Update status |
| DELETE | `/api/v2/marketing/admin/submissions/:id` | Delete submission |

### Dashboard Pages

- **Marketing > Share Content** (`/dashboard/marketing/share-content`) - All users
  - Read-only user info (email, name, business name if artist/promoter)
  - File upload (up to 5 images/videos per submission)
  - Description textarea
  - Required consent checkbox (pre-checked)
  - User's previous submissions displayed below

- **Marketing > User Media Library** (`/dashboard/marketing/media-library`) - Admin only
  - All submissions with thumbnails
  - Preview and download buttons
  - Editable in-house notes per submission
  - Status management (pending → reviewed → approved/rejected)
  - Delete functionality

### Menu Configuration

```javascript
{
  id: 'marketing',
  label: 'Marketing',
  href: '/dashboard/marketing',
  icon: 'fa-bullhorn',
  items: [
    { label: 'Share Content', href: '/dashboard/marketing/share-content' },
    { label: 'User Media Library', href: '/dashboard/marketing/media-library', adminOnly: true },
    { label: 'Promotions', href: '/dashboard/marketing/promotions', permissions: ['vendor', 'sites'] },
    { label: 'Admin Promotions', href: '/dashboard/marketing/admin-promotions', adminOnly: true },
  ]
}
```

### Implementation Status

**Phase 1: Database** ✅
- [x] Migration file (`database/migrations/002_marketing_content.sql`)
- [x] Tables created: `marketing_content_submissions`, `marketing_content_media`

**Phase 2: Backend v2 Module** ✅
- [x] Routes registered at `/api/v2/marketing/*`
- [x] Content service with CRUD operations
- [x] Multer config updated for marketing uploads (`/temp_images/marketing/`)
- [x] Images registered in `pending_images` for processing
- [x] CSRF protection applied

**Phase 3: Frontend v2 Integration** ✅
- [x] Frontend API client (`lib/marketing/api.js`)
- [x] ShareContent component (user submission form)
- [x] AdminMediaLibrary component (admin review)
- [x] Dashboard pages created
- [x] Menu entries added

**Phase 4: Promotions Migration** ✅
- [x] Migrated Admin Promotions from old AdminMenu slide-in to Marketing module
- [x] Created `AdminPromotions.js` component (collaborative promotions, site-wide sales, admin coupons)
- [x] Created dashboard page at `/dashboard/marketing/admin-promotions` (admin-only)
- [x] Migrated vendor Promotions (coupons, promotion invitations) from Business Center to Marketing
- [x] Created dashboard page at `/dashboard/marketing/promotions`
- [x] Deleted old `components/dashboard/admin/components/AdminPromotions.js`
- [x] Menu entries: Marketing > Promotions (vendors), Marketing > Admin Promotions (admin)
- [x] Admin Promotions uses legacy `/api/admin/*` endpoints (backend v2 migration TBD)

---

## Content Module (Articles & Blogs)

Articles and help content are served by the **content** module. The dashboard entry is **Communications > Articles & Blogs** (sites permission).

### Backend

- **Module:** `api-service/src/modules/content/` — mounts legacy `routes/articles.js` at `/api/v2/content/articles/*`.
- **List behavior:** Authenticated non-admin users see only their own articles (scope=mine). Admins see all articles by default; optional `?scope=mine` to filter to own. Unauthenticated list returns published only.

### Frontend

- **API client:** `lib/content/api.js` — fetchArticles, createArticle, updateArticle, deleteArticle, fetchTopics, fetchTags, fetchSeries, uploadArticleImages (all v2).
- **Dashboard:** `pages/dashboard/communications/articles/index.js` → `modules/communications/components/articles/ArticlesManagement.js` (global styles, v2 API).
- **Removed:** Old Manage My Store > Articles & Pages and Admin > Articles & Pages slide-ins; `MyArticles.js`, `ManageArticles.js`, `pages/articles/components/ArticleManagement.js` deleted. The entire **Manage My Store** sidebar section has been removed from the old dashboard; `ManageMyStoreMenu.js` deleted. All former items live in the new sidebar: Articles & Blogs (Communications), Promotions (Business Center), My Sales (Business Center).

### Websites Dashboard (New Menu)

Website management is available under **Dashboard > Websites** (sites permission). The list from the old subscription flow is now a card-based **My Sites** at `/dashboard/websites/mine` with **Visit**, **Manage**, **Deactivate**; **Activate** is on the manage page only. **Payment Settings** at `/dashboard/websites/payments` uses `StripeCardSetup` (stays in `components/stripe/`). **Add Site** at `/dashboard/websites/new`. Manage page tabs: Site Settings, Custom Domain, Customize, Templates, Addons — implemented by **CustomDomainSection** and **SiteCustomizer**, which were **moved** from `components/dashboard/my-subscriptions/components/website-components/` into `modules/websites/components/`. **Old sections removed:** the large `WebsitesDashboard.js` (subscriptions/dashboards) was deleted; post-checklist success now uses thin `WebsitesDashboardSuccess.js` (link to My Sites). Old `CustomDomainSection.js` and `SiteCustomizer.js` under website-components were deleted.

**Subscription gate (tier/terms/card):** All website menu pages (My Sites, Payment Settings, Add Site, Manage site) are wrapped in **WebsitesSubscriptionGate**. If the user has not completed the website subscription (tier selected, terms accepted, card on file), the gate shows the same tier/terms/card flow in place (ChecklistController with shared config from `websitesSubscriptionConfig.js`). If complete, the requested page is shown. Built once: shared config (`getWebsitesSubscriptionConfig`, `websitesSubscriptionTiers`) is used by the slide-in **WebsitesSubscription** and by **WebsitesSubscriptionGate** on every website page. Gate and ChecklistController use v2 subscription endpoints when `config.subscriptionApiBase` is set (`api/v2/websites/subscription/my`, select-tier, terms-check, terms-accept). **Tiers UI:** **PricingTiers** lives in `modules/websites/components/PricingTiers.js`; uses `websitesSubscriptionTiers` and v2 selectWebsitesTier; optional addon selection; "Continue" saves tier and triggers parent/onSubscriptionSuccess so the gate shows terms and card steps.

### Websites Implementation Status

**Phase 5: Complete** ✅ — Legacy routes disabled, all consumers use v2.

**Backend v2 module** (`api-service/src/modules/websites/`) at `/api/v2/websites`:
- **Sites:** CRUD, customizations, templates, addons, user categories, discounts, enforce-limits
- **Subscription:** status, select-tier, terms-check, terms-accept, change-tier, cancel
- **Domains:** status, check-availability, start-validation, retry, cancel, remove, admin-list
- **Public resolve:** subdomain, custom-domain, products, articles, categories (no auth)

**Frontend API client** (`lib/websites/api.js`) — All functions use v2:
- Sites: fetchMySites, createSite, updateSite, deleteSite, fetchSiteCustomizations, updateSiteCustomizations
- Templates: fetchTemplates, fetchTemplate, applyTemplate, createTemplate
- Addons: fetchAddons, fetchMySiteAddons, enableSiteAddon, disableSiteAddon, enableUserAddon, disableUserAddon
- Categories: fetchUserCategories, createUserCategory, updateUserCategory, deleteUserCategory
- Discounts: calculateDiscounts, createDiscount, deleteDiscount
- Domains: fetchDomainStatus, checkDomainAvailability, startDomainValidation, retryDomainValidation, cancelDomainValidation, removeCustomDomain, fetchAllDomains
- Subscription: fetchWebsitesSubscription, fetchWebsitesSubscriptionStatus, selectWebsitesTier, fetchWebsitesTermsCheck, acceptWebsitesTerms, changeWebsitesTier, cancelWebsitesSubscription
- Public: resolveSubdomain, resolveSubdomainProducts, resolveSubdomainArticles, resolveSubdomainCategories, checkSubdomainAvailability, resolveCustomDomain, fetchSiteAddonsPublic

**Legacy routes disabled** (commented out in `server.js`):
- `/api/sites` — use `/api/v2/websites/sites/*`
- `/api/domains` — use `/api/v2/websites/domains/*`
- `/api/subscriptions/websites` — deleted, use `/api/v2/websites/subscription/*`

**Files safe to delete:**
- `api-service/src/routes/sites.js`
- `api-service/src/routes/domains.js`
- `api-service/src/routes/subscriptions/websites.js` (already deleted)

---

## Events Dashboard (Current State)

Events dashboard is migrated to the new sidebar and page-based layout. Backend uses v2 where available; some pages still call legacy APIs (e.g. custom events, applications list for "Events I Own").

### Menu and pages

| Menu item | Path | Audience | Component / behavior |
|-----------|------|----------|----------------------|
| My Events | `/dashboard/events/mine` | All (events-capable) | **MyEvents**: promoters = events they created; artists = calendar (applied + custom events). Replaces old My Calendar. |
| Events I Own | `/dashboard/events/own` | Promoters, admin | Legacy **EventsIOwn**: current (draft+active) vs archived tabs, review links, edit/view/delete. |
| My Applications | `/dashboard/events/applications` | Artists, admin | **MyApplications** (module). |
| Find New | `/dashboard/events/find` | Artists, admin | **FindEvents**: browse/search/sort future events, application status. |
| Jury Packets | `/dashboard/events/jury-packets` | Artists, admin | **JuryPackets** (module): card-based CRUD, v2 API. |
| Create Event | `/dashboard/events/new` | Promoters, admin | Event form (module event-form). |
| All Events | `/dashboard/events/admin` | Admin only | **AdminEvents**. |
| Solicit Promoter | `/dashboard/events/solicit-promoter` | Admin only | Create draft promoter + event, send claim email; promoter claims via `/promoters/claim/[token]`. Uses **AddPromoter** and `POST /api/admin/promoters/create`. (Previously under Manage System > Add Promoter; moved to Events.) |

### Application components (migrated)

Event-application UI has been moved from `components/applications/` into the Events module:

| Component | Location | API |
|-----------|----------|-----|
| **ApplicationPaymentModal** | `modules/events/components/application-form/ApplicationPaymentModal.js` | `lib/applications/api.js`: createApplicationPaymentIntent, confirmApplicationPayment (legacy). |
| **ApplicationStatus** | `modules/events/components/ApplicationStatus.js` + `ApplicationStatus.module.css` | `lib/applications/api.js`: fetchMyApplications (v2), filter by eventId/persona_id client-side. |

- **EventReviews** (public event page) and **EventsCarousel** (homepage) are in the events module; see Frontend layout below.
- `components/applications/` has been removed.

### Frontend layout

- **Pages:** `pages/dashboard/events/` — `index.js` (redirect), `mine/`, `own/`, `applications/`, `find/`, `jury-packets/`, `new.js`, `admin/`.
- **Module components:** `modules/events/components/` — MyEvents, FindEvents, MyApplications, JuryPackets, AdminEvents, event-form (create/edit), **application-form** (accordion + ApplicationPaymentModal), **ApplicationStatus**, **EventReviews**, **EventsCarousel**.
- **Public event page** (`pages/events/[id].js`): Uses ApplicationForm, ApplicationStatus, EventReviews from the events module; lib fetchMyApplications, getEventApplicationStats, updateApplication. Event data still from legacy `api/events/:id` (and images/categories/artists).
- **Homepage** (`pages/index.js`): Uses **EventsCarousel** from the events module; upcoming events from v2 `api/v2/events/upcoming`.
- **Events I Own:** Page at `/dashboard/events/own` uses `EventsIOwn.js`; now v2 (fetchMyEvents, archiveEvent). Create/edit uses module EventForm at `/dashboard/events/new`.
- **Lib:** `lib/events/api.js` — fetchMyEvents (v2 mine), fetchJuryPackets / fetchJuryPacket / createJuryPacket / updateJuryPacket / deleteJuryPacket / uploadJuryPacketFiles (v2 jury-packets + legacy upload), fetchApplicationFields / fetchAvailableAddons (v2), fetchCustomEvents / createCustomEvent / updateCustomEvent / deleteCustomEvent (v2 custom), fetchBrowseEvents (upcoming, legacy). `lib/applications/api.js` — fetchMyApplications (v2), getEventApplicationStats / applyToEvent / applyWithPacket / addAddonRequest / createApplicationPaymentIntent / confirmApplicationPayment / updateApplication (legacy apply/payment/update).
- **Event application form:** Used on `pages/events/[id].js`. Accordion + ApplicationPaymentModal; ApplicationStatus on same page. Uses v2 for jury packets, application fields, available add-ons; legacy for apply/apply-with-packet and jury-packets/upload.

### Redirects (old dashboard slide-ins)

- `my-calendar` → `/dashboard/events/mine`
- `find-new` → `/dashboard/events/find`
- `events-i-own` → `/dashboard/events/own`
- `manage-jury-packets` → `/dashboard/events/jury-packets`
- `applications-received` → `/dashboard/commerce/applicants` (Business Center > My Applicants)

### Frontend shared module (UI)

- **`modules/shared/`** — Reusable UI used across dashboard and public pages.
- **BlockEditor** — `modules/shared/block-editor/` (BlockEditor.js, BlockEditor.module.css). Editor.js-based rich content editor; used by ArticlesManagement (communications/articles), ManageAnnouncements, ManageTermsCore.
- **AccordionSection** — `modules/shared/AccordionSection.js`. Collapsible form sections; used by ProductForm, EventForm, ApplicationForm, ProfileForm.
- **Artist display components** — Used on homepage, product pages, profile pages:
  - `ArtistCarousel.js` — Infinite scroll carousel of featured artists (homepage). Uses v2 API (`getPublicArtists` from `lib/users`), styles from `carousels.css`.
  - `AboutTheArtist.js` — Artist info card on product pages. Uses v2 API (`getPublicProfile` from `lib/users`).
  - `ProfileDisplay.js` — Public profile view (profile pages).
  - `SocialLinks.js` — Social media icon links (used by AboutTheArtist, ProfileDisplay).

### Events API: legacy vs v2 (removal track)

**We have not yet done the full RESTful v2 coverage needed to remove the old events routes.** Current state:

| Capability | Legacy route | v2 route | Frontend / consumers |
|------------|-------------|----------|----------------------|
| Event types | `GET /api/events/types` | `GET /api/v2/events/types` ✅ | Module EventForm (dashboard/events/new) uses v2. |
| Promoter's events (all) | `GET /api/events/mine` | `GET /api/v2/events/mine` ✅ | fetchMyEvents uses v2. |
| Promoter's events (filtered) | `GET /api/events?promoter_id=&event_status=...` | Client filter on v2 `/mine` ✅ | EventsIOwn uses fetchMyEvents + client filter; archiveEvent for delete. |
| Upcoming (public list) | `GET /api/events/upcoming` | `GET /api/v2/events/upcoming` ✅ | FindEvents, homepage, EventsCarousel, events index, sitemap use v2. |
| Single event | `GET /api/events/:id` | `GET /api/v2/events/:id` ✅ | events/[id] uses fetchEvent; ManageEvents still legacy. |
| Event categories/artists | `GET /api/events/:id/categories`, `/:id/artists` | `GET /api/v2/events/:id/categories`, `/:id/artists` ✅ | Public event page uses fetchEventCategories, fetchEventArtists. |
| Create/update/archive | POST/PATCH/PUT/DELETE | v2 has POST, PATCH, DELETE ✅ | /dashboard/events/new uses module EventForm (v2); EventsIOwn uses archiveEvent (v2). |
| Artist custom events | `GET /api/events/my-events`, POST/PUT/DELETE `/custom` | `GET /api/v2/events/custom`, POST/PUT/DELETE `/api/v2/events/custom/:id` ✅ | lib/events fetchCustomEvents, createCustomEvent, updateCustomEvent, deleteCustomEvent use v2. Claim flow (verify, claim/new, claim/link) uses v2. |
| Application fields, add-ons, images, upload | Legacy paths | v2 has application-fields, available-addons, images, upload ✅ | Event application form (module) uses v2. Many other consumers still call legacy. |
| Jury packets (list/create/get/update/delete) | `GET/POST/PUT/DELETE /api/jury-packets` | `GET/POST /api/v2/events/jury-packets`, `GET/PUT/DELETE /api/v2/events/jury-packets/:id` ✅ | JuryPackets dashboard + application form use v2. |
| Jury packet file upload | `POST /api/jury-packets/upload` | **Missing** (legacy only) | application-form uses legacy upload for application field images/videos. |
| Tickets (list + purchase) | `GET /api/events/:id/tickets`, `POST .../tickets/:ticketId/purchase` | `GET /api/v2/events/:id/tickets`, `POST .../tickets/:ticketId/purchase` ✅ | TicketPurchaseModal uses fetchEventTickets, purchaseEventTicket (v2). |
| Artist applications (public) | `GET /api/events/artist/:id/applications` | `GET /api/v2/events/artist/:id/applications` ✅ | ProfileDisplay uses fetchArtistEventApplications (v2). |

**To remove old routes, add in v2 and migrate consumers:**

1. **List with filters** — e.g. `GET /api/v2/events?promoter_id=&event_status=` (or extend `/mine` with `?status=`) and switch EventsIOwn, MyApplicants (Business Center), ManageEvents to v2.
2. **Upcoming** — e.g. `GET /api/v2/events/upcoming` and switch lib/events fetchBrowseEvents and all other callers to v2.
3. **Artist custom events** — e.g. `GET /api/v2/events/custom`, `POST/PUT/DELETE /api/v2/events/custom` (or `/my-custom`) and switch lib/events to v2.
4. **Single event / types / CRUD / sub-resources** — Migrate remaining callers (events/[id], events/new, EventFormContext, ManageEvents) to v2 so legacy GET/POST/PATCH/DELETE and related paths can be removed.
5. **Tickets and claim flow** — Add v2 endpoints and migrate, or leave on legacy until a dedicated pass.

**Legacy events API:** **Removed.** The legacy `api/events` route and `api-service/src/routes/events.js` have been deleted. All consumers use v2 (`/api/v2/events`) or the applications API where appropriate.

**Migrated (no longer use legacy events):**

| Consumer | Now uses |
|----------|----------|
| **articles/[slug].js** | `fetchEvent(connection_id)` (v2) for event cross-references |
| **PaymentDashboard** | `api/applications/payment-dashboard/:eventId` (applications API; payment summary is per-event but lives under applications) |
| **TicketPurchaseModal** | `fetchEventTickets`, `purchaseEventTicket` (v2) |

**All event consumers use v2 or applications:** Public event page, EventsIOwn, create/edit (EventForm), upcoming/carousel/sitemap, claim flow, custom events CRUD, My Applicants, ProfileDisplay, AdminEvents, Admin Event Review, TicketPurchaseModal, articles/[slug], SearchResults, SearchModal (fetchEvent). PaymentDashboard uses applications API. Legacy `ManageEvents.js` and `api-service/src/routes/events.js` deleted.

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

### Rate Limiting (Shared, RESTful)

Rate limiting uses the **shared** middleware in `api-service/src/modules/shared/middleware/rateLimiter.js`. One general limit applies to all routes; special-case limiters only where needed. Legacy `api-service/src/middleware/rateLimiter.js` is a thin wrapper that re-exports from shared.

| Limiter | Use | Applied |
|--------|-----|--------|
| `apiLimiter` | General API (500 req / 15 min per IP) | **Once globally** in `server.js`; all `/api/v2/*` and legacy routes inherit it |
| `smartAuthLimiter` | Auth: login, refresh, token validation | Auth routes only |
| `paymentLimiter` | Checkout/payment endpoints | Checkout router (except order history) |
| `adminLimiter` | Admin operations | `/admin`, `/api/admin/*`, etc. |
| `apiKeyLimiter` | API key management (20 req / hour per IP) | `/api/v2/auth/keys` (list, create, toggle, delete) |
| `uploadLimiter` | File uploads (role-based) | Legacy product upload routes |
| `orderHistoryLimiter` | Read-only order list | Legacy checkout order-history path |

**Rules:**
- **v2 modules** get the global `apiLimiter` only; no per-module limiter. Stays RESTful and efficient.
- For a route that needs a **stricter** limit (e.g. payment-like), require shared and apply it: `const { paymentLimiter } = require('../modules/shared/middleware/rateLimiter');` then use on that route.
- New code should require from `./modules/shared/middleware/rateLimiter` (or `../shared/middleware` from within a module).

### API Keys (auth module, v2)

API keys are part of the **auth** module (login/security). Third-party and server-to-server access (e.g. media worker, CSV, Leo) use key pairs from the `api_keys` table; JWT is for browser/mobile sessions.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/auth/keys` | List API keys for the authenticated user |
| POST | `/api/v2/auth/keys` | Create key pair (body: `{ name }`); returns `{ public_key, private_key, name }` once |
| PUT | `/api/v2/auth/keys/:publicKey/toggle` | Toggle `is_active` |
| DELETE | `/api/v2/auth/keys/:publicKey` | Delete key |

- **Backend:** `api-service/src/modules/auth/services/keys.js` (listKeys, createKey, toggleKey, deleteKey); routes in `auth/routes.js`.
- **Frontend:** My Account → API Keys (`/dashboard/users/api-keys`) uses `getApiUrl('api/v2/auth/keys')`; UI in `components/dashboard/developers/components/APIKeys.js` and `api-keys/` (ViewAPIKeys, GenerateAPIKey). Page: `pages/dashboard/users/api-keys.js` (admin-only).
- **Rate limiting:** `apiKeyLimiter` (20 req/hour per IP) is applied to all four keys routes in `auth/routes.js` to prevent abuse. Legacy `/api-keys` mount removed.

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

**When converting a component to a module:** Delete the component's style file (e.g. `Component.module.css`) and put the wrapper in place—the new module page uses global/dashboard styles instead.

**Example:** **VariationBulkEditor** (catalog module) uses global classes only (e.g. `bulk-editor`, `variation-card`, `form-group`) defined in `modules/styles/forms.css` (Variation bulk editor section); its `VariationBulkEditor.module.css` was removed.

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

### Old AdminMenu Cleanup Status

The old AdminMenu (`components/dashboard/admin/AdminMenu.js`) has been progressively cleaned up. Items are migrated to the new sidebar menu or dedicated pages.

**Migrated Items (removed from old AdminMenu):**
- [x] Manage Users → Users > Manage Users (`/dashboard/users/manage`)
- [x] Manage Permissions → Users > Manage Users (permissions in UserManagement)
- [x] All Events → Events > All Events (`/dashboard/events/admin`)
- [x] Articles & Pages → Communications > Articles & Blogs (`/dashboard/communications/articles`)
- [x] Promotions → Marketing > Admin Promotions (`/dashboard/marketing/admin-promotions`)
- [x] Marketplace Applications → Business Center > Marketplace Applications (`/dashboard/commerce/marketplace-applications`)
- [x] Verified Applications → Business Center > Marketplace Applications (Verified tab)
- [x] Wholesale Applications → Business Center > Marketplace Applications (Wholesale tab)
- [x] Manage Commissions → Users > Manage Commissions (`/dashboard/users/commissions`)
- [x] Admin Event Review → Service > Admin Event Review (`/dashboard/service/event-reviews`)
- [x] Support Tickets → Communications > Admin Tickets (`/dashboard/communications/admin`)
- [x] Marketplace Products → System > Curate (`/dashboard/system/curate`)

**Remaining Slide-in Items (still using old pattern):**
- [x] Refunds → Service > Refunds (`/dashboard/service/refunds`)
- [x] Returns Management → Business Center > Returns Admin (`/dashboard/commerce/returns-admin`)

**AdminMenu Removal Complete** ✅
The old AdminMenu component has been fully removed. All admin functionality is now accessible through the new sidebar menu structure.

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
