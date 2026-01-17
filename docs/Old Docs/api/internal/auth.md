# auth.js - Internal Documentation

## Overview
Authentication routes for the Beemeeart platform. Handles user authentication, token exchange, refresh tokens, and cookie consent management. Supports Google OAuth, email authentication, and JWT token management with comprehensive security features.

## Architecture
- **Type:** Route Layer (API Endpoints) - Authentication & Authorization
- **Dependencies:** express, jsonwebtoken, crypto, database connection, secureLogger, jwt middleware
- **Database Tables:** 
  - `users` - User accounts and basic information
  - `user_logins` - Authentication provider records
  - `user_types` - Additional user type assignments
  - `user_permissions` - Granular permission system
  - `user_profiles` - Basic user profile data
  - `artist_profiles` - Artist-specific profile data
  - `promoter_profiles` - Event promoter profile data
  - `community_profiles` - Community member profile data
  - `admin_profiles` - Administrative profile data
  - `refresh_tokens` - Secure refresh token storage
  - `error_logs` - Authentication error logging
- **External APIs:** Google OAuth (token validation)

## Authentication Endpoints

### POST /auth/exchange
**Purpose:** Exchange OAuth tokens or validate existing JWT tokens

**Supported Providers:**
- `google` - Google OAuth ID token exchange
- `email` - Email-based authentication token exchange
- `validate` - JWT token validation and role/permission refresh

**Request Body:**
```json
{
  "provider": "google|email|validate",
  "token": "oauth_token_or_jwt",
  "email": "user@example.com" // Required for email provider
}
```

**Response:**
```json
{
  "token": "jwt_access_token",
  "refreshToken": "secure_refresh_token",
  "userId": 123
}
```

**Authentication Flow:**
1. **Token Validation:** Validates provider-specific tokens
2. **User Lookup:** Searches for existing user by provider ID
3. **User Creation:** Creates new user if not found (with all profile types)
4. **Role Assignment:** Fetches user roles and permissions
5. **Permission Inheritance:** Applies automatic permission rules
6. **Token Generation:** Creates 1-hour access token and 7-day refresh token
7. **Audit Logging:** Logs successful authentication events

**Security Features:**
- JWT token validation with secret key
- Google ID token verification
- Email verification status tracking
- Secure refresh token generation (SHA-256 hashed)
- Device fingerprinting via User-Agent
- Comprehensive audit logging
- Error logging for failed attempts

### POST /auth/refresh
**Purpose:** Refresh access token using refresh token

**Request Body:**
```json
{
  "refreshToken": "secure_refresh_token"
}
```

**Response:**
```json
{
  "token": "new_jwt_access_token",
  "refreshToken": "new_refresh_token",
  "userId": 123
}
```

**Token Refresh Flow:**
1. **Token Validation:** Validates refresh token hash against database
2. **Expiration Check:** Ensures refresh token is not expired
3. **User Validation:** Verifies user still exists and is active
4. **Role Refresh:** Fetches current user roles and permissions
5. **Token Rotation:** Generates new access and refresh tokens
6. **Database Update:** Removes old refresh token, stores new one
7. **Audit Logging:** Logs successful token refresh

**Security Features:**
- Refresh token rotation (old token invalidated)
- SHA-256 token hashing for database storage
- Automatic expiration handling
- Device tracking for security monitoring
- Failed attempt logging

## Cookie Consent Endpoints

### POST /auth/cookie-consent/anonymous
**Purpose:** Log anonymous cookie consent for GDPR compliance

**Request Body:**
```json
{
  "consent": "yes|no",
  "sessionId": "anonymous_session_id",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cookie consent logged successfully"
}
```

**Features:**
- GDPR compliance for anonymous users
- Session ID tracking (partial logging for privacy)
- IP address and User-Agent logging
- Audit trail before user registration

### POST /auth/cookie-consent/user
**Purpose:** Update authenticated user's cookie consent

**Authentication:** Requires valid JWT token

**Request Body:**
```json
{
  "consent": "yes|no",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cookie consent updated successfully",
  "consent": true,
  "consentDate": "2024-01-01T12:00:00Z"
}
```

**Features:**
- Persistent consent storage in user record
- Timestamp tracking for compliance
- Boolean conversion for database storage
- Audit logging of consent changes

### GET /auth/cookie-consent/status
**Purpose:** Retrieve user's current cookie consent status

**Authentication:** Requires valid JWT token

**Response:**
```json
{
  "success": true,
  "hasConsented": true,
  "consentDate": "2024-01-01T12:00:00Z"
}
```

**Features:**
- Current consent status retrieval
- Consent date for compliance records
- User-specific consent tracking

## User Management System

### User Creation Process
When a new user authenticates:

1. **User Record Creation:**
   ```sql
   INSERT INTO users (username, email_verified, status, user_type)
   VALUES (email, 'yes|no', 'active|draft', 'Draft')
   ```

2. **Profile Creation:** Creates all profile types for flexibility:
   - `user_profiles` - Basic profile
   - `artist_profiles` - Artist-specific data
   - `promoter_profiles` - Event promoter data
   - `community_profiles` - Community member data
   - `admin_profiles` - Administrative data

3. **Login Record Creation:**
   ```sql
   INSERT INTO user_logins (user_id, provider, provider_id, provider_token, api_prefix)
   VALUES (userId, provider, providerId, token, 'BEE-')
   ```

### Role and Permission System

#### Role Types
- **Primary Role:** Stored in `users.user_type`
- **Additional Roles:** Stored in `user_types` table
- **Admin Role:** Automatically grants all permissions

#### Permission Categories
- `vendor` - Marketplace vendor access
- `events` - Event management access
- `stripe_connect` - Payment processing access
- `manage_sites` - Site management access
- `manage_content` - Content management access
- `manage_system` - System administration access
- `verified` - Verified user status
- `marketplace` - Marketplace participation
- `shipping` - Shipping management access
- `sites` - Basic site access
- `professional_sites` - Professional site features

#### Permission Inheritance Rules
1. **Admin Users:** Automatically receive all permissions
2. **Vendor Users:** Automatically receive `shipping` and `stripe_connect`
3. **Explicit Permissions:** Set via `user_permissions` table

### API Prefix System
- **New Users:** Receive `BEE-` prefix for API identification
- **Existing Users:** Maintain existing prefix during login record creation
- **Usage:** API key generation and request tracking

## Security Implementation

### JWT Token Security
- **Access Token Expiration:** 1 hour for security
- **Refresh Token Expiration:** 7 days for usability
- **Token Payload:** Includes userId, roles, and permissions
- **Secret Key:** Uses `JWT_SECRET` environment variable
- **Algorithm:** Default JWT signing algorithm

### Refresh Token Security
- **Generation:** 64-byte cryptographically secure random tokens
- **Storage:** SHA-256 hashed in database
- **Rotation:** New refresh token generated on each refresh
- **Device Tracking:** User-Agent stored for security monitoring
- **Expiration:** Automatic cleanup of expired tokens

### Database Security
- **Parameterized Queries:** All database queries use parameter binding
- **Error Handling:** Database errors logged without exposing sensitive data
- **Transaction Safety:** Proper error handling for multi-table operations
- **Audit Logging:** Comprehensive logging of authentication events

### Input Validation
- **Required Fields:** Strict validation of required parameters
- **Provider Validation:** Whitelist of supported authentication providers
- **Consent Validation:** Strict validation of consent values
- **Token Format:** JWT and OAuth token format validation
- **Email Format:** Email validation for email provider

## Error Handling

### Authentication Errors
- **Invalid Tokens:** Clear error messages without exposing token details
- **Missing Credentials:** Descriptive validation error messages
- **Database Failures:** Proper error logging and generic user messages
- **Provider Errors:** Specific handling for each authentication provider

### Database Error Handling
- **Connection Failures:** Graceful degradation with error logging
- **Query Failures:** Detailed error logging with generic user responses
- **Transaction Failures:** Proper rollback and error recovery
- **Constraint Violations:** Appropriate error messages for duplicate users

### Security Error Handling
- **Token Tampering:** Detection and logging of invalid tokens
- **Expired Tokens:** Clear expiration messages with refresh guidance
- **Invalid Providers:** Rejection of unsupported authentication methods
- **Rate Limiting:** (Future enhancement) Protection against brute force attacks

## Logging and Monitoring

### Audit Logging
- **Authentication Events:** Successful logins with user and provider details
- **Token Operations:** Token generation, validation, and refresh events
- **Permission Changes:** Role and permission modifications
- **Consent Updates:** Cookie consent changes for compliance

### Security Logging
- **Failed Attempts:** Invalid token attempts and authentication failures
- **Suspicious Activity:** Multiple failed attempts from same IP/device
- **Token Abuse:** Attempts to use expired or invalid tokens
- **Error Patterns:** Systematic logging of authentication errors

### Performance Monitoring
- **Response Times:** Authentication endpoint performance tracking
- **Database Performance:** Query execution time monitoring
- **Token Generation:** JWT and refresh token generation performance
- **Error Rates:** Authentication failure rate monitoring

## Environment Variables
- `JWT_SECRET` - Secret key for JWT token signing and verification

## Usage Examples

### Google OAuth Authentication
```javascript
// Frontend sends Google ID token
const response = await fetch('/auth/exchange', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'google',
    token: 'google_id_token_here'
  })
});

const { token, refreshToken, userId } = await response.json();
```

### Token Validation
```javascript
// Validate existing JWT token
const response = await fetch('/auth/exchange', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'validate',
    token: 'existing_jwt_token'
  })
});

const { roles, permissions } = await response.json();
```

### Token Refresh
```javascript
// Refresh access token
const response = await fetch('/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refreshToken: 'stored_refresh_token'
  })
});

const { token, refreshToken, userId } = await response.json();
```

### Cookie Consent Management
```javascript
// Update user consent
const response = await fetch('/auth/cookie-consent/user', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${accessToken}`
  },
  body: JSON.stringify({
    consent: 'yes',
    timestamp: new Date().toISOString()
  })
});
```

## Integration Points

### Frontend Integration
- **Token Storage:** Secure storage of access and refresh tokens
- **Automatic Refresh:** Implement token refresh before expiration
- **Role-Based UI:** Use roles and permissions for UI rendering
- **Consent Management:** GDPR-compliant consent collection

### Middleware Integration
- **JWT Verification:** Integration with `verifyToken` middleware
- **Permission Checking:** Role and permission validation in protected routes
- **Audit Integration:** Consistent logging across authentication flows

### Database Integration
- **User Management:** Seamless integration with user management system
- **Profile Management:** Automatic profile creation for new users
- **Permission System:** Dynamic permission checking and inheritance

## Performance Considerations

### Token Management
- **Short Access Tokens:** 1-hour expiration reduces security risk
- **Efficient Refresh:** Minimal database queries for token refresh
- **Token Caching:** Frontend caching of valid tokens
- **Batch Operations:** Efficient database operations for user creation

### Database Optimization
- **Indexed Queries:** Proper indexing on user lookup fields
- **Connection Pooling:** Efficient database connection management
- **Query Optimization:** Optimized queries for role and permission fetching
- **Transaction Efficiency:** Minimal transaction scope for performance

### Security vs Performance
- **Refresh Token Rotation:** Enhanced security with minimal performance impact
- **Permission Caching:** Balance between security and performance
- **Audit Logging:** Asynchronous logging to avoid performance impact
- **Error Handling:** Fast error responses without detailed information leakage
