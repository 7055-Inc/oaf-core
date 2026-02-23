# Legacy -> V2 Migration State

Last updated: 2026-02-18
Owner: Human + AI coordinator
Status: **COMPLETE** — Phase 1 (28 frontend domains) + Phase 2 (audit, ports, rename). `src/routes/` renamed to `src/legacy-routes/`. API running clean. Migration verified.

## 1) Mission (Hard Anchor)

Migrate legacy API usage to v2 route-by-route, with explicit endpoint replacements and verification after each batch.

Success means:
- Frontend no longer calls legacy route paths for the completed route domain.
- Equivalent v2 endpoints are used and behavior is verified.
- Legacy mounts remain disabled for completed domains.

## 2) Non-Negotiable Guardrails

Allowed:
- Endpoint migration only for the approved route domain.
- Minimal compatibility edits only inside approved files.
- Verification commands and state updates.

Forbidden:
- Global shims/reroutes in shared helpers.
- Package/tooling/process changes (husky/eslint/prettier/git-flow/etc.).
- Security/config refactors not required for the current route domain.
- Editing files outside the approved allowlist.

If blocked by out-of-scope need: STOP and ask.

## 3) Current Runtime Posture

- Legacy mounts in `api-service/src/server.js` are commented out for migration testing.
- v2 module mounts are the intended active API surface.
- Any failures should be treated as migration gaps and fixed explicitly.
- Full legacy route universe includes all files under `api-service/src/routes/*`.

## 4) Batch Protocol (Always Follow — 2-Step)

### Step A: Investigate & Plan (read-only)
1. Read this file first.
2. Pick exactly one route domain (example: `/users`).
3. Grep for all legacy callers of that domain. Include:
   - literal strings: `authApiRequest('domain/...')`
   - constant refs: `API_ENDPOINTS.DOMAIN_*`
   - URL variants: `getApiUrl('api/domain/...')`, `getApiUrl('domain/...')`
   - raw fetch: `fetch(...'domain/...')`
4. Document: file, line, exact endpoint string, response shape expected.
5. Define allowlist of files for this batch.
6. Update this file with the plan.
7. STOP — present plan for approval.

### Step B: Execute (write, after approval)
1. Apply only endpoint-focused changes within approved allowlist.
2. Each caller: replace endpoint string, adjust response unwrap if needed.
3. Verify: `grep` confirms legacy count dropped, `npm run build` passes.
4. Update this file with results.
5. STOP — wait for approval before next batch.

### Step C: Domain cleanup (after all callers for a domain are migrated)
1. Grep `API_ENDPOINTS\.` across pages/, components/, modules/, hooks/ for any constant
   references tied to the completed domain.
2. If callers remain: migrate them to the proper v2 helper function.
3. Delete orphaned constants from the `API_ENDPOINTS` dictionary in `lib/apiUtils.js`.
4. Verify: `npm run build` passes.
5. Update this file confirming cleanup done.

## 5) Route Domain Tracker

| Domain | State | Legacy caller count | Notes |
|---|---|---:|---|
| `/users` | **DONE** | 0 | 67/67 migrated, shim removed, constants cleaned |
| `/events` | **DONE** | 0 | Already v2-native via lib/events/api.js; no legacy callers found |
| `/vendor` | **DONE** | 0 | 8 calls across 4 files → /api/v2/commerce/vendor/* |
| `/admin` | **DONE** | 0 | 16 calls: 2 notifications, 11 promotions/sales/coupons, 2 promoter-onboarding, 1 users-list |
| `/checkout` | **DONE** | 0 | 7 calls across 3 files → /api/v2/commerce/checkout/* |
| `/cart` | **DONE** | 0 | 19 calls across 7 files → /api/v2/commerce/cart/*. Constants CART, CART_COUNT removed. |
| `/subscriptions/*` | **DONE** | 0 | 21 calls across 11 files → /api/v2/commerce/subscriptions/*. New routesSubscriptions.js in commerce module. 3 config files updated. Constants SUBSCRIPTIONS_MARKETPLACE, SUBSCRIPTIONS_SHIPPING, SUBSCRIPTIONS_WHOLESALE removed. |
| `/products` + `/curated` | **DONE** | 0 | 28 calls across 16 files. Sub-batch 1: 13 public+dashboard callers → v2/catalog/public/products and v2/catalog/products. Sub-batch 2: curated routes (enhanced v2 /public/products with marketplace_category + full family/variation data), 7 variation/upload calls → v2 catalog variation routes. productService enhanced with getShipping, getVariationData, marketplaceCategory filter. Constants PRODUCTS, MARKETPLACE_PRODUCTS removed. luca/ app out of scope. |
| `/media` | **DONE** | 0 | Batch 017: 10 frontend files had hardcoded `/api/media/serve/` paths bypassing smart media. Converted all to `getSmartMediaUrl()` (which routes through `SMART_MEDIA_BASE_URL` → `/api/v2/media/images/:mediaId` for optimized serving with size variants). Fixed .env: `SMART_MEDIA_BASE_URL` and `NEXT_PUBLIC_SMART_MEDIA_BASE_URL` updated to `/api/v2/media/images`. Removed orphaned `API_ENDPOINTS.MEDIA` and `API_ENDPOINTS.IMAGES`. No backend route changes needed — v2 media module already dual-mounted. |
| `/articles` | DONE | ~24 | Batch 016: Created routesArticles.js (full v2 port, NOT a passthrough). Updated 15 frontend files (pages/articles/*, pages/topics/*, pages/series/[slug], pages/news/*, pages/help/*, components/search/*) + lib/content/api.js envelope unwrapping. |
| `/reviews` | **DONE** | 0 | 18 calls across 6 files → /api/v2/content/reviews/*. New routesReviews.js in content module (9 endpoints). No API_ENDPOINTS constants existed. |
| `/applications` | DONE | 5 | Batch 018: Ported 15 new endpoints to v2 module. Updated 9 functions in lib/applications/api.js + 5 direct calls in 4 files (PaymentDashboard, BulkAcceptanceInterface, event-payment pages). Removed orphaned API_ENDPOINTS.APPLICATIONS. |
| `/tickets` | **DONE** | 0 | Batch 020: Ported 6 endpoints (POST create, GET my, GET my/notifications, GET :id, POST :id/messages, PATCH :id/close) into v2 system module. Updated 7 calls across 4 frontend files (contact.js, tickets/index.js, tickets/[id].js, dashboard/index.js, DashboardShell.js). No orphaned constants. |
| `/terms` | **DONE** | 0 | Batch 021: Added 4 public/customer endpoints (GET current, GET type/:type, GET check-acceptance, POST accept) to v2 system module. Updated 6 calls across 4 files (policies/[type].js, terms-acceptance.js, terms-of-service.js, middleware/checklist.js). No orphaned constants. |
| `/shipping` (standalone) | DONE | 5 | Batch 019: Added `POST /shipping/calculate-cart-shipping` to v2 commerce. Updated 3 calculate-cart-shipping callers + 2 label URL refs across 4 files. No orphaned constants. |
| `/dashboard-widgets` | **DONE** | 0 | Batch 022: Added 6 endpoints (GET/POST layout, GET widget-data/:type, POST shortcuts/add, POST shortcuts/remove, POST remove-widget) to v2 system module. Updated 11 calls across 6 files (WidgetGrid, SidebarMenu, 2x ShortcutsWidget, 2x MyProductsWidget). Removed 6 orphaned DASHBOARD_WIDGETS_* constants. |
| `/wholesale` | **DONE** | 0 | Batch 023: 3 endpoints (GET terms-check, POST terms-accept, POST apply) added to v2 commerce routesSubscriptions.js. 3 calls updated in 1 file. No orphaned constants. |
| `/payment-methods` | **DONE** | 0 | Batch 024: 3 endpoints (GET list, POST create-setup-intent, POST confirm-setup) added to v2 commerce. 6 calls updated across 2 files. No orphaned constants. |
| `/leo` | **DONE** | 0 | Batch 025: URL swap only — v2 leo module already had POST /search. Updated 2 calls (proxy + VisualDiscoveryBand). 3 search components use Next.js proxy (auto-covered). No orphaned constants. |
| `/walmart` | **DONE** | 0 | Batch 026: Created routesWalmart.js (12 endpoints via walmartService). Fixed 3 broken authApiRequest calls + 8 lib function unwraps. |
| `/returns` | **DONE** | 0 | Batch 027: 3 admin endpoints added to v2 commerce. 5 calls updated in AdminReturns.js. |
| `/admin-marketplace` | **DONE** | 0 | Batch 028: 3 endpoints in routesAdminApplications.js. 3 calls updated in AdminMarketplace.js. |
| `/admin-verified` | **DONE** | 0 | Batch 028: 3 endpoints in routesAdminApplications.js. 3 calls updated in AdminMarketplace.js. + 1 missed /admin caller fixed. |
| `/artist-contact` | DONE | 0 | Batch 033. Contact form ported to v2 communications module. |
| `/promoter-claim` | DONE | 0 | Batch 030. 2 endpoints added to v2 events module; 1 frontend file updated. |
| `/series` | DONE | 0 | Batch 031. 3 event series endpoints added to v2 events module; 1 frontend file updated. |
| `/addons` | DONE | 0 | Batch 032. Contact form submit ported to v2 websites module. |
| `/jury-packets` | DONE | 0 | Batch 029. Upload endpoint added to v2 events module; frontend caller updated. |
| `/auth` | V2-COVERED | 0 | v2 auth module fully active; legacy commented out. Cookie consent endpoints minor gap. |
| `/admin-financial` | DEAD | 0 | Audit: 0 callers. All frontend uses v2 finances. Legacy dead code. |
| `/domains` | V2-COVERED | 0 | All 7 endpoints fully covered by v2 websites module. |
| `/emails` | **DONE** | 0 | Batch 034. 4 endpoints ported to v2 users module. Frontend updated. |
| `/personas` | V2-COVERED | 0 | All 6 endpoints fully covered by v2 users module. |
| `/tiktok` | **DONE** | 0 | Batch 034. v2 routesTiktok.js mounted in catalog/routes.js. Frontend already on v2 paths. |
| `/csv` | V2-COVERED | 0 | V2 csv module covers core endpoints. Minor gaps: internal/export endpoints. |
| `/webhooks` | **DONE** | N/A | Batch 034. Ported to `modules/webhooks/stripe/stripe.js`. server.js updated. |
| `/tax-reports` | DEAD | 0 | Audit: 0 callers. Legacy dead code. |
| `/vendor-financials` | DEAD | 0 | Audit: 0 callers. Legacy dead code. |
| `/policies` | **DONE** | 0 | Batch 034. Parameterized `GET /policies/:type/default` added to v2 system. Frontend updated. |
| `/admin/promoter-onboarding` | V2-COVERED | 0 | Audit: frontend already calls v2 (`/api/v2/events/admin/unclaimed*`). 3 endpoints exist in events module. |
| `/dashboard` | V2-COVERED | 0 | Covered by v2 system dashboard-widgets. |
| `/inventory` | V2-COVERED | 0 | Covered by v2 catalog product inventory. |
| `/media-proxy` | V2-COVERED | 0 | Covered by v2 media module (dual-mounted). |

State values: `TODO`, `IN PROGRESS`, `BLOCKED`, `VERIFIED`, `DONE`, `SKIP`, `V2-COVERED`, `AUDIT`

## 6) Legacy Route File Inventory (Explicit Acknowledgment)

Authoritative snapshot (47 files) under `api-service/src/routes/**`:

- `api-service/src/routes/addons.js`
- `api-service/src/routes/admin-financial.js`
- `api-service/src/routes/admin-marketplace.js`
- `api-service/src/routes/admin-verified.js`
- `api-service/src/routes/admin.js`
- `api-service/src/routes/admin/promoter-onboarding.js`
- `api-service/src/routes/api-external.md`
- `api-service/src/routes/api-in house.md`
- `api-service/src/routes/applications.js`
- `api-service/src/routes/articles.js`
- `api-service/src/routes/artist-contact.js`
- `api-service/src/routes/auth.js`
- `api-service/src/routes/carts.js`
- `api-service/src/routes/checkout.js`
- `api-service/src/routes/curated.js`
- `api-service/src/routes/csv.js`
- `api-service/src/routes/dashboard-widgets.js`
- `api-service/src/routes/dashboard.js`
- `api-service/src/routes/domains.js`
- `api-service/src/routes/emails.js`
- `api-service/src/routes/inventory.js`
- `api-service/src/routes/jury-packets.js`
- `api-service/src/routes/leo.js`
- `api-service/src/routes/media-proxy.js`
- `api-service/src/routes/media.js`
- `api-service/src/routes/payment-methods.js`
- `api-service/src/routes/personas.js`
- `api-service/src/routes/policies.js`
- `api-service/src/routes/products.js`
- `api-service/src/routes/promoter-claim.js`
- `api-service/src/routes/returns.js`
- `api-service/src/routes/reviews.js`
- `api-service/src/routes/series.js`
- `api-service/src/routes/shipping.js`
- `api-service/src/routes/subscriptions/marketplace.js`
- `api-service/src/routes/subscriptions/shipping.js`
- `api-service/src/routes/subscriptions/verified.js`
- `api-service/src/routes/subscriptions/wholesale.js`
- `api-service/src/routes/tax-reports.js`
- `api-service/src/routes/terms.js`
- `api-service/src/routes/tickets.js`
- `api-service/src/routes/tiktok.js`
- `api-service/src/routes/users.js`
- `api-service/src/routes/vendor-financials.js`
- `api-service/src/routes/vendor.js`
- `api-service/src/routes/walmart.js`
- `api-service/src/routes/webhooks/stripe.js`

Use this list as the full legacy route universe for migration and verification.

## 7) Structural Facts (Stable)

- Legacy routes live in `api-service/src/routes/*.js` — these are flat Express routers.
- V2 modules live in `api-service/src/modules/<domain>/` — each has own `routes.js`, `services/`, `middleware/`.
- V2 modules are mounted at `/api/v2/<domain>` in `api-service/src/server.js`.
- All legacy mounts in `server.js` are currently commented out (v2-only runtime posture).
- V2 GET responses use envelope: `{ success: true, data: <payload> }`. Legacy returns raw objects.
- V2 PATCH/POST responses also use envelope. Legacy returns `{ message: "..." }` or raw.
- Frontend callers use `authApiRequest(<path>)` from `lib/apiUtils.js` which prepends API base URL.
- `lib/users/api.js` has v2-native helpers (`getCurrentUser`, etc.) that unwrap the envelope.
- Shared backend services (`api-service/src/services/*.js`) are used by both legacy and v2 — do not delete until orphaned.
- `api-service/src/middleware/` and `api-service/src/config/` are shared infrastructure — do not touch during migration.

### Existing V2 Modules (backend ready)

These directories exist under `api-service/src/modules/` and are already mounted:

`applications`, `auth`, `behavior`, `catalog`, `commerce`, `communications`,
`content`, `crm-subscription`, `csv`, `drip-campaigns`, `email`, `email-marketing`,
`events`, `finances`, `leo`, `marketing`, `media`, `shared`, `sop`, `system`,
`users`, `websites`

If a route domain has no corresponding v2 module here, the backend must be built before frontend callers can migrate.

## 7b) Key Compatibility Difference

When migrating a caller from legacy `users/me` to v2 `/api/v2/users/me`:
- Legacy: `const data = await res.json()` gives raw user object (`data.id`, `data.first_name`, etc.).
- V2: `const data = await res.json()` gives `{ success: true, data: { id, first_name, ... } }`.
- Fix per caller: either use `lib/users/api.js` helper (recommended) or unwrap `.data` manually.

## 7c) Exact Edit Recipe (Pattern A — `users/me` GET callers)

This is the repeatable transformation applied to every Pattern A file:

BEFORE (legacy):
```js
import { authApiRequest } from '<relative-path>/lib/apiUtils';
// ...
const response = await authApiRequest('users/me', { method: 'GET' });
if (response.ok) {
  const data = await response.json();
  setUserData(data);
  // ... any admin/permission checks on `data` ...
} else {
  router.push('/login');
}
```

AFTER (v2):
```js
import { getCurrentUser } from '<relative-path>/lib/users/api';
// ...
const data = await getCurrentUser();
setUserData(data);
// ... any admin/permission checks on `data` stay as-is ...
```

Key points:
- `getCurrentUser()` calls `/api/v2/users/me`, unwraps envelope, returns raw user object.
- It throws on auth failure — the existing `catch` block handles the `/login` redirect.
- Admin/permission checks (`data.user_type !== 'admin'`, etc.) remain unchanged after `setUserData`.
- If the file also imports `authApiRequest` for OTHER (non-users) endpoints, keep that import too.

## 8) Verification Checklist (Per Batch)

- `Legacy grep`: old domain references in frontend/lib reduced to expected count.
- `Build`: `npm run build` passes (or known warnings only).
- `Target smoke`: specific UI/API path for the migrated domain works.
- `No drift`: changed files are only from allowlist.

## 8b) Legacy Caller Inventory: `/users` Domain

### Pattern A: `authApiRequest('users/me')` — GET for user data (55 callers)
These all fetch the current user to check permissions/profile on page load.
Replacement: use edit recipe in section 7c.
Mark: DONE = migrated and build-verified. TODO = not yet touched.

**Dashboard catalog (13 files) — ALL DONE (batch 001):**
- [DONE] `pages/dashboard/catalog/addons/etsy.js`
- [DONE] `pages/dashboard/catalog/addons/tiktok.js`
- [DONE] `pages/dashboard/catalog/addons/walmart.js`
- [DONE] `pages/dashboard/catalog/addons/wayfair.js`
- [DONE] `pages/dashboard/catalog/addons/tiktok-admin.js`
- [DONE] `pages/dashboard/catalog/addons/walmart-admin.js`
- [DONE] `pages/dashboard/catalog/addons/wayfair-admin.js`
- [DONE] `pages/dashboard/catalog/admin/index.js`
- [DONE] `pages/dashboard/catalog/categories/index.js`
- [DONE] `pages/dashboard/catalog/collections/index.js`
- [DONE] `pages/dashboard/catalog/import-export/index.js`
- [DONE] `pages/dashboard/catalog/products/index.js`
- [DONE] `pages/dashboard/catalog/products/new.js`

**Dashboard commerce (5 files) — ALL DONE (batch 002):**
- [DONE] `pages/dashboard/commerce/all-applications/index.js`
- [DONE] `pages/dashboard/commerce/applicants/index.js`
- [DONE] `pages/dashboard/commerce/marketplace-applications.js`
- [DONE] `pages/dashboard/commerce/marketplace.js`
- [DONE] `pages/dashboard/commerce/shipping-labels.js`

**Dashboard communications (1 file) — DONE (batch 002):**
- [DONE] `pages/dashboard/communications/articles/index.js`

**Dashboard CRM (4 files) — ALL DONE (batch 002):**
- [DONE] `pages/dashboard/crm/analytics.js`
- [DONE] `pages/dashboard/crm/forms.js`
- [DONE] `pages/dashboard/crm/index.js`
- [DONE] `pages/dashboard/crm/send-campaign.js`

**Dashboard events (7 files) — ALL DONE (batch 003):**
- [DONE] `pages/dashboard/events/admin/index.js`
- [DONE] `pages/dashboard/events/applications/index.js`
- [DONE] `pages/dashboard/events/jury-packets/index.js`
- [DONE] `pages/dashboard/events/mine/index.js`
- [DONE] `pages/dashboard/events/new.js`
- [DONE] `pages/dashboard/events/own/index.js`
- [DONE] `pages/dashboard/events/solicit-promoter.js`

**Dashboard other (8 files) — ALL DONE (batch 004):**
- [DONE] `pages/dashboard/index.js` (kept authApiRequest for other endpoints)
- [DONE] `pages/dashboard/inventory.js` (kept authApiRequest for other endpoints)
- [DONE] `pages/dashboard/marketing/promotions/index.js`
- [DONE] `pages/dashboard/products/[id].js` (kept authApiRequest for other endpoints)
- [DONE] `pages/dashboard/products/edit/[id].js` (kept authApiRequest; Promise.all pattern)
- [DONE] `pages/dashboard/products/index.js` (kept authApiRequest for other endpoints)
- [DONE] `pages/dashboard/products/new.js`
- [DONE] `pages/dashboard/service/event-reviews/index.js`

**Dashboard subscriptions (3 files) — ALL DONE (batch 003):**
- [DONE] `pages/dashboard/subscriptions/index.js`
- [DONE] `pages/dashboard/subscriptions/marketplace.js`
- [DONE] `pages/dashboard/subscriptions/verified.js`

**Dashboard users/websites (8 files) — ALL DONE (batch 003):**
- [DONE] `pages/dashboard/users/verified.js`
- [DONE] `pages/dashboard/websites/admin.js`
- [DONE] `pages/dashboard/websites/manage/[id].js`
- [DONE] `pages/dashboard/websites/mine.js`
- [DONE] `pages/dashboard/websites/new.js`
- [DONE] `pages/dashboard/websites/payments.js`
- [DONE] `pages/dashboard/websites/settings.js`
- [DONE] `pages/dashboard/websites/subscription.js`

**Non-dashboard pages (4 files) — ALL DONE (batch 005):**
- [DONE] `pages/help/contact.js` (GET → getCurrentUser; kept authApiRequest for other)
- [DONE] `pages/products/[id].js` (GET → getCurrentUser; kept authApiRequest for other)
- [DONE] `pages/profile/edit.js` (GET → getCurrentUser; PATCH → explicit /api/v2/users/me)

**Components/modules (5 files) — ALL DONE (batch 005):**
- [DONE] `components/dashboard/widgets/OnboardingWidget.js` (clean swap)
- [DONE] `components/subscriptions/steps/ApplicationStep.js` (PATCH → explicit /api/v2/users/me)
- [DONE] `modules/applications/components/application-form/ApplicationFormContext.js` (clean swap)
- [DONE] `modules/dashboard/components/widgets/items/OnboardingWidget.js` (clean swap)
- [DONE] `modules/users/components/VerificationHub.js` (PATCH → explicit /api/v2/users/me)

### Pattern B: `getApiUrl('users/...')` with raw fetch (6 callers)
These use `fetch(getApiUrl('users/me'))` directly (not `authApiRequest`).
Replacement: `import { getCurrentUser } from 'lib/users/api'` or `getPublicArtists()`.

- [DONE] `components/FeaturedArtist.js` (→ `getPublicArtists()`)
- [DONE] `pages/events/[id].js` (→ `getCurrentUser()`)
- [DONE] `pages/events/claim/[token].js` (→ `getCurrentUser()`)
- [DONE] `pages/profile/[id].js` (→ `getCurrentUser()`)
- [DONE] `pages/profile/setup.js` (GET → `getCurrentUser()`; PATCH → explicit v2)

### Pattern C: Non-`/me` legacy users endpoints (3 callers) — ALL DONE (batch 007)
- [DONE] `pages/profile-completion.js` (GET → `/api/v2/users/me/completion`; PATCH → `/api/v2/users/me/complete-profile`)
- [DONE] `pages/user-type-selection.js` (POST → `/api/v2/users/me/select-user-type`)

**Backend:** Added `PATCH /me/complete-profile` and `POST /me/select-user-type` to v2 users module.
**Shim removed:** `authApiRequest` in `lib/apiUtils.js` no longer has `users/me` redirect or envelope unwrapping.

### Missed callers found during live testing (batch 007b)
These used `API_ENDPOINTS.USERS_ME` (a constant) or `getApiUrl('api/users/me')` instead of
the literal string `'users/me'`, so they were invisible to our original grep.
- [DONE] `components/Header.js` (→ `getCurrentUser()`) — runs on EVERY page, was blocking dashboard
- [DONE] `pages/search.js` (→ `getCurrentUser()`)
- [DONE] `pages/wholesale-application.js` (→ `getCurrentUser()`)

### `/users` domain: COMPLETE (67/67 callers migrated, shim removed)

## 9) Batch Log

### Batch 000 (Setup)
- Scope: Create migration state control file.
- Changes: Added `docs/MIGRATION_STATE.md`.
- Verification: N/A (planning-only).
- Result: Ready to define first execution batch.

### Batch 001 (users/me GET — dashboard catalog pages)
- Scope: 10 files in `pages/dashboard/catalog/`
- Edit: Replace `authApiRequest('users/me')` → `getCurrentUser()` from `lib/users/api`
- Files changed:
  1. `pages/dashboard/catalog/addons/etsy.js`
  2. `pages/dashboard/catalog/addons/tiktok.js`
  3. `pages/dashboard/catalog/addons/walmart.js`
  4. `pages/dashboard/catalog/addons/wayfair.js`
  5. `pages/dashboard/catalog/admin/index.js`
  6. `pages/dashboard/catalog/categories/index.js`
  7. `pages/dashboard/catalog/collections/index.js`
  8. `pages/dashboard/catalog/import-export/index.js`
  9. `pages/dashboard/catalog/products/index.js`
  10. `pages/dashboard/catalog/products/new.js`
- Legacy grep (initial): 3 remaining (tiktok-admin, walmart-admin, wayfair-admin)
- Batch 001b: added those 3 admin pages (same edit pattern)
- Legacy grep (final): 0 remaining in `pages/dashboard/catalog/`
- Build: `npm run build` exit code 0, clean
- No files outside allowlist changed
- Result: PASS — catalog directory fully migrated for users/me

### Batch 002 (users/me GET — commerce + communications + CRM)
- Scope: 10 files across `pages/dashboard/commerce/`, `communications/`, `crm/`
- Edit: Replace `authApiRequest('users/me')` → `getCurrentUser()` from `lib/users/api`
- Files changed:
  1. `pages/dashboard/commerce/all-applications/index.js`
  2. `pages/dashboard/commerce/applicants/index.js`
  3. `pages/dashboard/commerce/marketplace-applications.js`
  4. `pages/dashboard/commerce/marketplace.js`
  5. `pages/dashboard/commerce/shipping-labels.js`
  6. `pages/dashboard/communications/articles/index.js`
  7. `pages/dashboard/crm/analytics.js`
  8. `pages/dashboard/crm/forms.js`
  9. `pages/dashboard/crm/index.js`
  10. `pages/dashboard/crm/send-campaign.js`
- Legacy grep: 0 remaining in all 3 directories
- Build: `npm run build` exit code 0, clean
- Result: PASS

### Batch 003 (users/me GET — events + subscriptions + users/websites)
- Scope: 18 files across `pages/dashboard/events/`, `subscriptions/`, `users/`, `websites/`
- Edit: Replace `authApiRequest('users/me')` → `getCurrentUser()` from `lib/users/api`
- Files changed: 18 (7 events + 3 subscriptions + 1 users + 7 websites)
- Legacy grep: 0 remaining in all 4 directories
- Remaining in `pages/dashboard/`: 8 files (the "other" group)
- Build: `npm run build` exit code 0, clean
- Result: PASS

### Batch 004 (users/me GET — dashboard other: index, inventory, marketing, products, event-reviews)
- Scope: 8 files in `pages/dashboard/` (remaining dashboard pages)
- Edit: Replace `authApiRequest('users/me')` → `getCurrentUser()` from `lib/users/api`
- Note: 5 of 8 files also use `authApiRequest` for non-users endpoints — kept that import, added `getCurrentUser` alongside
- Files changed: 8
- Legacy grep: 0 remaining in entire `pages/dashboard/`
- Build: `npm run build` exit code 0, clean
- Result: PASS — ALL dashboard pages fully migrated for users/me

### Batch 005 (users/me — remaining non-dashboard + components, GET + PATCH)
- Scope: 9 files (4 non-dashboard pages + 5 components/modules)
- Edit: GET callers → `getCurrentUser()`. PATCH callers → explicit `/api/v2/users/me` path.
- Files changed: 9
- Legacy grep: 0 `authApiRequest('users/me')` calls remaining in ENTIRE codebase
- Build: `npm run build` exit code 0, clean
- Result: PASS — **Pattern A fully complete (55/55 files)**
- Note: `lib/apiUtils.js` still contains a backward-compat shim routing `users/me` → v2. Can be removed once Pattern B is done.

### Batch 006 (Pattern B — getApiUrl('users/...') with raw fetch, 6 files)
- Scope: 6 files using raw `fetch(getApiUrl('users/...'))` instead of `authApiRequest`
- Edit: GET → `getCurrentUser()` or `getPublicArtists()`. PATCH → explicit `/api/v2/users/me`.
- Files changed:
  1. `components/FeaturedArtist.js` (→ `getPublicArtists()`)
  2. `pages/events/[id].js` (→ `getCurrentUser()`)
  3. `pages/events/claim/[token].js` (→ `getCurrentUser()`)
  4. `pages/profile/[id].js` (→ `getCurrentUser()`)
  5. `pages/profile/setup.js` (GET → `getCurrentUser()`; PATCH → explicit v2 path)
- Legacy grep: 0 `getApiUrl('users/` calls remaining outside `lib/`
- Build: `npm run build` exit code 0, clean
- Result: PASS — **Pattern B complete (6/6 files)**

### Batch 007 (users — Pattern C + shim removal)
- Scope: 2 frontend files + 1 backend route file + 1 lib shim
- Backend:
  - Added `PATCH /me/complete-profile` to `api-service/src/modules/users/routes.js` (uses profileService)
  - Added `POST /me/select-user-type` to `api-service/src/modules/users/routes.js` (uses userService.updateUserType)
- Frontend:
  1. `pages/profile-completion.js` (3 legacy calls → v2: GET/me/completion, PATCH/me/complete-profile)
  2. `pages/user-type-selection.js` (1 legacy call → v2: POST/me/select-user-type)
- Shim removal: `lib/apiUtils.js` — removed `users/me` redirect and envelope unwrapping from `authApiRequest`
- Legacy grep: 0 `authApiRequest('users/` calls remaining across all frontend
- Build: `npm run build` exit code 0, clean
- Result: PASS — **/users domain COMPLETE (64/64 callers from original inventory)**

### Batch 007b (live fix — missed constant/indirect callers)
- Root cause: original grep used literal `'users/me'` and missed `API_ENDPOINTS.USERS_ME` constant refs
  and `getApiUrl('api/users/me')` variant.
- Files changed:
  1. `components/Header.js` (→ `getCurrentUser()`) — **critical: runs on every page**
  2. `pages/search.js` (→ `getCurrentUser()`)
  3. `pages/wholesale-application.js` (→ `getCurrentUser()`)
- Safety: updated `API_ENDPOINTS.USERS_ME` value to `/api/v2/users/me` as fallback
- Build: `npm run build` exit code 0, clean
- Result: PASS — **actual total: 67/67 callers migrated**
- Lesson: future domain greps must also check `API_ENDPOINTS.*` constants and `getApiUrl('api/...')` variants

### Step C: /users constant cleanup
- `API_ENDPOINTS.USERS_ME` — 0 callers, deleted
- `API_ENDPOINTS.USERS_PROFILE` — 0 callers, deleted
- Left comment in dictionary: "Users — migrated to helper functions in lib/users/api.js"
- Build: `npm run build` exit code 0, clean
- Result: PASS — `/users` domain fully cleaned

### Batch 008 (/vendor domain — full migration)
- Scope: 4 frontend files + 1 backend route file (commerce module)
- Backend: Added 6 routes to `api-service/src/modules/commerce/routes.js` under `/vendor/`:
  - `GET /vendor/settings`
  - `POST /vendor/stripe-account`
  - `GET /vendor/stripe-onboarding`
  - `POST /vendor/subscription-preferences`
  - `GET /vendor/shipping-preferences`
  - `POST /vendor/shipping-preferences`
- Frontend:
  1. `pages/vendor/onboarding/complete.js` (1 call → v2, unwrap `.data.settings`)
  2. `pages/vendor/onboarding/refresh.js` (1 call → v2, unwrap `.data.onboarding_url`)
  3. `modules/users/components/PaymentSettings.js` (4 calls → v2, unwrap envelope)
  4. `modules/users/components/ShippingSettings.js` (2 calls → v2, unwrap `.data.preferences`)
- Step C: No `API_ENDPOINTS.VENDOR*` constants existed
- Legacy grep: 0 `vendor/` calls remaining across all frontend
- Build: `npm run build` exit code 0, clean
- Result: PASS — **/vendor domain COMPLETE (8/8 calls migrated)**

### Batch 009 (/admin — Group 1: Notifications)
- Scope: 1 backend route + 2 frontend files
- Backend: Added `GET /admin/notifications` to `api-service/src/modules/system/routes.js`
- Frontend:
  1. `pages/dashboard/index.js` (unwrap `.data.notifications`)
  2. `modules/dashboard/components/layout/DashboardShell.js` (unwrap `.data.notifications`)
- Legacy grep: 0 `admin/notifications` calls remaining
- Build: `npm run build` exit code 0, clean
- Result: PASS — **admin notifications done (2/16 admin calls migrated)**

### Batch 010 (/admin — Groups 2-4: Promotions, Sales, Coupons, Promoter Onboarding, Users)
- Scope: 12 backend routes + 3 frontend files
- Backend: Added to `api-service/src/modules/system/routes.js`:
  - `GET /admin/promotions/all`, `POST /admin/promotions/create`, `PUT /admin/promotions/:id`, `POST /admin/promotions/:id/invite-vendors`
  - `GET /admin/sales/all`, `POST /admin/sales/create-sitewide`, `PUT /admin/sales/:id`
  - `GET /admin/coupons/all`, `POST /admin/coupons`, `PUT /admin/coupons/:id`
  - `GET /admin/promoters/check-email`, `POST /admin/promoters/create`
- Frontend:
  1. `modules/marketing/components/AdminPromotions.js` — 11 calls → `/api/v2/system/admin/*` + unwrap v2 envelope
  2. `modules/marketing/components/AddPromoter.js` — 2 calls → `/api/v2/system/admin/promoters/*` + unwrap
  3. `modules/catalog/components/CatalogImportExport.js` — 1 call `admin/users` → `/api/v2/users` + unwrap `.data`
- Step C (Domain cleanup): No `API_ENDPOINTS.ADMIN*` constants found — clean
- Legacy grep: 0 `authApiRequest('admin/...')` calls remaining, 0 `API_ENDPOINTS.ADMIN*` constants
- Build: `npm run build` exit code 0, clean
- Result: PASS — **admin domain COMPLETE (16/16 calls migrated)**

### Batch 011 (/checkout — full migration)
- Scope: 1 new service file + 5 backend routes + 3 frontend files
- Backend:
  - Created `api-service/src/modules/commerce/services/checkout.js` with 9 helper functions migrated from legacy
  - Added 5 routes to `api-service/src/modules/commerce/routes.js`:
    - `POST /checkout/calculate-totals`
    - `POST /checkout/create-payment-intent`
    - `POST /checkout/confirm-payment`
    - `GET /checkout/validate-coupon/:code`
    - `POST /checkout/get-auto-discounts`
- Frontend:
  1. `pages/checkout.js` — 3 calls → `/api/v2/commerce/checkout/*` + unwrap `.data`
  2. `pages/checkout/success.js` — 1 call → `/api/v2/commerce/checkout/confirm-payment` + unwrap `.data`
  3. `hooks/useCoupons.js` — 3 calls → `/api/v2/commerce/checkout/*` + unwrap `.data`
- Step C: No `API_ENDPOINTS.CHECKOUT*` constants found — clean
- Legacy grep: 0 `checkout/` calls remaining
- Build: `npm run build` exit code 0, clean
- Result: PASS — **checkout domain COMPLETE (7/7 calls migrated)**

### Batch 012 (/cart — full migration)
- Scope: 11 backend routes + 7 frontend files (19 calls)
- Backend: Added 11 cart routes to `api-service/src/modules/commerce/routes.js`:
  - `GET /cart` — list user carts
  - `GET /cart/unified` — unified multi-source cart view
  - `GET /cart/collections` — saved collections
  - `GET /cart/:cartId/items` — cart items with product/vendor joins
  - `POST /cart` — create cart (auth optional, supports guest_token)
  - `PUT /cart/:id` — update cart status
  - `POST /cart/:cartId/items` — add item to cart
  - `PUT /cart/:cartId/items/:itemId` — update item quantity/price
  - `DELETE /cart/:cartId/items/:itemId` — remove item
  - `POST /cart/saved` — save item for later
  - `POST /cart/add` — enhanced add-to-cart (auto-creates cart, merges duplicates)
- Frontend:
  1. `components/Header.js` — 2 calls → `/api/v2/commerce/cart/*` + unwrap `.data`. Removed `API_ENDPOINTS` import.
  2. `pages/products/[id].js` — 3 calls → `/api/v2/commerce/cart/*` + unwrap `.data`
  3. `pages/cart/index.js` — 8 calls → `/api/v2/commerce/cart/*` + unwrap `.data`
  4. `pages/cart/unified.js` — 3 calls → `/api/v2/commerce/cart/*` + unwrap `.data`
  5. `pages/artist-storefront/index.js` — 1 call → `/api/v2/commerce/cart/add`
  6. `pages/artist-storefront/product.js` — 1 call → fixed broken relative `fetch('cart/add')` to `getApiUrl('api/v2/commerce/cart/add')`
  7. `pages/artist-storefront/products.js` — 1 call → fixed broken relative `fetch('cart/add')` to full v2 URL
- Step C: Removed `API_ENDPOINTS.CART` and `API_ENDPOINTS.CART_COUNT` from `lib/apiUtils.js`
- Legacy grep: 0 legacy `/cart` calls remaining
- Build: `npm run build` exit code 0, clean
- PM2: restarted
- Result: PASS — **cart domain COMPLETE (19/19 calls migrated)**

### Batch 013 (/subscriptions — full migration, 2 sub-batches)
- Scope: New backend routes file + 3 configs + 8 frontend files (21 calls)
- Sub-batch 1 (backend + config + dynamic components):
  - Created `api-service/src/modules/commerce/routesSubscriptions.js` with:
    - Verified: GET /verified/subscription/my, POST /select-tier, GET /terms-check, POST /terms-accept, POST /cancel, GET /marketplace-applications, POST /marketplace-applications/submit
    - Shipping: GET /shipping/subscription/my, POST /select-tier, GET /terms-check, POST /terms-accept, POST /cancel, GET /vendor-address, PUT /preferences, GET /standalone-labels, POST /create-standalone-label
    - Marketplace: Aliased to verified routes with marketplace context
  - Mounted at `/subscriptions` in commerce routes
  - Updated 3 config files with `subscriptionApiBase`:
    - `modules/users/components/verified/verifiedConfig.js`
    - `modules/commerce/components/shipping/shippingLabelsConfig.js`
    - `modules/commerce/components/marketplace/marketplaceConfig.js`
  - ChecklistController, TermsStep, CardStep automatically use v2 via config
- Sub-batch 2 (hardcoded callers):
  - `modules/users/components/VerificationHub.js` — 6 calls updated
  - `components/VerificationManager.js` — 4 calls updated
  - `components/subscriptions/dashboards/ShippingDashboard.js` — 3 calls updated
  - `lib/subscriptions/api.js` — 2 calls updated
  - `modules/subscriptions/components/SubscriptionOverview.js` — 1 call updated
- Step C: Removed SUBSCRIPTIONS_MARKETPLACE, SUBSCRIPTIONS_SHIPPING, SUBSCRIPTIONS_WHOLESALE from API_ENDPOINTS
- Discovery: `/wholesale` domain found (3 calls in pages/wholesale-application.js) — added to tracker
- Verification: grep clean, build clean, PM2 restarted

### Batch 014 (/products + /curated — full migration, 2 sub-batches)
- Scope: 28 legacy calls across 16 frontend files + backend enhancements + 2 constants removed
- Sub-batch 1 (public + dashboard product listing):
  - Group 1 — 10 public callers: `products/all` → `api/v2/catalog/public/products`, `data.products` → `data.data`
    - `pages/index.js`, `pages/marketplace.js`, `pages/artist-storefront/index.js`, `pages/profile/[id].js`,
      `pages/artist/[id]/products.js`, `pages/custom-sites/subdomain-404.js`, `next-sitemap.config.js`,
      `components/FeaturedArtist.js`, `components/RandomProductCarousel.js`, `modules/shared/ProfileDisplay.js`
  - Group 2 — 3 dashboard callers:
    - `pages/dashboard/products/index.js` — `products/all` → `api/v2/catalog/products?view=all`, `products/my` → `api/v2/catalog/products`, `products/bulk-delete` → `api/v2/catalog/products/bulk-delete`
    - `modules/dashboard/components/widgets/items/MyProductsWidget.js` + `components/dashboard/widgets/MyProductsWidget.js` — `API_ENDPOINTS.PRODUCTS/my` → direct v2 path
- Sub-batch 2 (curated + variations):
  - Group 3 — Curated routes:
    - Enhanced v2 `GET /public/products` with `marketplace_category` query param filter
    - Enhanced v2 `GET /public/products/:id` with full family structure (parent/child), variation types/options, shipping data
    - Added `getShipping()`, `getVariationData()`, `marketplaceCategory` filter to `productService`
    - `pages/category/[id].js` — `api/curated/art/products/all?category_id=` → `api/v2/catalog/public/products?marketplace_category=art&category_id=`
    - `pages/products/[id].js` — eliminated art+crafts fallback cascade; single `api/v2/catalog/public/products/:id` call for both SSR and client
  - Group 4 — Variations + upload (7 calls in `lib/catalog/api.js`):
    - Added 7 v2 routes to catalog module: GET/POST/DELETE variation types, GET values, POST values, POST product-variation link, POST bulk upload
    - Updated all 7 functions in `lib/catalog/api.js` to use `CATALOG_BASE` paths and unwrap v2 envelopes
- Step C: Removed `API_ENDPOINTS.PRODUCTS` and `API_ENDPOINTS.MARKETPLACE_PRODUCTS` from `lib/apiUtils.js`
- Note: `luca/` app has ~8 legacy `/api/products/` calls — separate app, out of scope for this migration
- Verification: grep clean (0 legacy `products/all`, `api/curated`, `API_ENDPOINTS.PRODUCTS` in frontend), build clean, PM2 restarted

### Batch 015 (/reviews — full migration)
- Scope: 1 new backend routes file + 6 frontend files (18 calls)
- Backend:
  - Created `api-service/src/modules/content/routesReviews.js` with 9 endpoints:
    - `GET /reviews` — list reviews (public)
    - `GET /reviews/summary` — review summary (public)
    - `GET /reviews/check-eligibility` — eligibility check (auth)
    - `GET /reviews/event-token/:eventId` — get event review token (auth, promoter)
    - `POST /reviews/validate-token` — validate event review token (auth)
    - `POST /reviews` — create review (auth)
    - `POST /reviews/:id/helpful` — helpful vote (auth)
    - `POST /reviews/admin/pending` — create pending review (admin)
    - `GET /reviews/admin/pending` — list pending reviews (admin)
  - Mounted at `/reviews` in `api-service/src/modules/content/routes.js`
  - Full path: `/api/v2/content/reviews/*`
- Frontend:
  1. `pages/products/[id].js` — 2 SSR calls → v2 + envelope unwrap
  2. `pages/events/[id].js` — 2 SSR calls → v2 + envelope unwrap
  3. `components/ProductReviews.js` — 5 calls (list, summary, eligibility, create, helpful) → v2 + envelope unwrap
  4. `modules/events/components/EventReviews.js` — 6 calls (validate-token, eligibility, list, summary, create, helpful) → v2 + envelope unwrap
  5. `modules/events/components/AdminEventReviews.js` — 2 calls (GET + POST admin/pending) → v2 + envelope unwrap
  6. `modules/events/components/EventsIOwn.js` — 1 call (event-token) → v2 + envelope unwrap
- Step C: No `API_ENDPOINTS.REVIEW*` constants existed — clean
- Legacy grep: 0 `/api/reviews` calls in frontend
- Build: `npm run build` exit code 0, clean
- PM2: restarted
- Result: PASS — **reviews domain COMPLETE (18/18 calls migrated)**

### Batch 016 (/articles — full v2 port, NOT a passthrough)
- Scope: 1 new backend routes file + 15 frontend files + 1 API client library (~24 calls)
- Backend:
  - Created `api-service/src/modules/content/routesArticles.js` — full v2 port of legacy `routes/articles.js` (2080 lines → proper v2 implementation with `{ success, data }` envelopes, `requireAuth`/`requirePermission('manage_content')` middleware, and `optionalAuth` helper for public endpoints)
  - Replaced legacy passthrough `router.use('/articles', legacyArticlesRouter)` in `content/routes.js` with `require('./routesArticles')`
  - Endpoints ported: GET /, GET /tags, GET /tags/:slug, POST /tags, PUT /tags/:id, DELETE /tags/:id, GET /series, GET /series/:slug, POST /series, GET /topics, GET /topics/:slug, POST /topics, PUT /topics/:id, DELETE /topics/:id, GET /topics/:id/articles, POST /, PUT /:id, DELETE /:id, POST /:id/view, GET /by-id/:id, GET /:slug, POST /upload
- Frontend callers updated:
  1. `pages/articles/[slug].js` — 3 calls → v2 + envelope unwrap
  2. `pages/articles/index.js` — 2 calls → v2 + envelope unwrap
  3. `pages/articles/tag/[slug].js` — 2 calls → v2 + envelope unwrap
  4. `pages/articles/author/[username].js` — 1 call → v2 + envelope unwrap
  5. `pages/articles/archive/[year]/[month].js` — 1 call → v2 + envelope unwrap
  6. `pages/topics/[slug].js` — 2 calls → v2 + envelope unwrap
  7. `pages/topics/index.js` — 1 call → v2 + envelope unwrap
  8. `pages/series/[slug].js` — 1 call → v2 + envelope unwrap
  9. `pages/news/artist-news.js` — 2 calls → v2 + envelope unwrap
  10. `pages/news/community-news.js` — 2 calls → v2 + envelope unwrap
  11. `pages/news/promoter-news.js` — 2 calls → v2 + envelope unwrap
  12. `pages/help/[section]/index.js` — 1 call → v2 + envelope unwrap
  13. `pages/help/[section]/[slug].js` — 2 calls → v2 + envelope unwrap
  14. `components/search/SearchModal.js` — 1 call → v2 + envelope unwrap (also fixed broken bare `articles/by-id/` path)
  15. `components/search/SearchResults.js` — 1 call → v2 + envelope unwrap (also fixed broken bare `articles/by-id/` path)
  - `lib/content/api.js` — updated all 17 functions with `unwrap()` helper and `extractError()` for v2 envelope handling
- Step C: No `API_ENDPOINTS.ARTICLE*` constants existed — clean
- Legacy grep: 0 `api/articles` calls in frontend
- Build: `npm run build` exit code 0, clean
- PM2: restarted
- Result: PASS — **articles domain COMPLETE (~24 calls migrated, legacy passthrough eliminated)**

### Batch 017 (/media — smart media URL migration)
- Scope: 10 frontend files + 2 .env files + Step C cleanup
- No backend route changes — v2 media module already dual-mounted at `/api/v2/media` and `/api/media`
- Key finding: `SMART_MEDIA_BASE_URL` was pointing to `/api/images` which was never a mounted Express route. Updated to `/api/v2/media/images` (matching the v2 module's `/images/:mediaId` smart serving endpoint).
- Architecture clarification:
  - `/api/v2/media/images/:mediaId` = smart serving (numeric media ID, format negotiation, size variants, 1-year cache)
  - `/api/v2/media/serve/*` = direct file serving (file path, raw stream, 1-hour cache)
  - `getSmartMediaUrl()` in `lib/config.js` constructs `SMART_MEDIA_BASE_URL/{value}?size={size}`
  - `mediaUtils.js` backend utility checks `pending_images` table: if processed → smart URL, if pending → temp file fallback
- .env updates (user applied):
  - `api-service/.env`: `SMART_MEDIA_BASE_URL=https://staging-api.brakebee.com/api/v2/media/images`
  - `.env`: `NEXT_PUBLIC_SMART_MEDIA_BASE_URL=https://staging-api.brakebee.com/api/v2/media/images`
- Frontend files updated (10 files, ~15 call sites):
  1. `components/RandomProductCarousel.js` — fixed double-wrap bug (`getSmartMediaUrl('/api/media/serve/...')`) → `getSmartMediaUrl(value)`
  2. `components/index/VisualDiscoveryBand.js` — `getApiUrl('api/media/serve/...')` → `getSmartMediaUrl(value)` + added import
  3. `pages/artist-storefront/index.js` — `${config.API_BASE_URL}/api/media/serve/...` → `getSmartMediaUrl(value)` + added import
  4. `pages/artist-storefront/product.js` — `getApiUrl('api/media/serve/...')` and bare strings → `resolveMediaUrl()` helper + added import
  5. `pages/404.js` — bare `api/media/serve/...` → `getSmartMediaUrl(value)` + added import
  6. `modules/catalog/components/addons/TikTokConnector.js` — inline ternary → `getSmartMediaUrl(imgUrl)` + added import
  7. `modules/catalog/components/addons/EtsyConnector.js` — inline ternary → `getSmartMediaUrl(imgUrl)` + added import
  8. `modules/catalog/components/ProductCuration.js` — `/api/media/serve/...` → `getSmartMediaUrl(value)` + added import
  9. `modules/catalog/components/CategoryManagement.js` — 2 inline ternaries → `getSmartMediaUrl(value)` + added import
  10. `modules/catalog/components/product-form/sections/ImagesSection.js` — `/api/media/serve/...` else branch → `getSmartMediaUrl(value)` + added import
- Step C: Removed orphaned `API_ENDPOINTS.MEDIA` and `API_ENDPOINTS.IMAGES` from `lib/apiUtils.js`
- Legacy grep: 0 `api/media/serve` calls in frontend code
- Build: `npm run build` exit code 0, clean
- PM2: restarted all
- Post-batch cleanup:
  - Deleted `api-service/src/examples/media-integration-example.js` (taught wrong `/api/media/serve/` pattern)
  - Removed hardcoded URL fallback from `lib/config.js` `SMART_MEDIA_BASE_URL` (now `|| ''` — env is source of truth)
  - Added SUPERSEDED banner to `docs/Old Docs/api/public/media-proxy.md`
  - Removed hardcoded URL fallbacks from `api-service/src/routes/media.js` (2) and `api-service/src/routes/admin-marketplace.js` (1)
- Result: PASS — **media domain COMPLETE (10 files, ~15 call sites migrated)**

## 10) Reusable Worker Prompt Template

Use this when delegating a single batch:

1. Read `docs/MIGRATION_STATE.md` first.
2. Scope is ONLY: `<ROUTE_DOMAIN>`.
3. You may edit ONLY these files: `<ALLOWLIST>`.
4. Forbidden: package/tooling/security/global helper refactors.
5. Replace legacy endpoint usage with v2 equivalents.
6. If a required change is outside allowlist, STOP and report blocker.
7. Return:
   - files changed
   - exact endpoint replacements made
   - verification output (`legacy grep`, build/test notes)
   - any blockers.

## 11) Reusable Verifier Prompt Template

1. Read `docs/MIGRATION_STATE.md`.
2. Verify only batch `<BATCH_ID>` for domain `<ROUTE_DOMAIN>`.
3. Confirm:
   - changes stayed in allowlist
   - legacy caller count for domain
   - build/smoke results
   - unresolved risks.
4. Return PASS/FAIL with 1-paragraph evidence.


Use this prompt with a second agent to build legacy caller inventories.  
This subagent is discovery-only and must not edit non-inventory files.

Copy/paste:

1. Read `docs/MIGRATION_STATE.md` first.
2. Task: Build a legacy endpoint caller inventory for any TODO domain in the Route Domain Tracker (Section 5).
3. Search scope:
   - frontend: pages/, components/, modules/, hooks/, lib/ callers
   - API helper usage (`authApiRequest`, `apiRequest`, `getApiUrl`, `fetch`)
4. Output format (for each domain):
   - total legacy caller count
   - exact file list
   - exact endpoint strings found
   - confidence notes (high/medium/low)
5. Constraints:
   - DO NOT edit application code.
   - Only update `docs/MIGRATION_STATE.md` in a new section named `Legacy Caller Inventory`.
   - Do not add package/tooling/config/security changes.
6. Update `Route Domain Tracker` counts based on findings.
7. Return a concise report with:
   - domains scanned
   - counts by domain
   - top 10 highest-risk legacy callers (by centrality/usage frequency).

Verifier check for this subagent run:
- Diff should include only `docs/MIGRATION_STATE.md`.
- No runtime code files changed.

---

### Batch 018 — `/applications` (2026-02-18)

**Scope**: All legacy `/api/applications/*` frontend calls → `/api/v2/applications/*`.

**Backend** (api-service/src/modules/applications/routes.js):
Added 15 new v2 endpoints porting logic from legacy `routes/applications.js`:
- `GET /events/:eventId/stats` (public)
- `POST /events/:eventId/apply` (artist)
- `POST /apply-with-packet` (artist)
- `PATCH /:id` (artist update before deadline)
- `POST /:id/addon-requests` (artist)
- `POST /:id/create-payment-intent` (artist)
- `POST /:id/confirm-payment` (artist)
- `GET /events/:eventId/applications` (promoter)
- `PUT /:id/status` (promoter)
- `PUT /:id/bulk-accept` (promoter, per-app)
- `GET /payment-intent/:paymentIntentId` (auth)
- `GET /payment-dashboard/:eventId` (promoter)
- `POST /payment-reminder` (promoter)
- `POST /:id/payment-received` (promoter)

All endpoints use `requireAuth` (replacing `verifyToken`), return `{ success, data }` envelopes.

**Frontend — lib/applications/api.js** (9 functions updated):
- `getEventApplicationStats` → `/api/v2/applications/events/:eventId/stats` + envelope unwrap
- `applyToEvent` → `/api/v2/applications/events/:eventId/apply` + remapped `data.data` → `application`
- `applyWithPacket` → `/api/v2/applications/apply-with-packet` + remapped
- `addAddonRequest` → `/api/v2/applications/:id/addon-requests`
- `createApplicationPaymentIntent` → `/api/v2/applications/:id/create-payment-intent` + `data.data.client_secret`
- `confirmApplicationPayment` → `/api/v2/applications/:id/confirm-payment`
- `updateApplication` → `/api/v2/applications/:id` (PATCH)
- `fetchEventApplications` → `/api/v2/applications/events/:eventId/applications` + `data.data.applications`
- `updateApplicationStatus` → `/api/v2/applications/:id/status`

**Frontend — direct callers** (5 calls in 4 files):
- `pages/event-payment/[payment_intent_id].js` → `api/v2/applications/payment-intent/:id` + envelope unwrap
- `pages/event-payment/success.js` → same
- `modules/applications/components/applications-received/PaymentDashboard.js` (3 calls):
  - payment-dashboard → `api/v2/applications/payment-dashboard/:eventId` + `json.data.summary`
  - payment-reminder → `api/v2/applications/payment-reminder`
  - payment-received → `api/v2/applications/:id/payment-received`
- `modules/applications/components/applications-received/BulkAcceptanceInterface.js` → `api/v2/applications/:id/bulk-accept`

**Step C cleanup**: Removed orphaned `API_ENDPOINTS.APPLICATIONS` from `lib/apiUtils.js`.

**Verification**: `grep 'api/applications/' pages/ modules/ lib/ components/` → 0 legacy hits. Build clean.

### Batch 019 — `/shipping` standalone (2026-02-18)

**Scope**: All legacy `/api/shipping/*` frontend calls → `/api/v2/commerce/shipping/*`.

**Backend** (api-service/src/modules/commerce/routes.js):
Added `POST /shipping/calculate-cart-shipping` — full port of cart/product shipping rate calculation from legacy `routes/shipping.js`. Handles test packages, free/flat_rate/calculated methods, multi-product cart, vendor address lookup, carrier rate API.
Label serving endpoint already existed: `GET /shipping/labels/:filename`.

**Frontend** (5 call sites in 4 files):
1. `pages/dashboard/products/[id].js` — `api/shipping/calculate-cart-shipping` → `api/v2/commerce/shipping/calculate-cart-shipping` + `json.data` unwrap
2. `modules/catalog/components/product-form/sections/ShippingSection.js` — same endpoint + unwrap
3. `components/subscriptions/dashboards/ShippingDashboard.js` — same endpoint + unwrap
4. `components/subscriptions/dashboards/ShippingDashboard.js` — label URL → `api/v2/commerce/shipping/labels/`
5. `modules/commerce/components/ShippingHub.js` — label URL → `/api/v2/commerce/shipping/labels/`

**Step C**: No `API_ENDPOINTS.SHIPPING*` constants existed.
**Verification**: 0 legacy `api/shipping/` calls in frontend. Build clean. `POST` returns 401 (auth working).

### Batch 020 — `/tickets` (2026-02-18)

**Scope**: 7 legacy `api/tickets/*` calls across 4 frontend files. 6 customer-facing endpoints (no admin).

**Step A — Backend**: Added 6 endpoints to `api-service/src/modules/system/routes.js`:
1. `POST /tickets` — create ticket (optional auth via inline JWT check for guests)
2. `GET /tickets/my` — user's tickets (requireAuth)
3. `GET /tickets/my/notifications` — notification counts (requireAuth)
4. `GET /tickets/:id` — single ticket with messages (requireAuth)
5. `POST /tickets/:id/messages` — add message to ticket (requireAuth)
6. `PATCH /tickets/:id/close` — close own ticket (requireAuth)

All return `{ success, data }` envelopes.

**Step B — Frontend** (7 calls, 4 files):
1. `pages/help/contact.js` — `POST api/tickets` → `api/v2/system/tickets`. Unwrap `data.data.ticket_number`.
2. `pages/help/tickets/index.js` — `GET api/tickets/my` → `api/v2/system/tickets/my`. Unwrap `data.data?.tickets`.
3. `pages/help/tickets/[id].js` — 3 calls:
   - `GET api/tickets/:id` → `api/v2/system/tickets/:id`. Unwrap `data.data.ticket`, `data.data.messages`.
   - `POST api/tickets/:id/messages` → `api/v2/system/tickets/:id/messages`.
   - `PATCH api/tickets/:id/close` → `api/v2/system/tickets/:id/close`.
4. `pages/dashboard/index.js` — `GET api/tickets/my/notifications` → `api/v2/system/tickets/my/notifications`. Unwrap `data.data.notifications`.
5. `modules/dashboard/components/layout/DashboardShell.js` — same endpoint. Unwrap `ticketData.data.notifications`.

**Step C**: No `API_ENDPOINTS.TICKET*` constants existed.
**Verification**: 0 legacy `api/tickets/` calls in frontend. Build clean. `GET /my/notifications` returns 401 (auth working).

### Batch 021 — `/terms` (2026-02-18)

**Scope**: 6 legacy `api/terms/*` calls across 4 frontend files. 4 public/customer endpoints (admin already existed in v2).

**Step A — Backend**: Added 4 endpoints to `api-service/src/modules/system/routes.js` (placed before existing `GET /terms/:id` admin catch-all):
1. `GET /terms/current` — public, get current general terms
2. `GET /terms/type/:type` — public, get terms by subscription type (validated)
3. `GET /terms/check-acceptance` — requireAuth, check if user accepted current general terms
4. `POST /terms/accept` — requireAuth, accept terms version

All return `{ success, data }` envelopes.

**Step B — Frontend** (6 calls, 4 files):
1. `pages/policies/[type].js` — 2 calls: `api/terms/type/:type` → `api/v2/system/terms/type/:type`, `api/terms/current` → `api/v2/system/terms/current`. Added `const payload = data.data || data;` for safe unwrap (handles both v2 terms and other legacy policies in same handler).
2. `pages/terms-acceptance.js` — 2 calls: `GET api/terms/current` → `api/v2/system/terms/current` + `data.data` unwrap. `POST api/terms/accept` → `api/v2/system/terms/accept` + `result.success` check.
3. `pages/terms-of-service.js` — 1 call: `GET api/terms/current` → `api/v2/system/terms/current` + `data.data` unwrap.
4. `middleware/checklist.js` — 1 call: `GET api/terms/check-acceptance` → `api/v2/system/terms/check-acceptance`. Added `const termsData = termsJson.data || termsJson;` for safe unwrap.

**Step C**: No `API_ENDPOINTS.TERM*` constants existed.
**Verification**: 0 legacy `api/terms/` calls in frontend. Build clean. `GET /terms/current` returns real data. `GET /terms/check-acceptance` returns 401 (auth working).

### Batch 022 — `/dashboard-widgets` (2026-02-18)

**Scope**: 11 legacy `api/dashboard-widgets/*` calls across 6 frontend files + 6 orphaned API_ENDPOINTS constants.

**Step A — Backend**: Added 6 endpoints to `api-service/src/modules/system/routes.js`:
1. `GET /dashboard-widgets/layout` — get user's widget layout + auto-create shortcuts widget (requireAuth)
2. `POST /dashboard-widgets/layout` — save layout grid positions (requireAuth)
3. `GET /dashboard-widgets/widget-data/:widgetType` — get widget-specific data (requireAuth)
4. `POST /dashboard-widgets/shortcuts/add` — add shortcut with validation (requireAuth)
5. `POST /dashboard-widgets/shortcuts/remove` — remove shortcut by ID (requireAuth)
6. `POST /dashboard-widgets/remove-widget` — remove widget from dashboard (requireAuth)

All return `{ success, data }` envelopes. Helper functions (ensureShortcutsWidget, etc.) ported inline.

**Step B — Frontend** (11 calls, 6 files):
1. `modules/dashboard/components/widgets/WidgetGrid.js` — 2 calls: GET+POST layout → inline v2 paths. Unwrap `json.data.userLayout/adminLayout`.
2. `modules/dashboard/components/layout/SidebarMenu.js` — 3 calls: GET widget-data, POST shortcuts add/remove → inline v2 paths. Unwrap `result.data?.shortcuts`.
3. `modules/dashboard/components/widgets/items/ShortcutsWidget.js` — 2 calls: GET widget-data, POST shortcuts/remove → inline v2 paths. Unwrap `result.data?.shortcuts`.
4. `components/dashboard/widgets/ShortcutsWidget.js` — 2 calls: same as above.
5. `modules/dashboard/components/widgets/items/MyProductsWidget.js` — 1 call: POST remove-widget → inline v2 path.
6. `components/dashboard/widgets/MyProductsWidget.js` — 1 call: same as above.

All 6 files had `API_ENDPOINTS` import removed (no longer needed).

**Step C**: Removed 6 orphaned constants from `lib/apiUtils.js`: `DASHBOARD_WIDGETS_LAYOUT`, `DASHBOARD_WIDGETS_DATA`, `DASHBOARD_WIDGETS_ADD`, `DASHBOARD_WIDGETS_REMOVE`, `DASHBOARD_WIDGETS_SHORTCUT_ADD`, `DASHBOARD_WIDGETS_SHORTCUT_REMOVE`.
**Verification**: 0 legacy `api/dashboard-widgets/` calls or `API_ENDPOINTS.DASHBOARD_*` refs in frontend. Build clean. `GET /layout` returns 401 (auth working).

### Batch 023 — `/wholesale` (2026-02-18)

**Scope**: 3 legacy `api/subscriptions/wholesale/*` calls in 1 frontend file.

**Step A — Backend**: Added 3 endpoints to `api-service/src/modules/commerce/routesSubscriptions.js`:
1. `GET /wholesale/terms-check` — check user's wholesale terms acceptance status (requireAuth)
2. `POST /wholesale/terms-accept` — record terms acceptance (requireAuth)
3. `POST /wholesale/apply` — submit wholesale buyer application with validation (requireAuth)

All return `{ success, data }` envelopes. Full path: `/api/v2/commerce/subscriptions/wholesale/*`.

**Step B — Frontend** (3 calls, 1 file):
1. `pages/wholesale-application.js` — 3 calls:
   - `GET api/subscriptions/wholesale/terms-check` → `api/v2/commerce/subscriptions/wholesale/terms-check`. Added `const payload = terms.data || terms;` for safe unwrap.
   - `POST api/subscriptions/wholesale/terms-accept` → `api/v2/commerce/subscriptions/wholesale/terms-accept`.
   - `POST api/subscriptions/wholesale/apply` → `api/v2/commerce/subscriptions/wholesale/apply`.

**Step C**: No `API_ENDPOINTS.WHOLESALE*` constants existed.
**Verification**: 0 legacy `api/subscriptions/wholesale/` calls in frontend. Build clean. `GET /wholesale/terms-check` returns 401 (auth working).

### Batch 024 — `/payment-methods` (2026-02-18)

**Scope**: 6 legacy `api/payment-methods/*` and `api/users/payment-methods` calls across 2 frontend files.

**Step A — Backend**: Added 3 endpoints to `api-service/src/modules/commerce/routes.js`:
1. `GET /payment-methods` — list user's Stripe cards via stripe_customer_id lookup (requireAuth)
2. `POST /payment-methods/create-setup-intent` — create Stripe setup intent for card-on-file (requireAuth)
3. `POST /payment-methods/confirm-setup` — confirm card setup, set as default, update subscription record (requireAuth)

All return `{ success, data }` envelopes. Full path: `/api/v2/commerce/payment-methods/*`.

**Step B — Frontend** (6 calls, 2 files):
1. `modules/websites/components/WebsitePaymentSettings.js` — 3 calls:
   - `GET api/users/payment-methods` → `api/v2/commerce/payment-methods`. Unwrap `cardData.data?.paymentMethods`.
   - `POST api/payment-methods/create-setup-intent` → `api/v2/commerce/payment-methods/create-setup-intent`. Unwrap `intentPayload.setupIntent` via `intentData.data || intentData`.
   - `POST api/payment-methods/confirm-setup` → `api/v2/commerce/payment-methods/confirm-setup`. `data.success` check unchanged.
2. `components/subscriptions/steps/CardStep.js` — 3 calls:
   - `GET api/users/payment-methods` → `api/v2/commerce/payment-methods`. Unwrap `cardData.data?.paymentMethods`.
   - `POST api/payment-methods/create-setup-intent` → `api/v2/commerce/payment-methods/create-setup-intent`. Unwrap `payload.setupIntent` via `data.data || data`.
   - `POST api/payment-methods/confirm-setup` → `api/v2/commerce/payment-methods/confirm-setup`. `data.success` check unchanged.

**Step C**: No `API_ENDPOINTS.PAYMENT*` constants existed.
**Verification**: 0 legacy `api/payment-methods/` or `api/users/payment-methods` calls in frontend. Build clean. `GET /payment-methods` returns 401 (auth working).

### Batch 025 — `/leo` (2026-02-18)

**Scope**: 2 legacy `api/leo/search` calls. V2 leo module already had `POST /search` — no backend changes needed.

**Architecture note**: 3 search UI components (`SearchResults`, `SearchModal`, `SearchBar`) all call `/api/leo-search` which is a Next.js API proxy route (`pages/api/leo-search.js`). That proxy forwards to the Express API. Updating the proxy covers all 3.

**Step B — Frontend** (2 calls, 2 files):
1. `pages/api/leo-search.js` — `http://localhost:3001/api/leo/search` → `http://localhost:3001/api/v2/leo/search`.
2. `components/index/VisualDiscoveryBand.js` — `getApiUrl('api/leo/search')` → `getApiUrl('api/v2/leo/search')`.

Response shape unchanged — v2 leo `/search` returns raw results (not wrapped in `{ success, data }` envelope).

**Step C**: No `API_ENDPOINTS.LEO*` constants existed.
**Verification**: 0 legacy `api/leo/` calls in frontend. Build clean.

### Batch 028 — `/admin-marketplace` + `/admin-verified` (2026-02-18)

**Scope**: 6 legacy calls in 1 frontend file (`AdminMarketplace.js`). Both domains batched together — same file, same `marketplace_applications` table, parallel endpoint structure.

**Step A — Backend**: Created `api-service/src/modules/commerce/routesAdminApplications.js` with 6 endpoints:
- Marketplace: `GET /admin/marketplace/applications`, `PUT /:id/approve`, `PUT /:id/deny`
- Verified: `GET /admin/verified/applications`, `PUT /:id/approve`, `PUT /:id/deny`

All use `requireAuth` + `requirePermission('manage_system')`, return `{ success, data }` envelopes. Full SQL port from legacy including media URL resolution, email notifications (approve/deny templates via EmailService), user permission grants/revokes, and audit logging. Shared helper functions (`resolveMediaUrls`, `sendApplicationEmail`) extracted to avoid duplication.

Mounted at `/api/v2/commerce/admin` via `router.use('/admin', adminApplicationsRouter)` in `commerce/routes.js`.

**Step B — Frontend** (6 call sites, 1 file):
1. `modules/commerce/components/marketplace/AdminMarketplace.js`:
   - `GET api/admin/marketplace/applications` → `api/v2/commerce/admin/marketplace/applications`. Added `const payload = data.data || data;` for safe unwrap.
   - `GET api/admin/verified/applications` → `api/v2/commerce/admin/verified/applications`. Same unwrap.
   - `PUT api/admin/marketplace/applications/:id/:action` → `api/v2/commerce/admin/marketplace/applications/:id/:action`.
   - `PUT api/admin/verified/applications/:id/:action` → `api/v2/commerce/admin/verified/applications/:id/:action`.
   - `PUT admin/users/:id/permissions` → `api/v2/users/:id/permissions` (missed from Batch 010 — template literal wasn't caught by grep).

**Step C**: No `API_ENDPOINTS.ADMIN_MARKETPLACE*` or `API_ENDPOINTS.ADMIN_VERIFIED*` constants existed.
**Verification**: 0 legacy `api/admin/marketplace/` or `api/admin/verified/` calls in frontend. 0 `admin/users/` calls remaining. Build clean. Both endpoints return 401 (auth working).

### Batch 027 — `/returns` (2026-02-18)

**Scope**: 5 legacy `/api/returns/*` calls in 1 frontend file (`AdminReturns.js`). V2 commerce module already had customer + vendor returns routes — only admin endpoints were missing.

**Step A — Backend**: Added 3 admin endpoints to `api-service/src/modules/commerce/routes.js`:
1. `GET /returns/admin/all` — search/filter all returns (requireAuth + requirePermission('manage_system'))
2. `GET /returns/admin/by-status/:status` — returns by status (requireAuth + requirePermission('manage_system'))
3. `POST /returns/:id/admin-message` — admin adds message to case (requireAuth + requirePermission('manage_system'))

All return `{ success, data }` envelopes. Full path: `/api/v2/commerce/returns/admin/*`. Hoisted `db` require to top of routes file (was duplicated lower).

**Step B — Frontend** (5 call sites, 1 file):
1. `modules/commerce/components/AdminReturns.js`:
   - `GET /api/returns/admin/all` → `/api/v2/commerce/returns/admin/all`. Added `const payload = data.data || data;` for safe unwrap.
   - `GET /api/returns/admin/by-status/:status` → `/api/v2/commerce/returns/admin/by-status/:status`.
   - `POST /api/returns/:id/admin-message` → `/api/v2/commerce/returns/:id/admin-message`.
   - `<a href="/api/returns/:id/label">` → `/api/v2/commerce/returns/:id/label` (label link — existing v2 endpoint).

**Step C**: No `API_ENDPOINTS.RETURN*` constants existed.
**Verification**: 0 legacy `api/returns/` calls in frontend. Build clean. `GET /returns/admin/all` returns 401 (auth working).

### Batch 026 — `/walmart` (2026-02-18)

**Scope**: 3 broken `authApiRequest('api/walmart/...')` calls in 2 files (neither imported `authApiRequest`), plus 8 lib wrapper functions in `lib/catalog/api.js` already targeting v2 paths but needing backend routes.

**Key finding**: `WalmartSection.js` and `WalmartConnector.js` both imported the correct lib wrapper functions (`fetchWalmartCategories`, `fetchWalmartProducts`) but redundantly used `authApiRequest` for 3 calls without importing it — dead code.

**Step A — Backend**: Created `api-service/src/modules/catalog/routesWalmart.js` (12 endpoints) using existing `services/walmart.js`:
- Customer: GET /categories, POST /categories/refresh, GET /products, GET /products/:id, POST /products/:id, PUT /products/:id, DELETE /products/:id, GET /allocations
- Admin: GET /admin/products, POST /admin/products/:id/activate, POST /admin/products/:id/pause, PUT /admin/products/:id

All endpoints use `requireAuth` (admin routes add `requirePermission('manage_system')`), return `{ success, data }` envelopes. Mounted at `/api/v2/catalog/walmart` via `router.use('/walmart', ...)` in catalog/routes.js.

**Step B — Frontend** (3 direct calls + 8 lib functions):
1. `modules/catalog/components/product-form/sections/connectors/WalmartSection.js` — replaced broken `authApiRequest('api/walmart/categories')` with already-imported `fetchWalmartCategories()`.
2. `modules/catalog/components/addons/WalmartConnector.js` — replaced 2 broken `authApiRequest` calls with already-imported `fetchWalmartProducts()` and `fetchWalmartCategories()`.
3. `lib/catalog/api.js` — updated 8 walmart wrapper functions to unwrap v2 envelope: `const payload = data.data || data; return { success: true, ...payload };` preserving caller-expected shape.

**Step C**: No `API_ENDPOINTS.WALMART*` constants existed.
**Verification**: 0 legacy `api/walmart/` calls in frontend. Build clean. `GET /walmart/categories` returns 401 (auth working).

### Batch 029 — `/jury-packets` (2026-02-18)

**Scope**: 1 legacy caller (`lib/events/api.js` — `uploadJuryPacketFiles`). All CRUD operations were already v2 via the events module.

**Step A — Investigation**: CRUD endpoints (list, get, create, update, delete) already existed in `api-service/src/modules/events/routes.js` and all frontend callers already targeted `/api/v2/events/jury-packets/*`. Only the file upload endpoint (`POST /api/jury-packets/upload`) remained on the legacy route.

**Step B — Backend**: Added `POST /jury-packets/upload` to `api-service/src/modules/events/routes.js` (after existing CRUD routes). Uses existing `multer` upload middleware, `requireAuth`, returns v2 envelope `{ success, data: { urls } }`.

**Step B — Frontend**: Updated `uploadJuryPacketFiles()` in `lib/events/api.js`:
- URL: `api/jury-packets/upload` → `api/v2/events/jury-packets/upload`
- Error unwrap: `data.error` → `data.error?.message`
- Response unwrap: `data.urls` → `data.data?.urls`

**Step C**: No `API_ENDPOINTS.JURY_PACKETS*` constants existed.
**Verification**: 0 legacy `api/jury-packets/` calls in frontend. Build clean. API restarted.

### Batch 030 — `/promoter-claim` (2026-02-18)

**Scope**: 2 legacy calls in 1 frontend file (`pages/promoters/claim/[token].js`). Admin-solicited promoter account activation flow (separate from artist-to-promoter claim which was already v2).

**Step A — Backend**: Added 2 public endpoints to `api-service/src/modules/events/routes.js`:
1. `GET /promoter-claim/verify/:token` — validates `promoter_claim_tokens` record, returns event+promoter details in v2 envelope
2. `POST /promoter-claim/activate/:token` — full transaction: activates user (status, firebase_uid), marks event claimed, marks token claimed, enrolls in onboarding campaign, sends welcome email via EmailService

Both public (token-based auth). Full SQL port from legacy `routes/promoter-claim.js`.

**Step B — Frontend** (2 calls, 1 file):
1. `pages/promoters/claim/[token].js` line 26: `api/promoters/verify-claim/${token}` → `api/v2/events/promoter-claim/verify/${token}`. Added `json.data || json` unwrap.
2. `pages/promoters/claim/[token].js` line 94: `api/promoters/claim/${token}` → `api/v2/events/promoter-claim/activate/${token}`. Added `json.data || json` unwrap + `json.error?.message` error path.

Note: `auth/exchange` call on line 109 is in `/auth` domain (SKIP) — not touched.

**Step C**: No `API_ENDPOINTS.PROMOTER_CLAIM*` constants existed.
**Verification**: 0 legacy `api/promoters/` or `api/promoter-claim` calls in frontend. Build clean. API restarted.

### Batch 031 — `/series` (2026-02-18)

**Scope**: 3 legacy `api/series/*` calls in 1 frontend file (`components/SeriesManager.js`). Event series management (recurring events with auto-generation) — NOT article series (already done in Batch 016).

**Step A — Backend**: Added 3 endpoints to `api-service/src/modules/events/routes.js`:
1. `GET /series` — list promoter's event series with stats (events_count, latest_event_date) via `event_series`/`series_events` join
2. `POST /series` — create event series with recurrence pattern, validation, and automation log
3. `POST /series/:id/generate` — manually generate next event: calculates dates from recurrence pattern, creates event from template, links to series, logs generation

All use `requireAuth`, return `{ success, data }` envelopes. Utility functions (date calculation, event creation) ported inline.

**Step B — Frontend** (3 calls, 1 file):
1. `components/SeriesManager.js` line 32: `api/series` → `api/v2/events/series`. Added `data.data || data` unwrap for `payload.series`.
2. `components/SeriesManager.js` line 52: `api/series` (POST) → `api/v2/events/series`. Added `error?.message` unwrap.
3. `components/SeriesManager.js` line 84: `api/series/${id}/generate` → `api/v2/events/series/${id}/generate`. Added `data.data || data` unwrap for `payload.event_id`. Added `error?.message` unwrap.

**Step C**: No `API_ENDPOINTS.SERIES*` constants existed.
**Verification**: 0 legacy `api/series` calls in frontend. Build clean. API restarted.

### Batch 032 — `/addons` (2026-02-18)

**Scope**: 1 legacy `api/addons/contact/submit` call in 1 frontend file. Legacy had 4 endpoints total: 2 implemented (GET sites/:id/addons, POST contact/submit) and 2 stubs (501 — email-collection, social-posting). The v2 websites module already had `GET /sites/:id/addons` — only contact form submit was missing.

**Module placement**: `websites` — addons are site-owned features; the v2 websites module already manages all addon CRUD.

**Step A — Backend**: Added `POST /addons/contact/submit` to `api-service/src/modules/websites/routes.js`:
- Rate limiting (20 req/15min per IP)
- Input validation (name, email, phone, message length/format)
- Site existence + contact-form addon enabled check
- DB insert to `contact_submissions` table
- Email notification to site owner via EmailService (non-fatal on failure)
- Full v2 envelope responses

Full path: `POST /api/v2/websites/addons/contact/submit`.

**Step B — Frontend** (1 call, 1 file):
1. `components/sites-modules/contact-form.js` line 350: `api/addons/contact/submit` → `api/v2/websites/addons/contact/submit`. Updated error handling: `errorData.error?.message || errorData.error`.

**Step C**: No `API_ENDPOINTS.ADDON*` constants existed.
**Verification**: 0 legacy `api/addons/` calls in frontend. Build clean. API restarted.

### Batch 033 — `/artist-contact` (2026-02-18)

**Scope**: 1 legacy `api/artist-contact` call in 1 frontend file (`ContactArtistModal.js`). Public contact form for visitors to message artists on their profile pages.

**Module placement**: `communications` — the module already owns tickets/support; artist contact is another communication channel.

**Step A — Backend**: Added `POST /artist-contact` to `api-service/src/modules/communications/routes.js`:
- Rate limiting (10 req/15min per IP)
- Input validation (artist_id, sender_name, sender_email, message required; email format check)
- Artist lookup via users/user_profiles/artist_profiles join (active artists only)
- DB insert to `artist_contact_messages` table
- Email to artist via `EmailService.sendExternalEmail` (non-fatal)
- Admin copy email to `hello@brakebee.com` (non-fatal)
- Full v2 envelope responses

Full path: `POST /api/v2/communications/artist-contact`.

**Step B — Frontend** (1 call, 1 file):
1. `components/shared/ContactArtistModal.js` line 32: `api/artist-contact` → `api/v2/communications/artist-contact`. Updated error handling: `data.error?.message || data.error`.

**Step C**: No `API_ENDPOINTS.ARTIST_CONTACT*` constants existed.
**Verification**: 0 legacy `api/artist-contact` calls in frontend. Build clean. API restarted.

---

## PHASE 1 COMPLETE

All 28 frontend-facing domains migrated. Zero legacy API calls remain in frontend code. All frontend callers now target `/api/v2/*` endpoints.

### Batch 034 — Phase 2: Caller Audit + Ports (2026-02-18)

**Step 1 — Caller Audit**: Grepped entire codebase for all 7 AUDIT domains. Results:
- `/admin-financial`: 0 callers (dead code)
- `/tax-reports`: 0 callers (dead code)
- `/vendor-financials`: 0 callers (dead code)
- `/admin/promoter-onboarding`: Frontend already on v2 (`/api/v2/events/admin/unclaimed*` — endpoints exist in events module). V2-COVERED.
- `/emails`: **4 callers** in `EmailPreferences.js` — GET/PUT preferences, GET bounce-status, POST reactivate. Currently broken (legacy off).
- `/tiktok`: **15+ callers** in `lib/catalog/api.js` — all already targeting v2 paths, but `routesTiktok.js` NOT mounted. Currently broken.
- `/policies`: **6 callers** in `pages/policies/[type].js` — 6 public default policy endpoints. Currently broken.

**Step 2 — TikTok mount**: Added `router.use('/tiktok', require('./routesTiktok'))` to `api-service/src/modules/catalog/routes.js`. v2 route file already existed with full implementation. One line.

**Step 3 — Email preferences port**: Added 4 endpoints to `api-service/src/modules/users/routes.js`:
- `GET /email-preferences` — user preferences (requireAuth)
- `PUT /email-preferences` — update preferences with validation and change logging (requireAuth)
- `GET /email-preferences/bounce-status` — check email bounce/blacklist status (requireAuth)
- `POST /email-preferences/reactivate` — clear blacklist and log reactivation (requireAuth)

Updated `modules/users/components/EmailPreferences.js` — 4 calls → v2 paths + envelope unwrap.

**Step 4 — Policies port**: Added parameterized `GET /policies/:type/default` to `api-service/src/modules/system/routes.js`. Single endpoint handles all 6 policy types (shipping, returns, privacy, cookies, copyright, transparency) via table lookup.

Updated `pages/policies/[type].js` — collapsed 6 switch cases into `api/v2/system/policies/${policyType}/default`.

**Step 5 — Stripe webhook port**: Created `api-service/src/modules/webhooks/stripe/stripe.js` (copy of legacy with fixed require paths). Updated `server.js` line 106 to require from new module path. Same mount point `/webhooks`, same early position before JSON parser.

**Verification**: Build clean. API restarted. `GET /email-preferences` → 401 (auth). `GET /policies/shipping/default` → real policy data. `GET /catalog/tiktok/shops` → 401 (auth). All endpoints responding correctly.

---

## 12) Phase 2: SKIP Domain Audit + Legacy Routes Cleanup

### Goal
Port all remaining functionality out of `api-service/src/routes/` so we can rename the folder to `legacy-routes/`. Any breakage from the rename = missed migration.

### Phase 2 Protocol (4 steps)

#### Step 1: Caller Audit
For each AUDIT domain, grep the entire codebase (frontend, backend services, cron jobs, other modules) for references to gap endpoints. Determines what needs porting vs. what's dead code. Results update tracker entries.

#### Step 2: Port Stripe Webhook (REQUIRED — only active mount)
- Create `api-service/src/modules/webhooks/stripe/stripe.js`
- Move handler logic from legacy `routes/webhooks/stripe.js`
- Update `server.js` line 106: `require('./modules/webhooks/stripe/stripe')` (same mount point `/webhooks`, same early position before JSON parser)
- Stripe requires raw body for signature verification — must stay before `express.json()` middleware
- URL path `/webhooks` must not change (Stripe dashboard is configured to this URL)

#### Step 3: Port Gap Endpoints with Callers
For each AUDIT domain where the caller audit found real references:
- Port missing endpoints to the appropriate v2 module
- Follow the same batch protocol (investigate, execute, verify)
- Update tracker entries to DONE

#### Step 4: Rename and Verify ✓ DONE
- `mv api-service/src/routes api-service/src/legacy-routes` — executed
- `pm2 restart staging-api` — started clean, no crash
- Smoke tests: policies (real data), email-prefs (401), tiktok (401), auth (401) — all responding
- Frontend build: clean
- **Phase 2 complete**

### Phase 2 Tracker Summary (FINAL)

| Category | Domains | Outcome |
|---|---|---|
| V2-COVERED | `/auth`, `/domains`, `/personas`, `/csv`, `/dashboard`, `/inventory`, `/media-proxy`, `/admin/promoter-onboarding` | No work needed — v2 already handles |
| DEAD | `/admin-financial`, `/tax-reports`, `/vendor-financials` | 0 callers found — dead legacy code |
| PORTED (Batch 034) | `/webhooks` → `modules/webhooks/stripe/stripe.js` | Active mount moved to v2 module |
| PORTED (Batch 034) | `/emails` → `modules/users/` (email-preferences) | 4 endpoints, 1 frontend file |
| PORTED (Batch 034) | `/tiktok` → `modules/catalog/routesTiktok.js` (mounted) | v2 file existed, just needed mount |
| PORTED (Batch 034) | `/policies` → `modules/system/` (policies/:type/default) | 1 parameterized endpoint, 1 frontend file |
