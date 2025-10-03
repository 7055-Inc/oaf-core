# Category Management API

## Authentication
Category read operations are public. Write operations require API key authentication.

**Headers (for write operations):**
- `Authorization: Bearer {api_key}` (required)
- `Content-Type: application/json`

## Category Endpoints

### Get All Categories
`GET /api/categories`

Get all categories in both hierarchical tree and flat array formats.

**Response (200 OK):**
```json
{
  "success": true,
  "categories": [
    {
      "id": 1,
      "name": "Art",
      "parent_id": null,
      "description": "Fine art and artistic creations",
      "parent_name": null,
      "child_count": 3,
      "product_count": 25,
      "children": [
        {
          "id": 2,
          "name": "Paintings",
          "parent_id": 1,
          "description": "Original paintings and prints",
          "parent_name": "Art",
          "child_count": 2,
          "product_count": 15,
          "children": [
            {
              "id": 3,
              "name": "Oil Paintings",
              "parent_id": 2,
              "description": "Traditional oil paintings",
              "parent_name": "Paintings",
              "child_count": 0,
              "product_count": 8,
              "children": []
            }
          ]
        }
      ]
    }
  ],
  "flat_categories": [
    {
      "id": 1,
      "name": "Art",
      "parent_id": null,
      "description": "Fine art and artistic creations",
      "parent_name": null,
      "child_count": 3,
      "product_count": 25
    },
    {
      "id": 2,
      "name": "Paintings",
      "parent_id": 1,
      "description": "Original paintings and prints",
      "parent_name": "Art",
      "child_count": 2,
      "product_count": 15
    }
  ]
}
```

### Get Single Category
`GET /api/categories/:id`

Get detailed information for a specific category including children and breadcrumb navigation.

**Parameters:**
- `id`: Category ID (path parameter)

**Response (200 OK):**
```json
{
  "success": true,
  "category": {
    "id": 2,
    "name": "Paintings",
    "parent_id": 1,
    "description": "Original paintings and prints",
    "parent_name": "Art",
    "child_count": 2,
    "product_count": 15,
    "children": [
      {
        "id": 3,
        "name": "Oil Paintings",
        "description": "Traditional oil paintings"
      },
      {
        "id": 4,
        "name": "Watercolor Paintings",
        "description": "Watercolor art pieces"
      }
    ],
    "breadcrumb": [
      {
        "id": 1,
        "name": "Art"
      }
    ]
  }
}
```

### Create Category
`POST /api/categories`

Create a new category.

**Required Authentication:** Yes

**Request Body:**
```json
{
  "name": "Digital Art",
  "parent_id": 1,
  "description": "Digital artwork and computer-generated art"
}
```

**Required Fields:**
- `name`: Category name (must be unique)

**Optional Fields:**
- `parent_id`: Parent category ID (null for root category)
- `description`: Category description

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Category created successfully",
  "category": {
    "id": 5,
    "name": "Digital Art",
    "parent_id": 1,
    "description": "Digital artwork and computer-generated art",
    "parent_name": "Art"
  }
}
```

### Update Category
`PUT /api/categories/:id`

Update an existing category.

**Required Authentication:** Yes

**Parameters:**
- `id`: Category ID (path parameter)

**Request Body (all fields optional):**
```json
{
  "name": "Updated Digital Art",
  "parent_id": 2,
  "description": "Updated description for digital artwork"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Category updated successfully",
  "category": {
    "id": 5,
    "name": "Updated Digital Art",
    "parent_id": 2,
    "description": "Updated description for digital artwork",
    "parent_name": "Paintings"
  }
}
```

### Delete Category
`DELETE /api/categories/:id`

Delete a category. Categories with children or associated products cannot be deleted.

**Required Authentication:** Yes

**Parameters:**
- `id`: Category ID (path parameter)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Category deleted successfully"
}
```

## Category Content Endpoints

### Get Category Content
`GET /api/categories/content/:category_id`

Get category content including hero images, descriptions, and featured items.

**Parameters:**
- `category_id`: Category ID (path parameter)

**Response (200 OK):**
```json
{
  "success": true,
  "content": {
    "category_id": 1,
    "hero_image": "https://api.beemeeart.com/api/images/hero-art.jpg",
    "description": "Discover amazing artwork from talented artists around the world.",
    "banner": "Featured Art Collection - Limited Time",
    "featured_products": "[{\"id\": 123, \"name\": \"Sunset Painting\"}, {\"id\": 124, \"name\": \"Abstract Art\"}]",
    "featured_artists": "[{\"id\": 456, \"name\": \"Jane Artist\"}, {\"id\": 789, \"name\": \"John Creator\"}]",
    "updated_by": 1,
    "created_at": "2025-09-15T10:00:00Z",
    "updated_at": "2025-09-16T14:30:00Z"
  }
}
```

### Create/Update Category Content
`POST /api/categories/content/:category_id`

Create or update category content.

**Required Authentication:** Yes (Admin permissions required)

**Parameters:**
- `category_id`: Category ID (path parameter)

**Request Body (all fields optional):**
```json
{
  "hero_image": "https://api.beemeeart.com/api/images/new-hero.jpg",
  "description": "Updated category description with rich content",
  "banner": "New Featured Collection Available",
  "featured_products": "[{\"id\": 125, \"name\": \"New Featured Art\"}]",
  "featured_artists": "[{\"id\": 890, \"name\": \"Featured Artist\"}]"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

## Category SEO Endpoints

### Get Category SEO Data
`GET /api/categories/seo/:category_id`

Get category SEO metadata and structured data.

**Parameters:**
- `category_id`: Category ID (path parameter)

**Response (200 OK):**
```json
{
  "success": true,
  "seo": {
    "category_id": 1,
    "meta_title": "Art Collection - Original Artwork | Beemeeart",
    "meta_description": "Discover unique artwork from talented artists. Browse paintings, sculptures, and digital art.",
    "meta_keywords": "art, paintings, sculptures, digital art, original artwork",
    "canonical_url": "https://beemeeart.com/categories/art",
    "json_ld": "{\"@context\": \"https://schema.org\", \"@type\": \"CollectionPage\", \"name\": \"Art Collection\"}",
    "updated_by": 1,
    "created_at": "2025-09-15T10:00:00Z",
    "updated_at": "2025-09-16T14:30:00Z"
  }
}
```

### Create/Update Category SEO Data
`POST /api/categories/seo/:category_id`

Create or update category SEO metadata.

**Required Authentication:** Yes (Admin permissions required)

**Parameters:**
- `category_id`: Category ID (path parameter)

**Request Body (all fields optional):**
```json
{
  "meta_title": "Updated Art Collection - Original Artwork | Beemeeart",
  "meta_description": "Updated description for SEO optimization",
  "meta_keywords": "updated, keywords, for, seo",
  "canonical_url": "https://beemeeart.com/categories/updated-art",
  "json_ld": "{\"@context\": \"https://schema.org\", \"@type\": \"CollectionPage\", \"name\": \"Updated Art Collection\"}"
}
```

**Response (200 OK):**
```json
{
  "success": true
}
```

## Admin Endpoints

### Get Category Change Log
`GET /api/categories/change-log`

Get audit trail of all category changes.

**Required Authentication:** Yes (Admin permissions required)

**Query Parameters:**
- `limit`: Number of records to return (default: 50)
- `offset`: Number of records to skip (default: 0)

**Response (200 OK):**
```json
{
  "success": true,
  "logs": [
    {
      "id": 123,
      "category_id": 5,
      "action": "create",
      "old_values": null,
      "new_values": {
        "name": "Digital Art",
        "parent_id": 1,
        "description": "Digital artwork and computer-generated art"
      },
      "admin_id": 1,
      "admin_username": "admin@beemeeart.com",
      "category_name": "Digital Art",
      "created_at": "2025-09-16T15:30:00Z"
    },
    {
      "id": 122,
      "category_id": 3,
      "action": "update",
      "old_values": {
        "name": "Oil Paintings",
        "description": "Traditional oil paintings"
      },
      "new_values": {
        "name": "Oil Paintings",
        "description": "Updated description for oil paintings"
      },
      "admin_id": 2,
      "admin_username": "editor@beemeeart.com",
      "category_name": "Oil Paintings",
      "created_at": "2025-09-16T14:15:00Z"
    }
  ]
}
```

## Data Types

### Category Object
- `id`: Unique category identifier
- `name`: Category name
- `parent_id`: Parent category ID (null for root categories)
- `description`: Category description
- `parent_name`: Parent category name (from database join)
- `child_count`: Number of direct child categories
- `product_count`: Number of associated products
- `children`: Array of child categories (hierarchical view only)
- `breadcrumb`: Array of parent categories for navigation (detail view only)

### Category Content Object
- `category_id`: Category ID
- `hero_image`: Hero image URL for category display
- `description`: Rich content description
- `banner`: Banner content for promotions
- `featured_products`: JSON string of featured products
- `featured_artists`: JSON string of featured artists
- `updated_by`: User ID who last updated the content
- `created_at`: Content creation timestamp
- `updated_at`: Last update timestamp

### Category SEO Object
- `category_id`: Category ID
- `meta_title`: SEO title for search engines
- `meta_description`: SEO description for search results
- `meta_keywords`: SEO keywords for search targeting
- `canonical_url`: Canonical URL for duplicate content prevention
- `json_ld`: JSON-LD structured data for rich snippets
- `updated_by`: User ID who last updated the SEO data
- `created_at`: SEO data creation timestamp
- `updated_at`: Last update timestamp

### Change Log Object
- `id`: Log entry ID
- `category_id`: Category ID that was changed
- `action`: Type of action (create, update, delete)
- `old_values`: Previous values (parsed JSON object)
- `new_values`: New values (parsed JSON object)
- `admin_id`: Admin user ID who made the change
- `admin_username`: Admin username for accountability
- `category_name`: Category name for context
- `created_at`: Change timestamp

## Validation Rules

### Category Name
- Must be unique across all categories
- Required for category creation
- Cannot be empty or whitespace only

### Parent Category
- Must exist in the database if specified
- Cannot be the same as the category being updated (self-parent)
- Cannot create circular references in the hierarchy

### Hierarchy Rules
- Unlimited nesting depth supported
- Circular references are prevented and validated
- Parent-child relationships must be valid

## Constraint Rules

### Deletion Constraints
- Categories with child categories cannot be deleted
- Categories with associated products cannot be deleted
- Categories used as primary category for products cannot be deleted
- All constraints are validated before deletion

### Update Constraints
- Category names must remain unique after updates
- Parent changes cannot create circular references
- Hierarchy integrity is maintained during updates

## Error Responses

- `400 Bad Request`: Invalid input data
  - Category name already exists
  - Parent category not found
  - Cannot create circular reference
  - Category cannot be its own parent
  - Cannot delete category with children/products
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: Insufficient permissions for admin operations
- `404 Not Found`: Category not found
- `500 Internal Server Error`: Server processing error

## Rate Limits
- 100 requests per minute per API key for read operations
- 50 requests per minute per API key for write operations
- 25 requests per minute per API key for admin operations

## Example Usage

### Get Category Hierarchy
```bash
# Get all categories in hierarchical format
curl -X GET https://api.beemeeart.com/api/categories
```

### Get Category Details
```bash
# Get detailed information for category 5
curl -X GET https://api.beemeeart.com/api/categories/5
```

### Create New Category
```bash
# Create new category under parent category 1
curl -X POST https://api.beemeeart.com/api/categories \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sculptures",
    "parent_id": 1,
    "description": "Three-dimensional art pieces"
  }'
```

### Update Category
```bash
# Update category 5
curl -X PUT https://api.beemeeart.com/api/categories/5 \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Digital Art",
    "description": "Updated description"
  }'
```

### Update Category Content
```bash
# Update content for category 1
curl -X POST https://api.beemeeart.com/api/categories/content/1 \
  -H "Authorization: Bearer your_admin_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "hero_image": "https://api.beemeeart.com/api/images/new-hero.jpg",
    "description": "Updated category content"
  }'
```

## Integration Notes

### Frontend Integration
- Use hierarchical structure for navigation menus
- Use flat structure for category selection dropdowns
- Implement breadcrumb navigation using breadcrumb data
- Display category content and SEO data appropriately

### Product Integration
- Categories are used for product organization and filtering
- Products can be associated with multiple categories
- Primary category assignment affects deletion constraints
- Category changes may affect product visibility

### SEO Integration
- Use SEO metadata for page optimization
- Implement JSON-LD structured data for rich snippets
- Use canonical URLs to prevent duplicate content issues
- Optimize meta tags for search engine visibility

### Content Management
- Category content supports rich media and featured items
- Featured products and artists stored as JSON for flexibility
- Content changes are logged for audit purposes
- Admin permissions required for content modifications

## Best Practices

### Category Organization
- Plan category hierarchy before implementation
- Use descriptive category names and descriptions
- Maintain reasonable hierarchy depth for usability
- Regular review and optimization of category structure

### Content Management
- Keep category descriptions concise and relevant
- Use high-quality hero images for visual appeal
- Feature relevant and popular products/artists
- Regular content updates to maintain freshness

### SEO Optimization
- Write unique meta titles and descriptions for each category
- Use relevant keywords without keyword stuffing
- Implement structured data for enhanced search results
- Maintain canonical URLs for SEO consistency

### Performance Optimization
- Cache category data appropriately for better performance
- Use flat structure for simple operations when possible
- Monitor query performance for large category hierarchies
- Implement pagination for large category lists

## Security Considerations
- Protect admin API keys and ensure proper permission levels
- Validate all user inputs thoroughly
- Monitor category access patterns for unusual activity
- Ensure secure transmission of all category data
- Regularly review and audit category access logs

## Future Enhancements

### Advanced Features (Coming Soon)
- **Category Templates:** Reusable category configurations and templates
- **Bulk Operations:** Batch category operations and bulk updates
- **Advanced Sorting:** Custom sort orders and priority management
- **Category Analytics:** Detailed performance and usage analytics

### Enhanced Management (Planned)
- **Import/Export:** Category data import and export capabilities
- **Localization:** Multi-language category support
- **Advanced Content:** Rich media content and advanced content types
- **Category Recommendations:** AI-powered category suggestions

## API Versioning
- Current version: 1.0.0
- Breaking changes will increment major version
- New features increment minor version
- Bug fixes increment patch version
- Deprecation notices provided 90 days before removal

## Support and Documentation
- **API Documentation:** Complete OpenAPI 3.0 specification available
- **Integration Support:** Technical support for API integration
- **Best Practices:** Guidance on effective category management
- **Updates:** Regular updates on new features and capabilities
- **Community:** Developer community for tips and best practices

## Compliance Notes

### Data Handling
- All category data handled securely and in compliance with privacy regulations
- Change logs maintained for audit and compliance purposes
- User attribution tracked for accountability
- Appropriate data retention policies for category information

### Access Control
- Strict permission-based access control for administrative functions
- Public read access for category browsing and navigation
- Complete audit trail for all category operations
- Regular security reviews and access monitoring

### Content Management
- Category content subject to platform content policies
- Administrative oversight for all category modifications
- Proper validation and constraint enforcement
- User-friendly error messages and guidance
