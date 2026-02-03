/**
 * Orders Service
 * Handles customer order queries and operations
 */

const db = require('../../../../config/db');

/**
 * Get customer's orders with pagination and filtering
 * @param {number} userId - Customer user ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Orders with pagination
 */
async function getMyOrders(userId, options = {}) {
  const { page = 1, limit = 20, status = 'all' } = options;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE o.user_id = ?';
  const params = [userId];

  if (status && status !== 'all') {
    whereClause += ' AND o.status = ?';
    params.push(status);
  }

  // Get orders with items
  const ordersQuery = `
    SELECT 
      o.id,
      o.stripe_payment_intent_id,
      o.status,
      o.total_amount,
      o.shipping_amount,
      o.tax_amount,
      o.platform_fee_amount,
      o.created_at,
      o.updated_at,
      oi.id as item_id,
      oi.quantity,
      oi.price,
      oi.commission_rate,
      oi.commission_amount,
      oi.shipping_cost,
      oi.status as item_status,
      oi.shipped_at,
      oi.vendor_id,
      oi.selected_shipping_service,
      oi.shipping_rate,
      p.name as product_name,
      p.id as product_id,
      p.allow_returns,
      u.username as vendor_email,
      up.display_name as vendor_name,
      up.first_name as vendor_first_name,
      up.last_name as vendor_last_name,
      oit.carrier,
      oit.tracking_number,
      oit.updated_at as tracking_updated,
      (
        SELECT image_url 
        FROM product_images 
        WHERE product_id = oi.product_id 
        ORDER BY \`order\` ASC 
        LIMIT 1
      ) AS product_thumbnail
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    JOIN users u ON oi.vendor_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN order_item_tracking oit ON oi.id = oit.order_item_id
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [orders] = await db.query(ordersQuery, [...params, limit, offset]);

  // Get total count
  const countQuery = `
    SELECT COUNT(DISTINCT o.id) as total
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    ${whereClause}
  `;
  const [countResult] = await db.query(countQuery, params);
  const total = countResult[0].total;

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
        tax_amount: parseFloat(order.tax_amount),
        platform_fee_amount: parseFloat(order.platform_fee_amount),
        created_at: order.created_at,
        updated_at: order.updated_at,
        items: []
      };
    }

    groupedOrders[order.id].items.push({
      item_id: order.item_id,
      product_id: order.product_id,
      product_name: order.product_name,
      product_thumbnail: order.product_thumbnail,
      quantity: order.quantity,
      price: parseFloat(order.price),
      shipping_cost: parseFloat(order.shipping_cost),
      item_status: order.item_status,
      shipped_at: order.shipped_at,
      vendor_id: order.vendor_id,
      vendor_email: order.vendor_email,
      vendor_name: order.vendor_name || `${order.vendor_first_name || ''} ${order.vendor_last_name || ''}`.trim() || order.vendor_email,
      selected_shipping_service: order.selected_shipping_service,
      shipping_rate: parseFloat(order.shipping_rate || 0),
      allow_returns: order.allow_returns,
      tracking: order.tracking_number ? {
        carrier: order.carrier,
        tracking_number: order.tracking_number,
        updated_at: order.tracking_updated
      } : null,
      item_total: parseFloat(order.price) * order.quantity
    });
  });

  return {
    orders: Object.values(groupedOrders),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

/**
 * Get single order by ID for customer
 * @param {number} orderId - Order ID
 * @param {number} userId - Customer user ID
 * @returns {Promise<Object|null>}
 */
async function getOrderById(orderId, userId) {
  const result = await getMyOrders(userId, { page: 1, limit: 1000 });
  return result.orders.find(o => o.id === orderId) || null;
}

/**
 * Get all orders (admin only) with pagination and optional status filter
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Same shape as getMyOrders
 */
async function getAllOrders(options = {}) {
  const { page = 1, limit = 20, status = 'all' } = options;
  const offset = (page - 1) * limit;

  let whereClause = '';
  const params = [];

  if (status && status !== 'all') {
    whereClause = 'WHERE o.status = ?';
    params.push(status);
  }

  const ordersQuery = `
    SELECT 
      o.id,
      o.user_id,
      o.stripe_payment_intent_id,
      o.status,
      o.total_amount,
      o.shipping_amount,
      o.tax_amount,
      o.platform_fee_amount,
      o.created_at,
      o.updated_at,
      oi.id as item_id,
      oi.quantity,
      oi.price,
      oi.commission_rate,
      oi.commission_amount,
      oi.shipping_cost,
      oi.status as item_status,
      oi.shipped_at,
      oi.vendor_id,
      oi.selected_shipping_service,
      oi.shipping_rate,
      p.name as product_name,
      p.id as product_id,
      p.allow_returns,
      u.username as vendor_email,
      up.display_name as vendor_name,
      up.first_name as vendor_first_name,
      up.last_name as vendor_last_name,
      cu.username as customer_email,
      cup.display_name as customer_name,
      oit.carrier,
      oit.tracking_number,
      oit.updated_at as tracking_updated,
      (
        SELECT image_url 
        FROM product_images 
        WHERE product_id = oi.product_id 
        ORDER BY \`order\` ASC 
        LIMIT 1
      ) AS product_thumbnail
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    JOIN products p ON oi.product_id = p.id
    JOIN users u ON oi.vendor_id = u.id
    JOIN users cu ON o.user_id = cu.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN user_profiles cup ON cu.id = cup.user_id
    LEFT JOIN order_item_tracking oit ON oi.id = oit.order_item_id
    ${whereClause}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const [orders] = await db.query(ordersQuery, [...params, limit, offset]);

  const countQuery = `
    SELECT COUNT(DISTINCT o.id) as total
    FROM orders o
    JOIN order_items oi ON o.id = oi.order_id
    ${whereClause}
  `;
  const [countResult] = await db.query(countQuery, params);
  const total = countResult[0].total;

  const groupedOrders = {};
  orders.forEach(order => {
    if (!groupedOrders[order.id]) {
      groupedOrders[order.id] = {
        id: order.id,
        user_id: order.user_id,
        customer_email: order.customer_email,
        customer_name: order.customer_name,
        stripe_payment_intent_id: order.stripe_payment_intent_id,
        status: order.status,
        total_amount: parseFloat(order.total_amount),
        shipping_amount: parseFloat(order.shipping_amount),
        tax_amount: parseFloat(order.tax_amount),
        platform_fee_amount: parseFloat(order.platform_fee_amount),
        created_at: order.created_at,
        updated_at: order.updated_at,
        items: []
      };
    }

    groupedOrders[order.id].items.push({
      item_id: order.item_id,
      product_id: order.product_id,
      product_name: order.product_name,
      product_thumbnail: order.product_thumbnail,
      quantity: order.quantity,
      price: parseFloat(order.price),
      shipping_cost: parseFloat(order.shipping_cost),
      item_status: order.item_status,
      shipped_at: order.shipped_at,
      vendor_id: order.vendor_id,
      vendor_email: order.vendor_email,
      vendor_name: order.vendor_name || `${order.vendor_first_name || ''} ${order.vendor_last_name || ''}`.trim() || order.vendor_email,
      selected_shipping_service: order.selected_shipping_service,
      shipping_rate: parseFloat(order.shipping_rate || 0),
      allow_returns: order.allow_returns,
      tracking: order.tracking_number ? {
        carrier: order.carrier,
        tracking_number: order.tracking_number,
        updated_at: order.tracking_updated
      } : null,
      item_total: parseFloat(order.price) * order.quantity
    });
  });

  return {
    orders: Object.values(groupedOrders),
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  };
}

module.exports = {
  getMyOrders,
  getOrderById,
  getAllOrders,
};
