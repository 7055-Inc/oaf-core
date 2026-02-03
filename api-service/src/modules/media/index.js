/**
 * Media Module (v2)
 * Image/video processing worker API and public smart-serving proxy.
 *
 * Usage:
 *   app.use('/api/v2/media', require('./modules/media').router);
 *   app.use('/api/media', require('./modules/media').router);  // backward compat
 */

const router = require('./routes');
const middleware = require('./middleware');
const services = require('./services');

module.exports = {
  router,
  routes: router,
  middleware,
  services
};
