# Security API

## Authentication
CSRF protection is automatically applied to state-changing requests. API key authentication is required for most endpoints.

## Endpoints

### Get CSRF Token
`GET /csrf-token`

Retrieves a CSRF token for authenticated requests. Required for all POST, PUT, DELETE, and PATCH operations.

**Headers:**
- `Authorization: Bearer {api_key}` (required for most routes)

**Request Body:**
None

**Response (200 OK):**
```json
{
  "csrfToken": "abc123def456ghi789..."
}
```

**Error Responses:**
- `500 Internal Server Error`: CSRF secret not available or token generation failed

**Rate Limits:**
- Inherits from parent route rate limits

**Example Usage:**
```bash
curl -X GET https://api.beemeeart.com/csrf-token \
  -H "Authorization: Bearer your_api_key"
```

```javascript
// JavaScript example
async function getCsrfToken() {
  const response = await fetch('https://api.beemeeart.com/csrf-token', {
    method: 'GET',
    credentials: 'include', // Include cookies
    headers: {
      'Authorization': 'Bearer your_api_key'
    }
  });
  
  const data = await response.json();
  return data.csrfToken;
}

// Use token in subsequent requests
const token = await getCsrfToken();
const response = await fetch('https://api.beemeeart.com/api/users', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_api_key',
    'X-CSRF-Token': token
  },
  body: JSON.stringify({ name: 'John Doe' })
});
```

## CSRF Protection

All state-changing requests (POST, PUT, DELETE, PATCH) require CSRF tokens for protection against cross-site request forgery attacks.

### Token Sources
CSRF tokens can be provided in multiple ways (checked in order):
1. **X-CSRF-Token header** (recommended)
2. **_csrf field in request body**
3. **_csrf query parameter**
4. **csrf-token cookie** (automatically set)

### Protection Levels

#### Standard Protection
Applied to most API endpoints:
- User management
- Product operations
- Content management
- General API operations

#### Strict Protection
Applied to sensitive operations:
- Payment processing (`/checkout`, `/payments`)
- Admin operations (`/admin`)
- Vendor operations (`/vendor`)
- API key management (`/api/keys`)

### Exemptions
CSRF protection is automatically bypassed for:
- **Safe methods**: GET, HEAD, OPTIONS
- **Webhook endpoints**: Stripe webhooks and similar
- **Auth validation**: Token validation requests
- **Development**: localhost origins (in development mode)

### Error Responses

**Missing CSRF Token (403 Forbidden):**
```json
{
  "error": "CSRF token missing",
  "message": "Please include a valid CSRF token with your request"
}
```

**Invalid CSRF Token (403 Forbidden):**
```json
{
  "error": "Invalid CSRF token",
  "message": "The CSRF token is invalid or expired"
}
```

**Strict Mode Violation (403 Forbidden):**
```json
{
  "error": "Security token required. Please refresh and try again."
}
```

### Cookie Configuration
- **Domain**: Configured for beemeeart.com subdomains
- **Security**: Secure flag in production, SameSite protection
- **Expiry**: Tokens expire after 1 hour, secrets after 24 hours

### Best Practices

1. **Always include CSRF tokens** in state-changing requests
2. **Use X-CSRF-Token header** for API clients
3. **Handle token expiry** by refreshing tokens when needed
4. **Include credentials** in fetch requests to maintain cookie state
5. **Validate responses** and handle 403 errors appropriately

### Integration Examples

#### React/JavaScript
```javascript
// Token management utility
class CsrfManager {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.token = null;
  }
  
  async getToken() {
    if (!this.token) {
      await this.refreshToken();
    }
    return this.token;
  }
  
  async refreshToken() {
    const response = await fetch('/csrf-token', {
      credentials: 'include',
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    const data = await response.json();
    this.token = data.csrfToken;
  }
  
  async apiCall(url, options = {}) {
    const token = await this.getToken();
    
    return fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'X-CSRF-Token': token,
        ...options.headers
      }
    });
  }
}
```

#### cURL
```bash
# Get CSRF token
TOKEN=$(curl -s -X GET https://api.beemeeart.com/csrf-token \
  -H "Authorization: Bearer your_api_key" \
  -c cookies.txt | jq -r '.csrfToken')

# Use token in API call
curl -X POST https://api.beemeeart.com/api/users \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $TOKEN" \
  -b cookies.txt \
  -d '{"name": "John Doe", "email": "john@example.com"}'
```
