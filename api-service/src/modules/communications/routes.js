/**
 * Communications Module Routes
 * v2 API for tickets and support
 */

const express = require('express');
const router = express.Router();

const { requireAuth, requirePermission } = require('../auth/middleware');
const { tickets: ticketsService } = require('./services');

// ============================================================================
// USER TICKET ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/communications/tickets
 * Get current user's tickets
 */
router.get('/tickets', requireAuth, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const result = await ticketsService.getUserTickets(req.userId, {
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: result.tickets,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/communications/tickets/notifications
 * Get ticket notification counts
 */
router.get('/tickets/notifications', requireAuth, async (req, res) => {
  try {
    const notifications = await ticketsService.getUserNotifications(req.userId);

    res.json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * POST /api/v2/communications/tickets
 * Create a new ticket
 */
router.post('/tickets', requireAuth, async (req, res) => {
  try {
    const { subject, message, ticket_type, priority, related_type, related_id } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Subject and message are required', status: 400 }
      });
    }

    const result = await ticketsService.createTicket({
      userId: req.userId,
      subject,
      message,
      ticket_type,
      priority,
      related_type,
      related_id
    });

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/communications/tickets/:id
 * Get single ticket with messages
 */
router.get('/tickets/:id', requireAuth, async (req, res) => {
  try {
    const result = await ticketsService.getTicket(req.params.id, req.userId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ticket not found', status: 404 }
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * POST /api/v2/communications/tickets/:id/messages
 * Add message to ticket
 */
router.post('/tickets/:id/messages', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Message is required', status: 400 }
      });
    }

    const result = await ticketsService.addMessage(req.params.id, req.userId, message);

    res.status(201).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error adding message:', error);
    const status = error.message === 'Ticket not found' ? 404 : 
                   error.message.includes('closed') ? 400 : 500;
    res.status(status).json({
      success: false,
      error: { code: status === 404 ? 'NOT_FOUND' : 'ERROR', message: error.message, status }
    });
  }
});

/**
 * POST /api/v2/communications/tickets/:id/close
 * Close a ticket
 */
router.post('/tickets/:id/close', requireAuth, async (req, res) => {
  try {
    await ticketsService.closeTicket(req.params.id, req.userId);

    res.json({
      success: true,
      message: 'Ticket closed successfully'
    });
  } catch (error) {
    console.error('Error closing ticket:', error);
    const status = error.message === 'Ticket not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: { code: status === 404 ? 'NOT_FOUND' : 'ERROR', message: error.message, status }
    });
  }
});

// ============================================================================
// ADMIN TICKET ENDPOINTS
// ============================================================================

/**
 * GET /api/v2/communications/admin/tickets
 * Get all tickets (admin)
 */
router.get('/admin/tickets', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status, ticket_type, search, limit = 50, offset = 0 } = req.query;

    const result = await ticketsService.getAllTickets({
      status,
      ticket_type,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: result.tickets,
      status_counts: result.status_counts,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching admin tickets:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * GET /api/v2/communications/admin/tickets/:id
 * Get single ticket with all messages (admin)
 */
router.get('/admin/tickets/:id', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const result = await ticketsService.getAdminTicket(req.params.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Ticket not found', status: 404 }
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching admin ticket:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * POST /api/v2/communications/admin/tickets/:id/messages
 * Add admin reply or internal note
 */
router.post('/admin/tickets/:id/messages', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { message, is_internal = false } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Message is required', status: 400 }
      });
    }

    const result = await ticketsService.addAdminMessage(
      req.params.id,
      req.userId,
      message,
      is_internal
    );

    res.status(201).json({
      success: true,
      data: result,
      message: is_internal ? 'Internal note added' : 'Reply sent successfully'
    });
  } catch (error) {
    console.error('Error adding admin message:', error);
    const status = error.message === 'Ticket not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: { code: status === 404 ? 'NOT_FOUND' : 'ERROR', message: error.message, status }
    });
  }
});

/**
 * PATCH /api/v2/communications/admin/tickets/:id
 * Update ticket status, priority, assignment
 */
router.patch('/admin/tickets/:id', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status, priority, assigned_to } = req.body;

    await ticketsService.updateTicket(req.params.id, req.userId, {
      status,
      priority,
      assigned_to
    });

    res.json({
      success: true,
      message: 'Ticket updated successfully'
    });
  } catch (error) {
    console.error('Error updating ticket:', error);
    const status = error.message === 'Ticket not found' ? 404 : 500;
    res.status(status).json({
      success: false,
      error: { code: status === 404 ? 'NOT_FOUND' : 'ERROR', message: error.message, status }
    });
  }
});

module.exports = router;
