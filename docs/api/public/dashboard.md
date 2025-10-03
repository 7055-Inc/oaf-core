# Dashboard Management API

## Overview
The Beemeeart Dashboard Management API provides a unified interface for accessing user-specific dashboard data, analytics, and management tools. It consolidates functionality from various permission-based systems into a cohesive dashboard experience with role-based access control.

## Authentication
All endpoints require authentication via JWT token in the Authorization header.

## Base URL
```
https://api.beemeeart.com/dashboard
```

## Dashboard Overview

### Get Dashboard Overview
`GET /dashboard/overview`

Get comprehensive dashboard overview with dynamically generated sections based on user permissions.

**Authentication:** Required - Bearer token

**Response (200 OK):**
```json
{
  "user": {
    "username": "artist123",
    "user_type": "artist",
    "display_name": "Jane Smith"
  },
  "userType": "artist",
  "permissions": ["vendor", "manage_sites", "manage_content"],
  "sections": [
    {
      "name": "vendor",
      "title": "E-commerce & Sales",
      "description": "Manage products, orders, and financial information",
      "endpoints": [
        "/dashboard/vendor/overview",
        "/dashboard/vendor/products",
        "/dashboard/vendor/orders"
      ]
    },
    {
      "name": "sites",
      "title": "Website Management",
      "description": "Create and manage your websites",
      "endpoints": [
        "/dashboard/sites/my",
        "/dashboard/sites/domains"
      ]
    },
    {
      "name": "content",
      "title": "Content Creation",
      "description": "Create and manage articles, topics, and content",
      "endpoints": [
        "/dashboard/content/articles",
        "/dashboard/content/topics"
      ]
    }
  ]
}
```

**Dynamic Sections:**
Dashboard sections are automatically generated based on user permissions:
- **vendor** permission → E-commerce & Sales section
- **manage_sites** permission → Website Management section
- **manage_content** permission → Content Creation section
- **manage_system** permission → System Administration section

## Vendor Dashboard

### Get Vendor Overview
`GET /dashboard/vendor/overview`

Get vendor financial dashboard with sales analytics and e-commerce metrics.

**Authentication:** Required - Bearer token with vendor permissions

**Response (200 OK):**
```json
{
  "message": "Vendor dashboard - to be implemented",
  "userId": 123,
  "permissions": ["vendor", "manage_sites"],
  "todo": "Move vendor dashboard logic from vendor.js to here"
}
```

**Note:** This endpoint is currently a placeholder. Full implementation will include:
- Sales analytics and revenue tracking
- Product performance metrics
- Order management overview
- Financial reporting and insights
- Inventory alerts and notifications

### Get Vendor Products Dashboard
`GET /dashboard/vendor/products`

Get vendor product management dashboard with analytics and inventory insights.

**Authentication:** Required - Bearer token with vendor permissions

**Response (200 OK):**
```json
{
  "message": "Vendor products dashboard - to be implemented",
  "note": "Will show vendor-specific product analytics and management tools"
}
```

**Planned Features:**
- Product performance analytics
- Inventory management tools
- Sales conversion metrics
- Product catalog overview
- Quick product management actions

## Sites Dashboard

### Get User's Sites Dashboard
`GET /dashboard/sites/my`

Get current user's sites with dashboard-specific metadata and analytics.

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
    "updated_at": "2024-01-15T10:30:00Z",
    "dashboardUrl": "/dashboard/sites/123",
    "publicUrl": "myartgallery.beemeeart.com"
  }
]
```

**Enhanced Metadata:**
- **dashboardUrl:** Direct link to site management dashboard
- **publicUrl:** Public-facing URL (custom domain or subdomain)

**URL Resolution:**
- Uses custom domain if configured
- Falls back to subdomain.beemeeart.com format
- Automatically handles domain configuration

## Content Dashboard

### Get Content Articles Dashboard
`GET /dashboard/content/articles`

Get content creator's articles dashboard with analytics and management tools.

**Authentication:** Required - Bearer token with content management permissions

**Response (200 OK):**
```json
{
  "articles": [
    {
      "id": 456,
      "title": "My Latest Artwork",
      "slug": "my-latest-artwork",
      "status": "published",
      "author_id": 123,
      "published_at": "2024-01-10T12:00:00Z",
      "created_at": "2024-01-09T15:30:00Z"
    },
    {
      "id": 457,
      "title": "Art Techniques Guide",
      "slug": "art-techniques-guide",
      "status": "draft",
      "author_id": 123,
      "published_at": null,
      "created_at": "2024-01-12T09:15:00Z"
    }
  ],
  "canAccessAll": false,
  "stats": {
    "total": 15,
    "published": 12,
    "draft": 3
  }
}
```

**Access Control:**
- **Regular Users:** See only their own articles
- **Admin Users:** Can see all articles system-wide

**Analytics Features:**
- **Total Count:** All articles by user
- **Status Breakdown:** Published vs draft counts
- **Access Level:** Indicates admin-level access

## System Administration

### Get System Users
`GET /dashboard/system/users`

Get all system users for administrative management (admin only).

**Authentication:** Required - Bearer token with system management permissions

**Response (200 OK):**
```json
[
  {
    "id": 123,
    "username": "artist123",
    "status": "active",
    "user_type": "artist"
  },
  {
    "id": 124,
    "username": "promoter456",
    "status": "active",
    "user_type": "promoter"
  },
  {
    "id": 125,
    "username": "admin789",
    "status": "active",
    "user_type": "admin"
  }
]
```

**Access Control:** Only users with `manage_system` permissions can access this endpoint.

### Create System User
`POST /dashboard/system/users`

Create new user account (admin only).

**Authentication:** Required - Bearer token with system management permissions

**Request Body:**
```json
{
  "username": "newuser123",
  "email": "newuser@example.com",
  "user_type": "artist",
  "status": "active"
}
```

**Response (200 OK):**
```json
{
  "message": "User creation - to be implemented",
  "note": "Move user creation logic from admin.js to here"
}
```

**Note:** This endpoint is currently a placeholder. Full implementation will include:
- Complete user account creation
- Role and permission assignment
- Profile initialization
- Email notification system
- Audit logging for user creation

## Permission Management

### Get User Permissions
`GET /dashboard/permissions/my`

Get current user's effective permissions with detailed descriptions.

**Authentication:** Required - Bearer token

**Response (200 OK):**
```json
{
  "userType": "artist",
  "permissions": ["vendor", "manage_sites", "manage_content"],
  "permissionDetails": [
    {
      "permission_name": "vendor",
      "description": "E-commerce capabilities: products, orders, policies"
    },
    {
      "permission_name": "manage_sites",
      "description": "Website management capabilities"
    },
    {
      "permission_name": "manage_content",
      "description": "Content creation: articles, topics, SEO"
    }
  ],
  "canAccessAll": false,
  "isAdmin": false
}
```

**Permission Descriptions:**
- **vendor:** E-commerce capabilities: products, orders, policies
- **events:** Event management and ticketing
- **manage_sites:** Website management capabilities
- **manage_content:** Content creation: articles, topics, SEO
- **manage_system:** System administration: users, announcements, domains
- **stripe_connect:** Payment processing integration
- **verified:** Artist verification status
- **marketplace:** Marketplace participation
- **shipping:** Shipping label management
- **sites:** Basic site access
- **professional_sites:** Professional site features

**Access Levels:**
- **canAccessAll:** Indicates if user can access all system resources
- **isAdmin:** Boolean flag for administrative privileges

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
- `404` - Not Found (resource not found)
- `500` - Internal Server Error (server error)

## Rate Limits
- **Dashboard queries:** 100 requests per minute per user
- **Permission checks:** 200 requests per minute per user
- **Admin operations:** 50 requests per minute per user

## Integration Examples

### Complete Dashboard Loading
```javascript
// 1. Get dashboard overview
const overviewResponse = await fetch('/dashboard/overview', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const dashboard = await overviewResponse.json();

console.log(`Welcome ${dashboard.user.display_name}`);
console.log(`Available sections: ${dashboard.sections.length}`);

// 2. Load section-specific data
for (const section of dashboard.sections) {
  console.log(`Loading ${section.title}...`);
  
  if (section.name === 'vendor') {
    const vendorResponse = await fetch('/dashboard/vendor/overview', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const vendorData = await vendorResponse.json();
    console.log('Vendor dashboard loaded');
  }
  
  if (section.name === 'sites') {
    const sitesResponse = await fetch('/dashboard/sites/my', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const sites = await sitesResponse.json();
    console.log(`Found ${sites.length} sites`);
  }
  
  if (section.name === 'content') {
    const contentResponse = await fetch('/dashboard/content/articles', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const content = await contentResponse.json();
    console.log(`${content.stats.total} articles, ${content.stats.published} published`);
  }
}
```

### Permission-Based UI Rendering
```javascript
// Get user permissions
const permissionsResponse = await fetch('/dashboard/permissions/my', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const permissions = await permissionsResponse.json();

// Render UI based on permissions
const renderDashboard = (permissions) => {
  const dashboardElements = [];
  
  if (permissions.permissions.includes('vendor')) {
    dashboardElements.push({
      title: 'E-commerce Dashboard',
      component: 'VendorDashboard',
      permissions: ['vendor']
    });
  }
  
  if (permissions.permissions.includes('manage_sites')) {
    dashboardElements.push({
      title: 'Website Management',
      component: 'SitesDashboard',
      permissions: ['manage_sites']
    });
  }
  
  if (permissions.permissions.includes('manage_content')) {
    dashboardElements.push({
      title: 'Content Creation',
      component: 'ContentDashboard',
      permissions: ['manage_content']
    });
  }
  
  if (permissions.isAdmin) {
    dashboardElements.push({
      title: 'System Administration',
      component: 'AdminDashboard',
      permissions: ['manage_system']
    });
  }
  
  return dashboardElements;
};

const dashboardLayout = renderDashboard(permissions);
console.log(`Rendering ${dashboardLayout.length} dashboard sections`);
```

### Sites Dashboard Management
```javascript
// Get sites dashboard
const sitesResponse = await fetch('/dashboard/sites/my', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const sites = await sitesResponse.json();

// Display sites with management options
sites.forEach(site => {
  console.log(`Site: ${site.site_name}`);
  console.log(`Status: ${site.status}`);
  console.log(`Public URL: ${site.publicUrl}`);
  console.log(`Dashboard: ${site.dashboardUrl}`);
  console.log(`Created: ${new Date(site.created_at).toLocaleDateString()}`);
  
  // Show management actions based on site status
  if (site.status === 'draft') {
    console.log('Actions: Publish, Edit, Delete');
  } else if (site.status === 'active') {
    console.log('Actions: Edit, View Analytics, Manage Content');
  }
});
```

### Content Analytics Dashboard
```javascript
// Get content dashboard
const contentResponse = await fetch('/dashboard/content/articles', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const content = await contentResponse.json();

// Display content statistics
console.log('Content Analytics:');
console.log(`Total Articles: ${content.stats.total}`);
console.log(`Published: ${content.stats.published}`);
console.log(`Drafts: ${content.stats.draft}`);
console.log(`Publication Rate: ${(content.stats.published / content.stats.total * 100).toFixed(1)}%`);

// Show recent articles
console.log('\nRecent Articles:');
content.articles.slice(0, 5).forEach(article => {
  const publishedDate = article.published_at 
    ? new Date(article.published_at).toLocaleDateString()
    : 'Not published';
  
  console.log(`${article.title} - ${article.status} (${publishedDate})`);
});
```

### Admin User Management
```javascript
// Admin only - get all users
const usersResponse = await fetch('/dashboard/system/users', {
  headers: { 'Authorization': `Bearer ${adminToken}` }
});
const users = await usersResponse.json();

// Display user statistics
const userStats = users.reduce((stats, user) => {
  stats[user.user_type] = (stats[user.user_type] || 0) + 1;
  stats[user.status] = (stats[user.status] || 0) + 1;
  return stats;
}, {});

console.log('User Statistics:');
console.log(`Total Users: ${users.length}`);
console.log(`By Type:`, userStats);

// Show recent users
console.log('\nAll Users:');
users.forEach(user => {
  console.log(`${user.username} (${user.user_type}) - ${user.status}`);
});
```
