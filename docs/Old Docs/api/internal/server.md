# Server.js - Internal Documentation

## Overview
Main API Gateway server setup with Express.js. Handles CORS, middleware configuration, route loading, and health monitoring for the beemeeart.com multitenant platform.

## Architecture
- **Type:** Main Server/Gateway
- **Dependencies:** Express, JWT, Cookie Parser, Rate Limiters, CSRF Protection
- **Database Tables:** sites (for custom domain validation)
- **External APIs:** None (serves as gateway to other services)

## Functions/Endpoints

### CORS Middleware
- **Purpose:** Dynamic origin validation for multitenant platform
- **Parameters:** Request origin header
- **Returns:** CORS headers based on validation
- **Errors:** None (fails silently for security)
- **Usage Example:** Automatically applied to all requests

### Health Check Endpoint
- **Purpose:** System status and configuration validation
- **Parameters:** None
- **Returns:** JSON health status with environment validation
- **Errors:** 503 if critical environment variables missing
- **Usage Example:** `GET /health`

## Environment Variables
- `CORS_ALLOWED_ORIGINS`: Comma-separated list of allowed origins
- `API_BASE_URL`: Base URL for API service (https://api.beemeeart.com)
- `FRONTEND_URL`: Frontend application URL (https://beemeeart.com)
- `COOKIE_DOMAIN`: Cookie domain for authentication (.beemeeart.com)
- `API_GATEWAY_PORT`: Server port (default: 3001)
- `API_VERSION`: API version identifier (default: 1.0.0)
- `API_INSTANCE`: Instance identifier (default: 0)

## Security Considerations
- **Authentication requirements:** API key and JWT token validation
- **Authorization levels:** Route-specific CSRF protection (regular/strict)
- **Input validation rules:** JSON parsing with error handling
- **Rate limiting applied:** Multiple tiers (auth, payment, admin, general)

## CORS Security Features
- **Static Origin Validation:** Environment-configured allowed origins
- **Subdomain Support:** Automatic validation for *.beemeeart.com
- **Custom Domain Support:** Database-verified custom domains only
- **Development Support:** localhost:8081 for mobile app development

## Middleware Stack Order
1. Trust proxy configuration
2. CORS middleware (custom implementation)
3. Cookie parser
4. Webhook routes (raw body access)
5. JSON parsing with error handling
6. Static file serving
7. Rate limiting
8. Request logging
9. Authentication routes
10. CSRF protection
11. Protected routes with specific limiters

## Testing
- Unit test coverage: Health endpoint validation
- Integration test scenarios: CORS origin validation, route loading
- Performance benchmarks: Rate limiting effectiveness

## Monitoring
- Health endpoint provides environment validation
- Structured logging for startup and errors
- Rate limiting metrics available
- CORS validation logging for security audit
