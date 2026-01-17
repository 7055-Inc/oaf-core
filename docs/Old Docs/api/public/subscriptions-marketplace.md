# Marketplace Subscriptions API

## Authentication
All marketplace subscription endpoints require API key authentication.

**Headers:**
- `Authorization: Bearer {api_key}` (required)
- `Content-Type: application/json`

## Endpoints

### Check Terms Acceptance
`GET /api/subscriptions/marketplace/terms-check`

Check if the authenticated user has accepted the latest marketplace terms and conditions.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Response (200 OK):**
```json
{
  "success": true,
  "termsAccepted": true,
  "latestTerms": {
    "id": 123,
    "title": "Marketplace Terms and Conditions",
    "content": "By using the Beemeeart marketplace, you agree to...",
    "version": "2.1",
    "created_at": "2025-09-17T19:30:00Z"
  }
}
```

**Response (200 OK - Terms Not Accepted):**
```json
{
  "success": true,
  "termsAccepted": false,
  "latestTerms": {
    "id": 123,
    "title": "Marketplace Terms and Conditions",
    "content": "By using the Beemeeart marketplace, you agree to...",
    "version": "2.1",
    "created_at": "2025-09-17T19:30:00Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": "No marketplace terms found"
}
```

### Accept Terms
`POST /api/subscriptions/marketplace/terms-accept`

Record the user's acceptance of specific marketplace terms and conditions.

**Headers:**
- `Authorization: Bearer {api_key}` (required)

**Request Body:**
```json
{
  "terms_version_id": 123
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Terms acceptance recorded successfully"
}
```

**Response (400 Bad Request):**
```json
{
  "error": "terms_version_id is required"
}
```

**Response (404 Not Found):**
```json
{
  "error": "Invalid terms version"
}
```

## Terms and Conditions System

### Terms Versioning
The marketplace uses a versioned terms and conditions system:
- **Version Control**: Each update creates a new version
- **Current Terms**: Only one version is active at a time
- **Historical Access**: Previous versions maintained for reference
- **User Tracking**: Each user must accept terms individually

### Acceptance Requirements
- Users must accept the latest terms before accessing marketplace features
- Acceptance is tied to specific terms versions
- Each acceptance is timestamped for audit purposes
- Duplicate acceptance attempts are handled gracefully

### Compliance Features
- **Audit Trail**: Complete history of terms acceptance
- **Legal Compliance**: Meets regulatory requirements for consent tracking
- **Version Tracking**: Links acceptance to specific terms content
- **User Rights**: Supports data access and compliance requests

## Integration Workflow

### Marketplace Access Flow
1. **Check Terms Status**: Call `/terms-check` to verify acceptance
2. **Display Terms**: If not accepted, show terms content to user
3. **Record Acceptance**: Call `/terms-accept` when user agrees
4. **Grant Access**: Allow marketplace features after acceptance

### Example Implementation
```javascript
// Check if user has accepted latest terms
const termsCheck = await fetch('/api/subscriptions/marketplace/terms-check', {
  headers: { 'Authorization': 'Bearer ' + apiKey }
});
const termsData = await termsCheck.json();

if (!termsData.termsAccepted) {
  // Show terms to user and get acceptance
  const userAccepted = await showTermsModal(termsData.latestTerms);
  
  if (userAccepted) {
    // Record acceptance
    await fetch('/api/subscriptions/marketplace/terms-accept', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        terms_version_id: termsData.latestTerms.id
      })
    });
  }
}
```

## Error Responses

- `400 Bad Request`: Invalid input data or missing required fields
- `401 Unauthorized`: Invalid or missing API key
- `404 Not Found`: Terms version not found or no marketplace terms exist
- `500 Internal Server Error`: Server error

## Rate Limits
- 100 requests per minute per API key for terms checking
- 50 requests per minute per API key for terms acceptance

## Example Usage

### Check Terms Acceptance Status
```bash
curl -X GET https://api.beemeeart.com/api/subscriptions/marketplace/terms-check \
  -H "Authorization: Bearer your_api_key"
```

### Accept Marketplace Terms
```bash
curl -X POST https://api.beemeeart.com/api/subscriptions/marketplace/terms-accept \
  -H "Authorization: Bearer your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "terms_version_id": 123
  }'
```

## Best Practices

### Terms Management
- Always check terms acceptance before allowing marketplace access
- Display full terms content to users before requesting acceptance
- Handle terms updates gracefully by re-checking acceptance status
- Provide clear indication when new terms are available

### User Experience
- Show terms in a readable format with proper formatting
- Highlight changes in updated terms versions
- Provide easy acceptance mechanism (checkbox + button)
- Confirm successful acceptance to users

### Error Handling
- Handle network errors gracefully during terms checking
- Provide fallback behavior if terms service is unavailable
- Show clear error messages for failed acceptance attempts
- Retry failed requests with exponential backoff

### Compliance
- Maintain audit logs of all terms interactions
- Ensure terms content is accessible and readable
- Provide mechanisms for users to review previously accepted terms
- Support data export requests for compliance purposes

## Legal Considerations

### Consent Requirements
- Terms must be presented clearly before acceptance
- Users must actively accept (not just implied consent)
- Acceptance must be recorded with timestamp
- Users should be able to review terms they've accepted

### Data Protection
- Terms acceptance data is personal information
- Subject to data protection regulations (GDPR, CCPA, etc.)
- Users have rights to access and delete their acceptance records
- Data retention policies apply to acceptance records

### Regulatory Compliance
- Terms content must comply with applicable laws
- Acceptance mechanism must meet legal standards
- Audit trails must be maintained for regulatory review
- Regular legal review of terms content recommended

## Integration Examples

### React Component Example
```jsx
import React, { useState, useEffect } from 'react';

function MarketplaceTermsGate({ children, apiKey }) {
  const [termsAccepted, setTermsAccepted] = useState(null);
  const [latestTerms, setLatestTerms] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkTermsAcceptance();
  }, []);

  const checkTermsAcceptance = async () => {
    try {
      const response = await fetch('/api/subscriptions/marketplace/terms-check', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      const data = await response.json();
      setTermsAccepted(data.termsAccepted);
      setLatestTerms(data.latestTerms);
    } catch (error) {
      console.error('Failed to check terms:', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptTerms = async () => {
    try {
      await fetch('/api/subscriptions/marketplace/terms-accept', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          terms_version_id: latestTerms.id
        })
      });
      setTermsAccepted(true);
    } catch (error) {
      console.error('Failed to accept terms:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  
  if (!termsAccepted) {
    return (
      <div className="terms-modal">
        <h2>{latestTerms.title}</h2>
        <div className="terms-content">{latestTerms.content}</div>
        <button onClick={acceptTerms}>Accept Terms</button>
      </div>
    );
  }

  return children;
}
```

### Node.js Service Example
```javascript
class MarketplaceTermsService {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async checkUserTermsAcceptance(userId) {
    const response = await fetch('/api/subscriptions/marketplace/terms-check', {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return await response.json();
  }

  async recordTermsAcceptance(termsVersionId) {
    const response = await fetch('/api/subscriptions/marketplace/terms-accept', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ terms_version_id: termsVersionId })
    });
    return await response.json();
  }

  async ensureTermsAcceptance() {
    const termsCheck = await this.checkUserTermsAcceptance();
    if (!termsCheck.termsAccepted) {
      throw new Error('User must accept marketplace terms before proceeding');
    }
    return true;
  }
}
```
