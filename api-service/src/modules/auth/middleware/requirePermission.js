/**
 * Require Permission Middleware
 * Checks if user has required permission
 * Replaces: api-service/src/middleware/permissions.js
 */

const { hasPermission, isAdmin, PERMISSIONS } = require('../services/permissions');

/**
 * Middleware factory to require a specific permission
 * 
 * @param {string} permission - Required permission
 * @returns {Function} Express middleware
 * 
 * @example
 * router.post('/products', requireAuth, requirePermission('vendor'), handler);
 */
function requirePermission(permission) {
  return (req, res, next) => {
    // Ensure user is authenticated first
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Authentication required'
        }
      });
    }
    
    const userPermissions = req.permissions || [];
    const userRoles = req.roles || [];
    
    // Check if user has the permission
    if (!hasPermission(userPermissions, userRoles, permission)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `Access denied. Required permission: ${permission}`
        }
      });
    }
    
    next();
  };
}

/**
 * Middleware factory to require ANY of the given permissions
 *
 * @param {string[]} permissions - Array of permission strings; user must have at least one
 * @returns {Function} Express middleware
 */
function requireAnyPermission(permissions) {
  return (req, res, next) => {
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Authentication required'
        }
      });
    }
    const userPermissions = req.permissions || [];
    const userRoles = req.roles || [];
    const hasAny = Array.isArray(permissions) && permissions.some(p => hasPermission(userPermissions, userRoles, p));
    if (!hasAny) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `Access denied. Required one of: ${(permissions || []).join(', ')}`
        }
      });
    }
    next();
  };
}

/**
 * Middleware to require admin access (for accessing all data)
 * 
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
function requireAllAccess(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'NOT_AUTHENTICATED',
        message: 'Authentication required'
      }
    });
  }
  
  if (!isAdmin(req.roles || [])) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'ADMIN_REQUIRED',
        message: 'Admin privileges required to access all data'
      }
    });
  }
  
  next();
}

/**
 * Check if user can access all data (admin check)
 * Helper function for conditional access
 * 
 * @param {Object} req - Express request
 * @returns {boolean}
 */
function canAccessAll(req) {
  return isAdmin(req.roles || []);
}

/**
 * Get user's effective permissions
 * Returns all permissions including inherited ones
 * 
 * @param {Object} req - Express request
 * @returns {string[]} Array of permission strings
 */
function getEffectivePermissions(req) {
  const userPermissions = [...(req.permissions || [])];
  const userRoles = req.roles || [];
  
  // Admin gets all permissions
  if (isAdmin(userRoles)) {
    return Object.values(PERMISSIONS);
  }
  
  return userPermissions;
}

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireAllAccess,
  canAccessAll,
  getEffectivePermissions,
};
