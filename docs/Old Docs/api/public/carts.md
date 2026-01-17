# Shopping Cart API

## Authentication
Most cart endpoints require API key authentication. Guest cart operations support both authenticated and unauthenticated access.

**Headers:**
- `Authorization: Bearer {api_key}` (required for user-specific operations)
- `Content-Type: application/json`

## Endpoints

### Cart Collections

#### Get Cart Collections
`GET /api/carts/collections`

Retrieve all cart collections for the authenticated user.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "user_id": 123,
    "name": "Holiday Shopping",
    "description": "Items for holiday gifts",
    "is_public": false,
    "created_at": "2025-09-17T19:30:00Z"
  }
]
```

#### Create Cart Collection
`POST /api/carts/collections`

Create a new cart collection for organizing carts.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "name": "Work Supplies",
  "description": "Office and work-related items",
  "is_public": false
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

#### Update Cart Collection
`PUT /api/carts/collections/{id}`

Update an existing cart collection.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "name": "Updated Collection Name",
  "description": "Updated description",
  "is_public": true
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

#### Delete Cart Collection
`DELETE /api/carts/collections/{id}`

Delete a cart collection.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
{
  "success": true
}
```

### Core Cart Management

#### Get User Carts
`GET /api/carts`

Retrieve all carts for the authenticated user.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "user_id": 123,
    "guest_token": null,
    "source_site_api_key": "site_123",
    "source_site_name": "Artist Store",
    "status": "draft",
    "created_at": "2025-09-17T19:30:00Z"
  }
]
```

#### Get Unified Cart View
`GET /api/carts/unified`

Get comprehensive view of all user carts with items, totals, and site grouping.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
{
  "user_id": 123,
  "total_carts": 2,
  "total_items": 5,
  "total_value": 149.99,
  "grouped_by_source": {
    "Artist Store": {
      "source_name": "Artist Store",
      "source_api_key": "site_123",
      "carts": [
        {
          "id": 1,
          "items": [
            {
              "id": 1,
              "product_id": 456,
              "product_name": "Handmade Vase",
              "quantity": 1,
              "price": "49.99",
              "vendor_name": "artist123",
              "vendor_display_name": "Jane Artist"
            }
          ],
          "item_count": 1,
          "total_value": 49.99
        }
      ],
      "total_items": 1,
      "total_value": 49.99
    }
  },
  "all_carts": []
}
```

#### Create Cart
`POST /api/carts`

Create a new cart. Supports both authenticated and guest users.

**Request Body:**
```json
{
  "guest_token": "guest_abc123",
  "status": "draft",
  "source_site_api_key": "site_123",
  "source_site_name": "Artist Store"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "cart": {
    "id": 1,
    "user_id": null,
    "guest_token": "guest_abc123",
    "source_site_api_key": "site_123",
    "source_site_name": "Artist Store",
    "status": "draft",
    "created_at": "2025-09-17T19:30:00Z"
  }
}
```

#### Update Cart Status
`PUT /api/carts/{id}`

Update cart status (draft, active, completed, etc.).

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "status": "active"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

#### Delete Cart
`DELETE /api/carts/{id}`

Delete a cart entirely.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
{
  "success": true
}
```

### Cart Items Management

#### Get Cart Items
`GET /api/carts/{cartId}/items`

Retrieve all items in a specific cart.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "cart_id": 1,
    "product_id": 456,
    "vendor_id": 789,
    "quantity": 2,
    "price": "29.99",
    "created_at": "2025-09-17T19:30:00Z"
  }
]
```

#### Add Item to Cart
`POST /api/carts/{cartId}/items`

Add an item to a specific cart.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "product_id": 456,
  "vendor_id": 789,
  "quantity": 1,
  "price": 29.99
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

#### Update Cart Item
`PUT /api/carts/{cartId}/items/{itemId}`

Update cart item quantity and price.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "quantity": 3,
  "price": 27.99
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

#### Remove Cart Item
`DELETE /api/carts/{cartId}/items/{itemId}`

Remove an item from the cart.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
{
  "success": true
}
```

### Saved Items (Wishlist)

#### Get Saved Items
`GET /api/carts/saved`

Retrieve user's saved items (wishlist).

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "user_id": 123,
    "product_id": 456,
    "quantity": 1,
    "notes": "Consider for birthday gift",
    "collection_name": "Gift Ideas",
    "created_at": "2025-09-17T19:30:00Z"
  }
]
```

#### Save Item for Later
`POST /api/carts/saved`

Save an item to wishlist for later purchase.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "product_id": 456,
  "quantity": 1,
  "notes": "Wait for sale",
  "collection_name": "Wishlist"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

#### Update Saved Item
`PUT /api/carts/saved/{id}`

Update saved item details.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "quantity": 2,
  "notes": "Updated notes",
  "collection_name": "Updated Collection"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

#### Remove Saved Item
`DELETE /api/carts/saved/{id}`

Remove item from saved items.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
{
  "success": true
}
```

### Enhanced Cart Operations

#### Smart Add to Cart
`POST /api/carts/add`

Intelligent add-to-cart with multi-site support. Automatically finds or creates appropriate cart.

**Request Body:**
```json
{
  "product_id": 456,
  "vendor_id": 789,
  "quantity": 1,
  "price": 29.99,
  "guest_token": "guest_abc123",
  "source_site_api_key": "site_123",
  "source_site_name": "Artist Store"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Item added to cart successfully",
  "cart": {
    "id": 1,
    "item_count": 3,
    "total_value": 89.97
  },
  "added_item": {
    "product_id": 456,
    "vendor_id": 789,
    "quantity": 1,
    "price": 29.99
  }
}
```

## Error Responses

- `400 Bad Request`: Invalid input data or missing required fields
- `401 Unauthorized`: Invalid or missing API key
- `404 Not Found`: Cart, item, or collection not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

## Rate Limits
- 100 requests per minute per API key for cart operations
- 200 requests per minute per API key for cart item operations

## Example Usage

### Adding Item to Cart (Authenticated User)
```bash
curl -X POST https://api.beemeeart.com/api/carts/add \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 456,
    "vendor_id": 789,
    "quantity": 1,
    "price": 29.99,
    "source_site_api_key": "site_123",
    "source_site_name": "Artist Store"
  }'
```

### Adding Item to Cart (Guest User)
```bash
curl -X POST https://api.beemeeart.com/api/carts/add \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": 456,
    "vendor_id": 789,
    "quantity": 1,
    "price": 29.99,
    "guest_token": "guest_abc123",
    "source_site_api_key": "site_123",
    "source_site_name": "Artist Store"
  }'
```

### Getting Unified Cart View
```bash
curl -X GET https://api.beemeeart.com/api/carts/unified \
  -H "Authorization: Bearer your_api_key"
```
