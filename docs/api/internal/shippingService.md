# shippingService.js - Internal Documentation

## Overview
Comprehensive shipping rate calculation and label generation service for the Beemeeart platform. Integrates with UPS, FedEx, and USPS APIs to provide multi-carrier shipping solutions for marketplace vendors and order fulfillment.

## Architecture
- **Type:** Service Layer (Business Logic) - Shipping & Logistics
- **Dependencies:** axios, fs.promises, path, database connection
- **Database Tables:** 
  - `companies` - Company shipping address
  - `vendor_ship_settings` - Vendor shipping preferences and addresses
  - `shipping_labels` - Order-based shipping labels
  - `standalone_shipping_labels` - Standalone shipping labels
- **External APIs:** UPS Rating/Shipping API, FedEx Rate/Ship API, USPS API v3

## Core Functions

### Rate Calculation

#### calculateShippingRates(shipment)
- **Purpose:** Calculate shipping rates from all available carriers
- **Parameters:**
  - `shipment` (Object): Complete shipment details
  - `shipment.shipper` (Object): Shipper information and address
  - `shipment.recipient` (Object): Recipient information and address
  - `shipment.packages` (Array): Package dimensions and weights
- **Returns:** Promise<Array> - Array of shipping rate options sorted by cost
- **Carriers:** UPS, FedEx, USPS (FedEx active in test mode)
- **Usage Example:** `const rates = await shippingService.calculateShippingRates(shipmentData)`

#### Rate Response Format:
```javascript
{
  carrier: 'FedEx',
  service: 'FedEx Ground',
  serviceCode: 'FEDEX_GROUND',
  cost: 12.45,
  currency: 'USD',
  estimatedDelivery: 'Tuesday'
}
```

### Carrier-Specific Rate Methods

#### getUPSRates(shipment)
- **Purpose:** Get UPS shipping rates using UPS Rating API
- **API Endpoint:** `https://onlinetools.ups.com/api/rating/v2409/Shop`
- **Authentication:** OAuth 2.0 Bearer token
- **Services:** All UPS services (Next Day Air, Ground, etc.)
- **Features:** Service mapping, transit time estimation

#### getFedExRates(shipment)
- **Purpose:** Get FedEx shipping rates using FedEx Rate API
- **API Endpoint:** `https://apis-sandbox.fedex.com/rate/v1/rates/quotes`
- **Authentication:** OAuth 2.0 Bearer token
- **Services:** All FedEx services with delivery estimates
- **Features:** Package validation, dimension/weight checking

#### getUSPSRates(shipment)
- **Purpose:** Get USPS shipping rates using USPS API v3
- **API Endpoint:** `https://apis.usps.com/prices/v3/base-rates/search`
- **Authentication:** OAuth 2.0 Bearer token
- **Services:** USPS Ground Advantage and other services
- **Features:** CRID-based pricing, commercial rates

### Authentication & Token Management

#### getUPSToken()
- **Purpose:** Get UPS OAuth token for API authentication
- **Endpoint:** `https://onlinetools.ups.com/security/v1/oauth/token`
- **Caching:** Automatic token caching and renewal
- **Credentials:** UPS_CLIENT_ID, UPS_CLIENT_SECRET

#### getFedExToken()
- **Purpose:** Get FedEx OAuth token for API authentication
- **Endpoint:** `https://apis-sandbox.fedex.com/oauth/token`
- **Caching:** Fresh token per request (disabled caching for testing)
- **Credentials:** FEDEX_API_KEY, FEDEX_API_SECRET

#### getUSPSToken()
- **Purpose:** Get USPS OAuth token for API v3 authentication
- **Endpoint:** `https://apis.usps.com/oauth2/v3/token`
- **Caching:** Automatic token caching and renewal
- **Credentials:** USPS_CONSUMER_KEY, USPS_CONSUMER_SECRET

### Label Generation

#### purchaseLabel(carrier, shipment, selectedRate)
- **Purpose:** Purchase shipping label from specified carrier
- **Parameters:**
  - `carrier` (string): Carrier name (UPS, FedEx, USPS)
  - `shipment` (Object): Complete shipment information
  - `selectedRate` (Object): Selected shipping rate and service
- **Returns:** Promise<Object> - Label purchase result with tracking and URL
- **Storage:** Saves to `shipping_labels` table and filesystem
- **File Location:** `/public/static_media/labels/`

#### purchaseStandaloneLabel(carrier, shipment, selectedRate)
- **Purpose:** Purchase standalone shipping label (not tied to specific order)
- **Parameters:** Same as purchaseLabel
- **Returns:** Promise<Object> - Label purchase result with tracking and label ID
- **Storage:** Saves to `standalone_shipping_labels` table
- **Use Case:** Manual shipping, general use labels

#### cancelLabel(carrier, trackingNumber)
- **Purpose:** Cancel shipping label with specified carrier
- **Parameters:**
  - `carrier` (string): Carrier name
  - `trackingNumber` (string): Tracking number to cancel
- **Returns:** Promise<Object> - Cancellation result
- **Test Mode:** FedEx sandbox simulates cancellation (no actual API call)

### Carrier-Specific Label Creation

#### createFedExLabel(shipment, selectedRate)
- **Purpose:** Create FedEx shipping label using Ship API
- **API Endpoint:** `https://apis-sandbox.fedex.com/ship/v1/shipments`
- **Label Format:** PDF (4x6 or 8.5x11 based on vendor preference)
- **Features:**
  - Address validation and formatting
  - Label size preference handling
  - PDF download and base64 conversion
  - Comprehensive error handling

#### Label Response Format:
```javascript
{
  tracking: 'TRACKING_NUMBER',
  labelUrl: 'https://fedex-label-url.com',
  pdfBase64: 'base64_encoded_pdf_data'
}
```

### Address Management

#### getCompanyAddress()
- **Purpose:** Get company address from database for shipping labels
- **Database Query:** `companies` table (id = 1)
- **Returns:** Promise<Object> - Company address object
- **Fields:** name, street, city, state, zip, country
- **Usage:** Default shipper address for company shipments

#### getVendorAddress(vendorId)
- **Purpose:** Get vendor shipping address and preferences from database
- **Database Query:** `vendor_ship_settings` table
- **Parameters:** `vendorId` (number) - Vendor user ID
- **Returns:** Promise<Object> - Vendor address and shipping preferences
- **Fields:**
  - Address: company_name, contact_name, street, city, state, zip, country, phone
  - Preferences: label_size_preference, signature_required_default, insurance_default
- **Validation:** Throws error if shipping preferences not configured

### Response Parsing

#### parseUPSResponse(data)
- **Purpose:** Parse UPS API response into standardized rate format
- **Service Mapping:** UPS service codes to human-readable names
- **Rate Extraction:** Cost, currency, delivery estimates
- **Error Handling:** Graceful handling of missing data

#### parseFedExResponse(data)
- **Purpose:** Parse FedEx API response into standardized rate format
- **Rate Extraction:** Service name, cost, currency, delivery day
- **Multiple Rates:** Handles multiple rate options per service

#### parseNewUSPSResponse(data)
- **Purpose:** Parse USPS API v3 JSON response
- **Service:** USPS Ground Advantage
- **Rate Extraction:** Base price, delivery days

### Label Storage

#### storeLabel(pdfBase64, userId, itemId, labelData, selectedRate, shipment)
- **Purpose:** Store shipping label PDF file and database record
- **File Storage:** `/public/static_media/labels/` directory
- **Filename Format:** `label_{userId}_{itemId}_{timestamp}_{random}.pdf`
- **Database:** `shipping_labels` table with order tracking
- **Security:** Secure filename generation with random components

#### storeStandaloneLabel(pdfBase64, userId, labelData, selectedRate, shipment)
- **Purpose:** Store standalone shipping label PDF and database record
- **File Storage:** Same directory as regular labels
- **Filename Format:** `standalone_label_{userId}_{timestamp}_{random}.pdf`
- **Database:** `standalone_shipping_labels` table
- **Label ID:** `STANDALONE-{userId}-{timestamp}` format

## Environment Variables

### UPS Configuration
- `UPS_CLIENT_ID`: UPS API client identifier
- `UPS_CLIENT_SECRET`: UPS API client secret
- `UPS_ACCOUNT`: UPS account number for shipping

### FedEx Configuration
- `FEDEX_API_KEY`: FedEx API key (client ID)
- `FEDEX_API_SECRET`: FedEx API secret (client secret)
- `FEDEX_ACCOUNT_NUMBER`: FedEx account number for shipping
- `FEDEX_METER_NUMBER`: FedEx meter number (optional)

### USPS Configuration
- `USPS_CONSUMER_KEY`: USPS API consumer key
- `USPS_CONSUMER_SECRET`: USPS API consumer secret
- `USPS_CRID`: USPS Customer Registration ID for pricing

## Security Considerations

### API Security
- **OAuth 2.0:** All carrier APIs use OAuth 2.0 authentication
- **Token Caching:** Secure token storage and automatic renewal
- **Credential Validation:** Environment variable validation on startup
- **Error Handling:** No sensitive data exposed in error messages

### File Security
- **Secure Filenames:** Random components prevent file enumeration
- **Directory Structure:** Organized by user/item IDs for access control
- **File Permissions:** Proper filesystem permissions on label directory

### Data Protection
- **Address Validation:** Input validation for all address fields
- **Package Validation:** Dimension and weight validation
- **Database Security:** Parameterized queries prevent SQL injection

## Performance Considerations

### Token Management
- **Caching Strategy:** OAuth tokens cached until expiration
- **Renewal Logic:** Automatic token renewal on expiration
- **Parallel Requests:** Multiple carrier rate requests in parallel

### Rate Calculation
- **Timeout Handling:** Proper timeout configuration for API calls
- **Error Recovery:** Graceful degradation if carriers unavailable
- **Rate Sorting:** Results sorted by cost for user convenience

### File Operations
- **Async Operations:** All file operations use async/await
- **Directory Creation:** Recursive directory creation as needed
- **Memory Management:** Efficient base64 encoding/decoding

## Testing

### Unit Tests
- Rate calculation logic
- Response parsing functions
- Address validation
- Token management

### Integration Tests
- Carrier API connectivity
- Label generation workflow
- Database operations
- File storage operations

### Test Mode Features
- **FedEx Sandbox:** Uses sandbox endpoints for testing
- **Label Cancellation:** Simulated cancellation in test mode
- **Mock Responses:** Test data for development

## Error Handling

### API Errors
- **Network Failures:** Retry logic and timeout handling
- **Authentication Errors:** Token refresh and re-authentication
- **Rate Limit Errors:** Proper error messages and retry delays
- **Invalid Requests:** Detailed validation error messages

### Business Logic Errors
- **Missing Credentials:** Clear error messages for configuration issues
- **Invalid Addresses:** Address validation and correction suggestions
- **Package Validation:** Dimension and weight limit checking
- **Service Availability:** Graceful handling of unavailable services

### File System Errors
- **Directory Creation:** Automatic directory creation with error handling
- **File Write Errors:** Proper error handling and cleanup
- **Permission Errors:** Clear error messages for file system issues

## Usage Examples

### Calculate Shipping Rates
```javascript
const shipment = {
  shipper: {
    name: 'Company Name',
    address: {
      street: '123 Main St',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
      country: 'US'
    }
  },
  recipient: {
    name: 'Customer Name',
    address: {
      street: '456 Oak Ave',
      city: 'Dallas',
      state: 'TX',
      zip: '75201',
      country: 'US'
    }
  },
  packages: [{
    length: 12,
    width: 8,
    height: 6,
    weight: 2.5,
    dimension_unit: 'in',
    weight_unit: 'lb'
  }]
};

const rates = await shippingService.calculateShippingRates(shipment);
```

### Purchase Shipping Label
```javascript
const selectedRate = {
  carrier: 'FedEx',
  service: 'FedEx Ground',
  serviceCode: 'FEDEX_GROUND',
  cost: 12.45
};

const result = await shippingService.purchaseLabel('FEDEX', shipment, selectedRate);
console.log('Tracking:', result.trackingNumber);
console.log('Label URL:', result.labelUrl);
```

### Get Vendor Address
```javascript
const vendorAddress = await shippingService.getVendorAddress(123);
console.log('Label Size Preference:', vendorAddress.label_size_preference);
```

## API Integration Status

### Current Status
- **FedEx:** Active (sandbox mode for testing)
- **UPS:** Implemented but commented out (ready for activation)
- **USPS:** Implemented but commented out (ready for activation)

### Production Readiness
- **FedEx:** Ready for production (change to production endpoints)
- **UPS:** Ready for activation (uncomment and configure)
- **USPS:** Ready for activation (uncomment and configure)

## Monitoring & Logging

### API Monitoring
- **Response Times:** Track API response times for each carrier
- **Success Rates:** Monitor API success/failure rates
- **Error Tracking:** Log and track API errors by carrier

### Business Metrics
- **Rate Comparisons:** Track rate differences between carriers
- **Label Usage:** Monitor label generation volume
- **Cancellation Rates:** Track label cancellation frequency

### Performance Metrics
- **Token Refresh:** Monitor OAuth token refresh frequency
- **File Storage:** Track label file storage usage
- **Database Performance:** Monitor shipping table query performance
