/**
 * Product Service
 * Core product CRUD operations
 * 
 * Business logic for product management - no HTTP concerns
 */

const db = require('../../../../config/db');

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Find product by ID
 * @param {number} productId - Product ID
 * @returns {Promise<Object|null>} Product or null
 */
async function findById(productId) {
  const [products] = await db.query(
    `SELECT p.*, 
            c.name as category_name,
            i.qty_on_hand, i.qty_available, i.qty_reserved, i.reorder_qty
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN inventory i ON p.id = i.product_id
     WHERE p.id = ?`,
    [productId]
  );
  return products[0] || null;
}

/**
 * Find product by SKU
 * @param {string} sku - Product SKU
 * @param {number} [vendorId] - Optional vendor ID to scope search
 * @returns {Promise<Object|null>} Product or null
 */
async function findBySku(sku, vendorId = null) {
  let query = 'SELECT * FROM products WHERE sku = ?';
  const params = [sku];
  
  if (vendorId) {
    query += ' AND vendor_id = ?';
    params.push(vendorId);
  }
  
  const [products] = await db.query(query, params);
  return products[0] || null;
}

/**
 * List products with filtering, pagination, sorting
 * @param {Object} options - Query options
 * @returns {Promise<{products: Array, meta: Object}>}
 */
async function list(options = {}) {
  const {
    vendorId = null,
    categoryId = null,
    status = null,
    search = null,
    parentId = undefined,
    includeDeleted = false,
    page = 1,
    limit = 50,
    sort = 'created_at',
    order = 'desc'
  } = options;

  // Build WHERE clause
  const conditions = [];
  const params = [];

  if (vendorId) {
    conditions.push('p.vendor_id = ?');
    params.push(vendorId);
  }

  if (categoryId) {
    conditions.push('p.category_id = ?');
    params.push(categoryId);
  }

  if (status) {
    conditions.push('p.status = ?');
    params.push(status);
  } else if (!includeDeleted) {
    conditions.push("p.status != 'deleted'");
  }

  if (search) {
    conditions.push('(p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)');
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (parentId === null) {
    conditions.push('p.parent_id IS NULL');
  } else if (parentId !== undefined) {
    conditions.push('p.parent_id = ?');
    params.push(parentId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Validate sort field
  const allowedSortFields = ['created_at', 'updated_at', 'name', 'price', 'sku', 'status'];
  const sortField = allowedSortFields.includes(sort) ? sort : 'created_at';
  const sortOrder = order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  // Count total
  const [countResult] = await db.query(
    `SELECT COUNT(*) as total FROM products p ${whereClause}`,
    params
  );
  const total = countResult[0].total;

  // Get products
  const offset = (page - 1) * limit;
  const [products] = await db.query(
    `SELECT p.*, c.name as category_name
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     ${whereClause}
     ORDER BY p.${sortField} ${sortOrder}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    products,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * Get product images
 * @param {number} productId - Product ID
 * @returns {Promise<Array>}
 */
async function getImages(productId) {
  // Get vendor_id for the pending_images path pattern
  const [product] = await db.query(
    'SELECT vendor_id FROM products WHERE id = ?',
    [productId]
  );
  
  // Get pending/temp images from pending_images table
  let tempImages = [];
  if (product && product[0]) {
    const vendorId = product[0].vendor_id;
    const [pending] = await db.query(
      `SELECT image_path as url, 0 as is_primary
       FROM pending_images
       WHERE image_path LIKE ? AND status = 'pending'`,
      [`/temp_images/products/${vendorId}-${productId}-%`]
    );
    tempImages = pending.map(img => ({ url: img.url, is_primary: false }));
  }
  
  // Get permanent images from product_images
  const [permanentImages] = await db.query(
    `SELECT id, image_url as url, is_primary, \`order\`
     FROM product_images
     WHERE product_id = ?
     ORDER BY is_primary DESC, \`order\` ASC`,
    [productId]
  );
  
  // Combine: permanent images first, then temp images
  return [
    ...permanentImages.map(img => ({ url: img.url, is_primary: img.is_primary === 1 })),
    ...tempImages
  ];
}

/**
 * Get product inventory
 * @param {number} productId - Product ID
 * @returns {Promise<Object|null>}
 */
async function getInventory(productId) {
  const [rows] = await db.query(
    'SELECT * FROM product_inventory_with_allocations WHERE product_id = ?',
    [productId]
  );
  return rows[0] || null;
}

/**
 * Get product children (variants)
 * @param {number} parentId - Parent product ID
 * @returns {Promise<Array>}
 */
async function getChildren(parentId) {
  const [children] = await db.query(
    `SELECT p.*, pi.qty_on_hand, pi.qty_available
     FROM products p
     LEFT JOIN product_inventory pi ON p.id = pi.product_id
     WHERE p.parent_id = ?
     ORDER BY p.name ASC`,
    [parentId]
  );
  return children;
}

/**
 * Get vendor info for a product
 * @param {number} vendorId - Vendor user ID
 * @returns {Promise<Object|null>}
 */
async function getVendorInfo(vendorId) {
  const [rows] = await db.query(
    `SELECT u.id, u.username, up.first_name, up.last_name, up.display_name,
            ap.business_name
     FROM users u
     LEFT JOIN user_profiles up ON u.id = up.user_id
     LEFT JOIN artist_profiles ap ON u.id = ap.user_id
     WHERE u.id = ?`,
    [vendorId]
  );
  return rows[0] || null;
}

// =============================================================================
// CREATE OPERATIONS
// =============================================================================

/**
 * Create a new product
 * @param {number} vendorId - Vendor user ID
 * @param {Object} data - Product data
 * @returns {Promise<Object>} Created product
 */
async function create(vendorId, data) {
  const {
    name,
    sku,
    price,
    description = '',
    short_description = '',
    category_id = 1,
    product_type = 'simple',
    status = 'draft',
    parent_id = null,
    // Dimensions
    width = null,
    height = null,
    depth = null,
    weight = null,
    dimension_unit = 'in',
    weight_unit = 'lbs',
    // Shipping
    ship_method = 'free',
    ship_rate = null,
    allow_returns = '30_day',
    // Marketplace
    marketplace_enabled = true,
    marketplace_category = 'unsorted',
    website_catalog_enabled = true,
    // Identifiers
    gtin = null,
    mpn = null,
    // Wholesale
    wholesale_price = null,
    wholesale_title = null,
    wholesale_description = null,
    // Meta
    meta_description = null,
    google_product_category = null,
    item_group_id = null,
    custom_label_0 = null,
    custom_label_1 = null,
    custom_label_2 = null,
    custom_label_3 = null,
    custom_label_4 = null,
  } = data;

  // Validate required fields
  if (!name || !sku || price === undefined) {
    throw new Error('name, sku, and price are required');
  }

  // Check for duplicate SKU
  const existingProduct = await findBySku(sku, vendorId);
  if (existingProduct) {
    throw new Error('A product with this SKU already exists');
  }

  const [result] = await db.query(
    `INSERT INTO products (
      vendor_id, name, sku, price, description, short_description,
      category_id, product_type, status, parent_id,
      width, height, depth, weight, dimension_unit, weight_unit,
      ship_method, ship_rate, allow_returns,
      marketplace_enabled, marketplace_category, website_catalog_enabled,
      gtin, mpn,
      wholesale_price, wholesale_title, wholesale_description,
      meta_description, google_product_category, item_group_id,
      custom_label_0, custom_label_1, custom_label_2, custom_label_3, custom_label_4
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      vendorId, name, sku, price, description, short_description,
      category_id, product_type, status, parent_id,
      width, height, depth, weight, dimension_unit, weight_unit,
      ship_method, ship_rate, allow_returns,
      marketplace_enabled ? 1 : 0, marketplace_category, website_catalog_enabled ? 1 : 0,
      gtin, mpn,
      wholesale_price, wholesale_title, wholesale_description,
      meta_description, google_product_category, item_group_id,
      custom_label_0, custom_label_1, custom_label_2, custom_label_3, custom_label_4
    ]
  );

  const productId = result.insertId;

  // Create inventory record
  const { qty_on_hand = 0, reorder_qty = 0 } = data;
  await db.query(
    `INSERT INTO product_inventory (product_id, qty_on_hand, qty_on_order, reorder_qty)
     VALUES (?, ?, 0, ?)`,
    [productId, qty_on_hand, reorder_qty]
  );

  return findById(productId);
}

// =============================================================================
// UPDATE OPERATIONS
// =============================================================================

/**
 * Update a product
 * @param {number} productId - Product ID
 * @param {number} vendorId - Vendor ID (for ownership check)
 * @param {Object} data - Updated fields
 * @param {boolean} isAdmin - Skip ownership check
 * @returns {Promise<Object>} Updated product
 */
async function update(productId, vendorId, data, isAdmin = false) {
  // Check ownership
  const product = await findById(productId);
  if (!product) {
    throw new Error('Product not found');
  }
  if (!isAdmin && product.vendor_id !== vendorId) {
    throw new Error('Not authorized to update this product');
  }

  // Build update query dynamically
  const allowedFields = [
    'name', 'sku', 'price', 'description', 'short_description',
    'category_id', 'product_type', 'status', 'parent_id',
    'width', 'height', 'depth', 'weight', 'dimension_unit', 'weight_unit',
    'ship_method', 'ship_rate', 'allow_returns',
    'marketplace_enabled', 'marketplace_category', 'website_catalog_enabled',
    'gtin', 'mpn',
    'wholesale_price', 'wholesale_title', 'wholesale_description',
    'meta_description', 'google_product_category', 'item_group_id',
    'custom_label_0', 'custom_label_1', 'custom_label_2', 'custom_label_3', 'custom_label_4'
  ];

  const updates = [];
  const values = [];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      // Handle boolean fields
      if (['marketplace_enabled', 'website_catalog_enabled'].includes(field)) {
        values.push(data[field] ? 1 : 0);
      } else {
        values.push(data[field]);
      }
    }
  }

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(productId);

    await db.query(
      `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  // Update inventory if provided
  if (data.qty_on_hand !== undefined || data.reorder_qty !== undefined) {
    await updateInventory(productId, {
      qty_on_hand: data.qty_on_hand,
      reorder_qty: data.reorder_qty
    });
  }

  return findById(productId);
}

/**
 * Update product inventory
 * @param {number} productId - Product ID
 * @param {Object} data - Inventory data
 */
async function updateInventory(productId, data) {
  const { qty_on_hand, reorder_qty, change_type = 'manual_adjustment', reason = '', created_by } = data;
  
  // Check if inventory record exists
  const existing = await getInventory(productId);
  
  if (existing) {
    const updates = [];
    const values = [];
    const previousQty = existing.qty_on_hand || 0;
    
    if (qty_on_hand !== undefined) {
      updates.push('qty_on_hand = ?');
      values.push(qty_on_hand);
    }
    if (reorder_qty !== undefined) {
      updates.push('reorder_qty = ?');
      values.push(reorder_qty);
    }
    
    if (updates.length > 0) {
      values.push(productId);
      await db.query(
        `UPDATE product_inventory SET ${updates.join(', ')} WHERE product_id = ?`,
        values
      );
      
      // Add history record if quantity changed
      if (qty_on_hand !== undefined && qty_on_hand !== previousQty) {
        await db.query(
          `INSERT INTO inventory_history (product_id, change_type, previous_qty, new_qty, reason, created_by)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [productId, change_type, previousQty, qty_on_hand, reason, created_by || null]
        );
      }
    }
  } else {
    await db.query(
      `INSERT INTO product_inventory (product_id, qty_on_hand, qty_on_order, reorder_qty)
       VALUES (?, ?, 0, ?)`,
      [productId, qty_on_hand || 0, reorder_qty || 0]
    );
    
    // Add initial history if quantity > 0
    if (qty_on_hand > 0) {
      await db.query(
        `INSERT INTO inventory_history (product_id, change_type, previous_qty, new_qty, reason, created_by)
         VALUES (?, ?, 0, ?, ?, ?)`,
        [productId, 'initial_stock', qty_on_hand, 'Initial inventory setup', created_by || null]
      );
    }
  }
}

/**
 * Get inventory history for a specific product
 * @param {number} productId - Product ID
 * @returns {Promise<Array>}
 */
async function getInventoryHistory(productId) {
  const [rows] = await db.query(
    `SELECT ih.*, up.first_name, up.last_name, u.username,
            (ih.new_qty - ih.previous_qty) as quantity_change
     FROM inventory_history ih 
     LEFT JOIN users u ON ih.created_by = u.id 
     LEFT JOIN user_profiles up ON u.id = up.user_id
     WHERE ih.product_id = ? 
     ORDER BY ih.created_at DESC 
     LIMIT 100`,
    [productId]
  );
  return rows;
}

/**
 * Get all inventory history for a user's products
 * @param {number} userId - User ID
 * @param {boolean} isAdmin - If true, show all products
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
async function getAllInventoryHistory(userId, isAdmin = false, options = {}) {
  const { page = 1, limit = 100, search } = options;
  const offset = (page - 1) * limit;
  
  let whereClause = isAdmin ? '1=1' : 'p.vendor_id = ?';
  const params = isAdmin ? [] : [userId];
  
  if (search) {
    whereClause += ' AND (p.name LIKE ? OR p.sku LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  
  params.push(limit, offset);
  
  const [rows] = await db.query(
    `SELECT ih.*, p.name as product_name, p.sku as product_sku,
            up.first_name, up.last_name, u.username,
            (ih.new_qty - ih.previous_qty) as quantity_change
     FROM inventory_history ih 
     JOIN products p ON ih.product_id = p.id
     LEFT JOIN users u ON ih.created_by = u.id 
     LEFT JOIN user_profiles up ON u.id = up.user_id
     WHERE ${whereClause}
     ORDER BY ih.created_at DESC 
     LIMIT ? OFFSET ?`,
    params
  );
  return rows;
}

/**
 * Update product status
 * @param {number} productId - Product ID
 * @param {number} vendorId - Vendor ID
 * @param {string} status - New status
 * @param {boolean} isAdmin - Skip ownership check
 */
async function updateStatus(productId, vendorId, status, isAdmin = false) {
  const product = await findById(productId);
  if (!product) {
    throw new Error('Product not found');
  }
  if (!isAdmin && product.vendor_id !== vendorId) {
    throw new Error('Not authorized to update this product');
  }

  const validStatuses = ['draft', 'active', 'hidden', 'deleted'];
  if (!validStatuses.includes(status)) {
    throw new Error('Invalid status');
  }

  await db.query(
    'UPDATE products SET status = ?, updated_at = NOW() WHERE id = ?',
    [status, productId]
  );

  return findById(productId);
}

// =============================================================================
// DELETE OPERATIONS
// =============================================================================

/**
 * Soft delete a product (set status to 'deleted')
 * @param {number} productId - Product ID
 * @param {number} vendorId - Vendor ID
 * @param {boolean} isAdmin - Skip ownership check
 */
async function softDelete(productId, vendorId, isAdmin = false) {
  return updateStatus(productId, vendorId, 'deleted', isAdmin);
}

/**
 * Bulk soft delete products
 * @param {number[]} productIds - Array of product IDs
 * @param {number} vendorId - Vendor ID
 * @param {boolean} isAdmin - Skip ownership check
 */
async function bulkSoftDelete(productIds, vendorId, isAdmin = false) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    throw new Error('productIds must be a non-empty array');
  }

  // Verify ownership for all products
  if (!isAdmin) {
    const placeholders = productIds.map(() => '?').join(',');
    const [products] = await db.query(
      `SELECT id, vendor_id FROM products WHERE id IN (${placeholders})`,
      productIds
    );

    const unauthorized = products.filter(p => p.vendor_id !== vendorId);
    if (unauthorized.length > 0) {
      throw new Error('Not authorized to delete one or more products');
    }
  }

  const placeholders = productIds.map(() => '?').join(',');
  await db.query(
    `UPDATE products SET status = 'deleted', updated_at = NOW() WHERE id IN (${placeholders})`,
    productIds
  );

  return { deleted: productIds.length };
}

/**
 * Hard delete a product (permanent)
 * @param {number} productId - Product ID
 * @param {number} vendorId - Vendor ID
 * @param {boolean} isAdmin - Skip ownership check
 */
async function hardDelete(productId, vendorId, isAdmin = false) {
  const product = await findById(productId);
  if (!product) {
    throw new Error('Product not found');
  }
  if (!isAdmin && product.vendor_id !== vendorId) {
    throw new Error('Not authorized to delete this product');
  }

  // Delete related records
  await db.query('DELETE FROM inventory_history WHERE product_id = ?', [productId]);
  await db.query('DELETE FROM product_inventory WHERE product_id = ?', [productId]);
  await db.query('DELETE FROM product_images WHERE product_id = ?', [productId]);
  await db.query('DELETE FROM products WHERE id = ?', [productId]);

  return { deleted: true };
}

// =============================================================================
// IMAGE OPERATIONS
// =============================================================================

/**
 * Add image to product
 * @param {number} productId - Product ID
 * @param {string} imageUrl - Image URL
 * @param {boolean} isPrimary - Is primary image
 * @param {number} order - Display order
 */
async function addImage(productId, imageUrl, isPrimary = false, order = 0) {
  // If setting as primary, unset other primary images
  if (isPrimary) {
    await db.query(
      'UPDATE product_images SET is_primary = 0 WHERE product_id = ?',
      [productId]
    );
  }

  const [result] = await db.query(
    'INSERT INTO product_images (product_id, image_url, is_primary, `order`) VALUES (?, ?, ?, ?)',
    [productId, imageUrl, isPrimary ? 1 : 0, order]
  );

  return { id: result.insertId, image_url: imageUrl, is_primary: isPrimary, order };
}

/**
 * Remove image from product
 * @param {number} productId - Product ID
 * @param {number} imageId - Image ID
 */
async function removeImage(productId, imageId) {
  await db.query(
    'DELETE FROM product_images WHERE id = ? AND product_id = ?',
    [imageId, productId]
  );
}

/**
 * Set primary image
 * @param {number} productId - Product ID
 * @param {number} imageId - Image ID to set as primary
 */
async function setPrimaryImage(productId, imageId) {
  await db.query(
    'UPDATE product_images SET is_primary = 0 WHERE product_id = ?',
    [productId]
  );
  await db.query(
    'UPDATE product_images SET is_primary = 1 WHERE id = ? AND product_id = ?',
    [imageId, productId]
  );
}

/**
 * Reorder images
 * @param {number} productId - Product ID
 * @param {number[]} imageIds - Array of image IDs in desired order
 */
async function reorderImages(productId, imageIds) {
  for (let i = 0; i < imageIds.length; i++) {
    await db.query(
      'UPDATE product_images SET `order` = ? WHERE id = ? AND product_id = ?',
      [i, imageIds[i], productId]
    );
  }
}

// =============================================================================
// STATS
// =============================================================================

/**
 * Get product statistics
 * @param {number} [vendorId] - Optional vendor ID to scope stats
 * @returns {Promise<Object>}
 */
async function getStats(vendorId = null) {
  let whereClause = '';
  const params = [];

  if (vendorId) {
    whereClause = 'WHERE vendor_id = ?';
    params.push(vendorId);
  }

  const [stats] = await db.query(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
       SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft,
       SUM(CASE WHEN status = 'hidden' THEN 1 ELSE 0 END) as hidden,
       SUM(CASE WHEN status = 'deleted' THEN 1 ELSE 0 END) as deleted,
       SUM(CASE WHEN parent_id IS NULL THEN 1 ELSE 0 END) as parents,
       SUM(CASE WHEN parent_id IS NOT NULL THEN 1 ELSE 0 END) as variants
     FROM products ${whereClause}`,
    params
  );

  return stats[0];
}

module.exports = {
  // Read
  findById,
  findBySku,
  list,
  getImages,
  getInventory,
  getInventoryHistory,
  getAllInventoryHistory,
  getChildren,
  getVendorInfo,
  getStats,
  // Create
  create,
  // Update
  update,
  updateInventory,
  updateStatus,
  // Delete
  softDelete,
  bulkSoftDelete,
  hardDelete,
  // Images
  addImage,
  removeImage,
  setPrimaryImage,
  reorderImages,
};
