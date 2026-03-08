const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { secureLogger } = require('../middleware/secureLogger');

/**
 * @fileoverview Inventory management routes
 * 
 * Handles comprehensive inventory tracking functionality including:
 * - Product inventory retrieval with allocation details
 * - Inventory quantity updates with transaction safety
 * - Inventory history tracking for audit trails
 * - Automatic inventory record creation for new products
 * - Admin-level inventory synchronization across all products
 * - Integration with product availability and allocation systems
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

/**
 * Get all inventory history for the current user across all products
 * @route GET /api/inventory/history
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} All inventory history for user's products in chronological order
 */
router.get('/history', verifyToken, async (req, res) => {
  try {
    // Get all inventory history for products owned by this user
    // Include SKU for search functionality
    const [history] = await db.query(
      `SELECT ih.*, p.name as product_name, p.sku as product_sku,
              up.first_name, up.last_name, u.username,
              (ih.new_qty - ih.previous_qty) as quantity_change
       FROM inventory_history ih 
       JOIN products p ON ih.product_id = p.id
       LEFT JOIN users u ON ih.created_by = u.id 
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE p.vendor_id = ?
       ORDER BY ih.created_at DESC 
       LIMIT 5000`,
      [req.userId]
    );
    
    res.json({
      success: true,
      history: history
    });
    
  } catch (error) {
    console.error(`INVENTORY HISTORY ERROR for user ${req.userId}:`, error.message);
    secureLogger.error('Error fetching inventory history', {
      userId: req.userId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching inventory history'
    });
  }
});

/**
 * Get inventory details for a specific product
 * @route GET /api/inventory/:productId
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.productId - Product ID to get inventory for
 * @param {Object} res - Express response object
 * @returns {Object} Product inventory details with history and allocations
 */
router.get('/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    console.log(`Fetching inventory for product: ${productId}`);
    
    // Get product inventory with allocations
    const [inventory] = await db.query(
      'SELECT * FROM product_inventory_with_allocations WHERE product_id = ?',
      [productId]
    );
    
    // Get inventory history
    const [history] = await db.query(
      `SELECT ih.*, up.first_name, up.last_name, u.username
       FROM inventory_history ih 
       LEFT JOIN users u ON ih.created_by = u.id 
       LEFT JOIN user_profiles up ON u.id = up.user_id
       WHERE ih.product_id = ? 
       ORDER BY ih.created_at DESC 
       LIMIT 50`,
      [productId]
    );
    
    if (!inventory.length) {
      // Check if product exists and create inventory record if it doesn't exist
      const [product] = await db.query(
        'SELECT id, name FROM products WHERE id = ?',
        [productId]
      );
      
      if (product.length) {
        // Create inventory record with default quantity of 0 (admin will set actual quantity)
        const qtyOnHand = 0;
        
        // Use INSERT IGNORE to handle race conditions
        const [insertResult] = await db.query(
          'INSERT IGNORE INTO product_inventory (product_id, qty_on_hand, qty_on_order, reorder_qty, updated_by) VALUES (?, ?, 0, 0, ?)',
          [productId, qtyOnHand, req.userId]
        );
        
        // Only add history if we actually inserted a new record
        if (insertResult.affectedRows > 0) {
          await db.query(
            'INSERT INTO inventory_history (product_id, change_type, previous_qty, new_qty, reason, created_by) VALUES (?, ?, ?, ?, ?, ?)',
            [productId, 'initial_stock', 0, qtyOnHand, 'Initial inventory setup', req.userId]
          );
        }
        
        // Get the inventory record (whether we just created it or it already existed)
        const [newInventory] = await db.query(
          'SELECT * FROM product_inventory_with_allocations WHERE product_id = ?',
          [productId]
        );
        
        return res.json({
          success: true,
          inventory: newInventory[0],
          history: []
        });
      }
      
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      inventory: inventory[0],
      history: history.map(h => ({
        ...h,
        quantity_change: h.new_qty - h.previous_qty,
        quantity_after: h.new_qty
      }))
    });
    
  } catch (error) {
    console.error(`INVENTORY ERROR for product ${req.params.productId}:`, error.message);
    secureLogger.error('Error fetching inventory', {
      productId: req.params.productId,
      userId: req.userId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: 'Error fetching inventory'
    });
  }
});

/**
 * Update inventory quantities for a specific product
 * @route PUT /api/inventory/:productId
 * @access Private
 * @param {Object} req - Express request object
 * @param {string} req.params.productId - Product ID to update inventory for
 * @param {number} req.body.qty_on_hand - New quantity on hand
 * @param {string} req.body.change_type - Type of inventory change (adjustment, sale, restock, etc.)
 * @param {string} req.body.reason - Reason for inventory change
 * @param {Object} res - Express response object
 * @returns {Object} Updated inventory details with new quantities
 */
router.put('/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { qty_on_hand, reorder_qty, change_type, reason } = req.body;
    
    if (qty_on_hand === undefined || !change_type) {
      return res.status(400).json({
        success: false,
        message: 'qty_on_hand and change_type are required'
      });
    }
    
    // Get current inventory
    const [current] = await db.query(
      'SELECT * FROM product_inventory WHERE product_id = ?',
      [productId]
    );
    
    if (!current.length) {
      return res.status(404).json({
        success: false,
        message: 'Inventory record not found'
      });
    }
    
    const previousQty = current[0].qty_on_hand;
    const qtyOnOrder = current[0].qty_on_order || 0;
    const newReorderQty = reorder_qty !== undefined ? parseInt(reorder_qty) : current[0].reorder_qty;
    
    // Start transaction to ensure data consistency
    await db.query('START TRANSACTION');
    
    try {
      // Update inventory record (include reorder_qty if provided)
      await db.query(
        'UPDATE product_inventory SET qty_on_hand = ?, reorder_qty = ?, updated_by = ? WHERE product_id = ?',
        [qty_on_hand, newReorderQty, req.userId, productId]
      );
      
      // Add to history
      await db.query(
        'INSERT INTO inventory_history (product_id, change_type, previous_qty, new_qty, reason, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [productId, change_type, previousQty, qty_on_hand, reason, req.userId]
      );
      
      // Get the updated inventory record to get the calculated qty_available and allocations
      const [updatedInventory] = await db.query(
        'SELECT * FROM product_inventory_with_allocations WHERE product_id = ?',
        [productId]
      );
      
      const newQtyAvailable = updatedInventory[0].qty_available;
      
      // Note: products table no longer has available_qty column - inventory is managed separately
      
      // Commit transaction
      await db.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Inventory updated successfully',
        inventory: {
          qty_on_hand: qty_on_hand,
          qty_on_order: qtyOnOrder,
          qty_available: newQtyAvailable,
          reorder_qty: newReorderQty,
          qty_truly_available: updatedInventory[0].qty_truly_available,
          total_allocated: updatedInventory[0].total_allocated,
          tiktok_allocated: updatedInventory[0].tiktok_allocated
        }
      });
      
    } catch (transactionError) {
      // Rollback transaction on error
      await db.query('ROLLBACK');
      throw transactionError;
    }
    
  } catch (error) {
    console.error(`INVENTORY UPDATE ERROR for product ${req.params.productId}:`, error.message);
    secureLogger.error('Error updating inventory', {
      productId: req.params.productId,
      userId: req.userId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: 'Error updating inventory'
    });
  }
});

/**
 * Sync all products to inventory system (admin only)
 * @route POST /api/inventory/sync
 * @access Admin
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Synchronization results with count of products synced
 */
router.post('/sync', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const isAdmin = req.permissions && req.permissions.includes('admin');
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    // Get all products that don't have inventory records
    const [productsWithoutInventory] = await db.query(`
      SELECT p.id, p.name 
      FROM products p 
      LEFT JOIN product_inventory pi ON p.id = pi.product_id 
      WHERE pi.product_id IS NULL
    `);
    
    if (productsWithoutInventory.length === 0) {
      return res.json({
        success: true,
        message: 'All products already have inventory records',
        synced: 0
      });
    }
    
    // Create inventory records for all products without them
    let syncCount = 0;
    for (const product of productsWithoutInventory) {
      const qtyOnHand = 0; // Default to 0 for sync operation
      
      await db.query(
        'INSERT INTO product_inventory (product_id, qty_on_hand, qty_on_order, reorder_qty, updated_by) VALUES (?, ?, 0, 0, ?)',
        [product.id, qtyOnHand, req.userId]
      );
      
      // Add initial history record
      await db.query(
        'INSERT INTO inventory_history (product_id, change_type, previous_qty, new_qty, reason, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [product.id, 'sync_setup', 0, qtyOnHand, `Inventory sync for ${product.name}`, req.userId]
      );
      
      syncCount++;
    }
    
    res.json({
      success: true,
      message: `Successfully synced ${syncCount} products to inventory system`,
      synced: syncCount
    });
    
  } catch (error) {
    secureLogger.error('Error syncing inventory', {
      userId: req.userId,
      error: error.message
    });
    res.status(500).json({
      success: false,
      message: 'Error syncing inventory'
    });
  }
});

module.exports = router; 