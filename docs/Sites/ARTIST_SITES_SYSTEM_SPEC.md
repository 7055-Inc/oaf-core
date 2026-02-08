# Artist Sites Multi-Tenant System - Master Specification

## Executive Summary

The Artist Sites system is a **multi-tenant subscription-based website platform** that allows artists to create their own branded storefronts using their existing catalog data. Each artist gets a customizable subdomain (or custom domain) with ecommerce capabilities, leveraging the global cart system.

**Think Shopify for artists** - but deeply integrated with the existing Brakebee platform where artists already manage their products, inventory, and sales.

**Key Principle**: Artists can focus on their art while the platform auto-generates a professional website using data they've already entered (products, profile, articles, etc.).

---

## Current System State

### What Exists (Already Built)

```
/var/www/staging/
├── api-service/src/modules/websites/
│   ├── routes.js                      # API endpoints (/api/v2/websites/*)
│   └── services/
│       ├── sites.js                   # Site CRUD, customizations, templates, addons
│       ├── subscription.js            # Subscription tier management
│       └── domains.js                 # Custom domain validation & DNS management
│
├── modules/websites/components/       # Frontend React components
│   ├── MySites.js                     # Site list/management dashboard
│   ├── SiteCustomizer.js              # Color/font customization UI
│   ├── SiteManage.js                  # Individual site management
│   └── WebsitesSubscriptionGate.js    # Subscription flow
│
├── pages/
│   ├── dashboard/websites/            # Artist dashboard pages
│   │   ├── index.js                   # Main websites dashboard
│   │   ├── manage/[id].js             # Site management page
│   │   ├── new.js                     # Create new site
│   │   ├── settings.js                # Global settings
│   │   └── payments.js                # Payment settings
│   │
│   ├── artist-storefront/             # Public storefront pages
│   │   ├── index.js                   # Main storefront
│   │   ├── about.js                   # About page
│   │   ├── products.js                # Product gallery
│   │   └── product.js                 # Individual product page
│   │
│   └── custom-sites/                  # Special subdomain pages
│       ├── signup.js                  # Special signup subdomain
│       ├── site-unavailable.js        # Inactive site page
│       └── subdomain-404.js           # 404 for subdomains
│
└── middleware/subdomainRouter.js      # Subdomain → site resolution
```

### Database Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `sites` | Core site records | subdomain, custom_domain, status, theme_name, template_id |
| `site_customizations` | Visual customization | Colors (text, main, secondary, accent, background), fonts (body, header, h1-h4), custom CSS |
| `site_addons` | Site-specific addon activations | Links sites to website_addons with is_active flag |
| `user_addons` | User-level addon subscriptions | Global addons that apply to all user's sites |
| `website_templates` | Available site templates | Template definitions with CSS paths and tier requirements |
| `website_addons` | Available addon definitions | Both site-level (user_level=0) and user-level (user_level=1) |
| `user_categories` | Custom product categories | Hierarchical category system per user |
| `user_subscriptions` | Subscription management | Tier tracking for "websites" subscription type |
| `site_media` | Site-specific media | Banners, backgrounds, logos, content images |
| `discounts` | User-specific discounts | Stackable/chainable discount system |

### Subscription Tiers

| Tier | Sites Allowed | Features |
|------|---------------|----------|
| **Starter Plan** | 1 | Basic customization (3 colors) |
| **Professional Plan** | 1 | Advanced customization (5 colors + fonts) |
| **Business Plan** | 999 (unlimited) | Everything + multiple sites |
| **Promoter Plan** | 1 | Same as Starter for promoters |
| **Promoter Business Plan** | 999 | Multiple sites for promoters |

### Site Status States

```javascript
enum: 'draft', 'active', 'inactive', 'suspended', 'suspended_violation', 
      'suspended_finance', 'deleted'
```

- **draft**: Being set up, not publicly visible
- **active**: Live and publicly accessible
- **inactive**: Temporarily deactivated
- **suspended**: Admin-suspended (generic)
- **suspended_violation**: Policy violation
- **suspended_finance**: Payment issues
- **deleted**: Soft-deleted (preserved in DB)

---

## Architecture Overview

### Request Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ARTIST SITES SYSTEM                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  USER REQUEST: artistname.brakebee.com                                  │
│         │                                                                │
│         ▼                                                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │               NGINX → Next.js → middleware.js                    │   │
│  │                        │                                         │   │
│  │                        ▼                                         │   │
│  │                 subdomainRouter()                                │   │
│  │    1. Extract subdomain from hostname                            │   │
│  │    2. Call /api/v2/websites/resolve/:subdomain                   │   │
│  │    3. Check site status (active/draft/suspended)                 │   │
│  │    4. Route to appropriate page or error page                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                        │                                                 │
│         ┌──────────────┼──────────────┐                                 │
│         ▼              ▼              ▼                                 │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐                            │
│  │ ACTIVE   │   │  DRAFT   │   │SUSPENDED │                            │
│  │  SITE    │   │   SITE   │   │   SITE   │                            │
│  └──────────┘   └──────────┘   └──────────┘                            │
│       │               │               │                                  │
│       ▼               ▼               ▼                                  │
│  Storefront    "Coming Soon"   "Site Unavailable"                       │
│  Page          Page            Page                                     │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              STOREFRONT DATA FETCHING                            │   │
│  │                                                                  │   │
│  │  1. Resolve subdomain → site data + user profile                │   │
│  │  2. Fetch products (user's catalog)                             │   │
│  │  3. Fetch articles/pages (content)                              │   │
│  │  4. Fetch categories (user's custom categories)                 │   │
│  │  5. Load site addons (active features)                          │   │
│  │  6. Apply customizations (colors, fonts, CSS)                   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Custom Domain Support

```
Custom Domain: myartgallery.com
       │
       ▼
   DNS Check
       │
       ├─ TXT Record: domain-validation-key-12345
       ├─ A Record: Points to our IP
       └─ CNAME: www → brakebee.com
       │
       ▼
Validation Status: verified
       │
       ▼
   Routes to site via custom domain
```

---

## Core Features Breakdown

### 1. Site Management

#### Create Site
```javascript
POST /api/v2/websites/sites
{
  "site_name": "My Art Gallery",
  "subdomain": "myartgallery",  // 3-63 chars, alphanumeric + hyphens
  "site_title": "Welcome to My Gallery",
  "site_description": "Contemporary art and sculptures",
  "theme_name": "default"
}
```

**Validation:**
- Only artists and admins can create sites
- Subdomain must be unique and follow pattern: `/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/`
- Reserved subdomains blocked: www, api, admin, app, mail, ftp, blog, shop, store, signup
- Tier limits enforced (non-admins limited to tier allowance)
- Initial status: `draft`

#### Update Site
```javascript
PUT /api/v2/websites/sites/:id
{
  "site_name": "Updated Name",
  "site_title": "New Title",
  "status": "active",  // Triggers tier limit check
  "custom_domain": "myartgallery.com"  // Optional
}
```

**Authorization:**
- Site owner or admin only
- Activating site checks active site count vs tier limit
- Custom domain validated with DNS pattern

#### Delete Site
```javascript
DELETE /api/v2/websites/sites/:id
```
- **Soft delete**: Sets status to 'deleted'
- Preserves data for historical purposes
- CASCADE deletes customizations and addon links

---

### 2. Customization System (Tiered by Permissions)

#### Permission Tiers

| Permission Level | Colors | Fonts | Custom CSS |
|-----------------|--------|-------|------------|
| **sites** (Basic) | text_color, main_color, secondary_color | ❌ | ❌ |
| **manage_sites** (Advanced) | Basic + accent_color, background_color | body_font, header_font | ❌ |
| **professional_sites** (Pro) | All colors | All fonts + h1-h4_font | ✅ custom_css |

#### Get Customizations
```javascript
GET /api/v2/websites/sites/:id/customizations

Response:
{
  "success": true,
  "customizations": {
    "text_color": "#374151",
    "main_color": "#667eea",
    "secondary_color": "#764ba2",
    "accent_color": null,
    "background_color": null,
    "body_font": "system-ui, sans-serif",
    "header_font": "Georgia, serif",
    "h1_font": null,
    "h2_font": null,
    "h3_font": null,
    "h4_font": null,
    "custom_css": null,
    "layout_style": "default",
    "header_style": "default"
  }
}
```

#### Update Customizations
```javascript
PUT /api/v2/websites/sites/:id/customizations
{
  "text_color": "#2c3e50",
  "main_color": "#ff6b6b",
  "secondary_color": "#4ecdc4",
  "body_font": "Inter, system-ui",
  "custom_css": ".hero { padding: 60px; }"  // Pro tier only
}
```

**Process:**
1. Validates site ownership
2. Checks user permissions for requested fields
3. Uses upsert pattern (INSERT or UPDATE)
4. Returns updated customizations

**Default Values:**
- Text Color: `#374151` (gray-700)
- Main Color: `#667eea` (purple gradient start)
- Secondary Color: `#764ba2` (purple gradient end)
- Body Font: System UI stack
- Header Font: Georgia

---

### 3. Template System

#### Template Structure
```sql
website_templates:
  - id, template_name, template_slug
  - description, preview_image_url
  - css_file_path (path to template CSS)
  - tier_required (free, basic, pro, premium)
  - display_order, is_active
```

#### List Templates
```javascript
GET /api/v2/websites/templates

Response:
{
  "success": true,
  "templates": [
    {
      "id": 1,
      "template_name": "Classic Gallery",
      "template_slug": "classic-gallery",
      "description": "Traditional art gallery layout",
      "preview_image_url": "/templates/previews/classic.jpg",
      "tier_required": "free"
    }
  ]
}
```

#### Apply Template
```javascript
PUT /api/v2/websites/template/:id
```
- Validates template exists and is active
- Verifies user has site to apply to
- Updates site's `template_id`
- **Future**: Will add tier requirement validation

#### Create Template (Admin)
```javascript
POST /api/v2/websites/templates
{
  "template_name": "Modern Minimalist",
  "template_slug": "modern-minimalist",
  "description": "Clean, minimal design",
  "css_file_path": "/templates/modern-minimalist.css",
  "preview_image_url": "/templates/previews/modern.jpg",
  "tier_required": "basic",
  "display_order": 2
}
```

---

### 4. Addon System (Site-Level & User-Level)

#### Addon Types

**Site-Level Addons** (`user_level = 0`):
- Apply to specific sites
- Managed per-site basis
- Examples: Custom contact form, gallery widget, testimonials

**User-Level Addons** (`user_level = 1`):
- Apply to ALL user's sites
- Global feature additions
- Examples: SEO optimization, analytics integration, social media feeds

#### Addon Structure
```sql
website_addons:
  - id, addon_name, addon_slug
  - description, addon_script_path
  - tier_required, monthly_price
  - user_level (0=site, 1=user)
  - category (site_features, user_features, marketplace, analytics, integrations)
  - display_order, is_active
```

#### List Addons
```javascript
GET /api/v2/websites/addons

Response:
{
  "success": true,
  "addons": [
    {
      "id": 5,
      "addon_name": "Advanced Analytics",
      "addon_slug": "advanced-analytics",
      "description": "Detailed visitor analytics",
      "tier_required": "pro",
      "monthly_price": 9.99,
      "user_level": 1,
      "category": "analytics",
      "addon_scope": "user",
      "user_already_has": false
    }
  ]
}
```

#### Enable Site Addon
```javascript
POST /api/v2/websites/sites/:siteId/addons/:addonId
```
- Validates addon exists
- Checks site ownership
- Prevents duplicate activations
- Records activation timestamp

#### Enable User Addon
```javascript
POST /api/v2/websites/user-addons/:addonId
```
- Validates user-level addon
- Uses upsert for reactivation
- Records subscription source: 'marketplace_subscription'
- Applies to all user's sites automatically

#### Get Site Addons (Public)
```javascript
GET /api/v2/websites/sites/:id/addons

Response:
{
  "addons": [
    {
      "id": 3,
      "addon_name": "Contact Form",
      "addon_slug": "contact-form",
      "addon_script_path": "/addons/contact-form.js",
      "activated_at": "2026-01-15T10:30:00Z"
    }
  ]
}
```
- Public endpoint (no auth)
- Used by storefronts to load active features
- Only returns active addons for active sites

---

### 5. Subdomain Resolution (Public Routes)

#### Resolve Subdomain
```javascript
GET /api/v2/websites/resolve/:subdomain

Response (Active Site):
{
  "id": 42,
  "user_id": 123,
  "site_name": "Jane's Art Studio",
  "subdomain": "janeart",
  "site_title": "Welcome to Jane's Art Studio",
  "site_description": "Contemporary paintings and sculptures",
  "theme_name": "modern",
  "template_id": 2,
  "status": "active",
  "available": true,
  "is_promoter_site": false,
  // User profile data
  "username": "janeartist",
  "first_name": "Jane",
  "last_name": "Smith",
  "bio": "Award-winning contemporary artist...",
  "profile_image_path": "/uploads/profiles/jane.jpg",
  "header_image_path": "/uploads/headers/jane-header.jpg",
  // Customizations
  "primary_color": "#ff6b6b",
  "secondary_color": "#4ecdc4",
  "text_color": "#2c3e50",
  "accent_color": "#f7b731",
  "background_color": "#ffffff"
}

Response (Inactive Site):
{
  "id": 42,
  "site_name": "Jane's Art Studio",
  "subdomain": "janeart",
  "status": "draft",
  "available": false,
  "statusMessage": "This site is currently being set up and will be available soon."
}
```

#### Resolve Subdomain Products
```javascript
GET /api/v2/websites/resolve/:subdomain/products?limit=20&offset=0&category=5

Returns: User's active products with primary images
```

#### Resolve Subdomain Articles
```javascript
GET /api/v2/websites/resolve/:subdomain/articles?type=blog&limit=10

Types:
- 'menu': Articles for site menu navigation
- 'blog': Blog posts
- 'pages': Static pages
- 'all': All published articles
```

#### Resolve Subdomain Categories
```javascript
GET /api/v2/websites/resolve/:subdomain/categories

Returns: User's custom category hierarchy
```

#### Check Subdomain Availability
```javascript
GET /api/v2/websites/check-subdomain/:subdomain

Response:
{
  "available": true,
  "reason": null  // or "Already taken", "Reserved subdomain", "Invalid format"
}
```

#### Resolve Custom Domain
```javascript
GET /api/v2/websites/resolve-custom-domain/:domain

Response:
{
  "subdomain": "janeart",
  "user_id": 123,
  "site_name": "Jane's Art Studio",
  "theme_name": "modern"
}
```
- Requires domain validation status = 'verified'
- Requires custom_domain_active = 1

---

### 6. Custom Domain Management

#### Domain Structure
```sql
sites table fields:
  - custom_domain VARCHAR(255)
  - domain_validation_key VARCHAR(64) UNIQUE
  - domain_validation_status ENUM('pending','verified','failed','expired')
  - domain_validation_expires TIMESTAMP
  - custom_domain_active BOOLEAN
  - domain_validation_attempted_at TIMESTAMP
  - domain_validation_error TEXT
```

#### Start Domain Validation
```javascript
POST /api/v2/websites/domains/start-validation
{
  "siteId": 42,
  "customDomain": "myartgallery.com"
}

Response:
{
  "success": true,
  "validationKey": "domain-key-abc123...",
  "instructions": "Add TXT record with this key...",
  "expiresAt": "2026-02-14T12:00:00Z"
}
```

**Process:**
1. Validates site ownership
2. Generates unique validation key
3. Sets validation status to 'pending'
4. Sets expiration (7 days)
5. Returns DNS instructions

#### Retry Validation
```javascript
POST /api/v2/websites/domains/retry-validation/:siteId
```
- Checks DNS TXT record for validation key
- Updates validation status
- Records attempt timestamp
- Sets custom_domain_active if verified

#### Domain Status
```javascript
GET /api/v2/websites/domains/status/:siteId

Response:
{
  "customDomain": "myartgallery.com",
  "validationStatus": "verified",
  "validationKey": "domain-key-abc123...",
  "expiresAt": null,
  "isActive": true,
  "lastAttempt": "2026-02-07T10:30:00Z"
}
```

#### Remove Custom Domain
```javascript
DELETE /api/v2/websites/domains/remove/:siteId
```
- Clears custom domain fields
- Sets custom_domain_active = 0
- Site reverts to subdomain only

---

### 7. User Categories (Custom Taxonomy)

#### Category Structure
```sql
user_categories:
  - id, user_id, name
  - parent_id (self-referencing for hierarchy)
  - description, display_order
  - Unique constraint: (user_id, name)
```

#### Create Category
```javascript
POST /api/v2/websites/categories
{
  "name": "Sculptures",
  "description": "Three-dimensional artworks",
  "parent_id": null,  // or ID of parent category
  "display_order": 1
}
```

**Validation:**
- Name must be unique per user
- Parent category must belong to same user
- Supports hierarchical structure

#### Update Category
```javascript
PUT /api/v2/websites/categories/:id
{
  "name": "Updated Name",
  "parent_id": 5,
  "display_order": 2
}
```
- Prevents circular references (category can't be its own parent)

#### Delete Category
```javascript
DELETE /api/v2/websites/categories/:id
```
- Prevents deletion if category has subcategories
- CASCADE deletion removes all child categories if allowed

---

### 8. Discount System

#### Discount Structure
```sql
discounts:
  - user_id, subscription_type
  - discount_code, discount_type (percentage, fixed)
  - discount_value, priority
  - can_stack, can_chain
  - valid_from, valid_until
  - is_active
```

#### Calculate Discounts
```javascript
GET /api/v2/websites/discounts/calculate?subscription_type=websites

Response:
{
  "success": true,
  "discounts": [
    {
      "id": 10,
      "discount_code": "ARTIST50",
      "discount_type": "percentage",
      "discount_value": 50.00,
      "priority": 1,
      "can_stack": true
    }
  ],
  "stacking_applied": "stacked_discounts"
}
```

**Logic:**
- Ordered by priority (ASC)
- If any discount has `can_stack = false`, only that discount applies
- Otherwise all applicable discounts stack
- Only active discounts within valid date ranges

#### Create Discount (Admin)
```javascript
POST /api/v2/websites/discounts
{
  "user_id": 123,
  "subscription_type": "websites",
  "discount_code": "ARTIST50",
  "discount_type": "percentage",
  "discount_value": 50.00,
  "priority": 10,
  "can_stack": true,
  "can_chain": false,  // Prevents duplicate discount types
  "valid_from": "2026-01-01T00:00:00Z",
  "valid_until": "2026-12-31T23:59:59Z"
}
```

---

### 9. Subscription Management

#### Get My Subscription
```javascript
GET /api/v2/websites/subscription/my

Response:
{
  "subscription": {
    "id": 567,
    "status": "active",
    "tier": "Professional Plan",
    "tierPrice": 29.99,
    "termsAccepted": true,
    "cardLast4": "4242",
    "application_status": "approved"
  },
  "has_permission": true
}
```

**Auto-Provisioning:**
- If subscription, terms, and card all present → auto-enable sites permission
- If status = 'incomplete' and all conditions met → activate subscription

#### Select Tier
```javascript
POST /api/v2/websites/subscription/select-tier
{
  "subscription_type": "websites",
  "tier_name": "Professional Plan",
  "tier_price": 29.99
}
```
- Creates or updates subscription record
- Sets status to 'incomplete'
- User must complete terms and payment

#### Terms Management
```javascript
GET /api/v2/websites/subscription/terms-check

Returns: Latest terms version

POST /api/v2/websites/subscription/terms-accept
{
  "terms_version_id": 5
}
```

#### Change Tier
```javascript
POST /api/v2/websites/subscription/change-tier
{
  "new_tier": "Business Plan",
  "new_price": 99.99
}
```
- Handles Stripe subscription updates
- Prorates charges
- Updates tier limits

#### Cancel Subscription
```javascript
POST /api/v2/websites/subscription/cancel
```
- Cancels Stripe subscription
- Sets status to 'cancelled'
- Sites automatically deactivated if over free tier limit

#### Enforce Limits
```javascript
GET /api/v2/websites/enforce-limits

Response:
{
  "success": true,
  "sites_deactivated": 2,
  "tier": "Starter Plan",
  "site_limit": 1,
  "active_sites": 1,
  "message": "Deactivated 2 sites to match tier limit"
}
```
- Deactivates oldest sites first if over limit
- Admins have unlimited sites

---

## Frontend Architecture

### Dashboard Pages

#### Main Websites Dashboard
**Location:** `/pages/dashboard/websites/index.js`

Features:
- List of user's sites with status badges
- Quick actions: Visit, Manage, Activate/Deactivate
- "Add New Site" button
- Subscription tier display
- Payment settings link

#### Site Management Page
**Location:** `/pages/dashboard/websites/manage/[id].js`

Features:
- Site activation toggle
- Subdomain display
- Custom domain management (DNS validation UI)
- Customization interface (colors, fonts)
- Template selection
- Addon management
- Analytics preview (future)

#### New Site Page
**Location:** `/pages/dashboard/websites/new.js`

Features:
- Site creation form
- Subdomain availability checker (real-time)
- Template preview gallery
- Tier limit warnings

### Public Storefront

#### Main Storefront
**Location:** `/pages/artist-storefront/index.js`

Features:
- Hero section with profile image
- Product grid (12 products)
- Article/blog feed
- Category navigation
- Custom branding (colors, fonts)
- Addon-loaded features
- Wholesale pricing display (if user logged in as wholesale)

**Data Fetching:**
1. Resolve subdomain → site data
2. Fetch user profile (full)
3. Fetch products (vendor_id = site user)
4. Fetch articles (menu + blog)
5. Fetch categories
6. Load site addons (scripts)

#### About Page
**Location:** `/pages/artist-storefront/about.js`

Features:
- User bio
- Profile/header images
- Artist story
- Social links

#### Products Page
**Location:** `/pages/artist-storefront/products.js`

Features:
- Full product catalog
- Category filtering
- Search functionality
- Add to cart (global cart)

#### Individual Product Page
**Location:** `/pages/artist-storefront/product.js`

Features:
- Product details
- Image gallery
- Add to cart
- Related products

### Error Pages

#### Site Unavailable
**Location:** `/pages/custom-sites/site-unavailable.js`

**Status-Based Messages:**
- **draft**: "Coming Soon" with progress indicator
- **inactive**: "Temporarily Unavailable"
- **suspended**: "Site Suspended"
- **suspended_violation**: "Policy Violation"
- **suspended_finance**: "Payment Issues"
- **deleted**: "Site Not Found"

#### Subdomain 404
**Location:** `/pages/custom-sites/subdomain-404.js`
- Unknown path on valid subdomain
- Suggests navigating to homepage

#### Subdomain Not Found
**Location:** `/pages/custom-sites/subdomain-not-found.js`
- Subdomain doesn't exist
- Suggests checking spelling or browsing main site

---

## Middleware & Routing

### Subdomain Router
**Location:** `/middleware/subdomainRouter.js`

**Flow:**
```javascript
1. Extract hostname from request
2. Determine if subdomain or custom domain
3. Skip main domain (brakebee.com, www.brakebee.com)
4. Skip system subdomains (api, staging, mobile)
5. Handle special subdomains (signup, crafts)
6. Check custom domain → resolve to subdomain if verified
7. Resolve subdomain → fetch site data
8. Route based on site status:
   - active → Artist storefront
   - inactive/draft → Site unavailable page
   - not found → Subdomain not found page
9. Route based on path:
   - / → index
   - /about → about
   - /products → products
   - /product/:id → individual product
10. Pass query params for tracking:
    - subdomain, userId, siteName, siteId
    - isPromoterSite (for affiliate tracking)
```

**Custom Domain Handling:**
1. Detect non-brakebee.com domain
2. Call `/api/v2/websites/resolve-custom-domain/:domain`
3. Get mapped subdomain
4. Proceed with normal subdomain flow

**Special Subdomains:**
- `signup.brakebee.com` → Custom signup page
- `crafts.brakebee.com` → Crafts marketplace
- More can be added as needed

---

## Global Cart Integration

### Affiliate Attribution
When a product is added to cart from an artist site:

```javascript
// Stored in cart_items or session
{
  product_id: 123,
  quantity: 1,
  affiliate_source: 'artist_site',
  referrer_site_id: 42,  // Site ID
  referrer_user_id: 123  // Artist user ID
}
```

**Promoter Sites:**
- Automatically set `isPromoterSite` flag
- Affiliate commission calculated on checkout
- Tracked in orders table

### Checkout Flow
1. User adds products from artist site to cart
2. Cart persists across main site and subdomains
3. Checkout happens on main site
4. Affiliate attribution maintained
5. Commission allocated to artist/promoter

---

## Permission System

### Permission Levels

```sql
user_permissions:
  - sites (BOOLEAN)
  - manage_sites (BOOLEAN)
  - professional_sites (BOOLEAN)
```

**sites** (Basic):
- Create/edit sites
- Basic customization (3 colors)
- View analytics

**manage_sites** (Advanced):
- Everything in Basic
- Advanced customization (5 colors, fonts)
- Template management
- Addon activation

**professional_sites** (Pro):
- Everything in Advanced
- Custom CSS
- Individual heading fonts
- Priority support
- Advanced analytics (future)

### Authorization Checks

#### Routes
```javascript
requireAuth - JWT token required
requirePermission('sites') - Sites permission required
requirePermission('manage_sites') - Advanced features
requireRole('admin') - Admin-only operations
```

#### Service Layer
```javascript
// Site ownership check
if (site.user_id !== userId && user_type !== 'admin') {
  throw new Error('Access denied');
}

// Permission-based field validation
const allowed = ['text_color', 'main_color', 'secondary_color'];
if (hasManageSites) {
  allowed.push('accent_color', 'background_color', 'body_font', 'header_font');
}
if (hasProfessionalSites) {
  allowed.push('h1_font', 'h2_font', 'h3_font', 'h4_font', 'custom_css');
}
```

---

## API Endpoint Reference

### Public Routes (No Auth)

```
GET  /api/v2/websites/resolve/:subdomain
GET  /api/v2/websites/resolve/:subdomain/products
GET  /api/v2/websites/resolve/:subdomain/articles
GET  /api/v2/websites/resolve/:subdomain/categories
GET  /api/v2/websites/check-subdomain/:subdomain
GET  /api/v2/websites/resolve-custom-domain/:domain
GET  /api/v2/websites/sites/:id/addons
```

### Sites (Authenticated)

```
GET    /api/v2/websites/sites/me
GET    /api/v2/websites/sites/all (admin)
POST   /api/v2/websites/sites
PUT    /api/v2/websites/sites/:id
DELETE /api/v2/websites/sites/:id
GET    /api/v2/websites/enforce-limits
```

### Customizations (Authenticated + Permission)

```
GET  /api/v2/websites/sites/:id/customizations
PUT  /api/v2/websites/sites/:id/customizations
```

### Templates (Authenticated)

```
GET  /api/v2/websites/templates
GET  /api/v2/websites/templates/:id
PUT  /api/v2/websites/template/:id
POST /api/v2/websites/templates (admin)
```

### Addons (Authenticated)

```
GET    /api/v2/websites/addons
GET    /api/v2/websites/my-addons
POST   /api/v2/websites/addons/:id
DELETE /api/v2/websites/addons/:id
POST   /api/v2/websites/sites/:siteId/addons/:addonId
DELETE /api/v2/websites/sites/:siteId/addons/:addonId
POST   /api/v2/websites/user-addons/:addonId
DELETE /api/v2/websites/user-addons/:addonId
POST   /api/v2/websites/addons (admin)
```

### Categories (Authenticated)

```
GET    /api/v2/websites/categories
POST   /api/v2/websites/categories
PUT    /api/v2/websites/categories/:id
DELETE /api/v2/websites/categories/:id
```

### Discounts

```
GET    /api/v2/websites/discounts/calculate
POST   /api/v2/websites/discounts (admin)
DELETE /api/v2/websites/discounts/:id (admin)
```

### Subscription (Authenticated)

```
GET  /api/v2/websites/subscription/my
GET  /api/v2/websites/subscription/status
POST /api/v2/websites/subscription/select-tier
GET  /api/v2/websites/subscription/terms-check
POST /api/v2/websites/subscription/terms-accept
POST /api/v2/websites/subscription/change-tier
POST /api/v2/websites/subscription/cancel
```

### Custom Domains (Authenticated)

```
GET    /api/v2/websites/domains/status/:siteId
GET    /api/v2/websites/domains/check-availability
POST   /api/v2/websites/domains/start-validation
POST   /api/v2/websites/domains/retry-validation/:siteId
POST   /api/v2/websites/domains/cancel-validation/:siteId
DELETE /api/v2/websites/domains/remove/:siteId
GET    /api/v2/websites/domains/list (admin)
```

---

## Future Enhancements & Roadmap

### Phase 1: Core Improvements (Current Focus)

**Goal:** Enhance existing functionality and user experience

1. **Template Library Expansion**
   - Create 5-10 professional templates
   - Mobile-responsive designs
   - Industry-specific templates (painters, sculptors, photographers, jewelers)
   - Template preview system

2. **Analytics Dashboard**
   - Visitor tracking per site
   - Product view analytics
   - Referral source tracking
   - Conversion metrics

3. **SEO Enhancement**
   - Meta tag customization
   - Sitemap generation per site
   - Structured data (Schema.org)
   - Social media preview optimization

4. **Mobile Optimization**
   - Responsive template testing
   - Mobile-specific customizations
   - Touch-friendly navigation

### Phase 2: Advanced Features

**Goal:** Add power features for professional users

1. **Page Builder**
   - Drag-and-drop page editor
   - Content blocks (text, images, galleries, videos)
   - Pre-built sections library
   - Mobile/desktop preview modes

2. **E-commerce Extensions**
   - Featured products widget
   - Product categories display
   - "On Sale" sections
   - New arrivals showcase
   - Bundle/collection displays

3. **Blog System Enhancement**
   - Rich text editor
   - Image galleries in posts
   - Post scheduling
   - Categories and tags
   - RSS feed generation

4. **Email Integration**
   - Newsletter signup forms
   - Welcome email automation
   - New product announcements
   - Event reminders

5. **Advanced Addons**
   - **Social Media Feed**: Instagram/Facebook integration
   - **Event Calendar**: Embed upcoming events
   - **Testimonials**: Customer review showcase
   - **Video Gallery**: YouTube/Vimeo embeds
   - **Contact Form**: Custom inquiry forms
   - **Live Chat**: Real-time customer support

### Phase 3: Professional Tier

**Goal:** Enterprise-level features for top-tier artists

1. **Custom Code Injection**
   - Custom <head> HTML
   - Custom JavaScript
   - Third-party integrations (Google Analytics, Facebook Pixel, etc.)
   - CSS overrides

2. **Multi-Language Support**
   - Content translation system
   - Language switcher
   - Locale-specific URLs

3. **Advanced Customization**
   - Custom navigation menus
   - Footer customization
   - Sidebar widgets
   - Layout variations per page

4. **Performance Optimization**
   - CDN integration
   - Image optimization
   - Lazy loading
   - Cache management

### Phase 4: Marketplace Ecosystem

**Goal:** Create a marketplace for templates and addons

1. **Template Marketplace**
   - Third-party template submissions
   - Template ratings and reviews
   - Premium template sales
   - Revenue sharing with designers

2. **Addon Marketplace**
   - Community-developed addons
   - Addon approval process
   - Paid addon support
   - Developer documentation

3. **Professional Services**
   - Custom site design service
   - One-on-one setup assistance
   - SEO consultation
   - Photography/content creation services

---

## Known Limitations & Technical Debt

### Current Limitations

1. **Template System**
   - Only 1 default template exists
   - Template application doesn't actually change CSS dynamically
   - No template preview system
   - Tier-based template filtering not implemented

2. **Addon System**
   - Addon scripts not actually loaded on storefronts
   - No addon configuration UI
   - Monthly pricing tracked but not charged
   - Category filtering UI not implemented

3. **Custom Domain**
   - DNS validation not automated (manual check required)
   - No HTTPS certificate automation
   - No CDN integration for custom domains
   - Validation expiry not enforced via cron

4. **Customization**
   - Custom CSS not sanitized or validated
   - No font loading from Google Fonts/Adobe Fonts
   - No color palette suggestions
   - No preview before save

5. **Analytics**
   - No built-in analytics system
   - No visitor tracking
   - No product view counting
   - No referral tracking

6. **Mobile**
   - No mobile-specific customization options
   - No responsive testing tools
   - No mobile preview in dashboard

7. **SEO**
   - No meta tag customization
   - No sitemap generation
   - No structured data
   - No social media preview cards

### Technical Debt

1. **Frontend**
   - Many components use inline styles instead of CSS modules
   - Inconsistent state management patterns
   - No comprehensive error handling in storefront
   - No loading skeletons

2. **Backend**
   - Tier validation in multiple places (should centralize)
   - No caching layer for frequently accessed data
   - Subdomain resolution happens on every request
   - No rate limiting on public endpoints

3. **Database**
   - No indexes on frequently queried fields (performance concern at scale)
   - Soft deletes accumulate (no cleanup process)
   - No database connection pooling optimization

4. **Testing**
   - No unit tests for services
   - No integration tests for API endpoints
   - No E2E tests for critical flows
   - No visual regression testing for templates

5. **Documentation**
   - Template developer guide missing
   - Addon developer guide missing
   - API documentation incomplete
   - User onboarding documentation needed

---

## Security Considerations

### Authentication & Authorization

- **JWT Validation**: All protected endpoints verify tokens
- **Ownership Checks**: Users can only access their own sites
- **Admin Override**: Admins can access any site (logged)
- **Permission Tiers**: Feature access gated by permission level

### Input Validation

- **Subdomain**: Strict regex, 3-63 chars, reserved words blocked
- **Custom Domain**: Domain format validation, DNS verification
- **Colors**: Hex color format validation
- **Fonts**: String validation (no validation on font availability)
- **Custom CSS**: **NOT VALIDATED** - XSS risk for professional tier users

### Data Integrity

- **Foreign Keys**: CASCADE deletes for related data
- **Unique Constraints**: Prevent duplicate subdomains/domains
- **Category Hierarchy**: Prevents circular references
- **Soft Deletes**: Preserves data for audit trail

### Public Endpoints

- **Rate Limiting**: NOT IMPLEMENTED - potential abuse vector
- **CORS**: Configured for public routes
- **Error Messages**: Don't expose internal details
- **Status Check**: Inactive sites don't expose user data

### Recommendations

1. **Sanitize Custom CSS**: Use CSS parser to prevent XSS
2. **Implement Rate Limiting**: Protect public resolve endpoints
3. **Add CAPTCHA**: On subdomain availability checks
4. **Encrypt Sensitive Data**: Custom domain validation keys
5. **Audit Logging**: Track admin access to user sites

---

## Performance Considerations

### Database Optimization

**Current Indexes:**
```sql
sites:
  - idx_user_id (user_id)
  - idx_subdomain (subdomain)
  - idx_custom_domain (custom_domain)
  - idx_status (status)
  - idx_template_id (template_id)

site_customizations:
  - idx_site_customizations_site_id (site_id)

site_addons:
  - idx_site_id (site_id)
  - idx_addon_id (addon_id)
  - idx_is_active (is_active)

user_categories:
  - idx_user_id (user_id)
  - idx_parent_id (parent_id)
  - idx_display_order (display_order)
```

**Missing Indexes:**
- `domain_validation_status` on sites (for custom domain queries)
- `user_id, is_active` composite on user_addons
- `site_id, is_active` composite on site_addons

### Caching Strategy

**Recommended Caching:**

1. **Subdomain Resolution** (15 min TTL)
   ```javascript
   Key: `site:resolve:${subdomain}`
   Value: Complete site data from resolve endpoint
   ```

2. **Site Customizations** (1 hour TTL)
   ```javascript
   Key: `site:custom:${siteId}`
   Value: Customization settings
   ```

3. **User Categories** (30 min TTL)
   ```javascript
   Key: `categories:user:${userId}`
   Value: Category hierarchy
   ```

4. **Templates List** (1 day TTL)
   ```javascript
   Key: `templates:list`
   Value: All active templates
   ```

5. **Addons List** (1 hour TTL)
   ```javascript
   Key: `addons:list`
   Value: All active addons
   ```

**Cache Invalidation:**
- On site update → clear site resolve cache
- On customization update → clear customization cache
- On category change → clear user categories cache
- On addon activation/deactivation → clear site addons cache

### Query Optimization

**N+1 Query Issues:**

1. **Site List with User Data**
   ```sql
   -- Current: 1 query for sites + N queries for users
   -- Optimized: Single JOIN query
   SELECT s.*, u.username, up.display_name
   FROM sites s
   JOIN users u ON s.user_id = u.id
   LEFT JOIN user_profiles up ON u.id = up.user_id
   WHERE s.status != 'deleted'
   ```

2. **Site Addons with Addon Details**
   ```sql
   -- Already optimized with JOIN in getMySiteAddons
   ```

### Asset Optimization

**Recommendations:**

1. **CDN Integration**
   - Serve static assets (CSS, JS, images) via CDN
   - Reduce server load
   - Improve global performance

2. **Image Optimization**
   - Automatic WebP conversion
   - Lazy loading on storefronts
   - Responsive image sizes
   - Thumbnail generation

3. **CSS/JS Minification**
   - Bundle and minify template CSS
   - Minimize addon script sizes
   - Use code splitting for large storefronts

---

## Deployment & Operations

### Environment Variables

```bash
# API Base URL
NEXT_PUBLIC_API_BASE_URL=https://brakebee.com
API_BASE_URL=http://localhost:3001

# Subdomain Configuration
SUBDOMAIN_BASE=brakebee.com

# Database
DB_HOST=10.128.0.31
DB_USER=oafuser
DB_PASSWORD=***
DB_NAME=wordpress_import

# Stripe
STRIPE_SECRET_KEY=sk_live_***
STRIPE_PUBLISHABLE_KEY=pk_live_***

# DNS Validation (future)
DNS_VALIDATION_EMAIL=admin@brakebee.com
```

### Database Migrations

**Location:** `/database/schema.sql`

**Tables Created:**
- sites
- site_customizations
- site_addons
- site_media
- website_templates
- website_addons
- user_categories
- discounts

**Migration Process:**
```bash
mysql -h 10.128.0.31 -u oafuser -p wordpress_import < database/schema.sql
```

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'staging-api',
      script: './api-service/src/server.js',
      instances: 4,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'staging'
      }
    }
  ]
};
```

### NGINX Configuration

**Subdomain Routing:**
```nginx
# Main site
server {
    server_name brakebee.com www.brakebee.com;
    # ... main site config
}

# Wildcard subdomain (artist sites)
server {
    server_name *.brakebee.com;
    # ... proxy to Next.js
    # middleware handles subdomain routing
}

# Custom domains (future)
# Dynamically added via DNS validation process
```

### SSL/TLS

**Current:**
- Let's Encrypt for main domain
- Wildcard certificate for *.brakebee.com

**Future:**
- Automated certificate generation for custom domains
- Certificate renewal automation
- ACME challenge integration

### Monitoring

**Recommendations:**

1. **Application Monitoring**
   - Error tracking (Sentry)
   - Performance monitoring (New Relic/DataDog)
   - Uptime monitoring (Pingdom)

2. **Database Monitoring**
   - Query performance
   - Slow query log
   - Connection pool status
   - Disk space alerts

3. **Business Metrics**
   - Active sites count
   - New sites per day
   - Subscription tier distribution
   - Custom domain adoption rate

---

## Testing Strategy

### Unit Tests (Recommended)

```javascript
// Test service layer functions
describe('sitesService', () => {
  test('createSite validates subdomain format', async () => {
    await expect(
      sitesService.createSite(123, { subdomain: 'invalid_name' })
    ).rejects.toThrow('Invalid subdomain format');
  });

  test('createSite enforces tier limits', async () => {
    // Mock user with 1-site limit who already has 1 site
    await expect(
      sitesService.createSite(123, { site_name: 'Second', subdomain: 'second' })
    ).rejects.toThrow('site limit');
  });
});
```

### Integration Tests (Recommended)

```javascript
// Test API endpoints
describe('POST /api/v2/websites/sites', () => {
  test('creates site with valid data', async () => {
    const response = await request(app)
      .post('/api/v2/websites/sites')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        site_name: 'Test Site',
        subdomain: 'testsite',
        site_title: 'Test'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

### E2E Tests (Recommended)

```javascript
// Test critical user flows
describe('Site Creation Flow', () => {
  test('user can create and activate site', async () => {
    await page.goto('/dashboard/websites/new');
    await page.fill('#subdomain', 'myartsite');
    await page.click('#check-availability');
    await page.waitForText('Available');
    await page.click('#create-site');
    await page.waitForURL('**/manage/**');
    await page.click('#activate-site');
    // Verify site is live
    await page.goto('https://myartsite.brakebee.com');
    await expect(page).toHaveTitle(/myartsite/);
  });
});
```

---

## Success Metrics

### Technical Metrics

- **Response Time**: < 500ms for subdomain resolution
- **Uptime**: 99.9% for active storefronts
- **Database Performance**: < 100ms for site queries
- **Error Rate**: < 0.1% for site creation/updates

### Business Metrics

- **Active Sites**: Track monthly growth
- **Conversion Rate**: Free tier → paid tier
- **Churn Rate**: Subscription cancellations
- **Customization Adoption**: % users customizing colors/fonts
- **Template Usage**: Most popular templates
- **Custom Domain Adoption**: % sites using custom domains

### User Engagement

- **Site Traffic**: Average visitors per site
- **Product Views**: Products viewed via artist sites
- **Cart Adds**: Products added to cart from artist sites
- **Affiliate Conversions**: Sales attributed to artist sites

---

## Support & Troubleshooting

### Common Issues

1. **"Subdomain already taken"**
   - Check `sites` table for existing subdomain
   - Verify not in reserved list
   - Suggest alternatives

2. **"Site not appearing"**
   - Check site status (must be 'active')
   - Verify subdomain resolution
   - Check DNS/NGINX configuration

3. **"Custom domain not working"**
   - Verify DNS TXT record
   - Check validation status
   - Retry validation endpoint
   - Verify NGINX configuration for domain

4. **"Customizations not applying"**
   - Check user permissions
   - Verify customizations saved in DB
   - Clear browser cache
   - Check CSS specificity conflicts

5. **"Products not showing on storefront"**
   - Verify products have status = 'active'
   - Check user_id matches site owner
   - Verify product images exist
   - Check API response for errors

### Debugging Tools

**Database Queries:**
```sql
-- Check site status
SELECT id, subdomain, status, user_id FROM sites WHERE subdomain = 'artistname';

-- Check customizations
SELECT * FROM site_customizations WHERE site_id = 42;

-- Check active addons
SELECT sa.*, wa.addon_name 
FROM site_addons sa 
JOIN website_addons wa ON sa.addon_id = wa.id 
WHERE sa.site_id = 42 AND sa.is_active = 1;

-- Check user subscription
SELECT * FROM user_subscriptions 
WHERE user_id = 123 AND subscription_type = 'websites';
```

**API Testing:**
```bash
# Check subdomain resolution
curl https://brakebee.com/api/v2/websites/resolve/artistname

# Check site products
curl https://brakebee.com/api/v2/websites/resolve/artistname/products?limit=5

# Check subdomain availability
curl https://brakebee.com/api/v2/websites/check-subdomain/newartist
```

---

*Document Version: 1.0*  
*Last Updated: 2026-02-07*  
*System Architect: AI Project Manager*  
*Status: ✅ Comprehensive Analysis Complete*
