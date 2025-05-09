const express = require('express');
const router = express.Router();
const { BadRequestError, NotFoundError } = require('../../utils/errors');
const { pool, normalizeId } = require('../../middleware/db');

// GET /v1/profiles
router.get('/profiles', async (req, res, next) => {
  try {
    // TODO: Implement profile listing
    res.json({ message: 'Profile listing endpoint - to be implemented' });
  } catch (error) {
    next(error);
  }
});

// GET /v1/profiles/:id
router.get('/profiles/:id', async (req, res, next) => {
  try {
    // TODO: Implement profile retrieval
    res.json({ message: 'Profile retrieval endpoint - to be implemented' });
  } catch (error) {
    next(error);
  }
});

// GET /v1/user/profile - Get current user's profile
router.get('/profile', async (req, res, next) => {
  try {
    // Ensure we have a valid user object
    if (!req.user || !req.user.id) {
      throw new BadRequestError('Invalid authentication token');
    }

    // Use the normalized ID
    const userId = normalizeId(req.user.id);
    
    // Fetch user data with proper error handling
    let userData = null; // Initialize with null
    try {
      const [users] = await pool.query(
        `SELECT 
          id,
          username,
          status,
          user_type
         FROM users
         WHERE id = ?`,
        [userId]
      );
      
      if (!users || users.length === 0) {
        throw new NotFoundError(`User with ID ${userId} not found`);
      }
      
      userData = users[0];
    } catch (dbError) {
      console.error('Database error when fetching user:', dbError);
      throw new Error('Failed to retrieve user data');
    }

    // Critical check - ensure we have user data before proceeding
    if (!userData) {
      throw new NotFoundError('Unable to retrieve user data');
    }
    
    // Fetch profile data with error handling
    let profileData = {};
    try {
      const [profiles] = await pool.query(
        'SELECT * FROM user_profiles WHERE user_id = ?',
        [userData.id]
      );
      
      if (profiles && profiles.length > 0) {
        profileData = profiles[0];
      }
    } catch (dbError) {
      console.error('Error fetching profile data:', dbError);
      // Continue without profile data rather than failing completely
    }
    
    // Build response with safe property access
    const response = {
      user: {
        id: userData.id,
        email: userData.username || null,
        status: userData.status || null,
        user_type: userData.user_type || null
      },
      profile: {
        first_name: profileData.first_name || null,
        last_name: profileData.last_name || null,
        display_name: profileData.display_name || null,
        phone: profileData.phone || null,
        website: profileData.website || null,
        address_line1: profileData.address_line1 || null,
        address_line2: profileData.address_line2 || null,
        city: profileData.city || null,
        state: profileData.state || null,
        postal_code: profileData.postal_code || null,
        country: profileData.country || null,
        social_facebook: profileData.social_facebook || null,
        social_instagram: profileData.social_instagram || null,
        social_tiktok: profileData.social_tiktok || null,
        social_twitter: profileData.social_twitter || null,
        social_pinterest: profileData.social_pinterest || null,
        social_whatsapp: profileData.social_whatsapp || null,
        birth_date: profileData.birth_date || null,
        gender: profileData.gender || null,
        nationality: profileData.nationality || null,
        languages_known: profileData.languages_known || null,
        job_title: profileData.job_title || null,
        bio: profileData.bio || null,
        education: profileData.education || null,
        awards: profileData.awards || null,
        memberships: profileData.memberships || null,
        timezone: profileData.timezone || null,
        preferred_currency: profileData.preferred_currency || null,
        profile_visibility: profileData.profile_visibility || null
      }
    };

    // Only attempt to fetch type-specific profile if user has a type
    if (userData && userData.user_type) {
      try {
        let typeProfile = null;
        
        switch (userData.user_type) {
          case 'artist':
            const [artistProfiles] = await pool.query(
              'SELECT * FROM artist_profiles WHERE user_id = ?',
              [userData.id]
            );
            if (artistProfiles && artistProfiles.length > 0) {
              const artistProfile = artistProfiles[0];
              typeProfile = {
                art_categories: artistProfile.art_categories || null,
                art_mediums: artistProfile.art_mediums || null,
                business_name: artistProfile.business_name || null,
                studio_address_line1: artistProfile.studio_address_line1 || null,
                studio_address_line2: artistProfile.studio_address_line2 || null,
                studio_city: artistProfile.studio_city || null,
                studio_state: artistProfile.studio_state || null,
                studio_zip: artistProfile.studio_zip || null,
                artist_biography: artistProfile.artist_biography || null,
                business_phone: artistProfile.business_phone || null,
                business_website: artistProfile.business_website || null,
                business_social_facebook: artistProfile.business_social_facebook || null,
                business_social_instagram: artistProfile.business_social_instagram || null,
                business_social_tiktok: artistProfile.business_social_tiktok || null,
                business_social_twitter: artistProfile.business_social_twitter || null,
                business_social_pinterest: artistProfile.business_social_pinterest || null,
                does_custom: artistProfile.does_custom || null,
                customer_service_email: artistProfile.customer_service_email || null
              };
            }
            break;

          case 'promoter':
            const [promoterProfiles] = await pool.query(
              'SELECT * FROM promoter_profiles WHERE user_id = ?',
              [userData.id]
            );
            if (promoterProfiles && promoterProfiles.length > 0) {
              const promoterProfile = promoterProfiles[0];
              typeProfile = {
                business_name: promoterProfile.business_name || null,
                artwork_description: promoterProfile.artwork_description || null,
                office_address_line1: promoterProfile.office_address_line1 || null,
                office_address_line2: promoterProfile.office_address_line2 || null,
                office_city: promoterProfile.office_city || null,
                office_state: promoterProfile.office_state || null,
                office_zip: promoterProfile.office_zip || null,
                business_phone: promoterProfile.business_phone || null,
                business_website: promoterProfile.business_website || null,
                business_social_facebook: promoterProfile.business_social_facebook || null,
                business_social_instagram: promoterProfile.business_social_instagram || null,
                business_social_tiktok: promoterProfile.business_social_tiktok || null,
                business_social_twitter: promoterProfile.business_social_twitter || null,
                business_social_pinterest: promoterProfile.business_social_pinterest || null,
                is_non_profit: promoterProfile.is_non_profit || null
              };
            }
            break;

          case 'community':
            const [communityProfiles] = await pool.query(
              'SELECT * FROM community_profiles WHERE user_id = ?',
              [userData.id]
            );
            if (communityProfiles && communityProfiles.length > 0) {
              const communityProfile = communityProfiles[0];
              typeProfile = {
                art_style_preferences: communityProfile.art_style_preferences || null,
                favorite_colors: communityProfile.favorite_colors || null
              };
            }
            break;
        }

        // Add type-specific profile to response if it exists
        if (typeProfile) {
          response[`${userData.user_type}_profile`] = typeProfile;
        }
      } catch (typeProfileError) {
        console.error('Error fetching type-specific profile:', typeProfileError);
        // Continue without type-specific profile rather than failing
      }
    }
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

module.exports = router; 