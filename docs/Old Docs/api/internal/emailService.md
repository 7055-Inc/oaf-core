# emailService.js - Internal Documentation

## Overview
Comprehensive email management system for the Beemeeart platform. Handles template-based email sending, user preferences, bounce management, queue processing, and multi-tenant artist site support.

## Architecture
- **Type:** Service Layer (Business Logic)
- **Dependencies:** nodemailer, database connection
- **Database Tables:** 
  - `email_templates` - Email template storage
  - `email_layouts` - Layout templates
  - `email_queue` - Queued emails
  - `email_log` - Send history
  - `email_tracking` - Event tracking
  - `bounce_tracking` - Bounce management
  - `user_email_preferences` - User preferences
  - `schema_company_data` - Company information
  - `sites`, `users`, `user_profiles`, `artist_profiles` - User and site data
- **External APIs:** SMTP server for email delivery

## Core Functions

### sendEmail(userId, templateKey, templateData, options)
- **Purpose:** Send templated email with full preference and blacklist checking
- **Parameters:** 
  - `userId` (number): Target user ID
  - `templateKey` (string): Email template identifier
  - `templateData` (Object): Data for template rendering
  - `options` (Object): Additional email options
- **Returns:** Promise<Object> with success status and message ID
- **Errors:** Throws if user not found, template missing, or send fails
- **Usage Example:** `await emailService.sendEmail(123, 'welcome', { name: 'John' })`

### queueEmail(userId, templateKey, templateData, options)
- **Purpose:** Queue email for later sending based on user frequency preferences
- **Parameters:** Same as sendEmail plus priority options
- **Returns:** Promise<Object> with queue ID
- **Errors:** Throws if template not found or queueing fails
- **Usage Example:** `await emailService.queueEmail(123, 'newsletter', data, { priority: 1 })`

### processQueue(batchSize)
- **Purpose:** Process queued emails in batches (for cron jobs)
- **Parameters:** `batchSize` (number): Maximum emails to process
- **Returns:** Promise<Array> of processing results
- **Errors:** Logs individual failures, continues processing
- **Usage Example:** `await emailService.processQueue(50)`

## Template System

### Template Rendering
- **Syntax:** `#{variable}` for variable substitution
- **Layouts:** Support for default and artist_site layouts
- **Data Sources:** Company data, artist data, custom template data

### Layout Types
- **default:** Standard Beemeeart branding
- **artist_site:** Custom artist branding with site-specific data

### Template Data Variables
- `email_content`: Rendered email body
- `preferences_link`: Unsubscribe/preferences URL
- `company_*`: Company contact and address data
- `artist_*`: Artist business information (for artist layouts)

## Environment Variables
- `SMTP_HOST`: SMTP server hostname
- `SMTP_PORT`: SMTP server port
- `SMTP_USERNAME`: SMTP authentication username
- `SMTP_PASSWORD`: SMTP authentication password
- `SMTP_FROM_NAME`: Sender display name
- `SMTP_FROM_EMAIL`: Sender email address
- `FRONTEND_URL`: Frontend base URL for links
- `SMART_MEDIA_BASE_URL`: Media server URL for images

## User Preference Management

### Preference Types
- **Frequency:** live, hourly, daily, weekly
- **Categories:** Configurable email categories
- **Transactional Override:** Critical emails bypass preferences

### Scheduling Logic
- **Live:** Immediate sending
- **Hourly:** Next hour boundary
- **Daily:** 8 AM next day
- **Weekly:** 8 AM next Monday

## Bounce Management

### Bounce Types
- **Hard Bounces:** Invalid addresses, permanent failures
- **Soft Bounces:** Temporary failures, full mailboxes

### Blacklisting Rules
- **Hard Bounces:** Blacklist after 3 bounces
- **Soft Bounces:** Blacklist after 5 bounces
- **Automatic Prevention:** Blacklisted addresses rejected before sending

## Multi-Tenant Support

### Artist Site Integration
- Custom domain support
- Artist branding in emails
- Site-specific contact information
- Custom logo integration

### URL Generation
- Environment-based domain configuration
- Custom domain vs subdomain logic
- Fallback handling for missing data

## Security Considerations
- **Authentication requirements:** SMTP authentication required
- **Authorization levels:** User preference validation
- **Input validation rules:** Template data sanitization
- **Rate limiting applied:** None (handled by SMTP server)

## Error Handling
- **Graceful Degradation:** Fallback data for missing company/artist info
- **Comprehensive Logging:** All send attempts logged with status
- **Bounce Tracking:** Automatic bounce handling and blacklisting
- **Queue Recovery:** Failed queue items marked for retry

## Performance Features
- **Batch Processing:** Queue processing in configurable batches
- **Template Caching:** Database-based template storage
- **Preference Caching:** User preference validation
- **Connection Pooling:** Nodemailer connection management

## Testing
- Unit test coverage: Template rendering, preference logic, bounce handling
- Integration test scenarios: SMTP delivery, database operations, queue processing
- Performance benchmarks: Batch processing speed, template rendering performance

## Monitoring and Logging
- **Send Tracking:** Complete audit trail of all email sends
- **Event Tracking:** Open, click, bounce event logging
- **Error Logging:** Detailed error messages with context
- **Queue Monitoring:** Queue depth and processing metrics
