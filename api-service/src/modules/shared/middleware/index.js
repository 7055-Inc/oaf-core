/**
 * Shared middleware - re-exports for clean imports.
 * Use: require('../shared/middleware') or require('../../modules/shared/middleware')
 */
const rateLimiter = require('./rateLimiter');

module.exports = {
  ...rateLimiter,
  rateLimiter
};
