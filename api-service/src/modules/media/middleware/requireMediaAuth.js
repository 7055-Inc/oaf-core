/**
 * Media worker authentication middleware (v2)
 *
 * Accepts either:
 * 1. Authorization: Bearer {MAIN_API_KEY} – shared secret for media backend (env MAIN_API_KEY)
 * 2. Authorization: {publicKey}:{privateKey} – API key pair from api_keys table (prefixAuth)
 *
 * Media server should set MAIN_API_KEY to match the main API and send:
 *   Authorization: Bearer <MAIN_API_KEY>
 * No api_keys table entry is required when using Bearer MAIN_API_KEY.
 */

const MAIN_API_KEY = process.env.MAIN_API_KEY || process.env.MEDIA_API_KEY;
const prefixAuth = require('../../../middleware/prefix');

module.exports = function requireMediaAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No API key', code: 'MEDIA_AUTH_REQUIRED' });
  }

  // Bearer token (media server uses MAIN_API_KEY)
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (!MAIN_API_KEY) {
      return res.status(503).json({
        error: 'Media API not configured',
        message: 'MAIN_API_KEY (or MEDIA_API_KEY) is required for media worker auth'
      });
    }
    if (token !== MAIN_API_KEY) {
      return res.status(401).json({ error: 'Invalid API key', code: 'MEDIA_AUTH_INVALID' });
    }
    req.userId = 'media-backend';
    req.mediaAuth = 'bearer';
    return next();
  }

  // API key pair (publicKey:privateKey from api_keys table)
  return prefixAuth(req, res, () => {
    req.mediaAuth = 'api_key';
    next();
  });
};
