# Shipping API

## Authentication
Most shipping endpoints require API key authentication. Rate calculation endpoints may be public for product display.

**Headers:**
- `Authorization: Bearer {api_key}` (required for most endpoints)
- `Content-Type: application/json`

## Endpoints

### Rate Calculation

#### Calculate Product Shipping Rates
`POST /api/shipping/calculate-rates`

Calculate shipping rates for a single product.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "product_id": 123,
  "recipient_address": {
    "name": "John Doe",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "US"
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "product_id": 123,
  "rates": [
    {
      "carrier": "ups",
      "service": "ups_ground",
      "service_name": "UPS Ground",
      "cost": 8.50,
      "estimated_delivery": "3-5 business days"
    },
    {
      "carrier": "usps",
      "service": "usps_ground_advantage",
      "service_name": "USPS Ground Advantage",
      "cost": 6.75,
      "estimated_delivery": "2-5 business days"
    }
  ]
}
```

#### Calculate Cart Shipping Rates
`POST /api/shipping/calculate-cart-shipping`

Calculate shipping rates for multiple products in a cart.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "cart_items": [
    {
      "product_id": 123,
      "quantity": 2
    },
    {
      "product_id": 456,
      "quantity": 1
    }
  ],
  "recipient_address": {
    "name": "John Doe",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "US"
  },
  "test_packages": [
    {
      "length": 12,
      "width": 8,
      "height": 4,
      "weight": 2,
      "dimension_unit": "in",
      "weight_unit": "lbs"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "shipping_results": [
    {
      "product_id": 123,
      "ship_method": "calculated",
      "cost": 8.50,
      "available_rates": [
        {
          "carrier": "ups",
          "service": "ups_ground",
          "cost": 8.50
        }
      ],
      "selected_rate": {
        "carrier": "ups",
        "service": "ups_ground",
        "cost": 8.50
      }
    },
    {
      "product_id": 456,
      "ship_method": "free",
      "cost": 0
    }
  ],
  "total_shipping": 8.50
}
```

#### Get Product Shipping Services
`GET /api/shipping/services/{product_id}`

Get available shipping services for a product.

**Response (200 OK):**
```json
{
  "success": true,
  "product_id": 123,
  "ship_method": "calculated",
  "services": [
    {
      "name": "Calculated Shipping",
      "cost": "Varies by destination",
      "estimated_delivery": "Varies by service"
    }
  ],
  "shipping_services_text": "UPS Ground, FedEx Ground"
}
```

### Label Management

#### Get Live Label Rates
`POST /api/shipping/get-label-rates`

Get live shipping rates for label generation.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "item_id": 789,
  "packages": [
    {
      "length": 12,
      "width": 8,
      "height": 4,
      "weight": 2,
      "dimUnit": "in",
      "weightUnit": "lbs"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "rates": [
    {
      "carrier": "ups",
      "service": "ups_ground",
      "service_name": "UPS Ground",
      "cost": 8.50,
      "estimated_delivery": "3-5 business days"
    },
    {
      "carrier": "usps",
      "service": "usps_ground_advantage",
      "service_name": "USPS Ground Advantage",
      "cost": 6.75,
      "estimated_delivery": "2-5 business days"
    }
  ]
}
```

#### Process Batch Operations
`POST /api/shipping/process-batch`

Process batch operations for shipping (tracking updates and label creation).

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "batch": [
    {
      "id": 1,
      "isGroup": false,
      "type": "tracking",
      "data": {
        "carrier": "ups",
        "trackingNumber": "1Z123456789"
      }
    },
    {
      "id": 2,
      "isGroup": false,
      "type": "label",
      "data": {
        "selected_rate": {
          "carrier": "ups",
          "service": "ups_ground",
          "cost": 8.50
        },
        "packages": [
          {
            "length": 12,
            "width": 8,
            "height": 4,
            "weight": 2
          }
        ],
        "force_card_payment": false
      }
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "results": [
    {
      "id": 1,
      "status": "success",
      "tracking": "1Z123456789"
    },
    {
      "id": 2,
      "status": "success",
      "tracking": "1Z987654321",
      "labelUrl": "/static_media/labels/label_123.pdf",
      "payment_method": "card",
      "amount": 8.50
    }
  ]
}
```

#### Cancel Shipping Label
`POST /api/shipping/cancel-label`

Cancel a shipping label and process refund.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- Requires vendor permissions

**Request Body:**
```json
{
  "trackingNumber": "1Z123456789",
  "carrier": "ups",
  "labelId": 123
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Label cancelled successfully and order reset for reshipping",
  "trackingNumber": "1Z123456789",
  "carrier": "ups",
  "result": {
    "refund_amount": 8.50,
    "refund_status": "processed"
  }
}
```

### Label Library

#### Get My Labels
`GET /api/shipping/my-labels`

Get vendor's shipping label library.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- Requires vendor permissions

**Response (200 OK):**
```json
{
  "success": true,
  "labels": [
    {
      "id": 123,
      "order_id": 456,
      "order_item_id": 789,
      "tracking_number": "1Z123456789",
      "label_file_path": "/static_media/labels/label_123.pdf",
      "service_name": "UPS Ground",
      "cost": 8.50,
      "status": "purchased",
      "created_at": "2025-09-17T19:30:00Z",
      "customer_name": "John Doe",
      "product_name": "Handmade Vase",
      "quantity": 1
    }
  ]
}
```

#### Download Label PDF
`GET /api/shipping/labels/{filename}`

Download individual shipping label PDF file.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
- Content-Type: `application/pdf`
- Content-Disposition: `inline; filename="{filename}"`
- Binary PDF data

#### Batch Labels
`POST /api/shipping/batch-labels`

Batch merge selected labels for printing.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- Requires vendor permissions

**Request Body:**
```json
{
  "labelIds": [123, 456, 789]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Selected 3 labels",
  "downloadUrl": "/api/shipping/labels/batch_labels_123.pdf",
  "note": "PDF merging coming soon - showing first label for now"
}
```

## Shipping Methods

### Free Shipping
- **ship_method:** `free`
- **Cost:** $0.00
- **Use Case:** Promotional offers or vendor-absorbed shipping

### Flat Rate Shipping
- **ship_method:** `flat_rate`
- **Cost:** Fixed amount per item
- **Use Case:** Predictable shipping costs

### Calculated Shipping
- **ship_method:** `calculated`
- **Cost:** Real-time rates from carriers
- **Use Case:** Accurate pricing based on weight, dimensions, and distance

## Supported Carriers

- **UPS:** Ground, Air, International services
- **FedEx:** Ground, Express, International services
- **USPS:** Ground Advantage, Priority, Express services

## Error Responses

- `400 Bad Request`: Invalid input data or missing required fields
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: Access denied or insufficient permissions
- `404 Not Found`: Product, order, or label not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limits
- 50 requests per minute per API key for rate calculations
- 20 requests per minute per API key for label operations
- 10 requests per minute per API key for batch operations

## Example Usage

### Calculate Product Shipping Rates
```bash
curl -X POST https://api.beemeeart.com/api/shipping/calculate-rates \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 123,
    "recipient_address": {
      "name": "John Doe",
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001"
    }
  }'
```

### Calculate Cart Shipping
```bash
curl -X POST https://api.beemeeart.com/api/shipping/calculate-cart-shipping \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "cart_items": [
      {"product_id": 123, "quantity": 2}
    ],
    "recipient_address": {
      "name": "John Doe",
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001"
    }
  }'
```

### Get Live Label Rates
```bash
curl -X POST https://api.beemeeart.com/api/shipping/get-label-rates \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "item_id": 789,
    "packages": [
      {
        "length": 12,
        "width": 8,
        "height": 4,
        "weight": 2
      }
    ]
  }'
```

### Cancel Shipping Label
```bash
curl -X POST https://api.beemeeart.com/api/shipping/cancel-label \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "trackingNumber": "1Z123456789",
    "carrier": "ups"
  }'
```

### Download Label PDF
```bash
curl -X GET https://api.beemeeart.com/api/shipping/labels/label_123.pdf \
  -H "Authorization: Bearer your_api_key" \
  --output shipping-label.pdf
```
