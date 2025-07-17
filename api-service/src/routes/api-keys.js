const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// GET /api-keys - Get all API keys for the authenticated user
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