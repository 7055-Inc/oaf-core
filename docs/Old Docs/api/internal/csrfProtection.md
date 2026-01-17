# csrfProtection.js - Internal Documentation

## Overview
CSRF (Cross-Site Request Forgery) protection middleware for the Beemeeart API. Provides token generation, validation, and cookie-based secret management with environment-configured domain support.

## Architecture
- **Type:** Security Middleware
- **Dependencies:** csrf library, secureLogger
- **Database Tables:** None (cookie-based storage)
- **External APIs:** None

## Functions/Endpoints

### csrfTokenProvider(req, res, next)
- **Purpose:** Generates and provides CSRF tokens for client requests
- **Parameters:** Express middleware parameters (req, res, next)
- **Returns:** Calls next() middleware or sends error response
- **Errors:** 500 if token generation fails
- **Usage Example:** Applied globally to all routes requiring CSRF protection

### csrfProtection(options)
- **Purpose:** Validates CSRF tokens for state-changing requests
- **Parameters:** 
  - `options.strict` (boolean): Enable strict validation mode
- **Returns:** Express middleware function
- **Errors:** 403 for missing/invalid tokens, 500 for validation errors
- **Usage Example:** `app.use('/api/users', csrfProtection())`

### strictCsrfProtection(req, res, next)
- **Purpose:** Enhanced validation for sensitive operations (payments, admin)
- **Parameters:** Express middleware parameters (req, res, next)
- **Returns:** Calls next() middleware or sends error response
- **Errors:** 403 for security violations with enhanced logging
- **Usage Example:** Applied to payment and admin routes

### csrfTokenRoute(req, res)
- **Purpose:** Provides CSRF tokens to frontend applications via API endpoint
- **Parameters:** Express route parameters (req, res)
- **Returns:** JSON response with CSRF token
- **Errors:** 500 if secret not available or token generation fails
- **Usage Example:** `GET /csrf-token`

### generateToken(req)
- **Purpose:** Helper function to create CSRF tokens
- **Parameters:** Express request object with csrfSecret
- **Returns:** Generated CSRF token string
- **Errors:** Throws Error if CSRF secret not available
- **Usage Example:** `const token = generateToken(req)`

### authValidationExemption(req, res, next)
- **Purpose:** Special middleware to exempt auth validation requests from CSRF
- **Parameters:** Express middleware parameters (req, res, next)
- **Returns:** Calls next() middleware, may set req.skipCSRF flag
- **Errors:** None (fails gracefully)
- **Usage Example:** Applied before CSRF protection for auth routes

## Environment Variables
- `COOKIE_DOMAIN`: Domain for CSRF cookies (default: .beemeeart.com)
- `CSRF_SECRET`: Secret key for CSRF token generation (auto-generated if not set)
- `NODE_ENV`: Environment mode (affects secure cookie settings)

## Security Considerations
- **Authentication requirements:** None (provides authentication support)
- **Authorization levels:** Multiple validation modes (regular/strict)
- **Input validation rules:** Token validation from multiple sources
- **Rate limiting applied:** None (handled by parent routes)

## Cookie Configuration
- **csrf-secret**: HttpOnly, 24-hour expiry, domain-configured
- **csrf-token**: Readable by frontend, 1-hour expiry, domain-configured
- **Security**: Secure flag in production, SameSite: lax

## Token Sources (Priority Order)
1. `X-CSRF-Token` header
2. `_csrf` request body field
3. `_csrf` query parameter
4. `csrf-token` cookie

## Exemptions
- Safe HTTP methods (GET, HEAD, OPTIONS)
- Stripe webhook endpoints (`/stripe/webhook`)
- Auth validation requests (`/exchange` with `provider: validate`)
- Routes with `req.skipCSRF` flag

## Testing
- Unit test coverage: Token generation and validation
- Integration test scenarios: Cookie domain configuration, exemption handling
- Performance benchmarks: Token validation speed under load

## Security Features
- **Double Submit Cookie Pattern**: Secret in HttpOnly cookie, token in readable cookie
- **Multiple Token Sources**: Headers, body, query parameters
- **Strict Mode**: Enhanced validation for sensitive operations
- **Security Logging**: Detailed audit trail for security events
- **Domain Isolation**: Environment-configured cookie domains
