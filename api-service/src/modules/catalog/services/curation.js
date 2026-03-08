/**
 * Catalog Curation Service
 * Handles marketplace product curation (sorting into art/crafts categories)
 */

const db = require('../../../../config/db');

/**
 * Get curation statistics
 * @returns {Promise<Object>} Stats including counts by category
 */
async function getStats() {
  const [stats] = await db.execute(`
    SELECT 
      COUNT(CASE WHEN marketplace_enabled = TRUE THEN 1 END) as total_marketplace_products,
      COUNT(CASE WHEN marketplace_enabled = TRUE AND marketplace_category = 'unsorted' THEN 1 END) as unsorted_count,
      COUNT(CASE WHEN marketplace_enabled = TRUE AND marketplace_category = 'art' THEN 1 END) as art_count,
      COUNT(CASE WHEN marketplace_enabled = TRUE AND marketplace_category = 'crafts' THEN 1 END) as crafts_count,
      COUNT(CASE WHEN marketplace_enabled = TRUE AND wholesale_price IS NOT NULL THEN 1 END) as wholesale_count
    FROM products
    WHERE status = 'active'
  `);

  return stats[0];
}

/**
 * List products by marketplace category for curation
 * @param {Object} options - Query options
 * @param {string} options.category - Category to filter by (unsorted, art, crafts)
 * @param {number} options.limit - Max products to return
 * @param {number} options.offset - Pagination offset
 * @param {boolean} options.includeImages - Whether to include product images
 * @returns {Promise<Object>} Products and pagination info
 */
async function listProducts({ category = 'unsorted', limit = 50, offset = 0, includeImages = true }) {
  // Validate category
  if (!['unsorted', 'art', 'crafts'].includes(category)) {
    throw new Error('Invalid category. Must be: unsorted, art, or crafts');
  }

  // Get products
  const [products] = await db.execute(`
    SELECT p.id, p.name, p.description, p.price, p.image_url, p.marketplace_category,
           p.vendor_id, p.created_at,
           u.username as vendor_username,
           up.first_name as vendor_first_name,
           up.last_name as vendor_last_name,
           up.display_name as vendor_display_name
    FROM products p
    JOIN users u ON p.vendor_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE p.marketplace_enabled = TRUE 
      AND p.marketplace_category = ?
      AND p.status = 'active'
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `, [category, limit, offset]);

  // Add vendor name and images
  const processedProducts = await Promise.all(products.map(async (product) => {
    const result = {
      ...product,
      vendor_name: product.vendor_display_name || 
        `${product.vendor_first_name || ''} ${product.vendor_last_name || ''}`.trim() ||
        product.vendor_username
    };

    // Get images if requested
    if (includeImages) {
      const [images] = await db.execute(
        'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC LIMIT 1',
        [product.id]
      );
      result.images = images.map(img => img.image_url);
    }

    return result;
  }));

  // Get total count
  const [countResult] = await db.execute(`
    SELECT COUNT(*) as total
    FROM products
    WHERE marketplace_enabled = TRUE 
      AND marketplace_category = ?
      AND status = 'active'
  `, [category]);

  return {
    products: processedProducts,
    pagination: {
      total: countResult[0].total,
      limit,
      offset,
      has_more: countResult[0].total > (offset + limit)
    }
  };
}

/**
 * Move a product to a different marketplace category
 * @param {number} productId - Product ID
 * @param {string} toCategory - Target category
 * @param {number} curatedBy - User ID who curated
 * @param {string} reason - Reason for categorization
 * @returns {Promise<Object>} Result with previous and new category
 */
async function categorizeProduct(productId, toCategory, curatedBy, reason = null) {
  // Validate category
  if (!['unsorted', 'art', 'crafts'].includes(toCategory)) {
    throw new Error('Invalid category. Must be: unsorted, art, or crafts');
  }

  // Get current product info
  const [product] = await db.execute(
    'SELECT id, marketplace_category, name, vendor_id FROM products WHERE id = ? AND marketplace_enabled = TRUE',
    [productId]
  );

  if (!product.length) {
    const error = new Error('Product not found or not enabled for marketplace');
    error.status = 404;
    throw error;
  }

  const currentProduct = product[0];
  const previousCategory = currentProduct.marketplace_category;

  // Update the product category
  await db.execute(
    'UPDATE products SET marketplace_category = ?, updated_at = NOW() WHERE id = ?',
    [toCategory, productId]
  );

  // Log the curation action
  const curationReason = reason || `Admin moved product from ${previousCategory} to ${toCategory}`;
  await db.execute(
    'INSERT INTO marketplace_curation (product_id, previous_category, current_category, curated_by, curation_reason) VALUES (?, ?, ?, ?, ?)',
    [productId, previousCategory, toCategory, curatedBy, curationReason]
  );

  return {
    product_id: productId,
    previous_category: previousCategory,
    new_category: toCategory
  };
}

/**
 * Bulk categorize multiple products
 * @param {Array<number>} productIds - Product IDs to categorize
 * @param {string} toCategory - Target category
 * @param {number} curatedBy - User ID who curated
 * @param {string} reason - Reason for categorization
 * @returns {Promise<Object>} Result with update count
 */
async function bulkCategorize(productIds, toCategory, curatedBy, reason = null) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    throw new Error('product_ids must be a non-empty array');
  }

  if (!['unsorted', 'art', 'crafts'].includes(toCategory)) {
    throw new Error('Invalid category. Must be: unsorted, art, or crafts');
  }

  // Get current product info for logging
  const placeholders = productIds.map(() => '?').join(',');
  const [products] = await db.execute(
    `SELECT id, marketplace_category, name FROM products 
     WHERE id IN (${placeholders}) AND marketplace_enabled = TRUE`,
    productIds
  );

  if (products.length !== productIds.length) {
    const error = new Error('Some products not found or not enabled for marketplace');
    error.status = 400;
    error.found = products.length;
    error.requested = productIds.length;
    throw error;
  }

  // Use transaction for bulk update
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Update all products
    await connection.execute(
      `UPDATE products SET marketplace_category = ?, updated_at = NOW() WHERE id IN (${placeholders})`,
      [toCategory, ...productIds]
    );

    // Log curation actions for each product
    for (const product of products) {
      const curationReason = reason || `Bulk admin curation: moved from ${product.marketplace_category} to ${toCategory}`;
      await connection.execute(
        'INSERT INTO marketplace_curation (product_id, previous_category, current_category, curated_by, curation_reason) VALUES (?, ?, ?, ?, ?)',
        [product.id, product.marketplace_category, toCategory, curatedBy, curationReason]
      );
    }

    await connection.commit();

    return {
      updated_count: products.length,
      category: toCategory
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Get curation history log
 * @param {Object} options - Query options
 * @param {number} options.limit - Max entries to return
 * @param {number} options.offset - Pagination offset
 * @returns {Promise<Object>} Curation logs with pagination
 */
async function getCurationLog({ limit = 50, offset = 0 }) {
  const [logs] = await db.execute(`
    SELECT mc.*, 
           p.name as product_name,
           u.username as curator_username,
           up.first_name as curator_first_name,
           up.last_name as curator_last_name
    FROM marketplace_curation mc
    JOIN products p ON mc.product_id = p.id
    JOIN users u ON mc.curated_by = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    ORDER BY mc.curated_at DESC
    LIMIT ? OFFSET ?
  `, [limit, offset]);

  const processedLogs = logs.map(log => ({
    ...log,
    curator_name: `${log.curator_first_name || ''} ${log.curator_last_name || ''}`.trim() || log.curator_username
  }));

  return {
    logs: processedLogs,
    pagination: { limit, offset }
  };
}

module.exports = {
  getStats,
  listProducts,
  categorizeProduct,
  bulkCategorize,
  getCurationLog
};
