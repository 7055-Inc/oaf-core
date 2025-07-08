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
    req.permissions = decoded.permissions || [];
    console.log('Token verified, userId:', req.userId);
    next();
  } catch (err) {
    console.log('Invalid token:', err.message);
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /terms/current - Get current terms version
router.get('/current', async (req, res) => {
  try {
    const [terms] = await db.query(
      'SELECT id, version, title, content, created_at FROM terms_versions WHERE is_current = TRUE ORDER BY created_at DESC LIMIT 1'
    );
    
    if (!terms[0]) {
      return res.status(404).json({ error: 'No current terms found' });
    }
    
    res.json(terms[0]);
  } catch (err) {
    console.error('Error fetching current terms:', err);
    res.status(500).json({ error: 'Failed to fetch current terms' });
  }
});

// GET /terms/check-acceptance - Check if user has accepted current terms
router.get('/check-acceptance', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get current terms version
    const [currentTerms] = await db.query(
      'SELECT id FROM terms_versions WHERE is_current = TRUE ORDER BY created_at DESC LIMIT 1'
    );
    
    if (!currentTerms[0]) {
      return res.json({ hasAccepted: false, requiresAcceptance: false, message: 'No current terms found' });
    }
    
    // Check if user has accepted current terms
    const [acceptance] = await db.query(
      'SELECT id, accepted_at FROM user_terms_acceptance WHERE user_id = ? AND terms_version_id = ?',
      [userId, currentTerms[0].id]
    );
    
    res.json({
      hasAccepted: acceptance.length > 0,
      requiresAcceptance: acceptance.length === 0,
      termsVersionId: currentTerms[0].id,
      acceptedAt: acceptance[0]?.accepted_at || null
    });
  } catch (err) {
    console.error('Error checking terms acceptance:', err);
    res.status(500).json({ error: 'Failed to check terms acceptance' });
  }
});

// POST /terms/accept - Accept current terms
router.post('/accept', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { termsVersionId } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    if (!termsVersionId) {
      return res.status(400).json({ error: 'Terms version ID is required' });
    }
    
    // Verify this is the current terms version
    const [currentTerms] = await db.query(
      'SELECT id FROM terms_versions WHERE id = ? AND is_current = TRUE',
      [termsVersionId]
    );
    
    if (!currentTerms[0]) {
      return res.status(400).json({ error: 'Invalid or outdated terms version' });
    }
    
    // Check if user has already accepted this version
    const [existing] = await db.query(
      'SELECT id FROM user_terms_acceptance WHERE user_id = ? AND terms_version_id = ?',
      [userId, termsVersionId]
    );
    
    if (existing.length > 0) {
      return res.json({ success: true, message: 'Terms already accepted' });
    }
    
    // Record acceptance
    await db.query(
      'INSERT INTO user_terms_acceptance (user_id, terms_version_id, ip_address, user_agent) VALUES (?, ?, ?, ?)',
      [userId, termsVersionId, ipAddress, userAgent]
    );
    
    res.json({ success: true, message: 'Terms accepted successfully' });
  } catch (err) {
    console.error('Error accepting terms:', err);
    res.status(500).json({ error: 'Failed to accept terms' });
  }
});

// Admin endpoints
// GET /terms/all - Get all terms versions (admin only)
router.get('/all', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [req.userId]);
    if (!user[0] || user[0].user_type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const [terms] = await db.query(
      'SELECT id, version, title, is_current, created_at FROM terms_versions ORDER BY created_at DESC'
    );
    
    res.json(terms);
  } catch (err) {
    console.error('Error fetching all terms:', err);
    res.status(500).json({ error: 'Failed to fetch terms' });
  }
});

// POST /terms/create - Create new terms version (admin only)
router.post('/create', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [req.userId]);
    if (!user[0] || user[0].user_type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { version, title, content, setCurrent } = req.body;
    
    if (!version || !title || !content) {
      return res.status(400).json({ error: 'Version, title, and content are required' });
    }
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // If setting as current, unset all other current terms
      if (setCurrent) {
        await db.query('UPDATE terms_versions SET is_current = FALSE');
      }
      
      // Create new terms version
      const [result] = await db.query(
        'INSERT INTO terms_versions (version, title, content, is_current, created_by) VALUES (?, ?, ?, ?, ?)',
        [version, title, content, setCurrent || false, req.userId]
      );
      
      await db.query('COMMIT');
      
      res.json({ 
        success: true, 
        id: result.insertId,
        message: 'Terms version created successfully' 
      });
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Error creating terms:', err);
    res.status(500).json({ error: 'Failed to create terms' });
  }
});

// PUT /terms/:id/set-current - Set terms version as current (admin only)
router.put('/:id/set-current', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [req.userId]);
    if (!user[0] || user[0].user_type !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const termsId = req.params.id;
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // Unset all current terms
      await db.query('UPDATE terms_versions SET is_current = FALSE');
      
      // Set this version as current
      await db.query('UPDATE terms_versions SET is_current = TRUE WHERE id = ?', [termsId]);
      
      await db.query('COMMIT');
      
      res.json({ success: true, message: 'Terms version set as current' });
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Error setting current terms:', err);
    res.status(500).json({ error: 'Failed to set current terms' });
  }
});

module.exports = router; 