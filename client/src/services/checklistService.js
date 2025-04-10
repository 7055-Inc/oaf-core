/**
 * Checklist Service
 * Handles checklist item management for user requirements
 */
import { apiFetch } from './api';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if user exists or create new user
 * @param {string} userId - The user's ID
 * @param {string} idToken - Firebase ID token for authentication
 * @returns {Promise<Object>} - Promise resolving to user status object
 */
export const checkOrCreateUser = async (userId, idToken) => {
  let retries = 0;
  let lastError = null;

  while (retries < MAX_RETRIES) {
    try {
      const response = await apiFetch(`v1/users/${userId}/check-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 503 && retries < MAX_RETRIES - 1) {
          console.log(`Service unavailable, retrying in ${RETRY_DELAY}ms... (attempt ${retries + 1}/${MAX_RETRIES})`);
          await delay(RETRY_DELAY);
          retries++;
          continue;
        }
        throw new Error(`Failed to check/create user: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (retries < MAX_RETRIES - 1) {
        console.log(`Error checking/creating user, retrying in ${RETRY_DELAY}ms... (attempt ${retries + 1}/${MAX_RETRIES})`);
        await delay(RETRY_DELAY);
        retries++;
      } else {
        console.error('Error checking/creating user after all retries:', error);
        throw error;
      }
    }
  }

  throw lastError;
};

/**
 * Fetch the user's checklist status
 * @param {string} userId - The user's ID
 * @param {string} idToken - Firebase ID token for authentication
 * @returns {Promise<Object>} - Promise resolving to checklist status object
 */
export const fetchChecklistStatus = async (userId, idToken) => {
  try {
    const response = await apiFetch(`v1/users/${userId}/checklist`, {
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch checklist: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching checklist status:', error);
    throw error;
  }
};

/**
 * Update a checklist item status
 * @param {string} userId - The user's ID
 * @param {string} itemKey - The checklist item key
 * @param {boolean} completed - The new status
 * @param {string} idToken - Firebase ID token for authentication
 * @returns {Promise<Object>} - Promise resolving to updated checklist
 */
export const updateChecklistItem = async (userId, itemKey, completed, idToken) => {
  try {
    const response = await apiFetch(`v1/users/${userId}/checklist/${itemKey}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ completed })
    });

    if (!response.ok) {
      throw new Error(`Failed to update checklist item: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating checklist item:', error);
    throw error;
  }
};

/**
 * Reset all checklist items to incomplete
 * @param {string} userId - The user's ID
 * @param {string} idToken - Firebase ID token for authentication
 * @returns {Promise<Object>} - Promise resolving to reset checklist
 */
export const resetChecklist = async (userId, idToken) => {
  try {
    const response = await apiFetch(`v1/users/${userId}/checklist/reset`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to reset checklist: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error resetting checklist:', error);
    throw error;
  }
};

/**
 * Check if all checklist items are completed
 * @param {Object} checklist - The checklist object
 * @returns {boolean} - True if all items are completed
 */
export const isChecklistComplete = (checklist) => {
  if (!checklist || Object.keys(checklist).length === 0) {
    // If no checklist exists, return false to trigger the checklist flow
    return false;
  }
  
  // Define the required checklist items
  const requiredItems = [
    'is_user',
    'registration',
    'terms_accepted',
    'profile_complete',
    'email_verified'
  ];
  
  // Check if all required items exist and are completed
  for (const key of requiredItems) {
    if (!checklist[key] || !checklist[key].completed) {
      return false;
    }
  }
  
  return true;
};

/**
 * Get the next incomplete item in the checklist
 * @param {Object} checklist - The checklist object
 * @returns {string|null} - Key of the next incomplete item or null if all complete
 */
export const getNextIncompleteItem = (checklist) => {
  if (!checklist || Object.keys(checklist).length === 0) {
    // If checklist doesn't exist, return the first item
    return 'is_user';
  }
  
  // Define the order of checklist items
  const itemOrder = [
    'is_user',
    'registration',
    'terms_accepted',
    'profile_complete',
    'email_verified'
  ];
  
  // Find the first incomplete item in the defined order
  for (const key of itemOrder) {
    if (checklist[key] && !checklist[key].completed) {
      return key;
    }
  }
  
  return null;
};

/**
 * Get the redirect URL for a checklist item
 * @param {string} itemKey - The checklist item key
 * @returns {string} - The URL to redirect to for this item
 */
export const getRedirectForItem = (itemKey) => {
  const redirectMap = {
    'is_user': '/check-user',
    'registration': '/complete-registration',
    'terms_accepted': '/terms-acceptance',
    'profile_complete': '/complete-profile',
    'email_verified': '/verify-email'
  };
  
  return redirectMap[itemKey] || '/dashboard';
}; 