/**
 * Amazon Connector Service (v2)
 * Business logic for the Amazon catalog addon.
 * OAuth-only connector – users connect their own Amazon Seller Central accounts.
 *
 * Pattern: Routes -> Business Logic (this file) -> External API Service (amazonService.js)
 */

const db = require('../../../../config/db');
const amazonApiService = require('../../../services/amazonService');
const { encrypt, decrypt } = require('../../../utils/encryption');
const { validateConnectorEnv } = require('../../../utils/connectorEnv');

validateConnectorEnv('amazon');

// ──────────────────────────────────────────────
// OAUTH
// ──────────────────────────────────────────────

function oauthAuthorize(userId) {
  try {
    const redirectUrl = amazonApiService.getAuthorizationUrl(userId);
    return { success: true, redirect_url: redirectUrl };
  } catch (error) {
    console.error('Amazon OAuth authorize error:', error);
    return { success: false, message: error.message, status: 'error' };
  }
}

async function handleOAuthCallback(spapi_oauth_code, state, selling_partner_id) {
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const userId = stateData.userId;

    const tokenData = await amazonApiService.exchangeCodeForToken(spapi_oauth_code);
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    const shopId = selling_partner_id || `amz-${userId}-${Date.now()}`;
    let shopName = 'Amazon Seller';

    try {
      const participations = await amazonApiService.getSellerInfo(tokenData.access_token);
      const mp = participations.payload?.[0]?.marketplace;
      if (mp) shopName = mp.name || shopName;
    } catch (_) { /* non-critical */ }

    await db.execute(`
      INSERT INTO amazon_user_shops
        (user_id, shop_id, selling_partner_id, shop_name,
         access_token, refresh_token, token_expires_at, is_active, terms_accepted)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)
      ON DUPLICATE KEY UPDATE
        shop_name        = VALUES(shop_name),
        selling_partner_id = VALUES(selling_partner_id),
        access_token     = VALUES(access_token),
        refresh_token    = VALUES(refresh_token),
        token_expires_at = VALUES(token_expires_at),
        is_active        = 1,
        updated_at       = CURRENT_TIMESTAMP
    `, [
      userId, shopId, selling_partner_id || shopId, shopName,
      encrypt(tokenData.access_token),
      encrypt(tokenData.refresh_token),
      expiresAt
    ]);

    await db.execute(`
      INSERT INTO amazon_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (?, 'shop', 'push', 'success', 'Amazon seller account connected')
    `, [userId]);

    return { success: true, shop_id: shopId, shop_name: shopName };
  } catch (error) {
    console.error('Amazon OAuth callback error:', error);
    throw error;
  }
}

// ──────────────────────────────────────────────
// SHOPS
// ──────────────────────────────────────────────

async function getShops(userId) {
  const [shops] = await db.execute(`
    SELECT id, shop_id, selling_partner_id, shop_name, is_active, terms_accepted,
           last_sync_at, created_at,
           CASE WHEN access_token IS NOT NULL THEN true ELSE false END as has_token
    FROM amazon_user_shops WHERE user_id = ? ORDER BY created_at DESC
  `, [userId]);
  return shops;
}

async function disconnectShop(shopId, userId) {
  await db.execute(
    'UPDATE amazon_user_shops SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE shop_id = ? AND user_id = ?',
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
      apd.id as amazon_data_id,
      apd.amazon_title, apd.amazon_description, apd.amazon_price,
      apd.amazon_asin, apd.amazon_sku, apd.amazon_category,
      apd.amazon_brand, apd.amazon_condition,
      apd.is_active as amazon_active, apd.sync_status, apd.last_sync_at,
      aia.allocated_quantity,
      CASE WHEN apd.id IS NOT NULL THEN 'configured' ELSE 'unconfigured' END as amazon_status
    FROM products p
    LEFT JOIN amazon_product_data apd ON p.id = apd.product_id AND apd.user_id = ?
    LEFT JOIN amazon_inventory_allocations aia ON p.id = aia.product_id AND aia.user_id = ?
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
    amazon_title, amazon_description, amazon_price,
    amazon_asin, amazon_sku, amazon_category,
    amazon_brand, amazon_condition,
    allocated_quantity, is_active
  } = body;

  const [check] = await db.execute(
    'SELECT id, name, price, sku FROM products WHERE id = ? AND vendor_id = ?',
    [productId, userId]
  );
  if (check.length === 0) return { found: false };

  const product = check[0];

  await db.execute(`
    INSERT INTO amazon_product_data
      (user_id, product_id, amazon_title, amazon_description, amazon_price,
       amazon_asin, amazon_sku, amazon_category, amazon_brand, amazon_condition, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      amazon_title       = VALUES(amazon_title),
      amazon_description = VALUES(amazon_description),
      amazon_price       = VALUES(amazon_price),
      amazon_asin        = VALUES(amazon_asin),
      amazon_sku         = VALUES(amazon_sku),
      amazon_category    = VALUES(amazon_category),
      amazon_brand       = VALUES(amazon_brand),
      amazon_condition   = VALUES(amazon_condition),
      is_active          = VALUES(is_active),
      sync_status        = 'pending',
      updated_at         = CURRENT_TIMESTAMP
  `, [
    userId, productId,
    amazon_title || product.name,
    amazon_description,
    amazon_price || product.price,
    amazon_asin || null,
    amazon_sku || `BRK-${product.sku || productId}`,
    amazon_category || null,
    amazon_brand || null,
    amazon_condition || 'new_new',
    is_active !== undefined ? (is_active ? 1 : 0) : 1
  ]);

  if (allocated_quantity !== undefined && allocated_quantity !== '') {
    const qty = parseInt(allocated_quantity) || 0;
    if (qty > 0) {
      await db.execute(`
        INSERT INTO amazon_inventory_allocations (user_id, product_id, allocated_quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP
      `, [userId, productId, qty]);
    } else {
      await db.execute(
        'DELETE FROM amazon_inventory_allocations WHERE user_id = ? AND product_id = ?',
        [userId, productId]
      );
    }
  }

  await db.execute(`
    INSERT INTO amazon_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'save', ?, 'success', 'Product data saved for Amazon')
  `, [userId, productId]);

  return { found: true };
}

// ──────────────────────────────────────────────
// INVENTORY
// ──────────────────────────────────────────────

async function getInventory(userId) {
  const [allocations] = await db.execute(`
    SELECT aia.*, p.name as title, COALESCE(pi.qty_available, 0) as total_inventory
    FROM amazon_inventory_allocations aia
    JOIN products p ON aia.product_id = p.id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE aia.user_id = ?
    ORDER BY aia.updated_at DESC
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
    INSERT INTO amazon_inventory_allocations (user_id, product_id, allocated_quantity)
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
          INSERT INTO amazon_inventory_allocations (user_id, product_id, allocated_quantity)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP
        `, [userId, a.product_id, qty]);
      } else {
        await db.execute('DELETE FROM amazon_inventory_allocations WHERE user_id = ? AND product_id = ?', [userId, a.product_id]);
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
  let query = 'SELECT * FROM amazon_sync_logs WHERE user_id = ?';
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

async function syncProductToAmazon(productId, userId, shopId) {
  try {
    const accessToken = await amazonApiService.getShopAccessToken(shopId, userId);

    const [shops] = await db.execute(
      'SELECT selling_partner_id FROM amazon_user_shops WHERE shop_id = ? AND user_id = ?',
      [shopId, userId]
    );
    if (shops.length === 0) throw new Error('Shop not connected');
    const sellerId = shops[0].selling_partner_id;

    const [products] = await db.execute(`
      SELECT p.*, apd.amazon_title, apd.amazon_description, apd.amazon_price,
             apd.amazon_asin, apd.amazon_sku, apd.amazon_category,
             apd.amazon_brand, apd.amazon_condition,
             aia.allocated_quantity
      FROM products p
      LEFT JOIN amazon_product_data apd ON p.id = apd.product_id AND apd.user_id = ?
      LEFT JOIN amazon_inventory_allocations aia ON p.id = aia.product_id AND aia.user_id = ?
      WHERE p.id = ? AND p.vendor_id = ?
    `, [userId, userId, productId, userId]);
    if (products.length === 0) throw new Error('Product not found');

    const product = products[0];
    const sku = product.amazon_sku || `BRK-${product.sku || productId}`;

    const listingBody = {
      productType: product.amazon_category || 'PRODUCT',
      requirements: 'LISTING',
      attributes: {
        item_name: [{ value: product.amazon_title || product.name }],
        brand_name: [{ value: product.amazon_brand || 'Brakebee' }],
        list_price: [{ value: parseFloat(product.amazon_price || product.price), currency: 'USD' }],
        condition_type: [{ value: product.amazon_condition || 'new_new' }],
        product_description: [{ value: product.amazon_description || product.description || '' }],
        fulfillment_availability: [{
          fulfillment_channel_code: 'DEFAULT',
          quantity: product.allocated_quantity || 0
        }]
      }
    };

    await amazonApiService.putListingsItem(accessToken, sellerId, sku, listingBody);

    await db.execute(
      `UPDATE amazon_product_data SET amazon_sku = ?, sync_status = 'synced', last_sync_at = NOW(), last_sync_error = NULL WHERE product_id = ? AND user_id = ?`,
      [sku, productId, userId]
    );

    await db.execute(`
      INSERT INTO amazon_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (?, 'product', 'push', ?, 'success', 'Product synced to Amazon')
    `, [userId, productId]);

    return { success: true };
  } catch (error) {
    await db.execute(`
      INSERT INTO amazon_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (?, 'product', 'push', ?, 'error', ?)
    `, [userId, productId, error.message]);
    throw error;
  }
}

async function syncOrdersFromAmazon(userId, shopId) {
  try {
    const accessToken = await amazonApiService.getShopAccessToken(shopId, userId);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const ordersData = await amazonApiService.getOrders(accessToken, {
      CreatedAfter: thirtyDaysAgo,
      MaxResultsPerPage: 100
    });
    const orders = ordersData.payload?.Orders || [];

    let syncCount = 0;
    for (const order of orders) {
      const amazonOrderId = order.AmazonOrderId;
      const [existing] = await db.execute(
        'SELECT id FROM amazon_orders WHERE amazon_order_id = ?', [amazonOrderId]
      );
      if (existing.length === 0) {
        const shipping = order.ShippingAddress || {};
        await db.execute(`
          INSERT INTO amazon_orders
            (user_id, shop_id, amazon_order_id, order_status, customer_name,
             shipping_address1, shipping_city, shipping_state, shipping_zip, shipping_country,
             total_amount, currency, order_data, amazon_created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId, shopId, amazonOrderId,
          order.OrderStatus || 'Pending',
          shipping.Name || null,
          shipping.AddressLine1 || null,
          shipping.City || null,
          shipping.StateOrRegion || null,
          shipping.PostalCode || null,
          shipping.CountryCode || 'US',
          parseFloat(order.OrderTotal?.Amount) || 0,
          order.OrderTotal?.CurrencyCode || 'USD',
          JSON.stringify(order),
          order.PurchaseDate || null
        ]);

        try {
          const itemsData = await amazonApiService.getOrderItems(accessToken, amazonOrderId);
          const items = itemsData.payload?.OrderItems || [];
          const [insertedOrder] = await db.execute(
            'SELECT id FROM amazon_orders WHERE amazon_order_id = ? LIMIT 1', [amazonOrderId]
          );
          if (insertedOrder.length > 0) {
            for (const item of items) {
              await db.execute(`
                INSERT INTO amazon_order_items
                  (amazon_order_id, amazon_order_item_id, asin, sku, product_name,
                   quantity, unit_price, line_total)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                insertedOrder[0].id,
                item.OrderItemId, item.ASIN || '', item.SellerSKU || '',
                item.Title || 'Unknown', item.QuantityOrdered || 1,
                parseFloat(item.ItemPrice?.Amount) || 0,
                parseFloat(item.ItemPrice?.Amount) || 0
              ]);
            }
          }
        } catch (itemErr) {
          console.error(`Failed to fetch items for order ${amazonOrderId}:`, itemErr.message);
        }
        syncCount++;
      } else {
        await db.execute(
          'UPDATE amazon_orders SET order_status = ?, order_data = ?, updated_at = CURRENT_TIMESTAMP WHERE amazon_order_id = ?',
          [order.OrderStatus || 'Pending', JSON.stringify(order), amazonOrderId]
        );
      }
    }

    await db.execute(`
      INSERT INTO amazon_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (?, 'orders', 'pull', 'success', ?)
    `, [userId, `Synced ${syncCount} new orders`]);

    return { success: true, synced: syncCount, total: orders.length };
  } catch (error) {
    await db.execute(`
      INSERT INTO amazon_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (?, 'orders', 'pull', 'error', ?)
    `, [userId, error.message]);
    throw error;
  }
}

async function testConnection() {
  return await amazonApiService.testConnection();
}

// ──────────────────────────────────────────────
// ADMIN
// ──────────────────────────────────────────────

async function adminListProducts(options = {}) {
  const { status = 'all', page = 1, limit = 25, search = '' } = options;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let statusFilter = '';
  if (status === 'pending') statusFilter = "AND apd.is_active = 1 AND (apd.sync_status = 'pending' OR apd.sync_status IS NULL)";
  else if (status === 'active') statusFilter = 'AND apd.is_active = 1';
  else if (status === 'paused') statusFilter = 'AND apd.is_active = 0';

  let searchFilter = '';
  const searchParams = [];
  if (search) {
    searchFilter = 'AND (p.name LIKE ? OR u.username LIKE ? OR apd.amazon_title LIKE ?)';
    searchParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const [countResult] = await db.query(
    `SELECT COUNT(*) as total FROM amazon_product_data apd
     JOIN products p ON apd.product_id = p.id JOIN users u ON apd.user_id = u.id
     WHERE 1=1 ${statusFilter} ${searchFilter}`, searchParams
  );

  const [rows] = await db.query(`
    SELECT apd.id as amazon_data_id, apd.product_id, apd.user_id, apd.amazon_title,
           apd.amazon_description, apd.amazon_price, apd.amazon_asin, apd.is_active,
           apd.sync_status, apd.created_at,
           p.name, p.price, COALESCE(pi.qty_available, 0) as inventory_count,
           u.username, COALESCE(up.display_name, u.username) as vendor_name,
           aia.allocated_quantity
    FROM amazon_product_data apd
    JOIN products p ON apd.product_id = p.id JOIN users u ON apd.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    LEFT JOIN amazon_inventory_allocations aia ON apd.product_id = aia.product_id AND apd.user_id = aia.user_id
    WHERE 1=1 ${statusFilter} ${searchFilter}
    ORDER BY apd.created_at DESC LIMIT ? OFFSET ?
  `, [...searchParams, parseInt(limit), offset]);

  const products = rows.map(row => ({
    ...row,
    listing_status: row.is_active ? (row.sync_status === 'pending' || !row.sync_status ? 'pending' : 'listed') : 'paused'
  }));
  return { products, total: countResult[0].total };
}

async function adminActivate(productId) {
  await db.query("UPDATE amazon_product_data SET is_active = 1, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?", [productId]);
  return true;
}

async function adminPause(productId) {
  await db.query("UPDATE amazon_product_data SET is_active = 0, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?", [productId]);
  return true;
}

async function adminUpdateProduct(productId, body) {
  const { amazon_title, amazon_description, amazon_price } = body;
  await db.query(`
    UPDATE amazon_product_data SET amazon_title = COALESCE(?, amazon_title), amazon_description = COALESCE(?, amazon_description),
    amazon_price = COALESCE(?, amazon_price), sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?
  `, [amazon_title, amazon_description, amazon_price, productId]);
  return true;
}

// ──────────────────────────────────────────────
// CORPORATE CATALOG (Brakebee Amazon account)
// Vendors submit products for admin approval
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
    corporate_category, corporate_brand, corporate_condition, corporate_price,
    terms_accepted, is_active
  } = body;

  const finalPrice = corporate_price || calculateCorporatePrice(product);
  const keyFeaturesJson = corporate_key_features ?
    (typeof corporate_key_features === 'string' ? corporate_key_features : JSON.stringify(corporate_key_features)) : null;
  const additionalImagesJson = corporate_additional_images ?
    (typeof corporate_additional_images === 'string' ? corporate_additional_images : JSON.stringify(corporate_additional_images)) : null;

  await db.execute(`
    INSERT INTO amazon_corporate_products (
      product_id, user_id, corporate_title, corporate_description, corporate_short_description,
      corporate_price, corporate_key_features, corporate_main_image_url, corporate_additional_images,
      corporate_category, corporate_brand, corporate_condition, is_active, listing_status, sync_status,
      terms_accepted_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ${terms_accepted ? 'NOW()' : 'NULL'}, ?)
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
      corporate_condition = VALUES(corporate_condition),
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
    toNullIfEmpty(corporate_description),
    toNullIfEmpty(corporate_short_description),
    toDecimalOrNull(finalPrice),
    keyFeaturesJson, toNullIfEmpty(corporate_main_image_url), additionalImagesJson,
    toNullIfEmpty(corporate_category), toNullIfEmpty(corporate_brand),
    toNullIfEmpty(corporate_condition) || 'new_new',
    is_active !== undefined ? (is_active ? 1 : 0) : 1,
    userId
  ]);

  return { found: true };
}

async function getCorporateProduct(productId, userId) {
  const [rows] = await db.execute(`
    SELECT acp.*, p.name, p.price, p.wholesale_price, COALESCE(pi.qty_available, 0) as inventory_count, p.description,
           COALESCE(up.display_name, u.username) as vendor_name
    FROM amazon_corporate_products acp
    JOIN products p ON acp.product_id = p.id
    JOIN users u ON acp.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE acp.product_id = ? AND acp.user_id = ?
  `, [productId, userId]);
  return rows[0] || null;
}

async function listCorporateProducts(userId) {
  const [products] = await db.execute(`
    SELECT p.*, acp.id as corporate_id, acp.corporate_title, acp.corporate_description,
           acp.corporate_price, acp.corporate_brand, acp.corporate_condition,
           acp.is_active as corporate_active, acp.listing_status, acp.sync_status,
           acp.rejection_reason, acp.cooldown_ends_at,
           COALESCE(pi.qty_available, 0) as inventory_count,
           CASE WHEN acp.id IS NOT NULL THEN 'submitted' ELSE 'not_submitted' END as corporate_status
    FROM products p
    LEFT JOIN amazon_corporate_products acp ON p.id = acp.product_id AND acp.user_id = ?
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE p.vendor_id = ? AND p.status = 'active'
    ORDER BY acp.created_at DESC, p.created_at DESC
  `, [userId, userId]);
  return products;
}

async function removeCorporateProduct(productId, userId) {
  const [check] = await db.execute('SELECT id FROM products WHERE id = ? AND vendor_id = ?', [productId, userId]);
  if (check.length === 0) return { found: false };

  const cooldownEnd = new Date();
  cooldownEnd.setDate(cooldownEnd.getDate() + 60);

  await db.execute(`
    UPDATE amazon_corporate_products
    SET is_active = 0, listing_status = 'removing', removed_at = NOW(), cooldown_ends_at = ?, updated_at = CURRENT_TIMESTAMP
    WHERE product_id = ? AND user_id = ?
  `, [cooldownEnd, productId, userId]);

  return { found: true, cooldown_ends_at: cooldownEnd };
}

async function adminListCorporateProducts(options = {}) {
  const { status = 'all', page = 1, limit = 25, search = '' } = options;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let statusFilter = '';
  if (status === 'pending') statusFilter = "AND acp.listing_status = 'pending'";
  else if (status === 'active') statusFilter = "AND acp.listing_status = 'listed'";
  else if (status === 'paused') statusFilter = "AND acp.listing_status = 'paused'";
  else if (status === 'rejected') statusFilter = "AND acp.listing_status = 'rejected'";

  let searchFilter = '';
  const searchParams = [];
  if (search) {
    searchFilter = "AND (p.name LIKE ? OR u.username LIKE ? OR acp.corporate_title LIKE ?)";
    searchParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const [countResult] = await db.query(
    `SELECT COUNT(*) as total FROM amazon_corporate_products acp
     JOIN products p ON acp.product_id = p.id JOIN users u ON acp.user_id = u.id
     WHERE 1=1 ${statusFilter} ${searchFilter}`, searchParams
  );

  const [products] = await db.query(`
    SELECT acp.*, p.name, p.price, p.wholesale_price, COALESCE(pi.qty_available, 0) as inventory_count,
           u.username, COALESCE(up.display_name, u.username) as vendor_name
    FROM amazon_corporate_products acp
    JOIN products p ON acp.product_id = p.id JOIN users u ON acp.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE 1=1 ${statusFilter} ${searchFilter}
    ORDER BY acp.created_at DESC LIMIT ? OFFSET ?
  `, [...searchParams, parseInt(limit), offset]);

  return { products, total: countResult[0].total };
}

async function adminActivateCorporate(productId, userId) {
  await db.execute(`
    UPDATE amazon_corporate_products SET listing_status = 'listed', is_active = 1, sync_status = 'pending',
    rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?
  `, [productId]);
  await db.execute(`INSERT INTO amazon_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'update', ?, 'success', 'Admin activated corporate product')`, [userId, productId]);
  return true;
}

async function adminPauseCorporate(productId, userId) {
  await db.execute(`
    UPDATE amazon_corporate_products SET listing_status = 'paused', sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?
  `, [productId]);
  await db.execute(`INSERT INTO amazon_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'update', ?, 'success', 'Admin paused corporate product')`, [userId, productId]);
  return true;
}

async function adminRejectCorporate(productId, userId, reason) {
  await db.execute(`
    UPDATE amazon_corporate_products SET listing_status = 'rejected', rejection_reason = ?, sync_status = 'pending',
    updated_at = CURRENT_TIMESTAMP WHERE product_id = ?
  `, [reason || 'Product does not meet quality standards', productId]);
  await db.execute(`INSERT INTO amazon_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'delete', ?, 'success', ?)`, [userId, productId, `Admin rejected corporate product: ${reason}`]);
  return true;
}

async function adminUpdateCorporateProduct(productId, body) {
  const { corporate_title, corporate_description, corporate_price } = body;
  await db.execute(`
    UPDATE amazon_corporate_products SET corporate_title = COALESCE(?, corporate_title),
    corporate_description = COALESCE(?, corporate_description), corporate_price = COALESCE(?, corporate_price),
    sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?
  `, [corporate_title, corporate_description, corporate_price, productId]);
  return true;
}

module.exports = {
  oauthAuthorize, handleOAuthCallback, getShops, disconnectShop,
  listProducts, saveProduct, getInventory, updateInventoryAllocation, bulkAllocations, getLogs,
  syncProductToAmazon, syncOrdersFromAmazon, testConnection,
  adminListProducts, adminActivate, adminPause, adminUpdateProduct,
  saveCorporateProduct, getCorporateProduct, listCorporateProducts, removeCorporateProduct,
  adminListCorporateProducts, adminActivateCorporate, adminPauseCorporate, adminRejectCorporate, adminUpdateCorporateProduct
};
