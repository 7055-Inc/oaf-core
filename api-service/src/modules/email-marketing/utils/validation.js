/**
 * Validation Utilities
 * Email validation and input sanitization
 */

/**
 * Validate email address format
 * 
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // RFC 5322 compliant email regex (simplified)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  // Additional checks
  if (email.length > 255) {
    return false;
  }
  
  return emailRegex.test(email);
}

/**
 * Sanitize string input
 * 
 * @param {string} input - Input to sanitize
 * @param {number} maxLength - Maximum length (default 255)
 * @returns {string} Sanitized input
 */
function sanitizeString(input, maxLength = 255) {
  if (!input) {
    return '';
  }
  
  // Convert to string, trim, limit length
  const sanitized = String(input).trim().slice(0, maxLength);
  
  return sanitized;
}

/**
 * Validate and sanitize tag
 * 
 * @param {string} tag - Tag to validate
 * @returns {string|null} Sanitized tag or null if invalid
 */
function validateTag(tag) {
  if (!tag || typeof tag !== 'string') {
    return null;
  }
  
  // Tags should be lowercase, alphanumeric with dashes/underscores
  const sanitized = tag.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '');
  
  if (sanitized.length === 0 || sanitized.length > 50) {
    return null;
  }
  
  return sanitized;
}

/**
 * Parse and validate tags array
 * 
 * @param {Array|string} tags - Tags to validate
 * @returns {Array} Valid tags array
 */
function parseTags(tags) {
  if (!tags) {
    return [];
  }
  
  // Handle string input (comma-separated)
  if (typeof tags === 'string') {
    tags = tags.split(',').map(t => t.trim());
  }
  
  // Handle array input
  if (Array.isArray(tags)) {
    return tags
      .map(tag => validateTag(tag))
      .filter(tag => tag !== null);
  }
  
  return [];
}

/**
 * Validate custom fields object
 * 
 * @param {Object} customFields - Custom fields to validate
 * @returns {Object} Valid custom fields
 */
function validateCustomFields(customFields) {
  if (!customFields || typeof customFields !== 'object') {
    return {};
  }
  
  // Filter out invalid keys/values
  const validated = {};
  
  for (const [key, value] of Object.entries(customFields)) {
    // Key validation (alphanumeric, underscore)
    const validKey = key.replace(/[^a-zA-Z0-9_]/g, '');
    
    if (validKey.length > 0 && validKey.length <= 50) {
      // Value validation (string, number, boolean, or null)
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null
      ) {
        validated[validKey] = value;
      }
    }
  }
  
  return validated;
}

module.exports = {
  isValidEmail,
  sanitizeString,
  validateTag,
  parseTags,
  validateCustomFields
};
