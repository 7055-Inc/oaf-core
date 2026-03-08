/**
 * SOP Module
 * Standard Operating Procedures management system
 * 
 * Uses separate database: brakebee_sop
 * Has its own authentication layer (checks Brakebee JWT + SOP enrollment)
 * 
 * Usage:
 *   const { router, requireSopAuth, requireTop } = require('./modules/sop');
 *   app.use('/api/v2/sop', router);
 */

const router = require('./routes');
const middleware = require('./middleware');
const services = require('./services');
const { pool, testConnection } = require('./config/database');

module.exports = {
  // Express router for mounting
  router,
  
  // Middleware
  requireSopAuth: middleware.requireSopAuth,
  requireTop: middleware.requireTop,
  getToken: middleware.getToken,
  
  // Services (for cross-module use if needed)
  services: {
    users: services.usersService,
    folders: services.foldersService,
    sops: services.sopsService,
    layout: services.layoutService,
  },
  
  // Database
  pool,
  testConnection,
  
  // Full exports
  middleware,
  allServices: services,
};
