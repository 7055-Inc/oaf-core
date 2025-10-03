# Inventory API

## Authentication
All inventory endpoints require API key authentication.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- `Content-Type: application/json`

## Endpoints

### Get Product Inventory
`GET /api/inventory/{product_id}`

Get comprehensive inventory details for a specific product including quantities, allocations, and change history.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Parameters:**
- `product_id` (path, integer): Product ID to get inventory for

**Response (200 OK):**
```json
{
  "success": true,
  "inventory": {
    "product_id": 123,
    "qty_on_hand": 50,
    "qty_on_order": 10,
    "qty_available": 45,
    "qty_truly_available": 40,
    "total_allocated": 5,
    "tiktok_allocated": 2,
    "reorder_qty": 20,
    "updated_at": "2025-09-17T19:30:00Z",
    "updated_by": 456
  },
  "history": [
    {
      "id": 789,
      "product_id": 123,
      "change_type": "restock",
      "previous_qty": 30,
      "new_qty": 50,
      "quantity_change": 20,
      "quantity_after": 50,
      "reason": "Weekly inventory replenishment",
      "created_at": "2025-09-17T19:30:00Z",
      "created_by": 456,
      "first_name": "John",
      "last_name": "Doe"
    }
  ]
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Product not found"
}
```

### Update Product Inventory
`PUT /api/inventory/{product_id}`

Update inventory quantities for a specific product with full audit trail.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Parameters:**
- `product_id` (path, integer): Product ID to update inventory for

**Request Body:**
```json
{
  "qty_on_hand": 75,
  "change_type": "restock",
  "reason": "Received new shipment from supplier"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Inventory updated successfully",
  "inventory": {
    "qty_on_hand": 75,
    "qty_on_order": 10,
    "qty_available": 70,
    "qty_truly_available": 65,
    "total_allocated": 5,
    "tiktok_allocated": 2
  }
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "qty_on_hand and change_type are required"
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Inventory record not found"
}
```

### Sync All Products (Admin Only)
`POST /api/inventory/sync`

Synchronize all products to the inventory system by creating inventory records for products that don't have them.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- Requires admin permissions

**Request Body:** None

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully synced 25 products to inventory system",
  "synced": 25
}
```

**Response (200 OK - No Sync Needed):**
```json
{
  "success": true,
  "message": "All products already have inventory records",
  "synced": 0
}
```

**Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "Admin access required"
}
```

## Inventory Fields

### Core Quantities
- **qty_on_hand**: Physical inventory count
- **qty_on_order**: Items ordered but not yet received
- **qty_available**: On hand minus all allocations
- **qty_truly_available**: Available minus pending orders
- **reorder_qty**: Minimum quantity before reordering

### Allocation Details
- **total_allocated**: Sum of all allocation types
- **tiktok_allocated**: Items reserved for TikTok Shop integration

### Audit Information
- **updated_at**: Last modification timestamp
- **updated_by**: User ID who made the last change
- **created_at**: Record creation timestamp
- **created_by**: User ID who created the record

## Change Types

### Standard Change Types
- **initial_stock**: First-time inventory setup
- **sync_setup**: Bulk synchronization operation
- **adjustment**: Manual quantity corrections
- **restock**: Inventory replenishment
- **sale**: Inventory reduction from sales
- **damage**: Inventory loss due to damage
- **return**: Inventory increase from returns
- **allocation**: Quantity reserved for specific purpose
- **release**: Allocation removed, quantity returned

### Custom Change Types
You can use custom change types for specific business needs. All change types are tracked in the audit history.

## Inventory History

Each inventory change creates a history record with:
- **Change details**: Previous quantity, new quantity, change amount
- **User attribution**: Who made the change
- **Timestamp**: Exact time of change
- **Reason**: Required explanation for the change
- **Change type**: Category of inventory change

History is limited to the 50 most recent changes per product for performance.

## Automatic Features

### Auto-Creation
If you request inventory for a product that doesn't have an inventory record, the system will:
1. Check if the product exists
2. Create an inventory record using the product's current available_qty
3. Add an initial history record
4. Return the new inventory details

### Synchronization
Inventory updates automatically synchronize with the products table:
- Updates product.available_qty to match calculated qty_available
- Ensures consistency between inventory and product systems
- Uses database transactions for data integrity

### Allocation Integration
The system integrates with various allocation systems:
- **Order allocations**: Items reserved for pending orders
- **TikTok allocations**: Items reserved for TikTok Shop
- **Custom allocations**: Flexible allocation system for special needs

## Error Responses

- `400 Bad Request`: Invalid input data or missing required fields
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: Insufficient permissions (admin endpoints)
- `404 Not Found`: Product or inventory record not found
- `500 Internal Server Error`: Server error

## Rate Limits
- 100 requests per minute per API key for inventory retrieval
- 50 requests per minute per API key for inventory updates
- 10 requests per minute per API key for admin operations

## Example Usage

### Get Product Inventory
```bash
curl -X GET https://api.beemeeart.com/api/inventory/123 \
  -H "Authorization: Bearer your_api_key"
```

### Update Product Inventory
```bash
curl -X PUT https://api.beemeeart.com/api/inventory/123 \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "qty_on_hand": 75,
    "change_type": "restock",
    "reason": "Received new shipment from supplier"
  }'
```

### Sync All Products (Admin)
```bash
curl -X POST https://api.beemeeart.com/api/inventory/sync \
  -H "Authorization: Bearer your_admin_api_key"
```

## Best Practices

### Inventory Updates
- Always provide a clear, descriptive reason for changes
- Use appropriate change types for better categorization
- Update inventory immediately after physical changes
- Verify quantities before making large adjustments

### Change Types
- Use consistent change type naming across your organization
- Create custom change types for specific business processes
- Document your change type conventions for team consistency

### Audit Trail
- Review inventory history regularly for accuracy
- Use history data for trend analysis and forecasting
- Maintain detailed reasons for compliance and debugging

### Performance
- Batch multiple inventory operations when possible
- Use the sync endpoint for bulk operations rather than individual updates
- Monitor allocation usage to optimize inventory planning

## Integration Examples

### Order Processing
```javascript
// Check inventory before processing order
const inventory = await fetch('/api/inventory/123');
if (inventory.qty_available >= orderQuantity) {
  // Process order and update inventory
  await fetch('/api/inventory/123', {
    method: 'PUT',
    body: JSON.stringify({
      qty_on_hand: inventory.qty_on_hand - orderQuantity,
      change_type: 'sale',
      reason: `Order #${orderId} - ${orderQuantity} units sold`
    })
  });
}
```

### Restocking Workflow
```javascript
// Update inventory after receiving shipment
await fetch('/api/inventory/123', {
  method: 'PUT',
  body: JSON.stringify({
    qty_on_hand: currentQuantity + receivedQuantity,
    change_type: 'restock',
    reason: `Shipment received - PO #${purchaseOrderId}`
  })
});
```

### Damage/Loss Reporting
```javascript
// Report damaged inventory
await fetch('/api/inventory/123', {
  method: 'PUT',
  body: JSON.stringify({
    qty_on_hand: currentQuantity - damagedQuantity,
    change_type: 'damage',
    reason: `Damaged during shipping - ${damagedQuantity} units`
  })
});
```
