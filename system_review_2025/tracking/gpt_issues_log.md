# Issues Log (Independent - GPT)

Generated: 2025-10-05

## P0 - Critical
- Remove hardcoded API key in `api-service/src/routes/media-proxy.js`; move to env and rotate
- Establish automated tests (Jest + Supertest + RTL) and CI

## P1 - High
- Standardize API mount prefixes under `/api/*`
- Introduce schema validation for API payloads (zod/joi)
- Add Helmet/CSP and verify CORS origins
- Replace console logs with `secureLogger`; add correlation IDs

## P2 - Medium
- Create repository helpers for SQL; reduce duplication and N+1s
- Add caching for read-heavy endpoints (categories, sites resolve, articles)
- Design tokens and shared CSS component modules

## P3 - Low
- Docs index and templates; OpenAPI parity
- Centralize configuration access and env validation at startup
