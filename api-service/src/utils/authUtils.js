const crypto = require('crypto');

/**
 * Generate HMAC signature for database request
 * @param {string} requestBody - Stringified request body
 * @param {string} timestamp - ISO timestamp
 * @param {string} secret - HMAC secret key
 * @returns {string} - HMAC signature
 */
exports.generateRequestSignature = (requestBody, timestamp, secret) => {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(timestamp + ":" + requestBody);
  return hmac.digest('hex');
}; 