/**
 * User Service (Auth-related operations)
 * Handles user lookup and creation for authentication
 */

const { buildRoles, buildPermissions } = require('./permissions');

/**
 * Find user by login provider (Google, email, etc.)
 * @param {Object} db - Database connection
 * @param {string} provider - Provider name ('google', 'email')
 * @param {string} providerId - Provider-specific identifier
 * @returns {Promise<number|null>} User ID or null
 */
async function findUserByProvider(db, provider, providerId) {
  const [rows] = await db.query(
    'SELECT user_id FROM user_logins WHERE provider = ? AND provider_id = ?',
    [provider, providerId]
  );
  return rows[0]?.user_id || null;
}

/**
 * Find user by email/username
 * @param {Object} db - Database connection
 * @param {string} email - Email address
 * @returns {Promise<number|null>} User ID or null
 */
async function findUserByEmail(db, email) {
  const [rows] = await db.query(
    'SELECT id FROM users WHERE username = ?',
    [email]
  );
  return rows[0]?.id || null;
}

/**
 * Get user with roles and permissions
 * @param {Object} db - Database connection
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} User object with roles/permissions or null
 */
async function getUserWithRolesAndPermissions(db, userId) {
  // Get user type
  const [userRows] = await db.query(
    'SELECT user_type FROM users WHERE id = ?',
    [userId]
  );
  
  if (!userRows[0]) {
    return null;
  }
  
  // Get additional types
  const [typesRows] = await db.query(
    'SELECT type FROM user_types WHERE user_id = ?',
    [userId]
  );
  
  // Get permissions
  const [permissionRows] = await db.query(
    'SELECT * FROM user_permissions WHERE user_id = ?',
    [userId]
  );
  
  // Build roles and permissions
  const roles = buildRoles(userRows[0].user_type, typesRows);
  const permissions = buildPermissions(permissionRows[0], roles);
  
  return { userId, roles, permissions };
}

/**
 * Create a new user with all required profiles
 * @param {Object} db - Database connection
 * @param {Object} userData - User data
 * @param {string} userData.email - User email
 * @param {string} userData.emailVerified - 'yes' or 'no'
 * @param {string} userData.provider - Auth provider
 * @param {string} userData.providerId - Provider-specific ID
 * @param {string} userData.providerToken - Provider token
 * @returns {Promise<number>} New user ID
 */
async function createUser(db, { email, emailVerified, provider, providerId, providerToken }) {
  const status = emailVerified === 'yes' ? 'active' : 'draft';
  
  // Create user
  const [result] = await db.query(
    'INSERT INTO users (username, email_verified, status, user_type) VALUES (?, ?, ?, ?)',
    [email, emailVerified, status, 'Draft']
  );
  
  const userId = result.insertId;
  
  // Create login record
  await db.query(
    'INSERT INTO user_logins (user_id, provider, provider_id, provider_token, api_prefix) VALUES (?, ?, ?, ?, ?)',
    [userId, provider, providerId, providerToken, 'BEE-']
  );
  
  // Create all profile types
  await Promise.all([
    db.query('INSERT INTO user_profiles (user_id) VALUES (?)', [userId]),
    db.query('INSERT INTO artist_profiles (user_id) VALUES (?)', [userId]),
    db.query('INSERT INTO promoter_profiles (user_id) VALUES (?)', [userId]),
    db.query('INSERT INTO community_profiles (user_id) VALUES (?)', [userId]),
    db.query('INSERT INTO admin_profiles (user_id) VALUES (?)', [userId]),
  ]);
  
  return userId;
}

/**
 * Link a provider to an existing user
 * @param {Object} db - Database connection
 * @param {number} userId - User ID
 * @param {Object} providerData - Provider data
 * @param {string} providerData.provider - Provider name
 * @param {string} providerData.providerId - Provider ID
 * @param {string} providerData.providerToken - Provider token
 * @param {string} providerData.emailVerified - 'yes' or 'no'
 * @returns {Promise<void>}
 */
async function linkProviderToUser(db, userId, { provider, providerId, providerToken, emailVerified }) {
  await db.query(
    'INSERT INTO user_logins (user_id, provider, provider_id, provider_token, api_prefix) VALUES (?, ?, ?, ?, ?)',
    [userId, provider, providerId, providerToken, 'BEE-']
  );
  
  // Update email verification status
  const status = emailVerified === 'yes' ? 'active' : 'draft';
  await db.query(
    'UPDATE users SET email_verified = ?, status = ? WHERE id = ?',
    [emailVerified, status, userId]
  );
}

/**
 * Update user email verification status
 * @param {Object} db - Database connection
 * @param {number} userId - User ID
 * @param {string} emailVerified - 'yes' or 'no'
 * @returns {Promise<void>}
 */
async function updateEmailVerification(db, userId, emailVerified) {
  const status = emailVerified === 'yes' ? 'active' : 'draft';
  await db.query(
    'UPDATE users SET email_verified = ?, status = ? WHERE id = ?',
    [emailVerified, status, userId]
  );
}

/**
 * Get user's basic info
 * @param {Object} db - Database connection
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} User info or null
 */
async function getUserInfo(db, userId) {
  const [rows] = await db.query(
    'SELECT id, username, user_type, email_verified, status FROM users WHERE id = ?',
    [userId]
  );
  return rows[0] || null;
}

module.exports = {
  findUserByProvider,
  findUserByEmail,
  getUserWithRolesAndPermissions,
  createUser,
  linkProviderToUser,
  updateEmailVerification,
  getUserInfo,
};
