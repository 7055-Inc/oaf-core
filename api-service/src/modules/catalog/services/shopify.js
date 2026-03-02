/**
 * Shopify Connector Service (v2)
 * Business logic for Shopify catalog addon.
 * OAuth-only connector – users connect their own Shopify stores.
 *
 * Pattern: Routes → Business Logic (this file) → External API Service (shopifyService.js)
 */

const crypto = require('crypto');
const db = require('../../../../config/db');
const shopifyApiService = require('../../../services/shopifyService');
const { encrypt, decrypt } = require('../../../utils/encryption');
const { validateConnectorEnv } = require('../../../utils/connectorEnv');
const { createAccessToken } = require('../../auth/services/jwt');
const { getUserWithRolesAndPermissions } = require('../../auth/services/user');

validateConnectorEnv('shopify');

// ──────────────────────────────────────────────
// OAUTH
// ──────────────────────────────────────────────

function oauthAuthorize(userId, shopDomain, from) {
  try {
    if (!shopDomain) return { success: false, message: 'shop domain is required', status: 'error' };
    const redirectUrl = shopifyApiService.getAuthorizationUrl(shopDomain, userId, from);
    return { success: true, redirect_url: redirectUrl };
  } catch (error) {
    console.error('Shopify OAuth authorize error:', error);
    return { success: false, message: error.message, status: 'error' };
  }
}

async function handleOAuthCallback(code, shop, state, query) {
  try {
    if (!shopifyApiService.verifyHmac(query)) {
      throw new Error('HMAC verification failed – possible tampering');
    }

    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const userId = stateData.userId;
    const shopDomain = shopifyApiService.normalizeShopDomain(shop);

    const tokenData = await shopifyApiService.exchangeCodeForToken(shopDomain, code);
    const shopInfo = await shopifyApiService.getShopInfo(shopDomain, tokenData.access_token);

    await db.execute(`
      INSERT INTO shopify_user_shops
        (user_id, shop_id, shop_name, shop_domain, shop_email, access_token, scopes, is_active, terms_accepted)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON DUPLICATE KEY UPDATE
        shop_name   = VALUES(shop_name),
        shop_email  = VALUES(shop_email),
        access_token = VALUES(access_token),
        scopes      = VALUES(scopes),
        is_active   = 1,
        updated_at  = CURRENT_TIMESTAMP
    `, [
      userId,
      shopDomain,
      shopInfo.name,
      shopDomain,
      shopInfo.email || null,
      encrypt(tokenData.access_token),
      tokenData.scope || ''
    ]);

    await db.execute(`
      INSERT INTO shopify_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (?, 'shop', 'push', 'success', 'Shop connected successfully')
    `, [userId]);

    return { success: true, shop_id: shopDomain, shop_name: shopInfo.name };
  } catch (error) {
    console.error('Shopify OAuth callback error:', error);
    throw error;
  }
}

// ──────────────────────────────────────────────
// SHOPS
// ──────────────────────────────────────────────

async function getShops(userId) {
  const [shops] = await db.execute(`
    SELECT id, shop_id, shop_name, shop_domain, shop_email, is_active,
           terms_accepted, last_sync_at, created_at,
           CASE WHEN access_token IS NOT NULL THEN true ELSE false END as has_token
    FROM shopify_user_shops WHERE user_id = ? ORDER BY created_at DESC
  `, [userId]);
  return shops;
}

async function disconnectShop(shopId, userId) {
  await db.execute(
    `UPDATE shopify_user_shops SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE shop_id = ? AND user_id = ?`,
    [shopId, userId]
  );
  return { success: true };
}

// ──────────────────────────────────────────────
// PRODUCTS
// ──────────────────────────────────────────────

async function listProducts(userId) {
  const [products] = await db.execute(`
    SELECT
      p.*,
      spd.id as shopify_data_id,
      spd.shopify_title,
      spd.shopify_description,
      spd.shopify_price,
      spd.shopify_tags,
      spd.shopify_product_type,
      spd.shopify_product_id,
      spd.is_active as shopify_active,
      spd.sync_status,
      spd.last_sync_at,
      sia.allocated_quantity,
      CASE WHEN spd.id IS NOT NULL THEN 'configured' ELSE 'unconfigured' END as shopify_status
    FROM products p
    LEFT JOIN shopify_product_data spd ON p.id = spd.product_id AND spd.user_id = ?
    LEFT JOIN shopify_inventory_allocations sia ON p.id = sia.product_id AND sia.user_id = ?
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
    shopify_title, shopify_description, shopify_price,
    shopify_tags, shopify_product_type,
    allocated_quantity, is_active
  } = body;

  const [check] = await db.execute(
    'SELECT id FROM products WHERE id = ? AND vendor_id = ?',
    [productId, userId]
  );
  if (check.length === 0) return { found: false };

  await db.execute(`
    INSERT INTO shopify_product_data
      (user_id, product_id, shopify_title, shopify_description, shopify_price,
       shopify_tags, shopify_product_type, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      shopify_title       = VALUES(shopify_title),
      shopify_description = VALUES(shopify_description),
      shopify_price       = VALUES(shopify_price),
      shopify_tags        = VALUES(shopify_tags),
      shopify_product_type = VALUES(shopify_product_type),
      is_active           = VALUES(is_active),
      sync_status         = 'pending',
      updated_at          = CURRENT_TIMESTAMP
  `, [userId, productId, shopify_title, shopify_description, shopify_price,
      shopify_tags, shopify_product_type, is_active !== undefined ? (is_active ? 1 : 0) : 1]);

  if (allocated_quantity !== undefined && allocated_quantity !== '') {
    const qty = parseInt(allocated_quantity) || 0;
    if (qty > 0) {
      await db.execute(`
        INSERT INTO shopify_inventory_allocations (user_id, product_id, allocated_quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP
      `, [userId, productId, qty]);
    } else {
      await db.execute(
        'DELETE FROM shopify_inventory_allocations WHERE user_id = ? AND product_id = ?',
        [userId, productId]
      );
    }
  }
  return { found: true };
}

// ──────────────────────────────────────────────
// INVENTORY
// ──────────────────────────────────────────────

async function getInventory(userId) {
  const [allocations] = await db.execute(`
    SELECT sia.*, p.name as title,
           COALESCE(pi.qty_available, 0) as total_inventory
    FROM shopify_inventory_allocations sia
    JOIN products p ON sia.product_id = p.id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE sia.user_id = ?
    ORDER BY sia.updated_at DESC
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
  if (allocated_quantity > check[0].inventory_count) {
    throw new Error('Cannot allocate more than total inventory');
  }
  await db.execute(`
    INSERT INTO shopify_inventory_allocations (user_id, product_id, allocated_quantity)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP
  `, [userId, productId, allocated_quantity]);
  return { found: true };
}

async function bulkAllocations(userId, allocations) {
  if (!Array.isArray(allocations) || allocations.length === 0) {
    throw new Error('allocations must be a non-empty array');
  }
  for (const a of allocations) {
    if (!a.product_id || a.allocated_quantity === undefined) {
      throw new Error('Each allocation must have product_id and allocated_quantity');
    }
  }
  const ids = allocations.map(a => a.product_id);
  const ph = ids.map(() => '?').join(',');
  const [found] = await db.execute(
    `SELECT id FROM products WHERE id IN (${ph}) AND vendor_id = ?`,
    [...ids, userId]
  );
  if (found.length !== ids.length) throw new Error('Some products not found or not owned by user');

  let ok = 0;
  const errors = [];
  for (const a of allocations) {
    try {
      const qty = parseInt(a.allocated_quantity) || 0;
      if (qty > 0) {
        await db.execute(`
          INSERT INTO shopify_inventory_allocations (user_id, product_id, allocated_quantity)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP
        `, [userId, a.product_id, qty]);
      } else {
        await db.execute(
          'DELETE FROM shopify_inventory_allocations WHERE user_id = ? AND product_id = ?',
          [userId, a.product_id]
        );
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
  let query = 'SELECT * FROM shopify_sync_logs WHERE user_id = ?';
  const params = [userId];
  if (sync_type) { query += ' AND sync_type = ?'; params.push(sync_type); }
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  const [logs] = await db.execute(query, params);
  return logs;
}

// ──────────────────────────────────────────────
// SYNC ACTIONS (called from routes or cron)
// ──────────────────────────────────────────────

async function syncProductToShopify(productId, userId, shopId) {
  try {
    const [shops] = await db.execute(
      'SELECT shop_domain, access_token FROM shopify_user_shops WHERE shop_id = ? AND user_id = ? AND is_active = 1',
      [shopId, userId]
    );
    if (shops.length === 0) throw new Error('Shop not connected');
    const shopDomain = shops[0].shop_domain;
    const accessToken = decrypt(shops[0].access_token);

    const [products] = await db.execute(`
      SELECT p.*, spd.shopify_title, spd.shopify_description, spd.shopify_price,
             spd.shopify_tags, spd.shopify_product_type, spd.shopify_product_id,
             sia.allocated_quantity
      FROM products p
      LEFT JOIN shopify_product_data spd ON p.id = spd.product_id AND spd.user_id = ?
      LEFT JOIN shopify_inventory_allocations sia ON p.id = sia.product_id AND sia.user_id = ?
      WHERE p.id = ? AND p.vendor_id = ?
    `, [userId, userId, productId, userId]);
    if (products.length === 0) throw new Error('Product not found');

    const product = products[0];
    const [images] = await db.execute(
      'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC',
      [productId]
    );

    const payload = {
      title: product.shopify_title || product.name,
      body_html: product.shopify_description || product.description || '',
      product_type: product.shopify_product_type || 'Art',
      tags: product.shopify_tags || '',
      variants: [{
        price: product.shopify_price || product.price,
        sku: `BRK-${product.sku || productId}`,
        inventory_quantity: product.allocated_quantity || 0,
        inventory_management: 'shopify'
      }],
      images: images.map(img => ({ src: img.image_url }))
    };

    let result;
    if (product.shopify_product_id) {
      result = await shopifyApiService.updateProduct(shopDomain, accessToken, product.shopify_product_id, payload);
    } else {
      result = await shopifyApiService.createProduct(shopDomain, accessToken, payload);
      await db.execute(
        `UPDATE shopify_product_data SET shopify_product_id = ?, sync_status = 'synced', last_sync_at = CURRENT_TIMESTAMP WHERE product_id = ? AND user_id = ?`,
        [result.id, productId, userId]
      );
    }

    await db.execute(`
      INSERT INTO shopify_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (?, 'product', 'push', ?, 'success', 'Product synced to Shopify')
    `, [userId, productId]);

    return { success: true, result };
  } catch (error) {
    await db.execute(`
      INSERT INTO shopify_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (?, 'product', 'push', ?, 'error', ?)
    `, [userId, productId, error.message]);
    throw error;
  }
}

async function syncOrdersFromShopify(userId, shopId) {
  try {
    const [shops] = await db.execute(
      'SELECT shop_domain, access_token FROM shopify_user_shops WHERE shop_id = ? AND user_id = ? AND is_active = 1',
      [shopId, userId]
    );
    if (shops.length === 0) throw new Error('Shop not connected');
    const shopDomain = shops[0].shop_domain;
    const accessToken = decrypt(shops[0].access_token);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const orders = await shopifyApiService.getOrders(shopDomain, accessToken, {
      created_at_min: thirtyDaysAgo, limit: 100
    });

    let syncCount = 0;
    for (const order of orders) {
      const shopifyOrderId = String(order.id);
      const [existing] = await db.execute(
        'SELECT id FROM shopify_orders WHERE shopify_order_id = ?',
        [shopifyOrderId]
      );
      if (existing.length === 0) {
        const totalAmount = parseFloat(order.total_price) || 0;
        const shipping = order.shipping_address || {};
        await db.execute(`
          INSERT INTO shopify_orders
            (user_id, shop_id, shopify_order_id, shopify_order_number, order_status,
             customer_name, shipping_address1, shipping_address2, shipping_city,
             shipping_state, shipping_zip, shipping_country, shipping_phone,
             total_amount, currency, order_data, shopify_created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId, shopId, shopifyOrderId, order.order_number || order.name,
          order.fulfillment_status || 'unfulfilled',
          order.customer ? `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : null,
          shipping.address1 || null, shipping.address2 || null,
          shipping.city || null, shipping.province || null, shipping.zip || null,
          shipping.country_code || 'US', shipping.phone || null,
          totalAmount, order.currency || 'USD',
          JSON.stringify(order), order.created_at
        ]);

        for (const item of (order.line_items || [])) {
          await db.execute(`
            INSERT INTO shopify_order_items
              (shopify_order_id, shopify_line_item_id, product_id, sku,
               product_name, quantity, unit_price, line_total)
            VALUES (
              (SELECT id FROM shopify_orders WHERE shopify_order_id = ? LIMIT 1),
              ?, ?, ?, ?, ?, ?, ?
            )
          `, [
            shopifyOrderId,
            String(item.id), null, item.sku || '',
            item.title || item.name, item.quantity,
            parseFloat(item.price) || 0,
            (parseFloat(item.price) || 0) * item.quantity
          ]);
        }
        syncCount++;
      } else {
        await db.execute(`
          UPDATE shopify_orders
          SET order_status = ?, order_data = ?, updated_at = CURRENT_TIMESTAMP
          WHERE shopify_order_id = ?
        `, [order.fulfillment_status || 'unfulfilled', JSON.stringify(order), shopifyOrderId]);
      }
    }

    await db.execute(`
      INSERT INTO shopify_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (?, 'orders', 'pull', 'success', ?)
    `, [userId, `Synced ${syncCount} new orders`]);

    return { success: true, synced: syncCount, total: orders.length };
  } catch (error) {
    await db.execute(`
      INSERT INTO shopify_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (?, 'orders', 'pull', 'error', ?)
    `, [userId, error.message]);
    throw error;
  }
}

async function updateShopifyInventory(productId, userId, shopId, quantity) {
  try {
    const [shops] = await db.execute(
      'SELECT shop_domain, access_token FROM shopify_user_shops WHERE shop_id = ? AND user_id = ? AND is_active = 1',
      [shopId, userId]
    );
    if (shops.length === 0) throw new Error('Shop not connected');
    const shopDomain = shops[0].shop_domain;
    const accessToken = decrypt(shops[0].access_token);

    const [products] = await db.execute(
      'SELECT shopify_product_id FROM shopify_product_data WHERE product_id = ? AND user_id = ?',
      [productId, userId]
    );
    if (products.length === 0 || !products[0].shopify_product_id) {
      throw new Error('Product not synced to Shopify');
    }

    const shopifyProduct = await shopifyApiService.getProduct(shopDomain, accessToken, products[0].shopify_product_id);
    if (shopifyProduct.variants && shopifyProduct.variants.length > 0) {
      const variant = shopifyProduct.variants[0];
      if (variant.inventory_item_id) {
        const locations = await shopifyApiService.getLocations(shopDomain, accessToken);
        if (locations.length > 0) {
          await shopifyApiService.setInventoryLevel(
            shopDomain, accessToken, locations[0].id, variant.inventory_item_id, quantity
          );
        }
      }
    }

    await db.execute(`
      UPDATE shopify_inventory_allocations
      SET allocated_quantity = ?, updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ? AND user_id = ?
    `, [quantity, productId, userId]);

    await db.execute(`
      INSERT INTO shopify_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (?, 'inventory', 'push', ?, 'success', ?)
    `, [userId, productId, `Updated inventory to ${quantity}`]);

    return { success: true };
  } catch (error) {
    console.error('Shopify inventory update error:', error);
    throw error;
  }
}

// ──────────────────────────────────────────────
// CONNECTION TEST
// ──────────────────────────────────────────────

async function testConnection() {
  return await shopifyApiService.testConnection();
}

// ──────────────────────────────────────────────
// ADMIN
// ──────────────────────────────────────────────

async function adminListProducts(options = {}) {
  const { status = 'all', page = 1, limit = 25, search = '' } = options;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let statusFilter = '';
  if (status === 'pending') statusFilter = "AND spd.is_active = 1 AND (spd.sync_status = 'pending' OR spd.sync_status IS NULL)";
  else if (status === 'active') statusFilter = 'AND spd.is_active = 1';
  else if (status === 'paused') statusFilter = 'AND spd.is_active = 0';

  let searchFilter = '';
  const searchParams = [];
  if (search) {
    searchFilter = 'AND (p.name LIKE ? OR u.username LIKE ? OR spd.shopify_title LIKE ?)';
    searchParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const [countResult] = await db.query(
    `SELECT COUNT(*) as total FROM shopify_product_data spd
     JOIN products p ON spd.product_id = p.id
     JOIN users u ON spd.user_id = u.id
     WHERE 1=1 ${statusFilter} ${searchFilter}`,
    searchParams
  );

  const [rows] = await db.query(`
    SELECT spd.id as shopify_data_id, spd.product_id, spd.user_id, spd.shopify_title,
           spd.shopify_description, spd.shopify_price, spd.is_active, spd.sync_status, spd.created_at,
           p.name, p.price, COALESCE(pi.qty_available, 0) as inventory_count,
           u.username, COALESCE(up.display_name, u.username) as vendor_name,
           sia.allocated_quantity
    FROM shopify_product_data spd
    JOIN products p ON spd.product_id = p.id
    JOIN users u ON spd.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    LEFT JOIN shopify_inventory_allocations sia ON spd.product_id = sia.product_id AND spd.user_id = sia.user_id
    WHERE 1=1 ${statusFilter} ${searchFilter}
    ORDER BY spd.created_at DESC LIMIT ? OFFSET ?
  `, [...searchParams, parseInt(limit), offset]);

  const products = rows.map(row => ({
    ...row,
    listing_status: row.is_active ? (row.sync_status === 'pending' || !row.sync_status ? 'pending' : 'listed') : 'paused'
  }));
  return { products, total: countResult[0].total };
}

async function adminActivate(productId) {
  await db.query(
    `UPDATE shopify_product_data SET is_active = 1, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
    [productId]
  );
  return true;
}

async function adminPause(productId) {
  await db.query(
    `UPDATE shopify_product_data SET is_active = 0, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
    [productId]
  );
  return true;
}

async function adminUpdateProduct(productId, body) {
  const { shopify_title, shopify_description, shopify_price } = body;
  await db.query(
    `UPDATE shopify_product_data
     SET shopify_title = COALESCE(?, shopify_title),
         shopify_description = COALESCE(?, shopify_description),
         shopify_price = COALESCE(?, shopify_price),
         sync_status = 'pending', updated_at = CURRENT_TIMESTAMP
     WHERE product_id = ?`,
    [shopify_title, shopify_description, shopify_price, productId]
  );
  return true;
}

// ──────────────────────────────────────────────
// EMBEDDED APP – SESSION TOKEN AUTH
// ──────────────────────────────────────────────

function getAppConfig() {
  return { apiKey: process.env.SHOPIFY_API_KEY };
}

async function verifySessionToken(sessionToken) {
  if (!sessionToken) throw new Error('Session token is required');

  const parts = sessionToken.split('.');
  if (parts.length !== 3) throw new Error('Malformed session token');

  const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
  const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

  if (header.alg !== 'HS256') throw new Error('Unsupported algorithm');

  const signatureInput = `${parts[0]}.${parts[1]}`;
  const expectedSig = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(signatureInput)
    .digest('base64url');

  if (!crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(parts[2])))
    throw new Error('Invalid session token signature');

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('Session token expired');
  if (payload.nbf && payload.nbf > now + 60) throw new Error('Session token not yet valid');

  let shopDomain = payload.dest || payload.iss;
  if (!shopDomain) throw new Error('No shop domain in session token');
  shopDomain = shopDomain.replace(/^https?:\/\//, '');

  const [shops] = await db.execute(
    `SELECT user_id FROM shopify_user_shops WHERE shop_domain = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1`,
    [shopDomain]
  );

  if (shops.length === 0) {
    return { authenticated: false, reason: 'not_linked', shopDomain };
  }

  const userId = shops[0].user_id;
  const userData = await getUserWithRolesAndPermissions(db, userId);
  if (!userData) {
    return { authenticated: false, reason: 'user_not_found', shopDomain };
  }

  const accessToken = createAccessToken({
    userId: userData.userId,
    roles: userData.roles,
    permissions: userData.permissions
  });

  return { authenticated: true, accessToken, shopDomain, userId };
}

module.exports = {
  oauthAuthorize,
  handleOAuthCallback,
  getShops,
  disconnectShop,
  listProducts,
  saveProduct,
  getInventory,
  updateInventoryAllocation,
  bulkAllocations,
  getLogs,
  syncProductToShopify,
  syncOrdersFromShopify,
  updateShopifyInventory,
  testConnection,
  adminListProducts,
  adminActivate,
  adminPause,
  adminUpdateProduct,
  getAppConfig,
  verifySessionToken
};
