const authService = require('../services/authService');

const authMiddleware = {
  async verifyToken(req, res, next) {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      let decoded;
      try {
        decoded = await authService.verifyGoogleToken(token);
      } catch (error) {
        try {
          decoded = await authService.verifyPasswordToken(token);
        } catch (error) {
          return res.status(401).json({ error: 'Invalid token' });
        }
      }

      req.user = decoded;
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      res.status(401).json({ error: 'Authentication failed' });
    }
  },

  async checkUserRole(req, res, next) {
    try {
      const user = await authService.getUserByEmail(req.user.email);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      req.userRole = user.user_type;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Failed to check user role' });
    }
  },

  async requireRole(roles) {
    return (req, res, next) => {
      if (!req.userRole) {
        return res.status(401).json({ error: 'User role not found' });
      }

      if (!roles.includes(req.userRole)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    };
  }
};

module.exports = authMiddleware; 