# Catalog Module

Product catalog management - products, categories, collections, and import/export.

## API Endpoints

Base path: `/api/v2/catalog`

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products` | List products (with filtering, pagination) |
| GET | `/products/stats` | Get product statistics |
| GET | `/products/:id` | Get single product |
| POST | `/products` | Create product |
| PUT | `/products/:id` | Update product (full) |
| PATCH | `/products/:id` | Update product (partial) |
| PATCH | `/products/:id/status` | Update product status |
| DELETE | `/products/:id` | Delete product (soft delete) |
| POST | `/products/bulk-delete` | Bulk delete products |

### Product Images

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products/:id/images` | Get product images |
| POST | `/products/:id/images` | Upload image |
| DELETE | `/products/:id/images/:imageId` | Delete image |
| PATCH | `/products/:id/images/:imageId/primary` | Set primary image |

### Product Inventory

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/products/:id/inventory` | Get inventory |
| PATCH | `/products/:id/inventory` | Update inventory |

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/categories` | List categories (list/tree/flat format) |
| GET | `/categories/:id` | Get single category |

### Collections (User/Vendor)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/collections` | List user's collections |
| GET | `/collections/:id` | Get single collection |
| POST | `/collections` | Create collection |
| PUT | `/collections/:id` | Update collection |
| PATCH | `/collections/reorder` | Reorder collections |
| DELETE | `/collections/:id` | Delete collection |
| GET | `/collections/:id/products` | Get products in collection |
| POST | `/collections/:id/products` | Add product to collection |
| DELETE | `/collections/:id/products/:productId` | Remove product from collection |

### Import/Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/export` | Export products to CSV/Excel |
| GET | `/export/template` | Download import template |
| GET | `/import/status/:jobId` | Get import job status |

### Public Endpoints (no auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/public/products` | List active products |
| GET | `/public/products/:id` | Get single active product |
| GET | `/public/collections/:id` | Get public collection with products |

## Module Structure

```
catalog/
├── index.js              # Module exports
├── routes.js             # Express routes
├── services/
│   ├── index.js          # Service exports
│   ├── product.js        # Product CRUD operations
│   ├── category.js       # Category operations
│   ├── collection.js     # User collection operations
│   └── importExport.js   # CSV/Excel import/export
└── README.md             # This file
```

## Frontend Integration

### API Client (`lib/catalog/`)

```javascript
import { 
  fetchProducts, 
  createProduct, 
  updateProduct,
  fetchCollections,
  exportProducts 
} from '../lib/catalog';

// List products
const { products, meta } = await fetchProducts({ view: 'my', page: 1 });

// Create product
const product = await createProduct({ name: 'New Product', sku: 'SKU-001', price: 29.99 });

// Export products
const blob = await exportProducts({ fields: ['sku', 'name', 'price'], format: 'xlsx' });
```

### UI Components

**Dashboard** (`modules/dashboard/components/catalog/`):
- `ProductList` - Product listing with filters
- `ProductForm` - Create/edit product form
- `CollectionsManager` - Manage user collections
- `CatalogImportExport` - Bulk import/export

**Public** (`components/catalog/`):
- `ProductCard` - Single product card
- `ProductGrid` - Grid of product cards

## Response Format

All endpoints return consistent JSON:

```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 50, "total": 100, "totalPages": 2 },
  "message": "Optional success message"
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Descriptive error message",
    "status": 400
  }
}
```

## Authentication

Most endpoints require authentication via `requireAuth` middleware from the auth module. Public endpoints (`/public/*`) do not require authentication.

Admin-only operations (view all products, bulk operations) require admin role check via `isAdmin()` helper.
