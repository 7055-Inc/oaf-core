const { OAuth2Client } = require('google-auth-library');
const { pool, normalizeId } = require('./db');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  });
}

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
    console.error('Token verification: No valid authorization header');
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  
  // Extract token
  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    // Verify token with Firebase Admin
    console.log('Token verification: Verifying token with Firebase Admin...');
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    console.log('Token verification: Token verified successfully:', { uid: decodedToken.uid });
    
    // Set user in request
    req.user = decodedToken;
    req.user.uid = decodedToken.uid;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

/**
 * Middleware to verify API token
 */
const verifyApiToken = async (req, res, next) => {
  // Get auth header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('API token verification: No valid authorization header');
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }
  
  // Extract token
  const apiToken = authHeader.split('Bearer ')[1];
  
  try {
    // Verify token in database
    console.log('API token verification: Verifying token:', apiToken);
    const [rows] = await pool.query(
      `SELECT 
        u.id,
        u.username,
        u.status,
        u.user_type,
        t.expires_at 
       FROM api_tokens t 
       JOIN users u ON t.user_id = u.id 
       WHERE t.token = ? AND t.service = 'api2' AND t.expires_at > NOW()`,
      [apiToken]
    );
    console.log('API token verification: Query result:', rows);

    // Handle both array and single object cases
    const user = Array.isArray(rows) ? rows[0] : rows;
    console.log('API token verification: User data:', user);

    if (!user || !user.id) {
      console.error('API token verification: Invalid or expired token');
      return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }

    // Set user in request with normalized ID
    req.user = {
      ...user,
      id: normalizeId(user.id) // Ensure ID is normalized
    };
    console.log('API token verification: Set req.user:', req.user);
    next();
  } catch (error) {
    console.error('API token verification failed:', error);
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

module.exports = { verifyToken, verifyApiToken, requireRole, optionalAuth }; 