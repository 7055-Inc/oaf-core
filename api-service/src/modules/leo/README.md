# Leo AI Module

AI-powered search, recommendations, and discovery for the Brakebee platform.

## Features

- **Intelligent Search** - Classification-based filtering, no orders/drafts/deleted items leak
- **Personalization** - User preferences from classification 141 documents
- **Boost Scoring** - Mathematical personalization without LLM (~70ms response)
- **Global Trends** - Fallback for anonymous users based on platform behavior
- **ChromaDB Integration** - Vector database for semantic search

## Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v2/leo/search` | Main intelligent search |
| POST | `/api/v2/leo/recommendations` | Personalized recommendations |
| POST | `/api/v2/leo/discover` | TikTok-style endless feed |
| GET | `/api/v2/leo/health` | Health check |
| GET | `/api/v2/leo/stats` | Collection statistics |

### Admin Endpoints (Requires admin role)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/leo/admin/ingest/status` | List available ingestion scripts |
| POST | `/api/v2/leo/admin/ingest/users` | Trigger user ingestion |
| POST | `/api/v2/leo/admin/ingest/products` | Trigger product ingestion (background) |
| GET | `/api/v2/leo/admin/ingest/products/status` | Check product ingestion progress |
| POST | `/api/v2/leo/admin/ingest/behavior` | Trigger behavior ingestion |

### Future Endpoints (Brain Phase)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v2/leo/ask` | Required | "Why was I charged?" |
| POST | `/api/v2/leo/support` | Required | AI customer service |

## Usage

### Search
```javascript
POST /api/v2/leo/search
{
  "query": "blue abstract painting",
  "userId": "123",  // optional
  "categories": ["products", "artists"],
  "limit": 20
}
```

### Recommendations
```javascript
POST /api/v2/leo/recommendations
{
  "userId": "123",
  "limit": 10,
  "category": "products"
}
```

### Discover Feed
```javascript
POST /api/v2/leo/discover
{
  "userId": "123",
  "offset": 0,
  "limit": 20
}
```

## Architecture

```
modules/leo/
├── index.js              # Module exports
├── routes.js             # API endpoints
├── services/
│   ├── index.js          # Service exports
│   ├── logger.js         # Winston logger
│   ├── vectorDB.js       # ChromaDB connection
│   ├── search.js         # SearchService
│   ├── utils/
│   │   ├── searchFilters.js    # Classification filters
│   │   ├── userPreferences.js  # User pref loading
│   │   ├── boostScoring.js     # Personalization math
│   │   └── globalTrends.js     # Platform baseline
│   └── ingestion/
│       ├── index.js      # Ingestion exports
│       ├── users.js      # User profile ingestion (141)
│       ├── products.js   # Product ingestion (101)
│       └── behavior.js   # Behavior ingestion (132)
└── README.md
```

## ChromaDB Collections

| Collection | Purpose | Classification | Ingestion |
|------------|---------|----------------|-----------|
| art_metadata | Products | 101 (Active Products) | products.js |
| user_profiles | Users | 141 (User Preferences) | users.js |
| user_interactions | Behavior/Orders | 131-132 | behavior.js |
| site_content | Articles | 402 (Published Articles) | - |
| event_data | Events | 302 (Event Performance) | - |
| learning_feedback | AI learning | - | - |

See `/var/www/staging/leo/DATA_CLASSIFICATION.md` for full classification system.

## Dependencies

- `chromadb` - Vector database client
- `@chroma-core/default-embed` - Embedding function
- `winston` - Logging

## Configuration

Environment variables (in api-service .env):
- `CHROMA_HOST` - ChromaDB host (default: localhost)
- `CHROMA_PORT` - ChromaDB port (default: 8000)

---

## Migration from `/leo/` to `/api-service/src/modules/leo/`

The Leo AI system was migrated from a standalone service to an integrated API module.

### File Mapping (Old → New)

| Old Location | New Location | Status |
|--------------|--------------|--------|
| `/leo/src/services/searchService-v2.js` | `services/search.js` | ✅ Migrated |
| `/leo/src/utils/searchFilters.js` | `services/utils/searchFilters.js` | ✅ Migrated |
| `/leo/src/utils/userPreferences.js` | `services/utils/userPreferences.js` | ✅ Migrated |
| `/leo/src/utils/boostScoring.js` | `services/utils/boostScoring.js` | ✅ Migrated |
| `/leo/src/utils/globalTrends.js` | `services/utils/globalTrends.js` | ✅ Migrated |
| `/leo/src/utils/logger.js` | `services/logger.js` | ✅ Migrated |
| `/leo/src/core/vectorDatabase.js` | `services/vectorDB.js` | ✅ Migrated |
| `/leo/ingestion/ingest-users.js` | `services/ingestion/users.js` | ✅ Migrated |
| `/leo/ingestion/ingest-products.js` | `services/ingestion/products.js` | ✅ Migrated |
| `/leo/ingestion/ingest-orders.js` | `services/ingestion/orders.js` | ⏳ Pending |
| `/leo/ingestion/ingest-image-analysis.js` | `services/ingestion/images.js` | ⏳ Pending |
| `/leo/src/core/centralBrain.js` | - | ⏳ Future (Brain Phase) |
| `/leo/src/services/truthExtractor.js` | - | ⏳ Future (Brain Phase) |
| `/leo/src/core/truthVectorDatabase.js` | - | ⏳ Future (Brain Phase) |
| `/leo/vacuum-ingestion.js` | - | 🗑️ Deprecated |
| `/leo/src/server.js` | - | 🗑️ Replaced by api-service |

### Documentation (Stays in `/leo/`)

| File | Purpose |
|------|---------|
| `DATA_CLASSIFICATION.md` | Dewey Decimal classification system |
| `CURRENT_SYSTEM.md` | System architecture overview |
| `INGESTION_OVERHAUL_PLAN.md` | Phase 0 data foundation plan |
| `SMART_SEARCH_README.md` | SearchService v2 guide |
| `COMPONENTS_QUICK_REF.md` | Component usage patterns |

### Key Changes

1. **Database Connection**: Uses shared `api-service/config/db.js` pool instead of separate credentials
2. **API Routes**: Mounted at `/api/v2/leo/*` via `server.js`
3. **Authentication**: Uses `requireAuth` middleware from api-service
4. **Logging**: Uses Winston logger configured for api-service
5. **Background Jobs**: Product ingestion runs async with status polling

### What's Deprecated

- `/leo/src/server.js` - Standalone Leo server (now integrated)
- `/leo/vacuum-ingestion.js` - Bulk vacuum script (replaced by targeted ingestion)
- Direct `/api/leo/*` routes - Use `/api/v2/leo/*` instead

### Dashboard

- **Menu**: Leo AI section in admin sidebar (`/dashboard/leo`)
- **Sync Page**: `/dashboard/leo/sync` - Manual ingestion triggers
- **Config**: `modules/dashboard/config/menuConfig.js`
