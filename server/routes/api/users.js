const express = require('express');
const router = express.Router();
const mysql = require('mysql2/promise');
const { verifyToken } = require('../../middleware/auth');
const { errorHandler } = require('../../middleware/errorHandler');
const { connectDb } = require('../../db');

// Initialize database connection
let pool;
let poolInitialized = false;

async function initializePool() {
  try {
    pool = await connectDb();
    poolInitialized = true;
    console.log('Database pool initialized in users.js');
  } catch (error) {
    console.error('Failed to initialize database pool:', error);
    throw error;
  }
}

// Middleware to ensure database connection
const ensureDbConnection = async (req, res, next) => {
  if (!poolInitialized) {
    try {
      await initializePool();
    } catch (error) {
      console.error('Database connection failed:', error);
      return res.status(500).json({ error: 'Database connection failed' });
    }
  }
  next();
};

// Apply middleware to all routes
router.use(ensureDbConnection);

// Check or create user
router.post('/users/:userId/check-user', verifyToken, async (req, res) => {
  try {
    const { sub, email, name } = req.user;
    console.log('Checking/creating user with sub:', sub);

    // Check if checklist exists
    const [checklistRows] = await pool.query(
      "SELECT * FROM user_checklist WHERE user_id = ?",
      [sub]
    );

    // Create initial checklist if it doesn't exist
    if (checklistRows.length === 0) {
      await pool.query(
        "INSERT INTO user_checklist (user_id, is_user, registration, terms_accepted, profile_complete, email_verified) VALUES (?, ?, ?, ?, ?, ?)",
        [sub, false, false, false, false, false]
      );
    }

    // Check if user exists
    const [userRows] = await pool.query(
      "SELECT * FROM users WHERE google_uid = ?",
      [sub]
    );

    if (userRows.length > 0) {
      // User exists, update checklist
      await pool.query(
        "UPDATE user_checklist SET is_user = TRUE, is_user_updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
        [sub]
      );
      return res.json({ 
        exists: true, 
        user: userRows[0],
        checklist: checklistRows[0] || { is_user: true, registration: false, terms_accepted: false, profile_complete: false, email_verified: false }
      });
    }

    // Create new user
    const newUser = {
      username: email,
      email_verified: true,
      user_type: 'community',
      status: 'active',
      google_uid: sub
    };

    const [result] = await pool.query(
      "INSERT INTO users SET ?",
      [newUser]
    );

    // Verify user was created
    const [createdUser] = await pool.query(
      "SELECT * FROM users WHERE google_uid = ?",
      [sub]
    );

    if (createdUser.length === 0) {
      throw new Error('Failed to create user');
    }

    // Update checklist
    await pool.query(
      "UPDATE user_checklist SET is_user = TRUE, is_user_updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
      [sub]
    );

    res.json({ 
      exists: false, 
      user: createdUser[0],
      checklist: { is_user: true, registration: false, terms_accepted: false, profile_complete: false, email_verified: false }
    });
  } catch (error) {
    console.error('Error in check-user:', error);
    errorHandler(error, req, res);
  }
});

// Get user checklist
router.get('/users/:userId/checklist', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { sub } = req.user;
    console.log('Fetching checklist:', { userId, googleId: sub });
    
    // Ensure user is requesting their own data
    if (userId !== sub) {
      console.log('User ID mismatch:', { requested: userId, googleId: sub });
      return res.status(403).json({ error: 'Unauthorized access to user data' });
    }
    
    const [checklist] = await pool.query(
      'SELECT * FROM user_checklist WHERE user_id = ?',
      [sub]
    );
    
    if (!checklist || checklist.length === 0) {
      // If no checklist exists, return defaults
      return res.json({
        is_user: { completed: false, updated_at: null },
        registration: { completed: false, updated_at: null },
        terms_accepted: { completed: false, updated_at: null },
        profile_complete: { completed: false, updated_at: null },
        email_verified: { completed: false, updated_at: null }
      });
    }
    
    const checklistData = checklist[0];
    return res.json({
      is_user: { completed: checklistData.is_user, updated_at: checklistData.is_user_updated_at },
      registration: { completed: checklistData.registration, updated_at: checklistData.registration_updated_at },
      terms_accepted: { completed: checklistData.terms_accepted, updated_at: checklistData.terms_accepted_updated_at },
      profile_complete: { completed: checklistData.profile_complete, updated_at: checklistData.profile_complete_updated_at },
      email_verified: { completed: checklistData.email_verified, updated_at: checklistData.email_verified_updated_at }
    });
  } catch (error) {
    console.error('Error fetching user checklist:', error);
    return res.status(500).json({ error: 'Failed to fetch checklist' });
  }
});

// Update checklist item
router.put('/users/:userId/checklist/:itemKey', verifyToken, async (req, res) => {
  try {
    const { sub } = req.user;
    const { userId } = req.params;
    
    // Ensure user is updating their own data
    if (userId !== sub) {
      return res.status(403).json({ error: 'Unauthorized access to user data' });
    }
    
    const { itemKey } = req.params;
    const { completed } = req.body;
    
    // Validate itemKey
    const validItems = ['is_user', 'registration', 'terms_accepted', 'profile_complete', 'email_verified'];
    if (!validItems.includes(itemKey)) {
      return res.status(400).json({ error: 'Invalid checklist item' });
    }
    
    const updateTimeColumn = `${itemKey}_updated_at`;
    
    await pool.query(
      `UPDATE user_checklist SET ${itemKey} = ?, ${updateTimeColumn} = ? WHERE user_id = ?`,
      [completed, new Date(), sub]
    );
    
    // Get updated checklist
    const [updatedChecklist] = await pool.query(
      'SELECT * FROM user_checklist WHERE user_id = ?',
      [sub]
    );
    
    const checklistData = updatedChecklist[0];
    return res.json({
      is_user: { completed: checklistData.is_user, updated_at: checklistData.is_user_updated_at },
      registration: { completed: checklistData.registration, updated_at: checklistData.registration_updated_at },
      terms_accepted: { completed: checklistData.terms_accepted, updated_at: checklistData.terms_accepted_updated_at },
      profile_complete: { completed: checklistData.profile_complete, updated_at: checklistData.profile_complete_updated_at },
      email_verified: { completed: checklistData.email_verified, updated_at: checklistData.email_verified_updated_at }
    });
  } catch (error) {
    console.error('Error updating checklist item:', error);
    return res.status(500).json({ error: 'Failed to update checklist item' });
  }
});

// Reset user checklist (called on logout or token refresh)
router.post('/users/:userId/checklist/reset', verifyToken, async (req, res) => {
  try {
    const { sub } = req.user;
    const { userId } = req.params;
    
    // Ensure user is resetting their own data
    if (userId !== sub) {
      return res.status(403).json({ error: 'Unauthorized access to user data' });
    }
    
    await pool.query(
      'UPDATE user_checklist SET is_user = ?, registration = ?, terms_accepted = ?, profile_complete = ?, email_verified = ?, is_user_updated_at = ?, registration_updated_at = ?, terms_accepted_updated_at = ?, profile_complete_updated_at = ?, email_verified_updated_at = ? WHERE user_id = ?',
      [false, false, false, false, false, new Date(), new Date(), new Date(), new Date(), new Date(), sub]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error resetting checklist:', error);
    return res.status(500).json({ error: 'Failed to reset checklist' });
  }
});

module.exports = { router }; 