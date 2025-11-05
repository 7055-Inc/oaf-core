const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const jwt = require('jsonwebtoken');

/**
 * @fileoverview Shopping cart management routes
 * 
 * Handles comprehensive cart functionality including:
 * - Multi-cart system with site-specific carts
 * - Cart collections for organization
 * - Guest and authenticated user support
 * - Cart items management (add, update, remove)
 * - Saved items for later (wishlist functionality)
 * - Unified cart view across multiple sites
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

// --- Cart Collections ---

/**
 * Get all cart collections for authenticated user
 * @route GET /api/carts/collections
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Array} Array of cart collections
 */
router.get('/collections', verifyToken, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM cart_collections WHERE user_id = ?', [req.userId]);
  res.json(rows);
});

/**
 * Create a new cart collection
 * @route POST /api/carts/collections
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.body.name - Collection name
 * @param {string} req.body.description - Collection description
 * @param {boolean} req.body.is_public - Whether collection is public
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation
 */
router.post('/collections', verifyToken, async (req, res) => {
  const { name, description, is_public } = req.body;
  await db.query('INSERT INTO cart_collections (user_id, name, description, is_public) VALUES (?, ?, ?, ?)', [req.userId, name, description, !!is_public]);
  res.json({ success: true });
});

/**
 * Update an existing cart collection
 * @route PUT /api/carts/collections/:id
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Collection ID
 * @param {string} req.body.name - Updated collection name
 * @param {string} req.body.description - Updated collection description
 * @param {boolean} req.body.is_public - Updated public status
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation
 */
router.put('/collections/:id', verifyToken, async (req, res) => {
  const { name, description, is_public } = req.body;
  await db.query('UPDATE cart_collections SET name = ?, description = ?, is_public = ? WHERE id = ? AND user_id = ?', [name, description, !!is_public, req.params.id, req.userId]);
  res.json({ success: true });
});

/**
 * Delete a cart collection
 * @route DELETE /api/carts/collections/:id
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Collection ID to delete
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation
 */
router.delete('/collections/:id', verifyToken, async (req, res) => {
  await db.query('DELETE FROM cart_collections WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  res.json({ success: true });
});

// --- Carts ---

/**
 * Get all carts for authenticated user
 * @route GET /api/carts
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Array} Array of user's carts
 */
router.get('/', verifyToken, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM carts WHERE user_id = ?', [req.userId]);
  res.json(rows);
});

/**
 * Get unified view of all user carts with items and totals
 * Multi-Cart Revolution: Groups carts by source site for better UX
 * @route GET /api/carts/unified
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Comprehensive cart data grouped by source site
 */
router.get('/unified', verifyToken, async (req, res) => {
  try {
    // Get all carts for the user
    const [carts] = await db.query(
      'SELECT * FROM carts WHERE user_id = ? ORDER BY created_at DESC', 
      [req.userId]
    );

    // For each cart, get its items with product details
    const cartsWithItems = await Promise.all(
      carts.map(async (cart) => {
        const [items] = await db.query(`
          SELECT ci.*, p.name as product_name, p.price as current_price, 
                 pi.image_url as image_path, u.username as vendor_name,
                 COALESCE(up.first_name, u.username) as vendor_display_name
          FROM cart_items ci
          JOIN products p ON ci.product_id = p.id
          JOIN users u ON ci.vendor_id = u.id
          LEFT JOIN user_profiles up ON u.id = up.user_id
          LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.order = 0
          WHERE ci.cart_id = ?
        `, [cart.id]);

        return {
          ...cart,
          items: items,
          item_count: items.length,
          total_value: items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0)
        };
      })
    );

    // Group carts by source site for better UX
    const groupedCarts = cartsWithItems.reduce((groups, cart) => {
      const source = cart.source_site_name || 'Main Site';
      if (!groups[source]) {
        groups[source] = {
          source_name: source,
          source_api_key: cart.source_site_api_key,
          carts: [],
          total_items: 0,
          total_value: 0
        };
      }
      groups[source].carts.push(cart);
      groups[source].total_items += cart.item_count;
      groups[source].total_value += cart.total_value;
      return groups;
    }, {});

    res.json({
      user_id: req.userId,
      total_carts: cartsWithItems.length,
      total_items: cartsWithItems.reduce((sum, cart) => sum + cart.item_count, 0),
      total_value: cartsWithItems.reduce((sum, cart) => sum + cart.total_value, 0),
      grouped_by_source: groupedCarts,
      all_carts: cartsWithItems
    });
  } catch (err) {
    console.error('Unified cart retrieval error:', err);
    res.status(500).json({ error: 'Failed to retrieve unified cart data' });
  }
});

/**
 * Create a new cart (supports both authenticated and guest users)
 * @route POST /api/carts
 * @access Public
 * @param {Object} req - Express request object
 * @param {string} req.body.guest_token - Guest identifier (required for unauthenticated users)
 * @param {string} req.body.status - Cart status (default: 'draft')
 * @param {string} req.body.source_site_api_key - API key of originating site
 * @param {string} req.body.source_site_name - Name of originating site
 * @param {Object} res - Express response object
 * @returns {Object} Created cart object
 */
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

    const { guest_token, status, source_site_api_key, source_site_name } = req.body;
    
    // Insert new cart with site tracking
    const [result] = await db.query(
      'INSERT INTO carts (user_id, guest_token, source_site_api_key, source_site_name, status) VALUES (?, ?, ?, ?, ?)', 
      [userId, guest_token || null, source_site_api_key || null, source_site_name || null, status || 'draft']
    );
    
    // Return the created cart with ID
    const [newCart] = await db.query('SELECT * FROM carts WHERE id = ?', [result.insertId]);
    
    res.json({ success: true, cart: newCart[0] });
  } catch (err) {
    console.error('Cart creation error:', err);
    res.status(500).json({ error: err.message || 'Failed to create cart' });
  }
});

/**
 * Update cart status
 * @route PUT /api/carts/:id
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Cart ID
 * @param {string} req.body.status - New cart status
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation
 */
router.put('/:id', verifyToken, async (req, res) => {
  const { status } = req.body;
  await db.query('UPDATE carts SET status = ? WHERE id = ? AND user_id = ?', [status, req.params.id, req.userId]);
  res.json({ success: true });
});

/**
 * Delete a cart
 * @route DELETE /api/carts/:id
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Cart ID to delete
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation
 */
router.delete('/:id', verifyToken, async (req, res) => {
  await db.query('DELETE FROM carts WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  res.json({ success: true });
});

// --- Cart Items ---

/**
 * Get all items in a specific cart
 * @route GET /api/carts/:cartId/items
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.cartId - Cart ID
 * @param {Object} res - Express response object
 * @returns {Array} Array of cart items
 */
router.get('/:cartId/items', verifyToken, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM cart_items WHERE cart_id = ?', [req.params.cartId]);
  res.json(rows);
});

/**
 * Add item to a specific cart
 * @route POST /api/carts/:cartId/items
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.cartId - Cart ID
 * @param {number} req.body.product_id - Product ID to add
 * @param {number} req.body.vendor_id - Vendor ID
 * @param {number} req.body.quantity - Item quantity
 * @param {number} req.body.price - Item price
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation
 */
router.post('/:cartId/items', verifyToken, async (req, res) => {
  const { product_id, vendor_id, quantity, price } = req.body;
  await db.query('INSERT INTO cart_items (cart_id, product_id, vendor_id, quantity, price) VALUES (?, ?, ?, ?, ?)', [req.params.cartId, product_id, vendor_id, quantity, price]);
  res.json({ success: true });
});

/**
 * Update cart item quantity and price
 * @route PUT /api/carts/:cartId/items/:itemId
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.cartId - Cart ID
 * @param {string} req.params.itemId - Cart item ID
 * @param {number} req.body.quantity - Updated quantity
 * @param {number} req.body.price - Updated price
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation
 */
router.put('/:cartId/items/:itemId', verifyToken, async (req, res) => {
  const { quantity, price } = req.body;
  await db.query('UPDATE cart_items SET quantity = ?, price = ? WHERE id = ? AND cart_id = ?', [quantity, price, req.params.itemId, req.params.cartId]);
  res.json({ success: true });
});

/**
 * Remove item from cart
 * @route DELETE /api/carts/:cartId/items/:itemId
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.cartId - Cart ID
 * @param {string} req.params.itemId - Cart item ID to remove
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation
 */
router.delete('/:cartId/items/:itemId', verifyToken, async (req, res) => {
  await db.query('DELETE FROM cart_items WHERE id = ? AND cart_id = ?', [req.params.itemId, req.params.cartId]);
  res.json({ success: true });
});

// --- Saved Items (Wishlist) ---

/**
 * Get all saved items for authenticated user (wishlist functionality)
 * @route GET /api/carts/saved
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Array} Array of saved items
 */
router.get('/saved', verifyToken, async (req, res) => {
  const [rows] = await db.query('SELECT * FROM saved_items WHERE user_id = ?', [req.userId]);
  res.json(rows);
});

/**
 * Save item for later (add to wishlist)
 * @route POST /api/carts/saved
 * @access Private
 * @param {Object} req - Express request object
 * @param {number} req.body.product_id - Product ID to save
 * @param {number} req.body.quantity - Desired quantity
 * @param {string} req.body.notes - Optional notes
 * @param {string} req.body.collection_name - Collection to save to
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation
 */
router.post('/saved', verifyToken, async (req, res) => {
  const { product_id, quantity, notes, collection_name } = req.body;
  await db.query('INSERT INTO saved_items (user_id, product_id, quantity, notes, collection_name) VALUES (?, ?, ?, ?, ?)', [req.userId, product_id, quantity, notes, collection_name]);
  res.json({ success: true });
});

/**
 * Update saved item details
 * @route PUT /api/carts/saved/:id
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Saved item ID
 * @param {number} req.body.quantity - Updated quantity
 * @param {string} req.body.notes - Updated notes
 * @param {string} req.body.collection_name - Updated collection name
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation
 */
router.put('/saved/:id', verifyToken, async (req, res) => {
  const { quantity, notes, collection_name } = req.body;
  await db.query('UPDATE saved_items SET quantity = ?, notes = ?, collection_name = ? WHERE id = ? AND user_id = ?', [quantity, notes, collection_name, req.params.id, req.userId]);
  res.json({ success: true });
});

/**
 * Remove item from saved items (wishlist)
 * @route DELETE /api/carts/saved/:id
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.id - Saved item ID to remove
 * @param {Object} res - Express response object
 * @returns {Object} Success confirmation
 */
router.delete('/saved/:id', verifyToken, async (req, res) => {
  await db.query('DELETE FROM saved_items WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
  res.json({ success: true });
});

/**
 * Enhanced Add to Cart with Site Context (Multi-Cart Revolution!)
 * Intelligently manages multi-site carts and guest/authenticated users
 * @route POST /api/carts/add
 * @access Public
 * @param {Object} req - Express request object
 * @param {number} req.body.product_id - Product ID to add
 * @param {number} req.body.vendor_id - Vendor ID
 * @param {number} req.body.quantity - Item quantity (default: 1)
 * @param {number} req.body.price - Item price
 * @param {string} req.body.guest_token - Guest identifier (required for unauthenticated users)
 * @param {string} req.body.source_site_api_key - API key of originating site
 * @param {string} req.body.source_site_name - Name of originating site
 * @param {Object} res - Express response object
 * @returns {Object} Cart information with added item details
 */
router.post('/add', async (req, res) => {
  try {
    // Check if user is authenticated or use guest token
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

    const { 
      product_id, 
      vendor_id, 
      quantity = 1, 
      price,
      guest_token,
      source_site_api_key,
      source_site_name 
    } = req.body;

    if (!product_id || !vendor_id || !price) {
      return res.status(400).json({ error: 'Missing required fields: product_id, vendor_id, price' });
    }

    // Get or create cart for this user/guest + site combination
    let cartId;
    
    if (userId) {
      // For authenticated users: find or create cart for this site
      const [existingCarts] = await db.query(
        'SELECT id FROM carts WHERE user_id = ? AND source_site_api_key = ? AND status = "draft" ORDER BY created_at DESC LIMIT 1',
        [userId, source_site_api_key || null]
      );

      if (existingCarts.length > 0) {
        cartId = existingCarts[0].id;
      } else {
        // Create new cart for this site
        const [result] = await db.query(
          'INSERT INTO carts (user_id, source_site_api_key, source_site_name, status) VALUES (?, ?, ?, ?)',
          [userId, source_site_api_key || null, source_site_name || 'Unknown Site', 'draft']
        );
        cartId = result.insertId;
      }
    } else {
      // For guest users: find or create cart by guest_token + site
      if (!guest_token) {
        return res.status(400).json({ error: 'guest_token required for unauthenticated users' });
      }

      const [existingCarts] = await db.query(
        'SELECT id FROM carts WHERE guest_token = ? AND source_site_api_key = ? AND status = "draft" ORDER BY created_at DESC LIMIT 1',
        [guest_token, source_site_api_key || null]
      );

      if (existingCarts.length > 0) {
        cartId = existingCarts[0].id;
      } else {
        // Create new guest cart for this site
        const [result] = await db.query(
          'INSERT INTO carts (guest_token, source_site_api_key, source_site_name, status) VALUES (?, ?, ?, ?)',
          [guest_token, source_site_api_key || null, source_site_name || 'Unknown Site', 'draft']
        );
        cartId = result.insertId;
      }
    }

    // Check if item already exists in this cart
    const [existingItems] = await db.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND vendor_id = ?',
      [cartId, product_id, vendor_id]
    );

    if (existingItems.length > 0) {
      // Update quantity if item exists
      const newQuantity = existingItems[0].quantity + quantity;
      await db.query(
        'UPDATE cart_items SET quantity = ?, price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newQuantity, price, existingItems[0].id]
      );
    } else {
      // Add new item to cart
      await db.query(
        'INSERT INTO cart_items (cart_id, product_id, vendor_id, quantity, price) VALUES (?, ?, ?, ?, ?)',
        [cartId, product_id, vendor_id, quantity, price]
      );
    }

    // Get updated cart info
    const [cartInfo] = await db.query(
      'SELECT c.*, COUNT(ci.id) as item_count, COALESCE(SUM(ci.quantity * ci.price), 0) as total_value FROM carts c LEFT JOIN cart_items ci ON c.id = ci.cart_id WHERE c.id = ? GROUP BY c.id',
      [cartId]
    );

    res.json({
      success: true,
      message: 'Item added to cart successfully',
      cart: cartInfo[0],
      added_item: {
        product_id,
        vendor_id,
        quantity,
        price
      }
    });

  } catch (err) {
    console.error('Enhanced add to cart error:', err);
    res.status(500).json({ error: err.message || 'Failed to add item to cart' });
  }
});

// --- TODOs for main site logic ---
// - Cart to checkout conversion
// - Inventory hold/release
// - Payment/Stripe integration
// - Order creation
// These are handled outside of api-service.

module.exports = router; 