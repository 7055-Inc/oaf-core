/**
 * Wayfair Connector Routes (v2)
 * Mounted at /api/v2/catalog/wayfair
 *
 * Standard corporate connector contract:
 *   Vendor: categories, products CRUD, allocations, test
 *   Admin:  products list, activate, pause, reject, update
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../auth/middleware');
const wayfairService = require('./services/wayfair');

// ============================================================================
// VENDOR ROUTES (Corporate Product Submission)
// ============================================================================

router.get('/categories', requireAuth, async (req, res) => {
  try {
    const result = await wayfairService.getCategories();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching Wayfair categories:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch categories' } });
  }
});

router.post('/categories/refresh', requireAuth, async (req, res) => {
  try {
    wayfairService.refreshCategoriesCache();
    const result = await wayfairService.getCategories(false);
    res.json({ success: true, data: { message: 'Category cache refreshed', categoryCount: result.categories.length } });
  } catch (error) {
    console.error('Error refreshing Wayfair categories:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to refresh categories' } });
  }
});

router.get('/products', requireAuth, async (req, res) => {
  try {
    const products = await wayfairService.listProducts(req.userId);
    res.json({ success: true, data: { products } });
  } catch (error) {
    console.error('Error fetching Wayfair products:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch products' } });
  }
});

router.get('/products/:productId', requireAuth, async (req, res) => {
  try {
    const product = await wayfairService.getProduct(req.params.productId, req.userId);
    if (!product) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }
    res.json({ success: true, data: { product } });
  } catch (error) {
    console.error('Error fetching Wayfair product:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch product' } });
  }
});

router.post('/products/:productId', requireAuth, async (req, res) => {
  try {
    const result = await wayfairService.saveProduct(req.params.productId, req.userId, req.body);
    if (!result.found) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }
    if (result.error) {
      return res.status(400).json({ success: false, error: { message: result.error, cooldown_ends_at: result.cooldown_ends_at } });
    }
    res.json({ success: true, data: { message: 'Wayfair product data saved' } });
  } catch (error) {
    console.error('Error saving Wayfair product:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to save product' } });
  }
});

router.put('/products/:productId', requireAuth, async (req, res) => {
  try {
    const result = await wayfairService.updateProduct(req.params.productId, req.userId, req.body);
    if (!result.found) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }
    res.json({ success: true, data: { message: 'Wayfair product updated' } });
  } catch (error) {
    console.error('Error updating Wayfair product:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update product' } });
  }
});

router.delete('/products/:productId', requireAuth, async (req, res) => {
  try {
    const result = await wayfairService.removeProduct(req.params.productId, req.userId);
    if (!result.found) {
      return res.status(404).json({ success: false, error: { message: 'Product not found' } });
    }
    res.json({ success: true, data: { message: 'Product removed', cooldown_ends_at: result.cooldown_ends_at } });
  } catch (error) {
    console.error('Error removing Wayfair product:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to remove product' } });
  }
});

router.get('/allocations', requireAuth, async (req, res) => {
  try {
    const allocations = await wayfairService.getAllocations(req.userId);
    res.json({ success: true, data: { allocations } });
  } catch (error) {
    console.error('Error fetching Wayfair allocations:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch allocations' } });
  }
});

router.get('/test', requireAuth, async (req, res) => {
  try {
    const result = await wayfairService.testConnection();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Wayfair test error:', error);
    res.status(500).json({ success: false, error: { message: 'Connection test failed' } });
  }
});

// ============================================================================
// ORDER ROUTES
// ============================================================================

router.get('/orders', requireAuth, async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const result = await wayfairService.getOrders(req.userId, { status, page, limit });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching Wayfair orders:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch orders' } });
  }
});

router.get('/orders/:orderId', requireAuth, async (req, res) => {
  try {
    const order = await wayfairService.getOrderDetails(req.params.orderId, req.userId);
    if (!order) return res.status(404).json({ success: false, error: { message: 'Order not found' } });
    res.json({ success: true, data: { order } });
  } catch (error) {
    console.error('Error fetching Wayfair order:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch order' } });
  }
});

router.post('/orders/items/:itemId/tracking', requireAuth, async (req, res) => {
  try {
    const result = await wayfairService.addTracking(req.params.itemId, req.userId, req.body);
    if (!result.found) return res.status(404).json({ success: false, error: { message: 'Order item not found' } });
    res.json({ success: true, data: { message: 'Tracking added', order_id: result.order_id } });
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
    const inventory = await wayfairService.getInventory(req.userId);
    res.json({ success: true, data: { inventory } });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch inventory' } });
  }
});

router.post('/inventory/:productId', requireAuth, async (req, res) => {
  try {
    const { quantity } = req.body;
    const result = await wayfairService.updateInventoryAllocation(req.params.productId, req.userId, quantity);
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
    const results = await wayfairService.bulkAllocations(req.userId, allocations);
    res.json({ success: true, data: { results } });
  } catch (error) {
    console.error('Error bulk allocating:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to bulk allocate' } });
  }
});

// ============================================================================
// SHIPPING REGISTRATION & LABELS
// ============================================================================

router.get('/orders/:orderId/shipping-units', requireAuth, async (req, res) => {
  try {
    let units = await wayfairService.getShippingUnits(req.params.orderId);
    if (units.length === 0) {
      units = await wayfairService.getDefaultShippingUnits(req.params.orderId);
    }
    res.json({ success: true, data: { units, is_default: units.length > 0 && !units[0].id } });
  } catch (error) {
    console.error('Error fetching shipping units:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch shipping units' } });
  }
});

router.post('/orders/:orderId/shipping-units', requireAuth, async (req, res) => {
  try {
    const { units } = req.body;
    if (!Array.isArray(units) || units.length === 0) {
      return res.status(400).json({ success: false, error: { message: 'units must be a non-empty array' } });
    }
    const saved = await wayfairService.saveShippingUnits(req.params.orderId, units);
    res.json({ success: true, data: { units: saved } });
  } catch (error) {
    console.error('Error saving shipping units:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to save shipping units' } });
  }
});

router.post('/orders/:orderId/register', requireAuth, async (req, res) => {
  try {
    const { units } = req.body;
    if (units && Array.isArray(units) && units.length > 0) {
      await wayfairService.saveShippingUnits(req.params.orderId, units);
    }
    const result = await wayfairService.registerForShipment(req.params.orderId);
    if (!result.success) {
      return res.status(result.error === 'Order not found' ? 404 : 502).json({ success: false, error: { message: result.error, attempts: result.attempts } });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error registering for shipment:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to register for shipment' } });
  }
});

router.post('/orders/:orderId/register/retry', requireAuth, async (req, res) => {
  try {
    const result = await wayfairService.registerForShipment(req.params.orderId);
    if (!result.success) {
      return res.status(502).json({ success: false, error: { message: result.error, attempts: result.attempts, status: result.status } });
    }
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error retrying registration:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to retry registration' } });
  }
});

router.get('/orders/:orderId/registration', requireAuth, async (req, res) => {
  try {
    const status = await wayfairService.getRegistrationStatus(req.params.orderId);
    if (!status) return res.status(404).json({ success: false, error: { message: 'Order not found' } });
    res.json({ success: true, data: status });
  } catch (error) {
    console.error('Error fetching registration status:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch registration status' } });
  }
});

// ============================================================================
// SYNC LOGS
// ============================================================================

router.get('/logs', requireAuth, async (req, res) => {
  try {
    const { sync_type, status, page, limit } = req.query;
    const logs = await wayfairService.getSyncLogs({ sync_type, status, page, limit });
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
    const result = await wayfairService.adminListProducts({ status, page, limit, search });
    res.json({
      success: true,
      data: { products: result.products, total: result.total, page: parseInt(page) || 1, limit: parseInt(limit) || 25 }
    });
  } catch (error) {
    console.error('Error fetching admin Wayfair products:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch products' } });
  }
});

router.post('/admin/products/:productId/activate', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await wayfairService.adminActivate(req.params.productId, req.userId);
    res.json({ success: true, data: { message: 'Product activated' } });
  } catch (error) {
    console.error('Error activating Wayfair product:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to activate product' } });
  }
});

router.post('/admin/products/:productId/pause', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await wayfairService.adminPause(req.params.productId, req.userId);
    res.json({ success: true, data: { message: 'Product paused' } });
  } catch (error) {
    console.error('Error pausing Wayfair product:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to pause product' } });
  }
});

router.post('/admin/products/:productId/reject', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { reason } = req.body;
    await wayfairService.adminReject(req.params.productId, req.userId, reason);
    res.json({ success: true, data: { message: 'Product rejected' } });
  } catch (error) {
    console.error('Error rejecting Wayfair product:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to reject product' } });
  }
});

router.put('/admin/products/:productId', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await wayfairService.adminUpdateProduct(req.params.productId, req.body);
    res.json({ success: true, data: { message: 'Product updated' } });
  } catch (error) {
    console.error('Error updating Wayfair product:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update product' } });
  }
});

// ============================================================================
// ADMIN ORDER ROUTES
// ============================================================================

router.get('/admin/orders', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status, page, limit } = req.query;
    const result = await wayfairService.adminGetOrders({ status, page, limit });
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch orders' } });
  }
});

module.exports = router;
