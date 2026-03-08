/**
 * Shopify Connector Routes (v2)
 * Mounted at /api/v2/catalog/shopify
 *
 * OAuth-only connector contract:
 *   OAuth:  authorize, callback
 *   Vendor: shops, products CRUD, inventory, allocations, logs, sync, test
 *   Admin:  products list, activate, pause, update
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../auth/middleware');
const shopifyService = require('./services/shopify');

// ============================================================================
// EMBEDDED APP
// ============================================================================

router.get('/app/config', (req, res) => {
  try {
    const config = shopifyService.getAppConfig();
    return res.json({ success: true, data: config });
  } catch (error) {
    console.error('Shopify app config error:', error.message);
    return res.status(500).json({ success: false, error: { message: 'Failed to get app config' } });
  }
});

router.post('/auth/session-token', async (req, res) => {
  try {
    const { sessionToken } = req.body;
    const result = await shopifyService.verifySessionToken(sessionToken);
    if (result.authenticated) {
      return res.json({ success: true, data: { accessToken: result.accessToken, shopDomain: result.shopDomain } });
    }
    return res.json({ success: false, reason: result.reason, shopDomain: result.shopDomain });
  } catch (error) {
    console.error('Shopify session token error:', error.message);
    return res.status(401).json({ success: false, error: { message: error.message } });
  }
});

// ============================================================================
// OAUTH
// ============================================================================

router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, shop, state, hmac, timestamp } = req.query;

    if (!code || !shop || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard/catalog/addons/shopify?shopify_error=missing_params`);
    }

    // Check if initiated from embedded Shopify app
    let fromShopify = false;
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
      if (stateData.from === 'shopify') fromShopify = true;
    } catch (_) {}

    const basePath = fromShopify ? '/shopify' : '/dashboard/catalog/addons/shopify';
    const result = await shopifyService.handleOAuthCallback(code, shop, state, req.query);

    if (result.success) {
      console.log('Shopify shop connected:', result.shop_id);
      return res.redirect(
        `${process.env.FRONTEND_URL}${basePath}?shopify_status=connected&shop_id=${encodeURIComponent(result.shop_id)}`
      );
    }
    return res.redirect(`${process.env.FRONTEND_URL}${basePath}?shopify_error=connection_failed`);
  } catch (err) {
    console.error('Shopify OAuth callback error:', err);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/catalog/addons/shopify?shopify_error=server_error`);
  }
});

router.get('/oauth/authorize', requireAuth, async (req, res) => {
  try {
    const { shop, from } = req.query;
    const result = shopifyService.oauthAuthorize(req.userId, shop, from);
    if (result.redirect_url) return res.json({ success: true, redirect_url: result.redirect_url });
    return res.json({ success: false, message: result.message, status: result.status });
  } catch (error) {
    console.error('Shopify oauth authorize error:', error);
    return res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
});

// ============================================================================
// VENDOR – SHOPS
// ============================================================================

router.get('/shops', requireAuth, async (req, res) => {
  try {
    const shops = await shopifyService.getShops(req.userId);
    return res.json({ success: true, data: { shops } });
  } catch (error) {
    console.error('Shopify shops error:', error.message);
    return res.status(500).json({ success: false, error: { message: 'Failed to fetch shops' } });
  }
});

router.post('/shops/:shopId/disconnect', requireAuth, async (req, res) => {
  try {
    await shopifyService.disconnectShop(req.params.shopId, req.userId);
    return res.json({ success: true, data: { message: 'Shop disconnected' } });
  } catch (error) {
    console.error('Shopify disconnect error:', error.message);
    return res.status(500).json({ success: false, error: { message: 'Failed to disconnect shop' } });
  }
});

// ============================================================================
// VENDOR – PRODUCTS
// ============================================================================

router.get('/products', requireAuth, async (req, res) => {
  try {
    const products = await shopifyService.listProducts(req.userId);
    return res.json({ success: true, data: { products } });
  } catch (error) {
    console.error('Shopify products error:', error.message);
    return res.status(500).json({ success: false, error: { message: 'Failed to fetch products' } });
  }
});

router.post('/products/:productId', requireAuth, async (req, res) => {
  try {
    const result = await shopifyService.saveProduct(req.params.productId, req.userId, req.body);
    if (!result.found) return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    return res.json({ success: true, data: { message: 'Shopify product data saved' } });
  } catch (error) {
    console.error('Shopify product save error:', error.message);
    return res.status(500).json({ success: false, error: { message: 'Failed to save product' } });
  }
});

// ============================================================================
// VENDOR – INVENTORY
// ============================================================================

router.get('/inventory', requireAuth, async (req, res) => {
  try {
    const allocations = await shopifyService.getInventory(req.userId);
    return res.json({ success: true, data: { allocations } });
  } catch (error) {
    console.error('Shopify inventory error:', error.message);
    return res.status(500).json({ success: false, error: { message: 'Failed to fetch inventory' } });
  }
});

router.post('/inventory/:productId', requireAuth, async (req, res) => {
  try {
    const { allocated_quantity } = req.body;
    const result = await shopifyService.updateInventoryAllocation(req.params.productId, req.userId, allocated_quantity);
    if (!result.found) return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    return res.json({ success: true, data: { message: 'Allocation updated' } });
  } catch (error) {
    if (error.message && error.message.includes('allocate more')) {
      return res.status(400).json({ success: false, error: { message: error.message } });
    }
    console.error('Shopify inventory update error:', error.message);
    return res.status(500).json({ success: false, error: { message: 'Failed to update allocation' } });
  }
});

router.post('/allocations/bulk', requireAuth, async (req, res) => {
  try {
    const { allocations } = req.body;
    const result = await shopifyService.bulkAllocations(req.userId, allocations);
    return res.json({ success: true, data: { message: `Bulk update: ${result.successful} ok, ${result.failed} failed`, results: result } });
  } catch (error) {
    if (error.message && (error.message.includes('allocations must be') || error.message.includes('product_id') || error.message.includes('not found'))) {
      return res.status(400).json({ success: false, error: { message: error.message } });
    }
    console.error('Shopify bulk allocations error:', error.message);
    return res.status(500).json({ success: false, error: { message: 'Failed to update allocations' } });
  }
});

// ============================================================================
// VENDOR – LOGS
// ============================================================================

router.get('/logs', requireAuth, async (req, res) => {
  try {
    const { limit, sync_type, status } = req.query;
    const logs = await shopifyService.getLogs(req.userId, { limit, sync_type, status });
    return res.json({ success: true, data: { logs } });
  } catch (error) {
    console.error('Shopify logs error:', error.message);
    return res.status(500).json({ success: false, error: { message: 'Failed to fetch logs' } });
  }
});

// ============================================================================
// VENDOR – SYNC ACTIONS
// ============================================================================

router.post('/sync/product/:productId', requireAuth, async (req, res) => {
  try {
    const { shop_id } = req.body;
    if (!shop_id) return res.status(400).json({ success: false, error: { message: 'shop_id required' } });
    const result = await shopifyService.syncProductToShopify(req.params.productId, req.userId, shop_id);
    return res.json({ success: true, data: { message: 'Product synced to Shopify', result } });
  } catch (error) {
    console.error('Shopify product sync error:', error.message);
    return res.status(500).json({ success: false, error: { message: error.message || 'Sync failed' } });
  }
});

router.post('/sync/orders', requireAuth, async (req, res) => {
  try {
    const { shop_id } = req.body;
    if (!shop_id) return res.status(400).json({ success: false, error: { message: 'shop_id required' } });
    const result = await shopifyService.syncOrdersFromShopify(req.userId, shop_id);
    return res.json({ success: true, data: { message: `Synced ${result.synced} new orders`, result } });
  } catch (error) {
    console.error('Shopify order sync error:', error.message);
    return res.status(500).json({ success: false, error: { message: error.message || 'Sync failed' } });
  }
});

router.post('/inventory/update/:productId', requireAuth, async (req, res) => {
  try {
    const { shop_id, quantity } = req.body;
    if (!shop_id || quantity === undefined) {
      return res.status(400).json({ success: false, error: { message: 'shop_id and quantity required' } });
    }
    const result = await shopifyService.updateShopifyInventory(req.params.productId, req.userId, shop_id, parseInt(quantity));
    return res.json({ success: true, data: { message: 'Inventory updated on Shopify', result } });
  } catch (error) {
    console.error('Shopify inventory push error:', error.message);
    return res.status(500).json({ success: false, error: { message: error.message || 'Failed' } });
  }
});

// ============================================================================
// TEST
// ============================================================================

router.get('/test', requireAuth, async (req, res) => {
  try {
    const result = await shopifyService.testConnection();
    return res.json(result);
  } catch (error) {
    console.error('Shopify test error:', error.message);
    return res.status(500).json({ success: false, error: { message: 'Connection test failed' } });
  }
});

// ============================================================================
// ADMIN
// ============================================================================

router.get('/admin/products', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 25, search = '' } = req.query;
    const result = await shopifyService.adminListProducts({ status, page: parseInt(page), limit: parseInt(limit), search });
    return res.json({ success: true, data: { products: result.products, total: result.total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) {
    console.error('Shopify admin products error:', error.message);
    return res.status(500).json({ success: false, error: { message: 'Failed to fetch products' } });
  }
});

router.post('/admin/products/:productId/activate', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await shopifyService.adminActivate(req.params.productId);
    return res.json({ success: true, data: { message: 'Product activated' } });
  } catch (error) {
    console.error('Shopify admin activate error:', error.message);
    return res.status(500).json({ success: false, error: { message: 'Failed to activate' } });
  }
});

router.post('/admin/products/:productId/pause', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await shopifyService.adminPause(req.params.productId);
    return res.json({ success: true, data: { message: 'Product paused' } });
  } catch (error) {
    console.error('Shopify admin pause error:', error.message);
    return res.status(500).json({ success: false, error: { message: 'Failed to pause' } });
  }
});

router.put('/admin/products/:productId', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await shopifyService.adminUpdateProduct(req.params.productId, req.body);
    return res.json({ success: true, data: { message: 'Product updated' } });
  } catch (error) {
    console.error('Shopify admin update error:', error.message);
    return res.status(500).json({ success: false, error: { message: 'Failed to update' } });
  }
});

module.exports = router;
