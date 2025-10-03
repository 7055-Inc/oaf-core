# Vendor Financial Management API

## Authentication
All vendor financial endpoints require API key authentication and vendor permissions.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- `Content-Type: application/json`
- **Permission Required:** `vendor` (most endpoints) or `stripe_connect` (balance/transactions)

## Tax Reporting

### Get Tax Summary
`GET /api/vendor/financials/my-tax-summary/:period`

Get comprehensive tax summary for a specific period.

**Parameters:**
- `period`: Report period in YYYY-MM format (e.g., "2025-09")

**Response (200 OK):**
```json
{
  "success": true,
  "vendor_id": 123,
  "report_period": "2025-09",
  "summary": {
    "total_sales": 15000.00,
    "total_tax_collected": 1200.00,
    "taxable_amount": 15000.00,
    "order_count": 45,
    "states_with_sales": 3
  },
  "state_breakdown": [
    {
      "customer_state": "CA",
      "total_taxable_amount": 8000.00,
      "total_tax_collected": 640.00,
      "order_count": 25,
      "avg_tax_rate": 0.08
    },
    {
      "customer_state": "NY",
      "total_taxable_amount": 5000.00,
      "total_tax_collected": 400.00,
      "order_count": 15,
      "avg_tax_rate": 0.08
    },
    {
      "customer_state": "TX",
      "total_taxable_amount": 2000.00,
      "total_tax_collected": 160.00,
      "order_count": 5,
      "avg_tax_rate": 0.08
    }
  ]
}
```

### Get State Tax Breakdown
`GET /api/vendor/financials/my-state-breakdown/:period`

Get detailed state-by-state tax breakdown for a period.

**Parameters:**
- `period`: Report period in YYYY-MM format

**Response (200 OK):**
```json
{
  "success": true,
  "vendor_id": 123,
  "report_period": "2025-09",
  "state_breakdown": [
    {
      "customer_state": "CA",
      "total_taxable_amount": 8000.00,
      "total_tax_collected": 640.00,
      "order_count": 25,
      "avg_tax_rate": 0.08
    }
  ]
}
```

### Get Tax Liability
`GET /api/vendor/financials/my-tax-liability`

Get current tax liability with 12-month trend analysis.

**Response (200 OK):**
```json
{
  "success": true,
  "vendor_id": 123,
  "current_month": {
    "total_sales": 5000.00,
    "total_tax_collected": 400.00,
    "taxable_amount": 5000.00,
    "order_count": 15
  },
  "monthly_trend": [
    {
      "period": "2025-09",
      "total_tax_collected": 400.00,
      "total_sales": 5000.00,
      "order_count": 15
    },
    {
      "period": "2025-08",
      "total_tax_collected": 350.00,
      "total_sales": 4500.00,
      "order_count": 12
    }
  ],
  "total_annual_tax": 4200.00
}
```

### Get Tax History
`GET /api/vendor/financials/my-tax-history`

Get detailed tax history with pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `period` (optional): Filter by period in YYYY-MM format

**Response (200 OK):**
```json
{
  "success": true,
  "vendor_id": 123,
  "tax_history": [
    {
      "id": 456,
      "order_id": 789,
      "customer_state": "CA",
      "taxable_amount": 100.00,
      "tax_collected": 8.00,
      "tax_rate_used": 0.08,
      "total_amount": 108.00,
      "order_date": "2025-09-15T14:30:00Z",
      "order_status": "paid"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

## Transaction Management

### Get Transaction History
`GET /api/vendor/financials/my-transactions`

Get comprehensive transaction history with filtering.

**Permission Required:** `stripe_connect`

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by transaction type
- `status` (optional): Filter by transaction status

**Response (200 OK):**
```json
{
  "success": true,
  "vendor_id": 123,
  "transactions": [
    {
      "id": 789,
      "vendor_id": 123,
      "order_id": 456,
      "transaction_type": "sale",
      "amount": 85.00,
      "commission_amount": 15.00,
      "status": "completed",
      "payout_date": "2025-09-24",
      "created_at": "2025-09-17T19:30:00Z",
      "order_number": 456,
      "order_total": 108.00,
      "type_display": "Sale"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "pages": 25
  }
}
```

## Balance and Payouts

### Get Current Balance
`GET /api/vendor/financials/my-balance`

Get current balance and comprehensive financial overview.

**Permission Required:** `stripe_connect`

**Response (200 OK):**
```json
{
  "success": true,
  "vendor_id": 123,
  "balance": {
    "available_balance": 2500.00,
    "pending_payout": 500.00,
    "total_sales": 15000.00,
    "total_orders": 150,
    "total_paid_out": 12000.00,
    "current_balance": 2000.00
  },
  "settings": {
    "commission_rate": 0.15,
    "minimum_payout": 25.00,
    "payout_days": 15,
    "payment_schedule": "weekly"
  },
  "can_request_payout": true
}
```

### Get Payout History
`GET /api/vendor/financials/my-payouts`

Get payout history and pending payout information.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response (200 OK):**
```json
{
  "success": true,
  "vendor_id": 123,
  "payouts": [
    {
      "id": 789,
      "vendor_id": 123,
      "order_id": null,
      "transaction_type": "payout",
      "amount": 1000.00,
      "status": "completed",
      "payout_date": "2025-09-10",
      "created_at": "2025-09-10T10:00:00Z",
      "order_number": null
    }
  ],
  "pending": {
    "pending_amount": 500.00,
    "transaction_count": 15,
    "next_payout_date": "2025-09-24"
  },
  "pagination": {
    "page": 1,
    "limit": 20
  }
}
```

## Settings Management

### Get Financial Settings
`GET /api/vendor/financials/my-settings`

Get vendor financial settings.

**Response (200 OK):**
```json
{
  "success": true,
  "vendor_id": 123,
  "settings": {
    "id": 456,
    "vendor_id": 123,
    "commission_rate": 0.15,
    "minimum_payout": 25.00,
    "payment_schedule": "weekly",
    "payout_days": 15,
    "stripe_account_id": "acct_1234567890",
    "stripe_account_verified": true,
    "created_at": "2025-01-01T00:00:00Z",
    "updated_at": "2025-09-17T19:30:00Z",
    "vendor_name": "artist@example.com"
  }
}
```

### Update Financial Settings
`PUT /api/vendor/financials/my-settings`

Update vendor financial settings (limited fields).

**Request Body:**
```json
{
  "payment_schedule": "biweekly"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Vendor settings updated successfully"
}
```

## Compliance and Reporting

### Get Compliance Status
`GET /api/vendor/financials/my-compliance-status`

Get tax compliance status by state with nexus analysis.

**Response (200 OK):**
```json
{
  "success": true,
  "vendor_id": 123,
  "report_period": "2025-09",
  "compliance_status": [
    {
      "state": "CA",
      "total_sales": 250000.00,
      "total_tax_collected": 20000.00,
      "order_count": 500,
      "nexus_threshold": 500000,
      "has_nexus": false,
      "compliance_status": "monitoring"
    },
    {
      "state": "NY",
      "total_sales": 350000.00,
      "total_tax_collected": 28000.00,
      "order_count": 700,
      "nexus_threshold": 300000,
      "has_nexus": true,
      "compliance_status": "active"
    }
  ],
  "states_with_nexus": 1
}
```

### Get Available Tax Reports
`GET /api/vendor/financials/my-tax-reports`

Get inventory of available tax reports.

**Response (200 OK):**
```json
{
  "success": true,
  "vendor_id": 123,
  "available_reports": [
    {
      "period": "2025-09",
      "report_types": [
        "tax_summary",
        "state_breakdown",
        "compliance_report"
      ],
      "download_urls": {
        "tax_summary": "/api/vendor/financials/my-tax-summary/2025-09",
        "state_breakdown": "/api/vendor/financials/my-state-breakdown/2025-09",
        "compliance_report": "/api/vendor/financials/my-compliance-status?period=2025-09"
      }
    },
    {
      "period": "2025-08",
      "report_types": [
        "tax_summary",
        "state_breakdown",
        "compliance_report"
      ],
      "download_urls": {
        "tax_summary": "/api/vendor/financials/my-tax-summary/2025-08",
        "state_breakdown": "/api/vendor/financials/my-state-breakdown/2025-08",
        "compliance_report": "/api/vendor/financials/my-compliance-status?period=2025-08"
      }
    }
  ]
}
```

## Data Types

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
- `weekly`: Weekly payouts
- `biweekly`: Bi-weekly payouts
- `monthly`: Monthly payouts

### Compliance Status
- `active`: Tax compliance required (nexus established)
- `monitoring`: Sales monitoring (below nexus threshold)

## Validation Rules

### Period Format
- Must be in YYYY-MM format
- Examples: "2025-09", "2025-12"

### Payment Schedule
- Must be one of: "weekly", "biweekly", "monthly"
- Case sensitive (lowercase required)

### Pagination
- Page must be positive integer (minimum: 1)
- Limit must be positive integer (maximum: 100 recommended)

## Error Responses

- `400 Bad Request`: Invalid input data
  - Invalid period format (not YYYY-MM)
  - Invalid payment schedule
  - Invalid pagination parameters
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: Insufficient permissions
  - Most endpoints require `vendor` permission
  - Balance/transaction endpoints require `stripe_connect` permission
- `500 Internal Server Error`: Server processing error

## Rate Limits
- 200 requests per minute per API key for vendor financial endpoints
- Higher limits for tax reporting during tax season

## Example Usage

### Complete Financial Dashboard Flow
```bash
# 1. Get current balance and overview
curl -X GET https://api.beemeeart.com/api/vendor/financials/my-balance \
  -H "Authorization: Bearer vendor_api_key"

# 2. Get recent transactions
curl -X GET "https://api.beemeeart.com/api/vendor/financials/my-transactions?page=1&limit=10" \
  -H "Authorization: Bearer vendor_api_key"

# 3. Get current month tax summary
curl -X GET https://api.beemeeart.com/api/vendor/financials/my-tax-summary/2025-09 \
  -H "Authorization: Bearer vendor_api_key"

# 4. Check compliance status
curl -X GET https://api.beemeeart.com/api/vendor/financials/my-compliance-status \
  -H "Authorization: Bearer vendor_api_key"
```

### Tax Reporting Flow
```bash
# 1. Get tax liability overview
curl -X GET https://api.beemeeart.com/api/vendor/financials/my-tax-liability \
  -H "Authorization: Bearer vendor_api_key"

# 2. Get detailed state breakdown
curl -X GET https://api.beemeeart.com/api/vendor/financials/my-state-breakdown/2025-09 \
  -H "Authorization: Bearer vendor_api_key"

# 3. Get available tax reports
curl -X GET https://api.beemeeart.com/api/vendor/financials/my-tax-reports \
  -H "Authorization: Bearer vendor_api_key"

# 4. Get detailed tax history
curl -X GET "https://api.beemeeart.com/api/vendor/financials/my-tax-history?period=2025-09" \
  -H "Authorization: Bearer vendor_api_key"
```

### Settings Management Flow
```bash
# 1. Get current settings
curl -X GET https://api.beemeeart.com/api/vendor/financials/my-settings \
  -H "Authorization: Bearer vendor_api_key"

# 2. Update payment schedule
curl -X PUT https://api.beemeeart.com/api/vendor/financials/my-settings \
  -H "Authorization: Bearer vendor_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "payment_schedule": "biweekly"
  }'
```

## Integration Notes

### Tax Compliance
- Nexus thresholds vary by state and are configurable
- Compliance status automatically calculated based on sales volume
- Multi-state tax tracking for comprehensive compliance
- Real-time compliance monitoring with threshold alerts

### Financial Calculations
- All financial amounts are in USD with decimal precision
- Balance calculations include pending payouts and available amounts
- Payout eligibility based on minimum payout thresholds
- Commission calculations integrated with platform fee structure

### Stripe Integration
- Transaction data synchronized with Stripe Connect accounts
- Tax calculations integrate with Stripe Tax services
- Payout schedules coordinate with Stripe payout settings
- Balance information reflects Stripe account balances

## Best Practices

### Tax Reporting
- Generate monthly tax summaries for compliance tracking
- Monitor state-by-state breakdown for nexus determination
- Review compliance status regularly for multi-state obligations
- Maintain detailed tax history for audit purposes

### Financial Management
- Monitor balance and payout eligibility regularly
- Review transaction history for accuracy and completeness
- Update payment schedule preferences as needed
- Track payout history for accounting and tax purposes

### Compliance Monitoring
- Check compliance status monthly for nexus changes
- Monitor sales thresholds across all states
- Maintain awareness of state-specific tax requirements
- Use available reports for comprehensive tax documentation

### Security Considerations
- Protect API keys and ensure proper authentication
- Limit access to financial data to authorized personnel
- Monitor API usage for unusual patterns
- Ensure secure transmission of all financial data
- Regularly review and audit financial data access

### Performance Optimization
- Use pagination for large datasets (transactions, tax history)
- Filter data appropriately to reduce response sizes
- Cache frequently accessed data when appropriate
- Monitor API response times and optimize queries as needed

## Future Enhancements

### Advanced Features (Coming Soon)
- **Export Capabilities:** PDF and CSV export for tax reports and financial statements
- **Real-time Notifications:** Live updates for financial events, payout processing, and compliance alerts
- **Advanced Analytics:** Detailed financial analytics, trend analysis, and performance forecasting
- **Mobile Optimization:** Mobile-optimized financial dashboard and reporting
- **Integration APIs:** External accounting system integration (QuickBooks, Xero)
- **Automated Compliance:** Automated tax compliance monitoring and filing assistance

### Enhanced Reporting (Planned)
- **Custom Report Builder:** Create custom financial and tax reports
- **Multi-Period Analysis:** Compare financial performance across multiple periods
- **Profitability Analysis:** Detailed profitability analysis by product, category, and time period
- **Tax Optimization:** Tax optimization recommendations and strategies
- **Forecasting:** Financial forecasting and projection tools

## API Versioning
- Current version: 1.0.0
- Breaking changes will increment major version
- New features increment minor version
- Bug fixes increment patch version
- Deprecation notices provided 90 days before removal

## Support and Documentation
- **API Documentation:** Complete OpenAPI 3.0 specification available
- **Integration Support:** Technical support for API integration
- **Financial Support:** Guidance on financial management and tax compliance
- **Updates:** Regular updates on new features and enhancements
- **Community:** Developer community for best practices and tips
