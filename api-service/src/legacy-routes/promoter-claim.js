const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const EmailService = require('../services/emailService');

/**
 * @fileoverview Promoter Claim Routes (Public)
 * 
 * Public endpoints for promoters to claim their accounts and events
 * These do NOT require authentication (claim token is the auth)
 */

const emailService = new EmailService();

// ============================================================================
// VERIFY CLAIM TOKEN
// ============================================================================

/**
 * Verify claim token and return event details
 * @route GET /api/promoters/verify-claim/:token
 * @access Public (token is auth)
 * @param {string} req.params.token - Claim token
 * @returns {Object} Event and promoter details
 */
router.get('/verify-claim/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Token is required', valid: false });
    }

    // Find and validate token
    const [tokenData] = await db.execute(`
      SELECT 
        pct.id as token_id,
        pct.expires_at,
        pct.claimed,
        e.id as event_id,
        e.title as event_title,
        e.start_date as event_start_date,
        e.end_date as event_end_date,
        e.venue_name,
        e.venue_city,
        e.venue_state,
        e.description as event_description,
        u.id as user_id,
        u.username as promoter_email,
        CONCAT(up.first_name, ' ', up.last_name) as promoter_name,
        up.first_name as promoter_first_name,
        up.last_name as promoter_last_name,
        pp.business_name as promoter_business_name
      FROM promoter_claim_tokens pct
      JOIN users u ON pct.user_id = u.id
      JOIN events e ON pct.event_id = e.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN promoter_profiles pp ON u.id = pp.user_id
      WHERE pct.token = ? AND pct.claimed = 0 AND pct.expires_at > NOW()
    `, [token]);

    if (tokenData.length === 0) {
      return res.status(404).json({
        error: 'Invalid or expired claim token',
        valid: false,
        expired: true
      });
    }

    const data = tokenData[0];

    res.json({
      valid: true,
      event_id: data.event_id,
      event_title: data.event_title,
      event_start_date: data.event_start_date,
      event_end_date: data.event_end_date,
      venue_name: data.venue_name,
      venue_city: data.venue_city,
      venue_state: data.venue_state,
      event_description: data.event_description,
      promoter_email: data.promoter_email,
      promoter_name: data.promoter_name,
      promoter_first_name: data.promoter_first_name,
      promoter_last_name: data.promoter_last_name,
      promoter_business_name: data.promoter_business_name
    });

  } catch (error) {
    console.error('Error verifying claim token:', error);
    res.status(500).json({ error: 'Internal server error', valid: false });
  }
});

// ============================================================================
// CLAIM ACCOUNT & EVENT
// ============================================================================

/**
 * Claim promoter account and event
 * User creates Firebase account on frontend, this endpoint activates database account
 * @route POST /api/promoters/claim/:token
 * @access Public (token is auth)
 * @param {string} req.params.token - Claim token
 * @param {string} req.body.firebase_uid - Firebase UID from frontend signup
 * @returns {Object} Success message
 */
router.post('/claim/:token', async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { token } = req.params;
    const { firebase_uid } = req.body;

    if (!token || !firebase_uid) {
      await connection.rollback();
      return res.status(400).json({ error: 'Token and Firebase UID are required' });
    }

    // Validate token and get event/user data
    const [tokenData] = await connection.execute(`
      SELECT 
        pct.id as token_id,
        pct.user_id,
        pct.event_id,
        pct.claimed,
        u.username as email,
        COALESCE(CONCAT(up.first_name, ' ', up.last_name), u.username) as full_name,
        COALESCE(up.first_name, SUBSTRING_INDEX(u.username, '@', 1)) as first_name,
        e.title as event_title
      FROM promoter_claim_tokens pct
      JOIN users u ON pct.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      JOIN events e ON pct.event_id = e.id
      WHERE pct.token = ? AND pct.claimed = 0 AND pct.expires_at > NOW()
      FOR UPDATE
    `, [token]);

    if (tokenData.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Invalid or expired claim token' });
    }

    const data = tokenData[0];

    // Update user status in database and link to Firebase UID
    await connection.execute(`
      UPDATE users
      SET status = 'active', email_verified = 'yes', email_confirmed = 1, google_uid = ?
      WHERE id = ?
    `, [firebase_uid, data.user_id]);

    // Update event claim status
    await connection.execute(`
      UPDATE events
      SET claim_status = 'claimed'
      WHERE id = ?
    `, [data.event_id]);

    // Mark token as claimed
    await connection.execute(`
      UPDATE promoter_claim_tokens
      SET claimed = 1, claimed_at = NOW()
      WHERE id = ?
    `, [data.token_id]);

    // Enroll user in onboarding campaign
    try {
      const [campaign] = await connection.execute(
        'SELECT id FROM onboarding_campaigns WHERE is_active = 1 LIMIT 1'
      );

      if (campaign.length > 0) {
        await connection.execute(`
          INSERT INTO user_campaign_enrollments (user_id, campaign_id, enrolled_at, current_step)
          VALUES (?, ?, NOW(), 0)
        `, [data.user_id, campaign[0].id]);
      }
    } catch (enrollError) {
      console.error('Campaign enrollment error:', enrollError);
      // Don't fail the transaction if enrollment fails
    }

    await connection.commit();

    // Send welcome email (Day 0 of drip campaign)
    try {
      const templateData = {
        promoter_name: data.full_name,
        promoter_first_name: data.first_name,
        event_title: data.event_title,
        event_edit_url: `${process.env.FRONTEND_URL}/events/new?edit_event_id=${data.event_id}`,
        help_url: `${process.env.FRONTEND_URL}/help/promoter-guide`
      };

      await emailService.sendEmail(
        data.user_id,
        'onboarding_welcome',
        templateData
      );
    } catch (emailError) {
      console.error('Welcome email error:', emailError);
      // Don't fail the request if email fails
    }

    res.json({
      message: 'Account activated successfully',
      user_id: data.user_id,
      event_id: data.event_id,
      redirect_url: `/events/new?edit_event_id=${data.event_id}`
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error claiming account:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  } finally {
    connection.release();
  }
});

module.exports = router;

