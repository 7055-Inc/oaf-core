/**
 * Permissions Service
 * User permissions CRUD operations
 */

const db = require('../../../../config/db');

/**
 * Get user permissions
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Permissions object
 */
async function get(userId) {
  const [rows] = await db.query(
    `SELECT * FROM user_permissions WHERE user_id = ?`,
    [userId]
  );
  
  if (rows.length === 0) {
    // Create default permissions row if none exists
    await db.query(
      `INSERT INTO user_permissions (user_id) VALUES (?)`,
      [userId]
    );
    return {
      user_id: userId,
      vendor: false,
      events: false,
      stripe_connect: false,
      verified: false,
      marketplace: false,
      manage_sites: false,
      manage_content: false,
      manage_system: false,
    };
  }
  
  return rows[0];
}

/**
 * Update user permissions
 * @param {number} userId - User ID
 * @param {Object} permissions - Permissions to update
 * @returns {Promise<Object>} Updated permissions
 */
async function update(userId, permissions) {
  const allowedFields = [
    'vendor', 'events', 'stripe_connect', 'verified',
    'marketplace', 'manage_sites', 'manage_content', 'manage_system'
  ];
  
  // Ensure permissions row exists
  await get(userId);
  
  const fields = [];
  const values = [];
  
  for (const [key, value] of Object.entries(permissions)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value ? 1 : 0);
    }
  }
  
  if (fields.length === 0) {
    return get(userId);
  }
  
  values.push(userId);
  
  await db.query(
    `UPDATE user_permissions SET ${fields.join(', ')} WHERE user_id = ?`,
    values
  );
  
  return get(userId);
}

/**
 * Get permissions for multiple users
 * @param {Array<number>} userIds - User IDs
 * @returns {Promise<Object>} Map of userId -> permissions
 */
async function getMultiple(userIds) {
  if (!userIds || userIds.length === 0) return {};
  
  const placeholders = userIds.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT * FROM user_permissions WHERE user_id IN (${placeholders})`,
    userIds
  );
  
  const result = {};
  for (const row of rows) {
    result[row.user_id] = row;
  }
  
  return result;
}

module.exports = {
  get,
  update,
  getMultiple,
};
