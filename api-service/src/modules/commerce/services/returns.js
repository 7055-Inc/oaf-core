/**
 * Returns Service
 * Handles return request operations
 */

const db = require('../../../../config/db');

/**
 * Return policy constants
 */
const RETURN_POLICIES = {
  '30_day': { allowsReturn: true, windowDays: 30 },
  '14_day': { allowsReturn: true, windowDays: 14 },
  'exchange_only': { allowsReturn: false, windowDays: null },
  'no_returns': { allowsReturn: false, windowDays: null }
};

const getReturnPolicy = (key) => RETURN_POLICIES[key] || RETURN_POLICIES['30_day'];

/**
 * Get user's return requests
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
async function getMyReturns(userId, options = {}) {
  const { status = 'all' } = options;

  let whereClause = 'WHERE r.user_id = ?';
  const params = [userId];

  if (status && status !== 'all') {
    whereClause += ' AND r.return_status = ?';
    params.push(status);
  }

  const [returns] = await db.query(`
    SELECT 
      r.*,
      o.total_amount as order_total,
      oi.product_id,
      oi.quantity,
      oi.price as item_price,
      p.name as product_name,
      u.username as vendor_name
    FROM returns r
    JOIN orders o ON r.order_id = o.id
    JOIN order_items oi ON r.order_item_id = oi.id
    JOIN products p ON oi.product_id = p.id
    JOIN users u ON r.vendor_id = u.id
    ${whereClause}
    ORDER BY r.created_at DESC
  `, params);

  return returns;
}

/**
 * Create a return request
 * @param {number} userId - User ID
 * @param {Object} data - Return request data
 * @returns {Promise<Object>}
 */
async function createReturn(userId, data) {
  const {
    order_id,
    order_item_id,
    product_id,
    vendor_id,
    return_reason,
    return_message,
    package_dimensions,
    customer_address,
    flow_type,
    label_preference
  } = data;

  // Validate required fields
  if (!order_id || !order_item_id || !vendor_id || !return_reason) {
    throw new Error('Missing required fields: order_id, order_item_id, vendor_id, return_reason');
  }

  // Verify order item belongs to user
  const [orderCheck] = await db.query(`
    SELECT oi.*, o.user_id, o.status as order_status, o.shipped_at, p.allow_returns
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    WHERE oi.id = ? AND o.id = ? AND o.user_id = ?
  `, [order_item_id, order_id, userId]);

  if (!orderCheck.length) {
    throw new Error('Order item not found or access denied');
  }

  const orderItem = orderCheck[0];

  // Check order status
  if (orderItem.order_status !== 'shipped') {
    throw new Error('Returns can only be requested for shipped orders');
  }

  // Get return policy
  const policy = getReturnPolicy(orderItem.allow_returns);
  const isDamageOrDefect = ['wrong_item', 'damaged_transit', 'defective', 'not_as_described'].includes(return_reason);

  if (!isDamageOrDefect) {
    if (!policy.allowsReturn) {
      throw new Error('Standard returns are not allowed for this product');
    }

    if (policy.windowDays && orderItem.shipped_at) {
      const shipDate = new Date(orderItem.shipped_at);
      const now = new Date();
      const daysDiff = (now - shipDate) / (1000 * 60 * 60 * 24);

      if (daysDiff > policy.windowDays) {
        throw new Error(`Return window has expired (${policy.windowDays} days)`);
      }
    }
  }

  // Check for existing return
  const [existingReturn] = await db.query(
    'SELECT id FROM returns WHERE order_item_id = ? AND return_status NOT IN ("denied", "processed")',
    [order_item_id]
  );

  if (existingReturn.length) {
    throw new Error('A return request already exists for this item');
  }

  // Determine initial status
  let initialStatus = 'pending';
  let transitDeadline = null;
  let initialMessage = null;

  if (flow_type === 'A') {
    initialStatus = 'pending';
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);
    transitDeadline = deadline.toISOString().split('T')[0];
  } else if (flow_type === 'B') {
    initialStatus = 'pending';
    if (label_preference === 'purchase_label') {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 30);
      transitDeadline = deadline.toISOString().split('T')[0];
    }
  } else if (flow_type === 'C') {
    initialStatus = 'assistance';
    const timestamp = new Date().toISOString();
    initialMessage = `[${timestamp}] CUSTOMER: ${return_message || 'Return request submitted for review.'}`;
  }

  // Create return record
  const [result] = await db.query(`
    INSERT INTO returns (
      order_id, order_item_id, user_id, vendor_id, marketplace_source,
      return_reason, return_message, return_address, package_dimensions,
      label_preference, return_status, case_messages, transit_deadline
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    order_id,
    order_item_id,
    userId,
    vendor_id,
    'brakebee',
    return_reason,
    return_message,
    JSON.stringify(customer_address),
    JSON.stringify(package_dimensions),
    label_preference,
    initialStatus,
    initialMessage,
    transitDeadline
  ]);

  return {
    return_id: result.insertId,
    status: initialStatus,
    flow_type,
    transit_deadline: transitDeadline
  };
}

/**
 * Add message to return case
 * @param {number} returnId - Return ID
 * @param {number} userId - User ID
 * @param {string} message - Message content
 * @returns {Promise<Object>}
 */
async function addMessage(returnId, userId, message) {
  if (!message || !message.trim()) {
    throw new Error('Message is required');
  }

  const [returnCheck] = await db.query(
    'SELECT * FROM returns WHERE id = ? AND (user_id = ? OR vendor_id = ?)',
    [returnId, userId, userId]
  );

  if (!returnCheck.length) {
    throw new Error('Return not found or access denied');
  }

  const returnRecord = returnCheck[0];
  const timestamp = new Date().toISOString();
  const userType = returnRecord.user_id === userId ? 'CUSTOMER' : 'VENDOR';
  const newMessage = `[${timestamp}] ${userType}: ${message.trim()}`;

  const updatedMessages = returnRecord.case_messages
    ? `${newMessage}\n---\n${returnRecord.case_messages}`
    : newMessage;

  let newStatus = returnRecord.return_status;
  if (userType === 'CUSTOMER' && returnRecord.return_status === 'assistance_vendor') {
    newStatus = 'assistance';
  } else if (userType === 'VENDOR' && returnRecord.return_status === 'assistance') {
    newStatus = 'assistance_vendor';
  }

  await db.query(
    'UPDATE returns SET case_messages = ?, return_status = ?, updated_at = NOW() WHERE id = ?',
    [updatedMessages, newStatus, returnId]
  );

  return { success: true, new_status: newStatus };
}

/**
 * Get return label info
 * @param {number} returnId - Return ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>}
 */
async function getReturnLabel(returnId, userId) {
  const [returnData] = await db.query(`
    SELECT r.*, sl.label_file_path, sl.tracking_number
    FROM returns r
    LEFT JOIN shipping_labels sl ON r.shipping_label_id = sl.id
    WHERE r.id = ? AND (r.user_id = ? OR r.vendor_id = ?)
  `, [returnId, userId, userId]);

  if (!returnData.length) {
    return null;
  }

  return returnData[0];
}

// =============================================================================
// VENDOR RETURNS
// =============================================================================

/**
 * Get vendor's return requests
 * @param {number} vendorId - Vendor user ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
async function getVendorReturns(vendorId, options = {}) {
  const { status = 'all', limit = 100 } = options;

  let whereClause = 'WHERE r.vendor_id = ?';
  const params = [vendorId];

  if (status && status !== 'all') {
    whereClause += ' AND r.return_status = ?';
    params.push(status);
  }

  // Default to last 1 year
  whereClause += ' AND r.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';

  const [returns] = await db.query(`
    SELECT 
      r.*,
      o.id as order_number,
      p.name as product_name,
      oi.price as item_price,
      oi.quantity,
      u.username as customer_email,
      up.display_name as customer_name,
      sl.tracking_number,
      sl.label_file_path
    FROM returns r
    JOIN orders o ON r.order_id = o.id
    JOIN order_items oi ON r.order_item_id = oi.id
    JOIN products p ON oi.product_id = p.id
    JOIN users u ON r.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN shipping_labels sl ON r.shipping_label_id = sl.id
    ${whereClause}
    ORDER BY r.created_at DESC
    LIMIT ?
  `, [...params, limit]);

  return returns;
}

/**
 * Add vendor message to return case
 * @param {number} returnId - Return ID
 * @param {number} vendorId - Vendor user ID
 * @param {string} message - Message content
 * @returns {Promise<Object>}
 */
async function addVendorMessage(returnId, vendorId, message) {
  if (!message || !message.trim()) {
    throw new Error('Message is required');
  }

  const [returnCheck] = await db.query(
    'SELECT id, case_messages, return_status FROM returns WHERE id = ? AND vendor_id = ?',
    [returnId, vendorId]
  );

  if (!returnCheck.length) {
    throw new Error('Return not found or access denied');
  }

  const currentReturn = returnCheck[0];
  const timestamp = new Date().toLocaleString();
  const newMessage = `[${timestamp}] VENDOR: ${message.trim()}`;

  const updatedMessages = currentReturn.case_messages
    ? `${newMessage}\n---\n${currentReturn.case_messages}`
    : newMessage;

  await db.query(`
    UPDATE returns 
    SET case_messages = ?, return_status = 'assistance', updated_at = NOW()
    WHERE id = ?
  `, [updatedMessages, returnId]);

  return { success: true, new_status: 'assistance' };
}

/**
 * Mark return as received by vendor
 * @param {number} returnId - Return ID
 * @param {number} vendorId - Vendor user ID
 * @returns {Promise<Object>}
 */
async function markReturnReceived(returnId, vendorId) {
  const [returnCheck] = await db.query(
    'SELECT id, return_status, order_id, order_item_id FROM returns WHERE id = ? AND vendor_id = ?',
    [returnId, vendorId]
  );

  if (!returnCheck.length) {
    throw new Error('Return not found or access denied');
  }

  const returnRecord = returnCheck[0];

  if (!['pending', 'label_created', 'in_transit'].includes(returnRecord.return_status)) {
    throw new Error('Return is not in a receivable status');
  }

  await db.query(`
    UPDATE returns 
    SET return_status = 'received', updated_at = NOW()
    WHERE id = ?
  `, [returnId]);

  return { 
    success: true, 
    return_id: returnId,
    message: 'Return marked as received. Refund processing will begin.'
  };
}

/**
 * Get vendor return statistics
 * @param {number} vendorId - Vendor user ID
 * @returns {Promise<Object>}
 */
async function getVendorReturnStats(vendorId) {
  const [stats] = await db.query(`
    SELECT
      COUNT(CASE WHEN return_status IN ('pending', 'label_created', 'assistance') THEN 1 END) as pending_count,
      COUNT(CASE WHEN return_status = 'in_transit' THEN 1 END) as in_transit_count,
      COUNT(CASE WHEN return_status = 'received' THEN 1 END) as received_count,
      COUNT(*) as total_count
    FROM returns
    WHERE vendor_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
  `, [vendorId]);

  return stats[0] || { pending_count: 0, in_transit_count: 0, received_count: 0, total_count: 0 };
}

module.exports = {
  // Customer returns
  getMyReturns,
  createReturn,
  addMessage,
  getReturnLabel,
  getReturnPolicy,
  // Vendor returns
  getVendorReturns,
  addVendorMessage,
  markReturnReceived,
  getVendorReturnStats,
};
