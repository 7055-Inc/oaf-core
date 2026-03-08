/**
 * Require Role Middleware
 * Checks if user has a specific role
 */

const { hasRole, isAdmin, ROLES } = require('../services/permissions');

/**
 * Middleware factory to require a specific role
 * 
 * @param {string} role - Required role
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/admin-panel', requireAuth, requireRole('admin'), handler);
 */
function requireRole(role) {
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
    
    const userRoles = req.roles || [];
    
    // Check if user has the role
    if (!hasRole(userRoles, role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ROLE_DENIED',
          message: `Access denied. Required role: ${role}`
        }
      });
    }
    
    next();
  };
}

/**
 * Middleware to require admin role
 * Convenience function for common admin checks
 */
function requireAdmin(req, res, next) {
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
        message: 'Admin privileges required'
      }
    });
  }
  
  next();
}

/**
 * Middleware factory to require any of multiple roles
 * 
 * @param {string[]} roles - Array of acceptable roles
 * @returns {Function} Express middleware
 * 
 * @example
 * router.get('/dashboard', requireAuth, requireAnyRole(['admin', 'vendor']), handler);
 */
function requireAnyRole(roles) {
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
    
    const userRoles = req.roles || [];
    const hasAnyRole = roles.some(role => hasRole(userRoles, role));
    
    if (!hasAnyRole) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ROLE_DENIED',
          message: `Access denied. Required one of: ${roles.join(', ')}`
        }
      });
    }
    
    next();
  };
}

/**
 * Check if user has completed initial setup (not Draft)
 * Users must complete user-type-selection before accessing most features
 */
function requireNotDraft(req, res, next) {
  if (!req.userId) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'NOT_AUTHENTICATED',
        message: 'Authentication required'
      }
    });
  }
  
  const userRoles = req.roles || [];
  
  if (hasRole(userRoles, ROLES.DRAFT)) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'SETUP_REQUIRED',
        message: 'Please complete your account setup before continuing'
      }
    });
  }
  
  next();
}

module.exports = {
  requireRole,
  requireAdmin,
  requireAnyRole,
  requireNotDraft,
};
