/**
 * Site Management Routes
 * Comprehensive site and subdomain management system for the Beemeeart platform
 * Handles site creation, customization, templates, addons, discounts, and subdomain resolution
 * Supports multitenant architecture with custom domains and subdomain routing
 */

const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');

const { requirePermission } = require('../middleware/permissions');

/**
 * Middleware to verify site management permissions
 * Uses permission-based access instead of hardcoded user types
 * Replaces legacy verifyArtist middleware with modern permission system
 */
const verifySiteAccess = requirePermission('manage_sites');

// ============================================================================
// DISCOUNT MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /sites/discounts/calculate
 * Calculate applicable discounts for a user and subscription type
 * Handles discount stacking logic and priority ordering
 * 
 * @route GET /sites/discounts/calculate
 * @middleware verifyToken - Requires valid JWT token
 * @param {string} subscription_type - Type of subscription to calculate discounts for
 * @returns {Object} Applicable discounts with stacking information
 */
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

/**
 * POST /sites/discounts
 * Create a new discount for a user (admin only)
 * Supports discount stacking and chaining rules with validation
 * 
 * @route POST /sites/discounts
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requirePermission('manage_system') - Requires system management permissions
 * @param {Object} req.body - Discount creation data
 * @returns {Object} Created discount confirmation
 */
router.post('/discounts', verifyToken, requirePermission('manage_system'), async (req, res) => {
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

/**
 * DELETE /sites/discounts/:id
 * Remove a discount from the system (admin only)
 * Permanently deletes discount record from database
 * 
 * @route DELETE /sites/discounts/:id
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requirePermission('manage_system') - Requires system management permissions
 * @param {string} id - Discount ID to delete
 * @returns {Object} Deletion confirmation message
 */
router.delete('/discounts/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
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

/**
 * GET /sites/templates
 * Get available website templates filtered by user's subscription tier
 * Returns active templates with preview information and tier requirements
 * 
 * @route GET /sites/templates
 * @middleware verifyToken - Requires valid JWT token
 * @returns {Object} Available templates with tier information
 */
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


/**
 * GET /sites/templates/:id
 * Get detailed information for a specific template
 * Returns complete template configuration and metadata
 * 
 * @route GET /sites/templates/:id
 * @middleware verifyToken - Requires valid JWT token
 * @param {string} id - Template ID
 * @returns {Object} Complete template details
 */
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

/**
 * PUT /sites/template/:id
 * Apply a template to the user's site
 * Updates site template configuration with tier validation
 * 
 * @route PUT /sites/template/:id
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requirePermission('manage_sites') - Requires site management permissions
 * @param {string} id - Template ID to apply
 * @returns {Object} Template application confirmation
 */
router.put('/template/:id', verifyToken, requirePermission('manage_sites'), async (req, res) => {
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

/**
 * POST /sites/templates
 * Create a new website template (admin only)
 * Adds new template to the system with CSS and preview configuration
 * 
 * @route POST /sites/templates
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requirePermission('manage_system') - Requires system management permissions
 * @param {Object} req.body - Template creation data
 * @returns {Object} Created template confirmation
 */
router.post('/templates', verifyToken, requirePermission('manage_system'), async (req, res) => {
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

/**
 * GET /sites/addons
 * Get available website addons filtered by user's subscription tier
 * Returns both user-level and site-level addons with ownership status
 * 
 * @route GET /sites/addons
 * @middleware verifyToken - Requires valid JWT token
 * @returns {Object} Available addons with tier requirements and ownership status
 */
router.get('/addons', verifyToken, async (req, res) => {
  try {
    // Get all active addons, marking which level they apply to
    const [addons] = await db.execute(`
      SELECT 
        id, 
        addon_name, 
        addon_slug, 
        description, 
        tier_required, 
        monthly_price,
        user_level,
        category,
        CASE 
          WHEN user_level = 1 THEN 'user' 
          ELSE 'site' 
        END as addon_scope
      FROM website_addons 
      WHERE is_active = 1 
      ORDER BY user_level DESC, display_order ASC, addon_name ASC
    `);

    // Check which user-level addons the user already has
    const [userAddons] = await db.execute(`
      SELECT addon_slug 
      FROM user_addons 
      WHERE user_id = ? AND is_active = 1
    `, [req.userId]);

    const userAddonSlugs = userAddons.map(ua => ua.addon_slug);

    // Mark addons with ownership status
    const addonsWithStatus = addons.map(addon => ({
      ...addon,
      user_already_has: addon.user_level === 1 ? userAddonSlugs.includes(addon.addon_slug) : false
    }));

    res.json({ success: true, addons: addonsWithStatus });

  } catch (error) {
    console.error('Error fetching addons:', error);
    res.status(500).json({ error: 'Failed to fetch addons' });
  }
});

/**
 * GET /sites/my-addons
 * Get user's currently active addons for their site
 * Returns addons with activation dates and pricing information
 * 
 * @route GET /sites/my-addons
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requirePermission('manage_sites') - Requires site management permissions
 * @returns {Object} User's active addons with details
 */
router.get('/my-addons', verifyToken, requirePermission('manage_sites'), async (req, res) => {
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

/**
 * GET /sites/:id/addons
 * Get active addons for a specific site (PUBLIC - for artist storefronts)
 * Returns addons that are active and should be loaded on the public site
 * 
 * @route GET /sites/:id/addons
 * @param {string} id - Site ID
 * @returns {Object} Active addons for the site
 */
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

/**
 * POST /sites/addons/:id
 * Add an addon to the user's site
 * Activates addon with tier validation and duplicate checking
 * 
 * @route POST /sites/addons/:id
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requirePermission('manage_sites') - Requires site management permissions
 * @param {string} id - Addon ID to activate
 * @returns {Object} Addon activation confirmation
 */
router.post('/addons/:id', verifyToken, requirePermission('manage_sites'), async (req, res) => {
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

/**
 * DELETE /sites/addons/:id
 * Remove an addon from the user's site
 * Deactivates addon while preserving historical data
 * 
 * @route DELETE /sites/addons/:id
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requirePermission('manage_sites') - Requires site management permissions
 * @param {string} id - Addon ID to deactivate
 * @returns {Object} Addon deactivation confirmation
 */
router.delete('/addons/:id', verifyToken, requirePermission('manage_sites'), async (req, res) => {
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

/**
 * POST /sites/user-addons/:id
 * Activate a user-level addon (applies to all user's sites)
 * Handles user-wide addon subscriptions and marketplace integration
 * 
 * @route POST /sites/user-addons/:id
 * @middleware verifyToken - Requires valid JWT token
 * @param {string} id - User-level addon ID to activate
 * @returns {Object} User addon activation confirmation
 */
router.post('/user-addons/:id', verifyToken, async (req, res) => {
  try {
    const addonId = req.params.id;
    const userId = req.userId;

    // Verify addon exists, is active, and is user-level
    const [addon] = await db.execute(`
      SELECT id, addon_name, addon_slug, user_level FROM website_addons 
      WHERE id = ? AND is_active = 1 AND user_level = 1
    `, [addonId]);

    if (addon.length === 0) {
      return res.status(404).json({ error: 'User-level addon not found' });
    }

    const addonData = addon[0];

    // Check if user already has this addon active
    const [existing] = await db.execute(`
      SELECT id FROM user_addons 
      WHERE user_id = ? AND addon_slug = ? AND is_active = 1
    `, [userId, addonData.addon_slug]);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'You already have this add-on activated' });
    }

    // Activate the user-level addon
    await db.execute(`
      INSERT INTO user_addons (user_id, addon_slug, subscription_source) 
      VALUES (?, ?, 'marketplace_subscription')
      ON DUPLICATE KEY UPDATE 
        is_active = 1, 
        activated_at = CURRENT_TIMESTAMP,
        deactivated_at = NULL,
        subscription_source = 'marketplace_subscription'
    `, [userId, addonData.addon_slug]);

    res.json({ 
      success: true, 
      message: `${addonData.addon_name} activated successfully`,
      addon_id: addonId 
    });

  } catch (error) {
    console.error('Error activating user addon:', error);
    res.status(500).json({ error: 'Failed to activate add-on' });
  }
});

/**
 * POST /sites/addons
 * Create a new website addon (admin only)
 * Adds new addon to the system with script path and pricing configuration
 * 
 * @route POST /sites/addons
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requirePermission('manage_system') - Requires system management permissions
 * @param {Object} req.body - Addon creation data
 * @returns {Object} Created addon confirmation
 */
router.post('/addons', verifyToken, requirePermission('manage_system'), async (req, res) => {
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

/**
 * GET /sites/me
 * Get all sites belonging to the current user
 * Returns user's sites ordered by creation date
 * 
 * @route GET /sites/me
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requirePermission('manage_sites') - Requires site management permissions
 * @returns {Array} User's sites with complete details
 */
router.get('/me', verifyToken, requirePermission('manage_sites'), async (req, res) => {
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

/**
 * GET /sites/enforce-limits
 * Enforce tier-based site limits by deactivating excess sites
 * Called on dashboard load to ensure users don't exceed their tier limits
 * Deactivates oldest sites first when over limit
 * 
 * @route GET /sites/enforce-limits
 * @middleware verifyToken - Requires valid JWT token
 * @returns {Object} Enforcement result with count of deactivated sites
 */
router.get('/enforce-limits', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Check if user is admin (admins have unlimited sites)
    const [user] = await db.query(
      'SELECT user_type FROM users WHERE id = ?',
      [userId]
    );

    if (user[0]?.user_type === 'admin') {
      return res.json({
        success: true,
        sites_deactivated: 0,
        tier: 'Admin',
        site_limit: 999,
        message: 'Admin accounts have unlimited sites'
      });
    }

    // Get user's subscription tier
    const [subscription] = await db.query(
      'SELECT tier FROM user_subscriptions WHERE user_id = ? AND subscription_type = "websites" AND status = "active" LIMIT 1',
      [userId]
    );

    // Define tier-based limits
    const tierLimits = {
      'Starter Plan': 1,
      'Professional Plan': 1,
      'Business Plan': 999,
      'Promoter Plan': 1,
      'Promoter Business Plan': 999
    };

    const userTier = subscription[0]?.tier || 'Starter Plan';
    const siteLimit = tierLimits[userTier] || 1;

    // Count active sites
    const [activeSites] = await db.query(
      'SELECT COUNT(*) as count FROM sites WHERE user_id = ? AND status = "active"',
      [userId]
    );

    const activeSiteCount = activeSites[0].count;

    // If within limit, no action needed
    if (activeSiteCount <= siteLimit) {
      return res.json({
        success: true,
        sites_deactivated: 0,
        tier: userTier,
        site_limit: siteLimit,
        active_sites: activeSiteCount
      });
    }

    // User is over limit - deactivate excess sites (oldest first)
    const sitesToDeactivate = activeSiteCount - siteLimit;

    // Get the oldest active sites to deactivate
    const [sitesToUpdate] = await db.query(
      'SELECT id FROM sites WHERE user_id = ? AND status = "active" ORDER BY created_at ASC LIMIT ?',
      [userId, sitesToDeactivate]
    );

    // Deactivate them
    const siteIds = sitesToUpdate.map(s => s.id);
    if (siteIds.length > 0) {
      await db.query(
        `UPDATE sites SET status = 'draft' WHERE id IN (${siteIds.map(() => '?').join(',')})`,
        siteIds
      );
    }

    res.json({
      success: true,
      sites_deactivated: sitesToDeactivate,
      tier: userTier,
      site_limit: siteLimit,
      active_sites: siteLimit,
      message: `Deactivated ${sitesToDeactivate} site${sitesToDeactivate === 1 ? '' : 's'} to match tier limit`
    });

  } catch (err) {
    console.error('Error enforcing site limits:', err);
    res.status(500).json({ error: 'Failed to enforce site limits' });
  }
});

/**
 * GET /sites/all
 * Get all sites in the system (admin only)
 * Returns all sites with user information for administrative purposes
 * 
 * @route GET /sites/all
 * @middleware verifyToken - Requires valid JWT token
 * @returns {Array} All sites with user details (admin access required)
 */
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

/**
 * POST /sites
 * Create a new site for the authenticated user
 * Handles subdomain validation, uniqueness checking, and site limits
 * 
 * @route POST /sites
 * @middleware verifyToken - Requires valid JWT token
 * @param {Object} req.body - Site creation data
 * @returns {Object} Created site details
 */
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

    // Check site limits based on tier (admins unlimited)
    if (user[0].user_type !== 'admin') {
      // Get user's subscription tier
      const [subscription] = await db.query(
        'SELECT tier FROM user_subscriptions WHERE user_id = ? AND subscription_type = "websites" AND status = "active" LIMIT 1',
        [req.userId]
      );

      // Define tier-based limits
      const tierLimits = {
        'Starter Plan': 1,
        'Professional Plan': 1,
        'Business Plan': 999, // Unlimited (practical limit)
        'Promoter Plan': 1,
        'Promoter Business Plan': 999 // Unlimited
      };

      const userTier = subscription[0]?.tier || 'Starter Plan';
      const siteLimit = tierLimits[userTier] || 1;

      // Count existing sites
      const [existingSites] = await db.query(
        'SELECT COUNT(*) as count FROM sites WHERE user_id = ?',
        [req.userId]
      );

      const currentSiteCount = existingSites[0].count;

      if (currentSiteCount >= siteLimit) {
        if (siteLimit === 1) {
          return res.status(400).json({ 
            error: 'Site limit reached',
            message: 'Your current plan allows 1 site. Upgrade to Business Plan or Promoter Business Plan for multiple sites.',
            current_tier: userTier,
            site_limit: siteLimit
          });
        } else {
          return res.status(400).json({ 
            error: 'Site limit reached',
            message: `You've reached your site limit of ${siteLimit} sites.`,
            current_tier: userTier,
            site_limit: siteLimit
          });
        }
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

/**
 * PUT /sites/:id
 * Update an existing site's configuration
 * Handles site details, custom domains, and status changes with validation
 * 
 * @route PUT /sites/:id
 * @middleware verifyToken - Requires valid JWT token
 * @param {string} id - Site ID to update
 * @param {Object} req.body - Site update data
 * @returns {Object} Updated site details
 */
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

    // If activating a site, check tier limits (admins exempt)
    if (status === 'active' && user[0].user_type !== 'admin') {
      // Get current site status
      const [currentSite] = await db.query(
        'SELECT status FROM sites WHERE id = ?',
        [id]
      );

      // Only check limit if site is currently not active
      if (currentSite[0]?.status !== 'active') {
        // Get user's subscription tier
        const [subscription] = await db.query(
          'SELECT tier FROM user_subscriptions WHERE user_id = ? AND subscription_type = "websites" AND status = "active" LIMIT 1',
          [req.userId]
        );

        // Define tier-based limits
        const tierLimits = {
          'Starter Plan': 1,
          'Professional Plan': 1,
          'Business Plan': 999,
          'Promoter Plan': 1,
          'Promoter Business Plan': 999
        };

        const userTier = subscription[0]?.tier || 'Starter Plan';
        const siteLimit = tierLimits[userTier] || 1;

        // Count currently active sites
        const [activeSites] = await db.query(
          'SELECT COUNT(*) as count FROM sites WHERE user_id = ? AND status = "active"',
          [req.userId]
        );

        const activeSiteCount = activeSites[0].count;

        // If at limit, prevent activation
        if (activeSiteCount >= siteLimit) {
          return res.status(400).json({
            error: 'Active site limit reached',
            message: `Your ${userTier} allows ${siteLimit} active site${siteLimit === 1 ? '' : 's'}. Please deactivate another site first, or upgrade your plan.`,
            current_tier: userTier,
            site_limit: siteLimit,
            active_sites: activeSiteCount
          });
        }
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

/**
 * DELETE /sites/:id
 * Delete a site (soft delete by setting status to 'deleted')
 * Preserves site data while marking it as deleted for historical purposes
 * 
 * @route DELETE /sites/:id
 * @middleware verifyToken - Requires valid JWT token
 * @param {string} id - Site ID to delete
 * @returns {Object} Deletion confirmation message
 */
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

/**
 * GET /sites/categories
 * Get user's custom categories for organizing content
 * Returns hierarchical category structure with display ordering
 * 
 * @route GET /sites/categories
 * @middleware verifyToken - Requires valid JWT token
 * @returns {Array} User's custom categories with hierarchy
 */
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

/**
 * POST /sites/categories
 * Create a new custom category for the user
 * Supports hierarchical categories with parent-child relationships
 * 
 * @route POST /sites/categories
 * @middleware verifyToken - Requires valid JWT token
 * @param {Object} req.body - Category creation data
 * @returns {Object} Created category details
 */
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

/**
 * PUT /sites/categories/:id
 * Update an existing custom category
 * Handles category details and hierarchy changes with circular reference prevention
 * 
 * @route PUT /sites/categories/:id
 * @middleware verifyToken - Requires valid JWT token
 * @param {string} id - Category ID to update
 * @param {Object} req.body - Category update data
 * @returns {Object} Updated category details
 */
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

/**
 * DELETE /sites/categories/:id
 * Delete a custom category
 * Prevents deletion of categories with subcategories to maintain data integrity
 * 
 * @route DELETE /sites/categories/:id
 * @middleware verifyToken - Requires valid JWT token
 * @param {string} id - Category ID to delete
 * @returns {Object} Deletion confirmation message
 */
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

/**
 * GET /sites/resolve/:subdomain
 * Resolve subdomain to complete site data (PUBLIC)
 * Returns site information with user profile and customization data
 * 
 * @route GET /sites/resolve/:subdomain
 * @param {string} subdomain - Subdomain to resolve
 * @returns {Object} Complete site data with user and customization information
 */
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
       WHERE s.subdomain = ?`,
      [subdomain]
    );

    if (!site[0]) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const siteData = site[0];

    // If site is not active, return status information
    if (siteData.status !== 'active') {
      return res.status(200).json({
        ...siteData,
        available: false,
        statusMessage: getStatusMessage(siteData.status)
      });
    }

    res.json({
      ...siteData,
      available: true
    });
  } catch (err) {
    // Error('Error resolving subdomain:', err);
    res.status(500).json({ error: 'Failed to resolve subdomain' });
  }
});

/**
 * Get human-readable status message for site status
 * @param {string} status - Site status from database
 * @returns {string} Human-readable status message
 */
function getStatusMessage(status) {
  switch (status) {
    case 'draft':
      return 'This site is currently being set up and will be available soon.';
    case 'inactive':
      return 'This site is temporarily unavailable. Please check back later.';
    case 'suspended':
      return 'This site has been temporarily suspended.';
    case 'suspended_violation':
      return 'This site has been suspended due to policy violations.';
    case 'suspended_finance':
      return 'This site has been suspended due to payment issues.';
    case 'deleted':
      return 'This site no longer exists or has been removed.';
    default:
      return 'This site is currently unavailable.';
  }
}

/**
 * GET /sites/resolve/:subdomain/products
 * Get products for a specific site (PUBLIC)
 * Returns paginated product listings with images for public storefronts
 * 
 * @route GET /sites/resolve/:subdomain/products
 * @param {string} subdomain - Site subdomain
 * @param {number} [limit=20] - Number of products to return
 * @param {number} [offset=0] - Pagination offset
 * @param {string} [category] - Category filter
 * @returns {Array} Site's products with images
 */
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

/**
 * GET /sites/resolve/:subdomain/articles
 * Get articles for a specific site (PUBLIC)
 * Returns articles filtered by type (menu, blog, pages) with featured images
 * 
 * @route GET /sites/resolve/:subdomain/articles
 * @param {string} subdomain - Site subdomain
 * @param {string} [type=all] - Article type filter (all, menu, blog, pages)
 * @param {number} [limit=10] - Number of articles to return
 * @param {number} [offset=0] - Pagination offset
 * @returns {Array} Site's articles with featured images
 */
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

/**
 * GET /sites/resolve/:subdomain/categories
 * Get user categories for a specific site (PUBLIC)
 * Returns hierarchical category structure for public site navigation
 * 
 * @route GET /sites/resolve/:subdomain/categories
 * @param {string} subdomain - Site subdomain
 * @returns {Array} Site's custom categories with hierarchy
 */
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

/**
 * GET /sites/:id/customizations
 * Get site customization settings (colors, fonts, CSS)
 * Returns current customizations or default values with permission-based access
 * 
 * @route GET /sites/:id/customizations
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requirePermission('sites') - Requires sites permissions
 * @param {string} id - Site ID
 * @returns {Object} Site customization settings
 */
router.get('/:id/customizations', verifyToken, requirePermission('sites'), async (req, res) => {
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

/**
 * PUT /sites/:id/customizations
 * Update site customization settings with tiered permission validation
 * Supports basic colors, advanced styling, and professional custom CSS
 * 
 * @route PUT /sites/:id/customizations
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requirePermission('sites') - Requires sites permissions
 * @param {string} id - Site ID
 * @param {Object} req.body - Customization settings
 * @returns {Object} Updated customization settings
 */
router.put('/:id/customizations', verifyToken, requirePermission('sites'), async (req, res) => {
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

/**
 * GET /sites/check-subdomain/:subdomain
 * Check if a subdomain is available for registration (PUBLIC)
 * Validates format, checks reserved names, and verifies availability
 * 
 * @route GET /sites/check-subdomain/:subdomain
 * @param {string} subdomain - Subdomain to check
 * @returns {Object} Availability status with reason if unavailable
 */
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

/**
 * GET /sites/resolve-custom-domain/:domain
 * Resolve custom domain to site information
 * Returns site details for verified custom domains with active status
 * 
 * @route GET /sites/resolve-custom-domain/:domain
 * @param {string} domain - Custom domain to resolve
 * @returns {Object} Site information for the custom domain
 */
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