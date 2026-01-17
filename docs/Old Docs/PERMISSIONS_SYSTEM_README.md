# Permissions System Documentation

## Overview

The OAF platform uses a flexible, JWT-based permissions system that combines user types with granular permissions. This system was recently simplified to remove hard-coded restrictions, allowing for maximum flexibility in permission assignment.

## System Architecture

### Core Components

1. **User Types** (`user_types` table) - Basic user classification
2. **Individual Permissions** (`user_permissions` table) - Granular permission flags
3. **JWT Middleware** - Token-based authentication and permission checking
4. **Terms Acceptance** - Legal compliance tracking
5. **Application Workflows** - Permission request and approval processes

## Database Schema

### `user_types` Table
```sql
CREATE TABLE user_types (
  user_id bigint PRIMARY KEY,
  type enum('artist','promoter','community','admin'),
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Basic user classification for UI/UX customization and default permission sets.

### `user_permissions` Table
```sql
CREATE TABLE user_permissions (
  user_id bigint PRIMARY KEY,
  vendor tinyint(1) DEFAULT 0,
  create_articles tinyint(1) DEFAULT 0,
  publish_articles tinyint(1) DEFAULT 0,
  manage_articles_seo tinyint(1) DEFAULT 0,
  manage_articles_topics tinyint(1) DEFAULT 0,
  manage_sites tinyint(1) DEFAULT 0,
  manage_content tinyint(1) DEFAULT 0,
  manage_system tinyint(1) DEFAULT 0,
  stripe_connect tinyint(1) DEFAULT 0,
  events tinyint(1) DEFAULT 0,
  tickets tinyint(1) DEFAULT 0,
  verified tinyint(1) DEFAULT 0,
  marketplace tinyint(1) DEFAULT 0,
  shipping tinyint(1) DEFAULT 0,
  sites tinyint(1) DEFAULT 0,
  professional_sites tinyint(1) DEFAULT 0,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

**Purpose**: Granular permission flags that control access to specific platform features.

### `terms_versions` Table
```sql
CREATE TABLE terms_versions (
  id int PRIMARY KEY AUTO_INCREMENT,
  version varchar(50),
  title varchar(255),
  subscription_type enum('general','verification','shipping_labels','marketplace','website','sites','wholesale') DEFAULT 'general',
  content text,
  is_current tinyint(1) DEFAULT 0,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  created_by bigint
);
```

**Purpose**: Version control for terms of service, organized by subscription/permission type.

### `user_terms_acceptance` Table
```sql
CREATE TABLE user_terms_acceptance (
  id bigint PRIMARY KEY AUTO_INCREMENT,
  user_id bigint,
  subscription_type enum('general','verification','shipping_labels','marketplace','website','sites') DEFAULT 'general',
  terms_version_id int,
  accepted_at timestamp DEFAULT CURRENT_TIMESTAMP,
  ip_address varchar(45),
  user_agent text
);
```

**Purpose**: Legal compliance tracking for terms acceptance by permission type.

## Permission Types

### Core Business Permissions
- **`vendor`** - E-commerce capabilities: products, orders, policies
- **`marketplace`** - Marketplace participation (requires application approval)
- **`events`** - Event management and ticketing
- **`shipping`** - Shipping label management
- **`stripe_connect`** - Payment processing integration

### Content Management Permissions
- **`create_articles`** - Create articles and blog posts
- **`publish_articles`** - Publish articles to public
- **`manage_articles_seo`** - SEO optimization for articles
- **`manage_articles_topics`** - Topic and category management
- **`manage_content`** - General content administration

### Site Management Permissions
- **`sites`** - Basic site access and creation
- **`professional_sites`** - Professional site features
- **`manage_sites`** - Website management capabilities

### System Administration Permissions
- **`manage_system`** - System administration: users, announcements, domains
- **`verified`** - Artist verification status

## Authentication Flow

### 1. User Login
```javascript
// Firebase authentication → Backend token exchange
POST /api/auth/exchange
{
  "token": "firebase_id_token",
  "provider": "google|email"
}
```

### 2. JWT Token Generation
The backend:
1. Validates Firebase token
2. Creates/updates user record
3. Fetches user type from `user_types` table
4. Fetches permissions from `user_permissions` table
5. Generates JWT with embedded roles and permissions

### 3. JWT Token Structure
```javascript
{
  "userId": 1234567890,
  "roles": ["artist"],           // From user_types table
  "permissions": ["vendor", "shipping", "verified"], // From user_permissions table
  "iat": 1640995200,
  "exp": 1641081600
}
```

## Permission Checking

### Middleware Usage
```javascript
// Single permission check
router.post('/products', verifyToken, requirePermission('vendor'), handler);

// Admin-only access
router.get('/users/all', verifyToken, requireAllAccess, handler);

// Legacy user type check (use sparingly)
router.get('/admin-panel', verifyToken, requireUserType('admin'), handler);
```

### Permission Logic

#### Admin Auto-Permissions
```javascript
// Admin users automatically get ALL permissions
if (req.roles.includes('admin')) {
  return true; // Access granted to everything
}
```

#### Permission Inheritance
```javascript
// Vendor and Events permissions automatically grant Stripe Connect
if (permission === 'stripe_connect') {
  if (req.permissions.includes('vendor') || req.permissions.includes('events')) {
    return true;
  }
}
```

#### Data Access Patterns
- **`/my` endpoints** - User can only access their own data
- **`/all` endpoints** - Admin-only, access to all data
- **`canAccessAll(req)`** - Returns true only for admin users

## Application Workflows

### Marketplace Application Process
1. **User applies** via marketplace subscription flow
2. **Record created** in `marketplace_permissions` table with status `pending`
3. **Admin reviews** via Admin → Marketplace Applications interface
4. **Status updated** to `approved`, `rejected`, or `suspended`
5. **Cron job runs** every 6 hours to sync approved applications to `user_permissions.marketplace`

### Terms Acceptance Flow
1. **User encounters** permission-gated feature
2. **System checks** if user has accepted current terms for that permission type
3. **Terms modal shown** if acceptance required
4. **Acceptance recorded** in `user_terms_acceptance` with IP and user agent
5. **Permission granted** after terms acceptance

## Code Integration

### Key Files
- **`/api-service/src/middleware/permissions.js`** - Core permission logic
- **`/api-service/src/middleware/jwt.js`** - JWT token verification
- **`/api-service/src/routes/auth.js`** - Authentication and token exchange
- **`/lib/csrf.js`** - Frontend token management
- **`/components/login/LoginModal.js`** - Frontend authentication

### Permission Middleware Functions
```javascript
// Core functions
hasPermission(req, permission)           // Check if user has permission
requirePermission(permission)            // Middleware to require permission
canAccessAll(req)                       // Check admin access
requireAllAccess                        // Middleware for admin-only endpoints
getEffectivePermissions(req)            // Get all user permissions including admin auto-grants

// Legacy functions (use sparingly)
hasUserType(req, userType)              // Check user type
requireUserType(userType)               // Middleware to require user type
```

## Security Features

### CSRF Protection
- **CSRF tokens** required for all state-changing operations
- **Token rotation** on each request
- **Automatic retry** on token expiration

### JWT Security
- **Short-lived tokens** (24 hours)
- **Refresh token rotation** for security
- **Secure storage** in httpOnly cookies
- **Automatic refresh** before expiration

### Terms Compliance
- **IP address logging** for legal compliance
- **User agent tracking** for audit trails
- **Version control** for terms changes
- **Subscription-specific terms** for different permission types

## Admin Interface

### User Management
- **Dashboard → Admin → User Management**
- View and edit user permissions
- Assign/revoke individual permissions
- No restrictions on permission assignment (maximum flexibility)

### Marketplace Applications
- **Dashboard → Admin → Marketplace Applications**
- Review pending applications
- Approve/reject with notes
- Track application history

### System Administration
- **Announcements** - Requires `manage_system`
- **Terms Management** - Requires `manage_system`
- **User Administration** - Requires `manage_system`

## Migration Notes

### Recent Changes (2024)
1. **Removed `permission_restrictions` table** - No longer enforces hard-coded user type restrictions
2. **Simplified permission checking** - All `requireRestrictedPermission` calls replaced with `requirePermission`
3. **Flexible permission assignment** - Any permission can be manually assigned to any user type
4. **Cleaned up schema** - Removed obsolete backup tables

### Backward Compatibility
- **Legacy user type checks** still supported but discouraged
- **Existing JWT tokens** continue to work
- **Permission inheritance** maintained for Stripe Connect access

## Best Practices

### For Developers
1. **Prefer permission-based checks** over user type checks
2. **Use `requirePermission()`** for endpoint protection
3. **Check `canAccessAll()`** for data access patterns
4. **Handle 403 errors gracefully** in frontend
5. **Use descriptive permission names** in error messages

### For Administrators
1. **Assign minimal necessary permissions** for security
2. **Use marketplace application flow** for marketplace access
3. **Review terms acceptance** before granting sensitive permissions
4. **Monitor permission usage** through admin interfaces
5. **Document custom permission assignments** for edge cases

## Troubleshooting

### Common Issues
1. **403 Permission Denied** - Check user has required permission in `user_permissions` table
2. **JWT Token Expired** - Frontend should auto-refresh, check refresh token flow
3. **CSRF Token Invalid** - Frontend should retry with new token
4. **Terms Not Accepted** - User must accept current terms for permission type

### Debug Commands
```sql
-- Check user permissions
SELECT * FROM user_permissions WHERE user_id = ?;

-- Check user type
SELECT * FROM user_types WHERE user_id = ?;

-- Check terms acceptance
SELECT * FROM user_terms_acceptance WHERE user_id = ? ORDER BY accepted_at DESC;

-- Check marketplace application status
SELECT * FROM marketplace_permissions WHERE user_id = ?;
```

## Future Considerations

### Potential Enhancements
1. **Permission groups** - Bundle related permissions
2. **Time-based permissions** - Temporary access grants
3. **Permission delegation** - Allow users to grant subset of their permissions
4. **Audit logging** - Track permission changes and usage
5. **API rate limiting** - Per-permission rate limits

### Scalability Notes
- **Current system** handles thousands of users efficiently
- **JWT approach** reduces database queries per request
- **Permission caching** could be added for high-traffic scenarios
- **Horizontal scaling** supported through stateless JWT design

---

*This documentation reflects the current state of the permissions system as of 2024. The system prioritizes flexibility and security while maintaining backward compatibility.*
