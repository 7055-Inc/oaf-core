/**
 * Admin Marketplace Management Routes
 * Comprehensive administrative controls for marketplace management
 * Handles product curation, application approval, statistics, and vendor oversight
 * All routes require admin-level permissions for marketplace administration
 */

const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');
const { secureLogger } = require('../middleware/secureLogger');
const EmailService = require('../services/emailService');

/**
 * GET /admin/marketplace/stats
 * Get comprehensive marketplace curation statistics and metrics
 * Provides overview of marketplace health, categorization status, and user permissions
 * 
 * @route GET /admin/marketplace/stats
 * @middleware verifyToken - Requires user authentication
 * @middleware requirePermission('admin') - Requires admin permissions
 * @returns {Object} Marketplace statistics including product counts by category and user permission status
 * @note Admin-only endpoint for marketplace oversight and management
 */
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

/**
 * GET /admin/marketplace/products
 * Get marketplace products by category for admin curation and management
 * Supports filtering by category with optional includes for detailed product information
 * 
 * @route GET /admin/marketplace/products
 * @middleware verifyToken - Requires user authentication
 * @middleware requirePermission('admin') - Requires admin permissions
 * @param {string} [category=unsorted] - Product category ('unsorted', 'art', 'crafts')
 * @param {string} [include] - Comma-separated includes ('images', 'vendor')
 * @param {number} [limit=50] - Number of products to return
 * @param {number} [offset=0] - Pagination offset
 * @returns {Object} Paginated list of marketplace products with vendor information
 * @note Admin-only endpoint for product curation workflow
 */
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

/**
 * PUT /admin/marketplace/products/:id/categorize
 * Move individual product to different marketplace category
 * Updates product category and logs curation action for audit trail
 * 
 * @route PUT /admin/marketplace/products/:id/categorize
 * @middleware verifyToken - Requires user authentication
 * @middleware requirePermission('admin') - Requires admin permissions
 * @param {string} id - Product ID to categorize
 * @param {Object} req.body - Categorization data
 * @param {string} req.body.category - Target category ('unsorted', 'art', 'crafts')
 * @param {string} [req.body.reason] - Optional reason for categorization
 * @returns {Object} Categorization confirmation with previous and new category
 * @note Creates audit log entry for curation tracking
 */
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

/**
 * PUT /admin/marketplace/products/bulk-categorize
 * Bulk move multiple products to different marketplace category
 * Performs transactional bulk update with comprehensive audit logging
 * 
 * @route PUT /admin/marketplace/products/bulk-categorize
 * @middleware verifyToken - Requires user authentication
 * @middleware requirePermission('admin') - Requires admin permissions
 * @param {Object} req.body - Bulk categorization data
 * @param {Array<number>} req.body.product_ids - Array of product IDs to categorize
 * @param {string} req.body.category - Target category ('unsorted', 'art', 'crafts')
 * @param {string} [req.body.reason] - Optional reason for bulk categorization
 * @returns {Object} Bulk categorization confirmation with update count
 * @note Uses database transactions for data consistency and creates audit logs for all products
 */
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

/**
 * GET /admin/marketplace/curation-log
 * Get comprehensive curation history and audit trail
 * Provides detailed log of all marketplace curation actions with curator information
 * 
 * @route GET /admin/marketplace/curation-log
 * @middleware verifyToken - Requires user authentication
 * @middleware requirePermission('admin') - Requires admin permissions
 * @param {number} [limit=50] - Number of log entries to return
 * @param {number} [offset=0] - Pagination offset
 * @returns {Object} Paginated curation log with product and curator details
 * @note Essential for marketplace audit trail and curation oversight
 */
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

/**
 * GET /admin/marketplace/applications
 * Get marketplace applications by status for admin review
 * Provides comprehensive application data including media URLs and user information
 * 
 * @route GET /admin/marketplace/applications
 * @middleware verifyToken - Requires user authentication
 * @middleware requirePermission('manage_system') - Requires system management permissions
 * @param {string} [status=pending] - Application status ('pending', 'approved', 'denied')
 * @param {number} [limit=50] - Number of applications to return
 * @param {number} [offset=0] - Pagination offset
 * @returns {Object} List of marketplace applications with media URLs and user details
 * @note Processes media URLs for application review workflow
 */
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
          `SELECT id, permanent_url, image_path FROM pending_images WHERE id IN (${mediaIds.map(() => '?').join(',')})`,
          mediaIds
        );

        const mediaMapping = {};
        mediaUrls.forEach(media => {
          if (media.permanent_url) {
            // Use permanent URL if available
            mediaMapping[media.id] = `${process.env.SMART_MEDIA_BASE_URL || 'https://api.beemeeart.com/api/images'}/${media.permanent_url}`;
          } else if (media.image_path) {
            // Fall back to image_path for pending images
            const apiBaseUrl = process.env.API_BASE_URL || 'https://api.brakebee.com';
            mediaMapping[media.id] = `${apiBaseUrl}${media.image_path}`;
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

/**
 * PUT /admin/marketplace/applications/:id/approve
 * Approve marketplace application and grant user vendor permissions
 * Updates application status and automatically grants vendor access and verified status to user
 * 
 * @route PUT /admin/marketplace/applications/:id/approve
 * @middleware verifyToken - Requires user authentication
 * @middleware requirePermission('manage_system') - Requires system management permissions
 * @param {string} id - Application ID to approve
 * @param {Object} req.body - Approval data
 * @param {string} [req.body.admin_notes] - Optional admin notes for approval
 * @returns {Object} Approval confirmation with application ID
 * @note Automatically grants vendor and verified permissions to approved user
 */
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

    // Get the user_id and application details for email
    const [application] = await db.query(`
      SELECT ma.user_id, u.username, up.first_name, up.last_name, reviewer.username as reviewer_name
      FROM marketplace_applications ma
      LEFT JOIN users u ON ma.user_id = u.id
      LEFT JOIN user_profiles up ON ma.user_id = up.user_id
      LEFT JOIN users reviewer ON ? = reviewer.id
      WHERE ma.id = ?
    `, [reviewerId, id]);
    
    if (application[0]) {
      // Update user permissions to grant vendor access
      await db.query(`
        INSERT INTO user_permissions (user_id, vendor, verified) 
        VALUES (?, 1, 1) 
        ON DUPLICATE KEY UPDATE vendor = 1, verified = 1
      `, [application[0].user_id]);

      // Send approval email
      try {
        const emailService = new EmailService();
        const artistName = application[0].first_name && application[0].last_name 
          ? `${application[0].first_name} ${application[0].last_name}`
          : application[0].username;
        
        const templateData = {
          artist_name: artistName,
          application_id: id,
          approval_date: new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
          }),
          reviewer_name: application[0].reviewer_name || 'Admin Team',
          admin_notes_section: admin_notes 
            ? `<p><strong>Admin Notes:</strong> ${admin_notes}</p>` 
            : '',
          dashboard_url: `${process.env.FRONTEND_URL || 'https://brakebee.com'}/dashboard`
        };

        await emailService.sendEmail(application[0].user_id, 'marketplace_application_approved', templateData);
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
        // Don't fail the approval if email fails
      }

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

/**
 * PUT /admin/marketplace/applications/:id/deny
 * Deny marketplace application with required denial reason
 * Updates application status and ensures user does not have vendor permissions
 * 
 * @route PUT /admin/marketplace/applications/:id/deny
 * @middleware verifyToken - Requires user authentication
 * @middleware requirePermission('manage_system') - Requires system management permissions
 * @param {string} id - Application ID to deny
 * @param {Object} req.body - Denial data
 * @param {string} req.body.denial_reason - Required reason for denial
 * @param {string} [req.body.admin_notes] - Optional admin notes for denial
 * @returns {Object} Denial confirmation with application ID
 * @note Ensures user vendor permission is revoked (verified status remains unchanged) and requires denial reason
 */
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

    // Get the user_id and application details for email
    const [application] = await db.query(`
      SELECT ma.user_id, u.username, up.first_name, up.last_name, reviewer.username as reviewer_name
      FROM marketplace_applications ma
      LEFT JOIN users u ON ma.user_id = u.id
      LEFT JOIN user_profiles up ON ma.user_id = up.user_id
      LEFT JOIN users reviewer ON ? = reviewer.id
      WHERE ma.id = ?
    `, [reviewerId, id]);
    
    if (application[0]) {
      // Ensure user does NOT have vendor permissions (verified status remains unchanged)
      await db.query(`
        INSERT INTO user_permissions (user_id, vendor, marketplace) 
        VALUES (?, 0, 0) 
        ON DUPLICATE KEY UPDATE vendor = 0, marketplace = 0
      `, [application[0].user_id]);

      // Send denial email
      try {
        const emailService = new EmailService();
        const artistName = application[0].first_name && application[0].last_name 
          ? `${application[0].first_name} ${application[0].last_name}`
          : application[0].username;
        
        const templateData = {
          artist_name: artistName,
          application_id: id,
          review_date: new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
          }),
          reviewer_name: application[0].reviewer_name || 'Admin Team',
          denial_reason: denial_reason,
          admin_notes_section: admin_notes && admin_notes !== denial_reason
            ? `<p><strong>Additional Notes:</strong> ${admin_notes}</p>` 
            : ''
        };

        await emailService.sendEmail(application[0].user_id, 'marketplace_application_denied', templateData);
      } catch (emailError) {
        console.error('Failed to send denial email:', emailError);
        // Don't fail the denial if email fails
      }

      secureLogger.info('Marketplace application denied', {
        applicationId: id,
        userId: application[0].user_id,
        reviewerId,
        denialReason: denial_reason,
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
