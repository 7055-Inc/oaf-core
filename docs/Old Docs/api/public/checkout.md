# Checkout API

## Authentication
All checkout endpoints require API key authentication.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- `Content-Type: application/json`

## Endpoints

### Calculate Totals

#### Calculate Cart Totals
`POST /api/checkout/calculate-totals`

Calculate comprehensive totals for cart items including shipping, discounts, and commissions.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "cart_items": [
    {
      "product_id": 123,
      "quantity": 2
    }
  ],
  "shipping_address": {
    "name": "John Doe",
    "line1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postal_code": "10001",
    "country": "US"
  },
  "applied_coupons": ["SAVE10"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "vendor_groups": [
    {
      "vendor_id": 456,
      "vendor_name": "Artist Store",
      "items": [
        {
          "product_id": 123,
          "title": "Handmade Vase",
          "quantity": 2,
          "price": 59.98,
          "shipping_cost": 8.50,
          "commission_amount": 8.99
        }
      ],
      "subtotal": 59.98,
      "shipping_total": 8.50,
      "commission_total": 8.99
    }
  ],
  "totals": {
    "subtotal": 59.98,
    "shipping_total": 8.50,
    "tax_total": 0,
    "platform_fee_total": 8.99,
    "total_amount": 68.48,
    "vendor_count": 1
  }
}
```

### Payment Processing

#### Create Payment Intent
`POST /api/checkout/create-payment-intent`

Create a Stripe payment intent for order processing with tax calculation.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "cart_items": [
    {
      "product_id": 123,
      "quantity": 2
    }
  ],
  "shipping_info": {
    "name": "John Doe",
    "line1": "123 Main St",
    "city": "New York",
    "state": "NY",
    "postal_code": "10001",
    "country": "US"
  },
  "billing_info": {
    "email": "john@example.com",
    "name": "John Doe",
    "address": {
      "line1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postal_code": "10001",
      "country": "US"
    }
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "payment_intent": {
    "id": "pi_1234567890",
    "client_secret": "pi_1234567890_secret_abc123",
    "amount": 7348
  },
  "order_id": 789,
  "totals": {
    "subtotal": 59.98,
    "shipping_total": 8.50,
    "tax_amount": 5.00,
    "platform_fee_total": 8.99,
    "total_with_tax": 73.48
  },
  "tax_info": {
    "calculation_id": "taxcalc_123",
    "tax_amount": 5.00,
    "tax_breakdown": [
      {
        "amount": 500,
        "tax_rate_details": {
          "percentage_decimal": 8.25
        }
      }
    ]
  }
}
```

#### Confirm Payment
`POST /api/checkout/confirm-payment`

Confirm payment and finalize order processing.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "payment_intent_id": "pi_1234567890",
  "order_id": 789
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Payment confirmed, order processing",
  "order_id": 789
}
```

### Order Management

#### Get Payment Status
`GET /api/checkout/payment-status/{order_id}`

Check payment status for a specific order.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
{
  "success": true,
  "order": {
    "id": 789,
    "status": "processing",
    "total_amount": 73.48,
    "created_at": "2025-09-17T19:30:00Z",
    "stripe_payment_intent_id": "pi_1234567890"
  }
}
```

#### Get Order Details
`GET /api/checkout/order/{order_id}`

Retrieve comprehensive order details with all items.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
{
  "success": true,
  "order": {
    "id": 789,
    "user_id": 123,
    "status": "processing",
    "total_amount": 73.48,
    "shipping_amount": 8.50,
    "tax_amount": 5.00,
    "platform_fee_amount": 8.99,
    "created_at": "2025-09-17T19:30:00Z",
    "items": [
      {
        "id": 1,
        "product_id": 123,
        "product_title": "Handmade Vase",
        "vendor_id": 456,
        "vendor_name": "artist123",
        "quantity": 2,
        "price": 29.99,
        "shipping_cost": 8.50,
        "commission_rate": 15.00,
        "commission_amount": 8.99
      }
    ]
  }
}
```

#### Get Order History
`GET /api/checkout/orders/my`

Get customer's order history with pagination and filtering.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `status` (string): Filter by order status (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "orders": [
    {
      "id": 789,
      "stripe_payment_intent_id": "pi_1234567890",
      "status": "processing",
      "total_amount": 73.48,
      "shipping_amount": 8.50,
      "tax_amount": 5.00,
      "platform_fee_amount": 8.99,
      "created_at": "2025-09-17T19:30:00Z",
      "items": [
        {
          "item_id": 1,
          "product_id": 123,
          "product_name": "Handmade Vase",
          "product_thumbnail": "https://api.beemeeart.com/api/images/product123.jpg",
          "quantity": 2,
          "price": 29.99,
          "shipping_cost": 8.50,
          "item_status": "pending",
          "vendor_name": "Artist Store",
          "tracking": {
            "carrier": "UPS",
            "tracking_number": "1Z123456789",
            "updated_at": "2025-09-17T20:00:00Z"
          }
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}
```

### Discount Management

#### Apply Coupon
`POST /api/checkout/apply-coupon`

Validate and apply a coupon code to cart items.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "coupon_code": "SAVE10",
  "cart_items": [
    {
      "product_id": 123,
      "quantity": 2
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "coupon": {
    "code": "SAVE10",
    "discount_type": "percentage",
    "discount_value": 10,
    "description": "10% off your order"
  },
  "items_with_discounts": [
    {
      "product_id": 123,
      "original_price": 59.98,
      "discounted_price": 53.98,
      "discount_amount": 6.00,
      "discount_applied": true
    }
  ],
  "message": "Coupon applied successfully"
}
```

#### Remove Coupon
`POST /api/checkout/remove-coupon`

Remove an applied coupon from cart items.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "coupon_code": "SAVE10",
  "cart_items": [
    {
      "product_id": 123,
      "quantity": 2
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "items_without_coupon": [
    {
      "product_id": 123,
      "price": 59.98,
      "discount_applied": false
    }
  ],
  "message": "Coupon removed successfully"
}
```

#### Get Auto Discounts
`POST /api/checkout/get-auto-discounts`

Get automatically applicable discounts for cart items.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "cart_items": [
    {
      "product_id": 123,
      "quantity": 2
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "auto_discounted_items": [
    {
      "product_id": 123,
      "original_price": 59.98,
      "discounted_price": 53.98,
      "discount_amount": 6.00,
      "discount_details": {
        "source_type": "bulk_discount",
        "description": "Buy 2+ items, get 10% off"
      }
    }
  ],
  "items_with_auto_discounts": []
}
```

#### Validate Coupon
`GET /api/checkout/validate-coupon/{code}`

Validate a coupon code without applying it.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Query Parameters:**
- `cart_items` (string): JSON string of cart items (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "coupon": {
    "code": "SAVE10",
    "discount_type": "percentage",
    "discount_value": 10,
    "description": "10% off your order",
    "valid_until": "2025-12-31T23:59:59Z"
  },
  "error": null
}
```

## Error Responses

- `400 Bad Request`: Invalid input data or missing required fields
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: Access denied to order or resource
- `404 Not Found`: Order or resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limits
- 50 requests per minute per API key for checkout operations
- 20 requests per minute per API key for order history

## Example Usage

### Complete Checkout Flow
```bash
# 1. Calculate totals
curl -X POST https://api.beemeeart.com/api/checkout/calculate-totals \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "cart_items": [{"product_id": 123, "quantity": 2}],
    "shipping_address": {
      "name": "John Doe",
      "line1": "123 Main St",
      "city": "New York",
      "state": "NY",
      "postal_code": "10001"
    }
  }'

# 2. Create payment intent
curl -X POST https://api.beemeeart.com/api/checkout/create-payment-intent \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "cart_items": [{"product_id": 123, "quantity": 2}],
    "shipping_info": {...},
    "billing_info": {...}
  }'

# 3. Confirm payment (after Stripe payment success)
curl -X POST https://api.beemeeart.com/api/checkout/confirm-payment \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_intent_id": "pi_1234567890",
    "order_id": 789
  }'
```

### Apply Coupon
```bash
curl -X POST https://api.beemeeart.com/api/checkout/apply-coupon \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "coupon_code": "SAVE10",
    "cart_items": [{"product_id": 123, "quantity": 2}]
  }'
```

### Get Order History
```bash
curl -X GET "https://api.beemeeart.com/api/checkout/orders/my?page=1&limit=10&status=processing" \
  -H "Authorization: Bearer your_api_key"
```
