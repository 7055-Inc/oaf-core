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

### Future Endpoints (Brain Phase)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v2/leo/ask` | Required | "Why was I charged?" |
| POST | `/api/v2/leo/support` | Required | AI customer service |
| POST | `/api/v2/leo/admin/ingest` | Admin | Trigger data ingestion |

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
│   └── ingestion/        # Data ingestion (future)
└── README.md
```

## ChromaDB Collections

| Collection | Purpose | Classification |
|------------|---------|----------------|
| art_metadata | Products | 101 |
| user_profiles | Users | 141 |
| user_interactions | Behavior | 132 |
| site_content | Articles | 402 |
| event_data | Events | - |
| learning_feedback | AI learning | - |

## Dependencies

- `chromadb` - Vector database client
- `@chroma-core/default-embed` - Embedding function
- `winston` - Logging

## Configuration

Environment variables (in api-service .env):
- `CHROMA_HOST` - ChromaDB host (default: localhost)
- `CHROMA_PORT` - ChromaDB port (default: 8000)
