# Tax Reporting API

## Authentication
All tax reporting endpoints require API key authentication.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- `Content-Type: application/json`

## Vendor Tax Reports

### Get Vendor Tax Summary
`GET /api/tax-reports/vendor/:vendorId/:period`

Get comprehensive tax summary for a specific vendor and period.

**Parameters:**
- `vendorId`: Vendor ID (path parameter)
- `period`: Report period in YYYY-MM format (path parameter, e.g., "2025-09")

**Response (200 OK):**
```json
{
  "success": true,
  "vendor_id": "123",
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

### Get All Vendor Tax Summaries
`GET /api/tax-reports/vendors/:period`

Get tax summaries for all vendors in a specific period.

**Parameters:**
- `period`: Report period in YYYY-MM format (path parameter, e.g., "2025-09")

**Response (200 OK):**
```json
{
  "success": true,
  "report_period": "2025-09",
  "vendors": [
    {
      "vendor_id": 123,
      "vendor_name": "artist@example.com",
      "total_sales": 15000.00,
      "total_tax_collected": 1200.00,
      "order_count": 45,
      "report_period": "2025-09"
    },
    {
      "vendor_id": 456,
      "vendor_name": "crafter@example.com",
      "total_sales": 8500.00,
      "total_tax_collected": 680.00,
      "order_count": 28,
      "report_period": "2025-09"
    }
  ],
  "total_vendors": 2,
  "total_tax_collected": 1880.00
}
```

## Platform Tax Reports

### Get Platform Tax Overview
`GET /api/tax-reports/platform/:period`

Get platform-wide tax overview and analytics for a specific period.

**Parameters:**
- `period`: Report period in YYYY-MM format (path parameter, e.g., "2025-09")

**Response (200 OK):**
```json
{
  "success": true,
  "report_period": "2025-09",
  "platform_summary": {
    "total_orders": 150,
    "total_sales": 45000.00,
    "total_tax_collected": 3600.00,
    "states_with_sales": 8,
    "avg_tax_rate": 0.08
  },
  "state_breakdown": [
    {
      "customer_state": "CA",
      "order_count": 60,
      "total_sales": 18000.00,
      "total_tax_collected": 1440.00,
      "avg_tax_rate": 0.08
    },
    {
      "customer_state": "NY",
      "order_count": 35,
      "total_sales": 12000.00,
      "total_tax_collected": 960.00,
      "avg_tax_rate": 0.08
    },
    {
      "customer_state": "TX",
      "order_count": 25,
      "total_sales": 8000.00,
      "total_tax_collected": 640.00,
      "avg_tax_rate": 0.08
    },
    {
      "customer_state": "FL",
      "order_count": 20,
      "total_sales": 5000.00,
      "total_tax_collected": 400.00,
      "avg_tax_rate": 0.08
    },
    {
      "customer_state": "WA",
      "order_count": 10,
      "total_sales": 2000.00,
      "total_tax_collected": 160.00,
      "avg_tax_rate": 0.08
    }
  ]
}
```

## Data Management

### Backfill Tax Summaries
`POST /api/tax-reports/backfill`

Process existing orders to generate missing tax summaries for historical data.

**Request Body:** None required

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Backfill completed",
  "result": {
    "processed_orders": 1250,
    "created_summaries": 1180,
    "updated_summaries": 70,
    "errors": 0,
    "processing_time": "45.2 seconds"
  }
}
```

## Data Types

### Tax Summary Fields
- `total_sales`: Total sales amount for the period
- `total_tax_collected`: Total tax collected for the period
- `taxable_amount`: Total taxable amount (may differ from total sales)
- `order_count`: Number of orders in the period
- `states_with_sales`: Number of different states with sales

### State Breakdown Fields
- `customer_state`: Two-letter state code (e.g., "CA", "NY")
- `total_taxable_amount`: Taxable amount for this state
- `total_tax_collected`: Tax collected for this state
- `order_count`: Number of orders for this state
- `avg_tax_rate`: Average tax rate used for this state

### Platform Summary Fields
- `total_orders`: Total number of orders across platform
- `total_sales`: Total sales amount across platform
- `total_tax_collected`: Total tax collected across platform
- `states_with_sales`: Number of states with sales activity
- `avg_tax_rate`: Average tax rate across all transactions

## Validation Rules

### Period Format
- Must be in YYYY-MM format
- Examples: "2025-09", "2025-12", "2024-01"
- Invalid examples: "2025-9", "25-09", "2025/09"

### Vendor ID
- Must be a valid integer
- Must correspond to an existing vendor in the system

## Error Responses

- `400 Bad Request`: Invalid input data
  - Invalid period format (not YYYY-MM)
  - Invalid vendor ID format
- `401 Unauthorized`: Invalid or missing API key
- `404 Not Found`: Vendor not found or no data for specified period
- `500 Internal Server Error`: Server processing error

## Rate Limits
- 100 requests per minute per API key for tax reporting endpoints
- Higher limits available for bulk reporting operations

## Example Usage

### Generate Monthly Vendor Report
```bash
# Get tax summary for vendor 123 in September 2025
curl -X GET https://api.beemeeart.com/api/tax-reports/vendor/123/2025-09 \
  -H "Authorization: Bearer your_api_key"
```

### Platform-Wide Tax Analysis
```bash
# Get platform tax overview for September 2025
curl -X GET https://api.beemeeart.com/api/tax-reports/platform/2025-09 \
  -H "Authorization: Bearer your_api_key"
```

### Multi-Vendor Comparison
```bash
# Get all vendor tax summaries for September 2025
curl -X GET https://api.beemeeart.com/api/tax-reports/vendors/2025-09 \
  -H "Authorization: Bearer your_api_key"
```

### Historical Data Processing
```bash
# Backfill missing tax summaries for existing orders
curl -X POST https://api.beemeeart.com/api/tax-reports/backfill \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json"
```

## Integration Notes

### Tax Compliance
- All tax calculations integrate with Stripe Tax services
- State-by-state breakdown supports multi-state tax compliance
- Real-time tax calculations with historical data support
- Comprehensive audit trail for tax compliance requirements

### Business Intelligence
- Vendor performance comparison and ranking
- Geographic tax distribution analysis
- Platform-wide tax trends and analytics
- Executive reporting and dashboard integration

### Accounting Integration
- Standardized tax report formats for accounting systems
- Period-based reporting for financial reconciliation
- Detailed transaction-level tax information
- Historical data processing for complete tax records

## Best Practices

### Tax Reporting
- Generate monthly reports for consistent tax compliance
- Monitor state-by-state breakdown for nexus determination
- Use platform reports for executive and compliance reporting
- Maintain historical tax data through backfill operations

### Compliance Monitoring
- Regular monitoring of tax collection across states
- Track nexus thresholds for multi-state compliance
- Maintain accurate tax records for audit purposes
- Use state breakdown data for compliance analysis

### Performance Optimization
- Cache frequently accessed tax reports when appropriate
- Use appropriate date ranges to optimize query performance
- Monitor API usage to stay within rate limits
- Batch multiple requests when possible for efficiency

### Data Management
- Run backfill operations during low-traffic periods
- Monitor backfill results for data integrity
- Maintain consistent period formats across all requests
- Validate vendor IDs before making API requests

## Security Considerations
- Protect API keys and ensure proper authentication
- Limit access to tax data to authorized personnel only
- Monitor API usage for unusual patterns or unauthorized access
- Ensure secure transmission of all tax data
- Regularly review and audit tax data access logs

## Future Enhancements

### Advanced Features (Coming Soon)
- **Export Capabilities:** PDF and CSV export for tax reports
- **Real-time Dashboards:** Live tax reporting and analytics dashboards
- **Advanced Filtering:** Date range filtering and custom period selection
- **Automated Compliance:** Automated tax compliance monitoring and alerts
- **Multi-Currency Support:** International tax reporting capabilities

### Enhanced Analytics (Planned)
- **Trend Analysis:** Historical tax trend analysis and forecasting
- **Comparative Reports:** Year-over-year and period-over-period comparisons
- **Custom Reports:** User-defined custom tax report generation
- **Integration APIs:** External accounting system integration
- **Automated Notifications:** Automated tax threshold and compliance notifications

## API Versioning
- Current version: 1.0.0
- Breaking changes will increment major version
- New features increment minor version
- Bug fixes increment patch version
- Deprecation notices provided 90 days before removal

## Support and Documentation
- **API Documentation:** Complete OpenAPI 3.0 specification available
- **Integration Support:** Technical support for API integration
- **Tax Compliance:** Guidance on tax compliance and reporting requirements
- **Updates:** Regular updates on new features and tax regulation changes
- **Community:** Developer community for best practices and tips

## Compliance Notes

### Tax Accuracy
- All tax calculations are performed using Stripe Tax services
- Real-time tax rates and rules for accurate calculations
- Multi-state tax compliance support
- Comprehensive audit trail for all tax operations

### Data Retention
- Tax data retained according to legal requirements
- Historical data available for audit and compliance purposes
- Secure storage and transmission of all tax information
- Regular backups and data integrity verification

### Audit Support
- Complete transaction-level tax information
- Detailed state-by-state breakdown for compliance
- Historical data processing and verification
- Comprehensive reporting for tax audits and compliance reviews

### Multi-State Compliance
- State-by-state tax breakdown for nexus determination
- Real-time tax rate updates for accurate calculations
- Comprehensive geographic tax distribution analysis
- Support for complex multi-state tax compliance requirements
