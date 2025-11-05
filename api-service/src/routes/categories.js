const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');
const { secureLogger } = require('../middleware/secureLogger');
const upload = require('../config/multer');

/**
 * @fileoverview Category management routes
 * 
 * Handles comprehensive category management functionality including:
 * - Hierarchical category structure with parent-child relationships
 * - Category CRUD operations with validation and circular reference prevention
 * - Category content management (hero images, descriptions, banners)
 * - Category SEO management (meta tags, structured data)
 * - Change logging and audit trail for all category operations
 * - Product association tracking and constraint enforcement
 * 
 * All administrative operations require proper authentication and permissions.
 * Public endpoints provide read-only access to category data.
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

/**
 * Get all categories with hierarchical structure
 * @route GET /api/categories
 * @access Public
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Hierarchical and flat category structures with counts
 * @description Retrieves all categories in both hierarchical tree and flat array formats with product/child counts
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
    secureLogger.error('Error fetching categories', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

/**
 * Get category change log (admin)
 * @route GET /api/categories/change-log
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {number} req.query.limit - Number of records to return (default: 50)
 * @param {number} req.query.offset - Number of records to skip (default: 0)
 * @param {Object} res - Express response object
 * @returns {Object} Paginated change log with admin and category information
 * @description Retrieves audit trail of all category changes with admin details and JSON parsing
 */
router.get('/change-log', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
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
    
    res.json({ 
      success: true, 
      logs: logs.map(log => ({
        ...log,
        old_values: log.old_values ? JSON.parse(log.old_values) : null,
        new_values: log.new_values ? JSON.parse(log.new_values) : null
      }))
    });
  } catch (error) {
    console.error('Error fetching category change log:', error);
    res.status(500).json({ error: 'Failed to fetch category change log' });
  }
});

/**
 * Get single category by ID
 * @route GET /api/categories/:id
 * @access Public
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Category ID
 * @param {Object} res - Express response object
 * @returns {Object} Complete category details with children and breadcrumb navigation
 * @description Retrieves detailed category information including child categories and parent breadcrumb
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
    secureLogger.error('Error fetching category', error);
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

/**
 * Create new category
 * @route POST /api/categories
 * @access Private (requires authentication)
 * @param {Object} req - Express request object
 * @param {string} req.body.name - Category name (required)
 * @param {number} req.body.parent_id - Parent category ID (optional)
 * @param {string} req.body.description - Category description (optional)
 * @param {Object} res - Express response object
 * @returns {Object} Created category with parent information
 * @description Creates new category with validation, uniqueness checking, and change logging
 */
router.post('/', verifyToken, async (req, res) => {
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

    const category_id = result.insertId;
    const updated_by = req.user.userId || req.user.id;

    // Log the change
    await db.query('INSERT INTO category_change_log (category_id, action, before_json, after_json, changed_by) VALUES (?, ?, ?, ?, ?)', 
      [category_id, 'create', null, JSON.stringify(req.body), updated_by]);

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
    secureLogger.error('Error creating category', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

/**
 * Update category
 * @route PUT /api/categories/:id
 * @access Private (requires authentication)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Category ID
 * @param {string} req.body.name - Category name (optional)
 * @param {number} req.body.parent_id - Parent category ID (optional)
 * @param {string} req.body.description - Category description (optional)
 * @param {Object} res - Express response object
 * @returns {Object} Updated category with parent information
 * @description Updates category with circular reference prevention and change logging
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parent_id, description } = req.body;

    // Check if category exists
    const [existing] = await db.query('SELECT id, name, parent_id, description FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Store the before state for logging
    const beforeState = existing[0];

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

    // Log the change
    await db.query('INSERT INTO category_change_log (category_id, action, before_json, after_json, changed_by) VALUES (?, ?, ?, ?, ?)', [id, 'update', JSON.stringify(beforeState), JSON.stringify(req.body), req.user.id]);

    res.json({
      success: true,
      message: 'Category updated successfully',
      category: updatedCategory[0]
    });

  } catch (error) {
    secureLogger.error('Error updating category', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

/**
 * Delete category
 * @route DELETE /api/categories/:id
 * @access Private (requires authentication)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Category ID
 * @param {Object} res - Express response object
 * @returns {Object} Deletion success message
 * @description Deletes category with constraint checking (no children/products) and change logging
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const [category] = await db.query('SELECT id, name, parent_id, description FROM categories WHERE id = ?', [id]);
    if (category.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Store the before state for logging
    const beforeState = category[0];

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

    // Log the change
    await db.query('INSERT INTO category_change_log (category_id, action, before_json, after_json, changed_by) VALUES (?, ?, ?, ?, ?)', 
      [id, 'delete', JSON.stringify(beforeState), null, req.user.userId || req.user.id]);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    secureLogger.error('Error deleting category', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

/**
 * Get category content
 * @route GET /api/categories/content/:category_id
 * @access Public
 * @param {Object} req - Express request object
 * @param {string} req.params.category_id - Category ID
 * @param {Object} res - Express response object
 * @returns {Object} Category content including hero image, description, banner, featured items
 * @description Retrieves category content for display purposes
 */
router.get('/content/:category_id', async (req, res) => {
  try {
    const { category_id } = req.params;
    const [rows] = await db.query('SELECT * FROM category_content WHERE category_id = ?', [category_id]);
    res.json({ success: true, content: rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch category content' });
  }
});

/**
 * Create/update category content
 * @route POST /api/categories/content/:category_id
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.category_id - Category ID
 * @param {string} req.body.hero_image - Hero image URL (optional)
 * @param {string} req.body.description - Category description (optional)
 * @param {string} req.body.banner - Banner content (optional)
 * @param {string} req.body.featured_products - Featured products JSON (optional)
 * @param {string} req.body.featured_artists - Featured artists JSON (optional)
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation
 * @description Creates or updates category content with change logging
 */
router.post('/content/:category_id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { category_id } = req.params;
    const { hero_image, description, banner, featured_products, featured_artists } = req.body;
    const updated_by = req.user.id;
    // Get before state
    const [beforeRows] = await db.query('SELECT * FROM category_content WHERE category_id = ?', [category_id]);
    if (beforeRows.length === 0) {
      // Insert
      await db.query(
        'INSERT INTO category_content (category_id, hero_image, description, banner, featured_products, featured_artists, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [category_id, hero_image, description, banner, featured_products, featured_artists, updated_by]
      );
      await db.query('INSERT INTO category_change_log (category_id, action, before_json, after_json, changed_by) VALUES (?, ?, ?, ?, ?)', [category_id, 'create', null, JSON.stringify(req.body), updated_by]);
    } else {
      // Update
      await db.query(
        'UPDATE category_content SET hero_image=?, description=?, banner=?, featured_products=?, featured_artists=?, updated_by=? WHERE category_id=?',
        [hero_image, description, banner, featured_products, featured_artists, updated_by, category_id]
      );
      await db.query('INSERT INTO category_change_log (category_id, action, before_json, after_json, changed_by) VALUES (?, ?, ?, ?, ?)', [category_id, 'update', JSON.stringify(beforeRows[0]), JSON.stringify(req.body), updated_by]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save category content' });
  }
});

/**
 * Get category SEO data
 * @route GET /api/categories/seo/:category_id
 * @access Public
 * @param {Object} req - Express request object
 * @param {string} req.params.category_id - Category ID
 * @param {Object} res - Express response object
 * @returns {Object} Category SEO data including meta tags and structured data
 * @description Retrieves category SEO information for search engine optimization
 */
router.get('/seo/:category_id', async (req, res) => {
  try {
    const { category_id } = req.params;
    const [rows] = await db.query('SELECT * FROM category_seo WHERE category_id = ?', [category_id]);
    res.json({ success: true, seo: rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch category SEO' });
  }
});

/**
 * Create/update category SEO data
 * @route POST /api/categories/seo/:category_id
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.category_id - Category ID
 * @param {string} req.body.meta_title - Meta title (optional)
 * @param {string} req.body.meta_description - Meta description (optional)
 * @param {string} req.body.meta_keywords - Meta keywords (optional)
 * @param {string} req.body.canonical_url - Canonical URL (optional)
 * @param {string} req.body.json_ld - JSON-LD structured data (optional)
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation
 * @description Creates or updates category SEO data with change logging
 */
router.post('/seo/:category_id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { category_id } = req.params;
    const { meta_title, meta_description, meta_keywords, canonical_url, json_ld } = req.body;
    const updated_by = req.user.id;
    // Get before state
    const [beforeRows] = await db.query('SELECT * FROM category_seo WHERE category_id = ?', [category_id]);
    if (beforeRows.length === 0) {
      // Insert
      await db.query(
        'INSERT INTO category_seo (category_id, meta_title, meta_description, meta_keywords, canonical_url, json_ld, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [category_id, meta_title, meta_description, meta_keywords, canonical_url, json_ld, updated_by]
      );
      await db.query('INSERT INTO category_change_log (category_id, action, before_json, after_json, changed_by) VALUES (?, ?, ?, ?, ?)', [category_id, 'create', null, JSON.stringify(req.body), updated_by]);
    } else {
      // Update
      await db.query(
        'UPDATE category_seo SET meta_title=?, meta_description=?, meta_keywords=?, canonical_url=?, json_ld=?, updated_by=? WHERE category_id=?',
        [meta_title, meta_description, meta_keywords, canonical_url, json_ld, updated_by, category_id]
      );
      await db.query('INSERT INTO category_change_log (category_id, action, before_json, after_json, changed_by) VALUES (?, ?, ?, ?, ?)', [category_id, 'update', JSON.stringify(beforeRows[0]), JSON.stringify(req.body), updated_by]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save category SEO' });
  }
});

/**
 * Upload category images
 * @route POST /api/categories/upload
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.query.category_id - Category ID for existing categories or 'new' for creation
 * @returns {Object} Object containing uploaded image URLs
 * @description Uploads category images through the standard media processing system
 */
router.post('/upload', 
  verifyToken,
  requirePermission('manage_system'),
  upload.array('images'),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const { category_id } = req.query;
      
      // If category_id is provided and not 'new', verify it exists
      if (category_id && category_id !== 'new') {
        const [category] = await db.query('SELECT id FROM categories WHERE id = ?', [category_id]);
        if (!category.length) {
          return res.status(404).json({ error: 'Category not found' });
        }
      }

      const urls = [];
      
      // Record temp image URLs through the standard media system
      for (const file of req.files) {
        const imagePath = `/temp_images/categories/${file.filename}`;
        
        // Insert into pending_images with original name and mime type
        await db.query(
          'INSERT INTO pending_images (user_id, image_path, original_name, mime_type, status) VALUES (?, ?, ?, ?, ?)',
          [req.userId, imagePath, file.originalname, file.mimetype, 'pending']
        );
        
        urls.push(imagePath);
      }

      secureLogger.info('Category images uploaded', {
        categoryId: category_id,
        userId: req.userId,
        imageCount: urls.length,
        images: urls
      });

      res.json({ urls });
    } catch (err) {
      secureLogger.error('Category image upload error', err);
      res.status(500).json({ error: 'Failed to upload images' });
    }
  }
);

module.exports = router; 