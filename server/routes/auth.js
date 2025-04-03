const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const authConfig = require('../config/auth');
const authMiddleware = require('../middleware/auth');

// Get client configuration
router.get('/config', (req, res) => {
  res.json(authConfig.getClientConfig());
});

// Google sign-in endpoint
router.get('/google', (req, res) => {
  const authUrl = authConfig.client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]
  });
  res.json({ url: authUrl });
});

// Google callback route
router.post('/google/callback', async (req, res) => {
  const { code } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    const { tokens } = await authConfig.client.getToken(code);
    const payload = await authService.verifyGoogleToken(tokens.id_token);

    // Check if user exists in database
    const user = await req.db.getUserByGoogleId(payload.sub);
    
    if (!user) {
      // Create new user
      const userId = await req.db.createUser({
        email: payload.email,
        google_uid: payload.sub,
        user_type: 'community'
      });
      
      // Create session
      req.session.userId = userId;
      req.session.googleUid = payload.sub;
      
      return res.json({
        success: true,
        redirect: `/register?token=${tokens.id_token}&email=${encodeURIComponent(payload.email)}`
      });
    } else {
      // User exists, create session
      req.session.userId = user.id;
      req.session.googleUid = payload.sub;
      
      // Run login checklist
      const checklistResult = await req.loginChecklist.checkUser(user);
      if (!checklistResult.passed) {
        if (checklistResult.showModal) {
          return res.json({
            success: true,
            redirect: `/login?showModal=true&missingFields=${JSON.stringify(checklistResult.missingFields)}`
          });
        } else if (checklistResult.redirect) {
          return res.json({
            success: true,
            redirect: checklistResult.redirect
          });
        }
      }
      
      return res.json({
        success: true,
        redirect: '/dashboard'
      });
    }
  } catch (error) {
    console.error('Google callback error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
});

// Password sign-in endpoint
router.post('/password', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Verify credentials with Google Identity Platform
    const token = await authService.verifyPasswordCredentials(email, password);
    
    // Get user from database
    const user = await req.db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create session
    req.session.userId = user.id;
    
    // Run login checklist
    const checklistResult = await req.loginChecklist.checkUser(user);
    if (!checklistResult.passed) {
      if (checklistResult.showModal) {
        return res.json({
          success: true,
          showModal: true,
          missingFields: checklistResult.missingFields
        });
      } else if (checklistResult.redirect) {
        return res.json({
          success: true,
          redirect: checklistResult.redirect
        });
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Password sign-in error:', error);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Password reset request
router.post('/reset-password', async (req, res) => {
  const { email } = req.body;
  
  try {
    await authService.sendPasswordResetEmail(email);
    res.json({ success: true });
  } catch (error) {
    console.error('Password reset request error:', error);
    res.status(400).json({ error: 'Failed to send reset email' });
  }
});

// Email verification
router.post('/verify-email', async (req, res) => {
  const { email } = req.body;
  
  try {
    const verified = await authService.verifyEmail(email);
    res.json({ verified });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).json({ error: 'Failed to verify email' });
  }
});

// Session verification
router.get('/session', authMiddleware.verifyToken, async (req, res) => {
  try {
    const user = await req.db.getUserByEmail(req.user.email);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.username,
        user_type: user.user_type
      }
    });
  } catch (error) {
    console.error('Session verification error:', error);
    res.status(401).json({ error: 'Session verification failed' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

module.exports = router; 