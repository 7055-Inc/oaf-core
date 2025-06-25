const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const authenticateToken = require('../middleware/jwt');

/**
 * Middleware to verify admin access
 */
const requireAdmin = (req, res, next) => {
  if (req.user.user_type !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * Get all categories with hierarchical structure
 * GET /api/categories
 */
router.get('/', async (req, res) => {
  try {
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

    res.json({
      success: true,
      categories: rootCategories,
      flat_categories: categories
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * Get a single category by ID
 * GET /api/categories/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
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
    `, [id]);

    if (categories.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Get child categories
    const [children] = await db.query(`
      SELECT id, name, description
      FROM categories 
      WHERE parent_id = ?
      ORDER BY name ASC
    `, [id]);

    // Get parent categories (breadcrumb)
    const breadcrumb = [];
    let currentParentId = categories[0].parent_id;
    while (currentParentId) {
      const [parent] = await db.query('SELECT id, name FROM categories WHERE id = ?', [currentParentId]);
      if (parent.length > 0) {
        breadcrumb.unshift(parent[0]);
        currentParentId = parent[0].parent_id;
      } else {
        break;
      }
    }

    res.json({
      success: true,
      category: {
        ...categories[0],
        children,
        breadcrumb
      }
    });

  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

/**
 * Create a new category
 * POST /api/categories
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, parent_id, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check if category name already exists
    const [existing] = await db.query('SELECT id FROM categories WHERE name = ?', [name]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Category name already exists' });
    }

    // Validate parent_id if provided
    if (parent_id) {
      const [parent] = await db.query('SELECT id FROM categories WHERE id = ?', [parent_id]);
      if (parent.length === 0) {
        return res.status(400).json({ error: 'Parent category not found' });
      }
    }

    const [result] = await db.query(
      'INSERT INTO categories (name, parent_id, description) VALUES (?, ?, ?)',
      [name, parent_id || null, description || null]
    );

    const [newCategory] = await db.query(`
      SELECT 
        c.id,
        c.name,
        c.parent_id,
        c.description,
        p.name as parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = ?
    `, [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category: newCategory[0]
    });

  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

/**
 * Update a category
 * PUT /api/categories/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parent_id, description } = req.body;

    // Check if category exists
    const [existing] = await db.query('SELECT id, name FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if new name conflicts with existing category (excluding current category)
    if (name && name !== existing[0].name) {
      const [nameConflict] = await db.query('SELECT id FROM categories WHERE name = ? AND id != ?', [name, id]);
      if (nameConflict.length > 0) {
        return res.status(400).json({ error: 'Category name already exists' });
      }
    }

    // Validate parent_id if provided
    if (parent_id !== undefined) {
      if (parent_id === parseInt(id)) {
        return res.status(400).json({ error: 'Category cannot be its own parent' });
      }
      
      if (parent_id) {
        const [parent] = await db.query('SELECT id FROM categories WHERE id = ?', [parent_id]);
        if (parent.length === 0) {
          return res.status(400).json({ error: 'Parent category not found' });
        }
        
        // Check for circular reference
        let currentParentId = parent_id;
        while (currentParentId) {
          if (currentParentId === parseInt(id)) {
            return res.status(400).json({ error: 'Cannot create circular reference in category hierarchy' });
          }
          const [parentCheck] = await db.query('SELECT parent_id FROM categories WHERE id = ?', [currentParentId]);
          currentParentId = parentCheck.length > 0 ? parentCheck[0].parent_id : null;
        }
      }
    }

    // Update category
    await db.query(
      'UPDATE categories SET name = ?, parent_id = ?, description = ? WHERE id = ?',
      [name || existing[0].name, parent_id !== undefined ? parent_id : existing[0].parent_id, description, id]
    );

    const [updatedCategory] = await db.query(`
      SELECT 
        c.id,
        c.name,
        c.parent_id,
        c.description,
        p.name as parent_name
      FROM categories c
      LEFT JOIN categories p ON c.parent_id = p.id
      WHERE c.id = ?
    `, [id]);

    res.json({
      success: true,
      message: 'Category updated successfully',
      category: updatedCategory[0]
    });

  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

/**
 * Delete a category
 * DELETE /api/categories/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const [category] = await db.query('SELECT id, name FROM categories WHERE id = ?', [id]);
    if (category.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category has children
    const [children] = await db.query('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?', [id]);
    if (children[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with subcategories. Please move or delete subcategories first.' 
      });
    }

    // Check if category has products
    const [products] = await db.query('SELECT COUNT(*) as count FROM product_categories WHERE category_id = ?', [id]);
    if (products[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with products. Please reassign or delete products first.' 
      });
    }

    // Check if category is used as primary category in products
    const [primaryProducts] = await db.query('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id]);
    if (primaryProducts[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category that is used as primary category for products. Please reassign products first.' 
      });
    }

    // Delete the category
    await db.query('DELETE FROM categories WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

/**
 * Get categories for product assignment (simplified list)
 * GET /api/categories/for-products
 */
router.get('/for-products', async (req, res) => {
  try {
    const [categories] = await db.query(`
      SELECT 
        id,
        name,
        parent_id,
        (SELECT COUNT(*) FROM categories WHERE parent_id = c.id) as has_children
      FROM categories c
      ORDER BY name ASC
    `);

    res.json({
      success: true,
      categories
    });

  } catch (error) {
    console.error('Error fetching categories for products:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

module.exports = router; 