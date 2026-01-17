# Website Subscriptions API

## Authentication
All website subscription endpoints require API key authentication.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- `Content-Type: application/json`

## Endpoints

### Terms Management

#### Check Terms Acceptance
`GET /api/subscriptions/websites/terms-check`

Check if the authenticated user has accepted the latest website terms.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
{
  "success": true,
  "termsAccepted": true,
  "latestTerms": {
    "id": 123,
    "title": "Website Service Terms",
    "content": "By using our website hosting service, you agree to...",
    "version": "2.1",
    "created_at": "2025-09-17T19:30:00Z"
  }
}
```

**Response (200 OK - Terms Not Accepted):**
```json
{
  "success": true,
  "termsAccepted": false,
  "latestTerms": {
    "id": 123,
    "title": "Website Service Terms",
    "content": "By using our website hosting service, you agree to...",
    "version": "2.1",
    "created_at": "2025-09-17T19:30:00Z"
  }
}
```

#### Accept Terms
`POST /api/subscriptions/websites/terms-accept`

Record user acceptance of website terms.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "terms_version_id": 123
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Terms acceptance recorded successfully"
}
```

### Subscription Management

#### Create Subscription
`POST /api/subscriptions/websites/signup`

Create website subscription and grant sites permission.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "plan_name": "Professional Plan",
  "permissions": ["sites", "manage_sites"],
  "selected_addons": [1, 3, 5],
  "pricing": {
    "subtotal": 29.99,
    "discount": 5.00,
    "total": 24.99
  },
  "payment_method_id": "pm_1234567890",
  "auto_applied_discount": {
    "code": "WELCOME20",
    "amount": 5.00,
    "type": "fixed"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully subscribed to Professional Plan",
  "subscription_id": "sites_456_1726599000000",
  "permissions": [
    "sites",
    "manage_sites",
    "vendor",
    "verified"
  ],
  "plan_name": "Professional Plan",
  "selected_addons": [1, 3, 5],
  "total_price": 24.99,
  "discount_applied": 5.00
}
```

#### Cancel Subscription
`POST /api/subscriptions/websites/cancel`

Cancel website subscription and revoke sites permission.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Sites subscription cancelled successfully"
}
```

#### Get Subscription Status
`GET /api/subscriptions/websites/status`

Get current website subscription status with site count.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK - Active Subscription):**
```json
{
  "success": true,
  "hasSubscription": true,
  "sitesCount": 3,
  "status": "active"
}
```

**Response (200 OK - No Subscription):**
```json
{
  "success": true,
  "hasSubscription": false,
  "sitesCount": 0,
  "status": "inactive"
}
```

## Subscription Plans

### Available Plans
- **Starter Plan**: Basic website features for individuals
- **Professional Plan**: Enhanced features for professionals and small businesses
- **Business Plan**: Advanced features for growing businesses
- **Promoter Plan**: Specialized features for event promoters

### Plan Features
Each plan includes different combinations of:
- Number of websites allowed
- Storage and bandwidth limits
- Advanced customization options
- E-commerce capabilities
- Analytics and reporting
- Priority support

## Addon System

### Addon Types
Website subscriptions support two types of addons:

#### User-Level Addons
Activated immediately upon subscription and apply to all user websites:
- Advanced analytics
- Priority support
- Custom branding removal
- Enhanced security features

#### Site-Level Addons
Applied to individual websites when created:
- E-commerce functionality
- Advanced themes
- Custom domain support
- SEO optimization tools

### Addon Management
- Addons are selected during subscription signup
- User-level addons activate immediately
- Site-level addons are applied to new websites automatically
- Existing websites may require manual addon application

## Permission System

### Granted Permissions
Website subscriptions can grant various permissions:

- **sites**: Basic website creation and management
- **manage_sites**: Advanced site administration features
- **vendor**: Marketplace vendor capabilities (plan-dependent)
- **manage_content**: Content management system access
- **verified**: Verified user status

### Permission Integration
- Permissions are granted based on selected plan
- Additional permissions may be included with certain addons
- Permissions are revoked upon subscription cancellation
- Permission changes take effect immediately

## Error Responses

- `400 Bad Request`: Invalid input data or business rule violations
  - Invalid plan name
  - User already has active subscription
  - Missing required fields
- `401 Unauthorized`: Invalid or missing API key
- `404 Not Found`: Terms version not found or invalid
- `500 Internal Server Error`: Server processing error

## Rate Limits
- 100 requests per minute per API key for subscription management
- 200 requests per minute per API key for status checking

## Example Usage

### Complete Subscription Flow
```bash
# 1. Check current terms
curl -X GET https://api.beemeeart.com/api/subscriptions/websites/terms-check \
  -H "Authorization: Bearer your_api_key"

# 2. Accept terms (if not already accepted)
curl -X POST https://api.beemeeart.com/api/subscriptions/websites/terms-accept \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"terms_version_id": 123}'

# 3. Create subscription
curl -X POST https://api.beemeeart.com/api/subscriptions/websites/signup \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_name": "Professional Plan",
    "permissions": ["sites", "manage_sites"],
    "selected_addons": [1, 3, 5],
    "pricing": {"total": 24.99},
    "payment_method_id": "pm_1234567890"
  }'

# 4. Check subscription status
curl -X GET https://api.beemeeart.com/api/subscriptions/websites/status \
  -H "Authorization: Bearer your_api_key"
```

### Subscription Management
```bash
# Cancel subscription
curl -X POST https://api.beemeeart.com/api/subscriptions/websites/cancel \
  -H "Authorization: Bearer your_api_key"

# Check status after cancellation
curl -X GET https://api.beemeeart.com/api/subscriptions/websites/status \
  -H "Authorization: Bearer your_api_key"
```

## Request/Response Examples

### Terms Check - Not Accepted
**Request:**
```bash
curl -X GET https://api.beemeeart.com/api/subscriptions/websites/terms-check \
  -H "Authorization: Bearer your_api_key"
```

**Response:**
```json
{
  "success": true,
  "termsAccepted": false,
  "latestTerms": {
    "id": 123,
    "title": "Website Service Terms",
    "content": "By using our website hosting service...",
    "version": "2.1",
    "created_at": "2025-09-17T19:30:00Z"
  }
}
```

### Subscription Signup - Professional Plan
**Request:**
```bash
curl -X POST https://api.beemeeart.com/api/subscriptions/websites/signup \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "plan_name": "Professional Plan",
    "permissions": ["sites", "manage_sites"],
    "selected_addons": [1, 3],
    "pricing": {
      "subtotal": 29.99,
      "discount": 5.00,
      "total": 24.99
    },
    "payment_method_id": "pm_1234567890",
    "auto_applied_discount": {
      "code": "WELCOME20",
      "amount": 5.00,
      "type": "fixed"
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully subscribed to Professional Plan",
  "subscription_id": "sites_456_1726599000000",
  "permissions": [
    "sites",
    "manage_sites",
    "vendor",
    "verified"
  ],
  "plan_name": "Professional Plan",
  "selected_addons": [1, 3],
  "total_price": 24.99,
  "discount_applied": 5.00
}
```

### Status Check - Active Subscription
**Request:**
```bash
curl -X GET https://api.beemeeart.com/api/subscriptions/websites/status \
  -H "Authorization: Bearer your_api_key"
```

**Response:**
```json
{
  "success": true,
  "hasSubscription": true,
  "sitesCount": 3,
  "status": "active"
}
```

## Business Rules

### Subscription Validation
- Users can only have one active website subscription
- Plan names must match predefined options
- Terms must be accepted before subscription creation
- Payment method is required for paid plans

### Permission Management
- Permissions are granted based on selected plan
- Additional permissions may come from addons
- All permissions are revoked upon cancellation
- Permission changes are immediate

### Addon Processing
- User-level addons activate immediately
- Site-level addons are stored for future site creation
- Addon availability depends on subscription plan
- Invalid addons are ignored during processing

## Integration Notes

### Payment Processing
- Currently simulates successful payment processing
- Prepared for Stripe integration
- Supports discount codes and promotional pricing
- Payment method validation will be added with Stripe

### Site Creation Integration
- Subscription grants permission to create websites
- Site count is tracked for plan limit enforcement
- Site-level addons are applied during site creation
- Subscription status affects site functionality

### Permission System Integration
- Seamlessly integrates with existing permission system
- Supports multiple permission types per subscription
- Permission changes propagate throughout the system
- Compatible with role-based access control

## Best Practices

### Subscription Management
- Always check terms acceptance before allowing subscription
- Validate plan selection against available options
- Handle payment processing errors gracefully
- Provide clear feedback for subscription status changes

### Error Handling
- Implement proper error handling for all scenarios
- Provide meaningful error messages to users
- Handle duplicate subscription attempts gracefully
- Validate all input parameters before processing

### Security Considerations
- Validate all user inputs
- Prevent unauthorized subscription modifications
- Secure payment method handling
- Audit subscription changes for compliance

### Performance Optimization
- Cache subscription status for frequent checks
- Optimize database queries for large user bases
- Implement proper indexing for subscription lookups
- Consider pagination for large addon lists
