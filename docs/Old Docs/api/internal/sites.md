# sites.js - Internal Documentation

## Overview
Comprehensive site and subdomain management system for the Beemeeart platform. This module handles the complete lifecycle of artist sites including creation, customization, templates, addons, discounts, and multitenant subdomain resolution. Supports both subdomain routing (artist.beemeeart.com) and custom domain management.

## Architecture
- **Type:** Route Layer (API Endpoints) - Site Management System
- **Dependencies:** express, database connection, jwt middleware, permissions middleware
- **Database Tables:**
  - `sites` - Core site records with subdomain and configuration
  - `site_customizations` - Visual customization settings (colors, fonts, CSS)
  - `site_addons` - Site-specific addon activations
  - `user_addons` - User-level addon subscriptions
  - `website_templates` - Available site templates
  - `website_addons` - Available addon definitions
  - `discounts` - User-specific discount configurations
  - `user_categories` - Custom category hierarchies
  - `users` - User accounts and permissions
  - `user_profiles` - User profile information
  - `user_permissions` - Permission-based access control
  - `products` - Product catalog for site storefronts
  - `articles` - Content management for sites
  - `media_library` - Media assets for sites
- **External Services:** Subdomain routing, custom domain validation, template engine

## Discount Management System

### GET /sites/discounts/calculate
**Purpose:** Calculate applicable discounts for a user and subscription type

**Authentication:** Required - JWT token

**Query Parameters:**
- `subscription_type` (required): Type of subscription to calculate discounts for

**Discount Logic:**
- **Priority Ordering:** Discounts applied by priority (ASC)
- **Stacking Rules:** 
  - If any discount has `can_stack = false`, only that discount applies
  - Otherwise, all applicable discounts stack
- **Validation:** Only active discounts within valid date ranges
- **Chaining:** Prevents multiple discounts of same type if `can_chain = false`

**Response Structure:**
```json
{
  "success": true,
  "discounts": [
    {
      "id": 123,
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

### POST /sites/discounts
**Purpose:** Create new discount for a user (admin only)

**Authentication:** Required - JWT token + manage_system permissions

**Request Body Fields:**
```json
{
  "user_id": 456,
  "subscription_type": "professional",
  "discount_code": "ARTIST50",
  "discount_type": "percentage",
  "discount_value": 50.00,
  "priority": 10,
  "can_stack": true,
  "can_chain": false,
  "valid_from": "2024-01-01T00:00:00Z",
  "valid_until": "2024-12-31T23:59:59Z"
}
```

**Validation Rules:**
- **Chaining Check:** If `can_chain = false`, prevents duplicate discount types
- **Required Fields:** user_id, subscription_type, discount_code, discount_type, discount_value
- **Priority:** Defaults to 10 if not specified
- **Stacking:** Defaults to true if not specified

### DELETE /sites/discounts/:id
**Purpose:** Remove discount from system (admin only)

**Authentication:** Required - JWT token + manage_system permissions

**Process:** Permanently deletes discount record from database

## Template Management System

### GET /sites/templates
**Purpose:** Get available website templates filtered by subscription tier

**Authentication:** Required - JWT token

**Template Structure:**
- **Basic Info:** id, template_name, template_slug, description
- **Visual:** preview_image_url for template previews
- **Access:** tier_required for subscription filtering
- **Ordering:** display_order for template presentation

**Future Enhancement:** Phase 3 will add subscription tier filtering

### GET /sites/templates/:id
**Purpose:** Get detailed information for specific template

**Authentication:** Required - JWT token

**Returns:** Complete template configuration including CSS paths and metadata

### PUT /sites/template/:id
**Purpose:** Apply template to user's site

**Authentication:** Required - JWT token + manage_sites permissions

**Process:**
1. Validates template exists and is active
2. Verifies user has site to apply template to
3. Updates site's template_id
4. Future: Will add subscription tier validation

### POST /sites/templates
**Purpose:** Create new website template (admin only)

**Authentication:** Required - JWT token + manage_system permissions

**Request Body Fields:**
```json
{
  "template_name": "Modern Artist",
  "template_slug": "modern-artist",
  "description": "Clean, modern template for artists",
  "css_file_path": "/templates/modern-artist.css",
  "preview_image_url": "/previews/modern-artist.jpg",
  "tier_required": "basic",
  "display_order": 1
}
```

## Addon Management System

### Addon Types
- **Site-Level Addons:** Apply to specific sites (user_level = 0)
- **User-Level Addons:** Apply to all user's sites (user_level = 1)

### GET /sites/addons
**Purpose:** Get available addons with ownership status

**Authentication:** Required - JWT token

**Response Enhancement:**
- Marks which user-level addons user already owns
- Categorizes addons by scope (user vs site)
- Shows pricing and tier requirements

### GET /sites/my-addons
**Purpose:** Get user's currently active site addons

**Authentication:** Required - JWT token + manage_sites permissions

**Returns:** Active addons for user's site with activation dates and pricing

### GET /sites/:id/addons (PUBLIC)
**Purpose:** Get active addons for public site display

**Authentication:** None required (public endpoint)

**Use Case:** Artist storefronts loading active addons for functionality

### POST /sites/addons/:id
**Purpose:** Activate addon for user's site

**Authentication:** Required - JWT token + manage_sites permissions

**Process:**
1. Validates addon exists and is active
2. Checks user has site to add addon to
3. Prevents duplicate addon activations
4. Future: Will add subscription tier validation

### DELETE /sites/addons/:id
**Purpose:** Deactivate addon from user's site

**Authentication:** Required - JWT token + manage_sites permissions

**Process:** Soft deactivation - sets is_active = 0 and records deactivation timestamp

### POST /sites/user-addons/:id
**Purpose:** Activate user-level addon (applies to all sites)

**Authentication:** Required - JWT token

**Process:**
1. Validates addon is user-level (user_level = 1)
2. Prevents duplicate activations
3. Records marketplace subscription source
4. Uses upsert pattern for reactivation

### POST /sites/addons
**Purpose:** Create new addon (admin only)

**Authentication:** Required - JWT token + manage_system permissions

**Request Body Fields:**
```json
{
  "addon_name": "Advanced Analytics",
  "addon_slug": "advanced-analytics",
  "description": "Detailed site analytics and reporting",
  "addon_script_path": "/addons/analytics.js",
  "tier_required": "professional",
  "monthly_price": 9.99,
  "display_order": 5
}
```

## Site Management System

### GET /sites/me
**Purpose:** Get all sites belonging to current user

**Authentication:** Required - JWT token + manage_sites permissions

**Returns:** User's sites ordered by creation date (newest first)

### GET /sites/all
**Purpose:** Get all sites in system (admin only)

**Authentication:** Required - JWT token + admin user_type

**Returns:** All sites with user information for administrative purposes

**Admin Check:** Validates user_type = 'admin' before returning data

### POST /sites
**Purpose:** Create new site for authenticated user

**Authentication:** Required - JWT token

**Request Body Fields:**
```json
{
  "site_name": "My Art Studio",
  "subdomain": "myartstudio",
  "site_title": "Welcome to My Art Studio",
  "site_description": "Contemporary art and sculptures",
  "theme_name": "default"
}
```

**Validation Rules:**
- **User Type:** Only artists and admins can create sites
- **Subdomain Format:** Alphanumeric + hyphens, 3-63 characters
- **Uniqueness:** Subdomain must be unique across platform
- **Site Limits:** Non-admins limited to 1 site (future: subscription-based limits)

**Subdomain Validation Regex:** `/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/`

### PUT /sites/:id
**Purpose:** Update existing site configuration

**Authentication:** Required - JWT token

**Authorization Rules:**
- Site owner can update own site
- Admins can update any site
- Only artists and admins can perform updates

**Custom Domain Validation:**
- **Format:** Standard domain regex validation
- **DNS:** Future enhancement will add DNS verification

**Custom Domain Regex:** `/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/`

### DELETE /sites/:id
**Purpose:** Delete site (soft delete)

**Authentication:** Required - JWT token

**Process:**
- Sets status to 'deleted' instead of removing record
- Preserves site data for historical purposes
- Same authorization rules as update

## User Categories Management

### GET /sites/categories
**Purpose:** Get user's custom categories for content organization

**Authentication:** Required - JWT token

**Returns:** Hierarchical category structure with display ordering

### POST /sites/categories
**Purpose:** Create new custom category

**Authentication:** Required - JWT token

**Request Body Fields:**
```json
{
  "name": "Sculptures",
  "description": "Three-dimensional artworks",
  "parent_id": null,
  "display_order": 1
}
```

**Validation:**
- **Uniqueness:** Category name must be unique per user
- **Parent Validation:** If parent_id provided, must belong to same user
- **Hierarchy:** Supports parent-child relationships

### PUT /sites/categories/:id
**Purpose:** Update existing custom category

**Authentication:** Required - JWT token

**Circular Reference Prevention:** Category cannot be its own parent

### DELETE /sites/categories/:id
**Purpose:** Delete custom category

**Authentication:** Required - JWT token

**Data Integrity:** Prevents deletion of categories with subcategories

## Subdomain Resolution & Public Routes

### GET /sites/resolve/:subdomain (PUBLIC)
**Purpose:** Resolve subdomain to complete site data

**Authentication:** None required (public endpoint)

**Returns:** Complete site information including:
- Site configuration and status
- User profile information
- Site customization settings (colors, fonts)
- Profile and header images

**Query Structure:**
```sql
SELECT s.*, u.username, up.first_name, up.last_name, up.bio, 
       up.profile_image_path, up.header_image_path,
       sc.main_color as primary_color, sc.secondary_color, 
       sc.text_color, sc.accent_color, sc.background_color
FROM sites s 
JOIN users u ON s.user_id = u.id 
LEFT JOIN user_profiles up ON u.id = up.user_id 
LEFT JOIN site_customizations sc ON s.id = sc.site_id
WHERE s.subdomain = ? AND s.status = 'active'
```

### GET /sites/resolve/:subdomain/products (PUBLIC)
**Purpose:** Get products for public site storefront

**Authentication:** None required (public endpoint)

**Query Parameters:**
- `limit` (default: 20): Number of products to return
- `offset` (default: 0): Pagination offset
- `category`: Category filter

**Product Logic:**
- Only shows parent products (simple + variable parents)
- Hides child variation products from public listings
- Only active products visible
- Includes primary product images

### GET /sites/resolve/:subdomain/articles (PUBLIC)
**Purpose:** Get articles for public site content

**Authentication:** None required (public endpoint)

**Query Parameters:**
- `type` (default: 'all'): Article type filter
  - `menu`: Articles displayed in site menu
  - `blog`: Blog posts for site blog
  - `pages`: Static pages (non-blog content)
  - `all`: All published articles
- `limit` (default: 10): Number of articles to return
- `offset` (default: 0): Pagination offset

**Article Types:**
- **Menu Articles:** Ordered by menu_order ASC
- **Blog Articles:** Ordered by published_at DESC
- **Page Articles:** Non-blog content ordered by menu_order ASC

### GET /sites/resolve/:subdomain/categories (PUBLIC)
**Purpose:** Get categories for public site navigation

**Authentication:** None required (public endpoint)

**Returns:** User's custom categories for site navigation and filtering

## Site Customization System

### Permission Tiers
- **Basic (sites):** 3 basic colors (text, main, secondary)
- **Advanced (manage_sites):** 5 colors + fonts (accent, background, body_font, header_font)
- **Professional (professional_sites):** Everything + custom CSS + individual heading fonts

### GET /sites/:id/customizations
**Purpose:** Get site customization settings

**Authentication:** Required - JWT token + sites permissions

**Authorization:**
- Site owner can access own customizations
- Admins can access any site's customizations

**Default Values:**
```json
{
  "text_color": "#374151",
  "main_color": "#667eea",
  "secondary_color": "#764ba2",
  "accent_color": null,
  "background_color": null,
  "body_font": "-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif",
  "header_font": "Georgia, \"Times New Roman\", Times, serif"
}
```

### PUT /sites/:id/customizations
**Purpose:** Update site customization settings with tiered validation

**Authentication:** Required - JWT token + sites permissions

**Permission-Based Updates:**
- **Basic Tier:** Can update text_color, main_color, secondary_color
- **Advanced Tier:** Basic + accent_color, background_color, body_font, header_font
- **Professional Tier:** Advanced + h1_font, h2_font, h3_font, h4_font, custom_css

**Update Process:**
1. Validates site ownership or admin access
2. Checks user permissions for requested customizations
3. Uses upsert pattern (insert if not exists, update if exists)
4. Returns updated customization settings

## Utility Routes

### GET /sites/check-subdomain/:subdomain (PUBLIC)
**Purpose:** Check subdomain availability for registration

**Authentication:** None required (public endpoint)

**Validation Rules:**
- **Format:** Alphanumeric + hyphens, 3-63 characters
- **Reserved Names:** www, api, admin, app, mail, ftp, blog, shop, store, signup
- **Uniqueness:** Must not exist in sites table

**Response Structure:**
```json
{
  "available": true,
  "reason": null
}
```

**Unavailable Reasons:**
- "Invalid format"
- "Reserved subdomain"
- "Already taken"

### GET /sites/resolve-custom-domain/:domain
**Purpose:** Resolve custom domain to site information

**Authentication:** None required (public endpoint)

**Requirements:**
- Custom domain must be verified (`domain_validation_status = 'verified'`)
- Custom domain must be active (`custom_domain_active = 1`)

**Returns:** Site information for verified custom domains

## Environment Variables
No environment variables are directly used in this file. All domain references are handled through the database and subdomain resolution system.

## Security Considerations

### Authentication & Authorization
- **JWT Validation:** All protected endpoints require valid JWT tokens
- **Permission Levels:** Tiered permissions (sites, manage_sites, professional_sites, manage_system)
- **Ownership Verification:** Users can only manage their own sites (except admins)
- **Admin Override:** Admins can manage any site or system resource

### Data Validation
- **Subdomain Format:** Strict regex validation for subdomain format
- **Custom Domain:** Domain format validation for custom domains
- **Category Hierarchy:** Prevents circular references in category structure
- **Discount Logic:** Validates discount stacking and chaining rules

### Access Control
- **Public Endpoints:** Only return active, published content
- **Site Ownership:** Strict ownership validation for site management
- **Permission Tiers:** Customization features gated by subscription level
- **Admin Functions:** System management restricted to admin users

## Performance Considerations

### Database Optimization
- **Efficient Queries:** Optimized JOIN queries for site resolution
- **Index Usage:** Proper indexing on subdomain, user_id, site_id
- **Pagination:** Built-in pagination for product and article listings
- **Conditional Loading:** Only loads requested customization data

### Subdomain Resolution
- **Single Query:** Complete site data in one database query
- **Caching Ready:** Structure optimized for future caching implementation
- **Public Performance:** Optimized queries for public site loading
- **Image Optimization:** Efficient image path resolution

### Customization System
- **Upsert Pattern:** Efficient insert/update for customizations
- **Permission Caching:** User permissions loaded once per request
- **Default Values:** Efficient default value handling
- **Tiered Updates:** Only processes fields user has permission to modify

## Error Handling

### Site Errors
- **Not Found:** 404 for non-existent sites or subdomains
- **Access Denied:** 403 for unauthorized access attempts
- **Invalid Data:** 400 for validation failures
- **Duplicate Subdomain:** 400 for subdomain conflicts

### Template/Addon Errors
- **Template Not Found:** 404 for invalid template IDs
- **Addon Conflicts:** 400 for duplicate addon activations
- **Tier Restrictions:** 403 for subscription tier violations
- **System Errors:** 500 for database or system failures

### Customization Errors
- **Permission Denied:** 403 for insufficient customization permissions
- **Invalid Colors:** 400 for invalid color format validation
- **CSS Validation:** Future enhancement for custom CSS validation
- **Font Validation:** Future enhancement for font availability checking

## Usage Examples

### Create Site with Subdomain
```javascript
const siteData = {
  site_name: 'My Art Gallery',
  subdomain: 'myartgallery',
  site_title: 'Welcome to My Art Gallery',
  site_description: 'Contemporary paintings and sculptures',
  theme_name: 'modern'
};

const response = await fetch('/sites', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(siteData)
});
```

### Apply Template to Site
```javascript
const response = await fetch('/sites/template/5', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Activate Site Addon
```javascript
const response = await fetch('/sites/addons/12', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Update Site Customizations
```javascript
const customizations = {
  main_color: '#ff6b6b',
  secondary_color: '#4ecdc4',
  text_color: '#2c3e50',
  body_font: 'Inter, sans-serif'
};

const response = await fetch('/sites/123/customizations', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(customizations)
});
```

### Check Subdomain Availability
```javascript
const response = await fetch('/sites/check-subdomain/myartspace');
const { available, reason } = await response.json();

if (available) {
  console.log('Subdomain is available!');
} else {
  console.log(`Subdomain unavailable: ${reason}`);
}
```

### Resolve Public Site Data
```javascript
// Get complete site information
const siteResponse = await fetch('/sites/resolve/myartgallery');
const siteData = await siteResponse.json();

// Get site's products
const productsResponse = await fetch('/sites/resolve/myartgallery/products?limit=12');
const products = await productsResponse.json();

// Get site's blog articles
const articlesResponse = await fetch('/sites/resolve/myartgallery/articles?type=blog&limit=5');
const articles = await articlesResponse.json();
```

### Create Discount (Admin)
```javascript
const discountData = {
  user_id: 456,
  subscription_type: 'professional',
  discount_code: 'ARTIST50',
  discount_type: 'percentage',
  discount_value: 50.00,
  priority: 5,
  can_stack: true,
  can_chain: false,
  valid_from: '2024-01-01T00:00:00Z',
  valid_until: '2024-12-31T23:59:59Z'
};

const response = await fetch('/sites/discounts', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(discountData)
});
```

### Calculate User Discounts
```javascript
const response = await fetch('/sites/discounts/calculate?subscription_type=professional', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { discounts, stacking_applied } = await response.json();
console.log(`Found ${discounts.length} applicable discounts`);
console.log(`Stacking method: ${stacking_applied}`);
```
