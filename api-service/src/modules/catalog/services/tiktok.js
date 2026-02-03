/**
 * TikTok Connector Service (v2)
 * Business logic for TikTok Shop addon.
 * Extracted from legacy routes/tiktok.js for use under /api/v2/catalog/tiktok
 */

const db = require('../../../../config/db');

/**
 * Get user's TikTok shop connections
 */
async function getShops(userId) {
  const [shops] = await db.execute(`
    SELECT 
      id, shop_id, shop_name, shop_region, is_active, 
      terms_accepted, last_sync_at, created_at,
      CASE WHEN access_token IS NOT NULL THEN true ELSE false END as has_token
    FROM tiktok_user_shops 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `, [userId]);
  return shops;
}

/**
 * Get user's TikTok product data (all products with TikTok data if configured)
 */
async function listProducts(userId) {
  const [products] = await db.execute(`
    SELECT 
      p.*,
      tpd.id as tiktok_data_id,
      tpd.tiktok_title,
      tpd.tiktok_description,
      tpd.tiktok_price,
      tpd.tiktok_tags,
      tpd.tiktok_category_id,
      tpd.is_active as tiktok_active,
      tpd.sync_status,
      tpd.last_sync_at,
      tia.allocated_quantity,
      CASE 
        WHEN tpd.id IS NOT NULL THEN 'configured'
        ELSE 'unconfigured'
      END as tiktok_status
    FROM products p
    LEFT JOIN tiktok_product_data tpd ON p.id = tpd.product_id AND tpd.user_id = ?
    LEFT JOIN tiktok_inventory_allocations tia ON p.id = tia.product_id AND tia.user_id = ?
    WHERE p.vendor_id = ?
    ORDER BY p.created_at DESC
  `, [userId, userId, userId]);

  const processedProducts = await Promise.all(
    products.map(async (product) => {
      const response = { ...product };
      const [tempImages] = await db.query(
        'SELECT image_path FROM pending_images WHERE image_path LIKE ? AND status = ?',
        [`/temp_images/products/${product.vendor_id}-${product.id}-%`, 'pending']
      );
      const [permanentImages] = await db.query(
        'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY \`order\` ASC',
        [product.id]
      );
      response.images = [
        ...permanentImages.map(img => img.image_url),
        ...tempImages.map(img => img.image_path)
      ];
      return response;
    })
  );
  return processedProducts;
}

/**
 * Save TikTok product data and optional allocation
 */
async function saveProduct(productId, userId, body) {
  const {
    tiktok_title,
    tiktok_description,
    tiktok_price,
    tiktok_tags,
    tiktok_category_id,
    allocated_quantity,
    is_active
  } = body;

  const [productCheck] = await db.execute(
    'SELECT id FROM products WHERE id = ? AND vendor_id = ?',
    [productId, userId]
  );
  if (productCheck.length === 0) return { found: false };

  await db.execute(`
    INSERT INTO tiktok_product_data 
    (user_id, product_id, tiktok_title, tiktok_description, tiktok_price, tiktok_tags, tiktok_category_id, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      tiktok_title = VALUES(tiktok_title),
      tiktok_description = VALUES(tiktok_description),
      tiktok_price = VALUES(tiktok_price),
      tiktok_tags = VALUES(tiktok_tags),
      tiktok_category_id = VALUES(tiktok_category_id),
      is_active = VALUES(is_active),
      sync_status = 'pending',
      updated_at = CURRENT_TIMESTAMP
  `, [userId, productId, tiktok_title, tiktok_description, tiktok_price, tiktok_tags, tiktok_category_id, is_active]);

  if (allocated_quantity !== undefined && allocated_quantity !== '') {
    const allocatedQty = parseInt(allocated_quantity) || 0;
    if (allocatedQty > 0) {
      await db.execute(`
        INSERT INTO tiktok_inventory_allocations 
        (user_id, product_id, allocated_quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE
          allocated_quantity = VALUES(allocated_quantity),
          updated_at = CURRENT_TIMESTAMP
      `, [userId, productId, allocatedQty]);
    } else {
      await db.execute(
        'DELETE FROM tiktok_inventory_allocations WHERE user_id = ? AND product_id = ?',
        [userId, productId]
      );
    }
  }
  return { found: true };
}

/**
 * Get inventory allocations
 */
async function getInventory(userId) {
  const [allocations] = await db.execute(`
    SELECT 
      tia.*,
      p.title,
      p.inventory_count as total_inventory
    FROM tiktok_inventory_allocations tia
    JOIN products p ON tia.product_id = p.id
    WHERE tia.user_id = ?
    ORDER BY tia.updated_at DESC
  `, [userId]);
  return allocations;
}

/**
 * Update single product allocation
 */
async function updateInventoryAllocation(productId, userId, allocated_quantity) {
  const [productCheck] = await db.execute(
    'SELECT inventory_count FROM products WHERE id = ? AND vendor_id = ?',
    [productId, userId]
  );
  if (productCheck.length === 0) return { found: false };
  const totalInventory = productCheck[0].inventory_count;
  if (allocated_quantity > totalInventory) {
    throw new Error('Cannot allocate more than total inventory');
  }
  await db.execute(`
    INSERT INTO tiktok_inventory_allocations (user_id, product_id, allocated_quantity)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      allocated_quantity = VALUES(allocated_quantity),
      updated_at = CURRENT_TIMESTAMP
  `, [userId, productId, allocated_quantity]);
  return { found: true };
}

/**
 * Bulk update allocations
 */
async function bulkAllocations(userId, allocations) {
  if (!Array.isArray(allocations) || allocations.length === 0) {
    throw new Error('allocations must be a non-empty array');
  }
  for (const a of allocations) {
    if (!a.product_id || a.allocated_quantity === undefined) {
      throw new Error('Each allocation must have product_id and allocated_quantity');
    }
  }
  const productIds = allocations.map(a => a.product_id);
  const placeholders = productIds.map(() => '?').join(',');
  const [productCheck] = await db.execute(
    `SELECT id FROM products WHERE id IN (${placeholders}) AND vendor_id = ?`,
    [...productIds, userId]
  );
  if (productCheck.length !== productIds.length) {
    throw new Error('Some products not found or not owned by user');
  }

  let successCount = 0;
  const errors = [];
  for (const allocation of allocations) {
    try {
      const { product_id, allocated_quantity } = allocation;
      const qty = parseInt(allocated_quantity) || 0;
      if (qty > 0) {
        await db.execute(`
          INSERT INTO tiktok_inventory_allocations (user_id, product_id, allocated_quantity)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP
        `, [userId, product_id, qty]);
      } else {
        await db.execute(
          'DELETE FROM tiktok_inventory_allocations WHERE user_id = ? AND product_id = ?',
          [userId, product_id]
        );
      }
      successCount++;
    } catch (err) {
      errors.push({ product_id: allocation.product_id, error: err.message });
    }
  }
  return { successful: successCount, failed: allocations.length - successCount, errors };
}

/**
 * Get sync logs
 */
async function getLogs(userId, options = {}) {
  const { limit = 50, sync_type, status } = options;
  let query = 'SELECT * FROM tiktok_sync_logs WHERE user_id = ?';
  const params = [userId];
  if (sync_type) {
    query += ' AND sync_type = ?';
    params.push(sync_type);
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  const [logs] = await db.execute(query, params);
  return logs;
}

/**
 * OAuth authorize - returns status for redirect (TikTok API pending approval)
 */
function oauthAuthorize() {
  return {
    success: false,
    message: 'TikTok API integration pending developer approval',
    status: 'awaiting_approval'
  };
}

// ----- Admin (manage_system) -----

/**
 * Admin: list all products with TikTok data across vendors
 * status: pending (sync_status pending/null), active (is_active=1), paused (is_active=0), all
 */
async function adminListProducts(options = {}) {
  const { status = 'all', page = 1, limit = 25, search = '' } = options;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let statusFilter = '';
  if (status === 'pending') {
    statusFilter = "AND tpd.is_active = 1 AND (tpd.sync_status = 'pending' OR tpd.sync_status IS NULL)";
  } else if (status === 'active') {
    statusFilter = 'AND tpd.is_active = 1';
  } else if (status === 'paused') {
    statusFilter = 'AND tpd.is_active = 0';
  }
  let searchFilter = '';
  const searchParams = [];
  if (search) {
    searchFilter = 'AND (p.name LIKE ? OR u.username LIKE ? OR tpd.tiktok_title LIKE ?)';
    searchParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const [countResult] = await db.query(
    `SELECT COUNT(*) as total FROM tiktok_product_data tpd JOIN products p ON tpd.product_id = p.id JOIN users u ON tpd.user_id = u.id WHERE 1=1 ${statusFilter} ${searchFilter}`,
    searchParams
  );
  const total = countResult[0].total;
  const [rows] = await db.query(
    `SELECT tpd.id as tiktok_data_id, tpd.product_id, tpd.user_id, tpd.tiktok_title, tpd.tiktok_description, tpd.tiktok_price, tpd.is_active, tpd.sync_status, tpd.created_at,
      p.name, p.price, p.inventory_count, u.username, u.email as vendor_email, up.display_name as vendor_name, tia.allocated_quantity
    FROM tiktok_product_data tpd
    JOIN products p ON tpd.product_id = p.id
    JOIN users u ON tpd.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN tiktok_inventory_allocations tia ON tpd.product_id = tia.product_id AND tpd.user_id = tia.user_id
    WHERE 1=1 ${statusFilter} ${searchFilter}
    ORDER BY tpd.created_at DESC LIMIT ? OFFSET ?`,
    [...searchParams, parseInt(limit), offset]
  );
  const products = rows.map((row) => ({
    ...row,
    product_id: row.product_id,
    listing_status: row.is_active ? (row.sync_status === 'pending' || !row.sync_status ? 'pending' : 'listed') : 'paused'
  }));
  return { products, total };
}

/**
 * Admin: set product as active for TikTok feed
 */
async function adminActivate(productId, userId) {
  await db.query(
    `UPDATE tiktok_product_data SET is_active = 1, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
    [productId]
  );
  return true;
}

/**
 * Admin: pause product (remove from TikTok feed)
 */
async function adminPause(productId, userId) {
  await db.query(
    `UPDATE tiktok_product_data SET is_active = 0, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
    [productId]
  );
  return true;
}

/**
 * Admin: update TikTok listing fields
 */
async function adminUpdateProduct(productId, body) {
  const { tiktok_title, tiktok_description, tiktok_price } = body;
  await db.query(
    `UPDATE tiktok_product_data SET tiktok_title = COALESCE(?, tiktok_title), tiktok_description = COALESCE(?, tiktok_description), tiktok_price = COALESCE(?, tiktok_price), sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
    [tiktok_title, tiktok_description, tiktok_price, productId]
  );
  return true;
}

module.exports = {
  getShops,
  listProducts,
  saveProduct,
  getInventory,
  updateInventoryAllocation,
  bulkAllocations,
  getLogs,
  oauthAuthorize,
  adminListProducts,
  adminActivate,
  adminPause,
  adminUpdateProduct
};
