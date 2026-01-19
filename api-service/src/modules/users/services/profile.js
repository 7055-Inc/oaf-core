/**
 * Profile Service
 * Handles user profile operations for all user types
 */

const db = require('../../../../config/db');
const { enhanceUserProfileWithMedia } = require('../../../utils/mediaUtils');

/**
 * Get full profile for a user (includes type-specific profile data)
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} Full profile or null
 */
async function getFullProfile(userId) {
  // Get base user and profile
  const [users] = await db.query(
    `SELECT u.id, u.username, u.email_verified, u.status, u.user_type, up.* 
     FROM users u 
     LEFT JOIN user_profiles up ON u.id = up.user_id 
     WHERE u.id = ?`,
    [userId]
  );
  
  if (!users[0]) {
    return null;
  }
  
  const userData = users[0];
  
  // Get type-specific profile
  if (userData.user_type === 'artist') {
    const [artistProfile] = await db.query(
      'SELECT * FROM artist_profiles WHERE user_id = ?',
      [userId]
    );
    if (artistProfile[0]) {
      Object.assign(userData, artistProfile[0]);
    }
  } else if (userData.user_type === 'community') {
    const [communityProfile] = await db.query(
      'SELECT * FROM community_profiles WHERE user_id = ?',
      [userId]
    );
    if (communityProfile[0]) {
      Object.assign(userData, communityProfile[0]);
    }
  } else if (userData.user_type === 'promoter') {
    const [promoterProfile] = await db.query(
      'SELECT * FROM promoter_profiles WHERE user_id = ?',
      [userId]
    );
    if (promoterProfile[0]) {
      Object.assign(userData, promoterProfile[0]);
    }
  } else if (userData.user_type === 'admin') {
    // Admins get all profile types
    const [artistProfile] = await db.query(
      'SELECT * FROM artist_profiles WHERE user_id = ?',
      [userId]
    );
    if (artistProfile[0]) {
      Object.assign(userData, artistProfile[0]);
    }
    
    const [communityProfile] = await db.query(
      'SELECT * FROM community_profiles WHERE user_id = ?',
      [userId]
    );
    if (communityProfile[0]) {
      Object.assign(userData, communityProfile[0]);
    }
    
    const [promoterProfile] = await db.query(
      'SELECT * FROM promoter_profiles WHERE user_id = ?',
      [userId]
    );
    if (promoterProfile[0]) {
      Object.assign(userData, promoterProfile[0]);
    }
  }
  
  // Get marketplace application if exists
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
    [userId]
  );
  
  if (marketplaceApp[0]) {
    userData.marketplace_application = marketplaceApp[0];
  }
  
  // Get user addons
  const [userAddons] = await db.query(
    `SELECT ua.*, wa.addon_name, wa.description, wa.monthly_price, wa.category 
     FROM user_addons ua 
     JOIN website_addons wa ON ua.addon_slug = wa.addon_slug 
     WHERE ua.user_id = ? AND ua.is_active = 1`,
    [userId]
  );
  
  userData.addons = userAddons || [];
  userData.addon_slugs = userAddons ? userAddons.map(a => a.addon_slug) : [];
  
  // Enhance with media URLs
  return enhanceUserProfileWithMedia(userData);
}

/**
 * Get public profile (limited fields for non-owners)
 * @param {number} userId - User ID
 * @returns {Promise<Object|null>} Public profile or null
 */
async function getPublicProfile(userId) {
  const [users] = await db.query(
    `SELECT 
      u.id, u.username, u.user_type, u.status,
      up.display_name, up.bio, up.profile_image_path, up.header_image_path,
      up.city, up.state, up.country,
      up.website, up.social_facebook, up.social_instagram, up.social_tiktok,
      up.social_twitter, up.social_pinterest
    FROM users u 
    LEFT JOIN user_profiles up ON u.id = up.user_id 
    WHERE u.id = ? AND u.status = 'active'`,
    [userId]
  );
  
  if (!users[0]) {
    return null;
  }
  
  const userData = users[0];
  
  // Add artist-specific public data
  if (userData.user_type === 'artist') {
    const [artistProfile] = await db.query(
      `SELECT artist_biography, art_categories, art_mediums, does_custom, business_name
       FROM artist_profiles WHERE user_id = ?`,
      [userId]
    );
    if (artistProfile[0]) {
      Object.assign(userData, artistProfile[0]);
    }
  }
  
  return enhanceUserProfileWithMedia(userData);
}

/**
 * Update base profile (user_profiles table)
 * @param {number} userId - User ID
 * @param {Object} profileData - Profile fields to update
 * @returns {Promise<boolean>} Success
 */
async function updateBaseProfile(userId, profileData) {
  const {
    first_name, last_name, display_name, phone, address_line1, address_line2,
    city, state, postal_code, country, bio, website, birth_date, gender,
    nationality, languages_known, job_title, education, awards, memberships,
    timezone, social_facebook, social_instagram, social_tiktok, social_twitter,
    social_pinterest, social_whatsapp
  } = profileData;
  
  // Ensure record exists
  await db.query(
    'INSERT INTO user_profiles (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = user_id',
    [userId]
  );
  
  // Process JSON fields
  const processedLanguagesKnown = languages_known ? 
    (typeof languages_known === 'string' ? languages_known : JSON.stringify(languages_known)) : null;
  const processedEducation = education ? 
    (typeof education === 'string' ? education : JSON.stringify(education)) : null;
  
  const [result] = await db.query(
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
      job_title || null, processedEducation, awards || null, memberships || null,
      timezone || null, social_facebook || null, social_instagram || null,
      social_tiktok || null, social_twitter || null, social_pinterest || null,
      social_whatsapp || null, userId
    ]
  );
  
  return result.affectedRows > 0;
}

/**
 * Update artist profile (artist_profiles table)
 * @param {number} userId - User ID
 * @param {Object} profileData - Artist profile fields
 * @returns {Promise<boolean>} Success
 */
async function updateArtistProfile(userId, profileData) {
  const {
    artist_biography, art_categories, art_mediums, does_custom, custom_details,
    business_name, legal_name, tax_id, customer_service_email,
    studio_address_line1, studio_address_line2, studio_city, studio_state, studio_zip,
    business_website, business_phone, business_social_facebook, business_social_instagram,
    business_social_tiktok, business_social_twitter, business_social_pinterest, founding_date
  } = profileData;
  
  // Process JSON fields
  const processedArtCategories = art_categories ? 
    (typeof art_categories === 'string' ? art_categories : JSON.stringify(art_categories)) : null;
  const processedArtMediums = art_mediums ? 
    (typeof art_mediums === 'string' ? art_mediums : JSON.stringify(art_mediums)) : null;
  
  const [result] = await db.query(
    `INSERT INTO artist_profiles (
      user_id, artist_biography, art_categories, art_mediums, does_custom, custom_details,
      business_name, legal_name, tax_id, customer_service_email,
      studio_address_line1, studio_address_line2, studio_city, studio_state, studio_zip,
      business_website, business_phone, business_social_facebook, business_social_instagram,
      business_social_tiktok, business_social_twitter, business_social_pinterest, founding_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      founding_date = VALUES(founding_date)`,
    [
      userId, artist_biography || null, processedArtCategories, processedArtMediums,
      does_custom || 'no', custom_details || null,
      business_name || null, legal_name || null, tax_id || null, customer_service_email || null,
      studio_address_line1 || null, studio_address_line2 || null, studio_city || null,
      studio_state || null, studio_zip || null, business_website || null, business_phone || null,
      business_social_facebook || null, business_social_instagram || null,
      business_social_tiktok || null, business_social_twitter || null,
      business_social_pinterest || null, founding_date || null
    ]
  );
  
  return result.affectedRows > 0;
}

/**
 * Update community profile (community_profiles table)
 * @param {number} userId - User ID
 * @param {Object} profileData - Community profile fields
 * @returns {Promise<boolean>} Success
 */
async function updateCommunityProfile(userId, profileData) {
  const { art_style_preferences, favorite_colors, art_interests, wishlist } = profileData;
  
  const processedArtStylePreferences = art_style_preferences ? 
    (typeof art_style_preferences === 'string' ? art_style_preferences : JSON.stringify(art_style_preferences)) : null;
  const processedFavoriteColors = favorite_colors ? 
    (typeof favorite_colors === 'string' ? favorite_colors : JSON.stringify(favorite_colors)) : null;
  const processedArtInterests = art_interests ? 
    (typeof art_interests === 'string' ? art_interests : JSON.stringify(art_interests)) : null;
  const processedWishlist = wishlist ? 
    (typeof wishlist === 'string' ? wishlist : JSON.stringify(wishlist)) : null;
  
  const [result] = await db.query(
    `INSERT INTO community_profiles (user_id, art_style_preferences, favorite_colors, art_interests, wishlist)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       art_style_preferences = VALUES(art_style_preferences),
       favorite_colors = VALUES(favorite_colors),
       art_interests = VALUES(art_interests),
       wishlist = VALUES(wishlist)`,
    [userId, processedArtStylePreferences, processedFavoriteColors, processedArtInterests, processedWishlist]
  );
  
  return result.affectedRows > 0;
}

/**
 * Update promoter profile (promoter_profiles table)
 * @param {number} userId - User ID
 * @param {Object} profileData - Promoter profile fields
 * @returns {Promise<boolean>} Success
 */
async function updatePromoterProfile(userId, profileData) {
  const {
    business_name, legal_name, tax_id, is_non_profit, organization_size,
    sponsorship_options, upcoming_events, office_address_line1, office_address_line2,
    office_city, office_state, office_zip, business_phone, business_website,
    business_social_facebook, business_social_instagram, business_social_tiktok,
    business_social_twitter, business_social_pinterest, founding_date
  } = profileData;
  
  const processedSponsorshipOptions = sponsorship_options ? 
    (typeof sponsorship_options === 'string' ? sponsorship_options : JSON.stringify(sponsorship_options)) : null;
  const processedUpcomingEvents = upcoming_events ? 
    (typeof upcoming_events === 'string' ? upcoming_events : JSON.stringify(upcoming_events)) : null;
  
  const [result] = await db.query(
    `INSERT INTO promoter_profiles (
      user_id, business_name, legal_name, tax_id, is_non_profit, organization_size,
      sponsorship_options, upcoming_events, office_address_line1, office_address_line2,
      office_city, office_state, office_zip, business_phone, business_website,
      business_social_facebook, business_social_instagram, business_social_tiktok,
      business_social_twitter, business_social_pinterest, founding_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      business_name = VALUES(business_name),
      legal_name = VALUES(legal_name),
      tax_id = VALUES(tax_id),
      is_non_profit = VALUES(is_non_profit),
      organization_size = VALUES(organization_size),
      sponsorship_options = VALUES(sponsorship_options),
      upcoming_events = VALUES(upcoming_events),
      office_address_line1 = VALUES(office_address_line1),
      office_address_line2 = VALUES(office_address_line2),
      office_city = VALUES(office_city),
      office_state = VALUES(office_state),
      office_zip = VALUES(office_zip),
      business_phone = VALUES(business_phone),
      business_website = VALUES(business_website),
      business_social_facebook = VALUES(business_social_facebook),
      business_social_instagram = VALUES(business_social_instagram),
      business_social_tiktok = VALUES(business_social_tiktok),
      business_social_twitter = VALUES(business_social_twitter),
      business_social_pinterest = VALUES(business_social_pinterest),
      founding_date = VALUES(founding_date)`,
    [
      userId, business_name || null, legal_name || null, tax_id || null,
      is_non_profit || 'no', organization_size || null, processedSponsorshipOptions,
      processedUpcomingEvents, office_address_line1 || null, office_address_line2 || null,
      office_city || null, office_state || null, office_zip || null,
      business_phone || null, business_website || null, business_social_facebook || null,
      business_social_instagram || null, business_social_tiktok || null,
      business_social_twitter || null, business_social_pinterest || null, founding_date || null
    ]
  );
  
  return result.affectedRows > 0;
}

/**
 * Update profile image
 * @param {number} userId - User ID
 * @param {string} imagePath - Image path
 * @returns {Promise<boolean>} Success
 */
async function updateProfileImage(userId, imagePath) {
  // Ensure profile exists
  await db.query(
    'INSERT INTO user_profiles (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = user_id',
    [userId]
  );
  
  const [result] = await db.query(
    'UPDATE user_profiles SET profile_image_path = ? WHERE user_id = ?',
    [imagePath, userId]
  );
  
  return result.affectedRows > 0;
}

/**
 * Update header image
 * @param {number} userId - User ID
 * @param {string} imagePath - Image path
 * @returns {Promise<boolean>} Success
 */
async function updateHeaderImage(userId, imagePath) {
  // Ensure profile exists
  await db.query(
    'INSERT INTO user_profiles (user_id) VALUES (?) ON DUPLICATE KEY UPDATE user_id = user_id',
    [userId]
  );
  
  const [result] = await db.query(
    'UPDATE user_profiles SET header_image_path = ? WHERE user_id = ?',
    [imagePath, userId]
  );
  
  return result.affectedRows > 0;
}

module.exports = {
  getFullProfile,
  getPublicProfile,
  updateBaseProfile,
  updateArtistProfile,
  updateCommunityProfile,
  updatePromoterProfile,
  updateProfileImage,
  updateHeaderImage,
};
