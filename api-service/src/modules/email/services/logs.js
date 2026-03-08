/**
 * Email Logs Service
 * Handles email history and log operations
 */

const db = require('../../../../config/db');

/**
 * Get email logs with filters and pagination
 */
async function getLogs(filters = {}) {
  const {
    search = '',
    status = '',
    templateId = '',
    startDate = '',
    endDate = '',
    page = 1,
    limit = 50
  } = filters;
  
  let query = `
    SELECT el.*, et.name as template_name, et.template_key
    FROM email_log el
    LEFT JOIN email_templates et ON el.template_id = et.id
    WHERE 1=1
  `;
  const params = [];
  
  if (search) {
    query += ` AND (el.email_address LIKE ? OR el.subject LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`);
  }
  
  if (status) {
    query += ` AND el.status = ?`;
    params.push(status);
  }
  
  if (templateId) {
    query += ` AND el.template_id = ?`;
    params.push(templateId);
  }
  
  if (startDate) {
    query += ` AND el.sent_at >= ?`;
    params.push(startDate);
  }
  
  if (endDate) {
    query += ` AND el.sent_at <= ?`;
    params.push(endDate + ' 23:59:59');
  }
  
  // Get total count
  const countQuery = query.replace('SELECT el.*, et.name as template_name, et.template_key', 'SELECT COUNT(*) as total');
  const [countResult] = await db.execute(countQuery, params);
  const total = countResult[0].total;
  
  // Add pagination - use direct interpolation for LIMIT/OFFSET (safe since they're already integers)
  const limitNum = parseInt(limit) || 50;
  const offset = ((parseInt(page) || 1) - 1) * limitNum;
  query += ` ORDER BY el.sent_at DESC LIMIT ${limitNum} OFFSET ${offset}`;
  
  const [logs] = await db.execute(query, params);
  
  return {
    logs,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
}

/**
 * Get a single email log by ID
 */
async function getLogById(id) {
  const [logs] = await db.execute(
    `SELECT el.*, et.name as template_name, et.template_key, et.body_template
     FROM email_log el
     LEFT JOIN email_templates et ON el.template_id = et.id
     WHERE el.id = ?`,
    [id]
  );
  return logs.length > 0 ? logs[0] : null;
}

/**
 * Get email statistics
 */
async function getStats() {
  // Queue status
  const [queueStats] = await db.execute(
    `SELECT status, COUNT(*) as count 
     FROM email_queue 
     GROUP BY status`
  );
  
  // Monthly stats (30 days)
  const [monthlyStats] = await db.execute(
    `SELECT status, COUNT(*) as count 
     FROM email_log 
     WHERE sent_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY status`
  );
  
  // Template usage
  const [templateStats] = await db.execute(
    `SELECT et.name, et.template_key, COUNT(el.id) as sent_count
     FROM email_templates et
     LEFT JOIN email_log el ON et.id = el.template_id AND el.sent_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY et.id
     ORDER BY sent_count DESC
     LIMIT 10`
  );
  
  // Today's stats
  const [todayStats] = await db.execute(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
     FROM email_log
     WHERE DATE(sent_at) = CURDATE()`
  );
  
  return {
    queue: queueStats,
    monthly: monthlyStats,
    templates: templateStats,
    today: todayStats[0]
  };
}

/**
 * Get recent email activity
 */
async function getRecentActivity(limit = 20) {
  const limitNum = parseInt(limit) || 20;
  const [logs] = await db.execute(
    `SELECT el.id, el.email_address as recipient, el.subject, el.status, el.sent_at as created_at,
            et.name as template_name
     FROM email_log el
     LEFT JOIN email_templates et ON el.template_id = et.id
     ORDER BY el.sent_at DESC
     LIMIT ${limitNum}`
  );
  return logs;
}

/**
 * Create a new log entry for resent email
 */
async function createLogEntry(data) {
  const {
    user_id,
    email_address,
    template_id,
    subject,
    status = 'sent',
    attempt_count = 1,
    error_message = null
  } = data;
  
  const [result] = await db.execute(
    `INSERT INTO email_log (user_id, email_address, template_id, subject, status, attempt_count, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [user_id, email_address, template_id, subject, status, attempt_count, error_message]
  );
  
  return result.insertId;
}

module.exports = {
  getLogs,
  getLogById,
  getStats,
  getRecentActivity,
  createLogEntry
};
