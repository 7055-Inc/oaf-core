# Remediation Plans (Independent - GPT)

Generated: 2025-10-05

## Phase A (Weeks 1-3): Foundations
- Testing stack: add Jest, Supertest, RTL; sample tests and CI workflow
- Security: remove hardcoded media-proxy key; add Helmet/CSP; env validation module
- API: standardize path naming on API subdomain (no '/api' prefix); standard error format

## Phase B (Weeks 4-6): API and Performance
- Schema validation rollout (zod/joi) for high-traffic routes
- Repository helpers for SQL; refactor hot paths; add pagination/batching
- Caching layer for categories, sites resolve, articles

## Phase C (Weeks 7-9): Styling and Docs
- Add design tokens and shared CSS modules; refactor components to use them
- Docs index, templates, and PR checklist integration; OpenAPI parity checks

## Ownership & Risks
- Owners: Backend lead (API/security), Frontend lead (styles/tests), DevOps (CI/CSP/CORS)
- Risks: DB migrations and caching invalidation; plan staged rollouts and feature flags

## Success Criteria
- 60%+ coverage, green CI
- Consistent API path naming (API subdomain, no '/api') and error responses
- No hardcoded secrets; headers and CORS verified
- Noticeable DB query reductions on hot endpoints
