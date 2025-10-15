const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');

/**
 * JWT Authentication Middleware for Luca Platform
 * Verifies JWT tokens and extracts user context with team access support
 */

/**
 * Get all user IDs that the current user can access (own data + team data)
 */
async function getAccessibleUserIds(userId) {
  try {
    const accessibleIds = [userId]; // Always include own user ID
    
    // Get teams where user is a member and can access owner's data
    const teamAccess = await executeQuery(`
      SELECT DISTINCT t.owner_user_id 
      FROM teams t 
      JOIN team_members tm ON t.id = tm.team_id 
      WHERE tm.user_id = ? AND tm.is_active = TRUE
    `, [userId]);
    
    // Add team owners' user IDs to accessible list
    teamAccess.forEach(team => {
      if (!accessibleIds.includes(team.owner_user_id)) {
        accessibleIds.push(team.owner_user_id);
      }
    });
    
    return accessibleIds;
  } catch (error) {
    console.error('Error getting accessible user IDs:', error);
    return [userId]; // Fallback to just own user ID
  }
}

/**
 * Get user's team permissions for a specific team owner
 */
async function getTeamPermissions(userId, ownerUserId) {
  try {
    if (userId === ownerUserId) {
      // User accessing their own data - full permissions
      return {
        materials: 'edit',
        products: 'edit', 
        collections: 'edit',
        shipping: 'edit',
        reports: 'view'
      };
    }
    
    const result = await executeQuery(`
      SELECT tm.permissions, tm.role
      FROM teams t 
      JOIN team_members tm ON t.id = tm.team_id 
      WHERE t.owner_user_id = ? AND tm.user_id = ? AND tm.is_active = TRUE
      LIMIT 1
    `, [ownerUserId, userId]);
    
    if (result.length > 0) {
      return JSON.parse(result[0].permissions || '{}');
    }
    
    return null; // No access
  } catch (error) {
    console.error('Error getting team permissions:', error);
    return null;
  }
}

// Verify JWT token and extract user information with team context
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Please sign in to access this resource'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.roles = decoded.roles || [];
    req.permissions = decoded.permissions || [];
    req.user = { id: decoded.userId }; // For compatibility
    
    // Add team access context
    req.accessibleUserIds = await getAccessibleUserIds(decoded.userId);
    req.getTeamPermissions = (ownerUserId) => getTeamPermissions(decoded.userId, ownerUserId);
    
    next();
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return res.status(403).json({ 
      error: 'Invalid or expired token',
      message: 'Please sign in again'
    });
  }
};

// Optional authentication - sets user if token exists but doesn't require it
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      req.roles = decoded.roles || [];
      req.permissions = decoded.permissions || [];
      req.user = { id: decoded.userId }; // For compatibility
      
      // Add team access context
      req.accessibleUserIds = await getAccessibleUserIds(decoded.userId);
      req.getTeamPermissions = (ownerUserId) => getTeamPermissions(decoded.userId, ownerUserId);
    } catch (error) {
      // Token invalid but continue without user context
      console.warn('Optional auth failed:', error.message);
    }
  }
  next();
};

// Admin only middleware
const requireAdmin = (req, res, next) => {
  if (!req.roles || !req.roles.includes('admin')) {
    return res.status(403).json({ 
      error: 'Admin access required',
      message: 'This resource requires administrator privileges'
    });
  }
  next();
};

/**
 * Middleware to check if user has specific permission for a resource
 */
const requirePermission = (resource, action = 'view') => {
  return async (req, res, next) => {
    if (!req.userId) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please sign in to access this resource'
      });
    }

    // Extract target user ID from request (could be in params, body, or query)
    const targetUserId = req.params.userId || req.body.userId || req.query.userId || req.userId;
    
    try {
      const permissions = await req.getTeamPermissions(targetUserId);
      
      if (!permissions || !permissions[resource] || 
          (action === 'edit' && permissions[resource] !== 'edit')) {
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: `You don't have ${action} access to ${resource}`
        });
      }
      
      next();
    } catch (error) {
      console.error('Permission check failed:', error);
      return res.status(500).json({
        error: 'Permission check failed',
        message: 'Unable to verify permissions'
      });
    }
  };
};

/**
 * Helper function to build WHERE clause for team-aware queries
 */
function buildTeamWhereClause(accessibleUserIds, userIdColumn = 'user_id') {
  if (!accessibleUserIds || accessibleUserIds.length === 0) {
    return { clause: `${userIdColumn} = ?`, params: [null] }; // No access
  }
  
  const placeholders = accessibleUserIds.map(() => '?').join(',');
  return {
    clause: `${userIdColumn} IN (${placeholders})`,
    params: accessibleUserIds
  };
}

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin,
  requirePermission,
  buildTeamWhereClause,
  getAccessibleUserIds,
  getTeamPermissions
};
