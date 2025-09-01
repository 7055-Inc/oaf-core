const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { secureLogger } = require('../middleware/secureLogger');

// GET /inventory/:productId - Get inventory for a specific product
router.get('/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Get product inventory with allocations
    const [inventory] = await db.query(
      'SELECT * FROM product_inventory_with_allocations WHERE product_id = ?',
      [productId]
    );
    
    // Get inventory history
    const [history] = await db.query(
      `SELECT ih.*, u.first_name, u.last_name 
       FROM inventory_history ih 
       LEFT JOIN users u ON ih.created_by = u.id 
       WHERE ih.product_id = ? 
       ORDER BY ih.created_at DESC 
       LIMIT 50`,
      [productId]
    );
    
    if (!inventory.length) {
      // Check if product exists and create inventory record if it doesn't exist
      const [product] = await db.query(
        'SELECT id, available_qty FROM products WHERE id = ?',
        [productId]
      );
      
      if (product.length) {
        // Create inventory record based on current product available_qty
        const qtyOnHand = product[0].available_qty || 0;
        await db.query(
          'INSERT INTO product_inventory (product_id, qty_on_hand, qty_on_order, reorder_qty, updated_by) VALUES (?, ?, 0, 0, ?)',
          [productId, qtyOnHand, req.userId]
        );
        
        // Add initial history record
        await db.query(
          'INSERT INTO inventory_history (product_id, change_type, previous_qty, new_qty, reason, created_by) VALUES (?, ?, ?, ?, ?, ?)',
          [productId, 'initial_stock', 0, qtyOnHand, 'Initial inventory setup', req.userId]
        );
        
        // Get the created inventory record with calculated qty_available and allocations
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

// PUT /inventory/:productId - Update inventory for a product
router.put('/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { qty_on_hand, change_type, reason } = req.body;
    
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
    
    // Start transaction to ensure data consistency
    await db.query('START TRANSACTION');
    
    try {
      // Update inventory record
      await db.query(
        'UPDATE product_inventory SET qty_on_hand = ?, updated_by = ? WHERE product_id = ?',
        [qty_on_hand, req.userId, productId]
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
      
      // Sync with products table available_qty
      await db.query(
        'UPDATE products SET available_qty = ? WHERE id = ?',
        [newQtyAvailable, productId]
      );
      
      // Commit transaction
      await db.query('COMMIT');
      
      res.json({
        success: true,
        message: 'Inventory updated successfully',
        inventory: {
          qty_on_hand: qty_on_hand,
          qty_on_order: qtyOnOrder,
          qty_available: newQtyAvailable,
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

// POST /inventory/sync - Sync all products to inventory system (admin only)
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
      SELECT p.id, p.available_qty, p.name 
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
      const qtyOnHand = product.available_qty || 0;
      
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