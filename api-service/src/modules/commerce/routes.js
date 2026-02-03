/**
 * Commerce Module Routes
 * v2 API for orders and returns
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

const { requireAuth, requirePermission, requireRole } = require('../auth/middleware');
const { orders: ordersService, returns: returnsService, sales: salesService, shipping: shippingService } = require('./services');
const { couponsRouter, promotionsRouter } = require('./routesCoupons');
const wholesaleRouter = require('./routesWholesale');

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
// COUPONS & PROMOTIONS (v2 vendor coupon management)
// ============================================================================
router.use('/coupons', couponsRouter);
router.use('/promotions', promotionsRouter);

// ============================================================================
// WHOLESALE APPLICATIONS (v2 admin + customer wholesale management)
// ============================================================================
router.use('/wholesale', wholesaleRouter);

module.exports = router;
