/**
 * Events Module Routes - v2
 * RESTful API endpoints for event management
 */

const express = require('express');
const router = express.Router();
const upload = require('../../config/multer');
const db = require('../../../config/db');

// Auth middleware
const { requireAuth, requirePermission } = require('../auth');

// Services
const eventsService = require('./services');

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * GET /api/v2/events/types
 * Get all active event types
 */
router.get('/types', async (req, res) => {
  try {
    const types = await eventsService.getEventTypes();
    res.json({ success: true, data: types });
  } catch (error) {
    console.error('Error fetching event types:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ============================================================================
// PROMOTER EVENTS
// ============================================================================

/**
 * GET /api/v2/events/mine
 * Get current user's events (promoter)
 */
router.get('/mine', requireAuth, requirePermission('events'), async (req, res) => {
  try {
    const events = await eventsService.getPromoterEvents(req.userId);
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching promoter events:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * GET /api/v2/events/upcoming
 * Get upcoming (future) active events (public). For carousel, browse, sitemap.
 */
router.get('/upcoming', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const events = await eventsService.getUpcomingEvents(limit, offset);
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching upcoming events:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * GET /api/v2/events/artist/:artistId/applications
 * Get artist's event applications (public profile display)
 */
router.get('/artist/:artistId/applications', async (req, res) => {
  try {
    const applications = await eventsService.getArtistEventApplications(req.params.artistId);
    res.json({ success: true, data: applications });
  } catch (error) {
    console.error('Error fetching artist event applications:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ============================================================================
// ADMIN ROUTES
// ============================================================================

/**
 * GET /api/v2/events/admin/all
 * Get all events (admin only)
 */
router.get('/admin/all', requireAuth, async (req, res) => {
  try {
    // Check admin permission
    const [user] = await db.execute('SELECT user_type FROM users WHERE id = ?', [req.userId]);
    if (!user[0] || user[0].user_type !== 'admin') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } });
    }

    const { status, limit = 50, offset = 0, search } = req.query;
    
    const [events, total] = await Promise.all([
      eventsService.getAllEvents({ status, limit: parseInt(limit), offset: parseInt(offset), search }),
      eventsService.getEventCount({ status, search })
    ]);
    
    res.json({ 
      success: true, 
      data: events,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching all events:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ============================================================================
// JURY PACKETS (artist-owned application templates)
// ============================================================================

/**
 * GET /api/v2/events/jury-packets
 * List current user's jury packets
 */
router.get('/jury-packets', requireAuth, async (req, res) => {
  try {
    const packets = await eventsService.getJuryPackets(req.userId);
    res.json({ success: true, data: packets });
  } catch (error) {
    console.error('Error fetching jury packets:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v2/events/jury-packets
 * Create jury packet
 */
router.post('/jury-packets', requireAuth, async (req, res) => {
  try {
    const result = await eventsService.createJuryPacket(req.userId, req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    if (error.message === 'Packet name is required' || error.message === 'Invalid persona selected') {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: error.message } });
    }
    console.error('Error creating jury packet:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * GET /api/v2/events/jury-packets/:id
 * Get single jury packet
 */
router.get('/jury-packets/:id', requireAuth, async (req, res) => {
  try {
    const packet = await eventsService.getJuryPacketById(req.params.id, req.userId);
    if (!packet) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Jury packet not found' } });
    }
    res.json({ success: true, data: packet });
  } catch (error) {
    console.error('Error fetching jury packet:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/v2/events/jury-packets/:id
 * Update jury packet
 */
router.put('/jury-packets/:id', requireAuth, async (req, res) => {
  try {
    const result = await eventsService.updateJuryPacket(req.params.id, req.userId, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.message === 'Jury packet not found') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
    if (error.message === 'Packet name is required' || error.message === 'Invalid persona selected') {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: error.message } });
    }
    console.error('Error updating jury packet:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/v2/events/jury-packets/:id
 * Delete jury packet
 */
router.delete('/jury-packets/:id', requireAuth, async (req, res) => {
  try {
    const result = await eventsService.deleteJuryPacket(req.params.id, req.userId);
    res.json({ success: true, data: result });
  } catch (error) {
    if (error.message === 'Jury packet not found') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
    console.error('Error deleting jury packet:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v2/events/jury-packets/upload
 * Upload images for a jury packet (temp storage)
 */
router.post('/jury-packets/upload',
  requireAuth,
  upload.array('images'),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'No files uploaded' } });
      }
      const urls = req.files.map(file => `/temp_images/jury/${file.filename}`);
      res.json({ success: true, data: { urls } });
    } catch (error) {
      console.error('Jury packet image upload error:', error);
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
  }
);

// ============================================================================
// ARTIST CUSTOM EVENTS (personal calendar)
// ============================================================================

/**
 * GET /api/v2/events/custom
 * List current user's custom (artist) events
 */
router.get('/custom', requireAuth, async (req, res) => {
  try {
    const events = await eventsService.getCustomEvents(req.userId);
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching custom events:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v2/events/custom
 * Create custom artist event
 */
router.post('/custom', requireAuth, async (req, res) => {
  try {
    const event = await eventsService.createCustomEvent(req.userId, req.body);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error('Error creating custom event:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * PUT /api/v2/events/custom/:id
 * Update custom artist event
 */
router.put('/custom/:id', requireAuth, async (req, res) => {
  try {
    const event = await eventsService.updateCustomEvent(req.userId, req.params.id, req.body);
    res.json({ success: true, data: event });
  } catch (error) {
    if (error.message === 'Custom event not found or access denied') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
    console.error('Error updating custom event:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/v2/events/custom/:id
 * Delete custom artist event
 */
router.delete('/custom/:id', requireAuth, async (req, res) => {
  try {
    await eventsService.deleteCustomEvent(req.userId, req.params.id);
    res.json({ success: true });
  } catch (error) {
    if (error.message === 'Custom event not found or access denied') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
    console.error('Error deleting custom event:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ============================================================================
// DEDUPLICATION
// ============================================================================

/**
 * POST /api/v2/events/custom/check-duplicates
 * Check for duplicate events before creating a new custom event
 */
router.post('/custom/check-duplicates', requireAuth, async (req, res) => {
  try {
    const matches = await eventsService.checkDuplicateEvents(req.body);
    res.json({ success: true, data: { matches } });
  } catch (error) {
    console.error('Error checking duplicate events:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v2/events/custom/:id/append-artist
 * Append current user to an existing unclaimed custom event claim group
 */
router.post('/custom/:id/append-artist', requireAuth, async (req, res) => {
  try {
    const result = await eventsService.appendArtistToClaim(req.params.id, req.userId);
    res.json(result);
  } catch (error) {
    console.error('Error appending artist to claim:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({ success: false, error: { code: status === 404 ? 'NOT_FOUND' : 'SERVER_ERROR', message: error.message } });
  }
});

// ============================================================================
// EVENT CLAIM (artist custom event → promoter claims)
// ============================================================================

/**
 * GET /api/v2/events/claim/verify/:token
 * Verify claim token and return event details (public)
 */
router.get('/claim/verify/:token', async (req, res) => {
  try {
    const result = await eventsService.verifyClaimToken(req.params.token);
    if (!result) {
      return res.status(404).json({
        valid: false,
        error: 'Invalid or expired claim token',
        expired: true
      });
    }
    res.json(result);
  } catch (error) {
    console.error('Error verifying claim token:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v2/events/claim/new/:token
 * Claim artist custom event as new draft event (promoter)
 */
router.post('/claim/new/:token', requireAuth, requirePermission('events'), async (req, res) => {
  try {
    const result = await eventsService.claimNew(req.params.token, req.userId);
    res.json({
      success: true,
      message: 'Event claimed successfully! Complete the event details to publish.',
      ...result
    });
  } catch (error) {
    if (error.message === 'Invalid or expired claim token') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
    console.error('Error claiming event:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v2/events/claim/link/:token
 * Link artist custom event to existing promoter event
 */
router.post('/claim/link/:token', requireAuth, requirePermission('events'), async (req, res) => {
  try {
    const { event_id: eventId } = req.body || {};
    if (!eventId) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Event ID is required' } });
    }
    const result = await eventsService.linkExisting(req.params.token, req.userId, eventId);
    res.json({
      success: true,
      message: 'Event linked successfully',
      ...result
    });
  } catch (error) {
    if (error.message === 'Invalid or expired claim token') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
    if (error.message === 'Event not found or you do not have permission') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
    }
    console.error('Error linking event:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ============================================================================
// PROMOTER CLAIM (admin-solicited promoter account activation)
// ============================================================================

const EmailService = require('../../services/emailService');
const promoterClaimEmailService = new EmailService();

/**
 * GET /api/v2/events/promoter-claim/verify/:token
 * Verify promoter claim token and return event details (public, token is auth)
 */
router.get('/promoter-claim/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Token is required' } });
    }

    const [tokenData] = await db.execute(`
      SELECT 
        pct.id as token_id, pct.expires_at, pct.claimed,
        e.id as event_id, e.title as event_title,
        e.start_date as event_start_date, e.end_date as event_end_date,
        e.venue_name, e.venue_city, e.venue_state, e.description as event_description,
        u.id as user_id, u.username as promoter_email,
        CONCAT(up.first_name, ' ', up.last_name) as promoter_name,
        up.first_name as promoter_first_name, up.last_name as promoter_last_name,
        pp.business_name as promoter_business_name
      FROM promoter_claim_tokens pct
      JOIN users u ON pct.user_id = u.id
      JOIN events e ON pct.event_id = e.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN promoter_profiles pp ON u.id = pp.user_id
      WHERE pct.token = ? AND pct.claimed = 0 AND pct.expires_at > NOW()
    `, [token]);

    if (tokenData.length === 0) {
      return res.status(404).json({ success: false, valid: false, error: { code: 'NOT_FOUND', message: 'Invalid or expired claim token' }, expired: true });
    }

    const d = tokenData[0];
    res.json({
      success: true,
      data: {
        valid: true,
        event_id: d.event_id, event_title: d.event_title,
        event_start_date: d.event_start_date, event_end_date: d.event_end_date,
        venue_name: d.venue_name, venue_city: d.venue_city, venue_state: d.venue_state,
        event_description: d.event_description, promoter_email: d.promoter_email,
        promoter_name: d.promoter_name, promoter_first_name: d.promoter_first_name,
        promoter_last_name: d.promoter_last_name, promoter_business_name: d.promoter_business_name
      }
    });
  } catch (error) {
    console.error('Error verifying promoter claim token:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v2/events/promoter-claim/activate/:token
 * Activate promoter account and claim event (public, token is auth)
 */
router.post('/promoter-claim/activate/:token', async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const { token } = req.params;
    const { firebase_uid } = req.body;

    if (!token || !firebase_uid) {
      await connection.rollback();
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Token and Firebase UID are required' } });
    }

    const [tokenData] = await connection.execute(`
      SELECT 
        pct.id as token_id, pct.user_id, pct.event_id, pct.claimed,
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
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Invalid or expired claim token' } });
    }

    const d = tokenData[0];

    await connection.execute(
      `UPDATE users SET status = 'active', email_verified = 'yes', email_confirmed = 1, google_uid = ? WHERE id = ?`,
      [firebase_uid, d.user_id]
    );
    await connection.execute(`UPDATE events SET claim_status = 'claimed' WHERE id = ?`, [d.event_id]);
    await connection.execute(`UPDATE promoter_claim_tokens SET claimed = 1, claimed_at = NOW() WHERE id = ?`, [d.token_id]);

    try {
      const [campaign] = await connection.execute('SELECT id FROM onboarding_campaigns WHERE is_active = 1 LIMIT 1');
      if (campaign.length > 0) {
        await connection.execute(
          `INSERT INTO user_campaign_enrollments (user_id, campaign_id, enrolled_at, current_step) VALUES (?, ?, NOW(), 0)`,
          [d.user_id, campaign[0].id]
        );
      }
    } catch (enrollError) {
      console.error('Campaign enrollment error (non-fatal):', enrollError);
    }

    await connection.commit();

    try {
      await promoterClaimEmailService.sendEmail(d.user_id, 'onboarding_welcome', {
        promoter_name: d.full_name,
        promoter_first_name: d.first_name,
        event_title: d.event_title,
        event_edit_url: `${process.env.FRONTEND_URL}/events/new?edit_event_id=${d.event_id}`,
        help_url: `${process.env.FRONTEND_URL}/help/promoter-guide`
      });
    } catch (emailError) {
      console.error('Welcome email error (non-fatal):', emailError);
    }

    res.json({
      success: true,
      data: {
        message: 'Account activated successfully',
        user_id: d.user_id,
        event_id: d.event_id,
        redirect_url: `/events/new?edit_event_id=${d.event_id}`
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error activating promoter account:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  } finally {
    connection.release();
  }
});

// ============================================================================
// EVENT CRUD & PUBLIC EVENT PAGE
// ============================================================================

/**
 * GET /api/v2/events/:id/categories
 * Get event categories (public)
 */
router.get('/:id/categories', async (req, res) => {
  try {
    const categories = await eventsService.getEventCategories(req.params.id);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching event categories:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * GET /api/v2/events/:id/artists
 * Get exhibiting artists for event (public)
 */
router.get('/:id/artists', async (req, res) => {
  try {
    const artists = await eventsService.getEventArtists(req.params.id);
    res.json({ success: true, data: artists });
  } catch (error) {
    console.error('Error fetching event artists:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * GET /api/v2/events/:id/tickets
 * Get available tickets for event (public)
 */
router.get('/:id/tickets', async (req, res) => {
  try {
    const eventId = req.params.id;
    const [tickets] = await db.execute(`
      SELECT id, ticket_type, price, quantity_available, quantity_sold, description
      FROM event_tickets
      WHERE event_id = ? AND is_active = TRUE
      ORDER BY price ASC
    `, [eventId]);
    res.json({ success: true, data: tickets, event_id: eventId });
  } catch (error) {
    console.error('Error fetching event tickets:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v2/events/:id/tickets/:ticketId/purchase
 * Create payment intent for ticket purchase (public)
 */
router.post('/:id/tickets/:ticketId/purchase', async (req, res) => {
  try {
    const { id: eventId, ticketId } = req.params;
    const { buyer_email, buyer_name, quantity = 1 } = req.body;

    if (!buyer_email || quantity < 1) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Valid buyer email and quantity required' } });
    }

    const [ticketInfo] = await db.execute(`
      SELECT et.*, e.title as event_title, e.start_date, e.venue_name, e.venue_city, e.venue_state
      FROM event_tickets et
      JOIN events e ON et.event_id = e.id
      WHERE et.id = ? AND et.event_id = ? AND et.is_active = TRUE
    `, [ticketId, eventId]);

    if (ticketInfo.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Ticket not found or not available' } });
    }

    const ticket = ticketInfo[0];
    if (ticket.quantity_available && (ticket.quantity_sold + quantity > ticket.quantity_available)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Not enough tickets available' } });
    }

    const unitPrice = parseFloat(ticket.price);
    const totalPrice = unitPrice * quantity;

    const generateUniqueTicketCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
      return `TKT-${result}`;
    };
    const ticketCodes = [];
    for (let i = 0; i < quantity; i++) ticketCodes.push(generateUniqueTicketCode());

    const stripeService = require('../../services/stripeService');
    const paymentIntent = await stripeService.createPaymentIntent({
      total_amount: totalPrice,
      currency: 'usd',
      metadata: {
        event_id: eventId.toString(),
        ticket_id: ticketId.toString(),
        event_title: ticket.event_title,
        buyer_email: buyer_email,
        buyer_name: buyer_name || '',
        quantity: quantity.toString(),
        ticket_codes: ticketCodes.join(',')
      }
    });

    for (let i = 0; i < quantity; i++) {
      await db.execute(`
        INSERT INTO ticket_purchases (
          event_id, ticket_id, buyer_email, buyer_name, quantity, unit_price, total_price,
          unique_code, stripe_payment_intent_id, status
        ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, 'pending')
      `, [eventId, ticketId, buyer_email, buyer_name || null, unitPrice, unitPrice, ticketCodes[i], paymentIntent.id]);
    }

    res.json({
      success: true,
      payment_intent: {
        id: paymentIntent.id,
        client_secret: paymentIntent.client_secret,
        amount: paymentIntent.amount
      },
      ticket_info: {
        event_title: ticket.event_title,
        ticket_type: ticket.ticket_type,
        quantity: quantity,
        unit_price: unitPrice,
        total_price: totalPrice
      }
    });
  } catch (error) {
    console.error('Error processing ticket purchase:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * GET /api/v2/events/:id
 * Get single event with images
 */
router.get('/:id', async (req, res) => {
  try {
    const event = await eventsService.getEventWithImages(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found' } });
    }
    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v2/events
 * Create new event
 */
router.post('/', requireAuth, requirePermission('events'), async (req, res) => {
  try {
    const event = await eventsService.createEvent(req.userId, req.body);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * PATCH /api/v2/events/:id
 * Update event (partial)
 */
router.patch('/:id', requireAuth, requirePermission('events'), async (req, res) => {
  try {
    const isAdmin = req.roles && req.roles.includes('admin');
    const event = await eventsService.updateEvent(req.params.id, req.userId, req.body, isAdmin);
    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Error updating event:', error);
    if (error.message === 'Event not found') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/v2/events/:id
 * Archive event (soft delete)
 */
router.delete('/:id', requireAuth, requirePermission('events'), async (req, res) => {
  try {
    const isAdmin = req.roles && req.roles.includes('admin');
    await eventsService.archiveEvent(req.params.id, req.userId, isAdmin);
    res.json({ success: true });
  } catch (error) {
    console.error('Error archiving event:', error);
    if (error.message === 'Event not found') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ============================================================================
// APPLICATION FIELDS
// ============================================================================

/**
 * GET /api/v2/events/:id/application-fields
 * Get application fields for an event
 */
router.get('/:id/application-fields', requireAuth, async (req, res) => {
  try {
    const fields = await eventsService.getApplicationFields(req.params.id);
    res.json({ success: true, data: fields });
  } catch (error) {
    console.error('Error fetching application fields:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v2/events/:id/application-fields
 * Add application field to an event
 */
router.post('/:id/application-fields', requireAuth, requirePermission('events'), async (req, res) => {
  try {
    const isAdmin = req.roles && req.roles.includes('admin');
    const field = await eventsService.addApplicationField(req.params.id, req.userId, req.body, isAdmin);
    res.status(201).json({ success: true, data: field });
  } catch (error) {
    console.error('Error adding application field:', error);
    if (error.message === 'Event not found') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/v2/events/:id/application-fields
 * Clear all application fields for an event
 */
router.delete('/:id/application-fields', requireAuth, requirePermission('events'), async (req, res) => {
  try {
    const isAdmin = req.roles && req.roles.includes('admin');
    await eventsService.clearApplicationFields(req.params.id, req.userId, isAdmin);
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing application fields:', error);
    if (error.message === 'Event not found') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ============================================================================
// AVAILABLE ADD-ONS
// ============================================================================

/**
 * GET /api/v2/events/:id/available-addons
 * Get available add-ons for an event
 */
router.get('/:id/available-addons', requireAuth, async (req, res) => {
  try {
    const addons = await eventsService.getAvailableAddons(req.params.id);
    res.json({ success: true, data: addons });
  } catch (error) {
    console.error('Error fetching available addons:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v2/events/:id/available-addons
 * Add available add-on to an event
 */
router.post('/:id/available-addons', requireAuth, requirePermission('events'), async (req, res) => {
  try {
    const isAdmin = req.roles && req.roles.includes('admin');
    const addon = await eventsService.addAvailableAddon(req.params.id, req.userId, req.body, isAdmin);
    res.status(201).json({ success: true, data: addon });
  } catch (error) {
    console.error('Error adding available addon:', error);
    if (error.message === 'Event not found') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/v2/events/:id/available-addons
 * Clear all add-ons for an event
 */
router.delete('/:id/available-addons', requireAuth, requirePermission('events'), async (req, res) => {
  try {
    const isAdmin = req.roles && req.roles.includes('admin');
    await eventsService.clearAvailableAddons(req.params.id, req.userId, isAdmin);
    res.json({ success: true });
  } catch (error) {
    console.error('Error clearing available addons:', error);
    if (error.message === 'Event not found') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
    if (error.message === 'Access denied') {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: error.message } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ============================================================================
// IMAGES
// ============================================================================

/**
 * GET /api/v2/events/:id/images
 * Get event images
 */
router.get('/:id/images', async (req, res) => {
  try {
    const images = await eventsService.getEventImages(req.params.id);
    res.json({ success: true, data: images });
  } catch (error) {
    console.error('Error fetching event images:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v2/events/upload
 * Upload event images (to temp storage)
 */
router.post('/upload', 
  requireAuth,
  upload.array('images'),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'No files uploaded' } });
      }

      const { event_id } = req.query;
      
      // If event_id is provided, verify it belongs to the user
      if (event_id && event_id !== 'new') {
        const [event] = await db.execute(
          'SELECT id FROM events WHERE id = ? AND (promoter_id = ? OR created_by = ?)', 
          [event_id, req.userId, req.userId]
        );
        if (!event.length) {
          return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Event not found or not authorized' } });
        }
      }

      const urls = [];
      
      // Record temp image URLs 
      for (const file of req.files) {
        const imagePath = `/temp_images/events/${file.filename}`;
        
        // Insert into pending_images with original name and mime type
        await db.execute(
          'INSERT INTO pending_images (user_id, image_path, original_name, mime_type, status) VALUES (?, ?, ?, ?, ?)',
          [req.userId, imagePath, file.originalname, file.mimetype, 'pending']
        );
        
        urls.push(imagePath);
      }

      res.json({ success: true, data: { urls } });
    } catch (error) {
      console.error('Event image upload error:', error);
      res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
    }
  }
);

// ============================================================================
// ADMIN: UNCLAIMED EVENTS (Promoter Onboarding)
// ============================================================================

/**
 * GET /api/v2/events/admin/unclaimed
 * Get unclaimed events pending promoter claim
 */
router.get('/admin/unclaimed', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const events = await eventsService.getUnclaimedEvents();
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching unclaimed events:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v2/events/admin/unclaimed/:eventId/resend
 * Resend claim email for an unclaimed event
 */
router.post('/admin/unclaimed/:eventId/resend', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const result = await eventsService.resendClaimEmail(req.params.eventId, req.userId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error resending claim email:', error);
    if (error.message === 'Event not found or already claimed') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * DELETE /api/v2/events/admin/unclaimed/:eventId
 * Delete unclaimed event and its draft promoter
 */
router.delete('/admin/unclaimed/:eventId', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const result = await eventsService.deleteUnclaimedEvent(req.params.eventId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error deleting unclaimed event:', error);
    if (error.message === 'Event not found or already claimed') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ============================================================================
// EVENT SERIES (recurring events with auto-generation)
// ============================================================================

/**
 * GET /api/v2/events/series
 * List promoter's event series with statistics
 */
router.get('/series', requireAuth, async (req, res) => {
  try {
    const promoterId = req.userId;
    const [series] = await db.execute(`
      SELECT 
        es.*,
        COUNT(se.event_id) as events_count,
        MAX(e.start_date) as latest_event_date,
        MIN(e.start_date) as earliest_event_date
      FROM event_series es
      LEFT JOIN series_events se ON es.id = se.series_id
      LEFT JOIN events e ON se.event_id = e.id
      WHERE es.promoter_id = ?
      GROUP BY es.id
      ORDER BY es.created_at DESC
    `, [promoterId]);

    res.json({ success: true, data: { series } });
  } catch (error) {
    console.error('Error fetching event series:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v2/events/series
 * Create new event series
 */
router.post('/series', requireAuth, async (req, res) => {
  try {
    const promoterId = req.userId;
    const {
      series_name, series_description, recurrence_pattern, recurrence_interval,
      series_start_date, series_end_date, template_event_id, auto_generate, generate_months_ahead
    } = req.body;

    if (!series_name || !recurrence_pattern || !series_start_date) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing required fields: series_name, recurrence_pattern, series_start_date' } });
    }

    const nextGenDate = new Date(series_start_date);
    nextGenDate.setMonth(nextGenDate.getMonth() + (generate_months_ahead || 12));

    const [result] = await db.execute(`
      INSERT INTO event_series (
        series_name, series_description, promoter_id, recurrence_pattern,
        recurrence_interval, series_start_date, series_end_date,
        template_event_id, auto_generate, generate_months_ahead, next_generation_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      series_name, series_description, promoterId, recurrence_pattern,
      recurrence_interval, series_start_date, series_end_date || null,
      template_event_id || null, auto_generate !== false, generate_months_ahead || 12, nextGenDate
    ]);

    await db.execute(
      `INSERT INTO automation_logs (automation_type, series_id, status, message) VALUES ('event_generation', ?, 'success', 'Event series created')`,
      [result.insertId]
    );

    res.status(201).json({ success: true, data: { series_id: result.insertId, message: 'Event series created successfully' } });
  } catch (error) {
    console.error('Error creating event series:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

/**
 * POST /api/v2/events/series/:id/generate
 * Manually generate next event in series
 */
router.post('/series/:id/generate', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const promoterId = req.userId;

    const [series] = await db.execute(
      'SELECT * FROM event_series WHERE id = ? AND promoter_id = ?',
      [id, promoterId]
    );
    if (series.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Series not found' } });
    }

    const seriesInfo = series[0];

    let templateData = {};
    if (seriesInfo.template_event_id) {
      const [templateEvent] = await db.execute('SELECT * FROM events WHERE id = ?', [seriesInfo.template_event_id]);
      if (templateEvent.length > 0) {
        templateData = { ...templateEvent[0] };
        delete templateData.id;
        delete templateData.created_at;
        delete templateData.updated_at;
      }
    }

    // Get last sequence number
    const [seqResult] = await db.execute(
      'SELECT COALESCE(MAX(sequence_number), 0) as last_number FROM series_events WHERE series_id = ?', [id]
    );
    const lastSeqNum = seqResult[0].last_number;

    // Calculate next event dates
    const baseDate = new Date(seriesInfo.series_start_date);
    let nextDate = new Date(baseDate);
    const seqNum = lastSeqNum + 1;
    switch (seriesInfo.recurrence_pattern) {
      case 'yearly':
        nextDate.setFullYear(baseDate.getFullYear() + ((seqNum - 1) * seriesInfo.recurrence_interval));
        break;
      case 'quarterly':
        nextDate.setMonth(baseDate.getMonth() + ((seqNum - 1) * 3 * seriesInfo.recurrence_interval));
        break;
      case 'monthly':
        nextDate.setMonth(baseDate.getMonth() + ((seqNum - 1) * seriesInfo.recurrence_interval));
        break;
    }
    const endDate = new Date(nextDate);
    endDate.setDate(nextDate.getDate() + (seriesInfo.template_event_id ? 3 : 1));

    const newEventData = {
      ...templateData,
      title: `${seriesInfo.series_name} ${nextDate.getFullYear()}`,
      start_date: nextDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      promoter_id: promoterId,
      event_status: 'draft'
    };

    // Create event from template data
    const fields = Object.keys(newEventData);
    const values = Object.values(newEventData);
    const placeholders = fields.map(() => '?').join(', ');
    const [eventResult] = await db.execute(
      `INSERT INTO events (${fields.join(', ')}) VALUES (${placeholders})`, values
    );
    const eventId = eventResult.insertId;

    await db.execute(
      `INSERT INTO series_events (series_id, event_id, sequence_number, generation_method) VALUES (?, ?, ?, 'manual')`,
      [id, eventId, seqNum]
    );
    await db.execute(
      `INSERT INTO automation_logs (automation_type, series_id, event_id, status, message) VALUES ('event_generation', ?, ?, 'success', 'Event generated manually')`,
      [id, eventId]
    );

    res.json({ success: true, data: { event_id: eventId, message: 'Next event generated successfully' } });
  } catch (error) {
    console.error('Error generating next event in series:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ============================================================================
// EXHIBITING REQUESTS
// ============================================================================

/**
 * POST /api/v2/events/:id/request-exhibiting
 * Artist requests to be verified as exhibiting at an event
 */
router.post('/:id/request-exhibiting', requireAuth, async (req, res) => {
  try {
    const result = await eventsService.requestExhibiting(req.params.id, req.userId);
    res.json(result);
  } catch (error) {
    console.error('Error requesting exhibiting status:', error);
    const status = error.message.includes('not found') ? 404
      : error.message.includes('already') || error.message.includes('promoter') ? 409
      : 500;
    res.status(status).json({ success: false, error: { code: status === 500 ? 'SERVER_ERROR' : 'CONFLICT', message: error.message } });
  }
});

module.exports = router;
