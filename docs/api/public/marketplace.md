# Marketplace API

## Overview
The Beemeeart Marketplace API provides comprehensive marketplace functionality for browsing and discovering products across multiple categories. This API supports advanced filtering, featured product showcases, and marketplace statistics for building rich e-commerce experiences.

## Authentication
All marketplace endpoints are public and do not require authentication. They are designed for public browsing and discovery of marketplace products.

## Base URL
```
https://api.beemeeart.com/marketplace
```

## Marketplace Categories

The marketplace supports multiple product categories:
- **Art:** Fine art, paintings, sculptures, digital art
- **Crafts:** Handmade items, crafts, artisan products  
- **Unsorted:** Products awaiting categorization
- **All:** View all marketplace products

## Product Listings

### Browse Marketplace Products
`GET /api/marketplace/products`

Get marketplace products with comprehensive filtering and pagination.

**Authentication:** None required (public endpoint)

**Query Parameters:**
- `category` (string, default: 'all'): Product category filter
  - `'art'`: Fine art and artistic products
  - `'crafts'`: Handmade and craft products
  - `'unsorted'`: Products awaiting categorization
  - `'all'`: All marketplace products
- `limit` (number, default: 50, max: 100): Number of products to return
- `offset` (number, default: 0): Pagination offset
- `include` (string, optional): Comma-separated includes
  - `'images'`: Include product images
  - `'vendor'`: Include vendor/artist information
  - `'categories'`: Include category information
- `sort` (string, default: 'created_at'): Sort field
  - `'created_at'`: Sort by creation date
  - `'name'`: Sort alphabetically by name
  - `'price'`: Sort by product price
  - `'updated_at'`: Sort by last update
- `order` (string, default: 'DESC'): Sort order ('ASC' or 'DESC')

**Response (200 OK):**
```json
{
  "products": [
    {
      "id": 123,
      "name": "Abstract Painting",
      "description": "Beautiful abstract artwork with vibrant colors...",
      "short_description": "Colorful abstract piece",
      "price": 299.99,
      "wholesale_price": 199.99,
      "wholesale_description": "Bulk pricing available for galleries",
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

**Features:**
- **Advanced Filtering:** Filter by category with multiple sort options
- **Flexible Includes:** Optionally include images, vendor info, and categories
- **Efficient Pagination:** Handle large product catalogs with pagination
- **Smart Image URLs:** Automatic image URL generation with fallbacks

### Get Featured Products
`GET /api/marketplace/products/featured`

Get featured marketplace products for homepage and category showcases.

**Authentication:** None required (public endpoint)

**Query Parameters:**
- `category` (string, default: 'art'): Product category ('art' or 'crafts')
- `limit` (number, default: 12): Number of featured products to return

**Response (200 OK):**
```json
{
  "products": [
    {
      "id": 123,
      "name": "Featured Abstract Painting",
      "description": "Beautiful featured artwork...",
      "short_description": "Stunning abstract piece",
      "price": 299.99,
      "wholesale_price": 199.99,
      "sku": "ART-123",
      "marketplace_category": "art",
      "created_at": "2024-01-15T10:30:00Z",
      "vendor_id": 456,
      "business_name": "Smith Art Studio",
      "first_name": "Jane",
      "last_name": "Smith",
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

**Features:**
- **Curated Selection:** High-quality products for promotional display
- **Category-Specific:** Get featured products for specific categories
- **Complete Metadata:** Includes vendor information and images
- **Homepage Ready:** Perfect for homepage and category showcases

## Marketplace Statistics

### Get Marketplace Stats
`GET /api/marketplace/stats`

Get comprehensive marketplace statistics and metrics.

**Authentication:** None required (public endpoint)

**Response (200 OK):**
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
- **Analytics:** Track marketplace growth and activity
- **Vendor Recruitment:** Demonstrate marketplace size

## Error Responses

### Standard Error Format
```json
{
  "error": "Error description"
}
```

### Common Error Codes
- `400` - Bad Request (invalid parameters)
- `500` - Internal Server Error (system error)

### Parameter Validation Errors
- **Invalid category:** Must be 'art', 'crafts', 'unsorted', or 'all'
- **Invalid sort:** Must be 'created_at', 'name', 'price', or 'updated_at'
- **Invalid order:** Must be 'ASC' or 'DESC'

## Rate Limits
- **Product listings:** 1000 requests per hour per IP
- **Featured products:** 2000 requests per hour per IP
- **Statistics:** 5000 requests per hour per IP

## Integration Examples

### Complete Marketplace Browse Experience
```javascript
// Build marketplace product browser
const buildMarketplaceBrowser = async (category = 'all', page = 1) => {
  const limit = 20;
  const offset = (page - 1) * limit;
  
  // Get products with full details
  const response = await fetch(`/api/marketplace/products?${new URLSearchParams({
    category: category,
    include: 'images,vendor,categories',
    sort: 'created_at',
    order: 'DESC',
    limit: limit,
    offset: offset
  })}`);
  
  const data = await response.json();
  
  // Display products
  console.log(`Showing ${data.products.length} of ${data.pagination.total} products`);
  
  data.products.forEach(product => {
    console.log(`${product.name} - $${product.price}`);
    console.log(`By: ${product.business_name || product.first_name + ' ' + product.last_name}`);
    console.log(`Category: ${product.category_name}`);
    
    if (product.images && product.images.length > 0) {
      console.log(`Image: ${product.images[0].url}`);
    }
    
    if (product.wholesale_price) {
      console.log(`Wholesale: $${product.wholesale_price}`);
    }
    
    console.log('---');
  });
  
  // Pagination info
  console.log(`Page ${page} of ${Math.ceil(data.pagination.total / limit)}`);
  console.log(`Has more: ${data.pagination.hasMore}`);
  
  return data;
};

// Browse art products
const artProducts = await buildMarketplaceBrowser('art', 1);
```

### Featured Products Showcase
```javascript
// Create featured products showcase for homepage
const createFeaturedShowcase = async () => {
  // Get featured art products
  const artResponse = await fetch('/api/marketplace/products/featured?category=art&limit=6');
  const artData = await artResponse.json();
  
  // Get featured craft products
  const craftsResponse = await fetch('/api/marketplace/products/featured?category=crafts&limit=6');
  const craftsData = await craftsResponse.json();
  
  const showcase = {
    art: {
      title: 'Featured Art',
      products: artData.products
    },
    crafts: {
      title: 'Featured Crafts', 
      products: craftsData.products
    }
  };
  
  // Display showcase
  Object.entries(showcase).forEach(([category, section]) => {
    console.log(`\n${section.title}:`);
    section.products.forEach(product => {
      console.log(`- ${product.name} by ${product.business_name} - $${product.price}`);
    });
  });
  
  return showcase;
};

// Build homepage showcase
const featuredShowcase = await createFeaturedShowcase();
```

### Category Navigation with Stats
```javascript
// Build category navigation with product counts
const buildCategoryNavigation = async () => {
  // Get marketplace statistics
  const statsResponse = await fetch('/api/marketplace/stats');
  const stats = await statsResponse.json();
  
  const categories = [
    {
      name: 'All Products',
      slug: 'all',
      count: stats.marketplace_stats.total_products,
      description: 'Browse all marketplace products'
    },
    {
      name: 'Art',
      slug: 'art',
      count: stats.marketplace_stats.art_products,
      description: 'Fine art, paintings, and artistic creations'
    },
    {
      name: 'Crafts',
      slug: 'crafts',
      count: stats.marketplace_stats.crafts_products,
      description: 'Handmade items and artisan crafts'
    }
  ];
  
  // Display navigation
  console.log('Marketplace Categories:');
  categories.forEach(category => {
    console.log(`${category.name}: ${category.count} products`);
    console.log(`  ${category.description}`);
  });
  
  console.log(`\nTotal Vendors: ${stats.marketplace_stats.total_vendors}`);
  console.log(`Last Updated: ${new Date(stats.last_updated).toLocaleString()}`);
  
  return categories;
};

// Create navigation menu
const navigation = await buildCategoryNavigation();
```

### Advanced Product Search and Filtering
```javascript
// Advanced product search with multiple filters
const searchMarketplace = async (searchOptions) => {
  const {
    category = 'all',
    sortBy = 'created_at',
    sortOrder = 'DESC',
    priceRange = null,
    includeWholesale = false,
    page = 1,
    pageSize = 20
  } = searchOptions;
  
  const offset = (page - 1) * pageSize;
  
  // Build query parameters
  const params = new URLSearchParams({
    category: category,
    include: 'images,vendor,categories',
    sort: sortBy,
    order: sortOrder,
    limit: pageSize,
    offset: offset
  });
  
  // Get products
  const response = await fetch(`/api/marketplace/products?${params}`);
  const data = await response.json();
  
  // Client-side filtering for additional criteria
  let filteredProducts = data.products;
  
  // Filter by price range
  if (priceRange) {
    filteredProducts = filteredProducts.filter(product => {
      const price = parseFloat(product.price);
      return price >= priceRange.min && price <= priceRange.max;
    });
  }
  
  // Filter wholesale products
  if (includeWholesale) {
    filteredProducts = filteredProducts.filter(product => product.wholesale_price);
  }
  
  // Display results
  console.log(`Found ${filteredProducts.length} products matching criteria:`);
  
  filteredProducts.forEach(product => {
    console.log(`${product.name} - $${product.price}`);
    console.log(`  By: ${product.business_name}`);
    console.log(`  Category: ${product.category_name}`);
    
    if (product.wholesale_price && includeWholesale) {
      console.log(`  Wholesale: $${product.wholesale_price}`);
    }
  });
  
  return {
    products: filteredProducts,
    pagination: data.pagination,
    filters: data.filters,
    searchCriteria: searchOptions
  };
};

// Example searches
const artSearch = await searchMarketplace({
  category: 'art',
  sortBy: 'price',
  sortOrder: 'ASC',
  priceRange: { min: 100, max: 500 }
});

const wholesaleSearch = await searchMarketplace({
  category: 'all',
  includeWholesale: true,
  sortBy: 'name',
  sortOrder: 'ASC'
});
```

### Marketplace Analytics Dashboard
```javascript
// Build marketplace analytics dashboard
const buildAnalyticsDashboard = async () => {
  // Get current statistics
  const statsResponse = await fetch('/api/marketplace/stats');
  const stats = await statsResponse.json();
  
  // Get recent products for trending analysis
  const recentResponse = await fetch('/api/marketplace/products?sort=created_at&order=DESC&limit=10&include=vendor');
  const recentData = await recentResponse.json();
  
  // Get price range analysis
  const allProductsResponse = await fetch('/api/marketplace/products?limit=1000&sort=price&order=ASC');
  const allProductsData = await allProductsResponse.json();
  
  const prices = allProductsData.products.map(p => parseFloat(p.price));
  const priceAnalysis = {
    min: Math.min(...prices),
    max: Math.max(...prices),
    average: prices.reduce((a, b) => a + b, 0) / prices.length,
    median: prices[Math.floor(prices.length / 2)]
  };
  
  const dashboard = {
    overview: stats.marketplace_stats,
    recentProducts: recentData.products,
    priceAnalysis: priceAnalysis,
    categoryDistribution: {
      art: Math.round((stats.marketplace_stats.art_products / stats.marketplace_stats.total_products) * 100),
      crafts: Math.round((stats.marketplace_stats.crafts_products / stats.marketplace_stats.total_products) * 100),
      unsorted: Math.round((stats.marketplace_stats.unsorted_products / stats.marketplace_stats.total_products) * 100)
    },
    lastUpdated: stats.last_updated
  };
  
  // Display dashboard
  console.log('=== MARKETPLACE ANALYTICS DASHBOARD ===\n');
  
  console.log('Overview:');
  console.log(`Total Products: ${dashboard.overview.total_products}`);
  console.log(`Active Vendors: ${dashboard.overview.total_vendors}`);
  console.log(`Products per Vendor: ${Math.round(dashboard.overview.total_products / dashboard.overview.total_vendors)}`);
  
  console.log('\nCategory Distribution:');
  console.log(`Art: ${dashboard.overview.art_products} (${dashboard.categoryDistribution.art}%)`);
  console.log(`Crafts: ${dashboard.overview.crafts_products} (${dashboard.categoryDistribution.crafts}%)`);
  console.log(`Unsorted: ${dashboard.overview.unsorted_products} (${dashboard.categoryDistribution.unsorted}%)`);
  
  console.log('\nPrice Analysis:');
  console.log(`Range: $${dashboard.priceAnalysis.min.toFixed(2)} - $${dashboard.priceAnalysis.max.toFixed(2)}`);
  console.log(`Average: $${dashboard.priceAnalysis.average.toFixed(2)}`);
  console.log(`Median: $${dashboard.priceAnalysis.median.toFixed(2)}`);
  
  console.log('\nRecent Products:');
  dashboard.recentProducts.slice(0, 5).forEach(product => {
    console.log(`- ${product.name} by ${product.business_name} ($${product.price})`);
  });
  
  console.log(`\nLast Updated: ${new Date(dashboard.lastUpdated).toLocaleString()}`);
  
  return dashboard;
};

// Generate analytics dashboard
const analytics = await buildAnalyticsDashboard();
```
