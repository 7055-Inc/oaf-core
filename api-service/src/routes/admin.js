const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');
const EmailService = require('../services/emailService');
const discountService = require('../services/discountService');

// Import maintenance control routes
const maintenanceRoutes = require('./admin/maintenance');

/**
 * @fileoverview Admin management routes
 * 
 * Handles comprehensive administrative functionality including:
 * - User management (CRUD operations, permissions)
 * - Policy management (shipping and return policies)
 * - Email administration (templates, queue, bounces, statistics)
 * - Event email management (reminders, auto-decline)
 * - Promotion management (creation, vendor invitations, analytics)
 * - Coupon management (admin coupons, site-wide sales)
 * - System statistics and monitoring
 * 
 * All endpoints require 'manage_system' permission for security.
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

const emailService = new EmailService();

// Note: All admin endpoints now use requirePermission('manage_system') instead of hardcoded admin checks

/**
 * List all users
 * @route GET /api/admin/users
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Array} List of users with basic information
 */
router.get('/users', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('GET /admin/users request received, userId:', req.userId);
  try {
    const [users] = await db.execute('SELECT id, username, status, user_type FROM users');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * Get a single user with complete profile information
 * @route GET /api/admin/users/:id
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - User ID
 * @param {Object} res - Express response object
 * @returns {Object} User with all profile information
 */
router.get('/users/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('GET /admin/users/:id request received, userId:', req.userId);
  const { id } = req.params;
  try {
    // Fetch user data
    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = users[0];
    
    // Fetch user_profiles
    const [userProfiles] = await db.execute('SELECT * FROM user_profiles WHERE user_id = ?', [id]);
    const userProfile = userProfiles[0] || {};
    
    // Fetch artist_profiles
    const [artistProfiles] = await db.execute('SELECT * FROM artist_profiles WHERE user_id = ?', [id]);
    const artistProfile = artistProfiles[0] || {};
    
    // Fetch promoter_profiles
    const [promoterProfiles] = await db.execute('SELECT * FROM promoter_profiles WHERE user_id = ?', [id]);
    const promoterProfile = promoterProfiles[0] || {};
    
    // Fetch community_profiles
    const [communityProfiles] = await db.execute('SELECT * FROM community_profiles WHERE user_id = ?', [id]);
    const communityProfile = communityProfiles[0] || {};
    
    // Fetch admin_profiles
    const [adminProfiles] = await db.execute('SELECT * FROM admin_profiles WHERE user_id = ?', [id]);
    const adminProfile = adminProfiles[0] || {};
    
    // Merge all data, excluding duplicate user_id, created_at, updated_at fields from profile tables
    const { user_id: upUserId, created_at: upCreated, updated_at: upUpdated, ...upData } = userProfile;
    const { user_id: apUserId, created_at: apCreated, updated_at: apUpdated, ...apData } = artistProfile;
    const { user_id: ppUserId, created_at: ppCreated, updated_at: ppUpdated, ...ppData } = promoterProfile;
    const { user_id: cpUserId, created_at: cpCreated, updated_at: cpUpdated, ...cpData } = communityProfile;
    const { user_id: adpUserId, created_at: adpCreated, updated_at: adpUpdated, ...adpData } = adminProfile;
    
    const completeUser = {
      ...userData,
      email: userData.username, // username is the email
      ...upData,
      ...apData,
      ...ppData,
      ...cpData,
      ...adpData
    };

    res.json(completeUser);
  } catch (err) {
    console.error('Error fetching user details:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

/**
 * Add a new user
 * @route POST /api/admin/users
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.body.username - Username for the new user
 * @param {string} req.body.status - User status
 * @param {string} req.body.user_type - User type
 * @param {Object} res - Express response object
 * @returns {Object} Created user information
 */
router.post('/users', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('POST /admin/users request received, userId:', req.userId);
  const { username, status, user_type } = req.body;
  try {
    if (!username || !status || !user_type) {
      return res.status(400).json({ error: 'Missing required fields: username, status, user_type' });
    }
    const [result] = await db.execute(
      'INSERT INTO users (username, email_verified, status, user_type) VALUES (?, ?, ?, ?)',
      [username, 'no', status, user_type]
    );
    const newUserId = result.insertId;
    await db.execute('INSERT INTO user_profiles (user_id) VALUES (?)', [newUserId]);
    await db.execute('INSERT INTO artist_profiles (user_id) VALUES (?)', [newUserId]);
    await db.execute('INSERT INTO promoter_profiles (user_id) VALUES (?)', [newUserId]);
    await db.execute('INSERT INTO community_profiles (user_id) VALUES (?)', [newUserId]);
    await db.execute('INSERT INTO admin_profiles (user_id) VALUES (?)', [newUserId]);
    const [newUser] = await db.execute('SELECT id, username, status, user_type FROM users WHERE id = ?', [newUserId]);
    res.json(newUser[0]);
  } catch (err) {
    console.error('Error adding user:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to add user' });
  }
});

/**
 * Update a user
 * @route PUT /api/admin/users/:id
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - User ID to update
 * @param {string} req.body.username - Updated username
 * @param {string} req.body.status - Updated status
 * @param {string} req.body.user_type - Updated user type
 * @param {Object} res - Express response object
 * @returns {Object} Update confirmation
 */
router.put('/users/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('PUT /admin/users/:id request received, userId:', req.userId);
  const { id } = req.params;
  const { username, status, user_type } = req.body;
  try {
    await db.execute(
      'UPDATE users SET username = ?, status = ?, user_type = ? WHERE id = ?',
      [username, status, user_type, id]
    );
    res.json({ message: 'User updated successfully' });
  } catch (err) {
    console.error('Error updating user:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * Delete a user
 * @route DELETE /api/admin/users/:id
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - User ID to delete
 * @param {Object} res - Express response object
 * @returns {Object} Deletion confirmation
 */
router.delete('/users/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('DELETE /admin/users/:id request received, userId:', req.userId);
  const { id } = req.params;
  try {
    await db.execute('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * Get user's permissions
 * @route GET /api/admin/users/:id/permissions
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - User ID
 * @param {Object} res - Express response object
 * @returns {Object} User permissions
 */
router.get('/users/:id/permissions', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('GET /admin/users/:id/permissions request received, userId:', req.userId);
  const { id } = req.params;
  try {
    const [permissions] = await db.execute('SELECT * FROM user_permissions WHERE user_id = ?', [id]);
    if (!permissions[0]) {
      // User has no permissions record yet
      return res.json({ 
        user_id: parseInt(id), 
        vendor: false, 
        events: false, 
        stripe_connect: false, 
        manage_sites: false, 
        manage_content: false, 
        manage_system: false 
      });
    }
    res.json(permissions[0]);
  } catch (err) {
    console.error('Error fetching user permissions:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch user permissions' });
  }
});

/**
 * Update user's permissions
 * @route PUT /api/admin/users/:id/permissions
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - User ID
 * @param {boolean} req.body.vendor - Vendor permission
 * @param {boolean} req.body.events - Events permission
 * @param {boolean} req.body.stripe_connect - Stripe Connect permission
 * @param {boolean} req.body.manage_sites - Site management permission
 * @param {boolean} req.body.manage_content - Content management permission
 * @param {boolean} req.body.manage_system - System management permission
 * @param {boolean} req.body.verified - Verified artist status
 * @param {Object} res - Express response object
 * @returns {Object} Update confirmation
 */
router.put('/users/:id/permissions', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('PUT /admin/users/:id/permissions request received, userId:', req.userId);
  const { id } = req.params;
  const { vendor, events, stripe_connect, manage_sites, manage_content, manage_system, verified, marketplace } = req.body;
  try {
    // Check if user exists
    const [user] = await db.execute('SELECT id FROM users WHERE id = ?', [id]);
    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build update fields dynamically based on what was provided
    const updateFields = [];
    const updateValues = [];
    
    if (vendor !== undefined) {
      updateFields.push('vendor = ?');
      updateValues.push(vendor);
    }
    if (events !== undefined) {
      updateFields.push('events = ?');
      updateValues.push(events);
    }
    if (stripe_connect !== undefined) {
      updateFields.push('stripe_connect = ?');
      updateValues.push(stripe_connect);
    }
    if (manage_sites !== undefined) {
      updateFields.push('manage_sites = ?');
      updateValues.push(manage_sites);
    }
    if (manage_content !== undefined) {
      updateFields.push('manage_content = ?');
      updateValues.push(manage_content);
    }
    if (manage_system !== undefined) {
      updateFields.push('manage_system = ?');
      updateValues.push(manage_system);
    }
    if (verified !== undefined) {
      updateFields.push('verified = ?');
      updateValues.push(verified);
    }
    if (marketplace !== undefined) {
      updateFields.push('marketplace = ?');
      updateValues.push(marketplace);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No permission fields provided' });
    }
    
    // Check if permissions record exists
    const [existing] = await db.execute('SELECT user_id FROM user_permissions WHERE user_id = ?', [id]);
    
    if (existing[0]) {
      // Update existing permissions
      updateValues.push(id);
      await db.execute(`UPDATE user_permissions SET ${updateFields.join(', ')} WHERE user_id = ?`, updateValues);
    } else {
      // Create new permissions record with all fields
      await db.execute(
        'INSERT INTO user_permissions (user_id, vendor, events, stripe_connect, manage_sites, manage_content, manage_system, verified, marketplace) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', 
        [id, vendor || false, events || false, stripe_connect || false, manage_sites || false, manage_content || false, manage_system || false, verified || false, marketplace || false]
      );
    }
    
    res.json({ message: 'User permissions updated successfully' });
  } catch (err) {
    console.error('Error updating user permissions:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to update user permissions' });
  }
});

// ===== POLICY MANAGEMENT ENDPOINTS =====

/**
 * Get default shipping policy
 * @route GET /api/admin/default-policies
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Default shipping policy information
 */
router.get('/default-policies', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    console.log('GET /admin/default-policies request received, userId:', req.userId);
    
    const query = `
      SELECT 
        sp.id,
        sp.policy_text,
        sp.created_at,
        sp.updated_at,
        u.username as created_by_username
      FROM shipping_policies sp
      JOIN users u ON sp.created_by = u.id
      WHERE sp.user_id IS NULL AND sp.status = 'active'
    `;
    
    const [rows] = await db.execute(query);
    
    res.json({
      success: true,
      policy: rows.length > 0 ? rows[0] : null
    });
  } catch (error) {
    console.error('Error getting default shipping policy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve default shipping policy'
    });
  }
});

/**
 * Update default shipping policy
 * @route PUT /api/admin/default-policies
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.body.policy_text - New policy text
 * @param {Object} res - Express response object
 * @returns {Object} Update confirmation
 */
router.put('/default-policies', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    console.log('PUT /admin/default-policies request received, userId:', req.userId);
    
    const { policy_text } = req.body;
    
    if (!policy_text || policy_text.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Policy text is required'
      });
    }
    
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Archive the current default policy
      await connection.execute(`
        UPDATE shipping_policies 
        SET status = 'archived', updated_at = CURRENT_TIMESTAMP
        WHERE user_id IS NULL AND status = 'active'
      `);
      
      // Create new default policy
      await connection.execute(`
        INSERT INTO shipping_policies (user_id, policy_text, status, created_by)
        VALUES (NULL, ?, 'active', ?)
      `, [policy_text.trim(), req.userId]);
      
      await connection.commit();
      
      res.json({
        success: true,
        message: 'Default shipping policy updated successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating default shipping policy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update default shipping policy'
    });
  }
});

/**
 * Search and list vendor policies
 * @route GET /api/admin/vendor-policies
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.query.search - Search term for username or user ID
 * @param {number} req.query.page - Page number for pagination
 * @param {number} req.query.limit - Items per page
 * @param {Object} res - Express response object
 * @returns {Object} Paginated list of vendor policies
 */
router.get('/vendor-policies', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('GET /admin/vendor-policies request received, userId:', req.userId);
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  try {
    let whereClause = 'WHERE up.vendor = 1';
    let params = [];
    
    if (search) {
      whereClause += ' AND (u.username LIKE ? OR u.id = ?)';
      params = [`%${search}%`, search];
    }
    
    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      ${whereClause}
    `;
    
    const [countResult] = await db.execute(countQuery, params);
    const total = countResult[0].total;
    
    // Get vendor policies
    const dataQuery = `
      SELECT 
        u.id as user_id,
        u.username,
        u.user_type,
        sp.id as policy_id,
        sp.policy_text,
        sp.status,
        sp.created_at as policy_created_at,
        sp.updated_at as policy_updated_at,
        creator.username as created_by_username
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      LEFT JOIN shipping_policies sp ON u.id = sp.user_id AND sp.status = 'active'
      LEFT JOIN users creator ON sp.created_by = creator.id
      ${whereClause}
      ORDER BY u.username ASC
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), offset);
    const [vendors] = await db.execute(dataQuery, params);
    
    res.json({
      vendors: vendors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching vendor policies:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch vendor policies' });
  }
});

/**
 * Get specific vendor's policy and history
 * @route GET /api/admin/vendor-policies/:user_id
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.user_id - Vendor user ID
 * @param {Object} res - Express response object
 * @returns {Object} Vendor policy details and history
 */
router.get('/vendor-policies/:user_id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('GET /admin/vendor-policies/:user_id request received, userId:', req.userId);
  const { user_id } = req.params;
  
  try {
    // Check if user exists and has vendor permissions
    const [userCheck] = await db.execute(`
      SELECT u.id, u.username, u.user_type, up.vendor
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      WHERE u.id = ?
    `, [user_id]);
    
    if (!userCheck[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!userCheck[0].vendor) {
      return res.status(400).json({ error: 'User does not have vendor permissions' });
    }
    
    // Get current policy
    const [currentPolicy] = await db.execute(`
      SELECT 
        sp.id,
        sp.policy_text,
        sp.status,
        sp.created_at,
        sp.updated_at,
        u.username as created_by_username
      FROM shipping_policies sp
      JOIN users u ON sp.created_by = u.id
      WHERE sp.user_id = ? AND sp.status = 'active'
    `, [user_id]);
    
    // Get policy history
    const [history] = await db.execute(`
      SELECT 
        sp.id,
        sp.policy_text,
        sp.status,
        sp.created_at,
        sp.updated_at,
        u.username as created_by_username
      FROM shipping_policies sp
      JOIN users u ON sp.created_by = u.id
      WHERE sp.user_id = ?
      ORDER BY sp.created_at DESC
    `, [user_id]);
    
    res.json({
      user: userCheck[0],
      current_policy: currentPolicy[0] || null,
      history: history
    });
  } catch (err) {
    console.error('Error fetching vendor policy details:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch vendor policy details' });
  }
});

/**
 * Update vendor's policy as admin
 * @route PUT /api/admin/vendor-policies/:user_id
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.user_id - Vendor user ID
 * @param {string} req.body.policy_text - New policy text
 * @param {Object} res - Express response object
 * @returns {Object} Update confirmation
 */
router.put('/vendor-policies/:user_id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('PUT /admin/vendor-policies/:user_id request received, userId:', req.userId);
  const { user_id } = req.params;
  const { policy_text } = req.body;
  
  try {
    if (!policy_text || policy_text.trim() === '') {
      return res.status(400).json({ error: 'Policy text is required' });
    }

    // Check if user exists and has vendor permissions
    const [userCheck] = await db.execute(`
      SELECT u.id, u.username, up.vendor
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      WHERE u.id = ?
    `, [user_id]);
    
    if (!userCheck[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!userCheck[0].vendor) {
      return res.status(400).json({ error: 'User does not have vendor permissions' });
    }

    // Get a connection from the pool for transaction
    const connection = await db.getConnection();
    
    try {
      // Begin transaction
      await connection.beginTransaction();
      
      // Archive existing active policy
      await connection.execute(
        'UPDATE shipping_policies SET status = "archived" WHERE user_id = ? AND status = "active"',
        [user_id]
      );
      
      // Create new active policy (created by admin)
      const insertQuery = `
        INSERT INTO shipping_policies (user_id, policy_text, status, created_by)
        VALUES (?, ?, 'active', ?)
      `;
      
      await connection.execute(insertQuery, [user_id, policy_text, req.userId]);
      
      await connection.commit();
      
      res.json({ message: 'Vendor policy updated successfully by admin' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Error updating vendor policy:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to update vendor policy' });
  }
});

/**
 * Delete vendor's policy (revert to default)
 * @route DELETE /api/admin/vendor-policies/:user_id
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.user_id - Vendor user ID
 * @param {Object} res - Express response object
 * @returns {Object} Deletion confirmation
 */
router.delete('/vendor-policies/:user_id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('DELETE /admin/vendor-policies/:user_id request received, userId:', req.userId);
  const { user_id } = req.params;
  
  try {
    // Check if user exists and has vendor permissions
    const [userCheck] = await db.execute(`
      SELECT u.id, u.username, up.vendor
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      WHERE u.id = ?
    `, [user_id]);
    
    if (!userCheck[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!userCheck[0].vendor) {
      return res.status(400).json({ error: 'User does not have vendor permissions' });
    }

    // Archive all active policies for this user
    await db.execute(
      'UPDATE shipping_policies SET status = "archived" WHERE user_id = ? AND status = "active"',
      [user_id]
    );
    
    res.json({ message: 'Vendor policy deleted successfully. User will use default policy.' });
  } catch (err) {
    console.error('Error deleting vendor policy:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to delete vendor policy' });
  }
});

// ===== RETURN POLICY MANAGEMENT ENDPOINTS =====

/**
 * Get default return policy
 * @route GET /api/admin/default-return-policies
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Default return policy information
 */
router.get('/default-return-policies', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    console.log('GET /admin/default-return-policies request received, userId:', req.userId);
    
    const query = `
      SELECT 
        rp.id,
        rp.policy_text,
        rp.created_at,
        rp.updated_at,
        u.username as created_by_username
      FROM return_policies rp
      JOIN users u ON rp.created_by = u.id
      WHERE rp.user_id IS NULL AND rp.status = 'active'
    `;
    
    const [rows] = await db.execute(query);
    
    res.json({
      success: true,
      policy: rows.length > 0 ? rows[0] : null
    });
  } catch (error) {
    console.error('Error getting default return policy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve default return policy'
    });
  }
});

/**
 * Update default return policy
 * @route PUT /api/admin/default-return-policies
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.body.policy_text - New return policy text
 * @param {Object} res - Express response object
 * @returns {Object} Update confirmation
 */
router.put('/default-return-policies', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    console.log('PUT /admin/default-return-policies request received, userId:', req.userId);
    
    const { policy_text } = req.body;
    
    if (!policy_text || policy_text.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Policy text is required'
      });
    }
    
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Archive the current default policy
      await connection.execute(`
        UPDATE return_policies 
        SET status = 'archived', updated_at = CURRENT_TIMESTAMP
        WHERE user_id IS NULL AND status = 'active'
      `);
      
      // Create new default policy
      await connection.execute(`
        INSERT INTO return_policies (user_id, policy_text, status, created_by)
        VALUES (NULL, ?, 'active', ?)
      `, [policy_text.trim(), req.userId]);
      
      await connection.commit();
      
      res.json({
        success: true,
        message: 'Default return policy updated successfully'
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating default return policy:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update default return policy'
    });
  }
});

/**
 * Search and list vendor return policies
 * @route GET /api/admin/vendor-return-policies
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.query.search - Search term for username or user ID
 * @param {number} req.query.page - Page number for pagination
 * @param {number} req.query.limit - Items per page
 * @param {Object} res - Express response object
 * @returns {Object} Paginated list of vendor return policies
 */
router.get('/vendor-return-policies', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('GET /admin/vendor-return-policies request received, userId:', req.userId);
  const { search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  try {
    let whereClause = 'WHERE up.vendor = 1';
    let params = [];
    
    if (search) {
      whereClause += ' AND (u.username LIKE ? OR u.id = ?)';
      params = [`%${search}%`, search];
    }
    
    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT u.id) as total
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      ${whereClause}
    `;
    
    const [countResult] = await db.execute(countQuery, params);
    const total = countResult[0].total;
    
    // Get vendor return policies
    const dataQuery = `
      SELECT 
        u.id as user_id,
        u.username,
        u.user_type,
        rp.id as policy_id,
        rp.policy_text,
        rp.status,
        rp.created_at as policy_created_at,
        rp.updated_at as policy_updated_at,
        creator.username as created_by_username
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      LEFT JOIN return_policies rp ON u.id = rp.user_id AND rp.status = 'active'
      LEFT JOIN users creator ON rp.created_by = creator.id
      ${whereClause}
      ORDER BY u.username ASC
      LIMIT ? OFFSET ?
    `;
    
    params.push(parseInt(limit), offset);
    const [vendors] = await db.execute(dataQuery, params);
    
    res.json({
      vendors: vendors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (err) {
    console.error('Error fetching vendor return policies:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch vendor return policies' });
  }
});

/**
 * Get specific vendor's return policy and history
 * @route GET /api/admin/vendor-return-policies/:user_id
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.user_id - Vendor user ID
 * @param {Object} res - Express response object
 * @returns {Object} Vendor return policy details and history
 */
router.get('/vendor-return-policies/:user_id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('GET /admin/vendor-return-policies/:user_id request received, userId:', req.userId);
  const { user_id } = req.params;
  
  try {
    // Check if user exists and has vendor permissions
    const [userCheck] = await db.execute(`
      SELECT u.id, u.username, u.user_type, up.vendor
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      WHERE u.id = ?
    `, [user_id]);
    
    if (!userCheck[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!userCheck[0].vendor) {
      return res.status(400).json({ error: 'User does not have vendor permissions' });
    }
    
    // Get current policy
    const [currentPolicy] = await db.execute(`
      SELECT 
        rp.id,
        rp.policy_text,
        rp.status,
        rp.created_at,
        rp.updated_at,
        u.username as created_by_username
      FROM return_policies rp
      JOIN users u ON rp.created_by = u.id
      WHERE rp.user_id = ? AND rp.status = 'active'
    `, [user_id]);
    
    // Get policy history
    const [history] = await db.execute(`
      SELECT 
        rp.id,
        rp.policy_text,
        rp.status,
        rp.created_at,
        rp.updated_at,
        u.username as created_by_username
      FROM return_policies rp
      JOIN users u ON rp.created_by = u.id
      WHERE rp.user_id = ?
      ORDER BY rp.created_at DESC
    `, [user_id]);
    
    res.json({
      user: userCheck[0],
      current_policy: currentPolicy[0] || null,
      history: history
    });
  } catch (err) {
    console.error('Error fetching vendor return policy details:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch vendor return policy details' });
  }
});

/**
 * Update vendor's return policy as admin
 * @route PUT /api/admin/vendor-return-policies/:user_id
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.user_id - Vendor user ID
 * @param {string} req.body.policy_text - New return policy text
 * @param {Object} res - Express response object
 * @returns {Object} Update confirmation
 */
router.put('/vendor-return-policies/:user_id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('PUT /admin/vendor-return-policies/:user_id request received, userId:', req.userId);
  const { user_id } = req.params;
  const { policy_text } = req.body;
  
  try {
    if (!policy_text || policy_text.trim() === '') {
      return res.status(400).json({ error: 'Policy text is required' });
    }

    // Check if user exists and has vendor permissions
    const [userCheck] = await db.execute(`
      SELECT u.id, u.username, up.vendor
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      WHERE u.id = ?
    `, [user_id]);
    
    if (!userCheck[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!userCheck[0].vendor) {
      return res.status(400).json({ error: 'User does not have vendor permissions' });
    }

    // Get a connection from the pool for transaction
    const connection = await db.getConnection();
    
    try {
      // Begin transaction
      await connection.beginTransaction();
      
      // Archive existing active policy
      await connection.execute(
        'UPDATE return_policies SET status = "archived" WHERE user_id = ? AND status = "active"',
        [user_id]
      );
      
      // Create new active policy (created by admin)
      const insertQuery = `
        INSERT INTO return_policies (user_id, policy_text, status, created_by)
        VALUES (?, ?, 'active', ?)
      `;
      
      await connection.execute(insertQuery, [user_id, policy_text, req.userId]);
      
      await connection.commit();
      
      res.json({ message: 'Vendor return policy updated successfully by admin' });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('Error updating vendor return policy:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to update vendor return policy' });
  }
});

/**
 * Delete vendor's return policy (revert to default)
 * @route DELETE /api/admin/vendor-return-policies/:user_id
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.user_id - Vendor user ID
 * @param {Object} res - Express response object
 * @returns {Object} Deletion confirmation
 */
router.delete('/vendor-return-policies/:user_id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('DELETE /admin/vendor-return-policies/:user_id request received, userId:', req.userId);
  const { user_id } = req.params;
  
  try {
    // Check if user exists and has vendor permissions
    const [userCheck] = await db.execute(`
      SELECT u.id, u.username, up.vendor
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      WHERE u.id = ?
    `, [user_id]);
    
    if (!userCheck[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!userCheck[0].vendor) {
      return res.status(400).json({ error: 'User does not have vendor permissions' });
    }

    // Archive all active policies for this user
    await db.execute(
      'UPDATE return_policies SET status = "archived" WHERE user_id = ? AND status = "active"',
      [user_id]
    );
    
    res.json({ message: 'Vendor return policy deleted successfully. User will use default policy.' });
  } catch (err) {
    console.error('Error deleting vendor return policy:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to delete vendor return policy' });
  }
});

// ===== EMAIL ADMINISTRATION ROUTES =====

/**
 * Get email system statistics (admin only)
 * @route GET /api/admin/email-stats
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Comprehensive email system statistics
 */
router.get('/email-stats', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('GET /admin/email-stats request received, userId:', req.userId);
  
  try {
    // Queue stats
    const [queueStats] = await db.execute(
      'SELECT status, COUNT(*) as count FROM email_queue GROUP BY status'
    );

    // Email log stats (last 30 days)
    const [emailStats] = await db.execute(`
      SELECT 
        DATE(sent_at) as date,
        status,
        COUNT(*) as count
      FROM email_log 
      WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(sent_at), status
      ORDER BY date DESC
    `);

    // Template usage stats
    const [templateStats] = await db.execute(`
      SELECT 
        et.name,
        et.template_key,
        COUNT(el.id) as sent_count
      FROM email_templates et
      LEFT JOIN email_log el ON et.id = el.template_id AND el.status = 'sent'
      GROUP BY et.id, et.name, et.template_key
      ORDER BY sent_count DESC
    `);

    // Bounce stats
    const [bounceStats] = await db.execute(`
      SELECT 
        SUBSTRING_INDEX(email_address, '@', -1) as domain,
        SUM(CASE WHEN bounce_type = 'hard' THEN bounce_count ELSE 0 END) as hard_bounces,
        SUM(CASE WHEN bounce_type = 'soft' THEN bounce_count ELSE 0 END) as soft_bounces,
        COUNT(CASE WHEN is_blacklisted = 1 THEN 1 END) as blacklisted_count,
        MAX(last_bounce_date) as last_bounce_at
      FROM bounce_tracking
      GROUP BY SUBSTRING_INDEX(email_address, '@', -1)
      ORDER BY (SUM(bounce_count)) DESC
      LIMIT 10
    `);

    // User preference stats
    const [preferenceStats] = await db.execute(`
      SELECT 
        frequency,
        is_enabled,
        COUNT(*) as count
      FROM user_email_preferences
      GROUP BY frequency, is_enabled
      ORDER BY count DESC
    `);

    res.json({
      queue: queueStats,
      emails: emailStats,
      templates: templateStats,
      bounces: bounceStats,
      preferences: preferenceStats
    });
  } catch (err) {
    console.error('Error fetching email stats:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch email statistics' });
  }
});

/**
 * Get email queue status (admin only)
 * @route GET /api/admin/email-queue
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Email queue statistics and recent items
 */
router.get('/email-queue', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('GET /admin/email-queue request received, userId:', req.userId);
  
  try {
    const [stats] = await db.execute(
      'SELECT status, COUNT(*) as count FROM email_queue GROUP BY status'
    );

    const [recent] = await db.execute(
      'SELECT eq.*, et.name as template_name, u.username FROM email_queue eq JOIN email_templates et ON eq.template_id = et.id JOIN users u ON eq.user_id = u.id ORDER BY eq.created_at DESC LIMIT 20'
    );

    res.json({ 
      stats: stats || [], 
      recent: recent || [] 
    });
  } catch (err) {
    console.error('Error fetching queue status:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch queue status' });
  }
});

/**
 * Get all email templates (admin only)
 * @route GET /api/admin/email-templates
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Array} List of email templates
 */
router.get('/email-templates', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('GET /admin/email-templates request received, userId:', req.userId);
  
  try {
    const [templates] = await db.execute(`
      SELECT 
        id,
        template_key,
        name,
        priority_level as priority,
        can_compile,
        is_transactional,
        subject_template,
        body_template,
        created_at
      FROM email_templates 
      ORDER BY priority_level ASC, name ASC
    `);

    // Always return an array
    res.json(templates || []);
  } catch (err) {
    console.error('Error fetching templates:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

/**
 * Get bounce tracking information (admin only)
 * @route GET /api/admin/email-bounces
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Array} Email bounce tracking data
 */
router.get('/email-bounces', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('GET /admin/email-bounces request received, userId:', req.userId);
  
  try {
    const [bounces] = await db.execute(`
      SELECT 
        bt.id,
        bt.email_address,
        bt.user_id,
        bt.bounce_count,
        bt.last_bounce_date as last_bounce_at,
        bt.bounce_type,
        bt.is_blacklisted,
        bt.last_error,
        bt.created_at,
        bt.updated_at,
        SUBSTRING_INDEX(bt.email_address, '@', -1) as domain,
        CASE 
          WHEN bt.bounce_type = 'hard' THEN bt.bounce_count 
          ELSE 0 
        END as hard_bounces,
        CASE 
          WHEN bt.bounce_type = 'soft' THEN bt.bounce_count 
          ELSE 0 
        END as soft_bounces,
        COUNT(el.id) as recent_attempts
      FROM bounce_tracking bt
      LEFT JOIN email_log el ON el.email_address = bt.email_address 
        AND el.sent_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY bt.id
      ORDER BY bt.last_bounce_date DESC
    `);

    // Always return an array
    res.json(bounces || []);
  } catch (err) {
    console.error('Error fetching bounce tracking:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch bounce tracking' });
  }
});

/**
 * Get recent email activity (admin only)
 * @route GET /api/admin/email-recent
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {number} req.query.limit - Number of emails to retrieve
 * @param {number} req.query.offset - Offset for pagination
 * @param {Object} res - Express response object
 * @returns {Object} Recent email activity with pagination
 */
router.get('/email-recent', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('GET /admin/email-recent request received, userId:', req.userId);
  
  try {
    const limit = Math.max(1, parseInt(req.query.limit) || 50);
    const offset = Math.max(0, parseInt(req.query.offset) || 0);
    
    console.log('Query parameters:', { limit, offset });

    // Use string concatenation for LIMIT/OFFSET to avoid parameter issues
    const [recent] = await db.execute(`
      SELECT 
        el.*
      FROM email_log el
      ORDER BY el.sent_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // Get total count
    const [countResult] = await db.execute('SELECT COUNT(*) as total FROM email_log');
    const total = countResult[0].total;

    res.json({
      emails: recent,
      total: total,
      limit: limit,
      offset: offset
    });
  } catch (err) {
    console.error('Error fetching recent email activity:', err.message, err.stack);
    console.error('SQL Error details:', err.sql, err.sqlMessage, err.errno, err.code);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch recent email activity' });
  }
});

/**
 * Send test email (admin only)
 * @route POST /api/admin/email-test
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.body.recipient - Email recipient (user ID or email)
 * @param {string} req.body.templateKey - Email template key
 * @param {Object} req.body.testData - Test data for email template
 * @param {Object} res - Express response object
 * @returns {Object} Test email send confirmation
 */
router.post('/email-test', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('POST /admin/email-test request received, userId:', req.userId);
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  console.log('Request body type:', typeof req.body);
  console.log('Request body keys:', Object.keys(req.body));
  
  try {
    const { recipient, templateKey, testData } = req.body;
    
    console.log('Extracted values:', { recipient, templateKey, testData });
    
    if (!recipient || !templateKey) {
      console.log('Missing required fields:', { recipient: !!recipient, templateKey: !!templateKey });
      return res.status(400).json({ error: 'Recipient and template key are required' });
    }

    // Check if recipient is a valid user or email
    let targetUserId = null;
    if (recipient.includes('@')) {
      // Email address - find user by email domain (since email is username in this system)
      const [userRows] = await db.execute(
        'SELECT id FROM users WHERE username = ?',
        [recipient]
      );
      
      if (userRows.length === 0) {
        return res.status(400).json({ error: 'User not found for email address' });
      }
      targetUserId = userRows[0].id;
    } else {
      // Assume it's a user ID
      targetUserId = parseInt(recipient);
    }

    // Use test data or default test data
    const emailData = testData || {
      test_message: 'This is a test email from the admin panel',
      admin_name: req.username || 'Admin',
      test_timestamp: new Date().toISOString()
    };

    const emailService = new EmailService();
    const result = await emailService.queueEmail(targetUserId, templateKey, emailData, { priority: 0.5 });

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Test email sent successfully',
        emailId: result.emailId
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to send test email',
        details: result.error
      });
    }
  } catch (err) {
    console.error('Error sending test email:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

/**
 * Manually process email queue (admin only)
 * @route POST /api/admin/email-process-queue
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Queue processing confirmation
 */
router.post('/email-process-queue', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('POST /admin/email-process-queue request received, userId:', req.userId);
  
  try {
    const emailService = new EmailService();
    const result = await emailService.processQueue();

    res.json({ 
      success: true, 
      message: 'Queue processing initiated',
      result: result
    });
  } catch (err) {
    console.error('Error processing queue:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to process queue' });
  }
});

/**
 * Remove domain from blacklist (admin only)
 * @route POST /api/admin/email-bounces-unblacklist
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.body.domain - Domain to remove from blacklist
 * @param {Object} res - Express response object
 * @returns {Object} Unblacklist confirmation
 */
router.post('/email-bounces-unblacklist', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('POST /admin/email-bounces-unblacklist request received, userId:', req.userId);
  
  try {
    const { domain } = req.body;
    
    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    await db.execute(`
      UPDATE bounce_tracking 
      SET is_blacklisted = 0,
          bounce_count = 0,
          updated_at = CURRENT_TIMESTAMP
      WHERE SUBSTRING_INDEX(email_address, '@', -1) = ?
    `, [domain]);

    res.json({ success: true, message: 'Domain removed from blacklist' });
  } catch (err) {
    console.error('Error removing domain from blacklist:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to remove domain from blacklist' });
      }
});

// ===== EVENT EMAIL ADMINISTRATION ROUTES =====

/**
 * GET /admin/event-email-stats
 * Get event email system statistics
 */
router.get('/event-email-stats', verifyToken, requirePermission('manage_system'), async (req, res) => {
    try {
        // Get application email statistics
        const [emailStats] = await db.execute(`
            SELECT 
                email_type,
                COUNT(*) as total_sent,
                SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed
            FROM application_email_log 
            WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY email_type
        `);

        // Get recent email activity
        const [recentActivity] = await db.execute(`
            SELECT 
                ael.email_type,
                ael.sent_at,
                ael.success,
                ea.id as application_id,
                e.title as event_title,
                CONCAT(u.first_name, ' ', u.last_name) as artist_name
            FROM application_email_log ael
            JOIN event_applications ea ON ael.application_id = ea.id
            JOIN events e ON ea.event_id = e.id
            JOIN users u ON ea.artist_id = u.id
            ORDER BY ael.sent_at DESC
            LIMIT 20
        `);

        // Get applications needing reminders
        const [reminderStats] = await db.execute(`
            SELECT 
                COUNT(CASE WHEN DATE(booth_fee_due_date) = DATE(DATE_ADD(NOW(), INTERVAL 3 DAY)) THEN 1 END) as due_soon,
                COUNT(CASE WHEN DATE(booth_fee_due_date) = DATE(DATE_SUB(NOW(), INTERVAL 1 DAY)) THEN 1 END) as overdue,
                COUNT(CASE WHEN DATE(booth_fee_due_date) = DATE(DATE_SUB(NOW(), INTERVAL 7 DAY)) THEN 1 END) as final_notice,
                COUNT(CASE WHEN DATE(booth_fee_due_date) < DATE(DATE_SUB(NOW(), INTERVAL 14 DAY)) AND status = 'accepted' THEN 1 END) as auto_decline_ready
            FROM event_applications 
            WHERE booth_fee_paid = 0 AND status IN ('accepted')
        `);

        res.json({
            success: true,
            email_stats: emailStats,
            recent_activity: recentActivity,
            reminder_stats: reminderStats[0]
        });

    } catch (error) {
        console.error('Error fetching event email stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /admin/process-event-reminders
 * Manually trigger event reminder processing
 */
router.post('/process-event-reminders', verifyToken, requirePermission('manage_system'), async (req, res) => {
    try {
        const EventEmailService = require('../services/eventEmailService');
        const emailService = new EventEmailService();

        // Process automated reminders
        const results = await emailService.processAutomatedReminders();

        res.json({
            success: true,
            message: 'Event reminders processed successfully',
            results: results
        });

    } catch (error) {
        console.error('Error processing event reminders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /admin/process-auto-decline
 * Manually trigger auto-decline processing
 */
router.post('/process-auto-decline', verifyToken, requirePermission('manage_system'), async (req, res) => {
    try {
        const EventEmailService = require('../services/eventEmailService');
        const emailService = new EventEmailService();

        // Process auto-decline
        const results = await emailService.processAutoDecline();

        res.json({
            success: true,
            message: 'Auto-decline processing completed',
            results: results
        });

    } catch (error) {
        console.error('Error processing auto-decline:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /admin/send-test-booth-fee-email
 * Send test booth fee email
 */
router.post('/send-test-booth-fee-email', verifyToken, requirePermission('manage_system'), async (req, res) => {
    try {
        const { application_id, email_type } = req.body;

        if (!application_id || !email_type) {
            return res.status(400).json({ error: 'Application ID and email type are required' });
        }

        const validEmailTypes = ['booth_fee_invoice', 'booth_fee_reminder', 'booth_fee_overdue', 'booth_fee_confirmation'];
        if (!validEmailTypes.includes(email_type)) {
            return res.status(400).json({ error: 'Invalid email type' });
        }

        const EventEmailService = require('../services/eventEmailService');
        const emailService = new EventEmailService();

        let result;
        switch (email_type) {
            case 'booth_fee_invoice':
                result = await emailService.sendBoothFeeInvoice(application_id);
                break;
            case 'booth_fee_reminder':
                result = await emailService.sendBoothFeeReminder(application_id);
                break;
            case 'booth_fee_overdue':
                result = await emailService.sendBoothFeeReminder(application_id, 'overdue');
                break;
            case 'booth_fee_confirmation':
                // For testing, we'll need a payment intent ID
                const [paymentData] = await db.execute(`
                    SELECT payment_intent_id FROM event_booth_fees WHERE application_id = ?
                `, [application_id]);
                
                if (paymentData.length === 0) {
                    return res.status(400).json({ error: 'No payment intent found for this application' });
                }
                
                result = await emailService.sendBoothFeeConfirmation(application_id, paymentData[0].payment_intent_id);
                break;
        }

        res.json({
            success: true,
            message: `Test ${email_type} email sent successfully`,
            result: result
        });

    } catch (error) {
        console.error('Error sending test booth fee email:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /admin/applications-needing-reminders
 * Get applications that need reminders
 */
router.get('/applications-needing-reminders', verifyToken, requirePermission('manage_system'), async (req, res) => {
    try {
        const [applications] = await db.execute(`
            SELECT 
                ea.id,
                ea.booth_fee_amount,
                ea.booth_fee_due_date,
                ea.reminder_sent_due_soon,
                ea.reminder_sent_overdue,
                ea.reminder_sent_final,
                e.title as event_title,
                CONCAT(u.first_name, ' ', u.last_name) as artist_name,
                u.email as artist_email,
                DATEDIFF(ea.booth_fee_due_date, NOW()) as days_until_due
            FROM event_applications ea
            JOIN events e ON ea.event_id = e.id
            JOIN users u ON ea.artist_id = u.id
            WHERE ea.booth_fee_paid = 0 
                AND ea.status = 'accepted'
            ORDER BY ea.booth_fee_due_date ASC
        `);

        // Categorize applications
        const categorized = {
            due_soon: [],
            overdue: [],
            final_notice: [],
            auto_decline_ready: []
        };

        const now = new Date();
        applications.forEach(app => {
            const dueDate = new Date(app.booth_fee_due_date);
            const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

            if (daysDiff === 3 && !app.reminder_sent_due_soon) {
                categorized.due_soon.push(app);
            } else if (daysDiff === -1 && !app.reminder_sent_overdue) {
                categorized.overdue.push(app);
            } else if (daysDiff === -7 && !app.reminder_sent_final) {
                categorized.final_notice.push(app);
            } else if (daysDiff < -14) {
                categorized.auto_decline_ready.push(app);
            }
        });

        res.json({
            success: true,
            all_applications: applications,
            categorized: categorized
        });

    } catch (error) {
        console.error('Error fetching applications needing reminders:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ==================== PROMOTION MANAGEMENT ENDPOINTS ====================

/**
 * Get all promotions
 * @route GET /api/admin/promotions/all
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} List of all promotions
 */
router.get('/promotions/all', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    // Simple query following the working /users pattern
    const [promotions] = await db.execute('SELECT id, name, status, created_at FROM promotions ORDER BY created_at DESC');
    res.json({
      success: true,
      promotions: promotions
    });
  } catch (error) {
    console.error('Error getting promotions:', error);
    res.status(500).json({ error: 'Failed to get promotions' });
  }
});

/**
 * Create new promotion
 * @route POST /api/admin/promotions/create
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.body.name - Promotion name
 * @param {string} req.body.description - Promotion description
 * @param {number} req.body.admin_discount_percentage - Admin discount percentage
 * @param {number} req.body.suggested_vendor_discount - Suggested vendor discount
 * @param {string} req.body.application_type - Application type (auto_apply or coupon_code)
 * @param {string} req.body.coupon_code - Coupon code (if application_type is coupon_code)
 * @param {number} req.body.min_order_amount - Minimum order amount
 * @param {number} req.body.usage_limit_per_user - Usage limit per user
 * @param {number} req.body.total_usage_limit - Total usage limit
 * @param {string} req.body.valid_from - Valid from date
 * @param {string} req.body.valid_until - Valid until date
 * @param {Object} res - Express response object
 * @returns {Object} Created promotion information
 */
router.post('/promotions/create', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const adminId = req.userId;
    const {
      name,
      description,
      admin_discount_percentage,
      suggested_vendor_discount,
      application_type,
      coupon_code,
      min_order_amount = 0,
      usage_limit_per_user = 1,
      total_usage_limit,
      valid_from,
      valid_until
    } = req.body;
    
    // Validation
    if (!name || !admin_discount_percentage || !suggested_vendor_discount || !application_type || !valid_from) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!['auto_apply', 'coupon_code'].includes(application_type)) {
      return res.status(400).json({ error: 'Invalid application type' });
    }
    
    if (application_type === 'coupon_code' && !coupon_code) {
      return res.status(400).json({ error: 'Coupon code required for coupon_code application type' });
    }
    
    if (admin_discount_percentage < 0 || suggested_vendor_discount < 0) {
      return res.status(400).json({ error: 'Discount percentages must be positive' });
    }
    
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Check if coupon code already exists (if provided)
      if (coupon_code) {
        const [existingCode] = await connection.execute(
          'SELECT id FROM coupons WHERE code = ? UNION SELECT id FROM promotions WHERE coupon_code = ?',
          [coupon_code, coupon_code]
        );
        
        if (existingCode.length > 0) {
          await connection.rollback();
          return res.status(400).json({ error: 'Coupon code already exists' });
        }
      }
      
      // Create promotion
      const promotionQuery = `
        INSERT INTO promotions (
          name, description, admin_discount_percentage, suggested_vendor_discount,
          application_type, coupon_code, min_order_amount, usage_limit_per_user,
          total_usage_limit, valid_from, valid_until, status, created_by_admin_id,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, NOW())
      `;
      
      const [promotionResult] = await connection.execute(promotionQuery, [
        name, description, admin_discount_percentage, suggested_vendor_discount,
        application_type, coupon_code, min_order_amount, usage_limit_per_user,
        total_usage_limit, valid_from, valid_until, adminId
      ]);
      
      const promotionId = promotionResult.insertId;
      
      await connection.commit();
      
      res.json({
        success: true,
        promotion_id: promotionId,
        message: 'Promotion created successfully'
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Error creating promotion:', error);
    res.status(500).json({ error: 'Failed to create promotion' });
  }
});

/**
 * Update promotion (status, etc.)
 * @route PUT /api/admin/promotions/:id
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Promotion ID
 * @param {string} req.body.status - Promotion status
 * @param {string} req.body.name - Promotion name
 * @param {string} req.body.description - Promotion description
 * @param {string} req.body.valid_until - Valid until date
 * @param {Object} res - Express response object
 * @returns {Object} Update confirmation
 */
router.put('/promotions/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const promotionId = req.params.id;
    const { status, name, description, valid_until } = req.body;
    
    // Verify promotion exists
    const [promotionCheck] = await db.execute(
      'SELECT id FROM promotions WHERE id = ?',
      [promotionId]
    );
    
    if (promotionCheck.length === 0) {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    
    if (status !== undefined) { 
      if (!['draft', 'inviting_vendors', 'active', 'paused', 'ended'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.push('status = ?'); 
      params.push(status); 
    }
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (valid_until !== undefined) { updates.push('valid_until = ?'); params.push(valid_until); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push('updated_at = NOW()');
    params.push(promotionId);
    
    const updateQuery = `UPDATE promotions SET ${updates.join(', ')} WHERE id = ?`;
    await db.execute(updateQuery, params);
    
    res.json({
      success: true,
      message: 'Promotion updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating promotion:', error);
    res.status(500).json({ error: 'Failed to update promotion' });
  }
});

/**
 * Invite vendors to promotion
 * POST /api/admin/promotions/:id/invite-vendors
 */
router.post('/promotions/:id/invite-vendors', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const promotionId = req.params.id;
    const { vendor_ids, product_selections, admin_message } = req.body;
    
    if (!vendor_ids || !Array.isArray(vendor_ids) || vendor_ids.length === 0) {
      return res.status(400).json({ error: 'Vendor IDs are required' });
    }
    
    // Verify promotion exists and belongs to admin
    const [promotionCheck] = await db.execute(
      'SELECT id, status FROM promotions WHERE id = ?',
      [promotionId]
    );
    
    if (promotionCheck.length === 0) {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    
    const promotion = promotionCheck[0];
    
    if (promotion.status !== 'draft' && promotion.status !== 'inviting_vendors') {
      return res.status(400).json({ error: 'Cannot invite vendors to promotion in current status' });
    }
    
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Create invitations
      for (const vendorId of vendor_ids) {
        // Check if invitation already exists
        const [existingInvitation] = await connection.execute(
          'SELECT id FROM promotion_invitations WHERE promotion_id = ? AND vendor_id = ?',
          [promotionId, vendorId]
        );
        
        if (existingInvitation.length === 0) {
          await connection.execute(
            `INSERT INTO promotion_invitations (
              promotion_id, vendor_id, invitation_status, admin_message, 
              invited_at, expires_at
            ) VALUES (?, ?, 'pending', ?, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY))`,
            [promotionId, vendorId, admin_message]
          );
        }
      }
      
      // Add admin-selected products if provided
      if (product_selections) {
        for (const selection of product_selections) {
          const { vendor_id, product_ids, admin_discount_percentage, vendor_discount_percentage } = selection;
          
          if (product_ids && product_ids.length > 0) {
            for (const productId of product_ids) {
              await connection.execute(
                `INSERT INTO promotion_products (
                  promotion_id, product_id, vendor_id, added_by, added_by_user_id,
                  approval_status, admin_discount_percentage, vendor_discount_percentage,
                  created_at
                ) VALUES (?, ?, ?, 'admin', ?, 'approved', ?, ?, NOW())`,
                [promotionId, productId, vendor_id, req.userId, admin_discount_percentage, vendor_discount_percentage]
              );
            }
          }
        }
      }
      
      // Update promotion status
      await connection.execute(
        'UPDATE promotions SET status = \'inviting_vendors\', updated_at = NOW() WHERE id = ?',
        [promotionId]
      );
      
      await connection.commit();
      
      res.json({
        success: true,
        message: `Invitations sent to ${vendor_ids.length} vendors`
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Error inviting vendors:', error);
    res.status(500).json({ error: 'Failed to invite vendors' });
  }
});

/**
 * Get vendor suggestions for promotion
 * GET /api/admin/promotions/:id/vendor-suggestions
 */
router.get('/promotions/:id/vendor-suggestions', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const promotionId = req.params.id;
    
    const suggestionsQuery = `
      SELECT 
        pp.id,
        pp.product_id,
        pp.vendor_id,
        pp.approval_status,
        pp.admin_discount_percentage,
        pp.vendor_discount_percentage,
        pp.total_customer_discount,
        pp.created_at,
        p.name as product_name,
        p.price as product_price,
        u.username as vendor_name
      FROM promotion_products pp
      JOIN products p ON pp.product_id = p.id
      JOIN users u ON pp.vendor_id = u.id
      WHERE pp.promotion_id = ? 
        AND pp.added_by = 'vendor'
        AND pp.approval_status = 'pending'
      ORDER BY pp.created_at DESC
    `;
    
    const [suggestions] = await db.execute(suggestionsQuery, [promotionId]);
    
    res.json({
      success: true,
      suggestions: suggestions
    });
    
  } catch (error) {
    console.error('Error getting vendor suggestions:', error);
    res.status(500).json({ error: 'Failed to get vendor suggestions' });
  }
});

/**
 * Approve vendor suggestion
 * POST /api/admin/promotions/:id/approve-suggestion
 */
router.post('/promotions/:id/approve-suggestion', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const promotionId = req.params.id;
    const { suggestion_id, admin_discount_percentage, vendor_discount_percentage } = req.body;
    
    if (!suggestion_id) {
      return res.status(400).json({ error: 'Suggestion ID is required' });
    }
    
    // Verify suggestion exists and belongs to promotion
    const [suggestionCheck] = await db.execute(
      `SELECT id FROM promotion_products 
       WHERE id = ? AND promotion_id = ? AND added_by = 'vendor' AND approval_status = 'pending'`,
      [suggestion_id, promotionId]
    );
    
    if (suggestionCheck.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found or already processed' });
    }
    
    // Update suggestion
    const updateQuery = `
      UPDATE promotion_products 
      SET approval_status = 'approved',
          admin_discount_percentage = COALESCE(?, admin_discount_percentage),
          vendor_discount_percentage = COALESCE(?, vendor_discount_percentage),
          approved_at = NOW()
      WHERE id = ?
    `;
    
    await db.execute(updateQuery, [admin_discount_percentage, vendor_discount_percentage, suggestion_id]);
    
    res.json({
      success: true,
      message: 'Suggestion approved successfully'
    });
    
  } catch (error) {
    console.error('Error approving suggestion:', error);
    res.status(500).json({ error: 'Failed to approve suggestion' });
  }
});

/**
 * Reject vendor suggestion
 * POST /api/admin/promotions/:id/reject-suggestion
 */
router.post('/promotions/:id/reject-suggestion', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const promotionId = req.params.id;
    const { suggestion_id } = req.body;
    
    if (!suggestion_id) {
      return res.status(400).json({ error: 'Suggestion ID is required' });
    }
    
    // Verify suggestion exists and belongs to promotion
    const [suggestionCheck] = await db.execute(
      `SELECT id FROM promotion_products 
       WHERE id = ? AND promotion_id = ? AND added_by = 'vendor' AND approval_status = 'pending'`,
      [suggestion_id, promotionId]
    );
    
    if (suggestionCheck.length === 0) {
      return res.status(404).json({ error: 'Suggestion not found or already processed' });
    }
    
    // Update suggestion
    await db.execute(
      'UPDATE promotion_products SET approval_status = \'rejected\' WHERE id = ?',
      [suggestion_id]
    );
    
    res.json({
      success: true,
      message: 'Suggestion rejected successfully'
    });
    
  } catch (error) {
    console.error('Error rejecting suggestion:', error);
    res.status(500).json({ error: 'Failed to reject suggestion' });
  }
});

/**
 * Get all admin coupons
 * @route GET /api/admin/coupons/all
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} List of all admin coupons
 */
router.get('/coupons/all', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    // Simple query following the working pattern
    const [coupons] = await db.execute("SELECT id, code, name, discount_type, discount_value, is_active, vendor_id, is_vendor_specific, created_at FROM coupons WHERE coupon_type = 'admin_coupon' ORDER BY created_at DESC");
    res.json({
      success: true,
      coupons: coupons
    });
  } catch (error) {
    console.error('Error getting admin coupons:', error);
    res.status(500).json({ error: 'Failed to get coupons' });
  }
});

/**
 * Create admin coupon for vendors
 * @route POST /api/admin/coupons
 * @access Private (requires manage_system permission)
 * @param {Object} req - Express request object
 * @param {string} req.body.code - Coupon code
 * @param {string} req.body.name - Coupon name
 * @param {string} req.body.description - Coupon description
 * @param {string} req.body.discount_type - Discount type (percentage or fixed_amount)
 * @param {number} req.body.discount_value - Discount value
 * @param {string} req.body.application_type - Application type
 * @param {number} req.body.min_order_amount - Minimum order amount
 * @param {number} req.body.usage_limit_per_user - Usage limit per user
 * @param {number} req.body.total_usage_limit - Total usage limit
 * @param {string} req.body.valid_from - Valid from date
 * @param {string} req.body.valid_until - Valid until date
 * @param {number} req.body.vendor_id - Vendor ID for vendor-specific coupons
 * @param {Array} req.body.product_ids - Product IDs for product-specific coupons
 * @param {number} req.body.max_discount_amount - Maximum discount amount
 * @param {Object} res - Express response object
 * @returns {Object} Created coupon information
 */
router.post('/coupons', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const adminId = req.userId;
    const {
      code,
      name,
      description,
      discount_type,
      discount_value,
      application_type,
      min_order_amount = 0,
      usage_limit_per_user = 1,
      total_usage_limit,
      valid_from,
      valid_until,
      vendor_id, // For vendor-specific admin coupons
      product_ids = [], // For product-specific coupons
      max_discount_amount
    } = req.body;
    
    // Validation
    if (!code || !name || !discount_type || !discount_value || !application_type || !valid_from) {
      return res.status(400).json({ error: 'Missing required fields: code, name, discount_type, discount_value, application_type, valid_from' });
    }
    
    if (!['percentage', 'fixed_amount'].includes(discount_type)) {
      return res.status(400).json({ error: 'Invalid discount type. Must be percentage or fixed_amount' });
    }
    
    if (!['auto_apply', 'coupon_code'].includes(application_type)) {
      return res.status(400).json({ error: 'Invalid application type. Must be auto_apply or coupon_code' });
    }
    
    if (discount_value <= 0 || (discount_type === 'percentage' && discount_value > 100)) {
      return res.status(400).json({ error: 'Invalid discount value' });
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Check if coupon code already exists
      const [existingCode] = await connection.execute(
        'SELECT id FROM coupons WHERE code = ?',
        [code]
      );
      
      if (existingCode.length > 0) {
        await connection.rollback();
        return res.status(400).json({ error: 'Coupon code already exists' });
      }
      
      // Create admin coupon
      const couponQuery = `
        INSERT INTO coupons (
          code, name, description, coupon_type, created_by_admin_id,
          discount_type, discount_value, application_type, min_order_amount,
          usage_limit_per_user, total_usage_limit, max_discount_amount,
          vendor_id, is_vendor_specific, valid_from, valid_until,
          is_active, created_at
        ) VALUES (?, ?, ?, 'admin_coupon', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
      `;
      
      const [couponResult] = await connection.execute(couponQuery, [
        code, name, description, adminId,
        discount_type, discount_value, application_type, min_order_amount,
        usage_limit_per_user, total_usage_limit, max_discount_amount,
        vendor_id || null, vendor_id ? 1 : 0, valid_from, valid_until || null
      ]);
      
      const couponId = couponResult.insertId;
      
      // Add specific products if provided
      if (product_ids && product_ids.length > 0) {
        for (const productId of product_ids) {
          // Get vendor ID for the product
          const [productInfo] = await connection.execute(
            'SELECT user_id as vendor_id FROM products WHERE id = ?',
            [productId]
          );
          
          if (productInfo.length > 0) {
            await connection.execute(
              'INSERT INTO coupon_products (coupon_id, product_id, vendor_id) VALUES (?, ?, ?)',
              [couponId, productId, productInfo[0].vendor_id]
            );
          }
        }
      }
      
      await connection.commit();
      
      res.json({
        success: true,
        message: 'Admin coupon created successfully',
        coupon: {
          id: couponId,
          code,
          name,
          discount_type,
          discount_value,
          vendor_specific: !!vendor_id,
          product_count: product_ids.length
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    console.error('Error creating admin coupon:', error);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

/**
 * Update admin coupon status
 * PUT /api/admin/coupons/:id
 */
router.put('/coupons/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const couponId = req.params.id;
    const { is_active } = req.body;

    const [result] = await db.execute(
      'UPDATE coupons SET is_active = ? WHERE id = ? AND coupon_type = "admin_coupon"',
      [is_active, couponId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Admin coupon not found' });
    }

    res.json({
      success: true,
      message: 'Coupon status updated successfully'
    });

  } catch (error) {
    console.error('Error updating coupon status:', error);
    res.status(500).json({ error: 'Failed to update coupon status' });
  }
});

/**
 * Create site-wide sale
 * POST /api/admin/sales/create-sitewide
 */
router.post('/sales/create-sitewide', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const adminId = req.userId;
    const {
      name,
      description,
      discount_type,
      discount_value,
      application_type,
      coupon_code,
      min_order_amount = 0,
      usage_limit_per_user = 1,
      total_usage_limit,
      valid_from,
      valid_until,
      product_ids = [] // Empty = site-wide, otherwise specific products
    } = req.body;
    
    // Validation
    if (!name || !discount_type || !discount_value || !application_type || !valid_from) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!['percentage', 'fixed_amount'].includes(discount_type)) {
      return res.status(400).json({ error: 'Invalid discount type' });
    }
    
    if (!['auto_apply', 'coupon_code'].includes(application_type)) {
      return res.status(400).json({ error: 'Invalid application type' });
    }
    
    if (application_type === 'coupon_code' && !coupon_code) {
      return res.status(400).json({ error: 'Coupon code required for coupon_code application type' });
    }
    
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
      // Check if coupon code already exists (if provided)
      if (coupon_code) {
        const [existingCode] = await connection.execute(
          'SELECT id FROM coupons WHERE code = ? UNION SELECT id FROM promotions WHERE coupon_code = ?',
          [coupon_code, coupon_code]
        );
        
        if (existingCode.length > 0) {
          await connection.rollback();
          return res.status(400).json({ error: 'Coupon code already exists' });
        }
      }
      
      // Create site-wide sale coupon
      const saleQuery = `
        INSERT INTO coupons (
          code, name, description, coupon_type, created_by_admin_id,
          discount_type, discount_value, application_type, min_order_amount,
          usage_limit_per_user, total_usage_limit, valid_from, valid_until,
          is_active, created_at
        ) VALUES (?, ?, ?, 'site_sale', ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())
      `;
      
      const [saleResult] = await connection.execute(saleQuery, [
        coupon_code || `SALE_${Date.now()}`, name, description, adminId,
        discount_type, discount_value, application_type, min_order_amount,
        usage_limit_per_user, total_usage_limit, valid_from, valid_until
      ]);
      
      const saleId = saleResult.insertId;
      
      // Add specific products if provided (otherwise it's site-wide)
      if (product_ids && product_ids.length > 0) {
        for (const productId of product_ids) {
          // Get vendor ID for the product
          const [productInfo] = await connection.execute(
            'SELECT user_id as vendor_id FROM products WHERE id = ?',
            [productId]
          );
          
          if (productInfo.length > 0) {
            await connection.execute(
              'INSERT INTO coupon_products (coupon_id, product_id, vendor_id) VALUES (?, ?, ?)',
              [saleId, productId, productInfo[0].vendor_id]
            );
          }
        }
      }
      
      await connection.commit();
      
      res.json({
        success: true,
        sale_id: saleId,
        message: 'Site-wide sale created successfully'
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Error creating site-wide sale:', error);
    res.status(500).json({ error: 'Failed to create site-wide sale' });
  }
});

/**
 * Get all sales
 * GET /api/admin/sales/all
 */
router.get('/sales/all', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    // Simple query following the working /users pattern
    const [sales] = await db.execute("SELECT id, code, name, discount_type, discount_value, is_active, created_at FROM coupons WHERE coupon_type = 'site_sale' ORDER BY created_at DESC");
    res.json({
      success: true,
      sales: sales
    });
  } catch (error) {
    console.error('Error getting sales:', error);
    res.status(500).json({ error: 'Failed to get sales' });
  }
});

/**
 * Update sale (status, etc.)
 * PUT /api/admin/sales/:id
 */
router.put('/sales/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const saleId = req.params.id;
    const { is_active, name, description, discount_value, valid_until } = req.body;
    
    // Verify sale exists and is a site_sale type
    const [saleCheck] = await db.execute(
      'SELECT id FROM coupons WHERE id = ? AND coupon_type = \'site_sale\'',
      [saleId]
    );
    
    if (saleCheck.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    
    // Build update query dynamically
    const updates = [];
    const params = [];
    
    if (is_active !== undefined) { 
      updates.push('is_active = ?'); 
      params.push(is_active ? 1 : 0); 
    }
    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (discount_value !== undefined) { updates.push('discount_value = ?'); params.push(discount_value); }
    if (valid_until !== undefined) { updates.push('valid_until = ?'); params.push(valid_until); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push('updated_at = NOW()');
    params.push(saleId);
    
    const updateQuery = `UPDATE coupons SET ${updates.join(', ')} WHERE id = ?`;
    await db.execute(updateQuery, params);
    
    res.json({
      success: true,
      message: 'Sale updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating sale:', error);
    res.status(500).json({ error: 'Failed to update sale' });
  }
});

/**
 * Get promotion analytics
 * GET /api/admin/promotions/analytics/overview
 */
router.get('/promotions/analytics/overview', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    // Get overall promotion stats
    const overviewQuery = `
      SELECT 
        COUNT(DISTINCT p.id) as total_promotions,
        COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_promotions,
        COUNT(DISTINCT pi.vendor_id) as total_invited_vendors,
        COUNT(DISTINCT CASE WHEN pi.invitation_status = 'accepted' THEN pi.vendor_id END) as accepted_vendors,
        COUNT(DISTINCT pp.product_id) as total_products_in_promotions,
        COALESCE(SUM(p.current_usage_count), 0) as total_promotion_uses
      FROM promotions p
      LEFT JOIN promotion_invitations pi ON p.id = pi.promotion_id
      LEFT JOIN promotion_products pp ON p.id = pp.promotion_id AND pp.approval_status = 'approved'
    `;
    
    const [overview] = await db.execute(overviewQuery);
    
    // Get recent promotion activity
    const activityQuery = `
      SELECT 
        'promotion_created' as activity_type,
        p.name as description,
        p.created_at as activity_date
      FROM promotions p
      WHERE p.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      
      UNION ALL
      
      SELECT 
        'vendor_accepted' as activity_type,
        CONCAT(u.username, ' accepted promotion: ', p.name) as description,
        pi.responded_at as activity_date
      FROM promotion_invitations pi
      JOIN promotions p ON pi.promotion_id = p.id
      JOIN users u ON pi.vendor_id = u.id
      WHERE pi.invitation_status = 'accepted' 
        AND pi.responded_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      
      ORDER BY activity_date DESC
      LIMIT 20
    `;
    
    const [activity] = await db.execute(activityQuery);
    
    res.json({
      success: true,
      overview: overview[0],
      recent_activity: activity
    });
    
  } catch (error) {
    console.error('Error getting promotion analytics:', error);
    res.status(500).json({ error: 'Failed to get promotion analytics' });
  }
});

// Mount maintenance control routes
router.use('/maintenance', maintenanceRoutes);

module.exports = router;