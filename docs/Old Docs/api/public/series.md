# Event Series Management API

## Authentication
All event series endpoints require API key authentication.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- `Content-Type: application/json`

## Event Series Endpoints

### Get All Event Series
`GET /api/series`

Get all event series for the authenticated promoter with statistics.

**Response (200 OK):**
```json
{
  "success": true,
  "series": [
    {
      "id": 123,
      "series_name": "Annual Art Festival",
      "series_description": "Yearly celebration of local artists",
      "promoter_id": 456,
      "recurrence_pattern": "yearly",
      "recurrence_interval": 1,
      "series_start_date": "2025-06-15",
      "series_end_date": null,
      "template_event_id": 789,
      "auto_generate": true,
      "generate_months_ahead": 12,
      "next_generation_date": "2026-06-15",
      "series_status": "active",
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z",
      "events_count": 3,
      "latest_event_date": "2027-06-15",
      "earliest_event_date": "2025-06-15"
    }
  ]
}
```

### Get Single Event Series
`GET /api/series/:id`

Get detailed information for a specific event series including events and automation rules.

**Parameters:**
- `id`: Series ID (path parameter)

**Response (200 OK):**
```json
{
  "success": true,
  "series": {
    "id": 123,
    "series_name": "Annual Art Festival",
    "series_description": "Yearly celebration of local artists",
    "promoter_id": 456,
    "recurrence_pattern": "yearly",
    "recurrence_interval": 1,
    "series_start_date": "2025-06-15",
    "series_end_date": null,
    "template_event_id": 789,
    "auto_generate": true,
    "generate_months_ahead": 12,
    "next_generation_date": "2026-06-15",
    "series_status": "active",
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-15T10:00:00Z",
    "template_name": "Art Festival Template",
    "template_event_title": "Art Festival 2024"
  },
  "events": [
    {
      "id": 1001,
      "title": "Annual Art Festival 2025",
      "start_date": "2025-06-15",
      "end_date": "2025-06-17",
      "event_status": "published",
      "sequence_number": 1,
      "generated_date": "2025-01-15T10:00:00Z",
      "generation_method": "automatic"
    },
    {
      "id": 1002,
      "title": "Annual Art Festival 2026",
      "start_date": "2026-06-15",
      "end_date": "2026-06-17",
      "event_status": "draft",
      "sequence_number": 2,
      "generated_date": "2025-01-15T10:05:00Z",
      "generation_method": "automatic"
    }
  ],
  "automation_rules": [
    {
      "id": 501,
      "series_id": 123,
      "trigger_type": "event_created",
      "trigger_offset_days": 0,
      "target_audience": "artists",
      "template_id": 301,
      "is_active": true,
      "created_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### Create Event Series
`POST /api/series`

Create a new event series with recurrence pattern and automation settings.

**Request Body:**
```json
{
  "series_name": "Monthly Workshop Series",
  "series_description": "Monthly educational workshops for artists",
  "recurrence_pattern": "monthly",
  "recurrence_interval": 1,
  "series_start_date": "2025-10-01",
  "series_end_date": "2026-09-30",
  "template_event_id": 789,
  "auto_generate": true,
  "generate_months_ahead": 6
}
```

**Required Fields:**
- `series_name`: Name of the event series
- `recurrence_pattern`: Recurrence pattern ("yearly", "quarterly", or "monthly")
- `recurrence_interval`: Interval for recurrence (e.g., 1 for every occurrence, 2 for every other)
- `series_start_date`: Start date for the series (ISO 8601 format)

**Optional Fields:**
- `series_description`: Description of the series
- `series_end_date`: End date for the series (null for indefinite)
- `template_event_id`: ID of template event to use for generation
- `auto_generate`: Whether to automatically generate events (default: true)
- `generate_months_ahead`: How many months ahead to generate events (default: 12)

**Response (201 Created):**
```json
{
  "success": true,
  "series_id": 124,
  "message": "Event series created successfully"
}
```

### Update Event Series
`PUT /api/series/:id`

Update an existing event series configuration.

**Parameters:**
- `id`: Series ID (path parameter)

**Request Body (all fields optional):**
```json
{
  "series_name": "Updated Workshop Series",
  "series_description": "Updated description",
  "recurrence_pattern": "monthly",
  "recurrence_interval": 2,
  "series_status": "active",
  "auto_generate": false,
  "generate_months_ahead": 3,
  "series_end_date": "2026-12-31"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Series updated successfully"
}
```

### Generate Next Event
`POST /api/series/:id/generate`

Manually generate the next event in the series based on the recurrence pattern.

**Parameters:**
- `id`: Series ID (path parameter)

**Response (200 OK):**
```json
{
  "success": true,
  "event_id": 1003,
  "message": "Next event generated successfully"
}
```

## Event Template Endpoints

### Get Available Templates
`GET /api/series/templates/my`

Get event templates available to the authenticated promoter (owned + public templates).

**Response (200 OK):**
```json
{
  "success": true,
  "templates": [
    {
      "id": 789,
      "template_name": "Art Festival Template",
      "promoter_id": 456,
      "template_config": "{\"title\":\"Art Festival\",\"description\":\"Annual art celebration\",\"duration\":3}",
      "description": "Template for annual art festivals",
      "is_public": true,
      "created_at": "2025-01-10T14:00:00Z",
      "updated_at": "2025-01-10T14:00:00Z",
      "usage_count": 5
    }
  ]
}
```

### Create Template from Event
`POST /api/series/templates/from-event/:eventId`

Create a reusable template from an existing event.

**Parameters:**
- `eventId`: Event ID to create template from (path parameter)

**Request Body:**
```json
{
  "template_name": "Workshop Template",
  "description": "Template for educational workshops",
  "is_public": false
}
```

**Required Fields:**
- `template_name`: Name for the template

**Optional Fields:**
- `description`: Template description
- `is_public`: Whether template should be public (default: false)

**Response (201 Created):**
```json
{
  "success": true,
  "template_id": 790,
  "message": "Template created from event"
}
```

## Automation Rule Endpoints

### Get Automation Rules
`GET /api/series/:id/automation`

Get email automation rules configured for a specific series.

**Parameters:**
- `id`: Series ID (path parameter)

**Response (200 OK):**
```json
{
  "success": true,
  "automation_rules": [
    {
      "id": 501,
      "series_id": 123,
      "trigger_type": "event_created",
      "trigger_offset_days": 0,
      "target_audience": "artists",
      "template_id": 301,
      "is_active": true,
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z"
    },
    {
      "id": 502,
      "series_id": 123,
      "trigger_type": "event_reminder",
      "trigger_offset_days": 7,
      "target_audience": "attendees",
      "template_id": 302,
      "is_active": true,
      "created_at": "2025-01-15T10:05:00Z",
      "updated_at": "2025-01-15T10:05:00Z"
    }
  ]
}
```

### Create Automation Rule
`POST /api/series/:id/automation`

Create an email automation rule for a series.

**Parameters:**
- `id`: Series ID (path parameter)

**Request Body:**
```json
{
  "trigger_type": "event_reminder",
  "trigger_offset_days": 14,
  "target_audience": "artists",
  "template_id": 303
}
```

**Required Fields:**
- `trigger_type`: Type of trigger for the automation

**Optional Fields:**
- `trigger_offset_days`: Days offset for trigger (default: 0)
- `target_audience`: Target audience for emails (default: "artists")
- `template_id`: Email template ID to use

**Response (201 Created):**
```json
{
  "success": true,
  "rule_id": 503,
  "message": "Automation rule created"
}
```

## Data Types

### Event Series Object
- `id`: Unique series identifier
- `series_name`: Name of the event series
- `series_description`: Description of the series
- `promoter_id`: ID of the promoter who owns the series
- `recurrence_pattern`: Recurrence pattern ("yearly", "quarterly", "monthly")
- `recurrence_interval`: Interval for recurrence
- `series_start_date`: Start date for the series (ISO 8601)
- `series_end_date`: End date for the series (ISO 8601, nullable)
- `template_event_id`: ID of template event (nullable)
- `auto_generate`: Whether to automatically generate events
- `generate_months_ahead`: How many months ahead to generate
- `next_generation_date`: Next automatic generation date
- `series_status`: Status of the series
- `created_at`: Creation timestamp (ISO 8601)
- `updated_at`: Last update timestamp (ISO 8601)

### Series Statistics (in list view)
- `events_count`: Number of events in the series
- `latest_event_date`: Date of the latest event
- `earliest_event_date`: Date of the earliest event

### Event Template Object
- `id`: Unique template identifier
- `template_name`: Name of the template
- `promoter_id`: ID of the template owner
- `template_config`: Template configuration (JSON string)
- `description`: Template description
- `is_public`: Whether template is publicly available
- `created_at`: Creation timestamp (ISO 8601)
- `updated_at`: Last update timestamp (ISO 8601)
- `usage_count`: Number of series using this template

### Automation Rule Object
- `id`: Unique rule identifier
- `series_id`: ID of the associated series
- `trigger_type`: Type of trigger for automation
- `trigger_offset_days`: Days offset for trigger
- `target_audience`: Target audience for emails
- `template_id`: Email template ID
- `is_active`: Whether rule is active
- `created_at`: Creation timestamp (ISO 8601)
- `updated_at`: Last update timestamp (ISO 8601)

## Recurrence Patterns

### Yearly Pattern
- Events generated annually based on the series start date
- `recurrence_interval`: Number of years between events (e.g., 1 = every year, 2 = every other year)

### Quarterly Pattern
- Events generated every 3 months
- `recurrence_interval`: Multiplier for quarters (e.g., 1 = every quarter, 2 = every other quarter)

### Monthly Pattern
- Events generated monthly
- `recurrence_interval`: Number of months between events (e.g., 1 = every month, 3 = every 3 months)

## Validation Rules

### Series Creation
- `series_name` is required and cannot be empty
- `recurrence_pattern` must be one of: "yearly", "quarterly", "monthly"
- `recurrence_interval` must be a positive integer
- `series_start_date` must be a valid date in ISO 8601 format
- `series_end_date` must be after `series_start_date` if provided

### Template Creation
- `template_name` is required for template creation
- Source event must exist and be owned by the authenticated user
- Template configuration is automatically extracted from the source event

### Automation Rules
- `trigger_type` is required for automation rule creation
- `trigger_offset_days` must be a non-negative integer
- Series must exist and be owned by the authenticated user

## Error Responses

- `400 Bad Request`: Invalid input data
  - Missing required fields
  - Invalid recurrence pattern
  - Invalid date format
  - No valid fields to update
- `401 Unauthorized`: Invalid or missing API key
- `404 Not Found`: 
  - Series not found
  - Event not found (for template creation)
  - Template not found
- `500 Internal Server Error`: Server processing error

## Rate Limits
- 100 requests per minute per API key for read operations
- 50 requests per minute per API key for write operations
- 25 requests per minute per API key for generation operations

## Example Usage

### Create Annual Conference Series
```bash
# Create yearly conference series
curl -X POST https://api.beemeeart.com/api/series \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "series_name": "Annual Tech Conference",
    "series_description": "Yearly technology conference",
    "recurrence_pattern": "yearly",
    "recurrence_interval": 1,
    "series_start_date": "2025-09-15",
    "template_event_id": 789,
    "auto_generate": true,
    "generate_months_ahead": 18
  }'
```

### Create Monthly Workshop Series
```bash
# Create monthly workshop series
curl -X POST https://api.beemeeart.com/api/series \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "series_name": "Monthly Art Workshops",
    "series_description": "Educational workshops for artists",
    "recurrence_pattern": "monthly",
    "recurrence_interval": 1,
    "series_start_date": "2025-10-01",
    "series_end_date": "2026-09-30",
    "auto_generate": true,
    "generate_months_ahead": 6
  }'
```

### Generate Next Event
```bash
# Manually generate next event in series
curl -X POST https://api.beemeeart.com/api/series/123/generate \
  -H "Authorization: Bearer your_api_key"
```

### Create Template from Event
```bash
# Create template from existing event
curl -X POST https://api.beemeeart.com/api/series/templates/from-event/456 \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "template_name": "Workshop Template",
    "description": "Standard workshop template",
    "is_public": true
  }'
```

### Set Up Email Automation
```bash
# Create automation rule for series
curl -X POST https://api.beemeeart.com/api/series/123/automation \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "trigger_type": "event_reminder",
    "trigger_offset_days": 7,
    "target_audience": "artists",
    "template_id": 301
  }'
```

## Integration Notes

### Event Management Integration
- Series automatically create events based on recurrence patterns
- Generated events inherit properties from template events
- Events maintain connection to their originating series
- Series statistics reflect the status of associated events

### Email Automation Integration
- Automation rules trigger email campaigns based on series events
- Rules can target different audiences (artists, attendees, etc.)
- Email templates are referenced by ID for consistent messaging
- Trigger timing is configurable with offset days

### Template System Integration
- Templates capture complete event configurations
- Public templates can be shared across promoters
- Template usage is tracked for popularity metrics
- Templates enable consistent branding across series events

## Best Practices

### Series Planning
- Plan recurrence patterns carefully before creation
- Use meaningful series names and descriptions
- Set appropriate generation timeframes (months ahead)
- Consider end dates for finite series

### Template Management
- Create templates from successful events
- Use descriptive template names and descriptions
- Share useful templates publicly to benefit the community
- Regularly review and update template configurations

### Automation Setup
- Set up automation rules early in series lifecycle
- Use appropriate trigger offsets for optimal timing
- Target the right audience for each automation
- Test automation rules with small audiences first

### Event Generation
- Monitor automatic generation schedules
- Use manual generation for special circumstances
- Review generated events before publishing
- Maintain consistent event naming conventions

## Security Considerations
- Protect API keys and ensure proper authentication
- Verify series ownership before making modifications
- Limit template sharing to appropriate content
- Monitor automation rule execution for abuse
- Regularly review and audit series configurations

## Future Enhancements

### Advanced Features (Coming Soon)
- **Complex Recurrence Patterns:** More sophisticated recurrence rules
- **Template Marketplace:** Public template sharing with ratings
- **Advanced Automation:** Conditional automation with multiple triggers
- **Series Analytics:** Detailed performance metrics and insights

### Enhanced Management (Planned)
- **Bulk Operations:** Batch series operations and management
- **Collaboration:** Multi-promoter series collaboration
- **Integration APIs:** External calendar and platform integration
- **Mobile Optimization:** Mobile-optimized series management

## API Versioning
- Current version: 1.0.0
- Breaking changes will increment major version
- New features increment minor version
- Bug fixes increment patch version
- Deprecation notices provided 90 days before removal

## Support and Documentation
- **API Documentation:** Complete OpenAPI 3.0 specification available
- **Integration Support:** Technical support for API integration
- **Best Practices:** Guidance on effective series management
- **Updates:** Regular updates on new features and capabilities
- **Community:** Developer community for tips and best practices

## Compliance Notes

### Data Handling
- All series data handled securely and in compliance with privacy regulations
- Template configurations stored securely with appropriate access controls
- Automation rule data protected with proper encryption
- User ownership and access rights strictly enforced

### Access Control
- Strict ownership validation for all series operations
- Template sharing controlled by privacy settings
- Automation rules accessible only to series owners
- Complete audit trail for all series modifications

### Event Generation
- Generated events follow all standard event creation policies
- Template application maintains data integrity
- Automation execution logged for compliance
- Series modifications tracked for audit purposes
