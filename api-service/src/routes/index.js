const express = require('express');
const router = express.Router();
const usersRouter = require('./api/users');
const profilesRouter = require('./api/profiles');

// Root route for /v1/
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API v1 is running',
    endpoints: [
      '/users',
      '/users/me/profile',
      '/users/me/artist-profile',
      '/users/me/promoter-profile',
      '/users/me/community-profile'
    ]
  });
});

// Mount the route handlers
router.use('/', usersRouter);
router.use('/', profilesRouter);

module.exports = router; 
