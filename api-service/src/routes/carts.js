const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');

// Middleware to verify JWT token for user-specific actions
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// --- Cart Collections ---
router.get('/collections', verifyToken, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM cart_collections WHERE user_id = ?', [req.userId]);
  res.json(rows);
});

router.post('/collections', verifyToken, async (req, res) => {
  const { name, description, is_public } = req.body;
  await db.query('INSERT INTO cart_collections (user_id, name, description, is_public) VALUES (?, ?, ?, ?)', [req.userId, name, description, !!is_public]);
  res.json({ success: true });
});

router.put('/collections/:id', verifyToken, async (req, res) => {
  const { name, description, is_public } = req.body;
  await db.query('UPDATE cart_collections SET name = ?, description = ?, is_public = ? WHERE id = ? AND user_id = ?', [name, description, !!is_public, req.params.id, req.userId]);
  res.json({ success: true });
});

router.delete('/collections/:id', verifyToken, async (req, res) => {
  await db.query('DELETE FROM cart_collections WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  res.json({ success: true });
});

// --- Carts ---
router.get('/', verifyToken, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM carts WHERE user_id = ?', [req.userId]);
  res.json(rows);
});

router.post('/', async (req, res) => {
  try {
    // Check if user is authenticated
    const token = req.headers.authorization?.split(' ')[1];
    let userId = null;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (err) {
        // Token invalid, treat as guest
      }
    }

    const { guest_token, status } = req.body;
    
    // Insert new cart
    const [result] = await db.query(
      'INSERT INTO carts (user_id, guest_token, status) VALUES (?, ?, ?)', 
      [userId, guest_token || null, status || 'draft']
    );
    
    // Return the created cart with ID
    const [newCart] = await db.query('SELECT * FROM carts WHERE id = ?', [result.insertId]);
    
    res.json({ success: true, cart: newCart[0] });
  } catch (err) {
    console.error('Cart creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to create cart' });
  }
});

router.put('/:id', verifyToken, async (req, res) => {
  const { status } = req.body;
  await db.query('UPDATE carts SET status = ? WHERE id = ? AND user_id = ?', [status, req.params.id, req.userId]);
  res.json({ success: true });
});

router.delete('/:id', verifyToken, async (req, res) => {
  await db.query('DELETE FROM carts WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  res.json({ success: true });
});

// --- Cart Items ---
router.get('/:cartId/items', verifyToken, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM cart_items WHERE cart_id = ?', [req.params.cartId]);
  res.json(rows);
});

router.post('/:cartId/items', verifyToken, async (req, res) => {
  const { product_id, vendor_id, quantity, price } = req.body;
  await db.query('INSERT INTO cart_items (cart_id, product_id, vendor_id, quantity, price) VALUES (?, ?, ?, ?, ?)', [req.params.cartId, product_id, vendor_id, quantity, price]);
  res.json({ success: true });
});

router.put('/:cartId/items/:itemId', verifyToken, async (req, res) => {
  const { quantity, price } = req.body;
  await db.query('UPDATE cart_items SET quantity = ?, price = ? WHERE id = ? AND cart_id = ?', [quantity, price, req.params.itemId, req.params.cartId]);
  res.json({ success: true });
});

router.delete('/:cartId/items/:itemId', verifyToken, async (req, res) => {
  await db.query('DELETE FROM cart_items WHERE id = ? AND cart_id = ?', [req.params.itemId, req.params.cartId]);
  res.json({ success: true });
});

// --- Saved Items ---
router.get('/saved', verifyToken, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM saved_items WHERE user_id = ?', [req.userId]);
  res.json(rows);
});

router.post('/saved', verifyToken, async (req, res) => {
  const { product_id, quantity, notes, collection_name } = req.body;
  await db.query('INSERT INTO saved_items (user_id, product_id, quantity, notes, collection_name) VALUES (?, ?, ?, ?, ?)', [req.userId, product_id, quantity, notes, collection_name]);
  res.json({ success: true });
});

router.put('/saved/:id', verifyToken, async (req, res) => {
  const { quantity, notes, collection_name } = req.body;
  await db.query('UPDATE saved_items SET quantity = ?, notes = ?, collection_name = ? WHERE id = ? AND user_id = ?', [quantity, notes, collection_name, req.params.id, req.userId]);
  res.json({ success: true });
});

router.delete('/saved/:id', verifyToken, async (req, res) => {
  await db.query('DELETE FROM saved_items WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  res.json({ success: true });
});

// --- TODOs for main site logic ---
// - Cart to checkout conversion
// - Inventory hold/release
// - Payment/Stripe integration
// - Order creation
// These are handled outside of api-service.

module.exports = router; 