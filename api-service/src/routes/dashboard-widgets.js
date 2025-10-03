/**
 * Dashboard Widgets Routes
 * Comprehensive dashboard widget management system for the Beemeeart platform
 * Handles widget layouts, shortcuts, admin controls, and widget data endpoints
 * Supports customizable dashboard experiences with drag-and-drop functionality
 */

const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');

// ================================
// WIDGET LAYOUT MANAGEMENT
// ================================

/**
 * GET /api/dashboard-widgets/layout
 * Get user's dashboard layout with widgets and admin-locked widgets
 * Auto-creates shortcuts widget if it doesn't exist for the user
 * 
 * @route GET /api/dashboard-widgets/layout
 * @middleware verifyToken - Requires user authentication
 * @returns {Object} Dashboard layout with user and admin widgets
 * @returns {Array} userLayout - User's customizable widgets
 * @returns {Array} adminLayout - Admin-locked system widgets
 * @returns {number} totalWidgets - Total count of all widgets
 */
router.get('/layout', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Auto-create shortcuts widget if it doesn't exist
    await ensureShortcutsWidget(userId);
    
    // Ensure products widget type exists (user can add it manually)
    await ensureProductsWidgetType();
    
    // Get all user's widgets (including auto-created shortcuts)
    const [userLayout] = await db.execute(`
      SELECT 
        dl.*,
        dwt.display_name,
        dwt.category,
        dwt.default_config
      FROM dashboard_layouts dl
      JOIN dashboard_widget_types dwt ON dl.widget_type = dwt.widget_type
      WHERE dl.user_id = ?
      ORDER BY dl.grid_row ASC, dl.grid_col ASC
    `, [userId]);

    // Get admin-locked widgets (system announcements, etc. - NOT shortcuts)
    const [adminLayout] = await db.execute(`
      SELECT 
        dl.*,
        dwt.display_name,
        dwt.category,
        dwt.default_config
      FROM dashboard_layouts dl
      JOIN dashboard_widget_types dwt ON dl.widget_type = dwt.widget_type
      WHERE dl.is_admin_locked = 1 AND dl.user_id = ?
      ORDER BY dl.grid_row ASC, dl.grid_col ASC
    `, [userId]);

    res.json({ 
      success: true, 
      userLayout, 
      adminLayout,
      totalWidgets: userLayout.length + adminLayout.length 
    });
  } catch (err) {
    console.error('Error fetching dashboard layout:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard layout' });
  }
});

/**
 * POST /api/dashboard-widgets/layout
 * Save user's dashboard layout with full grid positioning
 * Clears existing user layout and saves new configuration
 * Preserves admin-locked widgets during layout updates
 * 
 * @route POST /api/dashboard-widgets/layout
 * @middleware verifyToken - Requires user authentication
 * @param {Array} req.body.layout - Array of widget configurations
 * @param {string} req.body.layout[].widget_type - Widget type identifier
 * @param {number} req.body.layout[].grid_row - Grid row position
 * @param {number} req.body.layout[].grid_col - Grid column position
 * @param {Object} [req.body.layout[].widget_config] - Optional widget configuration
 * @returns {Object} Success confirmation with message
 */
router.post('/layout', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { layout } = req.body; // Array of {widget_type, grid_row, grid_col, widget_config?}

    if (!Array.isArray(layout)) {
      return res.status(400).json({ error: 'Layout must be an array' });
    }

      // Clear existing user layout (preserve admin-locked widgets)
      await db.execute(
        'DELETE FROM dashboard_layouts WHERE user_id = ? AND is_admin_locked = 0',
        [userId]
      );

      // Insert new layout
      if (layout.length > 0) {
        const values = layout.map(widget => [
          userId,
          widget.widget_type,
          widget.grid_row,
          widget.grid_col,
          widget.widget_config ? JSON.stringify(widget.widget_config) : null,
          0 // is_admin_locked
        ]);

        const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
        const flatValues = values.flat();

        await db.execute(`
          INSERT INTO dashboard_layouts (user_id, widget_type, grid_row, grid_col, widget_config, is_admin_locked)
          VALUES ${placeholders}
          ON DUPLICATE KEY UPDATE
            widget_type = VALUES(widget_type),
            widget_config = VALUES(widget_config),
            is_admin_locked = VALUES(is_admin_locked)
        `, flatValues);
      }

      res.json({ success: true, message: 'Dashboard layout saved' });
  } catch (err) {
    console.error('Error saving dashboard layout:', err);
    res.status(500).json({ error: 'Failed to save dashboard layout' });
  }
});

/**
 * GET /api/dashboard-widgets/widget-types
 * Get available widget types for user based on permissions
 * Returns widgets grouped by category for organized display
 * 
 * @route GET /api/dashboard-widgets/widget-types
 * @middleware verifyToken - Requires user authentication
 * @returns {Object} Available widget types grouped by category
 * @returns {Object} widget_types - Widget types organized by category
 */
router.get('/widget-types', verifyToken, async (req, res) => {
  try {
    const userPermissions = req.user?.permissions || [];
    
    // Get widget types user has permission for
    const [widgetTypes] = await db.execute(`
      SELECT * FROM dashboard_widget_types 
      WHERE is_active = 1 
        AND (required_permission IS NULL OR required_permission IN (${userPermissions.map(() => '?').join(',') || "'none'"}))
      ORDER BY category ASC, display_name ASC
    `, userPermissions);

    // Group by category
    const grouped = widgetTypes.reduce((acc, widget) => {
      const category = widget.category || 'general';
      if (!acc[category]) acc[category] = [];
      acc[category].push(widget);
      return acc;
    }, {});

    res.json({ success: true, widget_types: grouped });
  } catch (err) {
    console.error('Error fetching widget types:', err);
    res.status(500).json({ error: 'Failed to fetch widget types' });
  }
});

// ================================
// WIDGET DATA ENDPOINTS
// ================================

/**
 * GET /api/dashboard-widgets/widget-data/:widgetType
 * Get data for specific widget type with optional configuration
 * Routes to appropriate data fetcher based on widget type
 * 
 * @route GET /api/dashboard-widgets/widget-data/:widgetType
 * @middleware verifyToken - Requires user authentication
 * @param {string} widgetType - Widget type identifier
 * @param {string} [config] - JSON configuration string (query parameter)
 * @returns {Object} Widget-specific data and metadata
 * @returns {Object} data - Widget data based on type
 * @returns {string} widget_type - Confirmed widget type
 */
router.get('/widget-data/:widgetType', verifyToken, async (req, res) => {
  try {
    const { widgetType } = req.params;
    const { config } = req.query; // JSON config string
    const userId = req.userId;

    let widgetConfig = {};
    if (config) {
      try {
        widgetConfig = JSON.parse(config);
      } catch (e) {
        widgetConfig = {};
      }
    }

    let data = {};

    // Route to appropriate data fetcher based on widget type
    switch (widgetType) {
      case 'my_shortcuts':
        data = await getShortcutsData(userId, widgetConfig);
        break;
      case 'my_products':
        // My Products widget doesn't need backend data - it fetches directly from /api/products/my
        data = { message: 'My Products widget fetches data directly from /api/products/my' };
        break;
      default:
        return res.status(400).json({ error: 'Unknown widget type' });
    }

    res.json({ success: true, data, widget_type: widgetType });
  } catch (err) {
    console.error(`Error fetching ${req.params.widgetType} data:`, err);
    res.status(500).json({ error: 'Failed to fetch widget data' });
  }
});

// ================================
// SHORTCUTS WIDGET MANAGEMENT
// ================================

/**
 * POST /api/dashboard-widgets/shortcuts/add
 * Add shortcut to user's shortcuts widget with validation
 * Checks for duplicates and enforces maximum shortcuts limit
 * 
 * @route POST /api/dashboard-widgets/shortcuts/add
 * @middleware verifyToken - Requires user authentication
 * @param {Object} req.body.shortcut - Shortcut configuration
 * @param {string} req.body.shortcut.id - Unique shortcut identifier
 * @param {string} req.body.shortcut.label - Display label for shortcut
 * @param {string} req.body.shortcut.icon - Font Awesome icon class
 * @param {string} req.body.shortcut.slideInType - Slide-in panel type
 * @returns {Object} Updated shortcuts list and success message
 * @returns {Array} shortcuts - Updated shortcuts array
 */
router.post('/add', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { shortcut } = req.body; // {id, label, icon, slideInType}

    if (!shortcut || !shortcut.id || !shortcut.label || !shortcut.slideInType) {
      return res.status(400).json({ error: 'Invalid shortcut data' });
    }

    // Get current shortcuts widget
    const [widget] = await db.execute(
      'SELECT * FROM dashboard_layouts WHERE user_id = ? AND widget_type = ?',
      [userId, 'my_shortcuts']
    );

    if (widget.length === 0) {
      return res.status(404).json({ error: 'Shortcuts widget not found' });
    }

    const currentConfig = widget[0].widget_config || { shortcuts: [] };
    const shortcuts = currentConfig.shortcuts || [];

    // Check if shortcut already exists
    if (shortcuts.find(s => s.id === shortcut.id)) {
      return res.status(400).json({ error: 'Shortcut already exists' });
    }

    // Check max shortcuts limit
    if (shortcuts.length >= 10) {
      return res.status(400).json({ error: 'Maximum shortcuts limit reached' });
    }

    // Add new shortcut
    shortcuts.push(shortcut);
    const newConfig = { ...currentConfig, shortcuts };

    // Update widget config
    await db.execute(
      'UPDATE dashboard_layouts SET widget_config = ? WHERE user_id = ? AND widget_type = ?',
      [JSON.stringify(newConfig), userId, 'my_shortcuts']
    );

    res.json({ success: true, shortcuts, message: 'Shortcut added successfully' });
  } catch (err) {
    console.error('Error adding shortcut:', err);
    res.status(500).json({ error: 'Failed to add shortcut' });
  }
});

/**
 * POST /api/dashboard-widgets/shortcuts/remove
 * Remove shortcut from user's shortcuts widget by ID
 * Updates widget configuration with filtered shortcuts list
 * 
 * @route POST /api/dashboard-widgets/shortcuts/remove
 * @middleware verifyToken - Requires user authentication
 * @param {string} req.body.shortcutId - Shortcut ID to remove
 * @returns {Object} Updated shortcuts list and success message
 * @returns {Array} shortcuts - Updated shortcuts array after removal
 */
router.post('/remove', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { shortcutId } = req.body;

    if (!shortcutId) {
      return res.status(400).json({ error: 'Shortcut ID required' });
    }

    // Get current shortcuts widget
    const [widget] = await db.execute(
      'SELECT * FROM dashboard_layouts WHERE user_id = ? AND widget_type = ?',
      [userId, 'my_shortcuts']
    );

    if (widget.length === 0) {
      return res.status(404).json({ error: 'Shortcuts widget not found' });
    }

    const currentConfig = widget[0].widget_config || { shortcuts: [] };
    const shortcuts = currentConfig.shortcuts || [];

    // Remove shortcut
    const filteredShortcuts = shortcuts.filter(s => s.id !== shortcutId);
    const newConfig = { ...currentConfig, shortcuts: filteredShortcuts };

    // Update widget config
    await db.execute(
      'UPDATE dashboard_layouts SET widget_config = ? WHERE user_id = ? AND widget_type = ?',
      [JSON.stringify(newConfig), userId, 'my_shortcuts']
    );

    res.json({ success: true, shortcuts: filteredShortcuts, message: 'Shortcut removed successfully' });
  } catch (err) {
    console.error('Error removing shortcut:', err);
    res.status(500).json({ error: 'Failed to remove shortcut' });
  }
});

// ================================
// ADMIN WIDGET MANAGEMENT
// ================================

/**
 * POST /api/dashboard-widgets/admin/locked-widget
 * Admin: Create locked widget for users (announcements, system messages, etc.)
 * Creates admin-controlled widgets that users cannot remove or modify
 * 
 * @route POST /api/dashboard-widgets/admin/locked-widget
 * @middleware verifyToken - Requires user authentication
 * @middleware requirePermission('manage_system') - Requires system management permission
 * @param {string} req.body.widget_type - Widget type to create
 * @param {number} req.body.grid_row - Grid row position
 * @param {number} req.body.grid_col - Grid column position
 * @param {Object} [req.body.widget_config] - Widget configuration object
 * @param {Array} [req.body.target_users] - Specific user IDs (defaults to all users)
 * @returns {Object} Creation confirmation with affected user count
 * @returns {number} affected_users - Number of users who received the widget
 */
router.post('/admin/locked-widget', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { widget_type, grid_row, grid_col, widget_config, target_users } = req.body;

    if (!widget_type || grid_row === undefined || grid_col === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // If target_users specified, create for those users, otherwise all users
    let targetUserIds = target_users;
    if (!targetUserIds || targetUserIds.length === 0) {
      const [allUsers] = await db.execute('SELECT id FROM users WHERE is_active = 1');
      targetUserIds = allUsers.map(u => u.id);
    }

    // Create locked widgets for target users
    const values = targetUserIds.map(userId => [
      userId,
      widget_type,
      grid_row,
      grid_col,
      widget_config ? JSON.stringify(widget_config) : null,
      1 // is_admin_locked
    ]);

    const placeholders = values.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const flatValues = values.flat();

    await db.execute(`
      INSERT INTO dashboard_layouts (user_id, widget_type, grid_row, grid_col, widget_config, is_admin_locked)
      VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE 
        widget_type = VALUES(widget_type),
        widget_config = VALUES(widget_config),
        is_admin_locked = 1
    `, flatValues);

    res.json({ 
      success: true, 
      message: `Locked widget created for ${targetUserIds.length} users`,
      affected_users: targetUserIds.length 
    });
  } catch (err) {
    console.error('Error creating locked widget:', err);
    res.status(500).json({ error: 'Failed to create locked widget' });
  }
});

// ================================
// WIDGET DATA FETCHERS
// ================================

/**
 * Ensure shortcuts widget type exists in database
 * Creates the shortcuts widget type if it doesn't exist
 * Sets up default configuration and metadata
 * 
 * @returns {Promise<void>} Resolves when widget type is ensured
 */
async function ensureShortcutsWidgetType() {
  try {
    const [existing] = await db.execute(
      'SELECT id FROM dashboard_widget_types WHERE widget_type = ?',
      ['my_shortcuts']
    );

    if (existing.length === 0) {
      await db.execute(`
        INSERT INTO dashboard_widget_types (widget_type, display_name, description, category, is_active, default_config)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        'my_shortcuts',
        'My Shortcuts',
        'Quick access shortcuts to frequently used menu items',
        'productivity',
        1,
        JSON.stringify({ shortcuts: [] })
      ]);
    }
  } catch (err) {
    console.error('Error ensuring shortcuts widget type:', err);
  }
}

/**
 * Ensure products widget type exists in database
 * Creates the products widget type if it doesn't exist
 * Sets up default configuration for store management category
 * 
 * @returns {Promise<void>} Resolves when widget type is ensured
 */
async function ensureProductsWidgetType() {
  try {
    const [existing] = await db.execute(
      'SELECT id FROM dashboard_widget_types WHERE widget_type = ?',
      ['my_products']
    );

    if (existing.length === 0) {
      await db.execute(`
        INSERT INTO dashboard_widget_types (widget_type, display_name, description, category, is_active, default_config)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        'my_products',
        'My Products',
        'Display your recent products with quick access to manage them',
        'store_management',
        1,
        JSON.stringify({})
      ]);
    }
  } catch (err) {
    console.error('Error ensuring products widget type:', err);
  }
}

/**
 * Auto-create shortcuts widget for user if it doesn't exist
 * Creates default shortcuts widget with 3 pre-configured shortcuts
 * Ensures every user has access to basic dashboard functionality
 * 
 * @param {number} userId - User ID to create shortcuts widget for
 * @returns {Promise<void>} Resolves when shortcuts widget is ensured
 */
async function ensureShortcutsWidget(userId) {
  try {
    console.log('Ensuring shortcuts widget for user:', userId);
    
    // First ensure the widget type exists
    await ensureShortcutsWidgetType();

    // Check if shortcuts widget already exists
    const [existing] = await db.execute(
      'SELECT id FROM dashboard_layouts WHERE user_id = ? AND widget_type = ?',
      [userId, 'my_shortcuts']
    );

    console.log('Existing shortcuts widgets:', existing.length);

    if (existing.length === 0) {
      console.log('Creating default shortcuts widget for user:', userId);
      
      // Create default shortcuts widget with 3 default shortcuts
      const defaultConfig = {
        shortcuts: [
          {
            id: 'edit-profile',
            label: 'Edit Profile',
            icon: 'fas fa-user-edit',
            slideInType: 'edit-profile'
          },
          {
            id: 'my-orders',
            label: 'My Orders', 
            icon: 'fas fa-shopping-bag',
            slideInType: 'my-orders'
          },
          {
            id: 'email-settings',
            label: 'Email Settings',
            icon: 'fas fa-envelope-open-text',
            slideInType: 'email-settings'
          }
        ]
      };

      const result = await db.execute(`
        INSERT INTO dashboard_layouts (user_id, widget_type, grid_row, grid_col, widget_config, is_admin_locked)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [userId, 'my_shortcuts', 0, 0, JSON.stringify(defaultConfig), 0]);
      
      console.log('Shortcuts widget created successfully:', result);
    } else {
      console.log('Shortcuts widget already exists for user:', userId);
    }
  } catch (err) {
    console.error('Error ensuring shortcuts widget:', err);
    // Don't throw - this is a background operation
  }
}

/**
 * Get shortcuts widget data from database
 * Fetches current shortcuts configuration and availability status
 * Returns shortcuts with metadata about limits and capacity
 * 
 * @param {number} userId - User ID to fetch shortcuts for
 * @param {Object} config - Widget configuration (not used, fetches fresh from DB)
 * @returns {Promise<Object>} Shortcuts data with metadata
 * @returns {Array} shortcuts - Current shortcuts array
 * @returns {number} maxShortcuts - Maximum allowed shortcuts (10)
 * @returns {boolean} canAddMore - Whether user can add more shortcuts
 */
async function getShortcutsData(userId, config) {
  try {
    // Fetch fresh data from database, not from config
    const [widget] = await db.execute(
      'SELECT widget_config FROM dashboard_layouts WHERE user_id = ? AND widget_type = ?',
      [userId, 'my_shortcuts']
    );

    if (widget.length === 0) {
      return { shortcuts: [], maxShortcuts: 10, canAddMore: true };
    }

    const currentConfig = widget[0].widget_config || { shortcuts: [] };
    const shortcuts = currentConfig.shortcuts || [];
    
    return {
      shortcuts,
      maxShortcuts: 10,
      canAddMore: shortcuts.length < 10
    };
  } catch (err) {
    console.error('Error fetching shortcuts data:', err);
    return { shortcuts: [], maxShortcuts: 10, canAddMore: true };
  }
}

/**
 * POST /api/dashboard-widgets/add-widget
 * Add a single widget to user's dashboard
 * Simple widget addition with grid positioning
 * 
 * @route POST /api/dashboard-widgets/add-widget
 * @middleware verifyToken - Requires user authentication
 * @param {string} req.body.widgetType - Widget type to add
 * @param {number} req.body.gridRow - Grid row position
 * @param {number} req.body.gridCol - Grid column position
 * @returns {Object} Success confirmation
 */
router.post('/add-widget', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { widgetType, gridRow, gridCol } = req.body;

    // Simple INSERT - just add the widget
    await db.execute(`
      INSERT INTO dashboard_layouts (user_id, widget_type, grid_row, grid_col, widget_config)
      VALUES (?, ?, ?, ?, ?)
    `, [userId, widgetType, gridRow, gridCol, JSON.stringify({})]);

    res.json({ success: true });
  } catch (err) {
    console.error('Error adding widget:', err);
    res.status(500).json({ error: 'Failed to add widget' });
  }
});

/**
 * POST /api/dashboard-widgets/remove-widget
 * Remove a single widget from user's dashboard
 * Only removes user widgets, preserves admin-locked widgets
 * 
 * @route POST /api/dashboard-widgets/remove-widget
 * @middleware verifyToken - Requires user authentication
 * @param {string} req.body.widgetType - Widget type to remove
 * @returns {Object} Success confirmation with removal message
 */
router.post('/remove-widget', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { widgetType } = req.body;

    if (!widgetType) {
      return res.status(400).json({ error: 'Widget type is required' });
    }

    // Delete the widget (only user widgets, not admin-locked ones)
    const result = await db.execute(`
      DELETE FROM dashboard_layouts 
      WHERE user_id = ? AND widget_type = ? AND is_admin_locked = 0
    `, [userId, widgetType]);

    if (result[0].affectedRows === 0) {
      return res.status(404).json({ error: 'Widget not found or cannot be removed' });
    }

    res.json({ success: true, message: 'Widget removed successfully' });
  } catch (err) {
    console.error('Error removing widget:', err);
    res.status(500).json({ error: 'Failed to remove widget' });
  }
});

module.exports = router; 