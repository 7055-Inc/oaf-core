# Admin Management API

## Authentication
All admin endpoints require API key authentication and system management permissions.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- `Content-Type: application/json`
- **Permission Required:** `manage_system`

## User Management

### List Users
`GET /api/admin/users`

Get a list of all users in the system.

**Response (200 OK):**
```json
[
  {
    "id": 123,
    "username": "john@example.com",
    "status": "active",
    "user_type": "artist"
  },
  {
    "id": 124,
    "username": "jane@example.com",
    "status": "active",
    "user_type": "vendor"
  }
]
```

### Create User
`POST /api/admin/users`

Create a new user with all profile types.

**Request Body:**
```json
{
  "username": "newuser@example.com",
  "status": "active",
  "user_type": "artist"
}
```

**Response (200 OK):**
```json
{
  "id": 125,
  "username": "newuser@example.com",
  "status": "active",
  "user_type": "artist"
}
```

### Update User
`PUT /api/admin/users/:id`

Update an existing user's information.

**Request Body:**
```json
{
  "username": "updated@example.com",
  "status": "active",
  "user_type": "vendor"
}
```

**Response (200 OK):**
```json
{
  "message": "User updated successfully"
}
```

### Delete User
`DELETE /api/admin/users/:id`

Delete a user from the system.

**Response (200 OK):**
```json
{
  "message": "User deleted successfully"
}
```

### Get User Permissions
`GET /api/admin/users/:id/permissions`

Get a user's permission settings.

**Response (200 OK):**
```json
{
  "user_id": 123,
  "vendor": true,
  "events": false,
  "stripe_connect": true,
  "manage_sites": false,
  "manage_content": false,
  "manage_system": false
}
```

### Update User Permissions
`PUT /api/admin/users/:id/permissions`

Update a user's permission settings.

**Request Body:**
```json
{
  "vendor": true,
  "events": true,
  "stripe_connect": true,
  "manage_sites": false,
  "manage_content": true,
  "manage_system": false
}
```

**Response (200 OK):**
```json
{
  "message": "User permissions updated successfully"
}
```

## Policy Management

### Get Default Shipping Policy
`GET /api/admin/default-policies`

Get the current default shipping policy.

**Response (200 OK):**
```json
{
  "success": true,
  "policy": {
    "id": 456,
    "policy_text": "Standard shipping policy text...",
    "created_at": "2025-09-17T19:30:00Z",
    "updated_at": "2025-09-17T19:30:00Z",
    "created_by_username": "admin"
  }
}
```

### Update Default Shipping Policy
`PUT /api/admin/default-policies`

Update the default shipping policy.

**Request Body:**
```json
{
  "policy_text": "Updated shipping policy text..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Default shipping policy updated successfully"
}
```

### List Vendor Policies
`GET /api/admin/vendor-policies`

Search and list vendor shipping policies with pagination.

**Query Parameters:**
- `search` (optional): Search by username or user ID
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (200 OK):**
```json
{
  "vendors": [
    {
      "user_id": 123,
      "username": "vendor1",
      "user_type": "vendor",
      "policy_id": 789,
      "policy_text": "Custom shipping policy...",
      "status": "active",
      "policy_created_at": "2025-09-17T19:30:00Z",
      "policy_updated_at": "2025-09-17T19:30:00Z",
      "created_by_username": "vendor1"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "pages": 3
  }
}
```

### Get Vendor Policy Details
`GET /api/admin/vendor-policies/:user_id`

Get specific vendor's policy and history.

**Response (200 OK):**
```json
{
  "user": {
    "id": 123,
    "username": "vendor1",
    "user_type": "vendor",
    "vendor": true
  },
  "current_policy": {
    "id": 789,
    "policy_text": "Current policy text...",
    "status": "active",
    "created_at": "2025-09-17T19:30:00Z",
    "updated_at": "2025-09-17T19:30:00Z",
    "created_by_username": "vendor1"
  },
  "history": [
    {
      "id": 788,
      "policy_text": "Previous policy text...",
      "status": "archived",
      "created_at": "2025-09-16T19:30:00Z",
      "updated_at": "2025-09-17T19:30:00Z",
      "created_by_username": "vendor1"
    }
  ]
}
```

### Update Vendor Policy
`PUT /api/admin/vendor-policies/:user_id`

Update a vendor's shipping policy as admin.

**Request Body:**
```json
{
  "policy_text": "Admin-updated policy text..."
}
```

**Response (200 OK):**
```json
{
  "message": "Vendor policy updated successfully by admin"
}
```

### Delete Vendor Policy
`DELETE /api/admin/vendor-policies/:user_id`

Delete vendor's custom policy (reverts to default).

**Response (200 OK):**
```json
{
  "message": "Vendor policy deleted successfully. User will use default policy."
}
```

## Return Policy Management

### Get Default Return Policy
`GET /api/admin/default-return-policies`

Get the current default return policy.

**Response (200 OK):**
```json
{
  "success": true,
  "policy": {
    "id": 456,
    "policy_text": "Standard return policy text...",
    "created_at": "2025-09-17T19:30:00Z",
    "updated_at": "2025-09-17T19:30:00Z",
    "created_by_username": "admin"
  }
}
```

### Update Default Return Policy
`PUT /api/admin/default-return-policies`

Update the default return policy.

**Request Body:**
```json
{
  "policy_text": "Updated return policy text..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Default return policy updated successfully"
}
```

## Email Administration

### Get Email Statistics
`GET /api/admin/email-stats`

Get comprehensive email system statistics.

**Response (200 OK):**
```json
{
  "queue": [
    {"status": "pending", "count": 25},
    {"status": "sent", "count": 1500},
    {"status": "failed", "count": 5}
  ],
  "emails": [
    {
      "date": "2025-09-17",
      "status": "sent",
      "count": 150
    }
  ],
  "templates": [
    {
      "name": "Welcome Email",
      "template_key": "welcome",
      "sent_count": 500
    }
  ],
  "bounces": [
    {
      "domain": "example.com",
      "hard_bounces": 5,
      "soft_bounces": 2,
      "blacklisted_count": 1,
      "last_bounce_at": "2025-09-17T19:30:00Z"
    }
  ],
  "preferences": [
    {
      "frequency": "daily",
      "is_enabled": true,
      "count": 100
    }
  ]
}
```

### Get Email Queue Status
`GET /api/admin/email-queue`

Get current email queue status and recent items.

**Response (200 OK):**
```json
{
  "stats": [
    {"status": "pending", "count": 25},
    {"status": "processing", "count": 3}
  ],
  "recent": [
    {
      "id": 123,
      "template_name": "Welcome Email",
      "username": "john@example.com",
      "status": "pending",
      "created_at": "2025-09-17T19:30:00Z"
    }
  ]
}
```

### Send Test Email
`POST /api/admin/email-test`

Send a test email using system templates.

**Request Body:**
```json
{
  "recipient": "test@example.com",
  "templateKey": "welcome",
  "testData": {
    "test_message": "This is a test email",
    "admin_name": "Admin User"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Test email sent successfully",
  "emailId": 789
}
```

### Process Email Queue
`POST /api/admin/email-process-queue`

Manually trigger email queue processing.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Queue processing initiated",
  "result": {
    "processed": 25,
    "failed": 0
  }
}
```

## Promotion Management

### Get All Promotions
`GET /api/admin/promotions/all`

Get a list of all promotions.

**Response (200 OK):**
```json
{
  "success": true,
  "promotions": [
    {
      "id": 123,
      "name": "Summer Sale 2025",
      "status": "active",
      "created_at": "2025-09-17T19:30:00Z"
    }
  ]
}
```

### Create Promotion
`POST /api/admin/promotions/create`

Create a new promotion campaign.

**Request Body:**
```json
{
  "name": "Black Friday Sale",
  "description": "Annual Black Friday promotion",
  "admin_discount_percentage": 10,
  "suggested_vendor_discount": 15,
  "application_type": "coupon_code",
  "coupon_code": "BLACKFRIDAY2025",
  "min_order_amount": 50,
  "usage_limit_per_user": 1,
  "total_usage_limit": 1000,
  "valid_from": "2025-11-29T00:00:00Z",
  "valid_until": "2025-11-30T23:59:59Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "promotion_id": 124,
  "message": "Promotion created successfully"
}
```

### Update Promotion
`PUT /api/admin/promotions/:id`

Update promotion status and details.

**Request Body:**
```json
{
  "status": "active",
  "name": "Updated Promotion Name",
  "valid_until": "2025-12-31T23:59:59Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Promotion updated successfully"
}
```

## Coupon Management

### Get All Admin Coupons
`GET /api/admin/coupons/all`

Get a list of all admin-created coupons.

**Response (200 OK):**
```json
{
  "success": true,
  "coupons": [
    {
      "id": 123,
      "code": "ADMIN10",
      "name": "Admin 10% Off",
      "discount_type": "percentage",
      "discount_value": 10,
      "is_active": true,
      "vendor_id": null,
      "is_vendor_specific": false,
      "created_at": "2025-09-17T19:30:00Z"
    }
  ]
}
```

### Create Admin Coupon
`POST /api/admin/coupons`

Create a new admin coupon.

**Request Body:**
```json
{
  "code": "WELCOME20",
  "name": "Welcome 20% Off",
  "description": "Welcome discount for new customers",
  "discount_type": "percentage",
  "discount_value": 20,
  "application_type": "coupon_code",
  "min_order_amount": 25,
  "usage_limit_per_user": 1,
  "total_usage_limit": 500,
  "valid_from": "2025-09-17T00:00:00Z",
  "valid_until": "2025-12-31T23:59:59Z",
  "vendor_id": null,
  "product_ids": [],
  "max_discount_amount": 50
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Admin coupon created successfully",
  "coupon": {
    "id": 124,
    "code": "WELCOME20",
    "name": "Welcome 20% Off",
    "discount_type": "percentage",
    "discount_value": 20,
    "vendor_specific": false,
    "product_count": 0
  }
}
```

### Update Coupon Status
`PUT /api/admin/coupons/:id`

Update admin coupon status.

**Request Body:**
```json
{
  "is_active": false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Coupon status updated successfully"
}
```

## Sales Management

### Create Site-wide Sale
`POST /api/admin/sales/create-sitewide`

Create a site-wide sale or product-specific sale.

**Request Body:**
```json
{
  "name": "Holiday Sale 2025",
  "description": "Site-wide holiday discount",
  "discount_type": "percentage",
  "discount_value": 15,
  "application_type": "auto_apply",
  "min_order_amount": 0,
  "usage_limit_per_user": 1,
  "total_usage_limit": null,
  "valid_from": "2025-12-20T00:00:00Z",
  "valid_until": "2025-12-26T23:59:59Z",
  "product_ids": []
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "sale_id": 125,
  "message": "Site-wide sale created successfully"
}
```

### Get All Sales
`GET /api/admin/sales/all`

Get a list of all site-wide sales.

**Response (200 OK):**
```json
{
  "success": true,
  "sales": [
    {
      "id": 125,
      "code": "SALE_1695834600000",
      "name": "Holiday Sale 2025",
      "discount_type": "percentage",
      "discount_value": 15,
      "is_active": true,
      "created_at": "2025-09-17T19:30:00Z"
    }
  ]
}
```

## Analytics

### Get Promotion Analytics
`GET /api/admin/promotions/analytics/overview`

Get comprehensive promotion analytics and metrics.

**Response (200 OK):**
```json
{
  "success": true,
  "overview": {
    "total_promotions": 25,
    "active_promotions": 5,
    "total_invited_vendors": 150,
    "accepted_vendors": 120,
    "total_products_in_promotions": 500,
    "total_promotion_uses": 2500
  },
  "recent_activity": [
    {
      "activity_type": "promotion_created",
      "description": "Black Friday Sale",
      "activity_date": "2025-09-17T19:30:00Z"
    },
    {
      "activity_type": "vendor_accepted",
      "description": "vendor1 accepted promotion: Summer Sale",
      "activity_date": "2025-09-17T18:30:00Z"
    }
  ]
}
```

## Error Responses

- `400 Bad Request`: Invalid input data or business rule violations
  - Missing required fields
  - Invalid parameter values
  - Business logic violations
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: Insufficient permissions (requires manage_system)
- `404 Not Found`: 
  - User not found
  - Policy not found
  - Promotion/coupon not found
- `500 Internal Server Error`: Server processing error

## Rate Limits
- 200 requests per minute per API key for admin endpoints
- Higher limits may apply for bulk operations

## Example Usage

### Complete User Management Flow
```bash
# 1. List all users
curl -X GET https://api.beemeeart.com/api/admin/users \
  -H "Authorization: Bearer admin_api_key"

# 2. Create new user
curl -X POST https://api.beemeeart.com/api/admin/users \
  -H "Authorization: Bearer admin_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser@example.com",
    "status": "active",
    "user_type": "artist"
  }'

# 3. Update user permissions
curl -X PUT https://api.beemeeart.com/api/admin/users/123/permissions \
  -H "Authorization: Bearer admin_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "vendor": true,
    "events": true
  }'
```

### Policy Management Flow
```bash
# 1. Get default shipping policy
curl -X GET https://api.beemeeart.com/api/admin/default-policies \
  -H "Authorization: Bearer admin_api_key"

# 2. Update default policy
curl -X PUT https://api.beemeeart.com/api/admin/default-policies \
  -H "Authorization: Bearer admin_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "policy_text": "Updated shipping policy..."
  }'

# 3. List vendor policies
curl -X GET "https://api.beemeeart.com/api/admin/vendor-policies?search=vendor1&page=1&limit=10" \
  -H "Authorization: Bearer admin_api_key"
```

### Email Administration Flow
```bash
# 1. Get email statistics
curl -X GET https://api.beemeeart.com/api/admin/email-stats \
  -H "Authorization: Bearer admin_api_key"

# 2. Send test email
curl -X POST https://api.beemeeart.com/api/admin/email-test \
  -H "Authorization: Bearer admin_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "test@example.com",
    "templateKey": "welcome",
    "testData": {"test_message": "Test email"}
  }'

# 3. Process email queue
curl -X POST https://api.beemeeart.com/api/admin/email-process-queue \
  -H "Authorization: Bearer admin_api_key"
```

### Promotion Management Flow
```bash
# 1. Create promotion
curl -X POST https://api.beemeeart.com/api/admin/promotions/create \
  -H "Authorization: Bearer admin_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Summer Sale",
    "admin_discount_percentage": 10,
    "suggested_vendor_discount": 15,
    "application_type": "coupon_code",
    "coupon_code": "SUMMER2025",
    "valid_from": "2025-06-01T00:00:00Z"
  }'

# 2. Get promotion analytics
curl -X GET https://api.beemeeart.com/api/admin/promotions/analytics/overview \
  -H "Authorization: Bearer admin_api_key"
```

## Integration Notes

### Permission System
- All endpoints require `manage_system` permission
- Permission checks are enforced at the middleware level
- User permissions can be managed through the user permission endpoints

### Database Transactions
- Critical operations use database transactions for data integrity
- Policy updates archive previous versions before creating new ones
- Promotion creation includes validation and rollback capabilities

### Email System Integration
- Integrates with EmailService for all email operations
- Supports template-based email testing and queue management
- Provides comprehensive bounce tracking and deliverability monitoring

### Audit Trail
- All admin actions are logged with timestamps and admin user IDs
- Policy changes maintain complete history
- User permission changes are tracked

## Best Practices

### User Management
- Always verify user existence before permission updates
- Use appropriate user types for different roles
- Regularly audit user permissions and access

### Policy Management
- Test policy changes in staging before production
- Maintain clear policy versioning and change logs
- Provide clear policy text for user understanding

### Email Administration
- Monitor bounce rates and deliverability regularly
- Test email templates before deployment
- Process queues regularly to maintain performance

### Promotion Management
- Validate promotion parameters before creation
- Monitor promotion usage and performance
- Coordinate with vendors for successful promotion campaigns

### Security Considerations
- Validate all input parameters thoroughly
- Use proper error handling to avoid information leakage
- Audit admin actions regularly for compliance
- Implement proper rate limiting for bulk operations
