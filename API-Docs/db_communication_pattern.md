# Database Server Communication Pattern

## Communication Flow

1. **Frontend → Main Nginx Gateway**
   - Frontend sends requests to the main application Nginx gateway
   - Gateway validates request format and applies initial security checks

2. **Gateway → Application Server**
   - Request is routed to the appropriate application server endpoint
   - Application server authenticates the user and validates permissions

3. **Application Server → Database Server**
   - Application server formulates a database request following standardized patterns
   - Communication occurs over HTTPS with mutual TLS authentication
   - Requests include a standardized authentication header

4. **Database Server → Database**
   - Database server processes the request through its own Nginx
   - Database operations are executed by the dedicated API user with restricted permissions
   - Results are processed and returned

5. **Response Path**
   - Response follows the reverse path back to the client
   - Each layer may transform the response as needed

## Security Measures

### Authentication
- Mutual TLS between application and database servers
- API key authentication for all requests between servers
- Request signing with HMAC to prevent tampering

### Request Format
```
POST https://db.example.com/api/v1/{resource}
Content-Type: application/json
X-API-Key: {api_key}
X-Request-Signature: {hmac_signature}
X-Request-Timestamp: {timestamp}

{
  "operation": "SELECT|UPDATE|INSERT|DELETE",
  "parameters": {
    // Operation-specific parameters
  }
}
```

### Encryption
- All communication over HTTPS (TLS 1.2+)
- Sensitive data fields should be encrypted at the application level before transmission
- DB credentials never transmitted in requests

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

### Common Error Scenarios
1. **Authentication Failure**
   - Log attempt with IP and timestamp
   - Return 401 without revealing specific reason

2. **Authorization Failure**
   - Log attempt with user ID and requested resource
   - Return 403 with minimal details

3. **Database Error**
   - Log full error details server-side
   - Return sanitized error to client
   - Alert on critical errors

4. **Timeout**
   - Implement cascading timeouts (shorter at outer layers)
   - Gracefully degrade functionality when possible

## Logging Standards

All communications should be logged with:
- Request timestamp
- Requesting application ID
- Operation type
- Resource affected
- Request ID (for correlation)
- Response status
- Processing time

## Performance Considerations

1. **Connection Pooling**
   - Maintain persistent connections between app and DB servers
   - Configure appropriate pool sizes based on load

2. **Caching Strategy**
   - Implement Redis caching for frequently accessed data
   - Use cache-control headers for appropriate responses

3. **Compression**
   - Enable gzip compression for all traffic between servers 