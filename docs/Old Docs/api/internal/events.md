# Event Management System - Internal Documentation

## Overview
Comprehensive event management system that provides complete event lifecycle management, artist coordination, application processing, ticket sales, and integrated payment processing. This system handles multi-tenant event management with role-based permissions, custom artist events, event categorization, add-ons management, and Schema.org SEO optimization. It serves as the central hub for all event-related functionality including public event discovery, private event management, and integrated e-commerce capabilities.

## Architecture
- **Type:** Route Handler (Event Management System)
- **Dependencies:** 
  - Express.js router
  - MySQL database connection
  - JWT middleware for authentication
  - Permission middleware for role-based access
  - Multer for file uploads
  - Geocoding service for venue location
  - Event schema service for SEO
  - Stripe service for payment processing
- **Database Tables:** 
  - `events` - Main event records
  - `event_types` - Event categorization
  - `event_applications` - Artist applications
  - `event_images` - Event media
  - `event_categories` - Event classification
  - `artist_custom_events` - Personal artist events
  - `event_available_addons` - Event add-ons
  - `event_application_fields` - Custom application fields
  - `event_tickets` - Ticket types
  - `ticket_purchases` - Ticket sales
  - `pending_images` - Temporary image storage
- **External APIs:** 
  - Geocoding service for venue coordinates
  - Stripe for payment processing
  - Schema.org for SEO optimization

## Functions/Endpoints

### Event Management
#### GET /
- **Purpose:** List and search events with comprehensive filtering
- **Parameters:** promoter_id, event_status, allow_applications, application_status (all optional)
- **Returns:** Array of events with event type information and filtering
- **Errors:** 500 for database errors
- **Usage Example:** Public event discovery and promoter event management
- **Special Features:**
  - Flexible filtering with multiple parameters
  - Event type information inclusion via JOIN
  - Comma-separated status filtering support
  - Chronological ordering by start date
  - Public access for event discovery
  - Comprehensive event listing with metadata

#### GET /my-events
- **Purpose:** Get artist's custom personal events
- **Parameters:** None (uses authenticated user ID)
- **Returns:** Array of artist's custom events ordered by date
- **Errors:** 500 for database errors
- **Usage Example:** Artist dashboard personal event management
- **Special Features:**
  - Authentication required for access
  - User-specific event filtering
  - Chronological ordering (newest first)
  - Personal event management interface
  - Artist-only access control
  - Custom event type support

#### GET /types
- **Purpose:** Get available event types for categorization
- **Parameters:** None
- **Returns:** Array of active event types
- **Errors:** 500 for database errors
- **Usage Example:** Event creation form population
- **Special Features:**
  - Public access for event type discovery
  - Active-only filtering for current types
  - Alphabetical ordering for user interface
  - Event categorization support
  - Type-based event organization
  - Consolidated from separate event-types module

#### GET /:id
- **Purpose:** Get detailed information for specific event
- **Parameters:** Event ID (URL parameter)
- **Returns:** Complete event details with type information
- **Errors:** 404 for event not found, 500 for database errors
- **Usage Example:** Event detail pages and information display
- **Special Features:**
  - Public access for event information
  - Event type information via JOIN
  - Complete event metadata retrieval
  - SEO-friendly event details
  - Comprehensive event information
  - Type description inclusion

#### POST /
- **Purpose:** Create new event with comprehensive features
- **Parameters:** Extensive event creation data including venue, dates, applications, fees
- **Returns:** Created event details with generated information
- **Errors:** 500 for creation errors
- **Usage Example:** Event creation by promoters
- **Special Features:**
  - Authentication and events permission required
  - Automatic geocoding for venue coordinates
  - Schema.org JSON-LD generation for SEO
  - Image processing and association
  - Comprehensive venue information handling
  - Application settings configuration
  - Fee structure setup (admission, application, booth, jury)
  - SEO metadata generation (title, description, keywords)
  - Automatic event status setting
  - Promoter association via JWT token

#### PUT /:id
- **Purpose:** Update existing event information
- **Parameters:** Event ID and update data
- **Returns:** Updated event details with type information
- **Errors:** 500 for update errors
- **Usage Example:** Event modification and maintenance
- **Special Features:**
  - Authentication and events permission required
  - Comprehensive field update support
  - Venue information updates
  - Application settings modifications
  - Fee structure adjustments
  - SEO metadata updates
  - Event status management
  - Automatic timestamp updates

#### DELETE /:id
- **Purpose:** Archive event (soft delete)
- **Parameters:** Event ID (URL parameter)
- **Returns:** Success confirmation
- **Errors:** 500 for archive errors
- **Usage Example:** Event lifecycle management
- **Special Features:**
  - Authentication and events permission required
  - Soft delete via status change to 'archived'
  - Data preservation for historical records
  - Automatic timestamp updates
  - Safe event removal without data loss

#### POST /:id/renew
- **Purpose:** Create new event for next year based on existing event
- **Parameters:** Event ID to renew
- **Returns:** New event details for next year
- **Errors:** 404 for event not found, 500 for creation errors
- **Usage Example:** Annual event renewal and continuation
- **Special Features:**
  - Authentication and events permission required
  - Automatic date advancement (adds 1 year)
  - Template-based event creation
  - Title update with year suffix
  - Draft status for new event
  - Application status reset to 'closed'
  - Complete event duplication with modifications

### Artist Management
#### GET /:id/artists
- **Purpose:** List artists participating in event (public view)
- **Parameters:** Event ID (URL parameter)
- **Returns:** List of accepted/confirmed artists with public profiles
- **Errors:** 500 for database errors
- **Usage Example:** Public artist directory for events
- **Special Features:**
  - Public access for artist discovery
  - Accepted/confirmed artists only
  - Comprehensive artist profile information
  - Business and personal profile data
  - Social media links inclusion
  - Art categories and mediums display
  - Location information (city, state)
  - Portfolio URL and website links
  - Application status labeling
  - Profile image and bio display

### Custom Artist Events
#### POST /custom
- **Purpose:** Create personal event for authenticated artist
- **Parameters:** Custom event data (title, description, date, location, type)
- **Returns:** Created custom event details
- **Errors:** 500 for creation errors
- **Usage Example:** Artist personal event management
- **Special Features:**
  - Authentication required for access
  - Artist-specific event creation
  - Personal event type support
  - Location and description handling
  - Automatic timestamp management
  - User ownership association

#### PUT /custom/:id
- **Purpose:** Update personal artist event
- **Parameters:** Custom event ID and update data
- **Returns:** Updated custom event details
- **Errors:** 404 for not found/access denied, 500 for update errors
- **Usage Example:** Personal event modification
- **Special Features:**
  - Authentication and ownership validation
  - Complete field update support
  - Ownership verification before updates
  - Automatic timestamp updates
  - Personal event management

#### DELETE /custom/:id
- **Purpose:** Delete personal artist event
- **Parameters:** Custom event ID (URL parameter)
- **Returns:** Success confirmation
- **Errors:** 404 for not found/access denied, 500 for deletion errors
- **Usage Example:** Personal event removal
- **Special Features:**
  - Authentication and ownership validation
  - Hard delete for personal events
  - Ownership verification before deletion
  - Complete event removal

### Event Images
#### POST /upload
- **Purpose:** Upload event images with temporary storage
- **Parameters:** Image files via multipart form data, optional event_id
- **Returns:** Array of temporary image URLs
- **Errors:** 400 for no files, 404 for unauthorized event, 500 for upload errors
- **Usage Example:** Event image management during creation/editing
- **Special Features:**
  - Authentication required for uploads
  - Multiple file upload support
  - Temporary storage system
  - Event ownership verification
  - Pending image tracking
  - Original filename and MIME type preservation
  - User association for cleanup

#### GET /:id/images
- **Purpose:** Get images associated with event
- **Parameters:** Event ID (URL parameter)
- **Returns:** Array of event images with metadata
- **Errors:** 500 for database errors
- **Usage Example:** Event image display and management
- **Special Features:**
  - Public access for image retrieval
  - Ordered image display (by order_index)
  - Complete image metadata
  - Primary image identification
  - Alt text and friendly names

### Event Categories
#### GET /:id/categories
- **Purpose:** Get categories associated with event
- **Parameters:** Event ID (URL parameter)
- **Returns:** Array of event categories
- **Errors:** 500 for database errors
- **Usage Example:** Event categorization display
- **Special Features:**
  - Public access for category information
  - Category details via JOIN
  - Alphabetical ordering
  - Event classification system

### Event Add-ons Management
#### GET /:id/available-addons
- **Purpose:** Get available add-ons for event
- **Parameters:** Event ID (URL parameter)
- **Returns:** Array of active add-ons ordered by display order
- **Errors:** 500 for database errors
- **Usage Example:** Add-on selection during application process
- **Special Features:**
  - Authentication required for access
  - Active add-ons only
  - Display order and name sorting
  - Add-on pricing and descriptions
  - Event-specific add-on management

#### POST /:id/available-addons
- **Purpose:** Add new add-on to event
- **Parameters:** Event ID and add-on data (name, description, price, order)
- **Returns:** Created add-on details
- **Errors:** 404 for event not found, 403 for access denied, 500 for creation errors
- **Usage Example:** Event add-on configuration by promoters
- **Special Features:**
  - Authentication and events permission required
  - Event ownership or admin access validation
  - Add-on pricing and ordering support
  - Display order management
  - Automatic active status setting

#### PUT /:id/available-addons/:addon_id
- **Purpose:** Update existing event add-on
- **Parameters:** Event ID, add-on ID, and update data
- **Returns:** Success confirmation
- **Errors:** 404 for not found, 403 for access denied, 500 for update errors
- **Usage Example:** Add-on modification and management
- **Special Features:**
  - Authentication and events permission required
  - Event and add-on ownership validation
  - Complete field update support
  - Active/inactive status management
  - Display order adjustments

#### DELETE /:id/available-addons/:addon_id
- **Purpose:** Delete event add-on
- **Parameters:** Event ID and add-on ID
- **Returns:** Success confirmation
- **Errors:** 404 for not found, 403 for access denied, 500 for deletion errors
- **Usage Example:** Add-on removal and cleanup
- **Special Features:**
  - Authentication and events permission required
  - Event and add-on ownership validation
  - Complete add-on removal
  - Relationship validation

### Application Fields Management
#### GET /:id/application-fields
- **Purpose:** Get custom application fields for event
- **Parameters:** Event ID (URL parameter)
- **Returns:** Array of application fields ordered by display order
- **Errors:** 500 for database errors
- **Usage Example:** Dynamic application form generation
- **Special Features:**
  - Authentication required for access
  - Display order and name sorting
  - Field type and requirement information
  - Verified user skip options
  - Custom field descriptions

#### POST /:id/application-fields
- **Purpose:** Add custom application field to event
- **Parameters:** Event ID and field data (type, name, description, requirements)
- **Returns:** Created field details
- **Errors:** 404 for event not found, 403 for access denied, 500 for creation errors
- **Usage Example:** Custom application form configuration
- **Special Features:**
  - Authentication and events permission required
  - Event ownership or admin access validation
  - Field type specification
  - Requirement and skip logic configuration
  - Display order management

#### PUT /:id/application-fields/:field_id
- **Purpose:** Update custom application field
- **Parameters:** Event ID, field ID, and update data
- **Returns:** Success confirmation
- **Errors:** 404 for not found, 403 for access denied, 500 for update errors
- **Usage Example:** Application field modification
- **Special Features:**
  - Authentication and events permission required
  - Event and field ownership validation
  - Complete field configuration updates
  - Requirement and skip logic modifications

#### DELETE /:id/application-fields/:field_id
- **Purpose:** Delete custom application field
- **Parameters:** Event ID and field ID
- **Returns:** Success confirmation
- **Errors:** 404 for not found, 403 for access denied, 500 for deletion errors
- **Usage Example:** Application field cleanup
- **Special Features:**
  - Authentication and events permission required
  - Event and field ownership validation
  - Complete field removal
  - Form structure cleanup

### Ticket Sales System
#### GET /:id/tickets
- **Purpose:** Get available tickets for event (public)
- **Parameters:** Event ID (URL parameter)
- **Returns:** Array of active tickets with pricing and availability
- **Errors:** 500 for database errors
- **Usage Example:** Public ticket information display
- **Special Features:**
  - Public access for ticket discovery
  - Active tickets only
  - Price-ordered display (lowest first)
  - Availability and sold quantity information
  - Ticket type descriptions

#### POST /:id/tickets
- **Purpose:** Create new ticket type for event
- **Parameters:** Event ID and ticket data (type, price, quantity, description)
- **Returns:** Created ticket details
- **Errors:** 403 for access denied, 500 for creation errors
- **Usage Example:** Ticket type configuration by promoters
- **Special Features:**
  - Authentication required
  - Event ownership validation
  - Tickets permission verification
  - Price and quantity validation
  - Ticket type and description management

#### PUT /:id/tickets/:ticketId
- **Purpose:** Update existing ticket type
- **Parameters:** Event ID, ticket ID, and update data
- **Returns:** Success confirmation
- **Errors:** 403 for access denied, 500 for update errors
- **Usage Example:** Ticket modification and pricing updates
- **Special Features:**
  - Authentication and ownership validation
  - Tickets permission verification
  - Price and quantity updates
  - Ticket type modifications

#### DELETE /:id/tickets/:ticketId
- **Purpose:** Delete ticket type (if no sales)
- **Parameters:** Event ID and ticket ID
- **Returns:** Success confirmation
- **Errors:** 400 for existing sales, 403 for access denied, 500 for deletion errors
- **Usage Example:** Ticket type cleanup
- **Special Features:**
  - Authentication and ownership validation
  - Sales validation (prevents deletion if sold)
  - Complete ticket type removal
  - Sales protection logic

#### POST /:id/tickets/:ticketId/purchase
- **Purpose:** Purchase tickets with Stripe payment integration
- **Parameters:** Event ID, ticket ID, and purchase data (email, name, quantity)
- **Returns:** Payment intent and ticket information
- **Errors:** 400 for validation errors, 404 for not found, 500 for processing errors
- **Usage Example:** Public ticket purchasing
- **Special Features:**
  - Public access for ticket purchases
  - Stripe payment intent creation
  - Unique ticket code generation
  - Availability validation
  - Pending purchase tracking
  - Email and name validation
  - Quantity and pricing calculations
  - Payment metadata inclusion

## Data Models

### Event Structure
```javascript
{
  id: number,                         // Event ID
  promoter_id: number,                // Promoter user ID
  event_type_id: number,              // Event type ID
  parent_id: number,                  // Parent event ID (optional)
  series_id: number,                  // Series ID (optional)
  title: string,                      // Event title
  description: text,                  // Event description
  short_description: text,            // Short description
  event_status: string,               // Event status (active, draft, archived)
  application_status: string,         // Application status
  allow_applications: boolean,        // Allow applications flag
  start_date: datetime,               // Event start date
  end_date: datetime,                 // Event end date
  application_deadline: datetime,     // Application deadline
  jury_date: datetime,                // Jury review date
  notification_date: datetime,        // Notification date
  venue_name: string,                 // Venue name
  venue_address: string,              // Venue address
  venue_city: string,                 // Venue city
  venue_state: string,                // Venue state
  venue_zip: string,                  // Venue ZIP code
  venue_country: string,              // Venue country
  venue_capacity: number,             // Venue capacity
  latitude: decimal,                  // Venue latitude
  longitude: decimal,                 // Venue longitude
  age_restrictions: string,           // Age restrictions
  age_minimum: number,                // Minimum age
  dress_code: string,                 // Dress code
  has_rsvp: boolean,                  // RSVP required flag
  has_tickets: boolean,               // Tickets available flag
  rsvp_url: string,                   // RSVP URL
  parking_info: text,                 // Parking information
  parking_fee: decimal,               // Parking fee
  parking_details: text,              // Parking details
  accessibility_info: text,           // Accessibility information
  admission_fee: decimal,             // Admission fee
  application_fee: decimal,           // Application fee
  booth_fee: decimal,                 // Booth fee
  jury_fee: decimal,                  // Jury fee
  max_applications: number,           // Maximum applications
  max_artists: number,                // Maximum artists
  seo_title: string,                  // SEO title
  meta_description: text,             // Meta description
  event_keywords: text,               // Event keywords
  event_schema: json,                 // Schema.org JSON-LD
  event_tags: json,                   // Event tags
  created_at: timestamp,              // Creation timestamp
  updated_at: timestamp,              // Last update timestamp
  created_by: number,                 // Creator user ID
  updated_by: number,                 // Last updater user ID
  
  // Joined fields
  event_type_name: string,            // Event type name (from JOIN)
  event_type_description: text        // Event type description (from JOIN)
}
```

### Custom Event Structure
```javascript
{
  id: number,                         // Custom event ID
  artist_id: number,                  // Artist user ID
  title: string,                      // Event title
  description: text,                  // Event description
  event_date: datetime,               // Event date
  location: string,                   // Event location
  event_type: string,                 // Event type
  created_at: timestamp,              // Creation timestamp
  updated_at: timestamp               // Last update timestamp
}
```

### Ticket Structure
```javascript
{
  id: number,                         // Ticket ID
  event_id: number,                   // Event ID
  ticket_type: string,                // Ticket type name
  price: decimal,                     // Ticket price
  quantity_available: number,         // Available quantity
  quantity_sold: number,              // Sold quantity
  description: text,                  // Ticket description
  is_active: boolean,                 // Active status
  created_at: timestamp,              // Creation timestamp
  updated_at: timestamp               // Last update timestamp
}
```

### Ticket Purchase Structure
```javascript
{
  id: number,                         // Purchase ID
  event_id: number,                   // Event ID
  ticket_id: number,                  // Ticket ID
  buyer_email: string,                // Buyer email
  buyer_name: string,                 // Buyer name
  quantity: number,                   // Quantity purchased
  unit_price: decimal,                // Unit price
  total_price: decimal,               // Total price
  unique_code: string,                // Unique ticket code
  stripe_payment_intent_id: string,   // Stripe payment intent ID
  status: string,                     // Purchase status
  created_at: timestamp,              // Purchase timestamp
  updated_at: timestamp               // Last update timestamp
}
```

### Add-on Structure
```javascript
{
  id: number,                         // Add-on ID
  event_id: number,                   // Event ID
  addon_name: string,                 // Add-on name
  addon_description: text,            // Add-on description
  addon_price: decimal,               // Add-on price
  display_order: number,              // Display order
  is_active: boolean,                 // Active status
  created_at: timestamp,              // Creation timestamp
  updated_at: timestamp               // Last update timestamp
}
```

### Application Field Structure
```javascript
{
  id: number,                         // Field ID
  event_id: number,                   // Event ID
  field_type: string,                 // Field type
  field_name: string,                 // Field name
  field_description: text,            // Field description
  is_required: boolean,               // Required flag
  verified_can_skip: boolean,         // Verified user skip flag
  display_order: number,              // Display order
  created_at: timestamp,              // Creation timestamp
  updated_at: timestamp               // Last update timestamp
}
```

## Business Logic

### Event Creation Workflow
1. **Authentication Validation:** Verify user authentication and events permission
2. **Data Processing:** Extract and validate event creation data
3. **Geocoding:** Convert venue address to coordinates using geocoding service
4. **Database Insertion:** Create event record with comprehensive data
5. **Schema Generation:** Generate Schema.org JSON-LD for SEO optimization
6. **Image Processing:** Associate uploaded images with event
7. **Response Formatting:** Return cleaned event data for frontend

### Event Renewal Process
1. **Event Retrieval:** Get original event data for template
2. **Date Calculation:** Add one year to start and end dates
3. **Title Update:** Append year to event title
4. **Status Reset:** Set new event to draft status
5. **Application Reset:** Close applications for new event
6. **Database Creation:** Create new event with modified data

### Ticket Purchase Flow
1. **Validation:** Validate buyer information and quantity
2. **Availability Check:** Verify ticket availability
3. **Code Generation:** Generate unique ticket codes
4. **Payment Intent:** Create Stripe payment intent
5. **Pending Records:** Create pending purchase records
6. **Response:** Return payment information for frontend

### Artist Profile Transformation
1. **Data Retrieval:** Get artist application and profile data
2. **Profile Merging:** Combine business and personal profile information
3. **Location Formatting:** Format city and state display
4. **Status Labeling:** Convert application status to display labels
5. **Social Media:** Include social media links and portfolio URLs

## Environment Variables
- No domain-specific environment variables needed for this module
- Database connection handled by shared configuration
- Stripe integration uses shared Stripe service
- Geocoding service uses shared configuration

## Security Considerations
- **Authentication:** JWT token verification for protected endpoints
- **Permission Validation:** Role-based access control for events permission
- **Ownership Validation:** Strict ownership validation for event modifications
- **Data Isolation:** Users only access their own events and data
- **Input Validation:** Comprehensive validation of all parameters
- **SQL Injection Protection:** Parameterized queries throughout
- **File Upload Security:** Secure file handling with validation
- **Payment Security:** Secure Stripe integration with metadata

## Performance Considerations
- **Database Indexing:** Optimized queries on event_id, promoter_id, user_id
- **Query Optimization:** Efficient JOINs and filtering for event listings
- **Image Handling:** Temporary storage system for efficient uploads
- **Pagination:** Consider pagination for large event lists
- **Caching:** Consider caching for frequently accessed event data
- **Connection Pooling:** Database connection management for concurrent operations

## Testing
- **Unit Tests:** Should cover all business logic and data transformations
- **Integration Tests:** Test database operations and external service integration
- **Permission Tests:** Test role-based access control and ownership validation
- **Payment Tests:** Test Stripe integration and ticket purchase flow
- **Upload Tests:** Test image upload and temporary storage system
- **Security Tests:** Verify authentication and authorization mechanisms

## Error Handling
- **Authentication Errors:** Clear error messages for authentication failures
- **Permission Errors:** Specific error messages for permission violations
- **Validation Errors:** Comprehensive validation error messages
- **Database Errors:** Proper handling of database connection and query errors
- **Payment Errors:** Robust error handling for Stripe integration
- **File Upload Errors:** Proper handling of upload failures and validation
- **User-Friendly Messages:** Clear error messages for API consumers

## Common Use Cases
- **Event Discovery:** Public event browsing and search
- **Event Management:** Complete event lifecycle management by promoters
- **Artist Applications:** Artist application submission and management
- **Ticket Sales:** Public ticket purchasing with payment processing
- **Personal Events:** Artist personal event management
- **Event Configuration:** Add-ons and custom fields configuration
- **Event Renewal:** Annual event continuation and template reuse

## Integration Points
- **User System:** Coordinates with user system for authentication and profiles
- **Application System:** Integrates with application system for artist management
- **Payment System:** Integrates with Stripe for ticket sales and payments
- **Media System:** Coordinates with media system for image management
- **Geocoding Service:** Integrates with geocoding for venue coordinates
- **Schema Service:** Integrates with schema service for SEO optimization
- **Email System:** Coordinates with email system for notifications

## API Consistency
- **Response Format:** Consistent JSON response structure across all endpoints
- **Error Handling:** Standardized error response format with appropriate HTTP status codes
- **Authentication:** Consistent JWT token handling and permission validation
- **Validation:** Consistent input validation and error messaging
- **Pagination:** Consider consistent pagination across list endpoints
- **Filtering:** Consistent filtering patterns for search functionality

## Future Enhancements
- **Advanced Search:** More sophisticated search and filtering capabilities
- **Event Analytics:** Detailed event performance and engagement analytics
- **Bulk Operations:** Bulk event operations and batch processing
- **Event Templates:** Reusable event templates for common event types
- **Integration APIs:** External calendar and event platform integration
- **Mobile Optimization:** Mobile-optimized event management interface
- **Real-time Updates:** Real-time event updates and notifications
- **Advanced Ticketing:** More sophisticated ticketing features and pricing

## Development Notes
- **Comprehensive System:** Handles complete event management lifecycle
- **Multi-tenant Support:** Supports multiple promoters and event types
- **Permission Integration:** Complete role-based access control
- **Payment Integration:** Full Stripe payment processing integration
- **SEO Optimization:** Schema.org integration for search optimization
- **Performance Focus:** Optimized for high-volume event management
- **Documentation:** Extensive JSDoc documentation for all functions
- **Security Focus:** Security-first design with comprehensive validation

## Business Requirements
- **Event Management:** Complete event lifecycle management capabilities
- **Artist Coordination:** Comprehensive artist application and management
- **Ticket Sales:** Full e-commerce ticket sales with payment processing
- **Custom Events:** Personal event management for artists
- **Event Configuration:** Flexible add-ons and custom fields
- **SEO Optimization:** Search engine optimization with structured data
- **Multi-tenant Support:** Support for multiple promoters and event types
- **Permission Control:** Role-based access control for different user types

## Monitoring and Logging
- **Event Operations:** Comprehensive logging of all event operations
- **Payment Processing:** Monitor ticket sales and payment processing
- **Upload Operations:** Track image upload success and failures
- **Performance Monitoring:** Track query performance for event operations
- **Error Tracking:** Detailed error logging for event operations
- **User Activity:** Monitor user interactions and event management activities

## Data Privacy and Compliance
- **User Data Protection:** Secure handling of promoter and artist data
- **Payment Data Security:** Secure handling of payment information with Stripe
- **Access Control:** Strict access control for event and application data
- **Data Retention:** Appropriate retention policies for event data
- **Privacy Compliance:** Ensure compliance with data privacy regulations
- **Audit Trails:** Comprehensive audit trails for event modifications

## Utility Functions

### generateUniqueTicketCode()
- **Purpose:** Generate unique ticket codes for purchases
- **Returns:** String in format TKT-XXXXXXXX
- **Usage:** Ticket purchase processing and code generation
- **Features:** 8-character alphanumeric code with TKT prefix
