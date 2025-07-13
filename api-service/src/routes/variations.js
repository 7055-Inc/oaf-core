const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { secureLogger } = require('../middleware/secureLogger');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.roles = decoded.roles;
    next();
  } catch (err) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /variation-types - Get all variation types for current user with usage counts
router.get('/types', verifyToken, async (req, res) => {
  try {
    const [types] = await db.query(`
      SELECT 
        vt.id, 
        vt.variation_name, 
        vt.created_at,
        COUNT(DISTINCT p.parent_id) as usage_count
      FROM user_variation_types vt
      LEFT JOIN product_variations pv ON vt.id = pv.variation_type_id
      LEFT JOIN products p ON pv.product_id = p.id AND p.product_type = 'variant'
      WHERE vt.user_id = ? 
      GROUP BY vt.id, vt.variation_name, vt.created_at
      ORDER BY vt.variation_name
    `, [req.userId]);
    
    res.json(types);
  } catch (err) {
    secureLogger.error('Error fetching variation types', err);
    res.status(500).json({ error: 'Failed to fetch variation types' });
  }
});

// POST /variation-types - Create new variation type for current user
router.post('/types', verifyToken, async (req, res) => {
  try {
    const { variation_name } = req.body;
    
    if (!variation_name || !variation_name.trim()) {
      return res.status(400).json({ error: 'Variation name is required' });
    }
    
    const trimmedName = variation_name.trim();
    
    // Check if this variation type already exists for this user
    const [existing] = await db.query(
      'SELECT id FROM user_variation_types WHERE user_id = ? AND variation_name = ?',
      [req.userId, trimmedName]
    );
    
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Variation type already exists' });
    }
    
    const [result] = await db.query(
      'INSERT INTO user_variation_types (user_id, variation_name) VALUES (?, ?)',
      [req.userId, trimmedName]
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

// GET /variation-types/:id/values - Get all values for a variation type (optionally filtered by product)
router.get('/types/:id/values', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id } = req.query;
    
    // First verify the variation type belongs to this user
    const [typeCheck] = await db.query(
      'SELECT id FROM user_variation_types WHERE id = ? AND user_id = ?',
      [id, req.userId]
    );
    
    if (typeCheck.length === 0) {
      return res.status(404).json({ error: 'Variation type not found' });
    }
    
    let query = 'SELECT id, value_name, product_id, created_at FROM user_variation_values WHERE variation_type_id = ?';
    let params = [id];
    
    // If product_id is provided, filter by product
    if (product_id) {
      query += ' AND product_id = ?';
      params.push(product_id);
    }
    
    query += ' ORDER BY value_name';
    
    const [values] = await db.query(query, params);
    
    res.json(values);
  } catch (err) {
    secureLogger.error('Error fetching variation values', err);
    res.status(500).json({ error: 'Failed to fetch variation values' });
  }
});

// POST /variation-values - Create new variation value
router.post('/values', verifyToken, async (req, res) => {
  try {
    const { variation_type_id, value_name, product_id } = req.body;
    
    if (!variation_type_id || !value_name || !value_name.trim()) {
      return res.status(400).json({ error: 'Variation type ID and value name are required' });
    }

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }
    
    const trimmedValue = value_name.trim();
    
    // Verify the variation type belongs to this user
    const [typeCheck] = await db.query(
      'SELECT id FROM user_variation_types WHERE id = ? AND user_id = ?',
      [variation_type_id, req.userId]
    );
    
    if (typeCheck.length === 0) {
      return res.status(404).json({ error: 'Variation type not found' });
    }

    // Verify the product exists and belongs to this user
    const [productCheck] = await db.query(
      'SELECT id FROM products WHERE id = ? AND vendor_id = ?',
      [product_id, req.userId]
    );
    
    if (productCheck.length === 0) {
      return res.status(404).json({ error: 'Product not found or access denied' });
    }
    
    // Check if this value already exists for this product and variation type
    const [existing] = await db.query(
      'SELECT id FROM user_variation_values WHERE product_id = ? AND variation_type_id = ? AND value_name = ?',
      [product_id, variation_type_id, trimmedValue]
    );
    
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Variation value already exists for this product' });
    }
    
    const [result] = await db.query(
      'INSERT INTO user_variation_values (variation_type_id, value_name, user_id, product_id) VALUES (?, ?, ?, ?)',
      [variation_type_id, trimmedValue, req.userId, product_id]
    );
    
    const [newValue] = await db.query(
      'SELECT id, variation_type_id, value_name, product_id, created_at FROM user_variation_values WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json(newValue[0]);
  } catch (err) {
    secureLogger.error('Error creating variation value', err);
    res.status(500).json({ error: 'Failed to create variation value' });
  }
});

// DELETE /variation-types/:id - Delete a variation type (and all its values)
router.delete('/types/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify the variation type belongs to this user
    const [typeCheck] = await db.query(
      'SELECT id FROM user_variation_types WHERE id = ? AND user_id = ?',
      [id, req.userId]
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
router.delete('/values/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify the variation value belongs to this user (through the variation type)
    const [valueCheck] = await db.query(
      `SELECT uv.id 
       FROM user_variation_values uv 
       JOIN user_variation_types ut ON uv.variation_type_id = ut.id 
       WHERE uv.id = ? AND ut.user_id = ?`,
      [id, req.userId]
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