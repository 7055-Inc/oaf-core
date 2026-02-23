/**
 * Marketing Module Authentication Middleware
 * 
 * Provides permission checks for marketing operations:
 * - Admin can manage all campaigns/content
 * - Users can only manage their own campaigns/content (subscription tier checks in Sprint D)
 */

const { verifyToken } = require('../../auth/middleware');

/**
 * Verify user is authenticated
 */
const requireAuth = verifyToken;

// Helper: check if user is admin (works with both role string and roles array)
function _isAdmin(req) {
  if (req.user?.role === 'admin' || req.user?.role === 'super_admin') return true;
  if (Array.isArray(req.roles) && (req.roles.includes('admin') || req.roles.includes('super_admin'))) return true;
  return false;
}

/**
 * Verify user is admin
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user && !req.userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    if (!_isAdmin(req)) {
      return res.status(403).json({ 
        success: false, 
        error: 'Admin access required' 
      });
    }

    next();
  } catch (error) {
    console.error('Admin check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authorization check failed' 
    });
  }
};

/**
 * Check if user can access campaign
 * Admin can access all, users can only access their own
 */
const canAccessCampaign = async (req, res, next) => {
  try {
    if (!req.user && !req.userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Admin can access everything
    if (_isAdmin(req)) {
      req.isAdmin = true;
      return next();
    }

    // User - will check ownership in service layer
    req.isAdmin = false;
    next();
  } catch (error) {
    console.error('Campaign access check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authorization check failed' 
    });
  }
};

/**
 * Check if user can modify content
 * Only admin and content creators can modify
 */
const canModifyContent = async (req, res, next) => {
  try {
    if (!req.user && !req.userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Admin can modify everything
    if (_isAdmin(req)) {
      req.canModify = true;
      return next();
    }

    // Users can modify their own content (check in service layer)
    req.canModify = false;
    next();
  } catch (error) {
    console.error('Content modify check error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authorization check failed' 
    });
  }
};

module.exports = {
  requireAuth,
  requireAdmin,
  canAccessCampaign,
  canModifyContent
};
