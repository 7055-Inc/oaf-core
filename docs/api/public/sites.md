# Site Management API

## Overview
The Beemeeart Site Management API provides comprehensive functionality for creating and managing artist websites with custom subdomains, templates, addons, and visual customizations. It supports multitenant architecture with both subdomain routing (artist.beemeeart.com) and custom domain management.

## Authentication
Most endpoints require authentication via JWT token in the Authorization header. Public endpoints are clearly marked.

## Base URL
```
https://api.beemeeart.com/sites
```

## Site Management

### Get User's Sites
`GET /sites/me`

Retrieve all sites belonging to the authenticated user.

**Authentication:** Required - Bearer token with site management permissions

**Response (200 OK):**
```json
[
  {
    "id": 123,
    "user_id": 456,
    "site_name": "My Art Gallery",
    "subdomain": "myartgallery",
    "site_title": "Welcome to My Art Gallery",
    "site_description": "Contemporary paintings and sculptures",
    "theme_name": "modern",
    "status": "active",
    "custom_domain": null,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
]
```

### Create Site
`POST /sites`

Create a new site with subdomain for the authenticated user.

**Authentication:** Required - Bearer token (artist or admin users only)

**Request Body:**
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
- **Subdomain Format:** 3-63 characters, alphanumeric and hyphens only
- **Uniqueness:** Subdomain must be unique across the platform
- **Site Limits:** Non-admin users limited to 1 site currently

**Response (201 Created):**
```json
{
  "id": 124,
  "user_id": 456,
  "site_name": "My Art Studio",
  "subdomain": "myartstudio",
  "site_title": "Welcome to My Art Studio",
  "site_description": "Contemporary art and sculptures",
  "theme_name": "default",
  "status": "draft",
  "created_at": "2024-01-15T11:00:00Z"
}
```

### Update Site
`PUT /sites/{id}`

Update an existing site's configuration.

**Authentication:** Required - Bearer token (site owner or admin)

**Parameters:**
- `id` (path): Site ID

**Request Body:**
```json
{
  "site_name": "Updated Art Studio",
  "site_title": "Welcome to My Updated Studio",
  "site_description": "Modern contemporary art and digital sculptures",
  "theme_name": "modern",
  "status": "active",
  "custom_domain": "myartstudio.com"
}
```

**Custom Domain Validation:**
- Must be valid domain format (e.g., example.com)
- DNS verification required for activation (future enhancement)

**Response (200 OK):**
```json
{
  "id": 124,
  "site_name": "Updated Art Studio",
  "site_title": "Welcome to My Updated Studio",
  "custom_domain": "myartstudio.com",
  "status": "active",
  "updated_at": "2024-01-15T12:00:00Z"
}
```

### Delete Site
`DELETE /sites/{id}`

Delete a site (soft delete - preserves data).

**Authentication:** Required - Bearer token (site owner or admin)

**Parameters:**
- `id` (path): Site ID

**Response (200 OK):**
```json
{
  "message": "Site deleted successfully"
}
```

**Note:** This is a soft delete - the site status is set to 'deleted' but data is preserved.

## Template Management

### Get Available Templates
`GET /sites/templates`

Get all available website templates.

**Authentication:** Required - Bearer token

**Response (200 OK):**
```json
{
  "success": true,
  "templates": [
    {
      "id": 1,
      "template_name": "Modern Artist",
      "template_slug": "modern-artist",
      "description": "Clean, modern template perfect for contemporary artists",
      "preview_image_url": "https://api.beemeeart.com/previews/modern-artist.jpg",
      "tier_required": "basic"
    },
    {
      "id": 2,
      "template_name": "Classic Gallery",
      "template_slug": "classic-gallery",
      "description": "Traditional gallery-style template",
      "preview_image_url": "https://api.beemeeart.com/previews/classic-gallery.jpg",
      "tier_required": "professional"
    }
  ]
}
```

### Get Template Details
`GET /sites/templates/{id}`

Get detailed information for a specific template.

**Authentication:** Required - Bearer token

**Parameters:**
- `id` (path): Template ID

**Response (200 OK):**
```json
{
  "success": true,
  "template": {
    "id": 1,
    "template_name": "Modern Artist",
    "template_slug": "modern-artist",
    "description": "Clean, modern template perfect for contemporary artists",
    "css_file_path": "/templates/modern-artist.css",
    "preview_image_url": "https://api.beemeeart.com/previews/modern-artist.jpg",
    "tier_required": "basic",
    "display_order": 1,
    "is_active": true,
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### Apply Template
`PUT /sites/template/{id}`

Apply a template to the user's site.

**Authentication:** Required - Bearer token with site management permissions

**Parameters:**
- `id` (path): Template ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Template applied successfully",
  "template_id": 1
}
```

## Addon Management

### Get Available Addons
`GET /sites/addons`

Get all available website addons with ownership status.

**Authentication:** Required - Bearer token

**Response (200 OK):**
```json
{
  "success": true,
  "addons": [
    {
      "id": 1,
      "addon_name": "Advanced Analytics",
      "addon_slug": "advanced-analytics",
      "description": "Detailed visitor analytics and insights",
      "tier_required": "professional",
      "monthly_price": 9.99,
      "user_level": 0,
      "addon_scope": "site",
      "category": "analytics",
      "user_already_has": false
    },
    {
      "id": 2,
      "addon_name": "Email Marketing",
      "addon_slug": "email-marketing",
      "description": "Built-in email marketing tools",
      "tier_required": "basic",
      "monthly_price": 14.99,
      "user_level": 1,
      "addon_scope": "user",
      "category": "marketing",
      "user_already_has": true
    }
  ]
}
```

**Addon Scopes:**
- **Site-level:** Apply to specific sites individually
- **User-level:** Apply to all of the user's sites

### Get User's Active Addons
`GET /sites/my-addons`

Get addons currently active on the user's site.

**Authentication:** Required - Bearer token with site management permissions

**Response (200 OK):**
```json
{
  "success": true,
  "addons": [
    {
      "id": 1,
      "addon_name": "Advanced Analytics",
      "addon_slug": "advanced-analytics",
      "addon_script_path": "/addons/analytics.js",
      "monthly_price": 9.99,
      "activated_at": "2024-01-10T14:30:00Z"
    }
  ]
}
```

### Activate Site Addon
`POST /sites/addons/{id}`

Activate an addon for the user's site.

**Authentication:** Required - Bearer token with site management permissions

**Parameters:**
- `id` (path): Addon ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Advanced Analytics addon activated successfully",
  "addon_id": 1
}
```

### Deactivate Site Addon
`DELETE /sites/addons/{id}`

Deactivate an addon from the user's site.

**Authentication:** Required - Bearer token with site management permissions

**Parameters:**
- `id` (path): Addon ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Addon deactivated successfully"
}
```

### Activate User-Level Addon
`POST /sites/user-addons/{id}`

Activate a user-level addon (applies to all user's sites).

**Authentication:** Required - Bearer token

**Parameters:**
- `id` (path): User-level addon ID

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Email Marketing activated successfully",
  "addon_id": 2
}
```

## Site Customization

### Get Site Customizations
`GET /sites/{id}/customizations`

Get current customization settings for a site.

**Authentication:** Required - Bearer token with sites permissions

**Parameters:**
- `id` (path): Site ID

**Response (200 OK):**
```json
{
  "success": true,
  "customizations": {
    "text_color": "#374151",
    "main_color": "#667eea",
    "secondary_color": "#764ba2",
    "accent_color": "#ff6b6b",
    "background_color": "#ffffff",
    "body_font": "Inter, sans-serif",
    "header_font": "Playfair Display, serif",
    "h1_font": "Playfair Display, serif",
    "h2_font": "Inter, sans-serif",
    "custom_css": ".custom-style { color: #333; }"
  }
}
```

### Update Site Customizations
`PUT /sites/{id}/customizations`

Update site customization settings with permission-based validation.

**Authentication:** Required - Bearer token with sites permissions

**Parameters:**
- `id` (path): Site ID

**Permission Tiers:**
- **Basic (sites):** text_color, main_color, secondary_color
- **Advanced (manage_sites):** Basic + accent_color, background_color, body_font, header_font
- **Professional (professional_sites):** Advanced + h1_font, h2_font, h3_font, h4_font, custom_css

**Request Body:**
```json
{
  "text_color": "#2c3e50",
  "main_color": "#3498db",
  "secondary_color": "#e74c3c",
  "accent_color": "#f39c12",
  "background_color": "#ecf0f1",
  "body_font": "Open Sans, sans-serif",
  "header_font": "Montserrat, sans-serif",
  "custom_css": ".hero { background: linear-gradient(45deg, #3498db, #e74c3c); }"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Customizations updated successfully",
  "customizations": {
    "text_color": "#2c3e50",
    "main_color": "#3498db",
    "secondary_color": "#e74c3c",
    "accent_color": "#f39c12",
    "background_color": "#ecf0f1",
    "body_font": "Open Sans, sans-serif",
    "header_font": "Montserrat, sans-serif",
    "custom_css": ".hero { background: linear-gradient(45deg, #3498db, #e74c3c); }",
    "updated_at": "2024-01-15T15:30:00Z"
  }
}
```

## Category Management

### Get User Categories
`GET /sites/categories`

Get the user's custom categories for content organization.

**Authentication:** Required - Bearer token

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "user_id": 456,
    "name": "Paintings",
    "description": "Oil and acrylic paintings",
    "parent_id": null,
    "display_order": 1,
    "created_at": "2024-01-10T10:00:00Z"
  },
  {
    "id": 2,
    "user_id": 456,
    "name": "Abstract",
    "description": "Abstract paintings",
    "parent_id": 1,
    "display_order": 1,
    "created_at": "2024-01-10T10:30:00Z"
  }
]
```

### Create Category
`POST /sites/categories`

Create a new custom category.

**Authentication:** Required - Bearer token

**Request Body:**
```json
{
  "name": "Sculptures",
  "description": "Three-dimensional artworks",
  "parent_id": null,
  "display_order": 2
}
```

**Response (201 Created):**
```json
{
  "id": 3,
  "user_id": 456,
  "name": "Sculptures",
  "description": "Three-dimensional artworks",
  "parent_id": null,
  "display_order": 2,
  "created_at": "2024-01-15T16:00:00Z"
}
```

### Update Category
`PUT /sites/categories/{id}`

Update an existing category.

**Authentication:** Required - Bearer token

**Parameters:**
- `id` (path): Category ID

**Request Body:**
```json
{
  "name": "Mixed Media Sculptures",
  "description": "Sculptures using multiple materials",
  "parent_id": null,
  "display_order": 2
}
```

**Response (200 OK):**
```json
{
  "id": 3,
  "name": "Mixed Media Sculptures",
  "description": "Sculptures using multiple materials",
  "parent_id": null,
  "display_order": 2,
  "updated_at": "2024-01-15T16:30:00Z"
}
```

### Delete Category
`DELETE /sites/categories/{id}`

Delete a category (prevents deletion if it has subcategories).

**Authentication:** Required - Bearer token

**Parameters:**
- `id` (path): Category ID

**Response (200 OK):**
```json
{
  "message": "Category deleted successfully"
}
```

## Public Site Access

### Resolve Subdomain
`GET /sites/resolve/{subdomain}`

Get complete site information for a subdomain (public access).

**Authentication:** None required (public endpoint)

**Parameters:**
- `subdomain` (path): Site subdomain

**Response (200 OK):**
```json
{
  "id": 123,
  "user_id": 456,
  "site_name": "My Art Gallery",
  "subdomain": "myartgallery",
  "site_title": "Welcome to My Art Gallery",
  "site_description": "Contemporary paintings and sculptures",
  "theme_name": "modern",
  "status": "active",
  "username": "artist123",
  "first_name": "Jane",
  "last_name": "Smith",
  "bio": "Contemporary artist specializing in abstract paintings",
  "profile_image_path": "/profiles/artist123.jpg",
  "header_image_path": "/headers/artist123-header.jpg",
  "primary_color": "#667eea",
  "secondary_color": "#764ba2",
  "text_color": "#374151",
  "accent_color": "#ff6b6b",
  "background_color": "#ffffff"
}
```

### Get Site Products
`GET /sites/resolve/{subdomain}/products`

Get products for a public site storefront.

**Authentication:** None required (public endpoint)

**Parameters:**
- `subdomain` (path): Site subdomain

**Query Parameters:**
- `limit` (number, default: 20): Number of products to return
- `offset` (number, default: 0): Pagination offset
- `category` (string): Filter by category ID

**Response (200 OK):**
```json
[
  {
    "id": 789,
    "name": "Abstract Composition #1",
    "description": "Large abstract painting in blues and greens",
    "price": 1200.00,
    "status": "active",
    "image_path": "/images/products/abstract-1.jpg",
    "alt_text": "Abstract painting with flowing blue and green forms",
    "is_primary": true,
    "created_at": "2024-01-12T14:00:00Z"
  }
]
```

### Get Site Articles
`GET /sites/resolve/{subdomain}/articles`

Get articles for a public site.

**Authentication:** None required (public endpoint)

**Parameters:**
- `subdomain` (path): Site subdomain

**Query Parameters:**
- `type` (string, default: 'all'): Article type filter
  - `menu`: Articles for site navigation
  - `blog`: Blog posts
  - `pages`: Static pages
  - `all`: All published articles
- `limit` (number, default: 10): Number of articles to return
- `offset` (number, default: 0): Pagination offset

**Response (200 OK):**
```json
[
  {
    "id": 456,
    "title": "My Artistic Journey",
    "content": "I started painting when I was...",
    "status": "published",
    "page_type": "blog_post",
    "site_menu_display": "yes",
    "site_blog_display": "yes",
    "menu_order": 1,
    "featured_image_path": "/media/journey-featured.jpg",
    "published_at": "2024-01-10T12:00:00Z"
  }
]
```

### Get Site Categories
`GET /sites/resolve/{subdomain}/categories`

Get categories for a public site.

**Authentication:** None required (public endpoint)

**Parameters:**
- `subdomain` (path): Site subdomain

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Paintings",
    "description": "Oil and acrylic paintings",
    "parent_id": null,
    "display_order": 1
  },
  {
    "id": 2,
    "name": "Abstract",
    "description": "Abstract paintings",
    "parent_id": 1,
    "display_order": 1
  }
]
```

## Utility Endpoints

### Check Subdomain Availability
`GET /sites/check-subdomain/{subdomain}`

Check if a subdomain is available for registration.

**Authentication:** None required (public endpoint)

**Parameters:**
- `subdomain` (path): Subdomain to check

**Response (200 OK):**
```json
{
  "available": true,
  "reason": null
}
```

**Unavailable Response:**
```json
{
  "available": false,
  "reason": "Already taken"
}
```

**Validation Rules:**
- **Format:** 3-63 characters, alphanumeric and hyphens only
- **Reserved:** Cannot use www, api, admin, app, mail, ftp, blog, shop, store, signup
- **Uniqueness:** Must not already exist

### Resolve Custom Domain
`GET /sites/resolve-custom-domain/{domain}`

Resolve a custom domain to site information.

**Authentication:** None required (public endpoint)

**Parameters:**
- `domain` (path): Custom domain to resolve

**Response (200 OK):**
```json
{
  "subdomain": "myartgallery",
  "user_id": 456,
  "site_name": "My Art Gallery",
  "theme_name": "modern"
}
```

**Requirements:**
- Custom domain must be verified
- Custom domain must be active

## Discount System (Admin Only)

### Calculate Discounts
`GET /sites/discounts/calculate`

Calculate applicable discounts for a user and subscription type.

**Authentication:** Required - Bearer token

**Query Parameters:**
- `subscription_type` (string, required): Subscription type to calculate for

**Response (200 OK):**
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
      "can_stack": true,
      "valid_from": "2024-01-01T00:00:00Z",
      "valid_until": "2024-12-31T23:59:59Z"
    }
  ],
  "stacking_applied": "stacked_discounts"
}
```

**Stacking Logic:**
- If any discount has `can_stack = false`, only that discount applies
- Otherwise, all applicable discounts stack together
- Discounts are ordered by priority (ascending)

## Error Responses

### Standard Error Format
```json
{
  "error": "Error description"
}
```

### Common Error Codes
- `400` - Bad Request (validation errors, invalid data)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (site/resource not found)
- `409` - Conflict (duplicate subdomain, category name)
- `500` - Internal Server Error (server error)

## Rate Limits
- **Site creation:** 5 requests per hour per user
- **Template/addon changes:** 20 requests per hour per user
- **Customization updates:** 30 requests per hour per user
- **General queries:** 100 requests per minute per user

## Integration Examples

### Complete Site Setup Workflow
```javascript
// 1. Check subdomain availability
const availabilityResponse = await fetch('/sites/check-subdomain/myartspace');
const { available } = await availabilityResponse.json();

if (!available) {
  throw new Error('Subdomain not available');
}

// 2. Create site
const siteData = {
  site_name: 'My Art Space',
  subdomain: 'myartspace',
  site_title: 'Welcome to My Art Space',
  site_description: 'Contemporary digital art and installations'
};

const siteResponse = await fetch('/sites', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(siteData)
});

const site = await siteResponse.json();

// 3. Apply template
await fetch(`/sites/template/2`, {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${token}` }
});

// 4. Customize colors
const customizations = {
  main_color: '#e74c3c',
  secondary_color: '#3498db',
  text_color: '#2c3e50'
};

await fetch(`/sites/${site.id}/customizations`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(customizations)
});

// 5. Activate addon
await fetch('/sites/addons/1', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Public Site Loading
```javascript
// Load complete site data
const siteResponse = await fetch('/sites/resolve/myartspace');
const siteData = await siteResponse.json();

// Load site products
const productsResponse = await fetch('/sites/resolve/myartspace/products?limit=12');
const products = await productsResponse.json();

// Load blog articles
const articlesResponse = await fetch('/sites/resolve/myartspace/articles?type=blog&limit=5');
const articles = await articlesResponse.json();

// Load categories for navigation
const categoriesResponse = await fetch('/sites/resolve/myartspace/categories');
const categories = await categoriesResponse.json();

// Build site structure
const siteStructure = {
  info: siteData,
  products: products,
  blog: articles,
  navigation: categories
};
```

### Category Management
```javascript
// Create main category
const mainCategory = await fetch('/sites/categories', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Paintings',
    description: 'Original paintings and prints',
    display_order: 1
  })
});

const { id: parentId } = await mainCategory.json();

// Create subcategory
await fetch('/sites/categories', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Abstract Paintings',
    description: 'Abstract and non-representational works',
    parent_id: parentId,
    display_order: 1
  })
});
```
