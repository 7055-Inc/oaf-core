/**
 * Users Module
 * 
 * Handles all user management functionality:
 * - User CRUD operations
 * - Profile management (artist, community, promoter, admin)
 * - Artist personas
 * - Profile completion tracking
 * - Admin user management
 * 
 * @module users
 */

const router = require('./routes');
const services = require('./services');

module.exports = {
  // Router for mounting in server.js
  router,
  
  // Individual services
  userService: services.userService,
  profileService: services.profileService,
  personaService: services.personaService,
  completionService: services.completionService,
  
  // Spread all service functions for convenience
  ...services,
};
