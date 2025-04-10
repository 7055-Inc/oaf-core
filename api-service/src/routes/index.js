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
      '/user/profile/update',
      '/users/:uid/check-user'
    ]
  });
});

/**
 * Check if user is logged in
 */
router.post('/session', async (req, res) => {
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
      // Get user type from database
      safeQuery(
        'SELECT user_type FROM users WHERE username = ?',
        [decodedToken.email],
        (err, results) => {
          if (err) {
            console.error('Database query error:', err);
            return res.status(500).json({ error: 'Server error' });
          }

          const userType = results[0]?.user_type || null;
          
          res.json({ 
            isLoggedIn: true, 
            user: {
              uid: decodedToken.uid,
              email: decodedToken.email,
              name: decodedToken.name,
              user_type: userType
            }
          });
        }
      );
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

// Check/Create user endpoint
router.post('/users/:uid/check-user', verifyToken, async (req, res) => {
  try {
    const userId = req.params.uid;
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if user exists
    safeQuery(
      'SELECT u.*, ap.title as admin_title FROM users u LEFT JOIN admin_profiles ap ON u.id = ap.user_id WHERE u.uid = ?',
      [userId],
      async (err, results) => {
        if (err) {
          console.error('User check error:', err);
          return res.status(500).json({ error: 'Server error' });
        }

        if (results.length === 0) {
          // User doesn't exist, create new user
          try {
            const userRecord = await admin.auth().getUser(userId);
            const customClaims = userRecord.customClaims || {};
            const userType = customClaims.admin ? 'admin' : 'user';

            // Start transaction
            safeQuery('START TRANSACTION', [], async (err) => {
              if (err) {
                console.error('Transaction start error:', err);
                return res.status(500).json({ error: 'Server error' });
              }

              // Insert into users table
              safeQuery(
                'INSERT INTO users (uid, username, email, user_type, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
                [userId, userRecord.email, userRecord.email, userType],
                async (err, results) => {
                  if (err) {
                    safeQuery('ROLLBACK', []);
                    console.error('User creation error:', err);
                    return res.status(500).json({ error: 'Server error' });
                  }

                  // If admin user, create admin profile
                  if (userType === 'admin') {
                    safeQuery(
                      'INSERT INTO admin_profiles (user_id) VALUES (?)',
                      [results.insertId],
                      (err) => {
                        if (err) {
                          safeQuery('ROLLBACK', []);
                          console.error('Admin profile creation error:', err);
                          return res.status(500).json({ error: 'Server error' });
                        }

                        safeQuery('COMMIT', [], (err) => {
                          if (err) {
                            safeQuery('ROLLBACK', []);
                            console.error('Commit error:', err);
                            return res.status(500).json({ error: 'Server error' });
                          }

                          return res.json({ 
                            success: true, 
                            message: 'Admin user created',
                            user: {
                              uid: userId,
                              email: userRecord.email,
                              user_type: userType
                            }
                          });
                        });
                      }
                    );
                  } else {
                    // For regular users, just commit
                    safeQuery('COMMIT', [], (err) => {
                      if (err) {
                        safeQuery('ROLLBACK', []);
                        console.error('Commit error:', err);
                        return res.status(500).json({ error: 'Server error' });
                      }

                      return res.json({ 
                        success: true, 
                        message: 'User created',
                        user: {
                          uid: userId,
                          email: userRecord.email,
                          user_type: userType
                        }
                      });
                    });
                  }
                }
              );
            });
          } catch (error) {
            console.error('Firebase user fetch error:', error);
            return res.status(500).json({ error: 'Server error' });
          }
        } else {
          // User exists
          return res.json({ 
            success: true, 
            message: 'User exists',
            user: results[0]
          });
        }
      }
    );
  } catch (error) {
    console.error('User check/create error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router; 