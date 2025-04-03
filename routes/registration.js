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
    
    // Make a copy of existing data to merge with updates
    const mergedData = { ...existingData };
    
    // Update the timestamp
    mergedData.updated_at = new Date().toISOString();
    
    // CRITICAL FIX: Handle user_type at the root level
    if (updates.user_type !== undefined) {
      console.log('UPDATE DRAFT: Setting user_type to:', updates.user_type);
      mergedData.user_type = updates.user_type;
    }
    
    // Handle completedSteps if provided
    if (updates.completedSteps) {
      mergedData.completedSteps = updates.completedSteps;
    }
    
    // Handle step data for various sections
    if (updates.account) mergedData.account = updates.account;
    if (updates.basicProfile) mergedData.basicProfile = updates.basicProfile;
    if (updates.specificProfile) mergedData.specificProfile = updates.specificProfile;
    if (updates.photos) mergedData.photos = updates.photos;
    if (updates.finalDetails) mergedData.finalDetails = updates.finalDetails;
    
    // Remove sensitive information
    if (mergedData.password) delete mergedData.password;
    if (mergedData.account?.password) delete mergedData.account.password;
    
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
    
    // Create the user
    await db.query(
      'INSERT INTO users (username, google_uid, user_type, status) VALUES (?, ?, ?, "active")',
      [draftData.email, draftData.google_uid, draftData.user_type]
    );
    
    // Delete the draft after successful user creation
    await db.query('DELETE FROM saved_registrations WHERE token = ?', [token]);
    
    console.log('COMPLETE REGISTRATION: Registration completed successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('COMPLETE REGISTRATION ERROR:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to complete registration', 
      details: error.message 
    });
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