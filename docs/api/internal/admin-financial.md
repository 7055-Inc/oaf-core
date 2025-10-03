# Admin Financial Management - Internal Documentation

## Overview
Comprehensive financial administration system that handles all aspects of platform financial management including revenue tracking, payout calculations, vendor financial settings, manual adjustments, and comprehensive tax reporting. This system provides complete financial oversight and compliance management for the multi-vendor marketplace.

## Architecture
- **Type:** Route Handler
- **Dependencies:** 
  - Express.js router
  - MySQL database connection
  - JWT middleware for authentication
  - Permission middleware for admin access control
  - StripeService for payment processing integration
- **Database Tables:** 
  - `vendor_transactions` - All vendor financial transactions
  - `manual_adjustments` - Admin-created financial adjustments
  - `vendor_settings` - Vendor-specific financial settings
  - `vendor_tax_summary` - Tax summaries by vendor and period
  - `order_tax_summary` - Order-level tax information
  - `orders` - Order information for financial calculations
  - `order_items` - Order item details for vendor attribution
  - `products` - Product information for vendor mapping
  - `users` - User information for vendor identification
- **External APIs:** 
  - Stripe API (via StripeService for payment processing)

## Functions/Endpoints

### Financial Overview
#### GET /financial-overview
- **Purpose:** Get comprehensive platform financial overview
- **Parameters:** None
- **Returns:** Platform financial metrics including revenue, payouts, and volume statistics
- **Errors:** 500 for StripeService or database errors
- **Usage Example:** Admin dashboard financial summary
- **Special Features:**
  - Integrates with StripeService for real-time financial data
  - Provides comprehensive platform health metrics
  - Includes commission earnings, vendor sales, and payout calculations

#### GET /payout-calculations
- **Purpose:** Get detailed payout calculations for all vendors
- **Parameters:** None
- **Returns:** Current payouts owed, future payouts, and platform balance calculations
- **Errors:** 500 for StripeService or database errors
- **Usage Example:** Financial planning and cash flow management
- **Special Features:**
  - Real-time payout calculations
  - Separates current vs future obligations
  - Calculates available platform balance for withdrawals

### Manual Adjustments
#### POST /manual-adjustment
- **Purpose:** Create manual financial adjustment for vendor accounts
- **Parameters:** Vendor ID, amount, description, type (credit/debit)
- **Returns:** Created adjustment information with ID
- **Errors:** 400 for validation errors, 500 for database errors
- **Usage Example:** Correcting payment errors, applying credits/debits
- **Special Features:**
  - Supports both credit and debit adjustments
  - Automatic amount sign handling based on type
  - Records admin user ID for audit trail
  - Comprehensive validation of required fields

#### GET /manual-adjustments
- **Purpose:** Retrieve manual adjustments with filtering and pagination
- **Parameters:** Vendor ID filter, limit, offset
- **Returns:** Paginated list of adjustments with vendor and admin information
- **Errors:** 500 for database errors
- **Usage Example:** Audit trail review and adjustment history
- **Special Features:**
  - Optional vendor filtering
  - Joins with user tables for readable names
  - Ordered by creation date (newest first)
  - Configurable pagination

### Vendor Settings Management
#### POST /vendor-settings
- **Purpose:** Update vendor financial settings (commission rates, payment schedules)
- **Parameters:** Vendor ID, commission rate, minimum payout, payment schedule
- **Returns:** Update confirmation message
- **Errors:** 400 for validation errors, 500 for database errors
- **Usage Example:** Configuring vendor-specific financial terms
- **Special Features:**
  - Validates commission rate (0-1 range)
  - Validates minimum payout (non-negative)
  - Creates new settings or updates existing ones
  - Dynamic field updates (only provided fields are changed)
  - Default values for new vendor settings

#### GET /vendor-settings
- **Purpose:** Retrieve vendor settings for all or specific vendors
- **Parameters:** Optional vendor ID filter
- **Returns:** Vendor settings with username information
- **Errors:** 500 for database errors
- **Usage Example:** Review and audit vendor financial configurations
- **Special Features:**
  - Optional vendor filtering
  - Joins with users table for vendor names
  - Ordered by vendor username for easy browsing

### Vendor Information
#### GET /vendor-details/:vendor_id
- **Purpose:** Get comprehensive vendor information for admin review
- **Parameters:** Vendor ID (URL parameter)
- **Returns:** Complete vendor information via StripeService
- **Errors:** 404 for vendor not found, 500 for service errors
- **Usage Example:** Detailed vendor financial review and analysis
- **Special Features:**
  - Integrates with StripeService for comprehensive data
  - Provides complete vendor financial profile
  - Includes Stripe account information and verification status

### Tax Reporting System
#### GET /all-vendor-tax-summaries/:period
- **Purpose:** Get tax summaries for all vendors in a specific period
- **Parameters:** Period in YYYY-MM format
- **Returns:** All vendor tax summaries with totals and statistics
- **Errors:** 400 for invalid period format, 500 for database errors
- **Usage Example:** Monthly tax reporting and compliance review
- **Special Features:**
  - Period format validation (YYYY-MM)
  - Ordered by tax collected (highest first)
  - Includes total vendor count and aggregate tax amounts
  - Comprehensive vendor tax breakdown

#### GET /all-state-compliance/:period
- **Purpose:** Get state-by-state tax compliance overview
- **Parameters:** Period in YYYY-MM format
- **Returns:** State-level tax compliance data with vendor and sales information
- **Errors:** 400 for invalid period format, 500 for database errors
- **Usage Example:** Multi-state tax compliance monitoring
- **Special Features:**
  - Groups by customer state for compliance tracking
  - Includes vendor count per state
  - Calculates average tax rates by state
  - Provides total platform tax by state

#### GET /all-tax-overview/:period
- **Purpose:** Get platform-wide tax overview for a period
- **Parameters:** Period in YYYY-MM format
- **Returns:** Platform tax summary with orders, vendors, and tax totals
- **Errors:** 400 for invalid period format, 500 for database errors
- **Usage Example:** High-level tax reporting for management
- **Special Features:**
  - Platform-wide aggregation of tax data
  - Includes unique state count with sales
  - Calculates average tax rate across platform
  - Comprehensive platform tax health metrics

#### GET /all-vendor-compliance/:period
- **Purpose:** Get tax compliance status for all vendors
- **Parameters:** Period in YYYY-MM format
- **Returns:** Vendor-specific tax compliance data
- **Errors:** 400 for invalid period format, 500 for database errors
- **Usage Example:** Vendor tax compliance monitoring and reporting
- **Special Features:**
  - Filters to vendors with tax activity
  - Shows states with sales per vendor
  - Calculates taxable amounts and tax collected
  - Ordered by tax collected for priority review

### Transaction Management
#### GET /all-transactions
- **Purpose:** Get all transactions across all vendors with filtering
- **Parameters:** Page, limit, transaction type filter, status filter
- **Returns:** Paginated transactions with vendor and order information
- **Errors:** 500 for database errors
- **Usage Example:** Comprehensive transaction monitoring and analysis
- **Special Features:**
  - Advanced filtering by type and status
  - Pagination for large datasets
  - Joins with orders and users for complete context
  - Human-readable transaction type display names
  - Ordered by creation date (newest first)

## Helper Functions

### getPlatformFinancialOverview(periodDays)
- **Purpose:** Calculate comprehensive platform financial metrics
- **Parameters:** Number of days to include (default: 30)
- **Returns:** Revenue, payout, volume, and adjustment metrics
- **Usage:** Internal calculation for financial overview endpoint
- **Special Features:**
  - Configurable time period
  - Comprehensive metric calculations
  - Platform balance calculation (commission - adjustments)

### getPayoutCalculations()
- **Purpose:** Calculate real-time payout obligations and platform balance
- **Returns:** Current payouts, future payouts, available balance
- **Usage:** Internal calculation for payout calculations endpoint
- **Special Features:**
  - Separates current vs future obligations
  - Calculates available platform balance
  - Determines break-even point for platform

### getManualAdjustments(options)
- **Purpose:** Retrieve manual adjustments with pagination and filtering
- **Parameters:** Page, limit, vendor ID filter
- **Returns:** Paginated adjustments with total count
- **Usage:** Internal helper for adjustment retrieval
- **Special Features:**
  - Flexible filtering options
  - Pagination support
  - Joins with user tables for names

### getAllVendorSettings(options)
- **Purpose:** Retrieve all vendor settings with pagination
- **Parameters:** Page, limit
- **Returns:** Paginated vendor settings with total count
- **Usage:** Internal helper for vendor settings retrieval
- **Special Features:**
  - Includes vendors without settings (LEFT JOIN)
  - Pagination for large vendor lists
  - Ordered by vendor username

### getVendorInfo(vendorId)
- **Purpose:** Get basic vendor information
- **Parameters:** Vendor ID
- **Returns:** Vendor user information or null
- **Usage:** Internal helper for vendor validation
- **Special Features:**
  - Filters to artist user type (vendors)
  - Returns null for non-existent vendors

### getVendorBalance(vendorId)
- **Purpose:** Calculate vendor balance information
- **Parameters:** Vendor ID
- **Returns:** Available balance, pending payouts, sales totals
- **Usage:** Internal helper for vendor financial calculations
- **Special Features:**
  - Separates available vs pending amounts
  - Includes sales and order statistics
  - Calculates current balance (available - pending)

### getVendorTransactions(vendorId, options)
- **Purpose:** Get vendor transaction history
- **Parameters:** Vendor ID, limit option
- **Returns:** Transaction list with order and display information
- **Usage:** Internal helper for vendor transaction retrieval
- **Special Features:**
  - Joins with orders for context
  - Human-readable transaction type names
  - Ordered by creation date

## Environment Variables
- No domain-specific environment variables needed for this module
- Database connection handled by shared configuration
- Stripe integration managed by StripeService
- All functionality is self-contained within the API

## Security Considerations
- **Authentication:** JWT token verification for all endpoints
- **Authorization:** All endpoints require 'manage_system' permission
- **Input Validation:** Comprehensive validation of financial parameters
- **SQL Injection Protection:** Parameterized queries throughout
- **Audit Trail:** Complete logging of manual adjustments with admin IDs
- **Financial Data Protection:** Secure handling of sensitive financial information
- **Permission Validation:** Strict permission checking for financial operations
- **Data Integrity:** Proper validation of financial amounts and rates

## Performance Considerations
- **Database Indexing:** Optimized queries on vendor_id, created_at, transaction_type, status
- **Pagination:** Efficient pagination for large transaction datasets
- **Query Optimization:** Joins optimized for financial reporting queries
- **Aggregation Efficiency:** Optimized SUM and COUNT operations for financial calculations
- **Period Filtering:** Efficient date range filtering for tax reporting
- **Connection Pooling:** Database connection management for concurrent financial operations

## Testing
- **Unit Tests:** Should cover all financial calculations and business logic
- **Integration Tests:** Test financial workflows and StripeService integration
- **Security Tests:** Verify permission requirements and financial data access control
- **Validation Tests:** Test all financial parameter validations
- **Calculation Tests:** Verify accuracy of financial calculations and aggregations
- **Tax Compliance Tests:** Test tax reporting accuracy and compliance features

## Monitoring and Logging
- **Financial Operations:** Comprehensive logging of all financial operations
- **Adjustment Tracking:** Complete audit trail for manual adjustments
- **Performance Monitoring:** Track query performance for financial reports
- **Error Tracking:** Detailed error logging for financial operations
- **Compliance Monitoring:** Monitor tax reporting accuracy and completeness
- **Balance Monitoring:** Track platform balance and payout obligations

## Common Use Cases
- **Financial Dashboard:** Real-time platform financial overview
- **Payout Management:** Calculate and manage vendor payouts
- **Vendor Configuration:** Set up and manage vendor financial settings
- **Manual Corrections:** Apply credits, debits, and adjustments to vendor accounts
- **Tax Compliance:** Generate comprehensive tax reports for multiple states
- **Transaction Analysis:** Monitor and analyze all platform transactions
- **Audit Operations:** Review financial history and adjustment trails

## Error Handling
- **Graceful Degradation:** System continues operating with partial service failures
- **Input Validation:** Clear error messages for invalid financial parameters
- **Permission Errors:** Proper handling of insufficient permissions
- **Database Errors:** Transaction rollback and error recovery for financial operations
- **Service Integration:** Proper handling of StripeService failures
- **Calculation Errors:** Safe handling of financial calculation edge cases

## Future Enhancements
- **Advanced Analytics:** More detailed financial analytics and forecasting
- **Automated Payouts:** Automated payout processing based on schedules
- **Tax Automation:** Automated tax calculation and filing integration
- **Financial Reporting:** Advanced financial reporting and export capabilities
- **Fraud Detection:** Financial fraud detection and prevention systems
- **Multi-Currency Support:** Support for multiple currencies and exchange rates
- **Advanced Adjustments:** More sophisticated adjustment types and workflows
- **Real-time Notifications:** Live updates for financial events and thresholds
- **Integration APIs:** External accounting system integration
- **Performance Optimization:** Caching layer for frequently accessed financial data

## Integration Points
- **StripeService:** Complete integration for payment processing and account management
- **User Management:** Coordinates with user system for vendor identification
- **Order System:** Integrates with order processing for transaction tracking
- **Tax System:** Comprehensive tax calculation and compliance integration
- **Audit System:** Provides complete audit trail for financial operations
- **Reporting System:** Feeds data to business intelligence and reporting systems

## API Consistency
- **Response Format:** Consistent JSON response structure across all endpoints
- **Error Handling:** Standardized error response format with appropriate HTTP status codes
- **Authentication:** Consistent JWT token handling and permission checking
- **Pagination:** Standardized pagination format for large datasets
- **Validation:** Consistent input validation and error messaging
- **Financial Precision:** Consistent handling of financial amounts and calculations

## Business Logic
- **Financial Calculations:** Accurate calculation of commissions, payouts, and balances
- **Adjustment Management:** Complete manual adjustment workflow with audit trails
- **Vendor Settings:** Flexible vendor-specific financial configuration
- **Tax Compliance:** Multi-state tax compliance and reporting
- **Transaction Tracking:** Complete transaction lifecycle management
- **Platform Balance:** Accurate platform balance and cash flow management

## Development Notes
- **Modular Design:** Well-organized financial functionality for maintainability
- **Helper Functions:** Reusable helper functions for common financial operations
- **Error Handling:** Comprehensive error handling with proper HTTP status codes
- **Documentation:** Extensive JSDoc documentation for all functions
- **Security Focus:** Security-first design with proper permission checking
- **Scalability:** Designed to handle high-volume financial operations and reporting
- **Audit Compliance:** Complete tracking of all financial actions and decisions
- **Performance:** Optimized queries and calculations for financial operations
