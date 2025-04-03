const express = require('express');
const mysql = require('mysql2');
const mysqlPromise = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const router = express.Router();

const db = mysql.createConnection({
  host: '10.128.0.31',
  user: 'oafuser',
  password: 'oafpass',
  database: 'oaf'
});

/**
 * Check if user is logged in
 */
router.get('/session', (req, res) => {
  if (req.session.user) {
    res.json({ 
      isLoggedIn: true, 
      user: req.session.user 
    });
  } else {
    res.json({ 
      isLoggedIn: false, 
      user: null 
    });
  }
});

// Login endpoint - called by Login.js
router.post('/login', (req, res) => {
  const { username, password, redirect } = req.body;
  db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Server error' });
    if (results.length === 0) return res.status(401).json({ error: 'User not found' });
    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      req.session.user = user;
      res.json({ success: true, redirect: redirect || '/' });
    } else {
      res.status(401).json({ error: 'Incorrect password' });
    }
  });
});

// Logout endpoint - called by App.js
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// New user creation endpoint - called by NewUser.js
router.post('/newuser', async (req, res) => {
  const { id, username, password, user_type } = req.body;
  
  try {
    // Check if user already exists
    const [existingUsers] = await db.promise().query('SELECT * FROM users WHERE username = ?', [username]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (id, username, password, user_type) VALUES (?, ?, ?, ?)';
    await db.promise().query(sql, [id, username, hashedPassword, user_type]);
    
    // Also create default permissions for this user
    await db.promise().query(
      'INSERT INTO permissions (user_id, profile_access, marketplace_vendor, gallery_access) VALUES (?, ?, ?, ?)',
      [id, 'no', 'no', 'no']
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('User creation error:', error);
    res.status(500).json({ success: false, error: 'Server error during user creation' });
  }
});

// Password reset endpoint - called by ResetPassword.js
router.post('/reset', async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'UPDATE users SET password = ? WHERE username = ?';
    const [result] = await db.promise().query(sql, [hashedPassword, username]);
    
    if (result.affectedRows === 0) {
      return res.json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ success: false, error: 'Server error during password reset' });
  }
});

// Profile check endpoint
router.get('/user/profile', async (req, res) => {
  try {
    const userId = req.session.googleUid;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [user] = await db.query('SELECT * FROM users WHERE google_uid = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check required fields
    const missingFields = [];
    if (!user.first_name) missingFields.push('first_name');
    if (!user.last_name) missingFields.push('last_name');
    // Add other required fields here

    return res.json({
      complete: missingFields.length === 0,
      missingFields
    });
  } catch (error) {
    console.error('Profile check error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// Profile update endpoint
router.post('/user/profile/update', async (req, res) => {
  try {
    const userId = req.session.googleUid;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { first_name, last_name } = req.body;
    
    await db.query(
      'UPDATE users SET first_name = ?, last_name = ? WHERE google_uid = ?',
      [first_name, last_name, userId]
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Profile update error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
});

// =============================================
// Test Endpoint for Diagnostics
// =============================================
router.get('/test-db', async (req, res) => {
  let dbConn = null;
  try {
    console.log('Testing database connection');
    
    // Test without promise wrapper first - using promise() method on the connection
    try {
      const testResult1 = await db.promise().query('SELECT 1 as test');
      console.log('Basic DB test result:', testResult1[0]);
    } catch (basicDbError) {
      console.error('Basic DB test error:', basicDbError);
    }
    
    // Now test with promise connection
    try {
      dbConn = await getDbPromise();
      const [testResult2] = await dbConn.query('SELECT 2 as test');
      console.log('Promise DB test result:', testResult2);
    } catch (promiseDbError) {
      console.error('Promise DB test error:', promiseDbError);
    }
    
    // Test session
    console.log('Session data:', {
      hasSession: !!req.session,
      user: req.session?.user || 'No user',
      sessionID: req.sessionID
    });
    
    // Return success
    res.json({
      status: 'OK',
      database: {
        basicTest: 'Check server logs',
        promiseTest: 'Check server logs'
      },
      session: {
        active: !!req.session,
        hasUser: !!req.session?.user,
        userID: req.session?.user?.id || null
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || 'not set',
        platform: process.platform,
        nodeVersion: process.version
      }
    });
  } catch (err) {
    console.error('Test endpoint error:', err);
    res.status(500).json({
      status: 'Error',
      error: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  } finally {
    if (dbConn) await dbConn.end();
  }
});

// Helper function to get a DB connection
async function getDbPromise() { 
  return await mysqlPromise.createConnection({
    host: '10.128.0.31',
    user: 'oafuser',
    password: 'oafpass',
    database: 'oaf'
  }); 
}

// Make sure to export the router
module.exports = router; 