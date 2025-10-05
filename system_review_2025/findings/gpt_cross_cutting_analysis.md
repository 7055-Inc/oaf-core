# Cross-Cutting Concerns (Independent - GPT)

Generated: 2025-10-05
Scope: Independent analysis without referencing existing findings

## Error Handling
- JSON parse guard in `api-service/src/server.js` returns 400 on invalid JSON
- Route-level try/catch with standardized 400/401/403/404/500 responses
- Media proxy provides granular error mapping (503, 504, 404)
- Opportunity: centralize error shapes and attach request IDs for traceability

## Logging
- Central `secureLogger` with Winston, redaction of sensitive fields, request logging middleware
- Console logs still present in some routes; risk of leaking sensitive info in dev logs
- Recommendation: replace console.* with `secureLogger` and add correlation IDs

## Configuration Management
- Frontend config via `lib/config.js` with env fallbacks
- API reads env directly in many places (Stripe, UPS/USPS, CORS)
- Recommendation: unify configuration access pattern (module per service) and validate required env at startup

## Security Layers (cross-cutting)
- JWT middleware sets `userId`, `roles`, `permissions`; API key middleware with bcrypt
- CSRF protection middleware with special exemption for validation flow
- Rate limiters on sensitive routes; selective payment limiting on `/checkout`

## Consistency Opportunities
1. Standardize error response format and include `requestId`
2. Consolidate env access to config modules; document required env vars
3. Replace console logging with `secureLogger` across codebase
4. Add global Helmet/CSP and verify CORS origin list alignment with config

## Action Items
- Create `api-service/src/config/index.js` for typed env loading and validation
- Add `requestId` middleware and include in responses/logs
- Create reusable error helper (e.g., `sendError(res, code, message, meta)`) and adopt
- Lint rule to disallow console.* in server code; autofix to `secureLogger`
