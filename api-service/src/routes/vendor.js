const express = require('express');
const stripeService = require('../services/stripeService');
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');
const router = express.Router();

/**
 * Get vendor orders
 * GET /api/vendor/orders
 */
router.get('/orders', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    
    // Build query with optional status filter
    let whereClause = 'WHERE oi.vendor_id = ?';
    const params = [vendorId];
    
    if (status && status !== 'all') {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }
    
        // Get orders for this vendor
    const ordersQuery = `
      SELECT 
        o.id,
        o.stripe_payment_intent_id,
        o.status,
        o.total_amount,
        o.shipping_amount,
        o.created_at,
        o.updated_at,
        oi.quantity,
        oi.price,
        oi.commission_rate,
        oi.commission_amount,
        oi.shipping_cost,
        p.name as product_name,
        p.id as product_id,
        u.username as customer_email,
        up.display_name as customer_name
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const [orders] = await db.execute(ordersQuery, params);
    
    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT o.id) as total
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      ${whereClause}
    `;
    
    const [countResult] = await db.execute(countQuery, params);
    const totalOrders = countResult[0].total;
    
    // Group orders by order ID
    const groupedOrders = {};
    orders.forEach(order => {
      if (!groupedOrders[order.id]) {
        groupedOrders[order.id] = {
          id: order.id,
          stripe_payment_intent_id: order.stripe_payment_intent_id,
          status: order.status,
          total_amount: parseFloat(order.total_amount),
          shipping_amount: parseFloat(order.shipping_amount),
          created_at: order.created_at,
          updated_at: order.updated_at,
          customer_email: order.customer_email,
          customer_name: order.customer_name,
          items: []
        };
      }
      
      groupedOrders[order.id].items.push({
        product_id: order.product_id,
        product_name: order.product_name,
        quantity: order.quantity,
        price: parseFloat(order.price),
        commission_rate: parseFloat(order.commission_rate),
        commission_amount: parseFloat(order.commission_amount),
        shipping_cost: parseFloat(order.shipping_cost),
        vendor_receives: parseFloat(order.price) * order.quantity - parseFloat(order.commission_amount)
      });
    });
    
    // Convert to array
    const ordersList = Object.values(groupedOrders);
    
    res.json({
      success: true,
      orders: ordersList,
      pagination: {
        page,
        limit,
        total: totalOrders,
        pages: Math.ceil(totalOrders / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * Get vendor financial dashboard
 * GET /api/vendor/dashboard
 */
router.get('/dashboard', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;

    // Get vendor settings
    const vendorSettings = await stripeService.getVendorSettings(vendorId);
    
    // Get financial overview
    const [balance, transactions, payoutSchedule] = await Promise.all([
      getVendorBalance(vendorId),
      getRecentTransactions(vendorId, 10),
      getUpcomingPayouts(vendorId)
    ]);

    // Get Stripe account status if exists
    let stripeAccount = null;
    if (vendorSettings.stripe_account_id) {
      stripeAccount = await stripeService.getStripeAccount(vendorSettings.stripe_account_id);
    }

    res.json({
      success: true,
      dashboard: {
        balance,
        recent_transactions: transactions,
        upcoming_payouts: payoutSchedule,
        vendor_settings: vendorSettings,
        stripe_account: stripeAccount
      }
    });
    
  } catch (error) {
    console.error('Error loading vendor dashboard:', error);
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

/**
 * Get vendor balance details
 * GET /api/vendor/balance
 */
router.get('/balance', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;

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
router.get('/transactions', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;
    const { page = 1, limit = 20 } = req.query;

    const transactions = await getVendorTransactions(vendorId, {
      page: parseInt(page),
      limit: parseInt(limit)
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
 * Get upcoming payouts
 * GET /api/vendor/payouts
 */
router.get('/payouts', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;

    const payouts = await getUpcomingPayouts(vendorId);
    
    res.json({
      success: true,
      payouts: payouts
    });
    
  } catch (error) {
    console.error('Error getting vendor payouts:', error);
    res.status(500).json({ error: 'Failed to get payouts' });
  }
});

/**
 * Get vendor settings
 * GET /api/vendor/settings
 */
router.get('/settings', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;

    const settings = await stripeService.getVendorSettings(vendorId);
    
    res.json({
      success: true,
      settings: settings
    });
    
  } catch (error) {
    console.error('Error getting vendor settings:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

/**
 * Create Stripe Connect account for vendor
 * POST /api/vendor/stripe-account
 */
router.post('/stripe-account', verifyToken, requirePermission('stripe_connect'), async (req, res) => {
  try {
    const vendorId = req.userId;
    const { business_info = {} } = req.body;

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
router.get('/stripe-onboarding', verifyToken, requirePermission('stripe_connect'), async (req, res) => {
  try {
    const vendorId = req.userId;

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
router.post('/subscription-preferences', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;
    const { payment_method, reverse_transfer_enabled } = req.body;

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
      message: 'Subscription preferences updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating subscription preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * Get vendor shipping policy
 * GET /api/vendor/shipping-policy
 */
router.get('/shipping-policy', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;

    const policy = await getVendorShippingPolicy(vendorId);
    
    res.json({
      success: true,
      policy: policy
    });
    
  } catch (error) {
    console.error('Error getting shipping policy:', error);
    res.status(500).json({ error: 'Failed to get shipping policy' });
  }
});

/**
 * Update vendor shipping policy
 * PUT /api/vendor/shipping-policy
 */
router.put('/shipping-policy', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;
    const { policy_text } = req.body;
    
    if (!policy_text) {
      return res.status(400).json({ error: 'Policy text is required' });
    }

    const updatedPolicy = await updateVendorShippingPolicy(vendorId, policy_text);
    
    res.json({
      success: true,
      policy: updatedPolicy
    });
    
  } catch (error) {
    console.error('Error updating shipping policy:', error);
    res.status(500).json({ error: 'Failed to update shipping policy' });
  }
});

/**
 * Get vendor shipping policy history
 * GET /api/vendor/shipping-policy/history
 */
router.get('/shipping-policy/history', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;

    const history = await getVendorShippingPolicyHistory(vendorId);
    
    res.json({
      success: true,
      history: history
    });
    
  } catch (error) {
    console.error('Error getting shipping policy history:', error);
    res.status(500).json({ error: 'Failed to get policy history' });
  }
});

/**
 * Delete vendor shipping policy
 * DELETE /api/vendor/shipping-policy
 */
router.delete('/shipping-policy', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;

    await deleteVendorShippingPolicy(vendorId);
    
    res.json({
      success: true,
      message: 'Shipping policy deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting shipping policy:', error);
    res.status(500).json({ error: 'Failed to delete shipping policy' });
  }
});

/**
 * Get vendor return policy
 * GET /api/vendor/return-policy
 */
router.get('/return-policy', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;

    const policy = await getVendorReturnPolicy(vendorId);
    
    res.json({
      success: true,
      policy: policy
    });
    
  } catch (error) {
    console.error('Error getting return policy:', error);
    res.status(500).json({ error: 'Failed to get return policy' });
  }
});

/**
 * Update vendor return policy
 * PUT /api/vendor/return-policy
 */
router.put('/return-policy', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;
    const { policy_text } = req.body;
    
    if (!policy_text) {
      return res.status(400).json({ error: 'Policy text is required' });
    }

    const updatedPolicy = await updateVendorReturnPolicy(vendorId, policy_text);
    
    res.json({
      success: true,
      policy: updatedPolicy
    });
    
  } catch (error) {
    console.error('Error updating return policy:', error);
    res.status(500).json({ error: 'Failed to update return policy' });
  }
});

/**
 * Get vendor return policy history
 * GET /api/vendor/return-policy/history
 */
router.get('/return-policy/history', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;

    const history = await getVendorReturnPolicyHistory(vendorId);
    
    res.json({
      success: true,
      history: history
    });
    
  } catch (error) {
    console.error('Error getting return policy history:', error);
    res.status(500).json({ error: 'Failed to get policy history' });
  }
});

/**
 * Delete vendor return policy
 * DELETE /api/vendor/return-policy
 */
router.delete('/return-policy', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;

    await deleteVendorReturnPolicy(vendorId);
    
    res.json({
      success: true,
      message: 'Return policy deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting return policy:', error);
    res.status(500).json({ error: 'Failed to delete return policy' });
  }
});

// New endpoint: GET /orders/my - Fetch vendor's orders with optional status filter
router.get('/orders/my', verifyToken, async (req, res) => {
  try {
    const vendorId = req.userId; // Assuming vendor is the authenticated user
    const status = req.query.status; // Optional: 'unshipped' or 'shipped'

    let whereClause = 'WHERE oi.vendor_id = ?';
    const params = [vendorId];

    if (status === 'unshipped') {
      whereClause += ' AND o.status = "paid" AND oi.status = "pending"';
    } else if (status === 'shipped') {
      whereClause += ' AND oi.status IN ("shipped", "delivered")';
    }

    // Use proper backticks and structure like in successful routes
    const query = `
      SELECT 
        o.id as order_id,
        o.created_at,
        o.status as order_status,
        oi.id as item_id,
        oi.product_id,
        oi.quantity,
        oi.price,
        oi.shipping_cost,
        oi.status as item_status,
        oi.shipped_at,
        p.name as product_name,
        COALESCE(up.display_name, CONCAT(up.first_name, ' ', up.last_name), u.username) as customer_name,
        COALESCE(sa.address_line_1, 'No street') as shipping_street,
        COALESCE(sa.address_line_2, '') as shipping_address_line_2,
        COALESCE(sa.city, 'No city') as shipping_city,
        COALESCE(sa.state, 'No state') as shipping_state,
        COALESCE(sa.postal_code, 'No zip') as shipping_zip,
        COALESCE(sa.country, 'No country') as shipping_country,
        COALESCE(sa.recipient_name, 'No name') as recipient_name
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      JOIN products p ON oi.product_id = p.id
      JOIN users u ON o.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN shipping_addresses sa ON o.id = sa.order_id
      ${whereClause}
      ORDER BY o.created_at DESC, oi.id
    `;

    // Add params to execute to prevent injection (like in events)
    const [rows] = await db.execute(query, params);
    console.log(`Fetched ${rows.length} rows for vendor ${vendorId}`);  // Temp log to confirm in PM2

    // Group items by order_id
    const groupedOrders = {};
    rows.forEach(row => {
      if (!groupedOrders[row.order_id]) {
        groupedOrders[row.order_id] = {
          order_id: row.order_id,
          created_at: row.created_at,
          order_status: row.order_status,
          customer_name: row.customer_name,  // Move to order level
          shipping_address: {  // Move to order level with defaults
            street: row.shipping_street || 'No street',
            address_line_2: row.shipping_address_line_2 || '',
            city: row.shipping_city || 'No city',
            state: row.shipping_state || 'No state',
            zip: row.shipping_zip || 'No zip',
            country: row.shipping_country || 'No country',
            recipient_name: row.recipient_name || 'No name'  // Optional
          },
          items: []
        };
      }
      groupedOrders[row.order_id].items.push({
        item_id: row.item_id,
        product_id: row.product_id,
        product_name: row.product_name,
        quantity: row.quantity,
        price: row.price,
        shipping_cost: row.shipping_cost,
        item_status: row.item_status,
        shipped_at: row.shipped_at
        // Remove customer_name and shipping_address from here, as they're now on order
      });
    });

    res.json({ success: true, orders: Object.values(groupedOrders) });

  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// New endpoint: GET /order-item-details - Fetch item details for pre-population
router.get('/order-item-details', verifyToken, async (req, res) => {
  try {
    const { item_id } = req.query;
    const vendorId = req.userId;
    
    const query = `
      SELECT ps.length, ps.width, ps.height, ps.dimension_unit, ps.weight, ps.weight_unit
      FROM order_items oi
      JOIN product_shipping ps ON oi.product_id = ps.product_id AND ps.package_number = 1
      WHERE oi.id = ? AND oi.vendor_id = ?
    `;
    const [rows] = await db.execute(query, [item_id, vendorId]);
    
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching item details:', error);
    res.status(500).json({ error: 'Failed to fetch item details' });
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

// Get vendor shipping preferences
router.get('/shipping-preferences', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;
    
    const [preferences] = await db.execute(
      'SELECT * FROM vendor_ship_settings WHERE vendor_id = ?',
      [vendorId]
    );
    
    if (preferences.length === 0) {
      // Return default preferences if none exist
      return res.json({
        success: true,
        preferences: {
          vendor_id: vendorId,
          return_company_name: '',
          return_contact_name: '',
          return_address_line_1: '',
          return_address_line_2: '',
          return_city: '',
          return_state: '',
          return_postal_code: '',
          return_country: 'US',
          return_phone: '',
          label_size_preference: '4x6',
          signature_required_default: false,
          insurance_default: false
        }
      });
    }
    
    res.json({
      success: true,
      preferences: preferences[0]
    });
    
  } catch (error) {
    console.error('Error fetching vendor shipping preferences:', error);
    res.status(500).json({ error: 'Failed to fetch shipping preferences' });
  }
});

// Create or update vendor shipping preferences
router.post('/shipping-preferences', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    const vendorId = req.userId;
    const {
      return_company_name,
      return_contact_name,
      return_address_line_1,
      return_address_line_2,
      return_city,
      return_state,
      return_postal_code,
      return_country,
      return_phone,
      label_size_preference,
      signature_required_default,
      insurance_default
    } = req.body;

    // Convert undefined and empty strings to null and properly handle booleans
    const cleanData = {
      return_company_name: (return_company_name === undefined || return_company_name === '') ? null : return_company_name,
      return_contact_name: (return_contact_name === undefined || return_contact_name === '') ? null : return_contact_name,
      return_address_line_1: (return_address_line_1 === undefined || return_address_line_1 === '') ? null : return_address_line_1,
      return_address_line_2: (return_address_line_2 === undefined || return_address_line_2 === '') ? null : return_address_line_2,
      return_city: (return_city === undefined || return_city === '') ? null : return_city,
      return_state: (return_state === undefined || return_state === '') ? null : return_state,
      return_postal_code: (return_postal_code === undefined || return_postal_code === '') ? null : return_postal_code,
      return_country: (return_country === undefined || return_country === '') ? 'US' : return_country,
      return_phone: (return_phone === undefined || return_phone === '') ? null : return_phone,
      label_size_preference: (label_size_preference === undefined || label_size_preference === '') ? '4x6' : label_size_preference,
      signature_required_default: signature_required_default === true || signature_required_default === 'true' || signature_required_default === 1 ? 1 : 0,
      insurance_default: insurance_default === true || insurance_default === 'true' || insurance_default === 1 ? 1 : 0
    };
    
    // Check if preferences already exist
    const [existing] = await db.execute(
      'SELECT id FROM vendor_ship_settings WHERE vendor_id = ?',
      [vendorId]
    );
    
    if (existing.length > 0) {
      // Update existing preferences
      await db.execute(`
        UPDATE vendor_ship_settings SET
          return_company_name = ?,
          return_contact_name = ?,
          return_address_line_1 = ?,
          return_address_line_2 = ?,
          return_city = ?,
          return_state = ?,
          return_postal_code = ?,
          return_country = ?,
          return_phone = ?,
          label_size_preference = ?,
          signature_required_default = ?,
          insurance_default = ?,
          updated_at = NOW()
        WHERE vendor_id = ?
      `, [
        cleanData.return_company_name,
        cleanData.return_contact_name,
        cleanData.return_address_line_1,
        cleanData.return_address_line_2,
        cleanData.return_city,
        cleanData.return_state,
        cleanData.return_postal_code,
        cleanData.return_country,
        cleanData.return_phone,
        cleanData.label_size_preference,
        cleanData.signature_required_default,
        cleanData.insurance_default,
        vendorId
      ]);
    } else {
      // Create new preferences
      await db.execute(`
        INSERT INTO vendor_ship_settings (
          vendor_id,
          return_company_name,
          return_contact_name,
          return_address_line_1,
          return_address_line_2,
          return_city,
          return_state,
          return_postal_code,
          return_country,
          return_phone,
          label_size_preference,
          signature_required_default,
          insurance_default
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        vendorId,
        cleanData.return_company_name,
        cleanData.return_contact_name,
        cleanData.return_address_line_1,
        cleanData.return_address_line_2,
        cleanData.return_city,
        cleanData.return_state,
        cleanData.return_postal_code,
        cleanData.return_country,
        cleanData.return_phone,
        cleanData.label_size_preference,
        cleanData.signature_required_default,
        cleanData.insurance_default
      ]);
    }
    
    res.json({
      success: true,
      message: 'Shipping preferences saved successfully'
    });
    
  } catch (error) {
    console.error('Error saving vendor shipping preferences:', error);
    res.status(500).json({ error: 'Failed to save shipping preferences' });
  }
});

module.exports = router; 