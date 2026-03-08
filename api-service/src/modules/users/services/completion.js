/**
 * Completion Service
 * Handles profile completion status checks
 */

const db = require('../../../../config/db');

/**
 * Required fields per user type
 */
const REQUIRED_FIELDS = {
  base: ['first_name', 'last_name'],
  artist: ['bio', 'profile_image_path'],
  community: ['bio'],
  promoter: ['bio', 'business_name'],
};

/**
 * Get profile completion status for a user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Completion status
 */
async function getStatus(userId) {
  // Get user data including profile
  const [users] = await db.query(`
    SELECT 
      u.id, u.user_type, u.status,
      up.first_name, up.last_name, up.bio, up.profile_image_path,
      ap.artist_biography,
      pp.business_name as promoter_business_name
    FROM users u
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN artist_profiles ap ON u.id = ap.user_id
    LEFT JOIN promoter_profiles pp ON u.id = pp.user_id
    WHERE u.id = ?
  `, [userId]);
  
  if (!users[0]) {
    throw new Error('User not found');
  }
  
  const userData = users[0];
  const missingFields = getMissingFields(userData);
  const isComplete = missingFields.length === 0;
  
  return {
    isComplete,
    requiresCompletion: !isComplete,
    missingFields,
    userType: userData.user_type,
    completionPercentage: calculatePercentage(userData),
  };
}

/**
 * Get list of missing required fields for a user
 * @param {Object} userData - User data object
 * @returns {Array<string>} Missing field names
 */
function getMissingFields(userData) {
  const missingFields = [];
  const userType = userData.user_type;
  
  // Check base required fields
  for (const field of REQUIRED_FIELDS.base) {
    if (!userData[field] || (typeof userData[field] === 'string' && !userData[field].trim())) {
      missingFields.push(field);
    }
  }
  
  // Check type-specific required fields
  const typeFields = REQUIRED_FIELDS[userType] || [];
  for (const field of typeFields) {
    // Handle special mappings
    let value;
    if (field === 'bio' && userType === 'artist') {
      // Artists can use either bio from user_profiles or artist_biography
      value = userData.bio || userData.artist_biography;
    } else if (field === 'business_name' && userType === 'promoter') {
      value = userData.promoter_business_name;
    } else {
      value = userData[field];
    }
    
    if (!value || (typeof value === 'string' && !value.trim())) {
      missingFields.push(field);
    }
  }
  
  return missingFields;
}

/**
 * Calculate profile completion percentage
 * @param {Object} userData - User data object
 * @returns {number} Completion percentage (0-100)
 */
function calculatePercentage(userData) {
  const userType = userData.user_type;
  
  // Get all required fields for this user type
  const requiredFields = [...REQUIRED_FIELDS.base, ...(REQUIRED_FIELDS[userType] || [])];
  
  if (requiredFields.length === 0) {
    return 100;
  }
  
  let completedCount = 0;
  
  for (const field of requiredFields) {
    let value;
    if (field === 'bio' && userType === 'artist') {
      value = userData.bio || userData.artist_biography;
    } else if (field === 'business_name' && userType === 'promoter') {
      value = userData.promoter_business_name;
    } else {
      value = userData[field];
    }
    
    if (value && (typeof value !== 'string' || value.trim())) {
      completedCount++;
    }
  }
  
  return Math.round((completedCount / requiredFields.length) * 100);
}

/**
 * Check if a specific field is complete
 * @param {number} userId - User ID
 * @param {string} fieldName - Field name to check
 * @returns {Promise<boolean>} True if complete
 */
async function isFieldComplete(userId, fieldName) {
  const status = await getStatus(userId);
  return !status.missingFields.includes(fieldName);
}

/**
 * Get required fields for a user type
 * @param {string} userType - User type
 * @returns {Array<string>} Required field names
 */
function getRequiredFields(userType) {
  return [...REQUIRED_FIELDS.base, ...(REQUIRED_FIELDS[userType] || [])];
}

module.exports = {
  getStatus,
  getMissingFields,
  calculatePercentage,
  isFieldComplete,
  getRequiredFields,
  REQUIRED_FIELDS,
};
