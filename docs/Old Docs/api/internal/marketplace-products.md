# marketplace-products.js - Internal Documentation

## Overview
Comprehensive marketplace functionality for the Beemeeart platform. Handles public marketplace product listings, filtering, search, and featured products. Supports multi-category marketplace with art, crafts, and admin management. This system provides a complete e-commerce marketplace experience with advanced filtering, categorization, and promotional features.

## Architecture
- **Type:** Route Layer (API Endpoints) - Marketplace System
- **Dependencies:** express, database connection, secureLogger
- **Database Tables:**
  - `products` - Main product catalog with marketplace flags
  - `users` - Vendor/artist information
  - `product_images` - Product image associations
  - `categories` - Product categorization system
- **External Services:** Smart media system for image processing and delivery

## Marketplace Architecture

### Product Categories
- **Art:** Fine art, paintings, sculptures, digital art
- **Crafts:** Handmade items, crafts, artisan products
- **Unsorted:** Products awaiting categorization
- **All:** Administrative view of all categories

### Marketplace Features
- **Public Listings:** Browse marketplace-enabled products
- **Advanced Filtering:** Category, sorting, pagination
- **Featured Products:** Curated promotional displays
- **Vendor Integration:** Artist/vendor information included
- **Image Management:** Smart media URLs with fallbacks
- **Statistics:** Marketplace health and activity metrics

### Data Flow
1. **Product Creation:** Vendors create products via product management
2. **Marketplace Enable:** Products marked as marketplace-enabled
3. **Categorization:** Products assigned to art/crafts categories
4. **Public Display:** Products appear in marketplace listings
5. **Featured Selection:** Algorithm or manual curation for featured products

## Marketplace Product Listings

### GET /api/marketplace/products
**Purpose:** Get marketplace products with comprehensive filtering and pagination

**Authentication:** None required (public endpoint)

**Query Parameters:**
- `category` (string, default: 'all'): Product category filter
  - `'art'`: Fine art and artistic products
  - `'crafts'`: Handmade and craft products
  - `'unsorted'`: Products awaiting categorization
  - `'all'`: All marketplace products
- `limit` (number, default: 50): Number of products to return (max 100)
- `offset` (number, default: 0): Pagination offset
- `include` (string, optional): Comma-separated includes
  - `'images'`: Include product images with smart URLs
  - `'vendor'`: Include vendor/artist information
  - `'categories'`: Include category information
- `sort` (string, default: 'created_at'): Sort field
  - `'created_at'`: Sort by creation date
  - `'name'`: Sort alphabetically by name
  - `'price'`: Sort by product price
  - `'updated_at'`: Sort by last update
- `order` (string, default: 'DESC'): Sort order ('ASC' or 'DESC')

**Filtering Logic:**
```sql
-- Base query filters
WHERE p.marketplace_enabled = TRUE 
  AND p.status = 'active'
  AND p.marketplace_category = ? -- (if category != 'all')
```

**Dynamic Query Building:**
```javascript
// Base product fields
SELECT p.id, p.name, p.description, p.short_description, p.price, 
       p.wholesale_price, p.wholesale_description, p.sku, p.status,
       p.marketplace_enabled, p.marketplace_category, p.created_at, 
       p.updated_at, p.vendor_id

// Optional vendor information
LEFT JOIN users u ON p.vendor_id = u.id
SELECT u.business_name, u.first_name, u.last_name, u.username

// Optional category information  
LEFT JOIN categories cat ON p.category_id = cat.id
SELECT cat.name as category_name

// Optional primary image
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
SELECT pi.image_url, pi.image_path
```

**Image URL Processing:**
```javascript
// Smart media URL generation with fallback
const imageUrl = product.image_url || 
  `${process.env.SMART_MEDIA_BASE_URL || 'https://api.beemeeart.com/api/images'}/media-proxy/${product.image_path}`;

product.images = [{
  url: imageUrl,
  is_primary: true
}];
```

**Response Structure:**
```json
{
  "products": [
    {
      "id": 123,
      "name": "Abstract Painting",
      "description": "Beautiful abstract artwork...",
      "short_description": "Colorful abstract piece",
      "price": 299.99,
      "wholesale_price": 199.99,
      "wholesale_description": "Bulk pricing available",
      "sku": "ART-123",
      "status": "active",
      "marketplace_enabled": true,
      "marketplace_category": "art",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "vendor_id": 456,
      "business_name": "Smith Art Studio",
      "first_name": "Jane",
      "last_name": "Smith",
      "username": "janesmith",
      "category_name": "Paintings",
      "images": [
        {
          "url": "https://api.beemeeart.com/api/images/media-proxy/temp_images/products/456-123-image1.jpg",
          "is_primary": true
        }
      ]
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  },
  "filters": {
    "category": "art",
    "sort": "created_at",
    "order": "DESC"
  }
}
```

**Performance Optimizations:**
- **Conditional JOINs:** Only join tables when included in request
- **Indexed Queries:** Optimized on marketplace_enabled, status, category
- **Pagination:** Efficient LIMIT/OFFSET with total count
- **Image Processing:** Smart URL generation with environment variables

### Validation and Error Handling
**Parameter Validation:**
```javascript
const validCategories = ['art', 'crafts', 'unsorted', 'all'];
const validSorts = ['created_at', 'name', 'price', 'updated_at'];
const validOrders = ['ASC', 'DESC'];

// Returns 400 Bad Request for invalid parameters
```

**Error Responses:**
- **400:** Invalid category, sort, or order parameter
- **500:** Database error or system failure

## Featured Products System

### GET /api/marketplace/products/featured
**Purpose:** Get featured marketplace products for homepage and category showcases

**Authentication:** None required (public endpoint)

**Query Parameters:**
- `category` (string, default: 'art'): Product category ('art' or 'crafts')
- `limit` (number, default: 12): Number of featured products to return

**Featured Selection Algorithm:**
Currently uses most recent products as featured items. Can be enhanced with:
- Manual curation flags
- Rating-based selection
- Sales performance metrics
- Vendor promotion status

**Database Query:**
```sql
SELECT p.id, p.name, p.description, p.short_description, p.price, 
       p.wholesale_price, p.sku, p.marketplace_category, p.created_at, p.vendor_id,
       u.business_name, u.first_name, u.last_name,
       pi.image_url, pi.image_path,
       cat.name as category_name
FROM products p
LEFT JOIN users u ON p.vendor_id = u.id
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
LEFT JOIN categories cat ON p.category_id = cat.id
WHERE p.marketplace_enabled = TRUE 
  AND p.status = 'active'
  AND p.marketplace_category = ?
ORDER BY p.created_at DESC
LIMIT ?
```

**Response Structure:**
```json
{
  "products": [
    {
      "id": 123,
      "name": "Featured Abstract Painting",
      "description": "Beautiful featured artwork...",
      "price": 299.99,
      "marketplace_category": "art",
      "business_name": "Smith Art Studio",
      "category_name": "Paintings",
      "images": [
        {
          "url": "https://api.beemeeart.com/api/images/media-proxy/temp_images/products/456-123-image1.jpg",
          "is_primary": true
        }
      ]
    }
  ],
  "category": "art",
  "featured": true
}
```

**Enhancement Opportunities:**
- **Manual Curation:** Admin interface for selecting featured products
- **Rotation Logic:** Time-based rotation of featured items
- **Performance Metrics:** Feature products based on sales/views
- **Seasonal Themes:** Category-specific seasonal promotions

## Marketplace Statistics

### GET /api/marketplace/stats
**Purpose:** Get comprehensive marketplace statistics and metrics

**Authentication:** None required (public endpoint)

**Database Query:**
```sql
SELECT 
  COUNT(*) as total_products,
  COUNT(CASE WHEN marketplace_category = 'art' THEN 1 END) as art_products,
  COUNT(CASE WHEN marketplace_category = 'crafts' THEN 1 END) as crafts_products,
  COUNT(CASE WHEN marketplace_category = 'unsorted' THEN 1 END) as unsorted_products,
  COUNT(DISTINCT vendor_id) as total_vendors
FROM products 
WHERE marketplace_enabled = TRUE AND status = 'active'
```

**Response Structure:**
```json
{
  "marketplace_stats": {
    "total_products": 1250,
    "art_products": 850,
    "crafts_products": 300,
    "unsorted_products": 100,
    "total_vendors": 125
  },
  "last_updated": "2024-01-15T10:30:00.000Z"
}
```

**Use Cases:**
- **Homepage Display:** Show marketplace activity and scale
- **Category Navigation:** Display product counts per category
- **Vendor Recruitment:** Demonstrate marketplace size and activity
- **Analytics Dashboard:** Track marketplace growth over time

## Environment Variables

### SMART_MEDIA_BASE_URL
**Usage:** Base URL for smart media system and image proxying

**Implementation:**
```javascript
const imageUrl = product.image_url || 
  `${process.env.SMART_MEDIA_BASE_URL || 'https://api.beemeeart.com/api/images'}/media-proxy/${product.image_path}`;
```

**Purpose:**
- Constructs smart media URLs for product images
- Replaces hardcoded `api2.onlineartfestival.com` with configurable domain
- Provides fallback to `api.beemeeart.com/api/images` if not configured
- Supports media proxy functionality for temporary images

## Security Considerations

### Public Access
- **No Authentication:** All endpoints are public for marketplace browsing
- **Data Filtering:** Only marketplace-enabled, active products returned
- **Input Validation:** Comprehensive parameter validation and sanitization
- **SQL Injection Protection:** Parameterized queries throughout

### Data Privacy
- **Vendor Information:** Only business-relevant vendor data exposed
- **Product Status:** Only active products visible to public
- **Image Security:** Smart media URLs with proper access controls
- **Error Handling:** Secure error responses without system details

## Performance Considerations

### Database Optimization
- **Indexed Queries:** Optimized on marketplace_enabled, status, marketplace_category
- **Conditional JOINs:** Only join tables when data is requested
- **Pagination:** Efficient LIMIT/OFFSET with separate count queries
- **Query Caching:** Potential for Redis caching on frequently accessed data

### Image Handling
- **Smart URLs:** Environment-based URL generation for flexibility
- **Lazy Loading:** Images only processed when included in request
- **CDN Ready:** URLs structured for CDN integration
- **Fallback Handling:** Graceful handling of missing images

### Scalability Features
- **Pagination:** Handles large product catalogs efficiently
- **Filtering:** Database-level filtering reduces data transfer
- **Conditional Includes:** Only fetch needed related data
- **Stateless Design:** No server-side state for easy horizontal scaling

## Error Handling

### Parameter Validation
- **Category Validation:** Ensures valid marketplace categories
- **Sort Validation:** Validates sort fields and prevents SQL injection
- **Order Validation:** Ensures proper sort order specification
- **Limit Validation:** Prevents excessive data requests

### Database Errors
- **Connection Handling:** Graceful handling of database connectivity issues
- **Query Errors:** Proper error logging and user-friendly responses
- **Data Consistency:** Handles missing related data gracefully
- **Performance Monitoring:** Query timing and optimization opportunities

### Image Processing Errors
- **Missing Images:** Graceful handling when images don't exist
- **URL Generation:** Fallback URL generation for missing environment variables
- **Media Proxy:** Error handling for media proxy failures
- **Format Validation:** Ensures proper image URL formatting

## Logging and Monitoring

### Secure Logging
- **Request Logging:** All marketplace requests logged with parameters
- **Error Logging:** Comprehensive error logging with context
- **Performance Logging:** Query timing and response metrics
- **Usage Analytics:** Track popular categories and search patterns

### Monitoring Points
- **Product Visibility:** Monitor marketplace-enabled product counts
- **Category Distribution:** Track product distribution across categories
- **Vendor Activity:** Monitor active vendor participation
- **Performance Metrics:** Track response times and query efficiency

## Usage Examples

### Browse Art Products with Images
```javascript
const response = await fetch('/api/marketplace/products?category=art&include=images,vendor&limit=20&sort=price&order=ASC');
const data = await response.json();

console.log(`Found ${data.products.length} art products`);
console.log(`Total available: ${data.pagination.total}`);

data.products.forEach(product => {
  console.log(`${product.name} by ${product.business_name} - $${product.price}`);
  if (product.images && product.images.length > 0) {
    console.log(`Image: ${product.images[0].url}`);
  }
});
```

### Get Featured Products for Homepage
```javascript
const featuredResponse = await fetch('/api/marketplace/products/featured?category=art&limit=8');
const featuredData = await featuredResponse.json();

console.log(`Featured ${featuredData.category} products:`);
featuredData.products.forEach(product => {
  console.log(`- ${product.name}: $${product.price}`);
});
```

### Display Marketplace Statistics
```javascript
const statsResponse = await fetch('/api/marketplace/stats');
const stats = await statsResponse.json();

console.log('Marketplace Overview:');
console.log(`Total Products: ${stats.marketplace_stats.total_products}`);
console.log(`Art Products: ${stats.marketplace_stats.art_products}`);
console.log(`Craft Products: ${stats.marketplace_stats.crafts_products}`);
console.log(`Active Vendors: ${stats.marketplace_stats.total_vendors}`);
console.log(`Last Updated: ${stats.last_updated}`);
```

### Advanced Filtering and Pagination
```javascript
// Get crafts products with full details, sorted by name
const advancedResponse = await fetch('/api/marketplace/products?' + new URLSearchParams({
  category: 'crafts',
  include: 'images,vendor,categories',
  sort: 'name',
  order: 'ASC',
  limit: 25,
  offset: 50
}));

const advancedData = await advancedResponse.json();

console.log(`Page 3 of crafts products (${advancedData.pagination.offset + 1}-${advancedData.pagination.offset + advancedData.products.length} of ${advancedData.pagination.total})`);

advancedData.products.forEach(product => {
  console.log(`${product.name} in ${product.category_name}`);
  console.log(`By: ${product.business_name || product.first_name + ' ' + product.last_name}`);
  console.log(`Price: $${product.price}${product.wholesale_price ? ` (Wholesale: $${product.wholesale_price})` : ''}`);
  console.log('---');
});

// Check if more pages available
if (advancedData.pagination.hasMore) {
  console.log('More products available...');
}
```

### Build Category Navigation
```javascript
// Get statistics for navigation menu
const buildCategoryNav = async () => {
  const statsResponse = await fetch('/api/marketplace/stats');
  const stats = await statsResponse.json();
  
  const categories = [
    {
      name: 'All Products',
      slug: 'all',
      count: stats.marketplace_stats.total_products
    },
    {
      name: 'Art',
      slug: 'art', 
      count: stats.marketplace_stats.art_products
    },
    {
      name: 'Crafts',
      slug: 'crafts',
      count: stats.marketplace_stats.crafts_products
    }
  ];
  
  return categories;
};

// Use for navigation menu
const navCategories = await buildCategoryNav();
navCategories.forEach(category => {
  console.log(`${category.name}: ${category.count} products`);
});
```
