const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requireRestrictedPermission } = require('../middleware/permissions');

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
// GET /terms/all - Get all terms versions (system management permission required)
router.get('/all', verifyToken, requireRestrictedPermission('manage_system'), async (req, res) => {
  try {
    
    const [terms] = await db.query(
      `SELECT 
        tv.id, 
        tv.version, 
        tv.title, 
        tv.content, 
        tv.is_current, 
        tv.created_at, 
        tv.created_by,
        up.first_name,
        up.last_name,
        CONCAT(up.first_name, ' ', up.last_name) as created_by_name
      FROM terms_versions tv
      LEFT JOIN user_profiles up ON tv.created_by = up.user_id
      ORDER BY tv.created_at DESC`
    );
    
    res.json(terms);
  } catch (err) {
    console.error('Error fetching all terms:', err);
    res.status(500).json({ error: 'Failed to fetch terms' });
  }
});

// POST /terms/create - Create new terms version (system management permission required)
router.post('/create', verifyToken, requireRestrictedPermission('manage_system'), async (req, res) => {
  try {
    
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

// PUT /terms/:id/set-current - Set terms version as current (system management permission required)
router.put('/:id/set-current', verifyToken, requireRestrictedPermission('manage_system'), async (req, res) => {
  try {
    
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

// PUT /terms/:id - Update terms version (system management permission required)
router.put('/:id', verifyToken, requireRestrictedPermission('manage_system'), async (req, res) => {
  try {
    
    const termsId = req.params.id;
    const { version, title, content, setCurrent } = req.body;
    
    if (!version || !title || !content) {
      return res.status(400).json({ error: 'Version, title, and content are required' });
    }
    
    // Check if terms version exists
    const [existing] = await db.query('SELECT id, is_current FROM terms_versions WHERE id = ?', [termsId]);
    if (!existing[0]) {
      return res.status(404).json({ error: 'Terms version not found' });
    }
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // If setting as current, unset all other current terms
      if (setCurrent) {
        await db.query('UPDATE terms_versions SET is_current = FALSE');
      }
      
      // Update terms version
      await db.query(
        'UPDATE terms_versions SET version = ?, title = ?, content = ?, is_current = ?, updated_at = NOW() WHERE id = ?',
        [version, title, content, setCurrent || false, termsId]
      );
      
      await db.query('COMMIT');
      
      res.json({ 
        success: true, 
        message: 'Terms version updated successfully' 
      });
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Error updating terms:', err);
    res.status(500).json({ error: 'Failed to update terms' });
  }
});

// DELETE /terms/:id - Delete terms version (system management permission required)
router.delete('/:id', verifyToken, requireRestrictedPermission('manage_system'), async (req, res) => {
  try {
    
    const termsId = req.params.id;
    
    // Check if terms version exists and is not current
    const [existing] = await db.query('SELECT id, is_current FROM terms_versions WHERE id = ?', [termsId]);
    if (!existing[0]) {
      return res.status(404).json({ error: 'Terms version not found' });
    }
    
    if (existing[0].is_current) {
      return res.status(400).json({ error: 'Cannot delete current terms version' });
    }
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // Delete user acceptances for this terms version
      await db.query('DELETE FROM user_terms_acceptance WHERE terms_version_id = ?', [termsId]);
      
      // Delete terms version
      await db.query('DELETE FROM terms_versions WHERE id = ?', [termsId]);
      
      await db.query('COMMIT');
      
      res.json({ 
        success: true, 
        message: 'Terms version deleted successfully' 
      });
    } catch (err) {
      await db.query('ROLLBACK');
      throw err;
    }
  } catch (err) {
    console.error('Error deleting terms:', err);
    res.status(500).json({ error: 'Failed to delete terms' });
  }
});

module.exports = router; 