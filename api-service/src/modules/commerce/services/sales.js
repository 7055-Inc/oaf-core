/**
 * Sales Service (Vendor Orders)
 * Handles vendor's incoming orders (sales) and fulfillment
 */

const db = require('../../../../config/db');

/**
 * Get vendor's orders (sales) with filtering
 * @param {number} vendorId - Vendor user ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Orders grouped by order_id
 */
async function getVendorOrders(vendorId, options = {}) {
  const { status = 'all', page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE oi.vendor_id = ?';
  const params = [vendorId];

  // Status filtering: 'unshipped' | 'shipped' | 'all'
  if (status === 'unshipped') {
    whereClause += ' AND o.status = "paid" AND oi.status = "pending"';
  } else if (status === 'shipped') {
    whereClause += ' AND oi.status IN ("shipped", "delivered")';
  }

  const query = `
    SELECT 
      o.id as order_id,
      o.created_at,
      o.status as order_status,
      o.total_amount,
      oi.id as item_id,
      oi.product_id,
      oi.quantity,
      oi.price,
      oi.shipping_cost,
      oi.status as item_status,
      oi.shipped_at,
      oi.selected_shipping_service,
      p.name as product_name,
      p.sku as product_sku,
      COALESCE(up.display_name, CONCAT(up.first_name, ' ', up.last_name), u.username) as customer_name,
      u.username as customer_email,
      COALESCE(sa.recipient_name, up.display_name, u.username) as recipient_name,
      COALESCE(sa.address_line_1, '') as shipping_street,
      COALESCE(sa.address_line_2, '') as shipping_street2,
      COALESCE(sa.city, '') as shipping_city,
      COALESCE(sa.state, '') as shipping_state,
      COALESCE(sa.postal_code, '') as shipping_zip,
      COALESCE(sa.country, 'US') as shipping_country,
      COALESCE(sa.phone, '') as shipping_phone,
      oit.carrier as tracking_carrier,
      oit.tracking_number,
      oit.updated_at as tracking_updated,
      (
        SELECT image_url 
        FROM product_images 
        WHERE product_id = oi.product_id 
        ORDER BY \`order\` ASC 
        LIMIT 1
      ) AS product_thumbnail
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN products p ON oi.product_id = p.id
    JOIN users u ON o.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN shipping_addresses sa ON o.id = sa.order_id
    LEFT JOIN order_item_tracking oit ON oi.id = oit.order_item_id
    ${whereClause}
    ORDER BY o.created_at DESC, oi.id
    LIMIT ? OFFSET ?
  `;

  const [rows] = await db.query(query, [...params, limit, offset]);

  // Get total count
  const countQuery = `
    SELECT COUNT(*) as total
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    ${whereClause}
  `;
  const [countResult] = await db.query(countQuery, params);
  const total = countResult[0].total;

  // Group items by order_id
  const groupedOrders = {};
  rows.forEach(row => {
    if (!groupedOrders[row.order_id]) {
      groupedOrders[row.order_id] = {
        order_id: row.order_id,
        created_at: row.created_at,
        order_status: row.order_status,
        total_amount: parseFloat(row.total_amount || 0),
        customer_name: row.customer_name,
        customer_email: row.customer_email,
        shipping_address: {
          recipient_name: row.recipient_name || '',
          street: row.shipping_street || '',
          street2: row.shipping_street2 || '',
          city: row.shipping_city || '',
          state: row.shipping_state || '',
          zip: row.shipping_zip || '',
          country: row.shipping_country || 'US',
          phone: row.shipping_phone || ''
        },
        items: []
      };
    }

    groupedOrders[row.order_id].items.push({
      item_id: row.item_id,
      product_id: row.product_id,
      product_name: row.product_name,
      product_sku: row.product_sku,
      product_thumbnail: row.product_thumbnail,
      quantity: row.quantity,
      price: parseFloat(row.price),
      shipping_cost: parseFloat(row.shipping_cost || 0),
      item_status: row.item_status,
      shipped_at: row.shipped_at,
      selected_shipping_service: row.selected_shipping_service,
      tracking: row.tracking_number ? {
        carrier: row.tracking_carrier,
        tracking_number: row.tracking_number,
        updated_at: row.tracking_updated
      } : null,
      item_total: parseFloat(row.price) * row.quantity + parseFloat(row.shipping_cost || 0)
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
 * Get order item details for shipping form pre-population
 * @param {number} itemId - Order item ID
 * @param {number} vendorId - Vendor ID (for ownership check)
 * @returns {Promise<Object|null>}
 */
async function getOrderItemDetails(itemId, vendorId) {
  const [rows] = await db.query(`
    SELECT 
      oi.id as item_id,
      oi.product_id,
      oi.quantity,
      oi.price,
      oi.shipping_cost,
      p.name as product_name,
      ps.length, ps.width, ps.height, 
      ps.dimension_unit, ps.weight, ps.weight_unit
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    LEFT JOIN product_shipping ps ON oi.product_id = ps.product_id AND ps.package_number = 1
    WHERE oi.id = ? AND oi.vendor_id = ?
  `, [itemId, vendorId]);

  return rows[0] || null;
}

/**
 * Mark order item as shipped with tracking
 * @param {number} itemId - Order item ID
 * @param {number} vendorId - Vendor ID
 * @param {Object} trackingData - Tracking information
 * @returns {Promise<Object>}
 */
async function markItemShipped(itemId, vendorId, trackingData) {
  const { carrier, tracking_number } = trackingData;

  // Verify ownership
  const [items] = await db.query(
    'SELECT id, order_id FROM order_items WHERE id = ? AND vendor_id = ?',
    [itemId, vendorId]
  );

  if (!items.length) {
    throw new Error('Order item not found or access denied');
  }

  const orderId = items[0].order_id;

  // Update item status
  await db.query(
    'UPDATE order_items SET status = "shipped", shipped_at = NOW() WHERE id = ?',
    [itemId]
  );

  // Insert or update tracking
  if (tracking_number) {
    await db.query(`
      INSERT INTO order_item_tracking (order_item_id, carrier, tracking_number)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE carrier = VALUES(carrier), tracking_number = VALUES(tracking_number), updated_at = NOW()
    `, [itemId, carrier || '', tracking_number]);
  }

  // Check if all items in order are shipped
  const [pendingItems] = await db.query(
    'SELECT id FROM order_items WHERE order_id = ? AND status = "pending"',
    [orderId]
  );

  if (pendingItems.length === 0) {
    // All items shipped, update order status
    await db.query(
      'UPDATE orders SET status = "shipped", updated_at = NOW() WHERE id = ?',
      [orderId]
    );
  }

  return { success: true, item_id: itemId };
}

/**
 * Update tracking for an order item
 * @param {number} itemId - Order item ID
 * @param {number} vendorId - Vendor ID
 * @param {Object} trackingData - Tracking information
 * @returns {Promise<Object>}
 */
async function updateTracking(itemId, vendorId, trackingData) {
  const { carrier, tracking_number } = trackingData;

  // Verify ownership
  const [items] = await db.query(
    'SELECT id FROM order_items WHERE id = ? AND vendor_id = ?',
    [itemId, vendorId]
  );

  if (!items.length) {
    throw new Error('Order item not found or access denied');
  }

  await db.query(`
    INSERT INTO order_item_tracking (order_item_id, carrier, tracking_number)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE carrier = VALUES(carrier), tracking_number = VALUES(tracking_number), updated_at = NOW()
  `, [itemId, carrier || '', tracking_number]);

  return { success: true, item_id: itemId };
}

/**
 * Get vendor sales statistics
 * @param {number} vendorId - Vendor ID
 * @returns {Promise<Object>}
 */
async function getVendorStats(vendorId) {
  const [stats] = await db.query(`
    SELECT
      COUNT(DISTINCT CASE WHEN oi.status = 'pending' AND o.status = 'paid' THEN oi.id END) as unshipped_count,
      COUNT(DISTINCT CASE WHEN oi.status IN ('shipped', 'delivered') THEN oi.id END) as shipped_count,
      COALESCE(SUM(CASE WHEN o.status IN ('paid', 'shipped', 'delivered') THEN oi.price * oi.quantity END), 0) as total_sales
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE oi.vendor_id = ?
  `, [vendorId]);

  return stats[0] || { unshipped_count: 0, shipped_count: 0, total_sales: 0 };
}

module.exports = {
  getVendorOrders,
  getOrderItemDetails,
  markItemShipped,
  updateTracking,
  getVendorStats,
};
