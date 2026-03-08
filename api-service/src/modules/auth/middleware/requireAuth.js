/**
 * Require Auth Middleware
 * Verifies JWT token and attaches user info to request
 * Replaces: api-service/src/middleware/jwt.js
 */

const { verifyToken } = require('../services/jwt');

/**
 * Middleware to require authentication
 * Sets req.userId, req.roles, req.permissions, and impersonation context
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ 
      success: false,
      error: { 
        code: 'NO_TOKEN', 
        message: 'No authentication token provided' 
      }
    });
  }
  
  // Extract token from "Bearer <token>"
  const token = authHeader.replace('Bearer ', '');
  
  // Verify token
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(401).json({ 
      success: false,
      error: { 
        code: 'INVALID_TOKEN', 
        message: 'Invalid or expired authentication token' 
      }
    });
  }
  
  // Attach user info to request
  req.userId = decoded.userId;
  req.roles = decoded.roles || [];
  req.permissions = decoded.permissions || [];
  
  // Handle impersonation context
  if (decoded.isImpersonating) {
    req.isImpersonating = true;
    req.originalUserId = decoded.originalUserId;
    req.impersonationLogId = decoded.impersonationLogId;
    req.impersonatedUsername = decoded.username;
  } else {
    req.isImpersonating = false;
    req.originalUserId = null;
  }
  
  // Convenience: attach full user object
  req.user = {
    userId: decoded.userId,
    roles: decoded.roles || [],
    permissions: decoded.permissions || [],
    isImpersonating: decoded.isImpersonating || false,
    originalUserId: decoded.originalUserId || null,
  };
  
  next();
}

module.exports = requireAuth;
