/**
 * SOP Authentication Middleware
 * Verifies Brakebee JWT and checks SOP enrollment
 */

const jwt = require('jsonwebtoken');
const usersService = require('../services/users');

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not configured');
  return secret;
}

function getToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return req.cookies && req.cookies.token ? req.cookies.token : null;
}

/**
 * Require SOP authentication
 * Verifies JWT and checks user is enrolled in SOP system
 */
async function requireSopAuth(req, res, next) {
  const token = getToken(req);
  
  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'NO_TOKEN', message: 'Sign in at Brakebee first.' }
    });
  }
  
  let decoded;
  try {
    decoded = jwt.verify(token, getSecret());
  } catch {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Session expired. Sign in again.' }
    });
  }
  
  const brakebeeUserId = decoded.userId;
  
  try {
    const user = await usersService.getByBrakebeeUserId(brakebeeUserId);
    
    if (!user) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_ENROLLED', message: 'Not enrolled in SOP. Contact an admin.' }
      });
    }
    
    req.brakebeeUserId = brakebeeUserId;
    req.sopUser = { id: user.id, user_type: user.user_type };
    next();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * Require "top" user type for admin operations
 */
function requireTop(req, res, next) {
  if (!req.sopUser || req.sopUser.user_type !== 'top') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Top access required.' }
    });
  }
  next();
}

module.exports = {
  getToken,
  requireSopAuth,
  requireTop,
};
