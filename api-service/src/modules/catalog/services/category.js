/**
 * Category Service
 * Full category management for product organization
 * 
 * Handles:
 * - Category CRUD with hierarchical structure
 * - Category content (hero images, banners, descriptions)
 * - Category SEO (meta tags, structured data)
 * - Product associations
 * - Change logging
 */

const db = require('../../../../config/db');

// =============================================================================
// CATEGORY CRUD
// =============================================================================

/**
 * Find category by ID
 * @param {number} categoryId - Category ID
 * @returns {Promise<Object|null>}
 */
async function findById(categoryId) {
  const [categories] = await db.query(`
    SELECT 
      c.id,
      c.name,
      c.parent_id,
      c.description,
      p.name as parent_name,
      (SELECT COUNT(*) FROM categories WHERE parent_id = c.id) as child_count,
      (SELECT COUNT(*) FROM product_categories WHERE category_id = c.id) as product_count
    FROM categories c
    LEFT JOIN categories p ON c.parent_id = p.id
    WHERE c.id = ?
  `, [categoryId]);
  return categories[0] || null;
}

/**
 * List all categories
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
async function list(options = {}) {
  const { parentId = null, includeProductCount = false } = options;

  let query = 'SELECT * FROM categories';
  const params = [];

  if (parentId !== undefined) {
    if (parentId === null) {
      query += ' WHERE parent_id IS NULL';
    } else {
      query += ' WHERE parent_id = ?';
      params.push(parentId);
    }
  }

  query += ' ORDER BY name ASC';

  const [categories] = await db.query(query, params);

  if (includeProductCount) {
    for (const cat of categories) {
      const [countResult] = await db.query(
        "SELECT COUNT(*) as count FROM products WHERE category_id = ? AND status = 'active'",
        [cat.id]
      );
      cat.product_count = countResult[0].count;
    }
  }

  return categories;
}

/**
 * Get all categories with hierarchical structure and flat list
 * @returns {Promise<{categories: Array, flat_categories: Array}>}
 */
async function getAll() {
  const [categories] = await db.query(`
    SELECT 
      c.id,
      c.name,
      c.parent_id,
      c.description,
      p.name as parent_name,
      (SELECT COUNT(*) FROM categories WHERE parent_id = c.id) as child_count,
      (SELECT COUNT(*) FROM product_categories WHERE category_id = c.id) as product_count
    FROM categories c
    LEFT JOIN categories p ON c.parent_id = p.id
    ORDER BY c.parent_id IS NULL DESC, c.name ASC
  `);

  // Build hierarchical structure
  const categoryMap = {};
  const rootCategories = [];

  // First pass: create map of all categories
  categories.forEach(category => {
    categoryMap[category.id] = {
      ...category,
      children: []
    };
  });

  // Second pass: build hierarchy
  categories.forEach(category => {
    if (category.parent_id === null) {
      rootCategories.push(categoryMap[category.id]);
    } else {
      if (categoryMap[category.parent_id]) {
        categoryMap[category.parent_id].children.push(categoryMap[category.id]);
      }
    }
  });

  return {
    categories: rootCategories,
    flat_categories: categories
  };
}

/**
 * Get category tree (hierarchical)
 * @returns {Promise<Array>}
 */
async function getTree() {
  const [allCategories] = await db.query(
    'SELECT * FROM categories ORDER BY name ASC'
  );

  // Build tree
  const categoryMap = new Map();
  const roots = [];

  // First pass: create map
  for (const cat of allCategories) {
    categoryMap.set(cat.id, { ...cat, children: [] });
  }

  // Second pass: build hierarchy
  for (const cat of allCategories) {
    const catNode = categoryMap.get(cat.id);
    if (cat.parent_id && categoryMap.has(cat.parent_id)) {
      categoryMap.get(cat.parent_id).children.push(catNode);
    } else {
      roots.push(catNode);
    }
  }

  return roots;
}

/**
 * Get flattened categories with depth indicator
 * @returns {Promise<Array>}
 */
async function getFlatList() {
  const tree = await getTree();
  const flat = [];

  function flatten(categories, depth = 0) {
    for (const cat of categories) {
      flat.push({
        id: cat.id,
        name: cat.name,
        depth,
        displayName: '—'.repeat(depth) + (depth > 0 ? ' ' : '') + cat.name,
        parent_id: cat.parent_id
      });
      if (cat.children && cat.children.length > 0) {
        flatten(cat.children, depth + 1);
      }
    }
  }

  flatten(tree);
  return flat;
}

/**
 * Create a new category
 * @param {Object} data - Category data
 * @param {number} userId - Creating user ID
 * @returns {Promise<Object>}
 */
async function create(data, userId) {
  const { name, parent_id, description } = data;

  if (!name) {
    throw new Error('Category name is required');
  }

  // Check if category name already exists
  const [existing] = await db.query('SELECT id FROM categories WHERE name = ?', [name]);
  if (existing.length > 0) {
    throw new Error('Category name already exists');
  }

  // Validate parent_id if provided
  if (parent_id) {
    const [parent] = await db.query('SELECT id FROM categories WHERE id = ?', [parent_id]);
    if (parent.length === 0) {
      throw new Error('Parent category not found');
    }
  }

  const [result] = await db.query(
    'INSERT INTO categories (name, parent_id, description) VALUES (?, ?, ?)',
    [name, parent_id || null, description || null]
  );

  const categoryId = result.insertId;

  // Log the change
  await logChange(categoryId, 'create', null, data, userId);

  return findById(categoryId);
}

/**
 * Update a category
 * @param {number} categoryId - Category ID
 * @param {Object} data - Update data
 * @param {number} userId - Updating user ID
 * @returns {Promise<Object>}
 */
async function update(categoryId, data, userId) {
  const { name, parent_id, description } = data;

  // Check if category exists
  const [existing] = await db.query('SELECT id, name, parent_id, description FROM categories WHERE id = ?', [categoryId]);
  if (existing.length === 0) {
    throw new Error('Category not found');
  }

  const beforeState = existing[0];

  // Check if new name conflicts with existing category (excluding current)
  if (name && name !== existing[0].name) {
    const [nameConflict] = await db.query('SELECT id FROM categories WHERE name = ? AND id != ?', [name, categoryId]);
    if (nameConflict.length > 0) {
      throw new Error('Category name already exists');
    }
  }

  // Validate parent_id if provided
  if (parent_id !== undefined) {
    if (parent_id === parseInt(categoryId)) {
      throw new Error('Category cannot be its own parent');
    }
    
    if (parent_id) {
      const [parent] = await db.query('SELECT id FROM categories WHERE id = ?', [parent_id]);
      if (parent.length === 0) {
        throw new Error('Parent category not found');
      }
      
      // Check for circular reference
      let currentParentId = parent_id;
      while (currentParentId) {
        if (currentParentId === parseInt(categoryId)) {
          throw new Error('Cannot create circular reference in category hierarchy');
        }
        const [parentCheck] = await db.query('SELECT parent_id FROM categories WHERE id = ?', [currentParentId]);
        currentParentId = parentCheck.length > 0 ? parentCheck[0].parent_id : null;
      }
    }
  }

  // Update category
  await db.query(
    'UPDATE categories SET name = ?, parent_id = ?, description = ? WHERE id = ?',
    [name || existing[0].name, parent_id !== undefined ? parent_id : existing[0].parent_id, description, categoryId]
  );

  // Log the change
  await logChange(categoryId, 'update', beforeState, data, userId);

  return findById(categoryId);
}

/**
 * Delete a category
 * @param {number} categoryId - Category ID
 * @param {number} userId - Deleting user ID
 * @returns {Promise<void>}
 */
async function remove(categoryId, userId) {
  // Check if category exists
  const [category] = await db.query('SELECT id, name, parent_id, description FROM categories WHERE id = ?', [categoryId]);
  if (category.length === 0) {
    throw new Error('Category not found');
  }

  const beforeState = category[0];

  // Check if category has children
  const [children] = await db.query('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?', [categoryId]);
  if (children[0].count > 0) {
    throw new Error('Cannot delete category with subcategories. Please move or delete subcategories first.');
  }

  // Check if category has products
  const [products] = await db.query('SELECT COUNT(*) as count FROM product_categories WHERE category_id = ?', [categoryId]);
  if (products[0].count > 0) {
    throw new Error('Cannot delete category with products. Please reassign or delete products first.');
  }

  // Check if category is used as primary category in products
  const [primaryProducts] = await db.query('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [categoryId]);
  if (primaryProducts[0].count > 0) {
    throw new Error('Cannot delete category that is used as primary category for products. Please reassign products first.');
  }

  // Delete the category
  await db.query('DELETE FROM categories WHERE id = ?', [categoryId]);

  // Log the change
  await logChange(categoryId, 'delete', beforeState, null, userId);
}

// =============================================================================
// CATEGORY CONTENT
// =============================================================================

/**
 * Get category content
 * @param {number} categoryId - Category ID
 * @returns {Promise<Object|null>}
 */
async function getContent(categoryId) {
  const [rows] = await db.query('SELECT * FROM category_content WHERE category_id = ?', [categoryId]);
  return rows[0] || null;
}

/**
 * Update category content
 * @param {number} categoryId - Category ID
 * @param {Object} data - Content data
 * @param {number} userId - Updating user ID
 * @returns {Promise<Object>}
 */
async function updateContent(categoryId, data, userId) {
  const { hero_image, description, banner, featured_products, featured_artists } = data;
  
  // Get before state
  const [beforeRows] = await db.query('SELECT * FROM category_content WHERE category_id = ?', [categoryId]);
  
  if (beforeRows.length === 0) {
    // Insert
    await db.query(
      'INSERT INTO category_content (category_id, hero_image, description, banner, featured_products, featured_artists, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [categoryId, hero_image, description, banner, featured_products, featured_artists, userId]
    );
    await logChange(categoryId, 'create', null, { type: 'content', ...data }, userId);
  } else {
    // Update
    await db.query(
      'UPDATE category_content SET hero_image=?, description=?, banner=?, featured_products=?, featured_artists=?, updated_by=? WHERE category_id=?',
      [hero_image, description, banner, featured_products, featured_artists, userId, categoryId]
    );
    await logChange(categoryId, 'update', { type: 'content', ...beforeRows[0] }, { type: 'content', ...data }, userId);
  }
  
  return getContent(categoryId);
}

// =============================================================================
// CATEGORY SEO
// =============================================================================

/**
 * Get category SEO data
 * @param {number} categoryId - Category ID
 * @returns {Promise<Object|null>}
 */
async function getSeo(categoryId) {
  const [rows] = await db.query('SELECT * FROM category_seo WHERE category_id = ?', [categoryId]);
  return rows[0] || null;
}

/**
 * Update category SEO data
 * @param {number} categoryId - Category ID
 * @param {Object} data - SEO data
 * @param {number} userId - Updating user ID
 * @returns {Promise<Object>}
 */
async function updateSeo(categoryId, data, userId) {
  const { meta_title, meta_description, meta_keywords, canonical_url, json_ld } = data;
  
  // Get before state
  const [beforeRows] = await db.query('SELECT * FROM category_seo WHERE category_id = ?', [categoryId]);
  
  if (beforeRows.length === 0) {
    // Insert
    await db.query(
      'INSERT INTO category_seo (category_id, meta_title, meta_description, meta_keywords, canonical_url, json_ld, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [categoryId, meta_title, meta_description, meta_keywords, canonical_url, json_ld, userId]
    );
    await logChange(categoryId, 'create', null, { type: 'seo', ...data }, userId);
  } else {
    // Update
    await db.query(
      'UPDATE category_seo SET meta_title=?, meta_description=?, meta_keywords=?, canonical_url=?, json_ld=?, updated_by=? WHERE category_id=?',
      [meta_title, meta_description, meta_keywords, canonical_url, json_ld, userId, categoryId]
    );
    await logChange(categoryId, 'update', { type: 'seo', ...beforeRows[0] }, { type: 'seo', ...data }, userId);
  }
  
  return getSeo(categoryId);
}

// =============================================================================
// CATEGORY PRODUCTS
// =============================================================================

/**
 * Get products in a category
 * @param {number} categoryId - Category ID
 * @returns {Promise<Array>}
 */
async function getProducts(categoryId) {
  const [products] = await db.query(`
    SELECT 
      p.id, 
      p.name, 
      p.sku,
      p.price,
      p.status,
      u.username as vendor_username,
      (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY \`order\` ASC LIMIT 1) as image_url
    FROM product_categories pc
    JOIN products p ON pc.product_id = p.id
    JOIN users u ON p.vendor_id = u.id
    WHERE pc.category_id = ?
    ORDER BY p.name ASC
  `, [categoryId]);
  
  return products;
}

/**
 * Add a product to a category
 * @param {number} categoryId - Category ID
 * @param {number} productId - Product ID
 * @param {number} userId - User ID for logging
 * @returns {Promise<Object>}
 */
async function addProduct(categoryId, productId, userId) {
  // Check if category exists
  const [category] = await db.query('SELECT id, name FROM categories WHERE id = ?', [categoryId]);
  if (category.length === 0) {
    throw new Error('Category not found');
  }
  
  // Check if product exists
  const [product] = await db.query('SELECT id, name FROM products WHERE id = ?', [productId]);
  if (product.length === 0) {
    throw new Error('Product not found');
  }
  
  // Check if already associated
  const [existing] = await db.query(
    'SELECT product_id FROM product_categories WHERE category_id = ? AND product_id = ?', 
    [categoryId, productId]
  );
  if (existing.length > 0) {
    throw new Error('Product is already in this category');
  }
  
  // Add the association
  await db.query(
    'INSERT INTO product_categories (category_id, product_id) VALUES (?, ?)',
    [categoryId, productId]
  );
  
  // Log the change
  await logChange(categoryId, 'update', null, { action: 'add_product', product_id: productId, product_name: product[0].name }, userId);
  
  return {
    success: true,
    message: `Added "${product[0].name}" to category "${category[0].name}"`
  };
}

/**
 * Remove a product from a category
 * @param {number} categoryId - Category ID
 * @param {number} productId - Product ID
 * @param {number} userId - User ID for logging
 * @returns {Promise<Object>}
 */
async function removeProduct(categoryId, productId, userId) {
  // Check if association exists
  const [existing] = await db.query(
    'SELECT p.name as product_name, c.name as category_name FROM product_categories pc JOIN products p ON pc.product_id = p.id JOIN categories c ON pc.category_id = c.id WHERE pc.category_id = ? AND pc.product_id = ?',
    [categoryId, productId]
  );
  if (existing.length === 0) {
    throw new Error('Product not found in this category');
  }
  
  // Remove the association
  await db.query(
    'DELETE FROM product_categories WHERE category_id = ? AND product_id = ?',
    [categoryId, productId]
  );
  
  // Log the change
  await logChange(categoryId, 'update', { action: 'remove_product', product_id: productId, product_name: existing[0].product_name }, null, userId);
  
  return {
    success: true,
    message: `Removed "${existing[0].product_name}" from category "${existing[0].category_name}"`
  };
}

// =============================================================================
// SEARCH
// =============================================================================

/**
 * Search products for adding to categories
 * @param {string} query - Search query
 * @param {number} excludeCategoryId - Category to exclude products from
 * @param {number} limit - Result limit
 * @returns {Promise<Array>}
 */
async function searchProducts(query, excludeCategoryId = null, limit = 20) {
  if (!query || query.length < 2) {
    return [];
  }
  
  const searchTerm = `%${query}%`;
  let sql = `
    SELECT 
      p.id, 
      p.name, 
      p.sku,
      p.price,
      p.status,
      u.username as vendor_username,
      (SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY \`order\` ASC LIMIT 1) as image_url
    FROM products p
    JOIN users u ON p.vendor_id = u.id
    WHERE (p.name LIKE ? OR p.sku LIKE ?)
      AND p.parent_id IS NULL
  `;
  const params = [searchTerm, searchTerm];
  
  // Exclude products already in the specified category
  if (excludeCategoryId) {
    sql += ` AND p.id NOT IN (SELECT product_id FROM product_categories WHERE category_id = ?)`;
    params.push(excludeCategoryId);
  }
  
  sql += ` ORDER BY p.name ASC LIMIT ?`;
  params.push(parseInt(limit));
  
  const [products] = await db.query(sql, params);
  return products;
}

/**
 * Search vendors for featuring in categories
 * @param {string} query - Search query
 * @param {number} limit - Result limit
 * @returns {Promise<Array>}
 */
async function searchVendors(query, limit = 20) {
  if (!query || query.length < 2) {
    return [];
  }
  
  const searchTerm = `%${query}%`;
  const [vendors] = await db.query(`
    SELECT 
      u.id,
      u.username,
      u.status,
      up.display_name,
      up.first_name,
      up.last_name,
      up.profile_image_path,
      (SELECT COUNT(*) FROM products WHERE vendor_id = u.id AND status = 'active') as product_count
    FROM users u
    JOIN user_permissions perm ON u.id = perm.user_id AND perm.vendor = 1
    LEFT JOIN user_profiles up ON u.id = up.user_id
    WHERE u.status = 'active'
      AND (
        u.username LIKE ? 
        OR up.display_name LIKE ? 
        OR up.first_name LIKE ? 
        OR up.last_name LIKE ?
        OR CONCAT(COALESCE(up.first_name, ''), ' ', COALESCE(up.last_name, '')) LIKE ?
      )
    ORDER BY COALESCE(up.display_name, u.username) ASC
    LIMIT ?
  `, [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, parseInt(limit)]);
  
  return vendors;
}

// =============================================================================
// CHANGE LOG
// =============================================================================

/**
 * Get category change log
 * @param {number} limit - Number of records
 * @param {number} offset - Offset
 * @returns {Promise<Array>}
 */
async function getChangeLog(limit = 50, offset = 0) {
  const [logs] = await db.query(`
    SELECT 
      cl.id,
      cl.category_id,
      cl.action,
      cl.old_values,
      cl.new_values,
      cl.admin_id,
      cl.created_at,
      u.username as admin_username,
      c.name as category_name
    FROM category_change_log cl
    JOIN users u ON cl.admin_id = u.id
    LEFT JOIN categories c ON cl.category_id = c.id
    ORDER BY cl.created_at DESC
    LIMIT ? OFFSET ?
  `, [parseInt(limit), parseInt(offset)]);
  
  return logs.map(log => ({
    ...log,
    old_values: log.old_values ? JSON.parse(log.old_values) : null,
    new_values: log.new_values ? JSON.parse(log.new_values) : null
  }));
}

/**
 * Log a category change
 * @param {number} categoryId - Category ID
 * @param {string} action - Action type (create, update, delete)
 * @param {Object} before - Before state
 * @param {Object} after - After state
 * @param {number} userId - User making the change
 */
async function logChange(categoryId, action, before, after, userId) {
  await db.query(
    'INSERT INTO category_change_log (category_id, action, old_values, new_values, admin_id) VALUES (?, ?, ?, ?, ?)',
    [categoryId, action, before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null, userId]
  );
}

module.exports = {
  // CRUD
  findById,
  list,
  getAll,
  getTree,
  getFlatList,
  create,
  update,
  remove,
  // Content
  getContent,
  updateContent,
  // SEO
  getSeo,
  updateSeo,
  // Products
  getProducts,
  addProduct,
  removeProduct,
  // Search
  searchProducts,
  searchVendors,
  // Change log
  getChangeLog,
};
