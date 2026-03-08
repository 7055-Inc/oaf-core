const express = require('express');
const stripeService = require('../services/stripeService');
const verifyToken = require('../middleware/jwt');
const db = require('../../config/db');
const router = express.Router();

/**
 * @fileoverview Tax reporting routes
 * 
 * Handles comprehensive tax reporting functionality including:
 * - Vendor-specific tax summaries and state breakdowns
 * - Platform-wide tax reporting and analytics
 * - Multi-vendor tax report aggregation
 * - Order tax summary backfill operations
 * - State-by-state tax compliance reporting
 * 
 * All endpoints require authentication and provide detailed tax information
 * for compliance, accounting, and business intelligence purposes.
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

/**
 * Get vendor tax summary for a specific period
 * @route GET /api/tax-reports/vendor/:vendorId/:period
 * @access Private (requires authentication)
 * @param {Object} req - Express request object
 * @param {string} req.params.vendorId - Vendor ID
 * @param {string} req.params.period - Report period in YYYY-MM format
 * @param {Object} res - Express response object
 * @returns {Object} Comprehensive vendor tax summary with state-by-state breakdown
 * @description Generates detailed tax report for specific vendor including total sales, tax collected, and state breakdown
 */
router.get('/vendor/:vendorId/:period', verifyToken, async (req, res) => {
  try {
    const { vendorId, period } = req.params;
    
    // Validate period format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ error: 'Invalid period format. Use YYYY-MM' });
    }

    // Generate or get vendor tax summary
    const summary = await stripeService.generateVendorTaxSummary(vendorId, period);
    
    // Get state-by-state breakdown
    const stateBreakdown = await stripeService.getVendorStateTaxBreakdown(vendorId, period);
    
    res.json({
      success: true,
      vendor_id: vendorId,
      report_period: period,
      summary: summary,
      state_breakdown: stateBreakdown
    });
    
  } catch (error) {
    console.error('Error getting vendor tax report:', error);
    res.status(500).json({ error: 'Failed to generate vendor tax report' });
  }
});

/**
 * Get all vendor tax summaries for a period
 * @route GET /api/tax-reports/vendors/:period
 * @access Private (requires authentication)
 * @param {Object} req - Express request object
 * @param {string} req.params.period - Report period in YYYY-MM format
 * @param {Object} res - Express response object
 * @returns {Object} Aggregated tax summaries for all vendors with platform totals
 * @description Retrieves tax summaries for all vendors in specified period, ordered by tax collected
 */
router.get('/vendors/:period', verifyToken, async (req, res) => {
  try {
    const { period } = req.params;
    
    // Validate period format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ error: 'Invalid period format. Use YYYY-MM' });
    }

    // Get all vendors with tax summaries for this period
    const query = `
      SELECT 
        vts.*,
        u.username as vendor_name
      FROM vendor_tax_summary vts
      JOIN users u ON vts.vendor_id = u.id
      WHERE vts.report_period = ?
      ORDER BY vts.total_tax_collected DESC
    `;
    
    const [rows] = await db.execute(query, [period]);
    
    res.json({
      success: true,
      report_period: period,
      vendors: rows,
      total_vendors: rows.length,
      total_tax_collected: rows.reduce((sum, row) => sum + parseFloat(row.total_tax_collected || 0), 0)
    });
    
  } catch (error) {
    console.error('Error getting vendor tax reports:', error);
    res.status(500).json({ error: 'Failed to get vendor tax reports' });
  }
});

/**
 * Backfill order tax summaries for existing orders
 * @route POST /api/tax-reports/backfill
 * @access Private (requires authentication)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Backfill operation results and statistics
 * @description Processes existing orders to generate missing tax summaries for historical data
 */
router.post('/backfill', verifyToken, async (req, res) => {
  try {
    const result = await stripeService.backfillOrderTaxSummaries();
    
    res.json({
      success: true,
      message: 'Backfill completed',
      result: result
    });
    
  } catch (error) {
    console.error('Error backfilling order tax summaries:', error);
    res.status(500).json({ error: 'Failed to backfill order tax summaries' });
  }
});

/**
 * Get platform tax overview for a period
 * @route GET /api/tax-reports/platform/:period
 * @access Private (requires authentication)
 * @param {Object} req - Express request object
 * @param {string} req.params.period - Report period in YYYY-MM format
 * @param {Object} res - Express response object
 * @returns {Object} Platform-wide tax summary with state breakdown and analytics
 * @description Provides comprehensive platform tax overview including total sales, tax collected, and state-by-state analysis
 */
router.get('/platform/:period', verifyToken, async (req, res) => {
  try {
    const { period } = req.params;
    
    // Validate period format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ error: 'Invalid period format. Use YYYY-MM' });
    }

    // Get platform-wide tax summary
    const query = `
      SELECT 
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total_amount) as total_sales,
        SUM(o.tax_amount) as total_tax_collected,
        COUNT(DISTINCT ots.customer_state) as states_with_sales,
        AVG(ots.tax_rate_used) as avg_tax_rate
      FROM orders o
      LEFT JOIN order_tax_summary ots ON o.id = ots.order_id
      WHERE DATE_FORMAT(o.created_at, '%Y-%m') = ?
      AND o.status = 'paid'
    `;
    
    const [rows] = await db.execute(query, [period]);
    
    // Get state breakdown
    const stateQuery = `
      SELECT 
        ots.customer_state,
        COUNT(DISTINCT o.id) as order_count,
        SUM(o.total_amount) as total_sales,
        SUM(ots.tax_collected) as total_tax_collected,
        AVG(ots.tax_rate_used) as avg_tax_rate
      FROM orders o
      JOIN order_tax_summary ots ON o.id = ots.order_id
      WHERE DATE_FORMAT(o.created_at, '%Y-%m') = ?
      AND o.status = 'paid'
      GROUP BY ots.customer_state
      ORDER BY total_tax_collected DESC
    `;
    
    const [stateRows] = await db.execute(stateQuery, [period]);
    
    res.json({
      success: true,
      report_period: period,
      platform_summary: rows[0],
      state_breakdown: stateRows
    });
    
  } catch (error) {
    console.error('Error getting platform tax report:', error);
    res.status(500).json({ error: 'Failed to get platform tax report' });
  }
});

module.exports = router; 