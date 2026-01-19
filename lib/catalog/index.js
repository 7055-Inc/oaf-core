/**
 * Catalog Module - Frontend Utilities
 * 
 * Re-exports all catalog API functions.
 * All functions use v2 API endpoints.
 */

export {
  // Products - Read
  fetchProducts,
  fetchProduct,
  fetchProductStats,
  // Products - Create
  createProduct,
  // Products - Update
  updateProduct,
  updateProductStatus,
  // Products - Delete
  deleteProduct,
  deleteProducts,
  // Products - Images
  fetchProductImages,
  uploadProductImage,
  deleteProductImage,
  setPrimaryImage,
  // Products - Inventory
  fetchProductInventory,
  updateProductInventory,
  // Categories
  fetchCategories,
  fetchCategory,
  // Collections
  fetchCollections,
  fetchCollection,
  createCollection,
  updateCollection,
  reorderCollections,
  deleteCollection,
  fetchCollectionProducts,
  addProductToCollection,
  removeProductFromCollection,
  // Import/Export
  exportProducts,
  downloadTemplate,
  getImportStatus,
  // Public (no auth)
  fetchPublicProducts,
  fetchPublicProduct,
  fetchPublicCollection,
} from './api';
