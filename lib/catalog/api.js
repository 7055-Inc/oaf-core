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
// VARIATIONS (legacy product routes - v2 catalog variation endpoints TBD)
// =============================================================================

/**
 * Fetch all variation types for current user
 * @returns {Promise<Array>}
 */
export async function fetchVariationTypes() {
  const response = await authenticatedApiRequest(
    getApiUrl('products/variations/types'),
    { method: 'GET' }
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to fetch variation types');
  }
  return response.json();
}

/**
 * Create variation type (e.g. Color, Size)
 * @param {string} variationName
 * @returns {Promise<Object>}
 */
export async function createVariationType(variationName) {
  const response = await authenticatedApiRequest(
    getApiUrl('products/variations/types'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variation_name: variationName.trim() }),
    }
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to create variation type');
  }
  return response.json();
}

/**
 * Fetch variation values for a type (optionally scoped to product)
 * @param {number} typeId
 * @param {number} [productId]
 * @returns {Promise<Array>}
 */
export async function fetchVariationValues(typeId, productId) {
  const url = productId
    ? `products/variations/types/${typeId}/values?product_id=${productId}`
    : `products/variations/types/${typeId}/values`;
  const response = await authenticatedApiRequest(getApiUrl(url), { method: 'GET' });
  if (!response.ok) return [];
  return response.json();
}

/**
 * Create variation value for a type and product
 * @param {number} typeId
 * @param {string} valueName
 * @param {number} productId
 * @returns {Promise<Object>}
 */
export async function createVariationValue(typeId, valueName, productId) {
  const response = await authenticatedApiRequest(
    getApiUrl('products/variations/values'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variation_type_id: typeId,
        value_name: valueName.trim(),
        product_id: productId,
      }),
    }
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to add variation value');
  }
  return response.json();
}

/**
 * Delete variation type (and its values)
 * @param {number} typeId
 * @returns {Promise<void>}
 */
export async function deleteVariationType(typeId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`products/variations/types/${typeId}`),
    { method: 'DELETE', headers: { 'Content-Type': 'application/json' } }
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to delete variation type');
  }
}

/**
 * Create product-variation link (associate child product with type+value)
 * @param {number} productId
 * @param {number} variationTypeId
 * @param {number} variationValueId
 * @returns {Promise<Object>}
 */
export async function createProductVariationRecord(productId, variationTypeId, variationValueId) {
  const response = await authenticatedApiRequest(
    getApiUrl('products/variations'),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        variation_type_id: variationTypeId,
        variation_value_id: variationValueId,
      }),
    }
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to create variation record');
  }
  return response.json();
}

/**
 * Upload multiple product images (legacy bulk upload - returns URLs)
 * Used by variation bulk editor. v2 has single-image upload per product.
 * @param {number|string} productId
 * @param {FileList|File[]} files
 * @returns {Promise<{urls: string[]}>}
 */
export async function uploadProductImagesBulk(productId, files) {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('images', file));
  const response = await authenticatedApiRequest(
    getApiUrl(`products/upload?product_id=${productId}`),
    { method: 'POST', body: formData }
  );
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Failed to upload images');
  }
  const data = await response.json();
  return { urls: data.urls || [] };
}

// =============================================================================
// PRODUCTS - INVENTORY
// =============================================================================

/**
 * Get product inventory
 * @param {number} productId - Product ID
 * @returns {Promise<Object>}
 */
export async function fetchInventory(productId) {
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
 * @param {Object} inventoryData - Inventory updates { qty_on_hand, reorder_qty, change_type, reason }
 * @returns {Promise<Object>}
 */
export async function updateInventory(productId, inventoryData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/products/${productId}/inventory`),
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inventoryData),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update inventory');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Get inventory history for a specific product
 * @param {number} productId - Product ID
 * @returns {Promise<Array>}
 */
export async function fetchInventoryHistory(productId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/products/${productId}/inventory/history`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch inventory history');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Get all inventory history for current user's products
 * @param {Object} options - Query options { page, limit, search }
 * @returns {Promise<Array>}
 */
export async function fetchAllInventoryHistory(options = {}) {
  const { page = 1, limit = 100, search } = options;
  
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.append('search', search);
  
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/inventory/history?${params}`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch inventory history');
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
 * @param {'list'|'tree'|'flat'|'all'} [format='list'] - Response format
 * @returns {Promise<Array|Object>}
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
 * Fetch all categories with hierarchical and flat structures
 * @returns {Promise<{categories: Array, flat_categories: Array}>}
 */
export async function fetchAllCategories() {
  return fetchCategories('all');
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

/**
 * Create a new category (admin only)
 * @param {Object} categoryData - Category data { name, parent_id, description }
 * @returns {Promise<Object>}
 */
export async function createCategory(categoryData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/categories`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categoryData),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create category');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Update a category (admin only)
 * @param {number} categoryId - Category ID
 * @param {Object} updates - Update data { name, parent_id, description }
 * @returns {Promise<Object>}
 */
export async function updateCategory(categoryId, updates) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/categories/${categoryId}`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update category');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Delete a category (admin only)
 * @param {number} categoryId - Category ID
 * @returns {Promise<void>}
 */
export async function deleteCategory(categoryId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/categories/${categoryId}`),
    { method: 'DELETE' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to delete category');
  }
}

/**
 * Fetch category content (hero image, banner, description, featured artists)
 * @param {number} categoryId - Category ID
 * @returns {Promise<Object|null>}
 */
export async function fetchCategoryContent(categoryId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/categories/${categoryId}/content`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch category content');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Update category content (admin only)
 * @param {number} categoryId - Category ID
 * @param {Object} contentData - Content data
 * @returns {Promise<Object>}
 */
export async function updateCategoryContent(categoryId, contentData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/categories/${categoryId}/content`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contentData),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update category content');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Fetch category SEO data
 * @param {number} categoryId - Category ID
 * @returns {Promise<Object|null>}
 */
export async function fetchCategorySeo(categoryId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/categories/${categoryId}/seo`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch category SEO');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Update category SEO data (admin only)
 * @param {number} categoryId - Category ID
 * @param {Object} seoData - SEO data
 * @returns {Promise<Object>}
 */
export async function updateCategorySeo(categoryId, seoData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/categories/${categoryId}/seo`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seoData),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update category SEO');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Fetch products in a category
 * @param {number} categoryId - Category ID
 * @returns {Promise<Array>}
 */
export async function fetchCategoryProducts(categoryId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/categories/${categoryId}/products`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch category products');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Add a product to a category (admin only)
 * @param {number} categoryId - Category ID
 * @param {number} productId - Product ID
 * @returns {Promise<Object>}
 */
export async function addCategoryProduct(categoryId, productId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/categories/${categoryId}/products`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId }),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to add product to category');
  }
  
  return response.json();
}

/**
 * Remove a product from a category (admin only)
 * @param {number} categoryId - Category ID
 * @param {number} productId - Product ID
 * @returns {Promise<void>}
 */
export async function removeCategoryProduct(categoryId, productId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/categories/${categoryId}/products/${productId}`),
    { method: 'DELETE' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to remove product from category');
  }
}

/**
 * Search products for adding to categories (admin only)
 * @param {string} query - Search query
 * @param {number} [categoryId] - Exclude products already in this category
 * @param {number} [limit=20] - Result limit
 * @returns {Promise<Array>}
 */
export async function searchCategoryProducts(query, categoryId = null, limit = 20) {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  if (categoryId) params.append('category_id', String(categoryId));
  
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/categories/search-products?${params}`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to search products');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Search vendors for featuring in categories (admin only)
 * @param {string} query - Search query
 * @param {number} [limit=20] - Result limit
 * @returns {Promise<Array>}
 */
export async function searchCategoryVendors(query, limit = 20) {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/categories/search-vendors?${params}`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to search vendors');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Fetch category change log (admin only)
 * @param {number} [limit=50] - Number of records
 * @param {number} [offset=0] - Offset
 * @returns {Promise<Array>}
 */
export async function fetchCategoryChangeLog(limit = 50, offset = 0) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  
  const response = await authenticatedApiRequest(
    getApiUrl(`${CATALOG_BASE}/categories/change-log?${params}`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch change log');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Upload category images (admin only)
 * @param {FileList|File[]} files - Image files
 * @param {number|string} [categoryId] - Category ID or 'new'
 * @returns {Promise<{urls: string[]}>}
 */
export async function uploadCategoryImages(files, categoryId = null) {
  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append('images', file));
  
  let url = `${CATALOG_BASE}/categories/upload`;
  if (categoryId) url += `?category_id=${categoryId}`;
  
  const response = await authenticatedApiRequest(
    getApiUrl(url),
    { method: 'POST', body: formData }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to upload images');
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

// =============================================================================
// WALMART CONNECTOR (v2 catalog addon)
// =============================================================================

const WALMART_BASE = `${CATALOG_BASE}/walmart`;

export async function fetchWalmartCategories() {
  const response = await authenticatedApiRequest(getApiUrl(`${WALMART_BASE}/categories`), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch Walmart categories');
  return data;
}

export async function fetchWalmartProducts() {
  const response = await authenticatedApiRequest(getApiUrl(`${WALMART_BASE}/products`), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch Walmart products');
  return data;
}

export async function fetchWalmartProduct(productId) {
  const response = await authenticatedApiRequest(getApiUrl(`${WALMART_BASE}/products/${productId}`), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch product');
  return data;
}

export async function saveWalmartProduct(productId, body) {
  const response = await authenticatedApiRequest(getApiUrl(`${WALMART_BASE}/products/${productId}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to save product');
  return data;
}

export async function removeWalmartProduct(productId) {
  const response = await authenticatedApiRequest(getApiUrl(`${WALMART_BASE}/products/${productId}`), { method: 'DELETE' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to remove product');
  return data;
}

export async function fetchWalmartAdminProducts(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = qs ? `${WALMART_BASE}/admin/products?${qs}` : `${WALMART_BASE}/admin/products`;
  const response = await authenticatedApiRequest(getApiUrl(url), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch products');
  return data;
}

export async function activateWalmartProduct(productId) {
  const response = await authenticatedApiRequest(getApiUrl(`${WALMART_BASE}/admin/products/${productId}/activate`), { method: 'POST' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to activate');
  return data;
}

export async function pauseWalmartProduct(productId) {
  const response = await authenticatedApiRequest(getApiUrl(`${WALMART_BASE}/admin/products/${productId}/pause`), { method: 'POST' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to pause');
  return data;
}

export async function updateWalmartAdminProduct(productId, body) {
  const response = await authenticatedApiRequest(getApiUrl(`${WALMART_BASE}/admin/products/${productId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to update');
  return data;
}

// =============================================================================
// TIKTOK CONNECTOR (v2 catalog addon)
// =============================================================================

const TIKTOK_BASE = `${CATALOG_BASE}/tiktok`;

export async function fetchTikTokShops() {
  const response = await authenticatedApiRequest(getApiUrl(`${TIKTOK_BASE}/shops`), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch TikTok shops');
  return data;
}

export async function fetchTikTokProducts() {
  const response = await authenticatedApiRequest(getApiUrl(`${TIKTOK_BASE}/products`), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch TikTok products');
  return data;
}

export async function saveTikTokProduct(productId, body) {
  const response = await authenticatedApiRequest(getApiUrl(`${TIKTOK_BASE}/products/${productId}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to save TikTok product');
  return data;
}

export async function tiktokOAuthAuthorize() {
  const response = await authenticatedApiRequest(getApiUrl(`${TIKTOK_BASE}/oauth/authorize`), { method: 'GET' });
  const data = await response.json();
  return data;
}

export async function fetchTikTokAllocations() {
  const response = await authenticatedApiRequest(getApiUrl(`${TIKTOK_BASE}/inventory`), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch TikTok allocations');
  return data;
}

export async function saveTikTokAllocation(productId, allocated_quantity) {
  const response = await authenticatedApiRequest(getApiUrl(`${TIKTOK_BASE}/inventory/${productId}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allocated_quantity }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to update allocation');
  return data;
}

export async function bulkTikTokAllocations(allocations) {
  const response = await authenticatedApiRequest(getApiUrl(`${TIKTOK_BASE}/allocations/bulk`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ allocations }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to update allocations');
  return data;
}

export async function fetchTikTokLogs(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = qs ? `${TIKTOK_BASE}/logs?${qs}` : `${TIKTOK_BASE}/logs`;
  const response = await authenticatedApiRequest(getApiUrl(url), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch logs');
  return data;
}

// TikTok admin (manage_system)
export async function fetchTikTokAdminProducts(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = qs ? `${TIKTOK_BASE}/admin/products?${qs}` : `${TIKTOK_BASE}/admin/products`;
  const response = await authenticatedApiRequest(getApiUrl(url), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch products');
  return data;
}

export async function activateTikTokProduct(productId) {
  const response = await authenticatedApiRequest(getApiUrl(`${TIKTOK_BASE}/admin/products/${productId}/activate`), { method: 'POST' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to activate');
  return data;
}

export async function pauseTikTokProduct(productId) {
  const response = await authenticatedApiRequest(getApiUrl(`${TIKTOK_BASE}/admin/products/${productId}/pause`), { method: 'POST' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to pause');
  return data;
}

export async function updateTikTokAdminProduct(productId, body) {
  const response = await authenticatedApiRequest(getApiUrl(`${TIKTOK_BASE}/admin/products/${productId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to update');
  return data;
}

// =============================================================================
// TIKTOK CORPORATE (v2 catalog addon - Brakebee corporate shop)
// =============================================================================

const TIKTOK_CORPORATE_BASE = `${TIKTOK_BASE}/corporate`;

/**
 * Fetch user's corporate product submissions
 * @returns {Promise<Object>} Corporate products list
 */
export async function fetchTikTokCorporateProducts() {
  const response = await authenticatedApiRequest(getApiUrl(`${TIKTOK_CORPORATE_BASE}/products`), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch corporate products');
  return data;
}

/**
 * Fetch single corporate product
 * @param {number} productId - Product ID
 * @returns {Promise<Object>} Corporate product details
 */
export async function fetchTikTokCorporateProduct(productId) {
  const response = await authenticatedApiRequest(getApiUrl(`${TIKTOK_CORPORATE_BASE}/products/${productId}`), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch corporate product');
  return data;
}

/**
 * Submit/update corporate product for approval
 * @param {number} productId - Product ID
 * @param {Object} body - Corporate product data
 * @returns {Promise<Object>} Result
 */
export async function saveTikTokCorporateProduct(productId, body) {
  const response = await authenticatedApiRequest(getApiUrl(`${TIKTOK_CORPORATE_BASE}/products/${productId}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to save corporate product');
  return data;
}

/**
 * Remove corporate product (60-day cooldown)
 * @param {number} productId - Product ID
 * @returns {Promise<Object>} Result with cooldown_ends_at
 */
export async function removeTikTokCorporateProduct(productId) {
  const response = await authenticatedApiRequest(getApiUrl(`${TIKTOK_CORPORATE_BASE}/products/${productId}`), { method: 'DELETE' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to remove corporate product');
  return data;
}

// TikTok Corporate Admin (manage_system)
export async function fetchTikTokCorporateAdminProducts(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = qs ? `${TIKTOK_BASE}/admin/corporate/products?${qs}` : `${TIKTOK_BASE}/admin/corporate/products`;
  const response = await authenticatedApiRequest(getApiUrl(url), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch corporate products');
  return data;
}

export async function activateTikTokCorporateProduct(productId) {
  const response = await authenticatedApiRequest(getApiUrl(`${TIKTOK_BASE}/admin/corporate/products/${productId}/activate`), { method: 'POST' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to activate corporate product');
  return data;
}

export async function pauseTikTokCorporateProduct(productId) {
  const response = await authenticatedApiRequest(getApiUrl(`${TIKTOK_BASE}/admin/corporate/products/${productId}/pause`), { method: 'POST' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to pause corporate product');
  return data;
}

export async function rejectTikTokCorporateProduct(productId, reason) {
  const response = await authenticatedApiRequest(getApiUrl(`${TIKTOK_BASE}/admin/corporate/products/${productId}/reject`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to reject corporate product');
  return data;
}

export async function updateTikTokCorporateAdminProduct(productId, body) {
  const response = await authenticatedApiRequest(getApiUrl(`${TIKTOK_BASE}/admin/corporate/products/${productId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to update corporate product');
  return data;
}

// =============================================================================
// WAYFAIR CONNECTOR (v2 catalog addon)
// =============================================================================

const WAYFAIR_BASE = `${CATALOG_BASE}/wayfair`;

export async function fetchWayfairCategories() {
  const response = await authenticatedApiRequest(getApiUrl(`${WAYFAIR_BASE}/categories`), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch Wayfair categories');
  return data;
}

export async function fetchWayfairProducts() {
  const response = await authenticatedApiRequest(getApiUrl(`${WAYFAIR_BASE}/products`), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch Wayfair products');
  return data;
}

export async function fetchWayfairProduct(productId) {
  const response = await authenticatedApiRequest(getApiUrl(`${WAYFAIR_BASE}/products/${productId}`), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch product');
  return data;
}

export async function saveWayfairProduct(productId, body) {
  const response = await authenticatedApiRequest(getApiUrl(`${WAYFAIR_BASE}/products/${productId}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to save product');
  return data;
}

export async function removeWayfairProduct(productId) {
  const response = await authenticatedApiRequest(getApiUrl(`${WAYFAIR_BASE}/products/${productId}`), { method: 'DELETE' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to remove product');
  return data;
}

export async function fetchWayfairAdminProducts(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = qs ? `${WAYFAIR_BASE}/admin/products?${qs}` : `${WAYFAIR_BASE}/admin/products`;
  const response = await authenticatedApiRequest(getApiUrl(url), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch products');
  return data;
}

export async function activateWayfairProduct(productId) {
  const response = await authenticatedApiRequest(getApiUrl(`${WAYFAIR_BASE}/admin/products/${productId}/activate`), { method: 'POST' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to activate');
  return data;
}

export async function pauseWayfairProduct(productId) {
  const response = await authenticatedApiRequest(getApiUrl(`${WAYFAIR_BASE}/admin/products/${productId}/pause`), { method: 'POST' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to pause');
  return data;
}

export async function rejectWayfairProduct(productId, reason) {
  const response = await authenticatedApiRequest(getApiUrl(`${WAYFAIR_BASE}/admin/products/${productId}/reject`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to reject');
  return data;
}

export async function updateWayfairAdminProduct(productId, body) {
  const response = await authenticatedApiRequest(getApiUrl(`${WAYFAIR_BASE}/admin/products/${productId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to update');
  return data;
}

// =============================================================================
// ETSY CONNECTOR (v2 catalog addon - OAuth only)
// =============================================================================

const ETSY_BASE = `${CATALOG_BASE}/etsy`;

export async function etsyOAuthAuthorize() {
  const response = await authenticatedApiRequest(getApiUrl(`${ETSY_BASE}/oauth/authorize`), { method: 'GET' });
  const data = await response.json();
  return data;
}

export async function fetchEtsyShops() {
  const response = await authenticatedApiRequest(getApiUrl(`${ETSY_BASE}/shops`), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch Etsy shops');
  return data;
}

export async function fetchEtsyProducts() {
  const response = await authenticatedApiRequest(getApiUrl(`${ETSY_BASE}/products`), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch Etsy products');
  return data;
}

export async function fetchEtsyProduct(productId) {
  const response = await authenticatedApiRequest(getApiUrl(`${ETSY_BASE}/products/${productId}`), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch Etsy product');
  return data;
}

export async function saveEtsyProduct(productId, body) {
  const response = await authenticatedApiRequest(getApiUrl(`${ETSY_BASE}/products/${productId}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to save Etsy product');
  return data;
}

export async function updateEtsyInventory(productId, inventoryData) {
  const response = await authenticatedApiRequest(getApiUrl(`${ETSY_BASE}/inventory/${productId}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inventoryData),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to update Etsy inventory');
  return data;
}

export async function fetchEtsySyncLogs(limit = 50) {
  const params = new URLSearchParams({ limit: String(limit) });
  const response = await authenticatedApiRequest(getApiUrl(`${ETSY_BASE}/logs?${params}`), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch sync logs');
  return data;
}

// =============================================================================
// CURATION - Marketplace Product Sorting (Admin)
// =============================================================================

const CURATION_BASE = `${CATALOG_BASE}/curation`;

/**
 * Get curation statistics (unsorted count, art count, crafts count)
 * @returns {Promise<Object>} Stats object
 */
export async function fetchCurationStats() {
  const response = await authenticatedApiRequest(getApiUrl(`${CURATION_BASE}/stats`), { method: 'GET' });
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to fetch curation stats');
  return data.data;
}

/**
 * List products by marketplace category for curation
 * @param {Object} options - Query options
 * @param {string} options.category - Category (unsorted, art, crafts)
 * @param {number} options.limit - Max products to return
 * @param {number} options.offset - Pagination offset
 * @returns {Promise<Object>} Products and pagination
 */
export async function fetchCurationProducts(options = {}) {
  const { category = 'unsorted', limit = 50, offset = 0 } = options;
  
  const params = new URLSearchParams({
    category,
    limit: String(limit),
    offset: String(offset),
    include_images: 'true'
  });
  
  const response = await authenticatedApiRequest(
    getApiUrl(`${CURATION_BASE}/products?${params}`),
    { method: 'GET' }
  );
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to fetch curation products');
  return data.data;
}

/**
 * Move a product to a different marketplace category
 * @param {number} productId - Product ID
 * @param {string} category - Target category (unsorted, art, crafts)
 * @param {string} reason - Optional reason for categorization
 * @returns {Promise<Object>} Result with previous and new category
 */
export async function categorizeProduct(productId, category, reason = null) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CURATION_BASE}/products/${productId}/categorize`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, reason })
    }
  );
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to categorize product');
  return data.data;
}

/**
 * Bulk categorize multiple products
 * @param {Array<number>} productIds - Product IDs to categorize
 * @param {string} category - Target category
 * @param {string} reason - Optional reason
 * @returns {Promise<Object>} Result with update count
 */
export async function bulkCategorizeProducts(productIds, category, reason = null) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CURATION_BASE}/products/bulk`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_ids: productIds, category, reason })
    }
  );
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to bulk categorize products');
  return data.data;
}

/**
 * Get curation history log
 * @param {Object} options - Query options
 * @param {number} options.limit - Max entries to return
 * @param {number} options.offset - Pagination offset
 * @returns {Promise<Object>} Curation logs with pagination
 */
export async function fetchCurationLog(options = {}) {
  const { limit = 50, offset = 0 } = options;
  
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });
  
  const response = await authenticatedApiRequest(
    getApiUrl(`${CURATION_BASE}/log?${params}`),
    { method: 'GET' }
  );
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to fetch curation log');
  return data.data;
}
