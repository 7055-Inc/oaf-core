/**
 * Meta Connector Service (v2)
 * Business logic for the Meta/Facebook catalog addon.
 * Hybrid connector: OAuth (user connects own account) + Corporate (Brakebee account).
 *
 * Pattern: Routes -> Business Logic (this file) -> External API Service (metaService.js)
 */

const db = require('../../../../config/db');
const metaApiService = require('../../../services/metaService');
const { encrypt, decrypt } = require('../../../utils/encryption');
const { validateConnectorEnv } = require('../../../utils/connectorEnv');

validateConnectorEnv('meta');

// ──────────────────────────────────────────────
// OAUTH (Facebook Login)
// ──────────────────────────────────────────────

function oauthAuthorize(userId) {
  try {
    const redirectUrl = metaApiService.getAuthorizationUrl(userId);
    return { success: true, redirect_url: redirectUrl };
  } catch (error) {
    console.error('Meta OAuth authorize error:', error);
    return { success: false, message: error.message, status: 'error' };
  }
}

async function handleOAuthCallback(code, state) {
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const userId = stateData.userId;

    const shortLivedTokenData = await metaApiService.exchangeCodeForToken(code);
    const longLivedTokenData = await metaApiService.exchangeForLongLivedToken(shortLivedTokenData.access_token);

    const expiresAt = new Date(Date.now() + (longLivedTokenData.expires_in || 5184000) * 1000);

    let userName = 'Meta Account';
    let metaUserId = null;
    try {
      const user = await metaApiService.getUserInfo(longLivedTokenData.access_token);
      userName = user.name || userName;
      metaUserId = user.id || null;
    } catch (_) { /* non-critical */ }

    const shopId = metaUserId || `meta-${userId}-${Date.now()}`;

    await db.execute(`
      INSERT INTO meta_user_shops
        (user_id, shop_id, meta_user_id, shop_name,
         access_token, token_expires_at, is_active, terms_accepted)
      VALUES (?, ?, ?, ?, ?, ?, 1, 1)
      ON DUPLICATE KEY UPDATE
        shop_name        = VALUES(shop_name),
        meta_user_id     = VALUES(meta_user_id),
        access_token     = VALUES(access_token),
        token_expires_at = VALUES(token_expires_at),
        is_active        = 1,
        updated_at       = CURRENT_TIMESTAMP
    `, [
      userId, shopId, metaUserId, userName,
      encrypt(longLivedTokenData.access_token),
      expiresAt
    ]);

    await db.execute(`
      INSERT INTO meta_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (?, 'shop', 'push', 'success', 'Meta account connected')
    `, [userId]);

    return { success: true, shop_id: shopId, shop_name: userName };
  } catch (error) {
    console.error('Meta OAuth callback error:', error);
    throw error;
  }
}

// ──────────────────────────────────────────────
// SHOPS
// ──────────────────────────────────────────────

async function getShops(userId) {
  const [shops] = await db.execute(`
    SELECT id, shop_id, meta_user_id, shop_name, catalog_id, is_active, terms_accepted,
           last_sync_at, created_at,
           CASE WHEN access_token IS NOT NULL THEN true ELSE false END as has_token
    FROM meta_user_shops WHERE user_id = ? ORDER BY created_at DESC
  `, [userId]);
  return shops;
}

async function disconnectShop(shopId, userId) {
  await db.execute(
    'UPDATE meta_user_shops SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE shop_id = ? AND user_id = ?',
    [shopId, userId]
  );
  return { success: true };
}

// ──────────────────────────────────────────────
// PRODUCTS (OAuth / personal)
// ──────────────────────────────────────────────

async function listProducts(userId) {
  const [products] = await db.execute(`
    SELECT
      p.*,
      mpd.id as meta_data_id,
      mpd.meta_title, mpd.meta_description, mpd.meta_price,
      mpd.meta_product_id, mpd.meta_category,
      mpd.is_active as meta_active, mpd.sync_status, mpd.last_sync_at,
      mia.allocated_quantity,
      CASE WHEN mpd.id IS NOT NULL THEN 'configured' ELSE 'unconfigured' END as meta_status
    FROM products p
    LEFT JOIN meta_product_data mpd ON p.id = mpd.product_id AND mpd.user_id = ?
    LEFT JOIN meta_inventory_allocations mia ON p.id = mia.product_id AND mia.user_id = ?
    WHERE p.vendor_id = ?
    ORDER BY p.created_at DESC
  `, [userId, userId, userId]);

  const processed = await Promise.all(products.map(async (product) => {
    const resp = { ...product };
    const [perm] = await db.query(
      'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC',
      [product.id]
    );
    resp.images = perm.map(i => i.image_url);
    return resp;
  }));
  return processed;
}

async function saveProduct(productId, userId, body) {
  const {
    meta_title, meta_description, meta_price,
    meta_category, meta_product_url,
    allocated_quantity, is_active
  } = body;

  const [check] = await db.execute(
    'SELECT id, name, price, sku FROM products WHERE id = ? AND vendor_id = ?',
    [productId, userId]
  );
  if (check.length === 0) return { found: false };
  const product = check[0];

  await db.execute(`
    INSERT INTO meta_product_data
      (user_id, product_id, meta_title, meta_description, meta_price,
       meta_category, meta_product_url, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      meta_title       = VALUES(meta_title),
      meta_description = VALUES(meta_description),
      meta_price       = VALUES(meta_price),
      meta_category    = VALUES(meta_category),
      meta_product_url = VALUES(meta_product_url),
      is_active        = VALUES(is_active),
      sync_status      = 'pending',
      updated_at       = CURRENT_TIMESTAMP
  `, [
    userId, productId,
    meta_title || product.name,
    meta_description,
    meta_price || product.price,
    meta_category || null,
    meta_product_url || null,
    is_active !== undefined ? (is_active ? 1 : 0) : 1
  ]);

  if (allocated_quantity !== undefined && allocated_quantity !== '') {
    const qty = parseInt(allocated_quantity) || 0;
    if (qty > 0) {
      await db.execute(`
        INSERT INTO meta_inventory_allocations (user_id, product_id, allocated_quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP
      `, [userId, productId, qty]);
    } else {
      await db.execute('DELETE FROM meta_inventory_allocations WHERE user_id = ? AND product_id = ?', [userId, productId]);
    }
  }

  await db.execute(`
    INSERT INTO meta_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'save', ?, 'success', 'Product data saved for Meta')
  `, [userId, productId]);

  return { found: true };
}

// ──────────────────────────────────────────────
// INVENTORY
// ──────────────────────────────────────────────

async function getInventory(userId) {
  const [allocations] = await db.execute(`
    SELECT mia.*, p.name as title, COALESCE(pi.qty_available, 0) as total_inventory
    FROM meta_inventory_allocations mia
    JOIN products p ON mia.product_id = p.id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE mia.user_id = ?
    ORDER BY mia.updated_at DESC
  `, [userId]);
  return allocations;
}

async function updateInventoryAllocation(productId, userId, allocated_quantity) {
  const [check] = await db.execute(
    `SELECT p.id, COALESCE(pi.qty_available, 0) as inventory_count
     FROM products p LEFT JOIN product_inventory pi ON p.id = pi.product_id
     WHERE p.id = ? AND p.vendor_id = ?`,
    [productId, userId]
  );
  if (check.length === 0) return { found: false };
  if (allocated_quantity > check[0].inventory_count) throw new Error('Cannot allocate more than total inventory');

  await db.execute(`
    INSERT INTO meta_inventory_allocations (user_id, product_id, allocated_quantity)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP
  `, [userId, productId, allocated_quantity]);
  return { found: true };
}

async function bulkAllocations(userId, allocations) {
  if (!Array.isArray(allocations) || allocations.length === 0) throw new Error('allocations must be a non-empty array');
  const ids = allocations.map(a => a.product_id);
  const ph = ids.map(() => '?').join(',');
  const [found] = await db.execute(`SELECT id FROM products WHERE id IN (${ph}) AND vendor_id = ?`, [...ids, userId]);
  if (found.length !== ids.length) throw new Error('Some products not found or not owned by user');

  let ok = 0;
  const errors = [];
  for (const a of allocations) {
    try {
      const qty = parseInt(a.allocated_quantity) || 0;
      if (qty > 0) {
        await db.execute(`INSERT INTO meta_inventory_allocations (user_id, product_id, allocated_quantity) VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP`, [userId, a.product_id, qty]);
      } else {
        await db.execute('DELETE FROM meta_inventory_allocations WHERE user_id = ? AND product_id = ?', [userId, a.product_id]);
      }
      ok++;
    } catch (err) { errors.push({ product_id: a.product_id, error: err.message }); }
  }
  return { successful: ok, failed: allocations.length - ok, errors };
}

// ──────────────────────────────────────────────
// SYNC LOGS
// ──────────────────────────────────────────────

async function getLogs(userId, options = {}) {
  const { limit = 50, sync_type, status } = options;
  let query = 'SELECT * FROM meta_sync_logs WHERE user_id = ?';
  const params = [userId];
  if (sync_type) { query += ' AND sync_type = ?'; params.push(sync_type); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  const [logs] = await db.execute(query, params);
  return logs;
}

// ──────────────────────────────────────────────
// SYNC ACTIONS
// ──────────────────────────────────────────────

async function syncProductToMeta(productId, userId, shopId) {
  try {
    const accessToken = await metaApiService.getShopAccessToken(shopId, userId);

    const [shops] = await db.execute('SELECT catalog_id FROM meta_user_shops WHERE shop_id = ? AND user_id = ?', [shopId, userId]);
    const catalogId = shops[0]?.catalog_id;
    if (!catalogId) throw new Error('No catalog linked to this Meta account. Please set up a catalog in Commerce Manager.');

    const [products] = await db.execute(`
      SELECT p.*, mpd.meta_title, mpd.meta_description, mpd.meta_price,
             mpd.meta_product_id, mpd.meta_category, mpd.meta_product_url,
             mia.allocated_quantity
      FROM products p
      LEFT JOIN meta_product_data mpd ON p.id = mpd.product_id AND mpd.user_id = ?
      LEFT JOIN meta_inventory_allocations mia ON p.id = mia.product_id AND mia.user_id = ?
      WHERE p.id = ? AND p.vendor_id = ?
    `, [userId, userId, productId, userId]);
    if (products.length === 0) throw new Error('Product not found');

    const product = products[0];
    const [images] = await db.execute('SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC', [productId]);

    const payload = {
      retailer_id: `BRK-${product.sku || productId}`,
      name: product.meta_title || product.name,
      description: product.meta_description || product.description || '',
      price: `${parseFloat(product.meta_price || product.price).toFixed(2)} USD`,
      availability: (product.allocated_quantity || 0) > 0 ? 'in stock' : 'out of stock',
      image_url: images[0]?.image_url || '',
      url: product.meta_product_url || `${process.env.FRONTEND_URL}/product/${product.slug || productId}`,
      category: product.meta_category || 'Other'
    };

    let result;
    if (product.meta_product_id) {
      result = await metaApiService.updateProduct(accessToken, product.meta_product_id, payload);
    } else {
      result = await metaApiService.createProduct(accessToken, catalogId, payload);
      if (result && result.id) {
        await db.execute('UPDATE meta_product_data SET meta_product_id = ? WHERE product_id = ? AND user_id = ?',
          [result.id, productId, userId]);
      }
    }

    await db.execute(`UPDATE meta_product_data SET sync_status = 'synced', last_sync_at = NOW(), last_sync_error = NULL WHERE product_id = ? AND user_id = ?`,
      [productId, userId]);
    await db.execute(`INSERT INTO meta_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (?, 'product', 'push', ?, 'success', 'Product synced to Meta')`, [userId, productId]);
    return { success: true };
  } catch (error) {
    await db.execute(`INSERT INTO meta_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (?, 'product', 'push', ?, 'error', ?)`, [userId, productId, error.message]);
    throw error;
  }
}

async function syncOrdersFromMeta(userId, shopId) {
  try {
    const accessToken = await metaApiService.getShopAccessToken(shopId, userId);
    const [shops] = await db.execute('SELECT meta_user_id FROM meta_user_shops WHERE shop_id = ? AND user_id = ?', [shopId, userId]);
    const commerceAccountId = shops[0]?.meta_user_id;
    if (!commerceAccountId) throw new Error('No commerce account ID found');

    const ordersData = await metaApiService.getOrders(accessToken, commerceAccountId);
    const orders = ordersData.data || [];

    let syncCount = 0;
    for (const order of orders) {
      const metaOrderId = order.id;
      const [existing] = await db.execute('SELECT id FROM meta_orders WHERE meta_order_id = ?', [metaOrderId]);
      if (existing.length === 0) {
        const shipping = order.shipping_address || {};
        await db.execute(`
          INSERT INTO meta_orders (user_id, shop_id, meta_order_id, order_status, customer_name,
            shipping_address1, shipping_city, shipping_state, shipping_zip, shipping_country,
            total_amount, currency, order_data, meta_created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId, shopId, metaOrderId, order.order_status || 'CREATED',
          shipping.name || null, shipping.street1 || null, shipping.city || null,
          shipping.state || null, shipping.postal_code || null, shipping.country || 'US',
          0, 'USD', JSON.stringify(order), order.created || null
        ]);

        const [insertedOrder] = await db.execute('SELECT id FROM meta_orders WHERE meta_order_id = ? LIMIT 1', [metaOrderId]);
        if (insertedOrder.length > 0) {
          for (const item of (order.items?.data || [])) {
            await db.execute(`
              INSERT INTO meta_order_items (meta_order_id, meta_item_id, product_name, quantity, unit_price, line_total)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [insertedOrder[0].id, item.id || null, item.product_name || 'Unknown',
                item.quantity || 1, parseFloat(item.price_per_unit?.amount) || 0,
                (parseFloat(item.price_per_unit?.amount) || 0) * (item.quantity || 1)]);
          }
        }
        syncCount++;
      } else {
        await db.execute('UPDATE meta_orders SET order_status = ?, order_data = ?, updated_at = CURRENT_TIMESTAMP WHERE meta_order_id = ?',
          [order.order_status || 'CREATED', JSON.stringify(order), metaOrderId]);
      }
    }

    await db.execute(`INSERT INTO meta_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (?, 'orders', 'pull', 'success', ?)`, [userId, `Synced ${syncCount} new orders`]);
    return { success: true, synced: syncCount, total: orders.length };
  } catch (error) {
    await db.execute(`INSERT INTO meta_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (?, 'orders', 'pull', 'error', ?)`, [userId, error.message]);
    throw error;
  }
}

async function testConnection() {
  return await metaApiService.testConnection();
}

// ──────────────────────────────────────────────
// ADMIN (OAuth products)
// ──────────────────────────────────────────────

async function adminListProducts(options = {}) {
  const { status = 'all', page = 1, limit = 25, search = '' } = options;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let statusFilter = '';
  if (status === 'pending') statusFilter = "AND mpd.is_active = 1 AND (mpd.sync_status = 'pending' OR mpd.sync_status IS NULL)";
  else if (status === 'active') statusFilter = 'AND mpd.is_active = 1';
  else if (status === 'paused') statusFilter = 'AND mpd.is_active = 0';

  let searchFilter = '';
  const searchParams = [];
  if (search) {
    searchFilter = 'AND (p.name LIKE ? OR u.username LIKE ? OR mpd.meta_title LIKE ?)';
    searchParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const [countResult] = await db.query(
    `SELECT COUNT(*) as total FROM meta_product_data mpd
     JOIN products p ON mpd.product_id = p.id JOIN users u ON mpd.user_id = u.id
     WHERE 1=1 ${statusFilter} ${searchFilter}`, searchParams
  );
  const [rows] = await db.query(`
    SELECT mpd.id as meta_data_id, mpd.product_id, mpd.user_id, mpd.meta_title,
           mpd.meta_description, mpd.meta_price, mpd.is_active, mpd.sync_status, mpd.created_at,
           p.name, p.price, COALESCE(pi.qty_available, 0) as inventory_count,
           u.username, COALESCE(up.display_name, u.username) as vendor_name,
           mia.allocated_quantity
    FROM meta_product_data mpd
    JOIN products p ON mpd.product_id = p.id JOIN users u ON mpd.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    LEFT JOIN meta_inventory_allocations mia ON mpd.product_id = mia.product_id AND mpd.user_id = mia.user_id
    WHERE 1=1 ${statusFilter} ${searchFilter}
    ORDER BY mpd.created_at DESC LIMIT ? OFFSET ?
  `, [...searchParams, parseInt(limit), offset]);

  const products = rows.map(row => ({
    ...row,
    listing_status: row.is_active ? (row.sync_status === 'pending' || !row.sync_status ? 'pending' : 'listed') : 'paused'
  }));
  return { products, total: countResult[0].total };
}

async function adminActivate(productId) {
  await db.query("UPDATE meta_product_data SET is_active = 1, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?", [productId]);
  return true;
}

async function adminPause(productId) {
  await db.query("UPDATE meta_product_data SET is_active = 0, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?", [productId]);
  return true;
}

async function adminUpdateProduct(productId, body) {
  const { meta_title, meta_description, meta_price } = body;
  await db.query(`UPDATE meta_product_data SET meta_title = COALESCE(?, meta_title), meta_description = COALESCE(?, meta_description),
    meta_price = COALESCE(?, meta_price), sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
    [meta_title, meta_description, meta_price, productId]);
  return true;
}

// ──────────────────────────────────────────────
// CORPORATE CATALOG (Brakebee Meta account)
// ──────────────────────────────────────────────

const toNullIfEmpty = (val) => (val === '' || val === undefined) ? null : val;
const toDecimalOrNull = (val) => {
  if (val === '' || val === undefined || val === null) return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
};

function calculateCorporatePrice(product) {
  if (product.wholesale_price && parseFloat(product.wholesale_price) > 0) {
    return (parseFloat(product.wholesale_price) * 2).toFixed(2);
  }
  return (parseFloat(product.price) * 1.2).toFixed(2);
}

async function saveCorporateProduct(productId, userId, body) {
  const [check] = await db.execute(
    'SELECT id, name, price, wholesale_price FROM products WHERE id = ? AND vendor_id = ?',
    [productId, userId]
  );
  if (check.length === 0) return { found: false };
  const product = check[0];

  const {
    corporate_title, corporate_description, corporate_short_description,
    corporate_key_features, corporate_main_image_url, corporate_additional_images,
    corporate_category, corporate_brand, corporate_price, terms_accepted, is_active
  } = body;

  const finalPrice = corporate_price || calculateCorporatePrice(product);
  const keyFeaturesJson = corporate_key_features ?
    (typeof corporate_key_features === 'string' ? corporate_key_features : JSON.stringify(corporate_key_features)) : null;
  const additionalImagesJson = corporate_additional_images ?
    (typeof corporate_additional_images === 'string' ? corporate_additional_images : JSON.stringify(corporate_additional_images)) : null;

  await db.execute(`
    INSERT INTO meta_corporate_products (
      product_id, user_id, corporate_title, corporate_description, corporate_short_description,
      corporate_price, corporate_key_features, corporate_main_image_url, corporate_additional_images,
      corporate_category, corporate_brand,
      is_active, listing_status, sync_status, terms_accepted_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ${terms_accepted ? 'NOW()' : 'NULL'}, ?)
    ON DUPLICATE KEY UPDATE
      corporate_title = VALUES(corporate_title),
      corporate_description = VALUES(corporate_description),
      corporate_short_description = VALUES(corporate_short_description),
      corporate_price = VALUES(corporate_price),
      corporate_key_features = VALUES(corporate_key_features),
      corporate_main_image_url = VALUES(corporate_main_image_url),
      corporate_additional_images = VALUES(corporate_additional_images),
      corporate_category = VALUES(corporate_category),
      corporate_brand = VALUES(corporate_brand),
      is_active = VALUES(is_active),
      listing_status = CASE
        WHEN VALUES(is_active) = 0 AND listing_status = 'listed' THEN 'listed'
        WHEN VALUES(is_active) = 1 THEN 'pending'
        ELSE listing_status
      END,
      sync_status = 'pending',
      updated_at = CURRENT_TIMESTAMP
  `, [
    productId, userId,
    toNullIfEmpty(corporate_title) || product.name,
    toNullIfEmpty(corporate_description), toNullIfEmpty(corporate_short_description),
    toDecimalOrNull(finalPrice), keyFeaturesJson,
    toNullIfEmpty(corporate_main_image_url), additionalImagesJson,
    toNullIfEmpty(corporate_category), toNullIfEmpty(corporate_brand),
    is_active !== undefined ? (is_active ? 1 : 0) : 1,
    userId
  ]);
  return { found: true };
}

async function getCorporateProduct(productId, userId) {
  const [rows] = await db.execute(`
    SELECT mcp.*, p.name, p.price, p.wholesale_price, COALESCE(pi.qty_available, 0) as inventory_count, p.description,
           COALESCE(up.display_name, u.username) as vendor_name
    FROM meta_corporate_products mcp
    JOIN products p ON mcp.product_id = p.id JOIN users u ON mcp.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE mcp.product_id = ? AND mcp.user_id = ?
  `, [productId, userId]);
  return rows[0] || null;
}

async function listCorporateProducts(userId) {
  const [products] = await db.execute(`
    SELECT p.*, mcp.id as corporate_id, mcp.corporate_title, mcp.corporate_description,
           mcp.corporate_price, mcp.corporate_brand, mcp.corporate_category,
           mcp.is_active as corporate_active, mcp.listing_status, mcp.sync_status,
           mcp.rejection_reason, mcp.cooldown_ends_at,
           COALESCE(pi.qty_available, 0) as inventory_count,
           CASE WHEN mcp.id IS NOT NULL THEN 'submitted' ELSE 'not_submitted' END as corporate_status
    FROM products p
    LEFT JOIN meta_corporate_products mcp ON p.id = mcp.product_id AND mcp.user_id = ?
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE p.vendor_id = ? AND p.status = 'active'
    ORDER BY mcp.created_at DESC, p.created_at DESC
  `, [userId, userId]);
  return products;
}

async function removeCorporateProduct(productId, userId) {
  const [check] = await db.execute('SELECT id FROM products WHERE id = ? AND vendor_id = ?', [productId, userId]);
  if (check.length === 0) return { found: false };
  const cooldownEnd = new Date();
  cooldownEnd.setDate(cooldownEnd.getDate() + 60);
  await db.execute(`UPDATE meta_corporate_products SET is_active = 0, listing_status = 'removing', removed_at = NOW(),
    cooldown_ends_at = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ? AND user_id = ?`, [cooldownEnd, productId, userId]);
  return { found: true, cooldown_ends_at: cooldownEnd };
}

async function adminListCorporateProducts(options = {}) {
  const { status = 'all', page = 1, limit = 25, search = '' } = options;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let statusFilter = '';
  if (status === 'pending') statusFilter = "AND mcp.listing_status = 'pending'";
  else if (status === 'active') statusFilter = "AND mcp.listing_status = 'listed'";
  else if (status === 'paused') statusFilter = "AND mcp.listing_status = 'paused'";
  else if (status === 'rejected') statusFilter = "AND mcp.listing_status = 'rejected'";
  let searchFilter = '';
  const searchParams = [];
  if (search) {
    searchFilter = "AND (p.name LIKE ? OR u.username LIKE ? OR mcp.corporate_title LIKE ?)";
    searchParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const [countResult] = await db.query(
    `SELECT COUNT(*) as total FROM meta_corporate_products mcp
     JOIN products p ON mcp.product_id = p.id JOIN users u ON mcp.user_id = u.id
     WHERE 1=1 ${statusFilter} ${searchFilter}`, searchParams
  );
  const [products] = await db.query(`
    SELECT mcp.*, p.name, p.price, p.wholesale_price, COALESCE(pi.qty_available, 0) as inventory_count,
           u.username, COALESCE(up.display_name, u.username) as vendor_name
    FROM meta_corporate_products mcp
    JOIN products p ON mcp.product_id = p.id JOIN users u ON mcp.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE 1=1 ${statusFilter} ${searchFilter}
    ORDER BY mcp.created_at DESC LIMIT ? OFFSET ?
  `, [...searchParams, parseInt(limit), offset]);
  return { products, total: countResult[0].total };
}

async function adminActivateCorporate(productId, userId) {
  await db.execute(`UPDATE meta_corporate_products SET listing_status = 'listed', is_active = 1, sync_status = 'pending',
    rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`, [productId]);
  await db.execute(`INSERT INTO meta_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'update', ?, 'success', 'Admin activated corporate product')`, [userId, productId]);
  return true;
}

async function adminPauseCorporate(productId, userId) {
  await db.execute(`UPDATE meta_corporate_products SET listing_status = 'paused', sync_status = 'pending',
    updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`, [productId]);
  await db.execute(`INSERT INTO meta_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'update', ?, 'success', 'Admin paused corporate product')`, [userId, productId]);
  return true;
}

async function adminRejectCorporate(productId, userId, reason) {
  await db.execute(`UPDATE meta_corporate_products SET listing_status = 'rejected', rejection_reason = ?, sync_status = 'pending',
    updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`, [reason || 'Product does not meet quality standards', productId]);
  await db.execute(`INSERT INTO meta_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'delete', ?, 'success', ?)`, [userId, productId, `Admin rejected: ${reason}`]);
  return true;
}

async function adminUpdateCorporateProduct(productId, body) {
  const { corporate_title, corporate_description, corporate_price } = body;
  await db.execute(`UPDATE meta_corporate_products SET corporate_title = COALESCE(?, corporate_title),
    corporate_description = COALESCE(?, corporate_description), corporate_price = COALESCE(?, corporate_price),
    sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
    [corporate_title, corporate_description, corporate_price, productId]);
  return true;
}

module.exports = {
  oauthAuthorize, handleOAuthCallback, getShops, disconnectShop,
  listProducts, saveProduct, getInventory, updateInventoryAllocation, bulkAllocations, getLogs,
  syncProductToMeta, syncOrdersFromMeta, testConnection,
  adminListProducts, adminActivate, adminPause, adminUpdateProduct,
  saveCorporateProduct, getCorporateProduct, listCorporateProducts, removeCorporateProduct,
  adminListCorporateProducts, adminActivateCorporate, adminPauseCorporate, adminRejectCorporate, adminUpdateCorporateProduct
};
