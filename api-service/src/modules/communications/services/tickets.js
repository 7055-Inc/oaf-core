/**
 * Tickets Service
 * Support ticket management - create, view, message, and manage tickets
 */

const db = require('../../../../config/db');

/**
 * Generate a unique ticket number
 * Format: TKT-YYYYMM-XXXXX
 */
async function generateTicketNumber() {
  const date = new Date();
  const prefix = `TKT-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  
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
 * Create a new support ticket
 */
async function createTicket(data) {
  const {
    userId,
    subject,
    message,
    ticket_type = 'general',
    priority = 'normal',
    guest_email,
    guest_name,
    related_type,
    related_id
  } = data;

  const ticketNumber = await generateTicketNumber();

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

  return {
    id: ticketId,
    ticket_number: ticketNumber
  };
}

/**
 * Get user's tickets
 */
async function getUserTickets(userId, options = {}) {
  const { status, limit = 50, offset = 0 } = options;

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

  const [countResult] = await db.query(
    `SELECT COUNT(*) as total FROM support_tickets t ${whereClause}`,
    params
  );

  return {
    tickets,
    pagination: {
      total: countResult[0]?.total || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  };
}

/**
 * Get user's ticket notifications
 */
async function getUserNotifications(userId) {
  const [awaitingResponse] = await db.query(`
    SELECT COUNT(*) as count FROM support_tickets 
    WHERE user_id = ? AND status = 'awaiting_customer'
  `, [userId]);

  const [openTickets] = await db.query(`
    SELECT COUNT(*) as count FROM support_tickets 
    WHERE user_id = ? AND status IN ('open', 'awaiting_customer', 'awaiting_support')
  `, [userId]);

  return {
    awaiting_response: awaitingResponse[0]?.count || 0,
    open_tickets: openTickets[0]?.count || 0
  };
}

/**
 * Get single ticket with messages (for user)
 */
async function getTicket(ticketId, userId) {
  const [tickets] = await db.query(`
    SELECT t.* FROM support_tickets t
    WHERE t.id = ? AND t.user_id = ?
  `, [ticketId, userId]);

  if (tickets.length === 0) {
    return null;
  }

  // Get messages (excluding internal notes)
  const [messages] = await db.query(`
    SELECT 
      m.*,
      u.username as user_email
    FROM support_ticket_messages m
    LEFT JOIN users u ON m.user_id = u.id
    WHERE m.ticket_id = ? AND m.is_internal = 0
    ORDER BY m.created_at ASC
  `, [ticketId]);

  return {
    ticket: tickets[0],
    messages
  };
}

/**
 * Add message to ticket (user)
 */
async function addMessage(ticketId, userId, message) {
  // Verify user owns this ticket
  const [tickets] = await db.query(
    'SELECT id, status FROM support_tickets WHERE id = ? AND user_id = ?',
    [ticketId, userId]
  );

  if (tickets.length === 0) {
    throw new Error('Ticket not found');
  }

  if (tickets[0].status === 'closed') {
    throw new Error('Cannot add messages to closed tickets');
  }

  const [result] = await db.query(`
    INSERT INTO support_ticket_messages (ticket_id, user_id, sender_type, message_text, is_internal)
    VALUES (?, ?, 'customer', ?, 0)
  `, [ticketId, userId, message.trim()]);

  // Update ticket status
  await db.query(`
    UPDATE support_tickets 
    SET status = 'awaiting_support', updated_at = NOW() 
    WHERE id = ? AND status != 'resolved'
  `, [ticketId]);

  return { message_id: result.insertId };
}

/**
 * Close ticket (user)
 */
async function closeTicket(ticketId, userId) {
  const [tickets] = await db.query(
    'SELECT id, status FROM support_tickets WHERE id = ? AND user_id = ?',
    [ticketId, userId]
  );

  if (tickets.length === 0) {
    throw new Error('Ticket not found');
  }

  await db.query(`
    UPDATE support_tickets 
    SET status = 'closed', closed_at = NOW(), updated_at = NOW() 
    WHERE id = ?
  `, [ticketId]);

  // Log the change
  await db.query(`
    INSERT INTO support_ticket_status_log (ticket_id, field_changed, old_value, new_value, changed_by)
    VALUES (?, 'status', ?, 'closed', ?)
  `, [ticketId, tickets[0].status, userId]);

  return { success: true };
}

// ==================== ADMIN FUNCTIONS ====================

/**
 * Get all tickets (admin)
 */
async function getAllTickets(options = {}) {
  const { status, ticket_type, search, limit = 50, offset = 0 } = options;

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

  return {
    tickets,
    status_counts: statusCounts.reduce((acc, row) => {
      acc[row.status] = row.count;
      return acc;
    }, {}),
    pagination: {
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  };
}

/**
 * Get single ticket with all messages (admin)
 */
async function getAdminTicket(ticketId) {
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
  `, [ticketId]);

  if (tickets.length === 0) {
    return null;
  }

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
  `, [ticketId]);

  // Get status log
  const [statusLog] = await db.query(`
    SELECT 
      l.*,
      u.username as changed_by_email
    FROM support_ticket_status_log l
    LEFT JOIN users u ON l.changed_by = u.id
    WHERE l.ticket_id = ?
    ORDER BY l.created_at DESC
  `, [ticketId]);

  return {
    ticket: tickets[0],
    messages,
    status_log: statusLog
  };
}

/**
 * Add admin message/reply
 */
async function addAdminMessage(ticketId, adminId, message, isInternal = false) {
  const [tickets] = await db.query(
    'SELECT id, status, first_response_at FROM support_tickets WHERE id = ?',
    [ticketId]
  );

  if (tickets.length === 0) {
    throw new Error('Ticket not found');
  }

  const ticket = tickets[0];

  const [result] = await db.query(`
    INSERT INTO support_ticket_messages (ticket_id, user_id, sender_type, message_text, is_internal)
    VALUES (?, ?, 'admin', ?, ?)
  `, [ticketId, adminId, message.trim(), isInternal ? 1 : 0]);

  // Update ticket
  let updateQuery = 'UPDATE support_tickets SET updated_at = NOW()';
  let updateParams = [];

  if (!ticket.first_response_at && !isInternal) {
    updateQuery += ', first_response_at = NOW()';
  }

  if (!isInternal && ticket.status !== 'resolved' && ticket.status !== 'closed') {
    updateQuery += ', status = ?';
    updateParams.push('awaiting_customer');
  }

  updateQuery += ' WHERE id = ?';
  updateParams.push(ticketId);

  await db.query(updateQuery, updateParams);

  return { message_id: result.insertId };
}

/**
 * Update ticket (admin)
 */
async function updateTicket(ticketId, adminId, updates) {
  const [tickets] = await db.query('SELECT * FROM support_tickets WHERE id = ?', [ticketId]);
  
  if (tickets.length === 0) {
    throw new Error('Ticket not found');
  }

  const ticket = tickets[0];
  const updateFields = [];
  const values = [];
  const logEntries = [];

  if (updates.status && updates.status !== ticket.status) {
    updateFields.push('status = ?');
    values.push(updates.status);
    logEntries.push({ field: 'status', old: ticket.status, new: updates.status });
    
    if (updates.status === 'resolved') {
      updateFields.push('resolved_at = NOW()');
    } else if (updates.status === 'closed') {
      updateFields.push('closed_at = NOW()');
    }
  }

  if (updates.priority && updates.priority !== ticket.priority) {
    updateFields.push('priority = ?');
    values.push(updates.priority);
    logEntries.push({ field: 'priority', old: ticket.priority, new: updates.priority });
  }

  if (updates.assigned_to !== undefined && updates.assigned_to !== ticket.assigned_to) {
    updateFields.push('assigned_to = ?');
    values.push(updates.assigned_to || null);
    logEntries.push({ field: 'assigned_to', old: ticket.assigned_to, new: updates.assigned_to });
  }

  if (updateFields.length === 0) {
    return { success: true, message: 'No changes' };
  }

  updateFields.push('updated_at = NOW()');
  values.push(ticketId);

  await db.query(`UPDATE support_tickets SET ${updateFields.join(', ')} WHERE id = ?`, values);

  // Log changes
  for (const entry of logEntries) {
    await db.query(`
      INSERT INTO support_ticket_status_log (ticket_id, field_changed, old_value, new_value, changed_by)
      VALUES (?, ?, ?, ?, ?)
    `, [ticketId, entry.field, entry.old, entry.new, adminId]);
  }

  return { success: true };
}

module.exports = {
  generateTicketNumber,
  createTicket,
  getUserTickets,
  getUserNotifications,
  getTicket,
  addMessage,
  closeTicket,
  // Admin
  getAllTickets,
  getAdminTicket,
  addAdminMessage,
  updateTicket,
};
