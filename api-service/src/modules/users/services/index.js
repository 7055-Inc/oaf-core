/**
 * Users Module Services
 * Re-exports all user-related services
 */

const userService = require('./user');
const profileService = require('./profile');
const personaService = require('./persona');
const completionService = require('./completion');
const permissionsService = require('./permissions');

module.exports = {
  userService,
  profileService,
  personaService,
  completionService,
  permissionsService,
  
  // Spread individual exports for convenience
  ...userService,
  ...profileService,
  ...personaService,
  ...completionService,
  ...permissionsService,
};
