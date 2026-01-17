# applications.js - Internal Documentation

## Overview
Application management routes for the Beemeeart platform. Handles comprehensive event application lifecycle including submission, review, bulk operations, payment processing, and email communications. Supports both individual and bulk application management workflows.

## Architecture
- **Type:** Route Layer (API Endpoints) - Application Management & Event Processing
- **Dependencies:** express, database connection, jwt middleware, stripe service, event email service
- **Database Tables:**
  - `event_applications` - Core application records with status and details
  - `events` - Event information and application settings
  - `users` - User accounts (artists and promoters)
  - `user_profiles` - User profile information
  - `artist_profiles` - Artist-specific profile data
  - `promoter_profiles` - Promoter business information
  - `artist_personas` - Multi-persona artist identities
  - `artist_jury_packets` - Pre-created jury submission packets
  - `event_booth_fees` - Booth fee records and payment tracking
  - `event_booth_payments` - Payment transaction records
  - `event_booth_addons` - Available and selected booth add-ons
  - `application_addon_requests` - Artist add-on requests
  - `application_field_responses` - Custom field responses
  - `application_email_log` - Email delivery tracking
  - `event_available_addons` - Available add-ons for events
- **External Services:** Stripe payment processing, email service, event email service

## Application Management Endpoints

### GET /applications
**Purpose:** Get all applications for the authenticated user (artist view)

**Authentication:** Required - JWT token

**Query Parameters:**
- `status` (optional): Filter by application status
- `limit` (optional): Limit number of results
- `offset` (optional): Pagination offset

**Response Structure:**
```json
{
  "success": true,
  "applications": [
    {
      "id": 123,
      "event_id": 456,
      "status": "submitted",
      "submitted_at": "2024-01-15T10:30:00Z",
      "event_title": "Spring Art Festival",
      "event_start_date": "2024-03-15",
      "event_venue_name": "City Park",
      "event_venue_city": "Austin",
      "event_venue_state": "TX"
    }
  ],
  "total": 5,
  "message": null
}
```

**Status Values:**
- `draft` - Application in progress
- `submitted` - Application submitted for review
- `under_review` - Being reviewed by promoter
- `accepted` - Application accepted
- `rejected` - Application rejected
- `waitlisted` - Application waitlisted
- `confirmed` - Artist confirmed participation

### GET /applications/:id
**Purpose:** Get single application details with comprehensive information

**Authentication:** Required - JWT token (artist or promoter access)

**Access Control:**
- Artists can view their own applications
- Promoters can view applications to their events
- Admins can view all applications

**Response Includes:**
- Complete application details
- Event information
- Artist profile information
- Jury comments and review status

### PUT /applications/:id
**Purpose:** Update application details (draft status only)

**Authentication:** Required - JWT token (artist access)

**Restrictions:**
- Only draft applications can be updated
- Artists can only update their own applications
- Submitted applications are read-only

**Updatable Fields:**
- `artist_statement` - Artist statement text
- `portfolio_url` - Portfolio website URL
- `booth_preferences` - JSON booth preference data
- `additional_info` - Additional application information

### DELETE /applications/:id
**Purpose:** Delete application (draft status only)

**Authentication:** Required - JWT token (artist access)

**Restrictions:**
- Only draft applications can be deleted
- Artists can only delete their own applications
- Permanent deletion with no recovery

## Event Management Endpoints

### GET /applications/events/:eventId/applications
**Purpose:** Get all applications for a specific event (promoter view)

**Authentication:** Required - JWT token (promoter access)

**Access Control:**
- Promoters can only view applications to their own events
- Includes artist profile and business information

**Response Includes:**
- Application details and status
- Artist contact information
- Artist business name and categories
- Art mediums and portfolio information

### PUT /applications/:id/status
**Purpose:** Update application status (promoter jury review)

**Authentication:** Required - JWT token (promoter access)

**Valid Status Transitions:**
- `submitted` → `under_review`
- `under_review` → `accepted` | `rejected` | `waitlisted`

**Request Body:**
```json
{
  "status": "accepted",
  "jury_comments": "Excellent portfolio, great fit for our event"
}
```

**Tracking Fields Updated:**
- `jury_reviewed_by` - Promoter user ID
- `jury_reviewed_at` - Review timestamp
- `updated_at` - Last modification time

### GET /applications/events/:eventId/stats
**Purpose:** Get public application statistics for an event

**Authentication:** None required (public endpoint)

**Response Structure:**
```json
{
  "stats": {
    "total_applications": 45,
    "submitted": 12,
    "under_review": 8,
    "accepted": 20,
    "rejected": 3,
    "waitlisted": 2,
    "confirmed": 18
  }
}
```

**Use Cases:**
- Event page statistics display
- Public application status overview
- Event popularity metrics

## Bulk Operations Endpoints

### GET /applications/events/:eventId/bulk-management
**Purpose:** Get applications for bulk management interface

**Authentication:** Required - JWT token (promoter access)

**Features:**
- Detailed artist information for review
- Payment status tracking
- Art categories and medium information
- Total payments received per application

**Response Includes:**
- Artist contact and business details
- Application content and status
- Payment history and totals
- Instagram handles and websites

### POST /applications/bulk-accept
**Purpose:** Accept multiple applications with booth fee configuration

**Authentication:** Required - JWT token (promoter access)

**Request Structure:**
```json
{
  "applications": [
    {
      "application_id": 123,
      "booth_fee_amount": 150.00,
      "due_date": "2024-02-15",
      "due_date_timezone": "America/Chicago",
      "add_ons": [
        {
          "type": "electricity",
          "description": "Electrical hookup",
          "amount": 25.00,
          "selected": true
        }
      ]
    }
  ]
}
```

**Transaction Processing:**
- Database transactions for data integrity
- Booth fee record creation
- Add-on configuration
- Status updates with jury information

**Response Structure:**
```json
{
  "success": true,
  "processed": 5,
  "errors": 0,
  "results": [...],
  "errors": []
}
```

### POST /applications/bulk-payment-intents
**Purpose:** Create Stripe payment intents for accepted applications

**Authentication:** Required - JWT token (promoter access)

**Payment Intent Features:**
- Automatic expiration based on due date
- Comprehensive metadata for tracking
- Total amount calculation (booth fee + add-ons)
- Invoice email automation

**Stripe Integration:**
- Payment intent creation with expiration
- Metadata includes application and event details
- Client secret generation for frontend payment

**Email Automation:**
- Automatic invoice email sending
- Payment link generation
- Due date and amount information

## Payment Management Endpoints

### GET /applications/payment-dashboard/:eventId
**Purpose:** Comprehensive payment status dashboard for promoters

**Authentication:** Required - JWT token (promoter access)

**Dashboard Components:**
1. **Payment Summary:**
   - Total accepted applications
   - Paid vs. pending counts
   - Overdue payment tracking
   - Total revenue collected and outstanding

2. **Detailed Payment Information:**
   - Individual application payment status
   - Artist contact information
   - Payment intent IDs and dates
   - Add-on totals and booth fees

**Payment Status Categories:**
- `paid` - Payment completed
- `pending` - Payment due but not overdue
- `overdue` - Payment past due date
- `unknown` - Status cannot be determined

### GET /applications/payment-intent/:payment_intent_id
**Purpose:** Get payment details for artist payment page

**Authentication:** Required - JWT token (artist or admin access)

**Access Control:**
- Artists can view their own payment intents
- Admins can view all payment intents
- Includes Stripe client secret for payment processing

**Response Includes:**
- Complete event information
- Artist and application details
- Total amount breakdown (booth fee + add-ons)
- Stripe payment intent status and client secret

### POST /applications/send-payment-reminders
**Purpose:** Send payment reminder emails to selected applications

**Authentication:** Required - JWT token (promoter access)

**Reminder Types:**
- `manual` - Custom manual reminder
- `due_soon` - Automated due soon reminder
- `overdue` - Final notice for overdue payments

**Email Template Selection:**
- Dynamic template based on reminder type
- Custom message inclusion support
- Payment link generation
- Due date and amount information

**Tracking Updates:**
- `reminder_sent_at` for standard reminders
- `final_notice_sent_at` for overdue notices
- Email delivery status logging

## Application Submission Endpoints

### POST /applications/events/:eventId/apply
**Purpose:** Submit a regular application to an event

**Authentication:** Required - JWT token (artist access)

**Validation Checks:**
- Event exists and accepts applications
- Application status is 'accepting'
- No duplicate applications for same persona
- Persona ownership verification (if provided)

**Multi-Persona Support:**
- Artists can apply with different personas
- Persona validation and ownership checks
- Prevents duplicate applications per persona

**Request Body:**
```json
{
  "artist_statement": "My artistic vision focuses on...",
  "portfolio_url": "https://myportfolio.com",
  "additional_info": "Additional information about my work",
  "additional_notes": "Special requirements or notes",
  "persona_id": 123
}
```

### POST /applications/apply-with-packet
**Purpose:** Apply using a pre-created jury packet

**Authentication:** Required - JWT token (artist access)

**Jury Packet Integration:**
- Copies existing packet data to new application
- Includes field responses and media
- Maintains persona associations
- Validates packet ownership

**Field Response Copying:**
- Automatic field response transfer
- File URL preservation
- Error handling for invalid fields
- Maintains data integrity

**Advantages:**
- Faster application process
- Consistent jury materials
- Reusable application content
- Reduced data entry

## Add-on Management Endpoints

### POST /applications/:application_id/addon-requests
**Purpose:** Save add-on requests for an application

**Authentication:** Required - JWT token (artist or admin access)

**Request Structure:**
```json
{
  "available_addon_id": 456,
  "requested": true,
  "notes": "Need electrical hookup for lighting display"
}
```

**Features:**
- Upsert functionality (insert or update)
- Artist notes for special requests
- Admin override capabilities
- Validation of add-on availability

### GET /applications/:application_id/addon-requests
**Purpose:** Get add-on requests with pricing details

**Authentication:** Required - JWT token (artist, promoter, or admin access)

**Access Control:**
- Artists can view their own add-on requests
- Promoters can view requests for their events
- Admins have full access

**Response Includes:**
- Add-on details and descriptions
- Pricing information
- Request status and notes
- Display order for UI presentation

## Email Management Endpoints

### POST /applications/send-manual-reminders
**Purpose:** Send manual reminder emails using event email service

**Authentication:** Required - JWT token (promoter access)

**Integration:**
- Uses EventEmailService for standardized emails
- Supports different reminder types
- Batch processing for multiple applications
- Success/failure tracking per application

### GET /applications/email-status/:applicationId
**Purpose:** Get email delivery history for an application

**Authentication:** Required - JWT token (artist or promoter access)

**Email Log Information:**
- Email type and template used
- Delivery timestamp
- Success/failure status
- Error messages for failed deliveries

**Use Cases:**
- Troubleshooting email delivery issues
- Confirming reminder email delivery
- Audit trail for communications

## Environment Variables
- `FRONTEND_URL`: Base URL for frontend application (default: https://beemeeart.com)

## Security Considerations

### Authentication & Authorization
- **JWT Validation:** All protected endpoints require valid JWT tokens
- **Role-Based Access:** Different access levels for artists, promoters, and admins
- **Resource Ownership:** Users can only access their own resources unless authorized
- **Event Ownership:** Promoters can only manage applications to their own events

### Data Validation
- **Input Sanitization:** All user inputs validated and sanitized
- **Status Validation:** Application status transitions validated
- **Ownership Verification:** Persona and packet ownership verified
- **Business Logic Validation:** Event application rules enforced

### Payment Security
- **Stripe Integration:** Secure payment intent creation and management
- **Metadata Protection:** Sensitive information properly handled in Stripe metadata
- **Payment Verification:** Payment status verified before processing
- **Transaction Integrity:** Database transactions ensure data consistency

## Performance Considerations

### Database Optimization
- **Efficient Queries:** Optimized JOIN queries for application data retrieval
- **Index Usage:** Proper indexing on application_id, event_id, and artist_id
- **Pagination Support:** LIMIT/OFFSET for large result sets
- **Selective Fields:** Only fetch required data for specific operations

### Bulk Operations
- **Transaction Management:** Proper transaction handling for bulk operations
- **Error Isolation:** Individual application errors don't affect batch processing
- **Memory Efficiency:** Streaming processing for large application sets
- **Parallel Processing:** Concurrent processing where appropriate

### Email Performance
- **Async Processing:** Email sending processed asynchronously
- **Batch Operations:** Bulk email sending for efficiency
- **Error Handling:** Graceful handling of email delivery failures
- **Rate Limiting:** Respect email service rate limits

## Error Handling

### Application Errors
- **Not Found:** 404 for non-existent applications
- **Access Denied:** 403 for unauthorized access attempts
- **Invalid Status:** 400 for invalid status transitions
- **Duplicate Applications:** 400 for duplicate persona applications

### Payment Errors
- **Stripe Failures:** Proper handling of Stripe API errors
- **Payment Intent Errors:** Clear error messages for payment issues
- **Amount Validation:** Validation of payment amounts and calculations
- **Expiration Handling:** Proper handling of expired payment intents

### Bulk Operation Errors
- **Partial Failures:** Individual errors don't fail entire batch
- **Transaction Rollback:** Proper rollback on critical errors
- **Error Aggregation:** Comprehensive error reporting for bulk operations
- **Validation Errors:** Clear validation error messages

## Usage Examples

### Submit Application
```javascript
const applicationData = {
  artist_statement: 'My artistic vision...',
  portfolio_url: 'https://myportfolio.com',
  additional_info: 'Additional details...',
  persona_id: 123
};

const response = await fetch(`/applications/events/${eventId}/apply`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(applicationData)
});
```

### Bulk Accept Applications
```javascript
const bulkAcceptData = {
  applications: [
    {
      application_id: 123,
      booth_fee_amount: 150.00,
      due_date: '2024-02-15',
      due_date_timezone: 'America/Chicago',
      add_ons: [
        {
          type: 'electricity',
          description: 'Electrical hookup',
          amount: 25.00,
          selected: true
        }
      ]
    }
  ]
};

const response = await fetch('/applications/bulk-accept', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(bulkAcceptData)
});
```

### Send Payment Reminders
```javascript
const reminderData = {
  application_ids: [123, 456, 789],
  reminder_type: 'due_soon',
  custom_message: 'Payment due in 3 days'
};

const response = await fetch('/applications/send-payment-reminders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(reminderData)
});
```

### Get Payment Dashboard
```javascript
const response = await fetch(`/applications/payment-dashboard/${eventId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { summary, applications } = await response.json();
```
