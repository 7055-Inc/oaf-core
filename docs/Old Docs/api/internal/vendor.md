# Vendor Management - Internal Documentation

## Overview
Comprehensive vendor management system that provides vendors with complete control over their marketplace operations. This system handles order management, financial operations, Stripe Connect integration, policy management, coupon creation, promotion participation, and vendor settings. It serves as the primary vendor portal for all marketplace activities and business management.

## Architecture
- **Type:** Route Handler
- **Dependencies:** 
  - Express.js router
  - MySQL database connection
  - JWT middleware for authentication
  - Permission middleware for vendor access control
  - StripeService for payment processing and account management
  - DiscountService for coupon and promotion functionality
- **Database Tables:** 
  - `orders` - Order information
  - `order_items` - Order item details with vendor attribution
  - `products` - Product catalog
  - `users` - User account information
  - `user_profiles` - User profile information
  - `vendor_transactions` - Vendor financial transactions
  - `vendor_settings` - Vendor-specific settings
  - `vendor_ship_settings` - Vendor shipping preferences
  - `shipping_policies` - Vendor shipping policies with versioning
  - `return_policies` - Vendor return policies with versioning
  - `coupons` - Vendor-created coupons
  - `coupon_products` - Coupon-product associations
  - `coupon_usage` - Coupon usage tracking
  - `promotion_invitations` - Promotion invitation system
  - `shipping_addresses` - Order shipping information
- **External APIs:** 
  - StripeService for payment processing and Connect account management

## Functions/Endpoints

### Order Management
#### GET /orders
- **Purpose:** Retrieve vendor's orders with optional status filtering
- **Parameters:** Page, limit, status filter
- **Returns:** Paginated orders with customer and product details
- **Errors:** 500 for database errors
- **Usage Example:** Vendor order management dashboard
- **Special Features:**
  - Optional status filtering (all, paid, shipped, etc.)
  - Comprehensive order grouping by order ID
  - Customer information and shipping details
  - Commission calculations per item
  - Vendor earnings calculations (price * quantity - commission)
  - Pagination for large order volumes

#### GET /orders/my
- **Purpose:** Alternative order endpoint with shipping status filtering
- **Parameters:** Status filter (unshipped, shipped)
- **Returns:** Orders grouped with shipping address information
- **Errors:** 500 for database errors
- **Usage Example:** Order fulfillment workflow
- **Special Features:**
  - Shipping status filtering (unshipped vs shipped)
  - Complete shipping address information
  - Customer name resolution with fallbacks
  - Item-level shipping status tracking
  - Grouped by order with item arrays

#### GET /order-item-details
- **Purpose:** Get shipping dimensions for order items
- **Parameters:** Item ID
- **Returns:** Product shipping dimensions and weight
- **Errors:** 404 for item not found, 500 for database errors
- **Usage Example:** Shipping label generation pre-population
- **Special Features:**
  - Product shipping information retrieval
  - Vendor ownership validation
  - Dimension and weight data for shipping calculations

### Financial Management
#### GET /dashboard
- **Purpose:** Comprehensive vendor financial dashboard
- **Parameters:** None (uses authenticated vendor ID)
- **Returns:** Complete dashboard with balance, transactions, payouts, and Stripe status
- **Errors:** 500 for service errors
- **Usage Example:** Vendor portal main dashboard
- **Special Features:**
  - Parallel data loading for performance
  - Balance calculations and payout schedules
  - Recent transaction history
  - Stripe account status integration
  - Vendor settings overview

#### GET /balance
- **Purpose:** Detailed vendor balance information
- **Parameters:** None (uses authenticated vendor ID)
- **Returns:** Comprehensive balance breakdown
- **Errors:** 500 for database errors
- **Usage Example:** Financial planning and payout tracking
- **Special Features:**
  - Available balance calculations
  - Pending payout amounts
  - Total sales and order statistics
  - Current balance (available - pending)

#### GET /transactions
- **Purpose:** Paginated transaction history
- **Parameters:** Page, limit for pagination
- **Returns:** Transaction history with human-readable formatting
- **Errors:** 500 for database errors
- **Usage Example:** Financial audit and transaction review
- **Special Features:**
  - Pagination for large transaction volumes
  - Human-readable transaction type displays
  - Order context for sales transactions
  - Chronological ordering (newest first)

#### GET /payouts
- **Purpose:** Upcoming payout schedule
- **Parameters:** None (uses authenticated vendor ID)
- **Returns:** Scheduled payouts with dates and amounts
- **Errors:** 500 for database errors
- **Usage Example:** Cash flow planning and payout tracking
- **Special Features:**
  - Grouped by payout date
  - Transaction counts per payout
  - Next 10 scheduled payouts
  - Amount summaries for planning

### Stripe Connect Integration
#### POST /stripe-account
- **Purpose:** Create new Stripe Connect account for vendor
- **Parameters:** Optional business information
- **Returns:** Stripe account ID and onboarding URL
- **Errors:** 400 for existing account, 404 for vendor not found, 500 for service errors
- **Usage Example:** Vendor payment setup workflow
- **Special Features:**
  - Duplicate account prevention
  - Automatic onboarding link generation
  - Business information integration
  - Vendor email resolution from user account

#### GET /stripe-onboarding
- **Purpose:** Generate new onboarding link for existing account
- **Parameters:** None (uses authenticated vendor ID)
- **Returns:** Fresh onboarding URL
- **Errors:** 404 for no Stripe account, 500 for service errors
- **Usage Example:** Re-onboarding for incomplete accounts
- **Special Features:**
  - Existing account validation
  - Fresh onboarding link generation
  - Stripe Connect integration

### Settings and Preferences
#### GET /settings
- **Purpose:** Retrieve comprehensive vendor settings
- **Parameters:** None (uses authenticated vendor ID)
- **Returns:** Vendor settings including Stripe account information
- **Errors:** 500 for service errors
- **Usage Example:** Account management and settings review
- **Special Features:**
  - Complete settings overview
  - Stripe account integration
  - Commission rate information
  - Payout preferences

#### POST /subscription-preferences
- **Purpose:** Update subscription payment preferences
- **Parameters:** Payment method, reverse transfer settings
- **Returns:** Update confirmation
- **Errors:** 400 for validation errors, 500 for database errors
- **Usage Example:** Subscription billing configuration
- **Special Features:**
  - Payment method validation (balance_first, card_only)
  - Reverse transfer configuration
  - Upsert functionality (insert or update)
  - Subscription billing integration

#### GET /shipping-preferences
- **Purpose:** Retrieve vendor shipping preferences
- **Parameters:** None (uses authenticated vendor ID)
- **Returns:** Shipping preferences with defaults if none exist
- **Errors:** 500 for database errors
- **Usage Example:** Shipping configuration management
- **Special Features:**
  - Default preferences for new vendors
  - Complete shipping address information
  - Label size and insurance preferences
  - Return address configuration

#### POST /shipping-preferences
- **Purpose:** Update vendor shipping preferences
- **Parameters:** Complete shipping preference object
- **Returns:** Update confirmation
- **Errors:** 500 for database errors
- **Usage Example:** Shipping setup and configuration
- **Special Features:**
  - Data cleaning and validation
  - Boolean conversion handling
  - Upsert functionality (insert or update)
  - Comprehensive shipping preference management

### Policy Management
#### GET /shipping-policy
- **Purpose:** Retrieve vendor shipping policy with fallback
- **Parameters:** None (uses authenticated vendor ID)
- **Returns:** Custom or default shipping policy
- **Errors:** 500 for database errors
- **Usage Example:** Policy display and management
- **Special Features:**
  - Custom policy priority
  - Fallback to platform default
  - Policy source indication (custom vs default)
  - Version tracking

#### PUT /shipping-policy
- **Purpose:** Create new shipping policy version
- **Parameters:** Policy text
- **Returns:** Updated policy information
- **Errors:** 400 for missing text, 500 for database errors
- **Usage Example:** Policy updates and versioning
- **Special Features:**
  - Policy versioning (archive old, create new)
  - Database transaction safety
  - Automatic policy activation
  - History preservation

#### GET /shipping-policy/history
- **Purpose:** Retrieve shipping policy version history
- **Parameters:** None (uses authenticated vendor ID)
- **Returns:** Complete policy history with timestamps
- **Errors:** 500 for database errors
- **Usage Example:** Policy audit and version tracking
- **Special Features:**
  - Complete version history
  - Creator information
  - Status tracking (active, archived)
  - Chronological ordering

#### DELETE /shipping-policy
- **Purpose:** Archive active shipping policy
- **Parameters:** None (uses authenticated vendor ID)
- **Returns:** Deletion confirmation
- **Errors:** 500 for database errors
- **Usage Example:** Policy removal (soft delete)
- **Special Features:**
  - Soft deletion (archive status)
  - Preserves policy history
  - Reverts to platform default

#### GET /return-policy, PUT /return-policy, GET /return-policy/history, DELETE /return-policy
- **Purpose:** Mirror shipping policy functionality for return policies
- **Parameters:** Same as shipping policy endpoints
- **Returns:** Same structure as shipping policy endpoints
- **Errors:** Same error handling as shipping policy endpoints
- **Usage Example:** Return policy management
- **Special Features:** Same features as shipping policy system

### Coupon Management System
#### GET /coupons/my
- **Purpose:** Retrieve vendor's created coupons
- **Parameters:** None (uses authenticated vendor ID)
- **Returns:** List of vendor coupons with basic information
- **Errors:** 500 for database errors
- **Usage Example:** Coupon management dashboard
- **Special Features:**
  - Vendor-specific coupon filtering
  - Basic coupon information display
  - Creation date ordering

#### POST /coupons/create
- **Purpose:** Create new vendor coupon with comprehensive options
- **Parameters:** Complete coupon configuration
- **Returns:** Created coupon ID and confirmation
- **Errors:** 400 for validation errors, 500 for database errors
- **Usage Example:** Promotional campaign creation
- **Special Features:**
  - Comprehensive validation (discount type, application type, values)
  - Product-specific coupon support
  - Usage limits (per user and total)
  - Date range validation
  - Duplicate code prevention
  - Database transaction safety
  - Product ownership verification

#### PUT /coupons/:id
- **Purpose:** Update existing vendor coupon
- **Parameters:** Coupon ID and update fields
- **Returns:** Update confirmation
- **Errors:** 404 for not found, 400 for validation errors, 500 for database errors
- **Usage Example:** Coupon modification and management
- **Special Features:**
  - Vendor ownership validation
  - Dynamic field updates
  - Product association updates
  - Database transaction safety
  - Comprehensive validation

#### DELETE /coupons/:id
- **Purpose:** Delete unused vendor coupon
- **Parameters:** Coupon ID
- **Returns:** Deletion confirmation
- **Errors:** 404 for not found, 400 for used coupons, 500 for database errors
- **Usage Example:** Coupon cleanup and management
- **Special Features:**
  - Usage validation (prevents deletion of used coupons)
  - Vendor ownership verification
  - Cascade deletion handling

#### GET /coupons/:id/analytics
- **Purpose:** Retrieve coupon usage analytics
- **Parameters:** Coupon ID
- **Returns:** Comprehensive usage statistics and daily breakdown
- **Errors:** 404 for not found, 500 for database errors
- **Usage Example:** Promotional campaign analysis
- **Special Features:**
  - Overall usage statistics
  - Daily usage breakdown (last 30 days)
  - Discount amount tracking
  - Unique user counts
  - Average discount per use

#### GET /coupons/products
- **Purpose:** Get vendor's products for coupon creation
- **Parameters:** None (uses authenticated vendor ID)
- **Returns:** List of active vendor products
- **Errors:** 500 for database errors
- **Usage Example:** Product selection for coupon creation
- **Special Features:**
  - Active products only
  - Basic product information
  - Alphabetical ordering

### Promotion System
#### GET /promotions/invitations
- **Purpose:** Retrieve vendor's promotion invitations
- **Parameters:** None (uses authenticated vendor ID)
- **Returns:** List of promotion invitations with status
- **Errors:** 500 for database errors
- **Usage Example:** Promotion participation management
- **Special Features:**
  - Invitation status tracking
  - Promotion name information
  - Chronological ordering (newest first)

#### POST /promotions/:id/respond
- **Purpose:** Respond to promotion invitation
- **Parameters:** Invitation ID, response (accepted/rejected), discount percentage, message
- **Returns:** Response confirmation
- **Errors:** 400 for validation errors, 404 for not found, 500 for database errors
- **Usage Example:** Promotion participation workflow
- **Special Features:**
  - Response validation (accepted/rejected)
  - Required discount percentage for acceptance
  - Optional response message
  - Vendor ownership verification
  - Prevents duplicate responses

## Helper Functions

### getVendorBalance(vendorId)
- **Purpose:** Calculate comprehensive vendor balance information
- **Parameters:** Vendor ID
- **Returns:** Balance object with available, pending, total sales, and order counts
- **Usage:** Internal balance calculations for dashboard and balance endpoints
- **Special Features:**
  - Available balance calculations
  - Pending payout calculations
  - Total sales and order statistics
  - Current balance calculation (available - pending)

### getRecentTransactions(vendorId, limit)
- **Purpose:** Retrieve recent vendor transactions
- **Parameters:** Vendor ID, limit (default: 10)
- **Returns:** Recent transactions with human-readable formatting
- **Usage:** Dashboard recent activity display
- **Special Features:**
  - Human-readable transaction type displays
  - Order context integration
  - Configurable limit
  - Chronological ordering

### getVendorTransactions(vendorId, options)
- **Purpose:** Paginated transaction retrieval with filtering
- **Parameters:** Vendor ID, options (page, limit, type, status filters)
- **Returns:** Paginated transactions with total count
- **Usage:** Transaction history endpoint with filtering
- **Special Features:**
  - Advanced filtering by type and status
  - Pagination support
  - Total count for pagination
  - Human-readable formatting

### getUpcomingPayouts(vendorId)
- **Purpose:** Retrieve scheduled payout information
- **Parameters:** Vendor ID
- **Returns:** Upcoming payouts grouped by date
- **Usage:** Payout schedule display and planning
- **Special Features:**
  - Grouped by payout date
  - Transaction counts and amounts
  - Next 10 payout dates
  - Future payouts only

### Policy Management Functions
- **getVendorShippingPolicy(vendorId):** Retrieve shipping policy with default fallback
- **updateVendorShippingPolicy(vendorId, policyText):** Create new policy version with transaction safety
- **getVendorShippingPolicyHistory(vendorId):** Retrieve complete policy history
- **deleteVendorShippingPolicy(vendorId):** Archive active policy
- **Similar functions for return policies:** Mirror functionality for return policy management

## Environment Variables
- No domain-specific environment variables needed for this module
- Database connection handled by shared configuration
- StripeService integration managed by service layer
- All functionality is self-contained within the API

## Security Considerations
- **Authentication:** JWT token verification for all endpoints
- **Authorization:** 
  - Most endpoints require 'vendor' permission
  - Stripe Connect endpoints require 'stripe_connect' permission
- **Data Isolation:** Vendors can only access their own data
- **Input Validation:** Comprehensive validation of all parameters
- **SQL Injection Protection:** Parameterized queries throughout
- **Permission Validation:** Strict permission checking for vendor operations
- **Ownership Verification:** All operations verify vendor ownership of resources
- **Transaction Safety:** Database transactions for multi-step operations

## Performance Considerations
- **Database Indexing:** Optimized queries on vendor_id, order_id, created_at
- **Pagination:** Efficient pagination for large datasets (orders, transactions, coupons)
- **Query Optimization:** Optimized JOINs and aggregation queries
- **Parallel Loading:** Dashboard uses Promise.all for concurrent data loading
- **Service Integration:** Efficient StripeService integration
- **Connection Pooling:** Database connection management for concurrent operations

## Testing
- **Unit Tests:** Should cover all business logic and calculations
- **Integration Tests:** Test StripeService integration and database operations
- **Security Tests:** Verify permission requirements and data isolation
- **Validation Tests:** Test all parameter validations and edge cases
- **Transaction Tests:** Verify database transaction integrity
- **Policy Tests:** Test policy versioning and history functionality
- **Coupon Tests:** Test coupon creation, validation, and analytics

## Error Handling
- **Graceful Degradation:** System continues operating with partial service failures
- **Input Validation:** Clear error messages for invalid parameters
- **Permission Errors:** Proper handling of insufficient permissions
- **Database Errors:** Transaction rollback and error recovery
- **Service Integration:** Proper handling of StripeService failures
- **Ownership Validation:** Clear error messages for unauthorized access
- **Duplicate Prevention:** Proper handling of duplicate operations

## Common Use Cases
- **Order Management:** Complete order lifecycle management and fulfillment
- **Financial Dashboard:** Real-time financial overview and performance tracking
- **Payment Setup:** Stripe Connect account creation and onboarding
- **Policy Management:** Shipping and return policy creation and versioning
- **Coupon Campaigns:** Promotional coupon creation and analytics
- **Promotion Participation:** Invitation management and response handling
- **Settings Management:** Vendor preference configuration and updates

## Integration Points
- **StripeService:** Complete integration for payment processing and Connect accounts
- **User Management:** Coordinates with user system for vendor identification
- **Order System:** Integrates with order processing for vendor order management
- **Product System:** Coordinates with product catalog for coupon associations
- **Promotion System:** Integrates with promotion invitation and response system
- **Policy System:** Manages vendor-specific policies with platform defaults

## API Consistency
- **Response Format:** Consistent JSON response structure across all endpoints
- **Error Handling:** Standardized error response format with appropriate HTTP status codes
- **Authentication:** Consistent JWT token handling and permission checking
- **Pagination:** Standardized pagination format for large datasets
- **Validation:** Consistent input validation and error messaging
- **Transaction Safety:** Consistent use of database transactions for multi-step operations

## Future Enhancements
- **Advanced Analytics:** More detailed vendor performance analytics
- **Automated Policies:** Template-based policy generation
- **Advanced Coupons:** More sophisticated coupon types and conditions
- **Bulk Operations:** Bulk order processing and management
- **Integration APIs:** External system integration for inventory and fulfillment
- **Mobile Optimization:** Mobile-optimized vendor portal
- **Real-time Notifications:** Live updates for orders, payments, and promotions
- **Performance Optimization:** Caching layer for frequently accessed vendor data

## Development Notes
- **Modular Design:** Well-organized vendor functionality for maintainability
- **Comprehensive Validation:** Thorough validation of all vendor operations
- **Error Handling:** Comprehensive error handling with proper HTTP status codes
- **Documentation:** Extensive JSDoc documentation for key functions
- **Security Focus:** Security-first design with proper permission checking
- **Scalability:** Designed to handle high-volume vendor operations
- **Vendor-Centric:** Complete focus on vendor needs and business operations
- **Transaction Safety:** Proper use of database transactions for data integrity

## Business Requirements
- **Complete Vendor Portal:** Full-featured vendor management system
- **Order Fulfillment:** Comprehensive order management and tracking
- **Financial Management:** Real-time financial data and payout tracking
- **Payment Processing:** Stripe Connect integration for vendor payments
- **Policy Management:** Flexible policy creation and versioning
- **Promotional Tools:** Coupon creation and promotion participation
- **Settings Control:** Vendor control over business preferences and settings
- **Audit Support:** Complete audit trail for all vendor operations

## Monitoring and Logging
- **Vendor Operations:** Comprehensive logging of all vendor operations
- **Financial Operations:** Detailed logging of financial calculations and transactions
- **Policy Changes:** Complete audit trail for policy updates and versions
- **Coupon Operations:** Tracking of coupon creation, updates, and usage
- **Performance Monitoring:** Track query performance for vendor operations
- **Error Tracking:** Detailed error logging for vendor operations
- **Access Monitoring:** Track vendor access to sensitive operations

## Data Privacy and Compliance
- **Vendor Data Protection:** Secure handling of sensitive vendor information
- **Access Control:** Strict access control limited to vendor's own data
- **Audit Trail:** Complete audit trail for compliance requirements
- **Data Retention:** Appropriate retention policies for vendor data
- **Privacy Compliance:** Ensure compliance with vendor privacy regulations
- **Secure Transmission:** All vendor data transmitted securely
