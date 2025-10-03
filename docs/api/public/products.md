# Product Management API

## Overview
The Beemeeart Product Management API provides comprehensive product catalog functionality including CRUD operations, product variations, inventory management, and image uploads. It supports simple products, variable products with variants, and complex product hierarchies for art marketplace needs.

## Authentication
Most endpoints require authentication via JWT token in the Authorization header. Public endpoints are clearly marked.

## Base URL
```
https://api.beemeeart.com/products
```

## Product Types

### Simple Products
Standalone products with no variations.

### Variable Products
Parent products that have multiple variants (e.g., different colors, sizes).

### Variant Products
Child products of variable products, representing specific combinations of variations.

## Endpoints

### Get Public Product Catalog
`GET /products`

Retrieve public product catalog with smart parent/child logic.

**Authentication:** None required (public endpoint)

**Query Parameters:**
- `vendor_id` (string, optional): Filter by vendor ID
- `category_id` (string, optional): Filter by category ID
- `variant_search` (string, optional): 'true' to show variants, 'false' for parents only

**Response (200 OK):**
```json
[
  {
    "id": 123,
    "name": "Handcrafted Ceramic Vase",
    "description": "Beautiful handmade ceramic vase with unique glazing",
    "short_description": "Handmade ceramic vase",
    "price": 45.00,
    "vendor_id": 456,
    "category_id": 789,
    "sku": "VASE-001",
    "status": "active",
    "product_type": "simple",
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

**Smart Logic:**
- Default: Shows only parent products (simple + variable parents)
- With `variant_search=true`: Shows one child per parent + standalone products
- Only active products are visible to public

### Get All Products with Related Data
`GET /products/all`

Get comprehensive product information with optional related data.

**Authentication:** None required (public endpoint)

**Query Parameters:**
- `include` (string, optional): Comma-separated list of data to include
  - `inventory` - Stock levels and availability
  - `images` - Product images
  - `vendor` - Vendor information
- `vendor_id` (string, optional): Filter by specific vendor

**Response (200 OK):**
```json
{
  "products": [
    {
      "id": 123,
      "name": "Variable T-Shirt",
      "product_type": "variable",
      "children": [
        {
          "id": 124,
          "name": "Red Small T-Shirt",
          "parent_id": 123,
          "price": 25.00
        }
      ],
      "inventory": {
        "qty_on_hand": 10,
        "qty_available": 8,
        "reorder_qty": 5
      },
      "images": [
        "https://api.beemeeart.com/images/product123_1.jpg",
        "https://api.beemeeart.com/images/product123_2.jpg"
      ],
      "vendor": {
        "id": 456,
        "business_name": "Artist Studio",
        "first_name": "Jane",
        "last_name": "Smith"
      }
    }
  ]
}
```

### Get User's Products
`GET /products/my/{ids?}`

Retrieve products belonging to the authenticated user.

**Authentication:** Required - Bearer token

**URL Patterns:**
- `/products/my/` - All user's products
- `/products/my/123` - Single product with children
- `/products/my/123,124,125` - Specific set of products

**Query Parameters:**
- `include` (string, optional): Comma-separated data to include
  - `inventory`, `images`, `shipping`, `categories`, `vendor`
- `limit` (number, optional): Limit results for all products query

**Response (200 OK):**
```json
{
  "products": [
    {
      "id": 123,
      "name": "My Product",
      "status": "active",
      "children": [],
      "images": ["url1", "url2"],
      "shipping": {
        "length": 12,
        "width": 8,
        "height": 4,
        "weight": 2.5
      }
    }
  ]
}
```

**Single Product Response:**
When requesting a single product by ID, returns the product object directly instead of an array.

### Get Product Details
`GET /products/{id}`

Retrieve detailed product information with complete family structure.

**Authentication:** None required (public endpoint)

**Parameters:**
- `id` (path): Product ID

**Query Parameters:**
- `include` (string, optional): Comma-separated data to include
  - `inventory`, `images`, `shipping`, `categories`, `vendor`

**Response (200 OK):**
```json
{
  "id": 123,
  "name": "Variable T-Shirt",
  "description": "Comfortable cotton t-shirt available in multiple colors and sizes",
  "price": 25.00,
  "product_type": "variable",
  "children": [
    {
      "id": 124,
      "name": "Red Small T-Shirt",
      "parent_id": 123,
      "price": 25.00,
      "inventory": {
        "qty_available": 5
      },
      "images": ["variant_image_url"]
    }
  ],
  "family_size": 12,
  "requested_product_id": 123,
  "is_requested_product_parent": true,
  "images": ["parent_image_url1", "parent_image_url2"],
  "vendor": {
    "id": 456,
    "business_name": "Artist Studio"
  }
}
```

**Family Logic:**
- Requesting parent: Returns parent + all active children
- Requesting child: Returns parent + all siblings
- Always returns complete product family

### Get Product Variations
`GET /products/{id}/variations`

Get organized variation structure for variable products.

**Authentication:** Optional - Enhanced access for authenticated users

**Parameters:**
- `id` (path): Parent product ID

**Access Levels:**
- Guest users: See active variations only
- Authenticated users: See active variations
- Admin/Owner: See active + draft variations

**Response (200 OK):**
```json
{
  "parent_product": {
    "id": 123,
    "name": "Variable T-Shirt",
    "description": "Cotton t-shirt with multiple options",
    "images": ["parent_url1", "parent_url2"],
    "shipping": {
      "ship_method": "calculated",
      "shipping_services": ["ups_ground", "fedex_ground"]
    }
  },
  "variation_types": [
    {
      "id": 1,
      "variation_name": "Color"
    },
    {
      "id": 2,
      "variation_name": "Size"
    }
  ],
  "variation_options": {
    "Color": [
      {"id": 1, "value_name": "Red"},
      {"id": 2, "value_name": "Blue"},
      {"id": 3, "value_name": "Green"}
    ],
    "Size": [
      {"id": 5, "value_name": "Small"},
      {"id": 6, "value_name": "Medium"},
      {"id": 7, "value_name": "Large"}
    ]
  },
  "child_products": [
    {
      "id": 124,
      "name": "Red Small T-Shirt",
      "price": 25.00,
      "status": "active",
      "images": ["red_small_url"],
      "variations": {
        "Color": [{"value_id": 1, "value_name": "Red"}],
        "Size": [{"value_id": 5, "value_name": "Small"}]
      }
    }
  ],
  "total_variations": 9
}
```

### Get Shipping Packages
`GET /products/{id}/packages`

Get shipping package configuration for a product.

**Authentication:** None required (public endpoint)

**Parameters:**
- `id` (path): Product ID

**Response (200 OK):**
```json
{
  "packages": [
    {
      "id": 1,
      "length": "12",
      "width": "8",
      "height": "4",
      "weight": "2.5",
      "dimension_unit": "in",
      "weight_unit": "lbs"
    },
    {
      "id": 2,
      "length": "6",
      "width": "6",
      "height": "6",
      "weight": "1.0",
      "dimension_unit": "in",
      "weight_unit": "lbs"
    }
  ]
}
```

## Product Management

### Create Product
`POST /products`

Create a new product with comprehensive features.

**Authentication:** Required - Bearer token with vendor permissions

**Request Body:**
```json
{
  "name": "Handcrafted Ceramic Bowl",
  "description": "Beautiful handmade ceramic bowl perfect for serving salads or decorative use",
  "short_description": "Handmade ceramic serving bowl",
  "price": 35.00,
  "category_id": 123,
  "sku": "BOWL-001",
  "status": "active",
  "product_type": "simple",
  "width": 8,
  "height": 3,
  "depth": 8,
  "weight": 1.5,
  "dimension_unit": "in",
  "weight_unit": "lbs",
  "images": [
    "/temp_images/products/bowl1.jpg",
    "/temp_images/products/bowl2.jpg"
  ],
  "packages": [
    {
      "length": 10,
      "width": 10,
      "height": 5,
      "weight": 2.0,
      "dimension_unit": "in",
      "weight_unit": "lbs"
    }
  ],
  "beginning_inventory": 5,
  "reorder_qty": 2,
  "wholesale_price": 20.00,
  "wholesale_description": "Wholesale pricing available for orders of 10+",
  "allow_returns": true
}
```

**Product Types:**
- `simple` - Standalone product
- `variable` - Parent product with variations
- `variant` - Child product (requires `parent_id`)

**Response (201 Created):**
```json
{
  "id": 456,
  "name": "Handcrafted Ceramic Bowl",
  "description": "Beautiful handmade ceramic bowl...",
  "price": 35.00,
  "vendor_id": 789,
  "status": "active",
  "product_type": "simple",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Update Product (Complete)
`PUT /products/{id}`

Update a product with complete data replacement.

**Authentication:** Required - Bearer token with vendor permissions

**Parameters:**
- `id` (path): Product ID

**Authorization:**
- Product owner can update own products
- Admins can update any product

**Request Body:** Same structure as POST /products

**Response (200 OK):**
```json
{
  "id": 123,
  "name": "Updated Product Name",
  "description": "Updated description",
  "price": 40.00,
  "images": ["new_url1", "new_url2"],
  "shipping": {
    "length": 12,
    "width": 8,
    "height": 4,
    "weight": 2.5
  },
  "updated_at": "2024-01-15T11:00:00Z"
}
```

### Update Product (Partial)
`PATCH /products/{id}`

Partial update of a product (only provided fields are updated).

**Authentication:** Required - Bearer token with vendor permissions

**Parameters:**
- `id` (path): Product ID

**Request Body (partial):**
```json
{
  "price": 30.00,
  "status": "active",
  "beginning_inventory": 15
}
```

**Inventory Updates:**
- `beginning_inventory` - Updates stock levels with history tracking
- `reorder_qty` - Updates reorder thresholds

**Response (200 OK):** Same as PUT response

### Delete Product
`DELETE /products/{id}`

Delete a product and all its children (soft delete).

**Authentication:** Required - Bearer token with vendor permissions

**Parameters:**
- `id` (path): Product ID

**Deletion Logic:**
- Simple products: Deletes single product
- Variable products: Deletes parent + all children
- Variant products: Deletes single variant

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Product deleted successfully",
  "deleted_product_ids": [123, 124, 125, 126]
}
```

### Bulk Delete Products
`POST /products/bulk-delete`

Delete multiple products efficiently.

**Authentication:** Required - Bearer token with vendor permissions

**Request Body:**
```json
{
  "product_ids": [123, 124, 125, 126, 127]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "15 products deleted successfully",
  "deleted_product_ids": [123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137]
}
```

**Note:** Count may be higher than requested due to automatic deletion of child products.

## Image Management

### Upload Product Images
`POST /products/upload`

Upload product images with automatic processing.

**Authentication:** Required - Bearer token with vendor permissions

**Query Parameters:**
- `product_id` (string): Product ID for existing products or 'new' for creation

**Request Body:** Multipart form data with 'images' field

**Response (200 OK):**
```json
{
  "urls": [
    "/temp_images/products/vendor123-product456-image1.jpg",
    "/temp_images/products/vendor123-product456-image2.jpg"
  ]
}
```

**Upload Process:**
1. Validates file types and sizes
2. Stores in temporary location
3. Records in pending images table
4. Associates with product if existing
5. Returns temporary URLs for use

## Variation Management

### Get Variation Types
`GET /products/variations/types`

Get all variation types for the authenticated user.

**Authentication:** Required - Bearer token

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "variation_name": "Color",
    "created_at": "2024-01-15T10:30:00Z",
    "usage_count": 5
  },
  {
    "id": 2,
    "variation_name": "Size",
    "created_at": "2024-01-15T11:00:00Z",
    "usage_count": 3
  }
]
```

### Create Variation Type
`POST /products/variations/types`

Create a new variation type (e.g., Color, Size, Material).

**Authentication:** Required - Bearer token with vendor permissions

**Request Body:**
```json
{
  "variation_name": "Material"
}
```

**Response (201 Created):**
```json
{
  "id": 3,
  "variation_name": "Material",
  "created_at": "2024-01-15T12:00:00Z"
}
```

### Get Variation Values
`GET /products/variations/types/{id}/values`

Get all values for a variation type.

**Authentication:** Required - Bearer token

**Parameters:**
- `id` (path): Variation type ID

**Query Parameters:**
- `product_id` (string, optional): Filter values by specific product

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "value_name": "Red",
    "product_id": 123,
    "created_at": "2024-01-15T10:30:00Z"
  },
  {
    "id": 2,
    "value_name": "Blue",
    "product_id": 123,
    "created_at": "2024-01-15T10:35:00Z"
  }
]
```

### Create Variation Value
`POST /products/variations/values`

Create a new variation value for a specific type and product.

**Authentication:** Required - Bearer token with vendor permissions

**Request Body:**
```json
{
  "variation_type_id": 1,
  "value_name": "Forest Green",
  "product_id": 123
}
```

**Response (201 Created):**
```json
{
  "id": 5,
  "variation_type_id": 1,
  "value_name": "Forest Green",
  "product_id": 123,
  "created_at": "2024-01-15T12:30:00Z"
}
```

### Create Product Variation Association
`POST /products/variations`

Associate a product with specific variation type and value.

**Authentication:** Required - Bearer token with vendor permissions

**Request Body:**
```json
{
  "product_id": 124,
  "variation_type_id": 1,
  "variation_value_id": 1
}
```

**Response (201 Created):**
```json
{
  "id": 10,
  "product_id": 124,
  "variation_type_id": 1,
  "variation_value_id": 1
}
```

### Delete Variation Type
`DELETE /products/variations/types/{id}`

Delete a variation type and all associated values.

**Authentication:** Required - Bearer token with vendor permissions

**Parameters:**
- `id` (path): Variation type ID

**Response (200 OK):**
```json
{
  "message": "Variation type deleted successfully"
}
```

### Delete Variation Value
`DELETE /products/variations/values/{id}`

Delete a specific variation value.

**Authentication:** Required - Bearer token with vendor permissions

**Parameters:**
- `id` (path): Variation value ID

**Response (200 OK):**
```json
{
  "message": "Variation value deleted successfully"
}
```

## Error Responses

### Standard Error Format
```json
{
  "error": "Error description"
}
```

### Common Error Codes
- `400` - Bad Request (validation errors, invalid data)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (product/resource not found)
- `409` - Conflict (duplicate SKU, variation name)
- `413` - Payload Too Large (file size limits)
- `415` - Unsupported Media Type (invalid file types)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error (server error)

## Rate Limits
- **Product creation:** 10 requests per minute per user
- **Image uploads:** 5 requests per minute per user
- **Bulk operations:** 2 requests per minute per user
- **General queries:** 100 requests per minute per user

## Integration Examples

### Complete Product Creation Workflow
```javascript
// 1. Upload images first
const formData = new FormData();
formData.append('images', file1);
formData.append('images', file2);

const uploadResponse = await fetch('/products/upload?product_id=new', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});

const { urls } = await uploadResponse.json();

// 2. Create product with uploaded images
const productData = {
  name: 'Handcrafted Ceramic Bowl',
  description: 'Beautiful handmade ceramic bowl...',
  price: 35.00,
  category_id: 123,
  sku: 'BOWL-001',
  images: urls,
  beginning_inventory: 5
};

const productResponse = await fetch('/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(productData)
});
```

### Variable Product with Variations
```javascript
// 1. Create variation types
const colorType = await fetch('/products/variations/types', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ variation_name: 'Color' })
});

const sizeType = await fetch('/products/variations/types', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ variation_name: 'Size' })
});

// 2. Create parent product
const parentProduct = await fetch('/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Custom T-Shirt',
    price: 25.00,
    product_type: 'variable',
    status: 'active'
  })
});

// 3. Create variation values and child products
const redValue = await fetch('/products/variations/values', {
  method: 'POST',
  body: JSON.stringify({
    variation_type_id: colorType.id,
    value_name: 'Red',
    product_id: parentProduct.id
  })
});

// 4. Create child product
const childProduct = await fetch('/products', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Red Small T-Shirt',
    price: 25.00,
    parent_id: parentProduct.id,
    product_type: 'variant'
  })
});

// 5. Associate variations
await fetch('/products/variations', {
  method: 'POST',
  body: JSON.stringify({
    product_id: childProduct.id,
    variation_type_id: colorType.id,
    variation_value_id: redValue.id
  })
});
```

### Product Catalog Display
```javascript
// Get products with all related data
const response = await fetch('/products/all?include=inventory,images,vendor');
const { products } = await response.json();

// Display products with availability
products.forEach(product => {
  console.log(`${product.name} - $${product.price}`);
  console.log(`In stock: ${product.inventory.qty_available}`);
  console.log(`Vendor: ${product.vendor.business_name}`);
  console.log(`Images: ${product.images.length} available`);
  
  if (product.children && product.children.length > 0) {
    console.log(`Variations: ${product.children.length} options`);
  }
});
```
