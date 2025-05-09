const express = require('express');
const router = express.Router();
const crypto = require('crypto');

let db;

// Initialize function that sets up the database connection
const initialize = (database) => {
  db = database;
  return router;
};

/**
 * Routes for handling user registration processes.
 * 
 * These endpoints manage the multi-step registration process using draft registrations
 * stored in the saved_registrations table.
 */

/**
 * Test endpoint to verify the registration routes are working
 */
router.get('/test', (req, res) => {
  res.json({ message: 'Registration system operational' });
});

/**
 * Create a new registration draft
 * 
 * This endpoint creates a new draft registration entry in the database,
 * generating a unique token for future updates.
 */
router.post('/create-draft', async (req, res) => {
  console.log('CREATE DRAFT: New registration started');
  console.log('CREATE DRAFT: Request body:', JSON.stringify(req.body, null, 2));
  
  const { user_type, id, signupMethod, data = {} } = req.body;

  try {
    // Parse data if it's a string
    let parsedData = {};
    if (typeof data === 'string') {
      try {
        parsedData = JSON.parse(data);
        console.log('CREATE DRAFT: Parsed data from string:', parsedData);
      } catch (e) {
        console.error('CREATE DRAFT: Error parsing data string:', e);
        // If parsing fails, use the data as is
        parsedData = { rawData: data };
      }
    } else {
      // Already an object
      parsedData = data;
    }
    
    // Generate a secure random token for this registration draft
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set initial step based on signup method
    const currentStep = signupMethod === 'google' ? 2 : 1;
    
    // Create initial registration data structure
    const registrationData = {
      user_type,  // Can be null initially
      google_uid: id,
      email: parsedData.email || null,
      signupMethod,
      currentStep,
      completedSteps: signupMethod === 'google' ? ['account'] : [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('CREATE DRAFT: Registration data to save:', JSON.stringify(registrationData, null, 2));
    
    // Set expiration time - 24 hours from now
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Save to database
    await db.query(
      'INSERT INTO saved_registrations (token, data, expires_at) VALUES (?, ?, ?)',
      [token, JSON.stringify(registrationData), expiresAt]
    );

    console.log('CREATE DRAFT: Registration draft created with token:', token);
    
    // Return success with token and redirect info
    res.json({ 
      success: true, 
      token, 
      redirect: signupMethod === 'google' ? '/register/user-type' : '/register'
    });
  } catch (error) {
    console.error('CREATE DRAFT ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create registration draft', 
      details: error.message 
    });
  }
});

/**
 * Update an existing registration draft
 * 
 * This endpoint updates a registration draft with new information
 * as the user progresses through the registration steps.
 */
router.post('/update-draft/:token', async (req, res) => {
  const { token } = req.params;
  const updates = req.body;
  
  console.log('UPDATE DRAFT: Updating registration data for token:', token);
  console.log('UPDATE DRAFT: Request body:', JSON.stringify(updates, null, 2));
  
  try {
    // Verify the token exists
    const [existingDrafts] = await db.query(
      'SELECT * FROM saved_registrations WHERE token = ?', 
      [token]
    );
    
    if (existingDrafts.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Registration draft not found' 
      });
    }
    
    // Get existing data
    let existingData;
    try {
      existingData = JSON.parse(existingDrafts[0].data);
      console.log('UPDATE DRAFT: Existing data before merge:', JSON.stringify(existingData, null, 2));
    } catch (error) {
      console.error('UPDATE DRAFT: Error parsing existing data:', error);
      existingData = {};
    }
    
    // --- Merge Update Logic --- 
    // The incoming 'updates' should be an object like { fieldId: value }
    // Merge this directly into the existing data.
    const mergedData = { 
      ...existingData, 
      ...updates, // Directly merge the incoming field update
      updated_at: new Date().toISOString() // Update timestamp
    };

    // Ensure user_type is handled at the root if present in the update
    if (updates.user_type !== undefined) {
      mergedData.user_type = updates.user_type;
    }
    
    // Remove sensitive information (like password, if ever included in drafts)
    if (mergedData.password) delete mergedData.password;
    
    console.log('UPDATE DRAFT: Final merged data to save:', JSON.stringify(mergedData, null, 2));
    
    // Update expiration time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Save updated data to database
    await db.query(
      'UPDATE saved_registrations SET data = ?, expires_at = ? WHERE token = ?',
      [JSON.stringify(mergedData), expiresAt, token]
    );
    
    console.log('UPDATE DRAFT: Registration draft updated successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('UPDATE DRAFT ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update registration draft', 
      details: error.message 
    });
  }
});

/**
 * Get a registration draft by token
 * 
 * This endpoint retrieves the current state of a registration draft,
 * allowing the front-end to display the appropriate step with existing data.
 */
router.get('/get-draft/:token', async (req, res) => {
  const { token } = req.params;
  
  console.log('GET DRAFT: Retrieving registration data for token:', token);
  
  try {
    // Fetch the draft from database
    const [drafts] = await db.query(
      'SELECT * FROM saved_registrations WHERE token = ?', 
      [token]
    );
    
    if (drafts.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Registration draft not found' 
      });
    }
    
    // Parse and sanitize data
    let registrationData;
    try {
      registrationData = JSON.parse(drafts[0].data);
      
      // Remove sensitive information
      if (registrationData.password) delete registrationData.password;
      if (registrationData.account?.password) delete registrationData.account.password;
      
      console.log('GET DRAFT: Registration data:', JSON.stringify(registrationData, null, 2));
      console.log('GET DRAFT: User type:', registrationData.user_type);
    } catch (error) {
      console.error('GET DRAFT: Error parsing registration data:', error);
      registrationData = {};
    }
    
    res.json({ success: true, registrationData });
  } catch (error) {
    console.error('GET DRAFT ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve registration draft', 
      details: error.message 
    });
  }
});

/**
 * Get drafts by email address
 * 
 * This endpoint allows finding registration drafts associated with an email,
 * useful for resuming registration from login page.
 */
router.get('/drafts-by-email/:email', async (req, res) => {
  const { email } = req.params;
  
  console.log('GET DRAFTS BY EMAIL: Looking for drafts with email:', email);
  
  try {
    // Get all drafts
    const [allDrafts] = await db.query('SELECT * FROM saved_registrations');
    
    // Filter those matching the email
    const matchingDrafts = allDrafts.filter(draft => {
      try {
        const data = JSON.parse(draft.data);
        return data.email === email;
      } catch (e) {
        return false;
      }
    });
    
    // Format the response
    const drafts = matchingDrafts.map(draft => {
      const data = JSON.parse(draft.data);
      return {
        id: draft.id,
        token: draft.token,
        email: data.email,
        created_at: draft.created_at,
        expires_at: draft.expires_at
      };
    });
    
    console.log('GET DRAFTS BY EMAIL: Found', drafts.length, 'matching drafts');
    res.json({ success: true, drafts });
  } catch (error) {
    console.error('GET DRAFTS BY EMAIL ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to find registration drafts', 
      details: error.message 
    });
  }
});

/**
 * Cancel a registration draft
 * 
 * This endpoint deletes a registration draft when the user cancels registration.
 */
router.delete('/cancel/:token', async (req, res) => {
  const { token } = req.params;
  
  console.log('CANCEL DRAFT: Cancelling registration with token:', token);
  
  try {
    // Delete the draft
    await db.query('DELETE FROM saved_registrations WHERE token = ?', [token]);
    
    console.log('CANCEL DRAFT: Registration draft cancelled successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('CANCEL DRAFT ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to cancel registration', 
      details: error.message 
    });
  }
});

/**
 * Complete registration
 * 
 * This endpoint finalizes the registration process, creating a permanent user
 * record and removing the draft.
 */
router.post('/complete/:token', async (req, res) => {
  const { token } = req.params;
  
  console.log('COMPLETE REGISTRATION: Completing registration with token:', token);
  
  let connection; // Define connection outside try block for visibility in finally
  try {
    // Get the draft
    const [drafts] = await db.query(
      'SELECT * FROM saved_registrations WHERE token = ?', 
      [token]
    );
    
    if (drafts.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Registration draft not found' 
      });
    }
    
    // Parse the draft data
    const draftData = JSON.parse(drafts[0].data);
    console.log('COMPLETE REGISTRATION: Draft data:', JSON.stringify(draftData, null, 2));

    // --- Start Transaction ---
    connection = await db.getConnection();
    await connection.beginTransaction();
    console.log('COMPLETE REGISTRATION: Transaction started');

    // 1. Create the user
    const [userResult] = await connection.query(
      'INSERT INTO users (username, email_verified, google_uid, user_type, status) VALUES (?, ?, ?, ?, ?)',
      [
        draftData.email,
        draftData.email_verified || 'no',
        draftData.google_uid,
        draftData.user_type, // Ensure this is collected and present
        'active' // Set status to active upon completion
      ]
    );
    const newUserId = userResult.insertId;
    console.log('COMPLETE REGISTRATION: User created with ID:', newUserId);

    if (!newUserId) {
      throw new Error('Failed to create user, insertId not returned.');
    }

    // 2. Create the user profile
    const profileData = {
      user_id: newUserId,
      first_name: draftData.firstName || null,
      last_name: draftData.lastName || null,
      phone: draftData.phone || null,
      address_line1: draftData.address_line1 || null,
      address_line2: draftData.address_line2 || null,
      city: draftData.city || null,
      state: draftData.state || null,
      postal_code: draftData.postal_code || null,
      country: draftData.country || null,
      profile_image_path: draftData.profile_image_path || null,
      header_image_path: draftData.header_image_path || null,
      display_name: draftData.displayName || null,
      website: draftData.website || null,
      social_facebook: draftData.social_facebook || null,
      social_instagram: draftData.social_instagram || null,
      social_tiktok: draftData.social_tiktok || null,
      social_twitter: draftData.social_twitter || null,
      social_pinterest: draftData.social_pinterest || null,
      social_whatsapp: draftData.social_whatsapp || null,
      birth_date: draftData.birth_date || null,
      gender: draftData.gender || null,
      nationality: draftData.nationality || null,
      languages_known: draftData.languages_known ? JSON.stringify(draftData.languages_known) : null,
      job_title: draftData.job_title || null,
      bio: draftData.bio || null,
      education: draftData.education ? JSON.stringify(draftData.education) : null,
      awards: draftData.awards ? JSON.stringify(draftData.awards) : null,
      memberships: draftData.memberships ? JSON.stringify(draftData.memberships) : null,
      follows: draftData.follows ? JSON.stringify(draftData.follows) : null,
      timezone: draftData.timezone || null,
      preferred_currency: draftData.preferred_currency || null,
      profile_visibility: draftData.profile_visibility || 'public',
    };

    console.log('COMPLETE REGISTRATION: Profile data to insert:', JSON.stringify(profileData, null, 2));
    await connection.query(
      'INSERT INTO user_profiles SET ?', 
      profileData
    );
    console.log('COMPLETE REGISTRATION: User profile created');

    // 3. Create the type-specific profile (if applicable)
    const userType = draftData.user_type;
    console.log('COMPLETE REGISTRATION: User type is:', userType);

    if (userType === 'artist') {
      const artistProfileData = {
        user_id: newUserId,
        art_categories: draftData.art_categories ? JSON.stringify(draftData.art_categories) : null, // Expecting arrays/objects
        art_mediums: draftData.art_mediums ? JSON.stringify(draftData.art_mediums) : null,
        business_name: draftData.artist_business_name || null,
        studio_address_line1: draftData.studio_address_line1 || null,
        studio_address_line2: draftData.studio_address_line2 || null,
        studio_city: draftData.studio_city || null,
        studio_state: draftData.studio_state || null,
        studio_zip: draftData.studio_zip || null,
        artist_biography: draftData.artist_biography || null,
        business_phone: draftData.artist_business_phone || null,
        business_website: draftData.artist_business_website || null,
        business_social_facebook: draftData.artist_social_facebook || null,
        business_social_instagram: draftData.artist_social_instagram || null,
        business_social_tiktok: draftData.artist_social_tiktok || null,
        business_social_twitter: draftData.artist_social_twitter || null,
        business_social_pinterest: draftData.artist_social_pinterest || null,
        does_custom: draftData.does_custom || 'no',
        customer_service_email: draftData.customer_service_email || draftData.email
      };
      console.log('COMPLETE REGISTRATION: Artist profile data:', JSON.stringify(artistProfileData, null, 2));
      await connection.query('INSERT INTO artist_profiles SET ?', artistProfileData);
      console.log('COMPLETE REGISTRATION: Artist profile created');

    } else if (userType === 'community') {
      const communityProfileData = {
        user_id: newUserId,
        art_style_preferences: draftData.art_style_preferences ? JSON.stringify(draftData.art_style_preferences) : null,
        favorite_colors: draftData.favorite_colors ? JSON.stringify(draftData.favorite_colors) : null,
      };
      console.log('COMPLETE REGISTRATION: Community profile data:', JSON.stringify(communityProfileData, null, 2));
      await connection.query('INSERT INTO community_profiles SET ?', communityProfileData);
      console.log('COMPLETE REGISTRATION: Community profile created');

    } else if (userType === 'promoter') {
      const promoterProfileData = {
        user_id: newUserId,
        business_name: draftData.promoter_business_name || null,
        business_phone: draftData.promoter_business_phone || null,
        business_website: draftData.promoter_business_website || null,
        business_social_facebook: draftData.promoter_social_facebook || null,
        business_social_instagram: draftData.promoter_social_instagram || null,
        business_social_tiktok: draftData.promoter_social_tiktok || null,
        business_social_twitter: draftData.promoter_social_twitter || null,
        business_social_pinterest: draftData.promoter_social_pinterest || null,
        office_address_line1: draftData.office_address_line1 || null,
        office_address_line2: draftData.office_address_line2 || null,
        office_city: draftData.office_city || null,
        office_state: draftData.office_state || null,
        office_zip: draftData.office_zip || null,
        is_non_profit: draftData.is_non_profit || 'no',
        artwork_description: draftData.artwork_description || null,
      };
      console.log('COMPLETE REGISTRATION: Promoter profile data:', JSON.stringify(promoterProfileData, null, 2));
      await connection.query('INSERT INTO promoter_profiles SET ?', promoterProfileData);
      console.log('COMPLETE REGISTRATION: Promoter profile created');
    }

    // 4. Update the user checklist
    const [existingChecklist] = await connection.query(
      'SELECT * FROM user_checklist WHERE user_id = ?',
      [draftData.google_uid] // Use google_uid as user_id for checklist initially
    );

    const now = new Date();
    if (existingChecklist.length > 0) {
       await connection.query(
        'UPDATE user_checklist SET user_id_final = ?, registration = ?, registration_updated_at = ?, profile_complete = ?, profile_complete_updated_at = ? WHERE user_id = ?',
        [newUserId, true, now, true, now, draftData.google_uid] 
      );
      console.log('COMPLETE REGISTRATION: User checklist updated');
    } else {
       await connection.query(
        'INSERT INTO user_checklist (user_id, user_id_final, is_user, registration, terms_accepted, profile_complete, email_verified, registration_updated_at, profile_complete_updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [draftData.google_uid, newUserId, true, true, false, true, draftData.email_verified === 'yes', now, now]
      );
      console.log('COMPLETE REGISTRATION: User checklist created');
    }

    // 5. Delete the draft
    await connection.query('DELETE FROM saved_registrations WHERE token = ?', [token]);
    console.log('COMPLETE REGISTRATION: Registration draft deleted');
    
    // --- Commit Transaction ---
    await connection.commit();
    console.log('COMPLETE REGISTRATION: Transaction committed');
    
    console.log('COMPLETE REGISTRATION: Registration completed successfully for user ID:', newUserId);
    res.json({ success: true, userId: newUserId });

  } catch (error) {
    console.error('COMPLETE REGISTRATION ERROR:', error);
    if (connection) {
      console.log('COMPLETE REGISTRATION: Rolling back transaction due to error');
      await connection.rollback();
    }
    res.status(500).json({ 
      success: false, 
      error: 'Failed to complete registration', 
      details: error.message 
    });
  } finally {
      if (connection) {
        console.log('COMPLETE REGISTRATION: Releasing database connection');
        connection.release();
      }
  }
});

/**
 * Check if a user has completed registration
 * 
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} Object containing registration status
 */
async function checkRegistrationStatus(userId) {
  try {
    // Check if user exists in users table
    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return {
        isRegistered: false,
        status: 'not_found'
      };
    }

    const user = users[0];
    
    // Check if user has completed all registration requirements
    if (user.status === 'active' && user.user_type && user.email_verified) {
      return {
        isRegistered: true,
        status: 'complete',
        user: {
          id: user.id,
          username: user.username,
          user_type: user.user_type,
          email_verified: user.email_verified
        }
      };
    }

    // User exists but registration is incomplete
    return {
      isRegistered: false,
      status: 'incomplete',
      details: {
        status: user.status,
        hasUserType: !!user.user_type,
        emailVerified: !!user.email_verified
      }
    };
  } catch (error) {
    console.error('Error checking registration status:', error);
    throw error;
  }
}

/**
 * Check registration status endpoint
 */
router.post('/check-status', async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ 
      success: false, 
      error: 'User ID is required' 
    });
  }
  
  try {
    const status = await checkRegistrationStatus(userId);
    res.json(status);
  } catch (error) {
    console.error('Error checking registration status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to check registration status' 
    });
  }
});

// Export the function
module.exports = {
  initialize,
  checkRegistrationStatus
};