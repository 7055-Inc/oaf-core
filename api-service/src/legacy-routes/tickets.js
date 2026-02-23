/**
 * Support Ticket System Routes
 * Handles ticket creation, viewing, messaging, and management
 */

const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');

/**
 * Generate a unique ticket number
 * Format: TKT-YYYYMM-XXXXX (e.g., TKT-202412-00001)
 */
async function generateTicketNumber() {
  const date = new Date();
  const prefix = `TKT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  
  // Get the highest ticket number for this month
  const [result] = await db.query(
    `SELECT ticket_number FROM support_tickets 
     WHERE ticket_number LIKE ? 
     ORDER BY ticket_number DESC LIMIT 1`,
    [`${prefix}-%`]
  );
  
  let nextNum = 1;
  if (result.length > 0) {
    const lastNum = parseInt(result[0].ticket_number.split('-')[2], 10);
    nextNum = lastNum + 1;
  }
  
  return `${prefix}-${String(nextNum).padStart(5, '0')}`;
}

/**
 * POST /api/tickets
 * Create a new support ticket
 * Can be used by logged-in users or guests
 */
router.post('/', async (req, res) => {
  try {
    const {
      subject,
      message,
      ticket_type = 'general',
      priority = 'normal',
      guest_email,
      guest_name,
      related_type,
      related_id
    } = req.body;

    // Validation
    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    // Check if user is authenticated (optional auth)
    let userId = null;
    let userEmail = null;
    
    // Try to get user from token if present
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
        
        // Get user email
        const [users] = await db.query('SELECT username FROM users WHERE id = ?', [userId]);
        if (users.length > 0) {
          userEmail = users[0].username;
        }
      } catch (err) {
        // Token invalid, continue as guest
      }
    }

    // If not logged in, require guest info
    if (!userId && (!guest_email || !guest_name)) {
      return res.status(400).json({ error: 'Guest email and name are required for non-logged-in users' });
    }

    // Generate ticket number
    const ticketNumber = await generateTicketNumber();

    // Create the ticket
    const [result] = await db.query(`
      INSERT INTO support_tickets (
        ticket_number, ticket_type, subject, user_id, guest_email, guest_name,
        status, priority, related_type, related_id
      ) VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)
    `, [
      ticketNumber,
      ticket_type,
      subject,
      userId,
      userId ? null : guest_email,
      userId ? null : guest_name,
      priority,
      related_type || null,
      related_id || null
    ]);

    const ticketId = result.insertId;

    // Create the initial message
    await db.query(`
      INSERT INTO support_ticket_messages (
        ticket_id, user_id, sender_type, sender_name, message_text, is_internal
      ) VALUES (?, ?, ?, ?, ?, 0)
    `, [
      ticketId,
      userId,
      userId ? 'customer' : 'guest',
      userId ? null : guest_name,
      message
    ]);

    // TODO: Send confirmation email to user/guest
    // TODO: Send notification email to admin

    res.status(201).json({
      success: true,
      ticket_id: ticketId,
      ticket_number: ticketNumber,
      message: 'Ticket created successfully'
    });

  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

/**
 * GET /api/tickets/my
 * Get current user's tickets
 */
router.get('/my', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { status, limit = 20, offset = 0 } = req.query;

    let whereClause = 'WHERE t.user_id = ?';
    let params = [userId];

    if (status && status !== 'all') {
      whereClause += ' AND t.status = ?';
      params.push(status);
    }

    const [tickets] = await db.query(`
      SELECT 
        t.*,
        (SELECT COUNT(*) FROM support_ticket_messages WHERE ticket_id = t.id) as message_count,
        (SELECT MAX(created_at) FROM support_ticket_messages WHERE ticket_id = t.id) as last_message_at
      FROM support_tickets t
      ${whereClause}
      ORDER BY t.updated_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    // Get total count
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total FROM support_tickets t ${whereClause}
    `, params);

    res.json({
      success: true,
      tickets,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Error fetching user tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

/**
 * GET /api/tickets/my/notifications
 * Get count of tickets needing user's attention
 */
router.get('/my/notifications', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Count tickets awaiting customer response
    const [awaitingResponse] = await db.query(`
      SELECT COUNT(*) as count FROM support_tickets 
      WHERE user_id = ? AND status = 'awaiting_customer'
    `, [userId]);

    // Count open tickets (for general awareness)
    const [openTickets] = await db.query(`
      SELECT COUNT(*) as count FROM support_tickets 
      WHERE user_id = ? AND status IN ('open', 'awaiting_customer', 'awaiting_support')
    `, [userId]);

    res.json({
      success: true,
      notifications: {
        awaiting_response: awaitingResponse[0]?.count || 0,
        open_tickets: openTickets[0]?.count || 0
      }
    });

  } catch (error) {
    console.error('Error fetching user ticket notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/tickets/:id
 * Get single ticket with messages
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Get ticket
    const [tickets] = await db.query(`
      SELECT t.*
      FROM support_tickets t
      WHERE t.id = ? AND t.user_id = ?
    `, [id, userId]);

    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = tickets[0];

    // Get messages (excluding internal notes for customers)
    const [messages] = await db.query(`
      SELECT 
        m.*,
        u.username as user_email
      FROM support_ticket_messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE m.ticket_id = ? AND m.is_internal = 0
      ORDER BY m.created_at ASC
    `, [id]);

    res.json({
      success: true,
      ticket,
      messages
    });

  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

/**
 * POST /api/tickets/:id/messages
 * Add a message to a ticket
 */
router.post('/:id/messages', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify user owns this ticket
    const [tickets] = await db.query(
      'SELECT id, status FROM support_tickets WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = tickets[0];

    // Don't allow messages on closed tickets
    if (ticket.status === 'closed') {
      return res.status(400).json({ error: 'Cannot add messages to closed tickets' });
    }

    // Create message
    const [result] = await db.query(`
      INSERT INTO support_ticket_messages (ticket_id, user_id, sender_type, message_text, is_internal)
      VALUES (?, ?, 'customer', ?, 0)
    `, [id, userId, message.trim()]);

    // Update ticket status to awaiting_support
    await db.query(`
      UPDATE support_tickets 
      SET status = 'awaiting_support', updated_at = NOW() 
      WHERE id = ? AND status != 'resolved'
    `, [id]);

    // TODO: Send notification to admin

    res.status(201).json({
      success: true,
      message_id: result.insertId,
      message: 'Message added successfully'
    });

  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

/**
 * PATCH /api/tickets/:id/close
 * Close a ticket (user can close their own tickets)
 */
router.patch('/:id/close', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Verify user owns this ticket
    const [tickets] = await db.query(
      'SELECT id, status FROM support_tickets WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Update status
    await db.query(`
      UPDATE support_tickets 
      SET status = 'closed', closed_at = NOW(), updated_at = NOW() 
      WHERE id = ?
    `, [id]);

    // Log the change
    await db.query(`
      INSERT INTO support_ticket_status_log (ticket_id, field_changed, old_value, new_value, changed_by)
      VALUES (?, 'status', ?, 'closed', ?)
    `, [id, tickets[0].status, userId]);

    res.json({
      success: true,
      message: 'Ticket closed successfully'
    });

  } catch (error) {
    console.error('Error closing ticket:', error);
    res.status(500).json({ error: 'Failed to close ticket' });
  }
});

// ==================== ADMIN ROUTES ====================

/**
 * GET /api/tickets/admin/all
 * Get all tickets (admin only)
 */
router.get('/admin/all', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { status, ticket_type, search, limit = 50, offset = 0 } = req.query;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (status && status !== 'all') {
      whereClause += ' AND t.status = ?';
      params.push(status);
    }

    if (ticket_type && ticket_type !== 'all') {
      whereClause += ' AND t.ticket_type = ?';
      params.push(ticket_type);
    }

    if (search) {
      whereClause += ' AND (t.ticket_number LIKE ? OR t.subject LIKE ? OR t.guest_email LIKE ? OR u.username LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    const [tickets] = await db.query(`
      SELECT 
        t.*,
        u.username as user_email,
        COALESCE(u.username, t.guest_email) as contact_email,
        COALESCE(up.first_name, t.guest_name) as contact_name,
        assigned.username as assigned_to_email,
        (SELECT COUNT(*) FROM support_ticket_messages WHERE ticket_id = t.id) as message_count,
        (SELECT MAX(created_at) FROM support_ticket_messages WHERE ticket_id = t.id) as last_message_at
      FROM support_tickets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN user_profiles up ON t.user_id = up.user_id
      LEFT JOIN users assigned ON t.assigned_to = assigned.id
      ${whereClause}
      ORDER BY 
        CASE t.status 
          WHEN 'open' THEN 1 
          WHEN 'awaiting_support' THEN 2 
          WHEN 'escalated' THEN 3 
          ELSE 4 
        END,
        t.priority DESC,
        t.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

    // Get counts by status
    const [statusCounts] = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM support_tickets 
      GROUP BY status
    `);

    res.json({
      success: true,
      tickets,
      status_counts: statusCounts.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {}),
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Error fetching admin tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

/**
 * GET /api/tickets/admin/:id
 * Get single ticket with all messages including internal notes (admin only)
 */
router.get('/admin/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get ticket
    const [tickets] = await db.query(`
      SELECT 
        t.*,
        u.username as user_email,
        COALESCE(u.username, t.guest_email) as contact_email,
        COALESCE(up.first_name, t.guest_name) as contact_name,
        assigned.username as assigned_to_email
      FROM support_tickets t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN user_profiles up ON t.user_id = up.user_id
      LEFT JOIN users assigned ON t.assigned_to = assigned.id
      WHERE t.id = ?
    `, [id]);

    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = tickets[0];

    // Get all messages including internal notes
    const [messages] = await db.query(`
      SELECT 
        m.*,
        u.username as user_email,
        up.first_name as user_first_name
      FROM support_ticket_messages m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN user_profiles up ON m.user_id = up.user_id
      WHERE m.ticket_id = ?
      ORDER BY m.created_at ASC
    `, [id]);

    // Get status log
    const [statusLog] = await db.query(`
      SELECT 
        l.*,
        u.username as changed_by_email
      FROM support_ticket_status_log l
      LEFT JOIN users u ON l.changed_by = u.id
      WHERE l.ticket_id = ?
      ORDER BY l.created_at DESC
    `, [id]);

    res.json({
      success: true,
      ticket,
      messages,
      status_log: statusLog
    });

  } catch (error) {
    console.error('Error fetching admin ticket:', error);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

/**
 * POST /api/tickets/admin/:id/messages
 * Add a reply or internal note (admin only)
 */
router.post('/admin/:id/messages', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;
    const { message, is_internal = false } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Verify ticket exists
    const [tickets] = await db.query('SELECT id, status, first_response_at FROM support_tickets WHERE id = ?', [id]);
    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = tickets[0];

    // Create message
    const [result] = await db.query(`
      INSERT INTO support_ticket_messages (ticket_id, user_id, sender_type, message_text, is_internal)
      VALUES (?, ?, 'admin', ?, ?)
    `, [id, adminId, message.trim(), is_internal ? 1 : 0]);

    // Update ticket
    let updateQuery = 'UPDATE support_tickets SET updated_at = NOW()';
    let updateParams = [];

    // If this is the first response, track it
    if (!ticket.first_response_at && !is_internal) {
      updateQuery += ', first_response_at = NOW()';
    }

    // If not internal, update status to awaiting_customer
    if (!is_internal && ticket.status !== 'resolved' && ticket.status !== 'closed') {
      updateQuery += ', status = ?';
      updateParams.push('awaiting_customer');
    }

    updateQuery += ' WHERE id = ?';
    updateParams.push(id);

    await db.query(updateQuery, updateParams);

    // TODO: Send notification email to customer (if not internal)

    res.status(201).json({
      success: true,
      message_id: result.insertId,
      message: is_internal ? 'Internal note added' : 'Reply sent successfully'
    });

  } catch (error) {
    console.error('Error adding admin message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

/**
 * PATCH /api/tickets/admin/:id
 * Update ticket status, priority, assignment (admin only)
 */
router.patch('/admin/:id', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.userId;
    const { status, priority, assigned_to } = req.body;

    // Get current ticket
    const [tickets] = await db.query('SELECT * FROM support_tickets WHERE id = ?', [id]);
    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const ticket = tickets[0];
    const updates = [];
    const values = [];
    const logEntries = [];

    if (status && status !== ticket.status) {
      updates.push('status = ?');
      values.push(status);
      logEntries.push({ field: 'status', old: ticket.status, new: status });
      
      if (status === 'resolved') {
        updates.push('resolved_at = NOW()');
      } else if (status === 'closed') {
        updates.push('closed_at = NOW()');
      }
    }

    if (priority && priority !== ticket.priority) {
      updates.push('priority = ?');
      values.push(priority);
      logEntries.push({ field: 'priority', old: ticket.priority, new: priority });
    }

    if (assigned_to !== undefined && assigned_to !== ticket.assigned_to) {
      updates.push('assigned_to = ?');
      values.push(assigned_to || null);
      logEntries.push({ field: 'assigned_to', old: ticket.assigned_to, new: assigned_to });
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No changes provided' });
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    await db.query(`UPDATE support_tickets SET ${updates.join(', ')} WHERE id = ?`, values);

    // Log changes
    for (const entry of logEntries) {
      await db.query(`
        INSERT INTO support_ticket_status_log (ticket_id, field_changed, old_value, new_value, changed_by)
        VALUES (?, ?, ?, ?, ?)
      `, [id, entry.field, entry.old, entry.new, adminId]);
    }

    res.json({
      success: true,
      message: 'Ticket updated successfully'
    });

  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

module.exports = router;

