/**
 * Wayfair Corporate Service (v2)
 * Business logic for Wayfair Supplier addon
 *
 * Standard corporate connector contract:
 *   getCategories, refreshCategoriesCache,
 *   listProducts, getProduct, saveProduct, updateProduct, removeProduct,
 *   getAllocations,
 *   adminListProducts, adminActivate, adminPause, adminReject, adminUpdateProduct,
 *   testConnection
 *
 * Pattern: Routes -> Business Logic (this file) -> External API Service (wayfairService.js)
 */

const db = require('../../../../config/db');
const wayfairApiService = require('../../../services/wayfairService');
const { validateConnectorEnv } = require('../../../utils/connectorEnv');

validateConnectorEnv('wayfair');

// ============================================================================
// WAYFAIR CATEGORY TAXONOMY
// ============================================================================

const WAYFAIR_ART_CATEGORIES = [
  { id: 'wall-art', name: 'Wall Art', path: 'Décor > Wall Art', productType: 'Wall Art' },
  { id: 'canvas-art', name: 'Canvas Art', path: 'Décor > Wall Art > Canvas Art', productType: 'Canvas Art' },
  { id: 'art-prints', name: 'Art Prints', path: 'Décor > Wall Art > Art Prints', productType: 'Art Prints' },
  { id: 'photography-prints', name: 'Photography Prints', path: 'Décor > Wall Art > Photography', productType: 'Photography Prints' },
  { id: 'paintings', name: 'Paintings', path: 'Décor > Wall Art > Paintings', productType: 'Paintings' },
  { id: 'wall-sculptures', name: 'Wall Sculptures', path: 'Décor > Wall Décor > Wall Sculptures', productType: 'Wall Sculptures' },
  { id: 'picture-frames', name: 'Picture Frames', path: 'Décor > Picture Frames', productType: 'Picture Frames' },
  { id: 'decorative-sculptures', name: 'Decorative Sculptures', path: 'Décor > Decorative Objects > Sculptures & Statues', productType: 'Sculptures & Statues' },
  { id: 'vases', name: 'Vases', path: 'Décor > Vases', productType: 'Vases' },
  { id: 'decorative-bowls', name: 'Decorative Bowls & Trays', path: 'Décor > Decorative Bowls & Trays', productType: 'Decorative Bowls' },
  { id: 'decorative-pillows', name: 'Decorative Pillows', path: 'Décor > Decorative Pillows', productType: 'Throw Pillows' },
  { id: 'home-decor', name: 'Other Home Décor', path: 'Décor > Decorative Objects', productType: 'Decorative Accents' },
  { id: 'jewelry-necklaces', name: 'Handmade Necklaces', path: 'Jewelry > Necklaces', productType: 'Necklaces' },
  { id: 'jewelry-earrings', name: 'Handmade Earrings', path: 'Jewelry > Earrings', productType: 'Earrings' },
  { id: 'jewelry-bracelets', name: 'Handmade Bracelets', path: 'Jewelry > Bracelets', productType: 'Bracelets' },
  { id: 'collectibles', name: 'Collectibles', path: 'Décor > Decorative Objects > Collectibles', productType: 'Collectibles' }
];

let taxonomyCache = { data: null, lastFetch: 0 };
const TAXONOMY_CACHE_TTL = 24 * 60 * 60 * 1000;

async function getCategories(useCache = true) {
  const now = Date.now();
  if (useCache && taxonomyCache.data && (now - taxonomyCache.lastFetch) < TAXONOMY_CACHE_TTL) {
    return { categories: taxonomyCache.data, cached: true };
  }
  try {
    const data = await wayfairApiService.graphqlRequest(`
      query GetCategories {
        productCategories {
          id
          name
          path
          productType
        }
      }
    `);
    const categories = (data.productCategories || []).map(c => ({
      id: (c.name || '').replace(/\s+/g, '-').toLowerCase(),
      name: c.name,
      path: c.path || c.name,
      productType: c.productType || c.name
    }));
    if (categories.length > 0) {
      categories.sort((a, b) => a.name.localeCompare(b.name));
      taxonomyCache = { data: categories, lastFetch: now };
      return { categories, cached: false };
    }
    taxonomyCache = { data: WAYFAIR_ART_CATEGORIES, lastFetch: now };
    return { categories: WAYFAIR_ART_CATEGORIES, fallback: true };
  } catch (error) {
    console.error('Error fetching Wayfair categories:', error.message);
    return { categories: WAYFAIR_ART_CATEGORIES, fallback: true };
  }
}

function refreshCategoriesCache() {
  taxonomyCache = { data: null, lastFetch: 0 };
}

// ============================================================================
// HELPERS
// ============================================================================

function calculateCorporatePrice(product) {
  if (product.wholesale_price && parseFloat(product.wholesale_price) > 0) {
    return (parseFloat(product.wholesale_price) * 2).toFixed(2);
  }
  return (parseFloat(product.price) * 1.2).toFixed(2);
}

const toNullIfEmpty = (val) => (val === '' || val === undefined) ? null : val;
const toDecimalOrNull = (val) => {
  if (val === '' || val === undefined || val === null) return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
};

// ============================================================================
// VENDOR PRODUCT FUNCTIONS
// ============================================================================

async function listProducts(userId) {
  const [products] = await db.execute(`
    SELECT 
      p.id, p.name, p.price, p.wholesale_price, 
      COALESCE(pi.qty_available, 0) as inventory_count,
      wcp.id as wayfair_corporate_id,
      wcp.wayfair_sku,
      wcp.wayfair_title,
      wcp.wayfair_price,
      wcp.is_active,
      wcp.listing_status,
      wcp.sync_status,
      wcp.rejection_reason,
      wcp.cooldown_ends_at,
      wcp.terms_accepted_at,
      wcp.created_at as submitted_at,
      wia.allocated_quantity,
      CASE 
        WHEN wcp.id IS NOT NULL THEN 'submitted'
        ELSE 'not_submitted'
      END as corporate_status
    FROM products p
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    LEFT JOIN wayfair_corporate_products wcp ON p.id = wcp.product_id AND wcp.user_id = ?
    LEFT JOIN wayfair_inventory_allocations wia ON p.id = wia.product_id AND wia.user_id = ?
    WHERE p.vendor_id = ? AND p.status = 'active'
    ORDER BY wcp.created_at DESC, p.created_at DESC
  `, [userId, userId, userId]);
  
  return products;
}

/**
 * Get single corporate product details
 */
async function getProduct(productId, userId) {
  const [rows] = await db.execute(`
    SELECT 
      p.id, p.name, p.description, p.short_description, p.price, p.wholesale_price,
      p.width, p.height, p.depth, p.weight, p.dimension_unit, p.weight_unit,
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
      wia.allocated_quantity,
      COALESCE(ap.business_name, 'Brakebee Marketplace') as vendor_brand,
      COALESCE(up.display_name, u.username) as vendor_name,
      u.username as vendor_email
    FROM products p
    LEFT JOIN wayfair_corporate_products wcp ON p.id = wcp.product_id AND wcp.user_id = ?
    LEFT JOIN wayfair_inventory_allocations wia ON p.id = wia.product_id AND wia.user_id = ?
    LEFT JOIN artist_profiles ap ON p.vendor_id = ap.user_id
    LEFT JOIN users u ON p.vendor_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE p.id = ? AND p.vendor_id = ?
  `, [userId, userId, productId, userId]);
  
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
    allocated_quantity,
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

  if (allocated_quantity !== undefined) {
    const qty = parseInt(allocated_quantity) || 0;
    if (qty > 0) {
      await db.execute(`
        INSERT INTO wayfair_inventory_allocations (user_id, product_id, allocated_quantity) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP
      `, [userId, productId, qty]);
    } else {
      await db.execute('DELETE FROM wayfair_inventory_allocations WHERE user_id = ? AND product_id = ?', [userId, productId]);
    }
  }
  
  return { found: true };
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

async function updateProduct(productId, userId, body) {
  const [check] = await db.execute(
    'SELECT id FROM products WHERE id = ? AND vendor_id = ?',
    [productId, userId]
  );
  if (check.length === 0) return { found: false };

  const { wayfair_title, wayfair_description, wayfair_price, allocated_quantity } = body;

  const updates = [];
  const params = [];
  if (wayfair_title !== undefined) { updates.push('wayfair_title = ?'); params.push(wayfair_title); }
  if (wayfair_description !== undefined) { updates.push('wayfair_description = ?'); params.push(wayfair_description); }
  if (wayfair_price !== undefined) { updates.push('wayfair_price = ?'); params.push(wayfair_price); }

  if (updates.length > 0) {
    updates.push("sync_status = 'pending'");
    params.push(productId, userId);
    await db.execute(`
      UPDATE wayfair_corporate_products SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE product_id = ? AND user_id = ?
    `, params);
  }

  if (allocated_quantity !== undefined) {
    const qty = parseInt(allocated_quantity) || 0;
    if (qty > 0) {
      await db.execute(`
        INSERT INTO wayfair_inventory_allocations (user_id, product_id, allocated_quantity) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP
      `, [userId, productId, qty]);
    } else {
      await db.execute('DELETE FROM wayfair_inventory_allocations WHERE user_id = ? AND product_id = ?', [userId, productId]);
    }
  }

  return { found: true };
}

async function getAllocations(userId) {
  const [allocations] = await db.execute(`
    SELECT wia.*, p.name, COALESCE(pi.qty_available, 0) as inventory_count
    FROM wayfair_inventory_allocations wia
    JOIN products p ON wia.product_id = p.id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE wia.user_id = ?
  `, [userId]);
  return allocations;
}

// ============================================================================
// ADMIN FUNCTIONS
// ============================================================================

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
      COALESCE(up.display_name, u.username) as vendor_name,
      wia.allocated_quantity
    FROM wayfair_corporate_products wcp
    JOIN products p ON wcp.product_id = p.id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    JOIN users u ON wcp.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN wayfair_inventory_allocations wia ON wcp.product_id = wia.product_id
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
    VALUES (NULL, 'product', 'activate', ?, 'success', ?)
  `, [productId, `Admin ${userId} activated corporate product for Wayfair feed`]);
  
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
    VALUES (NULL, 'product', 'pause', ?, 'success', ?)
  `, [productId, `Admin ${userId} paused corporate product from Wayfair feed`]);
  
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
    VALUES (NULL, 'product', 'reject', ?, 'success', ?)
  `, [productId, `Admin ${userId} rejected corporate product: ${reason}`]);
  
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

// ============================================================================
// ORDER MANAGEMENT
// ============================================================================

async function getOrders(vendorId, options = {}) {
  const { status, page = 1, limit = 25 } = options;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let statusFilter = '';
  if (status) statusFilter = 'AND wo.order_status = ?';
  const countParams = [vendorId];
  if (status) countParams.push(status);
  const [countResult] = await db.query(
    `SELECT COUNT(DISTINCT wo.id) as total FROM wayfair_orders wo JOIN wayfair_order_items woi ON wo.id = woi.order_id WHERE woi.vendor_id = ? ${statusFilter}`,
    countParams
  );
  const params = [...countParams, parseInt(limit), offset];
  const [orders] = await db.query(`
    SELECT wo.id, wo.wayfair_po_number, wo.customer_name,
      wo.order_status, wo.total, wo.created_at, wo.acknowledged_at,
      COUNT(woi.id) as item_count, SUM(woi.total_price) as vendor_total
    FROM wayfair_orders wo
    JOIN wayfair_order_items woi ON wo.id = woi.order_id
    WHERE woi.vendor_id = ? ${statusFilter}
    GROUP BY wo.id ORDER BY wo.created_at DESC LIMIT ? OFFSET ?
  `, params);
  return { orders, total: countResult[0].total, page: parseInt(page), limit: parseInt(limit) };
}

async function getOrderDetails(orderId, vendorId) {
  const [orders] = await db.query(`
    SELECT wo.* FROM wayfair_orders wo
    JOIN wayfair_order_items woi ON wo.id = woi.order_id
    WHERE wo.id = ? AND woi.vendor_id = ? LIMIT 1
  `, [orderId, vendorId]);
  if (orders.length === 0) return null;
  const order = orders[0];
  const [items] = await db.query(`
    SELECT woi.*, p.name as catalog_product_name, p.sku as catalog_sku
    FROM wayfair_order_items woi
    LEFT JOIN products p ON woi.product_id = p.id
    WHERE woi.order_id = ? AND woi.vendor_id = ?
  `, [orderId, vendorId]);
  order.items = items;
  return order;
}

async function addTracking(orderItemId, vendorId, trackingData) {
  const { tracking_number, tracking_carrier } = trackingData;
  const [check] = await db.query(
    'SELECT id, order_id FROM wayfair_order_items WHERE id = ? AND vendor_id = ?',
    [orderItemId, vendorId]
  );
  if (check.length === 0) return { found: false };
  await db.query(`
    UPDATE wayfair_order_items
    SET tracking_number = ?, tracking_carrier = ?, status = 'shipped', shipped_at = NOW()
    WHERE id = ?
  `, [tracking_number, tracking_carrier, orderItemId]);
  await db.query(`
    INSERT INTO wayfair_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'shipment', 'update', ?, 'success', ?)
  `, [vendorId, orderItemId, `Tracking added: ${tracking_carrier} ${tracking_number}`]);
  return { found: true, order_id: check[0].order_id };
}

async function adminGetOrders(options = {}) {
  const { status, page = 1, limit = 25 } = options;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let statusFilter = '';
  const params = [];
  if (status) { statusFilter = 'WHERE wo.order_status = ?'; params.push(status); }
  const [countResult] = await db.query(`SELECT COUNT(*) as total FROM wayfair_orders wo ${statusFilter}`, params);
  params.push(parseInt(limit), offset);
  const [orders] = await db.query(`
    SELECT wo.*, COUNT(woi.id) as item_count
    FROM wayfair_orders wo LEFT JOIN wayfair_order_items woi ON wo.id = woi.order_id
    ${statusFilter} GROUP BY wo.id ORDER BY wo.created_at DESC LIMIT ? OFFSET ?
  `, params);
  return { orders, total: countResult[0].total };
}

// ============================================================================
// INVENTORY MANAGEMENT
// ============================================================================

async function getInventory(vendorId) {
  const [inventory] = await db.query(`
    SELECT p.id as product_id, p.name, p.sku,
      COALESCE(pi.qty_on_hand, 0) as qty_on_hand,
      COALESCE(pi.qty_available, 0) as qty_available,
      COALESCE(wia.allocated_quantity, 0) as wayfair_allocated,
      wcp.listing_status, wcp.sync_status
    FROM products p
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    LEFT JOIN wayfair_inventory_allocations wia ON p.id = wia.product_id AND wia.user_id = ?
    LEFT JOIN wayfair_corporate_products wcp ON p.id = wcp.product_id
    WHERE p.vendor_id = ? AND p.status = 'active'
    ORDER BY p.name ASC
  `, [vendorId, vendorId]);
  return inventory;
}

async function updateInventoryAllocation(productId, vendorId, quantity) {
  const [check] = await db.query(
    'SELECT id FROM products WHERE id = ? AND vendor_id = ? AND status = "active"',
    [productId, vendorId]
  );
  if (check.length === 0) return { found: false };
  const qty = parseInt(quantity) || 0;
  if (qty > 0) {
    await db.query(`
      INSERT INTO wayfair_inventory_allocations (user_id, product_id, allocated_quantity)
      VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE allocated_quantity = ?, updated_at = CURRENT_TIMESTAMP
    `, [vendorId, productId, qty, qty]);
  } else {
    await db.query('DELETE FROM wayfair_inventory_allocations WHERE user_id = ? AND product_id = ?', [vendorId, productId]);
  }
  return { found: true, allocated: qty };
}

async function bulkAllocations(vendorId, allocations) {
  const results = [];
  for (const { product_id, quantity } of allocations) {
    const result = await updateInventoryAllocation(product_id, vendorId, quantity);
    results.push({ product_id, ...result });
  }
  return results;
}

// ============================================================================
// SYNC LOGS
// ============================================================================

async function getSyncLogs(options = {}) {
  const { sync_type, status, page = 1, limit = 25 } = options;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let where = '1=1';
  const params = [];
  if (sync_type) { where += ' AND sync_type = ?'; params.push(sync_type); }
  if (status) { where += ' AND status = ?'; params.push(status); }
  params.push(parseInt(limit), offset);
  const [logs] = await db.query(`SELECT * FROM wayfair_sync_logs WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, params);
  return logs;
}

// ============================================================================
// SHIPPING REGISTRATION & LABELS
// ============================================================================

const fs = require('fs').promises;
const path = require('path');

async function getShippingUnits(orderId) {
  const [units] = await db.query(
    'SELECT * FROM wayfair_shipping_units WHERE wayfair_order_id = ? ORDER BY group_identifier, sequence_identifier',
    [orderId]
  );
  return units;
}

async function saveShippingUnits(orderId, units) {
  await db.query('DELETE FROM wayfair_shipping_units WHERE wayfair_order_id = ?', [orderId]);
  for (const unit of units) {
    await db.query(`
      INSERT INTO wayfair_shipping_units
        (wayfair_order_id, part_number, unit_type, weight_value, weight_unit,
         length_value, width_value, height_value, dimension_unit,
         group_identifier, sequence_identifier)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderId, unit.part_number, unit.unit_type || 'CARTON',
      unit.weight_value, unit.weight_unit || 'POUNDS',
      unit.length_value, unit.width_value, unit.height_value,
      unit.dimension_unit || 'INCHES',
      unit.group_identifier || 1, unit.sequence_identifier || 1
    ]);
  }
  return units;
}

/**
 * Build default shipping units from catalog product data so the vendor
 * has something to review/adjust before registering.
 */
async function getDefaultShippingUnits(orderId) {
  const [items] = await db.query(`
    SELECT woi.wayfair_part_number, woi.quantity,
      p.weight, p.width, p.height, p.depth, p.weight_unit, p.dimension_unit,
      wcp.wayfair_shipping_weight, wcp.wayfair_shipping_length,
      wcp.wayfair_shipping_width, wcp.wayfair_shipping_height
    FROM wayfair_order_items woi
    LEFT JOIN products p ON woi.product_id = p.id
    LEFT JOIN wayfair_corporate_products wcp ON p.id = wcp.product_id
    WHERE woi.order_id = ?
  `, [orderId]);

  const units = [];
  for (const item of items) {
    const qty = parseInt(item.quantity) || 1;
    for (let g = 1; g <= qty; g++) {
      units.push({
        part_number: item.wayfair_part_number,
        unit_type: 'CARTON',
        weight_value: parseFloat(item.wayfair_shipping_weight || item.weight || 1),
        weight_unit: 'POUNDS',
        length_value: parseFloat(item.wayfair_shipping_length || item.depth || 12),
        width_value: parseFloat(item.wayfair_shipping_width || item.width || 12),
        height_value: parseFloat(item.wayfair_shipping_height || item.height || 12),
        dimension_unit: 'INCHES',
        group_identifier: g,
        sequence_identifier: 1
      });
    }
  }
  return units;
}

/**
 * Register a Wayfair order for shipment: call Wayfair's register mutation,
 * download the label PDF, and store it in the existing shipping_labels system.
 */
async function registerForShipment(orderId) {
  const [orders] = await db.query(
    'SELECT * FROM wayfair_orders WHERE id = ?', [orderId]
  );
  if (orders.length === 0) return { success: false, error: 'Order not found' };
  const order = orders[0];

  if (order.registration_status === 'registered') {
    return { success: true, already_registered: true, label_event_id: order.label_event_id };
  }

  await db.query(
    'UPDATE wayfair_orders SET registration_status = "pending" WHERE id = ?',
    [orderId]
  );

  let shippingUnits = await getShippingUnits(orderId);
  if (shippingUnits.length === 0) {
    shippingUnits = await getDefaultShippingUnits(orderId);
    await saveShippingUnits(orderId, shippingUnits);
  }

  const wayfairUnits = shippingUnits.map(u => ({
    partNumber: u.part_number,
    unitType: u.unit_type,
    weight: { value: parseFloat(u.weight_value), unit: u.weight_unit },
    dimensions: {
      length: { value: parseFloat(u.length_value), unit: u.dimension_unit },
      width: { value: parseFloat(u.width_value), unit: u.dimension_unit },
      height: { value: parseFloat(u.height_value), unit: u.dimension_unit }
    },
    groupIdentifier: u.group_identifier,
    sequenceIdentifier: u.sequence_identifier
  }));

  const pickupDate = new Date();
  pickupDate.setDate(pickupDate.getDate() + 1);
  const pickupStr = pickupDate.toISOString().replace('T', ' ').replace('Z', '0 +00:00');

  try {
    const event = await wayfairApiService.registerOrder(
      order.wayfair_po_number, null, pickupStr, wayfairUnits
    );

    const label = event.generatedShippingLabels?.[0] || {};
    const labelUrl = event.consolidatedShippingLabel?.url || null;
    const bolUrl = event.billOfLading?.url || null;
    const packingSlipUrl = event.purchaseOrder?.packingSlipUrl || null;

    let localLabelPath = null;
    if (labelUrl) {
      try {
        const pdfBuffer = await wayfairApiService.downloadDocument(labelUrl);
        const labelsDir = path.join(__dirname, '../../../../labels');
        await fs.mkdir(labelsDir, { recursive: true });

        const [items] = await db.query(
          'SELECT vendor_id FROM wayfair_order_items WHERE order_id = ? LIMIT 1', [orderId]
        );
        const vendorId = items[0]?.vendor_id || 0;
        const fileName = `user_${vendorId}_order_${order.main_order_id || orderId}_${Date.now()}.pdf`;
        await fs.writeFile(path.join(labelsDir, fileName), pdfBuffer);
        localLabelPath = `/labels/${fileName}`;

        if (order.main_order_id) {
          const [mainItems] = await db.query(
            'SELECT id FROM order_items WHERE order_id = ? LIMIT 1', [order.main_order_id]
          );
          const mainItemId = mainItems[0]?.id || null;

          await db.query(`
            INSERT INTO shipping_labels
              (order_id, order_item_id, vendor_id, package_sequence, carrier,
               service_code, service_name, tracking_number, label_file_path,
               label_format, cost, currency, status)
            VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, 'pdf', 0, 'USD', 'purchased')
          `, [
            order.main_order_id, mainItemId, vendorId,
            label.carrierCode || 'wayfair',
            label.carrierCode || 'WAYFAIR',
            label.carrier || 'Wayfair Prepaid',
            label.trackingNumber || null,
            localLabelPath
          ]);

          if (mainItemId && label.trackingNumber) {
            await db.query(`
              INSERT INTO order_item_tracking
                (order_item_id, carrier, tracking_number, tracking_method)
              VALUES (?, ?, ?, 'marketplace_label')
              ON DUPLICATE KEY UPDATE
                carrier = VALUES(carrier),
                tracking_number = VALUES(tracking_number),
                tracking_method = 'marketplace_label'
            `, [mainItemId, label.carrierCode || 'wayfair', label.trackingNumber]);
          }
        }
      } catch (dlErr) {
        console.error(`[Wayfair Registration] Label download failed for PO ${order.wayfair_po_number}:`, dlErr.message);
      }
    }

    await db.query(`
      UPDATE wayfair_orders SET
        registration_status = 'registered', registered_at = NOW(),
        label_event_id = ?, wayfair_carrier = ?, wayfair_carrier_code = ?,
        wayfair_tracking_number = ?, pickup_date = ?,
        shipping_label_url = ?, packing_slip_url = ?, bol_url = ?,
        shipping_units_data = ?, last_registration_error = NULL
      WHERE id = ?
    `, [
      event.id, label.carrier || null, label.carrierCode || null,
      label.trackingNumber || null,
      event.pickupDate ? new Date(event.pickupDate) : pickupDate,
      labelUrl, packingSlipUrl, bolUrl,
      JSON.stringify(wayfairUnits), orderId
    ]);

    await db.query(`
      UPDATE wayfair_order_items SET
        tracking_number = ?, tracking_carrier = ?
      WHERE order_id = ?
    `, [label.trackingNumber || null, label.carrierCode || null, orderId]);

    await db.query(`
      INSERT INTO wayfair_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (NULL, 'shipment', 'register', ?, 'success', ?)
    `, [orderId, `Registered PO ${order.wayfair_po_number}: ${label.carrier} ${label.trackingNumber}`]);

    return {
      success: true,
      label_event_id: event.id,
      tracking_number: label.trackingNumber,
      carrier: label.carrier,
      carrier_code: label.carrierCode,
      label_url: localLabelPath,
      packing_slip_url: packingSlipUrl,
      bol_url: bolUrl
    };

  } catch (err) {
    const attempts = (order.registration_attempts || 0) + 1;
    const newStatus = attempts >= 5 ? 'error' : 'failed';

    await db.query(`
      UPDATE wayfair_orders SET
        registration_status = ?, registration_attempts = ?,
        last_registration_error = ?, last_registration_attempt_at = NOW()
      WHERE id = ?
    `, [newStatus, attempts, err.message?.substring(0, 1000), orderId]);

    await db.query(`
      INSERT INTO wayfair_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (NULL, 'shipment', 'register', ?, 'failed', ?)
    `, [orderId, `Registration failed for PO ${order.wayfair_po_number}: ${err.message?.substring(0, 500)}`]);

    return { success: false, error: err.message, attempts, status: newStatus };
  }
}

/**
 * Get registration and label status for an order.
 */
async function getRegistrationStatus(orderId) {
  const [rows] = await db.query(`
    SELECT registration_status, registration_attempts, last_registration_error,
      registered_at, label_event_id, wayfair_carrier, wayfair_carrier_code,
      wayfair_tracking_number, pickup_date, shipping_label_url, packing_slip_url, bol_url
    FROM wayfair_orders WHERE id = ?
  `, [orderId]);
  if (rows.length === 0) return null;

  const order = rows[0];
  let localLabel = null;
  if (order.registration_status === 'registered') {
    const [labels] = await db.query(`
      SELECT sl.id, sl.label_file_path, sl.tracking_number, sl.carrier
      FROM shipping_labels sl
      JOIN orders o ON sl.order_id = o.id
      JOIN wayfair_orders wo ON wo.main_order_id = o.id
      WHERE wo.id = ?
    `, [orderId]);
    if (labels.length > 0) localLabel = labels[0];
  }

  return { ...order, local_label: localLabel };
}

module.exports = {
  getCategories,
  refreshCategoriesCache,
  calculateCorporatePrice,
  listProducts,
  getProduct,
  saveProduct,
  updateProduct,
  removeProduct,
  getAllocations,
  getOrders,
  getOrderDetails,
  addTracking,
  adminGetOrders,
  getInventory,
  updateInventoryAllocation,
  bulkAllocations,
  getSyncLogs,
  getShippingUnits,
  saveShippingUnits,
  getDefaultShippingUnits,
  registerForShipment,
  getRegistrationStatus,
  adminListProducts,
  adminActivate,
  adminPause,
  adminReject,
  adminUpdateProduct,
  testConnection,
  WAYFAIR_ART_CATEGORIES
};
