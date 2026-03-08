/**
 * Shared module - cross-module utilities, middleware, services.
 */
const middleware = require('./middleware');

module.exports = {
  middleware,
  ...middleware
};
