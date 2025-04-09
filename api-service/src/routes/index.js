const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const { safeQuery } = require('../middleware/db');
const admin = require('firebase-admin');

// Root route for /v1/
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API v1 is running',
    endpoints: [
      '/session',
      '/logout',
      '/user/profile',
      '/user/profile/update'
    ]
  });
});

/**
 * Check if user is logged in
 */
router.get('/session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ 
        isLoggedIn: false, 
        user: null 
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    if (decodedToken) {
      res.json({ 
        isLoggedIn: true, 
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name
        }
      });
    } else {
      res.json({ 
        isLoggedIn: false, 
        user: null 
      });
    }
  } catch (error) {
    console.error('Session check error:', error);
    res.json({ 
      isLoggedIn: false, 
      user: null 
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Profile check endpoint
router.get('/user/profile', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    safeQuery(
      'SELECT * FROM users WHERE uid = ?',
      [userId],
      (err, results) => {
        if (err) {
          console.error('Profile check error:', err);
          return res.status(500).json({ error: 'Server error' });
        }

        const user = results[0];
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Check required fields
        const missingFields = [];
        if (!user.first_name) missingFields.push('first_name');
        if (!user.last_name) missingFields.push('last_name');

        return res.json({
          complete: missingFields.length === 0,
          missingFields,
          user
        });
      }
    );
  } catch (error) {
    console.error('Profile check error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Profile update endpoint
router.post('/user/profile/update', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { first_name, last_name } = req.body;
    
    safeQuery(
      'UPDATE users SET first_name = ?, last_name = ?, updated_at = NOW() WHERE uid = ?',
      [first_name, last_name, userId],
      (err) => {
        if (err) {
          console.error('Profile update error:', err);
          return res.status(500).json({ error: 'Server error' });
        }
        return res.json({ success: true });
      }
    );
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 