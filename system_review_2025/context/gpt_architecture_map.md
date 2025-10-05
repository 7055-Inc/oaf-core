# Independent Architecture Map (GPT)

Generated: 2025-10-05
Scope: Independent analysis, no prior findings referenced

## Applications and Entry Points
- Main Web App: `server.js` (Next.js)
- API Service: `api-service/src/server.js` (Express.js)
- Background Workers: `csv-workers/csv-processor.js`
- Mobile App: `mobile-app/index.js` (Expo/React Native)

## High-Level Architecture
- Frontend: Next.js pages in `pages/` with React components from `components/`
- Backend API: Express routes in `api-service/src/routes/*`
- Shared libs: `lib/` for DB, config, auth utils
- Background processing: Bull/Redis in `csv-workers/`
- Mobile client: Expo app in `mobile-app/`

## Technology Stack
- Node.js, Express 4/5, Next.js 15, React 19
- Database: MySQL2 (see `lib/db.js`, `api-service/config/db.js`)
- Cache/Queues: Redis + Bull
- Auth: JWT (`jsonwebtoken`, `jose`), RBAC via middleware
- Payments: Stripe
- Email: Nodemailer
- File handling: Multer; antivirus via ClamScan

## Request/Data Flows
1) Web request flow
```
Browser → Next.js page (pages/*) → fetch API (API_BASE_URL) → Express route (api-service/src/routes/*) → MySQL
```
2) Auth flow
```
Login → JWT issuance → Bearer token in requests → Middleware validates → Protected handlers
```
3) E‑commerce flow
```
Browse products → Cart → Checkout → Stripe → Order record → Notifications
```
4) Background processing
```
Upload CSV → Queue (Bull/Redis) → Worker parses/validates → DB updates
```

## Routes Organization (observed examples)
- Core: `products.js`, `users.js`, `carts.js`, `checkout.js`
- Events: `events.js`, `applications.js`, `series.js`
- Media: `media.js`, `media-proxy.js`
- Admin: `admin.js`, `admin-financial.js`, `admin-marketplace.js`
- Subscriptions: `subscriptions/{marketplace,shipping,wholesale,websites}.js`
- Misc: `search.js`, `domains.js`, `dashboard-widgets.js`, `personas.js`, `jury-packets.js`

## Security Layers
- Rate limiting middleware
- CSRF protection for state-changing routes
- JWT auth + permissions middleware

## Notable Config
- `lib/config.js` drives frontend base URLs and CORS helpers
- `ecosystem.config.js` defines PM2 apps and ports
- SQL schemas under root and `api-service/scripts/`

## Client Request Handling
- Next middleware: `middleware.js` routes maintenance and subdomain traffic before page handlers
- CSRF helper: `lib/csrf.js` adds `X-CSRF-Token` for state-changing requests and retries on 401 with token refresh
- API mounts: `api-service/src/server.js` mounts endpoints under `/api/*`, plus non-prefixed paths like `/products`, `/users`, `/cart`, `/checkout`

## Open Questions
- Exact RBAC rules in `api-service/src/middleware/permissions.js`
- CORS origins and cookie domain final values (env-driven)
