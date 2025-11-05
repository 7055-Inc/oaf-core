const db = require('../../config/db');

/**
 * Permission validation middleware for the new logical permission system
 * Replaces hardcoded user type checks with flexible permission-based access
 */

/**
 * Check if a user has a specific permission
 * Handles admin auto-permissions, permission restrictions, and inheritance
 */
const hasPermission = (req, permission) => {
  // Admin users get all permissions automatically
  if (req.roles && req.roles.includes('admin')) {
    return true;
  }
  
  // Check if user has the specific permission
  if (req.permissions && req.permissions.includes(permission)) {
    return true;
  }
  
  // Handle permission inheritance: vendor and events permissions grant stripe_connect access
  if (permission === 'stripe_connect' && req.permissions && req.permissions.includes('vendor')) {
    return true;
  }
  if (permission === 'stripe_connect' && req.permissions && req.permissions.includes('events')) {
    return true;
  }
  
  // Handle permission inheritance: vendor permission grants marketplace access
  if (permission === 'marketplace' && req.permissions && req.permissions.includes('vendor')) {
    return true;
  }
  
  return false;
};



/**
 * Require a specific permission to access an endpoint
 * Usage: router.get('/endpoint', verifyToken, requirePermission('vendor'), handler)
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!hasPermission(req, permission)) {
      return res.status(403).json({ 
        error: `Access denied. Required permission: ${permission}` 
      });
    }
    next();
  };
};

/**
 * Check if user can access "all" data vs just "my" data
 * Admin users can access all data, regular users can only access their own
 */
const canAccessAll = (req) => {
  return req.roles && req.roles.includes('admin');
};

/**
 * Middleware to enforce /my vs /all access patterns
 * Usage: router.get('/users/all', verifyToken, requireAllAccess, handler)
 */
const requireAllAccess = (req, res, next) => {
  if (!canAccessAll(req)) {
    return res.status(403).json({ 
      error: 'Access denied. Admin privileges required to access all data.' 
    });
  }
  next();
};

// Removed deprecated permission restrictions system
// All permissions are now managed through simple JWT-based checking

/**
 * Legacy support: Check if user has specific user type
 * Use sparingly - prefer permission-based checks where possible
 */
const hasUserType = (req, userType) => {
  return req.roles && req.roles.includes(userType);
};

/**
 * Legacy middleware: Require specific user type
 * Use sparingly - prefer permission-based checks where possible
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

/**
 * Get user's effective permissions including admin auto-permissions
 */
const getEffectivePermissions = (req) => {
  const permissions = [...(req.permissions || [])];
  
  // Admin users get all permissions automatically
  if (req.roles && req.roles.includes('admin')) {
    const allPermissions = ['vendor', 'events', 'stripe_connect', 'manage_sites', 'manage_content', 'manage_system', 'shipping'];
    for (const permission of allPermissions) {
      if (!permissions.includes(permission)) {
        permissions.push(permission);
      }
    }
  }
  
  return permissions;
};

module.exports = {
  hasPermission,
  requirePermission,
  canAccessAll,
  requireAllAccess,
  hasUserType,
  requireUserType,
  getEffectivePermissions
}; 