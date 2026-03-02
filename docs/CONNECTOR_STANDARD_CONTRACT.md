# Marketplace Connector Standard Contract

Reference specification for all marketplace connector addons. Every new
connector MUST implement this contract; existing connectors are being
aligned to it.

---

## 1. Connector Types

| Type | Auth Model | Examples |
|------|-----------|----------|
| `corporate_only` | Client-credentials (our account) | Walmart, Wayfair |
| `oauth_only` | Vendor OAuth (their account) | Etsy, (future) Shopify |
| `hybrid` | Both corporate + vendor OAuth | TikTok, (future) Amazon, eBay |

---

## 2. Module Shape

Every connector lives under `api-service/src/modules/catalog/` and follows
this file layout:

```
routes{Connector}.js          – Express router (mounted at /api/v2/catalog/{slug})
services/{connector}.js       – Business logic (DB queries, orchestration)
../services/{connector}Service.js – External API client (HTTP/GraphQL calls)
```

Frontend:
```
modules/catalog/components/addons/{Connector}Connector.js
modules/catalog/components/addons/{Connector}Admin.js
pages/dashboard/catalog/addons/{slug}.js     – Page with ConnectorSubscriptionGate
```

---

## 3. Standard API Endpoints

### 3a. Corporate Connector (Vendor routes)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/categories` | List marketplace categories (cached) |
| POST | `/categories/refresh` | Force-refresh category cache |
| GET | `/products` | List vendor's corporate products |
| GET | `/products/:productId` | Get single corporate product |
| POST | `/products/:productId` | Submit / save product for approval |
| PUT | `/products/:productId` | Partial update (title, desc, price, alloc) |
| DELETE | `/products/:productId` | Remove product (60-day cooldown) |
| GET | `/allocations` | List vendor's inventory allocations |
| GET | `/test` | Test API connection / credentials |

### 3b. Corporate Connector (Admin routes)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/products` | List all products (filter by status/search) |
| POST | `/admin/products/:id/activate` | Approve → listed |
| POST | `/admin/products/:id/pause` | Pause → paused |
| POST | `/admin/products/:id/reject` | Reject with reason |
| PUT | `/admin/products/:id` | Admin edit (title, desc, price) |

### 3c. OAuth Connector (additional)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/oauth/authorize` | Start OAuth flow |
| GET | `/oauth/callback` | OAuth callback handler |
| GET | `/shops` | List connected shops |
| GET | `/sync-logs` | Sync history |

### 3d. Hybrid Connector

Implements all of 3a + 3b + 3c.

---

## 4. Response Shape

All endpoints MUST return:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": { "message": "..." } }

// 400 with details
{ "success": false, "error": { "message": "...", "cooldown_ends_at": "..." } }
```

---

## 5. Standard Database Tables

Each corporate connector requires these table families
(prefix = marketplace name, e.g. `walmart_`, `wayfair_`):

| Table | Purpose |
|-------|---------|
| `{prefix}_corporate_products` | Product listing data + lifecycle state |
| `{prefix}_inventory_allocations` | Per-vendor inventory allocation |
| `{prefix}_sync_logs` | Audit trail for all sync operations |
| `{prefix}_orders` | Imported orders (future) |

### Required columns on `_corporate_products`:

- `product_id`, `user_id`, `created_by`
- Marketplace-specific fields (`{prefix}_title`, `{prefix}_price`, etc.)
- `is_active`, `listing_status` (enum: pending/listed/paused/rejected/removing/removed)
- `sync_status` (enum: pending/synced/error)
- `terms_accepted_at`, `rejection_reason`
- `removed_at`, `cooldown_ends_at`
- `last_sync_at`, `last_sync_error`
- `created_at`, `updated_at`

---

## 6. Service Function Contract

Every business service (`services/{connector}.js`) MUST export:

### Corporate functions
- `getCategories(useCache?)` → `{ categories, cached }`
- `refreshCategoriesCache()`
- `listProducts(userId)` → products array
- `getProduct(productId, userId)` → product or null
- `saveProduct(productId, userId, body)` → `{ found, error?, cooldown_ends_at? }`
- `updateProduct(productId, userId, body)` → `{ found }`
- `removeProduct(productId, userId)` → `{ found, cooldown_ends_at }`
- `getAllocations(userId)` → allocations array
- `adminListProducts(options)` → `{ products, total }`
- `adminActivate(productId, userId)`
- `adminPause(productId, userId)`
- `adminReject(productId, userId, reason)`
- `adminUpdateProduct(productId, body)`
- `testConnection()` → `{ success, message, environment, endpoint }`

### OAuth functions (when applicable)
- `oauthAuthorize(userId)` → auth URL
- `oauthCallback(userId, code, state)`
- `getShops(userId)` → shops array
- `getSyncLogs(userId, limit?)` → logs array

---

## 7. Subscription Gating

Every connector page MUST use `ConnectorSubscriptionGate` with:
- `addonSlug` matching the slug in `website_addons`
- `connectorOpts` from `connectorSubscriptionConfig.js`
- Admin bypass via `isAdmin(userData)` check

Backend validates via `VALID_CONNECTOR_SLUGS` in
`addons/services/subscription.js`.

---

## 8. Environment Variables

All connector secrets live in `.env` under a clearly labeled section.
The `connectorEnv.js` utility validates required vars at startup
and logs warnings for missing ones (no hard crash).

Pattern:
```
{CONNECTOR}_ENV=sandbox|production
{CONNECTOR}_CLIENT_ID=...
{CONNECTOR}_CLIENT_SECRET=...
{CONNECTOR}_CALLBACK_URL=...  (OAuth connectors only)
```

---

## 9. Lifecycle States

```
not_submitted → pending → listed → paused → listed (re-activate)
                pending → rejected → pending (resubmit)
                listed  → removing → removed (60-day cooldown)
```

---

## 10. Checklist for New Connectors

- [ ] `.env` variables added with `connectorEnv.js` spec
- [ ] Migration: `_corporate_products`, `_inventory_allocations`, `_sync_logs` tables
- [ ] Migration: `website_addons` row (slug, price, category='marketplace')
- [ ] External API service class in `services/{connector}Service.js`
- [ ] Business service in `modules/catalog/services/{connector}.js`
- [ ] Routes in `modules/catalog/routes{Connector}.js`
- [ ] Registered in `modules/catalog/index.js` mount + `services/index.js` export
- [ ] Frontend component + admin component
- [ ] `connectorSubscriptionConfig.js` opts entry
- [ ] Page with `ConnectorSubscriptionGate`
- [ ] `VALID_CONNECTOR_SLUGS` updated in subscription service
- [ ] Frontend API functions in `lib/catalog/api.js`
