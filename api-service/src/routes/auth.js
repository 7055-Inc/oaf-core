const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');
const { secureLogger } = require('../middleware/secureLogger');
const crypto = require('crypto');
const verifyToken = require('../middleware/jwt');

router.post('/exchange', async (req, res) => {
  try {
    secureLogger.info('Starting /auth/exchange route');
    const { provider, token, email } = req.body;

    if (!provider || !token) {
      secureLogger.warn('Validation failed: Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: provider and token' });
    }

    if (provider === 'validate') {
      secureLogger.info('Handling validate provider request');
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.userId;
        secureLogger.info('Fetching user data for validation', { userId });
        
        const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
        if (!user[0]) {
          secureLogger.warn('User not found during validation', { userId });
          throw new Error('User not found');
        }
        
        const [types] = await db.query('SELECT type FROM user_types WHERE user_id = ?', [userId]);
        const roles = [user[0]?.user_type, ...(types?.map(t => t.type) || [])].filter(Boolean);
        
        // Fetch permissions - updated for logical permission groups
        const [userPermissions] = await db.query('SELECT * FROM user_permissions WHERE user_id = ?', [userId]);
        const permissions = [];
        if (userPermissions[0]) {
          if (userPermissions[0].vendor) permissions.push('vendor');
          if (userPermissions[0].events) permissions.push('events');
          if (userPermissions[0].stripe_connect) permissions.push('stripe_connect');
          if (userPermissions[0].manage_sites) permissions.push('manage_sites');
          if (userPermissions[0].manage_content) permissions.push('manage_content');
          if (userPermissions[0].manage_system) permissions.push('manage_system');
          if (userPermissions[0].verified) permissions.push('verified');
        }
        
        // Admin users get all permissions automatically
        if (roles.includes('admin')) {
          const allPermissions = ['vendor', 'events', 'stripe_connect', 'manage_sites', 'manage_content', 'manage_system', 'verified'];
          for (const permission of allPermissions) {
            if (!permissions.includes(permission)) {
              permissions.push(permission);
            }
          }
        }
        
        secureLogger.audit('Token validation successful', { userId, roleCount: roles.length, permissionCount: permissions.length });
        res.json({ roles, permissions });
        return;
      } catch (err) {
        secureLogger.error('Token validation error', err);
        return res.status(400).json({ error: 'Invalid token' });
      }
    }

    if (provider === 'email' && !email) {
      secureLogger.warn('Validation failed: Missing email for email provider');
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
      secureLogger.info('Google authentication processed', { providerIdLength: providerId.length });
    } else if (provider === 'email') {
      providerId = email;
      const decodedToken = jwt.decode(token);
      if (!decodedToken) {
        secureLogger.error('Failed to decode email token', { tokenLength: token?.length });
        throw new Error('Invalid email token: failed to decode');
      }
      emailVerified = decodedToken.email_verified ? 'yes' : 'no';
    } else {
      secureLogger.warn('Validation failed: Invalid provider');
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
      await db.query('UPDATE users SET email_verified = ?, status = ? WHERE id = ?', [emailVerified, emailVerified === 'yes' ? 'active' : 'draft', userId]);
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
          secureLogger.info('Creating user login record', { userId, provider });
          await db.query('INSERT INTO user_logins (user_id, provider, provider_id, provider_token, api_prefix) VALUES (?, ?, ?, ?, ?)', [userId, provider, providerId, providerToken, 'OAF-']);
          await db.query('UPDATE users SET email_verified = ?, status = ? WHERE id = ?', [emailVerified, emailVerified === 'yes' ? 'active' : 'draft', userId]);
        } catch (dbError) {
          throw new Error('Database insert failed for user_logins: ' + dbError.message);
        }
      } else {
        const apiId = `OAF-${Math.random().toString(36).slice(2, 10)}`;
        let result;
        try {
          [result] = await db.query('INSERT INTO users (username, email_verified, status, user_type) VALUES (?, ?, ?, ?)', [email, emailVerified, emailVerified === 'yes' ? 'active' : 'draft', 'Draft']);
        } catch (err) {
          secureLogger.error('Insert into users failed', err);
          await db.query('INSERT INTO error_logs (user_id, error_message, stack) VALUES (?, ?, ?)', [null, 'Token exchange failed: ' + err.message, err.stack]);
          res.status(500).json({ error: 'Token exchange failed' });
          return;
        }
        userId = result.insertId;
        try {
          secureLogger.info('Creating new user with profiles', { userId, provider });
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
    
    // Fetch permissions - updated for logical permission groups
    let userPermissions;
    try {
      [userPermissions] = await db.query('SELECT * FROM user_permissions WHERE user_id = ?', [userId]);
    } catch (dbError) {
      throw new Error('Database query failed for user permissions: ' + dbError.message);
    }
    
    const permissions = [];
    if (userPermissions[0]) {
      if (userPermissions[0].vendor) permissions.push('vendor');
      if (userPermissions[0].events) permissions.push('events');
      if (userPermissions[0].stripe_connect) permissions.push('stripe_connect');
      if (userPermissions[0].manage_sites) permissions.push('manage_sites');
      if (userPermissions[0].manage_content) permissions.push('manage_content');
      if (userPermissions[0].manage_system) permissions.push('manage_system');
      if (userPermissions[0].verified) permissions.push('verified');
    }
    
    // Admin users get all permissions automatically
    if (roles.includes('admin')) {
      const allPermissions = ['vendor', 'events', 'stripe_connect', 'manage_sites', 'manage_content', 'manage_system', 'verified'];
      for (const permission of allPermissions) {
        if (!permissions.includes(permission)) {
          permissions.push(permission);
        }
      }
    }
    
    // Generate 1-hour access token instead of 7-day token
    const accessToken = jwt.sign({ userId, roles, permissions }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // Generate refresh token (7 days)
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    
    // Store refresh token in database
    try {
      await db.query(
        'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info) VALUES (?, ?, ?, ?)',
        [userId, tokenHash, expiresAt, req.get('User-Agent') || 'Unknown']
      );
    } catch (dbError) {
      secureLogger.error('Failed to store refresh token', dbError);
      // Continue anyway - user still gets access token
    }
    
    secureLogger.audit('Token exchange successful', { 
      userId, 
      provider,
      roleCount: roles.length,
      permissionCount: permissions.length,
      accessTokenExpiry: '1h',
      refreshTokenExpiry: '7d'
    });
    
    res.json({ 
      token: accessToken, 
      refreshToken: refreshToken,
      userId 
    });
  } catch (err) {
    secureLogger.error('Unexpected error in /auth/exchange', err);
    try {
      await db.query('INSERT INTO error_logs (user_id, error_message, stack) VALUES (?, ?, ?)', [null, err.message, err.stack]);
    } catch (logError) {
      secureLogger.error('Error logging failed', logError);
    }
    res.status(500).json({ error: 'Token exchange failed' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    secureLogger.info('Starting /auth/refresh route');
    const { refreshToken } = req.body;

    if (!refreshToken) {
      secureLogger.warn('Refresh token missing in request');
      return res.status(400).json({ error: 'Refresh token required' });
    }

    // Hash the refresh token to compare with database
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Look up the refresh token in database
    let tokenRecord;
    try {
      [tokenRecord] = await db.query(
        'SELECT user_id, expires_at FROM refresh_tokens WHERE token_hash = ? AND expires_at > NOW()',
        [tokenHash]
      );
    } catch (dbError) {
      throw new Error('Database query failed for refresh token: ' + dbError.message);
    }

    if (!tokenRecord || !tokenRecord[0]) {
      secureLogger.warn('Invalid or expired refresh token', { tokenHash: tokenHash.substring(0, 8) + '...' });
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const userId = tokenRecord[0].user_id;
    secureLogger.info('Valid refresh token found', { userId });

    // Get user data for new access token
    let user, types, userPermissions;
    try {
      [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
      [types] = await db.query('SELECT type FROM user_types WHERE user_id = ?', [userId]);
      [userPermissions] = await db.query('SELECT * FROM user_permissions WHERE user_id = ?', [userId]);
    } catch (dbError) {
      throw new Error('Database query failed for user data: ' + dbError.message);
    }

    if (!user[0]) {
      secureLogger.warn('User not found for refresh token', { userId });
      return res.status(401).json({ error: 'User not found' });
    }

    // Build roles and permissions
    const roles = [user[0]?.user_type, ...(types?.map(t => t.type) || [])].filter(Boolean);
    const permissions = [];
    if (userPermissions[0]) {
      if (userPermissions[0].vendor) permissions.push('vendor');
      if (userPermissions[0].events) permissions.push('events');
      if (userPermissions[0].stripe_connect) permissions.push('stripe_connect');
      if (userPermissions[0].manage_sites) permissions.push('manage_sites');
      if (userPermissions[0].manage_content) permissions.push('manage_content');
      if (userPermissions[0].manage_system) permissions.push('manage_system');
      if (userPermissions[0].verified) permissions.push('verified');
    }

    // Generate new access token (1 hour expiration)
    const newAccessToken = jwt.sign(
      { userId, roles, permissions }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    // Optionally generate new refresh token and rotate
    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    try {
      // Remove old refresh token and add new one
      await db.query('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
      await db.query(
        'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_info) VALUES (?, ?, ?, ?)',
        [userId, newTokenHash, expiresAt, req.get('User-Agent') || 'Unknown']
      );
    } catch (dbError) {
      secureLogger.error('Failed to rotate refresh token', dbError);
      // Continue anyway - user gets new access token even if refresh rotation fails
    }

    secureLogger.audit('Access token refreshed successfully', { 
      userId, 
      roleCount: roles.length,
      permissionCount: permissions.length
    });

    res.json({ 
      token: newAccessToken,
      refreshToken: newRefreshToken,
      userId 
    });

  } catch (err) {
    secureLogger.error('Unexpected error in /auth/refresh', err);
    try {
      await db.query('INSERT INTO error_logs (user_id, error_message, stack) VALUES (?, ?, ?)', [null, err.message, err.stack]);
    } catch (logError) {
      secureLogger.error('Error logging failed', logError);
    }
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

module.exports = router;