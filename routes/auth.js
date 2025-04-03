const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const authMiddleware = require('../middleware/auth');

let db;

const initialize = (database) => {
  db = database;
  return router;
};

// Google sign-in endpoint
router.get('/google', (req, res) => {
  console.log('Starting Google auth with config:', {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? '[PRESENT]' : '[MISSING]',
    redirectUri: process.env.GOOGLE_REDIRECT_URI
  });

  const authUrl = authService.client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]
  });
  console.log('Generated auth URL:', authUrl);
  res.json({ url: authUrl });
});

// Google callback route
router.get('/api/auth/google/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    const { tokens } = await authService.client.getToken(code);
    const ticket = await authService.client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    // Check if user exists
    let user = await authService.getUserByGoogleId(payload.sub);
    
    if (!user) {
      // Create new user
      const userId = await authService.createUser({
        email: payload.email,
        google_uid: payload.sub,
        user_type: 'community'
      });
      
      // Create session
      req.session.userId = userId;
      req.session.googleUid = payload.sub;
      
      return res.redirect(`/register?token=${tokens.id_token}&email=${encodeURIComponent(payload.email)}`);
    } else {
      // User exists, create session
      req.session.userId = user.id;
      req.session.googleUid = payload.sub;
      
      // Run login checklist
      const checklistResult = await loginChecklist.checkUser(user);
      if (!checklistResult.passed) {
        if (checklistResult.showModal) {
          return res.redirect(`/login?showModal=true&missingFields=${JSON.stringify(checklistResult.missingFields)}`);
        } else if (checklistResult.redirect) {
          return res.redirect(checklistResult.redirect);
        }
      }
      
      return res.redirect('/dashboard');
    }
  } catch (error) {
    console.error('Google callback error:', error);
    return res.redirect('/login?error=google_signin_failed');
  }
});

// Password sign-in endpoint
router.post('/password', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Verify credentials with Google Identity Platform
    const token = await authService.verifyPasswordCredentials(email, password);
    
    // Get user from database
    const user = await authService.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Create session
    req.session.userId = user.id;
    
    // Run login checklist
    const checklistResult = await loginChecklist.checkUser(user);
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

// Session verification endpoint
router.get('/session', authMiddleware.verifyToken, async (req, res) => {
  try {
    const user = await authService.getUserByEmail(req.user.email);
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

module.exports = { router, initialize };