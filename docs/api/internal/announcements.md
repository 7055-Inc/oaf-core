# System Announcements - Internal Documentation

## Overview
Comprehensive system announcement management system that provides platform-wide communication capabilities for administrators and targeted user notifications. This system handles announcement creation, scheduling, user targeting, acknowledgment tracking, and analytics. It serves as the primary communication channel for system-wide notifications, updates, and important information distribution to specific user groups.

## Architecture
- **Type:** Route Handler
- **Dependencies:** 
  - Express.js router
  - MySQL database connection
  - JWT middleware for authentication
  - Permission middleware for admin access control
- **Database Tables:** 
  - `announcements` - System announcements with scheduling and targeting
  - `user_acknowledgments` - User acknowledgment and reminder tracking
  - `users` - User information for type-based targeting
- **External APIs:** None (self-contained system)

## Functions/Endpoints

### User-Facing Endpoints
#### GET /check-pending
- **Purpose:** Check if user has unacknowledged announcements
- **Parameters:** None (uses authenticated user ID)
- **Returns:** Pending status with counts and acknowledgment requirements
- **Errors:** 404 for user not found, 500 for database errors
- **Usage Example:** Frontend notification badge and alert system
- **Special Features:**
  - User type-based filtering from database
  - Date range validation (show_from <= current <= expires_at)
  - JSON-based user type targeting with safe parsing
  - Acknowledgment status checking with pending counts
  - Lightweight response for frequent polling
  - Route positioning critical (MUST BE BEFORE admin routes)

#### GET /pending
- **Purpose:** Retrieve full pending announcements for user
- **Parameters:** None (uses authenticated user ID and type)
- **Returns:** Array of complete announcement objects for user's type
- **Errors:** 404 for user not found, 500 for database errors
- **Usage Example:** Announcement modal display and user notification center
- **Special Features:**
  - Complete announcement data retrieval
  - User type validation and filtering
  - Date range enforcement for active announcements
  - Acknowledgment status filtering (unacknowledged only)
  - Robust JSON parsing with multiple format handling
  - Safe fallback for malformed JSON data
  - Route positioning critical (MUST BE BEFORE admin routes)

#### POST /:id/acknowledge
- **Purpose:** Record user acknowledgment of specific announcement
- **Parameters:** Announcement ID (URL parameter)
- **Returns:** Acknowledgment success confirmation
- **Errors:** 404 for announcement/user not found, 403 for wrong user type, 500 for database errors
- **Usage Example:** User dismisses announcement after reading
- **Special Features:**
  - User type validation against announcement targets
  - Announcement validity checking (active, within date range)
  - IP address and user agent tracking for audit purposes
  - Upsert functionality (INSERT ... ON DUPLICATE KEY UPDATE)
  - Comprehensive JSON parsing for target user types
  - Client information capture for security and analytics

#### POST /:id/remind-later
- **Purpose:** Set reminder for announcement without acknowledging
- **Parameters:** Announcement ID (URL parameter)
- **Returns:** Reminder set success confirmation
- **Errors:** 404 for announcement/user not found, 403 for wrong user type, 500 for database errors
- **Usage Example:** User wants to be reminded about announcement later
- **Special Features:**
  - Sets reminder timestamp without acknowledgment
  - Same validation as acknowledge endpoint
  - Separate tracking from full acknowledgment
  - IP and user agent tracking for audit trail
  - Allows users to defer action while tracking engagement

### Administrative Endpoints
#### GET / (Admin)
- **Purpose:** Retrieve all announcements for system management
- **Parameters:** None (admin access required)
- **Returns:** Complete list of announcements with creator information
- **Errors:** 403 for insufficient permissions, 500 for database errors
- **Usage Example:** Admin dashboard announcement management interface
- **Special Features:**
  - Requires 'manage_system' permission
  - Includes creator username via JOIN with users table
  - Comprehensive JSON parsing with error handling
  - Chronological ordering (newest first)
  - Complete announcement data for management interface
  - Proper Content-Type headers for JSON responses

#### POST / (Admin)
- **Purpose:** Create new system announcement
- **Parameters:** Title, content, dates, target user types, active status
- **Returns:** Created announcement ID and success message
- **Errors:** 400 for validation errors, 403 for insufficient permissions, 500 for database errors
- **Usage Example:** Admin creates platform-wide notification or targeted message
- **Special Features:**
  - Comprehensive field validation (required fields, formats)
  - User type validation against allowed types (artist, promoter, community, admin)
  - Date validation (show_from must be before expires_at)
  - JSON serialization of target user types array
  - Creator tracking (created_by field)
  - Default active status handling

#### PUT /:id (Admin)
- **Purpose:** Update existing announcement
- **Parameters:** Announcement ID, optional update fields
- **Returns:** Update success confirmation
- **Errors:** 400 for validation errors, 404 for not found, 403 for insufficient permissions, 500 for database errors
- **Usage Example:** Admin modifies announcement content, dates, or targeting
- **Special Features:**
  - Dynamic field updates (only provided fields updated)
  - Existence validation before update
  - Same validation rules as creation
  - Flexible update system (partial updates supported)
  - User type and date validation for provided fields
  - No-op protection (requires at least one field to update)

#### DELETE /:id (Admin)
- **Purpose:** Delete announcement and related data
- **Parameters:** Announcement ID (URL parameter)
- **Returns:** Deletion success confirmation
- **Errors:** 404 for not found, 403 for insufficient permissions, 500 for database errors
- **Usage Example:** Admin removes outdated or incorrect announcement
- **Special Features:**
  - Cascade deletion of related acknowledgments
  - Existence validation before deletion
  - Two-step deletion process (acknowledgments first, then announcement)
  - Complete cleanup of related data
  - Atomic operation for data integrity

#### GET /:id/stats (Admin)
- **Purpose:** Retrieve comprehensive announcement analytics
- **Parameters:** Announcement ID (URL parameter)
- **Returns:** Detailed statistics including engagement rates
- **Errors:** 404 for not found, 403 for insufficient permissions, 500 for database errors
- **Usage Example:** Admin analyzes announcement effectiveness and user engagement
- **Special Features:**
  - Target audience calculation based on user types
  - Acknowledgment rate calculation and analytics
  - Breakdown by response type (acknowledged, remind later, no response)
  - Percentage calculations for engagement metrics
  - Complete announcement data with statistics
  - Active user filtering for accurate targeting metrics

## Data Models

### Announcement Structure
```javascript
{
  id: number,                     // Announcement ID
  title: string,                  // Announcement title
  content: string,                // Announcement content/message
  show_from: datetime,            // Start date/time for display
  expires_at: datetime,           // Expiration date/time
  target_user_types: array,       // Array of target user types
  is_active: boolean,             // Active status flag
  created_by: number,             // Creator user ID
  created_at: timestamp,          // Creation timestamp
  updated_at: timestamp,          // Last update timestamp
  created_by_username: string     // Creator username (from JOIN)
}
```

### Acknowledgment Structure
```javascript
{
  user_id: number,                // User ID
  announcement_id: number,        // Announcement ID
  acknowledged_at: datetime,      // Acknowledgment timestamp (null if not acknowledged)
  remind_later_at: datetime,      // Reminder timestamp (null if not set)
  ip_address: string,             // Client IP address
  user_agent: string,             // Client user agent
  created_at: timestamp,          // Record creation timestamp
  updated_at: timestamp           // Record update timestamp
}
```

### Statistics Structure
```javascript
{
  announcement: object,           // Complete announcement data
  stats: {
    total_target_users: number,   // Total users in target types
    acknowledged: number,         // Number of acknowledgments
    remind_later: number,         // Number of reminders set
    no_response: number,          // Users with no interaction
    acknowledgment_rate: string   // Percentage acknowledgment rate
  }
}
```

### Pending Check Response
```javascript
{
  hasPending: boolean,            // Whether user has pending announcements
  requiresAcknowledgment: boolean, // Whether acknowledgment is required
  pendingCount: number            // Number of pending announcements
}
```

## Business Logic

### User Type Targeting
- **Valid User Types:** artist, promoter, community, admin
- **JSON Storage:** Target user types stored as JSON array in database
- **Flexible Parsing:** Handles multiple JSON formats from MySQL driver
- **Type Validation:** Comprehensive validation against allowed user types
- **Inclusion Logic:** User must be in target_user_types array to see announcement

### Date Range Management
- **Active Period:** show_from <= current_time < expires_at
- **Scheduling:** Announcements can be scheduled for future display
- **Expiration:** Automatic expiration based on expires_at timestamp
- **Validation:** show_from must be before expires_at during creation/update

### Acknowledgment System
- **Tracking:** Complete user interaction tracking with timestamps
- **Audit Trail:** IP address and user agent capture for security
- **Upsert Logic:** INSERT ... ON DUPLICATE KEY UPDATE for acknowledgments
- **Reminder System:** Separate remind_later tracking without acknowledgment
- **Status Logic:** Acknowledged vs reminded vs no response classification

### JSON Parsing Strategy
- **Multiple Formats:** Handles array, string, null, and undefined formats
- **Error Recovery:** Graceful fallback to empty array on parse errors
- **Type Safety:** Ensures target_user_types is always an array
- **Logging:** Comprehensive error logging for debugging malformed data

## Environment Variables
- No domain-specific environment variables needed for this module
- Database connection handled by shared configuration
- All functionality is self-contained within the API

## Security Considerations
- **Authentication:** JWT token verification for all endpoints
- **Authorization:** 
  - User endpoints require basic authentication
  - Admin endpoints require 'manage_system' permission
- **Data Isolation:** Users only see announcements targeted to their type
- **Input Validation:** Comprehensive validation of all parameters
- **SQL Injection Protection:** Parameterized queries throughout
- **Audit Trail:** IP and user agent tracking for acknowledgments
- **Permission Validation:** Strict permission checking for administrative operations

## Performance Considerations
- **Database Indexing:** Optimized queries on user_id, announcement_id, user_type, dates
- **Query Optimization:** Efficient JOINs and filtering for user type targeting
- **JSON Handling:** Optimized JSON parsing with error recovery
- **Route Ordering:** Critical route positioning to avoid conflicts
- **Caching Opportunities:** Announcement data suitable for caching
- **Connection Pooling:** Database connection management for concurrent operations

## Testing
- **Unit Tests:** Should cover all business logic and validation rules
- **Integration Tests:** Test database operations and user type filtering
- **Security Tests:** Verify permission requirements and data isolation
- **Validation Tests:** Test all parameter validations and edge cases
- **JSON Tests:** Test JSON parsing with various input formats
- **Date Tests:** Test date range validation and scheduling logic

## Error Handling
- **Graceful Degradation:** System continues operating with partial failures
- **Input Validation:** Clear error messages for invalid parameters
- **Permission Errors:** Proper handling of insufficient permissions
- **Database Errors:** Transaction safety and error recovery
- **JSON Parsing:** Robust error handling for malformed JSON data
- **User-Friendly Messages:** Clear error messages for API consumers

## Common Use Cases
- **System Notifications:** Platform-wide announcements and updates
- **Targeted Messaging:** User type-specific communications
- **Scheduled Announcements:** Future-dated announcements and campaigns
- **User Engagement:** Acknowledgment tracking and reminder systems
- **Analytics:** Announcement effectiveness and engagement analysis
- **Administrative Management:** Complete announcement lifecycle management

## Integration Points
- **User Management:** Coordinates with user system for type-based targeting
- **Authentication System:** Integrates with JWT and permission systems
- **Frontend Applications:** Provides data for notification systems and modals
- **Analytics Systems:** Feeds data to business intelligence platforms
- **Audit Systems:** Provides audit trail for user interactions

## API Consistency
- **Response Format:** Consistent JSON response structure across all endpoints
- **Error Handling:** Standardized error response format with appropriate HTTP status codes
- **Authentication:** Consistent JWT token handling and permission checking
- **Validation:** Consistent input validation and error messaging
- **JSON Handling:** Standardized JSON parsing and error recovery
- **Route Organization:** Logical route ordering with conflict prevention

## Future Enhancements
- **Rich Content:** HTML content support and rich media attachments
- **Advanced Targeting:** More sophisticated user targeting criteria
- **Notification Channels:** Email, SMS, and push notification integration
- **Template System:** Reusable announcement templates
- **Scheduling:** Advanced scheduling with recurring announcements
- **Analytics Dashboard:** Real-time analytics and engagement metrics
- **A/B Testing:** Announcement effectiveness testing
- **Localization:** Multi-language announcement support

## Development Notes
- **Route Ordering:** Critical importance of route positioning for user endpoints
- **JSON Handling:** Comprehensive JSON parsing strategy for MySQL compatibility
- **Validation Strategy:** Thorough validation of all user inputs and business rules
- **Error Handling:** Comprehensive error handling with proper HTTP status codes
- **Documentation:** Extensive JSDoc documentation for all functions
- **Security Focus:** Security-first design with proper permission checking
- **Scalability:** Designed to handle high-volume announcement operations
- **User Experience:** Focus on seamless user interaction and acknowledgment flows

## Business Requirements
- **System Communication:** Effective platform-wide communication system
- **User Targeting:** Precise user type-based targeting capabilities
- **Engagement Tracking:** Complete user engagement and acknowledgment tracking
- **Administrative Control:** Full administrative control over announcement lifecycle
- **Analytics:** Comprehensive analytics for announcement effectiveness
- **Scheduling:** Flexible scheduling and expiration management
- **Audit Trail:** Complete audit trail for compliance and security
- **Performance:** Fast response times for user-facing operations

## Monitoring and Logging
- **User Interactions:** Comprehensive logging of all user acknowledgments and reminders
- **Administrative Operations:** Detailed logging of all admin announcement operations
- **JSON Parsing:** Error logging for malformed JSON data debugging
- **Performance Monitoring:** Track query performance for announcement operations
- **Error Tracking:** Detailed error logging for announcement operations
- **Access Monitoring:** Track access to sensitive administrative functions

## Data Privacy and Compliance
- **User Data Protection:** Secure handling of user interaction data
- **Access Control:** Strict access control for administrative functions
- **Audit Trail:** Complete audit trail for compliance requirements
- **Data Retention:** Appropriate retention policies for announcement data
- **Privacy Compliance:** Ensure compliance with user privacy regulations
- **Secure Transmission:** All announcement data transmitted securely
