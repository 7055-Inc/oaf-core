/**
 * TikTok Connector Service (v2)
 * Business logic for TikTok Shop addon.
 * Extracted from legacy routes/tiktok.js for use under /api/v2/catalog/tiktok
 * 
 * This layer handles database operations and orchestrates calls to the external TikTok API service.
 * Pattern: Routes -> Business Logic (this file) -> External API Service (tiktokService.js)
 */

const db = require('../../../../config/db');
const tiktokApiService = require('../../../services/tiktokService');
const { encrypt } = require('../../../utils/encryption');

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
      p.name as title,
      COALESCE(pi.qty_available, 0) as total_inventory
    FROM tiktok_inventory_allocations tia
    JOIN products p ON tia.product_id = p.id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
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
    'SELECT p.id, COALESCE(pi.qty_available, 0) as inventory_count FROM products p LEFT JOIN product_inventory pi ON p.id = pi.product_id WHERE p.id = ? AND p.vendor_id = ?',
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
 * OAuth authorize - get authorization URL for TikTok Shop connection
 * @param {number} userId - User ID
 * @returns {object} Authorization redirect URL
 */
function oauthAuthorize(userId) {
  try {
    const redirectUrl = tiktokApiService.getAuthorizationUrl(userId);
    return {
      success: true,
      redirect_url: redirectUrl
    };
  } catch (error) {
    console.error('TikTok OAuth authorize error:', error);
    return {
      success: false,
      message: error.message,
      status: 'error'
    };
  }
}

/**
 * Handle OAuth callback - exchange code for tokens and save shop connection
 * @param {string} authCode - Authorization code from TikTok
 * @param {string} state - State parameter (contains userId)
 * @returns {Promise<object>} Shop connection result
 */
async function handleOAuthCallback(authCode, state) {
  try {
    // Decode state to get userId
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const userId = stateData.userId;
    
    // Exchange code for tokens
    const tokenData = await tiktokApiService.getAccessToken(authCode);
    
    // Get shop info using the new token
    const shopInfo = await tiktokApiService.makeRequest(
      'GET',
      '/api/shop/get_authorized_shop',
      tokenData.access_token
    );
    
    // Calculate token expiry
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    
    // Save shop connection to database
    await db.execute(`
      INSERT INTO tiktok_user_shops 
      (user_id, shop_id, shop_name, shop_region, access_token, refresh_token, token_expires_at, is_active, terms_accepted)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON DUPLICATE KEY UPDATE
        shop_name = VALUES(shop_name),
        shop_region = VALUES(shop_region),
        access_token = VALUES(access_token),
        refresh_token = VALUES(refresh_token),
        token_expires_at = VALUES(token_expires_at),
        is_active = 1,
        updated_at = CURRENT_TIMESTAMP
    `, [
      userId,
      shopInfo.shop_id || shopInfo.id,
      shopInfo.shop_name || shopInfo.name,
      shopInfo.shop_region || shopInfo.region || 'US',
      encrypt(tokenData.access_token),
      encrypt(tokenData.refresh_token),
      expiresAt
    ]);
    
    // Log successful connection
    await db.execute(`
      INSERT INTO tiktok_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (?, 'shop', 'push', 'success', 'Shop connected successfully')
    `, [userId]);
    
    return {
      success: true,
      shop_id: shopInfo.shop_id || shopInfo.id,
      shop_name: shopInfo.shop_name || shopInfo.name
    };
    
  } catch (error) {
    console.error('TikTok OAuth callback error:', error);
    throw error;
  }
}

/**
 * Sync product to TikTok Shop API
 * @param {number} productId - Product ID
 * @param {number} userId - User ID
 * @param {string} shopId - TikTok shop ID
 * @returns {Promise<object>} Sync result
 */
async function syncProductToTikTok(productId, userId, shopId) {
  try {
    // Get product data from database
    const [products] = await db.execute(`
      SELECT 
        p.*,
        tpd.tiktok_title,
        tpd.tiktok_description,
        tpd.tiktok_price,
        tpd.tiktok_tags,
        tpd.tiktok_category_id,
        tpd.tiktok_product_id,
        tia.allocated_quantity
      FROM products p
      LEFT JOIN tiktok_product_data tpd ON p.id = tpd.product_id AND tpd.user_id = ?
      LEFT JOIN tiktok_inventory_allocations tia ON p.id = tia.product_id AND tia.user_id = ?
      WHERE p.id = ? AND p.vendor_id = ?
    `, [userId, userId, productId, userId]);
    
    if (products.length === 0) {
      throw new Error('Product not found');
    }
    
    const product = products[0];
    
    // Get product images
    const [images] = await db.execute(
      'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC',
      [productId]
    );
    
    // Build TikTok product payload
    const productData = {
      title: product.tiktok_title || product.name,
      description: product.tiktok_description || product.description || '',
      category_id: product.tiktok_category_id,
      main_images: images.map(img => ({ url: img.image_url })),
      skus: [
        {
          seller_sku: `${userId}-${productId}`,
          price: {
            amount: (product.tiktok_price || product.price) * 100, // Convert to cents
            currency: 'USD'
          },
          stock_infos: [
            {
              available_stock: product.allocated_quantity || 0
            }
          ]
        }
      ],
      package_weight: {
        value: product.weight || 1,
        unit: product.weight_unit || 'POUND'
      }
    };
    
    let result;
    if (product.tiktok_product_id) {
      // Update existing product
      result = await tiktokApiService.updateProduct(shopId, userId, product.tiktok_product_id, productData);
    } else {
      // Create new product
      result = await tiktokApiService.createProduct(shopId, userId, productData);
      
      // Save TikTok product ID
      await db.execute(
        'UPDATE tiktok_product_data SET tiktok_product_id = ?, sync_status = ?, last_sync_at = CURRENT_TIMESTAMP WHERE product_id = ? AND user_id = ?',
        [result.product_id, 'synced', productId, userId]
      );
    }
    
    // Log sync
    await db.execute(`
      INSERT INTO tiktok_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (?, 'product', 'push', ?, 'success', 'Product synced to TikTok Shop')
    `, [userId, productId]);
    
    return { success: true, result };
    
  } catch (error) {
    // Log error
    await db.execute(`
      INSERT INTO tiktok_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (?, 'product', 'push', ?, 'error', ?)
    `, [userId, productId, error.message]);
    
    throw error;
  }
}

/**
 * Sync orders from TikTok Shop API
 * @param {number} userId - User ID
 * @param {string} shopId - TikTok shop ID
 * @returns {Promise<object>} Sync result
 */
async function syncOrdersFromTikTok(userId, shopId) {
  try {
    // Get orders from last 30 days
    const thirtyDaysAgo = Math.floor((Date.now() - (30 * 24 * 60 * 60 * 1000)) / 1000);
    
    const ordersData = await tiktokApiService.getOrders(shopId, userId, {
      create_time_from: thirtyDaysAgo,
      page_size: 100
    });
    
    let syncCount = 0;
    const orders = ordersData.orders || ordersData.order_list || [];
    
    for (const order of orders) {
      // Check if order already exists
      const [existing] = await db.execute(
        'SELECT id FROM tiktok_orders WHERE tiktok_order_id = ?',
        [order.order_id || order.id]
      );
      
      if (existing.length === 0) {
        // Insert new order
        await db.execute(`
          INSERT INTO tiktok_orders 
          (user_id, shop_id, tiktok_order_id, order_status, total_amount, created_at, order_data)
          VALUES (?, ?, ?, ?, ?, FROM_UNIXTIME(?), ?)
        `, [
          userId,
          shopId,
          order.order_id || order.id,
          order.order_status || order.status,
          order.payment?.total_amount || 0,
          order.create_time || order.created_at,
          JSON.stringify(order)
        ]);
        syncCount++;
      } else {
        // Update existing order
        await db.execute(`
          UPDATE tiktok_orders 
          SET order_status = ?, total_amount = ?, order_data = ?, updated_at = CURRENT_TIMESTAMP
          WHERE tiktok_order_id = ?
        `, [
          order.order_status || order.status,
          order.payment?.total_amount || 0,
          JSON.stringify(order),
          order.order_id || order.id
        ]);
      }
    }
    
    // Log sync
    await db.execute(`
      INSERT INTO tiktok_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (?, 'orders', 'pull', 'success', ?)
    `, [userId, `Synced ${syncCount} new orders`]);
    
    return { success: true, synced: syncCount, total: orders.length };
    
  } catch (error) {
    console.error('TikTok order sync error:', error);
    
    // Log error
    await db.execute(`
      INSERT INTO tiktok_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (?, 'orders', 'pull', 'error', ?)
    `, [userId, error.message]);
    
    throw error;
  }
}

/**
 * Update inventory on TikTok Shop
 * @param {number} productId - Product ID
 * @param {number} userId - User ID
 * @param {string} shopId - TikTok shop ID
 * @param {number} quantity - New quantity
 * @returns {Promise<object>} Update result
 */
async function updateTikTokInventory(productId, userId, shopId, quantity) {
  try {
    // Get TikTok product ID and SKU ID
    const [products] = await db.execute(
      'SELECT tiktok_product_id, tiktok_sku_id FROM tiktok_product_data WHERE product_id = ? AND user_id = ?',
      [productId, userId]
    );
    
    if (products.length === 0) {
      throw new Error('Product not synced to TikTok');
    }
    
    const { tiktok_product_id, tiktok_sku_id } = products[0];
    
    // Update inventory via API
    const result = await tiktokApiService.updateInventory(
      shopId,
      userId,
      tiktok_product_id,
      tiktok_sku_id || tiktok_product_id, // Use product_id as fallback
      quantity
    );
    
    // Update local allocation
    await db.execute(`
      UPDATE tiktok_inventory_allocations 
      SET allocated_quantity = ?, updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ? AND user_id = ?
    `, [quantity, productId, userId]);
    
    // Log update
    await db.execute(`
      INSERT INTO tiktok_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (?, 'inventory', 'update', ?, 'success', ?)
    `, [userId, productId, `Updated inventory to ${quantity}`]);
    
    return { success: true, result };
    
  } catch (error) {
    console.error('TikTok inventory update error:', error);
    throw error;
  }
}

/**
 * Test TikTok API connection
 * @returns {Promise<object>} Connection test result
 */
async function testConnection() {
  return await tiktokApiService.testConnection();
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
      p.name, p.price, COALESCE(pi.qty_available, 0) as inventory_count, u.username, up.display_name as vendor_name, tia.allocated_quantity
    FROM tiktok_product_data tpd
    JOIN products p ON tpd.product_id = p.id
    JOIN users u ON tpd.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
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
 * Admin: update TikTok listing fields (OAuth products)
 */
async function adminUpdateProduct(productId, body) {
  const { tiktok_title, tiktok_description, tiktok_price } = body;
  await db.query(
    `UPDATE tiktok_product_data SET tiktok_title = COALESCE(?, tiktok_title), tiktok_description = COALESCE(?, tiktok_description), tiktok_price = COALESCE(?, tiktok_price), sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
    [tiktok_title, tiktok_description, tiktok_price, productId]
  );
  return true;
}

// ============================================
// CORPORATE SHOP FUNCTIONS (Brakebee TikTok Shop)
// Following Walmart corporate pattern
// ============================================

/**
 * Helper: Calculate corporate pricing
 * wholesale_price * 2, or retail * 1.2
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
 * Save/update corporate product for Brakebee TikTok Shop
 * Vendors submit products for admin approval
 */
async function saveCorporateProduct(productId, userId, body) {
  // Check product ownership
  const [check] = await db.execute(
    'SELECT id, name, price, wholesale_price FROM products WHERE id = ? AND vendor_id = ?',
    [productId, userId]
  );
  
  if (check.length === 0) return { found: false };
  
  const product = check[0];
  
  const {
    corporate_title,
    corporate_description,
    corporate_short_description,
    corporate_key_features,
    corporate_main_image_url,
    corporate_additional_images,
    corporate_category_id,
    corporate_brand,
    corporate_price,
    terms_accepted,
    is_active
  } = body;
  
  // Calculate price if not provided
  const finalPrice = corporate_price || calculateCorporatePrice(product);
  
  // Handle JSON fields
  const keyFeaturesJson = corporate_key_features ? 
    (typeof corporate_key_features === 'string' ? corporate_key_features : JSON.stringify(corporate_key_features)) : null;
  const additionalImagesJson = corporate_additional_images ? 
    (typeof corporate_additional_images === 'string' ? corporate_additional_images : JSON.stringify(corporate_additional_images)) : null;
  
  await db.execute(`
    INSERT INTO tiktok_corporate_products (
      product_id, user_id, corporate_title, corporate_description, corporate_short_description,
      corporate_price, corporate_key_features, corporate_main_image_url, corporate_additional_images,
      corporate_category_id, corporate_brand, is_active, listing_status, sync_status,
      terms_accepted_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ${terms_accepted ? 'NOW()' : 'NULL'}, ?)
    ON DUPLICATE KEY UPDATE
      corporate_title = VALUES(corporate_title),
      corporate_description = VALUES(corporate_description),
      corporate_short_description = VALUES(corporate_short_description),
      corporate_price = VALUES(corporate_price),
      corporate_key_features = VALUES(corporate_key_features),
      corporate_main_image_url = VALUES(corporate_main_image_url),
      corporate_additional_images = VALUES(corporate_additional_images),
      corporate_category_id = VALUES(corporate_category_id),
      corporate_brand = VALUES(corporate_brand),
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
    productId,
    userId,
    toNullIfEmpty(corporate_title) || product.name,
    toNullIfEmpty(corporate_description),
    toNullIfEmpty(corporate_short_description),
    toDecimalOrNull(finalPrice),
    keyFeaturesJson,
    toNullIfEmpty(corporate_main_image_url),
    additionalImagesJson,
    toNullIfEmpty(corporate_category_id),
    toNullIfEmpty(corporate_brand),
    is_active !== undefined ? (is_active ? 1 : 0) : 1,
    userId
  ]);
  
  return { found: true };
}

/**
 * Get single corporate product details
 */
async function getCorporateProduct(productId, userId) {
  const [rows] = await db.execute(`
    SELECT 
      tcp.*,
      p.name, p.price, p.wholesale_price, COALESCE(pi.qty_available, 0) as inventory_count, p.description,
      COALESCE(up.display_name, u.username) as vendor_name
    FROM tiktok_corporate_products tcp
    JOIN products p ON tcp.product_id = p.id
    JOIN users u ON tcp.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE tcp.product_id = ? AND tcp.user_id = ?
  `, [productId, userId]);
  
  return rows[0] || null;
}

/**
 * List user's corporate product submissions
 */
async function listCorporateProducts(userId) {
  const [products] = await db.execute(`
    SELECT 
      tcp.*,
      p.name, p.price, p.wholesale_price, COALESCE(pi.qty_available, 0) as inventory_count,
      CASE 
        WHEN tcp.id IS NOT NULL THEN 'submitted'
        ELSE 'not_submitted'
      END as corporate_status
    FROM products p
    LEFT JOIN tiktok_corporate_products tcp ON p.id = tcp.product_id AND tcp.user_id = ?
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE p.vendor_id = ? AND p.status = 'active'
    ORDER BY tcp.created_at DESC, p.created_at DESC
  `, [userId, userId]);
  
  return products;
}

/**
 * Remove corporate product (60-day cooldown)
 */
async function removeCorporateProduct(productId, userId) {
  const [check] = await db.execute(
    'SELECT id FROM products WHERE id = ? AND vendor_id = ?',
    [productId, userId]
  );
  
  if (check.length === 0) return { found: false };
  
  const cooldownEnd = new Date();
  cooldownEnd.setDate(cooldownEnd.getDate() + 60);
  
  await db.execute(`
    UPDATE tiktok_corporate_products 
    SET is_active = 0, 
        listing_status = 'removing', 
        removed_at = NOW(), 
        cooldown_ends_at = ?, 
        updated_at = CURRENT_TIMESTAMP 
    WHERE product_id = ? AND user_id = ?
  `, [cooldownEnd, productId, userId]);
  
  return { found: true, cooldown_ends_at: cooldownEnd };
}

/**
 * Admin: List all corporate products for review
 */
async function adminListCorporateProducts(options = {}) {
  const { status = 'all', page = 1, limit = 25, search = '' } = options;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  
  let statusFilter = '';
  if (status === 'pending') statusFilter = "AND tcp.listing_status = 'pending'";
  else if (status === 'active') statusFilter = "AND tcp.listing_status = 'listed'";
  else if (status === 'paused') statusFilter = "AND tcp.listing_status = 'paused'";
  else if (status === 'rejected') statusFilter = "AND tcp.listing_status = 'rejected'";
  
  let searchFilter = '';
  const searchParams = [];
  if (search) {
    searchFilter = "AND (p.name LIKE ? OR u.username LIKE ? OR tcp.corporate_title LIKE ?)";
    searchParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  
  const [countResult] = await db.query(
    `SELECT COUNT(*) as total 
     FROM tiktok_corporate_products tcp 
     JOIN products p ON tcp.product_id = p.id 
     JOIN users u ON tcp.user_id = u.id 
     WHERE 1=1 ${statusFilter} ${searchFilter}`,
    searchParams
  );
  const total = countResult[0].total;
  
  const [products] = await db.query(`
    SELECT 
      tcp.id, tcp.product_id, tcp.user_id, tcp.tiktok_product_id, tcp.tiktok_sku_id,
      tcp.corporate_title, tcp.corporate_description, tcp.corporate_price,
      tcp.is_active, tcp.listing_status, tcp.sync_status, tcp.created_at,
      tcp.last_sync_at, tcp.last_sync_error, tcp.rejection_reason,
      p.name, p.price, p.wholesale_price, COALESCE(pi.qty_available, 0) as inventory_count,
      u.username,
      COALESCE(up.display_name, u.username) as vendor_name
    FROM tiktok_corporate_products tcp
    JOIN products p ON tcp.product_id = p.id
    JOIN users u ON tcp.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE 1=1 ${statusFilter} ${searchFilter}
    ORDER BY tcp.created_at DESC
    LIMIT ? OFFSET ?
  `, [...searchParams, parseInt(limit), offset]);
  
  return { products, total };
}

/**
 * Admin: Approve product for TikTok feed (activate)
 */
async function adminActivateCorporate(productId, userId) {
  await db.execute(`
    UPDATE tiktok_corporate_products 
    SET listing_status = 'listed', 
        is_active = 1, 
        sync_status = 'pending', 
        rejection_reason = NULL,
        updated_at = CURRENT_TIMESTAMP 
    WHERE product_id = ?
  `, [productId]);
  
  await db.execute(`
    INSERT INTO tiktok_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'update', ?, 'success', 'Admin activated corporate product for TikTok feed')
  `, [userId, productId]);
  
  return true;
}

/**
 * Admin: Pause product (remove from feed)
 */
async function adminPauseCorporate(productId, userId) {
  await db.execute(`
    UPDATE tiktok_corporate_products 
    SET listing_status = 'paused', 
        sync_status = 'pending', 
        updated_at = CURRENT_TIMESTAMP 
    WHERE product_id = ?
  `, [productId]);
  
  await db.execute(`
    INSERT INTO tiktok_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'update', ?, 'success', 'Admin paused corporate product from TikTok feed')
  `, [userId, productId]);
  
  return true;
}

/**
 * Admin: Reject product with reason
 */
async function adminRejectCorporate(productId, userId, reason) {
  await db.execute(`
    UPDATE tiktok_corporate_products 
    SET listing_status = 'rejected', 
        rejection_reason = ?, 
        sync_status = 'pending',
        updated_at = CURRENT_TIMESTAMP 
    WHERE product_id = ?
  `, [reason || 'Product does not meet quality standards', productId]);
  
  await db.execute(`
    INSERT INTO tiktok_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'delete', ?, 'success', ?)
  `, [userId, productId, `Admin rejected corporate product: ${reason}`]);
  
  return true;
}

/**
 * Admin: Update corporate product data
 */
async function adminUpdateCorporateProduct(productId, body) {
  const { corporate_title, corporate_description, corporate_price } = body;
  
  await db.execute(`
    UPDATE tiktok_corporate_products 
    SET corporate_title = COALESCE(?, corporate_title), 
        corporate_description = COALESCE(?, corporate_description), 
        corporate_price = COALESCE(?, corporate_price), 
        sync_status = 'pending', 
        updated_at = CURRENT_TIMESTAMP 
    WHERE product_id = ?
  `, [corporate_title, corporate_description, corporate_price, productId]);
  
  return true;
}

module.exports = {
  // OAuth Shop Functions
  getShops,
  listProducts,
  saveProduct,
  getInventory,
  updateInventoryAllocation,
  bulkAllocations,
  getLogs,
  oauthAuthorize,
  handleOAuthCallback,
  syncProductToTikTok,
  syncOrdersFromTikTok,
  updateTikTokInventory,
  testConnection,
  // OAuth Admin Functions (tiktok_product_data)
  adminListProducts,
  adminActivate,
  adminPause,
  adminUpdateProduct,
  // Corporate Shop Functions (tiktok_corporate_products)
  saveCorporateProduct,
  getCorporateProduct,
  listCorporateProducts,
  removeCorporateProduct,
  // Corporate Admin Functions
  adminListCorporateProducts,
  adminActivateCorporate,
  adminPauseCorporate,
  adminRejectCorporate,
  adminUpdateCorporateProduct
};
