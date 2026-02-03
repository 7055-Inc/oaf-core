/**
 * Media module - Context for media processing (event, product, user) (v2)
 */

const db = require('../../../../config/db');

async function getEventContext(eventId) {
  const [rows] = await db.query(
    `SELECT e.*, et.name as event_type_name, et.description as event_type_description
     FROM events e
     LEFT JOIN event_types et ON e.event_type_id = et.id
     WHERE e.id = ?`,
    [eventId]
  );
  return rows[0] || null;
}

async function getProductContext(productId, include = []) {
  const includes = Array.isArray(include) ? include : (include ? include.split(',').map(i => i.trim()) : []);
  const [product] = await db.query('SELECT * FROM products WHERE id = ?', [productId]);
  if (!product.length) return null;
  const requestedProduct = product[0];
  let parentProduct = null;
  let childProducts = [];

  if (requestedProduct.parent_id === null) {
    parentProduct = requestedProduct;
    if (requestedProduct.product_type === 'variable') {
      const [children] = await db.query(
        'SELECT * FROM products WHERE parent_id = ? AND status = ? ORDER BY name ASC',
        [requestedProduct.id, 'active']
      );
      childProducts = children;
    }
  } else {
    const [parent] = await db.query('SELECT * FROM products WHERE id = ?', [requestedProduct.parent_id]);
    if (!parent.length) return null;
    parentProduct = parent[0];
    const [siblings] = await db.query(
      'SELECT * FROM products WHERE parent_id = ? AND status = ? ORDER BY name ASC',
      [requestedProduct.parent_id, 'active']
    );
    childProducts = siblings;
  }

  const addRelatedData = async (productData) => {
    const response = { ...productData };
    if (includes.includes('inventory') || includes.length === 0) {
      const [inv] = await db.query('SELECT * FROM product_inventory WHERE product_id = ?', [productData.id]);
      response.inventory = inv[0] || { qty_on_hand: 0, qty_on_order: 0, qty_available: 0, reorder_qty: 0 };
    }
    if (includes.includes('images') || includes.length === 0) {
      const [tempImg] = await db.query(
        'SELECT image_path FROM pending_images WHERE image_path LIKE ? AND status = ?',
        [`/temp_images/products/${productData.vendor_id}-${productData.id}-%`, 'pending']
      );
      const [permImg] = await db.query(
        'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC',
        [productData.id]
      );
      response.images = [
        ...permImg.map(i => i.image_url),
        ...tempImg.map(i => i.image_path)
      ];
    }
    if (includes.includes('shipping') || includes.length === 0) {
      const [ship] = await db.query('SELECT * FROM product_shipping WHERE product_id = ?', [productData.id]);
      response.shipping = ship[0] || {};
    }
    if (includes.includes('categories')) {
      const [cat] = await db.query(
        `SELECT c.id, c.name, c.description FROM categories c
         JOIN product_categories pc ON c.id = pc.category_id WHERE pc.product_id = ?`,
        [productData.id]
      );
      response.categories = cat;
    }
    return response;
  };

  const processedParent = await addRelatedData(parentProduct);
  const processedChildren = await Promise.all(childProducts.map(child => addRelatedData(child)));
  if (includes.includes('vendor')) {
    const [vendor] = await db.query(
      `SELECT u.id, u.username, up.first_name, up.last_name, up.display_name, ap.business_name, ap.business_website
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       LEFT JOIN artist_profiles ap ON u.id = ap.user_id
       WHERE u.id = ?`,
      [parentProduct.vendor_id]
    );
    processedParent.vendor = vendor[0] || {};
  }

  return {
    ...processedParent,
    product_type: parentProduct.product_type,
    children: processedChildren,
    family_size: processedChildren.length,
    requested_product_id: parseInt(productId, 10),
    is_requested_product_parent: requestedProduct.parent_id === null
  };
}

async function getUserContext(userId) {
  const [user] = await db.query(
    'SELECT u.id, u.username, u.email_verified, u.status, u.user_type, up.* FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = ?',
    [userId]
  );
  if (!user[0] || user[0].status !== 'active') return null;
  const userData = user[0];
  if (userData.user_type === 'artist') {
    const [ap] = await db.query('SELECT * FROM artist_profiles WHERE user_id = ?', [userData.id]);
    Object.assign(userData, ap[0]);
  } else if (userData.user_type === 'community') {
    const [cp] = await db.query('SELECT * FROM community_profiles WHERE user_id = ?', [userData.id]);
    Object.assign(userData, cp[0]);
  } else if (userData.user_type === 'promoter') {
    const [pp] = await db.query('SELECT * FROM promoter_profiles WHERE user_id = ?', [userData.id]);
    Object.assign(userData, pp[0]);
  }
  return userData;
}

module.exports = {
  getEventContext,
  getProductContext,
  getUserContext
};
