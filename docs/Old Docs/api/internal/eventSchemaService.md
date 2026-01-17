# eventSchemaService.js - Internal Documentation

## Overview
Event Schema.org JSON-LD service for SEO optimization on the Beemeeart platform. Generates comprehensive structured data for events, venues, organizers, and pricing to improve search engine visibility and understanding of event content.

## Architecture
- **Type:** Service Layer (Business Logic) - SEO/Schema Generation
- **Dependencies:** None (pure JavaScript service)
- **Database Tables:** None (operates on provided data)
- **External APIs:** None (generates Schema.org compliant JSON-LD)

## Core Functions

### Event Schema Generation

#### generateEventSchema(event, promoter, images)
- **Purpose:** Generate complete Event Schema.org JSON-LD for SEO optimization
- **Parameters:**
  - `event` (Object): Event data from database
  - `promoter` (Object): Promoter/organizer data
  - `images` (Array): Event image URLs
- **Returns:** Object - Complete Schema.org JSON-LD structure
- **Schema Type:** Event (https://schema.org/Event)
- **Usage Example:** `const schema = eventSchemaService.generateEventSchema(eventData, promoterData, imageUrls)`

#### Schema Properties Generated:
- **Basic Event Info:** name, description, startDate, endDate
- **Event Status:** EventScheduled, OfflineEventAttendanceMode
- **Location:** Complete venue information with address and coordinates
- **Organizer:** Organization details with contact information
- **Images:** Event gallery and featured images
- **Offers:** Pricing for admission, application fees, booth fees
- **Actions:** RegisterAction for event applications
- **Accessibility:** Free admission flag, capacity information
- **SEO:** Alternative names, language, category classification

### Venue Schema Generation

#### generatePlaceSchema(event)
- **Purpose:** Generate Place/Venue Schema.org structured data
- **Parameters:**
  - `event` (Object): Event data containing venue information
- **Returns:** Object - Schema.org Place structured data
- **Schema Type:** Place (https://schema.org/Place)
- **Features:**
  - **Address:** Complete postal address with street, city, state, zip
  - **Coordinates:** Latitude/longitude if available
  - **Accessibility:** Accessibility features and information
  - **Amenities:** Parking information and venue features

### Organizer Schema Generation

#### generateOrganizerSchema(promoter)
- **Purpose:** Generate Organization/Promoter Schema.org structured data
- **Parameters:**
  - `promoter` (Object): Promoter/organizer data from database
- **Returns:** Object - Schema.org Organization structured data
- **Schema Type:** Organization (https://schema.org/Organization)
- **Features:**
  - **Business Info:** Name, website, contact details
  - **Contact:** Email and telephone information
  - **Social Media:** Facebook, Instagram, Twitter links
  - **Fallback:** Uses personal name if business name not available

### Image Schema Generation

#### generateImageSchema(imageUrl)
- **Purpose:** Generate Image Schema.org structured data
- **Parameters:**
  - `imageUrl` (string): Full URL to the image
- **Returns:** Object - Schema.org ImageObject structured data
- **Schema Type:** ImageObject (https://schema.org/ImageObject)
- **Properties:** url, contentUrl for proper image indexing

### Pricing Schema Generation

#### generateOffersSchema(event)
- **Purpose:** Generate Offers Schema.org structured data for event pricing
- **Parameters:**
  - `event` (Object): Event data containing pricing information
- **Returns:** Array - Array of Schema.org Offer structured data
- **Schema Type:** Offer (https://schema.org/Offer)
- **Offer Types:**
  - **General Admission:** Public admission pricing
  - **Artist Application Fee:** Application submission cost
  - **Artist Booth Fee:** Vendor booth rental cost
- **Properties:** price, priceCurrency (USD), availability, category

### Navigation Schema Generation

#### generateBreadcrumbSchema(event)
- **Purpose:** Generate BreadcrumbList Schema.org structured data
- **Parameters:**
  - `event` (Object): Event data containing title and ID
- **Returns:** Object - Schema.org BreadcrumbList structured data
- **Schema Type:** BreadcrumbList (https://schema.org/BreadcrumbList)
- **Structure:**
  1. **Events** - Main events listing page
  2. **Event Title** - Specific event page
- **SEO Benefits:** Improves navigation understanding and search result display

### Complete Schema Package

#### generateCompleteSchema(event, promoter, images)
- **Purpose:** Generate complete schema package for event page SEO
- **Parameters:**
  - `event` (Object): Event data from database
  - `promoter` (Object): Promoter/organizer data
  - `images` (Array): Event image URLs
- **Returns:** Object - Complete schema package with event and breadcrumb data
- **Package Contents:**
  - `event`: Complete event schema with all related data
  - `breadcrumb`: Navigation breadcrumb schema
- **Usage:** Single call for all event page structured data needs

## Environment Variables
- `FRONTEND_URL`: Frontend base URL for event and breadcrumb links (default: https://beemeeart.com)

## Schema.org Compliance

### Event Schema Properties
- **@context:** "https://schema.org"
- **@type:** "Event"
- **@id:** Unique event identifier URL
- **name:** Event title
- **description:** Event description
- **startDate/endDate:** ISO date format
- **eventStatus:** EventScheduled
- **eventAttendanceMode:** OfflineEventAttendanceMode
- **location:** Place schema with full address
- **organizer:** Organization schema
- **image:** Array of ImageObject schemas
- **offers:** Array of Offer schemas
- **potentialAction:** RegisterAction for applications

### SEO Benefits
- **Rich Snippets:** Enhanced search result display
- **Event Discovery:** Better visibility in Google Events
- **Local SEO:** Venue location optimization
- **Image SEO:** Proper image indexing and display
- **Breadcrumb Navigation:** Enhanced search result navigation
- **Pricing Display:** Clear pricing information in search results

## Data Validation

### Required Event Fields
- `id`: Event identifier
- `title`: Event name
- `description`: Event description
- `start_date`: Event start date
- `end_date`: Event end date
- `venue_name`: Venue name
- `venue_city`: Venue city
- `venue_state`: Venue state

### Optional Event Fields
- `venue_address`: Street address
- `venue_zip`: Postal code
- `latitude/longitude`: Geographic coordinates
- `accessibility_info`: Accessibility features
- `parking_info`: Parking information
- `admission_fee`: Public admission cost
- `application_fee`: Artist application cost
- `booth_fee`: Vendor booth cost
- `max_artists`: Maximum capacity
- `application_deadline`: Application deadline
- `seo_title`: Alternative SEO title

### Promoter Fields
- `business_name`: Organization name
- `first_name/last_name`: Personal name fallback
- `email`: Contact email
- `business_phone`: Contact telephone
- `business_website`: Organization website
- `business_social_*`: Social media links

## Error Handling
- **Missing Data:** Graceful handling of optional fields
- **Invalid URLs:** Fallback to default domain
- **Empty Arrays:** Proper handling of missing images/offers
- **Null Values:** Safe property access with fallbacks

## Performance Considerations
- **Lightweight:** Pure JavaScript with no external dependencies
- **Fast Generation:** Minimal processing overhead
- **Memory Efficient:** No data caching or persistence
- **Scalable:** Stateless service design

## Testing
- Unit test coverage: Schema structure validation, required properties
- Integration test scenarios: Complete schema generation, URL formatting
- SEO validation: Schema.org validator compliance, Google Rich Results testing

## Usage Examples

### Basic Event Schema
```javascript
const eventData = {
  id: 123,
  title: "Summer Art Festival",
  description: "Annual outdoor art festival",
  start_date: "2024-07-15T10:00:00Z",
  end_date: "2024-07-17T18:00:00Z",
  venue_name: "City Park",
  venue_city: "Austin",
  venue_state: "TX"
};

const schema = eventSchemaService.generateEventSchema(eventData, promoterData, imageUrls);
```

### Complete Page Schema
```javascript
const completeSchema = eventSchemaService.generateCompleteSchema(eventData, promoterData, imageUrls);

// Output includes both event and breadcrumb schemas
console.log(completeSchema.event);      // Event schema
console.log(completeSchema.breadcrumb); // Breadcrumb schema
```

### HTML Integration
```html
<script type="application/ld+json">
  {JSON.stringify(completeSchema.event)}
</script>
<script type="application/ld+json">
  {JSON.stringify(completeSchema.breadcrumb)}
</script>
```

## SEO Impact
- **Search Visibility:** Improved event discovery in search results
- **Rich Results:** Enhanced search result display with images and details
- **Local Search:** Better visibility for location-based searches
- **Event Platforms:** Integration with Google Events and other platforms
- **Mobile Optimization:** Better mobile search result display
