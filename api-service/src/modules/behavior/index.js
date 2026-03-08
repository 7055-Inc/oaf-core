/**
 * Behavior Tracking Module
 * 
 * Collects and stores user behavioral data in ClickHouse for analytics
 * and AI-powered personalization.
 */

const router = require('./routes');
const services = require('./services');

module.exports = {
  router,
  ...services
};
