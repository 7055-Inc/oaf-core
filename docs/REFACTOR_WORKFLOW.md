# Documentation-Led Refactor Workflow

## Overview

This document outlines the development workflow for the modular refactoring of the Brakebee platform. As a solo developer, we use a **linear workflow on the `dev` branch** with disciplined commit messages to track module progress.

---

## Current Progress

*Verified against `api-service/src/server.js` and module directories.*

| Module | Status | Notes |
|--------|--------|-------|
| **Auth** | ✅ Complete | v2 endpoints live, wrappers in place for backward compatibility |
| **Users** | ✅ Complete | Backend services, v2 API, frontend lib, dashboard components, pages |
| **Dashboard** | ✅ Users + Catalog + Commerce + Finances + Comms | Shell, sidebar, menuConfig, section pages |
| **Catalog** | ✅ Complete | v2 CRUD, frontend lib, dashboard components |
| **CSV** | ✅ Complete | v2 routes, integrated worker, lib/csv |
| **Commerce** | ✅ Complete | v2 orders, sales, shipping, returns; dashboard components; admin all-orders at /dashboard/commerce/all-orders |
| **Finances** | ✅ Complete | v2 balance, transactions, payouts; dashboard components |
| **Communications** | ✅ Complete | v2 tickets; dashboard components |
| **Events** | 🔄 Backend + Dashboard | v2 module mounted; dashboard: My Events (mine), Events I Own (own), Find New (find), My Applications, Create Event, Admin All Events |
| **Applications** | 🔄 Backend only | v2 artist applications (mine, stats, :id, delete); not yet fully rebuilt / dashboard TBD |
| **Websites** | ✅ Complete | v2 module at /api/v2/websites; lib/websites uses v2; dashboard gate + PricingTiers in module |
| **Content** | ⏳ Pending | - |
| **Marketing** | ⏳ Pending | Depends on Commerce |
| **Admin** | ⏳ Pending | Legacy routes; module TBD |

### What's Next
1. **Events** - Dashboard UI done (mine, own, find, applications, jury-packets, new, admin). Event application form migrated to accordion (module). Optional: migrate Events I Own to v2 API + module component; backend cleanup.
2. **Applications** - Full rebuild / dashboard integration when ready
3. **Websites** - Module extraction from legacy routes
4. **Content / Marketing / Admin** - Per dependency order

---

## Flow Chart

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        DOCUMENTATION-LED REFACTOR FLOW                          │
│                              (Linear on dev branch)                             │
└─────────────────────────────────────────────────────────────────────────────────┘

                                    START
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │   1. WRITE MODULE SPEC/DOCS     │
                    │   ─────────────────────────     │
                    │   • API endpoints               │
                    │   • Data structures             │
                    │   • Dependencies                │
                    └─────────────────────────────────┘
                                      │
                            [docs] commit to dev
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │   2. BUILD SHARED FOUNDATION    │
                    │   ─────────────────────────     │
                    │   • Types/interfaces            │
                    │   • Validation utilities        │
                    │   • Shared middleware           │
                    └─────────────────────────────────┘
                                      │
                          [module] commits to dev
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │   3. IMPLEMENT NEW ENDPOINTS    │
                    │   ─────────────────────────     │
                    │   • /api/v2/module/...          │
                    │   • New clean patterns          │
                    │   • Tests                       │
                    └─────────────────────────────────┘
                                      │
                          [module] commits to dev
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │   4. MIGRATE CONSUMERS          │
                    │   ─────────────────────────     │
                    │   • Update web app              │
                    │   • Update mobile app           │
                    │   • Deprecation warnings        │
                    └─────────────────────────────────┘
                                      │
                          [module] commits to dev
                                      │
                                      ▼
                    ┌─────────────────────────────────┐
                    │   5. CLEANUP OLD CODE           │
                    │   ─────────────────────────     │
                    │   • Remove deprecated endpoints │
                    │   • Delete dead code            │
                    │   • Update docs                 │
                    └─────────────────────────────────┘
                                      │
                          [module] commits to dev
                                      │
                                      ▼
                              ┌───────────────┐
                              │ MODULE DONE   │
                              └───────────────┘
                                      │
                                      ▼
                              ┌───────────────┐
                              │ NEXT MODULE   │──────────► (repeat)
                              └───────────────┘
```

---

## Hotfix Flow

When a bug is reported while working on a module refactor:

```
     Working on [catalog]                     Bug reported!
            │                                      │
            ▼                                      ▼
    ┌───────────────┐                    ┌─────────────────┐
    │ Stash or      │                    │ Fix bug on dev  │
    │ commit WIP    │───────────────────►│ [hotfix] commit │
    └───────────────┘                    └─────────────────┘
                                                  │
                                                  ▼
                                         ┌───────────────┐
                                         │ Push to prod  │
                                         │ if critical   │
                                         └───────────────┘
                                                  │
                                                  ▼
                                         ┌───────────────┐
                                         │ Resume module │
                                         │ work          │
                                         └───────────────┘
```

---

## Module Order (Suggested)

Modules should be refactored in dependency order:

```
┌────────┐    ┌──────────┐    ┌─────────┐    ┌──────────┐    ┌───────────┐
│  AUTH  │───►│  USERS   │───►│ CATALOG │───►│ COMMERCE │───►│ WEBSITES  │
└────────┘    └──────────┘    └─────────┘    └──────────┘    └───────────┘
     │                                                              │
     │         ┌──────────┐    ┌─────────┐    ┌─────────┐           │
     └────────►│  EVENTS  │───►│ CONTENT │───►│ MARKETING│◄─────────┘
               └──────────┘    └─────────┘    └─────────┘
```

### Module Descriptions

| Module | Description | Dependencies |
|--------|-------------|--------------|
| **Auth** | Firebase auth, JWT, sessions, permissions, impersonation | None |
| **Users** | User accounts, profiles, personas, verification, roles | Auth |
| **Catalog** | Products, categories, variations, inventory, media | Auth, Users |
| **Commerce** | Cart, checkout, orders, payments, shipping, refunds, taxes | Auth, Users, Catalog |
| **Websites** | Subdomains, themes, customization, custom domains | Auth, Users |
| **Events** | Listings, applications, calendar, reviews | Auth, Users |
| **Content** | Articles, help center, policies | Auth |
| **Marketing** | Affiliates, promoters, coupons, newsletters | Auth, Users, Commerce |
| **Admin** | Dashboard, widgets, reports, moderation | All modules |
| **Dashboard** | Frontend UI module (ongoing) - page-based dashboard | All modules |

---

## Commit Message Format

All commits should follow this format for easy tracking:

```
[module] Brief description of change
```

### Prefixes

| Prefix | Usage |
|--------|-------|
| `[docs]` | Documentation, specs, API definitions |
| `[auth]` | Auth module changes |
| `[users]` | Users module changes |
| `[catalog]` | Catalog module changes |
| `[commerce]` | Commerce module changes |
| `[websites]` | Websites module changes |
| `[events]` | Events module changes |
| `[content]` | Content module changes |
| `[marketing]` | Marketing module changes |
| `[admin]` | Admin module changes |
| `[dashboard]` | Dashboard UI module changes |
| `[shared]` | Shared utilities, types, middleware |
| `[hotfix]` | Bug fixes (not part of refactor) |
| `[cleanup]` | Removing deprecated code |
| `[mobile]` | Mobile app specific changes |

### Examples

```
[docs] Auth module API specification
[auth] Add JWT refresh token rotation
[auth] Migrate /login to v2 pattern  
[users] Add persona management endpoints
[users] Extract user types to shared module
[dashboard] Create dashboard shell layout
[dashboard] Add users section components
[catalog] Product validation middleware
[hotfix] Fix cart total calculation
[cleanup] Remove deprecated auth endpoints
[shared] Add common validation utilities
```

---

## Branch Structure

```
main (production)
 └── dev (all development work)
```

- All work happens on `dev`
- `main` receives merges from `dev` for production releases
- No feature branches needed for solo development

---

## Dashboard Menu Migration (One Item at a Time)

When moving from the **deprecated content area** (old slide-ins / manage menu) to the **new left-column menu** (config-driven sidebar):

1. **Pick one menu item** from the old area (e.g. one section or sub-item).
2. **Review** what it does: routes, components, API calls.
3. **Move it** into the new menu: add entry in `modules/dashboard/config/menuConfig.js`, create or wire the page under `pages/dashboard/...`, point to module components.
4. **Complete the chunk**: backend (v2 if needed), frontend lib, dashboard component, then remove or redirect the old entry.

Doing **one menu item at a time** keeps the code transfer in **bounded chunks** that map cleanly to modules and avoids mixing unrelated code across sections.

### Events menu migration (done)

| Old (slide-in / menu) | New (sidebar + page) | Notes |
|------------------------|----------------------|--------|
| My Calendar (artists) | **My Events** `/dashboard/events/mine` | Artists: applied + custom events (replaced My Calendar). Promoters: events they created. |
| Find New (artists) | **Find New** `/dashboard/events/find` | Browse/search/sort future events, application status. |
| Manage Jury Packets (artists) | **Jury Packets** `/dashboard/events/jury-packets` | Card-based CRUD, v2 API. Old ManageJuryPackets + JuryPacketManager removed. |
| Events I Own (promoters) | **Events I Own** `/dashboard/events/own` | Current/archived tabs, review links, edit/view/delete. Page uses legacy `EventsIOwn` component. |
| Applications Received (promoters) | **My Applicants** `/dashboard/commerce/applicants` | Under **Business Center**; promoter manages applications received for their events. Uses lib/applications (promoter API). |
| My Applications | **My Applications** `/dashboard/events/applications` | Artist applications list. |
| Create Event | **Create Event** `/dashboard/events/new` | Event form (module component). |
| All Events (admin) | **All Events** `/dashboard/events/admin` | Admin event management. |

**Event application form:** The public event application (Apply on event page) is the accordion-based **ApplicationForm** in `modules/events/components/application-form/`, with **ApplicationPaymentModal** in the same folder (uses lib createApplicationPaymentIntent/confirmApplicationPayment). **ApplicationStatus** lives in `modules/events/components/` and uses fetchMyApplications (v2). `pages/events/[id].js` uses lib fetchMyApplications, getEventApplicationStats, updateApplication and imports ApplicationForm + ApplicationStatus + **EventReviews** from the events module. **EventReviews** (event review form + list) and **EventsCarousel** (homepage upcoming events) are in the events module; homepage imports EventsCarousel from the events module. Old `components/applications/` and `components/EventReviews.js`, `components/EventsCarousel.js` removed.

**Legacy events API:** Still in use. Cannot remove `api/events` yet. See MODULE_ARCHITECTURE.md "Events API: legacy vs v2" and "Can we remove the legacy events API yet?" for the full consumer list (public event page, homepage, EventsCarousel, events index, sitemap, EventsIOwn, ApplicationsReceived, PaymentDashboard, ManageEvents, AdminEventReviews, events/new, EventFormContext, TicketPurchaseModal, ProfileDisplay, claim flow, lib/events, lib/applications). v2 covers mine, jury-packets, application-fields, available-addons; legacy still required for upcoming, single event, filtered list, types, CRUD, custom events, tickets, claim, payment-dashboard.

---

## Per-Module Checklist

For each module refactor:

- [ ] Write API specification document
- [ ] Define data structures/types
- [ ] Identify dependencies on other modules
- [ ] Create shared utilities needed
- [ ] Implement v2 endpoints
- [ ] Update web app consumers
- [ ] Update mobile app consumers (when applicable)
- [ ] Add deprecation warnings to old endpoints
- [ ] Write/update tests
- [ ] Remove deprecated code
- [ ] Update documentation

---

## Future Considerations

### Docker/Scaling Readiness
- Clean module boundaries enable containerization
- Stateless API design allows horizontal scaling
- Each module could become a microservice if needed

### Mobile App Integration
- API designed to be platform-agnostic
- Shared validation logic between web and mobile
- Consistent response formats across all endpoints

### Third-Party API
- OpenAPI/Swagger documentation for each module
- Versioned endpoints (/api/v2/)
- Clear authentication patterns
- Rate limiting per module
