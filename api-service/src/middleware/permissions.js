/**
 * Permission Middleware (Backward Compatibility Wrapper)
 * 
 * This file now re-exports from the auth module with interface adapters.
 * New code should import from: require('../modules/auth')
 * 
 * @deprecated Import from '../modules/auth' instead
 */

const { 
  hasPermission: _hasPermission, 
  hasRole,
  isAdmin,
  PERMISSIONS 
} = require('../modules/auth/services/permissions');

const {
  requirePermission,
  requireAllAccess,
  canAccessAll,
  getEffectivePermissions,
} = require('../modules/auth/middleware/requirePermission');

/**
 * Check if a user has a specific permission
 * Adapter for old interface: hasPermission(req, permission)
 * New interface is: hasPermission(permissions, roles, permission)
 */
const hasPermission = (req, permission) => {
  const permissions = req.permissions || [];
  const roles = req.roles || [];
  return _hasPermission(permissions, roles, permission);
};

/**
 * Legacy support: Check if user has specific user type
 * @deprecated Use hasRole from modules/auth instead
 */
const hasUserType = (req, userType) => {
  const roles = req.roles || [];
  return hasRole(roles, userType);
};

/**
 * Legacy middleware: Require specific user type
 * @deprecated Use requireRole from modules/auth/middleware instead
 */
const requireUserType = (userType) => {
  return (req, res, next) => {
    if (!hasUserType(req, userType)) {
      return res.status(403).json({ 
        error: `Access denied. Required user type: ${userType}` 
      });
    }
    next();
  };
};

module.exports = {
  hasPermission,
  requirePermission,
  canAccessAll,
  requireAllAccess,
  hasUserType,
  requireUserType,
  getEffectivePermissions,
};
