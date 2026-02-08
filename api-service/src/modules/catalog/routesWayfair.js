/**
 * Wayfair Connector Routes (v2)
 * RESTful endpoints under /api/v2/catalog/wayfair
 * Catalog addon: vendor product listing + admin feed management
 * Follows Walmart corporate pattern exactly
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../auth/middleware');
const wayfairService = require('./services/wayfair');

// ============================================
// VENDOR ROUTES (Corporate Product Submission)
// ============================================

/**
 * GET /api/v2/catalog/wayfair/products
 * List vendor's corporate products
 */
router.get('/products', requireAuth, async (req, res) => {
  try {
    const products = await wayfairService.listProducts(req.userId);
    return res.json({ success: true, products });
  } catch (error) {
    console.error('Wayfair products list error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/v2/catalog/wayfair/products/:productId
 * Get single corporate product
 */
router.get('/products/:productId', requireAuth, async (req, res) => {
  try {
    const product = await wayfairService.getProduct(req.params.productId, req.userId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    return res.json({ success: true, product });
  } catch (error) {
    console.error('Wayfair product get error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

/**
 * POST /api/v2/catalog/wayfair/products/:productId
 * Submit/update corporate product for admin approval
 */
router.post('/products/:productId', requireAuth, async (req, res) => {
  try {
    const result = await wayfairService.saveProduct(req.params.productId, req.userId, req.body);
    
    if (!result.found) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    if (result.error) {
      return res.status(400).json({ 
        success: false, 
        error: result.error, 
        cooldown_ends_at: result.cooldown_ends_at 
      });
    }
    
    return res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Wayfair product save error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to save product' });
  }
});

/**
 * DELETE /api/v2/catalog/wayfair/products/:productId
 * Remove corporate product (60-day cooldown)
 */
router.delete('/products/:productId', requireAuth, async (req, res) => {
  try {
    const result = await wayfairService.removeProduct(req.params.productId, req.userId);
    
    if (!result.found) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    return res.json({
      success: true,
      message: 'Product removed. Cannot be resubmitted for 60 days.',
      cooldown_ends_at: result.cooldown_ends_at
    });
  } catch (error) {
    console.error('Wayfair product remove error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to remove product' });
  }
});

/**
 * GET /api/v2/catalog/wayfair/test
 * Test Wayfair API connection
 */
router.get('/test', requireAuth, async (req, res) => {
  try {
    const result = await wayfairService.testConnection();
    return res.json(result);
  } catch (error) {
    console.error('Wayfair test error:', error.message);
    return res.status(500).json({ success: false, error: 'Connection test failed' });
  }
});

// ============================================
// ADMIN ROUTES (Corporate Product Management)
// ============================================

/**
 * GET /api/v2/catalog/wayfair/admin/products
 * Admin: List all corporate products for review
 */
router.get('/admin/products', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 25, search = '' } = req.query;
    const result = await wayfairService.adminListProducts({
      status,
      page: parseInt(page),
      limit: parseInt(limit),
      search
    });
    return res.json({
      success: true,
      products: result.products,
      total: result.total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('Wayfair admin products error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

/**
 * POST /api/v2/catalog/wayfair/admin/products/:productId/activate
 * Admin: Approve product for Wayfair feed
 */
router.post('/admin/products/:productId/activate', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await wayfairService.adminActivate(req.params.productId, req.userId);
    return res.json({ success: true, message: 'Product activated' });
  } catch (error) {
    console.error('Wayfair admin activate error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to activate product' });
  }
});

/**
 * POST /api/v2/catalog/wayfair/admin/products/:productId/pause
 * Admin: Pause product (remove from feed)
 */
router.post('/admin/products/:productId/pause', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await wayfairService.adminPause(req.params.productId, req.userId);
    return res.json({ success: true, message: 'Product paused' });
  } catch (error) {
    console.error('Wayfair admin pause error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to pause product' });
  }
});

/**
 * POST /api/v2/catalog/wayfair/admin/products/:productId/reject
 * Admin: Reject product with reason
 */
router.post('/admin/products/:productId/reject', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { reason } = req.body;
    await wayfairService.adminReject(req.params.productId, req.userId, reason);
    return res.json({ success: true, message: 'Product rejected' });
  } catch (error) {
    console.error('Wayfair admin reject error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to reject product' });
  }
});

/**
 * PUT /api/v2/catalog/wayfair/admin/products/:productId
 * Admin: Update corporate product data
 */
router.put('/admin/products/:productId', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await wayfairService.adminUpdateProduct(req.params.productId, req.body);
    return res.json({ success: true, message: 'Product updated' });
  } catch (error) {
    console.error('Wayfair admin update error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

module.exports = router;
