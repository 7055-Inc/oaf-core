const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');
const db = require('../../config/db');

// OAuth callback endpoint for TikTok Shop API
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      console.error('TikTok OAuth error:', error);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard?tiktok_error=${encodeURIComponent(error)}`);
    }
    
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard?tiktok_error=no_code`);
    }
    
    // TODO: When TikTok API is approved, implement:
    // 1. Exchange code for access token
    // 2. Get shop information
    // 3. Store in tiktok_user_shops table
    // 4. Redirect to success page
    
    // For now, just redirect with a placeholder message
    console.log('TikTok OAuth callback received:', { code: code.substring(0, 10) + '...', state });
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?tiktok_status=callback_received`);
    
  } catch (error) {
    console.error('TikTok OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?tiktok_error=server_error`);
  }
});

// Start OAuth flow (when TikTok API is approved)
router.get('/oauth/authorize', verifyToken, async (req, res) => {
  try {
    // TODO: When TikTok API is approved, implement:
    // 1. Generate state parameter
    // 2. Build TikTok authorization URL
    // 3. Redirect to TikTok
    
    res.json({ 
      success: false, 
      message: 'TikTok API integration pending developer approval',
      status: 'awaiting_approval'
    });
    
  } catch (error) {
    console.error('TikTok OAuth authorize error:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get user's TikTok shop connections
router.get('/shops', verifyToken, async (req, res) => {
  try {
    
    const [shops] = await db.execute(`
      SELECT 
        id, shop_id, shop_name, shop_region, is_active, 
        terms_accepted, last_sync_at, created_at,
        CASE WHEN access_token IS NOT NULL THEN true ELSE false END as has_token
      FROM tiktok_user_shops 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `, [req.userId]);
    
    res.json({ success: true, shops });
    
  } catch (error) {
    console.error('Error fetching TikTok shops:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch shops' });
  }
});

// Get user's TikTok product data (shows all user products with TikTok data if configured)
router.get('/products', verifyToken, async (req, res) => {
  try {
    // Get all user's products with TikTok data and allocation info if configured
    const [products] = await db.execute(`
      SELECT 
        p.*,
        tpd.id as tiktok_data_id,
        tpd.tiktok_title,
        tpd.tiktok_description,
        tpd.tiktok_price,
        tpd.tiktok_tags,
        tpd.tiktok_category_id,
        tpd.is_active as tiktok_active,
        tpd.sync_status,
        tpd.last_sync_at,
        tia.allocated_quantity,
        CASE 
          WHEN tpd.id IS NOT NULL THEN 'configured'
          ELSE 'unconfigured'
        END as tiktok_status
      FROM products p
      LEFT JOIN tiktok_product_data tpd ON p.id = tpd.product_id AND tpd.user_id = ?
      LEFT JOIN tiktok_inventory_allocations tia ON p.id = tia.product_id AND tia.user_id = ?
      WHERE p.vendor_id = ?
      ORDER BY p.created_at DESC
    `, [req.userId, req.userId, req.userId]);
    
    // Process each product and add images (following established pattern)
    const processedProducts = await Promise.all(
      products.map(async (product) => {
        const response = { ...product };
        
        // Add images using the established pattern
        const [tempImages] = await db.query(
          'SELECT image_path FROM pending_images WHERE image_path LIKE ? AND status = ?',
          [`/temp_images/products/${product.vendor_id}-${product.id}-%`, 'pending']
        );
        
        const [permanentImages] = await db.query(
          'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC',
          [product.id]
        );
        
        response.images = [
          ...permanentImages.map(img => img.image_url),
          ...tempImages.map(img => img.image_path)
        ];
        
        return response;
      })
    );
    
    res.json({ success: true, products: processedProducts });
    
  } catch (error) {
    console.error('Error fetching TikTok products:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

// Add/update TikTok product data
router.post('/products/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      tiktok_title,
      tiktok_description,
      tiktok_price,
      tiktok_tags,
      tiktok_category_id,
      allocated_quantity,
      is_active
    } = req.body;
    
    // Verify user owns this product
    const [productCheck] = await db.execute(
      'SELECT id FROM products WHERE id = ? AND vendor_id = ?',
      [productId, req.userId]
    );
    
    if (productCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    // Insert or update TikTok product data
    await db.execute(`
      INSERT INTO tiktok_product_data 
      (user_id, product_id, tiktok_title, tiktok_description, tiktok_price, tiktok_tags, tiktok_category_id, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        tiktok_title = VALUES(tiktok_title),
        tiktok_description = VALUES(tiktok_description),
        tiktok_price = VALUES(tiktok_price),
        tiktok_tags = VALUES(tiktok_tags),
        tiktok_category_id = VALUES(tiktok_category_id),
        is_active = VALUES(is_active),
        sync_status = 'pending',
        updated_at = CURRENT_TIMESTAMP
    `, [req.userId, productId, tiktok_title, tiktok_description, tiktok_price, tiktok_tags, tiktok_category_id, is_active]);
    
    // Handle inventory allocation if provided
    if (allocated_quantity !== undefined && allocated_quantity !== '') {
      const allocatedQty = parseInt(allocated_quantity) || 0;
      
      if (allocatedQty > 0) {
        // Insert or update allocation
        await db.execute(`
          INSERT INTO tiktok_inventory_allocations 
          (user_id, product_id, allocated_quantity)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE
            allocated_quantity = VALUES(allocated_quantity),
            updated_at = CURRENT_TIMESTAMP
        `, [req.userId, productId, allocatedQty]);
      } else {
        // Remove allocation if set to 0
        await db.execute(
          'DELETE FROM tiktok_inventory_allocations WHERE user_id = ? AND product_id = ?',
          [req.userId, productId]
        );
      }
    }
    
    res.json({ success: true, message: 'TikTok product data and allocation updated' });
    
  } catch (error) {
    console.error('Error updating TikTok product:', error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
});

// Get inventory allocations
router.get('/inventory', verifyToken, async (req, res) => {
  try {
    
    const [allocations] = await db.execute(`
      SELECT 
        tia.*,
        p.title,
        p.inventory_count as total_inventory
      FROM tiktok_inventory_allocations tia
      JOIN products p ON tia.product_id = p.id
      WHERE tia.user_id = ?
      ORDER BY tia.updated_at DESC
    `, [req.userId]);
    
    res.json({ success: true, allocations });
    
  } catch (error) {
    console.error('Error fetching TikTok inventory:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch inventory' });
  }
});

// Update inventory allocation
router.post('/inventory/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { allocated_quantity } = req.body;
    
    // Verify user owns this product
    const [productCheck] = await db.execute(
      'SELECT inventory_count FROM products WHERE id = ? AND vendor_id = ?',
      [productId, req.userId]
    );
    
    if (productCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    const totalInventory = productCheck[0].inventory_count;
    if (allocated_quantity > totalInventory) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot allocate more than total inventory' 
      });
    }
    
    // Insert or update allocation
    await db.execute(`
      INSERT INTO tiktok_inventory_allocations (user_id, product_id, allocated_quantity)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        allocated_quantity = VALUES(allocated_quantity),
        updated_at = CURRENT_TIMESTAMP
    `, [req.userId, productId, allocated_quantity]);
    
    res.json({ success: true, message: 'Inventory allocation updated' });
    
  } catch (error) {
    console.error('Error updating inventory allocation:', error);
    res.status(500).json({ success: false, error: 'Failed to update allocation' });
  }
});

// Get sync logs for debugging
router.get('/logs', verifyToken, async (req, res) => {
  try {
    const { limit = 50, sync_type, status } = req.query;
    
    let query = `
      SELECT * FROM tiktok_sync_logs 
      WHERE user_id = ?
    `;
    let params = [req.userId];
    
    if (sync_type) {
      query += ' AND sync_type = ?';
      params.push(sync_type);
    }
    
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [logs] = await db.execute(query, params);
    
    res.json({ success: true, logs });
    
  } catch (error) {
    console.error('Error fetching TikTok logs:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch logs' });
  }
});

// POST /allocations/bulk - Bulk update TikTok inventory allocations
router.post('/allocations/bulk', verifyToken, async (req, res) => {
  try {
    const { allocations } = req.body;
    
    // Validate input
    if (!Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'allocations must be a non-empty array' 
      });
    }
    
    // Validate each allocation entry
    for (const allocation of allocations) {
      if (!allocation.product_id || allocation.allocated_quantity === undefined) {
        return res.status(400).json({ 
          success: false, 
          error: 'Each allocation must have product_id and allocated_quantity' 
        });
      }
    }
    
    // Verify user owns all products
    const productIds = allocations.map(a => a.product_id);
    const placeholders = productIds.map(() => '?').join(',');
    const [productCheck] = await db.execute(
      `SELECT id FROM products WHERE id IN (${placeholders}) AND vendor_id = ?`,
      [...productIds, req.userId]
    );
    
    if (productCheck.length !== productIds.length) {
      return res.status(403).json({ 
        success: false, 
        error: 'Some products not found or not owned by user' 
      });
    }
    
    // Process allocations
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const allocation of allocations) {
      try {
        const { product_id, allocated_quantity } = allocation;
        const allocatedQty = parseInt(allocated_quantity) || 0;
        
        if (allocatedQty > 0) {
          // Insert or update allocation
          await db.execute(`
            INSERT INTO tiktok_inventory_allocations 
            (user_id, product_id, allocated_quantity)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE
              allocated_quantity = VALUES(allocated_quantity),
              updated_at = CURRENT_TIMESTAMP
          `, [req.userId, product_id, allocatedQty]);
        } else {
          // Remove allocation if set to 0
          await db.execute(
            'DELETE FROM tiktok_inventory_allocations WHERE user_id = ? AND product_id = ?',
            [req.userId, product_id]
          );
        }
        
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          product_id: allocation.product_id,
          error: error.message
        });
      }
    }
    
    res.json({ 
      success: true, 
      message: `Bulk allocation update completed: ${successCount} successful, ${errorCount} failed`,
      results: {
        successful: successCount,
        failed: errorCount,
        errors: errors
      }
    });
    
  } catch (error) {
    console.error('Error in bulk allocation update:', error);
    res.status(500).json({ success: false, error: 'Failed to update allocations' });
  }
});

module.exports = router;
