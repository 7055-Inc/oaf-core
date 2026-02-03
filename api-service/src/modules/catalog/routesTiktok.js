/**
 * TikTok Connector Routes (v2)
 * RESTful endpoints under /api/v2/catalog/tiktok
 * Catalog addon: vendor TikTok Shop connection and product data.
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../auth/middleware');
const tiktokService = require('./services/tiktok');

// OAuth callback (no auth) - redirect to frontend
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    if (error) {
      console.error('TikTok OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/catalog/addons/tiktok?tiktok_error=${encodeURIComponent(error)}`);
    }
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/catalog/addons/tiktok?tiktok_error=no_code`);
    }
    console.log('TikTok OAuth callback received:', { code: code.substring(0, 10) + '...', state });
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/catalog/addons/tiktok?tiktok_status=callback_received`);
  } catch (err) {
    console.error('TikTok OAuth callback error:', err);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/catalog/addons/tiktok?tiktok_error=server_error`);
  }
});

router.get('/oauth/authorize', requireAuth, async (req, res) => {
  try {
    const result = tiktokService.oauthAuthorize();
    if (result.redirect_url) {
      return res.json({ success: true, redirect_url: result.redirect_url });
    }
    return res.json({
      success: false,
      message: result.message,
      status: result.status
    });
  } catch (error) {
    console.error('TikTok oauth authorize error:', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.get('/shops', requireAuth, async (req, res) => {
  try {
    const shops = await tiktokService.getShops(req.userId);
    return res.json({ success: true, shops });
  } catch (error) {
    console.error('TikTok shops error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch shops' });
  }
});

router.get('/products', requireAuth, async (req, res) => {
  try {
    const products = await tiktokService.listProducts(req.userId);
    return res.json({ success: true, products });
  } catch (error) {
    console.error('TikTok products error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

router.post('/products/:productId', requireAuth, async (req, res) => {
  try {
    const result = await tiktokService.saveProduct(req.params.productId, req.userId, req.body);
    if (!result.found) return res.status(404).json({ success: false, error: 'Product not found' });
    return res.json({ success: true, message: 'TikTok product data and allocation updated' });
  } catch (error) {
    console.error('TikTok product save error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

router.get('/inventory', requireAuth, async (req, res) => {
  try {
    const allocations = await tiktokService.getInventory(req.userId);
    return res.json({ success: true, allocations });
  } catch (error) {
    console.error('TikTok inventory error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch inventory' });
  }
});

router.post('/inventory/:productId', requireAuth, async (req, res) => {
  try {
    const { allocated_quantity } = req.body;
    const result = await tiktokService.updateInventoryAllocation(req.params.productId, req.userId, allocated_quantity);
    if (!result.found) return res.status(404).json({ success: false, error: 'Product not found' });
    if (result.error) return res.status(400).json({ success: false, error: result.error });
    return res.json({ success: true, message: 'Inventory allocation updated' });
  } catch (error) {
    if (error.message && error.message.includes('allocate more')) {
      return res.status(400).json({ success: false, error: error.message });
    }
    console.error('TikTok inventory update error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update allocation' });
  }
});

router.get('/logs', requireAuth, async (req, res) => {
  try {
    const { limit, sync_type, status } = req.query;
    const logs = await tiktokService.getLogs(req.userId, { limit, sync_type, status });
    return res.json({ success: true, logs });
  } catch (error) {
    console.error('TikTok logs error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch logs' });
  }
});

router.post('/allocations/bulk', requireAuth, async (req, res) => {
  try {
    const { allocations } = req.body;
    const result = await tiktokService.bulkAllocations(req.userId, allocations);
    return res.json({
      success: true,
      message: `Bulk allocation update completed: ${result.successful} successful, ${result.failed} failed`,
      results: result
    });
  } catch (error) {
    if (error.message && (error.message.includes('allocations must be') || error.message.includes('product_id') || error.message.includes('not found'))) {
      return res.status(400).json({ success: false, error: error.message });
    }
    console.error('TikTok bulk allocations error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update allocations' });
  }
});

// ----- Admin (manage_system) -----

/**
 * GET /api/v2/catalog/tiktok/admin/products
 */
router.get('/admin/products', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 25, search = '' } = req.query;
    const result = await tiktokService.adminListProducts({
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
    console.error('TikTok admin products error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

/**
 * POST /api/v2/catalog/tiktok/admin/products/:productId/activate
 */
router.post('/admin/products/:productId/activate', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await tiktokService.adminActivate(req.params.productId, req.userId);
    return res.json({ success: true, message: 'Product activated' });
  } catch (error) {
    console.error('TikTok admin activate error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to activate product' });
  }
});

/**
 * POST /api/v2/catalog/tiktok/admin/products/:productId/pause
 */
router.post('/admin/products/:productId/pause', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await tiktokService.adminPause(req.params.productId, req.userId);
    return res.json({ success: true, message: 'Product paused' });
  } catch (error) {
    console.error('TikTok admin pause error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to pause product' });
  }
});

/**
 * PUT /api/v2/catalog/tiktok/admin/products/:productId
 */
router.put('/admin/products/:productId', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await tiktokService.adminUpdateProduct(req.params.productId, req.body);
    return res.json({ success: true, message: 'Product updated' });
  } catch (error) {
    console.error('TikTok admin update error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

module.exports = router;
