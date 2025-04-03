const { OAuth2Client } = require('google-auth-library');

// Google Identity Platform client setup
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
if (!CLIENT_ID) {
  throw new Error('GOOGLE_CLIENT_ID is not defined in environment variables');
}
const client = new OAuth2Client(CLIENT_ID);

/**
 * Middleware to verify Google Identity Platform ID token
 */
const verifyToken = async (req, res, next) => {
  // Get auth header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  
  // Extract token
  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    // Verify token
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    req.user = payload;
    req.user.uid = payload['sub']; // Google Identity Platform UID
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

/**
 * Middleware to check user claims/roles
 * @param {string|string[]} requiredRoles - Role or array of roles required
 */
const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const userRoles = req.user.roles || [];
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    // Check if user has at least one of the required roles
    if (!roles.some(role => userRoles.includes(role))) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};

/**
 * Optional token verification that doesn't block the request if no token
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    req.user = payload;
    req.user.uid = payload['sub']; // Google Identity Platform UID
  } catch (error) {
    req.user = null;
  }
  
  next();
};

module.exports = { verifyToken, requireRole, optionalAuth };