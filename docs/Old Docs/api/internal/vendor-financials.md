# Vendor Financial Management - Internal Documentation

## Overview
Comprehensive vendor-facing financial management system that provides vendors with complete visibility and control over their financial data. This system handles tax reporting, transaction history, balance management, payout tracking, and compliance monitoring. It serves as the primary interface for vendors to understand their financial performance and tax obligations across multiple states.

## Architecture
- **Type:** Route Handler
- **Dependencies:** 
  - Express.js router
  - MySQL database connection
  - JWT middleware for authentication
  - Permission middleware for vendor access control
  - StripeService for tax calculations and financial data processing
- **Database Tables:** 
  - `vendor_transactions` - All vendor financial transactions
  - `vendor_tax_summary` - Vendor tax summaries by period
  - `order_tax_summary` - Order-level tax information
  - `orders` - Order information for transaction context
  - `order_items` - Order item details for vendor attribution
  - `products` - Product information for vendor mapping
  - `users` - User information for vendor identification
  - `vendor_settings` - Vendor-specific financial settings
- **External APIs:** 
  - StripeService for tax calculations and financial processing

## Functions/Endpoints

### Tax Reporting System
#### GET /my-tax-summary/:period
- **Purpose:** Generate comprehensive tax summary for a specific period
- **Parameters:** Period in YYYY-MM format (URL parameter)
- **Returns:** Tax summary with state breakdown and total calculations
- **Errors:** 400 for invalid period format, 500 for service errors
- **Usage Example:** Monthly tax reporting and compliance review
- **Special Features:**
  - Integrates with StripeService for accurate tax calculations
  - Provides both summary and detailed state breakdown
  - Validates period format (YYYY-MM)
  - Includes total sales, tax collected, and order counts
  - State-by-state breakdown for multi-state compliance

#### GET /my-state-breakdown/:period
- **Purpose:** Get detailed state-by-state tax breakdown for a period
- **Parameters:** Period in YYYY-MM format (URL parameter)
- **Returns:** Granular tax information by state
- **Errors:** 400 for invalid period format, 500 for service errors
- **Usage Example:** State-specific tax compliance and reporting
- **Special Features:**
  - Detailed breakdown by customer state
  - Includes taxable amounts and tax rates used
  - Order counts per state for volume analysis
  - Supports multi-state tax compliance requirements

#### GET /my-tax-liability
- **Purpose:** Get current tax liability with 12-month trend analysis
- **Parameters:** None (uses current date for calculations)
- **Returns:** Current month summary plus 12-month historical trend
- **Errors:** 500 for service errors
- **Usage Example:** Tax liability planning and trend analysis
- **Special Features:**
  - Current month tax summary
  - 12-month historical trend data
  - Annual tax total calculations
  - Filters out months with zero tax activity
  - Trend analysis for tax planning

#### GET /my-tax-history
- **Purpose:** Retrieve detailed tax history with pagination
- **Parameters:** Page, limit, optional period filter
- **Returns:** Paginated tax history with order details
- **Errors:** 500 for database errors
- **Usage Example:** Detailed tax audit and order-level tax review
- **Special Features:**
  - Pagination for large datasets
  - Optional period filtering (YYYY-MM format)
  - Joins with orders for complete context
  - Order-level tax details for audit purposes
  - Includes order status and amounts

### Transaction Management
#### GET /my-transactions
- **Purpose:** Get comprehensive transaction history with filtering
- **Parameters:** Page, limit, transaction type filter, status filter
- **Returns:** Paginated transactions with human-readable type displays
- **Errors:** Graceful handling with empty result fallback
- **Usage Example:** Transaction monitoring and financial analysis
- **Special Features:**
  - Advanced filtering by type and status
  - Pagination for large transaction volumes
  - Human-readable transaction type displays
  - Graceful error handling (returns empty result instead of error)
  - Includes order context and totals
  - Debug logging for troubleshooting

### Balance and Payout Management
#### GET /my-balance
- **Purpose:** Get current balance and comprehensive financial overview
- **Parameters:** None (uses authenticated vendor ID)
- **Returns:** Complete balance information with payout eligibility
- **Errors:** 500 for database errors
- **Usage Example:** Financial dashboard and payout planning
- **Special Features:**
  - Available balance calculations
  - Pending payout amounts and dates
  - Total sales and order statistics
  - Payout eligibility determination
  - Vendor settings integration with fallback defaults
  - Current balance calculation (available - pending)
  - Graceful handling of missing vendor settings

#### GET /my-payouts
- **Purpose:** Get payout history and pending payout information
- **Parameters:** Page, limit for pagination
- **Returns:** Payout transactions with pending payout calculations
- **Errors:** 500 for database errors
- **Usage Example:** Payout tracking and history review
- **Special Features:**
  - Payout transaction history with pagination
  - Pending payout calculations and next payout date
  - Transaction count for pending payouts
  - Order context for payout transactions
  - Chronological ordering (newest first)

### Settings Management
#### GET /my-settings
- **Purpose:** Retrieve vendor financial settings
- **Parameters:** None (uses authenticated vendor ID)
- **Returns:** Vendor settings with fallback to defaults
- **Errors:** 500 for database errors
- **Usage Example:** Settings review and configuration display
- **Special Features:**
  - Comprehensive vendor settings retrieval
  - Fallback to default values if no settings exist
  - Includes commission rates, payout preferences
  - Vendor name integration from users table
  - Default settings: 10% commission, $25 minimum payout, weekly schedule

#### PUT /my-settings
- **Purpose:** Update vendor financial settings (limited fields)
- **Parameters:** Payment schedule (weekly, biweekly, monthly)
- **Returns:** Update confirmation message
- **Errors:** 400 for validation errors, 500 for database errors
- **Usage Example:** Vendor preference updates for payout scheduling
- **Special Features:**
  - Limited field updates (vendors can only change certain settings)
  - Payment schedule validation (weekly, biweekly, monthly)
  - Creates settings if none exist with defaults
  - Updates existing settings with timestamp tracking
  - Restricted to vendor-configurable fields only

### Compliance and Reporting
#### GET /my-compliance-status
- **Purpose:** Analyze tax compliance status by state with nexus thresholds
- **Parameters:** None (uses current month for analysis)
- **Returns:** State-by-state compliance status with nexus analysis
- **Errors:** 500 for service errors
- **Usage Example:** Tax compliance monitoring and nexus determination
- **Special Features:**
  - State-specific nexus threshold analysis
  - Compliance status determination (active vs monitoring)
  - Configurable nexus thresholds by state
  - Sales volume analysis against thresholds
  - Count of states with nexus requirements
  - Current month focus for real-time compliance

#### GET /my-tax-reports
- **Purpose:** Get inventory of available tax reports
- **Parameters:** None (retrieves last 12 months of available reports)
- **Returns:** List of available reports with download URLs
- **Errors:** 500 for database errors
- **Usage Example:** Tax report access and download management
- **Special Features:**
  - Last 12 months of available reports
  - Multiple report types per period (summary, breakdown, compliance)
  - Direct download URLs for each report type
  - Report type categorization
  - Easy access to historical tax data

## Data Models

### Tax Summary Structure
```javascript
{
  vendor_id: number,              // Vendor ID
  report_period: string,          // Period (YYYY-MM)
  summary: {
    total_sales: number,          // Total sales for period
    total_tax_collected: number,  // Total tax collected
    taxable_amount: number,       // Total taxable amount
    order_count: number,          // Number of orders
    states_with_sales: number     // Number of states with sales
  },
  state_breakdown: [              // State-by-state details
    {
      customer_state: string,     // State code
      total_taxable_amount: number,
      total_tax_collected: number,
      order_count: number,
      avg_tax_rate: number
    }
  ]
}
```

### Transaction Structure
```javascript
{
  id: number,                     // Transaction ID
  vendor_id: number,              // Vendor ID
  order_id: number,               // Associated order ID
  transaction_type: string,       // Type (sale, payout, refund, etc.)
  amount: number,                 // Transaction amount
  commission_amount: number,      // Commission amount
  status: string,                 // Transaction status
  payout_date: date,              // Scheduled payout date
  created_at: timestamp,          // Creation timestamp
  order_number: number,           // Order number for reference
  order_total: number,            // Total order amount
  type_display: string            // Human-readable type name
}
```

### Balance Information Structure
```javascript
{
  available_balance: number,      // Total available balance
  pending_payout: number,         // Amount pending payout
  total_sales: number,            // Total sales amount
  total_orders: number,           // Total order count
  total_paid_out: number,         // Total amount paid out
  current_balance: number,        // Current available balance
  settings: {
    commission_rate: number,      // Commission rate
    minimum_payout: number,       // Minimum payout amount
    payout_days: number,          // Payout schedule days
    payment_schedule: string      // Payment schedule preference
  },
  can_request_payout: boolean     // Payout eligibility flag
}
```

### Compliance Status Structure
```javascript
{
  state: string,                  // State code
  total_sales: number,            // Total sales in state
  total_tax_collected: number,    // Tax collected in state
  order_count: number,            // Orders in state
  nexus_threshold: number,        // Nexus threshold for state
  has_nexus: boolean,             // Whether nexus is established
  compliance_status: string       // 'active' or 'monitoring'
}
```

## Business Logic

### Tax Calculations
- **Period Validation:** All periods must be in YYYY-MM format
- **State Breakdown:** Comprehensive state-by-state tax analysis
- **Trend Analysis:** 12-month historical data for liability planning
- **Compliance Monitoring:** Nexus threshold analysis by state

### Transaction Processing
- **Type Classification:** Multiple transaction types (sale, payout, refund, adjustment, subscription)
- **Status Tracking:** Complete transaction lifecycle management
- **Filtering:** Advanced filtering by type and status
- **Pagination:** Efficient handling of large transaction volumes

### Balance Management
- **Available Balance:** Total earnings minus pending payouts
- **Payout Eligibility:** Based on minimum payout thresholds
- **Settings Integration:** Vendor-specific payout preferences
- **Default Handling:** Graceful fallback to default settings

### Compliance Analysis
- **Nexus Thresholds:** State-specific sales thresholds for tax obligations
- **Compliance Status:** Active monitoring vs compliance requirements
- **Multi-State Support:** Comprehensive multi-state tax compliance

## Environment Variables
- No domain-specific environment variables needed for this module
- Database connection handled by shared configuration
- StripeService integration managed by service layer
- All functionality is self-contained within the API

## Security Considerations
- **Authentication:** JWT token verification for all endpoints
- **Authorization:** 
  - Most endpoints require 'vendor' permission
  - Balance and transaction endpoints require 'stripe_connect' permission
- **Data Isolation:** Vendors can only access their own financial data
- **Input Validation:** Comprehensive validation of periods and parameters
- **SQL Injection Protection:** Parameterized queries throughout
- **Permission Validation:** Strict permission checking for financial operations
- **Data Privacy:** Secure handling of sensitive financial information

## Performance Considerations
- **Database Indexing:** Optimized queries on vendor_id, created_at, transaction_type, status
- **Pagination:** Efficient pagination for large datasets
- **Query Optimization:** Optimized JOINs and aggregation queries
- **Service Integration:** Efficient StripeService integration for tax calculations
- **Caching Opportunities:** Tax summaries and compliance data suitable for caching
- **Connection Pooling:** Database connection management for concurrent operations

## Testing
- **Unit Tests:** Should cover all financial calculations and business logic
- **Integration Tests:** Test StripeService integration and database operations
- **Security Tests:** Verify permission requirements and data isolation
- **Validation Tests:** Test all parameter validations and edge cases
- **Performance Tests:** Test pagination and large dataset handling
- **Compliance Tests:** Verify tax calculation accuracy and compliance logic

## Error Handling
- **Graceful Degradation:** Transaction endpoint returns empty results instead of errors
- **Input Validation:** Clear error messages for invalid parameters
- **Permission Errors:** Proper handling of insufficient permissions
- **Database Errors:** Transaction safety and error recovery
- **Service Integration:** Proper handling of StripeService failures
- **Default Fallbacks:** Graceful handling of missing vendor settings

## Common Use Cases
- **Tax Reporting:** Monthly and annual tax summary generation
- **Compliance Monitoring:** Multi-state tax compliance tracking
- **Financial Dashboard:** Real-time balance and transaction monitoring
- **Payout Management:** Payout history and eligibility tracking
- **Settings Management:** Vendor preference configuration
- **Transaction Analysis:** Detailed transaction history and filtering
- **Audit Support:** Comprehensive financial audit trail

## Integration Points
- **StripeService:** Complete integration for tax calculations and financial processing
- **User Management:** Coordinates with user system for vendor identification
- **Order System:** Integrates with order processing for transaction context
- **Tax System:** Comprehensive tax calculation and compliance integration
- **Payment Processing:** Coordinates with payment system for transaction tracking
- **Reporting System:** Feeds data to business intelligence and reporting systems

## API Consistency
- **Response Format:** Consistent JSON response structure across all endpoints
- **Error Handling:** Standardized error response format with appropriate HTTP status codes
- **Authentication:** Consistent JWT token handling and permission checking
- **Pagination:** Standardized pagination format for large datasets
- **Validation:** Consistent input validation and error messaging
- **Financial Precision:** Consistent handling of financial amounts and calculations

## Future Enhancements
- **Advanced Analytics:** More detailed financial analytics and forecasting
- **Export Capabilities:** PDF and CSV export for tax reports
- **Real-time Notifications:** Live updates for financial events and thresholds
- **Advanced Filtering:** More sophisticated transaction filtering options
- **Integration APIs:** External accounting system integration
- **Mobile Optimization:** Mobile-optimized financial dashboard
- **Automated Compliance:** Automated tax compliance monitoring and alerts
- **Performance Optimization:** Caching layer for frequently accessed financial data

## Development Notes
- **Modular Design:** Well-organized financial functionality for maintainability
- **Comprehensive Validation:** Thorough validation of all financial parameters
- **Error Handling:** Comprehensive error handling with proper HTTP status codes
- **Documentation:** Extensive JSDoc documentation for all functions
- **Security Focus:** Security-first design with proper permission checking
- **Scalability:** Designed to handle high-volume financial operations
- **Vendor-Centric:** Complete focus on vendor needs and financial visibility
- **Compliance Ready:** Built for multi-state tax compliance requirements

## Business Requirements
- **Vendor Transparency:** Complete financial visibility for vendors
- **Tax Compliance:** Multi-state tax compliance and reporting
- **Real-time Data:** Up-to-date financial information and balances
- **Historical Analysis:** Comprehensive historical financial data
- **Settings Control:** Vendor control over configurable financial settings
- **Audit Support:** Complete audit trail for all financial operations
- **Performance:** Fast response times for financial queries
- **Scalability:** Support for high-volume vendor operations

## Monitoring and Logging
- **Financial Operations:** Comprehensive logging of all financial operations
- **Tax Calculations:** Detailed logging of tax calculation processes
- **Performance Monitoring:** Track query performance for financial operations
- **Error Tracking:** Detailed error logging for financial operations
- **Compliance Monitoring:** Monitor tax compliance calculations and thresholds
- **Access Monitoring:** Track vendor access to financial data

## Data Privacy and Compliance
- **Financial Data Protection:** Secure handling of sensitive financial information
- **Access Control:** Strict access control limited to vendor's own data
- **Audit Trail:** Complete audit trail for compliance requirements
- **Data Retention:** Appropriate retention policies for financial data
- **Privacy Compliance:** Ensure compliance with financial privacy regulations
- **Secure Transmission:** All financial data transmitted securely
