const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  console.log('Verifying token for request:', req.method, req.url, 'Headers:', req.headers);
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
    console.log('Token verified, userId:', req.userId);
    next();
  } catch (err) {
    console.log('Invalid token:', err.message);
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /users/me - Fetch current user's profile
router.get('/me', verifyToken, async (req, res) => {
  console.log('GET /users/me request received, userId:', req.userId);
  try {
    const [user] = await db.query(
      'SELECT u.id, u.username, u.email_verified, u.status, u.user_type, up.first_name, up.last_name ' +
      'FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = ?',
      [req.userId]
    );
    if (!user[0]) {
      console.log('User not found for userId:', req.userId);
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user[0]);
  } catch (err) {
    console.error('Error fetching user profile:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PATCH /users/me - Update current user's profile
router.patch('/me', verifyToken, async (req, res) => {
  console.log('PATCH /users/me request received, userId:', req.userId);
  const { first_name, last_name, user_type } = req.body;
  try {
    if (!first_name || !last_name || !user_type) {
      return res.status(400).json({ error: 'Missing required fields: first_name, last_name, user_type' });
    }
    if (!['artist', 'community', 'promoter'].includes(user_type)) {
      return res.status(400).json({ error: 'Invalid user_type. Must be one of: artist, community, promoter' });
    }
    await db.query(
      'UPDATE user_profiles SET first_name = ?, last_name = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
      [first_name, last_name, req.userId]
    );
    await db.query(
      'UPDATE users SET status = ?, user_type = ? WHERE id = ?',
      ['active', user_type, req.userId]
    );
    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Error updating user profile:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

module.exports = router;