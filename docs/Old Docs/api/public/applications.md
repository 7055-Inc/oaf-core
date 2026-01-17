# Application Management API

## Overview
The Beemeeart Application Management API handles the complete event application lifecycle, from submission to payment processing. It supports individual applications, bulk operations, and comprehensive payment management for art events.

## Authentication
Most endpoints require authentication via JWT token in the Authorization header. Public endpoints are clearly marked.

## Base URL
```
https://api.beemeeart.com/applications
```

## Application Lifecycle

### Application Status Flow
```
draft → submitted → under_review → accepted/rejected/waitlisted → confirmed
```

**Status Definitions:**
- `draft` - Application in progress, can be edited
- `submitted` - Application submitted for review
- `under_review` - Being reviewed by event promoter
- `accepted` - Application accepted, booth fee required
- `rejected` - Application rejected by promoter
- `waitlisted` - Application waitlisted for potential acceptance
- `confirmed` - Artist confirmed participation and paid fees

## Endpoints

### Get User Applications
`GET /applications`

Retrieve all applications for the authenticated user with event details.

**Authentication:** Required - Bearer token

**Query Parameters:**
- `status` (string, optional): Filter by application status
- `limit` (number, optional): Limit number of results
- `offset` (number, optional): Pagination offset

**Response (200 OK):**
```json
{
  "success": true,
  "applications": [
    {
      "id": 123,
      "event_id": 456,
      "status": "accepted",
      "submitted_at": "2024-01-15T10:30:00Z",
      "booth_fee_amount": 150.00,
      "booth_fee_paid": false,
      "booth_fee_due_date": "2024-02-15",
      "event_title": "Spring Art Festival",
      "event_start_date": "2024-03-15",
      "event_end_date": "2024-03-17",
      "event_venue_name": "City Park",
      "event_venue_city": "Austin",
      "event_venue_state": "TX"
    }
  ],
  "total": 5,
  "message": null
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `500 Internal Server Error`: Server error

### Get Application Details
`GET /applications/{id}`

Retrieve detailed information for a specific application.

**Authentication:** Required - Bearer token

**Access Control:**
- Artists can view their own applications
- Promoters can view applications to their events

**Parameters:**
- `id` (path): Application ID

**Response (200 OK):**
```json
{
  "application": {
    "id": 123,
    "event_id": 456,
    "artist_id": 789,
    "status": "accepted",
    "artist_statement": "My artistic vision focuses on...",
    "portfolio_url": "https://myportfolio.com",
    "additional_info": "Additional application details",
    "submitted_at": "2024-01-15T10:30:00Z",
    "jury_comments": "Excellent portfolio, great fit for our event",
    "jury_reviewed_at": "2024-01-20T14:30:00Z",
    "event_title": "Spring Art Festival",
    "artist_first_name": "Jane",
    "artist_last_name": "Smith",
    "artist_email": "jane@example.com",
    "artist_business_name": "Jane's Art Studio"
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Access denied
- `404 Not Found`: Application not found
- `500 Internal Server Error`: Server error

### Update Application
`PUT /applications/{id}`

Update application details (only allowed for draft applications).

**Authentication:** Required - Bearer token (artist access)

**Parameters:**
- `id` (path): Application ID

**Request Body:**
```json
{
  "artist_statement": "Updated artist statement",
  "portfolio_url": "https://updatedportfolio.com",
  "booth_preferences": {
    "location": "corner booth",
    "electricity": true,
    "tent": false
  },
  "additional_info": "Updated additional information"
}
```

**Response (200 OK):**
```json
{
  "message": "Application updated successfully",
  "application": {
    "id": 123,
    "status": "draft",
    "artist_statement": "Updated artist statement",
    "updated_at": "2024-01-16T09:15:00Z"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Cannot update submitted application
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Access denied
- `404 Not Found`: Application not found
- `500 Internal Server Error`: Server error

### Delete Application
`DELETE /applications/{id}`

Delete an application (only allowed for draft applications).

**Authentication:** Required - Bearer token (artist access)

**Parameters:**
- `id` (path): Application ID

**Response (200 OK):**
```json
{
  "message": "Application deleted successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Cannot delete submitted application
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Access denied
- `404 Not Found`: Application not found
- `500 Internal Server Error`: Server error

### Submit Application
`POST /applications/events/{eventId}/apply`

Submit a new application to an event.

**Authentication:** Required - Bearer token (artist access)

**Parameters:**
- `eventId` (path): Event ID to apply to

**Request Body:**
```json
{
  "artist_statement": "My artistic vision focuses on contemporary themes...",
  "portfolio_url": "https://myportfolio.com",
  "additional_info": "I specialize in mixed media installations",
  "additional_notes": "Require electrical hookup for lighting",
  "persona_id": 123
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "application": {
    "id": 456,
    "event_id": 123,
    "status": "submitted",
    "submitted_at": "2024-01-15T10:30:00Z"
  },
  "message": "Application submitted successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Event not accepting applications or duplicate application
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: Event not found
- `500 Internal Server Error`: Server error

### Apply with Jury Packet
`POST /applications/apply-with-packet`

Submit an application using a pre-created jury packet.

**Authentication:** Required - Bearer token (artist access)

**Request Body:**
```json
{
  "event_id": 123,
  "packet_id": 456,
  "additional_info": "Event-specific additional information",
  "additional_notes": "Special requirements for this event"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "application_id": 789,
  "message": "Application submitted successfully using jury packet",
  "packet_used": "My Portfolio 2024"
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields or duplicate application
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: Event or packet not found
- `500 Internal Server Error`: Server error

### Get Event Applications (Promoter)
`GET /applications/events/{eventId}/applications`

Get all applications for a specific event (promoter access only).

**Authentication:** Required - Bearer token (promoter access)

**Parameters:**
- `eventId` (path): Event ID
- `status` (query, optional): Filter by application status

**Response (200 OK):**
```json
{
  "applications": [
    {
      "id": 123,
      "status": "submitted",
      "artist_statement": "My artistic vision...",
      "submitted_at": "2024-01-15T10:30:00Z",
      "artist_first_name": "Jane",
      "artist_last_name": "Smith",
      "artist_email": "jane@example.com",
      "artist_business_name": "Jane's Art Studio",
      "art_categories": "[\"painting\", \"sculpture\"]",
      "art_mediums": "[\"oil\", \"clay\"]"
    }
  ],
  "total": 25
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Access denied (not event promoter)
- `500 Internal Server Error`: Server error

### Update Application Status (Promoter)
`PUT /applications/{id}/status`

Update application status with jury review (promoter access only).

**Authentication:** Required - Bearer token (promoter access)

**Parameters:**
- `id` (path): Application ID

**Request Body:**
```json
{
  "status": "accepted",
  "jury_comments": "Excellent portfolio, perfect fit for our event theme"
}
```

**Valid Status Values:**
- `under_review` - Mark as under review
- `accepted` - Accept the application
- `rejected` - Reject the application
- `waitlisted` - Add to waitlist

**Response (200 OK):**
```json
{
  "message": "Application status updated successfully",
  "application": {
    "id": 123,
    "status": "accepted",
    "jury_comments": "Excellent portfolio, perfect fit for our event theme",
    "jury_reviewed_at": "2024-01-20T14:30:00Z",
    "event_title": "Spring Art Festival",
    "artist_first_name": "Jane",
    "artist_last_name": "Smith"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Invalid status value
- `401 Unauthorized`: Invalid or missing token
- `403 Forbidden`: Access denied
- `404 Not Found`: Application not found
- `500 Internal Server Error`: Server error

### Get Event Statistics
`GET /applications/events/{eventId}/stats`

Get public application statistics for an event.

**Authentication:** None required (public endpoint)

**Parameters:**
- `eventId` (path): Event ID

**Response (200 OK):**
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

**Error Responses:**
- `500 Internal Server Error`: Server error

## Bulk Operations

### Bulk Accept Applications
`POST /applications/bulk-accept`

Accept multiple applications with booth fee configuration.

**Authentication:** Required - Bearer token (promoter access)

**Request Body:**
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
        },
        {
          "type": "tent",
          "description": "10x10 tent rental",
          "amount": 50.00,
          "selected": false
        }
      ]
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "processed": 5,
  "errors": 0,
  "results": [
    {
      "application_id": 123,
      "status": "accepted",
      "booth_fee_amount": 150.00,
      "due_date": "2024-02-15",
      "fee_id": 456
    }
  ],
  "errors": []
}
```

### Create Payment Intents
`POST /applications/bulk-payment-intents`

Create Stripe payment intents for accepted applications.

**Authentication:** Required - Bearer token (promoter access)

**Request Body:**
```json
{
  "application_ids": [123, 456, 789]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "created": 3,
  "errors": 0,
  "results": [
    {
      "application_id": 123,
      "payment_intent_id": "pi_1234567890",
      "client_secret": "pi_1234567890_secret_abc",
      "amount": 175.00,
      "due_date": "2024-02-15",
      "expires_at": 1708012800
    }
  ],
  "errors": []
}
```

## Payment Management

### Get Payment Dashboard
`GET /applications/payment-dashboard/{eventId}`

Get comprehensive payment status dashboard for an event.

**Authentication:** Required - Bearer token (promoter access)

**Parameters:**
- `eventId` (path): Event ID

**Response (200 OK):**
```json
{
  "success": true,
  "event_id": 123,
  "summary": {
    "total_accepted": 25,
    "paid_count": 18,
    "pending_count": 5,
    "overdue_count": 2,
    "total_collected": 3150.00,
    "total_outstanding": 875.00
  },
  "applications": [
    {
      "application_id": 123,
      "booth_fee_amount": 150.00,
      "booth_fee_paid": true,
      "booth_fee_due_date": "2024-02-15",
      "artist_first_name": "Jane",
      "artist_last_name": "Smith",
      "artist_email": "jane@example.com",
      "payment_intent_id": "pi_1234567890",
      "paid_at": "2024-02-10T15:30:00Z",
      "total_paid": 175.00,
      "addons_total": 25.00,
      "payment_status": "paid"
    }
  ]
}
```

### Get Payment Intent Details
`GET /applications/payment-intent/{payment_intent_id}`

Get payment intent details for artist payment page.

**Authentication:** Required - Bearer token (artist or admin access)

**Parameters:**
- `payment_intent_id` (path): Stripe payment intent ID

**Response (200 OK):**
```json
{
  "success": true,
  "application_id": 123,
  "event_id": 456,
  "event_title": "Spring Art Festival",
  "event_start_date": "2024-03-15",
  "event_end_date": "2024-03-17",
  "artist_first_name": "Jane",
  "artist_last_name": "Smith",
  "booth_fee_amount": 150.00,
  "addons_total": 25.00,
  "total_amount": 175.00,
  "due_date": "2024-02-15",
  "payment_intent_id": "pi_1234567890",
  "client_secret": "pi_1234567890_secret_abc",
  "payment_status": "requires_payment_method"
}
```

### Send Payment Reminders
`POST /applications/send-payment-reminders`

Send payment reminder emails to selected applications.

**Authentication:** Required - Bearer token (promoter access)

**Request Body:**
```json
{
  "application_ids": [123, 456, 789],
  "reminder_type": "due_soon",
  "custom_message": "Payment is due in 3 days. Please complete your payment to secure your booth."
}
```

**Reminder Types:**
- `manual` - Custom manual reminder
- `due_soon` - Automated due soon reminder
- `overdue` - Final notice for overdue payments

**Response (200 OK):**
```json
{
  "success": true,
  "sent": 3,
  "errors": 0,
  "results": [
    {
      "application_id": 123,
      "artist_email": "jane@example.com",
      "template_used": "booth_payment_reminder",
      "reminder_type": "due_soon"
    }
  ],
  "errors": []
}
```

## Add-on Management

### Save Add-on Request
`POST /applications/{application_id}/addon-requests`

Save add-on requests for an application.

**Authentication:** Required - Bearer token (artist or admin access)

**Parameters:**
- `application_id` (path): Application ID

**Request Body:**
```json
{
  "available_addon_id": 456,
  "requested": true,
  "notes": "Need electrical hookup for LED lighting display"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Add-on request saved successfully"
}
```

### Get Add-on Requests
`GET /applications/{application_id}/addon-requests`

Get add-on requests for an application with pricing details.

**Authentication:** Required - Bearer token (artist, promoter, or admin access)

**Parameters:**
- `application_id` (path): Application ID

**Response (200 OK):**
```json
{
  "success": true,
  "requests": [
    {
      "available_addon_id": 456,
      "requested": true,
      "notes": "Need electrical hookup for LED lighting display",
      "addon_name": "Electrical Hookup",
      "addon_description": "110V electrical connection for booth",
      "addon_price": 25.00
    }
  ]
}
```

## Email Management

### Get Email Status
`GET /applications/email-status/{applicationId}`

Get email delivery history for an application.

**Authentication:** Required - Bearer token (artist or promoter access)

**Parameters:**
- `applicationId` (path): Application ID

**Response (200 OK):**
```json
{
  "success": true,
  "application_id": 123,
  "emails": [
    {
      "email_type": "booth_fee_invoice",
      "sent_at": "2024-01-20T10:30:00Z",
      "success": true,
      "error_message": null
    },
    {
      "email_type": "payment_reminder",
      "sent_at": "2024-02-10T09:15:00Z",
      "success": true,
      "error_message": null
    }
  ]
}
```

## Rate Limits
- **Application submissions:** 5 requests per minute per user
- **Status updates:** 20 requests per minute per promoter
- **Bulk operations:** 2 requests per minute per promoter
- **Email operations:** 10 requests per minute per promoter

## Error Handling

### Standard Error Format
```json
{
  "error": "Error description",
  "details": "Additional error details"
}
```

### Common Error Codes
- `400` - Bad Request (validation errors, invalid status)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error (server error)

## Integration Examples

### Complete Application Flow
```javascript
// 1. Submit application
const applicationData = {
  artist_statement: 'My artistic vision...',
  portfolio_url: 'https://myportfolio.com',
  additional_info: 'Additional details...'
};

const submitResponse = await fetch(`/applications/events/${eventId}/apply`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(applicationData)
});

// 2. Check application status
const statusResponse = await fetch(`/applications/${applicationId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 3. Pay booth fee (if accepted)
const paymentResponse = await fetch(`/applications/payment-intent/${paymentIntentId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

### Promoter Management Workflow
```javascript
// 1. Get event applications
const applicationsResponse = await fetch(`/applications/events/${eventId}/applications`, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// 2. Bulk accept applications
const bulkAcceptData = {
  applications: [
    {
      application_id: 123,
      booth_fee_amount: 150.00,
      due_date: '2024-02-15',
      due_date_timezone: 'America/Chicago'
    }
  ]
};

const acceptResponse = await fetch('/applications/bulk-accept', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(bulkAcceptData)
});

// 3. Create payment intents
const paymentIntentsResponse = await fetch('/applications/bulk-payment-intents', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ application_ids: [123, 456, 789] })
});

// 4. Monitor payment dashboard
const dashboardResponse = await fetch(`/applications/payment-dashboard/${eventId}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
```
