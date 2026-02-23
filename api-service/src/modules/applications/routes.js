/**
 * Applications Module Routes - v2
 * RESTful API endpoints for artist event applications
 */

const express = require('express');
const router = express.Router();

// Auth middleware
const { requireAuth, requireRole } = require('../auth');

// Services
const applicationsService = require('./services');

// ============================================================================
// ADMIN: ALL APPLICATIONS (must be before /:id)
// ============================================================================

/**
 * GET /api/v2/applications/admin/all
 * Get all applications (admin only), with sort, search, filter, pagination
 */
router.get('/admin/all', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const { status, search, sort, order, limit, offset } = req.query;
    const result = await applicationsService.getAllApplicationsAdmin({
      status,
      search,
      sort: sort || 'submitted_at',
      order: order || 'desc',
      limit: limit || 50,
      offset: offset || 0
    });
    res.json({
      success: true,
      data: result.applications,
      pagination: { total: result.total, limit: parseInt(limit, 10) || 50, offset: parseInt(offset, 10) || 0 }
    });
  } catch (error) {
    console.error('Error fetching admin applications:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * GET /api/v2/applications/admin/:id
 * Get single application full detail (admin only)
 */
router.get('/admin/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const application = await applicationsService.getApplicationByIdAdmin(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });
    }
    res.json({ success: true, data: application });
  } catch (error) {
    console.error('Error fetching admin application detail:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ============================================================================
// ARTIST APPLICATIONS
// ============================================================================

/**
 * GET /api/v2/applications/mine
 * Get current user's applications (artist)
 */
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const { status } = req.query;
    const applications = await applicationsService.getArtistApplications(req.userId, { status });
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('Error fetching artist applications:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * GET /api/v2/applications/stats
 * Get application statistics for current user
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const stats = await applicationsService.getApplicationStats(req.userId);
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching application stats:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * GET /api/v2/applications/:id
 * Get single application details
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const application = await applicationsService.getApplicationById(req.params.id, req.userId);
    if (!application) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });
    }
    res.json({ success: true, data: application });
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/v2/applications/:id
 * Delete a draft application
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await applicationsService.deleteApplication(req.params.id, req.userId);
    res.json({ success: true, message: 'Application deleted' });
  } catch (error) {
    console.error('Error deleting application:', error);
    const status = error.message.includes('not found') ? 404 : 
                   error.message.includes('Only draft') ? 400 : 500;
    res.status(status).json({ success: false, error: { code: 'DELETE_FAILED', message: error.message } });
  }
});

// ============================================================================
// DB for direct SQL in ported endpoints
// ============================================================================
const db = require('../../../config/db');

// ============================================================================
// EVENT APPLICATION ENDPOINTS (public + artist)
// ============================================================================

router.get('/events/:eventId/stats', async (req, res) => {
  try {
    const { eventId } = req.params;
    const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total_applications,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review,
        SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN status = 'waitlisted' THEN 1 ELSE 0 END) as waitlisted,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed
      FROM event_applications WHERE event_id = ?
    `, [eventId]);
    res.json({ success: true, data: stats[0] || { total_applications: 0, submitted: 0, under_review: 0, accepted: 0, rejected: 0, waitlisted: 0, confirmed: 0 } });
  } catch (error) {
    console.error('Error fetching event application stats:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.post('/events/:eventId/apply', requireAuth, async (req, res) => {
  try {
    const artistId = req.userId;
    const eventId = req.params.eventId;
    const { artist_statement = '', portfolio_url = '', additional_info = '', additional_notes = '', persona_id = null } = req.body;

    const [event] = await db.execute(
      'SELECT id, title, allow_applications, application_status, application_fee, jury_fee FROM events WHERE id = ?',
      [eventId]
    );
    if (event.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } });
    if (!event[0].allow_applications || event[0].application_status !== 'accepting') {
      return res.status(400).json({ success: false, error: { code: 'NOT_ACCEPTING', message: 'Event is not accepting applications' } });
    }

    const [existingApp] = await db.execute(
      'SELECT id, status, payment_status FROM event_applications WHERE event_id = ? AND artist_id = ? AND (persona_id = ? OR (persona_id IS NULL AND ? IS NULL))',
      [eventId, artistId, persona_id, persona_id]
    );
    if (existingApp.length > 0) {
      const existing = existingApp[0];
      if (existing.status === 'draft' && existing.payment_status === 'pending') {
        return res.status(400).json({ success: false, error: { code: 'DRAFT_EXISTS', message: 'You have a saved application for this event. Complete payment to submit it.' }, existing_application_id: existing.id, needs_payment: true });
      }
      return res.status(400).json({ success: false, error: { code: 'ALREADY_APPLIED', message: 'You have already applied to this event.' }, existing_application_id: existing.id });
    }

    if (persona_id) {
      const [personaCheck] = await db.execute('SELECT id FROM artist_personas WHERE id = ? AND artist_id = ? AND is_active = 1', [persona_id, artistId]);
      if (personaCheck.length === 0) return res.status(400).json({ success: false, error: { code: 'INVALID_PERSONA', message: 'Invalid persona selected' } });
    }

    const applicationFee = parseFloat(event[0].application_fee) || 0;
    const juryFee = parseFloat(event[0].jury_fee) || 0;
    const totalFees = applicationFee + juryFee;
    const hasFees = totalFees > 0;
    const initialStatus = hasFees ? 'draft' : 'submitted';
    const paymentStatus = hasFees ? 'pending' : 'not_required';

    const [result] = await db.execute(
      `INSERT INTO event_applications (event_id, artist_id, status, payment_status, artist_statement, portfolio_url, additional_info, additional_notes, persona_id, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [eventId, artistId, initialStatus, paymentStatus, artist_statement, portfolio_url, additional_info, additional_notes, persona_id, hasFees ? null : new Date()]
    );

    res.json({
      success: true,
      data: { id: result.insertId, event_id: eventId, status: initialStatus, payment_status: paymentStatus, submitted_at: hasFees ? null : new Date().toISOString() },
      message: hasFees ? 'Application created. Payment required to submit.' : 'Application submitted successfully',
      requires_payment: hasFees,
      fees: hasFees ? { application_fee: applicationFee, jury_fee: juryFee, total: totalFees } : null
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.post('/apply-with-packet', requireAuth, async (req, res) => {
  try {
    const artistId = req.userId;
    const { event_id, packet_id, additional_info = '', additional_notes = '' } = req.body;
    if (!event_id || !packet_id) return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Event ID and Packet ID are required' } });

    const [packet] = await db.execute('SELECT * FROM artist_jury_packets WHERE id = ? AND artist_id = ?', [packet_id, artistId]);
    if (packet.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Jury packet not found' } });

    const [event] = await db.execute('SELECT id, title, allow_applications, application_status, application_fee, jury_fee FROM events WHERE id = ?', [event_id]);
    if (event.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } });
    if (!event[0].allow_applications || event[0].application_status !== 'accepting') {
      return res.status(400).json({ success: false, error: { code: 'NOT_ACCEPTING', message: 'Event is not accepting applications' } });
    }

    const packetData = JSON.parse(packet[0].packet_data || '{}');
    const packetPersonaId = packet[0].persona_id;

    const [existingApp] = await db.execute(
      'SELECT id, status, payment_status FROM event_applications WHERE event_id = ? AND artist_id = ? AND (persona_id = ? OR (persona_id IS NULL AND ? IS NULL))',
      [event_id, artistId, packetPersonaId, packetPersonaId]
    );
    if (existingApp.length > 0) {
      const existing = existingApp[0];
      if (existing.status === 'draft' && existing.payment_status === 'pending') {
        return res.status(400).json({ success: false, error: { code: 'DRAFT_EXISTS', message: 'You have a saved application. Complete payment to submit.' }, existing_application_id: existing.id, needs_payment: true });
      }
      return res.status(400).json({ success: false, error: { code: 'ALREADY_APPLIED', message: 'Already applied with this persona.' }, existing_application_id: existing.id });
    }

    const applicationFee = parseFloat(event[0].application_fee) || 0;
    const juryFee = parseFloat(event[0].jury_fee) || 0;
    const totalFees = applicationFee + juryFee;
    const hasFees = totalFees > 0;
    const initialStatus = hasFees ? 'draft' : 'submitted';
    const paymentStatus = hasFees ? 'pending' : 'not_required';

    const [result] = await db.execute(
      `INSERT INTO event_applications (event_id, artist_id, status, payment_status, artist_statement, portfolio_url, additional_info, additional_notes, persona_id, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [event_id, artistId, initialStatus, paymentStatus, packetData.artist_statement || '', packetData.portfolio_url || '', additional_info, additional_notes, packet[0].persona_id, hasFees ? null : new Date()]
    );

    const applicationId = result.insertId;
    if (packetData.field_responses) {
      for (const [fieldId, response] of Object.entries(packetData.field_responses)) {
        try {
          await db.execute('INSERT INTO application_field_responses (application_id, field_id, response_value, file_url) VALUES (?, ?, ?, ?)',
            [applicationId, parseInt(fieldId), response.response_value || null, response.file_url || null]);
        } catch (fieldError) { console.error(`Error copying field response ${fieldId}:`, fieldError); }
      }
    }

    res.json({
      success: true,
      data: { id: applicationId, event_id, status: initialStatus, payment_status: paymentStatus },
      message: hasFees ? 'Application created. Payment required to submit.' : 'Application submitted using jury packet',
      packet_used: packet[0].packet_name,
      requires_payment: hasFees,
      fees: hasFees ? { application_fee: applicationFee, jury_fee: juryFee, total: totalFees } : null
    });
  } catch (error) {
    console.error('Error applying with packet:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.patch('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const artistId = req.userId;
    const { artist_statement, additional_info, additional_notes } = req.body;

    const [application] = await db.execute(
      'SELECT ea.*, e.application_deadline FROM event_applications ea JOIN events e ON ea.event_id = e.id WHERE ea.id = ?', [id]
    );
    if (application.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });
    if (application[0].artist_id !== artistId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    if (application[0].application_deadline && new Date(application[0].application_deadline) < new Date()) {
      return res.status(400).json({ success: false, error: { code: 'DEADLINE_PASSED', message: 'Application deadline has passed' } });
    }

    await db.execute(
      'UPDATE event_applications SET artist_statement = COALESCE(?, artist_statement), additional_info = COALESCE(?, additional_info), additional_notes = COALESCE(?, additional_notes), updated_at = NOW() WHERE id = ?',
      [artist_statement, additional_info, additional_notes, id]
    );
    res.json({ success: true, message: 'Application updated' });
  } catch (error) {
    console.error('Error updating application:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.post('/:id/addon-requests', requireAuth, async (req, res) => {
  try {
    const applicationId = req.params.id;
    const { available_addon_id, requested, notes } = req.body;

    const [appCheck] = await db.execute('SELECT artist_id FROM event_applications WHERE id = ?', [applicationId]);
    if (appCheck.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });
    if (appCheck[0].artist_id !== req.userId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });

    await db.execute(
      'INSERT INTO application_addon_requests (application_id, available_addon_id, requested, notes) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE requested = VALUES(requested), notes = VALUES(notes)',
      [applicationId, available_addon_id, requested, notes]
    );
    res.json({ success: true, message: 'Add-on request saved' });
  } catch (error) {
    console.error('Error saving add-on request:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.post('/:id/create-payment-intent', requireAuth, async (req, res) => {
  try {
    const applicationId = req.params.id;
    const artistId = req.userId;
    const stripeService = require('../../../services/stripeService');

    const [apps] = await db.execute(
      'SELECT ea.*, e.application_fee, e.jury_fee, e.promoter_id, e.title as event_title FROM event_applications ea JOIN events e ON ea.event_id = e.id WHERE ea.id = ? AND ea.artist_id = ?',
      [applicationId, artistId]
    );
    if (apps.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });

    const app = apps[0];
    if (app.payment_status === 'paid') return res.status(400).json({ success: false, error: { code: 'ALREADY_PAID', message: 'Already paid' } });

    const applicationFee = parseFloat(app.application_fee) || 0;
    const juryFee = parseFloat(app.jury_fee) || 0;
    const totalAmount = applicationFee + juryFee;
    if (totalAmount <= 0) return res.status(400).json({ success: false, error: { code: 'NO_FEES', message: 'No fees required' } });

    const platformFee = Math.round(totalAmount * 0.05 * 100) / 100;
    const promoterAmount = totalAmount - platformFee;

    const paymentIntent = await stripeService.stripe.paymentIntents.create({
      amount: Math.round(totalAmount * 100),
      currency: 'usd',
      metadata: { payment_type: 'application_fee', application_id: applicationId.toString(), event_id: app.event_id.toString(), artist_id: artistId.toString(), promoter_id: app.promoter_id.toString() },
      automatic_payment_methods: { enabled: true }
    });

    await db.execute(
      'INSERT INTO application_fee_payments (application_id, event_id, artist_id, promoter_id, amount_total, application_fee, jury_fee, platform_fee, promoter_amount, stripe_payment_intent_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [applicationId, app.event_id, artistId, app.promoter_id, totalAmount, applicationFee, juryFee, platformFee, promoterAmount, paymentIntent.id, 'pending']
    );
    await db.execute('UPDATE event_applications SET payment_status = ? WHERE id = ?', ['processing', applicationId]);

    res.json({ success: true, data: { client_secret: paymentIntent.client_secret, amount: totalAmount, event_title: app.event_title } });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.post('/:id/confirm-payment', requireAuth, async (req, res) => {
  try {
    const applicationId = req.params.id;
    const artistId = req.userId;
    const { payment_intent_id } = req.body;
    const stripeService = require('../../../services/stripeService');

    if (!payment_intent_id) return res.status(400).json({ success: false, error: { code: 'MISSING_FIELD', message: 'Payment intent ID required' } });

    const [apps] = await db.execute(
      'SELECT ea.*, e.promoter_id, vs.stripe_account_id as promoter_stripe FROM event_applications ea JOIN events e ON ea.event_id = e.id LEFT JOIN vendor_settings vs ON e.promoter_id = vs.vendor_id WHERE ea.id = ? AND ea.artist_id = ?',
      [applicationId, artistId]
    );
    if (apps.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });

    const paymentIntent = await stripeService.stripe.paymentIntents.retrieve(payment_intent_id);
    if (paymentIntent.status !== 'succeeded') return res.status(400).json({ success: false, error: { code: 'PAYMENT_INCOMPLETE', message: 'Payment not completed' } });

    const [payments] = await db.execute('SELECT * FROM application_fee_payments WHERE application_id = ? AND stripe_payment_intent_id = ?', [applicationId, payment_intent_id]);
    if (payments.length === 0) return res.status(400).json({ success: false, error: { code: 'NO_RECORD', message: 'Payment record not found' } });

    let transferId = null;
    if (apps[0].promoter_stripe) {
      try {
        const charges = await stripeService.stripe.charges.list({ payment_intent: payment_intent_id, limit: 1 });
        if (charges.data.length > 0) {
          const transfer = await stripeService.stripe.transfers.create({ amount: Math.round(payments[0].promoter_amount * 100), currency: 'usd', destination: apps[0].promoter_stripe, source_transaction: charges.data[0].id });
          transferId = transfer.id;
        }
      } catch (transferErr) { console.error('Transfer failed:', transferErr.message); }
    }

    await db.execute('UPDATE application_fee_payments SET status = ?, payment_date = NOW(), stripe_transfer_id = ? WHERE id = ?', ['succeeded', transferId, payments[0].id]);
    await db.execute('UPDATE event_applications SET payment_status = ?, status = ?, submitted_at = NOW() WHERE id = ?', ['paid', 'submitted', applicationId]);

    res.json({ success: true, data: { status: 'submitted' } });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ============================================================================
// PROMOTER ENDPOINTS
// ============================================================================

router.get('/events/:eventId/applications', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const promoterId = req.userId;
    const { status } = req.query;

    const [event] = await db.execute('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
    if (event.length === 0 || event[0].promoter_id !== promoterId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });

    let query = `SELECT ea.*, up.first_name as artist_first_name, up.last_name as artist_last_name, CONCAT(up.first_name, ' ', up.last_name) as artist_name, u.username as artist_email, u.username as email, up.phone, ap.business_name as artist_business_name, ap.business_name as company_name, ap.art_categories, ap.art_mediums, ea.submitted_at as applied_date FROM event_applications ea JOIN users u ON ea.artist_id = u.id JOIN user_profiles up ON u.id = up.user_id LEFT JOIN artist_profiles ap ON u.id = ap.user_id WHERE ea.event_id = ?`;
    const params = [eventId];
    if (status) { query += ' AND ea.status = ?'; params.push(status); }
    query += ' ORDER BY ea.submitted_at ASC';

    const [applications] = await db.execute(query, params);
    res.json({ success: true, data: { applications, total: applications.length } });
  } catch (error) {
    console.error('Error fetching event applications:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.put('/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const promoterId = req.userId;
    const { status, jury_comments } = req.body;

    const [application] = await db.execute('SELECT ea.*, e.promoter_id FROM event_applications ea JOIN events e ON ea.event_id = e.id WHERE ea.id = ?', [id]);
    if (application.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });
    if (application[0].promoter_id !== promoterId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });

    const validStatuses = ['under_review', 'accepted', 'rejected', 'waitlisted'];
    if (!validStatuses.includes(status)) return res.status(400).json({ success: false, error: { code: 'INVALID_STATUS', message: 'Invalid status' } });

    await db.execute('UPDATE event_applications SET status = ?, jury_comments = ?, jury_reviewed_by = ?, jury_reviewed_at = NOW(), updated_at = NOW() WHERE id = ?', [status, jury_comments || null, promoterId, id]);

    const [updatedApp] = await db.execute('SELECT ea.*, e.title as event_title FROM event_applications ea JOIN events e ON ea.event_id = e.id WHERE ea.id = ?', [id]);
    res.json({ success: true, data: updatedApp[0] });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.put('/:id/bulk-accept', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const promoterId = req.userId;
    const { booth_fee, jury_comments, event_id } = req.body;

    const [verification] = await db.execute('SELECT ea.*, e.promoter_id FROM event_applications ea JOIN events e ON ea.event_id = e.id WHERE ea.id = ?', [id]);
    if (verification.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });
    if (verification[0].promoter_id !== promoterId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });

    await db.execute('UPDATE event_applications SET status = ?, booth_fee_amount = ?, jury_comments = ?, jury_reviewed_by = ?, jury_reviewed_at = NOW(), updated_at = NOW() WHERE id = ?',
      ['accepted', booth_fee || 0, jury_comments || null, promoterId, id]);

    res.json({ success: true, data: { application_id: parseInt(id), status: 'accepted' } });
  } catch (error) {
    console.error('Error in bulk accept:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ============================================================================
// PAYMENT DASHBOARD + PAYMENT INTENT ENDPOINTS
// ============================================================================

router.get('/payment-intent/:paymentIntentId', requireAuth, async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const userId = req.userId;

    const [paymentData] = await db.execute(`
      SELECT ea.id as application_id, ea.artist_id, ea.booth_fee_amount, ea.booth_fee_due_date, ea.due_date_timezone, e.id as event_id, e.title as event_title, e.start_date as event_start_date, e.end_date as event_end_date, e.venue_name as event_venue_name, e.venue_city as event_venue_city, e.venue_state as event_venue_state, up.first_name as artist_first_name, up.last_name as artist_last_name, u.username as artist_email, ebf.payment_intent_id, COALESCE(SUM(eba.amount), 0) as addons_total
      FROM event_booth_fees ebf
      JOIN event_applications ea ON ebf.application_id = ea.id
      JOIN events e ON ea.event_id = e.id
      JOIN users u ON ea.artist_id = u.id
      JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN event_booth_addons eba ON ea.id = eba.application_id AND eba.selected = 1
      WHERE ebf.payment_intent_id = ?
      GROUP BY ea.id
    `, [paymentIntentId]);

    if (paymentData.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Payment not found' } });
    const payment = paymentData[0];
    if (payment.artist_id !== userId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });

    const stripeService = require('../../../services/stripeService');
    const stripePaymentIntent = await stripeService.getPaymentIntent(paymentIntentId);
    const totalAmount = parseFloat(payment.booth_fee_amount) + parseFloat(payment.addons_total);

    res.json({
      success: true,
      data: {
        application_id: payment.application_id, event_id: payment.event_id, event_title: payment.event_title,
        event_start_date: payment.event_start_date, event_end_date: payment.event_end_date,
        event_venue_name: payment.event_venue_name, event_venue_city: payment.event_venue_city, event_venue_state: payment.event_venue_state,
        artist_first_name: payment.artist_first_name, artist_last_name: payment.artist_last_name, artist_email: payment.artist_email,
        booth_fee_amount: payment.booth_fee_amount, addons_total: payment.addons_total, total_amount: totalAmount,
        due_date: payment.booth_fee_due_date, due_date_timezone: payment.due_date_timezone,
        payment_intent_id: payment.payment_intent_id, client_secret: stripePaymentIntent.client_secret, payment_status: stripePaymentIntent.status
      }
    });
  } catch (error) {
    console.error('Error fetching payment intent details:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.get('/payment-dashboard/:eventId', requireAuth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const promoterId = req.userId;

    const [event] = await db.execute('SELECT promoter_id FROM events WHERE id = ?', [eventId]);
    if (event.length === 0 || event[0].promoter_id !== promoterId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });

    const [statusSummary] = await db.execute(`
      SELECT COUNT(*) as total_accepted, SUM(CASE WHEN booth_fee_paid = 1 THEN 1 ELSE 0 END) as paid_count, SUM(CASE WHEN booth_fee_paid = 0 AND booth_fee_due_date > NOW() THEN 1 ELSE 0 END) as pending_count, SUM(CASE WHEN booth_fee_paid = 0 AND booth_fee_due_date <= NOW() THEN 1 ELSE 0 END) as overdue_count, SUM(CASE WHEN booth_fee_paid = 1 THEN booth_fee_amount ELSE 0 END) as total_collected, SUM(CASE WHEN booth_fee_paid = 0 THEN booth_fee_amount ELSE 0 END) as total_outstanding
      FROM event_applications WHERE event_id = ? AND status = 'accepted'
    `, [eventId]);

    res.json({ success: true, data: { event_id: eventId, summary: statusSummary[0] } });
  } catch (error) {
    console.error('Error fetching payment dashboard:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.post('/payment-reminder', requireAuth, async (req, res) => {
  try {
    const promoterId = req.userId;
    const { application_ids, event_id } = req.body;
    if (!application_ids || !Array.isArray(application_ids)) return res.status(400).json({ success: false, error: { code: 'MISSING_FIELD', message: 'application_ids required' } });

    const [eventCheck] = await db.execute('SELECT promoter_id FROM events WHERE id = ?', [event_id]);
    if (eventCheck.length === 0 || eventCheck[0].promoter_id !== promoterId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });

    const EventEmailService = require('../../../services/eventEmailService');
    const emailService = new EventEmailService();
    const results = [];
    for (const applicationId of application_ids) {
      try {
        const result = await emailService.sendBoothFeeReminder(applicationId, 'manual');
        results.push({ application_id: applicationId, success: result.success });
      } catch (err) {
        results.push({ application_id: applicationId, success: false, error: err.message });
      }
    }

    res.json({ success: true, data: { sent: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, results } });
  } catch (error) {
    console.error('Error sending payment reminders:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

router.post('/:id/payment-received', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const promoterId = req.userId;

    const [appCheck] = await db.execute('SELECT ea.*, e.promoter_id FROM event_applications ea JOIN events e ON ea.event_id = e.id WHERE ea.id = ?', [id]);
    if (appCheck.length === 0) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Application not found' } });
    if (appCheck[0].promoter_id !== promoterId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });

    await db.execute('UPDATE event_applications SET booth_fee_paid = 1, updated_at = NOW() WHERE id = ?', [id]);
    res.json({ success: true, message: 'Payment marked as received' });
  } catch (error) {
    console.error('Error marking payment received:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

module.exports = router;
