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
    
    // Get user's custom layout
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

    // Get admin-locked widgets (global announcements, etc.)
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

    // Start transaction
    await db.execute('START TRANSACTION');

    try {
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

      await db.execute('COMMIT');
      res.json({ success: true, message: 'Dashboard layout saved' });
    } catch (err) {
      await db.execute('ROLLBACK');
      throw err;
    }
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
      // Add your first widget case here
      // case 'your_widget_type':
      //   data = await getYourWidgetData(userId, widgetConfig);
      //   break;
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

// Add your widget data functions here
// Example:
// async function getYourWidgetData(userId, config) {
//   // Your widget logic here
//   return { your_data: 'example' };
// }

module.exports = router; 