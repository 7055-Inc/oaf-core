const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');

/**
 * @fileoverview System announcements routes
 * 
 * Handles comprehensive system announcement functionality including:
 * - User-facing announcement checking and retrieval
 * - Admin announcement management (CRUD operations)
 * - User acknowledgment and reminder system
 * - Announcement statistics and analytics
 * - Target user type filtering and validation
 * - Time-based announcement scheduling and expiration
 * 
 * All endpoints support proper authentication and authorization.
 * User-facing endpoints filter announcements by user type and date range.
 * Admin endpoints require system management permissions.
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

/**
 * Check if user has pending announcements
 * @route GET /api/announcements/check-pending
 * @access Private (requires authentication)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Pending announcement status with counts
 * @description Checks if authenticated user has unacknowledged announcements based on user type and date range
 * @note MUST BE BEFORE ADMIN ROUTES to avoid route conflicts
 */
router.get('/check-pending', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const currentTime = new Date();
    
    // Get user type from database
    const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userType = user[0].user_type;
    
    // Get active announcements that target this user type and are within date range
    const [announcements] = await db.query(
      'SELECT a.id FROM announcements a ' +
      'WHERE a.is_active = TRUE ' +
      'AND a.show_from <= ? ' +
      'AND a.expires_at > ? ' +
      'AND JSON_CONTAINS(a.target_user_types, ?) ' +
      'ORDER BY a.created_at DESC',
      [currentTime, currentTime, JSON.stringify(userType)]
    );
    
    if (announcements.length === 0) {
      return res.json({ hasPending: false, requiresAcknowledgment: false });
    }
    
    // Get user's acknowledgment status for these announcements
    const announcementIds = announcements.map(a => a.id);
    const idPlaceholders = announcementIds.map(() => '?').join(',');
    const [acknowledgments] = await db.query(
      'SELECT announcement_id, acknowledged_at ' +
      'FROM user_acknowledgments ' +
      `WHERE user_id = ? AND announcement_id IN (${idPlaceholders})`,
      [userId, ...announcementIds]
    );
    
    // Check if there are any unacknowledged announcements
    const pendingCount = announcements.filter(announcement => {
      const ack = acknowledgments.find(a => a.announcement_id === announcement.id);
      return !ack || ack.acknowledged_at === null;
    }).length;
    
    res.json({ 
      hasPending: pendingCount > 0,
      requiresAcknowledgment: pendingCount > 0,
      pendingCount: pendingCount
    });
    
  } catch (err) {
    console.error('Error checking pending announcements:', err);
    res.status(500).json({ error: 'Failed to check pending announcements' });
  }
});

/**
 * Get pending announcements for current user
 * @route GET /api/announcements/pending
 * @access Private (requires authentication)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Array} List of pending announcements for the user's type
 * @description Retrieves unacknowledged announcements targeted to user's type within active date range
 * @note MUST BE BEFORE ADMIN ROUTES to avoid route conflicts
 */
router.get('/pending', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const currentTime = new Date();
    
    // Get user type from database
    const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userType = user[0].user_type;
    
    // Get active announcements that target this user type and are within date range
    const [announcements] = await db.query(
      'SELECT a.* FROM announcements a ' +
      'WHERE a.is_active = TRUE ' +
      'AND a.show_from <= ? ' +
      'AND a.expires_at > ? ' +
      'AND JSON_CONTAINS(a.target_user_types, ?) ' +
      'ORDER BY a.created_at DESC',
      [currentTime, currentTime, JSON.stringify(userType)]
    );
    
    if (announcements.length === 0) {
      return res.json([]);
    }
    
    // Get user's acknowledgment status for these announcements
    const announcementIds = announcements.map(a => a.id);
    const idPlaceholders = announcementIds.map(() => '?').join(',');
    const [acknowledgments] = await db.query(
      'SELECT announcement_id, acknowledged_at, remind_later_at ' +
      'FROM user_acknowledgments ' +
      `WHERE user_id = ? AND announcement_id IN (${idPlaceholders})`,
      [userId, ...announcementIds]
    );
    
    // Filter out acknowledged announcements and parse JSON safely
    const pendingAnnouncements = announcements.filter(announcement => {
      const ack = acknowledgments.find(a => a.announcement_id === announcement.id);
      // Show if no acknowledgment record or if not yet acknowledged
      return !ack || ack.acknowledged_at === null;
    }).map(announcement => {
      let targetUserTypes = [];
      
      try {
        const rawData = announcement.target_user_types;
        
        // Handle different possible formats from MySQL driver
        if (Array.isArray(rawData)) {
          // Already parsed as array
          targetUserTypes = rawData;
        } else if (typeof rawData === 'string' && rawData.trim() !== '') {
          // Parse JSON string
          targetUserTypes = JSON.parse(rawData);
        } else if (rawData === null || rawData === undefined) {
          // Null or undefined
          targetUserTypes = [];
        } else {
          // Unknown format, fallback to empty array
          targetUserTypes = [];
        }
        
        // Ensure it's always an array
        if (!Array.isArray(targetUserTypes)) {
          targetUserTypes = [];
        }
      } catch (parseErr) {
        console.error('JSON parse error for pending announcement:', announcement.id, 'Raw data:', announcement.target_user_types, parseErr);
        targetUserTypes = [];
      }
      
      return {
        ...announcement,
        target_user_types: targetUserTypes
      };
    });
    
    res.json(pendingAnnouncements);
    
  } catch (err) {
    console.error('Error getting pending announcements:', err);
    res.status(500).json({ error: 'Failed to get pending announcements' });
  }
});

/**
 * Get all announcements (admin)
 * @route GET /api/announcements
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Array} List of all announcements with creator information
 * @description Retrieves all announcements for system management with proper JSON parsing
 */
router.get('/', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const [announcements] = await db.query(
      'SELECT a.*, u.username as created_by_username ' +
      'FROM announcements a ' +
      'LEFT JOIN users u ON a.created_by = u.id ' +
      'ORDER BY a.created_at DESC'
    );
    
    // Parse JSON fields with error handling
    const formattedAnnouncements = announcements.map(announcement => {
      let targetUserTypes = [];
      
      try {
        const rawData = announcement.target_user_types;
        
        // Handle different possible formats from MySQL driver
        if (Array.isArray(rawData)) {
          // Already parsed as array
          targetUserTypes = rawData;
        } else if (typeof rawData === 'string' && rawData.trim() !== '') {
          // Parse JSON string
          targetUserTypes = JSON.parse(rawData);
        } else if (rawData === null || rawData === undefined) {
          // Null or undefined
          targetUserTypes = [];
        } else {
          // Unknown format, fallback to empty array
          targetUserTypes = [];
        }
        
        // Ensure it's always an array
        if (!Array.isArray(targetUserTypes)) {
          targetUserTypes = [];
        }
      } catch (parseErr) {
        console.error('JSON parse error for announcement:', announcement.id, 'Raw data:', announcement.target_user_types, parseErr);
        targetUserTypes = [];
      }
      
      return {
        ...announcement,
        target_user_types: targetUserTypes
      };
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.json(formattedAnnouncements);
  } catch (err) {
    console.error('Error fetching announcements:', err);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

/**
 * Create new announcement (admin)
 * @route POST /api/announcements
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.body.title - Announcement title (required)
 * @param {string} req.body.content - Announcement content (required)
 * @param {string} req.body.show_from - Start date/time (required)
 * @param {string} req.body.expires_at - Expiration date/time (required)
 * @param {Array} req.body.target_user_types - Target user types array (required)
 * @param {boolean} req.body.is_active - Active status (default: true)
 * @param {Object} res - Express response object
 * @returns {Object} Created announcement ID and success message
 * @description Creates new system announcement with validation and proper date/user type checking
 */
router.post('/', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { title, content, show_from, expires_at, target_user_types, is_active = true } = req.body;
    
    // Validate required fields
    if (!title || !content || !show_from || !expires_at || !target_user_types || !Array.isArray(target_user_types) || target_user_types.length === 0) {
      return res.status(400).json({ error: 'Missing required fields. Target user types must be a non-empty array.' });
    }
    
    // Validate user types
    const validUserTypes = ['artist', 'promoter', 'community', 'admin'];
    const invalidTypes = target_user_types.filter(type => !validUserTypes.includes(type));
    if (invalidTypes.length > 0) {
      return res.status(400).json({ error: `Invalid user types: ${invalidTypes.join(', ')}` });
    }
    
    // Validate dates
    const showFromDate = new Date(show_from);
    const expiresAtDate = new Date(expires_at);
    if (showFromDate >= expiresAtDate) {
      return res.status(400).json({ error: 'Show from date must be before expires at date' });
    }
    
    const [result] = await db.query(
      'INSERT INTO announcements (title, content, show_from, expires_at, target_user_types, is_active, created_by) ' +
      'VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, content, show_from, expires_at, JSON.stringify(target_user_types), is_active, req.userId]
    );
    
    res.status(201).json({ 
      id: result.insertId, 
      message: 'Announcement created successfully' 
    });
    
  } catch (err) {
    console.error('Error creating announcement:', err);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

/**
 * Update announcement (admin)
 * @route PUT /api/announcements/:id
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Announcement ID
 * @param {string} req.body.title - Announcement title (optional)
 * @param {string} req.body.content - Announcement content (optional)
 * @param {string} req.body.show_from - Start date/time (optional)
 * @param {string} req.body.expires_at - Expiration date/time (optional)
 * @param {Array} req.body.target_user_types - Target user types array (optional)
 * @param {boolean} req.body.is_active - Active status (optional)
 * @param {Object} res - Express response object
 * @returns {Object} Update success message
 * @description Updates existing announcement with dynamic field updates and validation
 */
router.put('/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, show_from, expires_at, target_user_types, is_active } = req.body;
    
    // Check if announcement exists
    const [existing] = await db.query('SELECT id FROM announcements WHERE id = ?', [id]);
    if (!existing[0]) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    // Validate user types if provided
    if (target_user_types !== undefined) {
      if (!Array.isArray(target_user_types) || target_user_types.length === 0) {
        return res.status(400).json({ error: 'Target user types must be a non-empty array.' });
      }
      const validUserTypes = ['artist', 'promoter', 'community', 'admin'];
      const invalidTypes = target_user_types.filter(type => !validUserTypes.includes(type));
      if (invalidTypes.length > 0) {
        return res.status(400).json({ error: `Invalid user types: ${invalidTypes.join(', ')}` });
      }
    }
    
    // Validate dates if provided
    if (show_from && expires_at) {
      const showFromDate = new Date(show_from);
      const expiresAtDate = new Date(expires_at);
      if (showFromDate >= expiresAtDate) {
        return res.status(400).json({ error: 'Show from date must be before expires at date' });
      }
    }
    
    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    
    if (title) { updateFields.push('title = ?'); updateValues.push(title); }
    if (content) { updateFields.push('content = ?'); updateValues.push(content); }
    if (show_from) { updateFields.push('show_from = ?'); updateValues.push(show_from); }
    if (expires_at) { updateFields.push('expires_at = ?'); updateValues.push(expires_at); }
    if (target_user_types) { updateFields.push('target_user_types = ?'); updateValues.push(JSON.stringify(target_user_types)); }
    if (is_active !== undefined) { updateFields.push('is_active = ?'); updateValues.push(is_active); }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateValues.push(id);
    
    await db.query(
      `UPDATE announcements SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    
    res.json({ message: 'Announcement updated successfully' });
    
  } catch (err) {
    console.error('Error updating announcement:', err);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

/**
 * Delete announcement (admin)
 * @route DELETE /api/announcements/:id
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Announcement ID
 * @param {Object} res - Express response object
 * @returns {Object} Deletion success message
 * @description Deletes announcement and all related user acknowledgments with cascade handling
 */
router.delete('/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if announcement exists
    const [existing] = await db.query('SELECT id FROM announcements WHERE id = ?', [id]);
    if (!existing[0]) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    // Delete related acknowledgments first
    await db.query('DELETE FROM user_acknowledgments WHERE announcement_id = ?', [id]);
    
    // Delete announcement
    await db.query('DELETE FROM announcements WHERE id = ?', [id]);
    
    res.json({ message: 'Announcement deleted successfully' });
    
  } catch (err) {
    console.error('Error deleting announcement:', err);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

/**
 * Get announcement statistics (admin)
 * @route GET /api/announcements/:id/stats
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Announcement ID
 * @param {Object} res - Express response object
 * @returns {Object} Comprehensive announcement statistics including acknowledgment rates
 * @description Provides detailed analytics on announcement performance and user engagement
 */
router.get('/:id/stats', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if announcement exists
    const [announcement] = await db.query('SELECT * FROM announcements WHERE id = ?', [id]);
    if (!announcement[0]) {
      return res.status(404).json({ error: 'Announcement not found' });
    }
    
    // Parse target_user_types safely
    let targetUserTypes = [];
    
    try {
      const rawData = announcement[0].target_user_types;
      
      if (Array.isArray(rawData)) {
        targetUserTypes = rawData;
      } else if (typeof rawData === 'string' && rawData.trim() !== '') {
        targetUserTypes = JSON.parse(rawData);
      } else if (rawData === null || rawData === undefined) {
        targetUserTypes = [];
      } else {
        targetUserTypes = [];
      }
      
      if (!Array.isArray(targetUserTypes)) {
        targetUserTypes = [];
      }
    } catch (parseErr) {
      console.error('JSON parse error for stats announcement:', announcement[0].id, 'Raw data:', announcement[0].target_user_types, parseErr);
      targetUserTypes = [];
    }
    
    const announcementData = {
      ...announcement[0],
      target_user_types: targetUserTypes
    };
    
    // Get total target users
    const placeholders = announcementData.target_user_types.map(() => '?').join(',');
    const [totalTargetUsers] = await db.query(
      `SELECT COUNT(*) as count FROM users WHERE user_type IN (${placeholders}) AND status = "active"`,
      announcementData.target_user_types
    );
    
    // Get acknowledgment stats
    const [ackStats] = await db.query(
      'SELECT ' +
      'COUNT(*) as total_interactions, ' +
      'SUM(CASE WHEN acknowledged_at IS NOT NULL THEN 1 ELSE 0 END) as acknowledged_count, ' +
      'SUM(CASE WHEN acknowledged_at IS NULL AND remind_later_at IS NOT NULL THEN 1 ELSE 0 END) as remind_later_count ' +
      'FROM user_acknowledgments WHERE announcement_id = ?',
      [id]
    );
    
    const totalTargets = totalTargetUsers[0].count;
    const acknowledged = ackStats[0].acknowledged_count || 0;
    const remindLater = ackStats[0].remind_later_count || 0;
    const noResponse = totalTargets - acknowledged - remindLater;
    
    res.json({
      announcement: announcementData,
      stats: {
        total_target_users: totalTargets,
        acknowledged: acknowledged,
        remind_later: remindLater,
        no_response: noResponse,
        acknowledgment_rate: totalTargets > 0 ? (acknowledged / totalTargets * 100).toFixed(1) : 0
      }
    });
    
  } catch (err) {
    console.error('Error getting announcement stats:', err);
    res.status(500).json({ error: 'Failed to get announcement statistics' });
  }
});

/**
 * Acknowledge announcement
 * @route POST /api/announcements/:id/acknowledge
 * @access Private (requires authentication)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Announcement ID
 * @param {Object} res - Express response object
 * @returns {Object} Acknowledgment success message
 * @description Records user acknowledgment of announcement with IP and user agent tracking
 */
router.post('/:id/acknowledge', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const currentTime = new Date();
    
    // Get user type from database
    const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userType = user[0].user_type;
    
    // Check if announcement exists and is valid for this user
    const [announcement] = await db.query(
      'SELECT * FROM announcements WHERE id = ? AND is_active = TRUE AND show_from <= ? AND expires_at > ?',
      [id, currentTime, currentTime]
    );
    
    if (!announcement[0]) {
      return res.status(404).json({ error: 'Announcement not found or expired' });
    }
    
    // Parse target_user_types safely
    let targetUserTypes = [];
    
    try {
      const rawData = announcement[0].target_user_types;
      
      if (Array.isArray(rawData)) {
        targetUserTypes = rawData;
      } else if (typeof rawData === 'string' && rawData.trim() !== '') {
        targetUserTypes = JSON.parse(rawData);
      } else if (rawData === null || rawData === undefined) {
        targetUserTypes = [];
      } else {
        targetUserTypes = [];
      }
      
      if (!Array.isArray(targetUserTypes)) {
        targetUserTypes = [];
      }
    } catch (parseErr) {
      console.error('JSON parse error for acknowledge announcement:', announcement[0].id, 'Raw data:', announcement[0].target_user_types, parseErr);
      targetUserTypes = [];
    }
    
    const announcementData = {
      ...announcement[0],
      target_user_types: targetUserTypes
    };
    
    // Check if user type is targeted
    if (!announcementData.target_user_types.includes(userType)) {
      return res.status(403).json({ error: 'This announcement is not for your user type' });
    }
    
    // Get client info
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    
    // Insert or update acknowledgment
    await db.query(
      'INSERT INTO user_acknowledgments (user_id, announcement_id, acknowledged_at, ip_address, user_agent) ' +
      'VALUES (?, ?, ?, ?, ?) ' +
      'ON DUPLICATE KEY UPDATE acknowledged_at = ?, ip_address = ?, user_agent = ?',
      [userId, id, currentTime, ipAddress, userAgent, currentTime, ipAddress, userAgent]
    );
    
    res.json({ message: 'Announcement acknowledged successfully' });
    
  } catch (err) {
    console.error('Error acknowledging announcement:', err);
    res.status(500).json({ error: 'Failed to acknowledge announcement' });
  }
});

/**
 * Set reminder for announcement
 * @route POST /api/announcements/:id/remind-later
 * @access Private (requires authentication)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Announcement ID
 * @param {Object} res - Express response object
 * @returns {Object} Reminder set success message
 * @description Sets reminder for announcement without marking as acknowledged
 */
router.post('/:id/remind-later', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const currentTime = new Date();
    
    // Get user type from database
    const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userType = user[0].user_type;
    
    // Check if announcement exists and is valid for this user
    const [announcement] = await db.query(
      'SELECT * FROM announcements WHERE id = ? AND is_active = TRUE AND show_from <= ? AND expires_at > ?',
      [id, currentTime, currentTime]
    );
    
    if (!announcement[0]) {
      return res.status(404).json({ error: 'Announcement not found or expired' });
    }
    
    // Parse target_user_types safely
    let targetUserTypes = [];
    
    try {
      const rawData = announcement[0].target_user_types;
      
      if (Array.isArray(rawData)) {
        targetUserTypes = rawData;
      } else if (typeof rawData === 'string' && rawData.trim() !== '') {
        targetUserTypes = JSON.parse(rawData);
      } else if (rawData === null || rawData === undefined) {
        targetUserTypes = [];
      } else {
        targetUserTypes = [];
      }
      
      if (!Array.isArray(targetUserTypes)) {
        targetUserTypes = [];
      }
    } catch (parseErr) {
      console.error('JSON parse error for remind-later announcement:', announcement[0].id, 'Raw data:', announcement[0].target_user_types, parseErr);
      targetUserTypes = [];
    }
    
    const announcementData = {
      ...announcement[0],
      target_user_types: targetUserTypes
    };
    
    // Check if user type is targeted
    if (!announcementData.target_user_types.includes(userType)) {
      return res.status(403).json({ error: 'This announcement is not for your user type' });
    }
    
    // Get client info
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    
    // Insert or update reminder (but don't set acknowledged_at)
    await db.query(
      'INSERT INTO user_acknowledgments (user_id, announcement_id, remind_later_at, ip_address, user_agent) ' +
      'VALUES (?, ?, ?, ?, ?) ' +
      'ON DUPLICATE KEY UPDATE remind_later_at = ?, ip_address = ?, user_agent = ?',
      [userId, id, currentTime, ipAddress, userAgent, currentTime, ipAddress, userAgent]
    );
    
    res.json({ message: 'Reminder set successfully' });
    
  } catch (err) {
    console.error('Error setting reminder:', err);
    res.status(500).json({ error: 'Failed to set reminder' });
  }
});

module.exports = router; 