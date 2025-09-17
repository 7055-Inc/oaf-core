const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const upload = require('../config/multer');
const { enhanceUserProfileWithMedia } = require('../utils/mediaUtils');
const path = require('path');
const fs = require('fs');




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
    } else if (userData.user_type === 'admin') {
      // Admins get access to all profile types
      try {
        const [artistProfile] = await db.query(
          'SELECT * FROM artist_profiles WHERE user_id = ?',
          [req.userId]
        );
        if (artistProfile && artistProfile[0]) {
          Object.assign(userData, artistProfile[0]);
        }
        
        const [communityProfile] = await db.query(
          'SELECT * FROM community_profiles WHERE user_id = ?',
          [req.userId]
        );
        if (communityProfile && communityProfile[0]) {
          Object.assign(userData, communityProfile[0]);
        }
        
        const [promoterProfile] = await db.query(
          'SELECT * FROM promoter_profiles WHERE user_id = ?',
          [req.userId]
        );
        if (promoterProfile && promoterProfile[0]) {
          Object.assign(userData, promoterProfile[0]);
        }
      } catch (profileError) {
        // Silently handle profile fetch errors
      }
    }
    
    // Get marketplace application data if it exists
    const [marketplaceApp] = await db.query(
      `SELECT 
        work_description, additional_info, profile_data,
        marketplace_status, marketplace_reviewed_by, marketplace_review_date, marketplace_admin_notes,
        verification_status, verification_reviewed_by, verification_review_date, verification_admin_notes,
        raw_materials_media_id, work_process_1_media_id, work_process_2_media_id, work_process_3_media_id,
        artist_at_work_media_id, booth_display_media_id, artist_working_video_media_id,
        artist_bio_video_media_id, additional_video_media_id, created_at, updated_at
      FROM marketplace_applications 
      WHERE user_id = ?`,
      [req.userId]
    );
    
    if (marketplaceApp[0]) {
      // Get processed media URLs for jury materials
      const mediaIds = [
        marketplaceApp[0].raw_materials_media_id,
        marketplaceApp[0].work_process_1_media_id,
        marketplaceApp[0].work_process_2_media_id,
        marketplaceApp[0].work_process_3_media_id,
        marketplaceApp[0].artist_at_work_media_id,
        marketplaceApp[0].booth_display_media_id,
        marketplaceApp[0].artist_working_video_media_id,
        marketplaceApp[0].artist_bio_video_media_id,
        marketplaceApp[0].additional_video_media_id
      ].filter(id => id !== null);
      
      if (mediaIds.length > 0) {
        const [mediaUrls] = await db.query(
          `SELECT id, permanent_url, status FROM pending_images WHERE id IN (${mediaIds.map(() => '?').join(',')})`,
          mediaIds
        );
        
        // Map media URLs back to the application
        const mediaMapping = {};
        mediaUrls.forEach(media => {
          if (media.permanent_url) {
            mediaMapping[media.id] = `https://api2.onlineartfestival.com/api/images/${media.permanent_url}`;
          }
        });
        
        // Add processed media URLs to the marketplace application
        marketplaceApp[0].media_urls = {
          raw_materials: marketplaceApp[0].raw_materials_media_id ? mediaMapping[marketplaceApp[0].raw_materials_media_id] : null,
          work_process_1: marketplaceApp[0].work_process_1_media_id ? mediaMapping[marketplaceApp[0].work_process_1_media_id] : null,
          work_process_2: marketplaceApp[0].work_process_2_media_id ? mediaMapping[marketplaceApp[0].work_process_2_media_id] : null,
          work_process_3: marketplaceApp[0].work_process_3_media_id ? mediaMapping[marketplaceApp[0].work_process_3_media_id] : null,
          artist_at_work: marketplaceApp[0].artist_at_work_media_id ? mediaMapping[marketplaceApp[0].artist_at_work_media_id] : null,
          booth_display: marketplaceApp[0].booth_display_media_id ? mediaMapping[marketplaceApp[0].booth_display_media_id] : null,
          artist_working_video: marketplaceApp[0].artist_working_video_media_id ? mediaMapping[marketplaceApp[0].artist_working_video_media_id] : null,
          artist_bio_video: marketplaceApp[0].artist_bio_video_media_id ? mediaMapping[marketplaceApp[0].artist_bio_video_media_id] : null,
          additional_video: marketplaceApp[0].additional_video_media_id ? mediaMapping[marketplaceApp[0].additional_video_media_id] : null
        };
      }
      
      userData.marketplace_application = marketplaceApp[0];
    }
    
    // Get user's active addons
    const [userAddons] = await db.query(
      `SELECT ua.*, wa.addon_name, wa.description, wa.monthly_price, wa.category 
       FROM user_addons ua 
       JOIN website_addons wa ON ua.addon_slug = wa.addon_slug 
       WHERE ua.user_id = ? AND ua.is_active = 1`,
      [req.userId]
    );
    
    if (userAddons && userAddons.length > 0) {
      userData.addons = userAddons;
      // Also provide a simplified array of addon slugs for easy checking
      userData.addon_slugs = userAddons.map(addon => addon.addon_slug);
    } else {
      userData.addons = [];
      userData.addon_slugs = [];
    }
    
    // Enhance with processed media URLs
    const enhancedUserData = await enhanceUserProfileWithMedia(userData);
    res.json(enhancedUserData);
  } catch (err) {
    console.error('Error fetching user profile:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// GET /users?permissions=vendor,admin - Filter users by permissions
router.get('/', verifyToken, async (req, res) => {
  try {
    const { permissions } = req.query;
    
    if (!permissions) {
      return res.status(400).json({ error: 'permissions query parameter is required' });
    }
    
    // Parse comma-separated permissions
    const requestedPermissions = permissions.split(',').map(p => p.trim()).filter(p => p);
    
    if (requestedPermissions.length === 0) {
      return res.status(400).json({ error: 'At least one permission must be specified' });
    }
    
    // Separate user types from actual permissions
    const userTypes = [];
    const actualPermissions = [];
    
    for (const permission of requestedPermissions) {
      if (permission === 'admin') {
        userTypes.push('admin');
      } else {
        actualPermissions.push(permission);
      }
    }
    
    // Build dynamic query to find users with any of the requested permissions or user types
    let whereConditions = [];
    let queryParams = [];
    
    // Add user type conditions (like admin)
    if (userTypes.length > 0) {
      const userTypePlaceholders = userTypes.map(() => '?').join(',');
      whereConditions.push(`u.user_type IN (${userTypePlaceholders})`);
      queryParams.push(...userTypes);
    }
    
    // Add actual permission conditions (like vendor)
    for (const permission of actualPermissions) {
      whereConditions.push(`up.${permission} = ?`);
      queryParams.push(true);
    }
    
    if (whereConditions.length === 0) {
      return res.status(400).json({ error: 'No valid permissions or user types specified' });
    }
    
    const whereClause = whereConditions.join(' OR ');
    
    const query = `
      SELECT DISTINCT 
        u.id, 
        u.username, 
        u.user_type, 
        u.status,
        prof.first_name, 
        prof.last_name
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      LEFT JOIN user_profiles prof ON u.id = prof.user_id
      WHERE u.status = 'active' AND (${whereClause})
      ORDER BY prof.first_name, prof.last_name, u.username
    `;
    
    const [users] = await db.query(query, queryParams);
    
    // Transform to a format suitable for dropdowns
    const formattedUsers = users.map(user => ({
      id: user.id,
      username: user.username,
      user_type: user.user_type,
      first_name: user.first_name,
      last_name: user.last_name,
      display_name: user.first_name && user.last_name ? 
        `${user.first_name} ${user.last_name}` : user.username,
      email: user.username // username is email in your system
    }));
    
    res.json(formattedUsers);
  } catch (err) {
    console.error('Error fetching users by permissions:', err.message, err.stack);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ error: 'Failed to fetch users by permissions' });
  }
});

// PATCH /users/me - Update current user's profile with image uploads
router.patch('/me', 
  verifyToken,
  upload.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'header_image', maxCount: 1 },
    { name: 'logo_image', maxCount: 1 },
    { name: 'site_image', maxCount: 1 },
    // Jury media fields
    { name: 'jury_raw_materials', maxCount: 1 },
    { name: 'jury_work_process_1', maxCount: 1 },
    { name: 'jury_work_process_2', maxCount: 1 },
    { name: 'jury_work_process_3', maxCount: 1 },
    { name: 'jury_artist_at_work', maxCount: 1 },
    { name: 'jury_booth_display', maxCount: 1 },
    { name: 'jury_artist_working_video', maxCount: 1 },
    { name: 'jury_artist_bio_video', maxCount: 1 },
    { name: 'jury_additional_video', maxCount: 1 }
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
        business_name, legal_name, tax_id, customer_service_email, studio_address_line1, 
        studio_address_line2, studio_city, studio_state, studio_zip, business_website, 
        business_phone, business_social_facebook, business_social_instagram, 
        business_social_tiktok, business_social_twitter, business_social_pinterest, founding_date,
        
        // Community-specific fields (community_profiles table)
        art_style_preferences, favorite_colors, art_interests, wishlist,
        
        // Promoter-specific fields (promoter_profiles table)
        is_non_profit, organization_size, sponsorship_options, upcoming_events,
        office_address_line1, office_address_line2, office_city, office_state, office_zip
      } = req.body;

      // Determine if base profile fields are being updated in this request
      const updatingBaseProfile = [
        first_name, last_name, display_name, phone, address_line1, address_line2,
        city, state, postal_code, country, bio, website, birth_date, gender,
        nationality, languages_known, job_title, education, awards, memberships,
        timezone, social_facebook, social_instagram, social_tiktok, social_twitter,
        social_pinterest, social_whatsapp
      ].some(v => v !== undefined);

      // Only require first_name and last_name when actually updating base profile fields
      if (updatingBaseProfile && (!first_name || !last_name)) {
        return res.status(400).json({ error: 'Missing required fields: first_name, last_name' });
      }

      // Handle the uploaded images
      let profileImagePath = null;
      let headerImagePath = null;
      let logoImagePath = null;
      
      if (req.files['profile_image']) {
        const file = req.files['profile_image'][0];
        profileImagePath = `/temp_images/profiles/${file.filename}`;
        await db.query(
          'INSERT INTO pending_images (user_id, image_path, original_name, mime_type, status) VALUES (?, ?, ?, ?, ?)',
          [req.userId, profileImagePath, file.originalname, file.mimetype, 'pending']
        );
      }
      if (req.files['header_image']) {
        const file = req.files['header_image'][0];
        headerImagePath = `/temp_images/profiles/${file.filename}`;
        await db.query(
          'INSERT INTO pending_images (user_id, image_path, original_name, mime_type, status) VALUES (?, ?, ?, ?, ?)',
          [req.userId, headerImagePath, file.originalname, file.mimetype, 'pending']
        );
      }
      if (req.files['logo_image']) {
        const file = req.files['logo_image'][0];
        logoImagePath = `/temp_images/profiles/${file.filename}`;
        await db.query(
          'INSERT INTO pending_images (user_id, image_path, original_name, mime_type, status) VALUES (?, ?, ?, ?, ?)',
          [req.userId, logoImagePath, file.originalname, file.mimetype, 'pending']
        );
      }
      if (req.files['site_image']) {
        const file = req.files['site_image'][0];
        const siteImagePath = `/temp_images/sites/${file.filename}`;
        await db.query(
          'INSERT INTO pending_images (user_id, image_path, original_name, mime_type, status) VALUES (?, ?, ?, ?, ?)',
          [req.userId, siteImagePath, file.originalname, file.mimetype, 'pending']
        );
      }

      // Handle jury media uploads and store pending_image IDs for marketplace application
      const juryMediaIds = {};
      const juryFields = [
        'jury_raw_materials', 'jury_work_process_1', 'jury_work_process_2', 'jury_work_process_3',
        'jury_artist_at_work', 'jury_booth_display', 'jury_artist_working_video', 
        'jury_artist_bio_video', 'jury_additional_video'
      ];

      for (const fieldName of juryFields) {
        if (req.files[fieldName]) {
          const file = req.files[fieldName][0];
          const juryMediaPath = `/temp_images/jury/${file.filename}`;
          
          const [result] = await db.query(
            'INSERT INTO pending_images (user_id, image_path, original_name, mime_type, status) VALUES (?, ?, ?, ?, ?)',
            [req.userId, juryMediaPath, file.originalname, file.mimetype, 'pending']
          );
          
          // Store the pending_images ID for this field
          juryMediaIds[fieldName] = result.insertId;
        }
      }

      // Process JSON fields properly
      const processedLanguagesKnown = languages_known ? 
        (typeof languages_known === 'string' ? languages_known : JSON.stringify(languages_known)) : null;
      const processedEducation = education ? 
        (typeof education === 'string' ? education : JSON.stringify(education)) : null;
      // Awards and memberships are now simple text fields
      const processedAwards = awards || null;
      const processedMemberships = memberships || null;

      // Ensure user_profiles record exists if we need to touch it (base fields or images)
      const updatingImagesRecord = Boolean(profileImagePath || headerImagePath);
      if (updatingBaseProfile || updatingImagesRecord) {
        await db.query(
          `INSERT INTO user_profiles (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = user_id`,
          [req.userId]
        );
      }

      // Update base profile fields in user_profiles table only when provided
      if (updatingBaseProfile) {
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
      }

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
      if (logoImagePath) {
        // Update logo in both artist and promoter profiles
        await db.query(
          'UPDATE artist_profiles SET logo_path = ? WHERE user_id = ?',
          [logoImagePath, req.userId]
        );
        await db.query(
          'UPDATE promoter_profiles SET logo_path = ? WHERE user_id = ?',
          [logoImagePath, req.userId]
        );
      }

      // Only update artist profile if artist fields are actually provided
      const artistFieldsProvided = [
        artist_biography, art_categories, art_mediums, does_custom, custom_details, 
        business_name, legal_name, tax_id, customer_service_email,
        studio_address_line1, studio_address_line2, studio_city, studio_state, studio_zip, 
        business_website, business_phone, business_social_facebook, 
        business_social_instagram, business_social_tiktok, business_social_twitter, 
        business_social_pinterest, founding_date
      ].some(v => v !== undefined);

      if ((userType === 'artist' || userType === 'admin') && (artistFieldsProvided || logoImagePath)) {
        // Process JSON fields for artist profiles
        const processedArtCategories = art_categories ? 
          (typeof art_categories === 'string' ? art_categories : JSON.stringify(art_categories)) : null;
        const processedArtMediums = art_mediums ? 
          (typeof art_mediums === 'string' ? art_mediums : JSON.stringify(art_mediums)) : null;

        // Ensure artist_profiles record exists
        await db.query(
          `INSERT INTO artist_profiles (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = user_id`,
          [req.userId]
        );

        // Build dynamic UPDATE query for only the fields that were provided
        const updateFields = [];
        const updateValues = [];

        if (artist_biography !== undefined) {
          updateFields.push('artist_biography = ?');
          updateValues.push(artist_biography || null);
        }
        if (art_categories !== undefined) {
          updateFields.push('art_categories = ?');
          updateValues.push(processedArtCategories);
        }
        if (art_mediums !== undefined) {
          updateFields.push('art_mediums = ?');
          updateValues.push(processedArtMediums);
        }
        if (does_custom !== undefined) {
          updateFields.push('does_custom = ?');
          updateValues.push(does_custom || 'no');
        }
        if (custom_details !== undefined) {
          updateFields.push('custom_details = ?');
          updateValues.push(custom_details || null);
        }
        if (business_name !== undefined) {
          updateFields.push('business_name = ?');
          updateValues.push(business_name || null);
        }
        if (legal_name !== undefined) {
          updateFields.push('legal_name = ?');
          updateValues.push(legal_name || null);
        }
        if (tax_id !== undefined) {
          updateFields.push('tax_id = ?');
          updateValues.push(tax_id || null);
        }
        if (customer_service_email !== undefined) {
          updateFields.push('customer_service_email = ?');
          updateValues.push(customer_service_email || null);
        }
        if (studio_address_line1 !== undefined) {
          updateFields.push('studio_address_line1 = ?');
          updateValues.push(studio_address_line1 || null);
        }
        if (studio_address_line2 !== undefined) {
          updateFields.push('studio_address_line2 = ?');
          updateValues.push(studio_address_line2 || null);
        }
        if (studio_city !== undefined) {
          updateFields.push('studio_city = ?');
          updateValues.push(studio_city || null);
        }
        if (studio_state !== undefined) {
          updateFields.push('studio_state = ?');
          updateValues.push(studio_state || null);
        }
        if (studio_zip !== undefined) {
          updateFields.push('studio_zip = ?');
          updateValues.push(studio_zip || null);
        }
        if (business_website !== undefined) {
          updateFields.push('business_website = ?');
          updateValues.push(business_website || null);
        }
        if (business_phone !== undefined) {
          updateFields.push('business_phone = ?');
          updateValues.push(business_phone || null);
        }
        if (business_social_facebook !== undefined) {
          updateFields.push('business_social_facebook = ?');
          updateValues.push(business_social_facebook || null);
        }
        if (business_social_instagram !== undefined) {
          updateFields.push('business_social_instagram = ?');
          updateValues.push(business_social_instagram || null);
        }
        if (business_social_tiktok !== undefined) {
          updateFields.push('business_social_tiktok = ?');
          updateValues.push(business_social_tiktok || null);
        }
        if (business_social_twitter !== undefined) {
          updateFields.push('business_social_twitter = ?');
          updateValues.push(business_social_twitter || null);
        }
        if (business_social_pinterest !== undefined) {
          updateFields.push('business_social_pinterest = ?');
          updateValues.push(business_social_pinterest || null);
        }
        if (founding_date !== undefined) {
          updateFields.push('founding_date = ?');
          updateValues.push(founding_date || null);
        }
        if (logoImagePath) {
          updateFields.push('logo_path = ?');
          updateValues.push(logoImagePath);
        }

        // Only run the UPDATE if there are fields to update
        if (updateFields.length > 0) {
          updateValues.push(req.userId); // Add user_id for WHERE clause
          await db.query(
            `UPDATE artist_profiles SET ${updateFields.join(', ')} WHERE user_id = ?`,
            updateValues
          );
        }
      } else if (userType === 'community' || (userType === 'admin' && (art_style_preferences !== undefined || favorite_colors !== undefined || art_interests !== undefined || wishlist !== undefined))) {
        // Process JSON fields for community profiles
        const processedFavoriteColors = favorite_colors ? 
          (typeof favorite_colors === 'string' ? favorite_colors : JSON.stringify(favorite_colors)) : null;
        const processedArtInterests = art_interests ? 
          (typeof art_interests === 'string' ? art_interests : JSON.stringify(art_interests)) : null;
        const processedWishlist = wishlist ? 
          (typeof wishlist === 'string' ? wishlist : JSON.stringify(wishlist)) : null;

        // Ensure community_profiles record exists
        await db.query(
          `INSERT INTO community_profiles (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = user_id`,
          [req.userId]
        );

        // Build dynamic UPDATE query for only the fields that were provided
        const updateFields = [];
        const updateValues = [];

        if (art_style_preferences !== undefined) {
          updateFields.push('art_style_preferences = ?');
          updateValues.push(art_style_preferences || null);
        }
        if (favorite_colors !== undefined) {
          updateFields.push('favorite_colors = ?');
          updateValues.push(processedFavoriteColors);
        }
        if (art_interests !== undefined) {
          updateFields.push('art_interests = ?');
          updateValues.push(processedArtInterests);
        }
        if (wishlist !== undefined) {
          updateFields.push('wishlist = ?');
          updateValues.push(processedWishlist);
        }

        // Only run the UPDATE if there are fields to update
        if (updateFields.length > 0) {
          updateValues.push(req.userId); // Add user_id for WHERE clause
          await db.query(
            `UPDATE community_profiles SET ${updateFields.join(', ')} WHERE user_id = ?`,
            updateValues
          );
        }
      } else if (userType === 'promoter' || userType === 'admin') {
        // Only update promoter profile if promoter fields are actually provided
        const promoterFieldsProvided = [
          business_name, legal_name, tax_id, business_phone, business_website, 
          business_social_facebook, business_social_instagram, business_social_tiktok, 
          business_social_twitter, business_social_pinterest, office_address_line1, 
          office_address_line2, office_city, office_state, office_zip, is_non_profit, 
          organization_size, sponsorship_options, upcoming_events, founding_date
        ].some(v => v !== undefined);

        if (promoterFieldsProvided || logoImagePath) {
        // Sponsorship options and upcoming events are now simple text fields
        const processedSponsorshipOptions = sponsorship_options || null;
        const processedUpcomingEvents = upcoming_events || null;

          // Ensure promoter_profiles record exists
        await db.query(
            `INSERT INTO promoter_profiles (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = user_id`,
            [req.userId]
          );

          // Build dynamic UPDATE query for only the fields that were provided
          const updateFields = [];
          const updateValues = [];

          if (business_name !== undefined) {
            updateFields.push('business_name = ?');
            updateValues.push(business_name || null);
          }
          if (legal_name !== undefined) {
            updateFields.push('legal_name = ?');
            updateValues.push(legal_name || null);
          }
          if (tax_id !== undefined) {
            updateFields.push('tax_id = ?');
            updateValues.push(tax_id || null);
          }
          if (business_phone !== undefined) {
            updateFields.push('business_phone = ?');
            updateValues.push(business_phone || null);
          }
          if (business_website !== undefined) {
            updateFields.push('business_website = ?');
            updateValues.push(business_website || null);
          }
          if (business_social_facebook !== undefined) {
            updateFields.push('business_social_facebook = ?');
            updateValues.push(business_social_facebook || null);
          }
          if (business_social_instagram !== undefined) {
            updateFields.push('business_social_instagram = ?');
            updateValues.push(business_social_instagram || null);
          }
          if (business_social_tiktok !== undefined) {
            updateFields.push('business_social_tiktok = ?');
            updateValues.push(business_social_tiktok || null);
          }
          if (business_social_twitter !== undefined) {
            updateFields.push('business_social_twitter = ?');
            updateValues.push(business_social_twitter || null);
          }
          if (business_social_pinterest !== undefined) {
            updateFields.push('business_social_pinterest = ?');
            updateValues.push(business_social_pinterest || null);
          }
          if (office_address_line1 !== undefined) {
            updateFields.push('office_address_line1 = ?');
            updateValues.push(office_address_line1 || null);
          }
          if (office_address_line2 !== undefined) {
            updateFields.push('office_address_line2 = ?');
            updateValues.push(office_address_line2 || null);
          }
          if (office_city !== undefined) {
            updateFields.push('office_city = ?');
            updateValues.push(office_city || null);
          }
          if (office_state !== undefined) {
            updateFields.push('office_state = ?');
            updateValues.push(office_state || null);
          }
          if (office_zip !== undefined) {
            updateFields.push('office_zip = ?');
            updateValues.push(office_zip || null);
          }
          if (is_non_profit !== undefined) {
            updateFields.push('is_non_profit = ?');
            updateValues.push(is_non_profit || 'no');
          }
          if (organization_size !== undefined) {
            updateFields.push('organization_size = ?');
            updateValues.push(organization_size || null);
          }
          if (sponsorship_options !== undefined) {
            updateFields.push('sponsorship_options = ?');
            updateValues.push(processedSponsorshipOptions);
          }
          if (upcoming_events !== undefined) {
            updateFields.push('upcoming_events = ?');
            updateValues.push(processedUpcomingEvents);
          }
          if (founding_date !== undefined) {
            updateFields.push('founding_date = ?');
            updateValues.push(founding_date || null);
          }
          if (logoImagePath) {
            updateFields.push('logo_path = ?');
            updateValues.push(logoImagePath);
          }

          // Only run the UPDATE if there are fields to update
          if (updateFields.length > 0) {
            updateValues.push(req.userId); // Add user_id for WHERE clause
            await db.query(
              `UPDATE promoter_profiles SET ${updateFields.join(', ')} WHERE user_id = ?`,
              updateValues
            );
          }
        }
      }

      // Handle marketplace application if jury media or application data is provided
      const { work_description, additional_info, marketplace_application } = req.body;
      
      if (work_description || additional_info || Object.keys(juryMediaIds).length > 0 || marketplace_application) {
        // Get current user profile for the application
        const [userProfile] = await db.query(
          'SELECT u.username, up.first_name, up.last_name, up.phone, up.address_line1, up.city, up.state, up.postal_code, ' +
          'ap.business_name, ap.business_phone, ap.business_website, ap.customer_service_email, ' +
          'ap.business_social_facebook, ap.business_social_instagram ' +
          'FROM users u ' +
          'LEFT JOIN user_profiles up ON u.id = up.user_id ' +
          'LEFT JOIN artist_profiles ap ON u.id = ap.user_id ' +
          'WHERE u.id = ?',
          [req.userId]
        );

        // Create or update marketplace application
        const profileData = userProfile[0] ? JSON.stringify(userProfile[0]) : null;
        
        await db.query(
          `INSERT INTO marketplace_applications (
            user_id, work_description, additional_info, profile_data,
            raw_materials_media_id, work_process_1_media_id, work_process_2_media_id, work_process_3_media_id,
            artist_at_work_media_id, booth_display_media_id, artist_working_video_media_id,
            artist_bio_video_media_id, additional_video_media_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            work_description = VALUES(work_description),
            additional_info = VALUES(additional_info),
            profile_data = VALUES(profile_data),
            raw_materials_media_id = COALESCE(VALUES(raw_materials_media_id), raw_materials_media_id),
            work_process_1_media_id = COALESCE(VALUES(work_process_1_media_id), work_process_1_media_id),
            work_process_2_media_id = COALESCE(VALUES(work_process_2_media_id), work_process_2_media_id),
            work_process_3_media_id = COALESCE(VALUES(work_process_3_media_id), work_process_3_media_id),
            artist_at_work_media_id = COALESCE(VALUES(artist_at_work_media_id), artist_at_work_media_id),
            booth_display_media_id = COALESCE(VALUES(booth_display_media_id), booth_display_media_id),
            artist_working_video_media_id = COALESCE(VALUES(artist_working_video_media_id), artist_working_video_media_id),
            artist_bio_video_media_id = COALESCE(VALUES(artist_bio_video_media_id), artist_bio_video_media_id),
            additional_video_media_id = COALESCE(VALUES(additional_video_media_id), additional_video_media_id),
            updated_at = CURRENT_TIMESTAMP`,
          [
            req.userId,
            work_description || null,
            additional_info || null,
            profileData,
            juryMediaIds['jury_raw_materials'] || null,
            juryMediaIds['jury_work_process_1'] || null,
            juryMediaIds['jury_work_process_2'] || null,
            juryMediaIds['jury_work_process_3'] || null,
            juryMediaIds['jury_artist_at_work'] || null,
            juryMediaIds['jury_booth_display'] || null,
            juryMediaIds['jury_artist_working_video'] || null,
            juryMediaIds['jury_artist_bio_video'] || null,
            juryMediaIds['jury_additional_video'] || null
          ]
        );
      }

      res.json({ 
        message: 'Profile updated successfully',
        uploadedFiles: Object.keys(juryMediaIds).length > 0 ? juryMediaIds : undefined
      });
    } catch (err) {
      console.error('Error updating user profile:', err.message);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: 'Failed to update user profile' });
    }
  }
);

// PATCH /users/admin/me - Update admin user's profile with access to all profile types
router.patch('/admin/me', 
  verifyToken,
  upload.fields([
    { name: 'profile_image', maxCount: 1 },
    { name: 'header_image', maxCount: 1 },
    { name: 'logo_image', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      // Only allow admin users to use this endpoint
      const [user] = await db.query('SELECT user_type FROM users WHERE id = ?', [req.userId]);
      if (!user[0] || user[0].user_type !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const {
        // Base profile fields
        first_name, last_name, display_name, phone, address_line1, address_line2,
        city, state, postal_code, country, bio, website, birth_date, gender, 
        nationality, languages_known, job_title, education, awards, memberships, 
        timezone, social_facebook, social_instagram, social_tiktok, social_twitter, 
        social_pinterest, social_whatsapp,
        
        // Artist profile fields
        artist_biography, art_categories, art_mediums, does_custom, custom_details,
        artist_business_name, artist_legal_name, artist_tax_id, customer_service_email,
        studio_address_line1, studio_address_line2, studio_city, studio_state, studio_zip,
        artist_business_phone, artist_business_website, artist_business_social_facebook, artist_business_social_instagram,
        artist_business_social_tiktok, artist_business_social_twitter, artist_business_social_pinterest, artist_founding_date,
        
        // Promoter profile fields  
        is_non_profit, organization_size, sponsorship_options, upcoming_events,
        office_address_line1, office_address_line2, office_city, office_state, office_zip,
        promoter_business_name, promoter_legal_name, promoter_tax_id, promoter_business_phone,
        promoter_business_website, promoter_business_social_facebook, promoter_business_social_instagram,
        promoter_business_social_tiktok, promoter_business_social_twitter, promoter_business_social_pinterest, promoter_founding_date,
        
        // Community profile fields
        art_style_preferences, favorite_colors, art_interests, wishlist
      } = req.body;

      // Handle image uploads
      const profileImagePath = req.files?.profile_image?.[0]?.filename || null;
      const headerImagePath = req.files?.header_image?.[0]?.filename || null;
      const logoImagePath = req.files?.logo_image?.[0]?.filename || null;

      // Update base user_profiles table
      await db.query(
        `UPDATE user_profiles SET 
          first_name = ?, last_name = ?, display_name = ?, phone = ?, 
          address_line1 = ?, address_line2 = ?, city = ?, state = ?, postal_code = ?, 
          country = ?, bio = ?, website = ?, birth_date = ?, gender = ?, nationality = ?,
          languages_known = ?, job_title = ?, education = ?, awards = ?, memberships = ?,
          timezone = ?, social_facebook = ?, social_instagram = ?, social_tiktok = ?,
          social_twitter = ?, social_pinterest = ?, social_whatsapp = ?,
          profile_image_path = COALESCE(?, profile_image_path),
          header_image_path = COALESCE(?, header_image_path)
        WHERE user_id = ?`,
        [
          first_name, last_name, display_name, phone, address_line1, address_line2,
          city, state, postal_code, country, bio, website, birth_date, gender, 
          nationality, JSON.stringify(languages_known || []), job_title, 
          JSON.stringify(education || []), awards, memberships, timezone,
          social_facebook, social_instagram, social_tiktok, social_twitter,
          social_pinterest, social_whatsapp, profileImagePath, headerImagePath, req.userId
        ]
      );

      // Update artist_profiles if artist fields are provided
      if (artist_biography !== undefined || art_categories !== undefined || art_mediums !== undefined || 
          artist_business_name !== undefined || does_custom !== undefined) {
        
        const processedArtCategories = art_categories ? 
          (typeof art_categories === 'string' ? art_categories : JSON.stringify(art_categories)) : null;
        const processedArtMediums = art_mediums ? 
          (typeof art_mediums === 'string' ? art_mediums : JSON.stringify(art_mediums)) : null;

        await db.query(
          `INSERT INTO artist_profiles (user_id, artist_biography, art_categories, art_mediums, 
            does_custom, custom_details, business_name, legal_name, tax_id, customer_service_email,
            studio_address_line1, studio_address_line2, studio_city, studio_state, studio_zip, 
            business_website, business_phone, business_social_facebook, 
            business_social_instagram, business_social_tiktok, business_social_twitter, 
            business_social_pinterest, founding_date, logo_path) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            artist_biography = VALUES(artist_biography),
            art_categories = VALUES(art_categories),
            art_mediums = VALUES(art_mediums),
            does_custom = VALUES(does_custom),
            custom_details = VALUES(custom_details),
            business_name = VALUES(business_name),
            legal_name = VALUES(legal_name),
            tax_id = VALUES(tax_id),
            customer_service_email = VALUES(customer_service_email),
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
            logo_path = COALESCE(VALUES(logo_path), logo_path)`,
          [
            req.userId, artist_biography || null, processedArtCategories, processedArtMediums, 
            does_custom || 'no', custom_details || null, artist_business_name || null, 
            artist_legal_name || null, artist_tax_id || null, customer_service_email || null,
            studio_address_line1 || null, studio_address_line2 || null, studio_city || null, 
            studio_state || null, studio_zip || null, artist_business_website || null, 
            artist_business_phone || null, artist_business_social_facebook || null, 
            artist_business_social_instagram || null, artist_business_social_tiktok || null, 
            artist_business_social_twitter || null, artist_business_social_pinterest || null, 
            artist_founding_date || null, logoImagePath
          ]
        );
      }

      // Update promoter_profiles if promoter fields are provided
      if (is_non_profit !== undefined || organization_size !== undefined || 
          sponsorship_options !== undefined || upcoming_events !== undefined ||
          office_address_line1 !== undefined || promoter_business_name !== undefined) {
        
        await db.query(
          `INSERT INTO promoter_profiles (user_id, business_name, legal_name, tax_id, business_phone, 
            business_website, business_social_facebook, business_social_instagram, 
            business_social_tiktok, business_social_twitter, business_social_pinterest, 
            office_address_line1, office_address_line2, office_city, office_state, office_zip,
            is_non_profit, organization_size, sponsorship_options, upcoming_events, 
            founding_date, logo_path) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            business_name = VALUES(business_name),
            legal_name = VALUES(legal_name),
            tax_id = VALUES(tax_id),
            business_phone = VALUES(business_phone),
            business_website = VALUES(business_website),
            business_social_facebook = VALUES(business_social_facebook),
            business_social_instagram = VALUES(business_social_instagram),
            business_social_tiktok = VALUES(business_social_tiktok),
            business_social_twitter = VALUES(business_social_twitter),
            business_social_pinterest = VALUES(business_social_pinterest),
            office_address_line1 = VALUES(office_address_line1),
            office_address_line2 = VALUES(office_address_line2),
            office_city = VALUES(office_city),
            office_state = VALUES(office_state),
            office_zip = VALUES(office_zip),
            is_non_profit = VALUES(is_non_profit),
            organization_size = VALUES(organization_size),
            sponsorship_options = VALUES(sponsorship_options),
            upcoming_events = VALUES(upcoming_events),
            founding_date = VALUES(founding_date),
            logo_path = COALESCE(VALUES(logo_path), logo_path)`,
          [
            req.userId, promoter_business_name || null, promoter_legal_name || null, promoter_tax_id || null, 
            promoter_business_phone || null, promoter_business_website || null, promoter_business_social_facebook || null,
            promoter_business_social_instagram || null, promoter_business_social_tiktok || null, 
            promoter_business_social_twitter || null, promoter_business_social_pinterest || null,
            office_address_line1 || null, office_address_line2 || null, office_city || null,
            office_state || null, office_zip || null, is_non_profit || 'no', 
            organization_size || null, sponsorship_options || null, upcoming_events || null,
            promoter_founding_date || null, logoImagePath
          ]
        );
      }

      // Update community_profiles if community fields are provided
      if (art_style_preferences !== undefined || favorite_colors !== undefined || 
          art_interests !== undefined || wishlist !== undefined) {
        
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
      }

      res.json({ message: 'Admin profile updated successfully' });
    } catch (err) {
      console.error('Error updating admin profile:', err.message);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ error: 'Failed to update admin profile' });
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
    if (userData.user_type === 'artist' || userData.user_type === 'admin') {
      const [artistProfile] = await db.query(
        'SELECT * FROM artist_profiles WHERE user_id = ?',
        [userData.id]
      );
      if (artistProfile[0]) {
        Object.assign(userData, artistProfile[0]);
      }
    }
    
    if (userData.user_type === 'community') {
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
    
    // Enhance with processed media URLs
    const enhancedUserData = await enhanceUserProfileWithMedia(userData);
    res.json(enhancedUserData);
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

// GET /users/:id/policies - Get user's policies (public endpoint)
router.get('/:id/policies', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify user exists and is active
    const [user] = await db.query(
      'SELECT id, username, user_type, status FROM users WHERE id = ? AND status = ?',
      [id, 'active']
    );
    
    if (!user[0]) {
      return res.status(404).json({ error: 'User not found or inactive' });
    }
    
    const [shippingPolicy, returnPolicy] = await Promise.all([
      getVendorShippingPolicy(id),
      getVendorReturnPolicy(id)
    ]);
    
    res.json({
      success: true,
      policies: {
        shipping: shippingPolicy,
        return: returnPolicy
      }
    });
    
  } catch (error) {
    console.error('Error getting user policies:', error);
    res.status(500).json({ error: 'Failed to get policies' });
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

/**
 * Get vendor's shipping policy (with fallback to default)
 */
async function getVendorShippingPolicy(vendorId) {
  // First try to get vendor's custom policy
  const vendorQuery = `
    SELECT 
      sp.id,
      sp.policy_text,
      sp.created_at,
      sp.updated_at,
      u.username as created_by_username,
      'custom' as policy_source
    FROM shipping_policies sp
    JOIN users u ON sp.created_by = u.id
    WHERE sp.user_id = ? AND sp.status = 'active'
  `;
  
  const [vendorRows] = await db.execute(vendorQuery, [vendorId]);
  
  if (vendorRows.length > 0) {
    return vendorRows[0];
  }
  
  // If no custom policy, get default policy (user_id = NULL)
  const defaultQuery = `
    SELECT 
      sp.id,
      sp.policy_text,
      sp.created_at,
      sp.updated_at,
      u.username as created_by_username,
      'default' as policy_source
    FROM shipping_policies sp
    JOIN users u ON sp.created_by = u.id
    WHERE sp.user_id IS NULL AND sp.status = 'active'
  `;
  
  const [defaultRows] = await db.execute(defaultQuery);
  
  if (defaultRows.length > 0) {
    return defaultRows[0];
  }
  
  // If no default policy exists, return null
  return null;
}

/**
 * Get vendor's return policy (with fallback to default)
 */
async function getVendorReturnPolicy(vendorId) {
  // First try to get vendor's custom policy
  const vendorQuery = `
    SELECT 
      rp.id,
      rp.policy_text,
      rp.created_at,
      rp.updated_at,
      u.username as created_by_username,
      'custom' as policy_source
    FROM return_policies rp
    JOIN users u ON rp.created_by = u.id
    WHERE rp.user_id = ? AND rp.status = 'active'
  `;
  
  const [vendorRows] = await db.execute(vendorQuery, [vendorId]);
  
  if (vendorRows.length > 0) {
    return vendorRows[0];
  }
  
  // If no custom policy, get default policy (user_id = NULL)
  const defaultQuery = `
    SELECT 
      rp.id,
      rp.policy_text,
      rp.created_at,
      rp.updated_at,
      u.username as created_by_username,
      'default' as policy_source
    FROM return_policies rp
    JOIN users u ON rp.created_by = u.id
    WHERE rp.user_id IS NULL AND rp.status = 'active'
  `;
  
  const [defaultRows] = await db.execute(defaultQuery);
  
  if (defaultRows.length > 0) {
    return defaultRows[0];
  }
  
  // If no default policy exists, return null
  return null;
}

module.exports = router;