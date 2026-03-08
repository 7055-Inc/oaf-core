# Behavior Tracking Module

Collects and stores user behavioral data in ClickHouse for analytics and AI-powered personalization.

## Features

- **High-Volume Event Tracking** - Handles millions of events efficiently
- **Flexible Schema** - JSON event_data field supports any event type
- **Real-Time Ingestion** - Async inserts for minimal latency
- **User Behavior Summaries** - Aggregated data for Leo AI enrichment
- **Session Tracking** - Links events across user sessions

## Endpoints

### Public Endpoints (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v2/behavior/track` | Track single event |
| POST | `/api/v2/behavior/track/batch` | Track multiple events |
| GET | `/api/v2/behavior/health` | Health check |

### Admin Endpoints (Auth Required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v2/behavior/admin/user/:userId` | Get user behavior summary |
| GET | `/api/v2/behavior/admin/user/:userId/events` | Get user events |

## Event Types

Standard event types (extensible):

| Type | Category | Description |
|------|----------|-------------|
| `page_view` | navigation | Page load |
| `scroll` | engagement | Scroll depth tracking |
| `click` | engagement | Element click |
| `product_view` | commerce | Product page view |
| `add_to_cart` | commerce | Cart addition |
| `purchase` | commerce | Completed purchase |
| `search` | navigation | Search query |
| `filter` | engagement | Filter usage |
| `sensor` | device | Mobile sensor data |

## Usage

### Track Event

```javascript
POST /api/v2/behavior/track
{
  "eventType": "product_view",
  "eventCategory": "commerce",
  "eventAction": "view",
  "eventData": {
    "product_id": 12345,
    "category_id": 67,
    "price": 49.99
  },
  "sessionId": "abc123",
  "pageUrl": "https://example.com/products/12345",
  "deviceType": "mobile"
}
```

### Track Batch

```javascript
POST /api/v2/behavior/track/batch
{
  "events": [
    { "eventType": "scroll", "eventData": { "scroll_depth": 50 } },
    { "eventType": "click", "eventData": { "element": "add-to-cart" } }
  ]
}
```

## Architecture

```
Browser/App → API → ClickHouse (behavior.events)
                         ↓
                    Aggregation
                         ↓
                    Leo Ingestion
                         ↓
                    ChromaDB (enriched profiles)
```

## Database

- **Database**: `behavior`
- **Tables**: `events`, `sessions`
- **Retention**: 2 years (configurable via TTL)
- **Partitioning**: Monthly by timestamp

## Configuration

Environment variables (in api-service .env):

```
CLICKHOUSE_URL=http://localhost:8123
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
```
