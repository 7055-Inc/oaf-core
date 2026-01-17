# Authentication API

## Overview
The Beemeeart Authentication API provides secure user authentication, token management, and cookie consent handling. Supports Google OAuth, email authentication, and JWT-based session management.

## Authentication
All authentication endpoints are public except where noted. Protected endpoints require a valid JWT token in the Authorization header.

## Base URL
```
https://api.beemeeart.com/auth
```

## Endpoints

### Exchange Authentication Token
`POST /auth/exchange`

Exchange OAuth tokens for access tokens or validate existing JWT tokens.

**Request Body:**
```json
{
  "provider": "google|email|validate",
  "token": "string",
  "email": "string" // Required for email provider
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "a1b2c3d4e5f6...",
  "userId": 12345
}
```

**Response for Validation (200 OK):**
```json
{
  "roles": ["user", "vendor"],
  "permissions": ["vendor", "shipping", "stripe_connect"]
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields or invalid provider
- `401 Unauthorized`: Invalid token
- `500 Internal Server Error`: Authentication failed

**Example Usage:**
```bash
# Google OAuth
curl -X POST https://api.beemeeart.com/auth/exchange \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "token": "google_id_token_here"
  }'

# Token Validation
curl -X POST https://api.beemeeart.com/auth/exchange \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "validate",
    "token": "existing_jwt_token"
  }'
```

### Refresh Access Token
`POST /auth/refresh`

Refresh an expired access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "string"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "new_refresh_token_here",
  "userId": 12345
}
```

**Error Responses:**
- `400 Bad Request`: Missing refresh token
- `401 Unauthorized`: Invalid or expired refresh token
- `500 Internal Server Error`: Token refresh failed

**Example Usage:**
```bash
curl -X POST https://api.beemeeart.com/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token_here"
  }'
```

### Log Anonymous Cookie Consent
`POST /auth/cookie-consent/anonymous`

Log cookie consent for anonymous users (GDPR compliance).

**Request Body:**
```json
{
  "consent": "yes|no",
  "sessionId": "string",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Cookie consent logged successfully"
}
```

**Error Responses:**
- `400 Bad Request`: Missing required fields or invalid consent value
- `500 Internal Server Error`: Failed to log consent

**Example Usage:**
```bash
curl -X POST https://api.beemeeart.com/auth/cookie-consent/anonymous \
  -H "Content-Type: application/json" \
  -d '{
    "consent": "yes",
    "sessionId": "anonymous_session_12345",
    "timestamp": "2024-01-01T12:00:00Z"
  }'
```

### Update User Cookie Consent
`POST /auth/cookie-consent/user`

Update cookie consent for authenticated users.

**Authentication:** Required - Bearer token

**Request Body:**
```json
{
  "consent": "yes|no",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Cookie consent updated successfully",
  "consent": true,
  "consentDate": "2024-01-01T12:00:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Missing consent or invalid value
- `401 Unauthorized`: Invalid or missing token
- `500 Internal Server Error`: Failed to update consent

**Example Usage:**
```bash
curl -X POST https://api.beemeeart.com/auth/cookie-consent/user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{
    "consent": "yes",
    "timestamp": "2024-01-01T12:00:00Z"
  }'
```

### Get Cookie Consent Status
`GET /auth/cookie-consent/status`

Retrieve current cookie consent status for authenticated user.

**Authentication:** Required - Bearer token

**Response (200 OK):**
```json
{
  "success": true,
  "hasConsented": true,
  "consentDate": "2024-01-01T12:00:00Z"
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing token
- `404 Not Found`: User not found
- `500 Internal Server Error`: Failed to fetch status

**Example Usage:**
```bash
curl -X GET https://api.beemeeart.com/auth/cookie-consent/status \
  -H "Authorization: Bearer your_jwt_token"
```

## Authentication Providers

### Google OAuth
- **Provider:** `google`
- **Token:** Google ID token from OAuth flow
- **Verification:** Server-side token validation
- **Email:** Extracted from Google token

### Email Authentication
- **Provider:** `email`
- **Token:** Email verification token
- **Email:** Required in request body
- **Verification:** Email verification status tracked

### Token Validation
- **Provider:** `validate`
- **Token:** Existing JWT access token
- **Purpose:** Refresh roles and permissions
- **Response:** Current user roles and permissions

## Token Management

### Access Tokens
- **Type:** JWT (JSON Web Token)
- **Expiration:** 1 hour
- **Payload:** userId, roles, permissions
- **Usage:** Authorization header: `Bearer <token>`

### Refresh Tokens
- **Type:** Cryptographically secure random string
- **Expiration:** 7 days
- **Storage:** Securely hashed in database
- **Rotation:** New token issued on each refresh

### Token Security
- **Signing:** HMAC SHA-256 algorithm
- **Rotation:** Refresh tokens rotated on use
- **Expiration:** Short-lived access tokens for security
- **Device Tracking:** User-Agent fingerprinting

## User Roles and Permissions

### Available Roles
- `user` - Basic user access
- `vendor` - Marketplace vendor
- `admin` - Administrative access
- `artist` - Artist profile access
- `promoter` - Event promoter access

### Available Permissions
- `vendor` - Marketplace vendor operations
- `events` - Event management
- `stripe_connect` - Payment processing
- `manage_sites` - Site management
- `manage_content` - Content management
- `manage_system` - System administration
- `verified` - Verified user status
- `marketplace` - Marketplace participation
- `shipping` - Shipping management
- `sites` - Basic site access
- `professional_sites` - Professional site features

### Permission Inheritance
- **Admin users** automatically receive all permissions
- **Vendor users** automatically receive `shipping` and `stripe_connect`
- **Explicit permissions** can be granted via user management

## Rate Limits
- **Authentication endpoints:** 100 requests per minute per IP
- **Cookie consent endpoints:** 50 requests per minute per IP
- **Token refresh:** 20 requests per minute per user

## Error Handling

### Standard Error Format
```json
{
  "error": "Error description"
}
```

### Common Error Codes
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `404` - Not Found (resource not found)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error (server error)

## Security Considerations

### Token Security
- Store tokens securely (httpOnly cookies recommended)
- Implement automatic token refresh before expiration
- Handle token expiration gracefully
- Never expose tokens in URLs or logs

### GDPR Compliance
- Cookie consent must be obtained before setting cookies
- Users can withdraw consent at any time
- Consent status is tracked with timestamps
- Anonymous consent logging available

### Best Practices
- Use HTTPS for all authentication requests
- Implement proper CORS policies
- Validate all input parameters
- Handle errors without exposing sensitive information
- Implement proper session management

## Integration Examples

### Frontend Authentication Flow
```javascript
// 1. Google OAuth (using Google Sign-In)
const googleToken = await getGoogleToken();

// 2. Exchange for access token
const authResponse = await fetch('/auth/exchange', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'google',
    token: googleToken
  })
});

const { token, refreshToken, userId } = await authResponse.json();

// 3. Store tokens securely
localStorage.setItem('accessToken', token);
localStorage.setItem('refreshToken', refreshToken);

// 4. Use token for authenticated requests
const apiResponse = await fetch('/api/protected-endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Automatic Token Refresh
```javascript
async function makeAuthenticatedRequest(url, options = {}) {
  let token = localStorage.getItem('accessToken');
  
  // Try request with current token
  let response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    }
  });
  
  // If token expired, refresh and retry
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    
    const refreshResponse = await fetch('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    
    if (refreshResponse.ok) {
      const { token: newToken, refreshToken: newRefreshToken } = 
        await refreshResponse.json();
      
      localStorage.setItem('accessToken', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      
      // Retry original request
      response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`
        }
      });
    }
  }
  
  return response;
}
```

### Cookie Consent Management
```javascript
// Check if user has already consented
const consentResponse = await fetch('/auth/cookie-consent/status', {
  headers: { 'Authorization': `Bearer ${token}` }
});

if (consentResponse.ok) {
  const { hasConsented } = await consentResponse.json();
  
  if (!hasConsented) {
    // Show consent dialog
    const userConsent = await showConsentDialog();
    
    // Update consent
    await fetch('/auth/cookie-consent/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        consent: userConsent ? 'yes' : 'no',
        timestamp: new Date().toISOString()
      })
    });
  }
}
```
