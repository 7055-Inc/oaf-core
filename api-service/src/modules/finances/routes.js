/**
 * Finances Module Routes
 * v2 API for vendor financial data and admin refund management
 */

const express = require('express');
const router = express.Router();

const { requireAuth, requirePermission } = require('../auth');
const financesService = require('./services');
const adminRefundsRoutes = require('./routesRefunds');

// Mount admin refunds routes under /admin
router.use('/admin', adminRefundsRoutes);

// ============================================================================
// BALANCE & OVERVIEW
// ============================================================================

/**
 * GET /api/v2/finances/balance
 * Get vendor's current balance and financial overview
 */
router.get('/balance', requireAuth, requirePermission('stripe_connect'), async (req, res) => {
  try {
    const result = await financesService.getBalance(req.userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/finances/earnings
 * Get earnings metrics (this month, last month, growth)
 */
router.get('/earnings', requireAuth, requirePermission('stripe_connect'), async (req, res) => {
  try {
    const metrics = await financesService.getEarningsMetrics(req.userId);

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

// ============================================================================
// TRANSACTIONS
// ============================================================================

/**
 * GET /api/v2/finances/transactions
 * Get vendor's transaction history
 */
router.get('/transactions', requireAuth, requirePermission('stripe_connect'), async (req, res) => {
  try {
    const { page = 1, limit = 50, type, status } = req.query;

    const result = await financesService.getTransactions(req.userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      status
    });

    res.json({
      success: true,
      data: result.transactions,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

// ============================================================================
// PAYOUTS
// ============================================================================

/**
 * GET /api/v2/finances/payouts
 * Get vendor's payout history
 */
router.get('/payouts', requireAuth, requirePermission('vendor'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const result = await financesService.getPayouts(req.userId, {
      page: parseInt(page),
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      data: result.payouts,
      pending: result.pending,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

// ============================================================================
// COMMISSION MANAGEMENT (Admin only)
// ============================================================================

/**
 * GET /api/v2/finances/commission-rates
 * Get all commission rates for admin management
 */
router.get('/commission-rates', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const result = await financesService.listCommissionRates();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching commission rates:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch commission rates', status: 500 }
    });
  }
});

/**
 * POST /api/v2/finances/commission-rates
 * Create a new commission rate setting
 */
router.post('/commission-rates', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const result = await financesService.createCommissionRate(req.body, req.userId);
    res.status(201).json({ success: true, ...result });
  } catch (error) {
    if (error.message.includes('required') || error.message.includes('must be') || error.message.includes('already has')) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message, status: 400 }
      });
    }
    console.error('Error creating commission rate:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create commission rate', status: 500 }
    });
  }
});

/**
 * PUT /api/v2/finances/commission-rates/bulk
 * Bulk update commission rates
 * NOTE: Must be before :id route to prevent "bulk" matching as an id
 */
router.put('/commission-rates/bulk', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { updates } = req.body;
    
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Updates array is required and must not be empty', status: 400 }
      });
    }

    const result = await financesService.bulkUpdateCommissionRates(updates, req.userId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in bulk commission update:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to process bulk update', status: 500 }
    });
  }
});

/**
 * PUT /api/v2/finances/commission-rates/:id
 * Update a single commission rate
 */
router.put('/commission-rates/:id', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const result = await financesService.updateCommissionRate(req.params.id, req.body, req.userId);
    res.json({ success: true, ...result });
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('inactive')) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message, status: 404 }
      });
    }
    if (error.message.includes('must be') || error.message.includes('Invalid')) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message, status: 400 }
      });
    }
    console.error('Error updating commission rate:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update commission rate', status: 500 }
    });
  }
});

module.exports = router;
