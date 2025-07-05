const express = require('express');
const stripeService = require('../services/stripeService');
const db = require('../../config/db');
const authenticateToken = require('../middleware/jwt');
const router = express.Router();

/**
 * Get vendor financial dashboard
 * GET /api/vendor/dashboard
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    // Verify user is a vendor
    if (req.user.user_type !== 'artist') {
      return res.status(403).json({ error: 'Access denied - vendor account required' });
    }

    // Get vendor settings
    const vendorSettings = await stripeService.getVendorSettings(vendorId);
    
    // Get financial overview
    const [balance, transactions, payoutSchedule] = await Promise.all([
      getVendorBalance(vendorId),
      getRecentTransactions(vendorId, 10),
      getUpcomingPayouts(vendorId)
    ]);

    // Get Stripe account status if exists
    let stripeAccountStatus = null;
    if (vendorSettings?.stripe_account_id) {
      try {
        stripeAccountStatus = await stripeService.getAccountStatus(vendorSettings.stripe_account_id);
      } catch (error) {
        console.error('Error getting Stripe account status:', error);
      }
    }

    res.json({
      success: true,
      dashboard: {
        balance: balance,
        recent_transactions: transactions,
        payout_schedule: payoutSchedule,
        vendor_settings: {
          commission_rate: vendorSettings?.commission_rate || 15.00,
          payout_days: vendorSettings?.payout_days || 15,
          stripe_account_verified: vendorSettings?.stripe_account_verified || false,
          reverse_transfer_enabled: vendorSettings?.reverse_transfer_enabled || false
        },
        stripe_account: stripeAccountStatus
      }
    });
    
  } catch (error) {
    console.error('Error getting vendor dashboard:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

/**
 * Get vendor balance details
 * GET /api/vendor/balance
 */
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    if (req.user.user_type !== 'artist') {
      return res.status(403).json({ error: 'Access denied - vendor account required' });
    }

    const balance = await getVendorBalance(vendorId);
    
    res.json({
      success: true,
      balance: balance
    });
    
  } catch (error) {
    console.error('Error getting vendor balance:', error);
    res.status(500).json({ error: 'Failed to get balance' });
  }
});

/**
 * Get vendor transaction history
 * GET /api/vendor/transactions
 */
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { page = 1, limit = 20, type, status } = req.query;
    
    if (req.user.user_type !== 'artist') {
      return res.status(403).json({ error: 'Access denied - vendor account required' });
    }

    const transactions = await getVendorTransactions(vendorId, {
      page: parseInt(page),
      limit: parseInt(limit),
      type,
      status
    });
    
    res.json({
      success: true,
      transactions: transactions.data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: transactions.total,
        pages: Math.ceil(transactions.total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error getting vendor transactions:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

/**
 * Get vendor payout schedule
 * GET /api/vendor/payout-schedule
 */
router.get('/payout-schedule', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    if (req.user.user_type !== 'artist') {
      return res.status(403).json({ error: 'Access denied - vendor account required' });
    }

    const payouts = await getUpcomingPayouts(vendorId);
    
    res.json({
      success: true,
      payout_schedule: payouts
    });
    
  } catch (error) {
    console.error('Error getting payout schedule:', error);
    res.status(500).json({ error: 'Failed to get payout schedule' });
  }
});

/**
 * Create Stripe Connect account for vendor
 * POST /api/vendor/stripe-account
 */
router.post('/stripe-account', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { business_info = {} } = req.body;
    
    if (req.user.user_type !== 'artist') {
      return res.status(403).json({ error: 'Access denied - vendor account required' });
    }

    // Check if vendor already has a Stripe account
    const existingSettings = await stripeService.getVendorSettings(vendorId);
    if (existingSettings?.stripe_account_id) {
      return res.status(400).json({ error: 'Stripe account already exists' });
    }

    // Get vendor email from user profile
    const vendorQuery = 'SELECT username FROM users WHERE id = ?';
    const [vendorRows] = await db.execute(vendorQuery, [vendorId]);
    
    if (vendorRows.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    const email = vendorRows[0].username; // Assuming username is email
    
    // Create Stripe Connect account
    const account = await stripeService.createVendorAccount(vendorId, email, business_info);
    
    // Generate onboarding link
    const accountLink = await stripeService.createAccountLink(account.id, vendorId);
    
    res.json({
      success: true,
      stripe_account: {
        id: account.id,
        onboarding_url: accountLink.url
      }
    });
    
  } catch (error) {
    console.error('Error creating Stripe account:', error);
    res.status(500).json({ error: 'Failed to create Stripe account' });
  }
});

/**
 * Get Stripe account onboarding link
 * GET /api/vendor/stripe-onboarding
 */
router.get('/stripe-onboarding', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    if (req.user.user_type !== 'artist') {
      return res.status(403).json({ error: 'Access denied - vendor account required' });
    }

    const vendorSettings = await stripeService.getVendorSettings(vendorId);
    
    if (!vendorSettings?.stripe_account_id) {
      return res.status(404).json({ error: 'No Stripe account found' });
    }

    const accountLink = await stripeService.createAccountLink(vendorSettings.stripe_account_id, vendorId);
    
    res.json({
      success: true,
      onboarding_url: accountLink.url
    });
    
  } catch (error) {
    console.error('Error getting onboarding link:', error);
    res.status(500).json({ error: 'Failed to get onboarding link' });
  }
});

/**
 * Update vendor subscription preferences
 * POST /api/vendor/subscription-preferences
 */
router.post('/subscription-preferences', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { payment_method, reverse_transfer_enabled } = req.body;
    
    if (req.user.user_type !== 'artist') {
      return res.status(403).json({ error: 'Access denied - vendor account required' });
    }

    // Validate payment method
    if (payment_method && !['balance_first', 'card_only'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Update vendor settings
    const updateQuery = `
      INSERT INTO vendor_settings (vendor_id, subscription_payment_method, reverse_transfer_enabled) 
      VALUES (?, ?, ?) 
      ON DUPLICATE KEY UPDATE 
        subscription_payment_method = COALESCE(VALUES(subscription_payment_method), subscription_payment_method),
        reverse_transfer_enabled = COALESCE(VALUES(reverse_transfer_enabled), reverse_transfer_enabled),
        updated_at = CURRENT_TIMESTAMP
    `;
    
    await db.execute(updateQuery, [vendorId, payment_method, reverse_transfer_enabled]);
    
    res.json({
      success: true,
      message: 'Subscription preferences updated'
    });
    
  } catch (error) {
    console.error('Error updating subscription preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * Get vendor's shipping policy
 * GET /api/vendor/shipping-policy
 */
router.get('/shipping-policy', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    // Verify user has vendor permissions
    if (!req.user.permissions || !req.user.permissions.includes('vendor')) {
      return res.status(403).json({ error: 'Vendor permissions required' });
    }

    const policy = await getVendorShippingPolicy(vendorId);
    
    res.json({
      success: true,
      policy: policy
    });
    
  } catch (error) {
    console.error('Error getting vendor shipping policy:', error);
    res.status(500).json({ error: 'Failed to get shipping policy' });
  }
});

/**
 * Create or update vendor's shipping policy
 * POST /api/vendor/shipping-policy
 */
router.post('/shipping-policy', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { policy_text } = req.body;
    
    // Verify user has vendor permissions
    if (!req.user.permissions || !req.user.permissions.includes('vendor')) {
      return res.status(403).json({ error: 'Vendor permissions required' });
    }

    if (!policy_text || policy_text.trim() === '') {
      return res.status(400).json({ error: 'Policy text is required' });
    }

    const updatedPolicy = await updateVendorShippingPolicy(vendorId, policy_text);
    
    res.json({
      success: true,
      message: 'Shipping policy updated successfully',
      policy: updatedPolicy
    });
    
  } catch (error) {
    console.error('Error updating vendor shipping policy:', error);
    res.status(500).json({ error: 'Failed to update shipping policy' });
  }
});

/**
 * Get vendor's shipping policy history
 * GET /api/vendor/shipping-policy/history
 */
router.get('/shipping-policy/history', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    // Verify user has vendor permissions
    if (!req.user.permissions || !req.user.permissions.includes('vendor')) {
      return res.status(403).json({ error: 'Vendor permissions required' });
    }

    const history = await getVendorShippingPolicyHistory(vendorId);
    
    res.json({
      success: true,
      history: history
    });
    
  } catch (error) {
    console.error('Error getting vendor shipping policy history:', error);
    res.status(500).json({ error: 'Failed to get policy history' });
  }
});

/**
 * Delete vendor's shipping policy (revert to default)
 * DELETE /api/vendor/shipping-policy
 */
router.delete('/shipping-policy', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    // Verify user has vendor permissions
    if (!req.user.permissions || !req.user.permissions.includes('vendor')) {
      return res.status(403).json({ error: 'Vendor permissions required' });
    }

    await deleteVendorShippingPolicy(vendorId);
    
    res.json({
      success: true,
      message: 'Shipping policy deleted successfully. Using default policy.'
    });
    
  } catch (error) {
    console.error('Error deleting vendor shipping policy:', error);
    res.status(500).json({ error: 'Failed to delete shipping policy' });
  }
});

/**
 * Get vendor's return policy
 * GET /api/vendor/return-policy
 */
router.get('/return-policy', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    // Verify user has vendor permissions
    if (!req.user.permissions || !req.user.permissions.includes('vendor')) {
      return res.status(403).json({ error: 'Vendor permissions required' });
    }

    const policy = await getVendorReturnPolicy(vendorId);
    
    res.json({
      success: true,
      policy: policy
    });
    
  } catch (error) {
    console.error('Error getting vendor return policy:', error);
    res.status(500).json({ error: 'Failed to get return policy' });
  }
});

/**
 * Create or update vendor's return policy
 * POST /api/vendor/return-policy
 */
router.post('/return-policy', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { policy_text } = req.body;
    
    // Verify user has vendor permissions
    if (!req.user.permissions || !req.user.permissions.includes('vendor')) {
      return res.status(403).json({ error: 'Vendor permissions required' });
    }

    if (!policy_text || policy_text.trim() === '') {
      return res.status(400).json({ error: 'Policy text is required' });
    }

    const updatedPolicy = await updateVendorReturnPolicy(vendorId, policy_text);
    
    res.json({
      success: true,
      message: 'Return policy updated successfully',
      policy: updatedPolicy
    });
    
  } catch (error) {
    console.error('Error updating vendor return policy:', error);
    res.status(500).json({ error: 'Failed to update return policy' });
  }
});

/**
 * Get vendor's return policy history
 * GET /api/vendor/return-policy/history
 */
router.get('/return-policy/history', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    // Verify user has vendor permissions
    if (!req.user.permissions || !req.user.permissions.includes('vendor')) {
      return res.status(403).json({ error: 'Vendor permissions required' });
    }

    const history = await getVendorReturnPolicyHistory(vendorId);
    
    res.json({
      success: true,
      history: history
    });
    
  } catch (error) {
    console.error('Error getting vendor return policy history:', error);
    res.status(500).json({ error: 'Failed to get policy history' });
  }
});

/**
 * Delete vendor's return policy (revert to default)
 * DELETE /api/vendor/return-policy
 */
router.delete('/return-policy', authenticateToken, async (req, res) => {
  try {
    const vendorId = req.user.id;
    
    // Verify user has vendor permissions
    if (!req.user.permissions || !req.user.permissions.includes('vendor')) {
      return res.status(403).json({ error: 'Vendor permissions required' });
    }

    await deleteVendorReturnPolicy(vendorId);
    
    res.json({
      success: true,
      message: 'Return policy deleted successfully. Using default policy.'
    });
    
  } catch (error) {
    console.error('Error deleting vendor return policy:', error);
    res.status(500).json({ error: 'Failed to delete return policy' });
  }
});

// ===== HELPER FUNCTIONS =====

/**
 * Get vendor balance summary
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
  
  // Calculate current balance (available - pending payouts)
  balance.current_balance = balance.available_balance - balance.pending_payout;
  
  return balance;
}

/**
 * Get recent transactions
 */
async function getRecentTransactions(vendorId, limit = 10) {
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

/**
 * Get vendor transactions with pagination and filters
 */
async function getVendorTransactions(vendorId, options = {}) {
  const { page = 1, limit = 20, type, status } = options;
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE vt.vendor_id = ?';
  let params = [vendorId];
  
  if (type) {
    whereClause += ' AND vt.transaction_type = ?';
    params.push(type);
  }
  
  if (status) {
    whereClause += ' AND vt.status = ?';
    params.push(status);
  }
  
  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM vendor_transactions vt
    ${whereClause}
  `;
  
  const [countRows] = await db.execute(countQuery, params);
  const total = countRows[0].total;
  
  // Get transactions
  const dataQuery = `
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
    ${whereClause}
    ORDER BY vt.created_at DESC
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
 * Get upcoming payouts
 */
async function getUpcomingPayouts(vendorId) {
  const query = `
    SELECT 
      payout_date,
      COUNT(*) as transaction_count,
      SUM(amount) as payout_amount
    FROM vendor_transactions 
    WHERE vendor_id = ? 
      AND status = 'completed' 
      AND transaction_type IN ('sale', 'adjustment')
      AND payout_date >= CURDATE()
    GROUP BY payout_date
    ORDER BY payout_date ASC
    LIMIT 10
  `;
  
  const [rows] = await db.execute(query, [vendorId]);
  return rows;
}

/**
 * Get vendor's shipping policy (with fallback to default)
 */
async function getVendorShippingPolicy(vendorId) {
  // First try to get vendor's custom policy
  const vendorQuery = `
    SELECT 
      sp.id,
      sp.policy_text,
      sp.created_at,
      sp.updated_at,
      u.username as created_by_username,
      'custom' as policy_source
    FROM shipping_policies sp
    JOIN users u ON sp.created_by = u.id
    WHERE sp.user_id = ? AND sp.status = 'active'
  `;
  
  const [vendorRows] = await db.execute(vendorQuery, [vendorId]);
  
  if (vendorRows.length > 0) {
    return vendorRows[0];
  }
  
  // If no custom policy, get default policy (user_id = NULL)
  const defaultQuery = `
    SELECT 
      sp.id,
      sp.policy_text,
      sp.created_at,
      sp.updated_at,
      u.username as created_by_username,
      'default' as policy_source
    FROM shipping_policies sp
    JOIN users u ON sp.created_by = u.id
    WHERE sp.user_id IS NULL AND sp.status = 'active'
  `;
  
  const [defaultRows] = await db.execute(defaultQuery);
  
  if (defaultRows.length > 0) {
    return defaultRows[0];
  }
  
  // If no default policy exists, return null
  return null;
}

/**
 * Update vendor's shipping policy
 */
async function updateVendorShippingPolicy(vendorId, policyText) {
  // Get a connection from the pool for transaction
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Archive existing active policy
    await connection.execute(
      'UPDATE shipping_policies SET status = "archived" WHERE user_id = ? AND status = "active"',
      [vendorId]
    );
    
    // Create new active policy
    const insertQuery = `
      INSERT INTO shipping_policies (user_id, policy_text, status, created_by)
      VALUES (?, ?, 'active', ?)
    `;
    
    const [result] = await connection.execute(insertQuery, [vendorId, policyText, vendorId]);
    
    await connection.commit();
    
    // Return the new policy
    return await getVendorShippingPolicy(vendorId);
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Get vendor's shipping policy history
 */
async function getVendorShippingPolicyHistory(vendorId) {
  const query = `
    SELECT 
      sp.id,
      sp.policy_text,
      sp.status,
      sp.created_at,
      sp.updated_at,
      u.username as created_by_username
    FROM shipping_policies sp
    JOIN users u ON sp.created_by = u.id
    WHERE sp.user_id = ?
    ORDER BY sp.created_at DESC
  `;
  
  const [rows] = await db.execute(query, [vendorId]);
  return rows;
}

/**
 * Delete vendor's shipping policy (archive all policies)
 */
async function deleteVendorShippingPolicy(vendorId) {
  const query = `
    UPDATE shipping_policies 
    SET status = 'archived' 
    WHERE user_id = ? AND status = 'active'
  `;
  
  await db.execute(query, [vendorId]);
}

/**
 * Get vendor's return policy (with fallback to default)
 */
async function getVendorReturnPolicy(vendorId) {
  // First try to get vendor's custom policy
  const vendorQuery = `
    SELECT 
      rp.id,
      rp.policy_text,
      rp.created_at,
      rp.updated_at,
      u.username as created_by_username,
      'custom' as policy_source
    FROM return_policies rp
    JOIN users u ON rp.created_by = u.id
    WHERE rp.user_id = ? AND rp.status = 'active'
  `;
  
  const [vendorRows] = await db.execute(vendorQuery, [vendorId]);
  
  if (vendorRows.length > 0) {
    return vendorRows[0];
  }
  
  // If no custom policy, get default policy (user_id = NULL)
  const defaultQuery = `
    SELECT 
      rp.id,
      rp.policy_text,
      rp.created_at,
      rp.updated_at,
      u.username as created_by_username,
      'default' as policy_source
    FROM return_policies rp
    JOIN users u ON rp.created_by = u.id
    WHERE rp.user_id IS NULL AND rp.status = 'active'
  `;
  
  const [defaultRows] = await db.execute(defaultQuery);
  
  if (defaultRows.length > 0) {
    return defaultRows[0];
  }
  
  // If no default policy exists, return null
  return null;
}

/**
 * Update vendor's return policy
 */
async function updateVendorReturnPolicy(vendorId, policyText) {
  // Get a connection from the pool for transaction
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // Archive existing active policy
    await connection.execute(
      'UPDATE return_policies SET status = "archived" WHERE user_id = ? AND status = "active"',
      [vendorId]
    );
    
    // Create new active policy
    const insertQuery = `
      INSERT INTO return_policies (user_id, policy_text, status, created_by)
      VALUES (?, ?, 'active', ?)
    `;
    
    const [result] = await connection.execute(insertQuery, [vendorId, policyText, vendorId]);
    
    await connection.commit();
    
    // Return the new policy
    return await getVendorReturnPolicy(vendorId);
    
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Get vendor's return policy history
 */
async function getVendorReturnPolicyHistory(vendorId) {
  const query = `
    SELECT 
      rp.id,
      rp.policy_text,
      rp.status,
      rp.created_at,
      rp.updated_at,
      u.username as created_by_username
    FROM return_policies rp
    JOIN users u ON rp.created_by = u.id
    WHERE rp.user_id = ?
    ORDER BY rp.created_at DESC
  `;
  
  const [rows] = await db.execute(query, [vendorId]);
  return rows;
}

/**
 * Delete vendor's return policy (archive all policies)
 */
async function deleteVendorReturnPolicy(vendorId) {
  const query = `
    UPDATE return_policies 
    SET status = 'archived' 
    WHERE user_id = ? AND status = 'active'
  `;
  
  await db.execute(query, [vendorId]);
}

module.exports = router; 