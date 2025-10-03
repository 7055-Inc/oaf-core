# products.js - Internal Documentation

## Overview
Comprehensive product management routes for the Beemeeart platform. Handles complete product catalog lifecycle including CRUD operations, product variations, inventory tracking, image uploads, and marketplace integration. Supports simple products, variable products with variants, and complex product hierarchies.

## Architecture
- **Type:** Route Layer (API Endpoints) - Product Catalog Management
- **Dependencies:** express, database connection, jwt middleware, multer upload, secure logger, rate limiter, permissions middleware
- **Database Tables:**
  - `products` - Core product records with details, pricing, and status
  - `product_images` - Product image URLs and ordering
  - `product_shipping` - Shipping configurations and package details
  - `product_inventory` - Inventory tracking and stock levels
  - `inventory_history` - Inventory change tracking and audit trail
  - `product_categories` - Product category associations
  - `categories` - Category definitions and hierarchy
  - `user_variation_types` - Custom variation types (Color, Size, etc.)
  - `user_variation_values` - Variation values (Red, Large, etc.)
  - `product_variations` - Product-variation associations
  - `pending_images` - Temporary image storage during upload
  - `users` - User accounts and vendor information
  - `user_profiles` - User profile information
  - `artist_profiles` - Artist-specific business information
  - `marketplace_permissions` - Marketplace access permissions
- **External Services:** File upload (Multer), image processing, marketplace integration

## Product Management Endpoints

### GET /products
**Purpose:** Get public product catalog with smart parent/child logic

**Authentication:** None required (public endpoint)

**Query Parameters:**
- `vendor_id` (optional): Filter by specific vendor
- `category_id` (optional): Filter by category
- `variant_search` (optional): 'true' shows variants, 'false' shows parents only

**Smart Logic:**
- **Default behavior:** Shows only parent products (simple + variable parents)
- **Variant search:** Shows one child per parent + standalone products
- **Status filtering:** Only active products visible to public

**Response Structure:**
```json
[
  {
    "id": 123,
    "name": "Handcrafted Ceramic Vase",
    "description": "Beautiful handmade ceramic vase...",
    "price": 45.00,
    "vendor_id": 456,
    "category_id": 789,
    "status": "active",
    "product_type": "simple"
  }
]
```

### GET /products/all
**Purpose:** Get all products system-wide with comprehensive related data

**Authentication:** None required (public endpoint)

**Query Parameters:**
- `include` (optional): Comma-separated list (inventory,images,vendor)
- `vendor_id` (optional): Filter by specific vendor

**Include Options:**
- `inventory` - Stock levels and availability
- `images` - Product images (permanent + temporary)
- `vendor` - Vendor profile information

**Response Structure:**
```json
{
  "products": [
    {
      "id": 123,
      "name": "Product Name",
      "children": [...], // For variable products
      "parent": {...}, // For child products
      "inventory": {
        "qty_on_hand": 10,
        "qty_available": 8,
        "reorder_qty": 5
      },
      "images": ["url1", "url2"],
      "vendor": {
        "id": 456,
        "business_name": "Artist Studio"
      }
    }
  ]
}
```

### GET /products/my/:ids?
**Purpose:** Unified endpoint for user's products with intelligent hierarchy

**Authentication:** Required - JWT token

**URL Patterns:**
- `/products/my/` - All user's products
- `/products/my/123` - Single product with children
- `/products/my/123,124,125` - Specific set of products

**Query Parameters:**
- `include` (optional): inventory,images,shipping,categories,vendor
- `limit` (optional): Limit results for all products query

**Access Control:**
- Users see their own products
- Admins can see deleted products
- Status filtering based on permissions

**Response Variations:**
- Single ID: Returns product object directly
- Multiple/All: Returns `{products: [...]}`

### GET /products/:id
**Purpose:** Retrieve single product with complete family structure

**Authentication:** None required (public endpoint)

**Family Logic:**
- **Parent product requested:** Returns parent + all active children
- **Child product requested:** Returns parent + all siblings
- **Always complete family:** Never partial product families

**Include Parameters:**
- `inventory` - Stock information
- `images` - Product images
- `shipping` - Shipping configuration
- `categories` - Category associations
- `vendor` - Vendor information

**Response Structure:**
```json
{
  "id": 123,
  "name": "Variable T-Shirt",
  "product_type": "variable",
  "children": [
    {
      "id": 124,
      "name": "Red Small T-Shirt",
      "parent_id": 123,
      "variations": {
        "Color": [{"value_id": 1, "value_name": "Red"}],
        "Size": [{"value_id": 5, "value_name": "Small"}]
      }
    }
  ],
  "family_size": 12,
  "requested_product_id": 123,
  "is_requested_product_parent": true
}
```

### GET /products/:id/packages
**Purpose:** Get shipping packages configuration for a product

**Authentication:** None required (public endpoint)

**Response Structure:**
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
    }
  ]
}
```

### GET /products/:id/variations
**Purpose:** Get parent product with organized child variations for customer selection

**Authentication:** Optional - Enhanced access for authenticated users

**Access Levels:**
- **Guest users:** See active variations only
- **Authenticated users:** See active variations
- **Admin/Owner:** See active + draft variations

**Response Structure:**
```json
{
  "parent_product": {
    "id": 123,
    "name": "Variable T-Shirt",
    "images": ["url1", "url2"],
    "shipping": {...}
  },
  "variation_types": [
    {"id": 1, "variation_name": "Color"},
    {"id": 2, "variation_name": "Size"}
  ],
  "variation_options": {
    "Color": [
      {"id": 1, "value_name": "Red"},
      {"id": 2, "value_name": "Blue"}
    ],
    "Size": [
      {"id": 5, "value_name": "Small"},
      {"id": 6, "value_name": "Large"}
    ]
  },
  "child_products": [
    {
      "id": 124,
      "name": "Red Small T-Shirt",
      "price": 25.00,
      "images": ["variant_url1"],
      "variations": {
        "Color": [{"value_id": 1, "value_name": "Red"}],
        "Size": [{"value_id": 5, "value_name": "Small"}]
      }
    }
  ],
  "total_variations": 4
}
```

## Product Creation & Updates

### POST /products
**Purpose:** Create new product with comprehensive features

**Authentication:** Required - JWT token + vendor permissions

**Product Types:**
- `simple` - Standalone product
- `variable` - Parent product with variations
- `variant` - Child product of variable parent

**Request Body Fields:**
```json
{
  "name": "Product Name",
  "description": "Full description",
  "short_description": "Brief description",
  "price": 29.99,
  "category_id": 123,
  "sku": "PROD-001",
  "status": "draft", // draft, active, inactive
  "product_type": "simple", // simple, variable, variant
  "parent_id": null, // For variant products
  "images": ["url1", "url2"],
  "packages": [
    {
      "length": 12,
      "width": 8,
      "height": 4,
      "weight": 2.5,
      "dimension_unit": "in",
      "weight_unit": "lbs"
    }
  ],
  "beginning_inventory": 10,
  "reorder_qty": 5,
  "wholesale_price": 15.00,
  "wholesale_description": "Wholesale pricing available",
  "allow_returns": true
}
```

**Automatic Features:**
- **Marketplace integration:** Auto-enabled for approved vendors
- **Inventory tracking:** Creates initial inventory record
- **Image processing:** Moves temp images to permanent storage
- **Shipping setup:** Supports single or multi-package shipping

**Parent/Child Validation:**
- Validates parent product exists and user has access
- Enforces ownership rules for parent-child relationships
- Prevents circular references

### PUT /products/:id
**Purpose:** Complete update of product (replaces all data)

**Authentication:** Required - JWT token + vendor permissions + ownership

**Authorization Rules:**
- Product owner can update own products
- Admins can update any product
- Admins can change vendor ownership

**Update Process:**
1. Validates ownership and permissions
2. Updates core product fields
3. Replaces images completely
4. Replaces shipping configuration
5. Returns updated product with related data

### PATCH /products/:id
**Purpose:** Partial update (only provided fields updated)

**Authentication:** Required - JWT token + vendor permissions + ownership

**Dynamic Updates:**
- Only updates fields provided in request body
- Supports inventory updates with history tracking
- Handles parent_id changes with validation
- Preserves existing data for omitted fields

**Inventory Handling:**
- Updates `product_inventory` table
- Creates `inventory_history` records
- Supports both new and existing inventory records

**Special Fields:**
- `beginning_inventory` - Updates stock levels
- `reorder_qty` - Updates reorder thresholds
- `allow_returns` - Updates return policy

## Image Management

### POST /products/upload
**Purpose:** Upload product images with automatic processing

**Authentication:** Required - JWT token + vendor permissions

**Upload Features:**
- **Multi-file support:** Upload multiple images simultaneously
- **Temporary storage:** Images stored in temp location initially
- **Ownership validation:** Verifies product ownership for existing products
- **New product support:** Supports uploads for products being created

**Query Parameters:**
- `product_id` - Existing product ID or 'new' for creation

**Response Structure:**
```json
{
  "urls": [
    "/temp_images/products/filename1.jpg",
    "/temp_images/products/filename2.jpg"
  ]
}
```

**Processing Flow:**
1. Validates file uploads and permissions
2. Stores files in temporary location
3. Records in `pending_images` table
4. Associates with product if existing
5. Returns temporary URLs for frontend use

## Variation Management

### Variation Types

#### GET /products/variations/types
**Purpose:** Get all variation types for current user with usage statistics

**Authentication:** Required - JWT token

**Response Structure:**
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

#### POST /products/variations/types
**Purpose:** Create new variation type (e.g., Color, Size, Material)

**Authentication:** Required - JWT token + vendor permissions

**Request Body:**
```json
{
  "variation_name": "Material"
}
```

**Validation:**
- Prevents duplicate variation names per user
- Trims whitespace from names
- Requires non-empty names

#### DELETE /products/variations/types/:id
**Purpose:** Delete variation type and all associated values

**Authentication:** Required - JWT token + vendor permissions + ownership

**Cascade Deletion:**
1. Deletes all variation values for the type
2. Deletes the variation type itself
3. Maintains referential integrity

### Variation Values

#### GET /products/variations/types/:id/values
**Purpose:** Get all values for a variation type

**Authentication:** Required - JWT token

**Query Parameters:**
- `product_id` (optional): Filter values by specific product

**Response Structure:**
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

#### POST /products/variations/values
**Purpose:** Create new variation value for specific type and product

**Authentication:** Required - JWT token + vendor permissions

**Request Body:**
```json
{
  "variation_type_id": 1,
  "value_name": "Forest Green",
  "product_id": 123
}
```

**Validation:**
- Verifies variation type ownership
- Verifies product ownership
- Prevents duplicate values per product/type combination

#### DELETE /products/variations/values/:id
**Purpose:** Delete specific variation value

**Authentication:** Required - JWT token + vendor permissions + ownership

**Ownership Verification:**
- Validates through variation type ownership
- Ensures user can only delete own variation values

### POST /products/variations
**Purpose:** Create product variation record (links product to variation type/value)

**Authentication:** Required - JWT token + vendor permissions

**Request Body:**
```json
{
  "product_id": 124,
  "variation_type_id": 1,
  "variation_value_id": 1
}
```

**Validation Process:**
1. Verifies product exists and user has access
2. Verifies variation type belongs to user
3. Verifies variation value belongs to type
4. Creates association record

## Product Deletion

### DELETE /products/:id
**Purpose:** Delete single product and all children (soft delete)

**Authentication:** Required - JWT token + vendor permissions + ownership

**Deletion Logic:**
- **Simple products:** Deletes single product
- **Variable products:** Deletes parent + all children
- **Variant products:** Deletes single variant

**Soft Delete Process:**
1. Sets status to 'deleted' instead of removing records
2. Maintains data integrity for orders/history
3. Cleans up unused variation associations
4. Uses database transactions for atomicity

### POST /products/bulk-delete
**Purpose:** Bulk delete multiple products efficiently

**Authentication:** Required - JWT token + vendor permissions + ownership

**Request Body:**
```json
{
  "product_ids": [123, 124, 125]
}
```

**Bulk Processing:**
- Validates all product IDs are numbers
- Verifies ownership of all products
- Includes children of variable products automatically
- Removes duplicates from final deletion list
- Uses transactions for data consistency

**Response Structure:**
```json
{
  "success": true,
  "message": "15 products deleted successfully",
  "deleted_product_ids": [123, 124, 125, 126, 127, ...]
}
```

## Helper Functions

### cleanupUserVariationsAfterProductDeletion()
**Purpose:** Clean up unused variation associations after product deletion

**Process:**
1. **Find unused variation types:** Types no longer used by any active products
2. **Disassociate types:** Set user_id to NULL for unused types
3. **Find unused variation values:** Values no longer used by any active products
4. **Disassociate values:** Set user_id to NULL for unused values
5. **Maintain integrity:** Preserves data while removing user associations

**Benefits:**
- Keeps variation data for historical records
- Removes clutter from user's variation lists
- Maintains referential integrity
- Allows future re-association if needed

### optionalAuth Middleware
**Purpose:** Allow both authenticated and guest access

**Functionality:**
- Attempts to verify JWT token if provided
- Sets user context (userId, roles, permissions) if valid
- Continues as guest if no token or invalid token
- Enables different access levels based on authentication

## Environment Variables
No environment variables are directly used in this file. All domain references are handled through other services.

## Security Considerations

### Authentication & Authorization
- **JWT Validation:** All protected endpoints require valid JWT tokens
- **Permission Levels:** Vendor permissions required for product management
- **Ownership Verification:** Users can only manage their own products
- **Admin Override:** Admins can manage any product and change ownership

### Data Validation
- **Input Sanitization:** All user inputs validated and sanitized
- **Parent/Child Validation:** Prevents invalid product hierarchies
- **Variation Validation:** Ensures variation associations are valid
- **File Upload Security:** Validates file types and sizes

### Business Logic Protection
- **Status Filtering:** Public endpoints only show active products
- **Draft Protection:** Draft products only visible to owners/admins
- **Inventory Tracking:** Maintains accurate stock levels with history
- **Soft Deletion:** Preserves data integrity for historical records

## Performance Considerations

### Database Optimization
- **Efficient Queries:** Optimized JOIN queries for related data
- **Index Usage:** Proper indexing on product_id, vendor_id, parent_id
- **Conditional Loading:** Include parameters prevent unnecessary data loading
- **Batch Processing:** Bulk operations for multiple products

### Image Handling
- **Temporary Storage:** Efficient temp image management
- **Lazy Loading:** Images loaded only when requested
- **Order Preservation:** Maintains image order for display
- **Cleanup Process:** Removes unused temporary images

### Variation Management
- **Hierarchical Queries:** Efficient parent/child relationship queries
- **Usage Tracking:** Counts variation usage for cleanup decisions
- **Batch Operations:** Efficient bulk variation processing
- **Memory Management:** Streams large result sets

## Error Handling

### Product Errors
- **Not Found:** 404 for non-existent products
- **Access Denied:** 403 for unauthorized access attempts
- **Invalid Data:** 400 for validation failures
- **Duplicate SKU:** 409 for SKU conflicts

### Variation Errors
- **Invalid Associations:** 400 for invalid variation combinations
- **Ownership Violations:** 403 for variation access violations
- **Duplicate Names:** 409 for duplicate variation names
- **Missing Dependencies:** 400 for missing required variation data

### Upload Errors
- **File Size Limits:** 413 for oversized files
- **File Type Restrictions:** 415 for unsupported file types
- **Storage Failures:** 500 for file system errors
- **Permission Errors:** 403 for upload permission violations

## Usage Examples

### Create Simple Product
```javascript
const productData = {
  name: 'Handcrafted Ceramic Bowl',
  description: 'Beautiful handmade ceramic bowl perfect for serving.',
  price: 35.00,
  category_id: 123,
  sku: 'BOWL-001',
  status: 'active',
  product_type: 'simple',
  beginning_inventory: 5,
  images: ['/temp_images/products/bowl1.jpg']
};

const response = await fetch('/products', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(productData)
});
```

### Create Variable Product with Variations
```javascript
// 1. Create parent product
const parentData = {
  name: 'Custom T-Shirt',
  price: 25.00,
  product_type: 'variable',
  status: 'active'
};

// 2. Create variation types
const colorType = await fetch('/products/variations/types', {
  method: 'POST',
  body: JSON.stringify({variation_name: 'Color'})
});

// 3. Create child products
const childData = {
  name: 'Red Small T-Shirt',
  price: 25.00,
  parent_id: parentProduct.id,
  product_type: 'variant'
};

// 4. Associate variations
await fetch('/products/variations', {
  method: 'POST',
  body: JSON.stringify({
    product_id: childProduct.id,
    variation_type_id: colorType.id,
    variation_value_id: redValue.id
  })
});
```

### Bulk Delete Products
```javascript
const deleteData = {
  product_ids: [123, 124, 125, 126]
};

const response = await fetch('/products/bulk-delete', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(deleteData)
});
```

### Upload Product Images
```javascript
const formData = new FormData();
formData.append('images', file1);
formData.append('images', file2);

const response = await fetch('/products/upload?product_id=123', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```
