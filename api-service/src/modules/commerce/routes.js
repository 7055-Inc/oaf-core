/**
 * Commerce Module Routes
 * v2 API for orders and returns
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

const db = require('../../../config/db');
const { requireAuth, requirePermission, requireRole } = require('../auth/middleware');
const { orders: ordersService, returns: returnsService, sales: salesService, shipping: shippingService, checkout: checkoutService } = require('./services');
const { couponsRouter, promotionsRouter } = require('./routesCoupons');
const wholesaleRouter = require('./routesWholesale');
const subscriptionsRouter = require('./routesSubscriptions');
const adminApplicationsRouter = require('./routesAdminApplications');

// ============================================================================
// ADMIN ORDERS (must be before /orders/:id)
// ============================================================================

/**
 * GET /api/v2/commerce/admin/orders
 * Get all orders (admin only)
 */
router.get('/admin/orders', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all' } = req.query;

    const result = await ordersService.getAllOrders({
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });

    res.json({
      success: true,
      data: result.orders,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching admin orders:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

// ============================================================================
// ORDERS ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/commerce/orders/my
 * Get customer's order history
 */
router.get('/orders/my', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = 'all' } = req.query;

    const result = await ordersService.getMyOrders(req.userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });

    res.json({
      success: true,
      data: result.orders,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/commerce/orders/:id
 * Get single order details
 */
router.get('/orders/:id', requireAuth, async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = await ordersService.getOrderById(orderId, req.userId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found', status: 404 }
      });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

// ============================================================================
// RETURNS ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/commerce/returns/my
 * Get customer's return requests
 */
router.get('/returns/my', requireAuth, async (req, res) => {
  try {
    const { status = 'all' } = req.query;

    const returns = await returnsService.getMyReturns(req.userId, { status });

    res.json({ success: true, data: returns });
  } catch (error) {
    console.error('Error fetching returns:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * POST /api/v2/commerce/returns
 * Create a new return request
 */
router.post('/returns', requireAuth, async (req, res) => {
  try {
    const result = await returnsService.createReturn(req.userId, req.body);

    // Return flow-specific response
    let message = 'Return request created';
    let nextStep = 'pending';

    if (result.flow_type === 'A') {
      message = 'Return request created. Prepaid label will be generated.';
      nextStep = 'label_generation';
    } else if (result.flow_type === 'B') {
      if (req.body.label_preference === 'purchase_label') {
        message = 'Return request created. You can now purchase a return label.';
        nextStep = 'label_purchase';
      } else {
        message = 'Return request created. Please use your own shipping.';
        nextStep = 'self_ship';
      }
    } else if (result.flow_type === 'C') {
      message = 'Return request submitted for review.';
      nextStep = 'case_review';
    }

    res.status(201).json({
      success: true,
      data: result,
      message,
      next_step: nextStep
    });
  } catch (error) {
    console.error('Error creating return:', error);

    const status = error.message.includes('not found') ? 404 :
                   error.message.includes('access denied') ? 403 :
                   error.message.includes('Missing required') ? 400 :
                   error.message.includes('already exists') ? 409 : 500;

    res.status(status).json({
      success: false,
      error: { 
        code: status === 400 ? 'VALIDATION_ERROR' : 
              status === 403 ? 'FORBIDDEN' :
              status === 404 ? 'NOT_FOUND' :
              status === 409 ? 'CONFLICT' : 'INTERNAL_ERROR',
        message: error.message, 
        status 
      }
    });
  }
});

/**
 * POST /api/v2/commerce/returns/:id/message
 * Add message to return case
 */
router.post('/returns/:id/message', requireAuth, async (req, res) => {
  try {
    const returnId = parseInt(req.params.id);
    const { message } = req.body;

    const result = await returnsService.addMessage(returnId, req.userId, message);

    res.json({
      success: true,
      data: result,
      message: 'Message added successfully'
    });
  } catch (error) {
    console.error('Error adding message:', error);

    const status = error.message.includes('not found') ? 404 :
                   error.message.includes('required') ? 400 : 500;

    res.status(status).json({
      success: false,
      error: { code: status === 400 ? 'VALIDATION_ERROR' : 'NOT_FOUND', message: error.message, status }
    });
  }
});

/**
 * GET /api/v2/commerce/returns/:id/label
 * Get return label PDF
 */
router.get('/returns/:id/label', requireAuth, async (req, res) => {
  try {
    const returnId = parseInt(req.params.id);
    const returnData = await returnsService.getReturnLabel(returnId, req.userId);

    if (!returnData) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Return not found', status: 404 }
      });
    }

    if (!returnData.label_file_path) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No label found for this return', status: 404 }
      });
    }

    // Construct full file path
    const fullPath = path.join(__dirname, '../../../../public', returnData.label_file_path);

    try {
      await fs.access(fullPath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="return-label-${returnId}.pdf"`);
      res.sendFile(fullPath);
    } catch (fileError) {
      console.error('Label file not found:', fullPath);
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Label file not found', status: 404 }
      });
    }
  } catch (error) {
    console.error('Error retrieving label:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

// ============================================================================
// SALES ENDPOINTS (Vendor Orders)
// ============================================================================

/**
 * GET /api/v2/commerce/sales
 * Get vendor's orders (sales)
 * Requires vendor permission
 */
router.get('/sales', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 50 } = req.query;

    const result = await salesService.getVendorOrders(req.userId, {
      status,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: result.orders,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/commerce/sales/stats
 * Get vendor sales statistics
 */
router.get('/sales/stats', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const stats = await salesService.getVendorStats(req.userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching vendor stats:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/commerce/sales/items/:itemId
 * Get order item details for shipping form
 */
router.get('/sales/items/:itemId', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const item = await salesService.getOrderItemDetails(itemId, req.userId);

    if (!item) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order item not found', status: 404 }
      });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Error fetching order item:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * POST /api/v2/commerce/sales/items/:itemId/ship
 * Mark order item as shipped
 */
router.post('/sales/items/:itemId/ship', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const { carrier, tracking_number } = req.body;

    const result = await salesService.markItemShipped(itemId, req.userId, {
      carrier,
      tracking_number
    });

    res.json({
      success: true,
      data: result,
      message: 'Item marked as shipped'
    });
  } catch (error) {
    console.error('Error marking item shipped:', error);

    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      error: { code: status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: error.message, status }
    });
  }
});

/**
 * PATCH /api/v2/commerce/sales/items/:itemId/tracking
 * Update tracking information
 */
router.patch('/sales/items/:itemId/tracking', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    const { carrier, tracking_number } = req.body;

    const result = await salesService.updateTracking(itemId, req.userId, {
      carrier,
      tracking_number
    });

    res.json({
      success: true,
      data: result,
      message: 'Tracking updated'
    });
  } catch (error) {
    console.error('Error updating tracking:', error);

    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      error: { code: status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: error.message, status }
    });
  }
});

// ============================================================================
// SHIPPING ENDPOINTS (Sub-module)
// ============================================================================

/**
 * POST /api/v2/commerce/shipping/rates
 * Get shipping rates for an order item
 */
router.post('/shipping/rates', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const { item_id, packages } = req.body;

    if (!item_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'item_id is required', status: 400 }
      });
    }

    const rates = await shippingService.getRatesForItem(item_id, req.userId, packages);

    res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    console.error('Error getting shipping rates:', error);

    const status = error.message.includes('not found') ? 404 :
                   error.message.includes('not configured') ? 503 : 500;
    res.status(status).json({
      success: false,
      error: { code: status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR', message: error.message, status }
    });
  }
});

/**
 * GET /api/v2/commerce/shipping/labels
 * Get vendor's shipping labels
 */
router.get('/shipping/labels', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const { status, limit = 100 } = req.query;

    const labels = await shippingService.getVendorLabels(req.userId, {
      status,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: labels
    });
  } catch (error) {
    console.error('Error fetching labels:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * POST /api/v2/commerce/shipping/labels
 * Purchase a shipping label
 */
router.post('/shipping/labels', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const { item_id, selected_rate, packages } = req.body;

    if (!item_id || !selected_rate) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'item_id and selected_rate are required', status: 400 }
      });
    }

    const result = await shippingService.purchaseLabel(item_id, req.userId, {
      selected_rate,
      packages
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Label purchased successfully'
    });
  } catch (error) {
    console.error('Error purchasing label:', error);

    const status = error.message.includes('not found') ? 404 :
                   error.message.includes('subscription required') ? 402 :
                   error.message.includes('not configured') ? 503 : 500;
    res.status(status).json({
      success: false,
      error: { 
        code: status === 402 ? 'PAYMENT_REQUIRED' : 
              status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR', 
        message: error.message, 
        status 
      }
    });
  }
});

/**
 * POST /api/v2/commerce/shipping/labels/:id/cancel
 * Cancel a shipping label
 */
router.post('/shipping/labels/:id/cancel', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const labelId = parseInt(req.params.id);

    const result = await shippingService.cancelLabel(labelId, req.userId);

    res.json({
      success: true,
      data: result,
      message: 'Label cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling label:', error);

    const status = error.message.includes('not found') ? 404 :
                   error.message.includes('already cancelled') ? 409 : 500;
    res.status(status).json({
      success: false,
      error: { 
        code: status === 404 ? 'NOT_FOUND' : 
              status === 409 ? 'CONFLICT' : 'INTERNAL_ERROR', 
        message: error.message, 
        status 
      }
    });
  }
});

/**
 * GET /api/v2/commerce/shipping/labels/:filename
 * Serve shipping label PDF
 */
router.get('/shipping/labels/:filename', requireAuth, async (req, res) => {
  try {
    const { filename } = req.params;

    const filePath = await shippingService.getLabelFilePath(filename, req.userId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(filename)}"`);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Error serving label:', error);

    const status = error.message.includes('Access denied') ? 403 :
                   error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      success: false,
      error: { code: status === 403 ? 'FORBIDDEN' : 'NOT_FOUND', message: error.message, status }
    });
  }
});

// ============================================================================
// SHIPPING HUB ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/commerce/shipping/subscription
 * Get shipping subscription status
 */
router.get('/shipping/subscription', requireAuth, async (req, res) => {
  try {
    const status = await shippingService.getSubscriptionStatus(req.userId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error fetching shipping subscription:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/commerce/shipping/all-labels
 * Get all labels (order + standalone)
 */
router.get('/shipping/all-labels', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const { limit = 100, type = 'all' } = req.query;

    const labels = await shippingService.getAllLabels(req.userId, {
      limit: parseInt(limit),
      type
    });

    res.json({
      success: true,
      data: labels
    });
  } catch (error) {
    console.error('Error fetching all labels:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/commerce/shipping/stats
 * Get label statistics
 */
router.get('/shipping/stats', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const stats = await shippingService.getLabelStats(req.userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching label stats:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

// ============================================================================
// STANDALONE SHIPPING LABELS ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/commerce/shipping/vendor-address
 * Get vendor's return/ship-from address
 */
router.get('/shipping/vendor-address', requireAuth, async (req, res) => {
  try {
    const data = await shippingService.getVendorAddress(req.userId);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching vendor address:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * POST /api/v2/commerce/shipping/preferences
 * Save vendor shipping preferences (return address + label defaults)
 */
router.post('/shipping/preferences', requireAuth, async (req, res) => {
  try {
    const result = await shippingService.saveShippingPreferences(req.userId, req.body);

    res.json({
      success: true,
      data: result,
      message: 'Shipping preferences saved'
    });
  } catch (error) {
    console.error('Error saving shipping preferences:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/commerce/shipping/standalone-labels
 * Get vendor's standalone shipping labels (not tied to orders)
 */
router.get('/shipping/standalone-labels', requireAuth, async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const labels = await shippingService.getStandaloneLabels(req.userId, {
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: labels
    });
  } catch (error) {
    console.error('Error fetching standalone labels:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * POST /api/v2/commerce/shipping/standalone-rates
 * Calculate shipping rates for standalone label creation
 */
router.post('/shipping/standalone-rates', requireAuth, async (req, res) => {
  try {
    const { shipper_address, recipient_address, packages } = req.body;

    if (!shipper_address || !recipient_address) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Shipper and recipient addresses are required', status: 400 }
      });
    }

    if (!packages || !packages.length) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'At least one package is required', status: 400 }
      });
    }

    const rates = await shippingService.calculateStandaloneRates(req.userId, {
      shipper_address,
      recipient_address,
      packages
    });

    res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    console.error('Error calculating standalone rates:', error);

    const status = error.message.includes('not configured') ? 503 : 500;
    res.status(status).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status }
    });
  }
});

/**
 * POST /api/v2/commerce/shipping/calculate-cart-shipping
 * Calculate shipping rates for products in a cart/checkout or test packages
 */
router.post('/shipping/calculate-cart-shipping', requireAuth, async (req, res) => {
  try {
    const { cart_items, recipient_address, test_packages } = req.body;
    if (!cart_items || !Array.isArray(cart_items) || !recipient_address) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cart items and recipient address are required' } });
    }

    const carrierService = require('../../../services/shippingService');
    const shippingResults = [];
    const uniqueProductIds = [...new Set(cart_items.map(item => item.product_id))];

    for (const productId of uniqueProductIds) {
      try {
        let productShipping = [];
        let shippingInfo = null;

        if (productId === 'test' && test_packages) {
          productShipping = test_packages.map((pkg, index) => ({
            product_id: 'test', package_number: index + 1, ship_method: 'calculated',
            length: pkg.length, width: pkg.width, height: pkg.height, weight: pkg.weight,
            dimension_unit: pkg.dimension_unit, weight_unit: pkg.weight_unit, name: 'Test Product', vendor_id: 1
          }));
          shippingInfo = productShipping[0];
        } else {
          const [dbShipping] = await db.query(
            'SELECT ps.*, p.name as product_name, p.vendor_id FROM product_shipping ps JOIN products p ON ps.product_id = p.id WHERE ps.product_id = ? ORDER BY ps.package_number ASC',
            [productId]
          );
          productShipping = dbShipping;
          shippingInfo = productShipping[0];
        }

        if (!productShipping.length) {
          shippingResults.push({ product_id: productId, ship_method: 'free', cost: 0, error: 'No shipping configuration found' });
          continue;
        }

        if (shippingInfo.ship_method === 'free') {
          shippingResults.push({ product_id: productId, ship_method: 'free', cost: 0 });
        } else if (shippingInfo.ship_method === 'flat_rate') {
          const quantity = cart_items.filter(item => item.product_id === productId).reduce((sum, item) => sum + item.quantity, 0);
          shippingResults.push({ product_id: productId, ship_method: 'flat_rate', cost: parseFloat(shippingInfo.ship_rate) * quantity });
        } else if (shippingInfo.ship_method === 'calculated') {
          const vendorAddress = await carrierService.getVendorAddress(productShipping[0].vendor_id);
          const shipment = {
            shipper: { name: vendorAddress.name, address: vendorAddress },
            recipient: { name: recipient_address.name || 'Customer', address: recipient_address },
            packages: productShipping.map(ps => ({ length: parseFloat(ps.length), width: parseFloat(ps.width), height: parseFloat(ps.height), weight: parseFloat(ps.weight), dimension_unit: ps.dimension_unit, weight_unit: ps.weight_unit }))
          };
          const rates = await carrierService.calculateShippingRates(shipment);
          const cheapestRate = rates.length > 0 ? rates[0] : null;
          shippingResults.push({ product_id: productId, ship_method: 'calculated', cost: cheapestRate ? cheapestRate.cost : 0, available_rates: rates, selected_rate: cheapestRate });
        }
      } catch (error) {
        console.error(`Error calculating shipping for product ${productId}:`, error);
        shippingResults.push({ product_id: productId, ship_method: 'free', cost: 0, error: error.message });
      }
    }

    res.json({ success: true, data: { shipping_results: shippingResults, total_shipping: shippingResults.reduce((sum, r) => sum + r.cost, 0) } });
  } catch (error) {
    console.error('Error calculating cart shipping:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v2/commerce/shipping/standalone-labels
 * Create a standalone shipping label
 */
router.post('/shipping/standalone-labels', requireAuth, async (req, res) => {
  try {
    const { shipper_address, recipient_address, packages, selected_rate, force_card_payment } = req.body;

    if (!shipper_address || !recipient_address) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Shipper and recipient addresses are required', status: 400 }
      });
    }

    if (!selected_rate) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Selected rate is required', status: 400 }
      });
    }

    const result = await shippingService.createStandaloneLabel(req.userId, {
      shipper_address,
      recipient_address,
      packages: packages || [],
      selected_rate,
      force_card_payment
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Label created successfully'
    });
  } catch (error) {
    console.error('Error creating standalone label:', error);

    const status = error.message.includes('subscription required') ? 402 :
                   error.message.includes('not configured') ? 503 : 500;
    res.status(status).json({
      success: false,
      error: { 
        code: status === 402 ? 'PAYMENT_REQUIRED' : 'INTERNAL_ERROR', 
        message: error.message, 
        status 
      }
    });
  }
});

// ============================================================================
// VENDOR RETURNS ENDPOINTS (Sub-module)
// ============================================================================

/**
 * GET /api/v2/commerce/returns/vendor
 * Get vendor's return requests
 */
router.get('/returns/vendor', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const { status = 'all', limit = 100 } = req.query;

    const returns = await returnsService.getVendorReturns(req.userId, {
      status,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: returns
    });
  } catch (error) {
    console.error('Error fetching vendor returns:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/commerce/returns/vendor/stats
 * Get vendor return statistics
 */
router.get('/returns/vendor/stats', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const stats = await returnsService.getVendorReturnStats(req.userId);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching vendor return stats:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * POST /api/v2/commerce/returns/:id/vendor-message
 * Vendor adds message to return case
 */
router.post('/returns/:id/vendor-message', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const returnId = parseInt(req.params.id);
    const { message } = req.body;

    const result = await returnsService.addVendorMessage(returnId, req.userId, message);

    res.json({
      success: true,
      data: result,
      message: 'Message added successfully'
    });
  } catch (error) {
    console.error('Error adding vendor message:', error);

    const status = error.message.includes('not found') ? 404 :
                   error.message.includes('required') ? 400 : 500;
    res.status(status).json({
      success: false,
      error: { code: status === 400 ? 'VALIDATION_ERROR' : 'NOT_FOUND', message: error.message, status }
    });
  }
});

/**
 * POST /api/v2/commerce/returns/:id/receive
 * Vendor marks return as received
 */
router.post('/returns/:id/receive', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const returnId = parseInt(req.params.id);

    const result = await returnsService.markReturnReceived(returnId, req.userId);

    res.json({
      success: true,
      data: result,
      message: 'Return marked as received'
    });
  } catch (error) {
    console.error('Error marking return received:', error);

    const status = error.message.includes('not found') ? 404 :
                   error.message.includes('not in a receivable') ? 409 : 500;
    res.status(status).json({
      success: false,
      error: { 
        code: status === 404 ? 'NOT_FOUND' : 
              status === 409 ? 'CONFLICT' : 'INTERNAL_ERROR', 
        message: error.message, 
        status 
      }
    });
  }
});

// ============================================================================
// ADMIN RETURNS ENDPOINTS
// ============================================================================

router.get('/returns/admin/all', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { search, vendor } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (search) {
      whereClause += ' AND (r.id = ? OR o.id LIKE ? OR u.username LIKE ?)';
      params.push(search, `%${search}%`, `%${search}%`);
    }

    if (vendor) {
      whereClause += ' AND v.username LIKE ?';
      params.push(`%${vendor}%`);
    }

    const [returns] = await db.query(`
      SELECT 
        r.*,
        o.id as order_number,
        oi.product_name,
        oi.price as item_price,
        u.username as customer_username,
        v.username as vendor_username,
        sl.tracking_number,
        sl.label_file_path
      FROM returns r
      JOIN orders o ON r.order_id = o.id
      JOIN order_items oi ON r.order_item_id = oi.id
      JOIN users u ON r.user_id = u.id
      JOIN users v ON r.vendor_id = v.id
      LEFT JOIN shipping_labels sl ON r.shipping_label_id = sl.id
      ${whereClause}
      ORDER BY r.created_at DESC
      LIMIT 100
    `, params);

    res.json({ success: true, data: { returns } });
  } catch (error) {
    console.error('Error fetching admin returns:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch returns' } });
  }
});

router.get('/returns/admin/by-status/:status', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status } = req.params;

    const [returns] = await db.query(`
      SELECT 
        r.*,
        o.id as order_number,
        oi.product_name,
        oi.price as item_price,
        u.username as customer_username,
        v.username as vendor_username,
        sl.tracking_number,
        sl.label_file_path
      FROM returns r
      JOIN orders o ON r.order_id = o.id
      JOIN order_items oi ON r.order_item_id = oi.id
      JOIN users u ON r.user_id = u.id
      JOIN users v ON r.vendor_id = v.id
      LEFT JOIN shipping_labels sl ON r.shipping_label_id = sl.id
      WHERE r.return_status = ?
      ORDER BY r.created_at DESC
      LIMIT 100
    `, [status]);

    res.json({ success: true, data: { returns } });
  } catch (error) {
    console.error('Error fetching returns by status:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch returns' } });
  }
});

router.post('/returns/:id/admin-message', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const returnId = parseInt(req.params.id);
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Message is required' } });
    }

    const [returnCheck] = await db.query(
      'SELECT id, case_messages, return_status FROM returns WHERE id = ?',
      [returnId]
    );

    if (!returnCheck.length) {
      return res.status(404).json({ success: false, error: { message: 'Return not found' } });
    }

    const currentReturn = returnCheck[0];
    const timestamp = new Date().toLocaleString();
    const newMessage = `[${timestamp}] ADMIN: ${message.trim()}`;

    const updatedMessages = currentReturn.case_messages
      ? `${newMessage}\n---\n${currentReturn.case_messages}`
      : newMessage;

    await db.query(
      "UPDATE returns SET case_messages = ?, return_status = 'assistance_vendor', updated_at = NOW() WHERE id = ?",
      [updatedMessages, returnId]
    );

    res.json({ success: true, data: { message: 'Message added successfully' } });
  } catch (error) {
    console.error('Error adding admin message:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to add message' } });
  }
});

// ============================================================================
// VENDOR SETTINGS & ONBOARDING
// ============================================================================

const stripeService = require('../../services/stripeService');
const discountService = require('../../services/discountService');

/**
 * GET /api/v2/commerce/vendor/settings
 * Get vendor's Stripe Connect settings
 */
router.get('/vendor/settings', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const settings = await stripeService.getVendorSettings(req.userId);
    res.json({ success: true, data: { settings } });
  } catch (error) {
    console.error('Error getting vendor settings:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get settings', status: 500 }
    });
  }
});

/**
 * POST /api/v2/commerce/vendor/stripe-account
 * Create Stripe Connect account for vendor
 */
router.post('/vendor/stripe-account', requireAuth, requirePermission('stripe_connect'), async (req, res) => {
  try {
    const { business_info = {} } = req.body;

    const existingSettings = await stripeService.getVendorSettings(req.userId);
    if (existingSettings?.stripe_account_id) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_EXISTS', message: 'Stripe account already exists', status: 400 }
      });
    }

    const [vendorRows] = await db.query('SELECT username FROM users WHERE id = ?', [req.userId]);
    if (vendorRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Vendor not found', status: 404 }
      });
    }

    const account = await stripeService.createVendorAccount(req.userId, vendorRows[0].username, business_info);
    const accountLink = await stripeService.createAccountLink(account.id, req.userId);

    res.json({
      success: true,
      data: { stripe_account: { id: account.id, onboarding_url: accountLink.url } }
    });
  } catch (error) {
    console.error('Error creating Stripe account:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create Stripe account', status: 500 }
    });
  }
});

/**
 * GET /api/v2/commerce/vendor/stripe-onboarding
 * Get Stripe onboarding link for existing account
 */
router.get('/vendor/stripe-onboarding', requireAuth, requirePermission('stripe_connect'), async (req, res) => {
  try {
    const vendorSettings = await stripeService.getVendorSettings(req.userId);
    if (!vendorSettings?.stripe_account_id) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'No Stripe account found', status: 404 }
      });
    }

    const accountLink = await stripeService.createAccountLink(vendorSettings.stripe_account_id, req.userId);
    res.json({ success: true, data: { onboarding_url: accountLink.url } });
  } catch (error) {
    console.error('Error getting onboarding link:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get onboarding link', status: 500 }
    });
  }
});

/**
 * POST /api/v2/commerce/vendor/subscription-preferences
 * Update vendor subscription payment preferences
 */
router.post('/vendor/subscription-preferences', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const { payment_method, reverse_transfer_enabled } = req.body;

    if (payment_method && !['balance_first', 'card_only'].includes(payment_method)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid payment method', status: 400 }
      });
    }

    await db.query(`
      INSERT INTO vendor_settings (vendor_id, subscription_payment_method, reverse_transfer_enabled)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        subscription_payment_method = COALESCE(VALUES(subscription_payment_method), subscription_payment_method),
        reverse_transfer_enabled = COALESCE(VALUES(reverse_transfer_enabled), reverse_transfer_enabled),
        updated_at = CURRENT_TIMESTAMP
    `, [req.userId, payment_method, reverse_transfer_enabled]);

    res.json({ success: true, data: { message: 'Subscription preferences updated successfully' } });
  } catch (error) {
    console.error('Error updating subscription preferences:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update preferences', status: 500 }
    });
  }
});

/**
 * GET /api/v2/commerce/vendor/shipping-preferences
 * Get vendor shipping/label preferences
 */
router.get('/vendor/shipping-preferences', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const [preferences] = await db.query(
      'SELECT * FROM vendor_ship_settings WHERE vendor_id = ?',
      [req.userId]
    );

    if (preferences.length === 0) {
      return res.json({
        success: true,
        data: {
          preferences: {
            vendor_id: req.userId,
            return_company_name: '', return_contact_name: '',
            return_address_line_1: '', return_address_line_2: '',
            return_city: '', return_state: '', return_postal_code: '',
            return_country: 'US', return_phone: '',
            label_size_preference: '4x6',
            signature_required_default: false, insurance_default: false
          }
        }
      });
    }

    res.json({ success: true, data: { preferences: preferences[0] } });
  } catch (error) {
    console.error('Error fetching vendor shipping preferences:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch shipping preferences', status: 500 }
    });
  }
});

/**
 * POST /api/v2/commerce/vendor/shipping-preferences
 * Create or update vendor shipping preferences
 */
router.post('/vendor/shipping-preferences', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const {
      return_company_name, return_contact_name,
      return_address_line_1, return_address_line_2,
      return_city, return_state, return_postal_code,
      return_country, return_phone,
      label_size_preference, signature_required_default,
      insurance_default, handling_days
    } = req.body;

    const cleanVal = v => (v === undefined || v === '') ? null : v;

    await db.query(`
      INSERT INTO vendor_ship_settings (
        vendor_id, return_company_name, return_contact_name,
        return_address_line_1, return_address_line_2,
        return_city, return_state, return_postal_code,
        return_country, return_phone,
        label_size_preference, signature_required_default,
        insurance_default, handling_days
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        return_company_name = VALUES(return_company_name),
        return_contact_name = VALUES(return_contact_name),
        return_address_line_1 = VALUES(return_address_line_1),
        return_address_line_2 = VALUES(return_address_line_2),
        return_city = VALUES(return_city),
        return_state = VALUES(return_state),
        return_postal_code = VALUES(return_postal_code),
        return_country = VALUES(return_country),
        return_phone = VALUES(return_phone),
        label_size_preference = VALUES(label_size_preference),
        signature_required_default = VALUES(signature_required_default),
        insurance_default = VALUES(insurance_default),
        handling_days = VALUES(handling_days),
        updated_at = CURRENT_TIMESTAMP
    `, [
      req.userId,
      cleanVal(return_company_name), cleanVal(return_contact_name),
      cleanVal(return_address_line_1), cleanVal(return_address_line_2),
      cleanVal(return_city), cleanVal(return_state), cleanVal(return_postal_code),
      cleanVal(return_country) || 'US', cleanVal(return_phone),
      label_size_preference || '4x6',
      signature_required_default ? 1 : 0,
      insurance_default ? 1 : 0,
      handling_days != null ? handling_days : null
    ]);

    res.json({ success: true, data: { message: 'Shipping preferences updated successfully' } });
  } catch (error) {
    console.error('Error updating vendor shipping preferences:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update shipping preferences', status: 500 }
    });
  }
});

// ============================================================================
// CART
// ============================================================================

const jwt = require('jsonwebtoken');

router.get('/cart', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM carts WHERE user_id = ?', [req.userId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getting carts:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get carts', status: 500 } });
  }
});

router.get('/cart/unified', requireAuth, async (req, res) => {
  try {
    const [carts] = await db.query('SELECT * FROM carts WHERE user_id = ? ORDER BY created_at DESC', [req.userId]);
    const cartsWithItems = await Promise.all(
      carts.map(async (cart) => {
        const [items] = await db.query(`
          SELECT ci.*, p.name as product_name, p.price as current_price,
                 pi.image_url as image_path, u.username as vendor_name,
                 COALESCE(up.first_name, u.username) as vendor_display_name
          FROM cart_items ci
          JOIN products p ON ci.product_id = p.id
          JOIN users u ON ci.vendor_id = u.id
          LEFT JOIN user_profiles up ON u.id = up.user_id
          LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.order = 0
          WHERE ci.cart_id = ?
        `, [cart.id]);
        return { ...cart, items, item_count: items.length, total_value: items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0) };
      })
    );

    const groupedCarts = cartsWithItems.reduce((groups, cart) => {
      const source = cart.source_site_name || 'Main Site';
      if (!groups[source]) { groups[source] = { source_name: source, source_api_key: cart.source_site_api_key, carts: [], total_items: 0, total_value: 0 }; }
      groups[source].carts.push(cart);
      groups[source].total_items += cart.item_count;
      groups[source].total_value += cart.total_value;
      return groups;
    }, {});

    res.json({ success: true, data: {
      user_id: req.userId,
      total_carts: cartsWithItems.length,
      total_items: cartsWithItems.reduce((sum, cart) => sum + cart.item_count, 0),
      total_value: cartsWithItems.reduce((sum, cart) => sum + cart.total_value, 0),
      grouped_by_source: groupedCarts,
      all_carts: cartsWithItems
    }});
  } catch (error) {
    console.error('Unified cart error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get unified cart', status: 500 } });
  }
});

router.get('/cart/collections', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM cart_collections WHERE user_id = ?', [req.userId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getting collections:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get collections', status: 500 } });
  }
});

router.get('/cart/:cartId/items', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT ci.*, p.name as product_name, p.price as current_price,
             pi.image_url as image_path, u.username as vendor_name,
             COALESCE(up.first_name, u.username) as vendor_display_name
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      JOIN users u ON ci.vendor_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.order = 0
      WHERE ci.cart_id = ?
    `, [req.params.cartId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error getting cart items:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get cart items', status: 500 } });
  }
});

router.post('/cart', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    let userId = null;
    if (token) { try { userId = jwt.verify(token, process.env.JWT_SECRET).userId; } catch (e) { /* guest */ } }
    const { guest_token, status, source_site_api_key, source_site_name } = req.body;
    const [result] = await db.query('INSERT INTO carts (user_id, guest_token, source_site_api_key, source_site_name, status) VALUES (?, ?, ?, ?, ?)',
      [userId, guest_token || null, source_site_api_key || null, source_site_name || null, status || 'draft']);
    const [newCart] = await db.query('SELECT * FROM carts WHERE id = ?', [result.insertId]);
    res.json({ success: true, data: { cart: newCart[0] } });
  } catch (error) {
    console.error('Cart creation error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create cart', status: 500 } });
  }
});

router.put('/cart/:id', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    await db.query('UPDATE carts SET status = ? WHERE id = ? AND user_id = ?', [status, req.params.id, req.userId]);
    res.json({ success: true, data: { message: 'Cart updated' } });
  } catch (error) {
    console.error('Cart update error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update cart', status: 500 } });
  }
});

router.post('/cart/:cartId/items', requireAuth, async (req, res) => {
  try {
    const { product_id, vendor_id, quantity, price } = req.body;
    await db.query('INSERT INTO cart_items (cart_id, product_id, vendor_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
      [req.params.cartId, product_id, vendor_id, quantity, price]);
    res.json({ success: true, data: { message: 'Item added' } });
  } catch (error) {
    console.error('Add cart item error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to add item', status: 500 } });
  }
});

router.put('/cart/:cartId/items/:itemId', requireAuth, async (req, res) => {
  try {
    const { quantity, price } = req.body;
    await db.query('UPDATE cart_items SET quantity = ?, price = ? WHERE id = ? AND cart_id = ?',
      [quantity, price, req.params.itemId, req.params.cartId]);
    res.json({ success: true, data: { message: 'Item updated' } });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to update item', status: 500 } });
  }
});

router.delete('/cart/:cartId/items/:itemId', requireAuth, async (req, res) => {
  try {
    await db.query('DELETE FROM cart_items WHERE id = ? AND cart_id = ?', [req.params.itemId, req.params.cartId]);
    res.json({ success: true, data: { message: 'Item removed' } });
  } catch (error) {
    console.error('Delete cart item error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to remove item', status: 500 } });
  }
});

router.post('/cart/saved', requireAuth, async (req, res) => {
  try {
    const { product_id, quantity, notes, collection_name } = req.body;
    await db.query('INSERT INTO saved_items (user_id, product_id, quantity, notes, collection_name) VALUES (?, ?, ?, ?, ?)',
      [req.userId, product_id, quantity, notes, collection_name]);
    res.json({ success: true, data: { message: 'Item saved' } });
  } catch (error) {
    console.error('Save item error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to save item', status: 500 } });
  }
});

router.post('/cart/add', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    let userId = null;
    if (token) { try { userId = jwt.verify(token, process.env.JWT_SECRET).userId; } catch (e) { /* guest */ } }

    const { product_id, vendor_id, quantity = 1, price, guest_token, source_site_api_key, source_site_name } = req.body;
    if (!product_id || !vendor_id || !price) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Missing required fields', status: 400 } });
    }

    const [productCheck] = await db.query(
      'SELECT id, status, marketplace_enabled, website_catalog_enabled FROM products WHERE id = ? AND vendor_id = ?',
      [product_id, vendor_id]
    );
    if (!productCheck.length) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Product not found', status: 404 } });
    }
    const product = productCheck[0];
    if (product.status !== 'active') {
      return res.status(400).json({ success: false, error: { code: 'UNAVAILABLE', message: 'This product is not currently available', status: 400 } });
    }
    if (!product.marketplace_enabled && !product.website_catalog_enabled) {
      return res.status(400).json({ success: false, error: { code: 'NOT_LISTED', message: 'This product is not currently available for purchase', status: 400 } });
    }

    let cartId;
    if (userId) {
      const [existing] = await db.query('SELECT id FROM carts WHERE user_id = ? AND source_site_api_key = ? AND status = "draft" ORDER BY created_at DESC LIMIT 1', [userId, source_site_api_key || null]);
      if (existing.length > 0) { cartId = existing[0].id; }
      else { const [r] = await db.query('INSERT INTO carts (user_id, source_site_api_key, source_site_name, status) VALUES (?, ?, ?, ?)', [userId, source_site_api_key || null, source_site_name || 'Unknown Site', 'draft']); cartId = r.insertId; }
    } else {
      if (!guest_token) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'guest_token required', status: 400 } });
      const [existing] = await db.query('SELECT id FROM carts WHERE guest_token = ? AND source_site_api_key = ? AND status = "draft" ORDER BY created_at DESC LIMIT 1', [guest_token, source_site_api_key || null]);
      if (existing.length > 0) { cartId = existing[0].id; }
      else { const [r] = await db.query('INSERT INTO carts (guest_token, source_site_api_key, source_site_name, status) VALUES (?, ?, ?, ?)', [guest_token, source_site_api_key || null, source_site_name || 'Unknown Site', 'draft']); cartId = r.insertId; }
    }

    const [existingItems] = await db.query('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND vendor_id = ?', [cartId, product_id, vendor_id]);
    if (existingItems.length > 0) {
      await db.query('UPDATE cart_items SET quantity = ?, price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [existingItems[0].quantity + quantity, price, existingItems[0].id]);
    } else {
      await db.query('INSERT INTO cart_items (cart_id, product_id, vendor_id, quantity, price) VALUES (?, ?, ?, ?, ?)', [cartId, product_id, vendor_id, quantity, price]);
    }

    const [cartInfo] = await db.query('SELECT c.*, COUNT(ci.id) as item_count, COALESCE(SUM(ci.quantity * ci.price), 0) as total_value FROM carts c LEFT JOIN cart_items ci ON c.id = ci.cart_id WHERE c.id = ? GROUP BY c.id', [cartId]);
    res.json({ success: true, data: { message: 'Item added to cart successfully', cart: cartInfo[0], added_item: { product_id, vendor_id, quantity, price } } });
  } catch (error) {
    console.error('Enhanced add to cart error:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to add item to cart', status: 500 } });
  }
});

// ============================================================================
// CHECKOUT
// ============================================================================

router.post('/checkout/calculate-totals', requireAuth, async (req, res) => {
  try {
    const { cart_items, shipping_address, applied_coupons = [] } = req.body;
    if (!cart_items || !Array.isArray(cart_items)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cart items are required', status: 400 } });
    }

    const isWholesale = (req.permissions || []).includes('wholesale');
    const itemsWithDetails = await checkoutService.getCartItemsWithDetails(cart_items, isWholesale);

    const wholesaleValidation = await checkoutService.validateWholesaleRequirements(itemsWithDetails, isWholesale);

    const itemsWithShipping = await checkoutService.calculateShippingCosts(itemsWithDetails, shipping_address);
    const itemsWithDiscounts = await discountService.applyDiscounts(itemsWithShipping, req.userId, applied_coupons);
    const itemsWithCommissions = await stripeService.calculateCommissions(itemsWithDiscounts);
    const vendorGroups = checkoutService.groupItemsByVendor(itemsWithCommissions);
    const totals = checkoutService.calculateOrderTotals(itemsWithCommissions);

    res.json({
      success: true,
      data: {
        vendor_groups: vendorGroups,
        totals,
        items_with_commissions: itemsWithCommissions,
        is_wholesale: isWholesale,
        wholesale_warnings: wholesaleValidation.errors
      }
    });
  } catch (error) {
    console.error('Error calculating totals:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to calculate totals', status: 500 } });
  }
});

router.post('/checkout/create-payment-intent', requireAuth, async (req, res) => {
  try {
    const { cart_items, shipping_info, billing_info } = req.body;
    const userId = req.userId;
    if (!cart_items || !Array.isArray(cart_items)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cart items are required', status: 400 } });
    }

    const isWholesale = (req.permissions || []).includes('wholesale');
    const itemsWithDetails = await checkoutService.getCartItemsWithDetails(cart_items, isWholesale);

    const wholesaleValidation = await checkoutService.validateWholesaleRequirements(itemsWithDetails, isWholesale);
    if (!wholesaleValidation.valid) {
      return res.status(400).json({
        success: false,
        error: { code: 'WHOLESALE_MINIMUM_NOT_MET', message: 'Wholesale order requirements not met', status: 400, details: wholesaleValidation.errors }
      });
    }

    const itemsWithShipping = await checkoutService.calculateShippingCosts(itemsWithDetails, shipping_info);
    const itemsWithCommissions = await stripeService.calculateCommissions(itemsWithShipping);
    const totals = checkoutService.calculateOrderTotals(itemsWithCommissions);
    const orderId = await checkoutService.createOrder(userId, totals, itemsWithCommissions);

    let taxCalculation = null;
    let taxAmount = 0;

    if (billing_info && billing_info.address) {
      try {
        const line_items = itemsWithCommissions.map((item, index) => ({
          amount: Math.round(item.price * 100),
          reference: `L${index + 1}`
        }));

        taxCalculation = await stripeService.calculateTax({
          line_items,
          customer_address: {
            line1: billing_info.address.line1,
            line2: billing_info.address.line2 || null,
            city: billing_info.address.city,
            state: billing_info.address.state,
            postal_code: billing_info.address.postal_code,
            country: billing_info.address.country || 'US'
          },
          currency: 'usd'
        });

        taxAmount = taxCalculation.tax_amount_exclusive / 100;

        try {
          const taxRecordId = await stripeService.storeTaxCalculation({
            order_id: orderId,
            stripe_tax_id: taxCalculation.id,
            stripe_payment_intent_id: null,
            customer_state: billing_info.address.state,
            customer_zip: billing_info.address.postal_code,
            taxable_amount: totals.subtotal,
            tax_collected: taxAmount,
            tax_rate_used: taxCalculation.tax_breakdown?.[0]?.tax_rate_details?.percentage_decimal || 0,
            tax_breakdown: taxCalculation.tax_breakdown,
            order_date: new Date().toISOString().split('T')[0]
          });
          await stripeService.updateOrderTaxAmount(orderId, taxAmount);
          try { await stripeService.createOrderTaxSummary(orderId, taxRecordId); } catch (e) { console.error('Error creating order tax summary:', e); }
        } catch (e) { console.error('Error storing tax data:', e); }
      } catch (e) { console.error('Error calculating tax:', e); }
    }

    let customerId = null;
    if (billing_info && billing_info.email) {
      try {
        const customer = await stripeService.createOrGetCustomer(userId, billing_info.email, billing_info.name);
        customerId = customer.id;
        if (billing_info.address) await stripeService.updateCustomerAddress(customerId, billing_info.address);
      } catch (e) { console.error('Error creating/updating customer:', e); }
    }

    const totalWithTax = totals.subtotal + totals.shipping_total + taxAmount;
    const paymentIntent = await stripeService.createPaymentIntent({
      total_amount: totalWithTax,
      currency: 'usd',
      customer_id: customerId,
      metadata: { order_id: orderId, user_id: userId, vendor_count: totals.vendor_count, tax_calculation_id: taxCalculation?.id || null }
    });

    if (taxCalculation) {
      try {
        await db.execute('UPDATE stripe_tax_transactions SET stripe_payment_intent_id = ? WHERE order_id = ? AND stripe_tax_id = ?',
          [paymentIntent.id, orderId, taxCalculation.id]);
      } catch (e) { console.error('Error updating tax record with payment intent ID:', e); }
    }

    res.json({
      success: true,
      data: {
        payment_intent: { id: paymentIntent.id, client_secret: paymentIntent.client_secret, amount: paymentIntent.amount },
        order_id: orderId,
        totals: { ...totals, tax_amount: taxAmount, total_with_tax: totalWithTax },
        tax_info: taxCalculation ? { calculation_id: taxCalculation.id, tax_amount: taxAmount, tax_breakdown: taxCalculation.tax_breakdown } : null
      }
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create payment intent', status: 500 } });
  }
});

router.post('/checkout/confirm-payment', requireAuth, async (req, res) => {
  try {
    const { payment_intent_id, order_id } = req.body;
    const userId = req.userId;
    if (!payment_intent_id || !order_id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Payment intent ID and order ID are required', status: 400 } });
    }

    const order = await checkoutService.getOrderById(order_id);
    if (!order || order.user_id !== userId) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Order not found or access denied', status: 403 } });
    }

    await checkoutService.updateOrderPaymentIntent(order_id, payment_intent_id);
    await db.execute('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['paid', order_id]);

    try { await checkoutService.sendOrderConfirmationEmails(order_id, userId); }
    catch (emailError) { console.error('Error sending order confirmation emails:', emailError); }

    try {
      const [taxRecords] = await db.execute('SELECT stripe_tax_id FROM stripe_tax_transactions WHERE order_id = ?', [order_id]);
      if (taxRecords.length > 0 && taxRecords[0].stripe_tax_id) {
        await stripeService.createTaxTransaction(taxRecords[0].stripe_tax_id, `order_${order_id}`);
      }
    } catch (e) { console.error('Error creating tax transaction:', e); }

    await checkoutService.clearUserCart(userId);

    res.json({ success: true, data: { message: 'Payment confirmed, order processing', order_id } });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to confirm payment', status: 500 } });
  }
});

router.get('/checkout/validate-coupon/:code', requireAuth, async (req, res) => {
  try {
    const { code } = req.params;
    const { cart_items } = req.query;

    let parsedCartItems = [];
    if (cart_items) {
      try { parsedCartItems = JSON.parse(cart_items); } catch (e) { /* continue with empty */ }
    }

    let itemsWithDetails = [];
    if (parsedCartItems.length > 0) {
      const isWholesale = (req.permissions || []).includes('wholesale');
      itemsWithDetails = await checkoutService.getCartItemsWithDetails(parsedCartItems, isWholesale);
    }

    const validation = await discountService.validateCouponCode(code, req.userId, itemsWithDetails);

    res.json({ success: true, data: { valid: validation.valid, coupon: validation.coupon || null, error: validation.error || null } });
  } catch (error) {
    console.error('Error validating coupon:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to validate coupon', status: 500 } });
  }
});

router.post('/checkout/get-auto-discounts', requireAuth, async (req, res) => {
  try {
    const { cart_items } = req.body;
    if (!cart_items || !Array.isArray(cart_items)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Cart items are required', status: 400 } });
    }

    const isWholesale = (req.permissions || []).includes('wholesale');
    const itemsWithDetails = await checkoutService.getCartItemsWithDetails(cart_items, isWholesale);
    const itemsWithAutoDiscounts = await discountService.applyDiscounts(itemsWithDetails, req.userId, []);

    const autoDiscountedItems = itemsWithAutoDiscounts.filter(item =>
      item.discount_applied && item.discount_details && item.discount_details.source_type !== 'coupon'
    );

    res.json({
      success: true,
      data: { auto_discounted_items: autoDiscountedItems, items_with_auto_discounts: itemsWithAutoDiscounts }
    });
  } catch (error) {
    console.error('Error getting auto-discounts:', error);
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get auto-discounts', status: 500 } });
  }
});

// ============================================================================
// COUPONS & PROMOTIONS (v2 vendor coupon management)
// ============================================================================
router.use('/coupons', couponsRouter);
router.use('/promotions', promotionsRouter);

// ============================================================================
// PAYMENT METHODS (Stripe card-on-file)
// ============================================================================

router.get('/payment-methods', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [subscriptions] = await db.execute(`
      SELECT stripe_customer_id
      FROM user_subscriptions
      WHERE user_id = ? AND stripe_customer_id IS NOT NULL
      LIMIT 1
    `, [userId]);

    if (subscriptions.length === 0) {
      return res.json({ success: true, data: { paymentMethods: [] } });
    }

    const paymentMethods = await stripeService.stripe.paymentMethods.list({
      customer: subscriptions[0].stripe_customer_id,
      type: 'card'
    });

    const formattedMethods = paymentMethods.data.map(pm => ({
      id: pm.id,
      brand: pm.card.brand,
      last4: pm.card.last4,
      exp_month: pm.card.exp_month,
      exp_year: pm.card.exp_year,
      is_default: pm.id === paymentMethods.data[0].id
    }));

    res.json({ success: true, data: { paymentMethods: formattedMethods } });
  } catch (error) {
    console.error('Error fetching payment methods:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch payment methods' } });
  }
});

router.post('/payment-methods/create-setup-intent', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { subscription_type } = req.body;

    const [users] = await db.execute('SELECT username FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }

    let customerId;
    const [existing] = await db.execute(`
      SELECT stripe_customer_id
      FROM user_subscriptions
      WHERE user_id = ? AND stripe_customer_id IS NOT NULL
      LIMIT 1
    `, [userId]);

    if (existing.length > 0) {
      customerId = existing[0].stripe_customer_id;
    } else {
      const customer = await stripeService.createOrGetCustomer(
        userId, users[0].email || users[0].username, users[0].username
      );
      customerId = customer.id;
    }

    const setupIntent = await stripeService.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      usage: 'off_session',
      metadata: {
        user_id: userId.toString(),
        subscription_type: subscription_type || 'general',
        platform: 'brakebee'
      }
    });

    res.json({
      success: true,
      data: {
        setupIntent: { id: setupIntent.id, client_secret: setupIntent.client_secret, status: setupIntent.status },
        customer_id: customerId
      }
    });
  } catch (error) {
    console.error('Error creating setup intent:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to create setup intent' } });
  }
});

router.post('/payment-methods/confirm-setup', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { setup_intent_id, subscription_type } = req.body;

    if (!setup_intent_id) {
      return res.status(400).json({ success: false, error: { message: 'Setup intent ID is required' } });
    }

    const setupIntent = await stripeService.stripe.setupIntents.retrieve(setup_intent_id);
    if (setupIntent.status !== 'succeeded') {
      return res.status(400).json({ success: false, error: { message: 'Setup intent not completed' } });
    }

    const customerId = setupIntent.customer;
    const paymentMethodId = setupIntent.payment_method;

    await stripeService.stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId }
    });

    if (subscription_type) {
      const [existingSub] = await db.execute(
        'SELECT id FROM user_subscriptions WHERE user_id = ? AND subscription_type = ?',
        [userId, subscription_type]
      );
      if (existingSub.length === 0) {
        await db.execute(
          'INSERT INTO user_subscriptions (user_id, stripe_customer_id, subscription_type, status) VALUES (?, ?, ?, \'incomplete\')',
          [userId, customerId, subscription_type]
        );
      } else {
        await db.execute('UPDATE user_subscriptions SET stripe_customer_id = ? WHERE id = ?', [customerId, existingSub[0].id]);
      }
    }

    res.json({ success: true, data: { message: 'Payment method saved successfully', payment_method_id: paymentMethodId } });
  } catch (error) {
    console.error('Error confirming setup:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to confirm payment method setup' } });
  }
});

// ============================================================================
// WHOLESALE APPLICATIONS (v2 admin + customer wholesale management)
// ============================================================================
router.use('/wholesale', wholesaleRouter);

// ============================================================================
// SUBSCRIPTIONS (verified, shipping, marketplace)
// ============================================================================
router.use('/subscriptions', subscriptionsRouter);

// ============================================================================
// ADMIN APPLICATION REVIEW (marketplace + verified)
// ============================================================================
router.use('/admin', adminApplicationsRouter);

module.exports = router;
