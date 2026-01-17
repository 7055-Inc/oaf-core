# Website Subscriptions - Internal Documentation

## Overview
Website subscription management system that handles the complete lifecycle of website hosting and feature subscriptions. This system manages terms acceptance, subscription creation with plan selection, addon management (user-level and site-level), permission grants, and subscription status tracking.

## Architecture
- **Type:** Route Handler
- **Dependencies:** 
  - Express.js router
  - MySQL database connection
  - JWT middleware for authentication
- **Database Tables:** 
  - `terms_versions` - Versioned website terms and conditions
  - `user_terms_acceptance` - User acceptance records for website terms
  - `user_permissions` - Permission grants for site creation and management
  - `website_addons` - Available addons with configuration
  - `user_addons` - User-activated addons
  - `sites` - User-created websites (for counting)
- **External APIs:** 
  - Stripe integration (planned for payment processing)

## Functions/Endpoints

### Terms Management
#### GET /terms-check
- **Purpose:** Check if user has accepted the latest website terms
- **Parameters:** None (user ID from JWT token)
- **Returns:** Terms acceptance status and latest terms content
- **Errors:** 404 for no terms found, 500 for database errors
- **Usage Example:** Pre-subscription verification
- **Special Features:**
  - Retrieves current terms version for 'sites' subscription type
  - Returns complete terms content for display
  - Boolean acceptance status for UI state management

#### POST /terms-accept
- **Purpose:** Record user acceptance of website terms
- **Parameters:** Terms version ID to accept
- **Returns:** Confirmation of terms acceptance recording
- **Errors:** 400 for missing/invalid terms ID, 404 for invalid terms version, 500 for database errors
- **Usage Example:** Terms acceptance form submission
- **Special Features:**
  - Validates terms version exists and is for 'sites' subscription type
  - Uses INSERT IGNORE to handle duplicate acceptance attempts
  - Records acceptance timestamp automatically

### Subscription Management
#### POST /signup
- **Purpose:** Create website subscription and grant sites permission
- **Parameters:** Plan name, permissions, addons, pricing, payment method, discounts
- **Returns:** Subscription confirmation with granted permissions
- **Errors:** 400 for invalid plan or existing subscription, 500 for processing errors
- **Usage Example:** Website subscription creation
- **Special Features:**
  - Validates plan names against predefined list
  - Prevents duplicate subscriptions
  - Handles both user-level and site-level addons
  - Grants multiple permissions based on plan
  - Processes discount applications
  - Returns complete permission list for UI updates

#### POST /cancel
- **Purpose:** Cancel website subscription and revoke sites permission
- **Parameters:** None (user ID from JWT token)
- **Returns:** Cancellation confirmation
- **Errors:** 400 for no active subscription, 500 for database errors
- **Usage Example:** Subscription cancellation
- **Special Features:**
  - Validates existing subscription before cancellation
  - Revokes sites permission
  - Prepared for Stripe subscription cancellation integration

#### GET /status
- **Purpose:** Get current website subscription status with site count
- **Parameters:** None (user ID from JWT token)
- **Returns:** Subscription status and number of created sites
- **Errors:** 500 for database errors
- **Usage Example:** Dashboard subscription status display
- **Special Features:**
  - Checks sites permission for subscription status
  - Counts non-deleted sites for usage tracking
  - Returns simple active/inactive status

## Plan Management

### Available Plans
- **Starter Plan:** Basic website features
- **Professional Plan:** Enhanced features for professionals
- **Business Plan:** Advanced business features
- **Promoter Plan:** Event promotion specific features

### Plan Validation
- Validates plan names against hardcoded list
- Prevents invalid plan selection
- Supports future dynamic plan configuration

## Addon System

### Addon Types
- **User-Level Addons:** Activated immediately upon subscription
- **Site-Level Addons:** Applied when user creates sites

### Addon Processing
- Queries addon details to determine activation level
- Activates user-level addons in `user_addons` table
- Stores site-level addons for future site creation
- Supports addon deactivation and reactivation
- Tracks subscription source for addon management

### Addon Database Integration
- Uses `website_addons` table for addon definitions
- Stores activations in `user_addons` table
- Supports addon slug-based identification
- Tracks activation/deactivation timestamps

## Permission System

### Permission Types
- **sites:** Basic site creation permission
- **manage_sites:** Advanced site management permission
- **vendor:** Marketplace vendor access
- **events:** Event management access
- **stripe_connect:** Payment processing access
- **manage_content:** Content management access
- **manage_system:** System administration access
- **verified:** Verified user status
- **shipping:** Shipping label access

### Permission Management
- Updates existing permission records or creates new ones
- Supports multiple permission grants in single operation
- Returns complete permission list for frontend state
- Integrates with existing permission system

## Database Schema Integration

### Terms Tables
- **terms_versions:** Versioned terms with subscription type filtering
- **user_terms_acceptance:** Acceptance records with timestamps

### Permission Tables
- **user_permissions:** Comprehensive permission management
- **user_addons:** Addon activation tracking

### Site Tables
- **sites:** Site creation and management (referenced for counting)

## Environment Variables
- No domain-specific environment variables needed for this module
- Future Stripe integration will require payment configuration
- Database connection handled by shared configuration

## Security Considerations
- **Authentication:** JWT token verification for all endpoints
- **Authorization:** Permission-based access control
- **Input Validation:** Plan name and terms version validation
- **Duplicate Prevention:** Prevents duplicate subscriptions and terms acceptance
- **Data Integrity:** Uses database constraints and transactions

## Subscription Lifecycle

### States and Transitions
- **No Subscription:** User has no sites permission
- **Active:** User has sites permission and can create websites
- **Canceled:** Sites permission revoked, existing sites may remain

### Permission Integration
- Seamlessly integrates with existing permission system
- Supports multiple permission types per subscription
- Maintains permission consistency across system

## Payment Integration (Planned)

### Stripe Integration Points
- Payment method processing in signup endpoint
- Subscription creation and management
- Discount and coupon handling
- Webhook processing for subscription events

### Current Implementation
- Simulates successful payment processing
- Grants permissions immediately
- Prepared for Stripe integration with TODO markers

## Performance Considerations
- **Database Indexing:** Optimized queries on user_id, subscription_type
- **Permission Caching:** Efficient permission retrieval and updates
- **Addon Processing:** Batch processing for multiple addons
- **Site Counting:** Efficient counting with status filtering

## Testing
- **Unit Tests:** Should cover all subscription lifecycle operations
- **Integration Tests:** Test permission grants and addon activation
- **Security Tests:** Verify access control and input validation
- **Payment Tests:** Test Stripe integration when implemented

## Monitoring and Logging
- **Subscription Tracking:** Monitor subscription creation and cancellation rates
- **Error Logging:** Comprehensive error logging for debugging
- **Permission Auditing:** Track permission grants and revocations
- **Usage Analytics:** Track plan selection and addon usage

## Common Use Cases
- **New User Onboarding:** First-time website subscription setup
- **Plan Upgrades:** Changing subscription plans (future enhancement)
- **Addon Management:** Adding or removing website features
- **Subscription Cancellation:** Ending website hosting services
- **Status Checking:** Dashboard subscription status display

## Error Handling
- **Graceful Degradation:** System continues operating with partial failures
- **Input Validation:** Clear error messages for invalid inputs
- **Duplicate Handling:** Prevents duplicate subscriptions and acceptances
- **Database Errors:** Proper error handling and user feedback

## Future Enhancements
- **Dynamic Plan Configuration:** Database-driven plan definitions
- **Plan Upgrades/Downgrades:** Subscription modification functionality
- **Usage Limits:** Enforce site limits based on subscription plans
- **Billing Integration:** Complete Stripe payment processing
- **Addon Marketplace:** Expanded addon ecosystem
- **Site Templates:** Plan-specific site templates and features
- **Analytics Dashboard:** Subscription and usage analytics
- **Automated Billing:** Recurring payment processing
- **Proration Handling:** Pro-rated billing for plan changes
- **Site Migration:** Tools for moving sites between plans

## Integration Points
- **Sites Management:** Coordinates with site creation system
- **User Management:** Integrates with user permission system
- **Payment Processing:** Future Stripe integration
- **Addon System:** Manages website feature addons
- **Analytics:** Subscription and usage tracking

## API Consistency
- **Response Format:** Consistent JSON response structure
- **Error Handling:** Standardized error response format
- **Status Codes:** Proper HTTP status code usage
- **Authentication:** Consistent JWT token handling

## Development Notes
- **Modular Design:** Self-contained subscription logic
- **Future-Proof:** Prepared for Stripe integration
- **Scalable:** Supports multiple subscription plans and addons
- **Maintainable:** Clear separation of concerns and documentation
