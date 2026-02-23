/**
 * Walmart Connector Routes (v2)
 * Mounted at /api/v2/catalog/walmart
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/middleware');
const { requirePermission } = require('../auth/middleware/requirePermission');
const walmartService = require('./services/walmart');

// ============================================================================
// CUSTOMER ROUTES
// ============================================================================

router.get('/categories', requireAuth, async (req, res) => {
  try {
    const result = await walmartService.getCategories();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching Walmart categories:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch categories' } });
  }
});

router.post('/categories/refresh', requireAuth, async (req, res) => {
  try {
    walmartService.refreshCategoriesCache();
    const result = await walmartService.getCategories(false);
    res.json({ success: true, data: { message: 'Taxonomy cache refreshed', categoryCount: result.categories.length } });
  } catch (error) {
    console.error('Error refreshing taxonomy:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to refresh taxonomy' } });
  }
});

router.get('/products', requireAuth, async (req, res) => {
  try {
    const products = await walmartService.listProducts(req.user.id);
    res.json({ success: true, data: { products } });
  } catch (error) {
    console.error('Error fetching Walmart products:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch products' } });
  }
});

router.get('/products/:productId', requireAuth, async (req, res) => {
  try {
    const product = await walmartService.getProduct(req.params.productId, req.user.id);
    if (!product) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }
    res.json({ success: true, data: { product } });
  } catch (error) {
    console.error('Error fetching Walmart product:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch product' } });
  }
});

router.post('/products/:productId', requireAuth, async (req, res) => {
  try {
    const result = await walmartService.saveProduct(req.params.productId, req.user.id, req.body);
    if (!result.found) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }
    res.json({ success: true, data: { message: 'Walmart product data saved' } });
  } catch (error) {
    console.error('Error saving Walmart product:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to save product' } });
  }
});

router.put('/products/:productId', requireAuth, async (req, res) => {
  try {
    const result = await walmartService.updateProduct(req.params.productId, req.user.id, req.body);
    if (!result.found) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }
    res.json({ success: true, data: { message: 'Walmart product updated' } });
  } catch (error) {
    console.error('Error updating Walmart product:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update product' } });
  }
});

router.delete('/products/:productId', requireAuth, async (req, res) => {
  try {
    const result = await walmartService.removeProduct(req.params.productId, req.user.id);
    if (!result.found) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }
    res.json({ success: true, data: { message: 'Product removed', cooldown_ends_at: result.cooldown_ends_at } });
  } catch (error) {
    console.error('Error removing Walmart product:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to remove product' } });
  }
});

router.get('/allocations', requireAuth, async (req, res) => {
  try {
    const allocations = await walmartService.getAllocations(req.user.id);
    res.json({ success: true, data: { allocations } });
  } catch (error) {
    console.error('Error fetching allocations:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch allocations' } });
  }
});

// ============================================================================
// ADMIN ROUTES
// ============================================================================

router.get('/admin/products', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status, page, limit, search } = req.query;
    const result = await walmartService.adminListProducts({ status, page, limit, search });
    res.json({
      success: true,
      data: { products: result.products, total: result.total, page: parseInt(page) || 1, limit: parseInt(limit) || 25 }
    });
  } catch (error) {
    console.error('Error fetching admin Walmart products:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch products' } });
  }
});

router.post('/admin/products/:productId/activate', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await walmartService.adminActivate(req.params.productId, req.user.id);
    res.json({ success: true, data: { message: 'Product activated' } });
  } catch (error) {
    console.error('Error activating product:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to activate product' } });
  }
});

router.post('/admin/products/:productId/pause', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await walmartService.adminPause(req.params.productId, req.user.id);
    res.json({ success: true, data: { message: 'Product paused' } });
  } catch (error) {
    console.error('Error pausing product:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to pause product' } });
  }
});

router.put('/admin/products/:productId', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await walmartService.adminUpdateProduct(req.params.productId, req.body);
    res.json({ success: true, data: { message: 'Product updated' } });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update product' } });
  }
});

module.exports = router;
