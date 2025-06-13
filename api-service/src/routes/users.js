const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');
const upload = require('../config/multer');
const path = require('path');
const fs = require('fs');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  console.log('Verifying token for request:', req.method, req.url, 'Headers:', req.headers);
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.log('No token provided');
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.roles = decoded.roles;
    console.log('Token verified, userId:', req.userId);
    next();
  } catch (err) {
    console.log('Invalid token:', err.message);
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /users/me - Fetch current user's profile
router.get('/me', verifyToken, async (req, res) => {
  console.log('GET /users/me request received, userId:', req.userId);
  try {
    const [user] = await db.query(
      'SELECT u.id, u.username, u.email_verified, u.status, u.user_type, up.* ' +
      'FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = ?',
      [req.userId]
    );
    if (!user[0]) {
      console.log('User not found for userId:', req.userId);
      return res.status(404).json({ error: 'User not found' });
    }
    const userData = user[0];
    if (userData.user_type === 'artist') {
      const [artistProfile] = await db.query(
        'SELECT * FROM artist_profiles WHERE user_id = ?',
        [req.userId]
      );
      Object.assign(userData, artistProfile[0]);
    } else if (userData.user_type === 'community') {
      const [communityProfile] = await db.query(
        'SELECT * FROM community_profiles WHERE user_id = ?',
        [req.userId]
      );
      Object.assign(userData, communityProfile[0]);
    } else if (userData.user_type === 'promoter') {
      const [promoterProfile] = await db.query(
        'SELECT * FROM promoter_profiles WHERE user_id = ?',
        [req.userId]
      );
      Object.assign(userData, promoterProfile[0]);
    }
    res.json(userData);
  } catch (err) {
    console.error('Error fetching user profile:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PATCH /users/me - Update current user's profile with image uploads
router.patch('/me', 
  verifyToken,
  upload.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'header_image', maxCount: 1 }
  ]),
  async (req, res) => {
  console.log('PATCH /users/me request received, userId:', req.userId);
    try {
  const {
    first_name, last_name, user_type, phone, address_line1, address_line2, city, state,
    postal_code, country, bio, website, social_facebook, social_instagram, social_tiktok,
    social_twitter, social_pinterest, social_whatsapp, artist_biography, art_categories,
    does_custom, custom_details, business_name, studio_address_line1, studio_address_line2,
    business_website, art_interests, wishlist, upcoming_events, is_non_profit
  } = req.body;

    if (!first_name || !last_name || !user_type) {
      return res.status(400).json({ error: 'Missing required fields: first_name, last_name, user_type' });
    }
    if (!['artist', 'community', 'promoter'].includes(user_type)) {
      return res.status(400).json({ error: 'Invalid user_type. Must be one of: artist, community, promoter' });
    }

    // Handle the uploaded images
    let profileImagePath = null;
    let headerImagePath = null;
    if (req.files['profile_image']) {
      profileImagePath = `/temp_images/profiles/${req.files['profile_image'][0].filename}`;
      console.log('Profile image uploaded:', profileImagePath);
      await db.query(
        'INSERT INTO pending_images (user_id, image_path, status) VALUES (?, ?, ?)',
        [req.userId, profileImagePath, 'pending']
      );
      console.log('Profile image logged in pending_images for processing:', profileImagePath);
    }
    if (req.files['header_image']) {
      headerImagePath = `/temp_images/profiles/${req.files['header_image'][0].filename}`;
      console.log('Header image uploaded:', headerImagePath);
      await db.query(
        'INSERT INTO pending_images (user_id, image_path, status) VALUES (?, ?, ?)',
        [req.userId, headerImagePath, 'pending']
      );
      console.log('Header image logged in pending_images for processing:', headerImagePath);
    }

    await db.query(
        'UPDATE user_profiles SET first_name = ?, last_name = ?, user_type = ?, phone = ?, address_line1 = ?, address_line2 = ?, city = ?, state = ?, postal_code = ?, country = ?, bio = ?, website = ?, social_facebook = ?, social_instagram = ?, social_tiktok = ?, social_twitter = ?, social_pinterest = ?, social_whatsapp = ?, artist_biography = ?, art_categories = ?, does_custom = ?, custom_details = ?, business_name = ?, studio_address_line1 = ?, studio_address_line2 = ?, business_website = ?, art_interests = ?, wishlist = ?, upcoming_events = ?, is_non_profit = ? WHERE user_id = ?',
        [first_name, last_name, user_type, phone, address_line1, address_line2, city, state,
         postal_code, country, bio, website, social_facebook, social_instagram, social_tiktok,
         social_twitter, social_pinterest, social_whatsapp, artist_biography, art_categories,
         does_custom, custom_details, business_name, studio_address_line1, studio_address_line2,
         business_website, art_interests, wishlist, upcoming_events, is_non_profit, req.userId]
      );

      // Update profile images if new ones were uploaded
      if (profileImagePath) {
      await db.query(
          'UPDATE user_profiles SET profile_image_path = ? WHERE user_id = ?',
          [profileImagePath, req.userId]
      );
      }
      if (headerImagePath) {
      await db.query(
          'UPDATE user_profiles SET header_image_path = ? WHERE user_id = ?',
          [headerImagePath, req.userId]
      );
    }

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    console.error('Error updating user profile:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to update user profile' });
  }
  }
);

// GET /users/profile/by-id/:id - Fetch a user's public profile by ID
router.get('/profile/by-id/:id', async (req, res) => {
  console.log('GET /users/profile/by-id/:id request received, id:', req.params.id);
  try {
    const { id } = req.params;
    const [user] = await db.query(
      'SELECT u.id, u.username, u.email_verified, u.status, u.user_type, up.* ' +
      'FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = ?',
      [id]
    );
    if (!user[0] || user[0].status !== 'active') {
      console.log('User not found or not active for id:', id);
      return res.status(404).json({ error: 'User not found or profile not active' });
    }
    const userData = user[0];
    if (userData.user_type === 'artist') {
      const [artistProfile] = await db.query(
        'SELECT * FROM artist_profiles WHERE user_id = ?',
        [userData.id]
      );
      Object.assign(userData, artistProfile[0]);
    } else if (userData.user_type === 'community') {
      const [communityProfile] = await db.query(
        'SELECT * FROM community_profiles WHERE user_id = ?',
        [userData.id]
      );
      Object.assign(userData, communityProfile[0]);
    } else if (userData.user_type === 'promoter') {
      const [promoterProfile] = await db.query(
        'SELECT * FROM promoter_profiles WHERE user_id = ?',
        [userData.id]
      );
      Object.assign(userData, promoterProfile[0]);
    }
    res.json(userData);
  } catch (err) {
    console.error('Error fetching user profile:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

module.exports = router;