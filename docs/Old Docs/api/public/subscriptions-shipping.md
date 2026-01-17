# Shipping Subscriptions API

## Authentication
Most shipping subscription endpoints require API key authentication. Some endpoints require additional shipping permissions.

**Headers:**
- `Authorization: Bearer {api_key}` (required for most endpoints)
- `Content-Type: application/json`

## Endpoints

### Address Management

#### Get Vendor Address
`GET /api/subscriptions/shipping/vendor-address`

Get vendor shipping settings for Ship From address prefill in label creation.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
{
  "success": true,
  "has_vendor_address": true,
  "address": {
    "name": "John's Art Studio",
    "street": "123 Main St",
    "address_line_2": "Suite 100",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "US",
    "phone": "+1-555-123-4567"
  },
  "incomplete_address": null
}
```

**Response (200 OK - Incomplete Address):**
```json
{
  "success": true,
  "has_vendor_address": true,
  "address": null,
  "incomplete_address": {
    "name": "John's Art Studio",
    "street": "123 Main St",
    "city": null,
    "state": null,
    "zip": null,
    "country": "US",
    "phone": null
  }
}
```

### Terms Management

#### Check Terms Acceptance
`GET /api/subscriptions/shipping/terms-check`

Check if the authenticated user has accepted the latest shipping terms.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
{
  "success": true,
  "termsAccepted": true,
  "latestTerms": {
    "id": 456,
    "title": "Shipping Label Service Terms",
    "content": "By using our shipping label service, you agree to...",
    "version": "1.2",
    "created_at": "2025-09-17T19:30:00Z"
  }
}
```

#### Get Current Terms
`GET /api/subscriptions/shipping/terms`

Get the current shipping terms and conditions (public endpoint).

**Response (200 OK):**
```json
{
  "success": true,
  "terms": {
    "id": 456,
    "version": "1.2",
    "title": "Shipping Label Service Terms",
    "content": "By using our shipping label service, you agree to...",
    "created_at": "2025-09-17T19:30:00Z"
  }
}
```

#### Accept Terms
`POST /api/subscriptions/shipping/accept-terms`

Record user acceptance of shipping terms with audit trail.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Shipping terms accepted successfully",
  "activated": true,
  "terms_version_id": 456
}
```

### Subscription Management

#### Get My Subscription
`GET /api/subscriptions/shipping/my`

Get complete shipping subscription status and details.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK - Active Subscription):**
```json
{
  "subscription": {
    "id": 789,
    "status": "active",
    "cardLast4": "4242",
    "preferConnectBalance": true,
    "hasStripeConnect": true,
    "termsAccepted": true,
    "termsAcceptedAt": "2025-09-17T19:30:00Z",
    "createdAt": "2025-09-17T19:00:00Z"
  },
  "card_purchases": [
    {
      "id": 123,
      "source": "card",
      "date": "2025-09-17T20:00:00Z",
      "amount": 8.50,
      "payment_method": "card",
      "tracking_number": "1Z123456789",
      "carrier": "ups",
      "status": "purchased"
    }
  ],
  "connect_purchases": [
    {
      "id": 456,
      "source": "connect",
      "date": "2025-09-17T21:00:00Z",
      "amount": 6.75,
      "payment_method": "connect_balance",
      "tracking_number": "1Z987654321",
      "carrier": "usps",
      "status": "purchased"
    }
  ],
  "has_permission": true,
  "connect_balance": {
    "available": 2500,
    "pending": 500
  }
}
```

#### Sign Up for Subscription
`POST /api/subscriptions/shipping/signup`

Create or activate shipping subscription.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "preferConnectBalance": true,
  "acceptTerms": true
}
```

**Response (200 OK - Immediate Activation):**
```json
{
  "success": true,
  "subscription_id": 789,
  "activated": true,
  "message": "Shipping subscription activated successfully!"
}
```

**Response (200 OK - Payment Method Required):**
```json
{
  "success": true,
  "subscription_id": 789,
  "has_payment_method": false,
  "setup_intent": {
    "id": "seti_1234567890",
    "client_secret": "seti_1234567890_secret_abcdef"
  },
  "message": "Add a payment method to activate shipping subscription."
}
```

#### Activate Subscription
`POST /api/subscriptions/shipping/activate`

Activate subscription after payment method setup.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "setup_intent_id": "seti_1234567890"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Shipping subscription activated successfully"
}
```

#### Cancel Subscription
`DELETE /api/subscriptions/shipping/cancel`

Cancel shipping subscription and revoke permissions.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- Requires shipping permissions

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Shipping subscription canceled successfully"
}
```

### Payment Management

#### Update Preferences
`PUT /api/subscriptions/shipping/preferences`

Update payment method preferences.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- Requires shipping permissions

**Request Body:**
```json
{
  "preferConnectBalance": true
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Preferences updated successfully",
  "prefer_connect_balance": true
}
```

#### Update Payment Method
`POST /api/subscriptions/shipping/update-payment-method`

Create setup intent for payment method update.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- Requires shipping permissions

**Response (200 OK):**
```json
{
  "success": true,
  "setup_intent": {
    "id": "seti_1234567890",
    "client_secret": "seti_1234567890_secret_abcdef"
  },
  "message": "Setup intent created for payment method update"
}
```

### Label Purchase Processing

#### Purchase Label
`POST /api/subscriptions/shipping/purchase-label`

Process payment for shipping label with automatic payment method selection.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- Requires shipping permissions

**Request Body:**
```json
{
  "shippingLabelId": 123,
  "amount": 8.50
}
```

**Response (200 OK - Connect Balance):**
```json
{
  "success": true,
  "payment_method": "connect_balance",
  "amount": 8.50,
  "shipping_label_id": 123,
  "transaction_id": 456
}
```

**Response (200 OK - Card Payment):**
```json
{
  "success": true,
  "payment_method": "card",
  "amount": 8.50,
  "shipping_label_id": 123,
  "payment_intent_id": "pi_1234567890",
  "purchase_id": 789
}
```

#### Create Standalone Label
`POST /api/subscriptions/shipping/create-standalone-label`

Create standalone shipping label not attached to an order.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- Requires shipping permissions

**Request Body:**
```json
{
  "shipper_address": {
    "name": "John's Art Studio",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "US"
  },
  "recipient_address": {
    "name": "Jane Customer",
    "street": "456 Oak Ave",
    "city": "Los Angeles",
    "state": "CA",
    "zip": "90210",
    "country": "US"
  },
  "packages": [
    {
      "length": 12,
      "width": 8,
      "height": 4,
      "weight": 2,
      "dimension_unit": "in",
      "weight_unit": "lbs"
    }
  ],
  "selected_rate": {
    "carrier": "ups",
    "service": "ups_ground",
    "cost": 8.50
  },
  "force_card_payment": false
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "label": {
    "id": 123,
    "tracking_number": "1Z123456789",
    "carrier": "ups",
    "service": "ups_ground",
    "cost": 8.50,
    "label_url": "/static_media/labels/label_123.pdf"
  },
  "payment_method": "connect_balance",
  "amount": 8.50
}
```

### Label Library

#### Get All Labels
`GET /api/subscriptions/shipping/all-labels`

Get unified library of both order and standalone labels.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
{
  "success": true,
  "labels": [
    {
      "db_id": 123,
      "type": "order",
      "order_id": 456,
      "order_item_id": 789,
      "tracking_number": "1Z123456789",
      "label_file_path": "/static_media/labels/label_123.pdf",
      "service_name": "UPS Ground",
      "cost": 8.50,
      "status": "purchased",
      "created_at": "2025-09-17T19:30:00Z",
      "customer_name": "Jane Customer",
      "product_name": "Handmade Vase",
      "quantity": 1
    },
    {
      "db_id": 124,
      "type": "standalone",
      "order_id": null,
      "order_item_id": null,
      "tracking_number": "1Z987654321",
      "label_file_path": "/static_media/labels/label_124.pdf",
      "service_name": "USPS Ground Advantage",
      "cost": 6.75,
      "status": "purchased",
      "created_at": "2025-09-17T20:00:00Z",
      "customer_name": "N/A",
      "product_name": "Standalone Label",
      "quantity": 1
    }
  ]
}
```

#### Get Standalone Labels
`GET /api/subscriptions/shipping/standalone-labels`

Get standalone label library only.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
{
  "success": true,
  "labels": [
    {
      "db_id": 124,
      "type": "standalone",
      "label_id": "standalone_124",
      "tracking_number": "1Z987654321",
      "label_file_path": "/static_media/labels/label_124.pdf",
      "service_name": "USPS Ground Advantage",
      "cost": 6.75,
      "status": "purchased",
      "created_at": "2025-09-17T20:00:00Z",
      "customer_name": "N/A",
      "product_name": "Standalone Label",
      "quantity": 1
    }
  ]
}
```

### Purchase History

#### Get Purchase History
`GET /api/subscriptions/shipping/purchases`

Get shipping label purchase history with pagination.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- Requires shipping permissions

**Query Parameters:**
- `limit` (optional): Number of records to return (default: 50)
- `offset` (optional): Number of records to skip (default: 0)

**Response (200 OK):**
```json
{
  "card_purchases": [
    {
      "id": 123,
      "source": "card",
      "amount": 8.50,
      "status": "succeeded",
      "decline_reason": null,
      "payment_method": "card",
      "tracking_number": "1Z123456789",
      "carrier": "ups",
      "service_name": "UPS Ground",
      "label_status": "purchased",
      "created_at": "2025-09-17T19:30:00Z"
    }
  ],
  "connect_purchases": [
    {
      "id": 456,
      "source": "connect",
      "amount": 6.75,
      "status": "completed",
      "decline_reason": null,
      "payment_method": "connect_balance",
      "tracking_number": "1Z987654321",
      "carrier": "usps",
      "service_name": "USPS Ground Advantage",
      "label_status": "purchased",
      "created_at": "2025-09-17T20:00:00Z"
    }
  ],
  "total_card": 1,
  "total_connect": 1,
  "limit": 50
}
```

#### Process Refund
`POST /api/subscriptions/shipping/refund`

Process refund for shipping label purchase.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- Requires shipping permissions

**Request Body:**
```json
{
  "purchaseId": 123,
  "amount": 8.50,
  "reason": "requested_by_customer"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "refund": {
    "success": true,
    "refund_id": "re_1234567890",
    "method": "card"
  },
  "amount": 8.50
}
```

## Payment Methods

### Connect Balance
- **Availability:** Users with Stripe Connect integration
- **Order Labels:** Allows negative balance (business credit)
- **Standalone Labels:** Prevents negative balance
- **Refunds:** Creates reversing transactions

### Card Payment
- **Availability:** All users with saved payment methods
- **Processing:** Uses Stripe with off_session confirmation
- **Refunds:** Processed through Stripe refund API
- **Fallback:** Automatic fallback when Connect balance insufficient

## Subscription States

### Incomplete
- Subscription created but payment method not set up
- Requires setup intent completion for activation

### Active
- Subscription with valid payment method and terms accepted
- Grants shipping permissions and label purchase access

### Canceled
- Subscription terminated by user
- Revokes shipping permissions

## Error Responses

- `400 Bad Request`: Invalid input data, missing required fields, or business rule violations
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: Insufficient permissions for shipping operations
- `404 Not Found`: Subscription, purchase, or label not found
- `500 Internal Server Error`: Server error

## Rate Limits
- 100 requests per minute per API key for subscription management
- 50 requests per minute per API key for label operations
- 20 requests per minute per API key for payment processing

## Example Usage

### Complete Subscription Setup Flow
```bash
# 1. Check current terms
curl -X GET https://api.beemeeart.com/api/subscriptions/shipping/terms

# 2. Sign up for subscription
curl -X POST https://api.beemeeart.com/api/subscriptions/shipping/signup \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "preferConnectBalance": true,
    "acceptTerms": true
  }'

# 3. If setup intent returned, complete payment method setup in frontend
# Then activate subscription
curl -X POST https://api.beemeeart.com/api/subscriptions/shipping/activate \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "setup_intent_id": "seti_1234567890"
  }'
```

### Label Purchase Flow
```bash
# 1. Purchase existing label
curl -X POST https://api.beemeeart.com/api/subscriptions/shipping/purchase-label \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingLabelId": 123,
    "amount": 8.50
  }'

# 2. Create standalone label
curl -X POST https://api.beemeeart.com/api/subscriptions/shipping/create-standalone-label \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "shipper_address": {
      "name": "John'\''s Art Studio",
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001"
    },
    "recipient_address": {
      "name": "Jane Customer",
      "street": "456 Oak Ave",
      "city": "Los Angeles",
      "state": "CA",
      "zip": "90210"
    },
    "packages": [{"length": 12, "width": 8, "height": 4, "weight": 2}],
    "selected_rate": {"carrier": "ups", "service": "ups_ground", "cost": 8.50}
  }'
```

### Subscription Management
```bash
# Get subscription status
curl -X GET https://api.beemeeart.com/api/subscriptions/shipping/my \
  -H "Authorization: Bearer your_api_key"

# Update preferences
curl -X PUT https://api.beemeeart.com/api/subscriptions/shipping/preferences \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{"preferConnectBalance": false}'

# Cancel subscription
curl -X DELETE https://api.beemeeart.com/api/subscriptions/shipping/cancel \
  -H "Authorization: Bearer your_api_key"
```

## Best Practices

### Subscription Setup
- Always check terms acceptance before allowing subscription creation
- Handle setup intents properly in frontend for payment method collection
- Verify subscription activation before allowing label operations

### Payment Processing
- Let the system choose payment method automatically based on preferences
- Handle both Connect balance and card payment responses
- Implement proper error handling for payment failures

### Label Management
- Use unified label library for complete label history
- Implement proper pagination for large label libraries
- Handle both order and standalone labels consistently

### Error Handling
- Implement retry logic for transient payment errors
- Provide clear user feedback for subscription state changes
- Handle Stripe-specific errors appropriately
