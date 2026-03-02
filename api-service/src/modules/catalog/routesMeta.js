/**
 * Meta Connector Routes (v2)
 * Mounted at /api/v2/catalog/meta
 *
 * Hybrid connector: OAuth + Corporate
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../auth/middleware');
const metaService = require('./services/meta');

// ── OAUTH ────────────────────────────────────

router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code || !state) return res.redirect(`${process.env.FRONTEND_URL}/dashboard/catalog/addons/meta?meta_error=missing_params`);
    const result = await metaService.handleOAuthCallback(code, state);
    if (result.success) return res.redirect(`${process.env.FRONTEND_URL}/dashboard/catalog/addons/meta?meta_status=connected&shop_id=${encodeURIComponent(result.shop_id)}`);
    return res.redirect(`${process.env.FRONTEND_URL}/dashboard/catalog/addons/meta?meta_error=connection_failed`);
  } catch (err) {
    console.error('Meta OAuth callback error:', err);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard/catalog/addons/meta?meta_error=server_error`);
  }
});

router.get('/oauth/authorize', requireAuth, async (req, res) => {
  try {
    const result = metaService.oauthAuthorize(req.userId);
    if (result.redirect_url) return res.json({ success: true, redirect_url: result.redirect_url });
    return res.json({ success: false, message: result.message, status: result.status });
  } catch (error) {
    return res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
});

// ── SHOPS ────────────────────────────────────

router.get('/shops', requireAuth, async (req, res) => {
  try { const shops = await metaService.getShops(req.userId); return res.json({ success: true, data: { shops } }); }
  catch (error) { return res.status(500).json({ success: false, error: { message: 'Failed to fetch shops' } }); }
});

router.post('/shops/:shopId/disconnect', requireAuth, async (req, res) => {
  try { await metaService.disconnectShop(req.params.shopId, req.userId); return res.json({ success: true, data: { message: 'Account disconnected' } }); }
  catch (error) { return res.status(500).json({ success: false, error: { message: 'Failed to disconnect' } }); }
});

// ── PRODUCTS (Personal / OAuth) ──────────────

router.get('/products', requireAuth, async (req, res) => {
  try { const products = await metaService.listProducts(req.userId); return res.json({ success: true, data: { products } }); }
  catch (error) { return res.status(500).json({ success: false, error: { message: 'Failed to fetch products' } }); }
});

router.post('/products/:productId', requireAuth, async (req, res) => {
  try {
    const result = await metaService.saveProduct(req.params.productId, req.userId, req.body);
    if (!result.found) return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    return res.json({ success: true, data: { message: 'Meta product data saved' } });
  } catch (error) { return res.status(500).json({ success: false, error: { message: 'Failed to save product' } }); }
});

// ── INVENTORY ────────────────────────────────

router.get('/inventory', requireAuth, async (req, res) => {
  try { const allocations = await metaService.getInventory(req.userId); return res.json({ success: true, data: { allocations } }); }
  catch (error) { return res.status(500).json({ success: false, error: { message: 'Failed to fetch inventory' } }); }
});

router.post('/inventory/:productId', requireAuth, async (req, res) => {
  try {
    const result = await metaService.updateInventoryAllocation(req.params.productId, req.userId, req.body.allocated_quantity);
    if (!result.found) return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    return res.json({ success: true, data: { message: 'Allocation updated' } });
  } catch (error) {
    if (error.message?.includes('allocate more')) return res.status(400).json({ success: false, error: { message: error.message } });
    return res.status(500).json({ success: false, error: { message: 'Failed to update allocation' } });
  }
});

router.post('/allocations/bulk', requireAuth, async (req, res) => {
  try {
    const result = await metaService.bulkAllocations(req.userId, req.body.allocations);
    return res.json({ success: true, data: { message: `Bulk: ${result.successful} ok, ${result.failed} failed`, results: result } });
  } catch (error) {
    if (error.message?.includes('allocations must be') || error.message?.includes('not found'))
      return res.status(400).json({ success: false, error: { message: error.message } });
    return res.status(500).json({ success: false, error: { message: 'Bulk update failed' } });
  }
});

// ── LOGS ─────────────────────────────────────

router.get('/logs', requireAuth, async (req, res) => {
  try { const logs = await metaService.getLogs(req.userId, req.query); return res.json({ success: true, data: { logs } }); }
  catch (error) { return res.status(500).json({ success: false, error: { message: 'Failed to fetch logs' } }); }
});

// ── SYNC ─────────────────────────────────────

router.post('/sync/product/:productId', requireAuth, async (req, res) => {
  try {
    const { shop_id } = req.body;
    if (!shop_id) return res.status(400).json({ success: false, error: { message: 'shop_id required' } });
    const result = await metaService.syncProductToMeta(req.params.productId, req.userId, shop_id);
    return res.json({ success: true, data: { message: 'Product synced to Meta', result } });
  } catch (error) { return res.status(500).json({ success: false, error: { message: error.message || 'Sync failed' } }); }
});

router.post('/sync/orders', requireAuth, async (req, res) => {
  try {
    const { shop_id } = req.body;
    if (!shop_id) return res.status(400).json({ success: false, error: { message: 'shop_id required' } });
    const result = await metaService.syncOrdersFromMeta(req.userId, shop_id);
    return res.json({ success: true, data: { message: `Synced ${result.synced} new orders`, result } });
  } catch (error) { return res.status(500).json({ success: false, error: { message: error.message || 'Sync failed' } }); }
});

// ── CORPORATE CATALOG ────────────────────────

router.get('/corporate/products', requireAuth, async (req, res) => {
  try { const products = await metaService.listCorporateProducts(req.userId); return res.json({ success: true, products }); }
  catch (error) { return res.status(500).json({ success: false, error: 'Failed to fetch corporate products' }); }
});

router.get('/corporate/products/:productId', requireAuth, async (req, res) => {
  try {
    const product = await metaService.getCorporateProduct(req.params.productId, req.userId);
    if (!product) return res.status(404).json({ success: false, error: 'Product not found' });
    return res.json({ success: true, product });
  } catch (error) { return res.status(500).json({ success: false, error: 'Failed to fetch product' }); }
});

router.post('/corporate/products/:productId', requireAuth, async (req, res) => {
  try {
    const result = await metaService.saveCorporateProduct(req.params.productId, req.userId, req.body);
    if (!result.found) return res.status(404).json({ success: false, error: 'Product not found' });
    return res.json({ success: true, message: 'Corporate product submitted for approval' });
  } catch (error) { return res.status(500).json({ success: false, error: 'Failed to save corporate product' }); }
});

router.delete('/corporate/products/:productId', requireAuth, async (req, res) => {
  try {
    const result = await metaService.removeCorporateProduct(req.params.productId, req.userId);
    if (!result.found) return res.status(404).json({ success: false, error: 'Product not found' });
    return res.json({ success: true, message: 'Product removed from corporate catalog', cooldown_ends_at: result.cooldown_ends_at });
  } catch (error) { return res.status(500).json({ success: false, error: 'Failed to remove' }); }
});

// ── TEST ─────────────────────────────────────

router.get('/test', requireAuth, async (req, res) => {
  try { const result = await metaService.testConnection(); return res.json(result); }
  catch (error) { return res.status(500).json({ success: false, error: { message: 'Test failed' } }); }
});

// ── ADMIN (OAuth products) ───────────────────

router.get('/admin/products', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 25, search = '' } = req.query;
    const result = await metaService.adminListProducts({ status, page: parseInt(page), limit: parseInt(limit), search });
    return res.json({ success: true, data: { products: result.products, total: result.total, page: parseInt(page), limit: parseInt(limit) } });
  } catch (error) { return res.status(500).json({ success: false, error: { message: 'Failed to fetch products' } }); }
});

router.post('/admin/products/:productId/activate', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try { await metaService.adminActivate(req.params.productId); return res.json({ success: true, data: { message: 'Activated' } }); }
  catch (error) { return res.status(500).json({ success: false, error: { message: 'Failed' } }); }
});

router.post('/admin/products/:productId/pause', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try { await metaService.adminPause(req.params.productId); return res.json({ success: true, data: { message: 'Paused' } }); }
  catch (error) { return res.status(500).json({ success: false, error: { message: 'Failed' } }); }
});

router.put('/admin/products/:productId', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try { await metaService.adminUpdateProduct(req.params.productId, req.body); return res.json({ success: true, data: { message: 'Updated' } }); }
  catch (error) { return res.status(500).json({ success: false, error: { message: 'Failed' } }); }
});

// ── ADMIN CORPORATE ──────────────────────────

router.get('/admin/corporate/products', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 25, search = '' } = req.query;
    const result = await metaService.adminListCorporateProducts({ status, page: parseInt(page), limit: parseInt(limit), search });
    return res.json({ success: true, products: result.products, total: result.total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) { return res.status(500).json({ success: false, error: 'Failed to fetch corporate products' }); }
});

router.post('/admin/corporate/products/:productId/activate', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try { await metaService.adminActivateCorporate(req.params.productId, req.userId); return res.json({ success: true, message: 'Corporate product activated' }); }
  catch (error) { return res.status(500).json({ success: false, error: 'Failed to activate' }); }
});

router.post('/admin/corporate/products/:productId/pause', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try { await metaService.adminPauseCorporate(req.params.productId, req.userId); return res.json({ success: true, message: 'Corporate product paused' }); }
  catch (error) { return res.status(500).json({ success: false, error: 'Failed to pause' }); }
});

router.post('/admin/corporate/products/:productId/reject', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try { const { reason } = req.body; await metaService.adminRejectCorporate(req.params.productId, req.userId, reason); return res.json({ success: true, message: 'Rejected' }); }
  catch (error) { return res.status(500).json({ success: false, error: 'Failed to reject' }); }
});

router.put('/admin/corporate/products/:productId', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try { await metaService.adminUpdateCorporateProduct(req.params.productId, req.body); return res.json({ success: true, message: 'Updated' }); }
  catch (error) { return res.status(500).json({ success: false, error: 'Failed to update' }); }
});

module.exports = router;
