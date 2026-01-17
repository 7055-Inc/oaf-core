# Curated Content - Internal Documentation

## Overview
Curated marketplace content system that provides public-facing access to marketplace products with sophisticated filtering, data enrichment, and product family management. This system handles both art and crafts marketplace categories, offering comprehensive product information with optional data inclusion for performance optimization. It serves as the primary API for marketplace product display, search, and detailed product views with complete product family relationships.

## Architecture
- **Type:** Route Handler
- **Dependencies:** 
  - Express.js router
  - MySQL database connection
  - Secure logger for audit trails and debugging
- **Database Tables:** 
  - `products` - Main product catalog with marketplace filtering
  - `product_inventory` - Inventory tracking and availability
  - `product_images` - Permanent product images
  - `pending_images` - Temporary product images
  - `product_shipping` - Shipping configuration and rates
  - `product_categories` - Product-category associations
  - `categories` - Category information
  - `users` - Vendor user accounts
  - `user_profiles` - User profile information
  - `artist_profiles` - Artist-specific profile data
- **External APIs:** None (self-contained system)

## Functions/Endpoints

### Art Marketplace Endpoints
#### GET /art/products/all
- **Purpose:** Retrieve all active art marketplace products with optional filtering
- **Parameters:** include (data enrichment), vendor_id (vendor filter), category_id (category filter)
- **Returns:** List of art products with optional enriched data
- **Errors:** 500 for database errors
- **Usage Example:** Art marketplace product listings and search results
- **Special Features:**
  - Marketplace-specific filtering (active, marketplace_enabled = 1, marketplace_category = 'art')
  - Optional data enrichment via include parameter (inventory, images, vendor)
  - Vendor and category filtering for targeted results
  - Product family support (parent-child relationships)
  - Comprehensive image handling (permanent + temporary images)
  - Vendor information enrichment with business details
  - Performance optimization through selective data inclusion

#### GET /art/products/:id
- **Purpose:** Retrieve detailed art product information with complete family structure
- **Parameters:** Product ID, include (data enrichment options)
- **Returns:** Complete product details with parent-child relationships and enriched data
- **Errors:** 404 for product not found, 500 for database errors
- **Usage Example:** Art product detail pages and comprehensive product views
- **Special Features:**
  - Intelligent product family resolution (parent/child detection)
  - Complete family structure with all siblings for variable products
  - Comprehensive data enrichment (inventory, images, shipping, categories, vendor)
  - Default data inclusion for essential information
  - Product type detection and appropriate family handling
  - Marketplace validation for all family members
  - Detailed logging for debugging and analytics

### Crafts Marketplace Endpoints
#### GET /crafts/products/all
- **Purpose:** Retrieve all active crafts marketplace products with optional filtering
- **Parameters:** include (data enrichment), vendor_id (vendor filter), category_id (category filter)
- **Returns:** List of crafts products with optional enriched data
- **Errors:** 500 for database errors
- **Usage Example:** Crafts marketplace product listings and search results
- **Special Features:**
  - Marketplace-specific filtering (active, marketplace_enabled = 1, marketplace_category = 'crafts')
  - Identical functionality to art marketplace with crafts-specific filtering
  - Optional data enrichment via include parameter
  - Vendor and category filtering capabilities
  - Product family support with parent-child relationships
  - Comprehensive image and vendor data handling
  - Performance optimization through selective data inclusion

#### GET /crafts/products/:id
- **Purpose:** Retrieve detailed crafts product information with complete family structure
- **Parameters:** Product ID, include (data enrichment options)
- **Returns:** Complete product details with parent-child relationships and enriched data
- **Errors:** 404 for product not found, 500 for database errors
- **Usage Example:** Crafts product detail pages and comprehensive product views
- **Special Features:**
  - Identical functionality to art product details with crafts-specific filtering
  - Intelligent product family resolution and structure
  - Comprehensive data enrichment options
  - Default data inclusion for essential information
  - Product type detection and family handling
  - Marketplace validation for all family members
  - Detailed logging for debugging and analytics

## Data Models

### Product List Response Structure
```javascript
{
  products: [
    {
      // Base product fields
      id: number,                     // Product ID
      name: string,                   // Product name
      description: string,            // Product description
      price: number,                  // Product price
      status: string,                 // Product status (active)
      marketplace_enabled: boolean,   // Marketplace enabled flag
      marketplace_category: string,   // Marketplace category (art/crafts)
      product_type: string,           // Product type (simple/variable/variant)
      parent_id: number,              // Parent product ID (null for parents)
      vendor_id: number,              // Vendor user ID
      category_id: number,            // Primary category ID
      created_at: timestamp,          // Creation timestamp
      updated_at: timestamp,          // Last update timestamp
      
      // Optional enriched data (based on include parameter)
      children: array,                // Child products (for variable products)
      parent: object,                 // Parent product info (for child products)
      inventory: {                    // Inventory information
        qty_on_hand: number,          // Quantity on hand
        qty_on_order: number,         // Quantity on order
        qty_available: number,        // Available quantity
        reorder_qty: number           // Reorder quantity threshold
      },
      images: array,                  // Product images (permanent + temporary)
      vendor: {                       // Vendor information
        id: number,                   // Vendor ID
        username: string,             // Vendor username
        first_name: string,           // Vendor first name
        last_name: string,            // Vendor last name
        display_name: string,         // Vendor display name
        business_name: string,        // Business name
        business_website: string      // Business website
      }
    }
  ]
}
```

### Product Detail Response Structure
```javascript
{
  // Base product fields (same as list)
  id: number,
  name: string,
  description: string,
  price: number,
  status: string,
  marketplace_enabled: boolean,
  marketplace_category: string,
  product_type: string,
  parent_id: number,
  vendor_id: number,
  category_id: number,
  created_at: timestamp,
  updated_at: timestamp,
  
  // Family structure
  children: [                         // All child products (for variable products)
    {
      // Complete child product data with enrichment
      id: number,
      name: string,
      // ... all product fields
      inventory: object,              // Child inventory data
      images: array,                  // Child images
      shipping: object,               // Child shipping data
      categories: array               // Child categories (if included)
    }
  ],
  
  // Enriched data (based on include parameter or defaults)
  inventory: object,                  // Parent inventory information
  images: array,                      // Parent product images
  shipping: object,                   // Shipping configuration
  categories: array,                  // Associated categories
  vendor: object,                     // Vendor information
  
  // Family metadata
  family_size: number,                // Number of child products
  requested_product_id: number,       // Originally requested product ID
  is_requested_product_parent: boolean // Whether requested product was parent
}
```

### Inventory Data Structure
```javascript
{
  qty_on_hand: number,                // Current quantity on hand
  qty_on_order: number,               // Quantity on order from suppliers
  qty_available: number,              // Available quantity for sale
  reorder_qty: number                 // Reorder threshold quantity
}
```

### Vendor Data Structure
```javascript
{
  id: number,                         // Vendor user ID
  username: string,                   // Vendor username/email
  first_name: string,                 // Vendor first name
  last_name: string,                  // Vendor last name
  display_name: string,               // Vendor display name
  business_name: string,              // Business name (from artist profile)
  business_website: string            // Business website URL
}
```

### Shipping Data Structure
```javascript
{
  // Shipping configuration fields
  weight: number,                     // Product weight
  dimensions: object,                 // Product dimensions
  shipping_class: string,             // Shipping class
  free_shipping: boolean,             // Free shipping flag
  // Additional shipping configuration fields
}
```

### Category Data Structure
```javascript
{
  id: number,                         // Category ID
  name: string,                       // Category name
  description: string                 // Category description
}
```

## Business Logic

### Marketplace Filtering
- **Status Validation:** Only active products are included in results
- **Marketplace Enablement:** Only marketplace_enabled = 1 products are shown
- **Category Filtering:** Strict category filtering (art vs crafts) for marketplace separation
- **Family Validation:** All family members must meet marketplace criteria
- **Public Access:** All endpoints are public with no authentication required

### Product Family Management
- **Parent Detection:** Automatic detection of parent vs child products
- **Family Resolution:** Complete family structure resolution for variable products
- **Sibling Handling:** All siblings included when accessing child products
- **Type Handling:** Appropriate handling for simple, variable, and variant product types
- **Marketplace Consistency:** All family members validated for marketplace eligibility

### Data Enrichment Strategy
- **Performance Optimization:** Optional data inclusion via include parameter
- **Default Inclusion:** Essential data included by default for detail views
- **Selective Loading:** Only requested data loaded to optimize performance
- **Comprehensive Options:** Support for inventory, images, shipping, categories, vendor data
- **Image Handling:** Combined permanent and temporary image support

### Filtering and Search
- **Vendor Filtering:** Optional vendor-specific product filtering
- **Category Filtering:** Optional category-specific product filtering
- **Marketplace Separation:** Complete separation between art and crafts marketplaces
- **Status Filtering:** Automatic filtering for active products only
- **Ordering:** Chronological ordering by creation date (newest first)

## Environment Variables
- No domain-specific environment variables needed for this module
- Database connection handled by shared configuration
- All functionality is self-contained within the API

## Security Considerations
- **Public Access:** All endpoints are public with no authentication required
- **Data Filtering:** Strict filtering ensures only appropriate marketplace products are shown
- **Input Validation:** Parameter validation for include options and filters
- **SQL Injection Protection:** Parameterized queries throughout
- **Data Sanitization:** Proper data sanitization for all responses
- **Error Handling:** Secure error handling without information disclosure

## Performance Considerations
- **Database Indexing:** Optimized queries on status, marketplace_enabled, marketplace_category
- **Query Optimization:** Efficient JOINs and subqueries for data enrichment
- **Selective Loading:** Optional data inclusion to reduce query overhead
- **Image Handling:** Optimized image queries with proper ordering
- **Family Queries:** Efficient family structure resolution
- **Connection Pooling:** Database connection management for concurrent operations

## Testing
- **Unit Tests:** Should cover all business logic and filtering rules
- **Integration Tests:** Test database operations and data enrichment
- **Marketplace Tests:** Verify marketplace-specific filtering and separation
- **Family Tests:** Test product family resolution and structure
- **Performance Tests:** Test query performance with large datasets
- **Filter Tests:** Verify all filtering options and combinations

## Error Handling
- **Product Not Found:** Clear 404 responses for missing products
- **Database Errors:** Proper error handling and logging for database issues
- **Parameter Validation:** Validation of include parameters and filters
- **Family Resolution:** Proper handling of orphaned or invalid family relationships
- **Marketplace Validation:** Appropriate responses for non-marketplace products
- **User-Friendly Messages:** Clear error messages for API consumers

## Common Use Cases
- **Marketplace Listings:** Product listings for art and crafts marketplaces
- **Product Search:** Filtered product search with vendor and category options
- **Product Details:** Comprehensive product detail pages with family structure
- **Vendor Showcases:** Vendor-specific product displays
- **Category Browsing:** Category-specific product browsing
- **Image Galleries:** Product image display with comprehensive image support

## Integration Points
- **Product System:** Coordinates with main product system for data consistency
- **Inventory System:** Integrates with inventory tracking for availability
- **Image System:** Coordinates with image management for comprehensive image support
- **User System:** Integrates with user and profile systems for vendor information
- **Category System:** Coordinates with category system for product organization
- **Frontend Applications:** Provides data for marketplace display and product pages

## API Consistency
- **Response Format:** Consistent JSON response structure across all endpoints
- **Error Handling:** Standardized error response format with appropriate HTTP status codes
- **Parameter Handling:** Consistent parameter parsing and validation
- **Data Enrichment:** Standardized include parameter handling across endpoints
- **Marketplace Separation:** Consistent filtering and validation for marketplace categories
- **Family Structure:** Consistent product family handling across all endpoints

## Future Enhancements
- **Advanced Filtering:** More sophisticated filtering options (price ranges, ratings, etc.)
- **Search Functionality:** Full-text search capabilities for products
- **Sorting Options:** Multiple sorting options (price, popularity, date, etc.)
- **Pagination:** Pagination support for large product sets
- **Caching:** Response caching for improved performance
- **Analytics:** Product view tracking and analytics
- **Recommendations:** Product recommendation engine integration
- **Bulk Operations:** Bulk product operations and batch processing

## Development Notes
- **Marketplace Focus:** Specialized for marketplace product curation and display
- **Performance Optimization:** Designed for high-performance public access
- **Data Enrichment:** Flexible data inclusion for various frontend needs
- **Family Management:** Sophisticated product family handling
- **Documentation:** Extensive JSDoc documentation for all functions
- **Public API:** Designed as public-facing API with appropriate security measures
- **Scalability:** Designed to handle high-volume marketplace traffic
- **User Experience:** Focus on fast, comprehensive product data delivery

## Business Requirements
- **Marketplace Separation:** Clear separation between art and crafts marketplaces
- **Product Discovery:** Effective product discovery and browsing capabilities
- **Comprehensive Data:** Complete product information for informed purchasing decisions
- **Performance:** Fast response times for marketplace browsing
- **Vendor Support:** Complete vendor information for marketplace transparency
- **Image Support:** Comprehensive image support for product visualization
- **Family Structure:** Clear product family relationships for variable products
- **Public Access:** Public API access for marketplace functionality

## Monitoring and Logging
- **Product Access:** Comprehensive logging of product access patterns
- **Performance Monitoring:** Track query performance for marketplace operations
- **Error Tracking:** Detailed error logging for marketplace operations
- **Usage Analytics:** Track marketplace usage patterns and popular products
- **Family Resolution:** Monitor product family resolution performance
- **Data Enrichment:** Track data enrichment usage and performance

## Data Privacy and Compliance
- **Public Data:** All exposed data is appropriate for public consumption
- **Vendor Privacy:** Appropriate vendor information exposure for marketplace needs
- **Data Filtering:** Strict filtering ensures only appropriate data is exposed
- **Access Logging:** Appropriate access logging for marketplace operations
- **Privacy Compliance:** Ensure compliance with data privacy regulations
- **Secure Transmission:** All marketplace data transmitted securely
