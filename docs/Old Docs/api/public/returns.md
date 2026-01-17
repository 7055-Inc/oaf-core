# Returns API

## Authentication
All return endpoints require API key authentication.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- `Content-Type: application/json`

## Endpoints

### Customer Return Management

#### Create Return Request
`POST /api/returns/create`

Create a new return request with flow-specific processing.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "order_id": 123,
  "order_item_id": 456,
  "product_id": 789,
  "vendor_id": 101,
  "return_reason": "defective",
  "return_message": "Item arrived damaged",
  "package_dimensions": {
    "length": 12,
    "width": 8,
    "height": 4,
    "weight": 2,
    "dimension_unit": "in",
    "weight_unit": "lbs"
  },
  "customer_address": {
    "name": "John Doe",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zip": "10001",
    "country": "US",
    "phone": "555-123-4567"
  },
  "flow_type": "A",
  "label_preference": "purchase_label"
}
```

**Flow Types:**
- `A`: Auto prepaid label - System generates label automatically
- `B`: Customer choice - Customer chooses label option
- `C`: Admin/vendor case - Requires manual review

**Response (200 OK):**
```json
{
  "success": true,
  "return_id": 789,
  "status": "label_created",
  "message": "Return request created and prepaid label generated successfully.",
  "label_url": "/static_media/labels/returns/return_789_1234567890_abc123.pdf",
  "next_step": "label_ready"
}
```

#### Get My Returns
`GET /api/returns/my`

Retrieve user's return requests with optional status filtering.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Query Parameters:**
- `status` (string): Filter by return status (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "returns": [
    {
      "id": 789,
      "order_id": 123,
      "order_item_id": 456,
      "return_reason": "defective",
      "return_message": "Item arrived damaged",
      "return_status": "pending",
      "created_at": "2025-09-17T19:30:00Z",
      "order_total": 59.99,
      "product_id": 789,
      "product_name": "Handmade Vase",
      "quantity": 1,
      "item_price": 29.99,
      "vendor_name": "artist123"
    }
  ]
}
```

#### Add Message to Return Case
`POST /api/returns/{id}/message`

Add message to return case for Flow C communication.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "message": "I would like to exchange this for a different color instead of a refund."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Message added successfully",
  "new_status": "assistance"
}
```

#### Download Return Label
`GET /api/returns/{id}/label`

Download return shipping label PDF.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
- Content-Type: `application/pdf`
- Content-Disposition: `inline; filename="return-label-{id}.pdf"`
- Binary PDF data

### Vendor Return Management

#### Get Vendor Returns
`GET /api/returns/vendor/my`

Get vendor's return requests with optional status filtering.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Query Parameters:**
- `status` (string): Filter by return status (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "returns": [
    {
      "id": 789,
      "order_id": 123,
      "return_reason": "defective",
      "return_status": "pending",
      "created_at": "2025-09-17T19:30:00Z",
      "order_number": "ORD-2025-001",
      "product_name": "Handmade Vase",
      "item_price": 29.99,
      "customer_username": "customer123",
      "tracking_number": "1Z123456789",
      "label_file_path": "/static_media/labels/returns/return_789.pdf"
    }
  ]
}
```

#### Add Vendor Message
`POST /api/returns/{id}/vendor-message`

Vendor adds message to return case.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "message": "We can offer an exchange or store credit instead of a full refund."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Message added successfully"
}
```

#### Mark Return as Received
`POST /api/returns/{id}/mark-received`

Vendor confirms return receipt and triggers refund processing.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Return marked as received. Refund processing will begin shortly."
}
```

### Administrative Management

#### Get All Returns (Admin)
`GET /api/returns/admin/all`

Get all returns with search and filter capabilities.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- Requires admin permissions

**Query Parameters:**
- `search` (string): Search by return ID, order number, or username
- `vendor` (string): Filter by vendor username

**Response (200 OK):**
```json
{
  "success": true,
  "returns": [
    {
      "id": 789,
      "order_id": 123,
      "return_reason": "defective",
      "return_status": "pending",
      "created_at": "2025-09-17T19:30:00Z",
      "order_number": "ORD-2025-001",
      "product_name": "Handmade Vase",
      "item_price": 29.99,
      "customer_username": "customer123",
      "vendor_username": "artist123",
      "tracking_number": "1Z123456789"
    }
  ]
}
```

#### Get Returns by Status (Admin)
`GET /api/returns/admin/by-status/{status}`

Get returns filtered by specific status.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- Requires admin permissions

**Response (200 OK):**
```json
{
  "success": true,
  "returns": [
    {
      "id": 789,
      "return_status": "assistance",
      "created_at": "2025-09-17T19:30:00Z",
      "customer_username": "customer123",
      "vendor_username": "artist123",
      "product_name": "Handmade Vase"
    }
  ]
}
```

#### Add Admin Message
`POST /api/returns/{id}/admin-message`

Admin adds message to return case.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- Requires admin permissions

**Request Body:**
```json
{
  "message": "We are reviewing this case and will provide a resolution within 24 hours."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Message added successfully"
}
```

## Return Status Values

- `pending` - Return request created, awaiting processing
- `label_created` - Return label generated and ready
- `shipped` - Customer has shipped return package
- `received` - Vendor confirms receipt of return
- `processed` - Return processed, refund initiated
- `refunded` - Refund completed
- `denied` - Return request denied
- `assistance` - Requires customer service intervention
- `assistance_vendor` - Vendor response needed

## Return Reasons

Common return reason values:
- `defective` - Item is defective or damaged
- `wrong_item` - Wrong item received
- `not_as_described` - Item doesn't match description
- `changed_mind` - Customer changed mind
- `size_issue` - Size or fit problems
- `quality_issue` - Quality concerns
- `other` - Other reason (requires message)

## Error Responses

- `400 Bad Request`: Invalid input data or missing required fields
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: Access denied or insufficient permissions
- `404 Not Found`: Return, order, or resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limits
- 30 requests per minute per API key for return operations
- 10 requests per minute per API key for label downloads

## Example Usage

### Create Return Request (Flow A - Auto Label)
```bash
curl -X POST https://api.beemeeart.com/api/returns/create \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": 123,
    "order_item_id": 456,
    "product_id": 789,
    "vendor_id": 101,
    "return_reason": "defective",
    "return_message": "Item arrived damaged",
    "package_dimensions": {
      "length": 12,
      "width": 8,
      "height": 4,
      "weight": 2
    },
    "customer_address": {
      "name": "John Doe",
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001"
    },
    "flow_type": "A"
  }'
```

### Get My Returns
```bash
curl -X GET "https://api.beemeeart.com/api/returns/my?status=pending" \
  -H "Authorization: Bearer your_api_key"
```

### Download Return Label
```bash
curl -X GET https://api.beemeeart.com/api/returns/789/label \
  -H "Authorization: Bearer your_api_key" \
  --output return-label.pdf
```

### Vendor Mark as Received
```bash
curl -X POST https://api.beemeeart.com/api/returns/789/mark-received \
  -H "Authorization: Bearer your_api_key"
```

### Add Message to Return Case
```bash
curl -X POST https://api.beemeeart.com/api/returns/789/message \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I would prefer an exchange instead of a refund."
  }'
```
