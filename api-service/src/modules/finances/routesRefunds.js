/**
 * Admin Refunds Routes
 * v2 API for centralized payment and refund management
 */

const express = require('express');
const router = express.Router();

const { requireAuth, requirePermission } = require('../auth');
const refundsService = require('./services/refunds');

/**
 * GET /api/v2/finances/admin/payments
 * List all payments across the platform for admin refund management
 */
router.get('/payments', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { days, type, search, page, limit, sort, order } = req.query;

    const result = await refundsService.listPayments({
      days: parseInt(days) || 90,
      type: type || 'all',
      search: search || '',
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      sort: sort || 'created_at',
      order: order || 'desc'
    });

    res.json({
      success: true,
      data: result.payments,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error listing payments:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/finances/admin/payments/:type/:id
 * Get a single payment by type and ID
 */
router.get('/payments/:type/:id', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { type, id } = req.params;
    const payment = await refundsService.getPayment(type, parseInt(id));

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message, status: 404 }
      });
    }
    console.error('Error getting payment:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * POST /api/v2/finances/admin/payments/:type/:id/refund
 * Process a refund for a payment
 */
router.post('/payments/:type/:id/refund', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { type, id } = req.params;
    const { amount, reason } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid refund amount is required', status: 400 }
      });
    }

    const result = await refundsService.processRefund(
      type,
      parseInt(id),
      parseFloat(amount),
      reason || '',
      req.userId
    );

    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    if (error.message.includes('exceeds') || error.message.includes('must be')) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message, status: 400 }
      });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message, status: 404 }
      });
    }
    console.error('Error processing refund:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/finances/admin/refunds
 * List all processed refunds
 */
router.get('/refunds', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { page, limit, search } = req.query;

    const result = await refundsService.listRefunds({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      search: search || ''
    });

    res.json({
      success: true,
      data: result.refunds,
      stats: result.stats,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error listing refunds:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

module.exports = router;
