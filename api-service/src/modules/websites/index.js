/**
 * Websites module - sites, subscription, domains
 * v2 API at /api/v2/websites
 */

const router = require('./routes');
const services = require('./services');

module.exports = {
  router,
  routes: router,
  ...services
};
