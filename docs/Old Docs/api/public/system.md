# System API

## Authentication
All endpoints require API key authentication unless specified otherwise.

## Endpoints

### Health Check
`GET /health`

Returns the current system status and configuration validation.

**Headers:**
- None required (public endpoint)

**Request Body:**
None

**Response (200 OK):**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "instance": "0",
  "timestamp": "2025-09-17T19:30:00Z",
  "environment": {
    "corsConfigured": true,
    "apiBaseConfigured": true,
    "frontendConfigured": true,
    "cookieDomainConfigured": true
  }
}
```

**Response (503 Service Unavailable):**
```json
{
  "status": "degraded",
  "version": "1.0.0",
  "instance": "0",
  "timestamp": "2025-09-17T19:30:00Z",
  "environment": {
    "corsConfigured": false,
    "apiBaseConfigured": false,
    "frontendConfigured": true,
    "cookieDomainConfigured": true
  },
  "warnings": ["Critical environment variables missing"]
}
```

**Error Responses:**
- `503 Service Unavailable`: Critical configuration missing

**Rate Limits:**
- No rate limiting applied (monitoring endpoint)

**Example Usage:**
```bash
curl -X GET https://api.beemeeart.com/health
```

```javascript
// JavaScript example
fetch('https://api.beemeeart.com/health')
  .then(response => response.json())
  .then(data => {
    if (data.status === 'ok') {
      console.log('API is healthy');
    } else {
      console.warn('API has issues:', data.warnings);
    }
  });
```

### CSRF Token
`GET /csrf-token`

Retrieves a CSRF token for authenticated requests.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
{
  "csrfToken": "abc123def456..."
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or missing API key
- `429 Too Many Requests`: Rate limit exceeded

**Rate Limits:**
- 100 requests per minute per API key

**Example Usage:**
```bash
curl -X GET https://api.beemeeart.com/csrf-token \
  -H "Authorization: Bearer your_api_key"
```

## CORS Policy

The API supports cross-origin requests from:
- All configured beemeeart.com subdomains
- Verified custom domains (artist websites)
- Development environments (localhost:8081)

**Allowed Methods:** GET, POST, PUT, DELETE, PATCH, OPTIONS
**Allowed Headers:** Content-Type, Authorization, X-CSRF-Token
**Credentials:** Supported (cookies and authentication headers)

## Rate Limiting

Different rate limits apply to different endpoint categories:
- **General API:** 1000 requests per hour
- **Authentication:** 100 requests per hour
- **Payment Operations:** 50 requests per hour
- **Admin Operations:** 200 requests per hour
- **File Uploads:** 20 requests per hour

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Time when the rate limit resets
