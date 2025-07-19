const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');

// --- Artist Verification System Endpoints ---

// Get artist's verification status
router.get('/status', verifyToken, async (req, res) => {
  try {
    const artistId = req.userId;
    
    // Get current verification status
    const [status] = await db.execute(`
      SELECT avs.*, ava.status as application_status, ava.created_at as application_created
      FROM artist_verification_status avs
      LEFT JOIN artist_verification_applications ava ON avs.verification_application_id = ava.id
      WHERE avs.artist_id = ?
    `, [artistId]);

    // Get any pending applications
    const [pendingApps] = await db.execute(`
      SELECT id, status, application_type, verification_level, payment_status, created_at, submitted_at
      FROM artist_verification_applications 
      WHERE artist_id = ? AND status IN ('draft', 'submitted', 'under_review', 'revision_requested')
      ORDER BY created_at DESC
    `, [artistId]);

    res.json({
      verification_status: status[0] || null,
      pending_applications: pendingApps,
      can_apply: pendingApps.length === 0 // Only allow one pending application at a time
    });
  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({ error: 'Failed to fetch verification status' });
  }
});

// Get artist's verification applications
router.get('/applications', verifyToken, async (req, res) => {
  try {
    const artistId = req.userId;
    
    const [applications] = await db.execute(`
      SELECT id, application_type, verification_level, status, payment_status, 
             reviewer_notes, revision_requested_notes, application_fee,
             created_at, submitted_at, verified_at
      FROM artist_verification_applications 
      WHERE artist_id = ? 
      ORDER BY created_at DESC
    `, [artistId]);
    
    res.json(applications);
  } catch (error) {
    console.error('Error fetching verification applications:', error);
    res.status(500).json({ error: 'Failed to fetch verification applications' });
  }
});

// Get single verification application details
router.get('/applications/:id', verifyToken, async (req, res) => {
  try {
    const artistId = req.userId;
    const applicationId = req.params.id;
    
    const [application] = await db.execute(`
      SELECT * FROM artist_verification_applications 
      WHERE id = ? AND artist_id = ?
    `, [applicationId, artistId]);
    
    if (application.length === 0) {
      return res.status(404).json({ error: 'Verification application not found' });
    }
    
    // Parse JSON fields
    const app = application[0];
    if (app.portfolio_images) {
      app.portfolio_images = JSON.parse(app.portfolio_images);
    }
    if (app.social_media_links) {
      app.social_media_links = JSON.parse(app.social_media_links);
    }
    
    res.json(app);
  } catch (error) {
    console.error('Error fetching verification application:', error);
    res.status(500).json({ error: 'Failed to fetch verification application' });
  }
});

// Create new verification application
router.post('/applications', verifyToken, async (req, res) => {
  try {
    const artistId = req.userId;
    const {
      application_type = 'initial',
      verification_level = 'basic',
      business_name,
      years_experience,
      art_education,
      professional_achievements,
      business_documentation,
      portfolio_description,
      portfolio_images = [],
      exhibition_history,
      client_testimonials,
      professional_website,
      social_media_links = {},
      business_address,
      professional_phone
    } = req.body;

    // Check if artist already has a pending application
    const [pendingApps] = await db.execute(`
      SELECT id FROM artist_verification_applications 
      WHERE artist_id = ? AND status IN ('draft', 'submitted', 'under_review', 'revision_requested')
    `, [artistId]);

    if (pendingApps.length > 0) {
      return res.status(400).json({ error: 'You already have a pending verification application' });
    }

    // Determine application fee based on verification level
    const applicationFee = verification_level === 'premium' ? 75.00 : 25.00;

    const [result] = await db.execute(`
      INSERT INTO artist_verification_applications (
        artist_id, application_type, verification_level, business_name, years_experience,
        art_education, professional_achievements, business_documentation, portfolio_description,
        portfolio_images, exhibition_history, client_testimonials, professional_website,
        social_media_links, business_address, professional_phone, application_fee
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      artistId, application_type, verification_level, business_name, years_experience,
      art_education, professional_achievements, business_documentation, portfolio_description,
      JSON.stringify(portfolio_images), exhibition_history, client_testimonials, professional_website,
      JSON.stringify(social_media_links), business_address, professional_phone, applicationFee
    ]);

    res.json({ 
      id: result.insertId,
      application_fee: applicationFee,
      message: 'Verification application created successfully' 
    });
  } catch (error) {
    console.error('Error creating verification application:', error);
    res.status(500).json({ error: 'Failed to create verification application' });
  }
});

// Update verification application (only if draft or revision_requested)
router.put('/applications/:id', verifyToken, async (req, res) => {
  try {
    const artistId = req.userId;
    const applicationId = req.params.id;
    const {
      business_name,
      years_experience,
      art_education,
      professional_achievements,
      business_documentation,
      portfolio_description,
      portfolio_images = [],
      exhibition_history,
      client_testimonials,
      professional_website,
      social_media_links = {},
      business_address,
      professional_phone
    } = req.body;

    // Verify application belongs to artist and is editable
    const [application] = await db.execute(`
      SELECT id, status FROM artist_verification_applications 
      WHERE id = ? AND artist_id = ?
    `, [applicationId, artistId]);

    if (application.length === 0) {
      return res.status(404).json({ error: 'Verification application not found' });
    }

    if (!['draft', 'revision_requested'].includes(application[0].status)) {
      return res.status(400).json({ error: 'Application cannot be edited in current status' });
    }

    await db.execute(`
      UPDATE artist_verification_applications 
      SET business_name = ?, years_experience = ?, art_education = ?, professional_achievements = ?,
          business_documentation = ?, portfolio_description = ?, portfolio_images = ?, 
          exhibition_history = ?, client_testimonials = ?, professional_website = ?,
          social_media_links = ?, business_address = ?, professional_phone = ?
      WHERE id = ? AND artist_id = ?
    `, [
      business_name, years_experience, art_education, professional_achievements,
      business_documentation, portfolio_description, JSON.stringify(portfolio_images),
      exhibition_history, client_testimonials, professional_website,
      JSON.stringify(social_media_links), business_address, professional_phone,
      applicationId, artistId
    ]);

    res.json({ message: 'Verification application updated successfully' });
  } catch (error) {
    console.error('Error updating verification application:', error);
    res.status(500).json({ error: 'Failed to update verification application' });
  }
});

// Submit verification application for review
router.post('/applications/:id/submit', verifyToken, async (req, res) => {
  try {
    const artistId = req.userId;
    const applicationId = req.params.id;

    // Verify application belongs to artist and is submittable
    const [application] = await db.execute(`
      SELECT id, status, application_fee, payment_status FROM artist_verification_applications 
      WHERE id = ? AND artist_id = ?
    `, [applicationId, artistId]);

    if (application.length === 0) {
      return res.status(404).json({ error: 'Verification application not found' });
    }

    if (!['draft', 'revision_requested'].includes(application[0].status)) {
      return res.status(400).json({ error: 'Application cannot be submitted in current status' });
    }

    // For now, we'll mark as submitted without payment integration
    // In production, you'd integrate with Stripe here
    await db.execute(`
      UPDATE artist_verification_applications 
      SET status = 'submitted', submitted_at = NOW(), payment_status = 'paid'
      WHERE id = ? AND artist_id = ?
    `, [applicationId, artistId]);

    res.json({ message: 'Verification application submitted successfully for review' });
  } catch (error) {
    console.error('Error submitting verification application:', error);
    res.status(500).json({ error: 'Failed to submit verification application' });
  }
});

// --- ADMIN ENDPOINTS FOR MANUAL REVIEW ---

// Get all verification applications for review (admin only)
router.get('/admin/applications', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status = 'submitted', limit = 50, offset = 0 } = req.query;
    
    const [applications] = await db.execute(`
      SELECT ava.*, u.first_name, u.last_name, u.email,
             reviewer.first_name as reviewer_first_name, reviewer.last_name as reviewer_last_name
      FROM artist_verification_applications ava
      JOIN users u ON ava.artist_id = u.id
      LEFT JOIN users reviewer ON ava.reviewer_id = reviewer.id
      WHERE ava.status = ?
      ORDER BY ava.submitted_at ASC
      LIMIT ? OFFSET ?
    `, [status, parseInt(limit), parseInt(offset)]);

    // Parse JSON fields for each application
    const parsedApplications = applications.map(app => {
      if (app.portfolio_images) {
        app.portfolio_images = JSON.parse(app.portfolio_images);
      }
      if (app.social_media_links) {
        app.social_media_links = JSON.parse(app.social_media_links);
      }
      return app;
    });

    res.json(parsedApplications);
  } catch (error) {
    console.error('Error fetching verification applications for review:', error);
    res.status(500).json({ error: 'Failed to fetch verification applications' });
  }
});

// Get single application for review (admin only)
router.get('/admin/applications/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const applicationId = req.params.id;
    
    const [application] = await db.execute(`
      SELECT ava.*, u.first_name, u.last_name, u.email, u.created_at as user_created,
             ap.business_name as current_business_name, ap.bio, ap.website, ap.instagram_handle
      FROM artist_verification_applications ava
      JOIN users u ON ava.artist_id = u.id
      LEFT JOIN artist_profiles ap ON u.id = ap.user_id
      WHERE ava.id = ?
    `, [applicationId]);

    if (application.length === 0) {
      return res.status(404).json({ error: 'Verification application not found' });
    }

    const app = application[0];
    if (app.portfolio_images) {
      app.portfolio_images = JSON.parse(app.portfolio_images);
    }
    if (app.social_media_links) {
      app.social_media_links = JSON.parse(app.social_media_links);
    }

    res.json(app);
  } catch (error) {
    console.error('Error fetching verification application for review:', error);
    res.status(500).json({ error: 'Failed to fetch verification application' });
  }
});

// Approve verification application (admin only)
router.post('/admin/applications/:id/approve', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const applicationId = req.params.id;
    const reviewerId = req.userId;
    const { reviewer_notes = '', verification_duration_months = 12 } = req.body;

    // Start transaction
    await db.execute('START TRANSACTION');

    try {
      // Get application details
      const [application] = await db.execute(`
        SELECT artist_id, verification_level FROM artist_verification_applications 
        WHERE id = ? AND status = 'under_review'
      `, [applicationId]);

      if (application.length === 0) {
        throw new Error('Application not found or not in review status');
      }

      const { artist_id, verification_level } = application[0];
      const expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + verification_duration_months);

      // Update application status
      await db.execute(`
        UPDATE artist_verification_applications 
        SET status = 'approved', reviewer_id = ?, reviewer_notes = ?, verified_at = NOW(),
            verification_expiry_date = ?
        WHERE id = ?
      `, [reviewerId, reviewer_notes, expiryDate.toISOString().split('T')[0], applicationId]);

      // Update or create verification status
      await db.execute(`
        INSERT INTO artist_verification_status (
          artist_id, is_verified, verification_level, verification_date, expiry_date, verification_application_id
        ) VALUES (?, TRUE, ?, CURDATE(), ?, ?)
        ON DUPLICATE KEY UPDATE
          is_verified = TRUE, verification_level = VALUES(verification_level),
          verification_date = CURDATE(), expiry_date = VALUES(expiry_date),
          verification_application_id = VALUES(verification_application_id),
          renewal_reminder_sent = FALSE
      `, [artist_id, verification_level, expiryDate.toISOString().split('T')[0], applicationId]);

      // Add verified permission to user
      await db.execute(`
        INSERT INTO user_permissions (user_id, verified) VALUES (?, TRUE)
        ON DUPLICATE KEY UPDATE verified = TRUE
      `, [artist_id]);

      await db.execute('COMMIT');

      res.json({ message: 'Verification application approved successfully' });
    } catch (error) {
      await db.execute('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error approving verification application:', error);
    res.status(500).json({ error: 'Failed to approve verification application' });
  }
});

// Reject verification application (admin only)
router.post('/admin/applications/:id/reject', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const applicationId = req.params.id;
    const reviewerId = req.userId;
    const { reviewer_notes } = req.body;

    if (!reviewer_notes) {
      return res.status(400).json({ error: 'Reviewer notes are required for rejection' });
    }

    await db.execute(`
      UPDATE artist_verification_applications 
      SET status = 'rejected', reviewer_id = ?, reviewer_notes = ?
      WHERE id = ? AND status IN ('submitted', 'under_review')
    `, [reviewerId, reviewer_notes, applicationId]);

    res.json({ message: 'Verification application rejected' });
  } catch (error) {
    console.error('Error rejecting verification application:', error);
    res.status(500).json({ error: 'Failed to reject verification application' });
  }
});

// Request revision on verification application (admin only)
router.post('/admin/applications/:id/request-revision', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const applicationId = req.params.id;
    const reviewerId = req.userId;
    const { revision_requested_notes } = req.body;

    if (!revision_requested_notes) {
      return res.status(400).json({ error: 'Revision notes are required' });
    }

    await db.execute(`
      UPDATE artist_verification_applications 
      SET status = 'revision_requested', reviewer_id = ?, revision_requested_notes = ?
      WHERE id = ? AND status IN ('submitted', 'under_review')
    `, [reviewerId, revision_requested_notes, applicationId]);

    res.json({ message: 'Revision requested successfully' });
  } catch (error) {
    console.error('Error requesting revision:', error);
    res.status(500).json({ error: 'Failed to request revision' });
  }
});

// Assign application for review (admin only)
router.post('/admin/applications/:id/assign', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const applicationId = req.params.id;
    const reviewerId = req.userId;

    await db.execute(`
      UPDATE artist_verification_applications 
      SET status = 'under_review', reviewer_id = ?
      WHERE id = ? AND status = 'submitted'
    `, [reviewerId, applicationId]);

    res.json({ message: 'Application assigned for review' });
  } catch (error) {
    console.error('Error assigning application:', error);
    res.status(500).json({ error: 'Failed to assign application' });
  }
});

module.exports = router; 