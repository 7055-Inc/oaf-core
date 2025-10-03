# dashboard.js - Internal Documentation

## Overview
Comprehensive dashboard system that consolidates functionality from vendor.js, admin.js, and other permission-based routes. Provides unified dashboard interface with role-based access control, permission-specific data views, and dynamic section generation based on user permissions. Supports multi-role users with intelligent permission evaluation.

## Architecture
- **Type:** Route Layer (API Endpoints) - Dashboard Consolidation System
- **Dependencies:** express, database connection, jwt middleware, permissions middleware
- **Database Tables:**
  - `users` - User accounts and basic information
  - `user_profiles` - Extended user profile data
  - `sites` - User sites for dashboard display
  - `articles` - Content articles for content dashboard
  - `user_permissions` - Permission-based access control
- **External Services:** Permission evaluation system, role-based access control

## Dashboard Architecture

### Consolidation Strategy
This file consolidates dashboard functionality that was previously scattered across:
- `vendor.js` - Vendor/e-commerce dashboard functionality
- `admin.js` - Administrative dashboard functionality  
- Other permission-based route files

### URL Structure
```
/dashboard/{usertype}?permissions={permission1,permission2}
```

**Examples:**
- `/dashboard/artist?permissions=vendor,manage_sites`
- `/dashboard/promoter?permissions=vendor`
- `/dashboard/admin` (gets all permissions automatically)
- `/dashboard/community`

### Permission-Based Sections
Dashboard sections are dynamically generated based on user's effective permissions:
- **vendor** → E-commerce & Sales section
- **manage_sites** → Website Management section
- **manage_content** → Content Creation section
- **manage_system** → System Administration section

## Dashboard Overview System

### GET /dashboard/overview
**Purpose:** Get comprehensive dashboard overview for current user

**Authentication:** Required - JWT token

**Dynamic Section Generation:**
The dashboard dynamically generates available sections based on the user's effective permissions:

```javascript
// Permission-to-Section Mapping
const sectionMappings = {
  'vendor': {
    name: 'vendor',
    title: 'E-commerce & Sales',
    description: 'Manage products, orders, and financial information',
    endpoints: ['/dashboard/vendor/overview', '/dashboard/vendor/products', '/dashboard/vendor/orders']
  },
  'manage_sites': {
    name: 'sites',
    title: 'Website Management',
    description: 'Create and manage your websites',
    endpoints: ['/dashboard/sites/my', '/dashboard/sites/domains']
  },
  'manage_content': {
    name: 'content',
    title: 'Content Creation',
    description: 'Create and manage articles, topics, and content',
    endpoints: ['/dashboard/content/articles', '/dashboard/content/topics']
  },
  'manage_system': {
    name: 'system',
    title: 'System Administration',
    description: 'Manage users, announcements, and system settings',
    endpoints: ['/dashboard/system/users', '/dashboard/system/announcements']
  }
};
```

**Response Structure:**
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
      "endpoints": ["/dashboard/vendor/overview", "/dashboard/vendor/products", "/dashboard/vendor/orders"]
    },
    {
      "name": "sites",
      "title": "Website Management",
      "description": "Create and manage your websites",
      "endpoints": ["/dashboard/sites/my", "/dashboard/sites/domains"]
    }
  ]
}
```

## Vendor Dashboard System

### GET /dashboard/vendor/overview
**Purpose:** Vendor financial dashboard with sales analytics and e-commerce metrics

**Authentication:** Required - JWT token + vendor permissions

**Consolidation:** Replaces `GET /vendor/dashboard` from legacy vendor.js

**Implementation Status:** Placeholder - requires migration of vendor dashboard logic

**Planned Features:**
- Sales analytics and revenue tracking
- Product performance metrics
- Order management overview
- Financial reporting and insights
- Inventory alerts and notifications

### GET /dashboard/vendor/products
**Purpose:** Vendor product management dashboard with analytics and inventory insights

**Authentication:** Required - JWT token + vendor permissions

**Consolidation:** Enhances product management views with vendor-specific analytics

**Implementation Status:** Placeholder - requires integration with products.js

**Planned Features:**
- Product performance analytics
- Inventory management tools
- Sales conversion metrics
- Product catalog overview
- Quick product management actions

## Admin Dashboard System

### GET /dashboard/system/users
**Purpose:** System user management dashboard (admin only)

**Authentication:** Required - JWT token + manage_system permissions

**Consolidation:** Replaces `GET /admin/users` from legacy admin.js

**Current Implementation:**
```sql
SELECT id, username, status, user_type FROM users
```

**Response Structure:**
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
  }
]
```

**Access Control:** Only users with `manage_system` permissions can access this endpoint

### POST /dashboard/system/users
**Purpose:** Create new user account (admin only)

**Authentication:** Required - JWT token + manage_system permissions

**Consolidation:** Replaces `POST /admin/users` from legacy admin.js

**Implementation Status:** Placeholder - requires migration of user creation logic

**Planned Features:**
- Complete user account creation
- Role and permission assignment
- Profile initialization
- Email notification system
- Audit logging for user creation

## Sites Dashboard System

### GET /dashboard/sites/my
**Purpose:** Current user's sites dashboard with enhanced metadata

**Authentication:** Required - JWT token + manage_sites permissions

**Dashboard Enhancement:** Adds dashboard-specific metadata to site information

**Query Implementation:**
```sql
SELECT * FROM sites WHERE user_id = ? ORDER BY created_at DESC
```

**Enhanced Response Structure:**
```json
[
  {
    "id": 123,
    "site_name": "My Art Gallery",
    "subdomain": "myartgallery",
    "status": "active",
    "created_at": "2024-01-15T10:30:00Z",
    "dashboardUrl": "/dashboard/sites/123",
    "publicUrl": "myartgallery.beemeeart.com"
  }
]
```

**Domain Resolution Logic:**
- **Custom Domain:** Uses `site.custom_domain` if configured
- **Subdomain:** Uses `${site.subdomain}.${FRONTEND_DOMAIN}` 
- **Fallback:** Defaults to `beemeeart.com` if environment variable not set

**Environment Variable Usage:**
```javascript
publicUrl: site.custom_domain || 
  `${site.subdomain}.${process.env.FRONTEND_URL?.replace('https://', '') || 'beemeeart.com'}`
```

**Relationship to sites.js:** Existing sites.js routes remain for direct API access; this provides dashboard-specific enhancements

## Content Dashboard System

### GET /dashboard/content/articles
**Purpose:** Content creator's articles dashboard with analytics and management tools

**Authentication:** Required - JWT token + manage_content permissions

**Access Control Logic:**
- **Regular Users:** See only their own articles (`WHERE author_id = ?`)
- **Admin Users:** See all articles (no filter applied)

**Query Implementation:**
```sql
-- For regular users
SELECT id, title, slug, status, author_id, published_at, created_at 
FROM articles WHERE author_id = ? 
ORDER BY created_at DESC

-- For admin users
SELECT id, title, slug, status, author_id, published_at, created_at 
FROM articles 
ORDER BY created_at DESC
```

**Response Structure:**
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

**Analytics Features:**
- **Total Articles:** Count of all user's articles
- **Published Count:** Articles with published status
- **Draft Count:** Articles in draft status
- **Access Level:** Indicates if user can see all articles (admin)

## Permission Management System

### GET /dashboard/permissions/my
**Purpose:** Get current user's effective permissions with detailed descriptions

**Authentication:** Required - JWT token

**Permission Descriptions:**
```javascript
const permissionDescriptions = {
  'vendor': 'E-commerce capabilities: products, orders, policies',
  'events': 'Event management and ticketing',
  'manage_sites': 'Website management capabilities',
  'manage_content': 'Content creation: articles, topics, SEO',
  'manage_system': 'System administration: users, announcements, domains',
  'stripe_connect': 'Payment processing integration',
  'verified': 'Artist verification status',
  'marketplace': 'Marketplace participation',
  'shipping': 'Shipping label management',
  'sites': 'Basic site access',
  'professional_sites': 'Professional site features'
};
```

**Response Structure:**
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

**Permission Evaluation:**
- **Effective Permissions:** Calculated using `getEffectivePermissions(req)`
- **User Type Detection:** Finds primary role from ['admin', 'artist', 'promoter', 'community']
- **Access Level:** Determines if user has admin-level access to all resources
- **Admin Status:** Boolean flag for admin role detection

## Environment Variables

### FRONTEND_URL
**Usage:** Domain resolution for public site URLs in dashboard

**Implementation:**
```javascript
publicUrl: site.custom_domain || 
  `${site.subdomain}.${process.env.FRONTEND_URL?.replace('https://', '') || 'beemeeart.com'}`
```

**Purpose:** 
- Constructs public URLs for sites in dashboard display
- Replaces hardcoded `onlineartfestival.com` with configurable domain
- Supports both HTTP and HTTPS URL formats
- Provides fallback to `beemeeart.com` if environment variable not set

## Security Considerations

### Authentication & Authorization
- **JWT Validation:** All endpoints require valid JWT tokens
- **Permission-Based Access:** Each section requires specific permissions
- **Role-Based Sections:** Dashboard sections generated based on user roles
- **Admin Privileges:** Admin users get enhanced access and visibility

### Data Access Control
- **User Isolation:** Users see only their own data unless admin
- **Permission Validation:** Each endpoint validates required permissions
- **Resource Ownership:** Strict ownership validation for user-specific data
- **Admin Override:** Admins can access system-wide data where appropriate

### Legacy Route Consolidation
- **Gradual Migration:** Maintains compatibility while consolidating functionality
- **Permission Preservation:** Maintains existing permission requirements
- **Access Pattern Consistency:** Consistent access patterns across consolidated routes

## Performance Considerations

### Database Optimization
- **Efficient Queries:** Optimized queries for dashboard data retrieval
- **Conditional Filtering:** Access-based query filtering for performance
- **Index Usage:** Proper indexing on user_id, author_id, status fields
- **Minimal Data Loading:** Dashboard-specific data selection

### Permission Evaluation
- **Cached Permissions:** Efficient permission evaluation using middleware
- **Role Detection:** Fast user type detection from roles array
- **Access Level Caching:** Cached admin status and access level determination
- **Dynamic Section Generation:** Efficient section generation based on permissions

### Dashboard Responsiveness
- **Lightweight Queries:** Fast queries for dashboard overview data
- **Metadata Enhancement:** Efficient metadata addition to existing data
- **Statistics Calculation:** In-memory statistics calculation for article dashboard
- **URL Construction:** Efficient domain resolution for public URLs

## Error Handling

### Dashboard Errors
- **Permission Denied:** 403 for insufficient permissions
- **Authentication Required:** 401 for missing or invalid tokens
- **Data Access Errors:** 500 for database query failures
- **Resource Not Found:** 404 for non-existent dashboard resources

### Consolidation Errors
- **Migration Status:** Clear indication of placeholder vs implemented functionality
- **Legacy Compatibility:** Graceful handling of legacy route dependencies
- **Permission Mapping:** Proper error handling for permission evaluation failures
- **Section Generation:** Error handling for dynamic section generation

## Migration Strategy

### Legacy Route Consolidation
1. **Identify Functionality:** Map existing functionality from vendor.js, admin.js
2. **Preserve Permissions:** Maintain existing permission requirements
3. **Create Placeholders:** Implement placeholder endpoints with migration notes
4. **Gradual Migration:** Move functionality piece by piece
5. **Maintain Compatibility:** Keep existing routes functional during transition

### Implementation Phases
1. **Phase 1:** Dashboard structure and permission system (COMPLETED)
2. **Phase 2:** Vendor dashboard migration (PENDING)
3. **Phase 3:** Admin dashboard migration (PENDING)
4. **Phase 4:** Content dashboard enhancements (PARTIAL)
5. **Phase 5:** Legacy route deprecation (FUTURE)

## Usage Examples

### Get Dashboard Overview
```javascript
const response = await fetch('/dashboard/overview', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const dashboard = await response.json();
console.log(`User ${dashboard.user.display_name} has ${dashboard.sections.length} dashboard sections`);

// Render sections based on permissions
dashboard.sections.forEach(section => {
  console.log(`${section.title}: ${section.description}`);
  console.log(`Available endpoints: ${section.endpoints.join(', ')}`);
});
```

### Check User Permissions
```javascript
const response = await fetch('/dashboard/permissions/my', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const permissions = await response.json();
console.log(`User type: ${permissions.userType}`);
console.log(`Is admin: ${permissions.isAdmin}`);
console.log(`Can access all: ${permissions.canAccessAll}`);

permissions.permissionDetails.forEach(perm => {
  console.log(`${perm.permission_name}: ${perm.description}`);
});
```

### Get Sites Dashboard
```javascript
const response = await fetch('/dashboard/sites/my', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const sites = await response.json();
sites.forEach(site => {
  console.log(`Site: ${site.site_name}`);
  console.log(`Dashboard: ${site.dashboardUrl}`);
  console.log(`Public URL: ${site.publicUrl}`);
  console.log(`Status: ${site.status}`);
});
```

### Get Content Dashboard
```javascript
const response = await fetch('/dashboard/content/articles', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const contentDashboard = await response.json();
console.log(`Total articles: ${contentDashboard.stats.total}`);
console.log(`Published: ${contentDashboard.stats.published}`);
console.log(`Drafts: ${contentDashboard.stats.draft}`);
console.log(`Can access all: ${contentDashboard.canAccessAll}`);

contentDashboard.articles.forEach(article => {
  console.log(`${article.title} - ${article.status}`);
});
```

### Admin User Management
```javascript
// Only works for admin users
const response = await fetch('/dashboard/system/users', {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});

const users = await response.json();
console.log(`Total users in system: ${users.length}`);

users.forEach(user => {
  console.log(`${user.username} (${user.user_type}) - ${user.status}`);
});
```
