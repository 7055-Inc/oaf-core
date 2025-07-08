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
    { name: 'header_image', maxCount: 1 },
    { name: 'logo_image', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      // Get current user type first
      const [currentUser] = await db.query('SELECT user_type FROM users WHERE id = ?', [req.userId]);
      if (!currentUser[0]) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const userType = currentUser[0].user_type;
      
      // Extract fields from request body
      const {
        // Base profile fields (user_profiles table)
        first_name, last_name, display_name, phone, address_line1, address_line2, 
        city, state, postal_code, country, bio, website, birth_date, gender, 
        nationality, languages_known, job_title, education, awards, memberships, 
        timezone, social_facebook, social_instagram, social_tiktok, social_twitter, 
        social_pinterest, social_whatsapp,
        
        // Artist-specific fields (artist_profiles table)
        artist_biography, art_categories, art_mediums, does_custom, custom_details, 
        business_name, studio_address_line1, studio_address_line2, studio_city, 
        studio_state, studio_zip, business_website, business_phone, 
        business_social_facebook, business_social_instagram, business_social_tiktok, 
        business_social_twitter, business_social_pinterest, founding_date,
        
        // Community-specific fields (community_profiles table)
        art_style_preferences, favorite_colors, art_interests, wishlist,
        
        // Promoter-specific fields (promoter_profiles table)
        is_non_profit, organization_size, sponsorship_options, upcoming_events
      } = req.body;

      if (!first_name || !last_name) {
        return res.status(400).json({ error: 'Missing required fields: first_name, last_name' });
      }

      // Handle the uploaded images
      let profileImagePath = null;
      let headerImagePath = null;
      let logoImagePath = null;
      
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
      if (req.files['logo_image']) {
        logoImagePath = `/temp_images/profiles/${req.files['logo_image'][0].filename}`;
        await db.query(
          'INSERT INTO pending_images (user_id, image_path, status) VALUES (?, ?, ?)',
          [req.userId, logoImagePath, 'pending']
        );
      }

      // Process JSON fields properly
      const processedLanguagesKnown = languages_known ? 
        (typeof languages_known === 'string' ? languages_known : JSON.stringify(languages_known)) : null;
      const processedEducation = education ? 
        (typeof education === 'string' ? education : JSON.stringify(education)) : null;
      const processedAwards = awards ? 
        (typeof awards === 'string' ? awards : JSON.stringify(awards)) : null;
      const processedMemberships = memberships ? 
        (typeof memberships === 'string' ? memberships : JSON.stringify(memberships)) : null;

      // Ensure user_profiles record exists, then update
      await db.query(
        `INSERT INTO user_profiles (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = user_id`,
        [req.userId]
      );

      // Update base profile fields in user_profiles table
      await db.query(
        `UPDATE user_profiles SET 
          first_name = ?, last_name = ?, display_name = ?, phone = ?, 
          address_line1 = ?, address_line2 = ?, city = ?, state = ?, 
          postal_code = ?, country = ?, bio = ?, website = ?, 
          birth_date = ?, gender = ?, nationality = ?, languages_known = ?, 
          job_title = ?, education = ?, awards = ?, memberships = ?, 
          timezone = ?, social_facebook = ?, social_instagram = ?, 
          social_tiktok = ?, social_twitter = ?, social_pinterest = ?, 
          social_whatsapp = ?
        WHERE user_id = ?`,
        [
          first_name, last_name, display_name || null, phone || null, 
          address_line1 || null, address_line2 || null, city || null, state || null, 
          postal_code || null, country || null, bio || null, website || null, 
          birth_date || null, gender || null, nationality || null, processedLanguagesKnown, 
          job_title || null, processedEducation, processedAwards, processedMemberships, 
          timezone || null, social_facebook || null, social_instagram || null, 
          social_tiktok || null, social_twitter || null, social_pinterest || null, 
          social_whatsapp || null, req.userId
        ]
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

      // Update type-specific profile fields based on user type
      if (userType === 'artist') {
        // Process JSON fields for artist profiles
        const processedArtCategories = art_categories ? 
          (typeof art_categories === 'string' ? art_categories : JSON.stringify(art_categories)) : null;
        const processedArtMediums = art_mediums ? 
          (typeof art_mediums === 'string' ? art_mediums : JSON.stringify(art_mediums)) : null;

        await db.query(
          `INSERT INTO artist_profiles (user_id, artist_biography, art_categories, art_mediums, 
            does_custom, custom_details, business_name, studio_address_line1, 
            studio_address_line2, studio_city, studio_state, studio_zip, 
            business_website, business_phone, business_social_facebook, 
            business_social_instagram, business_social_tiktok, business_social_twitter, 
            business_social_pinterest, founding_date, logo_path) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            artist_biography = VALUES(artist_biography),
            art_categories = VALUES(art_categories),
            art_mediums = VALUES(art_mediums),
            does_custom = VALUES(does_custom),
            custom_details = VALUES(custom_details),
            business_name = VALUES(business_name),
            studio_address_line1 = VALUES(studio_address_line1),
            studio_address_line2 = VALUES(studio_address_line2),
            studio_city = VALUES(studio_city),
            studio_state = VALUES(studio_state),
            studio_zip = VALUES(studio_zip),
            business_website = VALUES(business_website),
            business_phone = VALUES(business_phone),
            business_social_facebook = VALUES(business_social_facebook),
            business_social_instagram = VALUES(business_social_instagram),
            business_social_tiktok = VALUES(business_social_tiktok),
            business_social_twitter = VALUES(business_social_twitter),
            business_social_pinterest = VALUES(business_social_pinterest),
            founding_date = VALUES(founding_date),
            logo_path = VALUES(logo_path)`,
          [
            req.userId, artist_biography || null, processedArtCategories, processedArtMediums, 
            does_custom || 'no', custom_details || null, business_name || null, 
            studio_address_line1 || null, studio_address_line2 || null, studio_city || null, 
            studio_state || null, studio_zip || null, business_website || null, 
            business_phone || null, business_social_facebook || null, 
            business_social_instagram || null, business_social_tiktok || null, 
            business_social_twitter || null, business_social_pinterest || null, 
            founding_date || null, logoImagePath
          ]
        );
      } else if (userType === 'community') {
        // Process JSON fields for community profiles
        const processedFavoriteColors = favorite_colors ? 
          (typeof favorite_colors === 'string' ? favorite_colors : JSON.stringify(favorite_colors)) : null;
        const processedArtInterests = art_interests ? 
          (typeof art_interests === 'string' ? art_interests : JSON.stringify(art_interests)) : null;
        const processedWishlist = wishlist ? 
          (typeof wishlist === 'string' ? wishlist : JSON.stringify(wishlist)) : null;

        await db.query(
          `INSERT INTO community_profiles (user_id, art_style_preferences, favorite_colors, 
            art_interests, wishlist) 
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            art_style_preferences = VALUES(art_style_preferences),
            favorite_colors = VALUES(favorite_colors),
            art_interests = VALUES(art_interests),
            wishlist = VALUES(wishlist)`,
          [req.userId, art_style_preferences || null, processedFavoriteColors, 
           processedArtInterests, processedWishlist]
        );
      } else if (userType === 'promoter') {
        // Process JSON fields for promoter profiles
        const processedSponsorshipOptions = sponsorship_options ? 
          (typeof sponsorship_options === 'string' ? sponsorship_options : JSON.stringify(sponsorship_options)) : null;
        const processedUpcomingEvents = upcoming_events ? 
          (typeof upcoming_events === 'string' ? upcoming_events : JSON.stringify(upcoming_events)) : null;

        await db.query(
          `INSERT INTO promoter_profiles (user_id, business_name, business_phone, 
            business_website, business_social_facebook, business_social_instagram, 
            business_social_tiktok, business_social_twitter, business_social_pinterest, 
            is_non_profit, organization_size, sponsorship_options, upcoming_events, 
            founding_date, logo_path) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            business_name = VALUES(business_name),
            business_phone = VALUES(business_phone),
            business_website = VALUES(business_website),
            business_social_facebook = VALUES(business_social_facebook),
            business_social_instagram = VALUES(business_social_instagram),
            business_social_tiktok = VALUES(business_social_tiktok),
            business_social_twitter = VALUES(business_social_twitter),
            business_social_pinterest = VALUES(business_social_pinterest),
            is_non_profit = VALUES(is_non_profit),
            organization_size = VALUES(organization_size),
            sponsorship_options = VALUES(sponsorship_options),
            upcoming_events = VALUES(upcoming_events),
            founding_date = VALUES(founding_date),
            logo_path = VALUES(logo_path)`,
          [
            req.userId, business_name || null, business_phone || null, 
            business_website || null, business_social_facebook || null, 
            business_social_instagram || null, business_social_tiktok || null, 
            business_social_twitter || null, business_social_pinterest || null, 
            is_non_profit || 'no', organization_size || null, processedSponsorshipOptions, 
            processedUpcomingEvents, founding_date || null, logoImagePath
          ]
        );
      }

      res.json({ message: 'Profile updated successfully' });
    } catch (err) {
      console.error('Error updating user profile:', err.message);
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
    
    // Ensure user_profiles record exists, then update base profile (no business_name here)
    await db.query(
      'INSERT INTO user_profiles (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = user_id',
      [userId]
    );
    
    await db.query(
      'UPDATE user_profiles SET first_name = ?, last_name = ?, address_line1 = ?, city = ?, state = ?, postal_code = ?, phone = ? WHERE user_id = ?',
      [first_name, last_name, address_line1, city, state, postal_code, phone, userId]
    );
    
    // Update business_name in appropriate table based on user type
    if (userType === 'artist' && business_name) {
      await db.query(
        'INSERT INTO artist_profiles (user_id, business_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE business_name = ?',
        [userId, business_name, business_name]
      );
    } else if (userType === 'promoter' && business_name) {
      await db.query(
        'INSERT INTO promoter_profiles (user_id, business_name) VALUES (?, ?) ON DUPLICATE KEY UPDATE business_name = ?',
        [userId, business_name, business_name]
      );
    }
    
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