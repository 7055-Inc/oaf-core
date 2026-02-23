# Brakebee V2 API Reference

Last updated: 2026-02-18

All endpoints are mounted under `/api/v2/<module>/`. Authentication uses Firebase JWT tokens via `Authorization: Bearer <token>` header.

**Response envelope** (all v2 endpoints):
```
Success: { "success": true, "data": { ... } }
Error:   { "success": false, "error": { "code": "...", "message": "..." } }
```

**Auth levels**:
- **Public** — no token required
- **Auth** — valid JWT required (`requireAuth`)
- **Permission** — JWT + specific permission (`requirePermission('...')`)

---

## Applications — `/api/v2/applications`

Event application management: artists applying to events, promoters managing applications, payments.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/all` | Permission (admin) | List all applications (admin view) |
| GET | `/admin/:id` | Permission (admin) | Get single application detail (admin) |
| GET | `/mine` | Auth | List current user's applications |
| GET | `/stats` | Auth | Get application statistics |
| GET | `/:id` | Auth | Get single application by ID |
| DELETE | `/:id` | Auth | Delete/withdraw application |
| GET | `/events/:eventId/stats` | Public | Get application stats for an event |
| POST | `/events/:eventId/apply` | Auth | Submit application to an event |
| POST | `/apply-with-packet` | Auth | Submit application with jury packet |
| PATCH | `/:id` | Auth | Update application (before deadline) |
| POST | `/:id/addon-requests` | Auth | Add addon request to application |
| POST | `/:id/create-payment-intent` | Auth | Create Stripe payment intent for booth fee |
| POST | `/:id/confirm-payment` | Auth | Confirm booth fee payment |
| GET | `/events/:eventId/applications` | Auth | List applications for an event (promoter) |
| PUT | `/:id/status` | Auth | Update application status (promoter) |
| PUT | `/:id/bulk-accept` | Auth | Bulk accept application (promoter) |
| GET | `/payment-intent/:paymentIntentId` | Auth | Get payment intent details |
| GET | `/payment-dashboard/:eventId` | Auth | Payment dashboard for event (promoter) |
| POST | `/payment-reminder` | Auth | Send payment reminder to applicant |
| POST | `/:id/payment-received` | Auth | Mark payment as received (promoter) |

## Auth — `/api/v2/auth`

Authentication: login, token refresh, session management, API keys.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/login` | Public | Login with Firebase token, returns JWT + refresh token |
| POST | `/refresh` | Public | Refresh expired JWT using refresh token |
| POST | `/logout` | Auth | Invalidate refresh token and clear session |
| GET | `/validate` | Auth | Validate current JWT token |
| GET | `/me` | Auth | Get current authenticated user profile |
| GET | `/keys` | Auth | List user's API keys |
| POST | `/keys` | Auth | Create new API key (rate limited) |
| PUT | `/keys/:publicKey/toggle` | Auth | Enable/disable an API key |
| DELETE | `/keys/:publicKey` | Auth | Delete an API key (rate limited) |

## Catalog — `/api/v2/catalog`

Product catalog: CRUD, images, inventory, categories, collections, variations, import/export. Also mounts sub-routers for Walmart and TikTok.

### Products

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products` | Auth | List user's products (with filters, pagination) |
| GET | `/products/stats` | Auth | Product statistics (counts by status) |
| GET | `/products/:id` | Auth | Get single product with full detail |
| POST | `/products` | Auth | Create new product |
| PUT | `/products/:id` | Auth | Full update of product |
| PATCH | `/products/:id` | Auth | Partial update of product fields |
| PATCH | `/products/:id/status` | Auth | Update product status (active/draft/archived) |
| DELETE | `/products/:id` | Auth | Delete product |
| POST | `/products/bulk-delete` | Auth | Bulk delete multiple products |

### Product Images

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products/:id/images` | Auth | List product images |
| POST | `/products/:id/images` | Auth | Upload product image (multipart) |
| DELETE | `/products/:id/images/:imageId` | Auth | Delete product image |
| PATCH | `/products/:id/images/:imageId/primary` | Auth | Set image as primary |

### Inventory

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products/:id/inventory` | Auth | Get product inventory levels |
| PATCH | `/products/:id/inventory` | Auth | Update product inventory |
| GET | `/products/:id/inventory/history` | Auth | Get inventory change history for product |
| GET | `/inventory/history` | Auth | Get global inventory history (all products) |

### Variations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products/variations/types` | Auth | List variation types |
| POST | `/products/variations/types` | Auth | Create variation type |
| DELETE | `/products/variations/types/:id` | Auth | Delete variation type |
| GET | `/products/variations/types/:id/values` | Auth | List values for a variation type |
| POST | `/products/variations/values` | Auth | Create variation value |
| POST | `/products/variations` | Auth | Link product to variation |
| POST | `/products/upload` | Auth | Bulk upload product images (multipart) |

### Categories

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/categories` | Public | List all categories |
| GET | `/categories/:id` | Public | Get single category |
| GET | `/categories/:id/content` | Public | Get category content/description |
| GET | `/categories/:id/seo` | Public | Get category SEO metadata |
| GET | `/categories/:id/products` | Public | List products in category |
| GET | `/categories/change-log` | Auth | Category change log |
| GET | `/categories/search-vendors` | Auth | Search vendors for category assignment |
| GET | `/categories/search-products` | Auth | Search products for category assignment |
| POST | `/categories` | Auth | Create category |
| PUT | `/categories/:id` | Auth | Update category |
| DELETE | `/categories/:id` | Auth | Delete category |
| PUT | `/categories/:id/content` | Auth | Update category content |
| PUT | `/categories/:id/seo` | Auth | Update category SEO |
| POST | `/categories/:id/products` | Auth | Add products to category |
| DELETE | `/categories/:id/products/:productId` | Auth | Remove product from category |
| POST | `/categories/upload` | Auth | Upload category images (multipart) |

### Collections

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/collections` | Auth | List user's collections |
| GET | `/collections/:id` | Auth | Get single collection |
| POST | `/collections` | Auth | Create collection |
| PUT | `/collections/:id` | Auth | Update collection |
| PATCH | `/collections/reorder` | Auth | Reorder collections |
| DELETE | `/collections/:id` | Auth | Delete collection |
| GET | `/collections/:id/products` | Auth | List products in collection |
| POST | `/collections/:id/products` | Auth | Add products to collection |
| DELETE | `/collections/:id/products/:productId` | Auth | Remove product from collection |
| GET | `/public/collections/:id` | Public | Get public collection with products |

### Public Product Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/public/products` | Public | List public products (marketplace, with filters) |
| GET | `/public/products/:id` | Public | Get public product detail (with variations, shipping) |

### Import/Export

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/export` | Auth | Export products to CSV |
| GET | `/export/template` | Auth | Download CSV import template |
| GET | `/import/status/:jobId` | Auth | Check import job status |

### Walmart Connector — `/api/v2/catalog/walmart`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/categories` | Auth | List Walmart categories |
| POST | `/categories/refresh` | Auth | Refresh Walmart category cache |
| GET | `/products` | Auth | List user's Walmart products |
| GET | `/products/:productId` | Auth | Get Walmart product detail |
| POST | `/products/:productId` | Auth | Submit product to Walmart |
| PUT | `/products/:productId` | Auth | Update Walmart product |
| DELETE | `/products/:productId` | Auth | Remove product from Walmart |
| GET | `/allocations` | Auth | Get inventory allocations |
| GET | `/admin/products` | Permission (manage_system) | Admin list all Walmart products |
| POST | `/admin/products/:productId/activate` | Permission (manage_system) | Activate Walmart product |
| POST | `/admin/products/:productId/pause` | Permission (manage_system) | Pause Walmart product |
| PUT | `/admin/products/:productId` | Permission (manage_system) | Admin update Walmart product |

### TikTok Connector — `/api/v2/catalog/tiktok`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/oauth/callback` | Public | OAuth callback (redirect from TikTok) |
| GET | `/oauth/authorize` | Auth | Initiate TikTok OAuth flow |
| GET | `/shops` | Auth | List connected TikTok shops |
| GET | `/products` | Auth | List user's TikTok products |
| POST | `/products/:productId` | Auth | Submit product to TikTok |
| GET | `/inventory` | Auth | Get TikTok inventory |
| POST | `/inventory/:productId` | Auth | Update TikTok inventory for product |
| POST | `/inventory/update/:productId` | Auth | Push inventory update to TikTok |
| GET | `/logs` | Auth | Get TikTok sync logs |
| POST | `/allocations/bulk` | Auth | Bulk update TikTok allocations |
| POST | `/sync/product/:productId` | Auth | Sync single product to TikTok |
| POST | `/sync/orders` | Auth | Sync orders from TikTok |
| GET | `/test` | Auth | Test TikTok connection |
| GET | `/corporate/products` | Auth | List corporate TikTok products |
| GET | `/corporate/products/:productId` | Auth | Get corporate product detail |
| POST | `/corporate/products/:productId` | Auth | Submit corporate product |
| DELETE | `/corporate/products/:productId` | Auth | Remove corporate product |
| GET | `/admin/products` | Permission (manage_system) | Admin list TikTok products |
| POST | `/admin/products/:productId/activate` | Permission (manage_system) | Activate TikTok product |
| POST | `/admin/products/:productId/pause` | Permission (manage_system) | Pause TikTok product |
| PUT | `/admin/products/:productId` | Permission (manage_system) | Admin update TikTok product |
| GET | `/admin/corporate/products` | Permission (manage_system) | Admin list corporate products |
| POST | `/admin/corporate/products/:productId/activate` | Permission (manage_system) | Activate corporate product |
| POST | `/admin/corporate/products/:productId/pause` | Permission (manage_system) | Pause corporate product |
| POST | `/admin/corporate/products/:productId/reject` | Permission (manage_system) | Reject corporate product |
| PUT | `/admin/corporate/products/:productId` | Permission (manage_system) | Admin update corporate product |

## Commerce — `/api/v2/commerce`

Orders, returns, sales, shipping, cart, checkout, vendor settings, payment methods. Also mounts sub-routers for subscriptions and admin applications.

### Orders

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/orders` | Permission (admin) | List all orders (admin) |
| GET | `/orders/my` | Auth | List current user's orders |
| GET | `/orders/:id` | Auth | Get single order detail |

### Returns — Customer

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/returns/my` | Auth | List user's return requests |
| POST | `/returns` | Auth | Create return request |
| POST | `/returns/:id/message` | Auth | Add message to return case |
| GET | `/returns/:id/label` | Auth | Download return shipping label |

### Returns — Vendor

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/returns/vendor` | Permission (vendor) | List vendor's return requests |
| GET | `/returns/vendor/stats` | Permission (vendor) | Return statistics for vendor |
| POST | `/returns/:id/vendor-message` | Permission (vendor) | Vendor message on return case |
| POST | `/returns/:id/receive` | Permission (vendor) | Mark return as received |

### Returns — Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/returns/admin/all` | Permission (manage_system) | Search/filter all returns |
| GET | `/returns/admin/by-status/:status` | Permission (manage_system) | List returns by status |
| POST | `/returns/:id/admin-message` | Permission (manage_system) | Admin message on return case |

### Sales (Vendor)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/sales` | Permission (vendor) | List vendor's sales |
| GET | `/sales/stats` | Permission (vendor) | Sales statistics |
| GET | `/sales/items/:itemId` | Permission (vendor) | Get sale item detail |
| POST | `/sales/items/:itemId/ship` | Permission (vendor) | Mark item as shipped |
| PATCH | `/sales/items/:itemId/tracking` | Permission (vendor) | Update tracking info |

### Shipping

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/shipping/rates` | Permission (vendor) | Get shipping rates |
| GET | `/shipping/labels` | Permission (vendor) | List shipping labels |
| POST | `/shipping/labels` | Permission (vendor) | Purchase shipping label |
| POST | `/shipping/labels/:id/cancel` | Permission (vendor) | Cancel shipping label |
| GET | `/shipping/labels/:filename` | Auth | Download label file |
| GET | `/shipping/subscription` | Auth | Get shipping subscription status |
| GET | `/shipping/all-labels` | Permission (vendor) | List all labels (expanded view) |
| GET | `/shipping/stats` | Permission (vendor) | Shipping statistics |
| GET | `/shipping/vendor-address` | Auth | Get vendor ship-from address |
| POST | `/shipping/preferences` | Auth | Update shipping preferences |
| GET | `/shipping/standalone-labels` | Auth | List standalone labels |
| POST | `/shipping/standalone-rates` | Auth | Get rates for standalone label |
| POST | `/shipping/calculate-cart-shipping` | Auth | Calculate shipping for cart |
| POST | `/shipping/standalone-labels` | Auth | Purchase standalone label |

### Vendor Settings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/vendor/settings` | Permission (vendor) | Get vendor settings |
| POST | `/vendor/stripe-account` | Permission (stripe_connect) | Create Stripe Connect account |
| GET | `/vendor/stripe-onboarding` | Permission (stripe_connect) | Get Stripe onboarding link |
| POST | `/vendor/subscription-preferences` | Permission (vendor) | Update subscription preferences |
| GET | `/vendor/shipping-preferences` | Permission (vendor) | Get shipping preferences |
| POST | `/vendor/shipping-preferences` | Permission (vendor) | Update shipping preferences |

### Cart

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/cart` | Auth | List user's carts |
| GET | `/cart/unified` | Auth | Unified multi-source cart view |
| GET | `/cart/collections` | Auth | Saved collections |
| GET | `/cart/:cartId/items` | Auth | Get cart items |
| POST | `/cart` | Public | Create cart (supports guest_token) |
| PUT | `/cart/:id` | Auth | Update cart status |
| POST | `/cart/:cartId/items` | Auth | Add item to cart |
| PUT | `/cart/:cartId/items/:itemId` | Auth | Update item quantity/price |
| DELETE | `/cart/:cartId/items/:itemId` | Auth | Remove item from cart |
| POST | `/cart/saved` | Auth | Save item for later |
| POST | `/cart/add` | Public | Add to cart (auto-creates, merges) |

### Checkout

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/checkout/calculate-totals` | Auth | Calculate order totals |
| POST | `/checkout/create-payment-intent` | Auth | Create Stripe payment intent |
| POST | `/checkout/confirm-payment` | Auth | Confirm payment |
| GET | `/checkout/validate-coupon/:code` | Auth | Validate coupon code |
| POST | `/checkout/get-auto-discounts` | Auth | Get applicable auto-discounts |

### Payment Methods

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/payment-methods` | Auth | List user's saved cards |
| POST | `/payment-methods/create-setup-intent` | Auth | Create Stripe setup intent |
| POST | `/payment-methods/confirm-setup` | Auth | Confirm card setup |

### Subscriptions — `/api/v2/commerce/subscriptions`

Subscription management for Verified, Shipping, Marketplace, and Wholesale tiers.

**Verified Subscription**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/verified/subscription/my` | Auth | Get user's verified subscription |
| POST | `/verified/subscription/select-tier` | Auth | Select subscription tier |
| GET | `/verified/subscription/terms-check` | Auth | Check terms acceptance |
| POST | `/verified/subscription/terms-accept` | Auth | Accept subscription terms |
| POST | `/verified/subscription/cancel` | Auth | Cancel subscription |
| GET | `/verified/marketplace-applications` | Auth | List marketplace applications |
| POST | `/verified/marketplace-applications/submit` | Auth | Submit marketplace application |

**Shipping Subscription**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/shipping/subscription/my` | Auth | Get shipping subscription |
| POST | `/shipping/subscription/select-tier` | Auth | Select shipping tier |
| GET | `/shipping/subscription/terms-check` | Auth | Check shipping terms |
| POST | `/shipping/subscription/terms-accept` | Auth | Accept shipping terms |
| POST | `/shipping/subscription/cancel` | Auth | Cancel shipping subscription |
| GET | `/shipping/vendor-address` | Auth | Get vendor address |
| PUT | `/shipping/preferences` | Auth | Update shipping preferences |
| GET | `/shipping/standalone-labels` | Auth | List standalone labels |
| POST | `/shipping/create-standalone-label` | Auth | Create standalone label |

**Marketplace Subscription** (aliases to verified with marketplace context)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/marketplace/subscription/my` | Auth | Get marketplace subscription |
| POST | `/marketplace/subscription/select-tier` | Auth | Select marketplace tier |
| GET | `/marketplace/subscription/terms-check` | Auth | Check marketplace terms |
| POST | `/marketplace/subscription/terms-accept` | Auth | Accept marketplace terms |

**Wholesale**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/wholesale/terms-check` | Auth | Check wholesale terms acceptance |
| POST | `/wholesale/terms-accept` | Auth | Accept wholesale terms |
| POST | `/wholesale/apply` | Auth | Submit wholesale buyer application |

### Admin Applications — `/api/v2/commerce/admin`

Admin management of marketplace and verified seller applications.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/marketplace/applications` | Permission (manage_system) | List marketplace applications |
| PUT | `/marketplace/applications/:id/approve` | Permission (manage_system) | Approve marketplace application |
| PUT | `/marketplace/applications/:id/deny` | Permission (manage_system) | Deny marketplace application |
| GET | `/verified/applications` | Permission (manage_system) | List verified applications |
| PUT | `/verified/applications/:id/approve` | Permission (manage_system) | Approve verified application |
| PUT | `/verified/applications/:id/deny` | Permission (manage_system) | Deny verified application |

## Communications — `/api/v2/communications`

Support tickets (customer and admin) and artist contact forms.

### Tickets — Customer

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/tickets` | Auth | List user's tickets |
| GET | `/tickets/notifications` | Auth | Ticket notification counts |
| POST | `/tickets` | Auth | Create support ticket |
| GET | `/tickets/:id` | Auth | Get ticket with messages |
| POST | `/tickets/:id/messages` | Auth | Add message to ticket |
| POST | `/tickets/:id/close` | Auth | Close ticket |

### Tickets — Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/tickets` | Permission (manage_system) | List all tickets (admin) |
| GET | `/admin/tickets/:id` | Permission (manage_system) | Get ticket detail (admin) |
| POST | `/admin/tickets/:id/messages` | Permission (manage_system) | Admin reply to ticket |
| PATCH | `/admin/tickets/:id` | Permission (manage_system) | Update ticket status/assignment |

### Artist Contact

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/artist-contact` | Public (rate limited) | Send contact message to artist |

## Content — `/api/v2/content`

Articles (blog/news/help), reviews.

### Articles — `/api/v2/content/articles`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List articles (with filters, pagination) |
| GET | `/:slug` | Public | Get article by slug |
| GET | `/by-id/:id` | Public | Get article by ID |
| POST | `/:id/view` | Public | Record article view |
| POST | `/` | Permission (manage_content) | Create article |
| PUT | `/:id` | Auth | Update article |
| DELETE | `/:id` | Auth | Delete article |
| POST | `/upload` | Permission (manage_content) | Upload article images |
| GET | `/tags` | Public | List all tags |
| GET | `/tags/:slug` | Public | Get tag by slug |
| POST | `/tags` | Permission (manage_content) | Create tag |
| PUT | `/tags/:id` | Permission (manage_content) | Update tag |
| DELETE | `/tags/:id` | Permission (manage_content) | Delete tag |
| GET | `/series` | Public | List article series |
| GET | `/series/:slug` | Public | Get series by slug |
| POST | `/series` | Permission (manage_content) | Create series |
| GET | `/topics` | Public | List topics |
| GET | `/topics/:slug` | Public | Get topic by slug with articles |
| POST | `/topics` | Permission (manage_content) | Create topic |
| PUT | `/topics/:id` | Permission (manage_content) | Update topic |
| DELETE | `/topics/:id` | Permission (manage_content) | Delete topic |
| GET | `/topics/:id/articles` | Public | List articles in topic |

### Reviews — `/api/v2/content/reviews`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Public | List reviews (product or event) |
| GET | `/summary` | Public | Review summary (avg rating, counts) |
| GET | `/check-eligibility` | Auth | Check if user can review |
| GET | `/event-token/:eventId` | Auth | Get event review token (promoter) |
| POST | `/validate-token` | Auth | Validate event review token |
| POST | `/` | Auth | Create review |
| POST | `/:id/helpful` | Auth | Vote review as helpful |
| POST | `/admin/pending` | Permission (manage_system) | Create pending review (admin) |
| GET | `/admin/pending` | Permission (manage_system) | List pending reviews (admin) |

## Events — `/api/v2/events`

Event management, ticket sales, jury packets, claims, event series.

### Event CRUD

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/types` | Public | List event types |
| GET | `/upcoming` | Public | List upcoming events |
| GET | `/:id` | Public | Get event detail |
| GET | `/:id/categories` | Public | Get event categories |
| GET | `/:id/artists` | Public | List event artists |
| GET | `/:id/images` | Public | List event images |
| GET | `/mine` | Permission (events) | List user's events |
| GET | `/admin/all` | Auth | List all events (admin) |
| POST | `/` | Permission (events) | Create event |
| PATCH | `/:id` | Permission (events) | Update event |
| DELETE | `/:id` | Permission (events) | Delete event |
| POST | `/upload` | Auth | Upload event images |
| GET | `/custom` | Auth | List custom event types |
| POST | `/custom` | Auth | Create custom event type |
| PUT | `/custom/:id` | Auth | Update custom event type |
| DELETE | `/custom/:id` | Auth | Delete custom event type |

### Tickets

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:id/tickets` | Public | List event tickets |
| POST | `/:id/tickets/:ticketId/purchase` | Public | Purchase ticket |

### Application Fields & Addons

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/:id/application-fields` | Auth | Get event application fields |
| POST | `/:id/application-fields` | Permission (events) | Set application fields |
| DELETE | `/:id/application-fields` | Permission (events) | Remove application fields |
| GET | `/:id/available-addons` | Auth | List event available addons |
| POST | `/:id/available-addons` | Permission (events) | Add event addon |
| DELETE | `/:id/available-addons` | Permission (events) | Remove event addon |
| GET | `/artist/:artistId/applications` | Public | List artist's event applications |

### Jury Packets

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/jury-packets` | Auth | List user's jury packets |
| POST | `/jury-packets` | Auth | Create jury packet |
| GET | `/jury-packets/:id` | Auth | Get jury packet |
| PUT | `/jury-packets/:id` | Auth | Update jury packet |
| DELETE | `/jury-packets/:id` | Auth | Delete jury packet |
| POST | `/jury-packets/upload` | Auth | Upload jury packet files |

### Event Claims

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/claim/verify/:token` | Public | Verify event claim token |
| POST | `/claim/new/:token` | Permission (events) | Claim event (new promoter) |
| POST | `/claim/link/:token` | Permission (events) | Claim event (existing promoter) |
| GET | `/promoter-claim/verify/:token` | Public | Verify promoter claim token |
| POST | `/promoter-claim/activate/:token` | Public | Activate promoter via claim |

### Admin — Unclaimed Events

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/unclaimed` | Permission (manage_system) | List unclaimed events |
| POST | `/admin/unclaimed/:eventId/resend` | Permission (manage_system) | Resend claim email |
| DELETE | `/admin/unclaimed/:eventId` | Permission (manage_system) | Delete unclaimed event |

### Event Series

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/series` | Auth | List user's event series |
| POST | `/series` | Auth | Create event series |
| POST | `/series/:id/generate` | Auth | Generate next event in series |

## Finances — `/api/v2/finances`

Vendor earnings, payouts, transactions, commission management.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/balance` | Permission (stripe_connect) | Get vendor balance |
| GET | `/earnings` | Permission (stripe_connect) | Get earnings breakdown |
| GET | `/transactions` | Permission (stripe_connect) | List transactions |
| GET | `/payouts` | Permission (vendor) | List payouts |
| GET | `/commission-rates` | Permission (manage_system) | List commission rates (admin) |
| POST | `/commission-rates` | Permission (manage_system) | Create commission rate (admin) |
| PUT | `/commission-rates/bulk` | Permission (manage_system) | Bulk update commission rates |
| PUT | `/commission-rates/:id` | Permission (manage_system) | Update commission rate |

## Leo AI — `/api/v2/leo`

AI-powered search, recommendations, and data ingestion.

### Public

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | Public | Health check |
| POST | `/query` | Public | AI query |
| POST | `/analyze` | Public | Analyze content |
| GET | `/user/:id/prefs` | Public | Get user preferences |
| GET | `/brain/health` | Public | Brain service health |
| GET | `/brain/stats` | Public | Brain statistics |
| POST | `/search` | Public | AI-powered search |
| POST | `/recommendations` | Public | Get product recommendations |
| POST | `/discover` | Public | Discovery feed |
| GET | `/stats` | Public | Platform stats |

### Admin (Ingestion & Truths)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/ingest/job/:jobId` | Permission (admin) | Get ingestion job status |
| POST | `/admin/ingest/users` | Permission (admin) | Ingest user data |
| POST | `/admin/ingest/behavior` | Permission (admin) | Ingest behavior data |
| POST | `/admin/ingest/products` | Permission (admin) | Ingest product data |
| POST | `/admin/ingest/orders` | Permission (admin) | Ingest order data |
| POST | `/admin/ingest/events` | Permission (admin) | Ingest event data |
| POST | `/admin/ingest/reviews` | Permission (admin) | Ingest review data |
| POST | `/admin/ingest/articles` | Permission (admin) | Ingest article data |
| GET | `/admin/ingest/status` | Permission (admin) | Overall ingestion status |
| GET | `/admin/truths/status` | Permission (admin) | Truths system status |
| GET | `/admin/truths/stats` | Permission (admin) | Truths statistics |
| POST | `/admin/truths/discover/all` | Permission (admin) | Discover all truths |
| POST | `/admin/truths/discover/:discoverer` | Permission (admin) | Discover truths by type |
| GET | `/admin/truths/job/:jobId` | Permission (admin) | Get truths job status |
| GET | `/admin/truths/similarities/:entityType/:entityId` | Permission (admin) | Get entity similarities |
| POST | `/admin/truths/cleanup` | Permission (admin) | Cleanup truths data |

## Media — `/api/v2/media`

Media processing pipeline: worker routes for image processing, serving.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/pending` | API Key (worker) | Get next pending media item |
| GET | `/pending/all` | API Key (worker) | List all pending media |
| GET | `/download/:id` | API Key (worker) | Download original media file |
| POST | `/complete/:id` | API Key (worker) | Mark media processing complete |
| DELETE | `/cleanup/:id` | API Key (worker) | Cleanup processed media |
| GET | `/event/:id` | API Key (worker) | Get event media |
| GET | `/product/:id` | API Key (worker) | Get product media |
| GET | `/user/:id` | API Key (worker) | Get user media |
| GET | `/analysis/:mediaId` | API Key (worker) | Get media analysis data |

## Users — `/api/v2/users`

User profile, personas, admin user management, permissions, email preferences.

### Current User

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me` | Auth | Get current user profile |
| PATCH | `/me` | Auth | Update current user profile |
| GET | `/me/completion` | Auth | Get profile completion status |
| PATCH | `/me/complete-profile` | Auth | Complete profile setup |
| POST | `/me/select-user-type` | Auth | Select user type (artist/promoter) |

### Personas

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me/personas` | Auth | List user's personas |
| GET | `/me/personas/:id` | Auth | Get persona detail |
| POST | `/me/personas` | Auth | Create persona |
| PUT | `/me/personas/:id` | Auth | Update persona |
| POST | `/me/personas/:id/image` | Auth | Upload persona image |
| POST | `/me/personas/upload-image` | Auth | Upload persona image (alt) |
| PATCH | `/me/personas/:id/default` | Auth | Set default persona |
| DELETE | `/me/personas/:id` | Auth | Delete persona |

### Email Preferences

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/email-preferences` | Auth | Get email notification preferences |
| PUT | `/email-preferences` | Auth | Update email preferences |
| GET | `/email-preferences/bounce-status` | Auth | Check email bounce/blacklist status |
| POST | `/email-preferences/reactivate` | Auth | Reactivate blocked email |

### Public

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/artists` | Public | List public artists |
| GET | `/:id` | Public | Get public user profile |

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | Permission (admin) | List all users |
| GET | `/:id/full` | Permission (admin) | Get full user detail |
| PUT | `/:id` | Permission (admin) | Update user (admin) |
| DELETE | `/:id` | Permission (admin) | Delete user (admin) |
| GET | `/:id/permissions` | Permission (admin) | Get user permissions |
| PUT | `/:id/permissions` | Permission (admin) | Update user permissions |
| GET | `/by-permissions` | Auth | Search users by permission |
| GET | `/admin/personas` | Permission (admin) | List all personas (admin) |
| GET | `/admin/personas/:id` | Permission (admin) | Get persona detail (admin) |
| PUT | `/admin/personas/:id` | Permission (admin) | Update persona (admin) |
| DELETE | `/admin/personas/:id` | Permission (admin) | Delete persona (admin) |

## Websites — `/api/v2/websites`

Artist website management: sites, templates, addons, domains, subscriptions.

### Public (Storefront Resolution)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/resolve/:subdomain` | Public | Resolve subdomain to site data |
| GET | `/resolve/:subdomain/products` | Public | Get site products |
| GET | `/resolve/:subdomain/articles` | Public | Get site articles |
| GET | `/resolve/:subdomain/categories` | Public | Get site categories |
| GET | `/resolve/:subdomain/socials` | Public | Get site social links |
| GET | `/resolve/:subdomain/clipped-note` | Public | Get site clipped note |
| GET | `/check-subdomain/:subdomain` | Public | Check subdomain availability |
| GET | `/resolve-custom-domain/:domain` | Public | Resolve custom domain |
| GET | `/sites/:id/addons` | Public | Get site addons |
| POST | `/addons/contact/submit` | Public (rate limited) | Submit contact form |

### Site Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/sites/me` | Auth | Get user's sites |
| POST | `/sites` | Auth | Create site |
| PUT | `/sites/:id` | Auth | Update site |
| DELETE | `/sites/:id` | Auth | Delete site |
| GET | `/sites/:id/customizations` | Permission (sites) | Get site customizations |
| PUT | `/sites/:id/customizations` | Permission (sites) | Update site customizations |
| GET | `/enforce-limits` | Auth | Check site limits |
| GET | `/sites/all` | Permission (admin) | List all sites (admin) |
| GET | `/sites/:siteId/template-data` | Auth | Get template field values |
| PUT | `/sites/:siteId/template-data` | Auth | Save template field values |
| GET | `/sites/:siteId/clipped-note` | Auth | Get clipped note (auth) |
| PUT | `/sites/:siteId/clipped-note` | Auth | Update clipped note |

### Templates

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/templates` | Auth | List templates |
| GET | `/templates/:id` | Auth | Get template detail |
| PUT | `/template/:id` | Permission (manage_sites) | Update template |
| POST | `/templates` | Permission (admin) | Create template |
| GET | `/templates/:templateId/schema` | Public | Get template schema |

### Addons

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/addons` | Auth | List available addons |
| GET | `/my-addons` | Permission (manage_sites) | List user's active addons |
| POST | `/addons/:id` | Permission (manage_sites) | Enable addon |
| DELETE | `/addons/:id` | Permission (manage_sites) | Disable addon |
| POST | `/sites/:siteId/addons/:addonId` | Permission (manage_sites) | Enable addon for site |
| DELETE | `/sites/:siteId/addons/:addonId` | Permission (manage_sites) | Disable addon for site |
| POST | `/user-addons/:addonId` | Auth | Enable user-level addon |
| DELETE | `/user-addons/:addonId` | Auth | Disable user-level addon |
| POST | `/addons` | Permission (admin) | Create addon (admin) |

### User Categories (Sites)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/categories` | Auth | List user categories |
| POST | `/categories` | Auth | Create category |
| PUT | `/categories/:id` | Auth | Update category |
| DELETE | `/categories/:id` | Auth | Delete category |
| GET | `/categories/tree` | Auth | Get category tree |
| PUT | `/categories/reorder` | Auth | Reorder categories |
| GET | `/sites/:siteId/categories` | Auth | Get site categories |
| PUT | `/sites/:siteId/categories/visibility` | Auth | Update category visibility |

### Discounts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/discounts/calculate` | Auth | Calculate discounts |
| POST | `/discounts` | Permission (admin) | Create discount |
| DELETE | `/discounts/:id` | Permission (admin) | Delete discount |

### Website Subscription

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/subscription/my` | Auth | Get website subscription |
| GET | `/subscription/status` | Auth | Get subscription status |
| POST | `/subscription/select-tier` | Auth | Select tier |
| GET | `/subscription/terms-check` | Auth | Check terms |
| POST | `/subscription/terms-accept` | Auth | Accept terms |
| POST | `/subscription/change-tier` | Auth | Change tier |
| POST | `/subscription/confirm-tier-change` | Auth | Confirm tier change |
| POST | `/subscription/cancel` | Auth | Cancel subscription |
| POST | `/subscription/confirm-cancellation` | Auth | Confirm cancellation |

### Custom Domains

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/domains/status/:siteId` | Auth | Get domain status |
| GET | `/domains/check-availability` | Auth | Check domain availability |
| POST | `/domains/start-validation` | Auth | Start domain validation |
| POST | `/domains/retry-validation/:siteId` | Auth | Retry validation |
| POST | `/domains/cancel-validation/:siteId` | Auth | Cancel validation |
| DELETE | `/domains/remove/:siteId` | Auth | Remove custom domain |
| GET | `/domains/list` | Permission (admin) | List all domains (admin) |

## System — `/api/v2/system`

Platform administration: notifications, promotions, sales, coupons, hero, announcements, terms, policies, dashboard widgets, tickets.

### Admin Notifications

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/notifications` | Permission (manage_system) | Get admin notifications |

### Admin Promotions & Sales

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/promotions/all` | Permission (manage_system) | List all promotions |
| POST | `/admin/promotions/create` | Permission (manage_system) | Create promotion |
| PUT | `/admin/promotions/:id` | Permission (manage_system) | Update promotion |
| POST | `/admin/promotions/:id/invite-vendors` | Permission (manage_system) | Invite vendors to promotion |
| GET | `/admin/sales/all` | Permission (manage_system) | List all sales |
| POST | `/admin/sales/create-sitewide` | Permission (manage_system) | Create sitewide sale |
| PUT | `/admin/sales/:id` | Permission (manage_system) | Update sale |
| GET | `/admin/coupons/all` | Permission (manage_system) | List all coupons |
| POST | `/admin/coupons` | Permission (manage_system) | Create coupon |
| PUT | `/admin/coupons/:id` | Permission (manage_system) | Update coupon |

### Admin Promoters

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/promoters/check-email` | Permission (manage_system) | Check if email is available |
| POST | `/admin/promoters/create` | Permission (manage_system) | Create promoter account |

### Hero Banner

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/hero` | Permission (manage_system) | Get hero configuration |
| PUT | `/hero` | Permission (manage_system) | Update hero configuration |
| POST | `/hero/videos` | Permission (manage_system) | Upload hero videos |
| DELETE | `/hero/videos/:videoId` | Permission (manage_system) | Delete hero video |

### Announcements

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/announcements/check-pending` | Auth | Check for pending announcements |
| GET | `/announcements/pending` | Auth | Get pending announcements |
| GET | `/announcements` | Permission (manage_system) | List all announcements |
| POST | `/announcements` | Permission (manage_system) | Create announcement |
| GET | `/announcements/:id/stats` | Permission (manage_system) | Get announcement stats |
| PUT | `/announcements/:id` | Permission (manage_system) | Update announcement |
| DELETE | `/announcements/:id` | Permission (manage_system) | Delete announcement |
| POST | `/announcements/:id/acknowledge` | Auth | Acknowledge announcement |
| POST | `/announcements/:id/remind-later` | Auth | Snooze announcement |

### Terms Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/terms/current` | Public | Get current general terms |
| GET | `/terms/type/:type` | Public | Get terms by subscription type |
| GET | `/terms/check-acceptance` | Auth | Check if user accepted terms |
| POST | `/terms/accept` | Auth | Accept terms version |
| GET | `/terms` | Permission (manage_system) | List all terms versions |
| GET | `/terms/stats` | Permission (manage_system) | Terms acceptance stats |
| GET | `/terms/:id` | Permission (manage_system) | Get terms version |
| POST | `/terms` | Permission (manage_system) | Create terms version |
| PUT | `/terms/:id` | Permission (manage_system) | Update terms version |
| PUT | `/terms/:id/set-current` | Permission (manage_system) | Set terms as current |
| DELETE | `/terms/:id` | Permission (manage_system) | Delete terms version |

### Policy Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/policies/:type/default` | Public | Get default policy by type (shipping, returns, privacy, cookies, copyright, transparency) |
| GET | `/policies/types` | Permission (manage_system) | List policy types |
| GET | `/policies` | Permission (manage_system) | List all policies |
| GET | `/policies/:type` | Permission (manage_system) | Get policy by type |
| PUT | `/policies/:type` | Permission (manage_system) | Update policy |

### Dashboard Widgets

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/dashboard-widgets/layout` | Auth | Get widget layout |
| POST | `/dashboard-widgets/layout` | Auth | Save widget layout |
| GET | `/dashboard-widgets/widget-data/:widgetType` | Auth | Get widget data |
| POST | `/dashboard-widgets/shortcuts/add` | Auth | Add shortcut |
| POST | `/dashboard-widgets/shortcuts/remove` | Auth | Remove shortcut |
| POST | `/dashboard-widgets/remove-widget` | Auth | Remove widget |

### Tickets (Legacy — migrating to Communications)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/tickets` | Public (optional auth) | Create support ticket |
| GET | `/tickets/my` | Auth | List user's tickets |
| GET | `/tickets/my/notifications` | Auth | Ticket notification counts |
| GET | `/tickets/:id` | Auth | Get ticket with messages |
| POST | `/tickets/:id/messages` | Auth | Add message to ticket |
| PATCH | `/tickets/:id/close` | Auth | Close ticket |

## Marketing — `/api/v2/marketing`

Marketing platform: campaigns, content, assets, AI, video, ads, social connections, submissions.

### Subscription

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/subscription/my` | Auth | Get marketing subscription |
| GET | `/subscription/tiers` | Public | List subscription tiers |
| POST | `/subscription/select-tier` | Auth | Select tier |
| GET | `/subscription/terms-check` | Auth | Check terms acceptance |
| POST | `/subscription/terms-accept` | Auth | Accept terms |
| POST | `/subscription/cancel` | Auth | Cancel subscription |

### Campaigns

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/campaigns` | Auth | List campaigns |
| GET | `/campaigns/:id` | Auth | Get campaign detail |
| POST | `/campaigns` | Auth | Create campaign |
| PUT | `/campaigns/:id` | Auth | Update campaign |
| DELETE | `/campaigns/:id` | Auth | Delete campaign |
| GET | `/campaigns/:id/stats` | Auth | Campaign statistics |

### Content

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/content` | Auth | List content pieces |
| GET | `/content/:id` | Auth | Get content detail |
| POST | `/content` | Auth | Create content |
| PUT | `/content/:id` | Auth | Update content |
| DELETE | `/content/:id` | Auth | Delete content |
| POST | `/content/:id/submit` | Auth | Submit for approval |
| POST | `/content/:id/approve` | Permission (admin) | Approve content |
| POST | `/content/:id/reject` | Permission (admin) | Reject content |
| POST | `/content/:id/comment` | Auth | Add comment |
| GET | `/content/:id/feedback` | Auth | Get feedback |
| GET | `/approvals/pending` | Permission (admin) | List pending approvals |
| POST | `/content/:id/schedule` | Auth | Schedule content |
| PUT | `/content/:id/reschedule` | Auth | Reschedule content |
| DELETE | `/content/:id/schedule` | Auth | Unschedule content |
| POST | `/content/:id/approve-schedule` | Auth | Approve scheduled content |

### Schedule

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/schedule/queue` | Auth | Get publishing queue |
| GET | `/schedule/calendar` | Auth | Get calendar view |

### Analytics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/analytics/:contentId` | Permission (admin) | Record analytics |
| GET | `/analytics/content/:id` | Auth | Content analytics |
| GET | `/analytics/campaign/:id` | Auth | Campaign analytics |
| GET | `/analytics/overview` | Auth | Overview analytics |
| GET | `/analytics/channels` | Auth | Channel analytics |
| GET | `/analytics/top` | Auth | Top performing content |

### Assets (Media Library)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/assets` | Auth | List assets |
| GET | `/assets/:id` | Auth | Get asset detail |
| POST | `/assets/upload` | Auth (rate limited) | Upload asset |
| PUT | `/assets/:id` | Auth | Update asset metadata |
| DELETE | `/assets/:id` | Auth | Delete asset |
| GET | `/assets/search` | Auth | Search assets |

### Media (Pending Processing)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/media/pending/:id` | Auth | Get pending media status |
| POST | `/media/pending/batch` | Auth | Batch check pending media |

### Social Connections & OAuth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/oauth/:platform/authorize` | Auth | Start OAuth flow |
| GET | `/oauth/:platform/callback` | Public | OAuth callback |
| POST | `/oauth/:platform/refresh` | Permission (admin) | Refresh OAuth token |
| GET | `/connections` | Auth | List social connections |
| GET | `/connections/:id` | Auth | Get connection detail |
| PUT | `/connections/:id/label` | Auth | Update connection label |
| DELETE | `/connections/:id` | Auth | Delete connection |
| POST | `/connections/crm` | Auth | Connect CRM |
| DELETE | `/connections/crm` | Auth | Disconnect CRM |
| POST | `/connections/drip` | Auth | Enable drip integration |
| DELETE | `/connections/drip` | Auth | Disable drip integration |
| POST | `/connections/collection` | Auth | Enable collection integration |
| DELETE | `/connections/collection` | Auth | Disable collection integration |
| GET | `/connections/admin/all` | Auth | List all connections (admin) |

### Ads (Google & Bing)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ads/google/campaigns` | Permission (admin) | Create Google ad campaign |
| GET | `/ads/google/campaigns` | Permission (admin) | List Google campaigns |
| PUT | `/ads/google/campaigns/:id` | Permission (admin) | Update Google campaign |
| GET | `/ads/google/performance` | Permission (admin) | Google ads performance |
| POST | `/ads/bing/campaigns` | Permission (admin) | Create Bing ad campaign |
| GET | `/ads/bing/campaigns` | Permission (admin) | List Bing campaigns |
| PUT | `/ads/bing/campaigns/:id` | Permission (admin) | Update Bing campaign |
| GET | `/ads/bing/performance` | Permission (admin) | Bing ads performance |

### Email Marketing (Campaign)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/email/campaigns` | Permission (admin) | Create email campaign |
| GET | `/email/campaigns` | Auth | List email campaigns |
| GET | `/email/campaigns/:id` | Auth | Get email campaign |
| PUT | `/email/campaigns/:id` | Permission (admin) | Update email campaign |
| POST | `/email/campaigns/:id/send` | Permission (admin) | Send email campaign |
| GET | `/email/campaigns/:id/stats` | Auth | Email campaign stats |
| POST | `/email/templates` | Permission (admin) | Create email template |
| GET | `/email/templates` | Auth | List email templates |
| GET | `/email/templates/:id` | Auth | Get email template |
| GET | `/email/lists` | Auth | List email lists |
| POST | `/email/unsubscribe` | Public | Unsubscribe from emails |

### Video Processing

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/video/process` | Auth | Process video |
| POST | `/video/convert` | Auth | Convert video format |
| POST | `/video/clip` | Auth | Clip video |
| POST | `/video/adapt` | Auth | Adapt video for platform |
| GET | `/video/job/:jobId` | Auth | Get video job status |
| POST | `/video/transcribe` | Auth | Transcribe video |
| POST | `/video/captions` | Auth | Generate captions |
| POST | `/video/analyze` | Auth | Analyze video content |
| POST | `/video/auto-clip` | Auth | Auto-clip highlights |
| GET | `/video/templates` | Auth | List video templates |
| GET | `/video/templates/:id` | Auth | Get video template |
| POST | `/video/apply-template` | Auth | Apply template to video |
| POST | `/video/templates` | Permission (admin) | Create video template |

### AI Content Generation

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/ai/status` | Auth | AI service status |
| POST | `/ai/caption` | Auth | Generate caption |
| GET | `/ai/composition-templates` | Auth | List composition templates |
| POST | `/ai/campaign` | Auth | Generate campaign content |
| POST | `/ai/revise` | Auth | Revise content with AI |
| POST | `/ai/reimagine` | Auth | Reimagine content |
| POST | `/ai/suggest-time` | Auth | AI-suggested posting time |

### User Submissions (Promoter Content)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/user-info` | Auth | Get marketing user info |
| GET | `/my-submissions` | Auth | List user's submissions |
| POST | `/submit` | Auth (rate limited) | Submit content |
| GET | `/admin/submissions` | Auth | List all submissions (admin) |
| GET | `/admin/submissions/:id` | Auth | Get submission detail |
| PUT | `/admin/submissions/:id/notes` | Auth | Update submission notes |
| PUT | `/admin/submissions/:id/status` | Auth | Update submission status |
| DELETE | `/admin/submissions/:id` | Auth | Delete submission |

### Brand Voice

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/brand-voice` | Public | Get brand voice settings |
| PUT | `/brand-voice` | Public | Update brand voice settings |
| GET | `/health` | Public | Marketing module health check |

## Email Marketing — `/api/v2/email-marketing`

Subscriber management, forms, campaigns, analytics, webhooks.

### Subscribers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/subscribers` | Auth | List subscribers |
| GET | `/subscribers/:id` | Auth | Get subscriber detail |
| POST | `/subscribers` | Auth | Create subscriber |
| PUT | `/subscribers/:id` | Auth | Update subscriber |
| DELETE | `/subscribers/:id` | Auth | Delete subscriber |
| POST | `/subscribers/import` | Auth | Import subscribers (CSV) |
| GET | `/subscribers/export` | Auth | Export subscribers |
| GET | `/tags` | Auth | List subscriber tags |
| GET | `/tags/stats` | Auth | Tag statistics |
| POST | `/subscribers/:id/tags` | Auth | Add tags to subscriber |
| DELETE | `/subscribers/:id/tags` | Auth | Remove tags from subscriber |
| POST | `/subscribers/bulk-tag` | Auth | Bulk tag subscribers |

### Forms

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/forms` | Auth | List signup forms |
| GET | `/forms/:id` | Auth | Get form detail |
| POST | `/forms` | Auth | Create form |
| PUT | `/forms/:id` | Auth | Update form |
| DELETE | `/forms/:id` | Auth | Delete form |
| GET | `/forms/:id/embed-code` | Auth | Get form embed code |
| POST | `/public/subscribe/:formId` | Public | Public form submission |

### Campaigns

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/campaigns` | Auth | List campaigns |
| GET | `/templates` | Auth | List email templates |
| POST | `/campaigns/single-blast` | Auth | Create single-blast campaign |
| PUT | `/campaigns/:id/schedule` | Auth | Schedule campaign |
| POST | `/campaigns/:id/send-now` | Auth | Send campaign immediately |
| GET | `/campaigns/:id/recipients` | Auth | List campaign recipients |
| POST | `/campaigns/:id/cancel` | Auth | Cancel scheduled campaign |

### Analytics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/analytics/overview` | Auth | Overall email analytics |
| GET | `/analytics/campaigns/:id` | Auth | Campaign-specific analytics |
| GET | `/analytics/list-growth` | Auth | List growth analytics |
| GET | `/analytics/engagement` | Auth | Engagement analytics |

### Webhooks (Email Events)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/webhooks/email/open` | Public (webhook) | Track email open |
| POST | `/webhooks/email/click` | Public (webhook) | Track link click |
| POST | `/webhooks/email/bounce` | Public (webhook) | Track email bounce |
| POST | `/webhooks/email/spam` | Public (webhook) | Track spam complaint |

## Drip Campaigns — `/api/v2/drip-campaigns`

Automated drip campaign management, enrollments, and analytics.

### Admin Campaigns

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/campaigns` | Permission (manage_system) | List all drip campaigns |
| GET | `/admin/campaigns/:id` | Permission (manage_system) | Get campaign detail |
| POST | `/admin/campaigns` | Permission (manage_system) | Create drip campaign |
| PUT | `/admin/campaigns/:id` | Permission (manage_system) | Update campaign |
| DELETE | `/admin/campaigns/:id` | Permission (manage_system) | Delete campaign |
| POST | `/admin/campaigns/:id/publish` | Permission (manage_system) | Publish campaign |
| POST | `/admin/campaigns/:id/unpublish` | Permission (manage_system) | Unpublish campaign |

### Admin Steps

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/admin/campaigns/:campaignId/steps` | Permission (manage_system) | Create step |
| PUT | `/admin/steps/:id` | Permission (manage_system) | Update step |
| DELETE | `/admin/steps/:id` | Permission (manage_system) | Delete step |
| POST | `/admin/campaigns/:campaignId/steps/reorder` | Permission (manage_system) | Reorder steps |

### Admin Triggers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/admin/campaigns/:campaignId/triggers` | Permission (manage_system) | Create trigger |
| PUT | `/admin/triggers/:id` | Permission (manage_system) | Update trigger |
| DELETE | `/admin/triggers/:id` | Permission (manage_system) | Delete trigger |

### Admin Enrollments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/campaigns/:campaignId/enrollments` | Permission (manage_system) | List enrollments |
| GET | `/admin/users/:userId/enrollments` | Permission (manage_system) | User's enrollments |
| POST | `/admin/enroll` | Permission (manage_system) | Enroll user |
| POST | `/admin/enrollments/:id/exit` | Permission (manage_system) | Exit enrollment |
| POST | `/admin/enrollments/:id/pause` | Permission (manage_system) | Pause enrollment |
| POST | `/admin/enrollments/:id/resume` | Permission (manage_system) | Resume enrollment |

### Admin Analytics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/campaigns/:campaignId/analytics` | Permission (manage_system) | Campaign analytics |
| GET | `/admin/analytics/summary` | Permission (manage_system) | Analytics summary |
| GET | `/admin/analytics/conversions` | Permission (manage_system) | Conversion analytics |
| GET | `/admin/analytics/frequency` | Permission (manage_system) | Frequency analytics |

### User Campaigns (Vendor Drip)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/campaigns` | Auth | List available campaigns |
| GET | `/my-campaigns` | Auth | List user's campaigns |
| GET | `/my-campaigns/:id` | Auth | Get user campaign detail |
| POST | `/my-campaigns` | Auth | Create user campaign |
| PUT | `/my-campaigns/:id` | Auth | Update user campaign |
| DELETE | `/my-campaigns/:id` | Auth | Delete user campaign |
| GET | `/my-campaigns/:id/analytics` | Auth | User campaign analytics |
| POST | `/campaigns/:campaignId/enable` | Auth | Enable campaign |
| POST | `/campaigns/:campaignId/disable` | Auth | Disable campaign |

### Public / Internal

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/enrollments/:id/unsubscribe` | Public | Unsubscribe from drip |
| POST | `/internal/process-queue` | Internal | Process drip queue |
| POST | `/internal/trigger` | Internal | Trigger drip campaign |
| POST | `/internal/track-event` | Internal | Track drip event |
| POST | `/internal/track-conversion` | Internal | Track conversion |
| POST | `/internal/update-analytics` | Internal | Update analytics |

### Test

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/test/reset-frequency/:userId` | Permission (manage_system) | Reset user frequency |
| POST | `/test/trigger-campaign/:campaignId/:userId` | Permission (manage_system) | Trigger campaign for user |

## CRM Subscription — `/api/v2/crm` *(not yet mounted in server.js)*

CRM subscription management and addons (drip credits, blast credits).

### Subscription

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/subscription/my` | Auth | Get CRM subscription |
| POST | `/subscription/select-tier` | Auth | Select tier |
| GET | `/subscription/terms-check` | Auth | Check terms |
| POST | `/subscription/accept-terms` | Auth | Accept terms |
| POST | `/subscription/terms-accept` | Auth | Accept terms (alias) |
| POST | `/subscription/change-tier` | Auth | Change tier |
| POST | `/subscription/cancel` | Auth | Cancel subscription |

### Addons

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/addons/my` | Auth | List CRM addons |
| POST | `/addons/extra-drip` | Auth | Purchase extra drip campaign |
| DELETE | `/addons/extra-drip/:addonId` | Auth | Remove extra drip |
| POST | `/addons/blast-credits` | Auth | Purchase blast credits |
| POST | `/webhooks/blast-credits/confirm` | Public (webhook) | Confirm blast credit purchase |

## Email (System Admin) — `/api/v2/email`

System email management: templates, logs, queue, bounces. Admin-only.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stats` | Permission (manage_system) | Email system stats |
| GET | `/recent` | Permission (manage_system) | Recent emails |
| GET | `/templates` | Permission (manage_system) | List system email templates |
| GET | `/templates/:id` | Permission (manage_system) | Get template detail |
| PUT | `/templates/:id` | Permission (manage_system) | Update template |
| POST | `/templates` | Permission (manage_system) | Create template |
| DELETE | `/templates/:id` | Permission (manage_system) | Delete template |
| GET | `/templates/:id/default` | Permission (manage_system) | Get template default content |
| POST | `/templates/:id/reset` | Permission (manage_system) | Reset template to default |
| GET | `/layouts` | Permission (manage_system) | List email layouts |
| GET | `/logs` | Permission (manage_system) | Search email logs |
| GET | `/logs/:id` | Permission (manage_system) | Get email log detail |
| POST | `/send-preview` | Permission (manage_system) | Send preview email |
| POST | `/resend/:id` | Permission (manage_system) | Resend email |
| POST | `/test` | Permission (manage_system) | Send test email |
| GET | `/queue` | Permission (manage_system) | View email queue |
| POST | `/queue/process` | Permission (manage_system) | Process email queue |
| GET | `/bounces` | Permission (manage_system) | List bounced emails |
| POST | `/bounces/unblacklist` | Permission (manage_system) | Remove email from blacklist |

## Catalog: Etsy Connector — `/api/v2/catalog/etsy`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/oauth/authorize` | Auth | Start Etsy OAuth flow |
| GET | `/oauth/callback` | Public | Etsy OAuth callback |
| GET | `/shops` | Auth | List connected Etsy shops |
| GET | `/products` | Auth | List Etsy products |
| GET | `/products/:productId` | Auth | Get Etsy product detail |
| POST | `/products/:productId` | Auth | Push product to Etsy |
| POST | `/inventory/:productId` | Auth | Sync inventory to Etsy |
| GET | `/logs` | Auth | Get sync logs |
| GET | `/test` | Auth | Test Etsy connection |

## Catalog: Wayfair Connector — `/api/v2/catalog/wayfair`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/products` | Auth | List Wayfair products |
| GET | `/products/:productId` | Auth | Get Wayfair product detail |
| POST | `/products/:productId` | Auth | Push product to Wayfair |
| DELETE | `/products/:productId` | Auth | Remove from Wayfair |
| GET | `/test` | Auth | Test Wayfair connection |
| GET | `/admin/products` | Permission (manage_system) | Admin list Wayfair products |
| POST | `/admin/products/:productId/activate` | Permission (manage_system) | Activate product |
| POST | `/admin/products/:productId/pause` | Permission (manage_system) | Pause product |
| POST | `/admin/products/:productId/reject` | Permission (manage_system) | Reject product |
| PUT | `/admin/products/:productId` | Permission (manage_system) | Admin update product |

## Catalog: Curation — `/api/v2/catalog/curation`

Admin product curation and categorization.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stats` | Permission (admin) | Curation statistics |
| GET | `/products` | Permission (admin) | List uncurated products |
| PUT | `/products/:id/categorize` | Permission (admin) | Categorize product |
| PUT | `/products/bulk` | Permission (admin) | Bulk categorize products |
| GET | `/log` | Permission (admin) | Curation activity log |

## Commerce: Coupons — `/api/v2/commerce/coupons`

Vendor coupon management.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/my` | Permission (vendor) | List vendor's coupons |
| GET | `/products` | Permission (vendor) | List products for coupon assignment |
| POST | `/` | Permission (vendor) | Create coupon |
| PUT | `/:id` | Permission (vendor) | Update coupon |
| DELETE | `/:id` | Permission (vendor) | Delete coupon |
| GET | `/:id/analytics` | Permission (vendor) | Coupon analytics |

## Commerce: Promotions — `/api/v2/commerce/promotions`

Vendor promotion invitations from admin.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/invitations` | Permission (vendor) | List promotion invitations |
| POST | `/invitations/:id/respond` | Permission (vendor) | Accept/decline invitation |

## Commerce: Wholesale — `/api/v2/commerce/wholesale`

Wholesale buyer applications and admin management.

### Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/applications` | Permission (manage_system) | List wholesale applications |
| GET | `/applications/:id` | Permission (manage_system) | Get application detail |
| GET | `/stats` | Permission (manage_system) | Wholesale statistics |
| PUT | `/applications/:id/approve` | Permission (manage_system) | Approve application |
| PUT | `/applications/:id/deny` | Permission (manage_system) | Deny application |

### Customer

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/apply` | Auth | Submit wholesale application |
| GET | `/my-status` | Auth | Check application status |

## Finances: Refunds — `/api/v2/finances/refunds`

Admin payment management and refunds.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/payments` | Permission (manage_system) | Search payments |
| GET | `/payments/:type/:id` | Permission (manage_system) | Get payment detail |
| POST | `/payments/:type/:id/refund` | Permission (manage_system) | Issue refund |
| GET | `/refunds` | Permission (manage_system) | List refunds |

## Behavior — `/api/v2/behavior` *(not yet mounted in server.js — used internally by Leo)*

User behavior tracking and analytics.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/track` | Public | Track behavior event |
| POST | `/track/batch` | Public | Batch track events |
| GET | `/health` | Public | Health check |
| GET | `/admin/user/:userId` | Permission (admin) | Get user behavior profile |
| GET | `/admin/user/:userId/events` | Permission (admin) | Get user behavior events |

## CSV — `/api/v2/csv`

CSV import/export processing.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/upload` | Auth | Upload CSV for import |
| GET | `/jobs/:jobId` | Auth | Get import job status |
| DELETE | `/jobs/:jobId` | Auth | Cancel/delete import job |
| GET | `/templates/:jobType` | Auth | Download CSV template |
| GET | `/reports` | Auth | List export reports |
| POST | `/reports` | Auth | Create export report |
| DELETE | `/reports/:reportId` | Auth | Delete export report |

## Media: Proxy — `/api/v2/media`

Public media serving and proxying.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/serve/*` | Public | Serve processed media |
| GET | `/images/:mediaId` | Public | Get processed image |

## Webhooks — `/webhooks`

External service webhooks. Mounted at root level (not under `/api/v2/`).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/webhooks/stripe` | Public (Stripe signature) | Stripe payment webhooks |

