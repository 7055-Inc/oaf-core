# stripeService.js - Internal Documentation

## Overview
Comprehensive payment processing service for the Beemeeart platform using Stripe. Handles vendor account management, payment intents, tax calculations, subscriptions, commission calculations, and financial reporting for a multi-vendor marketplace.

## Architecture
- **Type:** Service Layer (Business Logic)
- **Dependencies:** Stripe SDK, database connection
- **Database Tables:**
  - `vendor_settings` - Vendor Stripe account configuration
  - `vendor_transactions` - Transaction history and payouts
  - `financial_settings` - Commission and fee structure settings
  - `stripe_tax_transactions` - Tax calculation records
  - `order_tax_summary` - Tax summary for orders
  - `vendor_tax_summary` - Vendor tax reporting
  - `stripe_rates` - Current Stripe fee rates
  - `user_subscriptions` - Subscription management
  - `orders`, `order_items`, `products` - Order and product data
- **External APIs:** Stripe API for all payment operations

## Core Functions

### Vendor Account Management

#### createVendorAccount(vendorId, email, businessInfo)
- **Purpose:** Create Stripe Connect Express account for vendor
- **Parameters:**
  - `vendorId` (number): Vendor user ID
  - `email` (string): Vendor email address
  - `businessInfo` (Object): Additional business information
- **Returns:** Promise<Object> Stripe account object
- **Errors:** Throws if account creation fails
- **Usage Example:** `await stripeService.createVendorAccount(123, 'vendor@example.com')`

#### createAccountLink(stripeAccountId, vendorId)
- **Purpose:** Generate onboarding link for vendor Stripe Connect setup
- **Parameters:**
  - `stripeAccountId` (string): Stripe Connect account ID
  - `vendorId` (number): Vendor user ID
- **Returns:** Promise<Object> Account link with onboarding URL
- **Errors:** Throws if link creation fails
- **Usage Example:** `await stripeService.createAccountLink('acct_123', 456)`

### Payment Processing

#### createPaymentIntent(orderData)
- **Purpose:** Create payment intent for multi-vendor orders
- **Parameters:**
  - `orderData.total_amount` (number): Total amount in dollars
  - `orderData.currency` (string): Currency code (default: 'usd')
  - `orderData.customer_id` (string): Stripe customer ID (optional)
  - `orderData.metadata` (Object): Additional metadata
- **Returns:** Promise<Object> Stripe payment intent
- **Errors:** Throws if payment intent creation fails
- **Usage Example:** `await stripeService.createPaymentIntent({ total_amount: 100.50, metadata: { order_id: '123' } })`

#### processVendorTransfers(orderId, paymentIntentId)
- **Purpose:** Distribute payment to vendors based on commission structure
- **Parameters:**
  - `orderId` (number): Order ID for transfer processing
  - `paymentIntentId` (string): Stripe payment intent ID
- **Returns:** Promise<Array> Array of transfer objects
- **Errors:** Throws if transfer processing fails
- **Usage Example:** `await stripeService.processVendorTransfers(123, 'pi_123')`

### Tax Management

#### calculateTax(taxData)
- **Purpose:** Calculate tax using Stripe Tax API
- **Parameters:**
  - `taxData.line_items` (Array): Items for tax calculation
  - `taxData.customer_address` (Object): Customer shipping address
  - `taxData.currency` (string): Currency code
- **Returns:** Promise<Object> Tax calculation result
- **Errors:** Throws if tax calculation fails
- **Usage Example:** `await stripeService.calculateTax({ line_items: [...], customer_address: {...} })`

### Commission System

#### calculateCommissions(orderItems)
- **Purpose:** Calculate commissions with Stripe fee handling
- **Parameters:**
  - `orderItems` (Array): Order items to process
- **Returns:** Promise<Array> Items with commission calculations
- **Fee Structures:**
  - **Commission:** Platform takes percentage, absorbs Stripe fees
  - **Pass-through:** Vendor pays Stripe fee equivalent, platform gets $0
- **Usage Example:** `await stripeService.calculateCommissions(orderItems)`

### Subscription Management

#### createVerificationSubscription(userId, email, name, priceIds, paymentMethodId)
- **Purpose:** Create subscription for artist verification
- **Parameters:**
  - `userId` (number): User ID
  - `email` (string): Customer email
  - `name` (string): Customer name
  - `priceIds` (Array): Array of Stripe price IDs
  - `paymentMethodId` (string): Payment method ID (optional)
- **Returns:** Promise<Object> Stripe subscription object
- **Products:**
  - **Base Verification:** $50/year - Basic verified status
  - **Additional Persona:** $10/year - Extra identity/packet
- **Usage Example:** `await stripeService.createVerificationSubscription(123, 'user@example.com', 'John Doe', ['price_123'])`

## Environment Variables
- `STRIPE_SECRET_KEY`: Stripe secret key (required)
- `FRONTEND_URL`: Frontend base URL for onboarding redirects
- `STRIPE_PLATFORM_ACCOUNT_ID`: Platform account ID for transfers

## Financial Architecture

### Commission Structures
1. **Commission Model:**
   - Platform takes percentage commission (default: 15%)
   - Platform absorbs all Stripe fees
   - Vendor receives: `item_price - commission_amount`
   - Platform net: `commission_amount - stripe_fees`

2. **Pass-Through Model:**
   - Platform takes 0% commission
   - Vendor pays equivalent of Stripe fees
   - Vendor receives: `item_price - stripe_fee_equivalent`
   - Platform net: `$0.00` (breaks even)

### Stripe Fee Calculation
- **Standard Rate:** 2.9% + $0.30 per transaction
- **Database-Driven:** Rates stored in `stripe_rates` table
- **Automatic Updates:** Rates can be updated without code changes

### Payout Management
- **Vendor Payouts:** Configurable payout schedule (default: 15 days)
- **Balance Tracking:** Real-time Connect account balance monitoring
- **Transaction History:** Complete audit trail of all transactions

## Tax Reporting

### Order Tax Summary
- **Automatic Creation:** Tax summary created for each order
- **State Breakdown:** Tax collected by state/jurisdiction
- **Vendor Reports:** Monthly tax summaries per vendor

### Compliance Features
- **Stripe Tax Integration:** Automatic tax calculation
- **Jurisdiction Tracking:** State, county, city tax breakdown
- **Reporting:** Vendor-specific tax reports for compliance

## Security Considerations
- **Authentication requirements:** Stripe secret key validation
- **Authorization levels:** Vendor-specific account access
- **Input validation rules:** Amount validation, metadata sanitization
- **Rate limiting applied:** Stripe API rate limits respected

## Error Handling
- **Stripe API Errors:** Comprehensive error catching and logging
- **Database Failures:** Transaction rollback on failures
- **Validation Errors:** Input validation with descriptive messages
- **Retry Logic:** Automatic retry for transient failures

## Performance Features
- **Connection Pooling:** Stripe SDK connection management
- **Batch Processing:** Bulk transfer processing
- **Caching:** Financial settings and rate caching
- **Async Operations:** Non-blocking payment processing

## Testing
- Unit test coverage: Commission calculations, tax calculations, fee calculations
- Integration test scenarios: Stripe API integration, database operations
- Performance benchmarks: Payment processing speed, transfer processing

## Monitoring and Logging
- **Transaction Logging:** Complete audit trail of all Stripe operations
- **Error Logging:** Detailed error messages with context
- **Financial Reporting:** Real-time financial metrics and reporting
- **Compliance Tracking:** Tax collection and reporting metrics
