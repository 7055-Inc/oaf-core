const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token and admin role
const verifyAdmin = async (req, res, next) => {
  console.log('Verifying admin for request:', req.method, req.url, 'Headers:', req.headers);
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log('No token provided');
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.roles = decoded.roles;
    if (!req.roles.includes('admin')) {
      console.log('User is not an admin:', req.userId);
      res.setHeader('Content-Type', 'application/json');
      return res.status(403).json({ error: 'Admin access required' });
    }
    console.log('Admin verified, userId:', req.userId);
    next();
  } catch (err) {
    console.log('Invalid token:', err.message);
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /admin/users - List all users
router.get('/users', verifyAdmin, async (req, res) => {
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
router.post('/users', verifyAdmin, async (req, res) => {
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
router.put('/users/:id', verifyAdmin, async (req, res) => {
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
router.delete('/users/:id', verifyAdmin, async (req, res) => {
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

module.exports = router;