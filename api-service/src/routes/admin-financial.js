const express = require('express');
const stripeService = require('../services/stripeService');
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requireRestrictedPermission } = require('../middleware/permissions');
const router = express.Router();

/**
 * Get platform financial overview
 * GET /api/admin/financial-overview
 */
router.get('/financial-overview', verifyToken, requireRestrictedPermission('manage_system'), async (req, res) => {
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
 * GET /api/admin/payout-calculations
 */
router.get('/payout-calculations', verifyToken, requireRestrictedPermission('manage_system'), async (req, res) => {
  try {
    const calculations = await stripeService.getPayoutCalculations();
    res.json({ success: true, calculations });
  } catch (error) {
    console.error('Error getting payout calculations:', error);
    res.status(500).json({ error: 'Failed to get payout calculations' });
  }
});

/**
 * POST /api/admin/manual-adjustment
 * Create a manual adjustment for a vendor
 */
router.post('/manual-adjustment', verifyToken, requireRestrictedPermission('manage_system'), async (req, res) => {
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
 * GET /api/admin/manual-adjustments
 * Get all manual adjustments with optional filters
 */
router.get('/manual-adjustments', verifyToken, requireRestrictedPermission('manage_system'), async (req, res) => {
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
 * POST /api/admin/vendor-settings
 * Update vendor settings (commission rates, etc.)
 */
router.post('/vendor-settings', verifyToken, requireRestrictedPermission('manage_system'), async (req, res) => {
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
 * GET /api/admin/vendor-settings
 * Get vendor settings for all vendors or specific vendor
 */
router.get('/vendor-settings', verifyToken, requireRestrictedPermission('manage_system'), async (req, res) => {
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
 * GET /api/admin/vendor-details/:vendor_id
 * Get comprehensive vendor information for admin review
 */
router.get('/vendor-details/:vendor_id', verifyToken, requireRestrictedPermission('manage_system'), async (req, res) => {
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