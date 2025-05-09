const express = require('express');
const router = express.Router();
const { BadRequestError, NotFoundError } = require('../../utils/errors');
const { pool, normalizeId } = require('../../middleware/db');
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

// POST /tokens/exchange
router.post('/exchange', async (req, res, next) => {
  try {
    console.log('Token exchange request received:', {
      headers: req.headers,
      body: req.body,
      path: req.path,
      method: req.method,
      fullPath: req.originalUrl
    });
    
    // Get the token from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Token exchange: No valid authorization header');
      throw new BadRequestError('No valid authorization header');
    }
    const idToken = authHeader.split('Bearer ')[1];
    console.log('Token exchange: Got token');

    // Verify the token with Firebase Admin
    console.log('Token exchange: Verifying token...');
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email;
    console.log('Token exchange: Token verified:', { firebaseUid, email });

    // Check if user exists in our database
    console.log('Token exchange: Checking if user exists in database...');
    const [rows] = await pool.query('SELECT * FROM users WHERE google_uid = ?', [firebaseUid]);

    let userId;
    if (!rows || (Array.isArray(rows) && rows.length === 0)) {
      // Create new user if they don't exist
      console.log('Token exchange: Creating new user...');
      const [result] = await pool.query(
        'INSERT INTO users (google_uid, username, status) VALUES (?, ?, ?)',
        [firebaseUid, email, 'draft']
      );
      userId = normalizeId(result.insertId);
      console.log('Token exchange: Created new user:', { userId, username: email });

      // Create basic user profile
      console.log('Token exchange: Creating basic user profile...');
      await pool.query(
        'INSERT INTO user_profiles (user_id) VALUES (?)',
        [userId]
      );
      console.log('Token exchange: Created basic user profile');
    } else {
      // Handle both array and single object cases
      const user = Array.isArray(rows) ? rows[0] : rows;
      userId = normalizeId(user.id);
      console.log('Token exchange: Found existing user:', { userId, username: user.username });
    }

    // Generate a new API token
    console.log('Token exchange: Generating API token...');
    const apiToken = generateApiToken(userId);

    // Calculate expiration time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Delete any existing tokens for this user to avoid duplicate constraints
    console.log('Token exchange: Deleting any existing API tokens for user...');
    await pool.query(
      'DELETE FROM api_tokens WHERE user_id = ?',
      [userId]
    );
    console.log('Token exchange: Deleted existing API tokens for user:', { userId });

    // Insert new token
    console.log('Token exchange: Inserting new API token...');
    await pool.query(
      'INSERT INTO api_tokens (user_id, service, token, expires_at) VALUES (?, ?, ?, ?)',
      [userId, 'api2', apiToken, expiresAt]
    );
    console.log('Token exchange: Inserted new API token for user:', { userId });

    console.log('Token exchange: Successfully completed token exchange');

    res.json({
      token: apiToken,
      expires_at: expiresAt.toISOString(),
      user: {
        id: userId,
        username: email,
        status: rows.length > 0 ? rows[0].status : 'draft'
      }
    });
  } catch (error) {
    console.error('Token exchange error:', error);
    next(error);
  }
});

// Helper function to generate API token
function generateApiToken(userId) {
  const randomBytes = require('crypto').randomBytes(32);
  return randomBytes.toString('hex');
}

module.exports = router; 