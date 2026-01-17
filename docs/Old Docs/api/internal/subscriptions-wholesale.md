# Wholesale Subscriptions - Internal Documentation

## Overview
Wholesale subscription management system that handles the complete lifecycle of wholesale buyer applications and permissions. This system manages terms acceptance, application submission with comprehensive business validation, admin review processes, and user type/permission management for wholesale marketplace access.

## Architecture
- **Type:** Route Handler
- **Dependencies:** 
  - Express.js router
  - MySQL database connection
  - JWT middleware for authentication
  - Permission middleware for admin access control
- **Database Tables:** 
  - `terms_versions` - Versioned wholesale terms and conditions
  - `user_terms_acceptance` - User acceptance records for wholesale terms
  - `wholesale_applications` - Wholesale buyer applications with full business details
  - `users` - User records (user_type field updated for wholesale access)
  - `user_permissions` - Permission grants for wholesale access (optional table)
- **External APIs:** 
  - None (self-contained system)

## Functions/Endpoints

### Terms Management
#### GET /terms-check
- **Purpose:** Check if user has accepted the latest wholesale terms
- **Parameters:** None (user ID from JWT token)
- **Returns:** Terms acceptance status and latest terms content
- **Errors:** 404 for no terms found, 500 for database errors
- **Usage Example:** Pre-application verification
- **Special Features:**
  - Retrieves current terms version for 'wholesale' subscription type
  - Returns complete terms content for display
  - Boolean acceptance status for UI state management

#### POST /terms-accept
- **Purpose:** Record user acceptance of wholesale terms
- **Parameters:** Terms version ID to accept
- **Returns:** Confirmation of terms acceptance recording
- **Errors:** 400 for missing/invalid terms ID, 404 for invalid terms version, 500 for database errors
- **Usage Example:** Terms acceptance form submission
- **Special Features:**
  - Validates terms version exists and is for 'wholesale' subscription type
  - Uses INSERT IGNORE to handle duplicate acceptance attempts
  - Records acceptance timestamp automatically

### Application Management
#### POST /apply
- **Purpose:** Submit wholesale buyer application with comprehensive business details
- **Parameters:** Complete business information including contact details, business description, and requirements
- **Returns:** Application submission confirmation with application ID
- **Errors:** 400 for missing required fields or existing applications, 500 for processing errors
- **Usage Example:** Wholesale buyer application submission
- **Special Features:**
  - Validates 14 required business fields
  - Prevents duplicate applications (pending, approved, under_review)
  - Stores comprehensive business profile information
  - Supports optional fields for additional business details
  - Auto-sets application status to 'pending'

### Admin Management
#### GET /admin/applications
- **Purpose:** Get wholesale applications filtered by status (Admin only)
- **Parameters:** Optional status filter query parameter
- **Returns:** List of applications with user details
- **Errors:** 401 for insufficient permissions, 500 for database errors
- **Usage Example:** Admin application review dashboard
- **Special Features:**
  - Requires 'manage_system' permission
  - Joins with users table for applicant information
  - Supports status filtering (pending, approved, denied, under_review)
  - Orders by creation date (newest first)
  - Returns full application details with user context

#### PUT /admin/applications/:id/approve
- **Purpose:** Approve wholesale application and grant wholesale access (Admin only)
- **Parameters:** Application ID and optional admin notes
- **Returns:** Approval confirmation
- **Errors:** 401 for insufficient permissions, 404 for application not found, 500 for processing errors
- **Usage Example:** Admin application approval process
- **Special Features:**
  - Requires 'manage_system' permission
  - Uses database transactions for consistency
  - Updates application status and review metadata
  - Changes user type to 'wholesale' in users table
  - Attempts to update user_permissions table (graceful fallback)
  - Records admin user ID and review timestamp
  - Supports admin notes for approval reasoning

#### PUT /admin/applications/:id/deny
- **Purpose:** Deny wholesale application with reason (Admin only)
- **Parameters:** Application ID, denial reason (required), and optional admin notes
- **Returns:** Denial confirmation
- **Errors:** 400 for missing denial reason, 401 for insufficient permissions, 500 for processing errors
- **Usage Example:** Admin application denial process
- **Special Features:**
  - Requires 'manage_system' permission
  - Mandatory denial reason for audit trail
  - Updates application status and review metadata
  - Records admin user ID and review timestamp
  - Supports admin notes for additional context

#### GET /admin/stats
- **Purpose:** Get wholesale application statistics by status (Admin only)
- **Parameters:** None
- **Returns:** Application counts by status (total, pending, approved, denied, under_review)
- **Errors:** 401 for insufficient permissions, 500 for database errors
- **Usage Example:** Admin dashboard statistics display
- **Special Features:**
  - Requires 'manage_system' permission
  - Aggregates application counts by status
  - Single query for efficient statistics retrieval
  - Returns comprehensive status breakdown

## Application Lifecycle

### Application States
- **pending:** Initial state after submission
- **under_review:** Admin has started review process
- **approved:** Application approved, user granted wholesale access
- **denied:** Application rejected with reason

### State Transitions
- **Submit → pending:** User submits complete application
- **pending → under_review:** Admin begins review process
- **under_review → approved/denied:** Admin makes final decision
- **No resubmission:** Users cannot resubmit while application is active

### Permission Integration
- **User Type Update:** Changes user.user_type to 'wholesale'
- **Permission Grant:** Updates user_permissions.wholesale to 1 (if table supports)
- **Graceful Fallback:** Continues if permission table update fails

## Validation System

### Required Fields Validation
- **Business Information:** Name, type, tax ID, complete address
- **Contact Information:** Phone, email, primary contact details
- **Business Profile:** Years in business, description, product categories
- **Order Information:** Expected order volume for capacity planning

### Business Rules
- **Single Application:** Users can only have one active application
- **Complete Profile:** All required business fields must be provided
- **Terms Acceptance:** Must accept terms before application (separate endpoint)
- **Admin Review:** All applications require admin approval

## Database Schema Integration

### Application Storage
- **wholesale_applications:** Complete business profile storage
- **Comprehensive Fields:** 18+ fields covering all business aspects
- **Audit Trail:** Creation timestamps, review metadata, admin notes
- **Status Tracking:** Application lifecycle management

### User Integration
- **users.user_type:** Primary wholesale access control
- **user_permissions.wholesale:** Secondary permission system (optional)
- **Graceful Handling:** Continues if permission table unavailable

### Terms Integration
- **terms_versions:** Version-controlled wholesale terms
- **user_terms_acceptance:** Acceptance audit trail with timestamps

## Environment Variables
- No domain-specific environment variables needed for this module
- Database connection handled by shared configuration
- All functionality is self-contained within the API

## Security Considerations
- **Authentication:** JWT token verification for all endpoints
- **Authorization:** Admin endpoints require 'manage_system' permission
- **Input Validation:** Comprehensive validation of all business fields
- **Duplicate Prevention:** Prevents multiple active applications per user
- **Audit Trail:** Complete tracking of admin actions and decisions
- **Data Integrity:** Database transactions for critical operations

## Performance Considerations
- **Database Indexing:** Optimized queries on user_id, status, created_at
- **Efficient Queries:** Single queries for statistics and application lists
- **Transaction Safety:** Minimal transaction scope for approval process
- **Join Optimization:** Efficient user data joining for application lists

## Testing
- **Unit Tests:** Should cover all application lifecycle operations
- **Integration Tests:** Test admin approval/denial workflows
- **Security Tests:** Verify permission requirements and access control
- **Validation Tests:** Test all required field validations
- **Edge Cases:** Test duplicate applications and invalid states

## Monitoring and Logging
- **Application Tracking:** Monitor application submission and approval rates
- **Error Logging:** Comprehensive error logging for debugging
- **Admin Actions:** Audit trail for all admin decisions
- **Performance Monitoring:** Track database query performance
- **Business Metrics:** Track wholesale program growth and conversion rates

## Common Use Cases
- **Business Application:** Companies applying for wholesale access
- **Admin Review:** Administrators reviewing and processing applications
- **Status Checking:** Users checking application status
- **Bulk Processing:** Admins processing multiple applications
- **Statistics Review:** Monitoring wholesale program performance

## Error Handling
- **Graceful Degradation:** System continues operating with partial failures
- **Input Validation:** Clear error messages for missing or invalid data
- **Permission Errors:** Proper handling of insufficient permissions
- **Database Errors:** Transaction rollback and error recovery
- **Duplicate Handling:** Prevents duplicate applications with clear messaging

## Future Enhancements
- **Application Status Updates:** Additional status states (under_review, etc.)
- **Bulk Admin Actions:** Approve/deny multiple applications at once
- **Application Editing:** Allow users to update pending applications
- **Notification System:** Email notifications for status changes
- **Document Upload:** Support for business documents and certificates
- **Automated Approval:** Rule-based automatic approval for qualified businesses
- **Application Templates:** Pre-filled forms for different business types
- **Integration APIs:** Connect with external business verification services
- **Reporting Dashboard:** Advanced analytics for wholesale program management
- **Tiered Wholesale:** Different wholesale levels with varying benefits

## Integration Points
- **User Management:** Coordinates with user type and permission systems
- **Marketplace Access:** Controls access to wholesale pricing and features
- **Admin Dashboard:** Integrates with admin management interfaces
- **Notification System:** Future integration with email notification system
- **Analytics:** Application and approval tracking for business intelligence

## API Consistency
- **Response Format:** Consistent JSON response structure
- **Error Handling:** Standardized error response format
- **Status Codes:** Proper HTTP status code usage
- **Authentication:** Consistent JWT token handling
- **Permission Model:** Integrated with existing permission system

## Business Logic
- **Application Validation:** Comprehensive business profile validation
- **Admin Workflow:** Structured approval/denial process with audit trail
- **User Type Management:** Seamless integration with user classification system
- **Permission Grants:** Automatic permission assignment upon approval
- **Status Tracking:** Complete application lifecycle management

## Development Notes
- **Modular Design:** Self-contained wholesale application logic
- **Admin Focus:** Comprehensive admin tools for application management
- **Audit Compliance:** Complete tracking of all actions and decisions
- **Scalable:** Supports high volume of applications and admin processing
- **Maintainable:** Clear separation of concerns and comprehensive documentation
