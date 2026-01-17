/**
 * JWT Service
 * Handles JWT token creation and validation
 */

const jwt = require('jsonwebtoken');

/**
 * Get JWT secret from environment
 * @returns {string}
 * @throws {Error} If JWT_SECRET not configured
 */
function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable not configured');
  }
  return secret;
}

/**
 * Create an access token (short-lived)
 * @param {Object} payload - Token payload
 * @param {number} payload.userId - User ID
 * @param {string[]} payload.roles - User roles
 * @param {string[]} payload.permissions - User permissions
 * @param {Object} [options] - Additional options
 * @param {string} [options.expiresIn='1h'] - Token expiration
 * @returns {string} JWT token
 */
function createAccessToken({ userId, roles, permissions }, options = {}) {
  const { expiresIn = '1h' } = options;
  
  return jwt.sign(
    { userId, roles, permissions },
    getSecret(),
    { expiresIn }
  );
}

/**
 * Create an impersonation token
 * @param {Object} payload - Token payload
 * @param {number} payload.userId - Impersonated user ID
 * @param {number} payload.originalUserId - Admin user ID
 * @param {number} payload.impersonationLogId - Log entry ID
 * @param {string} payload.username - Impersonated username
 * @param {string[]} payload.roles - Impersonated user roles
 * @param {string[]} payload.permissions - Impersonated user permissions
 * @returns {string} JWT token
 */
function createImpersonationToken({ 
  userId, 
  originalUserId, 
  impersonationLogId, 
  username, 
  roles, 
  permissions 
}) {
  return jwt.sign(
    {
      userId,
      originalUserId,
      isImpersonating: true,
      impersonationLogId,
      username,
      roles,
      permissions,
    },
    getSecret(),
    { expiresIn: '1h' }
  );
}

/**
 * Verify and decode a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded payload or null if invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch (err) {
    return null;
  }
}

/**
 * Decode a token without verification (for reading claims)
 * @param {string} token - JWT token
 * @returns {Object|null} Decoded payload or null
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (err) {
    return null;
  }
}

/**
 * Check if a token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if expired or invalid
 */
function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return true;
  }
  
  const now = Math.floor(Date.now() / 1000);
  return decoded.exp < now;
}

/**
 * Get time until token expires (in seconds)
 * @param {string} token - JWT token
 * @returns {number} Seconds until expiry, or 0 if expired/invalid
 */
function getTokenTimeRemaining(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) {
    return 0;
  }
  
  const now = Math.floor(Date.now() / 1000);
  const remaining = decoded.exp - now;
  return remaining > 0 ? remaining : 0;
}

module.exports = {
  createAccessToken,
  createImpersonationToken,
  verifyToken,
  decodeToken,
  isTokenExpired,
  getTokenTimeRemaining,
};
