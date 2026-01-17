/**
 * Auth Middleware Index
 * Re-exports all auth middleware for clean imports
 */

const requireAuth = require('./requireAuth');
const { 
  requirePermission, 
  requireAllAccess, 
  canAccessAll, 
  getEffectivePermissions 
} = require('./requirePermission');
const { 
  requireRole, 
  requireAdmin, 
  requireAnyRole, 
  requireNotDraft 
} = require('./requireRole');

module.exports = {
  // JWT authentication
  requireAuth,
  // BACKWARD COMPATIBILITY: Old name for requireAuth
  verifyToken: requireAuth,
  
  // Permission middleware
  requirePermission,
  requireAllAccess,
  canAccessAll,
  getEffectivePermissions,
  // BACKWARD COMPATIBILITY: Old names
  hasPermission: requirePermission,  
  
  // Role middleware
  requireRole,
  requireAdmin,
  requireAnyRole,
  requireNotDraft,
  // BACKWARD COMPATIBILITY: Old names
  hasUserType: requireRole,
  requireUserType: requireRole,
};
