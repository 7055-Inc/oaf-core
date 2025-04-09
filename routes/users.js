const express = require('express');
const router = express.Router();

let db;

const initialize = (database) => {
  db = database;
  return router;
};

// Get all users
router.get('/', async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, username, user_type, created_at, last_login FROM users ORDER BY id DESC LIMIT 100'
    );
    
    res.json({
      success: true,
      data: {
        users
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'server_error',
        message: 'Failed to retrieve users'
      }
    });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, username, user_type, created_at, last_login FROM users WHERE id = ?',
      [req.params.id]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'user_not_found',
          message: 'User not found'
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        user: users[0]
      }
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'server_error',
        message: 'Failed to retrieve user'
      }
    });
  }
});

module.exports = { router, initialize }; 