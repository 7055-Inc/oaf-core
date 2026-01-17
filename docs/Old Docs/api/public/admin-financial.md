# Admin Financial Management API

## Authentication
All admin financial endpoints require API key authentication and system management permissions.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- `Content-Type: application/json`
- **Permission Required:** `manage_system`

## Financial Overview

### Get Platform Financial Overview
`GET /api/admin/financial-overview`

Get comprehensive platform financial metrics and overview.

**Response (200 OK):**
```json
{
  "success": true,
  "overview": {
    "total_commission_earned": 15000.00,
    "total_vendor_sales": 150000.00,
    "pending_payouts": 12000.00,
    "total_paid_out": 100000.00,
    "total_orders": 1250,
    "active_vendors": 85,
    "total_adjustments": -500.00,
    "adjustment_count": 5,
    "platform_balance": 14500.00
  }
}
```

### Get Payout Calculations
`GET /api/admin/payout-calculations`

Get detailed payout calculations for all vendors.

**Response (200 OK):**
```json
{
  "success": true,
  "calculations": {
    "current_payouts_owed": 12000.00,
    "future_payouts": 8000.00,
    "total_vendor_balances": 20000.00,
    "available_to_withdraw": 5000.00,
    "break_even_point": 20000.00
  }
}
```

## Manual Adjustments

### Create Manual Adjustment
`POST /api/admin/manual-adjustment`

Create a manual financial adjustment for a vendor account.

**Request Body:**
```json
{
  "vendor_id": 123,
  "amount": 100.00,
  "description": "Refund for damaged product",
  "type": "credit"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "adjustment": {
    "id": 456,
    "vendor_id": 123,
    "admin_id": 1,
    "amount": 100.00,
    "description": "Refund for damaged product",
    "type": "credit",
    "created_at": "2025-09-17T19:30:00Z"
  }
}
```

### Get Manual Adjustments
`GET /api/admin/manual-adjustments`

Get all manual adjustments with optional filtering.

**Query Parameters:**
- `vendor_id` (optional): Filter by vendor ID
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Offset for pagination (default: 0)

**Response (200 OK):**
```json
{
  "success": true,
  "adjustments": [
    {
      "id": 456,
      "vendor_id": 123,
      "admin_id": 1,
      "amount": 100.00,
      "description": "Refund for damaged product",
      "type": "credit",
      "created_at": "2025-09-17T19:30:00Z",
      "vendor_username": "artist@example.com",
      "admin_username": "admin@example.com"
    }
  ]
}
```

## Vendor Settings

### Update Vendor Settings
`POST /api/admin/vendor-settings`

Update financial settings for a vendor.

**Request Body:**
```json
{
  "vendor_id": 123,
  "commission_rate": 0.15,
  "minimum_payout": 50.00,
  "payment_schedule": "weekly"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Vendor settings updated successfully"
}
```

### Get Vendor Settings
`GET /api/admin/vendor-settings`

Get vendor financial settings.

**Query Parameters:**
- `vendor_id` (optional): Filter by vendor ID

**Response (200 OK):**
```json
{
  "success": true,
  "settings": [
    {
      "id": 789,
      "vendor_id": 123,
      "commission_rate": 0.15,
      "minimum_payout": 50.00,
      "payment_schedule": "weekly",
      "created_at": "2025-09-17T19:30:00Z",
      "updated_at": "2025-09-17T19:30:00Z",
      "vendor_username": "artist@example.com"
    }
  ]
}
```

## Vendor Information

### Get Vendor Details
`GET /api/admin/vendor-details/:vendor_id`

Get comprehensive vendor information for admin review.

**Response (200 OK):**
```json
{
  "success": true,
  "vendor": {
    "id": 123,
    "username": "artist@example.com",
    "user_type": "artist",
    "status": "active",
    "created_at": "2025-01-01T00:00:00Z",
    "last_login": "2025-09-17T18:00:00Z",
    "stripe_account_id": "acct_1234567890",
    "stripe_verified": true,
    "balance": {
      "available_balance": 1500.00,
      "pending_payout": 500.00,
      "total_sales": 10000.00,
      "total_orders": 50
    }
  }
}
```

## Tax Reporting

### Get All Vendor Tax Summaries
`GET /api/admin/financials/all-vendor-tax-summaries/:period`

Get tax summaries for all vendors in a specific period.

**Parameters:**
- `period`: Report period in YYYY-MM format (e.g., "2025-09")

**Response (200 OK):**
```json
{
  "success": true,
  "report_period": "2025-09",
  "vendors": [
    {
      "id": 123,
      "vendor_id": 456,
      "report_period": "2025-09",
      "total_sales": 5000.00,
      "total_tax_collected": 400.00,
      "taxable_amount": 5000.00,
      "vendor_name": "artist@example.com"
    }
  ],
  "total_vendors": 25,
  "total_tax_collected": 10000.00
}
```

### Get State Compliance Overview
`GET /api/admin/financials/all-state-compliance/:period`

Get state-by-state tax compliance overview.

**Parameters:**
- `period`: Report period in YYYY-MM format

**Response (200 OK):**
```json
{
  "success": true,
  "report_period": "2025-09",
  "state_compliance": [
    {
      "customer_state": "CA",
      "total_orders": 150,
      "active_vendors": 25,
      "total_sales": 50000.00,
      "total_tax_collected": 4000.00,
      "avg_tax_rate": 0.08
    },
    {
      "customer_state": "NY",
      "total_orders": 120,
      "active_vendors": 20,
      "total_sales": 40000.00,
      "total_tax_collected": 3200.00,
      "avg_tax_rate": 0.08
    }
  ],
  "total_states": 15,
  "total_platform_tax": 15000.00
}
```

### Get Platform Tax Overview
`GET /api/admin/financials/all-tax-overview/:period`

Get platform-wide tax overview for a period.

**Parameters:**
- `period`: Report period in YYYY-MM format

**Response (200 OK):**
```json
{
  "success": true,
  "report_period": "2025-09",
  "platform_overview": {
    "total_orders": 500,
    "active_vendors": 75,
    "total_sales": 200000.00,
    "total_tax_collected": 16000.00,
    "states_with_sales": 25,
    "avg_tax_rate": 0.08
  }
}
```

### Get Vendor Tax Compliance
`GET /api/admin/financials/all-vendor-compliance/:period`

Get tax compliance status for all vendors.

**Parameters:**
- `period`: Report period in YYYY-MM format

**Response (200 OK):**
```json
{
  "success": true,
  "report_period": "2025-09",
  "vendor_compliance": [
    {
      "vendor_id": 123,
      "vendor_name": "artist@example.com",
      "states_with_sales": 5,
      "total_tax_collected": 800.00,
      "total_taxable_amount": 10000.00,
      "total_orders": 25
    }
  ],
  "total_vendors_with_tax": 45
}
```

## Transaction Management

### Get All Transactions
`GET /api/admin/financials/all-transactions`

Get all transactions across all vendors with filtering and pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by transaction type
- `status` (optional): Filter by transaction status

**Response (200 OK):**
```json
{
  "success": true,
  "transactions": [
    {
      "id": 789,
      "vendor_id": 123,
      "order_id": 456,
      "transaction_type": "sale",
      "amount": 100.00,
      "commission_amount": 15.00,
      "status": "completed",
      "payout_date": "2025-09-24",
      "created_at": "2025-09-17T19:30:00Z",
      "order_number": 456,
      "order_total": 108.00,
      "vendor_name": "artist@example.com",
      "type_display": "Sale"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1500,
    "pages": 75
  }
}
```

## Data Types

### Adjustment Types
- `credit`: Adds money to vendor account
- `debit`: Removes money from vendor account

### Transaction Types
- `sale`: Product sale transaction
- `commission`: Platform commission
- `payout`: Payout to vendor
- `refund`: Refund transaction
- `adjustment`: Manual adjustment
- `subscription_charge`: Subscription fee

### Transaction Status
- `pending`: Transaction is pending
- `completed`: Transaction is completed
- `failed`: Transaction failed
- `cancelled`: Transaction was cancelled

### Payment Schedules
- `daily`: Daily payouts
- `weekly`: Weekly payouts
- `monthly`: Monthly payouts
- `manual`: Manual payout approval required

## Validation Rules

### Commission Rate
- Must be between 0 and 1 (0% to 100%)
- Decimal format (e.g., 0.15 for 15%)

### Minimum Payout
- Must be non-negative
- Decimal format for currency amounts

### Period Format
- Must be in YYYY-MM format
- Examples: "2025-09", "2025-12"

### Adjustment Amount
- Must be a valid number
- Sign is determined by adjustment type
- Supports decimal values for currency

## Error Responses

- `400 Bad Request`: Invalid input data or business rule violations
  - Missing required fields
  - Invalid parameter values (commission rate, period format)
  - Invalid adjustment type
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: Insufficient permissions (requires manage_system)
- `404 Not Found`: 
  - Vendor not found
  - No data for specified period
- `500 Internal Server Error`: Server processing error

## Rate Limits
- 200 requests per minute per API key for financial endpoints
- Higher limits may apply for reporting endpoints during business hours

## Example Usage

### Complete Financial Management Flow
```bash
# 1. Get platform financial overview
curl -X GET https://api.beemeeart.com/api/admin/financial-overview \
  -H "Authorization: Bearer admin_api_key"

# 2. Get payout calculations
curl -X GET https://api.beemeeart.com/api/admin/payout-calculations \
  -H "Authorization: Bearer admin_api_key"

# 3. Create manual adjustment
curl -X POST https://api.beemeeart.com/api/admin/manual-adjustment \
  -H "Authorization: Bearer admin_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_id": 123,
    "amount": 50.00,
    "description": "Customer service credit",
    "type": "credit"
  }'
```

### Vendor Settings Management
```bash
# 1. Update vendor settings
curl -X POST https://api.beemeeart.com/api/admin/vendor-settings \
  -H "Authorization: Bearer admin_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_id": 123,
    "commission_rate": 0.12,
    "minimum_payout": 25.00,
    "payment_schedule": "weekly"
  }'

# 2. Get vendor settings
curl -X GET "https://api.beemeeart.com/api/admin/vendor-settings?vendor_id=123" \
  -H "Authorization: Bearer admin_api_key"

# 3. Get vendor details
curl -X GET https://api.beemeeart.com/api/admin/vendor-details/123 \
  -H "Authorization: Bearer admin_api_key"
```

### Tax Reporting Flow
```bash
# 1. Get platform tax overview
curl -X GET https://api.beemeeart.com/api/admin/financials/all-tax-overview/2025-09 \
  -H "Authorization: Bearer admin_api_key"

# 2. Get state compliance
curl -X GET https://api.beemeeart.com/api/admin/financials/all-state-compliance/2025-09 \
  -H "Authorization: Bearer admin_api_key"

# 3. Get vendor tax summaries
curl -X GET https://api.beemeeart.com/api/admin/financials/all-vendor-tax-summaries/2025-09 \
  -H "Authorization: Bearer admin_api_key"

# 4. Get vendor compliance
curl -X GET https://api.beemeeart.com/api/admin/financials/all-vendor-compliance/2025-09 \
  -H "Authorization: Bearer admin_api_key"
```

### Transaction Analysis
```bash
# 1. Get all transactions
curl -X GET "https://api.beemeeart.com/api/admin/financials/all-transactions?page=1&limit=50" \
  -H "Authorization: Bearer admin_api_key"

# 2. Filter by transaction type
curl -X GET "https://api.beemeeart.com/api/admin/financials/all-transactions?type=sale&status=completed" \
  -H "Authorization: Bearer admin_api_key"

# 3. Get manual adjustments
curl -X GET "https://api.beemeeart.com/api/admin/manual-adjustments?limit=50&offset=0" \
  -H "Authorization: Bearer admin_api_key"
```

## Integration Notes

### StripeService Integration
- Financial overview integrates with Stripe for real-time payment data
- Vendor details include Stripe account information and verification status
- Payout calculations coordinate with Stripe payout schedules

### Tax Compliance
- Multi-state tax reporting supports various state tax requirements
- Period-based reporting enables monthly, quarterly, and annual compliance
- Vendor-specific tax tracking for individual compliance needs

### Audit Trail
- All manual adjustments are logged with admin user IDs
- Complete transaction history for financial auditing
- Vendor settings changes are tracked with timestamps

## Best Practices

### Financial Operations
- Always validate financial amounts before processing
- Use appropriate adjustment types (credit/debit) for clarity
- Provide detailed descriptions for all manual adjustments
- Monitor platform balance and payout obligations regularly

### Tax Reporting
- Generate reports monthly for compliance tracking
- Review state-specific tax requirements regularly
- Monitor vendor tax compliance across multiple states
- Maintain detailed records for audit purposes

### Vendor Management
- Set appropriate commission rates based on vendor agreements
- Configure minimum payouts to optimize payment processing costs
- Review vendor settings periodically for accuracy
- Monitor vendor financial performance and compliance

### Security Considerations
- Validate all financial parameters thoroughly
- Ensure proper permission checks for all financial operations
- Audit financial operations regularly for compliance
- Protect sensitive financial data appropriately
- Monitor for unusual financial activity or patterns

### Performance Optimization
- Use pagination for large transaction datasets
- Filter reports by relevant time periods
- Monitor database performance for financial queries
- Cache frequently accessed financial data when appropriate
