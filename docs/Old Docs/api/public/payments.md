# Payments API

## Authentication
All payment endpoints require API key authentication and CSRF protection.

## Overview
The Beemeeart payment system provides comprehensive payment processing for a multi-vendor marketplace using Stripe. Supports vendor onboarding, payment processing, tax calculation, subscriptions, and financial reporting.

## Vendor Account Management

### Stripe Connect Integration
Vendors use Stripe Connect Express accounts for payment processing:
- **Account Type:** Express (simplified onboarding)
- **Capabilities:** Card payments and transfers
- **Supported Countries:** United States
- **Business Types:** Individual and business accounts

### Onboarding Process
1. **Account Creation:** Vendor account created with basic information
2. **Onboarding Link:** Secure link generated for Stripe onboarding
3. **Verification:** Stripe handles identity and bank account verification
4. **Activation:** Account activated for payment processing

### Account Status
- **charges_enabled:** Can accept payments
- **payouts_enabled:** Can receive payouts
- **details_submitted:** Onboarding completed
- **verification_status:** Overall account status

## Payment Processing

### Multi-Vendor Orders
The platform supports complex multi-vendor orders with automatic payment distribution:

#### Payment Flow
1. **Payment Intent Creation:** Single payment intent for entire order
2. **Payment Collection:** Customer pays total amount to platform
3. **Vendor Transfers:** Automatic distribution to vendors after commission
4. **Tax Handling:** Integrated tax calculation and collection

#### Commission Structures
**Commission Model (Default):**
- Platform takes percentage commission (typically 15%)
- Platform absorbs all Stripe processing fees
- Vendor receives: `item_price - commission_amount`

**Pass-Through Model:**
- Platform takes 0% commission
- Vendor pays equivalent of Stripe processing fees
- Vendor receives: `item_price - stripe_fee_equivalent`

### Payment Methods
- **Credit/Debit Cards:** Visa, Mastercard, American Express, Discover
- **Digital Wallets:** Apple Pay, Google Pay (where supported)
- **Bank Transfers:** ACH transfers for large transactions
- **International:** Support for international cards

## Tax Calculation

### Stripe Tax Integration
Automatic tax calculation using Stripe Tax API:
- **Real-time Calculation:** Tax calculated at checkout
- **Jurisdiction Accuracy:** State, county, and city tax rates
- **Compliance:** Automatic tax collection and reporting
- **Exemptions:** Support for tax-exempt customers

### Tax Reporting
- **Order-Level:** Tax breakdown for each order
- **Vendor Reports:** Monthly tax summaries per vendor
- **Jurisdiction Reports:** Tax collected by state/locality
- **Compliance Export:** Data export for tax filing

## Subscription Management

### Artist Verification Subscriptions
**Base Verification - $50/year:**
- Verified artist status
- Enhanced application features
- Priority support
- Marketplace benefits

**Additional Persona - $10/year:**
- Extra verified identity/packet
- Multi-identity artist support
- Separate branding per persona

### Subscription Features
- **Automatic Renewal:** Annual billing cycle
- **Proration:** Automatic proration for changes
- **Payment Methods:** Credit cards and bank accounts
- **Connect Balance:** Pay from vendor earnings (optional)

## Financial Reporting

### Vendor Analytics
- **Sales Summary:** Total sales and commission breakdown
- **Payout Schedule:** Upcoming and historical payouts
- **Transaction History:** Detailed transaction records
- **Tax Reports:** Tax collected and jurisdictions

### Platform Analytics
- **Commission Revenue:** Total platform earnings
- **Vendor Performance:** Top-performing vendors
- **Geographic Analysis:** Sales by region
- **Payment Methods:** Usage statistics by payment type

## Fee Structure

### Stripe Processing Fees
- **Standard Rate:** 2.9% + $0.30 per transaction
- **International Cards:** Additional 1% fee
- **Currency Conversion:** Market rate + 1% fee
- **Disputes:** $15 per chargeback

### Platform Fees
- **Commission Model:** Platform percentage (configurable per vendor)
- **Pass-Through Model:** Vendor pays processing fees only
- **Subscription Fees:** Fixed annual rates for verification

## Error Handling

### Common Payment Errors
- **Insufficient Funds:** Customer card declined
- **Invalid Card:** Expired or invalid card details
- **Authentication Required:** 3D Secure authentication needed
- **Processing Error:** Temporary Stripe service issues

### Error Response Format
```json
{
  "error": {
    "type": "card_error",
    "code": "card_declined",
    "message": "Your card was declined.",
    "decline_code": "insufficient_funds"
  }
}
```

## Security Features

### PCI Compliance
- **Stripe Hosted:** No card data touches platform servers
- **Tokenization:** Secure payment method storage
- **Encryption:** End-to-end encryption for all transactions
- **Monitoring:** Real-time fraud detection

### Vendor Security
- **Account Verification:** Identity verification required
- **Bank Verification:** Bank account ownership verification
- **Transaction Monitoring:** Suspicious activity detection
- **Payout Controls:** Configurable payout schedules

## Integration Examples

### Processing a Payment
```javascript
// Create payment intent for order
const paymentIntent = await stripeService.createPaymentIntent({
  total_amount: 150.75,
  currency: 'usd',
  customer_id: 'cus_123',
  metadata: {
    order_id: '456',
    vendor_count: '3'
  }
});

// After successful payment, process vendor transfers
const transfers = await stripeService.processVendorTransfers(
  456, // order ID
  paymentIntent.id
);
```

### Tax Calculation
```javascript
// Calculate tax for order items
const taxCalculation = await stripeService.calculateTax({
  line_items: [
    {
      amount: 10000, // $100.00 in cents
      reference: 'product_123'
    }
  ],
  customer_address: {
    line1: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    postal_code: '94105',
    country: 'US'
  }
});
```

### Vendor Onboarding
```javascript
// Create vendor Stripe account
const account = await stripeService.createVendorAccount(
  vendorId,
  'vendor@example.com',
  { business_type: 'individual' }
);

// Generate onboarding link
const accountLink = await stripeService.createAccountLink(
  account.id,
  vendorId
);

// Redirect vendor to accountLink.url for onboarding
```

## Webhooks

### Supported Events
- **payment_intent.succeeded:** Payment completed successfully
- **transfer.created:** Vendor transfer initiated
- **account.updated:** Vendor account status changed
- **invoice.payment_succeeded:** Subscription payment processed

### Webhook Security
- **Signature Verification:** Stripe signature validation required
- **Idempotency:** Duplicate event handling prevention
- **Retry Logic:** Automatic retry for failed webhook deliveries

## Rate Limits
- **API Calls:** 100 requests per second per API key
- **Payment Processing:** No artificial limits (Stripe limits apply)
- **Webhook Delivery:** Automatic retry with exponential backoff

## Testing
- **Test Mode:** Full Stripe test environment available
- **Test Cards:** Comprehensive test card numbers for all scenarios
- **Webhook Testing:** Local webhook testing with Stripe CLI
- **Sandbox Environment:** Complete testing environment available
