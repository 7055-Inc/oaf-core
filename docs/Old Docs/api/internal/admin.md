# Admin Management - Internal Documentation

## Overview
Comprehensive administrative management system that handles all aspects of system administration including user management, policy management, email administration, event management, and promotion systems. This is the central hub for all administrative operations requiring system-level permissions.

## Architecture
- **Type:** Route Handler
- **Dependencies:** 
  - Express.js router
  - MySQL database connection
  - JWT middleware for authentication
  - Permission middleware for admin access control
  - EmailService for email operations
  - DiscountService for promotion management
- **Database Tables:** 
  - `users` - User records and basic information
  - `user_permissions` - Granular permission management
  - `user_profiles`, `artist_profiles`, `promoter_profiles`, `community_profiles`, `admin_profiles` - Profile data
  - `shipping_policies`, `return_policies` - Policy management
  - `email_queue`, `email_log`, `email_templates`, `bounce_tracking` - Email system
  - `user_email_preferences` - User email preferences
  - `event_applications`, `events`, `application_email_log` - Event management
  - `promotions`, `promotion_invitations`, `promotion_products` - Promotion system
  - `coupons`, `coupon_products` - Coupon management
- **External APIs:** 
  - Email service providers (via EmailService)
  - Stripe (for payment-related promotions)

## Functions/Endpoints

### User Management
#### GET /users
- **Purpose:** List all users in the system
- **Parameters:** None
- **Returns:** Array of users with id, username, status, user_type
- **Errors:** 500 for database errors
- **Usage Example:** Admin dashboard user listing
- **Special Features:**
  - Returns basic user information only for security
  - Ordered by user ID for consistent pagination

#### POST /users
- **Purpose:** Create new user with all profile types
- **Parameters:** Username, status, user_type (all required)
- **Returns:** Created user information
- **Errors:** 400 for missing fields, 500 for database errors
- **Usage Example:** Admin user creation
- **Special Features:**
  - Automatically creates all profile types (artist, promoter, community, admin)
  - Sets email_verified to 'no' by default
  - Creates complete user ecosystem in single operation

#### PUT /users/:id
- **Purpose:** Update existing user information
- **Parameters:** User ID, username, status, user_type
- **Returns:** Update confirmation message
- **Errors:** 500 for database errors
- **Usage Example:** Admin user modification
- **Special Features:**
  - Updates core user fields only
  - Preserves existing profile data

#### DELETE /users/:id
- **Purpose:** Delete user from system
- **Parameters:** User ID
- **Returns:** Deletion confirmation
- **Errors:** 500 for database errors
- **Usage Example:** User account removal
- **Special Features:**
  - Hard delete operation
  - Cascading deletes handled by database constraints

#### GET /users/:id/permissions
- **Purpose:** Retrieve user's permission settings
- **Parameters:** User ID
- **Returns:** Complete permission object or default permissions
- **Errors:** 500 for database errors
- **Usage Example:** Permission review and audit
- **Special Features:**
  - Returns default permissions if no record exists
  - Includes all permission types (vendor, events, stripe_connect, manage_sites, manage_content, manage_system)

#### PUT /users/:id/permissions
- **Purpose:** Update user's permission settings
- **Parameters:** User ID and permission flags (all optional)
- **Returns:** Update confirmation
- **Errors:** 400 for invalid data, 404 for user not found, 500 for database errors
- **Usage Example:** Permission management
- **Special Features:**
  - Dynamic field updates (only provided fields are updated)
  - Creates permission record if none exists
  - Validates user existence before permission updates

### Policy Management
#### GET /default-policies
- **Purpose:** Retrieve current default shipping policy
- **Parameters:** None
- **Returns:** Default shipping policy with metadata
- **Errors:** 500 for database errors
- **Usage Example:** Policy review and management
- **Special Features:**
  - Returns active default policy only
  - Includes creator information and timestamps

#### PUT /default-policies
- **Purpose:** Update default shipping policy with versioning
- **Parameters:** Policy text (required)
- **Returns:** Update confirmation
- **Errors:** 400 for missing policy text, 500 for database errors
- **Usage Example:** Policy updates and compliance
- **Special Features:**
  - Archives current policy before creating new one
  - Uses database transactions for consistency
  - Tracks policy creator and timestamps

#### GET /vendor-policies
- **Purpose:** Search and paginate vendor shipping policies
- **Parameters:** Search term, page, limit (all optional)
- **Returns:** Paginated vendor policies with search capability
- **Errors:** 500 for database errors
- **Usage Example:** Vendor policy management and oversight
- **Special Features:**
  - Searches by username or user ID
  - Includes pagination metadata
  - Shows policy status and creator information
  - Filters to vendor users only

#### GET /vendor-policies/:user_id
- **Purpose:** Get specific vendor's policy details and history
- **Parameters:** Vendor user ID
- **Returns:** Current policy and complete history
- **Errors:** 400 for non-vendor users, 404 for user not found, 500 for database errors
- **Usage Example:** Detailed vendor policy review
- **Special Features:**
  - Validates vendor permissions
  - Returns complete policy history
  - Includes creator metadata for audit trails

#### PUT /vendor-policies/:user_id
- **Purpose:** Update vendor's policy as admin override
- **Parameters:** Vendor user ID, policy text
- **Returns:** Update confirmation
- **Errors:** 400 for validation errors, 404 for user not found, 500 for database errors
- **Usage Example:** Admin policy intervention
- **Special Features:**
  - Admin override capability
  - Archives existing policy
  - Uses transactions for data integrity
  - Records admin as policy creator

#### DELETE /vendor-policies/:user_id
- **Purpose:** Remove vendor's custom policy (revert to default)
- **Parameters:** Vendor user ID
- **Returns:** Deletion confirmation
- **Errors:** 400 for non-vendor users, 404 for user not found, 500 for database errors
- **Usage Example:** Policy reset to defaults
- **Special Features:**
  - Archives all active policies
  - Forces use of default policy
  - Maintains policy history

### Return Policy Management
#### GET /default-return-policies
- **Purpose:** Retrieve current default return policy
- **Parameters:** None
- **Returns:** Default return policy with metadata
- **Errors:** 500 for database errors
- **Usage Example:** Return policy management
- **Special Features:**
  - Mirrors shipping policy functionality
  - Returns active default policy only

#### PUT /default-return-policies
- **Purpose:** Update default return policy with versioning
- **Parameters:** Policy text (required)
- **Returns:** Update confirmation
- **Errors:** 400 for missing policy text, 500 for database errors
- **Usage Example:** Return policy updates
- **Special Features:**
  - Archives current policy before creating new one
  - Uses database transactions for consistency

#### GET /vendor-return-policies
- **Purpose:** Search and paginate vendor return policies
- **Parameters:** Search term, page, limit (all optional)
- **Returns:** Paginated vendor return policies
- **Errors:** 500 for database errors
- **Usage Example:** Vendor return policy oversight
- **Special Features:**
  - Same functionality as shipping policies
  - Vendor-specific filtering and search

#### GET /vendor-return-policies/:user_id
- **Purpose:** Get specific vendor's return policy and history
- **Parameters:** Vendor user ID
- **Returns:** Current return policy and history
- **Errors:** 400 for non-vendor users, 404 for user not found, 500 for database errors
- **Usage Example:** Detailed return policy review

#### PUT /vendor-return-policies/:user_id
- **Purpose:** Update vendor's return policy as admin
- **Parameters:** Vendor user ID, policy text
- **Returns:** Update confirmation
- **Errors:** 400 for validation errors, 404 for user not found, 500 for database errors
- **Usage Example:** Admin return policy management

#### DELETE /vendor-return-policies/:user_id
- **Purpose:** Remove vendor's custom return policy
- **Parameters:** Vendor user ID
- **Returns:** Deletion confirmation
- **Errors:** 400 for non-vendor users, 404 for user not found, 500 for database errors
- **Usage Example:** Return policy reset

### Email Administration
#### GET /email-stats
- **Purpose:** Comprehensive email system statistics
- **Parameters:** None
- **Returns:** Queue stats, email logs, template usage, bounce stats, preference stats
- **Errors:** 500 for database errors
- **Usage Example:** Email system monitoring and analytics
- **Special Features:**
  - Multi-dimensional statistics (queue, logs, templates, bounces, preferences)
  - 30-day rolling statistics for trends
  - Domain-level bounce analysis
  - Template usage tracking

#### GET /email-queue
- **Purpose:** Current email queue status and recent items
- **Parameters:** None
- **Returns:** Queue statistics and recent queue items
- **Errors:** 500 for database errors
- **Usage Example:** Queue monitoring and management
- **Special Features:**
  - Status breakdown by queue state
  - Recent items with template and user information
  - Real-time queue health monitoring

#### GET /email-templates
- **Purpose:** All email templates in the system
- **Parameters:** None
- **Returns:** Complete template list with metadata
- **Errors:** 500 for database errors
- **Usage Example:** Template management and review
- **Special Features:**
  - Ordered by priority and name
  - Includes compilation and transactional flags
  - Template key and content information

#### GET /email-bounces
- **Purpose:** Email bounce tracking and blacklist information
- **Parameters:** None
- **Returns:** Bounce tracking data with domain analysis
- **Errors:** 500 for database errors
- **Usage Example:** Deliverability monitoring and management
- **Special Features:**
  - Domain-level bounce aggregation
  - Hard vs soft bounce classification
  - Blacklist status tracking
  - Recent delivery attempt correlation

#### GET /email-recent
- **Purpose:** Recent email activity with pagination
- **Parameters:** Limit, offset (optional)
- **Returns:** Paginated recent email logs with total count
- **Errors:** 500 for database errors
- **Usage Example:** Email activity monitoring
- **Special Features:**
  - Configurable pagination
  - Total count for pagination UI
  - Ordered by send timestamp

#### POST /email-test
- **Purpose:** Send test email using system templates
- **Parameters:** Recipient (email or user ID), template key, test data (optional)
- **Returns:** Test email confirmation with email ID
- **Errors:** 400 for validation errors, 500 for send failures
- **Usage Example:** Template testing and validation
- **Special Features:**
  - Supports email address or user ID as recipient
  - Custom test data injection
  - Uses EmailService for consistent delivery
  - High priority queue placement

#### POST /email-process-queue
- **Purpose:** Manually trigger email queue processing
- **Parameters:** None
- **Returns:** Queue processing confirmation and results
- **Errors:** 500 for processing errors
- **Usage Example:** Manual queue management
- **Special Features:**
  - Bypasses automatic queue processing
  - Returns processing results
  - Useful for troubleshooting and maintenance

#### POST /email-bounces-unblacklist
- **Purpose:** Remove domain from email blacklist
- **Parameters:** Domain name (required)
- **Returns:** Unblacklist confirmation
- **Errors:** 400 for missing domain, 500 for database errors
- **Usage Example:** Deliverability recovery
- **Special Features:**
  - Domain-wide blacklist removal
  - Resets bounce counts
  - Updates timestamps for tracking

### Event Email Management
#### GET /event-email-stats
- **Purpose:** Event-specific email statistics and metrics
- **Parameters:** None
- **Returns:** Event email stats, recent activity, reminder statistics
- **Errors:** 500 for database errors
- **Usage Example:** Event email monitoring
- **Special Features:**
  - Event-specific email tracking
  - Application-based statistics
  - Reminder timing analysis
  - Auto-decline readiness tracking

#### POST /process-event-reminders
- **Purpose:** Manually trigger event reminder processing
- **Parameters:** None
- **Returns:** Reminder processing results
- **Errors:** 500 for processing errors
- **Usage Example:** Event management automation
- **Special Features:**
  - Processes all due reminders
  - Returns detailed processing results
  - Integrates with EventEmailService

#### POST /process-auto-decline
- **Purpose:** Manually trigger auto-decline processing
- **Parameters:** None
- **Returns:** Auto-decline processing results
- **Errors:** 500 for processing errors
- **Usage Example:** Event application management
- **Special Features:**
  - Processes overdue applications
  - Automatic status updates
  - Email notifications for declined applications

#### POST /send-test-booth-fee-email
- **Purpose:** Send test booth fee emails
- **Parameters:** Application ID, email type (required)
- **Returns:** Test email confirmation
- **Errors:** 400 for validation errors, 500 for send failures
- **Usage Example:** Event email testing
- **Special Features:**
  - Multiple email types (invoice, reminder, overdue, confirmation)
  - Application-specific context
  - Payment intent integration for confirmations

#### GET /applications-needing-reminders
- **Purpose:** Get applications requiring reminder emails
- **Parameters:** None
- **Returns:** Categorized applications needing reminders
- **Errors:** 500 for database errors
- **Usage Example:** Event management dashboard
- **Special Features:**
  - Categorizes by reminder type and timing
  - Due date calculations
  - Reminder status tracking
  - Auto-decline readiness assessment

### Promotion Management
#### GET /promotions/all
- **Purpose:** List all promotions in the system
- **Parameters:** None
- **Returns:** Complete promotion list with basic information
- **Errors:** 500 for database errors
- **Usage Example:** Promotion overview and management
- **Special Features:**
  - Ordered by creation date
  - Basic promotion information for listing

#### POST /promotions/create
- **Purpose:** Create new promotion with comprehensive settings
- **Parameters:** Name, description, discounts, application type, dates, limits (various required)
- **Returns:** Created promotion ID and confirmation
- **Errors:** 400 for validation errors, 500 for database errors
- **Usage Example:** Promotion campaign creation
- **Special Features:**
  - Comprehensive validation of all parameters
  - Coupon code uniqueness checking
  - Transaction-based creation for data integrity
  - Support for auto-apply and coupon-code promotions

#### PUT /promotions/:id
- **Purpose:** Update promotion status and details
- **Parameters:** Promotion ID, status, name, description, valid_until (optional)
- **Returns:** Update confirmation
- **Errors:** 400 for validation errors, 404 for not found, 500 for database errors
- **Usage Example:** Promotion lifecycle management
- **Special Features:**
  - Dynamic field updates
  - Status validation (draft, inviting_vendors, active, paused, ended)
  - Timestamp tracking

#### POST /promotions/:id/invite-vendors
- **Purpose:** Invite vendors to participate in promotion
- **Parameters:** Promotion ID, vendor IDs, product selections, admin message
- **Returns:** Invitation confirmation with count
- **Errors:** 400 for validation errors, 404 for not found, 500 for database errors
- **Usage Example:** Vendor recruitment for promotions
- **Special Features:**
  - Bulk vendor invitations
  - Product pre-selection by admin
  - Invitation expiration management
  - Status updates to promotion

#### GET /promotions/:id/vendor-suggestions
- **Purpose:** Get vendor product suggestions for promotion
- **Parameters:** Promotion ID
- **Returns:** Pending vendor suggestions with product details
- **Errors:** 500 for database errors
- **Usage Example:** Vendor suggestion review
- **Special Features:**
  - Filters to pending suggestions only
  - Includes product and vendor information
  - Ordered by submission date

#### POST /promotions/:id/approve-suggestion
- **Purpose:** Approve vendor product suggestion
- **Parameters:** Promotion ID, suggestion ID, discount percentages (optional)
- **Returns:** Approval confirmation
- **Errors:** 400 for validation errors, 404 for not found, 500 for database errors
- **Usage Example:** Vendor suggestion management
- **Special Features:**
  - Optional discount override
  - Approval timestamp tracking
  - Status change to approved

#### POST /promotions/:id/reject-suggestion
- **Purpose:** Reject vendor product suggestion
- **Parameters:** Promotion ID, suggestion ID
- **Returns:** Rejection confirmation
- **Errors:** 400 for validation errors, 404 for not found, 500 for database errors
- **Usage Example:** Vendor suggestion management
- **Special Features:**
  - Simple rejection workflow
  - Status change to rejected

### Coupon Management
#### GET /coupons/all
- **Purpose:** List all admin-created coupons
- **Parameters:** None
- **Returns:** Admin coupon list with details
- **Errors:** 500 for database errors
- **Usage Example:** Coupon overview and management
- **Special Features:**
  - Filters to admin_coupon type only
  - Includes vendor-specific and product-specific flags

#### POST /coupons
- **Purpose:** Create admin coupon with comprehensive settings
- **Parameters:** Code, name, discount details, limits, dates, targeting (various required)
- **Returns:** Created coupon information
- **Errors:** 400 for validation errors, 500 for database errors
- **Usage Example:** Admin coupon creation
- **Special Features:**
  - Code uniqueness validation
  - Support for vendor-specific and product-specific coupons
  - Comprehensive discount configuration
  - Transaction-based creation

#### PUT /coupons/:id
- **Purpose:** Update admin coupon status
- **Parameters:** Coupon ID, is_active flag
- **Returns:** Update confirmation
- **Errors:** 404 for not found, 500 for database errors
- **Usage Example:** Coupon activation/deactivation
- **Special Features:**
  - Simple status toggle
  - Admin coupon type validation

### Sales Management
#### POST /sales/create-sitewide
- **Purpose:** Create site-wide sale with optional product targeting
- **Parameters:** Name, discount details, application type, dates, limits, product IDs (optional)
- **Returns:** Created sale ID and confirmation
- **Errors:** 400 for validation errors, 500 for database errors
- **Usage Example:** Site-wide promotion creation
- **Special Features:**
  - Site-wide or product-specific sales
  - Automatic coupon code generation if not provided
  - Product-vendor relationship tracking

#### GET /sales/all
- **Purpose:** List all site-wide sales
- **Parameters:** None
- **Returns:** Site sale list with details
- **Errors:** 500 for database errors
- **Usage Example:** Sale management overview
- **Special Features:**
  - Filters to site_sale type only
  - Ordered by creation date

#### PUT /sales/:id
- **Purpose:** Update sale status and details
- **Parameters:** Sale ID, status, name, description, discount_value, valid_until (optional)
- **Returns:** Update confirmation
- **Errors:** 400 for validation errors, 404 for not found, 500 for database errors
- **Usage Example:** Sale lifecycle management
- **Special Features:**
  - Dynamic field updates
  - Sale type validation

### Analytics
#### GET /promotions/analytics/overview
- **Purpose:** Comprehensive promotion analytics and metrics
- **Parameters:** None
- **Returns:** Overview statistics and recent activity
- **Errors:** 500 for database errors
- **Usage Example:** Promotion performance monitoring
- **Special Features:**
  - Multi-dimensional analytics (promotions, vendors, products, usage)
  - Recent activity timeline
  - Vendor participation metrics
  - Usage tracking and trends

## Environment Variables
- No domain-specific environment variables needed for this module
- Database connection handled by shared configuration
- Email service configuration managed by EmailService
- All functionality is self-contained within the API

## Security Considerations
- **Authentication:** JWT token verification for all endpoints
- **Authorization:** All endpoints require 'manage_system' permission
- **Input Validation:** Comprehensive validation of all request parameters
- **SQL Injection Protection:** Parameterized queries throughout
- **Transaction Safety:** Database transactions for critical operations
- **Audit Trail:** Complete logging of admin actions with timestamps and user IDs
- **Permission Validation:** User existence and permission checks before operations
- **Data Integrity:** Foreign key constraints and referential integrity

## Performance Considerations
- **Database Indexing:** Optimized queries on user_id, status, created_at, email addresses
- **Pagination:** Efficient pagination for large datasets (users, policies, emails)
- **Query Optimization:** Joins optimized for performance
- **Connection Pooling:** Database connection management for concurrent requests
- **Caching Opportunities:** Template data, policy data, statistics could be cached
- **Bulk Operations:** Efficient bulk processing for promotions and invitations

## Testing
- **Unit Tests:** Should cover all CRUD operations and business logic
- **Integration Tests:** Test admin workflows and permission enforcement
- **Security Tests:** Verify permission requirements and access control
- **Performance Tests:** Test pagination and bulk operations
- **Email Tests:** Verify email sending and queue processing
- **Transaction Tests:** Test rollback scenarios and data integrity

## Monitoring and Logging
- **Admin Actions:** Comprehensive logging of all administrative actions
- **Performance Monitoring:** Track query performance and response times
- **Error Tracking:** Detailed error logging for debugging
- **Usage Analytics:** Monitor admin feature usage and patterns
- **Security Monitoring:** Track permission changes and access patterns
- **Email Monitoring:** Track email system health and deliverability

## Common Use Cases
- **User Management:** Creating, updating, and managing user accounts and permissions
- **Policy Administration:** Managing default and vendor-specific policies
- **Email System Management:** Monitoring email health, processing queues, managing bounces
- **Event Management:** Processing event reminders and managing applications
- **Promotion Campaigns:** Creating and managing promotional campaigns with vendor participation
- **Coupon Management:** Creating and managing admin coupons and site-wide sales
- **System Monitoring:** Reviewing system statistics and performance metrics

## Error Handling
- **Graceful Degradation:** System continues operating with partial failures
- **Input Validation:** Clear error messages for invalid or missing data
- **Permission Errors:** Proper handling of insufficient permissions
- **Database Errors:** Transaction rollback and error recovery
- **Email Errors:** Proper handling of email service failures
- **Concurrent Access:** Handling of concurrent admin operations

## Future Enhancements
- **Bulk Operations:** Enhanced bulk user and policy management
- **Advanced Analytics:** More detailed reporting and analytics dashboards
- **Automated Workflows:** Automated policy updates and user management
- **Integration APIs:** External system integration for user management
- **Advanced Permissions:** More granular permission system
- **Audit Dashboard:** Visual audit trail and action history
- **Performance Optimization:** Caching layer for frequently accessed data
- **Real-time Notifications:** Live updates for admin actions and system events
- **Advanced Email Features:** Template editor, A/B testing, advanced analytics
- **Promotion Analytics:** Detailed promotion performance tracking and ROI analysis

## Integration Points
- **User Management:** Coordinates with authentication and authorization systems
- **Email System:** Integrates with EmailService for all email operations
- **Event System:** Manages event-related emails and applications
- **Promotion System:** Handles complex promotion workflows with vendor participation
- **Payment System:** Integrates with Stripe for promotion and coupon processing
- **Analytics:** Provides data for business intelligence and reporting systems

## API Consistency
- **Response Format:** Consistent JSON response structure across all endpoints
- **Error Handling:** Standardized error response format with appropriate HTTP status codes
- **Authentication:** Consistent JWT token handling and permission checking
- **Pagination:** Standardized pagination format where applicable
- **Validation:** Consistent input validation and error messaging

## Business Logic
- **User Lifecycle:** Complete user management from creation to deletion
- **Policy Management:** Hierarchical policy system with defaults and overrides
- **Email Operations:** Comprehensive email system management and monitoring
- **Promotion Workflows:** Complex promotion creation and vendor management
- **Permission System:** Granular permission management with role-based access
- **Audit Compliance:** Complete tracking of all administrative actions

## Development Notes
- **Modular Design:** Well-organized endpoint groupings for maintainability
- **Transaction Safety:** Proper use of database transactions for data integrity
- **Error Handling:** Comprehensive error handling with proper HTTP status codes
- **Documentation:** Extensive JSDoc documentation for all functions
- **Security Focus:** Security-first design with proper permission checking
- **Scalability:** Designed to handle high-volume administrative operations
