const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');

const { requireRestrictedPermission } = require('../middleware/permissions');

// Middleware to verify site management permissions (replaces verifyArtist)
// Now uses permission-based access instead of hardcoded user types
const verifySiteAccess = requireRestrictedPermission('manage_sites');

// ============================================================================
// DISCOUNT MANAGEMENT ROUTES
// ============================================================================

// GET /sites/discounts/calculate - Calculate discounts for a user/subscription type
router.get('/discounts/calculate', verifyToken, async (req, res) => {
  try {
    const { subscription_type } = req.query;
    const userId = req.userId;
    
    if (!subscription_type) {
      return res.status(400).json({ error: 'subscription_type is required' });
    }

    // Get all active discounts for user/subscription
    const [discounts] = await db.execute(`
      SELECT * FROM discounts 
      WHERE user_id = ? 
      AND subscription_type = ?
      AND is_active = 1 
      AND valid_from <= NOW() 
      AND (valid_until IS NULL OR valid_until >= NOW())
      ORDER BY priority ASC
    `, [userId, subscription_type]);

    // Apply stacking logic
    let applicableDiscounts = [];
    let hasNoStackDiscount = false;

    for (const discount of discounts) {
      if (!discount.can_stack) {
        hasNoStackDiscount = true;
        applicableDiscounts = [discount]; // Only use highest priority no-stack discount
        break;
      }
      applicableDiscounts.push(discount);
    }

    res.json({
      success: true,
      discounts: applicableDiscounts,
      stacking_applied: hasNoStackDiscount ? 'single_discount' : 'stacked_discounts'
    });

  } catch (error) {
    // Error('Error calculating discounts:', error);
    res.status(500).json({ error: 'Failed to calculate discounts' });
  }
});

// POST /sites/discounts - Add a discount for a user (admin only)
router.post('/discounts', verifyToken, requireRestrictedPermission('manage_system'), async (req, res) => {
  try {
    const {
      user_id,
      subscription_type,
      discount_code,
      discount_type,
      discount_value,
      priority = 10,
      can_stack = 1,
      can_chain = 0,
      valid_from,
      valid_until
    } = req.body;

    // Validate required fields
    if (!user_id || !subscription_type || !discount_code || !discount_type || discount_value === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check for chaining conflicts if can_chain is false
    if (!can_chain) {
      const [existing] = await db.execute(`
        SELECT id FROM discounts 
        WHERE user_id = ? 
        AND subscription_type = ?
        AND discount_type = ?
        AND is_active = 1
        AND (valid_until IS NULL OR valid_until >= NOW())
      `, [user_id, subscription_type, discount_type]);

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Cannot chain: discount of this type already exists for user' });
      }
    }

    const [result] = await db.execute(`
      INSERT INTO discounts (
        user_id, subscription_type, discount_code, discount_type, discount_value,
        priority, can_stack, can_chain, valid_from, valid_until, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      user_id, subscription_type, discount_code, discount_type, discount_value,
      priority, can_stack, can_chain, valid_from, valid_until, req.userId
    ]);

    res.json({
      success: true,
      discount_id: result.insertId,
      message: 'Discount created successfully'
    });

  } catch (error) {
    // Error('Error creating discount:', error);
    res.status(500).json({ error: 'Failed to create discount' });
  }
});

// DELETE /sites/discounts/:id - Remove a discount (admin only)
router.delete('/discounts/:id', verifyToken, requireRestrictedPermission('manage_system'), async (req, res) => {
  try {
    const discountId = req.params.id;

    const [result] = await db.execute('DELETE FROM discounts WHERE id = ?', [discountId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Discount not found' });
    }

    res.json({ success: true, message: 'Discount deleted successfully' });

  } catch (error) {
    // Error('Error deleting discount:', error);
    res.status(500).json({ error: 'Failed to delete discount' });
  }
});

// ============================================================================
// TEMPLATE MANAGEMENT ROUTES
// ============================================================================

// GET /sites/templates - Get available templates (filtered by user's subscription tier)
router.get('/templates', verifyToken, async (req, res) => {
  try {
    // For now, return all active templates - subscription filtering will be added in Phase 3
    const [templates] = await db.execute(`
      SELECT id, template_name, template_slug, description, preview_image_url, tier_required
      FROM website_templates 
      WHERE is_active = 1 
      ORDER BY display_order ASC, template_name ASC
    `);

    res.json({ success: true, templates });

  } catch (error) {
    // Error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});


// GET /sites/templates/:id - Get specific template details
router.get('/templates/:id', verifyToken, async (req, res) => {
  try {
    const templateId = req.params.id;

    const [template] = await db.execute(`
      SELECT * FROM website_templates WHERE id = ? AND is_active = 1
    `, [templateId]);

    if (template.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ success: true, template: template[0] });

  } catch (error) {
    // Error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// PUT /sites/template/:id - Apply template to user's site
router.put('/template/:id', verifyToken, requireRestrictedPermission('manage_sites'), async (req, res) => {
  try {
    const templateId = req.params.id;
    const userId = req.userId;

    // Verify template exists and is active
    const [template] = await db.execute(`
      SELECT id, tier_required FROM website_templates WHERE id = ? AND is_active = 1
    `, [templateId]);

    if (template.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Get user's site
    const [userSite] = await db.execute(`
      SELECT id FROM sites WHERE user_id = ?
    `, [userId]);

    if (userSite.length === 0) {
      return res.status(404).json({ error: 'User site not found' });
    }

    // Update site template (subscription tier checking will be added in Phase 3)
    await db.execute(`
      UPDATE sites SET template_id = ? WHERE user_id = ?
    `, [templateId, userId]);

    res.json({ 
      success: true, 
      message: 'Template applied successfully',
      template_id: templateId 
    });

  } catch (error) {
    // Error('Error applying template:', error);
    res.status(500).json({ error: 'Failed to apply template' });
  }
});

// POST /sites/templates - Create new template (admin only)
router.post('/templates', verifyToken, requireRestrictedPermission('manage_system'), async (req, res) => {
  try {
    const {
      template_name,
      template_slug,
      description,
      css_file_path,
      preview_image_url,
      tier_required = 'free',
      display_order = 0
    } = req.body;

    if (!template_name || !template_slug || !css_file_path) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [result] = await db.execute(`
      INSERT INTO website_templates (template_name, template_slug, description, css_file_path, preview_image_url, tier_required, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [template_name, template_slug, description, css_file_path, preview_image_url, tier_required, display_order]);

    res.json({
      success: true,
      template_id: result.insertId,
      message: 'Template created successfully'
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Template slug already exists' });
    }
    // Error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// ============================================================================
// ADDON MANAGEMENT ROUTES
// ============================================================================

// GET /sites/addons - Get available addons (filtered by user's subscription tier)
router.get('/addons', verifyToken, async (req, res) => {
  try {
    // For now, return all active addons - subscription filtering will be added in Phase 3
    const [addons] = await db.execute(`
      SELECT id, addon_name, addon_slug, description, tier_required, monthly_price
      FROM website_addons 
      WHERE is_active = 1 
      ORDER BY display_order ASC, addon_name ASC
    `);

    res.json({ success: true, addons });

  } catch (error) {
    // Error('Error fetching addons:', error);
    res.status(500).json({ error: 'Failed to fetch addons' });
  }
});

// GET /sites/my-addons - Get user's active addons
router.get('/my-addons', verifyToken, requireRestrictedPermission('manage_sites'), async (req, res) => {
  try {
    const userId = req.userId;

    // Get user's site first
    const [userSite] = await db.execute(`
      SELECT id FROM sites WHERE user_id = ?
    `, [userId]);

    if (userSite.length === 0) {
      return res.status(404).json({ error: 'User site not found' });
    }

    const siteId = userSite[0].id;

    // Get active addons for user's site
    const [addons] = await db.execute(`
      SELECT wa.id, wa.addon_name, wa.addon_slug, wa.addon_script_path, 
             wa.monthly_price, sa.activated_at
      FROM site_addons sa
      JOIN website_addons wa ON sa.addon_id = wa.id
      WHERE sa.site_id = ? AND sa.is_active = 1 AND wa.is_active = 1
      ORDER BY wa.display_order ASC
    `, [siteId]);

    res.json({ success: true, addons });

  } catch (error) {
    // Error('Error fetching user addons:', error);
    res.status(500).json({ error: 'Failed to fetch user addons' });
  }
});

// GET /sites/:id/addons - Get active addons for a specific site (PUBLIC - for artist storefronts)
router.get('/:id/addons', async (req, res) => {
  try {
    const siteId = req.params.id;

    // Verify site exists and is active (no user ownership check needed for public access)
    const [site] = await db.execute(`
      SELECT id FROM sites WHERE id = ? AND status = 'active'
    `, [siteId]);

    if (site.length === 0) {
      return res.status(404).json({ error: 'Site not found or not active' });
    }

    // Get active addons for this specific site
    const [addons] = await db.execute(`
      SELECT wa.id, wa.addon_name, wa.addon_slug, wa.addon_script_path, 
             wa.monthly_price, sa.activated_at, sa.addon_id, sa.is_active
      FROM site_addons sa
      JOIN website_addons wa ON sa.addon_id = wa.id
      WHERE sa.site_id = ? AND sa.is_active = 1 AND wa.is_active = 1
      ORDER BY wa.display_order ASC
    `, [siteId]);

    res.json({ addons });

  } catch (error) {
    console.error('Error fetching site addons:', error);
    res.status(500).json({ error: 'Failed to fetch site addons' });
  }
});

// POST /sites/addons/:id - Add addon to user's site
router.post('/addons/:id', verifyToken, requireRestrictedPermission('manage_sites'), async (req, res) => {
  try {
    const addonId = req.params.id;
    const userId = req.userId;

    // Verify addon exists and is active
    const [addon] = await db.execute(`
      SELECT id, addon_name, tier_required FROM website_addons WHERE id = ? AND is_active = 1
    `, [addonId]);

    if (addon.length === 0) {
      return res.status(404).json({ error: 'Addon not found' });
    }

    // Get user's site
    const [userSite] = await db.execute(`
      SELECT id FROM sites WHERE user_id = ?
    `, [userId]);

    if (userSite.length === 0) {
      return res.status(404).json({ error: 'User site not found' });
    }

    const siteId = userSite[0].id;

    // Check if addon is already active for this site
    const [existing] = await db.execute(`
      SELECT id FROM site_addons WHERE site_id = ? AND addon_id = ? AND is_active = 1
    `, [siteId, addonId]);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Addon already active for this site' });
    }

    // Add addon to site (subscription tier checking will be added in Phase 3)
    await db.execute(`
      INSERT INTO site_addons (site_id, addon_id, is_active) 
      VALUES (?, ?, 1)
      ON DUPLICATE KEY UPDATE is_active = 1, activated_at = CURRENT_TIMESTAMP
    `, [siteId, addonId]);

    res.json({ 
      success: true, 
      message: `${addon[0].addon_name} addon activated successfully`,
      addon_id: addonId 
    });

  } catch (error) {
    // Error('Error adding addon:', error);
    res.status(500).json({ error: 'Failed to add addon' });
  }
});

// DELETE /sites/addons/:id - Remove addon from user's site
router.delete('/addons/:id', verifyToken, requireRestrictedPermission('manage_sites'), async (req, res) => {
  try {
    const addonId = req.params.id;
    const userId = req.userId;

    // Get user's site
    const [userSite] = await db.execute(`
      SELECT id FROM sites WHERE user_id = ?
    `, [userId]);

    if (userSite.length === 0) {
      return res.status(404).json({ error: 'User site not found' });
    }

    const siteId = userSite[0].id;

    // Deactivate addon for this site
    const [result] = await db.execute(`
      UPDATE site_addons 
      SET is_active = 0, deactivated_at = CURRENT_TIMESTAMP 
      WHERE site_id = ? AND addon_id = ?
    `, [siteId, addonId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Addon not found for this site' });
    }

    res.json({ success: true, message: 'Addon deactivated successfully' });

  } catch (error) {
    // Error('Error removing addon:', error);
    res.status(500).json({ error: 'Failed to remove addon' });
  }
});

// POST /sites/addons - Create new addon (admin only)
router.post('/addons', verifyToken, requireRestrictedPermission('manage_system'), async (req, res) => {
  try {
    const {
      addon_name,
      addon_slug,
      description,
      addon_script_path,
      tier_required = 'basic',
      monthly_price = 0.00,
      display_order = 0
    } = req.body;

    if (!addon_name || !addon_slug || !addon_script_path) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [result] = await db.execute(`
      INSERT INTO website_addons (addon_name, addon_slug, description, addon_script_path, tier_required, monthly_price, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [addon_name, addon_slug, description, addon_script_path, tier_required, monthly_price, display_order]);

    res.json({
      success: true,
      addon_id: result.insertId,
      message: 'Addon created successfully'
    });

  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Addon slug already exists' });
    }
    // Error('Error creating addon:', error);
    res.status(500).json({ error: 'Failed to create addon' });
  }
});

// ============================================================================
// SITE MANAGEMENT ROUTES
// ============================================================================

// GET /sites/me - Get current user's sites
router.get('/me', verifyToken, requireRestrictedPermission('manage_sites'), async (req, res) => {
  try {
    const [sites] = await db.query(
      'SELECT * FROM sites WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    res.json(sites);
  } catch (err) {
    // Error('Error fetching user sites:', err);
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
    // Error('Error fetching all sites:', err);
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

    // Check if user already has a site (limit 1 per artist, unlimited for admins)
    if (user[0].user_type !== 'admin') {
      const [existingSite] = await db.query(
        'SELECT id FROM sites WHERE user_id = ?',
        [req.userId]
      );
      if (existingSite.length > 0) {
        return res.status(400).json({ error: 'You already have a site. Multiple sites coming soon!' });
      }
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

    // Info('New site created:', { userId: req.userId, siteId: result.insertId, subdomain });
    res.status(201).json(newSite[0]);
  } catch (err) {
    // Error('Error creating site:', err);
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
    // Error('Error updating site:', err);
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
    // Error('Error deleting site:', err);
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
    // Error('Error fetching user categories:', err);
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
    // Error('Error creating user category:', err);
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
    // Error('Error updating user category:', err);
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
    // Error('Error deleting user category:', err);
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
      `SELECT s.*, u.username, up.first_name, up.last_name, up.bio, up.profile_image_path, up.header_image_path,
              sc.main_color as primary_color, sc.secondary_color, sc.text_color, sc.accent_color, sc.background_color
       FROM sites s 
       JOIN users u ON s.user_id = u.id 
       LEFT JOIN user_profiles up ON u.id = up.user_id 
       LEFT JOIN site_customizations sc ON s.id = sc.site_id
       WHERE s.subdomain = ? AND s.status = 'active'`,
      [subdomain]
    );

    if (!site[0]) {
      return res.status(404).json({ error: 'Site not found' });
    }

    res.json(site[0]);
  } catch (err) {
    // Error('Error resolving subdomain:', err);
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
    // Only show parent products (simple products and variable product parents)
    // Hide child variation products from public listings
    let query = `
      SELECT p.*, pi.image_path, pi.alt_text, pi.is_primary
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
      WHERE p.user_id = ? AND p.status = 'active' AND p.parent_id IS NULL
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
    // Error('Error fetching site products:', err);
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
    // Error('Error fetching site articles:', err);
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
    // Error('Error fetching site categories:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// ============================================================================
// SITE CUSTOMIZATION ROUTES
// ============================================================================

// GET /sites/:id/customizations - Get site customization settings
router.get('/:id/customizations', verifyToken, requireRestrictedPermission('sites'), async (req, res) => {
  try {
    const siteId = req.params.id;
    const userId = req.userId;

    // Verify site ownership (admins can access any site)
    const [site] = await db.query(
      'SELECT user_id FROM sites WHERE id = ?',
      [siteId]
    );

    if (!site[0]) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Check ownership unless admin
    const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
    if (site[0].user_id !== userId && user[0]?.user_type !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get customizations for this site
    const [customizations] = await db.execute(
      'SELECT * FROM site_customizations WHERE site_id = ?',
      [siteId]
    );

    // Return customizations or defaults
    const settings = customizations[0] || {
      text_color: '#374151',
      main_color: '#667eea', 
      secondary_color: '#764ba2',
      accent_color: null,
      background_color: null,
      body_font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
      header_font: 'Georgia, "Times New Roman", Times, serif'
    };

    res.json({
      success: true,
      customizations: settings
    });

  } catch (error) {
    console.error('Error fetching site customizations:', error);
    res.status(500).json({ error: 'Failed to fetch customizations' });
  }
});

// PUT /sites/:id/customizations - Update site customization settings
router.put('/:id/customizations', verifyToken, requireRestrictedPermission('sites'), async (req, res) => {
  try {
    const siteId = req.params.id;
    const userId = req.userId;
    const {
      text_color,
      main_color,
      secondary_color,
      accent_color,
      background_color,
      body_font,
      header_font,
      h1_font,
      h2_font,
      h3_font,
      h4_font,
      custom_css
    } = req.body;

    // Verify site ownership (admins can modify any site)
    const [site] = await db.query(
      'SELECT user_id FROM sites WHERE id = ?',
      [siteId]
    );

    if (!site[0]) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Check ownership unless admin
    const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
    if (site[0].user_id !== userId && user[0]?.user_type !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get user permissions to determine what they can customize
    const [permissions] = await db.execute(
      'SELECT sites, manage_sites, professional_sites FROM user_permissions WHERE user_id = ?',
      [userId]
    );

    const userPerms = permissions[0] || {};
    // Admin users get all permissions automatically
    const isAdmin = user[0]?.user_type === 'admin';
    const canCustomizeBasic = isAdmin || userPerms.sites; // 3 basic colors
    const canCustomizeAdvanced = isAdmin || userPerms.manage_sites; // 5 colors + fonts
    const canCustomizeProfessional = isAdmin || userPerms.professional_sites; // Everything + custom CSS

    // Validate permissions for requested changes
    if (!canCustomizeBasic) {
      return res.status(403).json({ error: 'Sites permission required for customization' });
    }

    // Build update fields based on permissions
    const updateFields = [];
    const updateValues = [];

    // Basic colors (all tiers)
    if (text_color !== undefined) {
      updateFields.push('text_color = ?');
      updateValues.push(text_color);
    }
    if (main_color !== undefined) {
      updateFields.push('main_color = ?');
      updateValues.push(main_color);
    }
    if (secondary_color !== undefined) {
      updateFields.push('secondary_color = ?');
      updateValues.push(secondary_color);
    }

    // Advanced colors (manage_sites and above)
    if (canCustomizeAdvanced) {
      if (accent_color !== undefined) {
        updateFields.push('accent_color = ?');
        updateValues.push(accent_color);
      }
      if (background_color !== undefined) {
        updateFields.push('background_color = ?');
        updateValues.push(background_color);
      }
      if (body_font !== undefined) {
        updateFields.push('body_font = ?');
        updateValues.push(body_font);
      }
      if (header_font !== undefined) {
        updateFields.push('header_font = ?');
        updateValues.push(header_font);
      }
    }

    // Professional features (professional_sites)
    if (canCustomizeProfessional) {
      if (h1_font !== undefined) {
        updateFields.push('h1_font = ?');
        updateValues.push(h1_font);
      }
      if (h2_font !== undefined) {
        updateFields.push('h2_font = ?');
        updateValues.push(h2_font);
      }
      if (h3_font !== undefined) {
        updateFields.push('h3_font = ?');
        updateValues.push(h3_font);
      }
      if (h4_font !== undefined) {
        updateFields.push('h4_font = ?');
        updateValues.push(h4_font);
      }
      if (custom_css !== undefined) {
        updateFields.push('custom_css = ?');
        updateValues.push(custom_css);
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    // Update or insert customizations using a simpler approach
    // First, check if customizations exist
    const [existing] = await db.execute(
      'SELECT id FROM site_customizations WHERE site_id = ?',
      [siteId]
    );

    if (existing.length > 0) {
      // Update existing record
      await db.execute(
        `UPDATE site_customizations SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE site_id = ?`,
        [...updateValues, siteId]
      );
    } else {
      // Insert new record with default values, then update with provided values
      await db.execute(
        'INSERT INTO site_customizations (site_id) VALUES (?)',
        [siteId]
      );
      if (updateFields.length > 0) {
        await db.execute(
          `UPDATE site_customizations SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE site_id = ?`,
          [...updateValues, siteId]
        );
      }
    }

    // Get updated customizations
    const [updated] = await db.execute(
      'SELECT * FROM site_customizations WHERE site_id = ?',
      [siteId]
    );

    res.json({
      success: true,
      message: 'Customizations updated successfully',
      customizations: updated[0]
    });

  } catch (error) {
    console.error('Error updating site customizations:', error);
    res.status(500).json({ error: 'Failed to update customizations' });
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
    const reserved = ['www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'shop', 'store', 'signup'];
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
    // Error('Error checking subdomain:', err);
    res.status(500).json({ error: 'Failed to check subdomain' });
  }
});

// GET /sites/resolve-custom-domain/:domain - Resolve custom domain to subdomain
router.get('/resolve-custom-domain/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    
    // Find the site with this custom domain
    const [sites] = await db.execute(
      `SELECT s.subdomain, s.user_id, s.site_name, s.theme_name 
       FROM sites s 
       WHERE s.custom_domain = ? 
       AND s.domain_validation_status = 'verified' 
       AND s.custom_domain_active = 1`,
      [domain]
    );

    if (sites.length === 0) {
      return res.status(404).json({ error: 'Custom domain not found or not active' });
    }

    const site = sites[0];
    res.json({
      subdomain: site.subdomain,
      user_id: site.user_id,
      site_name: site.site_name,
      theme_name: site.theme_name
    });
  } catch (err) {
    console.error('Error resolving custom domain:', err);
    res.status(500).json({ error: 'Failed to resolve custom domain' });
  }
});

module.exports = router; 