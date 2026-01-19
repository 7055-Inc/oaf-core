/**
 * Category Service
 * Category operations for product organization
 */

const db = require('../../../../config/db');

/**
 * Find category by ID
 * @param {number} categoryId - Category ID
 * @returns {Promise<Object|null>}
 */
async function findById(categoryId) {
  const [categories] = await db.query(
    'SELECT * FROM categories WHERE id = ?',
    [categoryId]
  );
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

module.exports = {
  findById,
  list,
  getTree,
  getFlatList,
};
