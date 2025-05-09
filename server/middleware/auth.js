const getFirebaseAdmin = require('../firebase-admin');
const admin = getFirebaseAdmin();

/**
 * Middleware to verify Firebase token
 * Single source of truth for token verification across the application
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const ip = req.ip;
  const timestamp = new Date().toISOString();
  
  // Log authentication attempt
  console.log('Authentication attempt', {
    ip,
    timestamp,
    path: req.path,
    method: req.method,
    hasAuthHeader: !!authHeader
  });

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Authentication failed - no token', {
      ip,
      timestamp,
      path: req.path
    });
    return res.status(401).json({ error: 'Unauthorized: No token provided' });
  }

  const idToken = authHeader.split('Bearer ')[1];
  
  try {
    // Verify the token with Firebase
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Log successful authentication
    console.log('Authentication successful', {
      ip,
      timestamp,
      path: req.path,
      uid: decodedToken.uid,
      email: decodedToken.email
    });

    // Set user in request
    req.user = decodedToken;
    next();
  } catch (error) {
    // Log authentication failure
    console.error('Authentication failed - invalid token', {
      ip,
      timestamp,
      path: req.path,
      error: error.message
    });
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

module.exports = { verifyToken }; 