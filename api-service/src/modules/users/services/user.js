/**
 * User Service
 * Core user CRUD operations
 */

const db = require('../../../../config/db');

/**
 * Find user by ID
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} User object or null
 */
async function findById(userId) {
  const [users] = await db.query(
    'SELECT id, username, email_verified, status, user_type, created_at, updated_at FROM users WHERE id = ?',
    [userId]
  );
  return users[0] || null;
}

/**
 * Find user by username (email)
 * @param {string} username - Username/email
 * @returns {Promise<Object|null>} User object or null
 */
async function findByUsername(username) {
  const [users] = await db.query(
    'SELECT id, username, email_verified, status, user_type, created_at, updated_at FROM users WHERE username = ?',
    [username]
  );
  return users[0] || null;
}

/**
 * Find user by Google UID
 * @param {string} googleUid - Google UID
 * @returns {Promise<Object|null>} User object or null
 */
async function findByGoogleUid(googleUid) {
  const [users] = await db.query(
    'SELECT id, username, email_verified, status, user_type, created_at, updated_at FROM users WHERE google_uid = ?',
    [googleUid]
  );
  return users[0] || null;
}

/**
 * Create a new user
 * @param {Object} userData - User data
 * @param {string} userData.username - Username/email
 * @param {string} userData.googleUid - Google UID (optional)
 * @param {string} userData.userType - User type (artist, community, promoter, admin)
 * @param {string} userData.status - User status (default: 'draft')
 * @param {boolean} userData.emailVerified - Email verified flag
 * @returns {Promise<Object>} Created user with ID
 */
async function create({ username, googleUid, userType = 'community', status = 'draft', emailVerified = false }) {
  const [result] = await db.query(
    `INSERT INTO users (username, google_uid, user_type, status, email_verified) 
     VALUES (?, ?, ?, ?, ?)`,
    [username, googleUid || null, userType, status, emailVerified ? 'yes' : 'no']
  );
  
  return {
    id: result.insertId,
    username,
    userType,
    status,
    emailVerified,
  };
}

/**
 * Update user fields
 * @param {number} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<boolean>} Success
 */
async function update(userId, updates) {
  const allowedFields = ['username', 'user_type', 'status', 'email_verified', 'onboarding_completed', 'meta_title', 'meta_description'];
  
  const fields = [];
  const values = [];
  
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
  }
  
  if (fields.length === 0) {
    return false;
  }
  
  values.push(userId);
  
  const [result] = await db.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
  
  return result.affectedRows > 0;
}

/**
 * Update user type
 * @param {number} userId - User ID
 * @param {string} userType - New user type
 * @returns {Promise<boolean>} Success
 */
async function updateUserType(userId, userType) {
  const validTypes = ['artist', 'community', 'promoter', 'admin'];
  if (!validTypes.includes(userType)) {
    throw new Error(`Invalid user type: ${userType}`);
  }
  
  const [result] = await db.query(
    'UPDATE users SET user_type = ? WHERE id = ?',
    [userType, userId]
  );
  
  return result.affectedRows > 0;
}

/**
 * Update user status
 * @param {number} userId - User ID
 * @param {string} status - New status
 * @returns {Promise<boolean>} Success
 */
async function updateStatus(userId, status) {
  const validStatuses = ['draft', 'active', 'suspended', 'deleted'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}`);
  }
  
  const [result] = await db.query(
    'UPDATE users SET status = ? WHERE id = ?',
    [status, userId]
  );
  
  return result.affectedRows > 0;
}

/**
 * Delete user (soft delete by setting status to 'deleted')
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} Success
 */
async function softDelete(userId) {
  return updateStatus(userId, 'deleted');
}

/**
 * List users with filters and pagination
 * @param {Object} options - Query options
 * @param {string} options.search - Search term (username, first_name, last_name)
 * @param {string} options.userType - Filter by user type
 * @param {string} options.status - Filter by status
 * @param {Array} options.permissions - Filter by permissions
 * @param {number} options.page - Page number (1-indexed)
 * @param {number} options.limit - Items per page
 * @param {string} options.sortBy - Sort field
 * @param {string} options.sortOrder - Sort order (asc, desc)
 * @returns {Promise<Object>} { users, total, page, limit, totalPages }
 */
async function list({
  search = '',
  userType = null,
  status = 'active',
  permissions = [],
  page = 1,
  limit = 50,
  sortBy = 'created_at',
  sortOrder = 'desc',
} = {}) {
  const whereConditions = ['1=1'];
  const params = [];
  
  // Status filter
  if (status) {
    whereConditions.push('u.status = ?');
    params.push(status);
  }
  
  // User type filter
  if (userType) {
    whereConditions.push('u.user_type = ?');
    params.push(userType);
  }
  
  // Search filter
  if (search) {
    whereConditions.push('(u.username LIKE ? OR up.first_name LIKE ? OR up.last_name LIKE ?)');
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }
  
  // Permissions filter
  if (permissions.length > 0) {
    const permissionConditions = permissions.map(p => `uper.${p} = 1`);
    whereConditions.push(`(${permissionConditions.join(' OR ')})`);
  }
  
  // Validate sort field to prevent SQL injection
  const allowedSortFields = ['created_at', 'username', 'user_type', 'status', 'first_name', 'last_name'];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
  const safeSortOrder = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  
  // Count total
  const countQuery = `
    SELECT COUNT(DISTINCT u.id) as total
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN user_permissions uper ON u.id = uper.user_id
    WHERE ${whereConditions.join(' AND ')}
  `;
  
  const [countResult] = await db.query(countQuery, params);
  const total = countResult[0].total;
  
  // Fetch users
  const offset = (page - 1) * limit;
  const sortField = safeSortBy === 'first_name' || safeSortBy === 'last_name' ? `up.${safeSortBy}` : `u.${safeSortBy}`;
  
  const query = `
    SELECT DISTINCT
      u.id, u.username, u.user_type, u.status, u.email_verified, u.created_at, u.updated_at,
      up.first_name, up.last_name, up.display_name, up.profile_image_path
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN user_permissions uper ON u.id = uper.user_id
    WHERE ${whereConditions.join(' AND ')}
    ORDER BY ${sortField} ${safeSortOrder}
    LIMIT ? OFFSET ?
  `;
  
  const [users] = await db.query(query, [...params, limit, offset]);
  
  return {
    users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Get users by permission
 * @param {Array<string>} permissions - Permission names to filter by
 * @returns {Promise<Array>} Users with those permissions
 */
async function getByPermissions(permissions) {
  if (!permissions || permissions.length === 0) {
    return [];
  }
  
  // Separate user types from actual permissions
  const userTypes = [];
  const actualPermissions = [];
  
  for (const permission of permissions) {
    if (permission === 'admin') {
      userTypes.push('admin');
    } else {
      actualPermissions.push(permission);
    }
  }
  
  let whereConditions = [];
  let queryParams = [];
  
  if (userTypes.length > 0) {
    const placeholders = userTypes.map(() => '?').join(',');
    whereConditions.push(`u.user_type IN (${placeholders})`);
    queryParams.push(...userTypes);
  }
  
  for (const permission of actualPermissions) {
    whereConditions.push(`up.${permission} = ?`);
    queryParams.push(true);
  }
  
  if (whereConditions.length === 0) {
    return [];
  }
  
  const query = `
    SELECT DISTINCT 
      u.id, u.username, u.user_type, u.status,
      prof.first_name, prof.last_name, prof.display_name
    FROM users u
    LEFT JOIN user_permissions up ON u.id = up.user_id
    LEFT JOIN user_profiles prof ON u.id = prof.user_id
    WHERE u.status = 'active' AND (${whereConditions.join(' OR ')})
    ORDER BY prof.first_name, prof.last_name, u.username
  `;
  
  const [users] = await db.query(query, queryParams);
  
  return users.map(user => ({
    id: user.id,
    username: user.username,
    userType: user.user_type,
    firstName: user.first_name,
    lastName: user.last_name,
    displayName: user.display_name || 
      (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username),
  }));
}

module.exports = {
  findById,
  findByUsername,
  findByGoogleUid,
  create,
  update,
  updateUserType,
  updateStatus,
  softDelete,
  list,
  getByPermissions,
};
