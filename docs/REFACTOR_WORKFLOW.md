# Documentation-Led Refactor Workflow

## Overview

This document outlines the development workflow for the modular refactoring of the Brakebee platform. As a solo developer, we use a **linear workflow on the `dev` branch** with disciplined commit messages to track module progress.

---

## Current Progress

| Module | Status | Notes |
|--------|--------|-------|
| **Auth** | ✅ Complete | v2 endpoints live, wrappers in place for backward compatibility |
| **Users** | 🔄 Planning | Spec complete, ready to implement |
| **Dashboard** | 🔄 In Progress | Shell, sidebar, menu, header, footer complete |
| **Catalog** | ⏳ Pending | Depends on Users |
| **Commerce** | ⏳ Pending | Depends on Catalog |
| **Events** | ⏳ Pending | Depends on Users |
| **Websites** | ⏳ Pending | Depends on Users |
| **Content** | ⏳ Pending | - |
| **Marketing** | ⏳ Pending | Depends on Commerce |

### What's Next
1. **Users Module** - Backend services, v2 endpoints, frontend utilities
2. **Dashboard Users Section** - Convert slide-ins to pages, add to menu
3. **Catalog Module** - Product management

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
