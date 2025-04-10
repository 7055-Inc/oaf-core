/**
 * Authentication Service
 * Handles communication with backend for user data
 */

/**
 * Gets the current user session data
 * @param {string} idToken - Firebase ID token for authentication
 * @returns {Promise} Promise resolving to the session data
 */
export const getSession = async (idToken) => {
  try {
    const response = await fetch('/v1/auth/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ idToken })
    });

    if (!response.ok) {
      throw new Error(`Failed to get session: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Session Data:', data);
    return data;
  } catch (error) {
    console.error('Error getting session:', error);
    throw error;
  }
};

/**
 * Saves user data to the backend database after authentication
 * @param {Object} userData - The user data to save
 * @param {string} idToken - Firebase ID token for authentication
 * @returns {Promise} Promise resolving to the server response
 */
export const saveUserToDatabase = async (userData, idToken) => {
  try {
    const response = await fetch('/v1/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify(userData)
    });

    if (!response.ok) {
      throw new Error(`Failed to save user data: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving user to database:', error);
    throw error;
  }
};

/**
 * Gets user profile data from the backend
 * @param {string} uid - User ID
 * @param {string} idToken - Firebase ID token for authentication
 * @returns {Promise} Promise resolving to the user profile data
 */
export const getUserProfile = async (uid, idToken) => {
  try {
    const response = await fetch(`/v1/users/${uid}`, {
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user profile: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
}; 