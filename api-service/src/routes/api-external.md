# Online Art Festival API Documentation

## Overview
This document provides comprehensive documentation for the Online Art Festival API system. It covers authentication, available endpoints, request/response formats, and usage examples.

## Base Information

### Base URL
```
https://api2.onlineartfestival.com
```

### Authentication
The API uses JWT (JSON Web Tokens) for authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

### API Keys (3rd Party Access)
For 3rd party integrations, API keys provide access to the system. API keys are managed through the `/api-keys` endpoints and are the foundation of the authentication system.

### Response Format
All responses are returned in JSON format with consistent structure:

**Success Response:**
```json
{
  "data": [...],
  "message": "Success message (optional)"
}
```

**Error Response:**
```json
{
  "error": "Brief error description",
  "details": "Detailed error message (optional)"
}
```

### CSRF Protection
The API implements CSRF protection using cookie-based tokens. Include the CSRF token in requests when required.

## Status Codes

| Code | Description |
|------|-------------|
| 200  | Success |
| 201  | Created |
| 400  | Bad Request |
| 401  | Unauthorized |
| 403  | Forbidden |
| 404  | Not Found |
| 500  | Internal Server Error |

---

# API Keys Management

The API Keys system provides authentication infrastructure for 3rd party access to the Online Art Festival API.

## Base Path
```
/api-keys
```

## Endpoints

### 1. Get API Keys
**GET** `/api-keys`

Returns all API keys for the authenticated user.

**Authentication:** Required (JWT token)

**Response:**
```json
[
  {
    "public_key": "pk_1234567890abcdef",
    "name": "Production API Key",
    "created_at": "2024-01-15T10:30:00.000Z",
    "is_active": true
  },
  {
    "public_key": "pk_0987654321fedcba",
    "name": "Development API Key", 
    "created_at": "2024-01-10T14:20:00.000Z",
    "is_active": true
  }
]
```

### Authentication Error
```json
{
  "error": "No token provided"
}
```

### Usage Examples

#### JavaScript (Fetch API)
```javascript
// Get user's API keys
const response = await fetch('https://api2.onlineartfestival.com/api-keys', {
  headers: {
    'Authorization': `Bearer ${userJwtToken}`,
    'Content-Type': 'application/json'
  }
});
const apiKeys = await response.json();
```

#### cURL
```bash
# Get API keys for authenticated user
curl -X GET "https://api2.onlineartfestival.com/api-keys" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

---

# Events API

The Events API manages event listings, custom events, event types, and event-related operations.

## Base Path
```
/api/events
```

## Endpoints

### 1. Get All Events
**GET** `/api/events`

Returns a list of all events with pagination support.

**Authentication:** Not required

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Summer Art Festival",
      "description": "Annual summer art festival",
      "start_date": "2024-07-01T10:00:00.000Z",
      "end_date": "2024-07-03T18:00:00.000Z",
      "venue_name": "Downtown Gallery",
      "venue_address": "123 Main St",
      "venue_city": "Portland",
      "venue_state": "OR",
      "venue_zip": "97201",
      "event_status": "published",
      "allow_applications": true,
      "application_status": "open",
      "application_deadline": "2024-06-15T23:59:59.000Z",
      "application_fee": 25.00,
      "booth_fee": 150.00,
      "event_type_name": "Art Fair",
      "event_type_description": "Traditional art fair format"
    }
  ],
  "totalPages": 5,
  "currentPage": 1,
  "totalEvents": 47
}
```

### 2. Get Artist's Custom Events
**GET** `/api/events/my-events`

Returns custom events created by the authenticated artist.

**Authentication:** Required (JWT token)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "artist_id": 123,
      "event_name": "Private Studio Tour",
      "event_description": "Exclusive studio visit",
      "event_date": "2024-08-15T14:00:00.000Z",
      "location": "Artist Studio",
      "max_participants": 10,
      "price": 50.00,
      "created_at": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 3. Get Single Event
**GET** `/api/events/:id`

Returns detailed information about a specific event.

**Authentication:** Not required

**Parameters:**
- `id` (path): Event ID

**Response:**
```json
{
  "data": {
    "id": 1,
    "title": "Summer Art Festival",
    "description": "Annual summer art festival with local artists",
    "start_date": "2024-07-01T10:00:00.000Z",
    "end_date": "2024-07-03T18:00:00.000Z",
    "venue_name": "Downtown Gallery",
    "venue_address": "123 Main St",
    "venue_city": "Portland",
    "venue_state": "OR",
    "venue_zip": "97201",
    "event_status": "published",
    "allow_applications": true,
    "application_status": "open",
    "application_deadline": "2024-06-15T23:59:59.000Z",
    "application_fee": 25.00,
    "booth_fee": 150.00,
    "event_type_name": "Art Fair",
    "event_type_description": "Traditional art fair format"
  }
}
```

### 4. Create Event
**POST** `/api/events`

Creates a new event.

**Authentication:** Required (Admin/Promoter only)

**Request Body:**
```json
{
  "title": "New Art Festival",
  "description": "Description of the event",
  "start_date": "2024-09-01T10:00:00.000Z",
  "end_date": "2024-09-03T18:00:00.000Z",
  "venue_name": "Art Center",
  "venue_address": "456 Oak Ave",
  "venue_city": "Seattle",
  "venue_state": "WA",
  "venue_zip": "98101",
  "event_type_id": 1,
  "allow_applications": true,
  "application_deadline": "2024-08-15T23:59:59.000Z",
  "application_fee": 30.00,
  "booth_fee": 200.00
}
```

**Response:**
```json
{
  "data": {
    "id": 25,
    "title": "New Art Festival",
    "event_type_name": "Art Fair",
    // ... other event fields
  }
}
```

### 5. Update Event
**PUT** `/api/events/:id`

Updates an existing event.

**Authentication:** Required (Admin/Promoter only)

**Parameters:**
- `id` (path): Event ID

**Request Body:** Same as Create Event (partial updates supported)

**Response:**
```json
{
  "data": {
    "id": 25,
    "title": "Updated Art Festival",
    // ... updated event fields
  }
}
```

### 6. Delete Event
**DELETE** `/api/events/:id`

Deletes an event.

**Authentication:** Required (Admin only)

**Parameters:**
- `id` (path): Event ID

**Response:**
```json
{
  "message": "Event deleted successfully"
}
```

## Custom Events (Artist-Created)

### 7. Create Custom Event
**POST** `/api/events/custom`

Creates a custom event for the authenticated artist.

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "event_name": "Studio Workshop",
  "event_description": "Hands-on painting workshop",
  "event_date": "2024-08-20T14:00:00.000Z",
  "location": "Artist Studio",
  "max_participants": 15,
  "price": 75.00
}
```

**Response:**
```json
{
  "data": {
    "id": 5,
    "artist_id": 123,
    "event_name": "Studio Workshop",
    "event_description": "Hands-on painting workshop",
    "event_date": "2024-08-20T14:00:00.000Z",
    "location": "Artist Studio",
    "max_participants": 15,
    "price": 75.00,
    "created_at": "2024-01-20T10:30:00.000Z"
  }
}
```

### 8. Update Custom Event
**PUT** `/api/events/custom/:id`

Updates a custom event owned by the authenticated artist.

**Authentication:** Required (JWT token)

**Parameters:**
- `id` (path): Custom event ID

**Request Body:** Same as Create Custom Event (partial updates supported)

**Response:**
```json
{
  "data": {
    "id": 5,
    "event_name": "Updated Studio Workshop",
    // ... updated fields
  }
}
```

### 9. Delete Custom Event
**DELETE** `/api/events/custom/:id`

Deletes a custom event owned by the authenticated artist.

**Authentication:** Required (JWT token)

**Parameters:**
- `id` (path): Custom event ID

**Response:**
```json
{
  "message": "Custom event deleted successfully"
}
```

## Event Applications

### 10. Apply to Event
**POST** `/api/events/:id/apply`

Submits an application to participate in an event.

**Authentication:** Required (JWT token)

**Parameters:**
- `id` (path): Event ID

**Request Body:**
```json
{
  "portfolio_url": "https://example.com/portfolio",
  "artist_statement": "Brief statement about your work",
  "booth_preference": "corner",
  "additional_notes": "Any special requirements"
}
```

**Response:**
```json
{
  "data": {
    "application_id": 42,
    "event_id": 1,
    "artist_id": 123,
    "status": "pending",
    "submitted_at": "2024-01-20T15:30:00.000Z"
  }
}
```

## Event Types (Reference Data)

### 11. Get Event Types
**GET** `/api/events/types`

Returns all active event types for use in event creation and management.

**Authentication:** Not required

**Response:**
```json
[
  {
    "id": 1,
    "name": "Indoor Art Festival",
    "description": "Indoor gallery-based art festival",
    "is_active": 1
  },
  {
    "id": 2,
    "name": "Outdoor Art Festival", 
    "description": "Outdoor park or open-air art festival",
    "is_active": 1
  },
  {
    "id": 3,
    "name": "Gallery Exhibition",
    "description": "Traditional gallery exhibition",
    "is_active": 1
  }
]
```

## Error Examples

### Authentication Error
```json
{
  "error": "No token provided"
}
```

### Validation Error
```json
{
  "error": "Validation failed",
  "details": "Title is required"
}
```

### Not Found Error
```json
{
  "error": "Event not found"
}
```

### Permission Error
```json
{
  "error": "Insufficient permissions"
}
```

## Usage Examples

### JavaScript (Fetch API)
```javascript
// Get all events
const response = await fetch('https://api2.onlineartfestival.com/api/events');
const events = await response.json();

// Get event types (reference data)
const typesResponse = await fetch('https://api2.onlineartfestival.com/api/events/types');
const eventTypes = await typesResponse.json();

// Get authenticated user's custom events
const customEvents = await fetch('https://api2.onlineartfestival.com/api/events/my-events', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Create a custom event
const newEvent = await fetch('https://api2.onlineartfestival.com/api/events/custom', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    event_name: 'Workshop',
    event_description: 'Art workshop',
    event_date: '2024-08-20T14:00:00.000Z',
    location: 'Studio',
    max_participants: 10,
    price: 50.00
  })
});
```

### cURL Examples
```bash
# Get all events
curl -X GET "https://api2.onlineartfestival.com/api/events"

# Get event types (reference data)
curl -X GET "https://api2.onlineartfestival.com/api/events/types"

# Get user's custom events (requires authentication)
curl -X GET "https://api2.onlineartfestival.com/api/events/my-events" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create custom event
curl -X POST "https://api2.onlineartfestival.com/api/events/custom" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "Workshop",
    "event_description": "Art workshop",
    "event_date": "2024-08-20T14:00:00.000Z",
    "location": "Studio",
    "max_participants": 10,
    "price": 50.00
  }'
```

---

# Other API Endpoints

*This section will be populated as route consolidation continues...*

## Coming Soon
- Users API
- Applications API  
# Articles & Content Management API

The Articles API manages blog posts, articles, tags, topics, and content series.

## Base Path
```
/api/articles
```

## Endpoints

### 1. Get All Articles
**GET** `/api/articles`

Returns a list of published articles with pagination support.

**Authentication:** Not required

**Query Parameters:**
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Number of items per page (default: 10)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Art Festival Planning Guide",
      "slug": "art-festival-planning-guide",
      "excerpt": "Complete guide to planning your first art festival",
      "author_id": 123,
      "author_username": "admin",
      "published_at": "2024-01-15T10:00:00.000Z",
      "view_count": 245,
      "reading_time_minutes": 8
    }
  ],
  "totalPages": 3,
  "currentPage": 1,
  "totalArticles": 25
}
```

### 2. Get Article Tags
**GET** `/api/articles/tags`

Returns all available article tags with usage statistics.

**Authentication:** Not required

**Response:**
```json
[
  {
    "id": 1,
    "name": "Art Festivals",
    "slug": "art-festivals",
    "article_count": 12,
    "created_at": "2024-01-01T12:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Artist Tips",
    "slug": "artist-tips",
    "article_count": 8,
    "created_at": "2024-01-05T14:30:00.000Z"
  }
]
```

### 3. Get Article Topics
**GET** `/api/articles/topics`

Returns all available article topics with hierarchical structure.

**Authentication:** Not required

**Response:**
```json
{
  "topics": [
    {
      "id": 1,
      "name": "Getting Started",
      "slug": "getting-started",
      "description": "Articles for new artists and festival organizers",
      "parent_id": null,
      "article_count": 15,
      "child_topics": [
        {
          "id": 2,
          "name": "First Festival",
          "slug": "first-festival",
          "parent_id": 1,
          "article_count": 5
        }
      ]
    }
  ]
}
```

### 4. Get Article Series
**GET** `/api/articles/series`

Returns all available article series.

**Authentication:** Not required

**Response:**
```json
[
  {
    "id": 1,
    "series_name": "Festival Marketing Masterclass",
    "slug": "festival-marketing-masterclass",
    "description": "Complete guide to marketing your art festival",
    "article_count": 6,
    "created_at": "2024-01-10T15:00:00.000Z"
  }
]
```

---

# Products & Variations API

The Products API manages product catalog, inventory, and product variations including variation types and values.

## Base Path
```
/products
```

## Endpoints

### 1. Get All Products
**GET** `/products`

Returns a list of active products with pagination support.

**Authentication:** Not required

**Query Parameters:**
- `vendor_id` (optional): Filter by vendor ID
- `category_id` (optional): Filter by category ID
- `variant_search` (optional): If true, shows child products (variants)

**Response:**
```json
[
  {
    "id": 2000000198,
    "name": "My Painting",
    "price": "12.34",
    "vendor_id": 1000000007,
    "description": "Beautiful artwork description",
    "short_description": "Short description",
    "track_inventory": 1,
    "category_id": 51,
    "sku": "PAINT001",
    "status": "active",
    "product_type": "simple",
    "created_at": "2025-03-19T18:05:33.000Z"
  }
]
```

### 2. Get Product Variations Types
**GET** `/products/variations/types`

Returns all available product variation types (e.g., Size, Color, Material).

**Authentication:** Required (JWT token)

**Response:**
```json
[
  {
    "id": 1,
    "name": "Size",
    "description": "Product size variations",
    "is_active": true,
    "created_at": "2024-01-15T10:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Color",
    "description": "Product color variations",
    "is_active": true,
    "created_at": "2024-01-15T10:00:00.000Z"
  }
]
```

### 3. Create Variation Type
**POST** `/products/variations/types`

Creates a new variation type (e.g., Size, Color).

**Authentication:** Required (JWT token)

**Request Body:**
```json
{
  "name": "Material",
  "description": "Product material variations"
}
```

**Response:**
```json
{
  "id": 3,
  "name": "Material",
  "description": "Product material variations",
  "is_active": true,
  "created_at": "2024-01-20T15:30:00.000Z"
}
```

### 4. Update Variation Type
**PUT** `/products/variations/types/:id`

Updates an existing variation type.

**Authentication:** Required (JWT token)

**Parameters:**
- `id` (path): Variation type ID

**Request Body:**
```json
{
  "name": "Updated Size",
  "description": "Updated description"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Updated Size",
  "description": "Updated description",
  "is_active": true,
  "updated_at": "2024-01-20T15:30:00.000Z"
}
```

### 5. Delete Variation Type
**DELETE** `/products/variations/types/:id`

Deletes a variation type.

**Authentication:** Required (JWT token)

**Parameters:**
- `id` (path): Variation type ID

**Response:**
```json
{
  "message": "Variation type deleted successfully"
}
```

### 6. Get Variation Values for Type
**GET** `/products/variations/types/:id/values`

Returns all values for a specific variation type (e.g., Small, Medium, Large for Size).

**Authentication:** Required (JWT token)

**Parameters:**
- `id` (path): Variation type ID

**Response:**
```json
[
  {
    "id": 1,
    "variation_type_id": 1,
    "value": "Small",
    "sort_order": 1,
    "is_active": true,
    "created_at": "2024-01-15T10:00:00.000Z"
  },
  {
    "id": 2,
    "variation_type_id": 1,
    "value": "Medium",
    "sort_order": 2,
    "is_active": true,
    "created_at": "2024-01-15T10:00:00.000Z"
  }
]
```

### 7. Create Variation Value
**POST** `/products/variations/types/:id/values`

Creates a new value for a variation type.

**Authentication:** Required (JWT token)

**Parameters:**
- `id` (path): Variation type ID

**Request Body:**
```json
{
  "value": "Large",
  "sort_order": 3
}
```

**Response:**
```json
{
  "id": 3,
  "variation_type_id": 1,
  "value": "Large",
  "sort_order": 3,
  "is_active": true,
  "created_at": "2024-01-20T15:30:00.000Z"
}
```

## Error Examples

### Authentication Error
```json
{
  "error": "No token provided"
}
```

### Validation Error
```json
{
  "error": "Validation failed",
  "details": "Name is required"
}
```

### Not Found Error
```json
{
  "error": "Variation type not found"
}
```

## Usage Examples

### JavaScript (Fetch API)
```javascript
// Get all products
const response = await fetch('https://api2.onlineartfestival.com/products');
const products = await response.json();

// Get variation types (requires authentication)
const variationTypes = await fetch('https://api2.onlineartfestival.com/products/variations/types', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Create variation type
const newVariationType = await fetch('https://api2.onlineartfestival.com/products/variations/types', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Material',
    description: 'Product material variations'
  })
});
```

### cURL Examples
```bash
# Get all products (public)
curl -X GET "https://api2.onlineartfestival.com/products"

# Get variation types (requires authentication)
curl -X GET "https://api2.onlineartfestival.com/products/variations/types" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Create variation type
curl -X POST "https://api2.onlineartfestival.com/products/variations/types" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Material",
    "description": "Product material variations"
  }'
```

---

# Other API Endpoints

*This section will be populated as route consolidation continues...*

## Coming Soon
- Users API
- Applications API  

## Future API Additions

The following APIs are planned for future documentation:

- User Management API
- Cart API
- Admin API
- And more...

---

*Last updated: January 2024*
*This documentation is maintained in parallel with API development and route consolidation.*
*Added API Keys documentation - these are critical authentication infrastructure*
*Added Articles/Content Management API documentation after route consolidation*
*Added Products & Variations API documentation after variations consolidation*
