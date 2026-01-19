/**
 * Catalog API Client
 * 
 * Frontend wrapper functions for the v2 Catalog API.
 * ALL functions call v2 endpoints ONLY - no legacy endpoints.
 */

import { authenticatedApiRequest } from '../auth';
import { getApiUrl } from '../config';

const CATALOG_BASE = '/api/v2/catalog';

// =============================================================================
// PRODUCTS - LIST & READ
// =============================================================================

/**
 * List products
 * @param {Object} options - Query options
 * @returns {Promise<{products: Array, meta: Object}>}
 */
export async function fetchProducts(options = {}) {
  const {
    view = 'my',
    include = 'inventory,images,children',
    status,
    search,
    category_id,
    page = 1,
    limit = 50,
    sort = 'created_at',
    order = 'desc',
  } = options;
  
  const params = new URLSearchParams({
    view,
    include,
    page: String(page),
    limit: String(limit),
    sort,
    order,
  });
  
  if (status) params.append('status', status);
  if (search) params.append('search', search);
  if (category_id) params.append('category_id', category_id);
  
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/products?${params}`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch products');
  }
  
  const data = await response.json();
  return {
    products: data.data || [],
    meta: data.meta || {},
  };
}

/**
 * Fetch a single product by ID
 * @param {number} productId
 * @param {string} [include='inventory,images,children']
 * @returns {Promise<Object>}
 */
export async function fetchProduct(productId, include = 'inventory,images,children') {
  const params = new URLSearchParams({ include });
  
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/products/${productId}?${params}`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch product');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Fetch product statistics
 * @param {'my'|'all'} [view='my']
 * @returns {Promise<Object>}
 */
export async function fetchProductStats(view = 'my') {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/products/stats?view=${view}`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch stats');
  }
  
  const data = await response.json();
  return data.data;
}

// =============================================================================
// PRODUCTS - CREATE
// =============================================================================

/**
 * Create a new product
 * @param {Object} productData - Product data
 * @returns {Promise<Object>} Created product
 */
export async function createProduct(productData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/products`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create product');
  }
  
  const data = await response.json();
  return data.data;
}

// =============================================================================
// PRODUCTS - UPDATE
// =============================================================================

/**
 * Update a product
 * @param {number} productId - Product ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated product
 */
export async function updateProduct(productId, updates) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/products/${productId}`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update product');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Update product status
 * @param {number} productId - Product ID
 * @param {string} status - New status
 * @returns {Promise<Object>} Updated product
 */
export async function updateProductStatus(productId, status) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/products/${productId}/status`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update status');
  }
  
  const data = await response.json();
  return data.data;
}

// =============================================================================
// PRODUCTS - DELETE
// =============================================================================

/**
 * Delete a product
 * @param {number} productId - Product ID
 * @returns {Promise<void>}
 */
export async function deleteProduct(productId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/products/${productId}`),
    { method: 'DELETE' }
  );
  
  if (!response.ok && response.status !== 204) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to delete product');
  }
}

/**
 * Bulk delete products
 * @param {number[]} productIds - Array of product IDs
 * @returns {Promise<{deleted: number}>}
 */
export async function deleteProducts(productIds) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/products/bulk-delete`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_ids: productIds }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to delete products');
  }
  
  const data = await response.json();
  return data.data;
}

// =============================================================================
// PRODUCTS - IMAGES
// =============================================================================

/**
 * Get product images
 * @param {number} productId - Product ID
 * @returns {Promise<Array>}
 */
export async function fetchProductImages(productId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/products/${productId}/images`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch images');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Upload product image
 * @param {number} productId - Product ID
 * @param {File} file - Image file
 * @param {boolean} isPrimary - Set as primary image
 * @param {number} order - Display order
 * @returns {Promise<Object>} Created image
 */
export async function uploadProductImage(productId, file, isPrimary = false, order = 0) {
  const formData = new FormData();
  formData.append('image', file);
  formData.append('is_primary', String(isPrimary));
  formData.append('order', String(order));
  
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/products/${productId}/images`),
    {
      method: 'POST',
      body: formData,
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to upload image');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Delete product image
 * @param {number} productId - Product ID
 * @param {number} imageId - Image ID
 * @returns {Promise<void>}
 */
export async function deleteProductImage(productId, imageId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/products/${productId}/images/${imageId}`),
    { method: 'DELETE' }
  );
  
  if (!response.ok && response.status !== 204) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to delete image');
  }
}

/**
 * Set primary image
 * @param {number} productId - Product ID
 * @param {number} imageId - Image ID
 * @returns {Promise<void>}
 */
export async function setPrimaryImage(productId, imageId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/products/${productId}/images/${imageId}/primary`),
    { method: 'PATCH' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to set primary image');
  }
}

// =============================================================================
// PRODUCTS - INVENTORY
// =============================================================================

/**
 * Get product inventory
 * @param {number} productId - Product ID
 * @returns {Promise<Object>}
 */
export async function fetchProductInventory(productId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/products/${productId}/inventory`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch inventory');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Update product inventory
 * @param {number} productId - Product ID
 * @param {Object} data - Inventory data
 * @returns {Promise<Object>}
 */
export async function updateProductInventory(productId, data) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/products/${productId}/inventory`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update inventory');
  }
  
  const data2 = await response.json();
  return data2.data;
}

// =============================================================================
// CATEGORIES
// =============================================================================

/**
 * Fetch categories
 * @param {'list'|'tree'|'flat'} [format='list'] - Response format
 * @returns {Promise<Array>}
 */
export async function fetchCategories(format = 'list') {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/categories?format=${format}`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch categories');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Fetch a single category
 * @param {number} categoryId - Category ID
 * @returns {Promise<Object>}
 */
export async function fetchCategory(categoryId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/categories/${categoryId}`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch category');
  }
  
  const data = await response.json();
  return data.data;
}

// =============================================================================
// PUBLIC ENDPOINTS (no auth required)
// =============================================================================

/**
 * Fetch public products (no auth required)
 * @param {Object} options - Query options
 * @returns {Promise<{products: Array, meta: Object}>}
 */
export async function fetchPublicProducts(options = {}) {
  const {
    vendor_id,
    category_id,
    search,
    page = 1,
    limit = 20,
    sort = 'created_at',
    order = 'desc',
  } = options;
  
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sort,
    order,
  });
  
  if (vendor_id) params.append('vendor_id', vendor_id);
  if (category_id) params.append('category_id', category_id);
  if (search) params.append('search', search);
  
  const response = await fetch(getApiUrl(`${CATALOG_BASE}/public/products?${params}`));
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch products');
  }
  
  const data = await response.json();
  return {
    products: data.data || [],
    meta: data.meta || {},
  };
}

/**
 * Fetch public product by ID (no auth required)
 * @param {number} productId - Product ID
 * @returns {Promise<Object>}
 */
export async function fetchPublicProduct(productId) {
  const response = await fetch(getApiUrl(`${CATALOG_BASE}/public/products/${productId}`));
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch product');
  }
  
  const data = await response.json();
  return data.data;
}

// =============================================================================
// COLLECTIONS
// =============================================================================

/**
 * Fetch user's collections
 * @param {'list'|'tree'} [format='list'] - Response format
 * @returns {Promise<Array>}
 */
export async function fetchCollections(format = 'list') {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/collections?format=${format}`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch collections');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Fetch single collection
 * @param {number} collectionId - Collection ID
 * @returns {Promise<Object>}
 */
export async function fetchCollection(collectionId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/collections/${collectionId}`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch collection');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Create a new collection
 * @param {Object} collectionData - Collection data
 * @returns {Promise<Object>}
 */
export async function createCollection(collectionData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/collections`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collectionData),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create collection');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Update a collection
 * @param {number} collectionId - Collection ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>}
 */
export async function updateCollection(collectionId, updates) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/collections/${collectionId}`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update collection');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Reorder collections
 * @param {Array} order - Array of {id, display_order}
 * @returns {Promise<void>}
 */
export async function reorderCollections(order) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/collections/reorder`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to reorder collections');
  }
}

/**
 * Delete a collection
 * @param {number} collectionId - Collection ID
 * @returns {Promise<void>}
 */
export async function deleteCollection(collectionId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/collections/${collectionId}`),
    { method: 'DELETE' }
  );
  
  if (!response.ok && response.status !== 204) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to delete collection');
  }
}

/**
 * Get products in a collection
 * @param {number} collectionId - Collection ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
export async function fetchCollectionProducts(collectionId, options = {}) {
  const { page = 1, limit = 50 } = options;
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/collections/${collectionId}/products?${params}`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch collection products');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Add product to collection
 * @param {number} collectionId - Collection ID
 * @param {number} productId - Product ID
 * @returns {Promise<Object>}
 */
export async function addProductToCollection(collectionId, productId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/collections/${collectionId}/products`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to add product to collection');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Remove product from collection
 * @param {number} collectionId - Collection ID
 * @param {number} productId - Product ID
 * @returns {Promise<void>}
 */
export async function removeProductFromCollection(collectionId, productId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/collections/${collectionId}/products/${productId}`),
    { method: 'DELETE' }
  );
  
  if (!response.ok && response.status !== 204) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to remove product from collection');
  }
}

/**
 * Fetch public collection (no auth required)
 * @param {number} collectionId - Collection ID
 * @returns {Promise<Object>}
 */
export async function fetchPublicCollection(collectionId) {
  const response = await fetch(getApiUrl(`${CATALOG_BASE}/public/collections/${collectionId}`));
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch collection');
  }
  
  const data = await response.json();
  return data.data;
}

// =============================================================================
// IMPORT/EXPORT
// =============================================================================

/**
 * Export products to CSV/Excel
 * @param {Object} options - Export options
 * @returns {Promise<Blob>}
 */
export async function exportProducts(options = {}) {
  const {
    fields = ['sku', 'name', 'price'],
    status = 'active',
    category_id,
    format = 'csv',
    view = 'my'
  } = options;

  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/export`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields, status, category_id, format, view }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to export products');
  }
  
  return response.blob();
}

/**
 * Download import template
 * @param {string} type - Template type (new_products, update_products)
 * @param {string} format - Format (csv, xlsx)
 * @returns {Promise<Blob>}
 */
export async function downloadTemplate(type = 'update_products', format = 'xlsx') {
  const params = new URLSearchParams({ type, format });
  
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/export/template?${params}`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to download template');
  }
  
  return response.blob();
}

/**
 * Get import job status
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>}
 */
export async function getImportStatus(jobId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/import/status/${jobId}`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get import status');
  }
  
  const data = await response.json();
  return data.data;
}
