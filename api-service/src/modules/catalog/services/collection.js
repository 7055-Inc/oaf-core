/**
 * Collection Service
 * User/vendor product collections (custom categories)
 */

const db = require('../../../../config/db');

/**
 * Find collection by ID
 * @param {number} collectionId - Collection ID
 * @returns {Promise<Object|null>}
 */
async function findById(collectionId) {
  const [collections] = await db.query(
    'SELECT * FROM user_categories WHERE id = ?',
    [collectionId]
  );
  return collections[0] || null;
}

/**
 * List collections for a user
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
async function listByUser(userId, options = {}) {
  const { parentId = undefined, includeProductCount = false } = options;

  let query = 'SELECT * FROM user_categories WHERE user_id = ?';
  const params = [userId];

  if (parentId !== undefined) {
    if (parentId === null) {
      query += ' AND parent_id IS NULL';
    } else {
      query += ' AND parent_id = ?';
      params.push(parentId);
    }
  }

  query += ' ORDER BY display_order ASC, name ASC';

  const [collections] = await db.query(query, params);

  if (includeProductCount) {
    for (const collection of collections) {
      const [countResult] = await db.query(
        'SELECT COUNT(*) as count FROM product_user_categories WHERE category_id = ?',
        [collection.id]
      );
      collection.product_count = countResult[0].count;
    }
  }

  return collections;
}

/**
 * Get collection tree for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>}
 */
async function getTreeByUser(userId) {
  const allCollections = await listByUser(userId, { includeProductCount: true });

  // Build tree
  const collectionMap = new Map();
  const roots = [];

  // First pass: create map
  for (const col of allCollections) {
    collectionMap.set(col.id, { ...col, children: [] });
  }

  // Second pass: build hierarchy
  for (const col of allCollections) {
    const colNode = collectionMap.get(col.id);
    if (col.parent_id && collectionMap.has(col.parent_id)) {
      collectionMap.get(col.parent_id).children.push(colNode);
    } else {
      roots.push(colNode);
    }
  }

  return roots;
}

/**
 * Create a new collection
 * @param {number} userId - User ID
 * @param {Object} data - Collection data
 * @returns {Promise<Object>}
 */
async function create(userId, data) {
  const {
    name,
    description = '',
    parent_id = null,
    display_order = 0,
    slug = null
  } = data;

  if (!name) {
    throw new Error('Collection name is required');
  }

  // Generate slug if not provided
  const collectionSlug = slug || name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  // Check for duplicate name at same level
  let duplicateQuery = 'SELECT id FROM user_categories WHERE user_id = ? AND name = ?';
  const duplicateParams = [userId, name];
  
  if (parent_id) {
    duplicateQuery += ' AND parent_id = ?';
    duplicateParams.push(parent_id);
  } else {
    duplicateQuery += ' AND parent_id IS NULL';
  }

  const [existing] = await db.query(duplicateQuery, duplicateParams);
  if (existing.length > 0) {
    throw new Error('A collection with this name already exists');
  }

  const [result] = await db.query(
    `INSERT INTO user_categories (user_id, name, description, parent_id, display_order, slug)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, name, description, parent_id, display_order, collectionSlug]
  );

  return findById(result.insertId);
}

/**
 * Update a collection
 * @param {number} collectionId - Collection ID
 * @param {number} userId - User ID (for ownership check)
 * @param {Object} data - Updated fields
 * @returns {Promise<Object>}
 */
async function update(collectionId, userId, data) {
  const collection = await findById(collectionId);
  
  if (!collection) {
    throw new Error('Collection not found');
  }
  
  if (collection.user_id !== userId) {
    throw new Error('Not authorized to update this collection');
  }

  const {
    name,
    description,
    parent_id,
    display_order,
    slug
  } = data;

  const updates = [];
  const values = [];

  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }
  if (parent_id !== undefined) {
    updates.push('parent_id = ?');
    values.push(parent_id);
  }
  if (display_order !== undefined) {
    updates.push('display_order = ?');
    values.push(display_order);
  }
  if (slug !== undefined) {
    updates.push('slug = ?');
    values.push(slug);
  }

  if (updates.length > 0) {
    updates.push('updated_at = NOW()');
    values.push(collectionId);

    await db.query(
      `UPDATE user_categories SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  return findById(collectionId);
}

/**
 * Update display order for multiple collections
 * @param {number} userId - User ID
 * @param {Array} orderUpdates - Array of {id, display_order}
 */
async function updateOrder(userId, orderUpdates) {
  for (const { id, display_order } of orderUpdates) {
    await db.query(
      'UPDATE user_categories SET display_order = ? WHERE id = ? AND user_id = ?',
      [display_order, id, userId]
    );
  }
}

/**
 * Delete a collection
 * @param {number} collectionId - Collection ID
 * @param {number} userId - User ID (for ownership check)
 */
async function remove(collectionId, userId) {
  const collection = await findById(collectionId);
  
  if (!collection) {
    throw new Error('Collection not found');
  }
  
  if (collection.user_id !== userId) {
    throw new Error('Not authorized to delete this collection');
  }

  // Remove product associations
  await db.query(
    'DELETE FROM product_user_categories WHERE category_id = ?',
    [collectionId]
  );

  // Update children to have no parent (promote to root level)
  await db.query(
    'UPDATE user_categories SET parent_id = NULL WHERE parent_id = ?',
    [collectionId]
  );

  // Delete the collection
  await db.query(
    'DELETE FROM user_categories WHERE id = ?',
    [collectionId]
  );

  return { deleted: true };
}

/**
 * Get products in a collection
 * @param {number} collectionId - Collection ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
async function getProducts(collectionId, options = {}) {
  const { page = 1, limit = 50 } = options;
  const offset = (page - 1) * limit;

  const [products] = await db.query(
    `SELECT p.*, puc.display_order as collection_order
     FROM products p
     JOIN product_user_categories puc ON p.id = puc.product_id
     WHERE puc.category_id = ? AND p.status != 'deleted'
     ORDER BY puc.display_order ASC
     LIMIT ? OFFSET ?`,
    [collectionId, limit, offset]
  );

  return products;
}

/**
 * Add product to collection
 * @param {number} collectionId - Collection ID
 * @param {number} productId - Product ID
 * @param {number} userId - User ID (for ownership check)
 */
async function addProduct(collectionId, productId, userId) {
  const collection = await findById(collectionId);
  
  if (!collection) {
    throw new Error('Collection not found');
  }
  
  if (collection.user_id !== userId) {
    throw new Error('Not authorized to modify this collection');
  }

  // Check if already in collection
  const [existing] = await db.query(
    'SELECT id FROM product_user_categories WHERE category_id = ? AND product_id = ?',
    [collectionId, productId]
  );

  if (existing.length > 0) {
    return { added: false, message: 'Product already in collection' };
  }

  // Get max display order
  const [maxOrder] = await db.query(
    'SELECT MAX(display_order) as max_order FROM product_user_categories WHERE category_id = ?',
    [collectionId]
  );

  const displayOrder = (maxOrder[0].max_order || 0) + 1;

  await db.query(
    'INSERT INTO product_user_categories (category_id, product_id, display_order) VALUES (?, ?, ?)',
    [collectionId, productId, displayOrder]
  );

  return { added: true };
}

/**
 * Remove product from collection
 * @param {number} collectionId - Collection ID
 * @param {number} productId - Product ID
 * @param {number} userId - User ID (for ownership check)
 */
async function removeProduct(collectionId, productId, userId) {
  const collection = await findById(collectionId);
  
  if (!collection) {
    throw new Error('Collection not found');
  }
  
  if (collection.user_id !== userId) {
    throw new Error('Not authorized to modify this collection');
  }

  await db.query(
    'DELETE FROM product_user_categories WHERE category_id = ? AND product_id = ?',
    [collectionId, productId]
  );

  return { removed: true };
}

module.exports = {
  findById,
  listByUser,
  getTreeByUser,
  create,
  update,
  updateOrder,
  remove,
  getProducts,
  addProduct,
  removeProduct,
};
