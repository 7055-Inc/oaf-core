# Shipping Subscriptions - Internal Documentation

## Overview
Comprehensive shipping subscription management system that handles the complete lifecycle of shipping label subscriptions. This system manages vendor address settings, terms acceptance, subscription activation, payment processing with dual payment methods (card and Connect balance), label library management, and purchase history tracking.

## Architecture
- **Type:** Route Handler
- **Dependencies:** 
  - Express.js router
  - MySQL database connection
  - JWT middleware for authentication
  - Permission middleware for shipping access control
  - Stripe service for payment processing
  - Shipping service for label generation
- **Database Tables:** 
  - `vendor_ship_settings` - Vendor shipping address configurations
  - `terms_versions` - Versioned shipping terms and conditions
  - `user_terms_acceptance` - User acceptance records with audit trails
  - `user_subscriptions` - Subscription records and status
  - `user_permissions` - Permission grants for shipping access
  - `shipping_labels` - Order-based shipping labels
  - `standalone_shipping_labels` - Standalone shipping labels
  - `shipping_label_purchases` - Card payment purchase records
  - `vendor_transactions` - Connect balance transaction records
  - `shipping_addresses` - Order shipping addresses (joined)
  - `order_items` - Order items for label context (joined)
- **External APIs:** 
  - Stripe Payment API
  - Stripe Setup Intents API
  - Multi-carrier shipping APIs (via shipping service)

## Functions/Endpoints

### Address Management
#### GET /vendor-address
- **Purpose:** Get vendor shipping settings for Ship From address prefill
- **Parameters:** None (vendor ID from JWT token)
- **Returns:** Vendor shipping address details or null if incomplete
- **Errors:** 500 for database errors
- **Usage Example:** Label creation form address prefill
- **Special Features:**
  - Validates address completeness
  - Returns separate incomplete_address field for partial data
  - Maps database fields to standard address format

### Terms Management
#### GET /terms-check
- **Purpose:** Check if user has accepted latest shipping terms
- **Parameters:** None (user ID from JWT token)
- **Returns:** Terms acceptance status and latest terms content
- **Errors:** 404 for no terms found, 500 for database errors
- **Usage Example:** Pre-subscription verification

#### GET /terms
- **Purpose:** Get current shipping terms content (public endpoint)
- **Parameters:** None
- **Returns:** Current shipping terms and conditions
- **Errors:** 404 for no current terms, 500 for database errors
- **Usage Example:** Terms display in subscription flow

#### POST /accept-terms
- **Purpose:** Record user acceptance of shipping terms with audit trail
- **Parameters:** IP address and user agent for compliance
- **Returns:** Terms acceptance confirmation with auto-activation check
- **Errors:** 400 for no current terms, 500 for database errors
- **Usage Example:** Terms acceptance form submission
- **Special Features:**
  - Records IP and user agent for legal compliance
  - Auto-activates subscription if payment method exists
  - Uses database transactions for consistency

### Subscription Management
#### GET /my
- **Purpose:** Get complete shipping subscription status and details
- **Parameters:** None (user ID from JWT token)
- **Returns:** Subscription details, purchase history, Connect balance
- **Errors:** 500 for database or Stripe errors
- **Usage Example:** Subscription dashboard display
- **Special Features:**
  - Auto-grants permissions for users with card + terms
  - Ensures subscription record exists for eligible users
  - Retrieves last 10 purchases from both payment methods
  - Gets Connect balance for eligible users
  - Fetches card last 4 digits from Stripe

#### POST /signup
- **Purpose:** Create or activate shipping subscription
- **Parameters:** Prefer Connect balance flag, accept terms flag
- **Returns:** Subscription setup details or immediate activation
- **Errors:** 400 for existing subscription, 404 for user not found, 500 for processing errors
- **Usage Example:** Initial subscription creation
- **Special Features:**
  - Checks for existing active subscriptions
  - Cleans up incomplete subscriptions
  - Auto-activates if user has valid payment method and accepts terms
  - Creates Stripe setup intent for new payment methods
  - Records terms acceptance with audit data

#### POST /activate
- **Purpose:** Activate subscription after payment method setup
- **Parameters:** Stripe setup intent ID
- **Returns:** Activation confirmation
- **Errors:** 400 for invalid setup intent or missing terms, 404 for no subscription, 500 for processing errors
- **Usage Example:** Post-payment activation
- **Special Features:**
  - Verifies Stripe setup intent success
  - Requires terms acceptance before activation
  - Grants shipping permissions
  - Updates subscription status atomically

#### DELETE /cancel
- **Purpose:** Cancel shipping subscription and revoke permissions
- **Parameters:** None (user ID from JWT token)
- **Returns:** Cancellation confirmation
- **Errors:** 500 for database errors
- **Usage Example:** Subscription cancellation
- **Special Features:**
  - Uses database transactions for consistency
  - Revokes shipping permissions
  - Records cancellation timestamp

### Payment Management
#### PUT /preferences
- **Purpose:** Update payment method preferences
- **Parameters:** Prefer Connect balance flag
- **Returns:** Updated preferences confirmation
- **Errors:** 404 for subscription not found, 500 for database errors
- **Usage Example:** Payment preference updates
- **Special Features:**
  - Only allows Connect balance if user has stripe_connect permission
  - Updates subscription record with timestamp

#### POST /update-payment-method
- **Purpose:** Create setup intent for payment method update
- **Parameters:** None (customer ID from subscription)
- **Returns:** Stripe setup intent for payment method collection
- **Errors:** 404 for subscription not found, 500 for Stripe errors
- **Usage Example:** Payment method updates
- **Special Features:**
  - Creates Stripe setup intent with metadata
  - Uses existing customer ID from subscription

### Label Purchase Processing
#### POST /purchase-label
- **Purpose:** Process payment for shipping label with dual payment methods
- **Parameters:** Shipping label ID and amount
- **Returns:** Payment processing result with method used
- **Errors:** 400 for validation errors, 404 for label not found, 500 for processing errors
- **Usage Example:** Order label purchase
- **Special Features:**
  - Tries Connect balance first if preferred and available
  - Falls back to card payment automatically
  - Validates amount matches label cost
  - Creates appropriate payment records
  - Links vendor transactions to shipping labels
  - Handles Stripe card errors gracefully

#### POST /create-standalone-label
- **Purpose:** Create standalone shipping label not attached to order
- **Parameters:** Shipper/recipient addresses, packages, selected rate
- **Returns:** Created label details and payment confirmation
- **Errors:** 400 for validation or payment errors, 500 for processing errors
- **Usage Example:** Standalone label creation
- **Special Features:**
  - Prevents negative Connect balance for standalone labels
  - Uses shipping service for label generation
  - Records payment in appropriate tables
  - Supports force card payment option

### Label Library Management
#### GET /all-labels
- **Purpose:** Get unified library of order and standalone labels
- **Parameters:** None (vendor ID from JWT token)
- **Returns:** Combined list of all shipping labels
- **Errors:** 500 for database errors
- **Usage Example:** Complete label history display
- **Special Features:**
  - Unions order and standalone labels
  - Provides consistent data structure
  - Orders by creation date

#### GET /standalone-labels
- **Purpose:** Get standalone label library only
- **Parameters:** None (user ID from JWT token)
- **Returns:** List of standalone shipping labels
- **Errors:** 500 for database errors
- **Usage Example:** Standalone label management

### Purchase History and Refunds
#### GET /purchases
- **Purpose:** Get shipping label purchase history with pagination
- **Parameters:** Limit and offset for pagination
- **Returns:** Purchase history from both payment methods
- **Errors:** 500 for database errors
- **Usage Example:** Purchase history display
- **Special Features:**
  - Separate queries for card and Connect balance purchases
  - Pagination support
  - Includes label and transaction details

#### POST /refund
- **Purpose:** Process refund for shipping label purchase
- **Parameters:** Purchase ID, amount, and reason
- **Returns:** Refund processing result
- **Errors:** 400 for validation errors, 404 for purchase not found, 500 for processing errors
- **Usage Example:** Purchase refund processing
- **Special Features:**
  - Handles both card and Connect balance refunds
  - Creates reversing vendor transactions for Connect balance
  - Uses Stripe refunds for card payments
  - Updates purchase status appropriately
  - Supports partial refunds

## Environment Variables
- No domain-specific environment variables needed for this module
- Relies on Stripe service configuration for payment processing
- Uses shipping service configuration for label generation

## Security Considerations
- **Authentication:** JWT token verification for all private endpoints
- **Authorization:** Shipping permission required for label operations
- **Payment Security:** Stripe handles all card payment processing
- **Access Control:** Users can only access their own subscriptions and labels
- **Audit Trails:** Complete logging of terms acceptance with IP/user agent
- **Input Validation:** All payment amounts and IDs validated
- **Permission Checks:** Connect balance usage requires stripe_connect permission

## Subscription Lifecycle

### States and Transitions
- **Incomplete:** Subscription created but payment method not set up
- **Active:** Subscription with valid payment method and terms accepted
- **Canceled:** Subscription terminated by user

### Auto-Activation Logic
- Users with existing payment methods and terms acceptance get auto-activated
- System ensures subscription records exist for eligible users
- Permissions granted automatically upon activation

### Payment Method Hierarchy
1. **Connect Balance:** Preferred for vendors with Stripe Connect
2. **Card Payment:** Fallback for all users
3. **Balance Protection:** Standalone labels prevent negative balance

## Dual Payment System

### Connect Balance Integration
- **Order Labels:** Allow negative balance (business credit)
- **Standalone Labels:** Prevent negative balance
- **Transaction Records:** Stored in vendor_transactions table
- **Refunds:** Create reversing transactions

### Card Payment Processing
- **Stripe Integration:** Uses saved payment methods with off_session
- **Purchase Records:** Stored in shipping_label_purchases table
- **Refunds:** Processed through Stripe refund API
- **Error Handling:** Comprehensive Stripe error management

## Database Schema Integration

### Subscription Tables
- **user_subscriptions:** Core subscription records
- **user_permissions:** Permission grants
- **user_terms_acceptance:** Legal compliance records

### Payment Tables
- **shipping_label_purchases:** Card payment records
- **vendor_transactions:** Connect balance records

### Label Tables
- **shipping_labels:** Order-based labels
- **standalone_shipping_labels:** Independent labels

## Performance Considerations
- **Database Indexing:** Optimized queries on user_id, subscription_type, status
- **Stripe API Efficiency:** Minimal API calls with proper error handling
- **Transaction Safety:** Database transactions for critical operations
- **Pagination:** Purchase history supports pagination for large datasets

## Testing
- **Unit Tests:** Should cover all payment processing methods
- **Integration Tests:** Test Stripe integration and database transactions
- **Security Tests:** Verify access control and permission checks
- **Payment Tests:** Test both Connect balance and card payment flows
- **Error Handling Tests:** Verify graceful handling of Stripe errors

## Monitoring and Logging
- **Payment Tracking:** Monitor success rates for both payment methods
- **Error Logging:** Comprehensive error logging for debugging
- **Audit Compliance:** Complete audit trail for terms acceptance
- **Performance Monitoring:** Track database and Stripe API performance
- **Usage Analytics:** Track subscription activation and usage patterns

## Common Use Cases
- **Vendor Onboarding:** New vendors setting up shipping subscriptions
- **Label Purchase:** Processing payments for shipping labels
- **Payment Updates:** Updating payment methods and preferences
- **Refund Processing:** Handling label refunds and cancellations
- **Compliance Tracking:** Maintaining legal compliance for terms acceptance

## Error Handling
- **Graceful Degradation:** System continues operating with partial failures
- **Transaction Rollback:** Automatic cleanup on critical operation failures
- **User-Friendly Messages:** Clear error messages for common issues
- **Stripe Error Handling:** Specific handling for different Stripe error types
- **Recovery Procedures:** Clear steps for data recovery scenarios

## Future Enhancements
- **Subscription Tiers:** Different pricing tiers for shipping services
- **Usage Analytics:** Detailed analytics for shipping label usage
- **Bulk Operations:** Bulk label creation and management
- **International Shipping:** Enhanced support for international labels
- **API Rate Optimization:** Caching and rate limiting for external APIs
- **Automated Refunds:** Automatic refund processing for canceled labels
