/**
 * TikTok Connector Routes (v2)
 * RESTful endpoints under /api/v2/catalog/tiktok
 * Catalog addon: vendor TikTok Shop connection and product data.
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../auth/middleware');
const tiktokService = require('./services/tiktok');

// OAuth callback (no auth) - handle authorization code
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      console.error('TikTok OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/catalog/addons/tiktok?tiktok_error=${encodeURIComponent(error)}`);
    }
    
    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/catalog/addons/tiktok?tiktok_error=missing_params`);
    }
    
    // Handle OAuth callback - exchange code for tokens
    const result = await tiktokService.handleOAuthCallback(code, state);
    
    if (result.success) {
      console.log('TikTok shop connected:', result.shop_id);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/catalog/addons/tiktok?tiktok_status=connected&shop_id=${result.shop_id}`);
    } else {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/catalog/addons/tiktok?tiktok_error=connection_failed`);
    }
    
  } catch (err) {
    console.error('TikTok OAuth callback error:', err);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/catalog/addons/tiktok?tiktok_error=server_error`);
  }
});

router.get('/oauth/authorize', requireAuth, async (req, res) => {
  try {
    const result = tiktokService.oauthAuthorize(req.userId);
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
    const allocated_quantity = req.body.allocated_quantity ?? req.body.quantity ?? 0;
    const result = await tiktokService.updateInventoryAllocation(req.params.productId, req.userId, parseInt(allocated_quantity));
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

/**
 * POST /api/v2/catalog/tiktok/sync/product/:productId
 * Sync a product to TikTok Shop
 */
router.post('/sync/product/:productId', requireAuth, async (req, res) => {
  try {
    const { shop_id } = req.body;
    if (!shop_id) {
      return res.status(400).json({ success: false, error: 'shop_id required' });
    }
    const result = await tiktokService.syncProductToTikTok(req.params.productId, req.userId, shop_id);
    return res.json({ success: true, message: 'Product synced to TikTok Shop', result });
  } catch (error) {
    console.error('TikTok product sync error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to sync product' });
  }
});

/**
 * POST /api/v2/catalog/tiktok/sync/orders
 * Sync orders from TikTok Shop
 */
router.post('/sync/orders', requireAuth, async (req, res) => {
  try {
    const { shop_id } = req.body;
    if (!shop_id) {
      return res.status(400).json({ success: false, error: 'shop_id required' });
    }
    const result = await tiktokService.syncOrdersFromTikTok(req.userId, shop_id);
    return res.json({ 
      success: true, 
      message: `Synced ${result.synced} new orders (${result.total} total)`,
      result 
    });
  } catch (error) {
    console.error('TikTok order sync error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to sync orders' });
  }
});

/**
 * POST /api/v2/catalog/tiktok/inventory/update/:productId
 * Update inventory on TikTok Shop
 */
router.post('/inventory/update/:productId', requireAuth, async (req, res) => {
  try {
    const { shop_id, quantity } = req.body;
    if (!shop_id || quantity === undefined) {
      return res.status(400).json({ success: false, error: 'shop_id and quantity required' });
    }
    const result = await tiktokService.updateTikTokInventory(
      req.params.productId,
      req.userId,
      shop_id,
      parseInt(quantity)
    );
    return res.json({ success: true, message: 'Inventory updated on TikTok Shop', result });
  } catch (error) {
    console.error('TikTok inventory update error:', error.message);
    return res.status(500).json({ success: false, error: error.message || 'Failed to update inventory' });
  }
});

/**
 * GET /api/v2/catalog/tiktok/test
 * Test TikTok API connection
 */
router.get('/test', requireAuth, async (req, res) => {
  try {
    const result = await tiktokService.testConnection();
    return res.json(result);
  } catch (error) {
    console.error('TikTok test error:', error.message);
    return res.status(500).json({ success: false, error: 'Connection test failed' });
  }
});

// ============================================
// CORPORATE SHOP ROUTES (Brakebee TikTok Shop)
// Vendors submit products for admin approval
// ============================================

/**
 * GET /api/v2/catalog/tiktok/corporate/products
 * List user's corporate product submissions
 */
router.get('/corporate/products', requireAuth, async (req, res) => {
  try {
    const products = await tiktokService.listCorporateProducts(req.userId);
    return res.json({ success: true, products });
  } catch (error) {
    console.error('TikTok corporate products error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch corporate products' });
  }
});

/**
 * GET /api/v2/catalog/tiktok/corporate/products/:productId
 * Get single corporate product details
 */
router.get('/corporate/products/:productId', requireAuth, async (req, res) => {
  try {
    const product = await tiktokService.getCorporateProduct(req.params.productId, req.userId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    return res.json({ success: true, product });
  } catch (error) {
    console.error('TikTok corporate product error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

/**
 * POST /api/v2/catalog/tiktok/corporate/products/:productId
 * Save/update corporate product (vendor submits for approval)
 */
router.post('/corporate/products/:productId', requireAuth, async (req, res) => {
  try {
    const result = await tiktokService.saveCorporateProduct(req.params.productId, req.userId, req.body);
    if (!result.found) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    return res.json({ success: true, message: 'Corporate product submitted for approval' });
  } catch (error) {
    console.error('TikTok corporate product save error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to save corporate product' });
  }
});

/**
 * DELETE /api/v2/catalog/tiktok/corporate/products/:productId
 * Remove corporate product (60-day cooldown)
 */
router.delete('/corporate/products/:productId', requireAuth, async (req, res) => {
  try {
    const result = await tiktokService.removeCorporateProduct(req.params.productId, req.userId);
    if (!result.found) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    return res.json({ 
      success: true, 
      message: 'Product removed from corporate shop', 
      cooldown_ends_at: result.cooldown_ends_at 
    });
  } catch (error) {
    console.error('TikTok corporate product remove error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to remove corporate product' });
  }
});

// ----- Admin (manage_system) - OAuth Products -----

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

// ----- Admin (manage_system) - Corporate Products -----

/**
 * GET /api/v2/catalog/tiktok/admin/corporate/products
 * Admin: List all corporate products for review
 */
router.get('/admin/corporate/products', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 25, search = '' } = req.query;
    const result = await tiktokService.adminListCorporateProducts({
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
    console.error('TikTok admin corporate products error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch corporate products' });
  }
});

/**
 * POST /api/v2/catalog/tiktok/admin/corporate/products/:productId/activate
 * Admin: Approve product for TikTok feed
 */
router.post('/admin/corporate/products/:productId/activate', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await tiktokService.adminActivateCorporate(req.params.productId, req.userId);
    return res.json({ success: true, message: 'Corporate product activated' });
  } catch (error) {
    console.error('TikTok admin corporate activate error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to activate corporate product' });
  }
});

/**
 * POST /api/v2/catalog/tiktok/admin/corporate/products/:productId/pause
 * Admin: Pause product (remove from feed)
 */
router.post('/admin/corporate/products/:productId/pause', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await tiktokService.adminPauseCorporate(req.params.productId, req.userId);
    return res.json({ success: true, message: 'Corporate product paused' });
  } catch (error) {
    console.error('TikTok admin corporate pause error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to pause corporate product' });
  }
});

/**
 * POST /api/v2/catalog/tiktok/admin/corporate/products/:productId/reject
 * Admin: Reject product with reason
 */
router.post('/admin/corporate/products/:productId/reject', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { reason } = req.body;
    await tiktokService.adminRejectCorporate(req.params.productId, req.userId, reason);
    return res.json({ success: true, message: 'Corporate product rejected' });
  } catch (error) {
    console.error('TikTok admin corporate reject error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to reject corporate product' });
  }
});

/**
 * PUT /api/v2/catalog/tiktok/admin/corporate/products/:productId
 * Admin: Update corporate product data
 */
router.put('/admin/corporate/products/:productId', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await tiktokService.adminUpdateCorporateProduct(req.params.productId, req.body);
    return res.json({ success: true, message: 'Corporate product updated' });
  } catch (error) {
    console.error('TikTok admin corporate update error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update corporate product' });
  }
});

module.exports = router;
