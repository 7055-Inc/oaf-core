const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');
const { secureLogger } = require('../middleware/secureLogger');

/**
 * Admin Marketplace Management Routes
 * All routes require admin permissions
 */

// GET /admin/marketplace/stats - Get marketplace curation statistics
router.get('/stats', verifyToken, requirePermission('admin'), async (req, res) => {
  try {
    // Get overall marketplace product counts
    const [stats] = await db.query(`
      SELECT 
        COUNT(CASE WHEN marketplace_enabled = TRUE THEN 1 END) as total_marketplace_products,
        COUNT(CASE WHEN marketplace_enabled = TRUE AND marketplace_category = 'unsorted' THEN 1 END) as unsorted_count,
        COUNT(CASE WHEN marketplace_enabled = TRUE AND marketplace_category = 'art' THEN 1 END) as art_count,
        COUNT(CASE WHEN marketplace_enabled = TRUE AND marketplace_category = 'crafts' THEN 1 END) as crafts_count,
        COUNT(CASE WHEN marketplace_enabled = TRUE AND wholesale_price IS NOT NULL THEN 1 END) as wholesale_count
      FROM products
      WHERE status = 'active'
    `);

    // Get user permission statistics
    const [userStats] = await db.query(`
      SELECT 
        status,
        COUNT(*) as count
      FROM marketplace_permissions
      GROUP BY status
    `);

    const response = {
      ...stats[0],
      user_permissions: userStats.reduce((acc, stat) => {
        acc[stat.status] = stat.count;
        return acc;
      }, {})
    };

    res.json(response);
    
  } catch (err) {
    secureLogger.error('Error fetching marketplace stats', err);
    res.status(500).json({ error: 'Failed to fetch marketplace statistics' });
  }
});

// GET /admin/marketplace/products - Get products by category for curation
router.get('/products', verifyToken, requirePermission('admin'), async (req, res) => {
  try {
    const { category = 'unsorted', include, limit = 50, offset = 0 } = req.query;
    
    // Validate category
    if (!['unsorted', 'art', 'crafts'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category. Must be: unsorted, art, or crafts' });
    }

    // Parse include parameter
    const includes = include ? include.split(',').map(i => i.trim()) : [];
    
    // Base query for products in the specified category
    let query = `
      SELECT p.*, 
             u.username as vendor_username,
             up.first_name as vendor_first_name,
             up.last_name as vendor_last_name,
             up.display_name as vendor_display_name
      FROM products p
      JOIN users u ON p.vendor_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE p.marketplace_enabled = TRUE 
        AND p.marketplace_category = ?
        AND p.status = 'active'
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const [products] = await db.query(query, [category, parseInt(limit), parseInt(offset)]);
    
    // Process each product and add related data
    const processedProducts = await Promise.all(
      products.map(async (product) => {
        const response = { ...product };
        
        // Add vendor display name
        response.vendor_name = product.vendor_display_name || 
                              `${product.vendor_first_name || ''} ${product.vendor_last_name || ''}`.trim() ||
                              product.vendor_username;
        
        // Add images if requested
        if (includes.includes('images')) {
          const [images] = await db.query(
            'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC',
            [product.id]
          );
          response.images = images.map(img => img.image_url);
        }
        
        // Add vendor info if requested
        if (includes.includes('vendor')) {
          const [vendor] = await db.query(`
            SELECT u.id, u.username, up.first_name, up.last_name, up.display_name,
                   ap.business_name, ap.business_website
            FROM users u
            LEFT JOIN user_profiles up ON u.id = up.user_id
            LEFT JOIN artist_profiles ap ON u.id = ap.user_id
            WHERE u.id = ?
          `, [product.vendor_id]);
          response.vendor = vendor[0] || {};
        }
        
        return response;
      })
    );
    
    // Get total count for pagination
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total
      FROM products
      WHERE marketplace_enabled = TRUE 
        AND marketplace_category = ?
        AND status = 'active'
    `, [category]);
    
    res.json({
      products: processedProducts,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: countResult[0].total > (parseInt(offset) + parseInt(limit))
      }
    });
    
  } catch (err) {
    secureLogger.error('Error fetching marketplace products', err);
    res.status(500).json({ error: 'Failed to fetch marketplace products' });
  }
});

// PUT /admin/marketplace/products/:id/categorize - Move product to different category
router.put('/products/:id/categorize', verifyToken, requirePermission('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { category, reason } = req.body;
    
    // Validate category
    if (!['unsorted', 'art', 'crafts'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category. Must be: unsorted, art, or crafts' });
    }
    
    // Check if product exists and is marketplace enabled
    const [product] = await db.query(
      'SELECT id, marketplace_category, name, vendor_id FROM products WHERE id = ? AND marketplace_enabled = TRUE',
      [id]
    );
    
    if (!product.length) {
      return res.status(404).json({ error: 'Product not found or not enabled for marketplace' });
    }
    
    const currentProduct = product[0];
    const previousCategory = currentProduct.marketplace_category;
    
    // Update the product category
    await db.query(
      'UPDATE products SET marketplace_category = ?, updated_at = NOW() WHERE id = ?',
      [category, id]
    );
    
    // Log the curation action
    await db.query(
      'INSERT INTO marketplace_curation (product_id, previous_category, current_category, curated_by, curation_reason) VALUES (?, ?, ?, ?, ?)',
      [id, previousCategory, category, req.userId, reason || `Admin moved product from ${previousCategory} to ${category}`]
    );
    
    secureLogger.info('Product categorized', {
      productId: id,
      productName: currentProduct.name,
      previousCategory,
      newCategory: category,
      curatedBy: req.userId,
      reason
    });
    
    res.json({
      success: true,
      product_id: id,
      previous_category: previousCategory,
      new_category: category
    });
    
  } catch (err) {
    secureLogger.error('Error categorizing product', err);
    res.status(500).json({ error: 'Failed to categorize product' });
  }
});

// PUT /admin/marketplace/products/bulk-categorize - Bulk move products to different category
router.put('/products/bulk-categorize', verifyToken, requirePermission('admin'), async (req, res) => {
  try {
    const { product_ids, category, reason } = req.body;
    
    // Validate inputs
    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({ error: 'product_ids must be a non-empty array' });
    }
    
    if (!['unsorted', 'art', 'crafts'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category. Must be: unsorted, art, or crafts' });
    }
    
    // Get current product info for logging
    const placeholders = product_ids.map(() => '?').join(',');
    const [products] = await db.query(
      `SELECT id, marketplace_category, name FROM products 
       WHERE id IN (${placeholders}) AND marketplace_enabled = TRUE`,
      product_ids
    );
    
    if (products.length !== product_ids.length) {
      return res.status(400).json({ 
        error: 'Some products not found or not enabled for marketplace',
        found: products.length,
        requested: product_ids.length
      });
    }
    
    // Start transaction for bulk update
    await db.query('START TRANSACTION');
    
    try {
      // Update all products
      await db.query(
        `UPDATE products 
         SET marketplace_category = ?, updated_at = NOW() 
         WHERE id IN (${placeholders})`,
        [category, ...product_ids]
      );
      
      // Log curation actions for each product
      for (const product of products) {
        await db.query(
          'INSERT INTO marketplace_curation (product_id, previous_category, current_category, curated_by, curation_reason) VALUES (?, ?, ?, ?, ?)',
          [
            product.id, 
            product.marketplace_category, 
            category, 
            req.userId, 
            reason || `Bulk admin curation: moved from ${product.marketplace_category} to ${category}`
          ]
        );
      }
      
      await db.query('COMMIT');
      
      secureLogger.info('Bulk product categorization', {
        productCount: products.length,
        newCategory: category,
        curatedBy: req.userId,
        reason
      });
      
      res.json({
        success: true,
        updated_count: products.length,
        category: category
      });
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (err) {
    secureLogger.error('Error bulk categorizing products', err);
    res.status(500).json({ error: 'Failed to bulk categorize products' });
  }
});

// GET /admin/marketplace/curation-log - Get curation history
router.get('/curation-log', verifyToken, requirePermission('admin'), async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const [logs] = await db.query(`
      SELECT mc.*, 
             p.name as product_name,
             u.username as curator_username,
             up.first_name as curator_first_name,
             up.last_name as curator_last_name
      FROM marketplace_curation mc
      JOIN products p ON mc.product_id = p.id
      JOIN users u ON mc.curated_by = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      ORDER BY mc.curated_at DESC
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);
    
    const processedLogs = logs.map(log => ({
      ...log,
      curator_name: `${log.curator_first_name || ''} ${log.curator_last_name || ''}`.trim() || log.curator_username
    }));
    
    res.json({
      logs: processedLogs,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
    
  } catch (err) {
    secureLogger.error('Error fetching curation log', err);
    res.status(500).json({ error: 'Failed to fetch curation log' });
  }
});

// GET /admin/marketplace/applications - Get marketplace applications by status
router.get('/applications', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status = 'pending', limit = 50, offset = 0 } = req.query;
    
    // Validate status
    const validStatuses = ['pending', 'approved', 'denied'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be pending, approved, or denied' });
    }
    
    const [applications] = await db.query(`
      SELECT 
        ma.id,
        ma.user_id,
        ma.work_description,
        ma.additional_info,
        ma.profile_data,
        ma.marketplace_status,
        ma.marketplace_reviewed_by,
        ma.marketplace_review_date,
        ma.marketplace_admin_notes,
        ma.marketplace_denial_reason,
        ma.verification_status,
        ma.verification_reviewed_by,
        ma.verification_review_date,
        ma.verification_admin_notes,
        ma.verification_denial_reason,
        ma.created_at,
        ma.updated_at,
        u.username,
        up.first_name,
        up.last_name,
        ap.business_name,
        reviewer.username as reviewer_name,
        -- Media URLs (will be processed below)
        ma.raw_materials_media_id,
        ma.work_process_1_media_id,
        ma.work_process_2_media_id,
        ma.work_process_3_media_id,
        ma.artist_at_work_media_id,
        ma.booth_display_media_id,
        ma.artist_working_video_media_id,
        ma.artist_bio_video_media_id,
        ma.additional_video_media_id
      FROM marketplace_applications ma
      LEFT JOIN users u ON ma.user_id = u.id
      LEFT JOIN user_profiles up ON ma.user_id = up.user_id
      LEFT JOIN artist_profiles ap ON ma.user_id = ap.user_id
      LEFT JOIN users reviewer ON ma.marketplace_reviewed_by = reviewer.id
      WHERE ma.marketplace_status = ?
      ORDER BY ma.created_at DESC
      LIMIT ? OFFSET ?
    `, [status, parseInt(limit), parseInt(offset)]);

    // Process media URLs for each application
    for (const application of applications) {
      const mediaIds = [
        application.raw_materials_media_id,
        application.work_process_1_media_id,
        application.work_process_2_media_id,
        application.work_process_3_media_id,
        application.artist_at_work_media_id,
        application.booth_display_media_id,
        application.artist_working_video_media_id,
        application.artist_bio_video_media_id,
        application.additional_video_media_id
      ].filter(id => id !== null);

      if (mediaIds.length > 0) {
        const [mediaUrls] = await db.query(
          `SELECT id, permanent_url FROM pending_images WHERE id IN (${mediaIds.map(() => '?').join(',')})`,
          mediaIds
        );

        const mediaMapping = {};
        mediaUrls.forEach(media => {
          if (media.permanent_url) {
            mediaMapping[media.id] = `https://api2.onlineartfestival.com/api/images/${media.permanent_url}`;
          }
        });

        application.media_urls = {
          raw_materials: application.raw_materials_media_id ? mediaMapping[application.raw_materials_media_id] : null,
          work_process_1: application.work_process_1_media_id ? mediaMapping[application.work_process_1_media_id] : null,
          work_process_2: application.work_process_2_media_id ? mediaMapping[application.work_process_2_media_id] : null,
          work_process_3: application.work_process_3_media_id ? mediaMapping[application.work_process_3_media_id] : null,
          artist_at_work: application.artist_at_work_media_id ? mediaMapping[application.artist_at_work_media_id] : null,
          booth_display: application.booth_display_media_id ? mediaMapping[application.booth_display_media_id] : null,
          artist_working_video: application.artist_working_video_media_id ? mediaMapping[application.artist_working_video_media_id] : null,
          artist_bio_video: application.artist_bio_video_media_id ? mediaMapping[application.artist_bio_video_media_id] : null,
          additional_video: application.additional_video_media_id ? mediaMapping[application.additional_video_media_id] : null
        };
      } else {
        application.media_urls = {};
      }

      // Clean up profile data and add user name
      application.user_name = application.first_name && application.last_name 
        ? `${application.first_name} ${application.last_name}`
        : null;
    }

    res.json({
      applications,
      total: applications.length,
      status
    });

  } catch (err) {
    secureLogger.error('Error fetching marketplace applications', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// PUT /admin/marketplace/applications/:id/approve - Approve marketplace application
router.put('/applications/:id/approve', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;
    const reviewerId = req.userId;

    // Update application status
    const [result] = await db.query(`
      UPDATE marketplace_applications 
      SET 
        marketplace_status = 'approved',
        marketplace_reviewed_by = ?,
        marketplace_review_date = NOW(),
        marketplace_admin_notes = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [reviewerId, admin_notes || 'Application approved', id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Get the user_id from the application
    const [application] = await db.query('SELECT user_id FROM marketplace_applications WHERE id = ?', [id]);
    
    if (application[0]) {
      // Update user permissions to grant marketplace access
      await db.query(`
        INSERT INTO user_permissions (user_id, marketplace) 
        VALUES (?, 1) 
        ON DUPLICATE KEY UPDATE marketplace = 1
      `, [application[0].user_id]);

      secureLogger.info('Marketplace application approved', {
        applicationId: id,
        userId: application[0].user_id,
        reviewerId,
        adminNotes: admin_notes
      });
    }

    res.json({ 
      success: true, 
      message: 'Application approved successfully',
      applicationId: id
    });

  } catch (err) {
    secureLogger.error('Error approving marketplace application', err);
    res.status(500).json({ error: 'Failed to approve application' });
  }
});

// PUT /admin/marketplace/applications/:id/deny - Deny marketplace application
router.put('/applications/:id/deny', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes, denial_reason } = req.body;
    const reviewerId = req.userId;

    if (!denial_reason || !denial_reason.trim()) {
      return res.status(400).json({ error: 'Denial reason is required' });
    }

    // Update application status
    const [result] = await db.query(`
      UPDATE marketplace_applications 
      SET 
        marketplace_status = 'denied',
        marketplace_reviewed_by = ?,
        marketplace_review_date = NOW(),
        marketplace_admin_notes = ?,
        marketplace_denial_reason = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [reviewerId, admin_notes || denial_reason, denial_reason, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Get the user_id from the application
    const [application] = await db.query('SELECT user_id FROM marketplace_applications WHERE id = ?', [id]);
    
    if (application[0]) {
      // Ensure user does NOT have marketplace permissions
      await db.query(`
        INSERT INTO user_permissions (user_id, marketplace) 
        VALUES (?, 0) 
        ON DUPLICATE KEY UPDATE marketplace = 0
      `, [application[0].user_id]);

      secureLogger.info('Marketplace application denied', {
        applicationId: id,
        userId: application[0].user_id,
        reviewerId,
        denialReason,
        adminNotes: admin_notes
      });
    }

    res.json({ 
      success: true, 
      message: 'Application denied successfully',
      applicationId: id
    });

  } catch (err) {
    secureLogger.error('Error denying marketplace application', err);
    res.status(500).json({ error: 'Failed to deny application' });
  }
});

module.exports = router;
