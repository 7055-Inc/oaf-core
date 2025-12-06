/**
 * Walmart Marketplace Connector Routes
 * Basic CRUD for walmart_corporate_products and walmart_inventory_allocations
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/jwt');
const db = require('../../config/db');

/**
 * GET /api/walmart/products
 * Get all user's products with Walmart data
 */
router.get('/products', verifyToken, async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.price,
        p.wholesale_price,
        p.inventory_count,
        wcp.id as walmart_id,
        wcp.walmart_item_id,
        wcp.walmart_title,
        wcp.walmart_description,
        wcp.walmart_price,
        wcp.is_active,
        wcp.listing_status,
        wcp.terms_accepted_at,
        wcp.removed_at,
        wcp.cooldown_ends_at,
        wcp.sync_status,
        wia.allocated_quantity
      FROM products p
      LEFT JOIN walmart_corporate_products wcp ON p.id = wcp.product_id
      LEFT JOIN walmart_inventory_allocations wia ON p.id = wia.product_id AND wia.user_id = ?
      WHERE p.vendor_id = ? AND p.status = 'active'
      ORDER BY p.name ASC
    `, [req.userId, req.userId]);
    
    res.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching Walmart products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/walmart/products/:productId
 * Get Walmart data for a specific product
 */
router.get('/products/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    
    const [rows] = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.description,
        p.price,
        p.wholesale_price,
        p.inventory_count,
        wcp.id as walmart_id,
        wcp.walmart_item_id,
        wcp.walmart_title,
        wcp.walmart_description,
        wcp.walmart_price,
        wcp.is_active,
        wcp.listing_status,
        wcp.terms_accepted_at,
        wcp.removed_at,
        wcp.cooldown_ends_at,
        wcp.sync_status,
        wia.allocated_quantity
      FROM products p
      LEFT JOIN walmart_corporate_products wcp ON p.id = wcp.product_id
      LEFT JOIN walmart_inventory_allocations wia ON p.id = wia.product_id AND wia.user_id = ?
      WHERE p.id = ? AND p.vendor_id = ?
    `, [req.userId, productId, req.userId]);
    
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    res.json({ success: true, product: rows[0] });
  } catch (error) {
    console.error('Error fetching Walmart product:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

/**
 * POST /api/walmart/products/:productId
 * Create/update Walmart product data (opt-in)
 */
router.post('/products/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      walmart_title,
      walmart_description,
      walmart_price,
      allocated_quantity,
      terms_accepted
    } = req.body;
    
    // Verify ownership
    const [check] = await db.query(
      'SELECT id, name FROM products WHERE id = ? AND vendor_id = ?',
      [productId, req.userId]
    );
    
    if (check.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    // Insert/update walmart_corporate_products
    await db.query(`
      INSERT INTO walmart_corporate_products 
      (product_id, user_id, walmart_title, walmart_description, walmart_price, is_active, listing_status, terms_accepted_at, created_by)
      VALUES (?, ?, ?, ?, ?, 1, 'pending', ${terms_accepted ? 'NOW()' : 'NULL'}, ?)
      ON DUPLICATE KEY UPDATE
        walmart_title = VALUES(walmart_title),
        walmart_description = VALUES(walmart_description),
        walmart_price = VALUES(walmart_price),
        is_active = 1,
        listing_status = 'pending',
        removed_at = NULL,
        cooldown_ends_at = NULL,
        sync_status = 'pending',
        updated_at = CURRENT_TIMESTAMP
    `, [productId, req.userId, walmart_title || check[0].name, walmart_description, walmart_price, req.userId]);
    
    // Handle allocation
    if (allocated_quantity !== undefined) {
      const qty = parseInt(allocated_quantity) || 0;
      if (qty > 0) {
        await db.query(`
          INSERT INTO walmart_inventory_allocations (user_id, product_id, allocated_quantity)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP
        `, [req.userId, productId, qty]);
      } else {
        await db.query('DELETE FROM walmart_inventory_allocations WHERE user_id = ? AND product_id = ?', [req.userId, productId]);
      }
    }
    
    res.json({ success: true, message: 'Walmart product data saved' });
  } catch (error) {
    console.error('Error saving Walmart product:', error);
    res.status(500).json({ success: false, error: 'Failed to save product' });
  }
});

/**
 * PUT /api/walmart/products/:productId
 * Update Walmart product data
 */
router.put('/products/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { walmart_title, walmart_description, walmart_price, allocated_quantity } = req.body;
    
    // Verify ownership
    const [check] = await db.query(
      'SELECT id FROM products WHERE id = ? AND vendor_id = ?',
      [productId, req.userId]
    );
    
    if (check.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    await db.query(`
      UPDATE walmart_corporate_products 
      SET walmart_title = COALESCE(?, walmart_title),
          walmart_description = COALESCE(?, walmart_description),
          walmart_price = COALESCE(?, walmart_price),
          sync_status = 'pending',
          updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ? AND user_id = ?
    `, [walmart_title, walmart_description, walmart_price, productId, req.userId]);
    
    if (allocated_quantity !== undefined) {
      const qty = parseInt(allocated_quantity) || 0;
      if (qty > 0) {
        await db.query(`
          INSERT INTO walmart_inventory_allocations (user_id, product_id, allocated_quantity)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE allocated_quantity = VALUES(allocated_quantity), updated_at = CURRENT_TIMESTAMP
        `, [req.userId, productId, qty]);
      } else {
        await db.query('DELETE FROM walmart_inventory_allocations WHERE user_id = ? AND product_id = ?', [req.userId, productId]);
      }
    }
    
    res.json({ success: true, message: 'Walmart product updated' });
  } catch (error) {
    console.error('Error updating Walmart product:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

/**
 * DELETE /api/walmart/products/:productId
 * Remove product from Walmart (sets cooldown)
 */
router.delete('/products/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Verify ownership
    const [check] = await db.query(
      'SELECT id FROM products WHERE id = ? AND vendor_id = ?',
      [productId, req.userId]
    );
    
    if (check.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    // Set 60-day cooldown
    const cooldownEnd = new Date();
    cooldownEnd.setDate(cooldownEnd.getDate() + 60);
    
    await db.query(`
      UPDATE walmart_corporate_products 
      SET is_active = 0,
          listing_status = 'removing',
          removed_at = NOW(),
          cooldown_ends_at = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ? AND user_id = ?
    `, [cooldownEnd, productId, req.userId]);
    
    res.json({ success: true, message: 'Product removed', cooldown_ends_at: cooldownEnd });
  } catch (error) {
    console.error('Error removing Walmart product:', error);
    res.status(500).json({ success: false, error: 'Failed to remove product' });
  }
});

/**
 * GET /api/walmart/allocations
 * Get all inventory allocations
 */
router.get('/allocations', verifyToken, async (req, res) => {
  try {
    const [allocations] = await db.query(`
      SELECT wia.*, p.name, p.inventory_count
      FROM walmart_inventory_allocations wia
      JOIN products p ON wia.product_id = p.id
      WHERE wia.user_id = ?
    `, [req.userId]);
    
    res.json({ success: true, allocations });
  } catch (error) {
    console.error('Error fetching allocations:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch allocations' });
  }
});

// ============================================
// ADMIN ROUTES - Require manage_system permission
// ============================================

const { requirePermission } = require('../middleware/permissions');

/**
 * GET /api/walmart/admin/products
 * Get all Walmart products across all vendors (admin)
 */
router.get('/admin/products', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 25, search = '' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let statusFilter = '';
    if (status === 'pending') statusFilter = "AND wcp.listing_status = 'pending'";
    else if (status === 'active') statusFilter = "AND wcp.listing_status = 'listed'";
    else if (status === 'paused') statusFilter = "AND wcp.listing_status = 'paused'";
    
    let searchFilter = '';
    const searchParams = [];
    if (search) {
      searchFilter = "AND (p.name LIKE ? OR u.username LIKE ? OR wcp.walmart_title LIKE ?)";
      const searchTerm = `%${search}%`;
      searchParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    // Get total count
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total
      FROM walmart_corporate_products wcp
      JOIN products p ON wcp.product_id = p.id
      JOIN users u ON wcp.user_id = u.id
      WHERE 1=1 ${statusFilter} ${searchFilter}
    `, searchParams);
    
    const total = countResult[0].total;
    
    // Get products
    const [products] = await db.query(`
      SELECT 
        wcp.id,
        wcp.product_id,
        wcp.user_id,
        wcp.walmart_item_id,
        wcp.walmart_title,
        wcp.walmart_description,
        wcp.walmart_price,
        wcp.is_active,
        wcp.listing_status,
        wcp.sync_status,
        wcp.created_at,
        p.name,
        p.price,
        p.wholesale_price,
        p.inventory_count,
        u.username,
        u.email as vendor_email,
        up.display_name as vendor_name,
        wia.allocated_quantity
      FROM walmart_corporate_products wcp
      JOIN products p ON wcp.product_id = p.id
      JOIN users u ON wcp.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN walmart_inventory_allocations wia ON wcp.product_id = wia.product_id
      WHERE 1=1 ${statusFilter} ${searchFilter}
      ORDER BY wcp.created_at DESC
      LIMIT ? OFFSET ?
    `, [...searchParams, parseInt(limit), offset]);
    
    res.json({ success: true, products, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error('Error fetching admin Walmart products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

/**
 * POST /api/walmart/admin/products/:productId/activate
 * Activate a product for the Walmart feed (admin)
 */
router.post('/admin/products/:productId/activate', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { productId } = req.params;
    
    await db.query(`
      UPDATE walmart_corporate_products 
      SET listing_status = 'listed',
          is_active = 1,
          sync_status = 'pending',
          updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ?
    `, [productId]);
    
    // Log the action
    await db.query(`
      INSERT INTO walmart_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (?, 'product', 'update', ?, 'success', 'Admin activated product for Walmart feed')
    `, [req.userId, productId]);
    
    res.json({ success: true, message: 'Product activated' });
  } catch (error) {
    console.error('Error activating product:', error);
    res.status(500).json({ success: false, error: 'Failed to activate product' });
  }
});

/**
 * POST /api/walmart/admin/products/:productId/pause
 * Pause a product from the Walmart feed (admin)
 */
router.post('/admin/products/:productId/pause', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { productId } = req.params;
    
    await db.query(`
      UPDATE walmart_corporate_products 
      SET listing_status = 'paused',
          sync_status = 'pending',
          updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ?
    `, [productId]);
    
    // Log the action
    await db.query(`
      INSERT INTO walmart_sync_logs (user_id, sync_type, operation, reference_id, status, message)
      VALUES (?, 'product', 'update', ?, 'success', 'Admin paused product from Walmart feed')
    `, [req.userId, productId]);
    
    res.json({ success: true, message: 'Product paused' });
  } catch (error) {
    console.error('Error pausing product:', error);
    res.status(500).json({ success: false, error: 'Failed to pause product' });
  }
});

/**
 * PUT /api/walmart/admin/products/:productId
 * Update Walmart product data (admin)
 */
router.put('/admin/products/:productId', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { productId } = req.params;
    const { walmart_title, walmart_description, walmart_price } = req.body;
    
    await db.query(`
      UPDATE walmart_corporate_products 
      SET walmart_title = COALESCE(?, walmart_title),
          walmart_description = COALESCE(?, walmart_description),
          walmart_price = COALESCE(?, walmart_price),
          sync_status = 'pending',
          updated_at = CURRENT_TIMESTAMP
      WHERE product_id = ?
    `, [walmart_title, walmart_description, walmart_price, productId]);
    
    res.json({ success: true, message: 'Product updated' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

module.exports = router;
