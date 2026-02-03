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

module.exports = router;
