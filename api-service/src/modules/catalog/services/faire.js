/**
 * Faire Connector Service (v2)
 * Business logic for the Faire catalog addon.
 * OAuth-only connector – users connect their own Faire brand accounts.
 *
 * Pattern: Routes -> Business Logic (this file) -> External API Service (faireService.js)
 */

const db = require('../../../../config/db');
const faireApiService = require('../../../services/faireService');
const { encrypt, decrypt } = require('../../../utils/encryption');
const { validateConnectorEnv } = require('../../../utils/connectorEnv');

validateConnectorEnv('faire');

// ──────────────────────────────────────────────
// OAUTH
// ──────────────────────────────────────────────

function oauthAuthorize(userId) {
  try {
    const redirectUrl = faireApiService.getAuthorizationUrl(userId);
    return { success: true, redirect_url: redirectUrl };
  } catch (error) {
    console.error('Faire OAuth authorize error:', error);
    return { success: false, message: error.message, status: 'error' };
  }
}

async function handleOAuthCallback(code, state) {
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const userId = stateData.userId;

    const tokenData = await faireApiService.exchangeCodeForToken(code);
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 3600) * 1000);

    let brandName = 'Faire Brand';
    let brandId = null;
    try {
      const brand = await faireApiService.getBrandInfo(tokenData.access_token);
      brandName = brand.name || brandName;
      brandId = brand.id || null;
    } catch (_) { /* non-critical */ }

    const shopId = brandId || `faire-${userId}-${Date.now()}`;

    await db.execute(`
      INSERT INTO faire_user_shops
        (user_id, shop_id, brand_id, shop_name,
         access_token, refresh_token, token_expires_at, is_active, terms_accepted)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON DUPLICATE KEY UPDATE
        shop_name        = VALUES(shop_name),
        brand_id         = VALUES(brand_id),
        access_token     = VALUES(access_token),
        refresh_token    = VALUES(refresh_token),
        token_expires_at = VALUES(token_expires_at),
        is_active        = 1,
        updated_at       = CURRENT_TIMESTAMP
    `, [
      userId, shopId, brandId, brandName,
      encrypt(tokenData.access_token),
      encrypt(tokenData.refresh_token),
      expiresAt
    ]);

    await db.execute(`
      INSERT INTO faire_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (?, 'shop', 'push', 'success', 'Faire brand connected')
    `, [userId]);

    return { success: true, shop_id: shopId, shop_name: brandName };
  } catch (error) {
    console.error('Faire OAuth callback error:', error);
    throw error;
  }
}

// ──────────────────────────────────────────────
// SHOPS
// ──────────────────────────────────────────────

async function getShops(userId) {
  const [shops] = await db.execute(`
    SELECT id, shop_id, brand_id, shop_name, is_active, terms_accepted,
           last_sync_at, created_at,
           CASE WHEN access_token IS NOT NULL THEN true ELSE false END as has_token
    FROM faire_user_shops WHERE user_id = ? ORDER BY created_at DESC
  `, [userId]);
  return shops;
}

async function disconnectShop(shopId, userId) {
  await db.execute(
    'UPDATE faire_user_shops SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE shop_id = ? AND user_id = ?',
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
      fpd.id as faire_data_id,
      fpd.faire_title, fpd.faire_description, fpd.faire_wholesale_price,
      fpd.faire_retail_price, fpd.faire_product_id, fpd.faire_category,
      fpd.faire_minimum_order_quantity,
      fpd.is_active as faire_active, fpd.sync_status, fpd.last_sync_at,
      fia.allocated_quantity,
      CASE WHEN fpd.id IS NOT NULL THEN 'configured' ELSE 'unconfigured' END as faire_status
    FROM products p
    LEFT JOIN faire_product_data fpd ON p.id = fpd.product_id AND fpd.user_id = ?
    LEFT JOIN faire_inventory_allocations fia ON p.id = fia.product_id AND fia.user_id = ?
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
    faire_title, faire_description, faire_wholesale_price,
    faire_retail_price, faire_category, faire_minimum_order_quantity,
    allocated_quantity, is_active
  } = body;

  const [check] = await db.execute(
    'SELECT id, name, price FROM products WHERE id = ? AND vendor_id = ?',
    [productId, userId]
  );
  if (check.length === 0) return { found: false };

  const product = check[0];

  await db.execute(`
    INSERT INTO faire_product_data
      (user_id, product_id, faire_title, faire_description,
       faire_wholesale_price, faire_retail_price, faire_category,
       faire_minimum_order_quantity, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      faire_title       = VALUES(faire_title),
      faire_description = VALUES(faire_description),
      faire_wholesale_price = VALUES(faire_wholesale_price),
      faire_retail_price    = VALUES(faire_retail_price),
      faire_category        = VALUES(faire_category),
      faire_minimum_order_quantity = VALUES(faire_minimum_order_quantity),
      is_active        = VALUES(is_active),
      sync_status      = 'pending',
      updated_at       = CURRENT_TIMESTAMP
  `, [
    userId, productId,
    faire_title || product.name,
    faire_description,
    faire_wholesale_price || product.price,
    faire_retail_price || null,
    faire_category || null,
    faire_minimum_order_quantity || 1,
    is_active !== undefined ? (is_active ? 1 : 0) : 1
  ]);

  if (allocated_quantity !== undefined && allocated_quantity !== '') {
    const qty = parseInt(allocated_quantity) || 0;
    if (qty > 0) {
      await db.execute(`
        INSERT INTO faire_inventory_allocations (user_id, product_id, allocated_quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP
      `, [userId, productId, qty]);
    } else {
      await db.execute(
        'DELETE FROM faire_inventory_allocations WHERE user_id = ? AND product_id = ?',
        [userId, productId]
      );
    }
  }

  await db.execute(`
    INSERT INTO faire_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'save', ?, 'success', 'Product data saved for Faire')
  `, [userId, productId]);

  return { found: true };
}

// ──────────────────────────────────────────────
// INVENTORY
// ──────────────────────────────────────────────

async function getInventory(userId) {
  const [allocations] = await db.execute(`
    SELECT fia.*, p.name as title, COALESCE(pi.qty_available, 0) as total_inventory
    FROM faire_inventory_allocations fia
    JOIN products p ON fia.product_id = p.id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE fia.user_id = ?
    ORDER BY fia.updated_at DESC
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
    INSERT INTO faire_inventory_allocations (user_id, product_id, allocated_quantity)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP
  `, [userId, productId, allocated_quantity]);
  return { found: true };
}

async function bulkAllocations(userId, allocations) {
  if (!Array.isArray(allocations) || allocations.length === 0) {
    throw new Error('allocations must be a non-empty array');
  }
  const ids = allocations.map(a => a.product_id);
  const ph = ids.map(() => '?').join(',');
  const [found] = await db.execute(
    `SELECT id FROM products WHERE id IN (${ph}) AND vendor_id = ?`, [...ids, userId]
  );
  if (found.length !== ids.length) throw new Error('Some products not found or not owned by user');

  let ok = 0;
  const errors = [];
  for (const a of allocations) {
    try {
      const qty = parseInt(a.allocated_quantity) || 0;
      if (qty > 0) {
        await db.execute(`
          INSERT INTO faire_inventory_allocations (user_id, product_id, allocated_quantity)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP
        `, [userId, a.product_id, qty]);
      } else {
        await db.execute('DELETE FROM faire_inventory_allocations WHERE user_id = ? AND product_id = ?', [userId, a.product_id]);
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
  let query = 'SELECT * FROM faire_sync_logs WHERE user_id = ?';
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

async function syncProductToFaire(productId, userId, shopId) {
  try {
    const accessToken = await faireApiService.getShopAccessToken(shopId, userId);

    const [products] = await db.execute(`
      SELECT p.*, fpd.faire_title, fpd.faire_description,
             fpd.faire_wholesale_price, fpd.faire_retail_price,
             fpd.faire_product_id, fpd.faire_category,
             fpd.faire_minimum_order_quantity,
             fia.allocated_quantity
      FROM products p
      LEFT JOIN faire_product_data fpd ON p.id = fpd.product_id AND fpd.user_id = ?
      LEFT JOIN faire_inventory_allocations fia ON p.id = fia.product_id AND fia.user_id = ?
      WHERE p.id = ? AND p.vendor_id = ?
    `, [userId, userId, productId, userId]);
    if (products.length === 0) throw new Error('Product not found');

    const product = products[0];
    const [images] = await db.execute(
      'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC', [productId]
    );

    const payload = {
      name: product.faire_title || product.name,
      description: product.faire_description || product.description || '',
      wholesale_price_cents: Math.round((parseFloat(product.faire_wholesale_price || product.price) || 0) * 100),
      retail_price_cents: product.faire_retail_price ? Math.round(parseFloat(product.faire_retail_price) * 100) : null,
      minimum_order_quantity: product.faire_minimum_order_quantity || 1,
      images: images.map(i => ({ url: i.image_url }))
    };

    let result;
    if (product.faire_product_id) {
      result = await faireApiService.updateProduct(accessToken, product.faire_product_id, payload);
    } else {
      result = await faireApiService.createProduct(accessToken, payload);
      if (result && result.id) {
        await db.execute(
          'UPDATE faire_product_data SET faire_product_id = ? WHERE product_id = ? AND user_id = ?',
          [result.id, productId, userId]
        );
      }
    }

    await db.execute(
      `UPDATE faire_product_data SET sync_status = 'synced', last_sync_at = NOW(), last_sync_error = NULL WHERE product_id = ? AND user_id = ?`,
      [productId, userId]
    );

    await db.execute(`
      INSERT INTO faire_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (?, 'product', 'push', ?, 'success', 'Product synced to Faire')
    `, [userId, productId]);

    return { success: true };
  } catch (error) {
    await db.execute(`
      INSERT INTO faire_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (?, 'product', 'push', ?, 'error', ?)
    `, [userId, productId, error.message]);
    throw error;
  }
}

async function syncOrdersFromFaire(userId, shopId) {
  try {
    const accessToken = await faireApiService.getShopAccessToken(shopId, userId);
    const ordersData = await faireApiService.listOrders(accessToken, { limit: 50 });
    const orders = ordersData.orders || ordersData || [];

    let syncCount = 0;
    for (const order of orders) {
      const faireOrderId = order.id;
      const [existing] = await db.execute(
        'SELECT id FROM faire_orders WHERE faire_order_id = ?', [faireOrderId]
      );
      if (existing.length === 0) {
        const shipping = order.address || {};
        await db.execute(`
          INSERT INTO faire_orders
            (user_id, shop_id, faire_order_id, order_status, customer_name,
             shipping_address1, shipping_city, shipping_state, shipping_zip, shipping_country,
             total_amount, currency, order_data, faire_created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId, shopId, faireOrderId,
          order.state || 'NEW',
          shipping.name || null,
          shipping.address1 || null,
          shipping.city || null,
          shipping.state || null,
          shipping.postal_code || null,
          shipping.country_code || 'US',
          (order.payout_costs?.total_payout?.amount_cents || 0) / 100,
          order.payout_costs?.total_payout?.currency || 'USD',
          JSON.stringify(order),
          order.created_at || null
        ]);

        const [insertedOrder] = await db.execute(
          'SELECT id FROM faire_orders WHERE faire_order_id = ? LIMIT 1', [faireOrderId]
        );
        if (insertedOrder.length > 0) {
          for (const item of (order.items || [])) {
            await db.execute(`
              INSERT INTO faire_order_items
                (faire_order_id, faire_item_id, product_name, quantity, unit_price, line_total)
              VALUES (?, ?, ?, ?, ?, ?)
            `, [
              insertedOrder[0].id,
              item.id || null,
              item.product_name || 'Unknown',
              item.quantity || 1,
              (item.price_cents || 0) / 100,
              ((item.price_cents || 0) * (item.quantity || 1)) / 100
            ]);
          }
        }
        syncCount++;
      } else {
        await db.execute(
          'UPDATE faire_orders SET order_status = ?, order_data = ?, updated_at = CURRENT_TIMESTAMP WHERE faire_order_id = ?',
          [order.state || 'NEW', JSON.stringify(order), faireOrderId]
        );
      }
    }

    await db.execute(`
      INSERT INTO faire_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (?, 'orders', 'pull', 'success', ?)
    `, [userId, `Synced ${syncCount} new orders`]);

    return { success: true, synced: syncCount, total: orders.length };
  } catch (error) {
    await db.execute(`
      INSERT INTO faire_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (?, 'orders', 'pull', 'error', ?)
    `, [userId, error.message]);
    throw error;
  }
}

async function testConnection() {
  return await faireApiService.testConnection();
}

// ──────────────────────────────────────────────
// ADMIN
// ──────────────────────────────────────────────

async function adminListProducts(options = {}) {
  const { status = 'all', page = 1, limit = 25, search = '' } = options;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let statusFilter = '';
  if (status === 'pending') statusFilter = "AND fpd.is_active = 1 AND (fpd.sync_status = 'pending' OR fpd.sync_status IS NULL)";
  else if (status === 'active') statusFilter = 'AND fpd.is_active = 1';
  else if (status === 'paused') statusFilter = 'AND fpd.is_active = 0';

  let searchFilter = '';
  const searchParams = [];
  if (search) {
    searchFilter = 'AND (p.name LIKE ? OR u.username LIKE ? OR fpd.faire_title LIKE ?)';
    searchParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const [countResult] = await db.query(
    `SELECT COUNT(*) as total FROM faire_product_data fpd
     JOIN products p ON fpd.product_id = p.id JOIN users u ON fpd.user_id = u.id
     WHERE 1=1 ${statusFilter} ${searchFilter}`, searchParams
  );

  const [rows] = await db.query(`
    SELECT fpd.id as faire_data_id, fpd.product_id, fpd.user_id, fpd.faire_title,
           fpd.faire_description, fpd.faire_wholesale_price, fpd.faire_retail_price,
           fpd.is_active, fpd.sync_status, fpd.created_at,
           p.name, p.price, COALESCE(pi.qty_available, 0) as inventory_count,
           u.username, COALESCE(up.display_name, u.username) as vendor_name,
           fia.allocated_quantity
    FROM faire_product_data fpd
    JOIN products p ON fpd.product_id = p.id JOIN users u ON fpd.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    LEFT JOIN faire_inventory_allocations fia ON fpd.product_id = fia.product_id AND fpd.user_id = fia.user_id
    WHERE 1=1 ${statusFilter} ${searchFilter}
    ORDER BY fpd.created_at DESC LIMIT ? OFFSET ?
  `, [...searchParams, parseInt(limit), offset]);

  const products = rows.map(row => ({
    ...row,
    listing_status: row.is_active ? (row.sync_status === 'pending' || !row.sync_status ? 'pending' : 'listed') : 'paused'
  }));
  return { products, total: countResult[0].total };
}

async function adminActivate(productId) {
  await db.query("UPDATE faire_product_data SET is_active = 1, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?", [productId]);
  return true;
}

async function adminPause(productId) {
  await db.query("UPDATE faire_product_data SET is_active = 0, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?", [productId]);
  return true;
}

async function adminUpdateProduct(productId, body) {
  const { faire_title, faire_description, faire_wholesale_price } = body;
  await db.query(`
    UPDATE faire_product_data SET faire_title = COALESCE(?, faire_title), faire_description = COALESCE(?, faire_description),
    faire_wholesale_price = COALESCE(?, faire_wholesale_price), sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?
  `, [faire_title, faire_description, faire_wholesale_price, productId]);
  return true;
}

// ──────────────────────────────────────────────
// CORPORATE CATALOG (Brakebee Faire brand)
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
    corporate_category, corporate_brand, corporate_wholesale_price, corporate_retail_price,
    corporate_minimum_order_quantity, corporate_price, terms_accepted, is_active
  } = body;

  const finalPrice = corporate_price || calculateCorporatePrice(product);
  const keyFeaturesJson = corporate_key_features ?
    (typeof corporate_key_features === 'string' ? corporate_key_features : JSON.stringify(corporate_key_features)) : null;
  const additionalImagesJson = corporate_additional_images ?
    (typeof corporate_additional_images === 'string' ? corporate_additional_images : JSON.stringify(corporate_additional_images)) : null;

  await db.execute(`
    INSERT INTO faire_corporate_products (
      product_id, user_id, corporate_title, corporate_description, corporate_short_description,
      corporate_price, corporate_wholesale_price, corporate_retail_price, corporate_minimum_order_quantity,
      corporate_key_features, corporate_main_image_url, corporate_additional_images,
      corporate_category, corporate_brand,
      is_active, listing_status, sync_status, terms_accepted_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ${terms_accepted ? 'NOW()' : 'NULL'}, ?)
    ON DUPLICATE KEY UPDATE
      corporate_title = VALUES(corporate_title),
      corporate_description = VALUES(corporate_description),
      corporate_short_description = VALUES(corporate_short_description),
      corporate_price = VALUES(corporate_price),
      corporate_wholesale_price = VALUES(corporate_wholesale_price),
      corporate_retail_price = VALUES(corporate_retail_price),
      corporate_minimum_order_quantity = VALUES(corporate_minimum_order_quantity),
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
    toDecimalOrNull(finalPrice),
    toDecimalOrNull(corporate_wholesale_price), toDecimalOrNull(corporate_retail_price),
    parseInt(corporate_minimum_order_quantity) || 1,
    keyFeaturesJson, toNullIfEmpty(corporate_main_image_url), additionalImagesJson,
    toNullIfEmpty(corporate_category), toNullIfEmpty(corporate_brand),
    is_active !== undefined ? (is_active ? 1 : 0) : 1,
    userId
  ]);

  return { found: true };
}

async function getCorporateProduct(productId, userId) {
  const [rows] = await db.execute(`
    SELECT fcp.*, p.name, p.price, p.wholesale_price, COALESCE(pi.qty_available, 0) as inventory_count, p.description,
           COALESCE(up.display_name, u.username) as vendor_name
    FROM faire_corporate_products fcp
    JOIN products p ON fcp.product_id = p.id
    JOIN users u ON fcp.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE fcp.product_id = ? AND fcp.user_id = ?
  `, [productId, userId]);
  return rows[0] || null;
}

async function listCorporateProducts(userId) {
  const [products] = await db.execute(`
    SELECT p.*, fcp.id as corporate_id, fcp.corporate_title, fcp.corporate_description,
           fcp.corporate_price, fcp.corporate_wholesale_price, fcp.corporate_retail_price,
           fcp.corporate_brand, fcp.corporate_category,
           fcp.is_active as corporate_active, fcp.listing_status, fcp.sync_status,
           fcp.rejection_reason, fcp.cooldown_ends_at,
           COALESCE(pi.qty_available, 0) as inventory_count,
           CASE WHEN fcp.id IS NOT NULL THEN 'submitted' ELSE 'not_submitted' END as corporate_status
    FROM products p
    LEFT JOIN faire_corporate_products fcp ON p.id = fcp.product_id AND fcp.user_id = ?
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE p.vendor_id = ? AND p.status = 'active'
    ORDER BY fcp.created_at DESC, p.created_at DESC
  `, [userId, userId]);
  return products;
}

async function removeCorporateProduct(productId, userId) {
  const [check] = await db.execute('SELECT id FROM products WHERE id = ? AND vendor_id = ?', [productId, userId]);
  if (check.length === 0) return { found: false };
  const cooldownEnd = new Date();
  cooldownEnd.setDate(cooldownEnd.getDate() + 60);
  await db.execute(`
    UPDATE faire_corporate_products SET is_active = 0, listing_status = 'removing', removed_at = NOW(),
    cooldown_ends_at = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ? AND user_id = ?
  `, [cooldownEnd, productId, userId]);
  return { found: true, cooldown_ends_at: cooldownEnd };
}

async function adminListCorporateProducts(options = {}) {
  const { status = 'all', page = 1, limit = 25, search = '' } = options;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let statusFilter = '';
  if (status === 'pending') statusFilter = "AND fcp.listing_status = 'pending'";
  else if (status === 'active') statusFilter = "AND fcp.listing_status = 'listed'";
  else if (status === 'paused') statusFilter = "AND fcp.listing_status = 'paused'";
  else if (status === 'rejected') statusFilter = "AND fcp.listing_status = 'rejected'";
  let searchFilter = '';
  const searchParams = [];
  if (search) {
    searchFilter = "AND (p.name LIKE ? OR u.username LIKE ? OR fcp.corporate_title LIKE ?)";
    searchParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const [countResult] = await db.query(
    `SELECT COUNT(*) as total FROM faire_corporate_products fcp
     JOIN products p ON fcp.product_id = p.id JOIN users u ON fcp.user_id = u.id
     WHERE 1=1 ${statusFilter} ${searchFilter}`, searchParams
  );
  const [products] = await db.query(`
    SELECT fcp.*, p.name, p.price, p.wholesale_price, COALESCE(pi.qty_available, 0) as inventory_count,
           u.username, COALESCE(up.display_name, u.username) as vendor_name
    FROM faire_corporate_products fcp
    JOIN products p ON fcp.product_id = p.id JOIN users u ON fcp.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE 1=1 ${statusFilter} ${searchFilter}
    ORDER BY fcp.created_at DESC LIMIT ? OFFSET ?
  `, [...searchParams, parseInt(limit), offset]);
  return { products, total: countResult[0].total };
}

async function adminActivateCorporate(productId, userId) {
  await db.execute(`UPDATE faire_corporate_products SET listing_status = 'listed', is_active = 1, sync_status = 'pending',
    rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`, [productId]);
  await db.execute(`INSERT INTO faire_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'update', ?, 'success', 'Admin activated corporate product')`, [userId, productId]);
  return true;
}

async function adminPauseCorporate(productId, userId) {
  await db.execute(`UPDATE faire_corporate_products SET listing_status = 'paused', sync_status = 'pending',
    updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`, [productId]);
  await db.execute(`INSERT INTO faire_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'update', ?, 'success', 'Admin paused corporate product')`, [userId, productId]);
  return true;
}

async function adminRejectCorporate(productId, userId, reason) {
  await db.execute(`UPDATE faire_corporate_products SET listing_status = 'rejected', rejection_reason = ?, sync_status = 'pending',
    updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`, [reason || 'Product does not meet quality standards', productId]);
  await db.execute(`INSERT INTO faire_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'delete', ?, 'success', ?)`, [userId, productId, `Admin rejected: ${reason}`]);
  return true;
}

async function adminUpdateCorporateProduct(productId, body) {
  const { corporate_title, corporate_description, corporate_price } = body;
  await db.execute(`UPDATE faire_corporate_products SET corporate_title = COALESCE(?, corporate_title),
    corporate_description = COALESCE(?, corporate_description), corporate_price = COALESCE(?, corporate_price),
    sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
    [corporate_title, corporate_description, corporate_price, productId]);
  return true;
}

module.exports = {
  oauthAuthorize, handleOAuthCallback, getShops, disconnectShop,
  listProducts, saveProduct, getInventory, updateInventoryAllocation, bulkAllocations, getLogs,
  syncProductToFaire, syncOrdersFromFaire, testConnection,
  adminListProducts, adminActivate, adminPause, adminUpdateProduct,
  saveCorporateProduct, getCorporateProduct, listCorporateProducts, removeCorporateProduct,
  adminListCorporateProducts, adminActivateCorporate, adminPauseCorporate, adminRejectCorporate, adminUpdateCorporateProduct
};
