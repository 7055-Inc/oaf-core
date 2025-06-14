const express = require('express');
const stripeService = require('../services/stripeService');
const db = require('../../config/db');
const authenticateToken = require('../middleware/jwt');
const router = express.Router();

/**
 * Middleware to verify admin access
 */
const requireAdmin = (req, res, next) => {
  if (req.user.user_type !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Get platform financial overview
 * GET /api/admin/financial-overview
 */
router.get('/financial-overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const overview = await stripeService.getPlatformFinancialOverview();
    res.json({ success: true, overview });
  } catch (error) {
    console.error('Error getting financial overview:', error);
    res.status(500).json({ error: 'Failed to get financial overview' });
  }
});

/**
 * Get real-time payout calculations
 * GET /api/admin/payout-calculations
 */
router.get('/payout-calculations', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const calculations = await getPayoutCalculations();
    
    res.json({
      success: true,
      payout_calculations: calculations
    });
    
  } catch (error) {
    console.error('Error getting payout calculations:', error);
    res.status(500).json({ error: 'Failed to get payout calculations' });
  }
});

/**
 * Create manual balance adjustment
 * POST /api/admin/manual-adjustment
 */
router.post('/manual-adjustment', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { vendor_id, amount, reason_code, internal_notes, vendor_visible_reason } = req.body;
    const adminId = req.user.id;
    
    if (!vendor_id || !amount || !reason_code) {
      return res.status(400).json({ error: 'vendor_id, amount, and reason_code are required' });
    }

    const adjustmentQuery = `
      INSERT INTO manual_adjustments 
      (vendor_id, admin_id, amount, reason_code, internal_notes, vendor_visible_reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await db.execute(adjustmentQuery, [
      vendor_id, adminId, amount, reason_code, internal_notes, vendor_visible_reason
    ]);

    await stripeService.recordVendorTransaction({
      vendor_id: vendor_id,
      order_id: null,
      transaction_type: 'adjustment',
      amount: amount,
      status: 'completed'
    });

    res.json({ success: true, adjustment_id: result.insertId });
  } catch (error) {
    console.error('Error creating manual adjustment:', error);
    res.status(500).json({ error: 'Failed to create manual adjustment' });
  }
});

/**
 * Get manual adjustments history
 * GET /api/admin/manual-adjustments
 */
router.get('/manual-adjustments', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, vendor_id } = req.query;
    
    const adjustments = await getManualAdjustments({
      page: parseInt(page),
      limit: parseInt(limit),
      vendor_id: vendor_id
    });
    
    res.json({
      success: true,
      adjustments: adjustments.data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: adjustments.total,
        pages: Math.ceil(adjustments.total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error getting manual adjustments:', error);
    res.status(500).json({ error: 'Failed to get manual adjustments' });
  }
});

/**
 * Update vendor commission rate and payout settings
 * POST /api/admin/vendor-settings
 */
router.post('/vendor-settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { vendor_id, commission_rate, payout_days } = req.body;
    
    if (!vendor_id) {
      return res.status(400).json({ error: 'vendor_id is required' });
    }

    // Validate vendor exists
    const vendorQuery = 'SELECT id FROM users WHERE id = ? AND user_type = ?';
    const [vendorRows] = await db.execute(vendorQuery, [vendor_id, 'artist']);
    
    if (vendorRows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // Update vendor settings
    const updateQuery = `
      INSERT INTO vendor_settings (vendor_id, commission_rate, payout_days) 
      VALUES (?, ?, ?) 
      ON DUPLICATE KEY UPDATE 
        commission_rate = COALESCE(VALUES(commission_rate), commission_rate),
        payout_days = COALESCE(VALUES(payout_days), payout_days),
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await db.execute(updateQuery, [vendor_id, commission_rate, payout_days]);
    
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
 * Get all vendor settings for management
 * GET /api/admin/vendor-settings
 */
router.get('/vendor-settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    
    const vendorSettings = await getAllVendorSettings({
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      vendor_settings: vendorSettings.data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: vendorSettings.total,
        pages: Math.ceil(vendorSettings.total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error getting vendor settings:', error);
    res.status(500).json({ error: 'Failed to get vendor settings' });
  }
});

/**
 * Get vendor financial details for admin review
 * GET /api/admin/vendor-details/:vendor_id
 */
router.get('/vendor-details/:vendor_id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { vendor_id } = req.params;
    
    const [vendorInfo, balance, recentTransactions, settings] = await Promise.all([
      getVendorInfo(vendor_id),
      getVendorBalance(vendor_id),
      getVendorTransactions(vendor_id, { limit: 20 }),
      stripeService.getVendorSettings(vendor_id)
    ]);

    if (!vendorInfo) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    res.json({
      success: true,
      vendor: {
        info: vendorInfo,
        balance: balance,
        recent_transactions: recentTransactions,
        settings: settings
      }
    });
    
  } catch (error) {
    console.error('Error getting vendor details:', error);
    res.status(500).json({ error: 'Failed to get vendor details' });
  }
});

// ===== HELPER FUNCTIONS =====

/**
 * Get platform financial overview
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

module.exports = router; 