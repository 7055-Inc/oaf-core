# CSV Module

Bulk import/export operations via CSV and Excel files.

## Overview

This module handles:
- File uploads for bulk data import
- Background job processing via Bull queue
- Template generation for different data types
- Saved report configurations

**Key Feature:** The worker runs within the API server process and uses module services directly (e.g., `productService.create()`) instead of making HTTP API calls. This eliminates JWT/CSRF overhead and simplifies the architecture.

## API Endpoints

Base path: `/api/v2/csv`

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload` | Upload CSV/Excel file for processing |
| GET | `/jobs/:jobId` | Get job status |
| DELETE | `/jobs/:jobId` | Delete a job |
| GET | `/templates/:jobType` | Download import template |
| GET | `/reports` | List saved reports |
| POST | `/reports` | Save a report configuration |
| DELETE | `/reports/:reportId` | Delete a saved report |

## Job Types

| Type | Permission | Description |
|------|------------|-------------|
| `product_upload` | vendor | Create/update products |
| `inventory_upload` | vendor | Update product inventory |
| `user_upload` | admin | Import users (not yet implemented) |
| `event_upload` | vendor | Import events (not yet implemented) |

## Module Structure

```
csv/
├── index.js              # Module exports
├── routes.js             # API endpoints
├── worker.js             # Bull queue consumer
├── services/
│   ├── index.js          # Service exports
│   ├── queue.js          # Bull queue setup
│   ├── jobs.js           # Job tracking
│   ├── parsers.js        # CSV/Excel parsing
│   ├── processor.js      # Main job router
│   ├── products.js       # Product import (uses catalog module)
│   ├── inventory.js      # Inventory import (uses catalog module)
│   ├── templates.js      # Template generation
│   └── reports.js        # Saved reports CRUD
└── README.md
```

## How It Works

1. **Upload**: User uploads CSV/Excel file via `/upload` endpoint
2. **Queue**: Job is added to Bull queue with file path and metadata
3. **Process**: Worker picks up job, parses file, calls module services directly
4. **Status**: Progress tracked in database, queryable via `/jobs/:jobId`

## Direct Service Integration

The worker uses other module services directly:

```javascript
// Product import calls catalog service
const { productService } = require('../catalog');
await productService.create(vendorId, productData);
await productService.update(productId, vendorId, productData);

// Inventory update calls catalog service
await productService.updateInventory(productId, { qty_on_hand: quantity });
```

This approach:
- Eliminates HTTP call overhead
- No JWT refresh logic needed
- No CSRF token handling
- Shares database connection pool
- Simpler error handling

## Worker Initialization

The worker is started when the API server starts:

```javascript
// In server.js
const csvModule = require('./modules/csv');
csvModule.initWorker();
```

## Database Tables

- `csv_upload_jobs` - Job tracking
- `csv_upload_errors` - Row-level errors
- `csv_saved_reports` - Saved report configurations

## Response Format

All endpoints return standard JSON:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

## Upload Response

```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "totalRows": 100
  },
  "message": "File uploaded successfully. Processing 100 rows."
}
```

## Job Status Response

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "product_upload",
    "status": "completed",
    "totalRows": 100,
    "processedRows": 98,
    "failedRows": 2,
    "progress": 100,
    "errors": [
      { "row_num": 5, "error_message": "Invalid SKU", "raw_data": "..." }
    ]
  }
}
```
