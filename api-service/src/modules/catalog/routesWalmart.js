/**
 * Walmart Connector Routes (v2)
 * Mounted at /api/v2/catalog/walmart
 *
 * Standard corporate connector contract:
 *   Vendor: categories, products CRUD, allocations, test
 *   Admin:  products list, activate, pause, reject, update
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../auth/middleware');
const walmartService = require('./services/walmart');

// ============================================================================
// VENDOR ROUTES (Corporate Product Submission)
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
    const products = await walmartService.listProducts(req.userId);
    res.json({ success: true, data: { products } });
  } catch (error) {
    console.error('Error fetching Walmart products:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch products' } });
  }
});

router.get('/products/:productId', requireAuth, async (req, res) => {
  try {
    const product = await walmartService.getProduct(req.params.productId, req.userId);
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
    const result = await walmartService.saveProduct(req.params.productId, req.userId, req.body);
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
    const result = await walmartService.updateProduct(req.params.productId, req.userId, req.body);
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
    const result = await walmartService.removeProduct(req.params.productId, req.userId);
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
    const allocations = await walmartService.getAllocations(req.userId);
    res.json({ success: true, data: { allocations } });
  } catch (error) {
    console.error('Error fetching allocations:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch allocations' } });
  }
});

router.get('/test', requireAuth, async (req, res) => {
  try {
    const result = await walmartService.testConnection();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Walmart test error:', error);
    res.status(500).json({ success: false, error: { message: 'Connection test failed' } });
  }
});

// ============================================================================
// ORDER ROUTES
// ============================================================================

router.get('/orders', requireAuth, async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const result = await walmartService.getOrders(req.userId, { status, page, limit });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching Walmart orders:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch orders' } });
  }
});

router.get('/orders/:orderId', requireAuth, async (req, res) => {
  try {
    const order = await walmartService.getOrderDetails(req.params.orderId, req.userId);
    if (!order) return res.status(404).json({ success: false, error: { message: 'Order not found' } });
    res.json({ success: true, data: { order } });
  } catch (error) {
    console.error('Error fetching Walmart order:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch order' } });
  }
});

router.post('/orders/items/:itemId/tracking', requireAuth, async (req, res) => {
  try {
    const result = await walmartService.addTracking(req.params.itemId, req.userId, req.body);
    if (!result.found) return res.status(404).json({ success: false, error: { message: 'Order item not found' } });
    res.json({ success: true, data: { message: 'Tracking added', walmart_order_id: result.walmart_order_id } });
  } catch (error) {
    console.error('Error adding tracking:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to add tracking' } });
  }
});

// ============================================================================
// INVENTORY ROUTES
// ============================================================================

router.get('/inventory', requireAuth, async (req, res) => {
  try {
    const inventory = await walmartService.getInventory(req.userId);
    res.json({ success: true, data: { inventory } });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch inventory' } });
  }
});

router.post('/inventory/:productId', requireAuth, async (req, res) => {
  try {
    const { quantity } = req.body;
    const result = await walmartService.updateInventoryAllocation(req.params.productId, req.userId, quantity);
    if (!result.found) return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    res.json({ success: true, data: { message: 'Allocation updated', allocated: result.allocated } });
  } catch (error) {
    console.error('Error updating allocation:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update allocation' } });
  }
});

router.post('/allocations/bulk', requireAuth, async (req, res) => {
  try {
    const { allocations } = req.body;
    if (!Array.isArray(allocations)) return res.status(400).json({ success: false, error: { message: 'allocations must be an array' } });
    const results = await walmartService.bulkAllocations(req.userId, allocations);
    res.json({ success: true, data: { results } });
  } catch (error) {
    console.error('Error bulk allocating:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to bulk allocate' } });
  }
});

// ============================================================================
// SYNC LOGS
// ============================================================================

router.get('/logs', requireAuth, async (req, res) => {
  try {
    const { sync_type, status, page, limit } = req.query;
    const logs = await walmartService.getSyncLogs({ sync_type, status, page, limit });
    res.json({ success: true, data: { logs } });
  } catch (error) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch sync logs' } });
  }
});

// ============================================================================
// ADMIN ROUTES (Corporate Product Management)
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
    await walmartService.adminActivate(req.params.productId, req.userId);
    res.json({ success: true, data: { message: 'Product activated' } });
  } catch (error) {
    console.error('Error activating product:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to activate product' } });
  }
});

router.post('/admin/products/:productId/pause', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await walmartService.adminPause(req.params.productId, req.userId);
    res.json({ success: true, data: { message: 'Product paused' } });
  } catch (error) {
    console.error('Error pausing product:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to pause product' } });
  }
});

router.post('/admin/products/:productId/reject', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { reason } = req.body;
    await walmartService.adminReject(req.params.productId, req.userId, reason);
    res.json({ success: true, data: { message: 'Product rejected' } });
  } catch (error) {
    console.error('Error rejecting product:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to reject product' } });
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

// ============================================================================
// ADMIN ORDER ROUTES
// ============================================================================

router.get('/admin/orders', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const result = await walmartService.adminGetOrders({ status, page, limit });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch orders' } });
  }
});

module.exports = router;
