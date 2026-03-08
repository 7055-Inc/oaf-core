const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');
const EmailService = require('../services/emailService');
const { secureLogger } = require('../middleware/secureLogger');

/**
 * @fileoverview Admin routes for verified artist application management
 * 
 * Handles admin functionality for verified artist applications including:
 * - Application listing and filtering by status
 * - Application approval with verified permission granting
 * - Application denial with reason tracking
 * - Media URL processing for application review
 * - Email notifications for application decisions
 * - Audit logging for all admin actions
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

// ============================================================================
// VERIFIED APPLICATION ADMIN ROUTES
// ============================================================================

/**
 * GET /admin/verified/applications
 * Get verified applications by status for admin review
 * Provides comprehensive application data including media URLs and user information
 * 
 * @route GET /admin/verified/applications
 * @middleware verifyToken - Requires user authentication
 * @middleware requirePermission('manage_system') - Requires system management permissions
 * @param {string} [status=pending] - Application status ('pending', 'approved', 'denied')
 * @param {number} [limit=50] - Number of applications to return
 * @param {number} [offset=0] - Pagination offset
 * @returns {Object} List of verified applications with media URLs and user details
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
      LEFT JOIN users reviewer ON ma.verification_reviewed_by = reviewer.id
      WHERE ma.verification_status = ?
      ORDER BY ma.created_at DESC
      LIMIT ? OFFSET ?
    `, [status, parseInt(limit), parseInt(offset)]);

    // Process media URLs for each application
    const processedApplications = await Promise.all(applications.map(async (app) => {
      const mediaFields = [
        'raw_materials_media_id',
        'work_process_1_media_id', 
        'work_process_2_media_id',
        'work_process_3_media_id',
        'artist_at_work_media_id',
        'booth_display_media_id',
        'artist_working_video_media_id',
        'artist_bio_video_media_id',
        'additional_video_media_id'
      ];

      // Get media URLs for all media IDs
      for (const field of mediaFields) {
        const mediaId = app[field];
        if (mediaId) {
          try {
            const [mediaResult] = await db.query(`
              SELECT processed_url, original_filename 
              FROM pending_images 
              WHERE id = ? AND status = 'processed'
            `, [mediaId]);
            
            if (mediaResult.length > 0) {
              const urlField = field.replace('_media_id', '_url');
              const filenameField = field.replace('_media_id', '_filename');
              app[urlField] = mediaResult[0].processed_url;
              app[filenameField] = mediaResult[0].original_filename;
            }
          } catch (mediaError) {
            console.error(`Error fetching media for ${field}:`, mediaError);
          }
        }
      }

      // Remove media ID fields from response
      mediaFields.forEach(field => delete app[field]);
      
      return app;
    }));

    res.json({
      success: true,
      applications: processedApplications,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        total: processedApplications.length
      }
    });

  } catch (err) {
    secureLogger.error('Error fetching verified applications', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

/**
 * PUT /admin/verified/applications/:id/approve
 * Approve verified application and grant user verified permissions
 * Updates application status and automatically grants verified status to user
 * 
 * @route PUT /admin/verified/applications/:id/approve
 * @middleware verifyToken - Requires user authentication
 * @middleware requirePermission('manage_system') - Requires system management permissions
 * @param {string} id - Application ID to approve
 * @param {Object} req.body - Approval data
 * @param {string} [req.body.admin_notes] - Optional admin notes for approval
 * @returns {Object} Approval confirmation with application ID
 * @note Automatically grants verified permission to approved user (NOT vendor permission)
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
        verification_status = 'approved',
        verification_reviewed_by = ?,
        verification_review_date = NOW(),
        verification_admin_notes = ?,
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
      // Update user permissions to grant ONLY verified access (NOT vendor)
      await db.query(`
        INSERT INTO user_permissions (user_id, verified) 
        VALUES (?, 1) 
        ON DUPLICATE KEY UPDATE verified = 1
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

        await emailService.sendEmail(application[0].user_id, 'verified_application_approved', templateData);
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
        // Don't fail the approval if email fails
      }

      secureLogger.info('Verified application approved', {
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
    secureLogger.error('Error approving verified application', err);
    res.status(500).json({ error: 'Failed to approve application' });
  }
});

/**
 * PUT /admin/verified/applications/:id/deny
 * Deny verified application with required denial reason
 * Updates application status and ensures user does not have verified permissions
 * 
 * @route PUT /admin/verified/applications/:id/deny
 * @middleware verifyToken - Requires user authentication
 * @middleware requirePermission('manage_system') - Requires system management permissions
 * @param {string} id - Application ID to deny
 * @param {Object} req.body - Denial data
 * @param {string} req.body.denial_reason - Required reason for denial
 * @param {string} [req.body.admin_notes] - Optional admin notes for denial
 * @returns {Object} Denial confirmation with application ID
 * @note Ensures user verified permission is revoked and requires denial reason
 */
router.put('/applications/:id/deny', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { id } = req.params;
    const { denial_reason, admin_notes } = req.body;
    const reviewerId = req.userId;

    if (!denial_reason || !denial_reason.trim()) {
      return res.status(400).json({ error: 'Denial reason is required' });
    }

    // Update application status
    const [result] = await db.query(`
      UPDATE marketplace_applications 
      SET 
        verification_status = 'denied',
        verification_reviewed_by = ?,
        verification_review_date = NOW(),
        verification_admin_notes = ?,
        verification_denial_reason = ?,
        updated_at = NOW()
      WHERE id = ?
    `, [reviewerId, admin_notes || 'Application denied', denial_reason.trim(), id]);

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
      // Ensure user does NOT have verified permission
      await db.query(`
        INSERT INTO user_permissions (user_id, verified) 
        VALUES (?, 0) 
        ON DUPLICATE KEY UPDATE verified = 0
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
          denial_date: new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
          }),
          reviewer_name: application[0].reviewer_name || 'Admin Team',
          denial_reason: denial_reason.trim(),
          admin_notes_section: admin_notes 
            ? `<p><strong>Additional Notes:</strong> ${admin_notes}</p>` 
            : '',
          reapply_url: `${process.env.FRONTEND_URL || 'https://brakebee.com'}/dashboard`
        };

        await emailService.sendEmail(application[0].user_id, 'verified_application_denied', templateData);
      } catch (emailError) {
        console.error('Failed to send denial email:', emailError);
        // Don't fail the denial if email fails
      }

      secureLogger.info('Verified application denied', {
        applicationId: id,
        userId: application[0].user_id,
        reviewerId,
        denialReason: denial_reason.trim(),
        adminNotes: admin_notes
      });
    }

    res.json({ 
      success: true, 
      message: 'Application denied successfully',
      applicationId: id
    });

  } catch (err) {
    secureLogger.error('Error denying verified application', err);
    res.status(500).json({ error: 'Failed to deny application' });
  }
});

module.exports = router;
