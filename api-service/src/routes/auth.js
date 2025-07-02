const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');

router.post('/exchange', async (req, res) => {
  try {
    console.log('Starting /auth/exchange route...');
    console.log('JWT_SECRET:', process.env.JWT_SECRET);
    console.log('Request body:', JSON.stringify(req.body));
    const { provider, token, email } = req.body;

    if (!provider || !token) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: provider and token' });
    }

    if (provider === 'validate') {
      console.log('Handling validate provider with token:', token);
      try {
        console.log('Attempting to verify token...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('Token decoded:', decoded);
        const userId = decoded.userId;
        console.log('Fetching user_type for userId:', userId);
        const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
        console.log('User query result:', user);
        if (!user[0]) {
          console.log('User not found for userId:', userId);
          throw new Error('User not found');
        }
        console.log('Fetching user_types for userId:', userId);
        const [types] = await db.query('SELECT type FROM user_types WHERE user_id = ?', [userId]);
        console.log('User types query result:', types);
        const roles = [user[0]?.user_type, ...(types?.map(t => t.type) || [])].filter(Boolean);
        console.log('Validated roles for userId', userId, ':', roles);
        res.json({ roles });
        return;
      } catch (err) {
        console.error('Token validation error:', err.message, err.stack);
        return res.status(400).json({ error: 'Invalid token: ' + err.message });
      }
    }

    if (provider === 'email' && !email) {
      console.log('Validation failed: Missing email for email provider');
      return res.status(400).json({ error: 'Missing required field: email (for email provider)' });
    }

    let providerId;
    let providerToken = token;
    let emailVerified = 'no';
    if (provider === 'google') {
      const decodedToken = jwt.decode(token);
      if (!decodedToken || !decodedToken.sub) {
        throw new Error('Invalid Google ID token: missing sub claim');
      }
      providerId = decodedToken.sub;
      emailVerified = decodedToken.email_verified ? 'yes' : 'no';
      console.log('Google sub (providerId):', providerId, 'Length:', providerId.length);
    } else if (provider === 'email') {
      providerId = email;
      const decodedToken = jwt.decode(token);
      emailVerified = decodedToken.email_verified ? 'yes' : 'no';
    } else {
      console.log('Validation failed: Invalid provider:', provider);
      return res.status(400).json({ error: 'Invalid provider' });
    }

    let existingLogin;
    try {
      [existingLogin] = await db.query('SELECT user_id FROM user_logins WHERE provider = ? AND provider_id = ?', [provider, providerId]);
    } catch (dbError) {
      throw new Error('Database query failed for user_logins: ' + dbError.message);
    }

    let userId;
    if (existingLogin.length) {
      userId = existingLogin[0].user_id;
      await db.query('UPDATE users SET email_verified = ? WHERE id = ?', [emailVerified, userId]);
    } else {
      let userCheck;
      try {
        [userCheck] = await db.query('SELECT id FROM users WHERE username = ?', [email]);
      } catch (dbError) {
        throw new Error('Database query failed for users check: ' + dbError.message);
      }

      if (userCheck.length) {
        userId = userCheck[0].id;
        try {
          console.log('Attempting to insert into user_logins:', { userId, provider, providerId, providerToken, api_prefix: 'OAF-' });
          await db.query('INSERT INTO user_logins (user_id, provider, provider_id, provider_token, api_prefix) VALUES (?, ?, ?, ?, ?)', [userId, provider, providerId, providerToken, 'OAF-']);
          await db.query('UPDATE users SET email_verified = ? WHERE id = ?', [emailVerified, userId]);
        } catch (dbError) {
          throw new Error('Database insert failed for user_logins: ' + dbError.message);
        }
      } else {
        const apiId = `OAF-${Math.random().toString(36).slice(2, 10)}`;
        let result;
        try {
          [result] = await db.query('INSERT INTO users (username, email_verified, status, user_type) VALUES (?, ?, ?, ?)', [email, emailVerified, 'draft', 'community']);
        } catch (err) {
          console.error('Insert into users failed:', err.message, err.stack);
          await db.query('INSERT INTO error_logs (user_id, error_message, stack) VALUES (?, ?, ?)', [null, 'Token exchange failed: ' + err.message, err.stack]);
          res.status(500).json({ error: 'Token exchange failed' });
          return;
        }
        userId = result.insertId;
        try {
          console.log('Attempting to insert into user_logins (new user):', { userId, provider, providerId, providerToken, api_prefix: 'OAF-' });
          await db.query('INSERT INTO user_logins (user_id, provider, provider_id, provider_token, api_prefix) VALUES (?, ?, ?, ?, ?)', [userId, provider, providerId, providerToken, 'OAF-']);
          await db.query('INSERT INTO user_profiles (user_id) VALUES (?)', [userId]);
          await db.query('INSERT INTO artist_profiles (user_id) VALUES (?)', [userId]);
          await db.query('INSERT INTO promoter_profiles (user_id) VALUES (?)', [userId]);
          await db.query('INSERT INTO community_profiles (user_id) VALUES (?)', [userId]);
          await db.query('INSERT INTO admin_profiles (user_id) VALUES (?)', [userId]);
        } catch (dbError) {
          throw new Error('Database insert failed for profiles: ' + dbError.message);
        }
      }
    }

    let user;
    try {
      [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
    } catch (dbError) {
      throw new Error('Database query failed for user type: ' + dbError.message);
    }

    let types;
    try {
      [types] = await db.query('SELECT type FROM user_types WHERE user_id = ?', [userId]);
    } catch (dbError) {
      throw new Error('Database query failed for user types: ' + dbError.message);
    }

    const roles = [user[0]?.user_type, ...(types?.map(t => t.type) || [])].filter(Boolean);
    const jwtToken = jwt.sign({ userId, roles }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token: jwtToken, userId });
  } catch (err) {
    console.error('Unexpected error in /auth/exchange:', err.message, err.stack);
    try {
      await db.query('INSERT INTO error_logs (user_id, error_message, stack) VALUES (?, ?, ?)', [null, err.message, err.stack]);
    } catch (logError) {
      console.error('Error logging failed:', logError.message, logError.stack);
    }
    res.status(500).json({ error: 'Token exchange failed: ' + err.message });
  }
});

module.exports = router;