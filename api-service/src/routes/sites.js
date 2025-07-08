const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');
const { secureLogger } = require('../middleware/secureLogger');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.roles = decoded.roles;
    req.permissions = decoded.permissions || [];
    next();
  } catch (err) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to verify artist user type
const verifyArtist = async (req, res, next) => {
  try {
    const [user] = await db.query(
      'SELECT user_type FROM users WHERE id = ?',
      [req.userId]
    );
    if (!user[0] || user[0].user_type !== 'artist') {
      return res.status(403).json({ error: 'Only artists can manage sites' });
    }
    next();
  } catch (err) {
    secureLogger.error('Error verifying artist status:', err);
    res.status(500).json({ error: 'Failed to verify user permissions' });
  }
};

// ============================================================================
// SITE MANAGEMENT ROUTES
// ============================================================================

// GET /sites/me - Get current user's sites
router.get('/me', verifyToken, async (req, res) => {
  try {
    // Check if user is artist or admin
    const [user] = await db.query(
      'SELECT user_type FROM users WHERE id = ?',
      [req.userId]
    );
    if (!user[0] || (user[0].user_type !== 'artist' && user[0].user_type !== 'admin')) {
      return res.status(403).json({ error: 'Only artists and admins can manage sites' });
    }

    const [sites] = await db.query(
      'SELECT * FROM sites WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(sites);
  } catch (err) {
    secureLogger.error('Error fetching user sites:', err);
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
});

// GET /sites/all - Get all sites (admin only)
router.get('/all', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const [user] = await db.query(
      'SELECT user_type FROM users WHERE id = ?',
      [req.userId]
    );
    if (!user[0] || user[0].user_type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Fetch all sites with user information
    const [sites] = await db.query(`
      SELECT 
        s.*,
        u.first_name,
        u.last_name,
        u.email
      FROM sites s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.status != 'deleted'
      ORDER BY s.created_at DESC
    `);
    
    res.json(sites);
  } catch (err) {
    secureLogger.error('Error fetching all sites:', err);
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
});

// POST /sites - Create a new site
router.post('/', verifyToken, async (req, res) => {
  try {
    const { site_name, subdomain, site_title, site_description, theme_name = 'default' } = req.body;
    
    // Check if user is artist or admin
    const [user] = await db.query(
      'SELECT user_type FROM users WHERE id = ?',
      [req.userId]
    );
    if (!user[0] || (user[0].user_type !== 'artist' && user[0].user_type !== 'admin')) {
      return res.status(403).json({ error: 'Only artists and admins can create sites' });
    }
    
    if (!site_name || !subdomain) {
      return res.status(400).json({ error: 'site_name and subdomain are required' });
    }

    // Validate subdomain format (alphanumeric, hyphens, 3-63 chars)
    const subdomainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
    if (!subdomainRegex.test(subdomain) || subdomain.length < 3 || subdomain.length > 63) {
      return res.status(400).json({ error: 'Invalid subdomain format' });
    }

    // Check for existing subdomain
    const [existingSubdomain] = await db.query(
      'SELECT id FROM sites WHERE subdomain = ?',
      [subdomain]
    );
    if (existingSubdomain.length > 0) {
      return res.status(400).json({ error: 'Subdomain already exists' });
    }

    // Check if user already has a site (limit 1 per artist for now)
    const [existingSite] = await db.query(
      'SELECT id FROM sites WHERE user_id = ?',
      [req.userId]
    );
    if (existingSite.length > 0) {
      return res.status(400).json({ error: 'You already have a site. Multiple sites coming soon!' });
    }

    const [result] = await db.query(
      'INSERT INTO sites (user_id, site_name, subdomain, site_title, site_description, theme_name, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.userId, site_name, subdomain, site_title, site_description, theme_name, 'draft']
    );

    // Get the created site
    const [newSite] = await db.query(
      'SELECT * FROM sites WHERE id = ?',
      [result.insertId]
    );

    secureLogger.info('New site created:', { userId: req.userId, siteId: result.insertId, subdomain });
    res.status(201).json(newSite[0]);
  } catch (err) {
    secureLogger.error('Error creating site:', err);
    res.status(500).json({ error: 'Failed to create site' });
  }
});

// PUT /sites/:id - Update site
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { site_name, site_title, site_description, theme_name, status, custom_domain } = req.body;

    // Check if user is artist or admin
    const [user] = await db.query(
      'SELECT user_type FROM users WHERE id = ?',
      [req.userId]
    );
    if (!user[0] || (user[0].user_type !== 'artist' && user[0].user_type !== 'admin')) {
      return res.status(403).json({ error: 'Only artists and admins can update sites' });
    }

    // Verify ownership (admins can edit any site)
    const [site] = await db.query(
      'SELECT user_id FROM sites WHERE id = ?',
      [id]
    );
    if (!site[0] || (site[0].user_id !== req.userId && user[0].user_type !== 'admin')) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Validate custom domain if provided
    if (custom_domain) {
      const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
      if (!domainRegex.test(custom_domain)) {
        return res.status(400).json({ error: 'Invalid custom domain format' });
      }
    }

    await db.query(
      'UPDATE sites SET site_name = ?, site_title = ?, site_description = ?, theme_name = ?, status = ?, custom_domain = ?, updated_at = NOW() WHERE id = ?',
      [site_name, site_title, site_description, theme_name, status, custom_domain, id]
    );

    // Get updated site
    const [updatedSite] = await db.query(
      'SELECT * FROM sites WHERE id = ?',
      [id]
    );

    res.json(updatedSite[0]);
  } catch (err) {
    secureLogger.error('Error updating site:', err);
    res.status(500).json({ error: 'Failed to update site' });
  }
});

// DELETE /sites/:id - Delete site
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is artist or admin
    const [user] = await db.query(
      'SELECT user_type FROM users WHERE id = ?',
      [req.userId]
    );
    if (!user[0] || (user[0].user_type !== 'artist' && user[0].user_type !== 'admin')) {
      return res.status(403).json({ error: 'Only artists and admins can delete sites' });
    }

    // Verify ownership (admins can delete any site)
    const [site] = await db.query(
      'SELECT user_id FROM sites WHERE id = ?',
      [id]
    );
    if (!site[0] || (site[0].user_id !== req.userId && user[0].user_type !== 'admin')) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Soft delete by setting status to 'deleted'
    await db.query(
      'UPDATE sites SET status = ?, updated_at = NOW() WHERE id = ?',
      ['deleted', id]
    );

    res.json({ message: 'Site deleted successfully' });
  } catch (err) {
    secureLogger.error('Error deleting site:', err);
    res.status(500).json({ error: 'Failed to delete site' });
  }
});

// ============================================================================
// USER CATEGORIES MANAGEMENT
// ============================================================================

// GET /sites/categories - Get user's custom categories
router.get('/categories', verifyToken, async (req, res) => {
  try {
    const [categories] = await db.query(
      'SELECT * FROM user_categories WHERE user_id = ? ORDER BY display_order ASC, name ASC',
      [req.userId]
    );
    res.json(categories);
  } catch (err) {
    secureLogger.error('Error fetching user categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST /sites/categories - Create custom category
router.post('/categories', verifyToken, async (req, res) => {
  try {
    const { name, description, parent_id, display_order = 0 } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check for existing category name for this user
    const [existing] = await db.query(
      'SELECT id FROM user_categories WHERE user_id = ? AND name = ?',
      [req.userId, name]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Category name already exists' });
    }

    // If parent_id is provided, verify it belongs to the user
    if (parent_id) {
      const [parent] = await db.query(
        'SELECT user_id FROM user_categories WHERE id = ?',
        [parent_id]
      );
      if (!parent[0] || parent[0].user_id !== req.userId) {
        return res.status(400).json({ error: 'Invalid parent category' });
      }
    }

    const [result] = await db.query(
      'INSERT INTO user_categories (user_id, name, description, parent_id, display_order) VALUES (?, ?, ?, ?, ?)',
      [req.userId, name, description, parent_id, display_order]
    );

    const [newCategory] = await db.query(
      'SELECT * FROM user_categories WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(newCategory[0]);
  } catch (err) {
    secureLogger.error('Error creating user category:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /sites/categories/:id - Update custom category
router.put('/categories/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, parent_id, display_order } = req.body;

    // Verify ownership
    const [category] = await db.query(
      'SELECT user_id FROM user_categories WHERE id = ?',
      [id]
    );
    if (!category[0] || category[0].user_id !== req.userId) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Prevent circular references
    if (parent_id && parent_id == id) {
      return res.status(400).json({ error: 'Category cannot be its own parent' });
    }

    await db.query(
      'UPDATE user_categories SET name = ?, description = ?, parent_id = ?, display_order = ?, updated_at = NOW() WHERE id = ?',
      [name, description, parent_id, display_order, id]
    );

    const [updatedCategory] = await db.query(
      'SELECT * FROM user_categories WHERE id = ?',
      [id]
    );

    res.json(updatedCategory[0]);
  } catch (err) {
    secureLogger.error('Error updating user category:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /sites/categories/:id - Delete custom category
router.delete('/categories/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const [category] = await db.query(
      'SELECT user_id FROM user_categories WHERE id = ?',
      [id]
    );
    if (!category[0] || category[0].user_id !== req.userId) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if category has children
    const [children] = await db.query(
      'SELECT id FROM user_categories WHERE parent_id = ?',
      [id]
    );
    if (children.length > 0) {
      return res.status(400).json({ error: 'Cannot delete category with subcategories' });
    }

    await db.query('DELETE FROM user_categories WHERE id = ?', [id]);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    secureLogger.error('Error deleting user category:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ============================================================================
// SUBDOMAIN RESOLUTION & PUBLIC ROUTES
// ============================================================================

// GET /sites/resolve/:subdomain - Resolve subdomain to site data (PUBLIC)
router.get('/resolve/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;

    const [site] = await db.query(
      `SELECT s.*, u.username, up.first_name, up.last_name, up.bio, up.profile_image_path, up.header_image_path
       FROM sites s 
       JOIN users u ON s.user_id = u.id 
       LEFT JOIN user_profiles up ON u.id = up.user_id 
       WHERE s.subdomain = ? AND s.status = 'active'`,
      [subdomain]
    );

    if (!site[0]) {
      return res.status(404).json({ error: 'Site not found' });
    }

    res.json(site[0]);
  } catch (err) {
    secureLogger.error('Error resolving subdomain:', err);
    res.status(500).json({ error: 'Failed to resolve subdomain' });
  }
});

// GET /sites/resolve/:subdomain/products - Get products for a site (PUBLIC)
router.get('/resolve/:subdomain/products', async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { limit = 20, offset = 0, category } = req.query;

    // Get site and verify it exists
    const [site] = await db.query(
      'SELECT user_id FROM sites WHERE subdomain = ? AND status = "active"',
      [subdomain]
    );

    if (!site[0]) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const userId = site[0].user_id;

    // Build query based on category filter
    let query = `
      SELECT p.*, pi.image_path, pi.alt_text, pi.is_primary
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
      WHERE p.user_id = ? AND p.status = 'active'
    `;
    let params = [userId];

    if (category) {
      query += ' AND p.category_id = ?';
      params.push(category);
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [products] = await db.query(query, params);
    res.json(products);
  } catch (err) {
    secureLogger.error('Error fetching site products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /sites/resolve/:subdomain/articles - Get articles for a site (PUBLIC)
router.get('/resolve/:subdomain/articles', async (req, res) => {
  try {
    const { subdomain } = req.params;
    const { type = 'all', limit = 10, offset = 0 } = req.query;

    // Get site and verify it exists
    const [site] = await db.query(
      'SELECT user_id FROM sites WHERE subdomain = ? AND status = "active"',
      [subdomain]
    );

    if (!site[0]) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const userId = site[0].user_id;

    // Build query based on type
    let query = `
      SELECT a.*, ml.file_path as featured_image_path
      FROM articles a
      LEFT JOIN media_library ml ON a.featured_image_id = ml.id
      WHERE a.author_id = ? AND a.status = 'published'
    `;
    let params = [userId];

    if (type === 'menu') {
      query += ' AND a.site_menu_display = "yes" ORDER BY a.menu_order ASC';
    } else if (type === 'blog') {
      query += ' AND a.site_blog_display = "yes" ORDER BY a.published_at DESC';
    } else if (type === 'pages') {
      query += ' AND a.page_type != "blog_post" ORDER BY a.menu_order ASC';
    } else {
      query += ' ORDER BY a.published_at DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [articles] = await db.query(query, params);
    res.json(articles);
  } catch (err) {
    secureLogger.error('Error fetching site articles:', err);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// GET /sites/resolve/:subdomain/categories - Get user categories for a site (PUBLIC)
router.get('/resolve/:subdomain/categories', async (req, res) => {
  try {
    const { subdomain } = req.params;

    // Get site and verify it exists
    const [site] = await db.query(
      'SELECT user_id FROM sites WHERE subdomain = ? AND status = "active"',
      [subdomain]
    );

    if (!site[0]) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const userId = site[0].user_id;

    const [categories] = await db.query(
      'SELECT * FROM user_categories WHERE user_id = ? ORDER BY display_order ASC, name ASC',
      [userId]
    );

    res.json(categories);
  } catch (err) {
    secureLogger.error('Error fetching site categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ============================================================================
// UTILITY ROUTES
// ============================================================================

// GET /sites/check-subdomain/:subdomain - Check if subdomain is available (PUBLIC)
router.get('/check-subdomain/:subdomain', async (req, res) => {
  try {
    const { subdomain } = req.params;

    // Validate subdomain format
    const subdomainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
    if (!subdomainRegex.test(subdomain) || subdomain.length < 3 || subdomain.length > 63) {
      return res.json({ available: false, reason: 'Invalid format' });
    }

    // Check reserved subdomains
    const reserved = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'shop', 'store'];
    if (reserved.includes(subdomain.toLowerCase())) {
      return res.json({ available: false, reason: 'Reserved subdomain' });
    }

    const [existing] = await db.query(
      'SELECT id FROM sites WHERE subdomain = ?',
      [subdomain]
    );

    res.json({ 
      available: existing.length === 0,
      reason: existing.length > 0 ? 'Already taken' : null
    });
  } catch (err) {
    secureLogger.error('Error checking subdomain:', err);
    res.status(500).json({ error: 'Failed to check subdomain' });
  }
});

module.exports = router; 