# System Announcements API

## Authentication
All announcement endpoints require API key authentication.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- `Content-Type: application/json`

## User Endpoints

### Check Pending Announcements
`GET /api/announcements/check-pending`

Check if the authenticated user has pending announcements that require acknowledgment.

**Response (200 OK):**
```json
{
  "hasPending": true,
  "requiresAcknowledgment": true,
  "pendingCount": 2
}
```

**Response Fields:**
- `hasPending`: Whether user has unacknowledged announcements
- `requiresAcknowledgment`: Whether acknowledgment is required
- `pendingCount`: Number of pending announcements

### Get Pending Announcements
`GET /api/announcements/pending`

Get all pending announcements for the authenticated user based on their user type.

**Response (200 OK):**
```json
[
  {
    "id": 123,
    "title": "Platform Maintenance Notice",
    "content": "We will be performing scheduled maintenance on...",
    "show_from": "2025-09-15T00:00:00Z",
    "expires_at": "2025-09-20T23:59:59Z",
    "target_user_types": ["artist", "promoter"],
    "is_active": true,
    "created_at": "2025-09-14T10:00:00Z",
    "updated_at": "2025-09-14T10:00:00Z"
  },
  {
    "id": 124,
    "title": "New Feature Release",
    "content": "We're excited to announce new features...",
    "show_from": "2025-09-16T00:00:00Z",
    "expires_at": "2025-09-25T23:59:59Z",
    "target_user_types": ["artist"],
    "is_active": true,
    "created_at": "2025-09-15T14:30:00Z",
    "updated_at": "2025-09-15T14:30:00Z"
  }
]
```

### Acknowledge Announcement
`POST /api/announcements/:id/acknowledge`

Mark an announcement as acknowledged by the authenticated user.

**Parameters:**
- `id`: Announcement ID (path parameter)

**Response (200 OK):**
```json
{
  "message": "Announcement acknowledged successfully"
}
```

### Set Reminder for Announcement
`POST /api/announcements/:id/remind-later`

Set a reminder for an announcement without acknowledging it.

**Parameters:**
- `id`: Announcement ID (path parameter)

**Response (200 OK):**
```json
{
  "message": "Reminder set successfully"
}
```

## Admin Endpoints

### Get All Announcements
`GET /api/announcements`

Get all announcements for administrative management.

**Required Permission:** `manage_system`

**Response (200 OK):**
```json
[
  {
    "id": 123,
    "title": "Platform Maintenance Notice",
    "content": "We will be performing scheduled maintenance on...",
    "show_from": "2025-09-15T00:00:00Z",
    "expires_at": "2025-09-20T23:59:59Z",
    "target_user_types": ["artist", "promoter"],
    "is_active": true,
    "created_by": 1,
    "created_by_username": "admin@beemeeart.com",
    "created_at": "2025-09-14T10:00:00Z",
    "updated_at": "2025-09-14T10:00:00Z"
  }
]
```

### Create Announcement
`POST /api/announcements`

Create a new system announcement.

**Required Permission:** `manage_system`

**Request Body:**
```json
{
  "title": "Platform Maintenance Notice",
  "content": "We will be performing scheduled maintenance on September 18th from 2:00 AM to 4:00 AM EST. During this time, the platform may be temporarily unavailable.",
  "show_from": "2025-09-15T00:00:00Z",
  "expires_at": "2025-09-20T23:59:59Z",
  "target_user_types": ["artist", "promoter"],
  "is_active": true
}
```

**Required Fields:**
- `title`: Announcement title
- `content`: Announcement content/message
- `show_from`: Start date/time for display (ISO 8601 format)
- `expires_at`: Expiration date/time (ISO 8601 format)
- `target_user_types`: Array of target user types

**Optional Fields:**
- `is_active`: Active status (default: true)

**Valid User Types:**
- `artist`: Artists and creators
- `promoter`: Event promoters and organizers
- `community`: Community members
- `admin`: Administrative users

**Response (201 Created):**
```json
{
  "id": 123,
  "message": "Announcement created successfully"
}
```

### Update Announcement
`PUT /api/announcements/:id`

Update an existing announcement.

**Required Permission:** `manage_system`

**Parameters:**
- `id`: Announcement ID (path parameter)

**Request Body (all fields optional):**
```json
{
  "title": "Updated Platform Maintenance Notice",
  "content": "Updated maintenance information...",
  "show_from": "2025-09-15T00:00:00Z",
  "expires_at": "2025-09-22T23:59:59Z",
  "target_user_types": ["artist", "promoter", "community"],
  "is_active": false
}
```

**Response (200 OK):**
```json
{
  "message": "Announcement updated successfully"
}
```

### Delete Announcement
`DELETE /api/announcements/:id`

Delete an announcement and all related acknowledgments.

**Required Permission:** `manage_system`

**Parameters:**
- `id`: Announcement ID (path parameter)

**Response (200 OK):**
```json
{
  "message": "Announcement deleted successfully"
}
```

### Get Announcement Statistics
`GET /api/announcements/:id/stats`

Get comprehensive statistics for an announcement.

**Required Permission:** `manage_system`

**Parameters:**
- `id`: Announcement ID (path parameter)

**Response (200 OK):**
```json
{
  "announcement": {
    "id": 123,
    "title": "Platform Maintenance Notice",
    "content": "We will be performing scheduled maintenance...",
    "show_from": "2025-09-15T00:00:00Z",
    "expires_at": "2025-09-20T23:59:59Z",
    "target_user_types": ["artist", "promoter"],
    "is_active": true,
    "created_by": 1,
    "created_at": "2025-09-14T10:00:00Z",
    "updated_at": "2025-09-14T10:00:00Z"
  },
  "stats": {
    "total_target_users": 1250,
    "acknowledged": 980,
    "remind_later": 150,
    "no_response": 120,
    "acknowledgment_rate": "78.4"
  }
}
```

**Statistics Fields:**
- `total_target_users`: Total users in target user types
- `acknowledged`: Number of users who acknowledged
- `remind_later`: Number of users who set reminders
- `no_response`: Users with no interaction
- `acknowledgment_rate`: Percentage of users who acknowledged

## Data Types

### Announcement Object
- `id`: Unique announcement identifier
- `title`: Announcement title/subject
- `content`: Full announcement message content
- `show_from`: Start date/time for display (ISO 8601)
- `expires_at`: Expiration date/time (ISO 8601)
- `target_user_types`: Array of target user types
- `is_active`: Boolean active status
- `created_by`: Creator user ID (admin endpoints only)
- `created_by_username`: Creator username (admin endpoints only)
- `created_at`: Creation timestamp (ISO 8601)
- `updated_at`: Last update timestamp (ISO 8601)

### User Types
- `artist`: Artists, creators, and vendors
- `promoter`: Event promoters and organizers
- `community`: Community members and participants
- `admin`: Administrative and staff users

## Validation Rules

### Date Validation
- `show_from` must be before `expires_at`
- Dates must be in valid ISO 8601 format
- Announcements are only visible within the date range

### User Type Validation
- Must be one of the valid user types listed above
- `target_user_types` must be a non-empty array
- Invalid user types will result in validation errors

### Content Validation
- `title` and `content` are required for creation
- All text fields support Unicode content
- Maximum length limits apply (check with support for specifics)

## Error Responses

- `400 Bad Request`: Invalid input data
  - Missing required fields
  - Invalid date format or range
  - Invalid user types
  - Empty target user types array
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: 
  - Insufficient permissions for admin endpoints
  - Announcement not targeted to user's type
- `404 Not Found`: 
  - Announcement not found
  - User not found
  - Expired or inactive announcement
- `500 Internal Server Error`: Server processing error

## Rate Limits
- 100 requests per minute per API key for user endpoints
- 50 requests per minute per API key for admin endpoints
- Higher limits available for bulk operations

## Example Usage

### Check for Pending Announcements
```bash
# Check if user has pending announcements
curl -X GET https://api.beemeeart.com/api/announcements/check-pending \
  -H "Authorization: Bearer your_api_key"
```

### Get Pending Announcements
```bash
# Get all pending announcements for user
curl -X GET https://api.beemeeart.com/api/announcements/pending \
  -H "Authorization: Bearer your_api_key"
```

### Acknowledge Announcement
```bash
# Acknowledge announcement with ID 123
curl -X POST https://api.beemeeart.com/api/announcements/123/acknowledge \
  -H "Authorization: Bearer your_api_key"
```

### Create Announcement (Admin)
```bash
# Create new announcement
curl -X POST https://api.beemeeart.com/api/announcements \
  -H "Authorization: Bearer your_admin_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Platform Update",
    "content": "New features available...",
    "show_from": "2025-09-18T00:00:00Z",
    "expires_at": "2025-09-25T23:59:59Z",
    "target_user_types": ["artist", "promoter"]
  }'
```

### Get Announcement Statistics (Admin)
```bash
# Get statistics for announcement 123
curl -X GET https://api.beemeeart.com/api/announcements/123/stats \
  -H "Authorization: Bearer your_admin_api_key"
```

## Integration Notes

### Frontend Integration
- Use `/check-pending` for notification badges and alerts
- Use `/pending` to display announcement modals or notification centers
- Implement acknowledgment and reminder functionality for user interaction
- Poll `/check-pending` periodically for real-time notifications

### User Experience
- Display announcements based on user type automatically
- Provide clear acknowledgment and reminder options
- Show announcement dates and expiration information
- Handle expired announcements gracefully

### Administrative Integration
- Integrate with admin dashboards for announcement management
- Use statistics endpoint for engagement analytics
- Implement scheduling interface for future announcements
- Provide user type selection for targeted messaging

## Best Practices

### User Endpoints
- Poll `/check-pending` efficiently (avoid excessive requests)
- Cache pending announcements appropriately
- Handle acknowledgments immediately after user interaction
- Respect user preferences for reminder timing

### Admin Endpoints
- Validate dates and user types before submission
- Use statistics to measure announcement effectiveness
- Schedule announcements appropriately for target audiences
- Monitor acknowledgment rates for engagement insights

### Content Guidelines
- Keep announcement titles concise and descriptive
- Provide clear, actionable content in announcements
- Use appropriate user type targeting for relevance
- Set reasonable expiration dates for announcements

### Performance Optimization
- Cache frequently accessed announcement data when appropriate
- Use appropriate polling intervals for pending checks
- Batch acknowledgments when possible for efficiency
- Monitor API usage to stay within rate limits

## Security Considerations
- Protect admin API keys and ensure proper permission levels
- Validate all user inputs thoroughly
- Monitor announcement access patterns for unusual activity
- Ensure secure transmission of all announcement data
- Regularly review and audit announcement access logs

## Future Enhancements

### Advanced Features (Coming Soon)
- **Rich Content:** HTML content support and media attachments
- **Advanced Targeting:** More sophisticated user targeting criteria
- **Notification Channels:** Email, SMS, and push notification integration
- **Template System:** Reusable announcement templates and campaigns

### Enhanced Analytics (Planned)
- **Engagement Metrics:** Detailed user engagement analytics and trends
- **A/B Testing:** Announcement effectiveness testing capabilities
- **Real-time Dashboard:** Live announcement performance monitoring
- **Export Capabilities:** CSV and PDF export for announcement reports

## API Versioning
- Current version: 1.0.0
- Breaking changes will increment major version
- New features increment minor version
- Bug fixes increment patch version
- Deprecation notices provided 90 days before removal

## Support and Documentation
- **API Documentation:** Complete OpenAPI 3.0 specification available
- **Integration Support:** Technical support for API integration
- **Best Practices:** Guidance on effective announcement strategies
- **Updates:** Regular updates on new features and capabilities
- **Community:** Developer community for tips and best practices

## Compliance Notes

### Data Handling
- All announcement data handled securely and in compliance with privacy regulations
- User interaction data (acknowledgments, reminders) stored with appropriate retention policies
- Audit trail maintained for all administrative operations
- IP address and user agent tracking for security and analytics purposes

### Access Control
- Strict permission-based access control for administrative functions
- User type-based filtering ensures users only see relevant announcements
- Complete audit trail for all announcement operations and user interactions
- Regular security reviews and access monitoring

### Content Management
- Announcement content subject to platform content policies
- Administrative oversight for all system announcements
- Proper scheduling and expiration management for timely communications
- User acknowledgment tracking for compliance and engagement measurement
