# Curated Content API

## Authentication
All curated content endpoints are public and do not require authentication.

## Art Marketplace Endpoints

### Get All Art Products
`GET /api/curated/art/products/all`

Get all active art marketplace products with optional data enrichment.

**Query Parameters:**
- `include`: Comma-separated list of additional data to include (optional)
  - `inventory`: Include inventory information
  - `images`: Include product images
  - `vendor`: Include vendor information
- `vendor_id`: Filter products by specific vendor ID (optional)
- `category_id`: Filter products by specific category ID (optional)

**Response (200 OK):**
```json
{
  "products": [
    {
      "id": 123,
      "name": "Abstract Painting",
      "description": "Beautiful abstract artwork",
      "price": 299.99,
      "status": "active",
      "marketplace_enabled": true,
      "marketplace_category": "art",
      "product_type": "simple",
      "parent_id": null,
      "vendor_id": 456,
      "category_id": 1,
      "created_at": "2025-09-15T10:00:00Z",
      "updated_at": "2025-09-16T14:30:00Z",
      "children": [],
      "parent": null,
      "inventory": {
        "qty_on_hand": 1,
        "qty_on_order": 0,
        "qty_available": 1,
        "reorder_qty": 0
      },
      "images": [
        "https://api.beemeeart.com/api/images/product-123-main.jpg",
        "https://api.beemeeart.com/api/images/product-123-detail.jpg"
      ],
      "vendor": {
        "id": 456,
        "username": "artist@example.com",
        "first_name": "Jane",
        "last_name": "Artist",
        "display_name": "Jane Artist",
        "business_name": "Jane's Art Studio",
        "business_website": "https://janesart.com"
      }
    }
  ]
}
```

### Get Single Art Product
`GET /api/curated/art/products/:id`

Get detailed information for a specific art marketplace product including family structure.

**Parameters:**
- `id`: Product ID (path parameter)

**Query Parameters:**
- `include`: Comma-separated list of additional data to include (optional)
  - `inventory`: Include inventory information (included by default)
  - `images`: Include product images (included by default)
  - `shipping`: Include shipping information
  - `categories`: Include category information
  - `vendor`: Include vendor information

**Response (200 OK):**
```json
{
  "id": 123,
  "name": "Abstract Painting Collection",
  "description": "Beautiful abstract artwork collection with multiple variations",
  "price": 299.99,
  "status": "active",
  "marketplace_enabled": true,
  "marketplace_category": "art",
  "product_type": "variable",
  "parent_id": null,
  "vendor_id": 456,
  "category_id": 1,
  "created_at": "2025-09-15T10:00:00Z",
  "updated_at": "2025-09-16T14:30:00Z",
  "children": [
    {
      "id": 124,
      "name": "Abstract Painting - Small",
      "description": "Small version of abstract painting",
      "price": 199.99,
      "status": "active",
      "marketplace_enabled": true,
      "marketplace_category": "art",
      "product_type": "variant",
      "parent_id": 123,
      "vendor_id": 456,
      "category_id": 1,
      "inventory": {
        "qty_on_hand": 2,
        "qty_on_order": 0,
        "qty_available": 2,
        "reorder_qty": 1
      },
      "images": [
        "https://api.beemeeart.com/api/images/product-124-main.jpg"
      ],
      "shipping": {
        "weight": 2.5,
        "free_shipping": false
      }
    },
    {
      "id": 125,
      "name": "Abstract Painting - Large",
      "description": "Large version of abstract painting",
      "price": 399.99,
      "status": "active",
      "marketplace_enabled": true,
      "marketplace_category": "art",
      "product_type": "variant",
      "parent_id": 123,
      "vendor_id": 456,
      "category_id": 1,
      "inventory": {
        "qty_on_hand": 1,
        "qty_on_order": 0,
        "qty_available": 1,
        "reorder_qty": 0
      },
      "images": [
        "https://api.beemeeart.com/api/images/product-125-main.jpg"
      ],
      "shipping": {
        "weight": 5.0,
        "free_shipping": true
      }
    }
  ],
  "inventory": {
    "qty_on_hand": 3,
    "qty_on_order": 0,
    "qty_available": 3,
    "reorder_qty": 1
  },
  "images": [
    "https://api.beemeeart.com/api/images/product-123-main.jpg",
    "https://api.beemeeart.com/api/images/product-123-gallery.jpg"
  ],
  "shipping": {
    "weight": 3.0,
    "free_shipping": false
  },
  "categories": [
    {
      "id": 1,
      "name": "Paintings",
      "description": "Original paintings and prints"
    },
    {
      "id": 5,
      "name": "Abstract Art",
      "description": "Abstract artistic expressions"
    }
  ],
  "vendor": {
    "id": 456,
    "username": "artist@example.com",
    "first_name": "Jane",
    "last_name": "Artist",
    "display_name": "Jane Artist",
    "business_name": "Jane's Art Studio",
    "business_website": "https://janesart.com"
  },
  "family_size": 2,
  "requested_product_id": 123,
  "is_requested_product_parent": true
}
```

## Crafts Marketplace Endpoints

### Get All Crafts Products
`GET /api/curated/crafts/products/all`

Get all active crafts marketplace products with optional data enrichment.

**Query Parameters:**
- `include`: Comma-separated list of additional data to include (optional)
  - `inventory`: Include inventory information
  - `images`: Include product images
  - `vendor`: Include vendor information
- `vendor_id`: Filter products by specific vendor ID (optional)
- `category_id`: Filter products by specific category ID (optional)

**Response (200 OK):**
```json
{
  "products": [
    {
      "id": 789,
      "name": "Handmade Pottery Bowl",
      "description": "Beautiful handcrafted ceramic bowl",
      "price": 45.99,
      "status": "active",
      "marketplace_enabled": true,
      "marketplace_category": "crafts",
      "product_type": "simple",
      "parent_id": null,
      "vendor_id": 321,
      "category_id": 10,
      "created_at": "2025-09-14T15:30:00Z",
      "updated_at": "2025-09-15T09:15:00Z",
      "children": [],
      "parent": null,
      "inventory": {
        "qty_on_hand": 5,
        "qty_on_order": 2,
        "qty_available": 5,
        "reorder_qty": 2
      },
      "images": [
        "https://api.beemeeart.com/api/images/product-789-main.jpg",
        "https://api.beemeeart.com/api/images/product-789-detail.jpg"
      ],
      "vendor": {
        "id": 321,
        "username": "crafter@example.com",
        "first_name": "John",
        "last_name": "Crafter",
        "display_name": "John Crafter",
        "business_name": "John's Pottery Studio",
        "business_website": "https://johnspottery.com"
      }
    }
  ]
}
```

### Get Single Crafts Product
`GET /api/curated/crafts/products/:id`

Get detailed information for a specific crafts marketplace product including family structure.

**Parameters:**
- `id`: Product ID (path parameter)

**Query Parameters:**
- `include`: Comma-separated list of additional data to include (optional)
  - `inventory`: Include inventory information (included by default)
  - `images`: Include product images (included by default)
  - `shipping`: Include shipping information
  - `categories`: Include category information
  - `vendor`: Include vendor information

**Response (200 OK):**
```json
{
  "id": 789,
  "name": "Handmade Pottery Bowl",
  "description": "Beautiful handcrafted ceramic bowl perfect for serving",
  "price": 45.99,
  "status": "active",
  "marketplace_enabled": true,
  "marketplace_category": "crafts",
  "product_type": "simple",
  "parent_id": null,
  "vendor_id": 321,
  "category_id": 10,
  "created_at": "2025-09-14T15:30:00Z",
  "updated_at": "2025-09-15T09:15:00Z",
  "children": [],
  "inventory": {
    "qty_on_hand": 5,
    "qty_on_order": 2,
    "qty_available": 5,
    "reorder_qty": 2
  },
  "images": [
    "https://api.beemeeart.com/api/images/product-789-main.jpg",
    "https://api.beemeeart.com/api/images/product-789-detail.jpg",
    "https://api.beemeeart.com/api/images/product-789-process.jpg"
  ],
  "shipping": {
    "weight": 1.2,
    "dimensions": {
      "length": 8,
      "width": 8,
      "height": 3
    },
    "free_shipping": false,
    "shipping_class": "fragile"
  },
  "categories": [
    {
      "id": 10,
      "name": "Pottery",
      "description": "Handmade ceramic items"
    },
    {
      "id": 15,
      "name": "Kitchen Items",
      "description": "Functional kitchen crafts"
    }
  ],
  "vendor": {
    "id": 321,
    "username": "crafter@example.com",
    "first_name": "John",
    "last_name": "Crafter",
    "display_name": "John Crafter",
    "business_name": "John's Pottery Studio",
    "business_website": "https://johnspottery.com"
  },
  "family_size": 0,
  "requested_product_id": 789,
  "is_requested_product_parent": true
}
```

## Data Types

### Product Object
- `id`: Unique product identifier
- `name`: Product name
- `description`: Product description
- `price`: Product price
- `status`: Product status (always "active" for curated content)
- `marketplace_enabled`: Always true for curated content
- `marketplace_category`: Marketplace category ("art" or "crafts")
- `product_type`: Product type ("simple", "variable", or "variant")
- `parent_id`: Parent product ID (null for parent products)
- `vendor_id`: Vendor user ID
- `category_id`: Primary category ID
- `created_at`: Product creation timestamp
- `updated_at`: Last update timestamp

### Product Family Structure
- `children`: Array of child products (for variable products)
- `parent`: Parent product information (for child products)
- `family_size`: Number of child products
- `requested_product_id`: Originally requested product ID
- `is_requested_product_parent`: Whether requested product was the parent

### Inventory Object (when included)
- `qty_on_hand`: Current quantity in stock
- `qty_on_order`: Quantity on order from suppliers
- `qty_available`: Available quantity for purchase
- `reorder_qty`: Reorder threshold quantity

### Vendor Object (when included)
- `id`: Vendor user ID
- `username`: Vendor username/email
- `first_name`: Vendor first name
- `last_name`: Vendor last name
- `display_name`: Vendor display name
- `business_name`: Business name
- `business_website`: Business website URL

### Shipping Object (when included)
- `weight`: Product weight
- `dimensions`: Product dimensions object
- `free_shipping`: Free shipping flag
- `shipping_class`: Shipping class designation

### Category Object (when included)
- `id`: Category ID
- `name`: Category name
- `description`: Category description

## Filtering Options

### Vendor Filtering
Use `vendor_id` parameter to filter products by specific vendor:
```
GET /api/curated/art/products/all?vendor_id=456
```

### Category Filtering
Use `category_id` parameter to filter products by specific category:
```
GET /api/curated/crafts/products/all?category_id=10
```

### Combined Filtering
Combine multiple filters:
```
GET /api/curated/art/products/all?vendor_id=456&category_id=1&include=inventory,images,vendor
```

## Data Inclusion Options

### Performance Optimization
Use the `include` parameter to specify which additional data to include:

- `inventory`: Include inventory information
- `images`: Include product images
- `vendor`: Include vendor information
- `shipping`: Include shipping information (detail endpoints only)
- `categories`: Include category information (detail endpoints only)

### Examples
```bash
# Include only inventory data
GET /api/curated/art/products/all?include=inventory

# Include multiple data types
GET /api/curated/art/products/all?include=inventory,images,vendor

# Detail view with all available data
GET /api/curated/art/products/123?include=inventory,images,shipping,categories,vendor
```

## Product Types

### Simple Products
- Single standalone products
- No variations or children
- Direct purchase items

### Variable Products
- Parent products with multiple variations
- Children represent different options (size, color, etc.)
- Family structure with parent-child relationships

### Variant Products
- Child products of variable products
- Specific variations of the parent product
- Part of a product family

## Error Responses

- `404 Not Found`: Product not found or not available in marketplace
- `500 Internal Server Error`: Server processing error

## Rate Limits
- No rate limits for public curated content endpoints
- Designed for high-volume public access

## Example Usage

### Browse Art Marketplace
```bash
# Get all art products with basic information
curl -X GET https://api.beemeeart.com/api/curated/art/products/all

# Get art products with enriched data
curl -X GET https://api.beemeeart.com/api/curated/art/products/all?include=inventory,images,vendor
```

### Browse Crafts Marketplace
```bash
# Get all crafts products
curl -X GET https://api.beemeeart.com/api/curated/crafts/products/all

# Get crafts products from specific vendor
curl -X GET https://api.beemeeart.com/api/curated/crafts/products/all?vendor_id=321
```

### Get Product Details
```bash
# Get detailed art product information
curl -X GET https://api.beemeeart.com/api/curated/art/products/123

# Get detailed crafts product with all data
curl -X GET https://api.beemeeart.com/api/curated/crafts/products/789?include=inventory,images,shipping,categories,vendor
```

### Filter by Category
```bash
# Get art products in specific category
curl -X GET https://api.beemeeart.com/api/curated/art/products/all?category_id=1

# Get crafts products in specific category with vendor info
curl -X GET https://api.beemeeart.com/api/curated/crafts/products/all?category_id=10&include=vendor
```

## Integration Notes

### Frontend Integration
- Use list endpoints for marketplace browsing and search results
- Use detail endpoints for product detail pages
- Implement data inclusion based on page requirements for performance
- Handle product families appropriately for variable products

### Marketplace Display
- Art and crafts marketplaces are completely separate
- All products are pre-filtered for marketplace eligibility
- Product families provide complete variation information
- Vendor information enables vendor showcases and profiles

### Performance Optimization
- Use selective data inclusion to minimize response size
- Cache responses appropriately for better performance
- Implement pagination on frontend for large product sets
- Use filtering to reduce dataset size when appropriate

### Product Family Handling
- Variable products include all children in detail view
- Child products show complete family context
- Family metadata helps with navigation and display
- All family members are validated for marketplace eligibility

## Best Practices

### Data Inclusion
- Only include data that will be used on the page
- Use inventory data for stock status display
- Use images data for product galleries
- Use vendor data for vendor information display
- Use shipping data for shipping cost calculations
- Use categories data for breadcrumb navigation

### Filtering
- Combine filters to create targeted product lists
- Use vendor filtering for vendor showcase pages
- Use category filtering for category browse pages
- Consider performance impact of multiple filters

### Caching
- Cache product list responses for better performance
- Cache product detail responses with appropriate TTL
- Invalidate cache when products are updated
- Consider CDN caching for static product data

### Error Handling
- Handle 404 responses gracefully for missing products
- Provide fallback content for empty product lists
- Display appropriate messages for marketplace errors
- Implement retry logic for temporary failures

## Security Considerations
- All endpoints are public and designed for public access
- No sensitive data is exposed through these endpoints
- Product data is pre-filtered for marketplace appropriateness
- Vendor information is limited to public business information
- No authentication or authorization required

## Future Enhancements

### Advanced Features (Coming Soon)
- **Search Functionality:** Full-text search across product names and descriptions
- **Advanced Filtering:** Price ranges, ratings, availability filters
- **Sorting Options:** Multiple sorting options (price, popularity, date, ratings)
- **Pagination:** Pagination support for large product sets

### Enhanced Data (Planned)
- **Product Reviews:** Customer reviews and ratings integration
- **Related Products:** Product recommendation engine
- **Pricing History:** Historical pricing information
- **Availability Alerts:** Stock availability notifications

## API Versioning
- Current version: 1.0.0
- Breaking changes will increment major version
- New features increment minor version
- Bug fixes increment patch version
- Deprecation notices provided 90 days before removal

## Support and Documentation
- **API Documentation:** Complete OpenAPI 3.0 specification available
- **Integration Support:** Technical support for API integration
- **Best Practices:** Guidance on effective marketplace integration
- **Updates:** Regular updates on new features and capabilities
- **Community:** Developer community for tips and best practices

## Marketplace Guidelines

### Content Standards
- All products are pre-approved for marketplace display
- Products must be active and marketplace-enabled
- Vendor information is verified and appropriate for public display
- Product images and descriptions meet marketplace standards

### Data Accuracy
- Product information is maintained by vendors
- Inventory data is updated in real-time
- Pricing information is current and accurate
- Shipping information reflects actual shipping policies

### Performance Standards
- Endpoints optimized for high-volume public access
- Response times optimized for marketplace browsing
- Data inclusion options provide performance flexibility
- Caching strategies support scalable marketplace operations
