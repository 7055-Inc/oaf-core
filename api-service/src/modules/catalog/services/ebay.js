/**
 * eBay Connector Service (v2)
 * Business logic for the eBay catalog addon.
 * OAuth-only connector – users connect their own eBay seller accounts.
 *
 * Pattern: Routes → Business Logic (this file) → External API Service (ebayService.js)
 */

const db = require('../../../../config/db');
const ebayApiService = require('../../../services/ebayService');
const { encrypt, decrypt } = require('../../../utils/encryption');
const { validateConnectorEnv } = require('../../../utils/connectorEnv');

validateConnectorEnv('ebay');

// ──────────────────────────────────────────────
// OAUTH
// ──────────────────────────────────────────────

function oauthAuthorize(userId) {
  try {
    const redirectUrl = ebayApiService.getAuthorizationUrl(userId);
    return { success: true, redirect_url: redirectUrl };
  } catch (error) {
    console.error('eBay OAuth authorize error:', error);
    return { success: false, message: error.message, status: 'error' };
  }
}

async function handleOAuthCallback(code, state) {
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const userId = stateData.userId;

    const tokenData = await ebayApiService.exchangeCodeForToken(code);
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));

    let accountName = 'eBay Seller';
    try {
      const acct = await ebayApiService.getAccountInfo(tokenData.access_token);
      accountName = acct.sellerRegistrationCompleted ? 'eBay Seller (verified)' : 'eBay Seller';
    } catch (_) { /* non-critical */ }

    const shopId = `ebay-${userId}-${Date.now()}`;

    await db.execute(`
      INSERT INTO ebay_user_shops
        (user_id, shop_id, shop_name, access_token, refresh_token, token_expires_at, is_active, terms_accepted)
      VALUES (?, ?, ?, ?, ?, ?, 1, 1)
      ON DUPLICATE KEY UPDATE
        shop_name     = VALUES(shop_name),
        access_token  = VALUES(access_token),
        refresh_token = VALUES(refresh_token),
        token_expires_at = VALUES(token_expires_at),
        is_active     = 1,
        updated_at    = CURRENT_TIMESTAMP
    `, [
      userId, shopId, accountName,
      encrypt(tokenData.access_token),
      encrypt(tokenData.refresh_token),
      expiresAt
    ]);

    await db.execute(`
      INSERT INTO ebay_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (?, 'shop', 'push', 'success', 'eBay account connected')
    `, [userId]);

    return { success: true, shop_id: shopId, shop_name: accountName };
  } catch (error) {
    console.error('eBay OAuth callback error:', error);
    throw error;
  }
}

// ──────────────────────────────────────────────
// SHOPS
// ──────────────────────────────────────────────

async function getShops(userId) {
  const [shops] = await db.execute(`
    SELECT id, shop_id, shop_name, is_active, terms_accepted, last_sync_at, created_at,
           CASE WHEN access_token IS NOT NULL THEN true ELSE false END as has_token
    FROM ebay_user_shops WHERE user_id = ? ORDER BY created_at DESC
  `, [userId]);
  return shops;
}

async function disconnectShop(shopId, userId) {
  await db.execute(
    `UPDATE ebay_user_shops SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE shop_id = ? AND user_id = ?`,
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
      epd.id as ebay_data_id,
      epd.ebay_title, epd.ebay_description, epd.ebay_price,
      epd.ebay_category_id, epd.ebay_condition, epd.ebay_listing_id,
      epd.is_active as ebay_active, epd.sync_status, epd.last_sync_at,
      eia.allocated_quantity,
      CASE WHEN epd.id IS NOT NULL THEN 'configured' ELSE 'unconfigured' END as ebay_status
    FROM products p
    LEFT JOIN ebay_product_data epd ON p.id = epd.product_id AND epd.user_id = ?
    LEFT JOIN ebay_inventory_allocations eia ON p.id = eia.product_id AND eia.user_id = ?
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
    ebay_title, ebay_description, ebay_price,
    ebay_category_id, ebay_condition,
    allocated_quantity, is_active
  } = body;

  const [check] = await db.execute(
    'SELECT id FROM products WHERE id = ? AND vendor_id = ?',
    [productId, userId]
  );
  if (check.length === 0) return { found: false };

  await db.execute(`
    INSERT INTO ebay_product_data
      (user_id, product_id, ebay_title, ebay_description, ebay_price,
       ebay_category_id, ebay_condition, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      ebay_title       = VALUES(ebay_title),
      ebay_description = VALUES(ebay_description),
      ebay_price       = VALUES(ebay_price),
      ebay_category_id = VALUES(ebay_category_id),
      ebay_condition   = VALUES(ebay_condition),
      is_active        = VALUES(is_active),
      sync_status      = 'pending',
      updated_at       = CURRENT_TIMESTAMP
  `, [userId, productId, ebay_title, ebay_description, ebay_price,
      ebay_category_id, ebay_condition || 'NEW', is_active !== undefined ? (is_active ? 1 : 0) : 1]);

  if (allocated_quantity !== undefined && allocated_quantity !== '') {
    const qty = parseInt(allocated_quantity) || 0;
    if (qty > 0) {
      await db.execute(`
        INSERT INTO ebay_inventory_allocations (user_id, product_id, allocated_quantity)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP
      `, [userId, productId, qty]);
    } else {
      await db.execute(
        'DELETE FROM ebay_inventory_allocations WHERE user_id = ? AND product_id = ?',
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
    SELECT eia.*, p.name as title, COALESCE(pi.qty_available, 0) as total_inventory
    FROM ebay_inventory_allocations eia
    JOIN products p ON eia.product_id = p.id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE eia.user_id = ?
    ORDER BY eia.updated_at DESC
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
    INSERT INTO ebay_inventory_allocations (user_id, product_id, allocated_quantity)
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
          INSERT INTO ebay_inventory_allocations (user_id, product_id, allocated_quantity)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP
        `, [userId, a.product_id, qty]);
      } else {
        await db.execute('DELETE FROM ebay_inventory_allocations WHERE user_id = ? AND product_id = ?', [userId, a.product_id]);
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
  let query = 'SELECT * FROM ebay_sync_logs WHERE user_id = ?';
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

async function syncProductToEbay(productId, userId, shopId) {
  try {
    const accessToken = await ebayApiService.getShopAccessToken(shopId, userId);

    const [products] = await db.execute(`
      SELECT p.*, epd.ebay_title, epd.ebay_description, epd.ebay_price,
             epd.ebay_category_id, epd.ebay_condition, epd.ebay_listing_id,
             eia.allocated_quantity
      FROM products p
      LEFT JOIN ebay_product_data epd ON p.id = epd.product_id AND epd.user_id = ?
      LEFT JOIN ebay_inventory_allocations eia ON p.id = eia.product_id AND eia.user_id = ?
      WHERE p.id = ? AND p.vendor_id = ?
    `, [userId, userId, productId, userId]);
    if (products.length === 0) throw new Error('Product not found');

    const product = products[0];
    const [images] = await db.execute(
      'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC', [productId]
    );

    const sku = `BRK-${product.sku || productId}`;
    const inventoryItem = {
      product: {
        title: product.ebay_title || product.name,
        description: product.ebay_description || product.description || '',
        imageUrls: images.map(i => i.image_url)
      },
      condition: product.ebay_condition || 'NEW',
      availability: {
        shipToLocationAvailability: {
          quantity: product.allocated_quantity || 0
        }
      }
    };

    await ebayApiService.createOrReplaceInventoryItem(accessToken, sku, inventoryItem);

    if (!product.ebay_listing_id) {
      const offer = {
        sku,
        marketplaceId: 'EBAY_US',
        format: 'FIXED_PRICE',
        listingDescription: product.ebay_description || product.description || '',
        categoryId: product.ebay_category_id || null,
        pricingSummary: {
          price: { value: String(product.ebay_price || product.price), currency: 'USD' }
        },
        availableQuantity: product.allocated_quantity || 0,
        merchantLocationKey: 'default'
      };

      try {
        const offerResult = await ebayApiService.createOffer(accessToken, offer);
        const offerId = offerResult.offerId;
        const publishResult = await ebayApiService.publishOffer(accessToken, offerId);
        const listingId = publishResult.listingId || offerId;

        await db.execute(
          `UPDATE ebay_product_data SET ebay_listing_id = ?, ebay_offer_id = ?, sync_status = 'synced', last_sync_at = NOW() WHERE product_id = ? AND user_id = ?`,
          [listingId, offerId, productId, userId]
        );
      } catch (offerErr) {
        console.error('eBay offer/publish error:', offerErr.message);
        await db.execute(
          `UPDATE ebay_product_data SET sync_status = 'synced', last_sync_at = NOW(), last_sync_error = ? WHERE product_id = ? AND user_id = ?`,
          [`Inventory synced but offer failed: ${offerErr.message}`, productId, userId]
        );
      }
    } else {
      await db.execute(
        `UPDATE ebay_product_data SET sync_status = 'synced', last_sync_at = NOW(), last_sync_error = NULL WHERE product_id = ? AND user_id = ?`,
        [productId, userId]
      );
    }

    await db.execute(`
      INSERT INTO ebay_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (?, 'product', 'push', ?, 'success', 'Product synced to eBay')
    `, [userId, productId]);

    return { success: true };
  } catch (error) {
    await db.execute(`
      INSERT INTO ebay_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (?, 'product', 'push', ?, 'error', ?)
    `, [userId, productId, error.message]);
    throw error;
  }
}

async function syncOrdersFromEbay(userId, shopId) {
  try {
    const accessToken = await ebayApiService.getShopAccessToken(shopId, userId);
    const ordersData = await ebayApiService.getOrders(accessToken, { limit: 50 });
    const orders = ordersData.orders || [];

    let syncCount = 0;
    for (const order of orders) {
      const ebayOrderId = order.orderId;
      const [existing] = await db.execute(
        'SELECT id FROM ebay_orders WHERE ebay_order_id = ?', [ebayOrderId]
      );
      if (existing.length === 0) {
        const shipping = order.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo || {};
        const totalAmount = parseFloat(order.pricingSummary?.total?.value) || 0;

        await db.execute(`
          INSERT INTO ebay_orders
            (user_id, shop_id, ebay_order_id, order_status, customer_name,
             shipping_address1, shipping_city, shipping_state, shipping_zip, shipping_country,
             total_amount, currency, order_data, ebay_created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          userId, shopId, ebayOrderId,
          order.orderFulfillmentStatus || 'NOT_STARTED',
          shipping.fullName || null,
          shipping.contactAddress?.addressLine1 || null,
          shipping.contactAddress?.city || null,
          shipping.contactAddress?.stateOrProvince || null,
          shipping.contactAddress?.postalCode || null,
          shipping.contactAddress?.countryCode || 'US',
          totalAmount, order.pricingSummary?.total?.currency || 'USD',
          JSON.stringify(order), order.creationDate || null
        ]);

        for (const item of (order.lineItems || [])) {
          await db.execute(`
            INSERT INTO ebay_order_items
              (ebay_order_id, ebay_line_item_id, sku, product_name, quantity, unit_price, line_total)
            VALUES (
              (SELECT id FROM ebay_orders WHERE ebay_order_id = ? LIMIT 1),
              ?, ?, ?, ?, ?, ?
            )
          `, [
            ebayOrderId,
            item.lineItemId, item.sku || '',
            item.title, item.quantity,
            parseFloat(item.lineItemCost?.value) || 0,
            parseFloat(item.total?.value) || 0
          ]);
        }
        syncCount++;
      } else {
        await db.execute(
          `UPDATE ebay_orders SET order_status = ?, order_data = ?, updated_at = CURRENT_TIMESTAMP WHERE ebay_order_id = ?`,
          [order.orderFulfillmentStatus || 'NOT_STARTED', JSON.stringify(order), ebayOrderId]
        );
      }
    }

    await db.execute(`
      INSERT INTO ebay_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (?, 'orders', 'pull', 'success', ?)
    `, [userId, `Synced ${syncCount} new orders`]);

    return { success: true, synced: syncCount, total: orders.length };
  } catch (error) {
    await db.execute(`
      INSERT INTO ebay_sync_logs (user_id, sync_type, operation, status, message)
      VALUES (?, 'orders', 'pull', 'error', ?)
    `, [userId, error.message]);
    throw error;
  }
}

async function testConnection() {
  return await ebayApiService.testConnection();
}

// ──────────────────────────────────────────────
// ADMIN
// ──────────────────────────────────────────────

async function adminListProducts(options = {}) {
  const { status = 'all', page = 1, limit = 25, search = '' } = options;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let statusFilter = '';
  if (status === 'pending') statusFilter = "AND epd.is_active = 1 AND (epd.sync_status = 'pending' OR epd.sync_status IS NULL)";
  else if (status === 'active') statusFilter = 'AND epd.is_active = 1';
  else if (status === 'paused') statusFilter = 'AND epd.is_active = 0';

  let searchFilter = '';
  const searchParams = [];
  if (search) {
    searchFilter = 'AND (p.name LIKE ? OR u.username LIKE ? OR epd.ebay_title LIKE ?)';
    searchParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const [countResult] = await db.query(
    `SELECT COUNT(*) as total FROM ebay_product_data epd
     JOIN products p ON epd.product_id = p.id JOIN users u ON epd.user_id = u.id
     WHERE 1=1 ${statusFilter} ${searchFilter}`, searchParams
  );

  const [rows] = await db.query(`
    SELECT epd.id as ebay_data_id, epd.product_id, epd.user_id, epd.ebay_title,
           epd.ebay_description, epd.ebay_price, epd.is_active, epd.sync_status, epd.created_at,
           p.name, p.price, COALESCE(pi.qty_available, 0) as inventory_count,
           u.username, COALESCE(up.display_name, u.username) as vendor_name,
           eia.allocated_quantity
    FROM ebay_product_data epd
    JOIN products p ON epd.product_id = p.id JOIN users u ON epd.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    LEFT JOIN ebay_inventory_allocations eia ON epd.product_id = eia.product_id AND epd.user_id = eia.user_id
    WHERE 1=1 ${statusFilter} ${searchFilter}
    ORDER BY epd.created_at DESC LIMIT ? OFFSET ?
  `, [...searchParams, parseInt(limit), offset]);

  const products = rows.map(row => ({
    ...row,
    listing_status: row.is_active ? (row.sync_status === 'pending' || !row.sync_status ? 'pending' : 'listed') : 'paused'
  }));
  return { products, total: countResult[0].total };
}

async function adminActivate(productId) {
  await db.query(`UPDATE ebay_product_data SET is_active = 1, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`, [productId]);
  return true;
}

async function adminPause(productId) {
  await db.query(`UPDATE ebay_product_data SET is_active = 0, sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`, [productId]);
  return true;
}

async function adminUpdateProduct(productId, body) {
  const { ebay_title, ebay_description, ebay_price } = body;
  await db.query(`
    UPDATE ebay_product_data SET ebay_title = COALESCE(?, ebay_title), ebay_description = COALESCE(?, ebay_description),
    ebay_price = COALESCE(?, ebay_price), sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?
  `, [ebay_title, ebay_description, ebay_price, productId]);
  return true;
}

// ──────────────────────────────────────────────
// CORPORATE CATALOG (Brakebee eBay account)
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
    corporate_category_id, corporate_brand, corporate_condition, corporate_listing_format,
    corporate_price, terms_accepted, is_active
  } = body;

  const finalPrice = corporate_price || calculateCorporatePrice(product);
  const keyFeaturesJson = corporate_key_features ?
    (typeof corporate_key_features === 'string' ? corporate_key_features : JSON.stringify(corporate_key_features)) : null;
  const additionalImagesJson = corporate_additional_images ?
    (typeof corporate_additional_images === 'string' ? corporate_additional_images : JSON.stringify(corporate_additional_images)) : null;

  await db.execute(`
    INSERT INTO ebay_corporate_products (
      product_id, user_id, corporate_title, corporate_description, corporate_short_description,
      corporate_price, corporate_key_features, corporate_main_image_url, corporate_additional_images,
      corporate_category_id, corporate_brand, corporate_condition, corporate_listing_format,
      is_active, listing_status, sync_status, terms_accepted_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ${terms_accepted ? 'NOW()' : 'NULL'}, ?)
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
      corporate_condition = VALUES(corporate_condition),
      corporate_listing_format = VALUES(corporate_listing_format),
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
    toNullIfEmpty(corporate_category_id), toNullIfEmpty(corporate_brand),
    toNullIfEmpty(corporate_condition) || 'NEW',
    toNullIfEmpty(corporate_listing_format) || 'FIXED_PRICE',
    is_active !== undefined ? (is_active ? 1 : 0) : 1,
    userId
  ]);

  return { found: true };
}

async function getCorporateProduct(productId, userId) {
  const [rows] = await db.execute(`
    SELECT ecp.*, p.name, p.price, p.wholesale_price, COALESCE(pi.qty_available, 0) as inventory_count, p.description,
           COALESCE(up.display_name, u.username) as vendor_name
    FROM ebay_corporate_products ecp
    JOIN products p ON ecp.product_id = p.id
    JOIN users u ON ecp.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE ecp.product_id = ? AND ecp.user_id = ?
  `, [productId, userId]);
  return rows[0] || null;
}

async function listCorporateProducts(userId) {
  const [products] = await db.execute(`
    SELECT p.*, ecp.id as corporate_id, ecp.corporate_title, ecp.corporate_description,
           ecp.corporate_price, ecp.corporate_brand, ecp.corporate_condition,
           ecp.is_active as corporate_active, ecp.listing_status, ecp.sync_status,
           ecp.rejection_reason, ecp.cooldown_ends_at,
           COALESCE(pi.qty_available, 0) as inventory_count,
           CASE WHEN ecp.id IS NOT NULL THEN 'submitted' ELSE 'not_submitted' END as corporate_status
    FROM products p
    LEFT JOIN ebay_corporate_products ecp ON p.id = ecp.product_id AND ecp.user_id = ?
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE p.vendor_id = ? AND p.status = 'active'
    ORDER BY ecp.created_at DESC, p.created_at DESC
  `, [userId, userId]);
  return products;
}

async function removeCorporateProduct(productId, userId) {
  const [check] = await db.execute('SELECT id FROM products WHERE id = ? AND vendor_id = ?', [productId, userId]);
  if (check.length === 0) return { found: false };
  const cooldownEnd = new Date();
  cooldownEnd.setDate(cooldownEnd.getDate() + 60);
  await db.execute(`
    UPDATE ebay_corporate_products SET is_active = 0, listing_status = 'removing', removed_at = NOW(),
    cooldown_ends_at = ?, updated_at = CURRENT_TIMESTAMP WHERE product_id = ? AND user_id = ?
  `, [cooldownEnd, productId, userId]);
  return { found: true, cooldown_ends_at: cooldownEnd };
}

async function adminListCorporateProducts(options = {}) {
  const { status = 'all', page = 1, limit = 25, search = '' } = options;
  const offset = (parseInt(page) - 1) * parseInt(limit);
  let statusFilter = '';
  if (status === 'pending') statusFilter = "AND ecp.listing_status = 'pending'";
  else if (status === 'active') statusFilter = "AND ecp.listing_status = 'listed'";
  else if (status === 'paused') statusFilter = "AND ecp.listing_status = 'paused'";
  else if (status === 'rejected') statusFilter = "AND ecp.listing_status = 'rejected'";
  let searchFilter = '';
  const searchParams = [];
  if (search) {
    searchFilter = "AND (p.name LIKE ? OR u.username LIKE ? OR ecp.corporate_title LIKE ?)";
    searchParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  const [countResult] = await db.query(
    `SELECT COUNT(*) as total FROM ebay_corporate_products ecp
     JOIN products p ON ecp.product_id = p.id JOIN users u ON ecp.user_id = u.id
     WHERE 1=1 ${statusFilter} ${searchFilter}`, searchParams
  );
  const [products] = await db.query(`
    SELECT ecp.*, p.name, p.price, p.wholesale_price, COALESCE(pi.qty_available, 0) as inventory_count,
           u.username, COALESCE(up.display_name, u.username) as vendor_name
    FROM ebay_corporate_products ecp
    JOIN products p ON ecp.product_id = p.id JOIN users u ON ecp.user_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN product_inventory pi ON p.id = pi.product_id
    WHERE 1=1 ${statusFilter} ${searchFilter}
    ORDER BY ecp.created_at DESC LIMIT ? OFFSET ?
  `, [...searchParams, parseInt(limit), offset]);
  return { products, total: countResult[0].total };
}

async function adminActivateCorporate(productId, userId) {
  await db.execute(`UPDATE ebay_corporate_products SET listing_status = 'listed', is_active = 1, sync_status = 'pending',
    rejection_reason = NULL, updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`, [productId]);
  await db.execute(`INSERT INTO ebay_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'update', ?, 'success', 'Admin activated corporate product')`, [userId, productId]);
  return true;
}

async function adminPauseCorporate(productId, userId) {
  await db.execute(`UPDATE ebay_corporate_products SET listing_status = 'paused', sync_status = 'pending',
    updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`, [productId]);
  await db.execute(`INSERT INTO ebay_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'update', ?, 'success', 'Admin paused corporate product')`, [userId, productId]);
  return true;
}

async function adminRejectCorporate(productId, userId, reason) {
  await db.execute(`UPDATE ebay_corporate_products SET listing_status = 'rejected', rejection_reason = ?, sync_status = 'pending',
    updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`, [reason || 'Product does not meet quality standards', productId]);
  await db.execute(`INSERT INTO ebay_sync_logs (user_id, sync_type, operation, reference_id, status, message)
    VALUES (?, 'product', 'delete', ?, 'success', ?)`, [userId, productId, `Admin rejected: ${reason}`]);
  return true;
}

async function adminUpdateCorporateProduct(productId, body) {
  const { corporate_title, corporate_description, corporate_price } = body;
  await db.execute(`UPDATE ebay_corporate_products SET corporate_title = COALESCE(?, corporate_title),
    corporate_description = COALESCE(?, corporate_description), corporate_price = COALESCE(?, corporate_price),
    sync_status = 'pending', updated_at = CURRENT_TIMESTAMP WHERE product_id = ?`,
    [corporate_title, corporate_description, corporate_price, productId]);
  return true;
}

module.exports = {
  oauthAuthorize, handleOAuthCallback, getShops, disconnectShop,
  listProducts, saveProduct, getInventory, updateInventoryAllocation, bulkAllocations, getLogs,
  syncProductToEbay, syncOrdersFromEbay, testConnection,
  adminListProducts, adminActivate, adminPause, adminUpdateProduct,
  saveCorporateProduct, getCorporateProduct, listCorporateProducts, removeCorporateProduct,
  adminListCorporateProducts, adminActivateCorporate, adminPauseCorporate, adminRejectCorporate, adminUpdateCorporateProduct
};
