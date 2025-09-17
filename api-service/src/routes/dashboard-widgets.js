const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');

// ================================
// WIDGET LAYOUT MANAGEMENT
// ================================

// Get user's dashboard layout
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

// Save user's dashboard layout (full grid scan)
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
      `, flatValues);
    }

    res.json({ success: true, message: 'Dashboard layout saved' });
  } catch (err) {
    console.error('Error saving dashboard layout:', err);
    res.status(500).json({ error: 'Failed to save dashboard layout' });
  }
});

// Get available widget types for user
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

// Get data for specific widget
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

// Add shortcut to user's shortcuts widget
router.post('/shortcuts/add', verifyToken, async (req, res) => {
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

// Remove shortcut from user's shortcuts widget
router.post('/shortcuts/remove', verifyToken, async (req, res) => {
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

// Admin: Create locked widget for users (announcements, etc.)
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

// Ensure shortcuts widget type exists in database
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

// Ensure products widget type exists in database
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

// Auto-create shortcuts widget for user if it doesn't exist
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

// Get shortcuts widget data
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

// Add a single widget - simple INSERT
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

// Remove a single widget - simple DELETE
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