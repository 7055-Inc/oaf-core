/**
 * Wayfair Corporate Service (v2)
 * Business logic for Wayfair Supplier addon
 * Follows Walmart corporate pattern exactly
 * 
 * Pattern: Routes -> Business Logic (this file) -> External API Service (wayfairService.js)
 */

const db = require('../../../../config/db');
const wayfairApiService = require('../../../services/wayfairService');

/**
 * Calculate corporate price
 * wholesale_price × 2, or retail × 1.2
 */
function calculateCorporatePrice(product) {
  if (product.wholesale_price && parseFloat(product.wholesale_price) > 0) {
    return (parseFloat(product.wholesale_price) * 2).toFixed(2); // 100% markup
  }
  return (parseFloat(product.price) * 1.2).toFixed(2); // 20% markup
}

/**
 * Helper: Null-safe string/decimal conversion
 */
const toNullIfEmpty = (val) => (val === '' || val === undefined) ? null : val;
const toDecimalOrNull = (val) => {
  if (val === '' || val === undefined || val === null) return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
};

/**
 * List vendor's corporate products
 * Shows all products with submission status
 */
async function listProducts(userId) {
  const [products] = await db.execute(`
    SELECT 
      p.id, p.name, p.price, p.wholesale_price, 
      COALESCE(pi.qty_available, 0) as inventory_count,
      wcp.id as wayfair_corporate_id,
      wcp.wayfair_sku,
      wcp.wayfair_title,
      wcp.wayfair_price,
      wcp.listing_status,
      wcp.sync_status,
      wcp.rejection_reason,
      wcp.cooldown_ends_at,
      wcp.terms_accepted_at,
      wcp.created_at as submitted_at,
      CASE 
        WHEN wcp.id IS NOT NULL THEN 'submitted'
        ELSE 'not_submitted'
      END as corporate_status
    FROM products p
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    LEFT JOIN wayfair_corporate_products wcp ON p.id = wcp.product_id AND wcp.user_id = ?
    WHERE p.vendor_id = ? AND p.status = 'active'
    ORDER BY wcp.created_at DESC, p.created_at DESC
  `, [userId, userId]);
  
  return products;
}

/**
 * Get single corporate product details
 */
async function getProduct(productId, userId) {
  const [rows] = await db.execute(`
    SELECT 
      p.*,
      wcp.id as wayfair_corporate_id,
      wcp.wayfair_sku,
      wcp.wayfair_part_number,
      wcp.wayfair_title,
      wcp.wayfair_description,
      wcp.wayfair_short_description,
      wcp.wayfair_key_features,
      wcp.wayfair_price,
      wcp.wayfair_main_image_url,
      wcp.wayfair_additional_images,
      wcp.wayfair_category,
      wcp.wayfair_brand,
      wcp.wayfair_color,
      wcp.wayfair_material,
      wcp.wayfair_dimensions,
      wcp.wayfair_shipping_weight,
      wcp.wayfair_shipping_length,
      wcp.wayfair_shipping_width,
      wcp.wayfair_shipping_height,
      wcp.is_active,
      wcp.listing_status,
      wcp.sync_status,
      wcp.last_sync_at,
      wcp.last_sync_error,
      wcp.terms_accepted_at,
      wcp.rejection_reason,
      wcp.cooldown_ends_at,
      COALESCE(up.display_name, u.username) as vendor_name,
      u.username as vendor_email
    FROM products p
    LEFT JOIN wayfair_corporate_products wcp ON p.id = wcp.product_id AND wcp.user_id = ?
    LEFT JOIN users u ON p.vendor_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE p.id = ? AND p.vendor_id = ?
  `, [userId, productId, userId]);
  
  return rows[0] || null;
}

/**
 * Save/update corporate product
 * Vendors submit products for admin approval
 */
async function saveProduct(productId, userId, body) {
  // Verify product ownership
  const [productCheck] = await db.execute(
    'SELECT id, name, price, wholesale_price, width, height, depth, weight FROM products WHERE id = ? AND vendor_id = ?',
    [productId, userId]
  );
  
  if (productCheck.length === 0) {
    return { found: false };
  }
  
  const product = productCheck[0];
  
  // Check if in cooldown period
  const [cooldownCheck] = await db.execute(
    'SELECT cooldown_ends_at FROM wayfair_corporate_products WHERE product_id = ? AND user_id = ? AND cooldown_ends_at > NOW()',
    [productId, userId]
  );
  
  if (cooldownCheck.length > 0) {
    return {
      found: true,
      error: 'Product is in 60-day cooldown period and cannot be resubmitted',
      cooldown_ends_at: cooldownCheck[0].cooldown_ends_at
    };
  }
  
  const {
    wayfair_sku,
    wayfair_part_number,
    wayfair_title,
    wayfair_description,
    wayfair_short_description,
    wayfair_key_features,
    wayfair_price,
    wayfair_main_image_url,
    wayfair_additional_images,
    wayfair_category,
    wayfair_brand,
    wayfair_color,
    wayfair_material,
    wayfair_dimensions,
    wayfair_shipping_weight,
    wayfair_shipping_length,
    wayfair_shipping_width,
    wayfair_shipping_height,
    terms_accepted,
    is_active
  } = body;
  
  // Calculate price if not provided
  const finalPrice = wayfair_price || calculateCorporatePrice(product);
  
  // Handle JSON fields
  const keyFeaturesJson = wayfair_key_features ? 
    (typeof wayfair_key_features === 'string' ? wayfair_key_features : JSON.stringify(wayfair_key_features)) : null;
  const additionalImagesJson = wayfair_additional_images ? 
    (typeof wayfair_additional_images === 'string' ? wayfair_additional_images : JSON.stringify(wayfair_additional_images)) : null;
  const dimensionsJson = wayfair_dimensions ?
    (typeof wayfair_dimensions === 'string' ? wayfair_dimensions : JSON.stringify(wayfair_dimensions)) : null;
  
  await db.execute(`
    INSERT INTO wayfair_corporate_products (
      product_id, user_id, 
      wayfair_sku, wayfair_part_number, wayfair_title, wayfair_description, wayfair_short_description,
      wayfair_key_features, wayfair_price, wayfair_main_image_url, wayfair_additional_images,
      wayfair_category, wayfair_brand, wayfair_color, wayfair_material, wayfair_dimensions,
      wayfair_shipping_weight, wayfair_shipping_length, wayfair_shipping_width, wayfair_shipping_height,
      is_active, listing_status, sync_status, terms_accepted_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ${terms_accepted ? 'NOW()' : 'NULL'}, ?)
    ON DUPLICATE KEY UPDATE
      wayfair_sku = VALUES(wayfair_sku),
      wayfair_part_number = VALUES(wayfair_part_number),
      wayfair_title = VALUES(wayfair_title),
      wayfair_description = VALUES(wayfair_description),
      wayfair_short_description = VALUES(wayfair_short_description),
      wayfair_key_features = VALUES(wayfair_key_features),
      wayfair_price = VALUES(wayfair_price),
      wayfair_main_image_url = VALUES(wayfair_main_image_url),
      wayfair_additional_images = VALUES(wayfair_additional_images),
      wayfair_category = VALUES(wayfair_category),
      wayfair_brand = VALUES(wayfair_brand),
      wayfair_color = VALUES(wayfair_color),
      wayfair_material = VALUES(wayfair_material),
      wayfair_dimensions = VALUES(wayfair_dimensions),
      wayfair_shipping_weight = VALUES(wayfair_shipping_weight),
      wayfair_shipping_length = VALUES(wayfair_shipping_length),
      wayfair_shipping_width = VALUES(wayfair_shipping_width),
      wayfair_shipping_height = VALUES(wayfair_shipping_height),
      is_active = VALUES(is_active),
      listing_status = CASE 
        WHEN VALUES(is_active) = 0 AND listing_status = 'listed' THEN 'listed'
        WHEN VALUES(is_active) = 1 THEN 'pending'
        ELSE listing_status 
      END,
      removed_at = CASE WHEN VALUES(is_active) = 0 THEN NOW() ELSE NULL END,
      cooldown_ends_at = NULL,
      sync_status = 'pending',
      updated_at = CURRENT_TIMESTAMP
  `, [
    productId, userId,
    toNullIfEmpty(wayfair_sku) || `WAYFAIR-${userId}-${productId}`,
    toNullIfEmpty(wayfair_part_number) || `PN-${userId}-${productId}`,
    toNullIfEmpty(wayfair_title) || product.name,
    toNullIfEmpty(wayfair_description),
    toNullIfEmpty(wayfair_short_description),
    keyFeaturesJson,
    toDecimalOrNull(finalPrice),
    toNullIfEmpty(wayfair_main_image_url),
    additionalImagesJson,
    toNullIfEmpty(wayfair_category),
    toNullIfEmpty(wayfair_brand),
    toNullIfEmpty(wayfair_color),
    toNullIfEmpty(wayfair_material),
    dimensionsJson,
    toDecimalOrNull(wayfair_shipping_weight),
    toDecimalOrNull(wayfair_shipping_length),
    toDecimalOrNull(wayfair_shipping_width),
    toDecimalOrNull(wayfair_shipping_height),
    is_active !== undefined ? (is_active ? 1 : 0) : 1,
    userId
  ]);
  
  return { found: true, message: 'Corporate product submitted for approval' };
}

/**
 * Remove corporate product (60-day cooldown)
 */
async function removeProduct(productId, userId) {
  const [check] = await db.execute(
    'SELECT id FROM products WHERE id = ? AND vendor_id = ?',
    [productId, userId]
  );
  
  if (check.length === 0) {
    return { found: false };
  }
  
  const cooldownEnd = new Date();
  cooldownEnd.setDate(cooldownEnd.getDate() + 60);
  
  await db.execute(`
    UPDATE wayfair_corporate_products 
    SET is_active = 0, 
        listing_status = 'removing', 
        removed_at = NOW(), 
        cooldown_ends_at = ?, 
        updated_at = CURRENT_TIMESTAMP 
    WHERE product_id = ? AND user_id = ?
  `, [cooldownEnd, productId, userId]);
  
  return { found: true, cooldown_ends_at: cooldownEnd };
}

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Admin: List all corporate products for review
 */
async function adminListProducts(options = {}) {
  const { status = 'all', page = 1, limit = 25, search = '' } = options;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  let statusFilter = '';
  if (status === 'pending') statusFilter = "AND wcp.listing_status = 'pending'";
  else if (status === 'active') statusFilter = "AND wcp.listing_status = 'listed'";
  else if (status === 'paused') statusFilter = "AND wcp.listing_status = 'paused'";
  else if (status === 'rejected') statusFilter = "AND wcp.listing_status = 'rejected'";
  
  let searchFilter = '';
  const searchParams = [];
  if (search) {
    searchFilter = "AND (p.name LIKE ? OR u.username LIKE ? OR wcp.wayfair_title LIKE ?)";
    searchParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  const [countResult] = await db.query(
    `SELECT COUNT(*) as total 
     FROM wayfair_corporate_products wcp 
     JOIN products p ON wcp.product_id = p.id 
     JOIN users u ON wcp.user_id = u.id 
     WHERE 1=1 ${statusFilter} ${searchFilter}`,
    searchParams
  );
  const total = countResult[0].total;
  
  const [products] = await db.query(`
    SELECT 
      wcp.id, wcp.product_id, wcp.user_id, 
      wcp.wayfair_sku, wcp.wayfair_part_number, wcp.wayfair_title, wcp.wayfair_description, wcp.wayfair_price,
      wcp.is_active, wcp.listing_status, wcp.sync_status, wcp.created_at,
      wcp.last_sync_at, wcp.last_sync_error, wcp.rejection_reason, wcp.cooldown_ends_at,
      p.name, p.price, p.wholesale_price, 
      COALESCE(pi.qty_available, 0) as inventory_count,
      u.username, u.username as vendor_email,
      COALESCE(up.display_name, u.username) as vendor_name
    FROM wayfair_corporate_products wcp
    JOIN products p ON wcp.product_id = p.id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    JOIN users u ON wcp.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE 1=1 ${statusFilter} ${searchFilter}
    ORDER BY wcp.created_at DESC
    LIMIT ? OFFSET ?
  `, [...searchParams, parseInt(limit), offset]);
  
  return { products, total };
}

/**
 * Admin: Approve product for Wayfair feed (activate)
 */
async function adminActivate(productId, userId) {
  await db.execute(`
    UPDATE wayfair_corporate_products 
    SET listing_status = 'listed', 
        is_active = 1, 
        sync_status = 'pending', 
        rejection_reason = NULL,
        updated_at = CURRENT_TIMESTAMP 
    WHERE product_id = ?
  `, [productId]);
  
  await db.execute(`
    INSERT INTO wayfair_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'activate', ?, 'success', 'Admin activated corporate product for Wayfair feed')
  `, [userId, productId]);
  
  // TODO: Trigger sync to Wayfair API
  // const [product] = await db.execute('SELECT * FROM wayfair_corporate_products WHERE product_id = ?', [productId]);
  // await wayfairApiService.syncProduct(product[0]);
  
  return true;
}

/**
 * Admin: Pause product (remove from feed)
 */
async function adminPause(productId, userId) {
  await db.execute(`
    UPDATE wayfair_corporate_products 
    SET listing_status = 'paused', 
        sync_status = 'pending', 
        updated_at = CURRENT_TIMESTAMP 
    WHERE product_id = ?
  `, [productId]);
  
  await db.execute(`
    INSERT INTO wayfair_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'pause', ?, 'success', 'Admin paused corporate product from Wayfair feed')
  `, [userId, productId]);
  
  return true;
}

/**
 * Admin: Reject product with reason
 */
async function adminReject(productId, userId, reason) {
  await db.execute(`
    UPDATE wayfair_corporate_products 
    SET listing_status = 'rejected', 
        rejection_reason = ?, 
        sync_status = 'pending',
        updated_at = CURRENT_TIMESTAMP 
    WHERE product_id = ?
  `, [reason || 'Product does not meet quality standards', productId]);
  
  await db.execute(`
    INSERT INTO wayfair_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'reject', ?, 'success', ?)
  `, [userId, productId, `Admin rejected corporate product: ${reason}`]);
  
  return true;
}

/**
 * Admin: Update corporate product data
 */
async function adminUpdateProduct(productId, body) {
  const { wayfair_title, wayfair_description, wayfair_price } = body;
  
  // Build dynamic update query to avoid undefined values
  const updates = [];
  const params = [];
  
  if (wayfair_title !== undefined) {
    updates.push('wayfair_title = ?');
    params.push(wayfair_title);
  }
  if (wayfair_description !== undefined) {
    updates.push('wayfair_description = ?');
    params.push(wayfair_description);
  }
  if (wayfair_price !== undefined) {
    updates.push('wayfair_price = ?');
    params.push(wayfair_price);
  }
  
  if (updates.length === 0) {
    return true; // Nothing to update
  }
  
  updates.push('sync_status = ?');
  params.push('pending');
  params.push(productId);
  
  await db.execute(`
    UPDATE wayfair_corporate_products 
    SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP 
    WHERE product_id = ?
  `, params);
  
  return true;
}

/**
 * Test Wayfair API connection
 */
async function testConnection() {
  return await wayfairApiService.testConnection();
}

module.exports = {
  calculateCorporatePrice,
  listProducts,
  getProduct,
  saveProduct,
  removeProduct,
  adminListProducts,
  adminActivate,
  adminPause,
  adminReject,
  adminUpdateProduct,
  testConnection
};
