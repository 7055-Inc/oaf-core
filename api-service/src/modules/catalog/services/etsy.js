/**
 * Etsy Connector Service (v2)
 * Business logic for Etsy OAuth integration
 * OAuth-only (no corporate catalog)
 * 
 * Pattern: Routes -> Business Logic (this file) -> External API Service (etsyService.js)
 */

const db = require('../../../../config/db');
const etsyApiService = require('../../../services/etsyService');
const { encrypt } = require('../../../utils/encryption');

/**
 * Get user's Etsy shop connections
 * 
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of shop objects
 */
async function getShops(userId) {
  const [shops] = await db.execute(`
    SELECT 
      id, shop_id, shop_name, shop_url, is_active, 
      terms_accepted, last_sync_at, created_at,
      CASE WHEN access_token IS NOT NULL THEN true ELSE false END as has_token
    FROM etsy_user_shops 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `, [userId]);
  
  return shops;
}

/**
 * Get user's Etsy product data
 * Lists all products with Etsy listing data if configured
 * 
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of products with Etsy data
 */
async function listProducts(userId) {
  const [products] = await db.execute(`
    SELECT 
      p.*,
      epd.id as etsy_data_id,
      epd.shop_id as etsy_shop_id,
      epd.etsy_listing_id,
      epd.etsy_title,
      epd.etsy_description,
      epd.etsy_price,
      epd.etsy_quantity,
      epd.etsy_sku,
      epd.etsy_tags,
      epd.etsy_materials,
      epd.etsy_category_id,
      epd.is_active as etsy_active,
      epd.listing_state,
      epd.sync_status,
      epd.last_sync_at,
      eia.allocated_quantity,
      CASE 
        WHEN epd.id IS NOT NULL THEN 'configured'
        ELSE 'unconfigured'
      END as etsy_status
    FROM products p
    LEFT JOIN etsy_product_data epd ON p.id = epd.product_id AND epd.user_id = ?
    LEFT JOIN etsy_inventory_allocations eia ON p.id = eia.product_id AND eia.user_id = ?
    WHERE p.vendor_id = ?
    ORDER BY p.created_at DESC
  `, [userId, userId, userId]);

  // Add images
  const processedProducts = await Promise.all(
    products.map(async (product) => {
      const response = { ...product };
      
      // Get temp images
      const [tempImages] = await db.query(
        'SELECT image_path FROM pending_images WHERE image_path LIKE ? AND status = ?',
        [`/temp_images/products/${product.vendor_id}-${product.id}-%`, 'pending']
      );
      
      // Get permanent images
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
 * Get single product with Etsy data
 * 
 * @param {number} productId - Product ID
 * @param {number} userId - User ID
 * @returns {Promise<object|null>} Product object or null
 */
async function getProduct(productId, userId) {
  const [rows] = await db.execute(`
    SELECT 
      p.*,
      epd.id as etsy_data_id,
      epd.shop_id as etsy_shop_id,
      epd.etsy_listing_id,
      epd.etsy_title,
      epd.etsy_description,
      epd.etsy_price,
      epd.etsy_quantity,
      epd.etsy_sku,
      epd.etsy_tags,
      epd.etsy_materials,
      epd.etsy_category_id,
      epd.etsy_taxonomy_id,
      epd.etsy_images,
      epd.etsy_shipping_profile_id,
      epd.is_active as etsy_active,
      epd.listing_state,
      epd.sync_status,
      epd.last_sync_at,
      epd.last_sync_error,
      eia.allocated_quantity,
      eia.shop_id as allocation_shop_id
    FROM products p
    LEFT JOIN etsy_product_data epd ON p.id = epd.product_id AND epd.user_id = ?
    LEFT JOIN etsy_inventory_allocations eia ON p.id = eia.product_id AND eia.user_id = ?
    WHERE p.id = ? AND p.vendor_id = ?
  `, [userId, userId, productId, userId]);
  
  if (rows.length === 0) {
    return null;
  }
  
  const product = rows[0];
  
  // Get images
  const [tempImages] = await db.query(
    'SELECT image_path FROM pending_images WHERE image_path LIKE ? AND status = ?',
    [`/temp_images/products/${product.vendor_id}-${product.id}-%`, 'pending']
  );
  
  const [permanentImages] = await db.query(
    'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY \`order\` ASC',
    [product.id]
  );
  
  product.images = [
    ...permanentImages.map(img => img.image_url),
    ...tempImages.map(img => img.image_path)
  ];
  
  return product;
}

/**
 * Save Etsy product data and optional inventory allocation
 * Creates or updates Etsy listing configuration
 * 
 * @param {number} productId - Product ID
 * @param {number} userId - User ID
 * @param {object} body - Request body with Etsy listing data
 * @returns {Promise<object>} Result object
 */
async function saveProduct(productId, userId, body) {
  // Verify product ownership
  const [productCheck] = await db.execute(
    'SELECT id, name, price FROM products WHERE id = ? AND vendor_id = ?',
    [productId, userId]
  );
  
  if (productCheck.length === 0) {
    return { found: false };
  }
  
  const product = productCheck[0];
  
  const {
    shop_id,
    etsy_title,
    etsy_description,
    etsy_price,
    etsy_quantity,
    etsy_sku,
    etsy_tags,
    etsy_materials,
    etsy_category_id,
    etsy_taxonomy_id,
    etsy_images,
    etsy_shipping_profile_id,
    is_active,
    allocated_quantity
  } = body;
  
  // Validate shop connection
  if (shop_id) {
    const [shopCheck] = await db.execute(
      'SELECT id FROM etsy_user_shops WHERE shop_id = ? AND user_id = ?',
      [shop_id, userId]
    );
    
    if (shopCheck.length === 0) {
      return { found: true, error: 'Shop not found or not connected' };
    }
  }
  
  // Handle JSON fields
  const tagsJson = etsy_tags ? 
    (typeof etsy_tags === 'string' ? etsy_tags : JSON.stringify(etsy_tags)) : null;
  const materialsJson = etsy_materials ? 
    (typeof etsy_materials === 'string' ? etsy_materials : JSON.stringify(etsy_materials)) : null;
  const imagesJson = etsy_images ? 
    (typeof etsy_images === 'string' ? etsy_images : JSON.stringify(etsy_images)) : null;
  
  // Insert or update Etsy product data
  await db.execute(`
    INSERT INTO etsy_product_data (
      user_id, product_id, shop_id,
      etsy_title, etsy_description, etsy_price, etsy_quantity, etsy_sku,
      etsy_tags, etsy_materials, etsy_category_id, etsy_taxonomy_id,
      etsy_images, etsy_shipping_profile_id,
      is_active, listing_state, sync_status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'pending')
    ON DUPLICATE KEY UPDATE
      shop_id = VALUES(shop_id),
      etsy_title = VALUES(etsy_title),
      etsy_description = VALUES(etsy_description),
      etsy_price = VALUES(etsy_price),
      etsy_quantity = VALUES(etsy_quantity),
      etsy_sku = VALUES(etsy_sku),
      etsy_tags = VALUES(etsy_tags),
      etsy_materials = VALUES(etsy_materials),
      etsy_category_id = VALUES(etsy_category_id),
      etsy_taxonomy_id = VALUES(etsy_taxonomy_id),
      etsy_images = VALUES(etsy_images),
      etsy_shipping_profile_id = VALUES(etsy_shipping_profile_id),
      is_active = VALUES(is_active),
      sync_status = 'pending',
      updated_at = CURRENT_TIMESTAMP
  `, [
    userId, productId, shop_id,
    etsy_title || product.name,
    etsy_description,
    etsy_price || product.price,
    etsy_quantity,
    etsy_sku,
    tagsJson,
    materialsJson,
    etsy_category_id,
    etsy_taxonomy_id,
    imagesJson,
    etsy_shipping_profile_id,
    is_active !== undefined ? (is_active ? 1 : 0) : 1
  ]);
  
  // Handle inventory allocation if provided
  if (allocated_quantity !== undefined && shop_id) {
    await db.execute(`
      INSERT INTO etsy_inventory_allocations (
        user_id, product_id, shop_id, allocated_quantity
      ) VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        allocated_quantity = VALUES(allocated_quantity),
        updated_at = CURRENT_TIMESTAMP
    `, [userId, productId, shop_id, allocated_quantity]);
  }
  
  // Log the save operation
  await db.execute(`
    INSERT INTO etsy_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'save', ?, 'success', 'Product data saved for Etsy listing')
  `, [userId, productId]);
  
  return { found: true, message: 'Product saved successfully' };
}

/**
 * Update Etsy inventory allocation
 * 
 * @param {number} productId - Product ID
 * @param {number} userId - User ID
 * @param {number} quantity - Allocated quantity
 * @param {string} shopId - Etsy shop ID
 * @returns {Promise<object>} Result object
 */
async function updateInventory(productId, userId, quantity, shopId) {
  // Verify product ownership
  const [productCheck] = await db.execute(
    'SELECT id, inventory_count FROM products WHERE id = ? AND vendor_id = ?',
    [productId, userId]
  );
  
  if (productCheck.length === 0) {
    return { found: false };
  }
  
  const product = productCheck[0];
  
  // Verify shop connection
  const [shopCheck] = await db.execute(
    'SELECT id, shop_id FROM etsy_user_shops WHERE shop_id = ? AND user_id = ?',
    [shopId, userId]
  );
  
  if (shopCheck.length === 0) {
    return { found: true, error: 'Shop not found or not connected' };
  }
  
  // Check if quantity is available
  if (quantity > product.inventory_count) {
    return { 
      found: true, 
      error: `Insufficient inventory. Available: ${product.inventory_count}` 
    };
  }
  
  // Update allocation
  await db.execute(`
    INSERT INTO etsy_inventory_allocations (
      user_id, product_id, shop_id, allocated_quantity
    ) VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      allocated_quantity = VALUES(allocated_quantity),
      updated_at = CURRENT_TIMESTAMP
  `, [userId, productId, shopId, quantity]);
  
  // Try to sync to Etsy if listing exists
  try {
    const [etsyData] = await db.execute(
      'SELECT etsy_listing_id FROM etsy_product_data WHERE product_id = ? AND user_id = ? AND shop_id = ?',
      [productId, userId, shopId]
    );
    
    if (etsyData.length > 0 && etsyData[0].etsy_listing_id) {
      const accessToken = await etsyApiService.getShopAccessToken(shopId, userId);
      
      // Update inventory on Etsy
      await etsyApiService.updateListingInventory(
        etsyData[0].etsy_listing_id,
        {
          products: [{
            quantity: quantity
          }]
        },
        accessToken
      );
      
      // Update sync status
      await db.execute(`
        UPDATE etsy_product_data 
        SET sync_status = 'synced', 
            last_sync_at = NOW(),
            etsy_quantity = ?
        WHERE product_id = ? AND user_id = ?
      `, [quantity, productId, userId]);
      
      console.log('Etsy inventory synced:', { productId, quantity, shopId });
    }
  } catch (error) {
    console.error('Failed to sync inventory to Etsy:', error.message);
    // Don't fail the allocation if Etsy sync fails
  }
  
  return { found: true, message: 'Inventory allocation updated' };
}

/**
 * Handle OAuth callback
 * Exchange code for tokens and save shop connection
 * 
 * @param {string} authCode - Authorization code
 * @param {string} state - State parameter
 * @returns {Promise<object>} Result object
 */
async function handleOAuthCallback(authCode, state) {
  try {
    // Retrieve userId from state
    const userIdStr = etsyApiService.retrievePKCE(`${state}_userId`);
    if (!userIdStr) {
      throw new Error('User ID not found in OAuth state');
    }
    const userId = parseInt(userIdStr);
    
    // Exchange code for tokens
    const tokens = await etsyApiService.getAccessToken(authCode, state);
    
    // Get shop information
    const shopsData = await etsyApiService.getUserShops(tokens.access_token);
    
    if (!shopsData.results || shopsData.results.length === 0) {
      throw new Error('No shops found for this Etsy account');
    }
    
    // Save each shop (Etsy allows multiple shops per account)
    for (const shop of shopsData.results) {
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
      
      await db.execute(`
        INSERT INTO etsy_user_shops (
          user_id, shop_id, shop_name, shop_url,
          access_token, refresh_token, token_expires_at,
          is_active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())
        ON DUPLICATE KEY UPDATE
          shop_name = VALUES(shop_name),
          shop_url = VALUES(shop_url),
          access_token = VALUES(access_token),
          refresh_token = VALUES(refresh_token),
          token_expires_at = VALUES(token_expires_at),
          is_active = 1,
          updated_at = CURRENT_TIMESTAMP
      `, [
        userId,
        shop.shop_id.toString(),
        shop.shop_name,
        shop.url,
        encrypt(tokens.access_token),
        encrypt(tokens.refresh_token),
        expiresAt
      ]);
      
      console.log('Etsy shop connected:', { userId, shopId: shop.shop_id, shopName: shop.shop_name });
    }
    
    // Log OAuth connection
    await db.execute(`
      INSERT INTO etsy_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (?, 'oauth', 'connect', 'success', 'Successfully connected Etsy shop(s)')
    `, [userId]);
    
    return {
      success: true,
      message: `Connected ${shopsData.results.length} Etsy shop(s)`,
      shops: shopsData.results.map(s => ({
        shop_id: s.shop_id,
        shop_name: s.shop_name,
        url: s.url
      }))
    };
  } catch (error) {
    console.error('OAuth callback error:', error.message);
    throw error;
  }
}

/**
 * Initiate OAuth authorization
 * Generate authorization URL with PKCE
 * 
 * @param {number} userId - User ID
 * @returns {string} Authorization URL
 */
function oauthAuthorize(userId) {
  const { authUrl } = etsyApiService.getAuthorizationUrl(userId);
  return authUrl;
}

/**
 * Get sync logs for user
 * 
 * @param {number} userId - User ID
 * @param {number} limit - Number of logs to return
 * @returns {Promise<Array>} Array of log entries
 */
async function getSyncLogs(userId, limit = 50) {
  const [logs] = await db.query(`
    SELECT * FROM etsy_sync_logs
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ?
  `, [userId, parseInt(limit)]);
  
  return logs;
}

/**
 * Test Etsy API connection
 * 
 * @returns {Promise<object>} Connection test result
 */
async function testConnection() {
  return await etsyApiService.testConnection();
}

module.exports = {
  getShops,
  listProducts,
  getProduct,
  saveProduct,
  updateInventory,
  handleOAuthCallback,
  oauthAuthorize,
  getSyncLogs,
  testConnection
};
