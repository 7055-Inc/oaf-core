const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');
const EmailService = require('../services/emailService');

const emailService = new EmailService();

// Note: All admin endpoints now use requirePermission('manage_system') instead of hardcoded admin checks

// GET /admin/users - List all users
router.get('/users', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('GET /admin/users request received, userId:', req.userId);
  try {
    const [users] = await db.query('SELECT id, username, status, user_type FROM users');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /admin/users - Add a new user
router.post('/users', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('POST /admin/users request received, userId:', req.userId);
  const { username, status, user_type } = req.body;
  try {
    if (!username || !status || !user_type) {
      return res.status(400).json({ error: 'Missing required fields: username, status, user_type' });
    }
    const [result] = await db.query(
      'INSERT INTO users (username, email_verified, status, user_type) VALUES (?, ?, ?, ?)',
      [username, 'no', status, user_type]
    );
    const newUserId = result.insertId;
    await db.query('INSERT INTO user_profiles (user_id) VALUES (?)', [newUserId]);
    await db.query('INSERT INTO artist_profiles (user_id) VALUES (?)', [newUserId]);
    await db.query('INSERT INTO promoter_profiles (user_id) VALUES (?)', [newUserId]);
    await db.query('INSERT INTO community_profiles (user_id) VALUES (?)', [newUserId]);
    await db.query('INSERT INTO admin_profiles (user_id) VALUES (?)', [newUserId]);
    const [newUser] = await db.query('SELECT id, username, status, user_type FROM users WHERE id = ?', [newUserId]);
    res.json(newUser[0]);
  } catch (err) {
    console.error('Error adding user:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to add user' });
  }
});

// PUT /admin/users/:id - Update a user
router.put('/users/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('PUT /admin/users/:id request received, userId:', req.userId);
  const { id } = req.params;
  const { username, status, user_type } = req.body;
  try {
    await db.query(
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

// DELETE /admin/users/:id - Delete a user
router.delete('/users/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('DELETE /admin/users/:id request received, userId:', req.userId);
  const { id } = req.params;
  try {
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Error deleting user:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /admin/users/:id/permissions - Get user's permissions
router.get('/users/:id/permissions', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('GET /admin/users/:id/permissions request received, userId:', req.userId);
  const { id } = req.params;
  try {
    const [permissions] = await db.query('SELECT * FROM user_permissions WHERE user_id = ?', [id]);
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

// PUT /admin/users/:id/permissions - Update user's permissions
router.put('/users/:id/permissions', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('PUT /admin/users/:id/permissions request received, userId:', req.userId);
  const { id } = req.params;
  const { vendor, events, stripe_connect, manage_sites, manage_content, manage_system } = req.body;
  try {
    // Check if user exists
    const [user] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
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
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No permission fields provided' });
    }
    
    // Check if permissions record exists
    const [existing] = await db.query('SELECT user_id FROM user_permissions WHERE user_id = ?', [id]);
    
    if (existing[0]) {
      // Update existing permissions
      updateValues.push(id);
      await db.query(`UPDATE user_permissions SET ${updateFields.join(', ')} WHERE user_id = ?`, updateValues);
    } else {
      // Create new permissions record with all fields
      await db.query(
        'INSERT INTO user_permissions (user_id, vendor, events, stripe_connect, manage_sites, manage_content, manage_system) VALUES (?, ?, ?, ?, ?, ?, ?)', 
        [id, vendor || false, events || false, stripe_connect || false, manage_sites || false, manage_content || false, manage_system || false]
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

// GET /admin/default-policies - Get default shipping policy
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

// PUT /admin/default-policies - Update default shipping policy
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

// GET /admin/vendor-policies - Search and list vendor policies
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
    
    const [countResult] = await db.query(countQuery, params);
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
    const [vendors] = await db.query(dataQuery, params);
    
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

// GET /admin/vendor-policies/:user_id - Get specific vendor's policy and history
router.get('/vendor-policies/:user_id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('GET /admin/vendor-policies/:user_id request received, userId:', req.userId);
  const { user_id } = req.params;
  
  try {
    // Check if user exists and has vendor permissions
    const [userCheck] = await db.query(`
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
    const [currentPolicy] = await db.query(`
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
    const [history] = await db.query(`
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

// PUT /admin/vendor-policies/:user_id - Update vendor's policy as admin
router.put('/vendor-policies/:user_id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('PUT /admin/vendor-policies/:user_id request received, userId:', req.userId);
  const { user_id } = req.params;
  const { policy_text } = req.body;
  
  try {
    if (!policy_text || policy_text.trim() === '') {
      return res.status(400).json({ error: 'Policy text is required' });
    }

    // Check if user exists and has vendor permissions
    const [userCheck] = await db.query(`
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

// DELETE /admin/vendor-policies/:user_id - Delete vendor's policy (revert to default)
router.delete('/vendor-policies/:user_id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('DELETE /admin/vendor-policies/:user_id request received, userId:', req.userId);
  const { user_id } = req.params;
  
  try {
    // Check if user exists and has vendor permissions
    const [userCheck] = await db.query(`
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
    await db.query(
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

// GET /admin/default-return-policies - Get default return policy
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

// PUT /admin/default-return-policies - Update default return policy
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

// GET /admin/vendor-return-policies - Search and list vendor return policies
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
    
    const [countResult] = await db.query(countQuery, params);
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
    const [vendors] = await db.query(dataQuery, params);
    
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

// GET /admin/vendor-return-policies/:user_id - Get specific vendor's return policy and history
router.get('/vendor-return-policies/:user_id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('GET /admin/vendor-return-policies/:user_id request received, userId:', req.userId);
  const { user_id } = req.params;
  
  try {
    // Check if user exists and has vendor permissions
    const [userCheck] = await db.query(`
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
    const [currentPolicy] = await db.query(`
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
    const [history] = await db.query(`
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

// PUT /admin/vendor-return-policies/:user_id - Update vendor's return policy as admin
router.put('/vendor-return-policies/:user_id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('PUT /admin/vendor-return-policies/:user_id request received, userId:', req.userId);
  const { user_id } = req.params;
  const { policy_text } = req.body;
  
  try {
    if (!policy_text || policy_text.trim() === '') {
      return res.status(400).json({ error: 'Policy text is required' });
    }

    // Check if user exists and has vendor permissions
    const [userCheck] = await db.query(`
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

// DELETE /admin/vendor-return-policies/:user_id - Delete vendor's return policy (revert to default)
router.delete('/vendor-return-policies/:user_id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  console.log('DELETE /admin/vendor-return-policies/:user_id request received, userId:', req.userId);
  const { user_id } = req.params;
  
  try {
    // Check if user exists and has vendor permissions
    const [userCheck] = await db.query(`
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
    await db.query(
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

// GET /admin/email-stats - Get email system statistics (admin only)
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

// GET /admin/email-queue - Get email queue status (admin only)
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

// GET /admin/email-templates - Get all email templates (admin only)
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

// GET /admin/email-bounces - Get bounce tracking information (admin only)
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

// GET /admin/email-recent - Get recent email activity (admin only)
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

// POST /admin/email-test - Send test email (admin only)
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

// POST /admin/email-process-queue - Manually process email queue (admin only)
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

// POST /admin/email-bounces-unblacklist - Remove domain from blacklist (admin only)
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

module.exports = router;