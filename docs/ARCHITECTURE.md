# Brakebee Platform Architecture

## Overview

Brakebee is a multi-tenant marketplace platform connecting artists with art lovers. The system consists of:

- **Next.js Frontend** - React-based web application
- **Express API Service** - RESTful backend API
- **MySQL Database** - Primary data store
- **Firebase** - Authentication provider
- **Stripe** - Payment processing

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                        │
├─────────────────────┬─────────────────────┬─────────────────────────────────┤
│   Web Browser       │   Mobile App        │   Third-Party (future)          │
│   (Next.js SSR)     │   (React Native)    │   (API consumers)               │
└─────────┬───────────┴─────────┬───────────┴─────────────┬───────────────────┘
          │                     │                         │
          ▼                     ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NGINX                                          │
│   • SSL termination                                                         │
│   • Reverse proxy                                                           │
│   • Static file serving                                                     │
│   • Subdomain routing                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│   brakebee.com          → localhost:3000 (Next.js)                          │
│   api.brakebee.com      → localhost:3001 (API Service)                      │
│   *.brakebee.com        → localhost:3000 (Artist subdomains)                │
│   staging.brakebee.com  → localhost:3002 (Staging Next.js)                  │
│   api.staging...        → localhost:3003 (Staging API)                      │
└─────────────────────────────────────────────────────────────────────────────┘
          │                                   │
          ▼                                   ▼
┌─────────────────────────┐     ┌─────────────────────────────────────────────┐
│   NEXT.JS FRONTEND      │     │   EXPRESS API SERVICE                       │
│   (Port 3000/3002)      │     │   (Port 3001/3003)                          │
├─────────────────────────┤     ├─────────────────────────────────────────────┤
│                         │     │                                             │
│  server.js              │     │  src/server.js                              │
│   └─ Next.js handler    │     │   ├─ CORS middleware                        │
│                         │     │   ├─ Rate limiting                          │
│  middleware.js          │     │   ├─ CSRF protection                        │
│   ├─ maintenanceMode    │     │   ├─ Route mounting                         │
│   ├─ subdomainRouter    │     │   └─ Health check                           │
│   └─ checklist          │     │                                             │
│                         │     │  src/routes/                                │
│  pages/_app.js          │     │   ├─ auth.js                                │
│   ├─ Layout selection   │     │   ├─ users.js                               │
│   ├─ SEO defaults       │     │   ├─ products.js                            │
│   └─ GTM/Analytics      │     │   ├─ checkout.js                            │
│                         │     │   ├─ events.js                              │
│  lib/config.js          │     │   ├─ sites.js                               │
│   └─ Env configuration  │     │   └─ ... (40+ route files)                  │
│                         │     │                                             │
└───────────┬─────────────┘     └───────────────────┬─────────────────────────┘
            │                                       │
            │         ┌─────────────────────────────┤
            │         │                             │
            ▼         ▼                             ▼
┌─────────────────────────┐     ┌─────────────────────────────────────────────┐
│      FIREBASE           │     │              MYSQL DATABASE                 │
│   (Authentication)      │     │           (wordpress_import)                │
├─────────────────────────┤     ├─────────────────────────────────────────────┤
│  • Email/Password auth  │     │  100+ tables including:                     │
│  • Google OAuth         │     │  • users, user_profiles                     │
│  • Token management     │     │  • products, product_variations             │
│  • Email verification   │     │  • orders, order_items                      │
└─────────────────────────┘     │  • events, event_applications               │
                                │  • sites, site_customizations               │
┌─────────────────────────┐     │  • carts, cart_items                        │
│        STRIPE           │     │  • subscriptions, transactions              │
│   (Payment Processing)  │     │  • articles, support_tickets                │
├─────────────────────────┤     └─────────────────────────────────────────────┘
│  • Checkout sessions    │
│  • Connect (payouts)    │
│  • Subscriptions        │
│  • Webhooks             │
└─────────────────────────┘
```

---

## Core Files

### Next.js Frontend

| File | Purpose | Lines |
|------|---------|-------|
| `server.js` | Custom Next.js server entry point | 16 |
| `middleware.js` | Edge middleware for routing, maintenance, auth checks | 49 |
| `pages/_app.js` | App wrapper with layouts, SEO, analytics | 161 |
| `lib/config.js` | Centralized environment configuration | 92 |
| `lib/csrf.js` | CSRF token management | ~100 |
| `lib/firebase.js` | Firebase app initialization | 12 |

### API Service

| File | Purpose | Lines |
|------|---------|-------|
| `src/server.js` | Express app setup, middleware, route mounting | 389 |
| `config/db.js` | MySQL connection pool | 12 |
| `src/middleware/rateLimiter.js` | Rate limiting configuration | ~200 |
| `src/middleware/csrfProtection.js` | CSRF validation middleware | ~150 |
| `src/middleware/auth.js` | JWT validation, user context | ~150 |

---

## Request Flow

### Web Request (Main Site)
```
Browser → NGINX → Next.js server.js → middleware.js → Page Component
                                           │
                                           ├─ maintenanceMode() → /maintenance
                                           ├─ subdomainRouter() → Artist sites
                                           └─ checklist() → Auth redirects
```

### API Request
```
Client → NGINX → Express server.js → Middleware Stack → Route Handler → Response
                        │
                        ├─ CORS validation
                        ├─ Cookie parser
                        ├─ Rate limiter
                        ├─ JSON parser
                        ├─ CSRF validation
                        └─ Auth middleware (per-route)
```

### Artist Subdomain Request
```
artist.brakebee.com → NGINX → Next.js → subdomainRouter.js
                                              │
                                              ├─ Resolve subdomain via API
                                              ├─ Check site status
                                              └─ Rewrite to /artist-storefront
```

---

## Directory Structure

```
/var/www/staging/
├── server.js                 # Next.js custom server
├── middleware.js             # Edge middleware entry
├── next.config.js            # Next.js configuration
├── ecosystem.config.js       # PM2 process configuration
│
├── pages/                    # Next.js pages (routes)
│   ├── _app.js              # App wrapper
│   ├── index.js             # Homepage
│   ├── dashboard/           # Dashboard pages
│   ├── products/            # Product pages
│   ├── events/              # Event pages
│   ├── articles/            # Article pages
│   ├── custom-sites/        # Subdomain custom pages
│   └── ...
│
├── components/               # React components
│   ├── layouts/             # Layout components
│   ├── dashboard/           # Dashboard-specific components
│   ├── Header.js            # Main header
│   ├── Footer.js            # Main footer
│   └── ...
│
├── middleware/               # Next.js middleware modules
│   ├── checklist.js         # Auth/profile completion checks
│   ├── subdomainRouter.js   # Artist subdomain routing
│   └── maintenanceMode.js   # Maintenance mode handler
│
├── lib/                      # Shared utilities
│   ├── config.js            # Environment configuration
│   ├── csrf.js              # CSRF utilities
│   ├── firebase.js          # Firebase initialization
│   └── ...
│
├── styles/                   # CSS files
│   ├── global.css           # Global styles
│   └── *.module.css         # Component-specific styles
│
├── public/                   # Static assets
│   ├── static_media/        # Uploaded media files
│   └── images/              # Static images
│
├── api-service/              # Express API (separate app)
│   ├── src/
│   │   ├── server.js        # Express entry point
│   │   ├── routes/          # API route handlers (40+ files)
│   │   └── middleware/      # API middleware
│   └── config/
│       └── db.js            # Database connection
│
├── database/                 # Database schema
│   └── schema.sql           # Current database schema
│
├── docs/                     # Documentation
│   ├── ARCHITECTURE.md      # This file
│   └── REFACTOR_WORKFLOW.md # Refactoring process
│
├── leo/                      # AI/ML service (Python)
├── luca/                     # Data processing service
└── mobile-app/               # React Native mobile app
```

---

## Environment Configuration

### Frontend (.env)
```
NEXT_PUBLIC_API_BASE_URL      # API endpoint
NEXT_PUBLIC_FRONTEND_URL      # Public site URL
NEXT_PUBLIC_SUBDOMAIN_BASE    # Base domain for subdomains
NEXT_PUBLIC_COOKIE_DOMAIN     # Cookie domain scope
NEXT_PUBLIC_FIREBASE_*        # Firebase configuration
NEXT_PUBLIC_STRIPE_*          # Stripe publishable key
PORT                          # Server port
```

### API Service (.env)
```
DB_HOST, DB_USER, DB_PASS     # Database credentials
DB_NAME, DB_PORT              # Database connection
FIREBASE_*                    # Firebase Admin SDK
STRIPE_SECRET_KEY             # Stripe secret key
STRIPE_WEBHOOK_SECRET         # Webhook validation
JWT_SECRET                    # JWT signing key
CORS_ALLOWED_ORIGINS          # Allowed CORS origins
API_GATEWAY_PORT              # Server port
```

---

## Process Management (PM2)

```
┌─────────────────────┬──────────┬─────────────────────────────────┐
│ Process Name        │ Port     │ Description                     │
├─────────────────────┼──────────┼─────────────────────────────────┤
│ oaf                 │ 3000     │ Production Next.js frontend     │
│ api-service         │ 3001     │ Production Express API          │
│ csv-worker          │ -        │ Background CSV processing       │
│ staging-frontend    │ 3002     │ Staging Next.js frontend        │
│ staging-api         │ 3003     │ Staging Express API             │
└─────────────────────┴──────────┴─────────────────────────────────┘
```

---

## Known Technical Debt

### API Server (`api-service/src/server.js`)

1. **Hardcoded paths** - Lines 1, 122 reference `/var/www/main/` instead of using relative paths or environment variables

2. **Disabled secure logger** - Lines 18-28 have the secure logger temporarily disabled with a stub implementation

3. **Duplicate route mounts** - `/admin` is mounted twice (lines 192, 229)

4. **Route aliases** - Multiple aliases for same functionality:
   - `/api/subscriptions/shipping` and `/api/subscriptions/shipping_labels`
   - `/api/subscriptions/sites` and `/api/subscriptions/websites`

5. **Mixed concerns** - CSRF application is interleaved with route loading rather than being cleanly separated

### General

- **40+ route files** in api-service/src/routes/ - candidates for module consolidation
- **No API versioning** - Current routes are unversioned (`/products` vs `/api/v2/products`)
- **Inconsistent route prefixes** - Some use `/api/`, some don't

---

## Future Architecture (Target State)

See `REFACTOR_WORKFLOW.md` for the module-based refactoring plan.

### Target Module Structure
```
api-service/src/
├── modules/
│   ├── auth/           # Authentication & authorization
│   ├── profiles/       # User profiles & personas
│   ├── catalog/        # Products, categories, inventory
│   ├── commerce/       # Cart, checkout, orders, payments
│   ├── websites/       # Sites, subdomains, customization
│   ├── events/         # Event listings & applications
│   ├── content/        # Articles, help center
│   ├── marketing/      # Affiliates, promoters, coupons
│   └── admin/          # Admin tools & reports
├── shared/
│   ├── middleware/     # Common middleware
│   ├── types/          # Shared type definitions
│   └── utils/          # Shared utilities
└── server.js           # Clean entry point
```

---

## Related Documentation

- [REFACTOR_WORKFLOW.md](./REFACTOR_WORKFLOW.md) - Development workflow for refactoring
- [database/schema.sql](../database/schema.sql) - Current database schema
- [api-service/README.md](../api-service/README.md) - API service documentation
