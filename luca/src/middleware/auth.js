const jwt = require('jsonwebtoken');

/**
 * JWT Authentication Middleware for Luca Platform
 * Verifies JWT tokens and extracts user context
 */

// Verify JWT token and extract user information
const authenticateToken = (req, res, next) => {
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
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      req.roles = decoded.roles || [];
      req.permissions = decoded.permissions || [];
      req.user = { id: decoded.userId }; // For compatibility
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

module.exports = {
  authenticateToken,
  optionalAuth,
  requireAdmin
};
