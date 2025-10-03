# Marketplace Subscriptions - Internal Documentation

## Overview
Marketplace subscription management system that handles terms and conditions acceptance tracking for marketplace participation. This system ensures users have accepted the latest marketplace terms before accessing marketplace features and maintains a complete audit trail of terms acceptance.

## Architecture
- **Type:** Route Handler
- **Dependencies:** 
  - Express.js router
  - MySQL database connection
  - JWT middleware for authentication
- **Database Tables:** 
  - `terms_versions` - Versioned terms and conditions for different subscription types
  - `user_terms_acceptance` - User acceptance records with timestamps
- **External APIs:** None (internal system only)

## Functions/Endpoints

### Terms Verification
#### GET /terms-check
- **Purpose:** Check if user has accepted the latest marketplace terms
- **Parameters:** None (user ID from JWT token)
- **Returns:** Terms acceptance status and latest terms details
- **Errors:** 404 for no terms found, 500 for database errors
- **Usage Example:** Pre-marketplace access verification
- **Special Features:**
  - Retrieves current active terms version
  - Checks user-specific acceptance status
  - Returns complete terms content for display
  - Handles cases where no terms exist

### Terms Acceptance
#### POST /terms-accept
- **Purpose:** Record user acceptance of marketplace terms
- **Parameters:** Terms version ID to accept
- **Returns:** Confirmation of acceptance recording
- **Errors:** 400 for missing data, 404 for invalid terms, 500 for database errors
- **Usage Example:** Terms acceptance form submission
- **Special Features:**
  - Validates terms version exists and is for marketplace
  - Uses INSERT IGNORE to prevent duplicate acceptance records
  - Records exact timestamp of acceptance
  - Handles concurrent acceptance attempts gracefully

## Environment Variables
- No domain-specific environment variables needed for this module
- Relies on database configuration for data persistence
- Uses JWT configuration for user authentication

## Security Considerations
- **Authentication:** JWT token verification for all endpoints
- **Authorization:** User-specific data access only
- **Data Integrity:** INSERT IGNORE prevents duplicate acceptance records
- **Input Validation:** Terms version ID validation before acceptance
- **Audit Trail:** Complete timestamp tracking for compliance
- **Access Control:** Users can only accept terms for themselves

## Terms Management System

### Terms Versioning
- **Version Control:** Each terms update creates new version
- **Current Flag:** `is_current` flag identifies active terms
- **Subscription Types:** Different terms for different subscription types
- **Content Storage:** Full terms content stored for historical reference

### Acceptance Tracking
- **User-Specific:** Each user must accept terms individually
- **Version-Specific:** Acceptance tied to specific terms version
- **Timestamp Precision:** Exact acceptance time recorded
- **Duplicate Protection:** INSERT IGNORE prevents multiple acceptance records

### Compliance Features
- **Audit Trail:** Complete history of who accepted what when
- **Version Tracking:** Links acceptance to specific terms version
- **Legal Compliance:** Meets requirements for terms acceptance tracking
- **Historical Access:** Previous terms versions maintained for reference

## Database Schema Details

### terms_versions Table
- **id:** Primary key for terms version
- **subscription_type:** Type of subscription (marketplace, shipping, etc.)
- **title:** Human-readable title for terms
- **content:** Full terms and conditions text
- **version:** Version identifier (e.g., "1.0", "2.1")
- **is_current:** Boolean flag for active version
- **created_at:** Version creation timestamp

### user_terms_acceptance Table
- **id:** Primary key for acceptance record
- **user_id:** Foreign key to users table
- **subscription_type:** Type of subscription terms accepted
- **terms_version_id:** Foreign key to terms_versions table
- **accepted_at:** Timestamp of acceptance

## Business Logic

### Terms Check Process
1. Query for current marketplace terms version
2. Check if user has accepted this specific version
3. Return acceptance status and terms details
4. Handle edge cases (no terms, multiple versions)

### Terms Acceptance Process
1. Validate terms version ID exists
2. Verify terms are for marketplace subscription type
3. Record acceptance with INSERT IGNORE for safety
4. Return confirmation of successful recording

## Integration Points
- **User Authentication:** JWT token provides user context
- **Marketplace Access:** Other systems check terms acceptance before allowing access
- **Admin Tools:** Terms management interface for creating new versions
- **Legal Compliance:** Audit reports for regulatory requirements

## Error Handling
- **Graceful Degradation:** System handles missing terms gracefully
- **User-Friendly Messages:** Clear error messages for common issues
- **Database Errors:** Proper error logging without exposing internals
- **Validation Errors:** Specific feedback for invalid inputs

## Performance Considerations
- **Database Indexing:** Optimized queries on user_id and terms_version_id
- **Query Efficiency:** Minimal database calls per request
- **Caching Potential:** Terms content could be cached for performance
- **Concurrent Safety:** INSERT IGNORE handles concurrent acceptance attempts

## Testing
- **Unit Tests:** Should cover all terms validation methods
- **Integration Tests:** Test database transaction scenarios
- **Edge Case Tests:** No terms, invalid versions, duplicate acceptance
- **Security Tests:** Verify user isolation and access controls
- **Performance Tests:** Test with large numbers of users and terms versions

## Monitoring and Logging
- **Error Tracking:** Comprehensive error logging for debugging
- **Acceptance Tracking:** Monitor terms acceptance rates
- **Performance Monitoring:** Track database query performance
- **Compliance Reporting:** Generate acceptance reports for audits

## Common Use Cases
- **Marketplace Onboarding:** New users accepting terms before first marketplace access
- **Terms Updates:** Existing users accepting updated terms
- **Compliance Audits:** Generating reports of who accepted what when
- **Legal Requirements:** Proving user consent for marketplace participation
- **Feature Gating:** Blocking marketplace access until terms accepted

## Future Enhancements
- **Email Notifications:** Notify users when new terms are available
- **Terms Comparison:** Show differences between terms versions
- **Bulk Acceptance:** Admin tools for managing terms across multiple users
- **Expiration Dates:** Terms that expire and require re-acceptance
- **Conditional Terms:** Different terms based on user type or location
- **Digital Signatures:** Enhanced legal compliance with digital signatures

## Compliance Features
- **GDPR Compliance:** Proper consent tracking and withdrawal mechanisms
- **Legal Audit Trail:** Complete history for legal proceedings
- **Regulatory Reporting:** Generate reports for regulatory compliance
- **Data Retention:** Maintain acceptance records per legal requirements
- **User Rights:** Support for data access and deletion requests

## Administrative Features
- **Terms Management:** Create and publish new terms versions
- **Acceptance Reports:** View acceptance rates and user compliance
- **Version Control:** Manage multiple terms versions and transitions
- **User Management:** View and manage individual user acceptance status
- **Bulk Operations:** Handle terms updates across large user bases

## Security Best Practices
- **Input Sanitization:** All user inputs properly validated
- **SQL Injection Protection:** Parameterized queries throughout
- **Access Control:** Users can only access their own acceptance data
- **Audit Logging:** All actions logged for security monitoring
- **Data Encryption:** Sensitive data encrypted at rest and in transit
