const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const jwt = require('jsonwebtoken');
const upload = require('../config/multer');
const path = require('path');
const fs = require('fs');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.roles = decoded.roles;
    req.permissions = decoded.permissions || [];
    next();
  } catch (err) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /users/me - Fetch current user's profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const [user] = await db.query(
      'SELECT u.id, u.username, u.email_verified, u.status, u.user_type, up.* ' +
      'FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = ?',
      [req.userId]
    );
    if (!user[0]) {
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
      await db.query(
        'INSERT INTO pending_images (user_id, image_path, status) VALUES (?, ?, ?)',
        [req.userId, profileImagePath, 'pending']
      );
    }
    if (req.files['header_image']) {
      headerImagePath = `/temp_images/profiles/${req.files['header_image'][0].filename}`;
      await db.query(
        'INSERT INTO pending_images (user_id, image_path, status) VALUES (?, ?, ?)',
        [req.userId, headerImagePath, 'pending']
      );
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
  try {
    const { id } = req.params;
    const [user] = await db.query(
      'SELECT u.id, u.username, u.email_verified, u.status, u.user_type, up.* ' +
      'FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = ?',
      [id]
    );
    if (!user[0] || user[0].status !== 'active') {
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

// GET /users/artists - Fetch list of active artists
router.get('/artists', async (req, res) => {
  try {
    const { limit = 20, offset = 0, random = 'true' } = req.query;
    
    // Validate and sanitize inputs
    const searchLimit = Math.min(parseInt(limit) || 20, 100); // Max 100 results
    const searchOffset = Math.max(parseInt(offset) || 0, 0);
    const useRandom = random === 'true';
    
    // Build the query - get artists with their profile data
    let query = `
      SELECT 
        u.id, 
        u.username, 
        u.user_type, 
        u.status, 
        u.created_at,
        up.first_name,
        up.last_name,
        up.bio,
        up.profile_image_path,
        ap.business_name,
        ap.artist_biography,
        ap.studio_city,
        ap.studio_state,
        ap.does_custom,
        ap.business_website,
        ap.art_categories
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN artist_profiles ap ON u.id = ap.user_id
      WHERE u.user_type = 'artist' 
      AND u.status = 'active'
      AND up.user_id IS NOT NULL
      AND ap.user_id IS NOT NULL
    `;
    
    // Add ordering - random or by creation date
    if (useRandom) {
      query += ' ORDER BY RAND()';
    } else {
      query += ' ORDER BY u.created_at DESC';
    }
    
    // Add limit and offset
    query += ` LIMIT ${searchLimit} OFFSET ${searchOffset}`;
    
    const [artists] = await db.query(query);
    
    res.json(artists);
  } catch (err) {
    console.error('Error fetching artists:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch artists' });
  }
});

// GET /users/profile-completion-status - Check if user's profile is complete
router.get('/profile-completion-status', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get user data including profile
    const [user] = await db.query(
      'SELECT u.user_type, up.first_name, up.last_name, up.address_line1, up.city, up.state, up.postal_code, up.phone ' +
      'FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = ?',
      [userId]
    );
    
    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userData = user[0];
    let businessName = null;
    
    // Get business_name from appropriate table based on user type
    if (userData.user_type === 'artist') {
      const [artistProfile] = await db.query(
        'SELECT business_name FROM artist_profiles WHERE user_id = ?',
        [userId]
      );
      businessName = artistProfile[0]?.business_name;
    } else if (userData.user_type === 'promoter') {
      const [promoterProfile] = await db.query(
        'SELECT business_name FROM promoter_profiles WHERE user_id = ?',
        [userId]
      );
      businessName = promoterProfile[0]?.business_name;
    }
    
    // Define required fields based on user type
    const baseRequiredFields = ['first_name', 'last_name', 'address_line1', 'city', 'state', 'postal_code', 'phone'];
    let requiredFields = [...baseRequiredFields];
    
    // Add business_name for artists and promoters
    if (userData.user_type === 'artist' || userData.user_type === 'promoter') {
      requiredFields.push('business_name');
    }
    
    // Check which fields are missing
    const missingFields = [];
    const fieldLabels = {
      first_name: 'First Name',
      last_name: 'Last Name',
      address_line1: 'Street Address',
      city: 'City',
      state: 'State',
      postal_code: 'Postal Code',
      phone: 'Phone Number',
      business_name: 'Business Name'
    };
    
    // Create combined data object for checking
    const checkData = { ...userData, business_name: businessName };
    
    for (const field of requiredFields) {
      if (!checkData[field] || checkData[field].trim() === '') {
        missingFields.push({
          field: field,
          label: fieldLabels[field]
        });
      }
    }
    
    const isComplete = missingFields.length === 0;
    
    res.json({
      isComplete,
      requiresCompletion: !isComplete,
      missingFields,
      userType: userData.user_type
    });
    
  } catch (err) {
    console.error('Error checking profile completion:', err);
    res.status(500).json({ error: 'Failed to check profile completion' });
  }
});

// PATCH /users/complete-profile - Update missing profile fields
router.patch('/complete-profile', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { first_name, last_name, address_line1, city, state, postal_code, phone, business_name } = req.body;
    
    // Get current user type to validate requirements
    const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userType = user[0].user_type;
    
    // Validate required fields
    const baseRequiredFields = { first_name, last_name, address_line1, city, state, postal_code, phone };
    
    for (const [field, value] of Object.entries(baseRequiredFields)) {
      if (!value || value.trim() === '') {
        return res.status(400).json({ 
          error: `${field.replace('_', ' ')} is required`,
          field: field 
        });
      }
    }
    
    // Check business_name for artists and promoters
    if ((userType === 'artist' || userType === 'promoter') && (!business_name || business_name.trim() === '')) {
      return res.status(400).json({ 
        error: 'Business name is required for ' + userType + 's',
        field: 'business_name' 
      });
    }
    
    // Update profile
    await db.query(
      'UPDATE user_profiles SET first_name = ?, last_name = ?, address_line1 = ?, city = ?, state = ?, postal_code = ?, phone = ?, business_name = ? WHERE user_id = ?',
      [first_name, last_name, address_line1, city, state, postal_code, phone, business_name || null, userId]
    );
    
    res.json({ 
      success: true, 
      message: 'Profile completed successfully' 
    });
    
  } catch (err) {
    console.error('Error completing profile:', err);
    res.status(500).json({ error: 'Failed to complete profile' });
  }
});

// POST /users/select-user-type - Allow Draft users to select their user type
router.post('/select-user-type', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { user_type } = req.body;
    
    // Validate user type
    const validUserTypes = ['artist', 'promoter', 'community'];
    if (!user_type || !validUserTypes.includes(user_type)) {
      return res.status(400).json({ error: 'Invalid user type. Must be one of: artist, promoter, community' });
    }
    
    // Check if user is currently Draft
    const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
    if (!user[0]) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user[0].user_type !== 'Draft') {
      return res.status(400).json({ error: 'User type has already been selected' });
    }
    
    // Update user type
    await db.query('UPDATE users SET user_type = ? WHERE id = ?', [user_type, userId]);
    
    res.json({ message: 'User type updated successfully', user_type });
    
  } catch (err) {
    console.error('Error updating user type:', err);
    res.status(500).json({ error: 'Failed to update user type' });
  }
});

module.exports = router;