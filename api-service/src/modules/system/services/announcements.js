/**
 * Announcements Service
 * 
 * Manages system-wide announcements including:
 * - CRUD operations for announcements
 * - User acknowledgment tracking
 * - Statistics and analytics
 */

const db = require('../../../../config/db');

/**
 * Parse target_user_types JSON safely
 * @param {*} rawData - Raw target_user_types from database
 * @returns {Array} Parsed array of user types
 */
function parseTargetUserTypes(rawData) {
  try {
    if (Array.isArray(rawData)) {
      return rawData;
    } else if (typeof rawData === 'string' && rawData.trim() !== '') {
      const parsed = JSON.parse(rawData);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch (err) {
    console.error('JSON parse error for target_user_types:', rawData, err);
    return [];
  }
}

/**
 * Get all announcements (admin)
 * @returns {Promise<Array>} List of all announcements
 */
async function getAllAnnouncements() {
  const [announcements] = await db.query(
    'SELECT a.*, u.username as created_by_username ' +
    'FROM announcements a ' +
    'LEFT JOIN users u ON a.created_by = u.id ' +
    'ORDER BY a.created_at DESC'
  );

  return announcements.map(announcement => ({
    ...announcement,
    target_user_types: parseTargetUserTypes(announcement.target_user_types)
  }));
}

/**
 * Get pending announcements for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} List of pending announcements
 */
async function getPendingAnnouncements(userId) {
  const currentTime = new Date();

  // Get user type
  const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
  if (!user[0]) {
    throw new Error('User not found');
  }
  const userType = user[0].user_type;

  // Get active announcements for this user type
  const [announcements] = await db.query(
    'SELECT a.* FROM announcements a ' +
    'WHERE a.is_active = TRUE ' +
    'AND a.show_from <= ? ' +
    'AND a.expires_at > ? ' +
    'AND JSON_CONTAINS(a.target_user_types, ?) ' +
    'ORDER BY a.created_at DESC',
    [currentTime, currentTime, JSON.stringify(userType)]
  );

  if (announcements.length === 0) {
    return [];
  }

  // Get acknowledgments
  const announcementIds = announcements.map(a => a.id);
  const idPlaceholders = announcementIds.map(() => '?').join(',');
  const [acknowledgments] = await db.query(
    'SELECT announcement_id, acknowledged_at, remind_later_at ' +
    'FROM user_acknowledgments ' +
    `WHERE user_id = ? AND announcement_id IN (${idPlaceholders})`,
    [userId, ...announcementIds]
  );

  // Filter to unacknowledged
  return announcements.filter(announcement => {
    const ack = acknowledgments.find(a => a.announcement_id === announcement.id);
    return !ack || ack.acknowledged_at === null;
  }).map(announcement => ({
    ...announcement,
    target_user_types: parseTargetUserTypes(announcement.target_user_types)
  }));
}

/**
 * Check if user has pending announcements
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Pending status
 */
async function checkPendingStatus(userId) {
  const pending = await getPendingAnnouncements(userId);
  return {
    hasPending: pending.length > 0,
    requiresAcknowledgment: pending.length > 0,
    pendingCount: pending.length
  };
}

/**
 * Create a new announcement
 * @param {Object} data - Announcement data
 * @param {number} createdBy - User ID of creator
 * @returns {Promise<Object>} Created announcement
 */
async function createAnnouncement(data, createdBy) {
  const { title, content, show_from, expires_at, target_user_types, is_active = true } = data;

  // Validate required fields
  if (!title || !content || !show_from || !expires_at || !target_user_types || !Array.isArray(target_user_types) || target_user_types.length === 0) {
    throw new Error('Missing required fields. Target user types must be a non-empty array.');
  }

  // Validate user types
  const validUserTypes = ['artist', 'promoter', 'community', 'admin'];
  const invalidTypes = target_user_types.filter(type => !validUserTypes.includes(type));
  if (invalidTypes.length > 0) {
    throw new Error(`Invalid user types: ${invalidTypes.join(', ')}`);
  }

  // Validate dates
  const showFromDate = new Date(show_from);
  const expiresAtDate = new Date(expires_at);
  if (showFromDate >= expiresAtDate) {
    throw new Error('Show from date must be before expires at date');
  }

  const [result] = await db.query(
    'INSERT INTO announcements (title, content, show_from, expires_at, target_user_types, is_active, created_by) ' +
    'VALUES (?, ?, ?, ?, ?, ?, ?)',
    [title, content, show_from, expires_at, JSON.stringify(target_user_types), is_active, createdBy]
  );

  return { id: result.insertId, message: 'Announcement created successfully' };
}

/**
 * Update an announcement
 * @param {number} id - Announcement ID
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Update result
 */
async function updateAnnouncement(id, data) {
  const { title, content, show_from, expires_at, target_user_types, is_active } = data;

  // Check if exists
  const [existing] = await db.query('SELECT id FROM announcements WHERE id = ?', [id]);
  if (!existing[0]) {
    throw new Error('Announcement not found');
  }

  // Validate user types if provided
  if (target_user_types !== undefined) {
    if (!Array.isArray(target_user_types) || target_user_types.length === 0) {
      throw new Error('Target user types must be a non-empty array.');
    }
    const validUserTypes = ['artist', 'promoter', 'community', 'admin'];
    const invalidTypes = target_user_types.filter(type => !validUserTypes.includes(type));
    if (invalidTypes.length > 0) {
      throw new Error(`Invalid user types: ${invalidTypes.join(', ')}`);
    }
  }

  // Validate dates if provided
  if (show_from && expires_at) {
    const showFromDate = new Date(show_from);
    const expiresAtDate = new Date(expires_at);
    if (showFromDate >= expiresAtDate) {
      throw new Error('Show from date must be before expires at date');
    }
  }

  // Build dynamic update query
  const updateFields = [];
  const updateValues = [];

  if (title) { updateFields.push('title = ?'); updateValues.push(title); }
  if (content) { updateFields.push('content = ?'); updateValues.push(content); }
  if (show_from) { updateFields.push('show_from = ?'); updateValues.push(show_from); }
  if (expires_at) { updateFields.push('expires_at = ?'); updateValues.push(expires_at); }
  if (target_user_types) { updateFields.push('target_user_types = ?'); updateValues.push(JSON.stringify(target_user_types)); }
  if (is_active !== undefined) { updateFields.push('is_active = ?'); updateValues.push(is_active); }

  if (updateFields.length === 0) {
    throw new Error('No fields to update');
  }

  updateValues.push(id);
  await db.query(`UPDATE announcements SET ${updateFields.join(', ')} WHERE id = ?`, updateValues);

  return { message: 'Announcement updated successfully' };
}

/**
 * Delete an announcement
 * @param {number} id - Announcement ID
 * @returns {Promise<Object>} Delete result
 */
async function deleteAnnouncement(id) {
  // Check if exists
  const [existing] = await db.query('SELECT id FROM announcements WHERE id = ?', [id]);
  if (!existing[0]) {
    throw new Error('Announcement not found');
  }

  // Delete acknowledgments first
  await db.query('DELETE FROM user_acknowledgments WHERE announcement_id = ?', [id]);

  // Delete announcement
  await db.query('DELETE FROM announcements WHERE id = ?', [id]);

  return { message: 'Announcement deleted successfully' };
}

/**
 * Get announcement statistics
 * @param {number} id - Announcement ID
 * @returns {Promise<Object>} Announcement with stats
 */
async function getAnnouncementStats(id) {
  const [announcement] = await db.query('SELECT * FROM announcements WHERE id = ?', [id]);
  if (!announcement[0]) {
    throw new Error('Announcement not found');
  }

  const announcementData = {
    ...announcement[0],
    target_user_types: parseTargetUserTypes(announcement[0].target_user_types)
  };

  // Get total target users
  const placeholders = announcementData.target_user_types.map(() => '?').join(',');
  const [totalTargetUsers] = await db.query(
    `SELECT COUNT(*) as count FROM users WHERE user_type IN (${placeholders}) AND status = "active"`,
    announcementData.target_user_types
  );

  // Get acknowledgment stats
  const [ackStats] = await db.query(
    'SELECT ' +
    'COUNT(*) as total_interactions, ' +
    'SUM(CASE WHEN acknowledged_at IS NOT NULL THEN 1 ELSE 0 END) as acknowledged_count, ' +
    'SUM(CASE WHEN acknowledged_at IS NULL AND remind_later_at IS NOT NULL THEN 1 ELSE 0 END) as remind_later_count ' +
    'FROM user_acknowledgments WHERE announcement_id = ?',
    [id]
  );

  const totalTargets = totalTargetUsers[0].count;
  const acknowledged = ackStats[0].acknowledged_count || 0;
  const remindLater = ackStats[0].remind_later_count || 0;
  const noResponse = totalTargets - acknowledged - remindLater;

  return {
    announcement: announcementData,
    stats: {
      total_target_users: totalTargets,
      acknowledged: acknowledged,
      remind_later: remindLater,
      no_response: noResponse,
      acknowledgment_rate: totalTargets > 0 ? (acknowledged / totalTargets * 100).toFixed(1) : 0
    }
  };
}

/**
 * Acknowledge an announcement
 * @param {number} announcementId - Announcement ID
 * @param {number} userId - User ID
 * @param {Object} clientInfo - IP and user agent
 * @returns {Promise<Object>} Acknowledgment result
 */
async function acknowledgeAnnouncement(announcementId, userId, clientInfo) {
  const currentTime = new Date();

  // Get user type
  const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
  if (!user[0]) {
    throw new Error('User not found');
  }
  const userType = user[0].user_type;

  // Check if announcement exists and is valid
  const [announcement] = await db.query(
    'SELECT * FROM announcements WHERE id = ? AND is_active = TRUE AND show_from <= ? AND expires_at > ?',
    [announcementId, currentTime, currentTime]
  );

  if (!announcement[0]) {
    throw new Error('Announcement not found or expired');
  }

  const targetUserTypes = parseTargetUserTypes(announcement[0].target_user_types);
  if (!targetUserTypes.includes(userType)) {
    throw new Error('This announcement is not for your user type');
  }

  const { ipAddress, userAgent } = clientInfo;

  await db.query(
    'INSERT INTO user_acknowledgments (user_id, announcement_id, acknowledged_at, ip_address, user_agent) ' +
    'VALUES (?, ?, ?, ?, ?) ' +
    'ON DUPLICATE KEY UPDATE acknowledged_at = ?, ip_address = ?, user_agent = ?',
    [userId, announcementId, currentTime, ipAddress, userAgent, currentTime, ipAddress, userAgent]
  );

  return { message: 'Announcement acknowledged successfully' };
}

/**
 * Set reminder for an announcement
 * @param {number} announcementId - Announcement ID
 * @param {number} userId - User ID
 * @param {Object} clientInfo - IP and user agent
 * @returns {Promise<Object>} Reminder result
 */
async function setReminder(announcementId, userId, clientInfo) {
  const currentTime = new Date();

  // Get user type
  const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
  if (!user[0]) {
    throw new Error('User not found');
  }
  const userType = user[0].user_type;

  // Check if announcement exists and is valid
  const [announcement] = await db.query(
    'SELECT * FROM announcements WHERE id = ? AND is_active = TRUE AND show_from <= ? AND expires_at > ?',
    [announcementId, currentTime, currentTime]
  );

  if (!announcement[0]) {
    throw new Error('Announcement not found or expired');
  }

  const targetUserTypes = parseTargetUserTypes(announcement[0].target_user_types);
  if (!targetUserTypes.includes(userType)) {
    throw new Error('This announcement is not for your user type');
  }

  const { ipAddress, userAgent } = clientInfo;

  await db.query(
    'INSERT INTO user_acknowledgments (user_id, announcement_id, remind_later_at, ip_address, user_agent) ' +
    'VALUES (?, ?, ?, ?, ?) ' +
    'ON DUPLICATE KEY UPDATE remind_later_at = ?, ip_address = ?, user_agent = ?',
    [userId, announcementId, currentTime, ipAddress, userAgent, currentTime, ipAddress, userAgent]
  );

  return { message: 'Reminder set successfully' };
}

module.exports = {
  getAllAnnouncements,
  getPendingAnnouncements,
  checkPendingStatus,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementStats,
  acknowledgeAnnouncement,
  setReminder
};
