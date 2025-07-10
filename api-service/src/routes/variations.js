const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const authenticateToken = require('../middleware/jwt');
const { secureLogger } = require('../middleware/secureLogger');

// GET /variation-types - Get all variation types for current user
router.get('/types', authenticateToken, async (req, res) => {
  try {
    const [types] = await db.query(
      'SELECT id, variation_name, created_at FROM user_variation_types WHERE user_id = ? ORDER BY variation_name',
      [req.user.userId]
    );
    res.json(types);
  } catch (err) {
    secureLogger.error('Error fetching variation types', err);
    res.status(500).json({ error: 'Failed to fetch variation types' });
  }
});

// POST /variation-types - Create new variation type for current user
router.post('/types', authenticateToken, async (req, res) => {
  try {
    const { variation_name } = req.body;
    
    if (!variation_name || !variation_name.trim()) {
      return res.status(400).json({ error: 'Variation name is required' });
    }
    
    const trimmedName = variation_name.trim();
    
    // Check if this variation type already exists for this user
    const [existing] = await db.query(
      'SELECT id FROM user_variation_types WHERE user_id = ? AND variation_name = ?',
      [req.user.userId, trimmedName]
    );
    
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Variation type already exists' });
    }
    
    const [result] = await db.query(
      'INSERT INTO user_variation_types (user_id, variation_name) VALUES (?, ?)',
      [req.user.userId, trimmedName]
    );
    
    const [newType] = await db.query(
      'SELECT id, variation_name, created_at FROM user_variation_types WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json(newType[0]);
  } catch (err) {
    secureLogger.error('Error creating variation type', err);
    res.status(500).json({ error: 'Failed to create variation type' });
  }
});

// GET /variation-types/:id/values - Get all values for a variation type
router.get('/types/:id/values', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // First verify the variation type belongs to this user
    const [typeCheck] = await db.query(
      'SELECT id FROM user_variation_types WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );
    
    if (typeCheck.length === 0) {
      return res.status(404).json({ error: 'Variation type not found' });
    }
    
    const [values] = await db.query(
      'SELECT id, value_name, created_at FROM user_variation_values WHERE variation_type_id = ? ORDER BY value_name',
      [id]
    );
    
    res.json(values);
  } catch (err) {
    secureLogger.error('Error fetching variation values', err);
    res.status(500).json({ error: 'Failed to fetch variation values' });
  }
});

// POST /variation-values - Create new variation value
router.post('/values', authenticateToken, async (req, res) => {
  try {
    const { variation_type_id, value_name } = req.body;
    
    if (!variation_type_id || !value_name || !value_name.trim()) {
      return res.status(400).json({ error: 'Variation type ID and value name are required' });
    }
    
    const trimmedValue = value_name.trim();
    
    // Verify the variation type belongs to this user
    const [typeCheck] = await db.query(
      'SELECT id FROM user_variation_types WHERE id = ? AND user_id = ?',
      [variation_type_id, req.user.userId]
    );
    
    if (typeCheck.length === 0) {
      return res.status(404).json({ error: 'Variation type not found' });
    }
    
    // Check if this value already exists for this variation type
    const [existing] = await db.query(
      'SELECT id FROM user_variation_values WHERE variation_type_id = ? AND value_name = ?',
      [variation_type_id, trimmedValue]
    );
    
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Variation value already exists' });
    }
    
    const [result] = await db.query(
      'INSERT INTO user_variation_values (variation_type_id, value_name) VALUES (?, ?)',
      [variation_type_id, trimmedValue]
    );
    
    const [newValue] = await db.query(
      'SELECT id, variation_type_id, value_name, created_at FROM user_variation_values WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json(newValue[0]);
  } catch (err) {
    secureLogger.error('Error creating variation value', err);
    res.status(500).json({ error: 'Failed to create variation value' });
  }
});

// DELETE /variation-types/:id - Delete a variation type (and all its values)
router.delete('/types/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify the variation type belongs to this user
    const [typeCheck] = await db.query(
      'SELECT id FROM user_variation_types WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );
    
    if (typeCheck.length === 0) {
      return res.status(404).json({ error: 'Variation type not found' });
    }
    
    // Delete all values first (foreign key constraint)
    await db.query('DELETE FROM user_variation_values WHERE variation_type_id = ?', [id]);
    
    // Delete the variation type
    await db.query('DELETE FROM user_variation_types WHERE id = ?', [id]);
    
    res.json({ message: 'Variation type deleted successfully' });
  } catch (err) {
    secureLogger.error('Error deleting variation type', err);
    res.status(500).json({ error: 'Failed to delete variation type' });
  }
});

// DELETE /variation-values/:id - Delete a variation value
router.delete('/values/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify the variation value belongs to this user (through the variation type)
    const [valueCheck] = await db.query(
      `SELECT uv.id 
       FROM user_variation_values uv 
       JOIN user_variation_types ut ON uv.variation_type_id = ut.id 
       WHERE uv.id = ? AND ut.user_id = ?`,
      [id, req.user.userId]
    );
    
    if (valueCheck.length === 0) {
      return res.status(404).json({ error: 'Variation value not found' });
    }
    
    await db.query('DELETE FROM user_variation_values WHERE id = ?', [id]);
    
    res.json({ message: 'Variation value deleted successfully' });
  } catch (err) {
    secureLogger.error('Error deleting variation value', err);
    res.status(500).json({ error: 'Failed to delete variation value' });
  }
});

module.exports = router; 