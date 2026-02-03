/**
 * Walmart Connector Routes (v2)
 * RESTful endpoints under /api/v2/catalog/walmart
 * Catalog addon: vendor product listing + admin feed management.
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../auth/middleware');
const walmartService = require('./services/walmart');

/**
 * GET /api/v2/catalog/walmart/categories
 */
router.get('/categories', requireAuth, async (req, res) => {
  try {
    const result = await walmartService.getCategories(true);
    return res.json({ success: true, categories: result.categories, cached: result.cached || false, fallback: result.fallback || false });
  } catch (error) {
    console.error('Walmart categories error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});

/**
 * POST /api/v2/catalog/walmart/categories/refresh
 */
router.post('/categories/refresh', requireAuth, async (req, res) => {
  try {
    walmartService.refreshCategoriesCache();
    const result = await walmartService.getCategories(false);
    return res.json({ success: true, message: 'Taxonomy cache refreshed', categoryCount: result.categories.length });
  } catch (error) {
    console.error('Walmart categories refresh error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to refresh taxonomy' });
  }
});

/**
 * GET /api/v2/catalog/walmart/products
 */
router.get('/products', requireAuth, async (req, res) => {
  try {
    const products = await walmartService.listProducts(req.userId);
    return res.json({ success: true, products });
  } catch (error) {
    console.error('Walmart products list error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/v2/catalog/walmart/products/:productId
 */
router.get('/products/:productId', requireAuth, async (req, res) => {
  try {
    const product = await walmartService.getProduct(req.params.productId, req.userId);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    return res.json({ success: true, product });
  } catch (error) {
    console.error('Walmart product get error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

/**
 * POST /api/v2/catalog/walmart/products/:productId
 */
router.post('/products/:productId', requireAuth, async (req, res) => {
  try {
    const result = await walmartService.saveProduct(req.params.productId, req.userId, req.body);
    if (!result.found) return res.status(404).json({ success: false, error: 'Product not found' });
    return res.json({ success: true, message: 'Walmart product data saved' });
  } catch (error) {
    console.error('Walmart product save error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to save product' });
  }
});

/**
 * PUT /api/v2/catalog/walmart/products/:productId
 */
router.put('/products/:productId', requireAuth, async (req, res) => {
  try {
    const result = await walmartService.updateProduct(req.params.productId, req.userId, req.body);
    if (!result.found) return res.status(404).json({ success: false, error: 'Product not found' });
    return res.json({ success: true, message: 'Walmart product updated' });
  } catch (error) {
    console.error('Walmart product update error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

/**
 * DELETE /api/v2/catalog/walmart/products/:productId
 */
router.delete('/products/:productId', requireAuth, async (req, res) => {
  try {
    const result = await walmartService.removeProduct(req.params.productId, req.userId);
    if (!result.found) return res.status(404).json({ success: false, error: 'Product not found' });
    return res.json({ success: true, message: 'Product removed', cooldown_ends_at: result.cooldown_ends_at });
  } catch (error) {
    console.error('Walmart product remove error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to remove product' });
  }
});

/**
 * GET /api/v2/catalog/walmart/allocations
 */
router.get('/allocations', requireAuth, async (req, res) => {
  try {
    const allocations = await walmartService.getAllocations(req.userId);
    return res.json({ success: true, allocations });
  } catch (error) {
    console.error('Walmart allocations error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch allocations' });
  }
});

// ----- Admin (manage_system) -----

/**
 * GET /api/v2/catalog/walmart/admin/products
 */
router.get('/admin/products', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 25, search = '' } = req.query;
    const result = await walmartService.adminListProducts({ status, page: parseInt(page), limit: parseInt(limit), search });
    return res.json({ success: true, products: result.products, total: result.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Walmart admin products error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

/**
 * POST /api/v2/catalog/walmart/admin/products/:productId/activate
 */
router.post('/admin/products/:productId/activate', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await walmartService.adminActivate(req.params.productId, req.userId);
    return res.json({ success: true, message: 'Product activated' });
  } catch (error) {
    console.error('Walmart admin activate error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to activate product' });
  }
});

/**
 * POST /api/v2/catalog/walmart/admin/products/:productId/pause
 */
router.post('/admin/products/:productId/pause', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await walmartService.adminPause(req.params.productId, req.userId);
    return res.json({ success: true, message: 'Product paused' });
  } catch (error) {
    console.error('Walmart admin pause error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to pause product' });
  }
});

/**
 * PUT /api/v2/catalog/walmart/admin/products/:productId
 */
router.put('/admin/products/:productId', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await walmartService.adminUpdateProduct(req.params.productId, req.body);
    return res.json({ success: true, message: 'Product updated' });
  } catch (error) {
    console.error('Walmart admin update error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

module.exports = router;
