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
  // Variations (legacy; v2 TBD)
  fetchVariationTypes,
  createVariationType,
  fetchVariationValues,
  createVariationValue,
  deleteVariationType,
  createProductVariationRecord,
  uploadProductImagesBulk,
  // Products - Inventory
  fetchProductInventory,
  updateProductInventory,
  fetchInventory,
  updateInventory,
  fetchInventoryHistory,
  fetchAllInventoryHistory,
  // Categories - Read
  fetchCategories,
  fetchAllCategories,
  fetchCategory,
  // Categories - CRUD (admin)
  createCategory,
  updateCategory,
  deleteCategory,
  // Categories - Content (admin)
  fetchCategoryContent,
  updateCategoryContent,
  // Categories - SEO (admin)
  fetchCategorySeo,
  updateCategorySeo,
  // Categories - Products (admin)
  fetchCategoryProducts,
  addCategoryProduct,
  removeCategoryProduct,
  // Categories - Search (admin)
  searchCategoryProducts,
  searchCategoryVendors,
  // Categories - Change Log (admin)
  fetchCategoryChangeLog,
  // Categories - Upload (admin)
  uploadCategoryImages,
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
  // Walmart connector (v2 catalog addon)
  fetchWalmartCategories,
  fetchWalmartProducts,
  fetchWalmartProduct,
  saveWalmartProduct,
  removeWalmartProduct,
  fetchWalmartAdminProducts,
  activateWalmartProduct,
  pauseWalmartProduct,
  updateWalmartAdminProduct,
  // TikTok connector (v2 catalog addon)
  fetchTikTokShops,
  fetchTikTokProducts,
  saveTikTokProduct,
  tiktokOAuthAuthorize,
  fetchTikTokAllocations,
  saveTikTokAllocation,
  bulkTikTokAllocations,
  fetchTikTokLogs,
  fetchTikTokAdminProducts,
  activateTikTokProduct,
  pauseTikTokProduct,
  updateTikTokAdminProduct,
  // Curation - Marketplace Product Sorting (admin)
  fetchCurationStats,
  fetchCurationProducts,
  categorizeProduct,
  bulkCategorizeProducts,
  fetchCurationLog,
} from './api';
