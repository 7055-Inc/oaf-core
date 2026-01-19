/**
 * Catalog Module Routes (v2)
 * RESTful API endpoints for product catalog management
 * 
 * Base path: /api/v2/catalog
 */

const express = require('express');
const router = express.Router();

// Import services
const productService = require('./services/product');
const categoryService = require('./services/category');
const collectionService = require('./services/collection');
const importExportService = require('./services/importExport');

// Import auth middleware from auth module
const { requireAuth } = require('../auth/middleware');
const { isAdmin } = require('../auth/services/permissions');

// Import multer for file uploads
const upload = require('../../config/multer');

// =============================================================================
// PRODUCTS - LIST & READ
// =============================================================================

/**
 * GET /api/v2/catalog/products
 * List products with filtering, sorting, pagination
 */
router.get('/products', requireAuth, async (req, res) => {
  try {
    const {
      view = 'my',
      include = '',
      status,
      search,
      category_id,
      page = 1,
      limit = 50,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    const userIsAdmin = isAdmin(req.roles || []);
    const viewAll = view === 'all' && userIsAdmin;

    // Non-admins can't view all products
    if (view === 'all' && !userIsAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required', status: 403 }
      });
    }

    const options = {
      vendorId: viewAll ? null : req.userId,
      categoryId: category_id || null,
      status: status || null,
      search: search || null,
      parentId: null, // Only show parent products by default
      includeDeleted: userIsAdmin,
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      order
    };

    const result = await productService.list(options);

    // Include related data if requested
    const includes = include.split(',').filter(Boolean);
    
    for (const product of result.products) {
      if (includes.includes('inventory')) {
        product.inventory = await productService.getInventory(product.id);
      }
      if (includes.includes('images')) {
        product.images = await productService.getImages(product.id);
      }
      if (includes.includes('children')) {
        product.children = await productService.getChildren(product.id);
      }
      if (includes.includes('vendor') && viewAll) {
        product.vendor = await productService.getVendorInfo(product.vendor_id);
      }
    }

    res.json({
      success: true,
      data: result.products,
      meta: result.meta
    });
  } catch (error) {
    console.error('Error listing products:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/catalog/products/stats
 * Get product statistics
 */
router.get('/products/stats', requireAuth, async (req, res) => {
  try {
    const { view = 'my' } = req.query;
    const userIsAdmin = isAdmin(req.roles || []);

    if (view === 'all' && !userIsAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required', status: 403 }
      });
    }

    const vendorId = (view === 'all' && userIsAdmin) ? null : req.userId;
    const stats = await productService.getStats(vendorId);

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error getting product stats:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/catalog/products/:id
 * Get single product by ID
 */
router.get('/products/:id', requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { include = '' } = req.query;

    const product = await productService.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found', status: 404 }
      });
    }

    // Check ownership (unless admin)
    const userIsAdmin = isAdmin(req.roles || []);
    if (!userIsAdmin && product.vendor_id !== req.userId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not authorized to view this product', status: 403 }
      });
    }

    // Include related data
    const includes = include.split(',').filter(Boolean);
    
    if (includes.includes('inventory')) {
      product.inventory = await productService.getInventory(product.id);
    }
    if (includes.includes('images')) {
      product.images = await productService.getImages(product.id);
    }
    if (includes.includes('children')) {
      product.children = await productService.getChildren(product.id);
    }
    if (includes.includes('vendor')) {
      product.vendor = await productService.getVendorInfo(product.vendor_id);
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

// =============================================================================
// PRODUCTS - CREATE
// =============================================================================

/**
 * POST /api/v2/catalog/products
 * Create a new product
 */
router.post('/products', requireAuth, async (req, res) => {
  try {
    const product = await productService.create(req.userId, req.body);

    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully'
    });
  } catch (error) {
    console.error('Error creating product:', error);
    
    if (error.message.includes('required') || error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message, status: 400 }
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

// =============================================================================
// PRODUCTS - UPDATE
// =============================================================================

/**
 * PUT /api/v2/catalog/products/:id
 * Update a product (full replacement)
 */
router.put('/products/:id', requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const userIsAdmin = isAdmin(req.roles || []);

    const product = await productService.update(productId, req.userId, req.body, userIsAdmin);

    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);

    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message, status: 404 }
      });
    }
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error.message, status: 403 }
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * PATCH /api/v2/catalog/products/:id
 * Partial update a product
 */
router.patch('/products/:id', requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const userIsAdmin = isAdmin(req.roles || []);

    const product = await productService.update(productId, req.userId, req.body, userIsAdmin);

    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Error updating product:', error);

    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message, status: 404 }
      });
    }
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error.message, status: 403 }
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * PATCH /api/v2/catalog/products/:id/status
 * Update product status
 */
router.patch('/products/:id/status', requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { status } = req.body;
    const userIsAdmin = isAdmin(req.roles || []);

    if (!status) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'status is required', status: 400 }
      });
    }

    const product = await productService.updateStatus(productId, req.userId, status, userIsAdmin);

    res.json({
      success: true,
      data: product,
      message: `Product status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating product status:', error);

    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message, status: 404 }
      });
    }
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error.message, status: 403 }
      });
    }
    if (error.message === 'Invalid status') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message, status: 400 }
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

// =============================================================================
// PRODUCTS - DELETE
// =============================================================================

/**
 * DELETE /api/v2/catalog/products/:id
 * Delete a product (soft delete)
 */
router.delete('/products/:id', requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const userIsAdmin = isAdmin(req.roles || []);

    await productService.softDelete(productId, req.userId, userIsAdmin);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting product:', error);

    if (error.message === 'Product not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message, status: 404 }
      });
    }
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error.message, status: 403 }
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * POST /api/v2/catalog/products/bulk-delete
 * Bulk delete products
 */
router.post('/products/bulk-delete', requireAuth, async (req, res) => {
  try {
    const { product_ids } = req.body;
    const userIsAdmin = isAdmin(req.roles || []);

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'product_ids must be a non-empty array', status: 400 }
      });
    }

    const result = await productService.bulkSoftDelete(product_ids, req.userId, userIsAdmin);

    res.json({
      success: true,
      data: result,
      message: `${result.deleted} products deleted`
    });
  } catch (error) {
    console.error('Error bulk deleting products:', error);

    if (error.message.includes('Not authorized')) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error.message, status: 403 }
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

// =============================================================================
// PRODUCTS - IMAGES
// =============================================================================

/**
 * GET /api/v2/catalog/products/:id/images
 * Get product images
 */
router.get('/products/:id/images', requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const images = await productService.getImages(productId);

    res.json({ success: true, data: images });
  } catch (error) {
    console.error('Error getting product images:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * POST /api/v2/catalog/products/:id/images
 * Upload product image
 */
router.post('/products/:id/images', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const { is_primary = false, order = 0 } = req.body;

    // Verify ownership
    const product = await productService.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found', status: 404 }
      });
    }

    const userIsAdmin = isAdmin(req.roles || []);
    if (!userIsAdmin && product.vendor_id !== req.userId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not authorized', status: 403 }
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No image file provided', status: 400 }
      });
    }

    // Image path from multer
    const imageUrl = `/temp_images/${req.file.filename}`;
    const image = await productService.addImage(productId, imageUrl, is_primary === 'true' || is_primary === true, parseInt(order));

    res.status(201).json({
      success: true,
      data: image,
      message: 'Image uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading product image:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * DELETE /api/v2/catalog/products/:id/images/:imageId
 * Delete product image
 */
router.delete('/products/:id/images/:imageId', requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const imageId = parseInt(req.params.imageId);

    // Verify ownership
    const product = await productService.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found', status: 404 }
      });
    }

    const userIsAdmin = isAdmin(req.roles || []);
    if (!userIsAdmin && product.vendor_id !== req.userId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not authorized', status: 403 }
      });
    }

    await productService.removeImage(productId, imageId);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting product image:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * PATCH /api/v2/catalog/products/:id/images/:imageId/primary
 * Set image as primary
 */
router.patch('/products/:id/images/:imageId/primary', requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const imageId = parseInt(req.params.imageId);

    // Verify ownership
    const product = await productService.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found', status: 404 }
      });
    }

    const userIsAdmin = isAdmin(req.roles || []);
    if (!userIsAdmin && product.vendor_id !== req.userId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not authorized', status: 403 }
      });
    }

    await productService.setPrimaryImage(productId, imageId);

    res.json({
      success: true,
      message: 'Primary image updated'
    });
  } catch (error) {
    console.error('Error setting primary image:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

// =============================================================================
// PRODUCTS - INVENTORY
// =============================================================================

/**
 * GET /api/v2/catalog/products/:id/inventory
 * Get product inventory
 */
router.get('/products/:id/inventory', requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const inventory = await productService.getInventory(productId);

    res.json({ success: true, data: inventory || { qty_on_hand: 0, qty_available: 0, qty_reserved: 0 } });
  } catch (error) {
    console.error('Error getting inventory:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * PATCH /api/v2/catalog/products/:id/inventory
 * Update product inventory
 */
router.patch('/products/:id/inventory', requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);

    // Verify ownership
    const product = await productService.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found', status: 404 }
      });
    }

    const userIsAdmin = isAdmin(req.roles || []);
    if (!userIsAdmin && product.vendor_id !== req.userId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not authorized', status: 403 }
      });
    }

    await productService.updateInventory(productId, { ...req.body, created_by: req.userId });
    const inventory = await productService.getInventory(productId);

    res.json({
      success: true,
      data: inventory,
      message: 'Inventory updated'
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/catalog/products/:id/inventory/history
 * Get product inventory history
 */
router.get('/products/:id/inventory/history', requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const history = await productService.getInventoryHistory(productId);

    res.json({ success: true, data: history || [] });
  } catch (error) {
    console.error('Error getting inventory history:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/catalog/inventory/history
 * Get all inventory history for current user's products
 */
router.get('/inventory/history', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 100, search } = req.query;
    
    // Always filter by user's own products (no admin override)
    const history = await productService.getAllInventoryHistory(
      req.userId, 
      false, // Never show all products - use CSV for admin bulk operations
      { page: parseInt(page), limit: parseInt(limit), search }
    );

    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error getting all inventory history:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

// =============================================================================
// CATEGORIES
// =============================================================================

/**
 * GET /api/v2/catalog/categories
 * List categories
 */
router.get('/categories', async (req, res) => {
  try {
    const { format = 'list' } = req.query;

    let data;
    if (format === 'tree') {
      data = await categoryService.getTree();
    } else if (format === 'flat') {
      data = await categoryService.getFlatList();
    } else {
      data = await categoryService.list({ includeProductCount: true });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error listing categories:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/catalog/categories/:id
 * Get category by ID
 */
router.get('/categories/:id', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const category = await categoryService.findById(categoryId);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Category not found', status: 404 }
      });
    }

    res.json({ success: true, data: category });
  } catch (error) {
    console.error('Error getting category:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

// =============================================================================
// PUBLIC ENDPOINTS (no auth required)
// =============================================================================

/**
 * GET /api/v2/catalog/public/products
 * Public product listing (active products only)
 */
router.get('/public/products', async (req, res) => {
  try {
    const {
      vendor_id,
      category_id,
      search,
      page = 1,
      limit = 20,
      sort = 'created_at',
      order = 'desc'
    } = req.query;

    const result = await productService.list({
      vendorId: vendor_id || null,
      categoryId: category_id || null,
      status: 'active',
      search: search || null,
      parentId: null,
      includeDeleted: false,
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      order
    });

    // Add images to each product
    for (const product of result.products) {
      product.images = await productService.getImages(product.id);
    }

    res.json({
      success: true,
      data: result.products,
      meta: result.meta
    });
  } catch (error) {
    console.error('Error listing public products:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/catalog/public/products/:id
 * Public single product (active only)
 */
router.get('/public/products/:id', async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    const product = await productService.findById(productId);

    if (!product || product.status !== 'active') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found', status: 404 }
      });
    }

    // Add related data
    product.images = await productService.getImages(product.id);
    product.inventory = await productService.getInventory(product.id);
    product.children = await productService.getChildren(product.id);
    product.vendor = await productService.getVendorInfo(product.vendor_id);

    res.json({ success: true, data: product });
  } catch (error) {
    console.error('Error getting public product:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

// =============================================================================
// COLLECTIONS (User Product Collections)
// =============================================================================

/**
 * GET /api/v2/catalog/collections
 * List user's collections
 */
router.get('/collections', requireAuth, async (req, res) => {
  try {
    const { format = 'list' } = req.query;

    let data;
    if (format === 'tree') {
      data = await collectionService.getTreeByUser(req.userId);
    } else {
      data = await collectionService.listByUser(req.userId, { includeProductCount: true });
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error listing collections:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/catalog/collections/:id
 * Get single collection
 */
router.get('/collections/:id', requireAuth, async (req, res) => {
  try {
    const collectionId = parseInt(req.params.id);
    const collection = await collectionService.findById(collectionId);

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Collection not found', status: 404 }
      });
    }

    if (collection.user_id !== req.userId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not authorized', status: 403 }
      });
    }

    res.json({ success: true, data: collection });
  } catch (error) {
    console.error('Error getting collection:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * POST /api/v2/catalog/collections
 * Create a new collection
 */
router.post('/collections', requireAuth, async (req, res) => {
  try {
    const collection = await collectionService.create(req.userId, req.body);

    res.status(201).json({
      success: true,
      data: collection,
      message: 'Collection created successfully'
    });
  } catch (error) {
    console.error('Error creating collection:', error);

    if (error.message.includes('required') || error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message, status: 400 }
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * PUT /api/v2/catalog/collections/:id
 * Update a collection
 */
router.put('/collections/:id', requireAuth, async (req, res) => {
  try {
    const collectionId = parseInt(req.params.id);
    const collection = await collectionService.update(collectionId, req.userId, req.body);

    res.json({
      success: true,
      data: collection,
      message: 'Collection updated successfully'
    });
  } catch (error) {
    console.error('Error updating collection:', error);

    if (error.message === 'Collection not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message, status: 404 }
      });
    }
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error.message, status: 403 }
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * PATCH /api/v2/catalog/collections/reorder
 * Update display order for multiple collections
 */
router.patch('/collections/reorder', requireAuth, async (req, res) => {
  try {
    const { order } = req.body;

    if (!Array.isArray(order)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'order must be an array', status: 400 }
      });
    }

    await collectionService.updateOrder(req.userId, order);

    res.json({
      success: true,
      message: 'Collection order updated'
    });
  } catch (error) {
    console.error('Error reordering collections:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * DELETE /api/v2/catalog/collections/:id
 * Delete a collection
 */
router.delete('/collections/:id', requireAuth, async (req, res) => {
  try {
    const collectionId = parseInt(req.params.id);
    await collectionService.remove(collectionId, req.userId);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting collection:', error);

    if (error.message === 'Collection not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message, status: 404 }
      });
    }
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error.message, status: 403 }
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/catalog/collections/:id/products
 * Get products in a collection (user_category)
 * Products link to user_categories via product_categories table
 */
router.get('/collections/:id/products', requireAuth, async (req, res) => {
  try {
    const collectionId = parseInt(req.params.id);
    const { page = 1, limit = 50 } = req.query;

    const collection = await collectionService.findById(collectionId);
    if (!collection) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Collection not found', status: 404 }
      });
    }

    if (collection.user_id !== req.userId) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not authorized', status: 403 }
      });
    }

    const products = await collectionService.getProducts(collectionId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    // Add images to each product
    for (const product of products) {
      product.images = await productService.getImages(product.id);
    }

    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error getting collection products:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * POST /api/v2/catalog/collections/:id/products
 * Add product to collection
 */
router.post('/collections/:id/products', requireAuth, async (req, res) => {
  try {
    const collectionId = parseInt(req.params.id);
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'product_id is required', status: 400 }
      });
    }

    const result = await collectionService.addProduct(collectionId, product_id, req.userId);

    res.status(201).json({
      success: true,
      data: result,
      message: result.added ? 'Product added to collection' : result.message
    });
  } catch (error) {
    console.error('Error adding product to collection:', error);

    if (error.message === 'Collection not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message, status: 404 }
      });
    }
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error.message, status: 403 }
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * DELETE /api/v2/catalog/collections/:id/products/:productId
 * Remove product from collection
 */
router.delete('/collections/:id/products/:productId', requireAuth, async (req, res) => {
  try {
    const collectionId = parseInt(req.params.id);
    const productId = parseInt(req.params.productId);

    await collectionService.removeProduct(collectionId, productId, req.userId);

    res.status(204).send();
  } catch (error) {
    console.error('Error removing product from collection:', error);

    if (error.message === 'Collection not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message, status: 404 }
      });
    }
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error.message, status: 403 }
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/catalog/public/collections/:id
 * Public collection view
 */
router.get('/public/collections/:id', async (req, res) => {
  try {
    const collectionId = parseInt(req.params.id);
    const collection = await collectionService.findById(collectionId);

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Collection not found', status: 404 }
      });
    }

    const products = await collectionService.getProducts(collectionId, { limit: 100 });

    // Add images to each product
    for (const product of products) {
      product.images = await productService.getImages(product.id);
    }

    res.json({
      success: true,
      data: {
        ...collection,
        products
      }
    });
  } catch (error) {
    console.error('Error getting public collection:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

// =============================================================================
// IMPORT/EXPORT
// =============================================================================

/**
 * POST /api/v2/catalog/export
 * Export products to CSV/Excel
 */
router.post('/export', requireAuth, async (req, res) => {
  try {
    const {
      fields = ['sku', 'name', 'price'],
      status = 'active',
      category_id,
      format = 'csv',
      view = 'my'
    } = req.body;

    const userIsAdmin = isAdmin(req.roles || []);

    if (view === 'all' && !userIsAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required', status: 403 }
      });
    }

    const vendorId = (view === 'all' && userIsAdmin) ? null : req.userId;

    const result = await importExportService.exportProducts(vendorId, {
      fields,
      status,
      categoryId: category_id,
      format,
      isAdmin: userIsAdmin
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (error) {
    console.error('Error exporting products:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/catalog/export/template
 * Download import template
 */
router.get('/export/template', requireAuth, async (req, res) => {
  try {
    const { type = 'update_products', format = 'xlsx' } = req.query;

    const result = await importExportService.generateTemplate(type, format);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.buffer);
  } catch (error) {
    console.error('Error generating template:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/catalog/import/status/:jobId
 * Get import job status
 */
router.get('/import/status/:jobId', requireAuth, async (req, res) => {
  try {
    const { jobId } = req.params;

    const status = await importExportService.getJobStatus(jobId, req.userId);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job not found', status: 404 }
      });
    }

    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Error getting import status:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

module.exports = router;
