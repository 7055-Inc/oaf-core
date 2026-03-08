/**
 * Email Hash Utility
 * Generates SHA256 hashes for email deduplication
 */

const crypto = require('crypto');

/**
 * Generate SHA256 hash of email (lowercase)
 * Used for deduplication and privacy
 * 
 * @param {string} email - Email address
 * @returns {string} SHA256 hash (64 chars)
 */
function generateEmailHash(email) {
  if (!email) {
    throw new Error('Email is required for hash generation');
  }
  
  // Normalize email (lowercase, trim)
  const normalizedEmail = email.toLowerCase().trim();
  
  // Generate SHA256 hash
  const hash = crypto
    .createHash('sha256')
    .update(normalizedEmail)
    .digest('hex');
  
  return hash;
}

/**
 * Normalize email for consistent storage
 * 
 * @param {string} email - Email address
 * @returns {string} Normalized email
 */
function normalizeEmail(email) {
  if (!email) {
    return '';
  }
  
  return email.toLowerCase().trim();
}

module.exports = {
  generateEmailHash,
  normalizeEmail
};
