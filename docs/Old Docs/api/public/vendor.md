# Vendor Management API

## Authentication
All vendor endpoints require API key authentication and vendor permissions.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- `Content-Type: application/json`
- **Permission Required:** `vendor` (most endpoints) or `stripe_connect` (payment endpoints)

## Order Management

### Get Vendor Orders
`GET /api/vendor/orders`

Get paginated list of vendor's orders with optional status filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `status` (optional): Filter by order status

**Response (200 OK):**
```json
{
  "success": true,
  "orders": [
    {
      "id": 123,
      "stripe_payment_intent_id": "pi_1234567890",
      "status": "paid",
      "total_amount": 108.00,
      "shipping_amount": 8.00,
      "created_at": "2025-09-17T19:30:00Z",
      "updated_at": "2025-09-17T19:35:00Z",
      "customer_email": "customer@example.com",
      "customer_name": "John Doe",
      "items": [
        {
          "product_id": 456,
          "product_name": "Handmade Ceramic Vase",
          "quantity": 1,
          "price": 100.00,
          "commission_rate": 0.15,
          "commission_amount": 15.00,
          "shipping_cost": 8.00,
          "vendor_receives": 85.00
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### Get Vendor Orders (Alternative)
`GET /api/vendor/orders/my`

Get vendor orders with shipping status filtering.

**Query Parameters:**
- `status` (optional): Filter by shipping status ('unshipped', 'shipped')

**Response (200 OK):**
```json
{
  "success": true,
  "orders": [
    {
      "order_id": 123,
      "created_at": "2025-09-17T19:30:00Z",
      "order_status": "paid",
      "customer_name": "John Doe",
      "shipping_address": {
        "street": "123 Main St",
        "address_line_2": "Apt 4B",
        "city": "New York",
        "state": "NY",
        "zip": "10001",
        "country": "US",
        "recipient_name": "John Doe"
      },
      "items": [
        {
          "item_id": 789,
          "product_id": 456,
          "product_name": "Handmade Ceramic Vase",
          "quantity": 1,
          "price": 100.00,
          "shipping_cost": 8.00,
          "item_status": "pending",
          "shipped_at": null
        }
      ]
    }
  ]
}
```

## Financial Management

### Get Vendor Dashboard
`GET /api/vendor/dashboard`

Get comprehensive vendor financial dashboard.

**Response (200 OK):**
```json
{
  "success": true,
  "dashboard": {
    "balance": {
      "available_balance": 2500.00,
      "pending_payout": 500.00,
      "total_sales": 15000.00,
      "total_orders": 150,
      "current_balance": 2000.00
    },
    "recent_transactions": [
      {
        "id": 789,
        "transaction_type": "sale",
        "amount": 85.00,
        "status": "completed",
        "created_at": "2025-09-17T19:30:00Z",
        "order_number": 123,
        "type_display": "Sale"
      }
    ],
    "upcoming_payouts": [
      {
        "payout_date": "2025-09-24",
        "transaction_count": 15,
        "payout_amount": 500.00
      }
    ],
    "vendor_settings": {
      "commission_rate": 0.15,
      "minimum_payout": 25.00,
      "stripe_account_id": "acct_1234567890"
    },
    "stripe_account": {
      "id": "acct_1234567890",
      "charges_enabled": true,
      "payouts_enabled": true,
      "details_submitted": true
    }
  }
}
```

### Get Vendor Balance
`GET /api/vendor/balance`

Get detailed vendor balance information.

**Response (200 OK):**
```json
{
  "success": true,
  "balance": {
    "available_balance": 2500.00,
    "pending_payout": 500.00,
    "total_sales": 15000.00,
    "total_orders": 150,
    "current_balance": 2000.00
  }
}
```

### Get Transaction History
`GET /api/vendor/transactions`

Get paginated vendor transaction history.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (200 OK):**
```json
{
  "success": true,
  "transactions": [
    {
      "id": 789,
      "vendor_id": 123,
      "order_id": 456,
      "transaction_type": "sale",
      "amount": 85.00,
      "commission_amount": 15.00,
      "status": "completed",
      "payout_date": "2025-09-24",
      "created_at": "2025-09-17T19:30:00Z",
      "order_number": 456,
      "type_display": "Sale"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "pages": 25
  }
}
```

### Get Upcoming Payouts
`GET /api/vendor/payouts`

Get scheduled payout information.

**Response (200 OK):**
```json
{
  "success": true,
  "payouts": [
    {
      "payout_date": "2025-09-24",
      "transaction_count": 15,
      "payout_amount": 500.00
    },
    {
      "payout_date": "2025-10-01",
      "transaction_count": 8,
      "payout_amount": 320.00
    }
  ]
}
```

## Stripe Connect Integration

### Create Stripe Account
`POST /api/vendor/stripe-account`

Create new Stripe Connect account for vendor.

**Permission Required:** `stripe_connect`

**Request Body:**
```json
{
  "business_info": {
    "business_type": "individual",
    "country": "US"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "stripe_account": {
    "id": "acct_1234567890",
    "onboarding_url": "https://connect.stripe.com/setup/s/acct_1234567890"
  }
}
```

### Get Onboarding Link
`GET /api/vendor/stripe-onboarding`

Get fresh onboarding link for existing Stripe account.

**Permission Required:** `stripe_connect`

**Response (200 OK):**
```json
{
  "success": true,
  "onboarding_url": "https://connect.stripe.com/setup/s/acct_1234567890"
}
```

## Settings and Preferences

### Get Vendor Settings
`GET /api/vendor/settings`

Get comprehensive vendor settings.

**Response (200 OK):**
```json
{
  "success": true,
  "settings": {
    "commission_rate": 0.15,
    "minimum_payout": 25.00,
    "stripe_account_id": "acct_1234567890",
    "stripe_account_verified": true,
    "payment_schedule": "weekly"
  }
}
```

### Update Subscription Preferences
`POST /api/vendor/subscription-preferences`

Update subscription payment preferences.

**Request Body:**
```json
{
  "payment_method": "balance_first",
  "reverse_transfer_enabled": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Subscription preferences updated successfully"
}
```

### Get Shipping Preferences
`GET /api/vendor/shipping-preferences`

Get vendor shipping preferences.

**Response (200 OK):**
```json
{
  "success": true,
  "preferences": {
    "vendor_id": 123,
    "return_company_name": "My Art Studio",
    "return_contact_name": "Jane Artist",
    "return_address_line_1": "456 Studio Ave",
    "return_address_line_2": "Suite 2B",
    "return_city": "Los Angeles",
    "return_state": "CA",
    "return_postal_code": "90210",
    "return_country": "US",
    "return_phone": "+1-555-0123",
    "label_size_preference": "4x6",
    "signature_required_default": false,
    "insurance_default": true
  }
}
```

### Update Shipping Preferences
`POST /api/vendor/shipping-preferences`

Update vendor shipping preferences.

**Request Body:**
```json
{
  "return_company_name": "My Art Studio",
  "return_contact_name": "Jane Artist",
  "return_address_line_1": "456 Studio Ave",
  "return_city": "Los Angeles",
  "return_state": "CA",
  "return_postal_code": "90210",
  "return_country": "US",
  "label_size_preference": "4x6",
  "signature_required_default": false,
  "insurance_default": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Shipping preferences saved successfully"
}
```

## Policy Management

### Get Shipping Policy
`GET /api/vendor/shipping-policy`

Get vendor shipping policy with fallback to default.

**Response (200 OK):**
```json
{
  "success": true,
  "policy": {
    "id": 456,
    "policy_text": "All items ship within 3-5 business days via USPS Priority Mail...",
    "created_at": "2025-09-01T10:00:00Z",
    "updated_at": "2025-09-01T10:00:00Z",
    "created_by_username": "vendor@example.com",
    "policy_source": "custom"
  }
}
```

### Update Shipping Policy
`PUT /api/vendor/shipping-policy`

Create new shipping policy version.

**Request Body:**
```json
{
  "policy_text": "Updated shipping policy: All items ship within 2-3 business days..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "policy": {
    "id": 457,
    "policy_text": "Updated shipping policy: All items ship within 2-3 business days...",
    "created_at": "2025-09-17T19:30:00Z",
    "updated_at": "2025-09-17T19:30:00Z",
    "created_by_username": "vendor@example.com",
    "policy_source": "custom"
  }
}
```

### Get Shipping Policy History
`GET /api/vendor/shipping-policy/history`

Get complete shipping policy version history.

**Response (200 OK):**
```json
{
  "success": true,
  "history": [
    {
      "id": 457,
      "policy_text": "Updated shipping policy...",
      "status": "active",
      "created_at": "2025-09-17T19:30:00Z",
      "updated_at": "2025-09-17T19:30:00Z",
      "created_by_username": "vendor@example.com"
    },
    {
      "id": 456,
      "policy_text": "Original shipping policy...",
      "status": "archived",
      "created_at": "2025-09-01T10:00:00Z",
      "updated_at": "2025-09-17T19:30:00Z",
      "created_by_username": "vendor@example.com"
    }
  ]
}
```

### Delete Shipping Policy
`DELETE /api/vendor/shipping-policy`

Archive active shipping policy (reverts to platform default).

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Shipping policy deleted successfully"
}
```

### Return Policy Endpoints
Similar endpoints exist for return policy management:
- `GET /api/vendor/return-policy`
- `PUT /api/vendor/return-policy`
- `GET /api/vendor/return-policy/history`
- `DELETE /api/vendor/return-policy`

## Coupon Management

### Get Vendor Coupons
`GET /api/vendor/coupons/my`

Get list of vendor's created coupons.

**Response (200 OK):**
```json
{
  "success": true,
  "coupons": [
    {
      "id": 789,
      "code": "SAVE20",
      "name": "20% Off Sale",
      "discount_type": "percentage",
      "discount_value": 20,
      "is_active": true,
      "created_at": "2025-09-01T10:00:00Z"
    }
  ]
}
```

### Create Vendor Coupon
`POST /api/vendor/coupons/create`

Create new vendor coupon with comprehensive options.

**Request Body:**
```json
{
  "code": "SAVE20",
  "name": "20% Off Sale",
  "description": "Limited time 20% discount on all items",
  "discount_type": "percentage",
  "discount_value": 20,
  "application_type": "coupon_code",
  "min_order_amount": 50.00,
  "usage_limit_per_user": 1,
  "total_usage_limit": 100,
  "valid_from": "2025-09-20T00:00:00Z",
  "valid_until": "2025-10-20T23:59:59Z",
  "product_ids": [456, 789]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "coupon_id": 123,
  "message": "Coupon created successfully"
}
```

### Update Vendor Coupon
`PUT /api/vendor/coupons/:id`

Update existing vendor coupon.

**Request Body:**
```json
{
  "name": "Updated 25% Off Sale",
  "discount_value": 25,
  "valid_until": "2025-11-20T23:59:59Z",
  "is_active": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Coupon updated successfully"
}
```

### Delete Vendor Coupon
`DELETE /api/vendor/coupons/:id`

Delete unused vendor coupon.

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Coupon deleted successfully"
}
```

### Get Coupon Analytics
`GET /api/vendor/coupons/:id/analytics`

Get comprehensive coupon usage analytics.

**Response (200 OK):**
```json
{
  "success": true,
  "coupon": {
    "id": 123,
    "name": "20% Off Sale",
    "current_usage_count": 45
  },
  "analytics": {
    "overall": {
      "unique_users": 42,
      "total_uses": 45,
      "total_discount_given": 890.50
    },
    "daily_usage": [
      {
        "use_date": "2025-09-17",
        "daily_uses": 8,
        "total_discount_given": 156.00,
        "avg_discount_per_use": 19.50
      }
    ]
  }
}
```

### Get Products for Coupons
`GET /api/vendor/coupons/products`

Get vendor's products for coupon creation.

**Response (200 OK):**
```json
{
  "success": true,
  "products": [
    {
      "id": 456,
      "name": "Handmade Ceramic Vase",
      "price": 100.00,
      "status": "active",
      "created_at": "2025-08-01T10:00:00Z"
    }
  ]
}
```

## Promotion System

### Get Promotion Invitations
`GET /api/vendor/promotions/invitations`

Get vendor's promotion invitations.

**Response (200 OK):**
```json
{
  "success": true,
  "invitations": [
    {
      "id": 123,
      "invitation_status": "pending",
      "invited_at": "2025-09-15T10:00:00Z",
      "promotion_name": "Holiday Art Sale 2025"
    }
  ]
}
```

### Respond to Promotion Invitation
`POST /api/vendor/promotions/:id/respond`

Respond to promotion invitation.

**Request Body:**
```json
{
  "response": "accepted",
  "vendor_discount_percentage": 15,
  "vendor_response_message": "Happy to participate in this promotion!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Invitation accepted successfully"
}
```

## Data Types

### Order Status Values
- `pending`: Order is pending payment
- `paid`: Order has been paid
- `processing`: Order is being processed
- `shipped`: Order has been shipped
- `delivered`: Order has been delivered
- `cancelled`: Order was cancelled
- `refunded`: Order was refunded

### Transaction Types
- `sale`: Product sale transaction
- `commission`: Platform commission
- `payout`: Payout to vendor
- `refund`: Refund transaction
- `adjustment`: Manual adjustment
- `subscription_charge`: Subscription fee

### Discount Types
- `percentage`: Percentage discount (1-100)
- `fixed_amount`: Fixed dollar amount discount

### Application Types
- `coupon_code`: Requires coupon code entry
- `auto_apply`: Automatically applies to eligible orders

### Payment Methods
- `balance_first`: Use account balance first, then card
- `card_only`: Use card only for payments

## Validation Rules

### Coupon Creation
- Code must be unique across all coupons
- Discount value must be positive
- Percentage discounts must be 1-100
- Valid dates must be properly formatted
- Product IDs must belong to the vendor

### Policy Updates
- Policy text is required and cannot be empty
- Policy updates create new versions (old ones are archived)

### Shipping Preferences
- Country defaults to 'US' if not provided
- Label size defaults to '4x6' if not provided
- Boolean fields are properly converted from various formats

## Error Responses

- `400 Bad Request`: Invalid input data
  - Missing required fields
  - Invalid discount values
  - Invalid payment method
  - Coupon code already exists
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: Insufficient permissions
  - Most endpoints require `vendor` permission
  - Stripe endpoints require `stripe_connect` permission
- `404 Not Found`: Resource not found
  - Vendor not found
  - Coupon not found or not owned by vendor
  - Policy not found
- `500 Internal Server Error`: Server processing error

## Rate Limits
- 200 requests per minute per API key for vendor endpoints
- Higher limits for order management during peak periods

## Example Usage

### Complete Vendor Onboarding Flow
```bash
# 1. Create Stripe Connect account
curl -X POST https://api.beemeeart.com/api/vendor/stripe-account \
  -H "Authorization: Bearer vendor_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "business_info": {
      "business_type": "individual",
      "country": "US"
    }
  }'

# 2. Update shipping preferences
curl -X POST https://api.beemeeart.com/api/vendor/shipping-preferences \
  -H "Authorization: Bearer vendor_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "return_company_name": "My Art Studio",
    "return_address_line_1": "456 Studio Ave",
    "return_city": "Los Angeles",
    "return_state": "CA",
    "return_postal_code": "90210"
  }'

# 3. Create shipping policy
curl -X PUT https://api.beemeeart.com/api/vendor/shipping-policy \
  -H "Authorization: Bearer vendor_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "policy_text": "All items ship within 3-5 business days via USPS Priority Mail..."
  }'
```

### Order Management Flow
```bash
# 1. Get pending orders
curl -X GET "https://api.beemeeart.com/api/vendor/orders?status=paid" \
  -H "Authorization: Bearer vendor_api_key"

# 2. Get orders ready to ship
curl -X GET "https://api.beemeeart.com/api/vendor/orders/my?status=unshipped" \
  -H "Authorization: Bearer vendor_api_key"

# 3. Get item shipping details
curl -X GET "https://api.beemeeart.com/api/vendor/order-item-details?item_id=789" \
  -H "Authorization: Bearer vendor_api_key"
```

### Financial Management Flow
```bash
# 1. Get dashboard overview
curl -X GET https://api.beemeeart.com/api/vendor/dashboard \
  -H "Authorization: Bearer vendor_api_key"

# 2. Get detailed balance
curl -X GET https://api.beemeeart.com/api/vendor/balance \
  -H "Authorization: Bearer vendor_api_key"

# 3. Get transaction history
curl -X GET "https://api.beemeeart.com/api/vendor/transactions?page=1&limit=20" \
  -H "Authorization: Bearer vendor_api_key"

# 4. Check upcoming payouts
curl -X GET https://api.beemeeart.com/api/vendor/payouts \
  -H "Authorization: Bearer vendor_api_key"
```

### Coupon Management Flow
```bash
# 1. Get vendor products for coupon
curl -X GET https://api.beemeeart.com/api/vendor/coupons/products \
  -H "Authorization: Bearer vendor_api_key"

# 2. Create new coupon
curl -X POST https://api.beemeeart.com/api/vendor/coupons/create \
  -H "Authorization: Bearer vendor_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SAVE20",
    "name": "20% Off Sale",
    "discount_type": "percentage",
    "discount_value": 20,
    "application_type": "coupon_code",
    "valid_from": "2025-09-20T00:00:00Z",
    "valid_until": "2025-10-20T23:59:59Z"
  }'

# 3. Get coupon analytics
curl -X GET https://api.beemeeart.com/api/vendor/coupons/123/analytics \
  -H "Authorization: Bearer vendor_api_key"
```

## Integration Notes

### Stripe Connect Integration
- Automatic account creation with onboarding links
- Real-time account status monitoring
- Seamless payment processing integration
- Comprehensive payout management

### Order Fulfillment
- Real-time order status tracking
- Shipping address integration
- Item-level fulfillment tracking
- Customer communication coordination

### Policy Management
- Version control for all policy changes
- Automatic fallback to platform defaults
- Complete audit trail for policy updates
- Flexible policy customization

### Coupon System
- Comprehensive coupon creation and management
- Real-time usage analytics and tracking
- Product-specific coupon support
- Advanced validation and usage limits

## Best Practices

### Order Management
- Check for new orders regularly using status filters
- Use shipping status endpoints for fulfillment workflows
- Maintain accurate item-level shipping status
- Coordinate with shipping label generation systems

### Financial Management
- Monitor dashboard regularly for business insights
- Track payout schedules for cash flow planning
- Review transaction history for accuracy
- Maintain up-to-date Stripe Connect account information

### Policy Management
- Keep shipping and return policies current and accurate
- Use policy versioning for audit trails
- Provide clear and comprehensive policy information
- Review policies regularly for compliance

### Coupon Management
- Create targeted coupons for specific products or campaigns
- Monitor coupon analytics for performance insights
- Set appropriate usage limits to prevent abuse
- Use clear and memorable coupon codes

### Security Considerations
- Protect API keys and ensure proper authentication
- Limit access to vendor data to authorized personnel
- Monitor API usage for unusual patterns
- Ensure secure transmission of all vendor data
- Regularly review and audit vendor data access

### Performance Optimization
- Use pagination for large datasets (orders, transactions, coupons)
- Filter data appropriately to reduce response sizes
- Cache frequently accessed data when appropriate
- Monitor API response times and optimize queries as needed

## Future Enhancements

### Advanced Features (Coming Soon)
- **Bulk Order Processing:** Bulk operations for order management and fulfillment
- **Advanced Analytics:** Detailed vendor performance analytics and reporting
- **Automated Policies:** Template-based policy generation and management
- **Integration APIs:** External system integration for inventory and fulfillment
- **Mobile Optimization:** Mobile-optimized vendor portal and management tools
- **Real-time Notifications:** Live updates for orders, payments, and promotions

### Enhanced Functionality (Planned)
- **Advanced Coupons:** More sophisticated coupon types and conditions
- **Inventory Integration:** Real-time inventory tracking and management
- **Customer Communication:** Direct customer messaging and support tools
- **Performance Dashboards:** Advanced business intelligence and reporting
- **Automated Fulfillment:** Integration with fulfillment centers and drop shipping

## API Versioning
- Current version: 1.0.0
- Breaking changes will increment major version
- New features increment minor version
- Bug fixes increment patch version
- Deprecation notices provided 90 days before removal

## Support and Documentation
- **API Documentation:** Complete OpenAPI 3.0 specification available
- **Integration Support:** Technical support for API integration
- **Vendor Support:** Guidance on vendor portal usage and best practices
- **Updates:** Regular updates on new features and enhancements
- **Community:** Developer community for best practices and tips
