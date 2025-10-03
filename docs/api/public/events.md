# Event Management API

## Authentication
Most event management endpoints require API key authentication. Public endpoints (event listings, artist listings, ticket information) are accessible without authentication.

**Headers:**
- `Authorization: Bearer {api_key}` (required for protected endpoints)
- `Content-Type: application/json`

## Event Management Endpoints

### List Events
`GET /api/events`

Get list of events with optional filtering.

**Query Parameters:**
- `promoter_id`: Filter by promoter ID (optional)
- `event_status`: Filter by event status, comma-separated (optional)
- `allow_applications`: Filter by application acceptance (1 or 0) (optional)
- `application_status`: Filter by application status (optional)

**Response (200 OK):**
```json
[
  {
    "id": 123,
    "promoter_id": 456,
    "event_type_id": 2,
    "title": "Annual Art Festival 2025",
    "description": "Celebrating local artists and creativity",
    "short_description": "Local art celebration",
    "event_status": "active",
    "application_status": "accepting",
    "allow_applications": true,
    "start_date": "2025-06-15T10:00:00Z",
    "end_date": "2025-06-17T18:00:00Z",
    "venue_name": "Downtown Art Center",
    "venue_city": "Portland",
    "venue_state": "OR",
    "latitude": 45.5152,
    "longitude": -122.6784,
    "event_type_name": "Art Festival",
    "created_at": "2025-01-15T10:00:00Z"
  }
]
```

### Get Event Details
`GET /api/events/{id}`

Get detailed information for a specific event.

**Parameters:**
- `id`: Event ID (path parameter)

**Response (200 OK):**
```json
{
  "id": 123,
  "promoter_id": 456,
  "event_type_id": 2,
  "title": "Annual Art Festival 2025",
  "description": "Celebrating local artists and creativity with workshops, exhibitions, and live demonstrations.",
  "short_description": "Local art celebration",
  "event_status": "active",
  "application_status": "accepting",
  "allow_applications": true,
  "start_date": "2025-06-15T10:00:00Z",
  "end_date": "2025-06-17T18:00:00Z",
  "application_deadline": "2025-05-15T23:59:59Z",
  "venue_name": "Downtown Art Center",
  "venue_address": "123 Art Street",
  "venue_city": "Portland",
  "venue_state": "OR",
  "venue_zip": "97201",
  "venue_capacity": 500,
  "latitude": 45.5152,
  "longitude": -122.6784,
  "age_restrictions": "all_ages",
  "admission_fee": 15.00,
  "application_fee": 25.00,
  "booth_fee": 150.00,
  "max_applications": 100,
  "event_type_name": "Art Festival",
  "event_type_description": "Community art festivals and exhibitions",
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z"
}
```

### Get Event Types
`GET /api/events/types`

Get list of available event types.

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "name": "Art Festival",
    "description": "Community art festivals and exhibitions",
    "is_active": true
  },
  {
    "id": 2,
    "name": "Workshop",
    "description": "Educational workshops and classes",
    "is_active": true
  }
]
```

### Create Event
`POST /api/events`

Create a new event (requires authentication and events permission).

**Request Body:**
```json
{
  "event_type_id": 2,
  "title": "Summer Art Workshop",
  "description": "Intensive summer workshop for emerging artists",
  "short_description": "Summer art workshop",
  "start_date": "2025-07-15T09:00:00Z",
  "end_date": "2025-07-19T17:00:00Z",
  "venue_name": "Art Studio Downtown",
  "venue_address": "456 Creative Ave",
  "venue_city": "Portland",
  "venue_state": "OR",
  "venue_zip": "97202",
  "venue_capacity": 25,
  "allow_applications": true,
  "application_status": "accepting",
  "application_deadline": "2025-06-15T23:59:59Z",
  "application_fee": 35.00,
  "max_applications": 25,
  "age_restrictions": "18_plus",
  "seo_title": "Summer Art Workshop 2025 - Portland",
  "meta_description": "Join our intensive summer art workshop in Portland",
  "images": [
    "/temp_images/events/workshop_image_1.jpg",
    "/temp_images/events/workshop_image_2.jpg"
  ]
}
```

**Required Fields:**
- `event_type_id`: Event type identifier
- `title`: Event title
- `start_date`: Event start date (ISO 8601)
- `end_date`: Event end date (ISO 8601)
- `venue_name`: Venue name
- `venue_city`: Venue city
- `venue_state`: Venue state

**Response (201 Created):**
```json
{
  "id": 124,
  "title": "Summer Art Workshop",
  "description": "Intensive summer workshop for emerging artists",
  "short_description": "Summer art workshop",
  "event_type_name": "Workshop",
  "event_status": "active",
  "start_date": "2025-07-15T09:00:00Z",
  "end_date": "2025-07-19T17:00:00Z",
  "venue_name": "Art Studio Downtown",
  "venue_city": "Portland",
  "venue_state": "OR",
  "latitude": 45.5231,
  "longitude": -122.6765,
  "created_at": "2025-01-20T14:30:00Z"
}
```

### Update Event
`PUT /api/events/{id}`

Update an existing event (requires authentication and events permission).

**Parameters:**
- `id`: Event ID (path parameter)

**Request Body (all fields optional):**
```json
{
  "title": "Updated Summer Art Workshop",
  "description": "Updated description for the workshop",
  "start_date": "2025-07-16T09:00:00Z",
  "end_date": "2025-07-20T17:00:00Z",
  "venue_capacity": 30,
  "application_fee": 40.00,
  "event_status": "active"
}
```

**Response (200 OK):**
```json
{
  "id": 124,
  "title": "Updated Summer Art Workshop",
  "description": "Updated description for the workshop",
  "event_type_name": "Workshop",
  "event_status": "active",
  "start_date": "2025-07-16T09:00:00Z",
  "end_date": "2025-07-20T17:00:00Z",
  "venue_name": "Art Studio Downtown",
  "updated_at": "2025-01-21T10:15:00Z"
}
```

### Archive Event
`DELETE /api/events/{id}`

Archive an event (soft delete, requires authentication and events permission).

**Parameters:**
- `id`: Event ID (path parameter)

**Response (200 OK):**
```json
{
  "success": true
}
```

### Renew Event
`POST /api/events/{id}/renew`

Create a new event for next year based on existing event (requires authentication and events permission).

**Parameters:**
- `id`: Event ID to renew (path parameter)

**Response (201 Created):**
```json
{
  "id": 125,
  "title": "Annual Art Festival 2026",
  "description": "Celebrating local artists and creativity",
  "event_type_name": "Art Festival",
  "event_status": "draft",
  "start_date": "2026-06-15T10:00:00Z",
  "end_date": "2026-06-17T18:00:00Z",
  "venue_name": "Downtown Art Center",
  "created_at": "2025-01-21T11:00:00Z"
}
```

## Artist Management Endpoints

### Get Event Artists
`GET /api/events/{id}/artists`

Get list of artists participating in an event (accepted/confirmed only).

**Parameters:**
- `id`: Event ID (path parameter)

**Response (200 OK):**
```json
{
  "artists": [
    {
      "artist_id": 789,
      "name": "Jane Smith Art Studio",
      "display_name": "Jane Smith Art Studio",
      "bio": "Contemporary artist specializing in mixed media sculptures",
      "location": "Portland, OR",
      "profile_image": "/images/profiles/jane_smith.jpg",
      "portfolio_url": "https://janesmith.art",
      "website": "https://janesmithartstudio.com",
      "social_instagram": "@janesmithart",
      "social_facebook": "JaneSmithArtStudio",
      "art_categories": "Sculpture, Mixed Media",
      "art_mediums": "Clay, Metal, Found Objects",
      "status_label": "Exhibiting",
      "application_status": "confirmed"
    }
  ],
  "total": 1,
  "event_id": 123
}
```

## Custom Artist Events

### Get My Custom Events
`GET /api/events/my-events`

Get custom events for authenticated artist.

**Response (200 OK):**
```json
[
  {
    "id": 456,
    "artist_id": 789,
    "title": "Studio Open House",
    "description": "Visit my studio and see works in progress",
    "event_date": "2025-08-15T14:00:00Z",
    "location": "123 Artist Lane, Portland, OR",
    "event_type": "open_house",
    "created_at": "2025-01-20T16:00:00Z",
    "updated_at": "2025-01-20T16:00:00Z"
  }
]
```

### Create Custom Event
`POST /api/events/custom`

Create a personal event for authenticated artist.

**Request Body:**
```json
{
  "title": "Studio Open House",
  "description": "Visit my studio and see works in progress",
  "event_date": "2025-08-15T14:00:00Z",
  "location": "123 Artist Lane, Portland, OR",
  "event_type": "open_house"
}
```

**Required Fields:**
- `title`: Event title
- `event_date`: Event date (ISO 8601)

**Response (201 Created):**
```json
{
  "message": "Custom event created successfully",
  "event": {
    "id": 456,
    "artist_id": 789,
    "title": "Studio Open House",
    "description": "Visit my studio and see works in progress",
    "event_date": "2025-08-15T14:00:00Z",
    "location": "123 Artist Lane, Portland, OR",
    "event_type": "open_house",
    "created_at": "2025-01-20T16:00:00Z",
    "updated_at": "2025-01-20T16:00:00Z"
  }
}
```

### Update Custom Event
`PUT /api/events/custom/{id}`

Update a personal event (requires ownership).

**Parameters:**
- `id`: Custom event ID (path parameter)

**Request Body:**
```json
{
  "title": "Updated Studio Open House",
  "description": "Updated description",
  "event_date": "2025-08-16T14:00:00Z",
  "location": "Updated location"
}
```

**Response (200 OK):**
```json
{
  "message": "Custom event updated successfully",
  "event": {
    "id": 456,
    "title": "Updated Studio Open House",
    "description": "Updated description",
    "event_date": "2025-08-16T14:00:00Z",
    "location": "Updated location",
    "updated_at": "2025-01-21T12:00:00Z"
  }
}
```

### Delete Custom Event
`DELETE /api/events/custom/{id}`

Delete a personal event (requires ownership).

**Parameters:**
- `id`: Custom event ID (path parameter)

**Response (200 OK):**
```json
{
  "message": "Custom event deleted successfully"
}
```

## Event Images

### Upload Event Images
`POST /api/events/upload`

Upload images for events (requires authentication).

**Request:**
- Content-Type: `multipart/form-data`
- Files: Multiple image files in `images` field
- Query Parameter: `event_id` (optional, for existing events)

**Response (200 OK):**
```json
{
  "urls": [
    "/temp_images/events/image_1_abc123.jpg",
    "/temp_images/events/image_2_def456.jpg"
  ]
}
```

### Get Event Images
`GET /api/events/{id}/images`

Get images associated with an event.

**Parameters:**
- `id`: Event ID (path parameter)

**Response (200 OK):**
```json
{
  "success": true,
  "images": [
    {
      "id": 101,
      "event_id": 123,
      "image_url": "/images/events/festival_main.jpg",
      "friendly_name": "Festival Main Image",
      "is_primary": true,
      "alt_text": "Annual Art Festival main banner",
      "order_index": 0
    },
    {
      "id": 102,
      "event_id": 123,
      "image_url": "/images/events/festival_artists.jpg",
      "friendly_name": "Festival Artists",
      "is_primary": false,
      "alt_text": "Artists at the festival",
      "order_index": 1
    }
  ]
}
```

## Ticket Sales Endpoints

### Get Event Tickets
`GET /api/events/{id}/tickets`

Get available tickets for an event.

**Parameters:**
- `id`: Event ID (path parameter)

**Response (200 OK):**
```json
{
  "success": true,
  "tickets": [
    {
      "id": 201,
      "ticket_type": "General Admission",
      "price": 25.00,
      "quantity_available": 100,
      "quantity_sold": 15,
      "description": "General admission to all festival areas"
    },
    {
      "id": 202,
      "ticket_type": "VIP Pass",
      "price": 75.00,
      "quantity_available": 25,
      "quantity_sold": 3,
      "description": "VIP access with exclusive artist meet & greet"
    }
  ],
  "event_id": 123
}
```

### Create Ticket Type
`POST /api/events/{id}/tickets`

Create a new ticket type for an event (requires authentication, ownership, and tickets permission).

**Parameters:**
- `id`: Event ID (path parameter)

**Request Body:**
```json
{
  "ticket_type": "Early Bird",
  "price": 20.00,
  "quantity_available": 50,
  "description": "Early bird pricing for first 50 tickets"
}
```

**Required Fields:**
- `ticket_type`: Ticket type name
- `price`: Ticket price
- `quantity_available`: Number of tickets available

**Response (201 Created):**
```json
{
  "success": true,
  "ticket": {
    "id": 203,
    "event_id": 123,
    "ticket_type": "Early Bird",
    "price": 20.00,
    "quantity_available": 50,
    "description": "Early bird pricing for first 50 tickets"
  }
}
```

### Purchase Tickets
`POST /api/events/{id}/tickets/{ticketId}/purchase`

Purchase tickets for an event.

**Parameters:**
- `id`: Event ID (path parameter)
- `ticketId`: Ticket type ID (path parameter)

**Request Body:**
```json
{
  "buyer_email": "buyer@example.com",
  "buyer_name": "John Doe",
  "quantity": 2
}
```

**Required Fields:**
- `buyer_email`: Buyer's email address
- `quantity`: Number of tickets (minimum 1)

**Response (200 OK):**
```json
{
  "success": true,
  "payment_intent": {
    "id": "pi_1234567890",
    "client_secret": "pi_1234567890_secret_abc123",
    "amount": 5000
  },
  "ticket_info": {
    "event_title": "Annual Art Festival 2025",
    "ticket_type": "General Admission",
    "quantity": 2,
    "unit_price": 25.00,
    "total_price": 50.00
  }
}
```

## Event Add-ons Management

### Get Event Add-ons
`GET /api/events/{id}/available-addons`

Get available add-ons for an event (requires authentication).

**Parameters:**
- `id`: Event ID (path parameter)

**Response (200 OK):**
```json
[
  {
    "id": 301,
    "event_id": 123,
    "addon_name": "Workshop Materials",
    "addon_description": "Complete set of art materials for workshop",
    "addon_price": 45.00,
    "display_order": 1,
    "is_active": true
  },
  {
    "id": 302,
    "event_id": 123,
    "addon_name": "Lunch Package",
    "addon_description": "Catered lunch for all three days",
    "addon_price": 75.00,
    "display_order": 2,
    "is_active": true
  }
]
```

### Create Event Add-on
`POST /api/events/{id}/available-addons`

Add a new add-on to an event (requires authentication and events permission).

**Parameters:**
- `id`: Event ID (path parameter)

**Request Body:**
```json
{
  "addon_name": "Portfolio Review",
  "addon_description": "One-on-one portfolio review with professional artist",
  "addon_price": 125.00,
  "display_order": 3
}
```

**Required Fields:**
- `addon_name`: Add-on name
- `addon_price`: Add-on price

**Response (200 OK):**
```json
{
  "id": 303,
  "event_id": 123,
  "addon_name": "Portfolio Review",
  "addon_description": "One-on-one portfolio review with professional artist",
  "addon_price": 125.00,
  "display_order": 3,
  "is_active": true
}
```

## Application Fields Management

### Get Application Fields
`GET /api/events/{id}/application-fields`

Get custom application fields for an event (requires authentication).

**Parameters:**
- `id`: Event ID (path parameter)

**Response (200 OK):**
```json
[
  {
    "id": 401,
    "event_id": 123,
    "field_type": "text",
    "field_name": "Artist Statement",
    "field_description": "Brief statement about your artistic practice",
    "is_required": true,
    "verified_can_skip": false,
    "display_order": 1
  },
  {
    "id": 402,
    "event_id": 123,
    "field_type": "file",
    "field_name": "Portfolio Images",
    "field_description": "Upload 3-5 images of recent work",
    "is_required": true,
    "verified_can_skip": true,
    "display_order": 2
  }
]
```

### Create Application Field
`POST /api/events/{id}/application-fields`

Add a custom application field to an event (requires authentication and events permission).

**Parameters:**
- `id`: Event ID (path parameter)

**Request Body:**
```json
{
  "field_type": "textarea",
  "field_name": "Exhibition Experience",
  "field_description": "Describe your previous exhibition experience",
  "is_required": false,
  "verified_can_skip": true,
  "display_order": 3
}
```

**Required Fields:**
- `field_type`: Field type (text, textarea, file, select, etc.)
- `field_name`: Field name/label

**Response (200 OK):**
```json
{
  "id": 403,
  "event_id": 123,
  "field_type": "textarea",
  "field_name": "Exhibition Experience",
  "field_description": "Describe your previous exhibition experience",
  "is_required": false,
  "verified_can_skip": true,
  "display_order": 3
}
```

## Data Types

### Event Object
- `id`: Unique event identifier
- `promoter_id`: ID of the event promoter
- `event_type_id`: Event type identifier
- `title`: Event title
- `description`: Detailed event description
- `short_description`: Brief event summary
- `event_status`: Event status (active, draft, archived)
- `application_status`: Application acceptance status
- `allow_applications`: Whether applications are accepted
- `start_date`: Event start date (ISO 8601)
- `end_date`: Event end date (ISO 8601)
- `application_deadline`: Application deadline (ISO 8601)
- `venue_name`: Venue name
- `venue_address`: Venue street address
- `venue_city`: Venue city
- `venue_state`: Venue state/province
- `venue_zip`: Venue postal code
- `venue_capacity`: Maximum venue capacity
- `latitude`: Venue latitude coordinate
- `longitude`: Venue longitude coordinate
- `age_restrictions`: Age restriction policy
- `admission_fee`: Event admission fee
- `application_fee`: Application submission fee
- `booth_fee`: Vendor booth fee
- `max_applications`: Maximum number of applications
- `created_at`: Creation timestamp (ISO 8601)
- `updated_at`: Last update timestamp (ISO 8601)

### Custom Event Object
- `id`: Unique custom event identifier
- `artist_id`: ID of the artist who created the event
- `title`: Event title
- `description`: Event description
- `event_date`: Event date (ISO 8601)
- `location`: Event location
- `event_type`: Type of custom event
- `created_at`: Creation timestamp (ISO 8601)
- `updated_at`: Last update timestamp (ISO 8601)

### Ticket Object
- `id`: Unique ticket identifier
- `ticket_type`: Ticket type name
- `price`: Ticket price
- `quantity_available`: Total tickets available
- `quantity_sold`: Number of tickets sold
- `description`: Ticket description

### Artist Profile Object
- `artist_id`: Artist user ID
- `name`: Artist or business name
- `display_name`: Display name for public view
- `bio`: Artist biography
- `location`: Artist location (city, state)
- `profile_image`: Profile image URL
- `portfolio_url`: Portfolio website URL
- `website`: Business website URL
- `social_instagram`: Instagram handle
- `social_facebook`: Facebook page
- `art_categories`: Art categories (comma-separated)
- `art_mediums`: Art mediums (comma-separated)
- `status_label`: Display status (Exhibiting, Invited)
- `application_status`: Application status

## Validation Rules

### Event Creation
- `title` is required and cannot be empty
- `start_date` and `end_date` are required and must be valid ISO 8601 dates
- `end_date` must be after `start_date`
- `venue_name`, `venue_city`, and `venue_state` are required
- `event_type_id` must reference a valid event type
- Numeric fields (fees, capacity) must be non-negative

### Custom Event Creation
- `title` is required and cannot be empty
- `event_date` is required and must be a valid ISO 8601 date
- User must be authenticated to create custom events

### Ticket Creation
- `ticket_type` is required and cannot be empty
- `price` must be a non-negative number
- `quantity_available` must be a positive integer
- User must own the event and have tickets permission

### Ticket Purchase
- `buyer_email` must be a valid email address
- `quantity` must be a positive integer
- Sufficient tickets must be available

## Error Responses

### Client Errors (4xx)

**400 Bad Request:**
```json
{
  "error": "Valid buyer email and quantity required"
}
```

**401 Unauthorized:**
```json
{
  "error": "Authentication required"
}
```

**403 Forbidden:**
```json
{
  "error": "Access denied - events permission required"
}
```

```json
{
  "error": "Access denied - not your event"
}
```

**404 Not Found:**
```json
{
  "error": "Event not found"
}
```

```json
{
  "error": "Custom event not found or access denied"
}
```

### Server Errors (5xx)

**500 Internal Server Error:**
```json
{
  "error": "Failed to create event",
  "details": "Database connection error"
}
```

```json
{
  "error": "Failed to process purchase",
  "details": "Payment processing error"
}
```

## Rate Limits
- 100 requests per minute per API key for read operations
- 50 requests per minute per API key for write operations
- 25 requests per minute per API key for ticket purchases

## Example Usage

### Create Art Festival
```bash
# Create new art festival event
curl -X POST https://api.beemeeart.com/api/events \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type_id": 1,
    "title": "Summer Art Festival 2025",
    "description": "Annual celebration of local artists",
    "start_date": "2025-08-15T10:00:00Z",
    "end_date": "2025-08-17T18:00:00Z",
    "venue_name": "City Park Pavilion",
    "venue_city": "Portland",
    "venue_state": "OR",
    "allow_applications": true,
    "application_deadline": "2025-07-15T23:59:59Z",
    "application_fee": 30.00,
    "booth_fee": 200.00
  }'
```

### Search Events by Status
```bash
# Get active events accepting applications
curl "https://api.beemeeart.com/api/events?event_status=active&allow_applications=1"
```

### Purchase Tickets
```bash
# Purchase 2 general admission tickets
curl -X POST https://api.beemeeart.com/api/events/123/tickets/201/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_email": "customer@example.com",
    "buyer_name": "Jane Customer",
    "quantity": 2
  }'
```

### Create Custom Artist Event
```bash
# Create personal studio event
curl -X POST https://api.beemeeart.com/api/events/custom \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Studio Open House",
    "description": "Come see my latest sculptures",
    "event_date": "2025-09-20T14:00:00Z",
    "location": "123 Artist Studio, Portland, OR",
    "event_type": "open_house"
  }'
```

### Upload Event Images
```bash
# Upload images for event
curl -X POST "https://api.beemeeart.com/api/events/upload?event_id=123" \
  -H "Authorization: Bearer your_api_key" \
  -F "images=@festival_banner.jpg" \
  -F "images=@artist_showcase.jpg"
```

## Integration Notes

### Payment Processing
- Ticket purchases create Stripe payment intents
- Payment completion handled via Stripe webhooks
- Unique ticket codes generated for each purchase
- Pending purchases created before payment confirmation

### Image Management
- Images uploaded to temporary storage during event creation
- Permanent association created when event is saved
- Support for multiple images per event
- Automatic image processing and optimization

### SEO Optimization
- Automatic Schema.org JSON-LD generation for events
- SEO-friendly URLs and metadata
- Event structured data for search engines
- Venue geocoding for location-based search

### Artist Integration
- Artist profiles automatically included in event listings
- Application system integration for artist management
- Portfolio and social media link integration
- Artist verification and status management

## Best Practices

### Event Management
- Use descriptive titles and detailed descriptions
- Set appropriate application deadlines and fees
- Configure venue information completely for better discovery
- Use high-quality images for better engagement

### Ticket Sales
- Set realistic pricing and availability
- Provide clear ticket descriptions
- Monitor sales and adjust availability as needed
- Use early bird pricing to encourage early purchases

### Custom Events
- Keep personal events relevant to your artistic practice
- Use clear titles and descriptions
- Include location information for better discoverability
- Update event details as plans change

### Image Uploads
- Use high-quality images for better presentation
- Optimize image sizes for web display
- Include descriptive alt text for accessibility
- Maintain consistent visual branding

## Security Considerations
- Protect API keys and ensure proper authentication
- Validate event ownership before making modifications
- Secure payment processing with Stripe integration
- Monitor ticket sales for fraudulent activity
- Regularly review and audit event permissions

## Future Enhancements

### Advanced Features (Coming Soon)
- **Event Analytics:** Detailed performance metrics and insights
- **Bulk Operations:** Batch event operations and management
- **Advanced Ticketing:** Reserved seating and complex pricing
- **Integration APIs:** External calendar and platform integration

### Enhanced Management (Planned)
- **Event Templates:** Reusable event templates for common types
- **Collaboration:** Multi-promoter event collaboration
- **Mobile Optimization:** Mobile-optimized event management
- **Real-time Updates:** Live event updates and notifications

## API Versioning
- Current version: 1.0.0
- Breaking changes will increment major version
- New features increment minor version
- Bug fixes increment patch version
- Deprecation notices provided 90 days before removal

## Support and Documentation
- **API Documentation:** Complete OpenAPI 3.0 specification available
- **Integration Support:** Technical support for API integration
- **Best Practices:** Guidance on effective event management
- **Updates:** Regular updates on new features and capabilities
- **Community:** Developer community for tips and best practices
