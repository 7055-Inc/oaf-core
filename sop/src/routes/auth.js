const express = require('express');
const { requireSopAuth } = require('../middleware/brakebeeAuth');

const router = express.Router();

/** GET /api/auth/me — current SOP user (Brakebee JWT + enrollment). Response: { userId, user_type } only (no email). */
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
