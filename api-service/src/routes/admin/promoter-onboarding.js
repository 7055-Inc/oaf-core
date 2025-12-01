const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const crypto = require('crypto');
const verifyToken = require('../../middleware/jwt');
const { requirePermission } = require('../../middleware/permissions');
const EmailService = require('../../services/emailService');

/**
 * @fileoverview Promoter Onboarding Routes
 * 
 * Handles admin-initiated promoter account creation and event claiming:
 * - Create draft promoter users with events
 * - Generate and send claim tokens
 * - Manage unclaimed events
 * - Resend claim emails
 * 
 * All endpoints require 'manage_system' permission.
 */

const emailService = new EmailService();

// ============================================================================
// CHECK EMAIL EXISTS
// ============================================================================

/**
 * Check if promoter email already exists
 * @route GET /api/admin/promoters/check-email
 * @access Private (requires manage_system permission)
 * @param {string} req.query.email - Email to check
 * @returns {Object} {exists: boolean, user_id?: number}
 */
router.get('/check-email', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const [existing] = await db.execute(
      'SELECT id, username, user_type, status FROM users WHERE username = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.json({
        exists: true,
        user_id: existing[0].id,
        user_type: existing[0].user_type,
        status: existing[0].status
      });
    }

    res.json({ exists: false });
  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// CREATE DRAFT PROMOTER & EVENT
// ============================================================================

/**
 * Create draft promoter user and event, send claim email
 * @route POST /api/admin/promoters/create
 * @access Private (requires manage_system permission)
 * @param {Object} req.body - Promoter and event data
 * @returns {Object} Created user and event details
 */
router.post('/create', verifyToken, requirePermission('manage_system'), async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const adminId = req.userId;
    const {
      promoter_email,
      promoter_first_name,
      promoter_last_name,
      promoter_business_name,
      event_title,
      event_start_date,
      event_end_date,
      venue_name,
      venue_address,
      venue_city,
      venue_state,
      venue_zip,
      event_description
    } = req.body;

    // Validate required fields
    if (!promoter_email || !promoter_first_name || !promoter_last_name ||
        !event_title || !event_start_date || !event_end_date) {
      await connection.rollback();
      return res.status(400).json({ 
        error: 'Missing required fields: email, first name, last name, event title, and dates are required' 
      });
    }

    // Check if user already exists
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE username = ?',
      [promoter_email]
    );

    if (existingUser.length > 0) {
      await connection.rollback();
      return res.status(409).json({ 
        error: 'A user with this email already exists',
        user_id: existingUser[0].id
      });
    }

    // Create draft user in database (Firebase account will be created by user during claim)
    const [userResult] = await connection.execute(`
      INSERT INTO users (
        username, user_type, status, email_verified, 
        created_by_admin_id, email_confirmed
      ) VALUES (?, 'promoter', 'draft', 'no', ?, 0)
    `, [promoter_email, adminId]);

    const userId = userResult.insertId;

    // Create user profile
    await connection.execute(`
      INSERT INTO user_profiles (
        user_id, first_name, last_name
      ) VALUES (?, ?, ?)
    `, [userId, promoter_first_name, promoter_last_name]);

    // Create promoter profile
    await connection.execute(`
      INSERT INTO promoter_profiles (
        user_id, business_name
      ) VALUES (?, ?)
    `, [userId, promoter_business_name || null]);

    // Grant events permission to promoter
    await connection.execute(`
      INSERT INTO user_permissions (user_id, events)
      VALUES (?, 1)
    `, [userId]);

    // Create draft event
    const [eventResult] = await connection.execute(`
      INSERT INTO events (
        promoter_id, event_type_id, title, description,
        start_date, end_date,
        venue_name, venue_address, venue_city, venue_state, venue_zip,
        venue_country, event_status, claim_status,
        allow_applications, application_status,
        created_by, updated_by, created_by_admin_id
      ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USA', 'draft', 'pending_claim', 0, 'not_accepting', ?, ?, ?)
    `, [
      userId,
      event_title,
      event_description || null,
      event_start_date,
      event_end_date,
      venue_name || null,
      venue_address || null,
      venue_city || null,
      venue_state || null,
      venue_zip || null,
      adminId,
      adminId,
      adminId
    ]);

    const eventId = eventResult.insertId;

    // Generate claim token (valid for 6 months)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6);

    await connection.execute(`
      INSERT INTO promoter_claim_tokens (
        user_id, event_id, token, promoter_email, 
        expires_at, created_by_admin_id
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, eventId, token, promoter_email, expiresAt, adminId]);

    await connection.commit();

    // Send claim email
    try {
      const claimUrl = `${process.env.FRONTEND_URL}/promoters/claim/${token}`;

      const templateData = {
        promoter_name: `${promoter_first_name} ${promoter_last_name}`,
        promoter_first_name,
        event_title,
        event_start_date: new Date(event_start_date).toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric'
        }),
        event_end_date: new Date(event_end_date).toLocaleDateString('en-US', {
          month: 'long', day: 'numeric', year: 'numeric'
        }),
        venue_name: venue_name || 'TBD',
        venue_city: venue_city || '',
        venue_state: venue_state || '',
        claim_url: claimUrl,
        expires_days: 180
      };

      await emailService.sendExternalEmail(
        promoter_email,
        'promoter_claim_invitation',
        templateData
      );
    } catch (emailError) {
      console.error('Failed to send claim email:', emailError);
      // Don't fail the request if email fails - admin can resend
    }

    res.status(201).json({
      message: 'Promoter and event created successfully',
      user_id: userId,
      event_id: eventId,
      claim_token: token
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error creating promoter:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message
    });
  } finally {
    connection.release();
  }
});

// ============================================================================
// GET UNCLAIMED EVENTS
// ============================================================================

/**
 * Get list of unclaimed events
 * @route GET /api/admin/promoters/unclaimed-events
 * @access Private (requires manage_system permission)
 * @returns {Array} List of unclaimed events with promoter details
 */
router.get('/unclaimed-events', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const [events] = await db.execute(`
      SELECT 
        e.id as event_id,
        e.title as event_title,
        e.start_date as event_start_date,
        e.end_date as event_end_date,
        e.venue_name,
        e.venue_city,
        e.venue_state,
        e.created_at,
        u.id as user_id,
        u.username as promoter_email,
        CONCAT(up.first_name, ' ', up.last_name) as promoter_name,
        pct.token,
        pct.expires_at,
        admin_user.username as created_by_admin_email
      FROM events e
      JOIN users u ON e.promoter_id = u.id
      JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN promoter_claim_tokens pct ON e.id = pct.event_id AND pct.claimed = 0
      LEFT JOIN users admin_user ON e.created_by_admin_id = admin_user.id
      WHERE e.claim_status = 'pending_claim'
        AND u.status = 'draft'
      ORDER BY e.created_at DESC
    `);

    res.json(events);
  } catch (error) {
    console.error('Error fetching unclaimed events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================================================
// RESEND CLAIM EMAIL
// ============================================================================

/**
 * Resend claim email for an event
 * @route POST /api/admin/promoters/resend-claim
 * @access Private (requires manage_system permission)
 * @param {number} req.body.event_id - Event ID
 * @returns {Object} Success message
 */
router.post('/resend-claim', verifyToken, requirePermission('manage_system'), async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { event_id } = req.body;

    if (!event_id) {
      await connection.rollback();
      return res.status(400).json({ error: 'Event ID is required' });
    }

    // Get event and promoter details
    const [eventData] = await connection.execute(`
      SELECT 
        e.id as event_id,
        e.title as event_title,
        e.start_date,
        e.end_date,
        e.venue_name,
        e.venue_city,
        e.venue_state,
        u.id as user_id,
        u.username as promoter_email,
        up.first_name,
        up.last_name,
        pct.id as token_id,
        pct.token
      FROM events e
      JOIN users u ON e.promoter_id = u.id
      JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN promoter_claim_tokens pct ON e.id = pct.event_id AND pct.claimed = 0
      WHERE e.id = ? AND e.claim_status = 'pending_claim'
      FOR UPDATE
    `, [event_id]);

    if (eventData.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Event not found or already claimed' });
    }

    const event = eventData[0];
    let token = event.token;

    // If no unclaimed token exists, generate a new one
    if (!token) {
      token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 6);

      await connection.execute(`
        INSERT INTO promoter_claim_tokens (
          user_id, event_id, token, promoter_email,
          expires_at, created_by_admin_id
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [event.user_id, event_id, token, event.promoter_email, expiresAt, req.userId]);
    }

    await connection.commit();

    // Send claim email
    const claimUrl = `${process.env.FRONTEND_URL}/promoters/claim/${token}`;

    const templateData = {
      promoter_name: `${event.first_name} ${event.last_name}`,
      promoter_first_name: event.first_name,
      event_title: event.event_title,
      event_start_date: new Date(event.start_date).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      }),
      event_end_date: new Date(event.end_date).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      }),
      venue_name: event.venue_name || 'TBD',
      venue_city: event.venue_city || '',
      venue_state: event.venue_state || '',
      claim_url: claimUrl,
      expires_days: 180
    };

    await emailService.sendExternalEmail(
      event.promoter_email,
      'promoter_claim_invitation',
      templateData
    );

    res.json({ message: 'Claim email resent successfully' });

  } catch (error) {
    await connection.rollback();
    console.error('Error resending claim email:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

// ============================================================================
// DELETE UNCLAIMED EVENT
// ============================================================================

/**
 * Delete unclaimed event and draft promoter
 * @route DELETE /api/admin/promoters/unclaimed-events/:event_id
 * @access Private (requires manage_system permission)
 * @param {number} req.params.event_id - Event ID
 * @returns {Object} Success message
 */
router.delete('/unclaimed-events/:event_id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const { event_id } = req.params;

    // Get event and user details
    const [eventData] = await connection.execute(`
      SELECT e.id, e.promoter_id, u.status
      FROM events e
      JOIN users u ON e.promoter_id = u.id
      WHERE e.id = ? AND e.claim_status = 'pending_claim' AND u.status = 'draft'
      FOR UPDATE
    `, [event_id]);

    if (eventData.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Event not found or already claimed' });
    }

    const event = eventData[0];

    // Delete claim tokens
    await connection.execute(
      'DELETE FROM promoter_claim_tokens WHERE event_id = ?',
      [event_id]
    );

    // Delete event (CASCADE will handle related records)
    await connection.execute(
      'DELETE FROM events WHERE id = ?',
      [event_id]
    );

    // Delete user profiles
    await connection.execute(
      'DELETE FROM user_profiles WHERE user_id = ?',
      [event.promoter_id]
    );

    await connection.execute(
      'DELETE FROM promoter_profiles WHERE user_id = ?',
      [event.promoter_id]
    );

    // Delete user
    await connection.execute(
      'DELETE FROM users WHERE id = ?',
      [event.promoter_id]
    );

    await connection.commit();

    res.json({ message: 'Event and draft promoter deleted successfully' });

  } catch (error) {
    await connection.rollback();
    console.error('Error deleting unclaimed event:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

module.exports = router;

