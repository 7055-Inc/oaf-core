# Webhooks API

## Overview
The Beemeeart Webhooks API provides secure endpoints for receiving and processing payment events from Stripe. This system handles all payment-related notifications including successful payments, failed transactions, subscription changes, vendor payouts, and dispute management. The webhook system ensures real-time synchronization between Stripe and the Beemeeart platform.

## Authentication
Webhook endpoints use Stripe signature verification for security. No user authentication is required, but all webhook requests must include a valid Stripe signature header for verification.

## Base URL
```
https://api.beemeeart.com/webhooks
```

## Webhook Security

### Signature Verification
All webhook requests are verified using Stripe's signature verification system to ensure authenticity and prevent replay attacks.

**Required Headers:**
- `stripe-signature`: Stripe webhook signature for request verification
- `content-type`: Must be `application/json`

**Security Features:**
- Cryptographic signature verification using webhook secret
- Replay attack prevention through timestamp validation
- Secure error responses without exposing internal details
- Comprehensive logging for security monitoring

## Stripe Webhook Endpoint

### Process Stripe Webhook
`POST /api/webhooks/stripe`

Receives and processes all Stripe webhook events including payments, subscriptions, transfers, disputes, and account updates.

**Authentication:** Stripe signature verification (no user authentication required)

**Headers:**
- `stripe-signature` (required): Stripe webhook signature
- `content-type`: application/json

**Request Body:**
Raw JSON webhook payload from Stripe (varies by event type)

**Response (200 OK):**
```json
{
  "received": true
}
```

**Error Responses:**
- `400 Bad Request`: Invalid webhook signature
- `500 Internal Server Error`: Webhook processing failed

**Supported Event Types:**

#### Payment Events
- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment failed or declined

#### Transfer Events
- `transfer.created` - Vendor transfer initiated
- `transfer.reversed` - Transfer reversed or failed
- `transfer.updated` - Transfer status updated

#### Payout Events
- `payout.paid` - Vendor payout completed
- `payout.failed` - Payout failed

#### Subscription Events
- `customer.subscription.created` - New subscription created
- `customer.subscription.updated` - Subscription modified
- `customer.subscription.deleted` - Subscription canceled
- `invoice.created` - Subscription invoice generated
- `invoice.payment_succeeded` - Subscription payment successful
- `invoice.payment_failed` - Subscription payment failed

#### Account Events
- `account.updated` - Vendor account verification status changed

#### Dispute Events
- `charge.dispute.created` - Chargeback dispute opened
- `charge.dispute.closed` - Dispute resolved

#### Payment Method Events
- `setup_intent.succeeded` - Payment method setup successful
- `setup_intent.setup_failed` - Payment method setup failed
- `customer.source.expired` - Payment method expired

## Payment Processing

### Payment Types Handled

#### Booth Fee Payments
Processes event application booth fee payments with automatic status updates and confirmation emails.

**Metadata Required:**
- `application_id`: Event application ID

**Processing:**
- Updates application payment status
- Records payment transaction
- Sends confirmation email to applicant

#### E-commerce Orders
Handles marketplace order payments with vendor transfer processing and commission recording.

**Metadata Required:**
- `order_id`: Marketplace order ID

**Processing:**
- Updates order status to paid
- Initiates vendor transfers
- Records platform commission
- Triggers order fulfillment workflow

#### Event Tickets
Processes event ticket purchases with inventory updates and ticket code generation.

**Metadata Required:**
- `event_id`: Event ID
- `ticket_id`: Ticket type ID
- `buyer_email`: Purchaser email
- `buyer_name`: Purchaser name

**Processing:**
- Confirms ticket purchases
- Updates ticket inventory
- Generates unique ticket codes
- Sends ticket confirmation email

#### Shipping Labels
Handles shipping label purchase payments for vendor shipping services.

**Metadata Required:**
- `shipping_label_id`: Shipping label purchase ID

**Processing:**
- Updates shipping label purchase status
- Records payment transaction
- Enables label printing and usage

### Payment Failure Handling

When payments fail, the webhook system:
- Updates relevant records with failure status
- Records failure reasons and decline codes
- Prepares customer notification emails
- Logs failure details for analysis

## Subscription Management

### Subscription Lifecycle

#### Subscription Creation
When new subscriptions are created:
- Database records updated with subscription details
- Billing periods and status synchronized
- Subscription lifecycle tracking initiated

#### Subscription Updates
When subscriptions are modified:
- Status and billing period updates
- Cancellation flag tracking
- Plan change processing

#### Subscription Cancellation
When subscriptions are canceled:
- Status updated to canceled
- Cancellation timestamp recorded
- Access permissions updated accordingly

### Subscription Payments

#### Connect Balance Payments
The system attempts to pay subscription invoices from vendor Connect balances when preferred:

**Process:**
1. Check user preference for Connect balance payment
2. Verify sufficient balance in Connect account
3. Process payment transfer from Connect balance
4. Mark invoice as paid with Connect balance metadata
5. Record payment method and transfer details

#### Payment Success
When subscription payments succeed:
- Payment records created with amount and method
- Billing period information stored
- Service access maintained or restored

#### Payment Failures
When subscription payments fail:
- Failed payment attempts recorded
- Customer notification emails prepared
- Grace period considerations applied
- Service access restrictions may apply

## Vendor Payout System

### Transfer Processing

#### Transfer Creation
When vendor transfers are initiated:
- Transaction status updated to processing
- Transfer metadata recorded
- Payout tracking initiated

#### Transfer Completion
When transfers complete successfully:
- Transaction status updated to completed
- Vendor account balances updated
- Payout confirmation processing

#### Transfer Failures
When transfers fail or are reversed:
- Transaction status updated to failed
- Admin notifications prepared
- Refund scenarios handled
- Vendor account issues addressed

### Payout Management

#### Payout Completion
When vendor payouts are completed:
- All associated transactions marked as paid out
- Payout arrival dates recorded
- Vendor payment cycle finalized

#### Payout Failures
When payouts fail:
- Admin notifications triggered
- Vendor notifications prepared
- Bank account issues tracked
- Resolution workflows initiated

## Account Verification

### Vendor Account Updates
When Stripe Connect accounts are updated:
- Verification status checked based on capabilities
- Database records updated with verification status
- Vendor notifications sent for successful verification
- Onboarding progress tracked

**Verification Criteria:**
- `charges_enabled`: Account can accept payments
- `payouts_enabled`: Account can receive payouts
- Combined status determines full verification

## Dispute Management

### Dispute Creation
When chargebacks or disputes are created:
- Dispute details recorded in system
- Admin notifications triggered
- Vendor payout holds initiated for disputed amounts
- Dispute management workflow started

### Dispute Resolution
When disputes are closed:
- Dispute status updated based on outcome
- Fund adjustments processed
- Held funds released if dispute won
- Refund adjustments if dispute lost

## Shipping Subscription Management

### Payment Method Setup

#### Setup Success
When shipping subscription payment methods are successfully set up:
- Subscription status activated
- Shipping permissions granted to user
- Activation confirmation emails sent
- Shipping service access enabled

#### Setup Failures
When payment method setup fails:
- Subscription remains incomplete
- Shipping permissions revoked
- Failure notifications sent with reasons
- Setup retry workflows available

### Payment Method Lifecycle

#### Payment Method Expiration
When payment methods expire:
- Affected subscriptions deactivated
- Shipping permissions revoked
- Expiration notifications sent
- Payment method update prompts triggered

## Email Notifications

### Transactional Emails
The webhook system triggers various transactional emails:

#### Payment Confirmations
- Booth fee payment confirmations
- Ticket purchase confirmations with codes
- Order payment confirmations
- Shipping label purchase confirmations

#### Subscription Notifications
- Subscription activation confirmations
- Payment failure notifications
- Subscription cancellation confirmations
- Payment method expiration alerts

#### Account Notifications
- Vendor verification success notifications
- Payout completion notifications
- Dispute notifications
- Account status change alerts

### Email Features
- High-priority transactional processing
- Professional email templates
- Non-blocking email processing (payment success independent of email delivery)
- Comprehensive error logging for email failures

## Error Handling

### Webhook-Level Errors
- **400 Bad Request**: Invalid webhook signature or malformed request
- **500 Internal Server Error**: Webhook processing failure

### Event Processing Errors
- Individual event processing errors are logged but don't fail the entire webhook
- Non-critical operations (like email sending) don't affect payment processing
- Comprehensive error logging for debugging and monitoring

### Security Error Handling
- Invalid signatures return 400 status without exposing details
- Replay attacks prevented through Stripe's built-in protection
- Suspicious activity logged for security monitoring

## Rate Limits and Performance

### Webhook Processing
- Asynchronous processing for optimal performance
- Non-blocking operations for secondary tasks
- Efficient database queries with proper indexing
- Scalable event routing system

### Performance Considerations
- Average processing time: < 500ms per webhook
- Database connection pooling for efficiency
- Optimized queries for high-volume events
- Error isolation prevents cascading failures

## Monitoring and Observability

### Webhook Metrics
- Processing success/failure rates
- Average processing times
- Event volume and patterns
- Error rates by event type

### Payment Metrics
- Payment success rates by type
- Failed payment analysis
- Dispute and chargeback rates
- Vendor payout performance

### System Health
- Database performance monitoring
- External service dependency health
- Error pattern analysis
- Security event monitoring

## Integration Examples

### Webhook Endpoint Configuration
Configure your Stripe webhook endpoint to point to:
```
https://api.beemeeart.com/webhooks/stripe
```

### Required Webhook Events
Ensure your Stripe webhook is configured to send these event types:
```
payment_intent.succeeded
payment_intent.payment_failed
transfer.created
transfer.reversed
transfer.updated
payout.paid
payout.failed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.created
invoice.payment_succeeded
invoice.payment_failed
account.updated
charge.dispute.created
charge.dispute.closed
setup_intent.succeeded
setup_intent.setup_failed
customer.source.expired
```

### Webhook Testing
Use Stripe CLI for local webhook testing:
```bash
stripe listen --forward-to localhost:3001/webhooks/stripe
stripe trigger payment_intent.succeeded
```

### Production Deployment
1. Configure webhook endpoint URL in Stripe Dashboard
2. Set webhook secret in environment variables
3. Enable all required event types
4. Test webhook processing in staging environment
5. Monitor webhook processing after deployment

## Security Best Practices

### Webhook Security
- Always verify webhook signatures
- Use HTTPS for webhook endpoints
- Implement proper error handling
- Log security events for monitoring

### Data Protection
- Handle payment data according to PCI compliance
- Exclude sensitive data from logs
- Use secure database connections
- Implement proper access controls

### Monitoring
- Monitor webhook processing performance
- Set up alerts for processing failures
- Track security events and anomalies
- Implement comprehensive logging

## Troubleshooting

### Common Issues

#### Webhook Signature Verification Failures
- Verify webhook secret configuration
- Check request body parsing (must be raw)
- Ensure proper header handling
- Validate Stripe CLI configuration

#### Payment Processing Failures
- Check payment metadata completeness
- Verify database connectivity
- Review error logs for specific failures
- Validate external service integrations

#### Email Notification Issues
- Check EmailService configuration
- Verify email template availability
- Review email queue processing
- Validate SMTP settings

### Debugging Tools
- Stripe Dashboard webhook logs
- Application error logs
- Database query logs
- Email service logs

### Support Resources
- Stripe webhook documentation
- Platform API documentation
- Error code reference
- Support contact information
