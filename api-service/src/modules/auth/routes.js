/**
 * Auth Routes (v2)
 * Clean, modular authentication endpoints
 * 
 * Endpoints:
 *   POST /api/v2/auth/login       - Exchange Firebase token for JWT
 *   POST /api/v2/auth/refresh     - Refresh access token
 *   POST /api/v2/auth/logout      - Invalidate refresh token
 *   GET  /api/v2/auth/validate    - Validate current token
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Services
const { 
  createAccessToken, 
  verifyToken,
  generateRefreshToken,
  hashToken,
  storeRefreshToken,
  validateRefreshToken,
  rotateRefreshToken,
  invalidateRefreshToken,
  invalidateAllUserTokens,
  findUserByProvider,
  findUserByEmail,
  getUserWithRolesAndPermissions,
  createUser,
  linkProviderToUser,
  listKeys,
  createKey,
  toggleKey,
  deleteKey,
} = require('./services');

// Middleware
const { requireAuth } = require('./middleware');
const { apiKeyLimiter } = require('../shared/middleware/rateLimiter');

// Database connection
const pool = require('../../../config/db');

/**
 * POST /api/v2/auth/login
 * Exchange Firebase ID token for JWT access token
 * 
 * Body: { idToken: string, provider: string }
 * Returns: { success, data: { accessToken, refreshToken, user } }
 */
router.post('/login', async (req, res) => {
  try {
    const { idToken, provider } = req.body;
    
    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'Firebase ID token required' }
      });
    }
    
    // Decode Firebase token (trusts frontend Firebase SDK for verification)
    let decodedToken;
    try {
      decodedToken = jwt.decode(idToken);
      if (!decodedToken) {
        throw new Error('Failed to decode token');
      }
    } catch (decodeError) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid token format' }
      });
    }
    
    const email = decodedToken.email;
    const emailVerified = decodedToken.email_verified ? 'yes' : 'no';
    const providerId = provider === 'google' ? decodedToken.sub : email;
    
    // Find or create user
    let userId = await findUserByProvider(pool, provider, providerId);
    
    if (!userId) {
      // Check if email exists
      userId = await findUserByEmail(pool, email);
      
      if (userId) {
        // Link provider to existing user
        await linkProviderToUser(pool, userId, {
          provider,
          providerId,
          providerToken: idToken,
          emailVerified
        });
      } else {
        // Create new user
        userId = await createUser(pool, {
          email,
          emailVerified,
          provider,
          providerId,
          providerToken: idToken
        });
      }
    }
    
    // Get user with roles and permissions
    const userData = await getUserWithRolesAndPermissions(pool, userId);
    
    // Create JWT access token
    const accessToken = createAccessToken({
      userId: userData.userId,
      roles: userData.roles,
      permissions: userData.permissions
    });
    
    // Create refresh token
    const refreshToken = generateRefreshToken();
    const tokenHash = hashToken(refreshToken);
    const deviceInfo = req.headers['user-agent'] || 'Unknown';
    await storeRefreshToken(pool, userId, tokenHash, deviceInfo);
    
    const loginIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    const loginUa = (req.headers['user-agent'] || '').substring(0, 500);
    pool.query(
      `INSERT INTO auth_logs (email, provider, event_type, error_code, error_message, ip_address, user_agent)
       VALUES (?, ?, 'login_success', '', '', ?, ?)`,
      [email, provider || '', loginIp, loginUa]
    ).catch(logErr => console.error('Auth log write error:', logErr.message));

    return res.json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          userId: userData.userId,
          roles: userData.roles,
          permissions: userData.permissions
        }
      }
    });
    
  } catch (error) {
    console.error('Login error:', error.message);

    const loginIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    const loginUa = (req.headers['user-agent'] || '').substring(0, 500);
    pool.query(
      `INSERT INTO auth_logs (email, provider, event_type, error_code, error_message, ip_address, user_agent)
       VALUES (?, ?, 'server_error', 'LOGIN_ERROR', ?, ?, ?)`,
      [req.body?.email || '', req.body?.provider || '', (error.message || '').substring(0, 500), loginIp, loginUa]
    ).catch(logErr => console.error('Auth log write error:', logErr.message));

    return res.status(500).json({
      success: false,
      error: { code: 'LOGIN_ERROR', message: 'Authentication failed' }
    });
  }
});

/**
 * POST /api/v2/auth/refresh
 * Exchange refresh token for new access token (with token rotation)
 * 
 * Body: { refreshToken: string }
 * Returns: { success, data: { accessToken, refreshToken } }
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'Refresh token required' }
      });
    }
    
    const tokenHash = hashToken(refreshToken);
    const tokenRecord = await validateRefreshToken(pool, tokenHash);
    
    if (!tokenRecord) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token' }
      });
    }
    
    const userId = tokenRecord.user_id;
    
    // Get current user data
    const userData = await getUserWithRolesAndPermissions(pool, userId);
    
    if (!userData) {
      return res.status(401).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }
    
    // Create new access token
    const accessToken = createAccessToken({
      userId: userData.userId,
      roles: userData.roles,
      permissions: userData.permissions
    });
    
    // Rotate refresh token
    const newRefreshToken = generateRefreshToken();
    const newTokenHash = hashToken(newRefreshToken);
    const deviceInfo = req.headers['user-agent'] || 'Unknown';
    await rotateRefreshToken(pool, tokenHash, newTokenHash, userId, deviceInfo);
    
    return res.json({
      success: true,
      data: {
        accessToken,
        refreshToken: newRefreshToken,
        user: {
          userId: userData.userId,
          roles: userData.roles,
          permissions: userData.permissions
        }
      }
    });
    
  } catch (error) {
    console.error('Refresh error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'REFRESH_ERROR', message: 'Token refresh failed' }
    });
  }
});

/**
 * POST /api/v2/auth/logout
 * Invalidate refresh token (or all tokens with ?all=true)
 * 
 * Body: { refreshToken: string }
 * Query: ?all=true to logout from all devices
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const logoutAll = req.query.all === 'true';
    
    if (logoutAll) {
      // Invalidate all tokens for this user
      const count = await invalidateAllUserTokens(pool, req.userId);
      return res.json({
        success: true,
        data: { 
          message: `Logged out from ${count} device(s)`,
          devicesLoggedOut: count
        }
      });
    }
    
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await invalidateRefreshToken(pool, tokenHash);
    }
    
    return res.json({
      success: true,
      data: { message: 'Logged out successfully' }
    });
    
  } catch (error) {
    console.error('Logout error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'LOGOUT_ERROR', message: 'Logout failed' }
    });
  }
});

/**
 * GET /api/v2/auth/validate
 * Validate current token and return user info
 */
router.get('/validate', requireAuth, async (req, res) => {
  try {
    return res.json({
      success: true,
      data: {
        valid: true,
        user: {
          userId: req.userId,
          roles: req.roles,
          permissions: req.permissions,
          isImpersonating: req.isImpersonating || false,
          originalUserId: req.originalUserId || null
        }
      }
    });
  } catch (error) {
    console.error('Validate error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Token validation failed' }
    });
  }
});

/**
 * GET /api/v2/auth/me
 * Get current user info (refreshed from database)
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const userData = await getUserWithRolesAndPermissions(pool, req.userId);
    
    if (!userData) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }
    
    return res.json({
      success: true,
      data: {
        userId: userData.userId,
        roles: userData.roles,
        permissions: userData.permissions
      }
    });
    
  } catch (error) {
    console.error('Get me error:', error.message);
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to get user info' }
    });
  }
});

// ============================================================================
// AUTH LOGGING - capture client-side Firebase errors + server-side failures
// ============================================================================

/**
 * POST /api/v2/auth/log
 * Receive auth event logs from the client (unauthenticated -- user has no token on failure)
 * 
 * Body: { email, provider, event_type, error_code, error_message }
 */
router.post('/log', async (req, res) => {
  try {
    const { email, provider, event_type, error_code, error_message } = req.body;

    const allowed = ['login_success', 'login_failure', 'token_error', 'server_error'];
    if (!event_type || !allowed.includes(event_type)) {
      return res.status(400).json({ success: false, error: 'Invalid event_type' });
    }

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    const ua = (req.headers['user-agent'] || '').substring(0, 500);

    await pool.query(
      `INSERT INTO auth_logs (email, provider, event_type, error_code, error_message, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        (email || '').substring(0, 255),
        (provider || '').substring(0, 50),
        event_type,
        (error_code || '').substring(0, 100),
        (error_message || '').substring(0, 500),
        ip,
        ua
      ]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('Auth log error:', err.message);
    return res.status(500).json({ success: false });
  }
});

// ============================================================================
// API KEYS (v2) - Third-party / server-to-server auth
// ============================================================================

/**
 * GET /api/v2/auth/keys
 * List API keys for the authenticated user
 */
router.get('/keys', requireAuth, async (req, res) => {
  try {
    const keys = await listKeys(req.userId);
    return res.json(keys);
  } catch (error) {
    console.error('List API keys error:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve API keys' });
  }
});

/**
 * POST /api/v2/auth/keys
 * Create a new API key pair. Body: { name: string }
 * Returns { public_key, private_key, name } - private_key shown only once.
 */
router.post('/keys', apiKeyLimiter, requireAuth, async (req, res) => {
  try {
    const name = (req.body && req.body.name) ? String(req.body.name).trim() : 'API Key';
    const key = await createKey(req.userId, name || 'API Key');
    return res.status(201).json(key);
  } catch (error) {
    console.error('Create API key error:', error.message);
    return res.status(500).json({ error: 'Failed to generate API key' });
  }
});

/**
 * PUT /api/v2/auth/keys/:publicKey/toggle
 * Toggle is_active for an API key owned by the user
 */
router.put('/keys/:publicKey/toggle', requireAuth, async (req, res) => {
  try {
    const { publicKey } = req.params;
    const updated = await toggleKey(req.userId, publicKey);
    if (!updated) return res.status(404).json({ error: 'API key not found' });
    return res.json({ success: true, message: 'API key status updated' });
  } catch (error) {
    console.error('Toggle API key error:', error.message);
    return res.status(500).json({ error: 'Failed to update API key status' });
  }
});

/**
 * DELETE /api/v2/auth/keys/:publicKey
 * Delete an API key owned by the user
 */
router.delete('/keys/:publicKey', apiKeyLimiter, requireAuth, async (req, res) => {
  try {
    const { publicKey } = req.params;
    const deleted = await deleteKey(req.userId, publicKey);
    if (!deleted) return res.status(404).json({ error: 'API key not found' });
    return res.status(204).send();
  } catch (error) {
    console.error('Delete API key error:', error.message);
    return res.status(500).json({ error: 'Failed to delete API key' });
  }
});

module.exports = router;
