const express = require('express');
const stripeService = require('../services/stripeService');
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');
const router = express.Router();

/**
 * Get vendor's tax summary for a specific period
 * GET /api/vendor/financials/my-tax-summary/:period
 */
router.get('/my-tax-summary/:period', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const { period } = req.params;
    const vendorId = req.userId;
    
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
    console.error('Error getting vendor tax summary:', error);
    res.status(500).json({ error: 'Failed to get vendor tax summary' });
  }
});

/**
 * Get vendor's state-by-state tax breakdown
 * GET /api/vendor/financials/my-state-breakdown/:period
 */
router.get('/my-state-breakdown/:period', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const { period } = req.params;
    const vendorId = req.userId;
    
    // Validate period format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ error: 'Invalid period format. Use YYYY-MM' });
    }

    const stateBreakdown = await stripeService.getVendorStateTaxBreakdown(vendorId, period);
    
    res.json({
      success: true,
      vendor_id: vendorId,
      report_period: period,
      state_breakdown: stateBreakdown
    });
    
  } catch (error) {
    console.error('Error getting vendor state breakdown:', error);
    res.status(500).json({ error: 'Failed to get vendor state breakdown' });
  }
});

/**
 * Get vendor's current tax liability across all states
 * GET /api/vendor/financials/my-tax-liability
 */
router.get('/my-tax-liability', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Get current month summary
    const currentSummary = await stripeService.generateVendorTaxSummary(vendorId, currentMonth);
    
    // Get last 12 months for trend analysis
    const monthlyData = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const period = date.toISOString().slice(0, 7);
      
      const summary = await stripeService.generateVendorTaxSummary(vendorId, period);
      if (summary.total_tax_collected > 0) {
        monthlyData.push({
          period: period,
          total_tax_collected: summary.total_tax_collected,
          total_sales: summary.total_sales,
          order_count: summary.order_count
        });
      }
    }
    
    res.json({
      success: true,
      vendor_id: vendorId,
      current_month: currentSummary,
      monthly_trend: monthlyData,
      total_annual_tax: monthlyData.reduce((sum, month) => sum + month.total_tax_collected, 0)
    });
    
  } catch (error) {
    console.error('Error getting vendor tax liability:', error);
    res.status(500).json({ error: 'Failed to get vendor tax liability' });
  }
});

/**
 * Get vendor's tax history with pagination
 * GET /api/vendor/financials/my-tax-history
 */
router.get('/my-tax-history', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;
    const { page = 1, limit = 20, period } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        ots.*,
        o.total_amount,
        o.created_at as order_date,
        o.status as order_status
      FROM order_tax_summary ots
      JOIN orders o ON ots.order_id = o.id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE p.vendor_id = ?
    `;
    
    const params = [vendorId];
    
    if (period) {
      query += ' AND DATE_FORMAT(o.created_at, "%Y-%m") = ?';
      params.push(period);
    }
    
    // Get total count
    const countQuery = query.replace('SELECT ots.*, o.total_amount, o.created_at as order_date, o.status as order_status', 'SELECT COUNT(*) as total');
    const [countRows] = await db.execute(countQuery, params);
    const total = countRows[0].total;
    
    // Get paginated data
    query += ` ORDER BY o.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${offset}`;
    
    const [rows] = await db.execute(query, params);
    
    res.json({
      success: true,
      vendor_id: vendorId,
      tax_history: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error getting vendor tax history:', error);
    res.status(500).json({ error: 'Failed to get vendor tax history' });
  }
});

/**
 * Get vendor's transaction history
 * GET /api/vendor/financials/my-transactions
 */
router.get('/my-transactions', verifyToken, requirePermission('stripe_connect'), async (req, res) => {
  try {
    const vendorId = req.userId;
    const { page = 1, limit = 20, type, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT 
        vt.*,
        o.id as order_number,
        o.total_amount as order_total,
        CASE 
          WHEN vt.transaction_type = 'sale' THEN 'Sale'
          WHEN vt.transaction_type = 'commission' THEN 'Commission'
          WHEN vt.transaction_type = 'payout' THEN 'Payout'
          WHEN vt.transaction_type = 'refund' THEN 'Refund'
          WHEN vt.transaction_type = 'adjustment' THEN 'Adjustment'
          WHEN vt.transaction_type = 'subscription_charge' THEN 'Subscription'
          ELSE vt.transaction_type
        END as type_display
      FROM vendor_transactions vt
      LEFT JOIN orders o ON vt.order_id = o.id
      WHERE vt.vendor_id = ?
    `;
    
    const params = [vendorId];
    
    if (type) {
      query += ' AND vt.transaction_type = ?';
      params.push(type);
    }
    
    if (status) {
      query += ' AND vt.status = ?';
      params.push(status);
    }
    
    // Get total count with same conditions
    let countQuery = `
      SELECT COUNT(*) as total
      FROM vendor_transactions vt
      WHERE vt.vendor_id = ?
    `;
    
    const countParams = [vendorId];
    
    if (type) {
      countQuery += ' AND vt.transaction_type = ?';
      countParams.push(type);
    }
    
    if (status) {
      countQuery += ' AND vt.status = ?';
      countParams.push(status);
    }
    
    const [countRows] = await db.execute(countQuery, countParams);
    const total = countRows[0] ? countRows[0].total : 0;
    
    // Add LIMIT and OFFSET to the query (must be direct values, not parameters)
    query += ` ORDER BY vt.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    
    console.log('Query:', query);
    console.log('Params count:', params.length);
    console.log('Params:', params);
    
    const [rows] = await db.execute(query, params);
    
    res.json({
      success: true,
      vendor_id: vendorId,
      transactions: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error getting vendor transactions:', error);
    // Return empty result instead of error if there are no transactions
    res.json({
      success: true,
      vendor_id: req.userId,
      transactions: [],
      pagination: {
        page: parseInt(req.query.page || 1),
        limit: parseInt(req.query.limit || 20),
        total: 0,
        pages: 0
      }
    });
  }
});

/**
 * Get vendor's current balance and financial overview
 * GET /api/vendor/financials/my-balance
 */
router.get('/my-balance', verifyToken, requirePermission('stripe_connect'), async (req, res) => {
  try {
    const vendorId = req.userId;
    
    const query = `
      SELECT 
        COALESCE(SUM(CASE 
          WHEN transaction_type IN ('sale', 'adjustment') AND status = 'completed' 
          THEN amount 
          ELSE 0 
        END), 0) as available_balance,
        
        COALESCE(SUM(CASE 
          WHEN transaction_type IN ('sale', 'adjustment') AND status = 'completed' AND payout_date <= CURDATE()
          THEN amount 
          ELSE 0 
        END), 0) as pending_payout,
        
        COALESCE(SUM(CASE 
          WHEN transaction_type = 'sale' AND status = 'completed'
          THEN amount 
          ELSE 0 
        END), 0) as total_sales,
        
        COUNT(CASE 
          WHEN transaction_type = 'sale' AND status = 'completed'
          THEN 1 
        END) as total_orders,
        
        COALESCE(SUM(CASE 
          WHEN transaction_type = 'payout' AND status = 'completed'
          THEN amount 
          ELSE 0 
        END), 0) as total_paid_out
      FROM vendor_transactions 
      WHERE vendor_id = ?
    `;
    
    const [rows] = await db.execute(query, [vendorId]);
    const balance = rows[0];
    
    balance.current_balance = balance.available_balance - balance.pending_payout;
    
    // Get vendor settings for payout information (with fallback defaults)
    let settings = {};
    try {
      const [settingsRows] = await db.execute(
        'SELECT commission_rate, payout_days FROM vendor_settings WHERE vendor_id = ?',
        [vendorId]
      );
      settings = settingsRows[0] || {};
    } catch (settingsError) {
      console.log('Vendor settings table may not exist, using defaults');
    }
    
    // Set defaults based on actual schema
    const minimumPayout = 25.00;
    const payoutDays = settings.payout_days || 15;
    
    res.json({
      success: true,
      vendor_id: vendorId,
      balance: balance,
      settings: {
        ...settings,
        minimum_payout: minimumPayout,
        payout_days: payoutDays
      },
      can_request_payout: balance.pending_payout >= minimumPayout
    });
    
  } catch (error) {
    console.error('Error getting vendor balance:', error);
    res.status(500).json({ error: 'Failed to get vendor balance' });
  }
});

/**
 * Get vendor's payout history and scheduled payouts
 * GET /api/vendor/financials/my-payouts
 */
router.get('/my-payouts', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    
    // Get payout transactions
    const query = `
      SELECT 
        vt.*,
        o.id as order_number
      FROM vendor_transactions vt
      LEFT JOIN orders o ON vt.order_id = o.id
      WHERE vt.vendor_id = ? AND vt.transaction_type = 'payout'
      ORDER BY vt.created_at DESC
      LIMIT ${parseInt(limit)} OFFSET ${offset}
    `;
    
    const [rows] = await db.execute(query, [vendorId]);
    
    // Get pending payouts
    const pendingQuery = `
      SELECT 
        COALESCE(SUM(amount), 0) as pending_amount,
        COUNT(*) as transaction_count,
        MIN(payout_date) as next_payout_date
      FROM vendor_transactions 
      WHERE vendor_id = ? 
        AND status = 'completed' 
        AND payout_date <= CURDATE()
        AND transaction_type IN ('sale', 'adjustment')
    `;
    
    const [pendingRows] = await db.execute(pendingQuery, [vendorId]);
    const pending = pendingRows[0];
    
    res.json({
      success: true,
      vendor_id: vendorId,
      payouts: rows,
      pending: pending,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('Error getting vendor payouts:', error);
    res.status(500).json({ error: 'Failed to get vendor payouts' });
  }
});

/**
 * Get vendor's financial settings
 * GET /api/vendor/financials/my-settings
 */
router.get('/my-settings', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;
    
    const query = `
      SELECT 
        vs.*,
        u.username as vendor_name
      FROM vendor_settings vs
      JOIN users u ON vs.vendor_id = u.id
      WHERE vs.vendor_id = ?
    `;
    
    const [rows] = await db.execute(query, [vendorId]);
    
    if (rows.length === 0) {
      return res.json({
        success: true,
        vendor_id: vendorId,
        settings: {
          commission_rate: 0.1,
          minimum_payout: 25.00,
          payment_schedule: 'weekly'
        }
      });
    }
    
    res.json({
      success: true,
      vendor_id: vendorId,
      settings: rows[0]
    });
    
  } catch (error) {
    console.error('Error getting vendor settings:', error);
    res.status(500).json({ error: 'Failed to get vendor settings' });
  }
});

/**
 * Update vendor's financial settings (limited fields)
 * PUT /api/vendor/financials/my-settings
 */
router.put('/my-settings', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;
    const { payment_schedule } = req.body;
    
    // Vendors can only update certain fields
    const allowedFields = ['payment_schedule'];
    const updates = [];
    const params = [];
    
    if (payment_schedule && ['weekly', 'biweekly', 'monthly'].includes(payment_schedule)) {
      updates.push('payment_schedule = ?');
      params.push(payment_schedule);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    params.push(vendorId);
    
    // Check if settings exist
    const [existing] = await db.execute(
      'SELECT id FROM vendor_settings WHERE vendor_id = ?',
      [vendorId]
    );
    
    if (existing.length > 0) {
      // Update existing settings
      await db.execute(
        `UPDATE vendor_settings SET ${updates.join(', ')}, updated_at = NOW() WHERE vendor_id = ?`,
        params
      );
    } else {
      // Create new settings with defaults
      await db.execute(
        'INSERT INTO vendor_settings (vendor_id, payment_schedule, commission_rate, minimum_payout) VALUES (?, ?, 0.1, 25.00)',
        [vendorId, payment_schedule || 'weekly']
      );
    }
    
    res.json({
      success: true,
      message: 'Vendor settings updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating vendor settings:', error);
    res.status(500).json({ error: 'Failed to update vendor settings' });
  }
});

/**
 * Get vendor's tax compliance status by state
 * GET /api/vendor/financials/my-compliance-status
 */
router.get('/my-compliance-status', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Get state-by-state breakdown for current month
    const stateBreakdown = await stripeService.getVendorStateTaxBreakdown(vendorId, currentMonth);
    
    // Define nexus thresholds (simplified - in reality these vary by state)
    const nexusThresholds = {
      'CA': 500000, // $500k for California
      'NY': 300000, // $300k for New York
      'TX': 500000, // $500k for Texas
      'FL': 100000, // $100k for Florida
      'default': 100000 // Default threshold
    };
    
    const complianceStatus = stateBreakdown.map(state => {
      const threshold = nexusThresholds[state.customer_state] || nexusThresholds.default;
      const hasNexus = state.total_taxable_amount >= threshold;
      
      return {
        state: state.customer_state,
        total_sales: state.total_taxable_amount,
        total_tax_collected: state.total_tax_collected,
        order_count: state.order_count,
        nexus_threshold: threshold,
        has_nexus: hasNexus,
        compliance_status: hasNexus ? 'active' : 'monitoring'
      };
    });
    
    res.json({
      success: true,
      vendor_id: vendorId,
      report_period: currentMonth,
      compliance_status: complianceStatus,
      states_with_nexus: complianceStatus.filter(state => state.has_nexus).length
    });
    
  } catch (error) {
    console.error('Error getting vendor compliance status:', error);
    res.status(500).json({ error: 'Failed to get vendor compliance status' });
  }
});

/**
 * Get available tax reports for vendor
 * GET /api/vendor/financials/my-tax-reports
 */
router.get('/my-tax-reports', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;
    
    // Get available report periods
    const query = `
      SELECT DISTINCT report_period
      FROM vendor_tax_summary
      WHERE vendor_id = ?
      ORDER BY report_period DESC
      LIMIT 12
    `;
    
    const [rows] = await db.execute(query, [vendorId]);
    
    const availableReports = rows.map(row => ({
      period: row.report_period,
      report_types: [
        'tax_summary',
        'state_breakdown',
        'compliance_report'
      ],
      download_urls: {
        tax_summary: `/api/vendor/financials/my-tax-summary/${row.report_period}`,
        state_breakdown: `/api/vendor/financials/my-state-breakdown/${row.report_period}`,
        compliance_report: `/api/vendor/financials/my-compliance-status?period=${row.report_period}`
      }
    }));
    
    res.json({
      success: true,
      vendor_id: vendorId,
      available_reports: availableReports
    });
    
  } catch (error) {
    console.error('Error getting vendor tax reports:', error);
    res.status(500).json({ error: 'Failed to get vendor tax reports' });
  }
});

module.exports = router; 