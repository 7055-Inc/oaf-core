/**
 * Admin Application Review Routes (v2)
 * Mounted at /api/v2/commerce/admin
 *
 * Handles admin review of marketplace and verified artist applications.
 * Both types query the `marketplace_applications` table with type-specific
 * status/permission columns.
 */

const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const { requireAuth } = require('../auth/middleware');
const { requirePermission } = require('../auth/middleware/requirePermission');
const { secureLogger } = require('../../middleware/secureLogger');
const EmailService = require('../../services/emailService');

// ============================================================================
// MARKETPLACE APPLICATION ADMIN
// ============================================================================

router.get('/marketplace/applications', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status = 'pending', limit = 50, offset = 0 } = req.query;

    const validStatuses = ['pending', 'approved', 'denied'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid status' } });
    }

    const [applications] = await db.query(`
      SELECT 
        ma.id, ma.user_id, ma.work_description, ma.additional_info, ma.profile_data,
        ma.marketplace_status, ma.marketplace_reviewed_by, ma.marketplace_review_date,
        ma.marketplace_admin_notes, ma.marketplace_denial_reason,
        ma.verification_status, ma.verification_reviewed_by, ma.verification_review_date,
        ma.verification_admin_notes, ma.verification_denial_reason,
        ma.created_at, ma.updated_at,
        u.username, up.first_name, up.last_name, ap.business_name,
        reviewer.username as reviewer_name,
        ma.raw_materials_media_id, ma.work_process_1_media_id,
        ma.work_process_2_media_id, ma.work_process_3_media_id,
        ma.artist_at_work_media_id, ma.booth_display_media_id,
        ma.artist_working_video_media_id, ma.artist_bio_video_media_id,
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

    for (const application of applications) {
      await resolveMediaUrls(application);
      application.user_name = application.first_name && application.last_name
        ? `${application.first_name} ${application.last_name}` : null;
    }

    res.json({ success: true, data: { applications, total: applications.length, status } });
  } catch (error) {
    secureLogger.error('Error fetching marketplace applications', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch applications' } });
  }
});

router.put('/marketplace/applications/:id/approve', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;
    const reviewerId = req.user.id;

    const [result] = await db.query(`
      UPDATE marketplace_applications SET
        marketplace_status = 'approved', marketplace_reviewed_by = ?,
        marketplace_review_date = NOW(), marketplace_admin_notes = ?, updated_at = NOW()
      WHERE id = ?
    `, [reviewerId, admin_notes || 'Application approved', id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: { message: 'Application not found' } });
    }

    const [application] = await db.query(`
      SELECT ma.user_id, u.username, up.first_name, up.last_name, reviewer.username as reviewer_name
      FROM marketplace_applications ma
      LEFT JOIN users u ON ma.user_id = u.id
      LEFT JOIN user_profiles up ON ma.user_id = up.user_id
      LEFT JOIN users reviewer ON ? = reviewer.id
      WHERE ma.id = ?
    `, [reviewerId, id]);

    if (application[0]) {
      await db.query(`
        INSERT INTO user_permissions (user_id, vendor, verified) VALUES (?, 1, 1)
        ON DUPLICATE KEY UPDATE vendor = 1, verified = 1
      `, [application[0].user_id]);

      await sendApplicationEmail(application[0], id, 'marketplace_application_approved', admin_notes, reviewerId);

      secureLogger.info('Marketplace application approved', {
        applicationId: id, userId: application[0].user_id, reviewerId
      });
    }

    res.json({ success: true, data: { message: 'Application approved successfully', applicationId: id } });
  } catch (error) {
    secureLogger.error('Error approving marketplace application', error);
    res.status(500).json({ success: false, error: { message: 'Failed to approve application' } });
  }
});

router.put('/marketplace/applications/:id/deny', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes, denial_reason } = req.body;
    const reviewerId = req.user.id;

    if (!denial_reason || !denial_reason.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Denial reason is required' } });
    }

    const [result] = await db.query(`
      UPDATE marketplace_applications SET
        marketplace_status = 'denied', marketplace_reviewed_by = ?,
        marketplace_review_date = NOW(), marketplace_admin_notes = ?,
        marketplace_denial_reason = ?, updated_at = NOW()
      WHERE id = ?
    `, [reviewerId, admin_notes || denial_reason, denial_reason, id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: { message: 'Application not found' } });
    }

    const [application] = await db.query(`
      SELECT ma.user_id, u.username, up.first_name, up.last_name, reviewer.username as reviewer_name
      FROM marketplace_applications ma
      LEFT JOIN users u ON ma.user_id = u.id
      LEFT JOIN user_profiles up ON ma.user_id = up.user_id
      LEFT JOIN users reviewer ON ? = reviewer.id
      WHERE ma.id = ?
    `, [reviewerId, id]);

    if (application[0]) {
      await db.query(`
        INSERT INTO user_permissions (user_id, vendor, marketplace) VALUES (?, 0, 0)
        ON DUPLICATE KEY UPDATE vendor = 0, marketplace = 0
      `, [application[0].user_id]);

      await sendApplicationEmail(application[0], id, 'marketplace_application_denied', admin_notes, reviewerId, denial_reason);

      secureLogger.info('Marketplace application denied', {
        applicationId: id, userId: application[0].user_id, reviewerId, denialReason: denial_reason
      });
    }

    res.json({ success: true, data: { message: 'Application denied successfully', applicationId: id } });
  } catch (error) {
    secureLogger.error('Error denying marketplace application', error);
    res.status(500).json({ success: false, error: { message: 'Failed to deny application' } });
  }
});

// ============================================================================
// VERIFIED APPLICATION ADMIN
// ============================================================================

router.get('/verified/applications', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status = 'pending', limit = 50, offset = 0 } = req.query;

    const validStatuses = ['pending', 'approved', 'denied'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: { message: 'Invalid status' } });
    }

    const [applications] = await db.query(`
      SELECT 
        ma.id, ma.user_id, ma.work_description, ma.additional_info, ma.profile_data,
        ma.verification_status, ma.verification_reviewed_by, ma.verification_review_date,
        ma.verification_admin_notes, ma.verification_denial_reason,
        ma.created_at, ma.updated_at,
        u.username, up.first_name, up.last_name, ap.business_name,
        reviewer.username as reviewer_name,
        ma.raw_materials_media_id, ma.work_process_1_media_id,
        ma.work_process_2_media_id, ma.work_process_3_media_id,
        ma.artist_at_work_media_id, ma.booth_display_media_id,
        ma.artist_working_video_media_id, ma.artist_bio_video_media_id,
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

    for (const app of applications) {
      const mediaFields = [
        'raw_materials_media_id', 'work_process_1_media_id', 'work_process_2_media_id',
        'work_process_3_media_id', 'artist_at_work_media_id', 'booth_display_media_id',
        'artist_working_video_media_id', 'artist_bio_video_media_id', 'additional_video_media_id'
      ];

      for (const field of mediaFields) {
        const mediaId = app[field];
        if (mediaId) {
          try {
            const [mediaResult] = await db.query(
              "SELECT processed_url, original_filename FROM pending_images WHERE id = ? AND status = 'processed'",
              [mediaId]
            );
            if (mediaResult.length > 0) {
              app[field.replace('_media_id', '_url')] = mediaResult[0].processed_url;
              app[field.replace('_media_id', '_filename')] = mediaResult[0].original_filename;
            }
          } catch (mediaError) {
            console.error(`Error fetching media for ${field}:`, mediaError);
          }
        }
        delete app[field];
      }
    }

    res.json({
      success: true,
      data: { applications, pagination: { limit: parseInt(limit), offset: parseInt(offset), total: applications.length } }
    });
  } catch (error) {
    secureLogger.error('Error fetching verified applications', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch applications' } });
  }
});

router.put('/verified/applications/:id/approve', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;
    const reviewerId = req.user.id;

    const [result] = await db.query(`
      UPDATE marketplace_applications SET
        verification_status = 'approved', verification_reviewed_by = ?,
        verification_review_date = NOW(), verification_admin_notes = ?, updated_at = NOW()
      WHERE id = ?
    `, [reviewerId, admin_notes || 'Application approved', id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: { message: 'Application not found' } });
    }

    const [application] = await db.query(`
      SELECT ma.user_id, u.username, up.first_name, up.last_name, reviewer.username as reviewer_name
      FROM marketplace_applications ma
      LEFT JOIN users u ON ma.user_id = u.id
      LEFT JOIN user_profiles up ON ma.user_id = up.user_id
      LEFT JOIN users reviewer ON ? = reviewer.id
      WHERE ma.id = ?
    `, [reviewerId, id]);

    if (application[0]) {
      await db.query(`
        INSERT INTO user_permissions (user_id, verified) VALUES (?, 1)
        ON DUPLICATE KEY UPDATE verified = 1
      `, [application[0].user_id]);

      await sendApplicationEmail(application[0], id, 'verified_application_approved', admin_notes, reviewerId);

      secureLogger.info('Verified application approved', {
        applicationId: id, userId: application[0].user_id, reviewerId
      });
    }

    res.json({ success: true, data: { message: 'Application approved successfully', applicationId: id } });
  } catch (error) {
    secureLogger.error('Error approving verified application', error);
    res.status(500).json({ success: false, error: { message: 'Failed to approve application' } });
  }
});

router.put('/verified/applications/:id/deny', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { id } = req.params;
    const { denial_reason, admin_notes } = req.body;
    const reviewerId = req.user.id;

    if (!denial_reason || !denial_reason.trim()) {
      return res.status(400).json({ success: false, error: { message: 'Denial reason is required' } });
    }

    const [result] = await db.query(`
      UPDATE marketplace_applications SET
        verification_status = 'denied', verification_reviewed_by = ?,
        verification_review_date = NOW(), verification_admin_notes = ?,
        verification_denial_reason = ?, updated_at = NOW()
      WHERE id = ?
    `, [reviewerId, admin_notes || 'Application denied', denial_reason.trim(), id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: { message: 'Application not found' } });
    }

    const [application] = await db.query(`
      SELECT ma.user_id, u.username, up.first_name, up.last_name, reviewer.username as reviewer_name
      FROM marketplace_applications ma
      LEFT JOIN users u ON ma.user_id = u.id
      LEFT JOIN user_profiles up ON ma.user_id = up.user_id
      LEFT JOIN users reviewer ON ? = reviewer.id
      WHERE ma.id = ?
    `, [reviewerId, id]);

    if (application[0]) {
      await db.query(`
        INSERT INTO user_permissions (user_id, verified) VALUES (?, 0)
        ON DUPLICATE KEY UPDATE verified = 0
      `, [application[0].user_id]);

      await sendApplicationEmail(application[0], id, 'verified_application_denied', admin_notes, reviewerId, denial_reason.trim());

      secureLogger.info('Verified application denied', {
        applicationId: id, userId: application[0].user_id, reviewerId, denialReason: denial_reason.trim()
      });
    }

    res.json({ success: true, data: { message: 'Application denied successfully', applicationId: id } });
  } catch (error) {
    secureLogger.error('Error denying verified application', error);
    res.status(500).json({ success: false, error: { message: 'Failed to deny application' } });
  }
});

// ============================================================================
// HELPERS
// ============================================================================

async function resolveMediaUrls(application) {
  const mediaIdFields = [
    'raw_materials_media_id', 'work_process_1_media_id', 'work_process_2_media_id',
    'work_process_3_media_id', 'artist_at_work_media_id', 'booth_display_media_id',
    'artist_working_video_media_id', 'artist_bio_video_media_id', 'additional_video_media_id'
  ];

  const mediaIds = mediaIdFields.map(f => application[f]).filter(id => id !== null);

  if (mediaIds.length > 0) {
    const [mediaRows] = await db.query(
      `SELECT id, permanent_url, image_path FROM pending_images WHERE id IN (${mediaIds.map(() => '?').join(',')})`,
      mediaIds
    );

    const mediaMapping = {};
    mediaRows.forEach(media => {
      if (media.permanent_url) {
        mediaMapping[media.id] = `${process.env.SMART_MEDIA_BASE_URL}/${media.permanent_url}`;
      } else if (media.image_path) {
        mediaMapping[media.id] = `${process.env.API_BASE_URL}${media.image_path}`;
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
}

async function sendApplicationEmail(appRow, applicationId, templateName, adminNotes, reviewerId, denialReason) {
  try {
    const emailService = new EmailService();
    const artistName = appRow.first_name && appRow.last_name
      ? `${appRow.first_name} ${appRow.last_name}` : appRow.username;

    const templateData = {
      artist_name: artistName,
      application_id: applicationId,
      reviewer_name: appRow.reviewer_name || 'Admin Team',
      dashboard_url: `${process.env.FRONTEND_URL || 'https://brakebee.com'}/dashboard`
    };

    if (denialReason) {
      templateData.denial_reason = denialReason;
      templateData.denial_date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      templateData.admin_notes_section = adminNotes && adminNotes !== denialReason
        ? `<p><strong>Additional Notes:</strong> ${adminNotes}</p>` : '';
      templateData.reapply_url = templateData.dashboard_url;
    } else {
      templateData.approval_date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      templateData.admin_notes_section = adminNotes
        ? `<p><strong>Admin Notes:</strong> ${adminNotes}</p>` : '';
    }

    await emailService.sendEmail(appRow.user_id, templateName, templateData);
  } catch (emailError) {
    console.error('Failed to send application email:', emailError);
  }
}

module.exports = router;
