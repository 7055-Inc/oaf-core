const express = require('express');
const stripeService = require('../services/stripeService');
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');
const router = express.Router();

/**
 * @fileoverview Admin financial management routes
 * 
 * Handles comprehensive financial administration functionality including:
 * - Platform financial overview and metrics
 * - Payout calculations and vendor balance management
 * - Manual adjustments for vendor accounts
 * - Vendor settings management (commission rates, payment schedules)
 * - Comprehensive tax reporting and compliance
 * - Transaction monitoring and analysis
 * - Multi-state tax compliance tracking
 * - Vendor financial details and history
 * 
 * All endpoints require 'manage_system' permission for security.
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

/**
 * Get platform financial overview
 * @route GET /api/admin/financial-overview
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Platform financial overview with revenue, payout, and volume metrics
 */
router.get('/financial-overview', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const overview = await stripeService.getPlatformFinancialOverview();
    res.json({ success: true, overview });
  } catch (error) {
    console.error('Error getting financial overview:', error);
    res.status(500).json({ error: 'Failed to get financial overview' });
  }
});

/**
 * Get detailed payout calculations for all vendors
 * @route GET /api/admin/payout-calculations
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Detailed payout calculations including current and future payouts
 */
router.get('/payout-calculations', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const calculations = await stripeService.getPayoutCalculations();
    res.json({ success: true, calculations });
  } catch (error) {
    console.error('Error getting payout calculations:', error);
    res.status(500).json({ error: 'Failed to get payout calculations' });
  }
});

/**
 * Create a manual adjustment for a vendor
 * @route POST /api/admin/manual-adjustment
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {number} req.body.vendor_id - Vendor ID for the adjustment
 * @param {number} req.body.amount - Adjustment amount
 * @param {string} req.body.description - Description of the adjustment
 * @param {string} req.body.type - Adjustment type ('credit' or 'debit')
 * @param {Object} res - Express response object
 * @returns {Object} Created adjustment information
 */
router.post('/manual-adjustment', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { vendor_id, amount, description, type } = req.body;
    
    if (!vendor_id || !amount || !description || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({ error: 'Type must be either credit or debit' });
    }

    const adjustmentAmount = type === 'credit' ? Math.abs(amount) : -Math.abs(amount);
    
    const [result] = await db.query(
      'INSERT INTO manual_adjustments (vendor_id, admin_id, amount, description, type) VALUES (?, ?, ?, ?, ?)',
      [vendor_id, req.userId, adjustmentAmount, description, type]
    );

    const adjustment = {
      id: result.insertId,
      vendor_id,
      admin_id: req.userId,
      amount: adjustmentAmount,
      description,
      type,
      created_at: new Date()
    };

    res.json({ success: true, adjustment });
  } catch (error) {
    console.error('Error creating manual adjustment:', error);
    res.status(500).json({ error: 'Failed to create manual adjustment' });
  }
});

/**
 * Get all manual adjustments with optional filters
 * @route GET /api/admin/manual-adjustments
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {number} req.query.vendor_id - Filter by vendor ID (optional)
 * @param {number} req.query.limit - Number of results to return (default: 100)
 * @param {number} req.query.offset - Offset for pagination (default: 0)
 * @param {Object} res - Express response object
 * @returns {Object} List of manual adjustments with vendor and admin information
 */
router.get('/manual-adjustments', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { vendor_id, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        ma.*,
        u.username as vendor_username,
        admin.username as admin_username
      FROM manual_adjustments ma
      JOIN users u ON ma.vendor_id = u.id
      JOIN users admin ON ma.admin_id = admin.id
    `;
    
    const params = [];
    
    if (vendor_id) {
      query += ' WHERE ma.vendor_id = ?';
      params.push(vendor_id);
    }
    
    query += ' ORDER BY ma.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [adjustments] = await db.query(query, params);
    
    res.json({ success: true, adjustments });
  } catch (error) {
    console.error('Error getting manual adjustments:', error);
    res.status(500).json({ error: 'Failed to get manual adjustments' });
  }
});

/**
 * Update vendor settings (commission rates, etc.)
 * @route POST /api/admin/vendor-settings
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {number} req.body.vendor_id - Vendor ID (required)
 * @param {number} req.body.commission_rate - Commission rate (0-1, optional)
 * @param {number} req.body.minimum_payout - Minimum payout amount (optional)
 * @param {string} req.body.payment_schedule - Payment schedule (optional)
 * @param {Object} res - Express response object
 * @returns {Object} Update confirmation
 */
router.post('/vendor-settings', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { vendor_id, commission_rate, minimum_payout, payment_schedule } = req.body;
    
    if (!vendor_id) {
      return res.status(400).json({ error: 'vendor_id is required' });
    }

    // Validate commission_rate if provided
    if (commission_rate !== undefined) {
      if (commission_rate < 0 || commission_rate > 1) {
        return res.status(400).json({ error: 'commission_rate must be between 0 and 1' });
      }
    }

    // Validate minimum_payout if provided
    if (minimum_payout !== undefined) {
      if (minimum_payout < 0) {
        return res.status(400).json({ error: 'minimum_payout must be non-negative' });
      }
    }

    // Check if settings already exist
    const [existing] = await db.query(
      'SELECT id FROM vendor_settings WHERE vendor_id = ?',
      [vendor_id]
    );

    if (existing.length > 0) {
      // Update existing settings
      const updates = [];
      const params = [];
      
      if (commission_rate !== undefined) {
        updates.push('commission_rate = ?');
        params.push(commission_rate);
      }
      if (minimum_payout !== undefined) {
        updates.push('minimum_payout = ?');
        params.push(minimum_payout);
      }
      if (payment_schedule !== undefined) {
        updates.push('payment_schedule = ?');
        params.push(payment_schedule);
      }
      
      if (updates.length > 0) {
        params.push(vendor_id);
        await db.query(
          `UPDATE vendor_settings SET ${updates.join(', ')}, updated_at = NOW() WHERE vendor_id = ?`,
          params
        );
      }
    } else {
      // Create new settings
      await db.query(
        'INSERT INTO vendor_settings (vendor_id, commission_rate, minimum_payout, payment_schedule) VALUES (?, ?, ?, ?)',
        [vendor_id, commission_rate || 0.1, minimum_payout || 25.00, payment_schedule || 'weekly']
      );
    }
    
    res.json({ success: true, message: 'Vendor settings updated successfully' });
  } catch (error) {
    console.error('Error updating vendor settings:', error);
    res.status(500).json({ error: 'Failed to update vendor settings' });
  }
});

/**
 * Get vendor settings for all vendors or specific vendor
 * @route GET /api/admin/vendor-settings
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {number} req.query.vendor_id - Filter by vendor ID (optional)
 * @param {Object} res - Express response object
 * @returns {Object} Vendor settings with username information
 */
router.get('/vendor-settings', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { vendor_id } = req.query;
    
    let query = `
      SELECT 
        vs.*,
        u.username as vendor_username
      FROM vendor_settings vs
      JOIN users u ON vs.vendor_id = u.id
    `;
    
    const params = [];
    
    if (vendor_id) {
      query += ' WHERE vs.vendor_id = ?';
      params.push(vendor_id);
    }
    
    query += ' ORDER BY u.username';
    
    const [settings] = await db.query(query, params);
    
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error getting vendor settings:', error);
    res.status(500).json({ error: 'Failed to get vendor settings' });
  }
});

/**
 * Get comprehensive vendor information for admin review
 * @route GET /api/admin/vendor-details/:vendor_id
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.vendor_id - Vendor ID
 * @param {Object} res - Express response object
 * @returns {Object} Comprehensive vendor information
 */
router.get('/vendor-details/:vendor_id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { vendor_id } = req.params;
    
    const vendorInfo = await stripeService.getVendorInfo(vendor_id);

    if (!vendorInfo) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({ success: true, vendor: vendorInfo });
  } catch (error) {
    console.error('Error getting vendor details:', error);
    res.status(500).json({ error: 'Failed to get vendor details' });
  }
});

// ===== HELPER FUNCTIONS =====

/**
 * Get platform financial overview
 * @param {number} periodDays - Number of days to include in the overview (default: 30)
 * @returns {Object} Platform financial metrics including revenue, payouts, and volume
 */
async function getPlatformFinancialOverview(periodDays = 30) {
  const query = `
    SELECT 
      -- Revenue metrics
      COALESCE(SUM(CASE WHEN vt.transaction_type = 'sale' AND vt.status = 'completed' THEN vt.commission_amount ELSE 0 END), 0) as total_commission_earned,
      COALESCE(SUM(CASE WHEN vt.transaction_type = 'sale' AND vt.status = 'completed' THEN vt.amount ELSE 0 END), 0) as total_vendor_sales,
      
      -- Payout metrics
      COALESCE(SUM(CASE WHEN vt.status = 'completed' AND vt.payout_date <= CURDATE() AND vt.transaction_type IN ('sale', 'adjustment') THEN vt.amount ELSE 0 END), 0) as pending_payouts,
      COALESCE(SUM(CASE WHEN vt.transaction_type = 'payout' AND vt.status = 'completed' THEN vt.amount ELSE 0 END), 0) as total_paid_out,
      
      -- Volume metrics
      COUNT(DISTINCT CASE WHEN vt.transaction_type = 'sale' THEN vt.order_id END) as total_orders,
      COUNT(DISTINCT vt.vendor_id) as active_vendors,
      
      -- Adjustment metrics
      COALESCE(SUM(CASE WHEN vt.transaction_type = 'adjustment' THEN vt.amount ELSE 0 END), 0) as total_adjustments,
      COUNT(CASE WHEN vt.transaction_type = 'adjustment' THEN 1 END) as adjustment_count
      
    FROM vendor_transactions vt
    WHERE vt.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
  `;
  
  const [rows] = await db.execute(query, [periodDays]);
  const overview = rows[0];
  
  // Calculate platform balance (commission earned - adjustments)
  overview.platform_balance = overview.total_commission_earned - Math.abs(overview.total_adjustments);
  
  return overview;
}

/**
 * Get real-time payout calculations
 * @returns {Object} Current and future payout calculations with platform balance
 */
async function getPayoutCalculations() {
  const query = `
    SELECT 
      -- Current payouts owed (approved but not yet transferred)
      COALESCE(SUM(CASE 
        WHEN vt.status = 'completed' 
        AND vt.payout_date <= CURDATE() 
        AND vt.transaction_type IN ('sale', 'adjustment')
        THEN vt.amount 
        ELSE 0 
      END), 0) as current_payouts_owed,
      
      -- Future payouts (not yet due)
      COALESCE(SUM(CASE 
        WHEN vt.status = 'completed' 
        AND vt.payout_date > CURDATE() 
        AND vt.transaction_type IN ('sale', 'adjustment')
        THEN vt.amount 
        ELSE 0 
      END), 0) as future_payouts,
      
      -- Total vendor balances
      COALESCE(SUM(CASE 
        WHEN vt.status = 'completed' 
        AND vt.transaction_type IN ('sale', 'adjustment')
        THEN vt.amount 
        ELSE 0 
      END), 0) as total_vendor_balances
      
    FROM vendor_transactions vt
  `;
  
  const [rows] = await db.execute(query);
  const calculations = rows[0];
  
  // Available to withdraw = Total commission earned - Total vendor balances
  const commissionQuery = `
    SELECT COALESCE(SUM(commission_amount), 0) as total_commission
    FROM vendor_transactions 
    WHERE transaction_type = 'sale' AND status = 'completed'
  `;
  
  const [commissionRows] = await db.execute(commissionQuery);
  const totalCommission = commissionRows[0].total_commission;
  
  calculations.available_to_withdraw = totalCommission - calculations.total_vendor_balances;
  calculations.break_even_point = calculations.total_vendor_balances;
  
  return calculations;
}

/**
 * Get manual adjustments with pagination
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 20)
 * @param {number} options.vendor_id - Filter by vendor ID (optional)
 * @returns {Object} Paginated manual adjustments with total count
 */
async function getManualAdjustments(options = {}) {
  const { page = 1, limit = 20, vendor_id } = options;
  const offset = (page - 1) * limit;
  
  let whereClause = '';
  let params = [];
  
  if (vendor_id) {
    whereClause = 'WHERE ma.vendor_id = ?';
    params.push(vendor_id);
  }
  
  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM manual_adjustments ma
    ${whereClause}
  `;
  
  const [countRows] = await db.execute(countQuery, params);
  const total = countRows[0].total;
  
  // Get adjustments
  const dataQuery = `
    SELECT 
      ma.*,
      v.username as vendor_name,
      a.username as admin_name
    FROM manual_adjustments ma
    LEFT JOIN users v ON ma.vendor_id = v.id
    LEFT JOIN users a ON ma.admin_id = a.id
    ${whereClause}
    ORDER BY ma.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  params.push(limit, offset);
  const [dataRows] = await db.execute(dataQuery, params);
  
  return {
    data: dataRows,
    total: total
  };
}

/**
 * Get all vendor settings
 * @param {Object} options - Query options
 * @param {number} options.page - Page number (default: 1)
 * @param {number} options.limit - Items per page (default: 50)
 * @returns {Object} Paginated vendor settings with total count
 */
async function getAllVendorSettings(options = {}) {
  const { page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;
  
  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM users u
    WHERE u.user_type = 'artist'
  `;
  
  const [countRows] = await db.execute(countQuery);
  const total = countRows[0].total;
  
  // Get vendor settings
  const dataQuery = `
    SELECT 
      u.id as vendor_id,
      u.username as vendor_name,
      u.status as vendor_status,
      vs.commission_rate,
      vs.payout_days,
      vs.stripe_account_id,
      vs.stripe_account_verified,
      vs.reverse_transfer_enabled,
      vs.subscription_payment_method,
      vs.created_at as settings_created,
      vs.updated_at as settings_updated
    FROM users u
    LEFT JOIN vendor_settings vs ON u.id = vs.vendor_id
    WHERE u.user_type = 'artist'
    ORDER BY u.username ASC
    LIMIT ? OFFSET ?
  `;
  
  const [dataRows] = await db.execute(dataQuery, [limit, offset]);
  
  return {
    data: dataRows,
    total: total
  };
}

/**
 * Get vendor info
 * @param {number} vendorId - Vendor ID
 * @returns {Object|null} Vendor information or null if not found
 */
async function getVendorInfo(vendorId) {
  const query = `
    SELECT 
      u.id,
      u.username,
      u.user_type,
      u.status,
      u.created_at,
      u.last_login
    FROM users u
    WHERE u.id = ? AND u.user_type = 'artist'
  `;
  
  const [rows] = await db.execute(query, [vendorId]);
  return rows[0] || null;
}

/**
 * Get vendor balance (reused from vendor routes)
 * @param {number} vendorId - Vendor ID
 * @returns {Object} Vendor balance information including available, pending, and total amounts
 */
async function getVendorBalance(vendorId) {
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
      END) as total_orders
      
    FROM vendor_transactions 
    WHERE vendor_id = ?
  `;
  
  const [rows] = await db.execute(query, [vendorId]);
  const balance = rows[0];
  
  balance.current_balance = balance.available_balance - balance.pending_payout;
  
  return balance;
}

/**
 * Get vendor transactions (reused from vendor routes)
 * @param {number} vendorId - Vendor ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of transactions to return (default: 20)
 * @returns {Array} List of vendor transactions with order and display information
 */
async function getVendorTransactions(vendorId, options = {}) {
  const { limit = 20 } = options;
  
  const query = `
    SELECT 
      vt.*,
      o.id as order_number,
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
    ORDER BY vt.created_at DESC
    LIMIT ?
  `;
  
  const [rows] = await db.execute(query, [vendorId, limit]);
  return rows;
}

// ===== ADMIN TAX REPORTING ENDPOINTS (/all pattern) =====

/**
 * Get all vendor tax summaries for a period
 * @route GET /api/admin/financials/all-vendor-tax-summaries/:period
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.period - Report period in YYYY-MM format
 * @param {Object} res - Express response object
 * @returns {Object} All vendor tax summaries for the specified period
 */
router.get('/all-vendor-tax-summaries/:period', verifyToken, requirePermission('manage_system'), async (req, res) => {
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
    console.error('Error getting all vendor tax summaries:', error);
    res.status(500).json({ error: 'Failed to get vendor tax summaries' });
  }
});

/**
 * Get all state compliance overview
 * @route GET /api/admin/financials/all-state-compliance/:period
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.period - Report period in YYYY-MM format
 * @param {Object} res - Express response object
 * @returns {Object} State-by-state tax compliance overview
 */
router.get('/all-state-compliance/:period', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { period } = req.params;
    
    // Validate period format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ error: 'Invalid period format. Use YYYY-MM' });
    }

    // Get state-by-state platform summary
    const query = `
      SELECT 
        ots.customer_state,
        COUNT(DISTINCT o.id) as total_orders,
        COUNT(DISTINCT p.vendor_id) as active_vendors,
        SUM(o.total_amount) as total_sales,
        SUM(ots.tax_collected) as total_tax_collected,
        AVG(ots.tax_rate_used) as avg_tax_rate
      FROM order_tax_summary ots
      JOIN orders o ON ots.order_id = o.id
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      WHERE DATE_FORMAT(o.created_at, '%Y-%m') = ?
      AND o.status = 'paid'
      GROUP BY ots.customer_state
      ORDER BY total_tax_collected DESC
    `;
    
    const [rows] = await db.execute(query, [period]);
    
    res.json({
      success: true,
      report_period: period,
      state_compliance: rows,
      total_states: rows.length,
      total_platform_tax: rows.reduce((sum, row) => sum + parseFloat(row.total_tax_collected || 0), 0)
    });
    
  } catch (error) {
    console.error('Error getting state compliance:', error);
    res.status(500).json({ error: 'Failed to get state compliance' });
  }
});

/**
 * Get platform tax overview
 * @route GET /api/admin/financials/all-tax-overview/:period
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.period - Report period in YYYY-MM format
 * @param {Object} res - Express response object
 * @returns {Object} Platform-wide tax overview for the specified period
 */
router.get('/all-tax-overview/:period', verifyToken, requirePermission('manage_system'), async (req, res) => {
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
        COUNT(DISTINCT p.vendor_id) as active_vendors,
        SUM(o.total_amount) as total_sales,
        SUM(o.tax_amount) as total_tax_collected,
        COUNT(DISTINCT ots.customer_state) as states_with_sales,
        AVG(ots.tax_rate_used) as avg_tax_rate
      FROM orders o
      LEFT JOIN order_tax_summary ots ON o.id = ots.order_id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE DATE_FORMAT(o.created_at, '%Y-%m') = ?
      AND o.status = 'paid'
    `;
    
    const [rows] = await db.execute(query, [period]);
    
    res.json({
      success: true,
      report_period: period,
      platform_overview: rows[0]
    });
    
  } catch (error) {
    console.error('Error getting platform tax overview:', error);
    res.status(500).json({ error: 'Failed to get platform tax overview' });
  }
});

/**
 * Get all vendor tax compliance status
 * @route GET /api/admin/financials/all-vendor-compliance/:period
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.period - Report period in YYYY-MM format
 * @param {Object} res - Express response object
 * @returns {Object} All vendor tax compliance status for the specified period
 */
router.get('/all-vendor-compliance/:period', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { period } = req.params;
    
    // Validate period format (YYYY-MM)
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return res.status(400).json({ error: 'Invalid period format. Use YYYY-MM' });
    }

    // Get all vendors with compliance status
    const query = `
      SELECT 
        u.id as vendor_id,
        u.username as vendor_name,
        COUNT(DISTINCT ots.customer_state) as states_with_sales,
        SUM(ots.tax_collected) as total_tax_collected,
        SUM(ots.taxable_amount) as total_taxable_amount,
        COUNT(DISTINCT o.id) as total_orders
      FROM users u
      LEFT JOIN products p ON u.id = p.vendor_id
      LEFT JOIN order_items oi ON p.id = oi.product_id
      LEFT JOIN orders o ON oi.order_id = o.id
      LEFT JOIN order_tax_summary ots ON o.id = ots.order_id
      WHERE u.user_type = 'artist'
      AND DATE_FORMAT(o.created_at, '%Y-%m') = ?
      AND o.status = 'paid'
      GROUP BY u.id, u.username
      HAVING total_tax_collected > 0
      ORDER BY total_tax_collected DESC
    `;
    
    const [rows] = await db.execute(query, [period]);
    
    res.json({
      success: true,
      report_period: period,
      vendor_compliance: rows,
      total_vendors_with_tax: rows.length
    });
    
  } catch (error) {
    console.error('Error getting vendor compliance:', error);
    res.status(500).json({ error: 'Failed to get vendor compliance' });
  }
});

/**
 * Get all transactions across all vendors
 * @route GET /api/admin/financials/all-transactions
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {number} req.query.page - Page number for pagination (default: 1)
 * @param {number} req.query.limit - Items per page (default: 20)
 * @param {string} req.query.type - Filter by transaction type (optional)
 * @param {string} req.query.status - Filter by transaction status (optional)
 * @param {Object} res - Express response object
 * @returns {Object} Paginated list of all vendor transactions
 */
router.get('/all-transactions', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { page = 1, limit = 20, type, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = `
      SELECT 
        vt.*,
        o.id as order_number,
        o.total_amount as order_total,
        u.username as vendor_name,
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
      LEFT JOIN users u ON vt.vendor_id = u.id
    `;
    
    const params = [];
    
    if (type) {
      query += ' WHERE vt.transaction_type = ?';
      params.push(type);
    }
    
    if (status) {
      query += type ? ' AND vt.status = ?' : ' WHERE vt.status = ?';
      params.push(status);
    }
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM vendor_transactions vt
      LEFT JOIN orders o ON vt.order_id = o.id
      LEFT JOIN users u ON vt.vendor_id = u.id
    `;
    
    if (type) {
      countQuery += ' WHERE vt.transaction_type = ?';
    }
    
    if (status) {
      countQuery += type ? ' AND vt.status = ?' : ' WHERE vt.status = ?';
    }
    
    const [countRows] = await db.execute(countQuery, params);
    const total = countRows[0].total;
    
    // Get paginated data (must be direct values, not parameters)
    query += ` ORDER BY vt.created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
    
    const [rows] = await db.execute(query, params);
    
    res.json({
      success: true,
      transactions: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('Error getting all transactions:', error);
    res.status(500).json({ error: 'Failed to get all transactions' });
  }
});

module.exports = router; 