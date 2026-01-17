# Financial Operations - Internal Documentation

## Overview
Financial operations system that handles commission rate management, fee structure administration, and vendor earnings tracking. This system provides comprehensive financial management capabilities for the multi-vendor marketplace platform, enabling administrators to configure and manage financial settings for artists and promoters while providing vendors with earnings visibility.

## Architecture
- **Type:** Route Handler
- **Dependencies:** 
  - Express.js router
  - MySQL database connection
  - JWT middleware for authentication
  - Permission middleware for role-based access control
- **Database Tables:** 
  - `financial_settings` - Commission rates and fee structures for users
  - `users` - User account information
  - `user_profiles` - Basic user profile information
  - `artist_profiles` - Artist-specific profile data
  - `promoter_profiles` - Promoter-specific profile data
  - `vendor_settings` - Vendor-specific settings including Stripe account information
- **External APIs:** None directly (integrates with existing platform services)

## Functions/Endpoints

### Commission Rate Management
#### GET /commission-rates
- **Purpose:** Get comprehensive commission rate data for administrative management
- **Parameters:** None
- **Returns:** Combined list of artists and promoters with commission settings, profiles, and Stripe account information
- **Errors:** 500 for database errors
- **Usage Example:** Admin dashboard for commission rate overview and management
- **Special Features:**
  - Joins multiple profile tables for complete user information
  - Includes business names for both artists and promoters
  - Shows Stripe account verification status
  - Provides summary statistics (artists, promoters, commission vs passthrough users)
  - Filters to active financial settings only
  - Ordered by user type and display name for easy browsing

#### PUT /commission-rates/bulk
- **Purpose:** Update multiple commission rates simultaneously for administrative efficiency
- **Parameters:** Array of updates with ID, commission rate, fee structure, and notes
- **Returns:** Detailed results with successful updates and errors for failed operations
- **Errors:** 400 for validation errors, 500 for database errors
- **Usage Example:** Bulk administrative updates during policy changes or rate adjustments
- **Special Features:**
  - Processes multiple updates in a single request
  - Comprehensive validation for each update (commission rate 0-100, valid fee structure)
  - Individual error handling per update (continues processing if one fails)
  - Detailed success/error reporting with specific IDs
  - Audit trail with admin user ID tracking
  - Atomic updates with proper error isolation
  - Summary statistics for batch operation results

#### PUT /commission-rates/:id
- **Purpose:** Update a single commission rate setting with validation and audit trail
- **Parameters:** Setting ID (URL parameter), commission rate, fee structure, notes (all optional)
- **Returns:** Update confirmation with details of changed fields
- **Errors:** 400 for validation errors, 404 for not found, 500 for database errors
- **Usage Example:** Individual commission rate adjustments and fee structure changes
- **Special Features:**
  - Flexible partial updates (only provided fields are changed)
  - Comprehensive validation (commission rate 0-100, fee structure enum validation)
  - Audit trail with admin user ID and timestamp
  - Clear feedback on which fields were updated vs unchanged
  - Proper error handling for inactive or non-existent settings
  - COALESCE SQL pattern for optional field updates

### Vendor Earnings (Future Implementation)
#### GET /vendor-earnings
- **Purpose:** Provide earnings data for authenticated vendors
- **Parameters:** None (uses authenticated user ID)
- **Returns:** Placeholder response (implementation pending)
- **Errors:** 500 for service errors
- **Usage Example:** Vendor dashboard earnings overview
- **Special Features:**
  - Placeholder implementation for future development
  - Proper authentication and permission checking
  - Vendor-specific data access (uses req.userId)
  - Structured for future earnings calculation integration

## Data Models

### Financial Settings Structure
```javascript
{
  setting_id: number,           // Unique setting ID
  user_id: number,             // User ID (artist or promoter)
  user_type: string,           // 'artist' or 'promoter'
  fee_structure: string,       // 'commission' or 'passthrough'
  commission_rate: number,     // Commission rate (0-100)
  notes: string,               // Administrative notes
  is_active: boolean,          // Active status
  effective_date: date,        // When setting becomes effective
  updated_at: timestamp,       // Last update timestamp
  email: string,               // User email (from users table)
  display_name: string,        // User display name
  first_name: string,          // User first name
  last_name: string,           // User last name
  business_name: string,       // Business name (artist or promoter)
  stripe_account_id: string,   // Stripe account ID
  stripe_account_verified: boolean // Stripe verification status
}
```

### Bulk Update Request Structure
```javascript
{
  updates: [
    {
      id: number,                    // Financial setting ID
      commission_rate: number,       // Optional: New commission rate (0-100)
      fee_structure: string,         // Optional: 'commission' or 'passthrough'
      notes: string                  // Optional: Administrative notes
    }
  ]
}
```

### Bulk Update Response Structure
```javascript
{
  success: boolean,
  results: {
    success: [                       // Successful updates
      {
        id: number,
        message: string
      }
    ],
    errors: [                        // Failed updates
      {
        id: number,
        error: string
      }
    ]
  },
  summary: {
    total_updates: number,           // Total update attempts
    successful: number,              // Number of successful updates
    failed: number                   // Number of failed updates
  }
}
```

## Business Logic

### Commission Rate Validation
- **Rate Range:** Commission rates must be between 0 and 100 (inclusive)
- **Fee Structure:** Must be either 'commission' or 'passthrough'
- **Active Settings:** Only active financial settings can be updated
- **Audit Trail:** All updates track the admin user ID and timestamp

### Fee Structure Types
- **Commission:** Platform takes a percentage commission from transactions
- **Passthrough:** Transactions pass through without platform commission
- **Default Behavior:** System handles both structures appropriately in payment processing

### User Type Support
- **Artists:** Individual creators with artist profiles and business names
- **Promoters:** Event organizers with promoter profiles and business names
- **Unified Management:** Single interface handles both user types with appropriate profile joins

### Data Integrity
- **Active Settings Filter:** Only active financial settings are displayed and can be updated
- **Profile Joins:** Comprehensive joins ensure complete user information is available
- **Stripe Integration:** Includes Stripe account information for payment processing context

## Environment Variables
- No domain-specific environment variables needed for this module
- Database connection handled by shared configuration
- All functionality is self-contained within the API

## Security Considerations
- **Authentication:** JWT token verification for all endpoints
- **Authorization:** 
  - Commission management requires 'manage_system' permission
  - Vendor earnings requires 'vendor' permission
- **Input Validation:** Comprehensive validation of financial parameters
- **SQL Injection Protection:** Parameterized queries throughout
- **Audit Trail:** Complete logging of commission rate changes with admin IDs
- **Data Access Control:** Vendors can only access their own earnings data
- **Permission Validation:** Strict permission checking for financial operations

## Performance Considerations
- **Database Indexing:** Optimized queries on user_id, user_type, is_active
- **Efficient Joins:** Optimized LEFT JOINs for profile data retrieval
- **Bulk Operations:** Efficient bulk update processing with individual error handling
- **Query Optimization:** Proper use of COALESCE for optional field updates
- **Connection Pooling:** Database connection management for concurrent operations

## Testing
- **Unit Tests:** Should cover all commission rate calculations and validations
- **Integration Tests:** Test financial setting workflows and permission enforcement
- **Security Tests:** Verify permission requirements and data access control
- **Validation Tests:** Test all financial parameter validations and edge cases
- **Bulk Operation Tests:** Verify bulk update functionality and error handling
- **Business Logic Tests:** Test fee structure handling and commission calculations

## Error Handling
- **Graceful Degradation:** System continues operating with partial failures in bulk operations
- **Input Validation:** Clear error messages for invalid financial parameters
- **Permission Errors:** Proper handling of insufficient permissions
- **Database Errors:** Transaction safety and error recovery for financial operations
- **Bulk Operation Errors:** Individual error handling that doesn't stop entire batch
- **Not Found Handling:** Appropriate 404 responses for non-existent settings

## Common Use Cases
- **Commission Rate Administration:** Set and update commission rates for vendors
- **Fee Structure Management:** Configure commission vs passthrough fee structures
- **Bulk Rate Updates:** Apply rate changes across multiple vendors simultaneously
- **Financial Policy Changes:** Implement new commission structures platform-wide
- **Vendor Onboarding:** Set initial financial settings for new vendors
- **Audit and Compliance:** Review and track commission rate changes
- **Vendor Earnings Review:** Provide earnings visibility to vendors (future)

## Integration Points
- **User Management:** Coordinates with user system for profile information
- **Payment Processing:** Commission rates feed into Stripe payment calculations
- **Vendor Settings:** Integrates with vendor settings for Stripe account information
- **Admin Dashboard:** Provides data for administrative financial management interfaces
- **Audit System:** Provides complete audit trail for financial setting changes

## API Consistency
- **Response Format:** Consistent JSON response structure across all endpoints
- **Error Handling:** Standardized error response format with appropriate HTTP status codes
- **Authentication:** Consistent JWT token handling and permission checking
- **Validation:** Consistent input validation and error messaging
- **Financial Precision:** Consistent handling of financial rates and calculations

## Future Enhancements
- **Vendor Earnings Implementation:** Complete vendor earnings calculation and reporting
- **Advanced Commission Structures:** Support for tiered commission rates
- **Historical Tracking:** Track commission rate changes over time
- **Automated Rate Adjustments:** Scheduled commission rate updates
- **Performance Analytics:** Commission rate impact analysis
- **Integration APIs:** External accounting system integration
- **Real-time Notifications:** Live updates for commission rate changes
- **Advanced Reporting:** Detailed financial reporting and analytics

## Development Notes
- **Modular Design:** Well-organized financial functionality for maintainability
- **Comprehensive Validation:** Thorough validation of all financial parameters
- **Error Handling:** Comprehensive error handling with proper HTTP status codes
- **Documentation:** Extensive JSDoc documentation for all functions
- **Security Focus:** Security-first design with proper permission checking
- **Scalability:** Designed to handle high-volume financial operations
- **Audit Compliance:** Complete tracking of all financial setting changes
- **Future-Ready:** Structured for easy extension with additional financial features

## Business Requirements
- **Multi-Vendor Support:** Handle both artist and promoter commission structures
- **Flexible Fee Structures:** Support both commission and passthrough models
- **Administrative Control:** Complete administrative control over commission rates
- **Audit Requirements:** Full audit trail for all financial setting changes
- **Bulk Operations:** Efficient bulk update capabilities for administrative efficiency
- **Vendor Transparency:** Provide vendors with visibility into their earnings (future)
- **Integration Ready:** Designed to integrate with payment processing and accounting systems

## Monitoring and Logging
- **Financial Operations:** Comprehensive logging of all financial operations
- **Commission Changes:** Complete audit trail for commission rate modifications
- **Performance Monitoring:** Track query performance for financial operations
- **Error Tracking:** Detailed error logging for financial operations
- **Business Metrics:** Monitor commission rate distribution and changes
- **Access Monitoring:** Track administrative access to financial settings

## Data Privacy and Compliance
- **Financial Data Protection:** Secure handling of sensitive financial information
- **Access Control:** Strict access control for financial settings
- **Audit Trail:** Complete audit trail for compliance requirements
- **Data Retention:** Appropriate retention policies for financial data
- **Privacy Compliance:** Ensure compliance with financial privacy regulations
- **Secure Transmission:** All financial data transmitted securely
