/**
 * Finances Services
 * Vendor financial data - balance, transactions, payouts, earnings
 */

const db = require('../../../../config/db');

/**
 * Get vendor's current balance and financial overview
 * @param {number} vendorId - Vendor user ID
 * @returns {Promise<Object>}
 */
async function getBalance(vendorId) {
  const [rows] = await db.query(`
    SELECT 
      COALESCE(SUM(CASE 
        WHEN transaction_type IN ('sale', 'adjustment') AND status = 'completed' 
        THEN amount ELSE 0 
      END), 0) as available_balance,
      
      COALESCE(SUM(CASE 
        WHEN transaction_type IN ('sale', 'adjustment') AND status = 'completed' AND payout_date <= CURDATE()
        THEN amount ELSE 0 
      END), 0) as pending_payout,
      
      COALESCE(SUM(CASE 
        WHEN transaction_type = 'sale' AND status = 'completed'
        THEN amount ELSE 0 
      END), 0) as total_sales,
      
      COUNT(CASE 
        WHEN transaction_type = 'sale' AND status = 'completed'
        THEN 1 
      END) as total_orders,
      
      COALESCE(SUM(CASE 
        WHEN transaction_type = 'payout' AND status = 'completed'
        THEN amount ELSE 0 
      END), 0) as total_paid_out
    FROM vendor_transactions 
    WHERE vendor_id = ?
  `, [vendorId]);

  const balance = rows[0] || {};
  balance.current_balance = (balance.available_balance || 0) - (balance.pending_payout || 0);

  // Get vendor settings
  let settings = {};
  try {
    const [settingsRows] = await db.query(
      'SELECT commission_rate, payout_days FROM vendor_settings WHERE vendor_id = ?',
      [vendorId]
    );
    settings = settingsRows[0] || {};
  } catch (e) {
    // Table may not exist
  }

  const minimumPayout = 25.00;
  const payoutDays = settings.payout_days || 15;

  return {
    balance,
    settings: {
      ...settings,
      minimum_payout: minimumPayout,
      payout_days: payoutDays
    },
    can_request_payout: (balance.pending_payout || 0) >= minimumPayout
  };
}

/**
 * Get vendor's transaction history
 * @param {number} vendorId - Vendor user ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
async function getTransactions(vendorId, options = {}) {
  const { page = 1, limit = 50, type, status } = options;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE vt.vendor_id = ?';
  const params = [vendorId];

  if (type) {
    whereClause += ' AND vt.transaction_type = ?';
    params.push(type);
  }

  if (status) {
    whereClause += ' AND vt.status = ?';
    params.push(status);
  }

  // Get count
  const [countRows] = await db.query(
    `SELECT COUNT(*) as total FROM vendor_transactions vt ${whereClause}`,
    params
  );
  const total = countRows[0]?.total || 0;

  // Get transactions
  const [transactions] = await db.query(`
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
    ${whereClause}
    ORDER BY vt.created_at DESC
    LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
  `, params);

  return {
    transactions,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

/**
 * Get vendor's payout history
 * @param {number} vendorId - Vendor user ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>}
 */
async function getPayouts(vendorId, options = {}) {
  const { page = 1, limit = 20 } = options;
  const offset = (page - 1) * limit;

  // Get count
  const [countRows] = await db.query(
    `SELECT COUNT(*) as total FROM vendor_transactions WHERE vendor_id = ? AND transaction_type = 'payout'`,
    [vendorId]
  );
  const total = countRows[0]?.total || 0;

  // Get payouts
  const [payouts] = await db.query(`
    SELECT 
      vt.*,
      o.id as order_number
    FROM vendor_transactions vt
    LEFT JOIN orders o ON vt.order_id = o.id
    WHERE vt.vendor_id = ? AND vt.transaction_type = 'payout'
    ORDER BY vt.created_at DESC
    LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
  `, [vendorId]);

  // Get pending payout info
  const [pendingRows] = await db.query(`
    SELECT 
      COALESCE(SUM(amount), 0) as pending_amount,
      MIN(payout_date) as next_payout_date
    FROM vendor_transactions
    WHERE vendor_id = ? 
      AND transaction_type IN ('sale', 'adjustment')
      AND status = 'completed'
      AND payout_date > CURDATE()
  `, [vendorId]);

  return {
    payouts,
    pending: {
      amount: pendingRows[0]?.pending_amount || 0,
      next_date: pendingRows[0]?.next_payout_date
    },
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

/**
 * Calculate earnings metrics from transactions
 * @param {number} vendorId - Vendor user ID
 * @returns {Promise<Object>}
 */
async function getEarningsMetrics(vendorId) {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

  // This month's earnings
  const [thisMonthData] = await db.query(`
    SELECT 
      COALESCE(SUM(CASE WHEN transaction_type = 'sale' AND status = 'completed' THEN amount ELSE 0 END), 0) as sales,
      COALESCE(SUM(CASE WHEN transaction_type = 'commission' THEN ABS(amount) ELSE 0 END), 0) as commission,
      COUNT(CASE WHEN transaction_type = 'sale' AND status = 'completed' THEN 1 END) as order_count
    FROM vendor_transactions
    WHERE vendor_id = ? AND DATE_FORMAT(created_at, '%Y-%m') = ?
  `, [vendorId, thisMonth]);

  // Last month's earnings
  const [lastMonthData] = await db.query(`
    SELECT 
      COALESCE(SUM(CASE WHEN transaction_type = 'sale' AND status = 'completed' THEN amount ELSE 0 END), 0) as sales
    FROM vendor_transactions
    WHERE vendor_id = ? AND DATE_FORMAT(created_at, '%Y-%m') = ?
  `, [vendorId, lastMonthStr]);

  // All-time totals
  const [allTimeData] = await db.query(`
    SELECT 
      COALESCE(SUM(CASE WHEN transaction_type = 'sale' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_sales,
      COALESCE(SUM(CASE WHEN transaction_type = 'payout' AND status = 'completed' THEN ABS(amount) ELSE 0 END), 0) as total_paid
    FROM vendor_transactions
    WHERE vendor_id = ?
  `, [vendorId]);

  const thisMonthSales = thisMonthData[0]?.sales || 0;
  const lastMonthSales = lastMonthData[0]?.sales || 0;
  const growthPercent = lastMonthSales > 0 
    ? ((thisMonthSales - lastMonthSales) / lastMonthSales * 100).toFixed(1)
    : 0;

  return {
    this_month: {
      sales: thisMonthSales,
      commission: thisMonthData[0]?.commission || 0,
      net: thisMonthSales - (thisMonthData[0]?.commission || 0),
      orders: thisMonthData[0]?.order_count || 0
    },
    last_month_sales: lastMonthSales,
    growth_percent: parseFloat(growthPercent),
    all_time: {
      total_sales: allTimeData[0]?.total_sales || 0,
      total_paid: allTimeData[0]?.total_paid || 0
    }
  };
}

// =============================================================================
// COMMISSION MANAGEMENT (Admin)
// =============================================================================

/**
 * Get all artists and promoters with their commission rates
 * Shows ALL artists/promoters, with default rate if no custom rate exists
 * @returns {Promise<Object>}
 */
async function listCommissionRates() {
  const [results] = await db.query(`
    SELECT 
      fs.id as setting_id,
      u.id as user_id,
      u.user_type,
      COALESCE(fs.fee_structure, 'commission') as fee_structure,
      COALESCE(fs.commission_rate, 15.00) as commission_rate,
      fs.notes,
      COALESCE(fs.is_active, TRUE) as is_active,
      fs.effective_date,
      fs.updated_at,
      u.username as email,
      up.display_name,
      up.first_name,
      up.last_name,
      CASE 
        WHEN u.user_type = 'artist' THEN ap.business_name
        WHEN u.user_type = 'promoter' THEN pp.business_name
        ELSE NULL
      END as business_name,
      vs.stripe_account_id,
      vs.stripe_account_verified,
      CASE WHEN fs.id IS NULL THEN TRUE ELSE FALSE END as is_default_rate
    FROM users u
    LEFT JOIN financial_settings fs ON u.id = fs.user_id AND fs.is_active = TRUE
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN artist_profiles ap ON u.id = ap.user_id
    LEFT JOIN promoter_profiles pp ON u.id = pp.user_id
    LEFT JOIN vendor_settings vs ON u.id = vs.vendor_id
    WHERE u.user_type IN ('artist', 'promoter')
      AND u.status = 'active'
    ORDER BY u.user_type, up.display_name, up.first_name, up.last_name
  `);

  return {
    commission_rates: results,
    count: results.length,
    summary: {
      artists: results.filter(r => r.user_type === 'artist').length,
      promoters: results.filter(r => r.user_type === 'promoter').length,
      commission_users: results.filter(r => r.fee_structure === 'commission').length,
      passthrough_users: results.filter(r => r.fee_structure === 'passthrough').length,
      default_rate_users: results.filter(r => r.is_default_rate).length,
      custom_rate_users: results.filter(r => !r.is_default_rate).length
    }
  };
}

/**
 * Update or create a commission rate for a user
 * @param {number} settingIdOrUserId - financial_settings.id OR user_id if creating new
 * @param {Object} updates - { commission_rate, fee_structure, notes, user_id, user_type }
 * @param {number} adminId - Admin user ID making the change
 * @returns {Promise<Object>}
 */
async function updateCommissionRate(settingIdOrUserId, updates, adminId) {
  const { commission_rate, fee_structure, notes, user_id, user_type } = updates;

  // Validate
  if (commission_rate !== undefined && (commission_rate < 0 || commission_rate > 100)) {
    throw new Error('Commission rate must be between 0 and 100');
  }
  if (fee_structure && !['commission', 'passthrough'].includes(fee_structure)) {
    throw new Error('Invalid fee structure');
  }

  // If user_id is provided, this is a CREATE for a user without existing settings
  if (user_id && user_type) {
    // Check if user already has settings
    const [existing] = await db.query(
      'SELECT id FROM financial_settings WHERE user_id = ? AND is_active = TRUE',
      [user_id]
    );
    
    if (existing.length > 0) {
      // Update existing
      const [result] = await db.query(`
        UPDATE financial_settings 
        SET 
          commission_rate = COALESCE(?, commission_rate),
          fee_structure = COALESCE(?, fee_structure),
          notes = COALESCE(?, notes),
          updated_by = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND is_active = TRUE
      `, [
        commission_rate !== undefined ? commission_rate : null,
        fee_structure || null,
        notes !== undefined ? notes : null,
        adminId,
        user_id
      ]);
      return { success: true, message: 'Updated successfully', setting_id: existing[0].id };
    } else {
      // Create new
      const [result] = await db.query(`
        INSERT INTO financial_settings 
          (user_id, user_type, commission_rate, fee_structure, notes, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        user_id,
        user_type,
        commission_rate !== undefined ? commission_rate : 15.00,
        fee_structure || 'commission',
        notes || null,
        adminId,
        adminId
      ]);
      return { success: true, message: 'Created successfully', setting_id: result.insertId };
    }
  }

  // Otherwise, update by setting_id
  const [result] = await db.query(`
    UPDATE financial_settings 
    SET 
      commission_rate = COALESCE(?, commission_rate),
      fee_structure = COALESCE(?, fee_structure),
      notes = COALESCE(?, notes),
      updated_by = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND is_active = TRUE
  `, [
    commission_rate !== undefined ? commission_rate : null,
    fee_structure || null,
    notes !== undefined ? notes : null,
    adminId,
    settingIdOrUserId
  ]);

  if (result.affectedRows === 0) {
    throw new Error('Commission setting not found or inactive');
  }

  return { success: true, message: 'Updated successfully' };
}

/**
 * Bulk update commission rates
 * @param {Array} updates - Array of { id, commission_rate, fee_structure, notes }
 * @param {number} adminId - Admin user ID making the changes
 * @returns {Promise<Object>}
 */
async function bulkUpdateCommissionRates(updates, adminId) {
  const results = { success: [], errors: [] };

  for (const update of updates) {
    try {
      const { id, commission_rate, fee_structure, notes } = update;
      
      if (!id) {
        results.errors.push({ id: 'unknown', error: 'ID is required' });
        continue;
      }

      await updateCommissionRate(id, { commission_rate, fee_structure, notes }, adminId);
      results.success.push({ id, message: 'Updated successfully' });
    } catch (err) {
      results.errors.push({ id: update.id || 'unknown', error: err.message });
    }
  }

  return {
    results,
    summary: {
      total: updates.length,
      successful: results.success.length,
      failed: results.errors.length
    }
  };
}

/**
 * Create a new commission rate setting
 * @param {Object} data - { user_id, user_type, commission_rate, fee_structure, notes }
 * @param {number} adminId - Admin user ID creating the setting
 * @returns {Promise<Object>}
 */
async function createCommissionRate(data, adminId) {
  const { user_id, user_type, commission_rate = 15, fee_structure = 'commission', notes } = data;

  if (!user_id) throw new Error('user_id is required');
  if (!user_type || !['artist', 'promoter'].includes(user_type)) {
    throw new Error('user_type must be "artist" or "promoter"');
  }
  if (commission_rate < 0 || commission_rate > 100) {
    throw new Error('Commission rate must be between 0 and 100');
  }

  // Check if user already has active settings
  const [existing] = await db.query(
    'SELECT id FROM financial_settings WHERE user_id = ? AND is_active = TRUE',
    [user_id]
  );
  if (existing.length > 0) {
    throw new Error('User already has active commission settings');
  }

  const [result] = await db.query(`
    INSERT INTO financial_settings 
      (user_id, user_type, commission_rate, fee_structure, notes, created_by, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [user_id, user_type, commission_rate, fee_structure, notes || null, adminId, adminId]);

  return { 
    success: true, 
    setting_id: result.insertId,
    message: 'Commission setting created' 
  };
}

// Import refunds service
const refundsService = require('./refunds');

module.exports = {
  getBalance,
  getTransactions,
  getPayouts,
  getEarningsMetrics,
  // Commission management
  listCommissionRates,
  updateCommissionRate,
  bulkUpdateCommissionRates,
  createCommissionRate,
  // Admin refunds
  refunds: refundsService,
};
