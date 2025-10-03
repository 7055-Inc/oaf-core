# webhooks/stripe.js - Internal Documentation

## Overview
Comprehensive Stripe webhook handler for the Beemeeart platform that processes all payment-related events from Stripe. This system handles payments, subscriptions, transfers, disputes, and account events with secure signature verification and robust error handling. The webhook system is critical for maintaining payment state synchronization between Stripe and the platform database.

## Architecture
- **Type:** Route Layer (Webhook Handler) - Payment Event Processing
- **Dependencies:** express, stripe SDK, stripeService, database connection, EmailService
- **Database Tables:**
  - `orders` - E-commerce order status and payment tracking
  - `event_applications` - Event booth fee payments and application status
  - `event_booth_payments` - Booth fee payment records
  - `ticket_purchases` - Event ticket purchase records
  - `event_tickets` - Ticket inventory and sales tracking
  - `vendor_transactions` - Vendor payout and commission tracking
  - `vendor_settings` - Vendor verification status
  - `user_subscriptions` - Platform subscription management
  - `subscription_payments` - Subscription payment history
  - `shipping_label_purchases` - Shipping label payment tracking
  - `user_permissions` - User access permissions
- **External Services:** Stripe API, EmailService for transactional notifications

## Webhook Security

### Signature Verification
- **Endpoint Secret:** Uses `STRIPE_WEBHOOK_SECRET` environment variable
- **Signature Validation:** Verifies webhook authenticity using Stripe signature
- **Raw Body Processing:** Requires raw JSON body for signature verification
- **Error Handling:** Returns 400 status for invalid signatures

### Security Implementation
```javascript
// Raw body parser for webhook signature verification
router.use(express.raw({ type: 'application/json' }));

// Verify webhook signature
event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
```

## Event Handler Architecture

### Event Routing System
The webhook system uses a comprehensive event routing mechanism that maps Stripe event types to specialized handler functions:

```javascript
const handlers = {
  // Payment events
  'payment_intent.succeeded': handlePaymentSuccess,
  'payment_intent.payment_failed': handlePaymentFailure,
  
  // Transfer events
  'transfer.created': handleTransferCreated,
  'transfer.reversed': handleTransferReversed,
  'transfer.updated': handleTransferUpdated,
  
  // Payout events
  'payout.paid': handlePayoutCompleted,
  'payout.failed': handlePayoutFailed,
  
  // Subscription events
  'customer.subscription.created': handleSubscriptionCreated,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionDeleted,
  'invoice.created': handleInvoiceCreated,
  'invoice.payment_succeeded': handleSubscriptionPaymentSucceeded,
  'invoice.payment_failed': handleSubscriptionPaymentFailed,
  
  // Account events
  'account.updated': handleAccountUpdate,
  
  // Dispute events
  'charge.dispute.created': handleDisputeCreated,
  'charge.dispute.closed': handleDisputeClosed,
  
  // Payment method setup events
  'setup_intent.succeeded': handleSetupIntentSucceeded,
  'setup_intent.setup_failed': handleSetupIntentFailed,
  'customer.source.expired': handleSourceExpired,
};
```

## Main Webhook Endpoint

### POST /api/webhooks/stripe
**Purpose:** Main Stripe webhook handler with signature verification

**Authentication:** Webhook signature verification (no user authentication)

**Request Processing:**
1. **Signature Verification:** Validates Stripe webhook signature
2. **Event Routing:** Routes events to appropriate handlers
3. **Error Handling:** Graceful error handling with proper HTTP responses
4. **Response:** Returns confirmation of webhook receipt

**Security Features:**
- Raw body parsing for signature verification
- Webhook signature validation using Stripe SDK
- Secure error responses without exposing internal details
- Comprehensive logging for security monitoring

## Payment Event Handlers

### Payment Intent Success Handler
**Function:** `handlePaymentSuccess(paymentIntent, event)`
**Purpose:** Processes successful payments for different payment types

**Payment Type Detection:**
```javascript
// Booth fee payment
const applicationId = paymentIntent.metadata.application_id;

// Ticket purchase
const ticketEventId = paymentIntent.metadata.event_id;
const ticketId = paymentIntent.metadata.ticket_id;

// E-commerce order
const orderId = paymentIntent.metadata.order_id;

// Shipping label purchase
const shippingLabelId = paymentIntent.metadata.shipping_label_id;
```

**Processing Flow:**
1. **Metadata Analysis:** Determines payment type from PaymentIntent metadata
2. **Type-Specific Processing:** Routes to specialized payment handlers
3. **Database Updates:** Updates relevant records with payment status
4. **Email Notifications:** Triggers confirmation emails where appropriate
5. **Error Handling:** Logs errors without failing the webhook

### Booth Fee Payment Handler
**Function:** `handleBoothFeePayment(paymentIntent, applicationId)`
**Purpose:** Processes event application booth fee payments

**Database Operations:**
```sql
-- Update application status
UPDATE event_applications 
SET booth_fee_paid = 1, booth_fee_paid_at = NOW()
WHERE id = ?

-- Record payment transaction
INSERT INTO event_booth_payments (
  application_id, stripe_payment_intent_id, amount_paid, 
  payment_date, payment_status, created_at
) VALUES (?, ?, ?, NOW(), 'completed', NOW())
```

**Email Integration:**
- Uses EventEmailService for booth fee confirmation emails
- Non-blocking email processing (payment success not dependent on email)
- Comprehensive error logging for email failures

### E-commerce Payment Handler
**Function:** `handleEcommercePayment(paymentIntent, orderId)`
**Purpose:** Processes marketplace order payments

**Processing Steps:**
1. **Order Status Update:** Marks order as paid
2. **Vendor Transfers:** Initiates transfers to vendor accounts
3. **Platform Commission:** Records platform commission
4. **Integration:** Uses StripeService for vendor transfer processing

**Vendor Payout Integration:**
```javascript
// Process vendor transfers
const transfers = await stripeService.processVendorTransfers(orderId, paymentIntent.id);

// Record platform commission
await recordPlatformCommission(orderId, paymentIntent.id);
```

### Ticket Payment Handler
**Function:** `handleTicketPayment(paymentIntent)`
**Purpose:** Processes event ticket purchases

**Database Operations:**
```sql
-- Update ticket purchase status
UPDATE ticket_purchases 
SET status = 'confirmed', purchase_date = NOW()
WHERE stripe_payment_intent_id = ? AND status = 'pending'

-- Update ticket inventory
UPDATE event_tickets 
SET quantity_sold = quantity_sold + ?
WHERE id = ?
```

**Email Confirmation:**
- Generates unique ticket codes for event access
- Includes event details, venue information, and ticket codes
- Uses template system for professional email formatting
- High-priority transactional email processing

### Ticket Confirmation Email System
**Function:** `sendTicketConfirmationEmail(paymentIntent)`
**Purpose:** Sends ticket confirmation with unique codes

**Email Template Data:**
```javascript
const templateData = {
  buyer_name: buyerName || 'Valued Customer',
  event_title: event.title,
  event_start_date: formattedStartDate,
  event_end_date: formattedEndDate,
  venue_name: event.venue_name,
  venue_address: event.venue_address || '',
  venue_city: event.venue_city,
  venue_state: event.venue_state,
  ticket_list: formattedTicketList,
  ticket_count: tickets.length,
  total_amount: totalAmount.toFixed(2),
  event_url: `${process.env.FRONTEND_URL || 'https://beemeeart.com'}/events/${eventId}`,
  unique_codes: tickets.map(t => t.unique_code).join(', ')
};
```

**Features:**
- Retrieves ticket details and event information
- Formats ticket list with codes and pricing
- Generates event URLs using environment variables
- Queues high-priority transactional emails
- Non-blocking error handling (payment success independent of email)

## Transfer and Payout Handlers

### Transfer Creation Handler
**Function:** `handleTransferCreated(transfer, event)`
**Purpose:** Tracks vendor transfer initiation

**Processing:**
- Updates transaction status to 'processing'
- Tracks vendor and order metadata
- Provides transfer lifecycle monitoring

### Transfer Reversal Handler
**Function:** `handleTransferReversed(transfer, event)`
**Purpose:** Handles failed vendor transfers

**Processing:**
- Updates transaction status to 'failed'
- Prepares admin notifications for investigation
- Handles refund scenarios and vendor account issues

### Transfer Update Handler
**Function:** `handleTransferUpdated(transfer, event)`
**Purpose:** Tracks transfer status changes

**Status Mapping:**
```javascript
const status = transfer.status === 'paid' ? 'completed' : 'processing';
await updateTransactionStatus(transfer.id, status);
```

### Payout Completion Handler
**Function:** `handlePayoutCompleted(payout, event)`
**Purpose:** Finalizes vendor payouts

**Processing:**
- Marks all associated transactions as paid out
- Records payout arrival date
- Completes vendor payment cycle

### Payout Failure Handler
**Function:** `handlePayoutFailed(payout, event)`
**Purpose:** Handles payout failures

**Processing:**
- Prepares admin notifications for payout issues
- Tracks payout failures for vendor account management
- Handles bank account and verification issues

## Subscription Event Handlers

### Invoice Creation Handler
**Function:** `handleInvoiceCreated(invoice, event)`
**Purpose:** Attempts Connect balance payment for subscriptions

**Connect Balance Payment Flow:**
1. **Subscription Validation:** Verifies subscription and amount due
2. **Balance Preference Check:** Checks if user prefers Connect balance payment
3. **Balance Payment Attempt:** Uses StripeService to process payment from Connect balance
4. **Invoice Payment:** Marks invoice as paid if Connect balance sufficient
5. **Payment Recording:** Records payment method and transfer details

**Database Integration:**
```sql
INSERT INTO subscription_payments (
  subscription_id, stripe_invoice_id, amount, currency, status, 
  payment_method, connect_transfer_id, billing_period_start, billing_period_end
) VALUES (?, ?, ?, ?, 'succeeded', 'connect_balance', ?, FROM_UNIXTIME(?), FROM_UNIXTIME(?))
```

### Subscription Lifecycle Handlers

#### Subscription Created
**Function:** `handleSubscriptionCreated(subscription, event)`
- Updates database with subscription details
- Records billing periods and status
- Tracks subscription lifecycle from creation

#### Subscription Updated
**Function:** `handleSubscriptionUpdated(subscription, event)`
- Updates subscription status and billing periods
- Tracks cancellation flags and plan changes
- Monitors subscription modifications

#### Subscription Deleted
**Function:** `handleSubscriptionDeleted(subscription, event)`
- Marks subscription as canceled
- Records cancellation timestamp
- Finalizes subscription lifecycle

### Subscription Payment Handlers

#### Payment Succeeded
**Function:** `handleSubscriptionPaymentSucceeded(invoice, event)`
**Purpose:** Records successful subscription payments

**Payment Method Detection:**
```javascript
// Determine payment method used
let paymentMethod = 'card';
let connectTransferId = null;

// Check if paid via Connect balance
if (invoice.metadata && invoice.metadata.paid_via_connect_balance) {
  paymentMethod = 'connect_balance';
  connectTransferId = invoice.metadata.connect_transfer_id;
}
```

**Database Recording:**
- Records payment amount and currency
- Tracks payment method (card vs Connect balance)
- Stores billing period information
- Links to Stripe invoice and payment intent

#### Payment Failed
**Function:** `handleSubscriptionPaymentFailed(invoice, event)`
**Purpose:** Records failed subscription payments

**Processing:**
- Records failed payment attempt
- Prepares customer notifications
- Tracks payment failure reasons
- Considers grace periods for service access

## Account and Verification Handlers

### Account Update Handler
**Function:** `handleAccountUpdate(account, event)`
**Purpose:** Tracks vendor verification status changes

**Verification Logic:**
```javascript
const isVerified = account.charges_enabled && account.payouts_enabled;
await updateVendorVerificationStatus(vendorId, isVerified);
```

**Processing:**
- Monitors Stripe Connect account capabilities
- Updates vendor verification status
- Prepares verification success notifications
- Tracks vendor onboarding progress

## Dispute Management Handlers

### Dispute Creation Handler
**Function:** `handleDisputeCreated(dispute, event)`
**Purpose:** Handles chargeback disputes

**Processing:**
- Records dispute details in database
- Prepares admin notifications for dispute management
- Initiates dispute workflow
- Holds vendor payouts for disputed amounts

### Dispute Closure Handler
**Function:** `handleDisputeClosed(dispute, event)`
**Purpose:** Handles dispute resolution

**Processing:**
- Updates dispute status based on outcome
- Processes fund adjustments
- Releases held funds if dispute won
- Handles refund adjustments if dispute lost

## Shipping Subscription Handlers

### Setup Intent Success Handler
**Function:** `handleSetupIntentSucceeded(setupIntent, event)`
**Purpose:** Activates shipping subscriptions

**Processing Flow:**
1. **Subscription Identification:** Finds shipping subscription by customer ID
2. **Subscription Activation:** Updates subscription status to active
3. **Permission Grant:** Grants shipping permissions to user
4. **Notification:** Sends activation confirmation email

**Database Operations:**
```sql
-- Activate subscription
UPDATE user_subscriptions SET status = "active" WHERE id = ?

-- Grant shipping permission
UPDATE user_permissions SET shipping = 1 WHERE user_id = ?
```

### Setup Intent Failure Handler
**Function:** `handleSetupIntentFailed(setupIntent, event)`
**Purpose:** Handles shipping setup failures

**Processing:**
- Keeps subscription as incomplete
- Revokes shipping permissions
- Sends failure notification with reason
- Tracks setup failure reasons

### Source Expiration Handler
**Function:** `handleSourceExpired(source, event)`
**Purpose:** Handles payment method expiration

**Processing:**
- Deactivates affected shipping subscriptions
- Revokes shipping permissions
- Sends expiration notifications
- Tracks payment method lifecycle

## Shipping Label Payment Handlers

### Shipping Label Payment Success
**Function:** `handleShippingLabelPayment(paymentIntent, shippingLabelId)`
**Purpose:** Finalizes shipping label purchases

**Database Update:**
```sql
UPDATE shipping_label_purchases 
SET status = 'succeeded', updated_at = CURRENT_TIMESTAMP
WHERE stripe_payment_intent_id = ?
```

### Shipping Label Payment Failure
**Function:** `handleShippingLabelPaymentFailure(paymentIntent, shippingLabelId)`
**Purpose:** Handles shipping label payment failures

**Failure Reason Tracking:**
```javascript
const declineReason = paymentIntent.last_payment_error?.decline_code || 
                     paymentIntent.last_payment_error?.code || 
                     'payment_failed';
```

**Database Update:**
```sql
UPDATE shipping_label_purchases 
SET status = 'failed', decline_reason = ?, updated_at = CURRENT_TIMESTAMP
WHERE stripe_payment_intent_id = ?
```

## Database Helper Functions

### Order Status Management
**Function:** `updateOrderStatus(orderId, status, paymentIntentId)`
**Purpose:** Updates e-commerce order status and payment tracking

**Query Pattern:**
```sql
UPDATE orders 
SET status = ?, stripe_payment_intent_id = COALESCE(?, stripe_payment_intent_id), updated_at = CURRENT_TIMESTAMP
WHERE id = ?
```

### Transaction Status Tracking
**Function:** `updateTransactionStatus(stripeTransferId, status)`
**Purpose:** Updates vendor transaction status for payout tracking

**Status Values:**
- `processing` - Transfer initiated
- `completed` - Transfer successful
- `failed` - Transfer failed or reversed

### Platform Commission Recording
**Function:** `recordPlatformCommission(orderId, paymentIntentId)`
**Purpose:** Records platform commission from marketplace orders

**Commission Calculation:**
```sql
INSERT INTO vendor_transactions 
(vendor_id, order_id, transaction_type, amount, status)
SELECT 
  1 as vendor_id, -- Platform admin user ID
  oi.order_id,
  'commission' as transaction_type,
  SUM(oi.commission_amount) as amount,
  'completed' as status
FROM order_items oi
WHERE oi.order_id = ?
GROUP BY oi.order_id
```

### Vendor Verification Management
**Function:** `updateVendorVerificationStatus(vendorId, isVerified)`
**Purpose:** Updates vendor verification status based on Stripe account capabilities

**Verification Criteria:**
- `charges_enabled` - Can accept payments
- `payouts_enabled` - Can receive payouts
- Combined status determines verification

### Subscription Management
**Function:** `updateSubscriptionStatus(stripeSubscriptionId, status)`
**Purpose:** Updates subscription status from Stripe events

**Status Synchronization:**
- Keeps database status in sync with Stripe
- Tracks subscription lifecycle changes
- Supports subscription management workflows

### Subscription Transaction Recording
**Function:** `recordSubscriptionTransaction(invoice)`
**Purpose:** Records subscription payment transactions

**Vendor Lookup:**
```sql
SELECT vendor_id FROM vendor_subscriptions 
WHERE stripe_customer_id = ? AND stripe_subscription_id = ?
```

**Transaction Recording:**
```sql
INSERT INTO vendor_transactions 
(vendor_id, transaction_type, amount, status)
VALUES (?, 'subscription_charge', ?, 'completed')
```

### Payout Transaction Management
**Function:** `markTransactionsAsPaidOut(payoutId, arrivalDate)`
**Purpose:** Marks transactions as paid out after payout completion

**Batch Update:**
```sql
UPDATE vendor_transactions 
SET status = 'completed', updated_at = CURRENT_TIMESTAMP
WHERE status = 'processing' AND payout_date <= ?
```

## Environment Variables

### STRIPE_SECRET_KEY
**Usage:** Stripe API authentication
**Purpose:** Authenticates with Stripe API for webhook processing

### STRIPE_WEBHOOK_SECRET
**Usage:** Webhook signature verification
**Purpose:** Validates webhook authenticity and prevents replay attacks

### FRONTEND_URL
**Usage:** Event URL generation in ticket confirmation emails
**Implementation:**
```javascript
event_url: `${process.env.FRONTEND_URL || 'https://beemeeart.com'}/events/${eventId}`
```
**Purpose:** Generates correct event URLs for email notifications

## Error Handling and Logging

### Webhook-Level Error Handling
- **Signature Failures:** Returns 400 status with error message
- **Handler Failures:** Returns 500 status with generic error message
- **Event Processing:** Logs errors without exposing internal details
- **Non-Blocking Operations:** Email failures don't affect payment processing

### Function-Level Error Handling
- **Database Errors:** Comprehensive error logging with context
- **External Service Errors:** Graceful handling of service failures
- **Email Errors:** Non-blocking email processing with error logging
- **Validation Errors:** Proper error responses for invalid data

### Logging Strategy
- **Security Events:** Webhook signature failures and suspicious activity
- **Payment Events:** All payment processing with success/failure status
- **Error Events:** Comprehensive error logging with stack traces
- **Performance Events:** Processing times and webhook response times

## Security Considerations

### Webhook Security
- **Signature Verification:** All webhooks verified using Stripe signature
- **Replay Protection:** Stripe's built-in replay protection
- **IP Whitelisting:** Consider Stripe IP whitelisting for additional security
- **Rate Limiting:** Monitor webhook frequency for abuse detection

### Data Security
- **Sensitive Data:** Payment data handled according to PCI compliance
- **Database Security:** Parameterized queries prevent SQL injection
- **Error Responses:** No sensitive data exposed in error messages
- **Logging Security:** Sensitive data excluded from logs

### Access Control
- **Webhook Endpoint:** Public endpoint with signature verification
- **Database Access:** Restricted to webhook processing functions
- **Service Integration:** Secure integration with StripeService and EmailService
- **Permission Management:** Proper permission updates for subscription changes

## Performance Considerations

### Webhook Processing
- **Asynchronous Processing:** All database operations use async/await
- **Non-Blocking Operations:** Email processing doesn't block webhook response
- **Efficient Queries:** Optimized database queries with proper indexing
- **Error Isolation:** Individual handler failures don't affect other events

### Database Optimization
- **Indexed Queries:** Proper indexing on frequently queried fields
- **Batch Operations:** Efficient batch updates where applicable
- **Connection Pooling:** Efficient database connection management
- **Query Optimization:** Optimized queries for webhook processing speed

### Scalability
- **Event Handling:** Scalable event routing system
- **Database Design:** Efficient database schema for webhook data
- **Service Integration:** Scalable integration with external services
- **Monitoring:** Performance monitoring for webhook processing

## Monitoring and Alerting

### Webhook Monitoring
- **Processing Times:** Monitor webhook processing duration
- **Success Rates:** Track webhook processing success/failure rates
- **Event Volume:** Monitor webhook event volume and patterns
- **Error Rates:** Track error rates by event type and handler

### Payment Monitoring
- **Payment Success Rates:** Monitor payment processing success rates
- **Failed Payments:** Track and alert on payment failures
- **Dispute Rates:** Monitor chargeback and dispute rates
- **Payout Issues:** Track vendor payout failures and delays

### System Health
- **Database Performance:** Monitor database query performance
- **Service Dependencies:** Monitor StripeService and EmailService health
- **Error Patterns:** Identify and alert on error patterns
- **Security Events:** Monitor for security-related events

## Integration Points

### StripeService Integration
- **Vendor Transfers:** Uses StripeService for vendor payout processing
- **Connect Balance Payments:** Integrates with Connect balance payment system
- **Account Management:** Coordinates with vendor account verification
- **Payment Processing:** Leverages StripeService for complex payment operations

### EmailService Integration
- **Transactional Emails:** Uses EmailService for all webhook-triggered emails
- **Template System:** Integrates with email template system
- **Priority Handling:** High-priority processing for payment confirmations
- **Error Handling:** Non-blocking email processing with comprehensive logging

### Database Integration
- **Transaction Management:** Proper database transaction handling
- **Data Consistency:** Ensures data consistency across related tables
- **Referential Integrity:** Maintains proper relationships between entities
- **Audit Trail:** Comprehensive audit trail for all payment events

## Future Enhancements

### Dispute Management
- **Dispute Table:** Create comprehensive dispute tracking table
- **Dispute Workflow:** Implement dispute management workflow
- **Evidence Handling:** System for dispute evidence management
- **Automated Responses:** Automated dispute response system

### Advanced Monitoring
- **Real-time Dashboards:** Real-time webhook processing dashboards
- **Predictive Analytics:** Predictive analytics for payment patterns
- **Anomaly Detection:** Automated anomaly detection for unusual patterns
- **Performance Optimization:** Continuous performance optimization

### Enhanced Notifications
- **Multi-channel Notifications:** SMS, push notifications for critical events
- **Notification Preferences:** User-configurable notification preferences
- **Escalation Procedures:** Automated escalation for critical issues
- **Notification Templates:** Enhanced notification template system

## Testing and Validation

### Webhook Testing
- **Stripe CLI:** Use Stripe CLI for local webhook testing
- **Test Events:** Comprehensive test coverage for all event types
- **Error Scenarios:** Test error handling and edge cases
- **Performance Testing:** Load testing for webhook processing

### Integration Testing
- **End-to-End Testing:** Complete payment flow testing
- **Service Integration:** Test integration with StripeService and EmailService
- **Database Testing:** Test database operations and consistency
- **Email Testing:** Test email notification system

### Security Testing
- **Signature Validation:** Test webhook signature validation
- **Replay Attack Testing:** Test replay attack prevention
- **Input Validation:** Test input validation and sanitization
- **Error Handling:** Test secure error handling

## Deployment Considerations

### Environment Configuration
- **Webhook URLs:** Configure webhook URLs for each environment
- **Environment Variables:** Proper environment variable configuration
- **Database Configuration:** Environment-specific database settings
- **Service Configuration:** Configure external service integrations

### Monitoring Setup
- **Logging Configuration:** Configure comprehensive logging
- **Alerting Setup:** Set up monitoring and alerting
- **Performance Monitoring:** Configure performance monitoring
- **Security Monitoring:** Set up security event monitoring

### Rollback Procedures
- **Webhook Versioning:** Version webhook handlers for rollback capability
- **Database Migrations:** Reversible database migrations
- **Configuration Rollback:** Ability to rollback configuration changes
- **Service Rollback:** Coordinated rollback with dependent services
