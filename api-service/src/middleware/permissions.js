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

/**
 * Validate that a user type is allowed to have a specific permission
 * Used when granting permissions to ensure business rules are followed
 */
const canUserTypeHavePermission = async (userType, permission) => {
  try {
    const [restrictions] = await db.query(
      'SELECT allowed_user_types FROM permission_restrictions WHERE permission_name = ?',
      [permission]
    );
    
    if (!restrictions[0]) {
      return false; // Permission doesn't exist
    }
    
    const allowedTypes = JSON.parse(restrictions[0].allowed_user_types);
    return allowedTypes.includes(userType);
  } catch (err) {
    console.error('Error checking permission restrictions:', err);
    return false;
  }
};

/**
 * Enhanced permission middleware that checks both permission and user type restrictions
 * Usage: router.post('/sites', verifyToken, requireRestrictedPermission('manage_sites'), handler)
 */
const requireRestrictedPermission = (permission) => {
  return async (req, res, next) => {
    // First check if user has the permission
    if (!hasPermission(req, permission)) {
      return res.status(403).json({ 
        error: `Access denied. Required permission: ${permission}` 
      });
    }
    
    // For non-admin users, verify their user type is allowed to have this permission
    if (!req.roles.includes('admin')) {
      const userType = req.roles.find(role => ['artist', 'promoter', 'community'].includes(role));
      if (!userType) {
        return res.status(403).json({ 
          error: 'Invalid user type for permission validation' 
        });
      }
      
      const canHave = await canUserTypeHavePermission(userType, permission);
      if (!canHave) {
        return res.status(403).json({ 
          error: `User type '${userType}' is not allowed to have permission '${permission}'` 
        });
      }
    }
    
    next();
  };
};

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
    const allPermissions = ['vendor', 'events', 'stripe_connect', 'manage_sites', 'manage_content', 'manage_system'];
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
  requireRestrictedPermission,
  canUserTypeHavePermission,
  hasUserType,
  requireUserType,
  getEffectivePermissions
}; 