/**
 * Session Service
 * Handles refresh token creation, validation, and rotation
 */

const crypto = require('crypto');

// Default expiration: 7 days
const DEFAULT_REFRESH_EXPIRY_DAYS = 7;
// Grace period for token rotation (handles race conditions)
const ROTATION_GRACE_SECONDS = 30;
// Cleanup threshold for old rotated tokens
const CLEANUP_THRESHOLD_MINUTES = 5;

/**
 * Generate a new refresh token
 * @returns {string} Random 128-character hex string
 */
function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

/**
 * Hash a refresh token for storage
 * @param {string} token - Raw refresh token
 * @returns {string} SHA-256 hash of token
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Calculate expiration date for refresh token
 * @param {number} [days] - Days until expiry
 * @returns {Date} Expiration date
 */
function calculateExpiry(days = DEFAULT_REFRESH_EXPIRY_DAYS) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * Store a refresh token in the database
 * @param {Object} db - Database connection
 * @param {number} userId - User ID
 * @param {string} tokenHash - Hashed refresh token
 * @param {string} deviceInfo - User agent or device identifier
 * @returns {Promise<void>}
 */
async function storeRefreshToken(db, userId, tokenHash, deviceInfo) {
  const expiresAt = calculateExpiry();
  
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info) VALUES (?, ?, ?, ?)',
    [userId, tokenHash, expiresAt, deviceInfo || 'Unknown']
  );
}

/**
 * Validate a refresh token
 * @param {Object} db - Database connection
 * @param {string} tokenHash - Hashed refresh token
 * @returns {Promise<Object|null>} Token record or null if invalid
 */
async function validateRefreshToken(db, tokenHash) {
  // Check both active tokens AND recently rotated tokens (grace period)
  const [records] = await db.query(
    `SELECT user_id, expires_at, rotated_at FROM refresh_tokens 
     WHERE token_hash = ? 
     AND expires_at > NOW()
     AND (rotated_at IS NULL OR rotated_at > DATE_SUB(NOW(), INTERVAL ? SECOND))`,
    [tokenHash, ROTATION_GRACE_SECONDS]
  );
  
  return records[0] || null;
}

/**
 * Check if token was already rotated (for race condition handling)
 * @param {Object} tokenRecord - Token record from database
 * @returns {boolean} True if already rotated
 */
function isTokenRotated(tokenRecord) {
  return tokenRecord && tokenRecord.rotated_at !== null;
}

/**
 * Rotate a refresh token (mark old as used, create new)
 * @param {Object} db - Database connection
 * @param {string} oldTokenHash - Hash of the old token
 * @param {string} newTokenHash - Hash of the new token
 * @param {number} userId - User ID
 * @param {string} deviceInfo - User agent or device identifier
 * @returns {Promise<void>}
 */
async function rotateRefreshToken(db, oldTokenHash, newTokenHash, userId, deviceInfo) {
  // Mark old token as rotated (don't delete - allows grace period)
  await db.query(
    'UPDATE refresh_tokens SET rotated_at = NOW() WHERE token_hash = ?',
    [oldTokenHash]
  );
  
  // Create new token
  await storeRefreshToken(db, userId, newTokenHash, deviceInfo);
  
  // Cleanup old rotated tokens for this user
  await cleanupRotatedTokens(db, userId);
}

/**
 * Clean up old rotated tokens
 * @param {Object} db - Database connection
 * @param {number} userId - User ID
 * @returns {Promise<void>}
 */
async function cleanupRotatedTokens(db, userId) {
  await db.query(
    'DELETE FROM refresh_tokens WHERE user_id = ? AND rotated_at IS NOT NULL AND rotated_at < DATE_SUB(NOW(), INTERVAL ? MINUTE)',
    [userId, CLEANUP_THRESHOLD_MINUTES]
  );
}

/**
 * Invalidate all refresh tokens for a user (logout from all devices)
 * @param {Object} db - Database connection
 * @param {number} userId - User ID
 * @returns {Promise<number>} Number of tokens invalidated
 */
async function invalidateAllUserTokens(db, userId) {
  const [result] = await db.query(
    'DELETE FROM refresh_tokens WHERE user_id = ?',
    [userId]
  );
  return result.affectedRows;
}

/**
 * Invalidate a specific refresh token
 * @param {Object} db - Database connection
 * @param {string} tokenHash - Hash of token to invalidate
 * @returns {Promise<boolean>} True if token was found and invalidated
 */
async function invalidateRefreshToken(db, tokenHash) {
  const [result] = await db.query(
    'DELETE FROM refresh_tokens WHERE token_hash = ?',
    [tokenHash]
  );
  return result.affectedRows > 0;
}

/**
 * Get active token count for a user
 * @param {Object} db - Database connection
 * @param {number} userId - User ID
 * @returns {Promise<number>} Number of active tokens
 */
async function getActiveTokenCount(db, userId) {
  const [rows] = await db.query(
    'SELECT COUNT(*) as count FROM refresh_tokens WHERE user_id = ? AND expires_at > NOW() AND rotated_at IS NULL',
    [userId]
  );
  return rows[0].count;
}

module.exports = {
  generateRefreshToken,
  hashToken,
  calculateExpiry,
  storeRefreshToken,
  validateRefreshToken,
  isTokenRotated,
  rotateRefreshToken,
  cleanupRotatedTokens,
  invalidateAllUserTokens,
  invalidateRefreshToken,
  getActiveTokenCount,
};
