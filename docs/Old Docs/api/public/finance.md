# Financial Operations API

## Authentication
All financial endpoints require API key authentication and appropriate permissions.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- `Content-Type: application/json`

## Commission Rate Management

### Get Commission Rates
`GET /api/finance/commission-rates`

Get comprehensive commission rate data for administrative management.

**Permission Required:** `manage_system`

**Response (200 OK):**
```json
{
  "success": true,
  "commission_rates": [
    {
      "setting_id": 123,
      "user_id": 456,
      "user_type": "artist",
      "fee_structure": "commission",
      "commission_rate": 15.0,
      "notes": "Standard artist commission rate",
      "is_active": true,
      "effective_date": "2025-01-01",
      "updated_at": "2025-09-17T19:30:00Z",
      "email": "artist@example.com",
      "display_name": "Jane Artist",
      "first_name": "Jane",
      "last_name": "Artist",
      "business_name": "Jane's Art Studio",
      "stripe_account_id": "acct_1234567890",
      "stripe_account_verified": true
    },
    {
      "setting_id": 124,
      "user_id": 789,
      "user_type": "promoter",
      "fee_structure": "passthrough",
      "commission_rate": 0.0,
      "notes": "Passthrough for premium promoter",
      "is_active": true,
      "effective_date": "2025-01-01",
      "updated_at": "2025-09-17T19:30:00Z",
      "email": "promoter@example.com",
      "display_name": "Event Promoter",
      "first_name": "John",
      "last_name": "Promoter",
      "business_name": "Premium Events LLC",
      "stripe_account_id": "acct_0987654321",
      "stripe_account_verified": true
    }
  ],
  "count": 2,
  "summary": {
    "artists": 1,
    "promoters": 1,
    "commission_users": 1,
    "passthrough_users": 1
  }
}
```

### Bulk Update Commission Rates
`POST /api/finance/commission-rates/bulk`

Update multiple commission rates simultaneously for administrative efficiency.

**Permission Required:** `manage_system`

**Request Body:**
```json
{
  "updates": [
    {
      "id": 123,
      "commission_rate": 12.0,
      "fee_structure": "commission",
      "notes": "Reduced rate for high-volume artist"
    },
    {
      "id": 124,
      "commission_rate": 5.0,
      "fee_structure": "commission",
      "notes": "Changed from passthrough to commission"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "results": {
    "success": [
      {
        "id": 123,
        "message": "Updated successfully"
      },
      {
        "id": 124,
        "message": "Updated successfully"
      }
    ],
    "errors": []
  },
  "summary": {
    "total_updates": 2,
    "successful": 2,
    "failed": 0
  }
}
```

**Response with Errors (200 OK):**
```json
{
  "success": true,
  "results": {
    "success": [
      {
        "id": 123,
        "message": "Updated successfully"
      }
    ],
    "errors": [
      {
        "id": 124,
        "error": "Commission rate must be between 0 and 100"
      }
    ]
  },
  "summary": {
    "total_updates": 2,
    "successful": 1,
    "failed": 1
  }
}
```

### Update Single Commission Rate
`PUT /api/finance/commission-rates/:id`

Update a single commission rate setting with validation and audit trail.

**Permission Required:** `manage_system`

**Parameters:**
- `id`: Financial setting ID (required)

**Request Body:**
```json
{
  "commission_rate": 10.0,
  "fee_structure": "commission",
  "notes": "Updated for Q4 2025"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Commission rate updated successfully",
  "updated_fields": {
    "commission_rate": 10.0,
    "fee_structure": "commission",
    "notes": "Updated for Q4 2025"
  }
}
```

## Vendor Earnings

### Get Vendor Earnings
`GET /api/finance/vendor-earnings`

Get earnings data for the authenticated vendor.

**Permission Required:** `vendor`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Vendor earnings endpoint - Coming soon",
  "vendor_id": 456
}
```

*Note: This endpoint is currently a placeholder. Full implementation coming soon with comprehensive earnings data including sales totals, commission calculations, payout history, and performance metrics.*

## Data Types

### Fee Structure Types
- `commission`: Platform takes a percentage commission from transactions
- `passthrough`: Transactions pass through without platform commission

### User Types
- `artist`: Individual creators with artist profiles
- `promoter`: Event organizers with promoter profiles

### Commission Rate Validation
- Must be a number between 0 and 100 (inclusive)
- Represents percentage (e.g., 15.0 = 15%)
- Decimal precision supported for fine-grained control

## Validation Rules

### Commission Rate
- **Range:** 0 to 100 (inclusive)
- **Type:** Number (decimal supported)
- **Example:** 15.0 (represents 15%)

### Fee Structure
- **Values:** "commission" or "passthrough"
- **Case Sensitive:** Must be lowercase
- **Required:** When updating fee structure

### Notes
- **Type:** String
- **Length:** Up to 500 characters
- **Optional:** Can be null or empty
- **Purpose:** Administrative notes and comments

### Bulk Update Array
- **Type:** Array of update objects
- **Minimum:** 1 update object required
- **Maximum:** 100 updates per request (recommended)
- **Validation:** Each update object validated individually

## Error Responses

- `400 Bad Request`: Invalid input data or business rule violations
  - Invalid commission rate (outside 0-100 range)
  - Invalid fee structure (not "commission" or "passthrough")
  - Empty updates array
  - Missing required fields
- `401 Unauthorized`: Invalid or missing API key
- `403 Forbidden`: Insufficient permissions
  - Commission management requires `manage_system`
  - Vendor earnings requires `vendor`
- `404 Not Found`: 
  - Commission rate setting not found
  - Setting is inactive
- `500 Internal Server Error`: Server processing error

## Rate Limits
- 100 requests per minute per API key for commission management endpoints
- 200 requests per minute per API key for vendor earnings endpoints

## Example Usage

### Commission Rate Administration Flow
```bash
# 1. Get all commission rates
curl -X GET https://api.beemeeart.com/api/finance/commission-rates \
  -H "Authorization: Bearer admin_api_key"

# 2. Update a single commission rate
curl -X PUT https://api.beemeeart.com/api/finance/commission-rates/123 \
  -H "Authorization: Bearer admin_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "commission_rate": 12.0,
    "fee_structure": "commission",
    "notes": "Reduced rate for high-volume artist"
  }'

# 3. Bulk update multiple rates
curl -X PUT https://api.beemeeart.com/api/finance/commission-rates/bulk \
  -H "Authorization: Bearer admin_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "updates": [
      {
        "id": 123,
        "commission_rate": 10.0,
        "notes": "Q4 2025 rate adjustment"
      },
      {
        "id": 124,
        "fee_structure": "commission",
        "commission_rate": 8.0,
        "notes": "Changed from passthrough"
      }
    ]
  }'
```

### Vendor Earnings Access
```bash
# Get vendor earnings (requires vendor permission)
curl -X GET https://api.beemeeart.com/api/finance/vendor-earnings \
  -H "Authorization: Bearer vendor_api_key"
```

## Integration Notes

### Commission Rate Impact
- Commission rates directly affect payment processing calculations
- Changes take effect immediately for new transactions
- Historical transactions maintain their original commission rates
- Stripe Connect integration uses these rates for payment splits

### Fee Structure Behavior
- **Commission Structure:** Platform takes specified percentage from transactions
- **Passthrough Structure:** Full transaction amount goes to vendor (minus payment processing fees)
- **Rate Override:** Commission rate is ignored for passthrough structures
- **Flexibility:** Can switch between structures as needed

### Audit Trail
- All commission rate changes are logged with admin user ID
- Timestamps track when changes were made
- Notes field provides context for changes
- Complete history maintained for compliance

## Best Practices

### Commission Rate Management
- Set appropriate commission rates based on vendor agreements
- Use bulk updates for policy changes affecting multiple vendors
- Provide clear notes explaining rate changes
- Review commission rates periodically for market competitiveness

### Fee Structure Selection
- Use commission structure for standard vendor relationships
- Use passthrough for premium vendors or special partnerships
- Consider transaction volume when setting commission rates
- Document business rationale in notes field

### Administrative Operations
- Validate commission rates before bulk updates
- Test changes with small batches before large updates
- Monitor vendor feedback after commission rate changes
- Maintain clear documentation of rate change policies

### Security Considerations
- Restrict commission management to authorized administrators
- Audit commission rate changes regularly
- Validate all financial parameters thoroughly
- Monitor for unusual commission rate patterns
- Protect sensitive financial data appropriately

### Performance Optimization
- Use bulk updates for multiple rate changes
- Filter commission rate queries appropriately
- Monitor database performance for financial operations
- Cache frequently accessed commission rate data when appropriate

## Future Enhancements

### Vendor Earnings (Coming Soon)
The vendor earnings endpoint will provide comprehensive earnings data including:
- **Sales Totals:** Total sales amount and transaction count
- **Commission Calculations:** Detailed commission breakdowns
- **Payout History:** Historical payout information and schedules
- **Performance Metrics:** Sales trends and performance analytics
- **Tax Information:** Tax-related earnings data for reporting
- **Period Filtering:** Earnings data for specific time periods
- **Export Capabilities:** CSV and PDF export for accounting purposes

### Advanced Commission Features (Planned)
- **Tiered Commission Rates:** Volume-based commission structures
- **Time-based Rates:** Seasonal or promotional commission rates
- **Category-specific Rates:** Different rates for different product categories
- **Performance Bonuses:** Commission bonuses based on performance metrics
- **Automated Adjustments:** Scheduled commission rate updates
- **A/B Testing:** Test different commission structures

### Enhanced Reporting (Planned)
- **Commission Impact Analysis:** Analyze the impact of commission rate changes
- **Revenue Forecasting:** Predict revenue based on commission structures
- **Vendor Performance:** Compare vendor performance across different commission rates
- **Platform Analytics:** Platform-wide commission and revenue analytics
- **Custom Reports:** Configurable reporting for specific business needs

## API Versioning
- Current version: 1.0.0
- Breaking changes will increment major version
- New features increment minor version
- Bug fixes increment patch version
- Deprecation notices provided 90 days before removal

## Support and Documentation
- **API Documentation:** Complete OpenAPI 3.0 specification available
- **Integration Support:** Technical support for API integration
- **Business Support:** Guidance on commission rate strategies
- **Updates:** Regular updates on new features and enhancements
- **Community:** Developer community for best practices and tips
