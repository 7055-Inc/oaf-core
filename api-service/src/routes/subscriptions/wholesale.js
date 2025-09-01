const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const verifyToken = require('../../middleware/jwt');
const { requirePermission } = require('../../middleware/permissions');

// ============================================================================
// WHOLESALE SUBSCRIPTION ROUTES
// ============================================================================
// All routes for wholesale buyer subscription management

// GET /subscriptions/wholesale/terms-check - Check if user accepted latest wholesale terms
router.get('/terms-check', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get latest wholesale terms version
    const [latestTerms] = await db.execute(`
      SELECT id, title, content, version, created_at
      FROM terms_versions 
      WHERE subscription_type = 'wholesale' AND is_current = 1
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (latestTerms.length === 0) {
      return res.status(404).json({ error: 'No wholesale terms found' });
    }

    const terms = latestTerms[0];

    // Check if user has accepted these terms
    const [acceptance] = await db.execute(`
      SELECT id, accepted_at
      FROM user_terms_acceptance 
      WHERE user_id = ? AND subscription_type = 'wholesale' AND terms_version_id = ?
    `, [userId, terms.id]);

    const termsAccepted = acceptance.length > 0;

    res.json({
      success: true,
      termsAccepted,
      latestTerms: {
        id: terms.id,
        title: terms.title,
        content: terms.content,
        version: terms.version,
        created_at: terms.created_at
      }
    });

  } catch (error) {
    console.error('Error checking wholesale terms acceptance:', error);
    res.status(500).json({ error: 'Failed to check terms acceptance' });
  }
});

// POST /subscriptions/wholesale/terms-accept - Record terms acceptance
router.post('/terms-accept', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { terms_version_id } = req.body;

    if (!terms_version_id) {
      return res.status(400).json({ error: 'terms_version_id is required' });
    }

    // Verify the terms version exists and is for wholesale
    const [termsCheck] = await db.execute(`
      SELECT id FROM terms_versions 
      WHERE id = ? AND subscription_type = 'wholesale'
    `, [terms_version_id]);

    if (termsCheck.length === 0) {
      return res.status(404).json({ error: 'Invalid terms version' });
    }

    // Record acceptance (INSERT IGNORE to handle duplicate attempts)
    await db.execute(`
      INSERT IGNORE INTO user_terms_acceptance (user_id, subscription_type, terms_version_id, accepted_at)
      VALUES (?, 'wholesale', ?, NOW())
    `, [userId, terms_version_id]);

    res.json({
      success: true,
      message: 'Terms acceptance recorded successfully'
    });

  } catch (error) {
    console.error('Error recording wholesale terms acceptance:', error);
    res.status(500).json({ error: 'Failed to record terms acceptance' });
  }
});

// POST /subscriptions/wholesale/apply - Submit wholesale buyer application
router.post('/apply', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const {
      business_name,
      business_type,
      tax_id,
      business_address,
      business_city,
      business_state,
      business_zip,
      business_phone,
      business_email,
      contact_name,
      contact_title,
      years_in_business,
      business_description,
      product_categories,
      expected_order_volume,
      website_url,
      resale_certificate,
      additional_info
    } = req.body;

    // Validate required fields
    const requiredFields = [
      'business_name', 'business_type', 'tax_id', 'business_address',
      'business_city', 'business_state', 'business_zip', 'business_phone',
      'business_email', 'contact_name', 'years_in_business', 
      'business_description', 'product_categories', 'expected_order_volume'
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }

    // Check if user already has a pending or approved application
    const [existingApp] = await db.execute(`
      SELECT id, status FROM wholesale_applications 
      WHERE user_id = ? AND status IN ('pending', 'approved', 'under_review')
    `, [userId]);

    if (existingApp.length > 0) {
      const status = existingApp[0].status;
      return res.status(400).json({ 
        error: `You already have a ${status} wholesale application` 
      });
    }

    // Insert the application
    const [result] = await db.execute(`
      INSERT INTO wholesale_applications (
        user_id, business_name, business_type, tax_id, business_address,
        business_city, business_state, business_zip, business_phone, business_email,
        contact_name, contact_title, years_in_business, business_description,
        product_categories, expected_order_volume, website_url, resale_certificate,
        additional_info, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      userId, business_name, business_type, tax_id, business_address,
      business_city, business_state, business_zip, business_phone, business_email,
      contact_name, contact_title, years_in_business, business_description,
      product_categories, expected_order_volume, website_url, resale_certificate,
      additional_info
    ]);

    res.json({
      success: true,
      message: 'Wholesale application submitted successfully',
      application_id: result.insertId
    });

  } catch (error) {
    console.error('Error submitting wholesale application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
});

// ============================================================================
// ADMIN WHOLESALE APPLICATION MANAGEMENT ROUTES
// ============================================================================

// GET /subscriptions/wholesale/admin/applications - Get wholesale applications by status
router.get('/admin/applications', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status } = req.query;
    
    // Build query based on status filter
    let query = `
      SELECT 
        wa.*,
        u.username,
        CONCAT(u.first_name, ' ', u.last_name) as user_full_name
      FROM wholesale_applications wa
      JOIN users u ON wa.user_id = u.id
    `;
    
    let params = [];
    
    if (status) {
      query += ' WHERE wa.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY wa.created_at DESC';
    
    const [applications] = await db.execute(query, params);
    
    res.json({
      success: true,
      applications: applications
    });

  } catch (error) {
    console.error('Error fetching wholesale applications:', error);
    res.status(500).json({ error: 'Failed to fetch wholesale applications' });
  }
});

// PUT /subscriptions/wholesale/admin/applications/:id/approve - Approve wholesale application
router.put('/admin/applications/:id/approve', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;
    const adminUserId = req.userId;

    // Get the application
    const [application] = await db.execute(
      'SELECT user_id, business_name FROM wholesale_applications WHERE id = ?',
      [id]
    );

    if (application.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const userId = application[0].user_id;

    // Start transaction
    await db.execute('START TRANSACTION');

    try {
      // Update application status
      await db.execute(`
        UPDATE wholesale_applications 
        SET status = 'approved', 
            reviewed_by = ?, 
            review_date = NOW(), 
            admin_notes = ?
        WHERE id = ?
      `, [adminUserId, admin_notes || 'Application approved', id]);

      // Grant wholesale permission by updating user_type
      await db.execute(`
        UPDATE users 
        SET user_type = 'wholesale' 
        WHERE id = ?
      `, [userId]);

      // Also add to user_permissions if the table exists and user has a record
      try {
        await db.execute(`
          INSERT INTO user_permissions (user_id, wholesale) 
          VALUES (?, 1)
          ON DUPLICATE KEY UPDATE wholesale = 1
        `, [userId]);
      } catch (permError) {
        // If user_permissions doesn't have wholesale column or other issues, continue
        console.log('Note: Could not update user_permissions table:', permError.message);
      }

      await db.execute('COMMIT');

      res.json({
        success: true,
        message: 'Application approved successfully'
      });

    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error approving wholesale application:', error);
    res.status(500).json({ error: 'Failed to approve application' });
  }
});

// PUT /subscriptions/wholesale/admin/applications/:id/deny - Deny wholesale application
router.put('/admin/applications/:id/deny', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes, denial_reason } = req.body;
    const adminUserId = req.userId;

    if (!denial_reason) {
      return res.status(400).json({ error: 'Denial reason is required' });
    }

    // Update application status
    await db.execute(`
      UPDATE wholesale_applications 
      SET status = 'denied', 
          reviewed_by = ?, 
          review_date = NOW(), 
          admin_notes = ?,
          denial_reason = ?
      WHERE id = ?
    `, [adminUserId, admin_notes || 'Application denied', denial_reason, id]);

    res.json({
      success: true,
      message: 'Application denied successfully'
    });

  } catch (error) {
    console.error('Error denying wholesale application:', error);
    res.status(500).json({ error: 'Failed to deny application' });
  }
});

// GET /subscriptions/wholesale/admin/stats - Get wholesale application statistics
router.get('/admin/stats', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total_applications,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
        SUM(CASE WHEN status = 'denied' THEN 1 ELSE 0 END) as denied_count,
        SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review_count
      FROM wholesale_applications
    `);

    res.json({
      success: true,
      stats: stats[0]
    });

  } catch (error) {
    console.error('Error fetching wholesale stats:', error);
    res.status(500).json({ error: 'Failed to fetch wholesale statistics' });
  }
});

module.exports = router;
