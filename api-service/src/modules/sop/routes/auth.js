/**
 * SOP Auth Routes
 * Handles authentication status endpoints
 */

const express = require('express');
const { requireSopAuth } = require('../middleware');

const router = express.Router();

/**
 * GET /api/v2/sop/auth/me
 * Returns current SOP user info (id, user_type)
 */
router.get('/me', requireSopAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      userId: req.sopUser.id,
      user_type: req.sopUser.user_type,
    },
  });
});

module.exports = router;
