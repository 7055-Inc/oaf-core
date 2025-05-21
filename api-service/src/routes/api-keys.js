const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  console.log('Verifying token for request:', req.method, req.url, 'Headers:', req.headers);
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log('No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    console.log('Token verified, userId:', req.userId);
    next();
  } catch (err) {
    console.log('Invalid token:', err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// POST /api-keys - Generate a new API key
router.post('/', verifyToken, async (req, res) => {
  console.log('POST /api-keys request received, userId:', req.userId);
  try {
    const userId = req.userId;
    const publicKey = `oaf_${uuidv4()}`;
    const privateKey = crypto.randomBytes(32).toString('hex');
    const privateKeyHashed = crypto.createHash('sha256').update(privateKey).digest('hex');
    const name = req.body.name || 'Default API Key';

    await db.query(
      'INSERT INTO api_keys (user_id, public_key, private_key_hashed, name, permissions, is_active, rate_limit) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, publicKey, privateKeyHashed, name, JSON.stringify({}), 1, 1000]
    );

    res.json({ public_key: publicKey, private_key: privateKey, name });
  } catch (err) {
    console.error('API key generation error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// GET /api-keys - List all API keys for the user
router.get('/', verifyToken, async (req, res) => {
  console.log('GET /api-keys request received, userId:', req.userId);
  try {
    const userId = req.userId;
    const [keys] = await db.query('SELECT public_key, name, created_at, is_active FROM api_keys WHERE user_id = ?', [userId]);
    res.json(keys);
  } catch (err) {
    console.error('API key retrieval error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to retrieve API keys' });
  }
});

module.exports = router;