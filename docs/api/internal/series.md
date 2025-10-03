# Event Series Management - Internal Documentation

## Overview
Comprehensive event series management system that provides automated event generation, template management, and email automation for recurring events. This system handles event series with various recurrence patterns (yearly, quarterly, monthly), template-based event creation, and sophisticated automation rules for email marketing. It serves as the primary system for managing recurring events, event templates, and automated communication workflows.

## Architecture
- **Type:** Route Handler
- **Dependencies:** 
  - Express.js router
  - MySQL database connection
  - JWT middleware for authentication
  - Permission middleware for access control
- **Database Tables:** 
  - `event_series` - Main series configuration and recurrence patterns
  - `series_events` - Event-series associations with sequence tracking
  - `events` - Individual event records
  - `event_templates` - Reusable event templates
  - `email_automation_rules` - Email automation configuration
  - `automation_logs` - Automation execution logs
- **External APIs:** None (self-contained system)

## Functions/Endpoints

### Series Management
#### GET /
- **Purpose:** Retrieve all event series for authenticated promoter
- **Parameters:** None (uses authenticated user ID)
- **Returns:** List of series with statistics (event counts, date ranges)
- **Errors:** 500 for database errors
- **Usage Example:** Promoter dashboard series overview
- **Special Features:**
  - Promoter ownership filtering
  - Event count aggregation for each series
  - Latest and earliest event date calculation
  - Chronological ordering (newest first)
  - Complete series statistics in single query
  - Comprehensive series overview with metrics

#### GET /:id
- **Purpose:** Retrieve detailed information for specific event series
- **Parameters:** Series ID (URL parameter)
- **Returns:** Complete series details with events and automation rules
- **Errors:** 404 for series not found, 500 for database errors
- **Usage Example:** Series detail view and management interface
- **Special Features:**
  - Ownership validation (promoter must own series)
  - Template event information resolution
  - Associated events with sequence numbers and generation metadata
  - Automation rules with trigger configuration
  - Complete series ecosystem in single response
  - Template integration with event title resolution

#### POST /
- **Purpose:** Create new event series with recurrence configuration
- **Parameters:** Series name, description, recurrence pattern, dates, template settings
- **Returns:** Created series ID and success message
- **Errors:** 400 for validation errors, 500 for database errors
- **Usage Example:** New series creation with automation setup
- **Special Features:**
  - Required field validation (name, pattern, start date)
  - Automatic next generation date calculation
  - Template event association
  - Auto-generation configuration
  - Automation logging for series creation
  - Flexible recurrence pattern support (yearly/quarterly/monthly)

#### PUT /:id
- **Purpose:** Update existing event series configuration
- **Parameters:** Series ID, update data (various optional fields)
- **Returns:** Update success message
- **Errors:** 404 for series not found, 400 for validation errors, 500 for database errors
- **Usage Example:** Series configuration updates and modifications
- **Special Features:**
  - Ownership validation before updates
  - Dynamic field updates (only provided fields updated)
  - Allowed fields whitelist for security
  - Flexible update system supporting partial updates
  - No-op protection (requires at least one field)
  - Comprehensive field validation

#### POST /:id/generate
- **Purpose:** Manually generate next event in series based on pattern
- **Parameters:** Series ID (URL parameter)
- **Returns:** Generated event ID and success message
- **Errors:** 404 for series not found, 500 for database errors
- **Usage Example:** Manual event generation for series
- **Special Features:**
  - Ownership validation and series verification
  - Template event data retrieval and processing
  - Automatic sequence number calculation
  - Date calculation based on recurrence pattern
  - Event creation from template with customization
  - Series-event association with generation metadata
  - Comprehensive automation logging

### Template Management
#### GET /templates/my
- **Purpose:** Retrieve available event templates for promoter
- **Parameters:** None (uses authenticated user ID)
- **Returns:** List of templates with usage statistics
- **Errors:** 500 for database errors
- **Usage Example:** Template selection for series creation
- **Special Features:**
  - Promoter-owned and public template access
  - Usage count calculation for each template
  - Template popularity metrics
  - Comprehensive template information
  - Public template sharing support
  - Template usage analytics

#### POST /templates/from-event/:eventId
- **Purpose:** Create reusable template from existing event
- **Parameters:** Event ID, template name, description, public flag
- **Returns:** Created template ID and success message
- **Errors:** 404 for event not found, 500 for database errors
- **Usage Example:** Template creation from successful events
- **Special Features:**
  - Event ownership validation
  - Complete event data extraction and cleaning
  - Template configuration JSON storage
  - Public template sharing option
  - Template metadata management
  - Event data sanitization (removes IDs and timestamps)

### Automation Management
#### GET /:id/automation
- **Purpose:** Retrieve email automation rules for series
- **Parameters:** Series ID (URL parameter)
- **Returns:** List of automation rules with trigger configuration
- **Errors:** 404 for series not found, 500 for database errors
- **Usage Example:** Automation rule management interface
- **Special Features:**
  - Series ownership validation
  - Complete automation rule configuration
  - Trigger type organization
  - Rule priority and ordering
  - Comprehensive automation overview
  - Email template integration

#### POST /:id/automation
- **Purpose:** Create email automation rule for series
- **Parameters:** Series ID, trigger type, offset days, audience, template ID
- **Returns:** Created rule ID and success message
- **Errors:** 404 for series not found, 500 for database errors
- **Usage Example:** Email automation setup for series
- **Special Features:**
  - Series ownership validation
  - Flexible trigger configuration
  - Target audience specification
  - Email template integration
  - Default value handling (audience defaults to 'artists')
  - Comprehensive automation rule creation

## Data Models

### Event Series Structure
```javascript
{
  id: number,                         // Series ID
  series_name: string,                // Series name
  series_description: string,         // Series description
  promoter_id: number,                // Promoter user ID
  recurrence_pattern: string,         // Recurrence pattern (yearly/quarterly/monthly)
  recurrence_interval: number,        // Recurrence interval
  series_start_date: date,            // Series start date
  series_end_date: date,              // Series end date (optional)
  template_event_id: number,          // Template event ID (optional)
  auto_generate: boolean,             // Auto-generation flag
  generate_months_ahead: number,      // Months ahead to generate
  next_generation_date: date,         // Next generation date
  series_status: string,              // Series status
  created_at: timestamp,              // Creation timestamp
  updated_at: timestamp,              // Last update timestamp
  
  // Aggregated statistics (from GET endpoints)
  events_count: number,               // Number of events in series
  latest_event_date: date,            // Latest event date
  earliest_event_date: date,          // Earliest event date
  template_name: string,              // Template name (from JOIN)
  template_event_title: string        // Template event title (from JOIN)
}
```

### Series Events Structure
```javascript
{
  series_id: number,                  // Series ID
  event_id: number,                   // Event ID
  sequence_number: number,            // Event sequence number
  generated_date: timestamp,          // Generation timestamp
  generation_method: string,          // Generation method (manual/automatic)
  
  // Event details (from JOIN)
  // ... all event fields from events table
}
```

### Event Template Structure
```javascript
{
  id: number,                         // Template ID
  template_name: string,              // Template name
  promoter_id: number,                // Template owner ID
  template_config: string,            // Template configuration JSON
  description: string,                // Template description
  is_public: boolean,                 // Public template flag
  created_at: timestamp,              // Creation timestamp
  updated_at: timestamp,              // Last update timestamp
  
  // Usage statistics (from GET endpoints)
  usage_count: number                 // Number of series using template
}
```

### Automation Rule Structure
```javascript
{
  id: number,                         // Rule ID
  series_id: number,                  // Series ID
  trigger_type: string,               // Trigger type
  trigger_offset_days: number,        // Days offset for trigger
  target_audience: string,            // Target audience
  template_id: number,                // Email template ID
  is_active: boolean,                 // Active status
  created_at: timestamp,              // Creation timestamp
  updated_at: timestamp               // Last update timestamp
}
```

### Automation Log Structure
```javascript
{
  id: number,                         // Log ID
  automation_type: string,            // Automation type
  series_id: number,                  // Series ID
  event_id: number,                   // Event ID (optional)
  status: string,                     // Execution status
  message: string,                    // Log message
  created_at: timestamp               // Log timestamp
}
```

## Business Logic

### Recurrence Pattern Management
- **Yearly Pattern:** Events generated annually based on start date and interval
- **Quarterly Pattern:** Events generated every 3 months with interval multiplier
- **Monthly Pattern:** Events generated monthly with interval support
- **Sequence Tracking:** Each event assigned sequence number for ordering
- **Date Calculation:** Automatic date calculation based on pattern and sequence

### Template System
- **Event Extraction:** Complete event data extraction for template creation
- **Data Sanitization:** Removal of IDs and timestamps from template data
- **Configuration Storage:** Template data stored as JSON configuration
- **Public Sharing:** Support for public templates accessible to all promoters
- **Usage Tracking:** Template usage statistics and popularity metrics

### Automation Rules
- **Trigger Types:** Various trigger types for email automation
- **Offset Configuration:** Days offset for trigger timing
- **Audience Targeting:** Target audience specification for emails
- **Template Integration:** Email template association for automation
- **Rule Management:** Complete automation rule lifecycle management

### Event Generation
- **Manual Generation:** On-demand event generation for series
- **Template Application:** Template data application to new events
- **Date Calculation:** Automatic date calculation based on recurrence
- **Sequence Management:** Automatic sequence number assignment
- **Logging:** Comprehensive logging of generation activities

## Environment Variables
- No domain-specific environment variables needed for this module
- Database connection handled by shared configuration
- All functionality is self-contained within the API

## Security Considerations
- **Authentication:** JWT token verification for all endpoints
- **Ownership Validation:** Strict ownership validation for all series operations
- **Data Isolation:** Users only access their own series and templates
- **Input Validation:** Comprehensive validation of all parameters
- **SQL Injection Protection:** Parameterized queries throughout
- **Template Security:** Safe template data handling and sanitization

## Performance Considerations
- **Database Indexing:** Optimized queries on promoter_id, series_id, event_id
- **Query Optimization:** Efficient JOINs and aggregations for statistics
- **Template Storage:** Efficient JSON storage for template configurations
- **Sequence Calculation:** Optimized sequence number calculation
- **Automation Queries:** Efficient automation rule retrieval and processing
- **Connection Pooling:** Database connection management for concurrent operations

## Testing
- **Unit Tests:** Should cover all business logic and recurrence calculations
- **Integration Tests:** Test database operations and template creation
- **Automation Tests:** Test automation rule creation and execution
- **Generation Tests:** Test event generation with various patterns
- **Template Tests:** Test template creation and application
- **Security Tests:** Verify ownership validation and access control

## Error Handling
- **Ownership Errors:** Clear error messages for ownership violations
- **Validation Errors:** Comprehensive validation error messages
- **Template Errors:** Proper handling of template creation and application errors
- **Generation Errors:** Robust error handling for event generation
- **Database Errors:** Transaction safety and error recovery
- **User-Friendly Messages:** Clear error messages for API consumers

## Common Use Cases
- **Recurring Events:** Annual conferences, quarterly meetings, monthly workshops
- **Event Templates:** Reusable event configurations for consistent branding
- **Email Automation:** Automated email campaigns for event promotion
- **Series Management:** Complete lifecycle management of event series
- **Template Sharing:** Public template sharing for community benefit
- **Event Scheduling:** Automated event scheduling based on patterns

## Integration Points
- **Event System:** Coordinates with main event system for event creation
- **Email System:** Integrates with email automation for marketing campaigns
- **User System:** Coordinates with user system for promoter validation
- **Template System:** Provides template functionality for event reuse
- **Automation System:** Integrates with automation systems for email triggers
- **Analytics Systems:** Feeds data to business intelligence platforms

## API Consistency
- **Response Format:** Consistent JSON response structure across all endpoints
- **Error Handling:** Standardized error response format with appropriate HTTP status codes
- **Authentication:** Consistent JWT token handling and ownership validation
- **Validation:** Consistent input validation and error messaging
- **Template Handling:** Standardized template creation and application
- **Automation Management:** Consistent automation rule handling

## Future Enhancements
- **Advanced Patterns:** More sophisticated recurrence patterns and rules
- **Template Marketplace:** Public template marketplace with ratings
- **Advanced Automation:** More complex automation triggers and conditions
- **Analytics Dashboard:** Detailed series performance and engagement analytics
- **Bulk Operations:** Bulk series operations and batch processing
- **Integration APIs:** External calendar and event platform integration
- **Mobile Support:** Mobile-optimized series management interface
- **Collaboration:** Multi-promoter series collaboration features

## Development Notes
- **Recurrence Focus:** Specialized for recurring event management
- **Template System:** Comprehensive template creation and reuse
- **Automation Integration:** Complete email automation integration
- **Performance Optimization:** Optimized for series and template operations
- **Documentation:** Extensive JSDoc documentation for all functions
- **Security Focus:** Security-first design with ownership validation
- **Scalability:** Designed to handle large numbers of series and events
- **User Experience:** Focus on intuitive series management workflows

## Business Requirements
- **Recurring Events:** Support for various recurring event patterns
- **Template Reuse:** Efficient template creation and reuse capabilities
- **Email Automation:** Complete email automation for event marketing
- **Series Analytics:** Comprehensive series performance tracking
- **User Ownership:** Strict user ownership and access control
- **Template Sharing:** Public template sharing for community benefit
- **Event Generation:** Automated and manual event generation
- **Comprehensive Management:** Complete series lifecycle management

## Monitoring and Logging
- **Series Operations:** Comprehensive logging of all series operations
- **Event Generation:** Monitor event generation success and failures
- **Template Usage:** Track template usage and popularity
- **Automation Execution:** Monitor automation rule execution and performance
- **Performance Monitoring:** Track query performance for series operations
- **Error Tracking:** Detailed error logging for series operations

## Data Privacy and Compliance
- **User Data Protection:** Secure handling of promoter and series data
- **Access Control:** Strict access control for series and template data
- **Template Privacy:** Appropriate privacy controls for template sharing
- **Automation Privacy:** Secure handling of automation rule data
- **Data Retention:** Appropriate retention policies for series data
- **Privacy Compliance:** Ensure compliance with data privacy regulations

## Utility Functions

### getLastSequenceNumber(seriesId)
- **Purpose:** Retrieve highest sequence number for series events
- **Parameters:** Series ID
- **Returns:** Last sequence number (0 if no events)
- **Usage:** Event generation sequence calculation

### calculateNextEventDates(seriesInfo, sequenceNumber)
- **Purpose:** Calculate event dates based on recurrence pattern
- **Parameters:** Series configuration, sequence number
- **Returns:** Object with start_date, end_date, and year
- **Usage:** Automatic date calculation for event generation
- **Patterns:** Supports yearly, quarterly, and monthly patterns

### createEventFromTemplate(eventData)
- **Purpose:** Create event record from template data
- **Parameters:** Event data object
- **Returns:** Created event ID
- **Usage:** Event creation from template configuration
- **Features:** Dynamic field insertion and data sanitization
