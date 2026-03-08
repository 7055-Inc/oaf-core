/**
 * JWT Authentication Middleware (Backward Compatibility Wrapper)
 * 
 * This file now re-exports from the auth module.
 * New code should import from: require('../modules/auth/middleware')
 * 
 * @deprecated Import from '../modules/auth' instead
 */

const requireAuth = require('../modules/auth/middleware/requireAuth');

// Export the requireAuth middleware as default (matches old usage pattern)
module.exports = requireAuth;
