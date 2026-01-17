/**
 * Auth Services Index
 * Re-exports all auth services for clean imports
 */

const jwtService = require('./jwt');
const sessionService = require('./session');
const permissionsService = require('./permissions');
const userService = require('./user');

module.exports = {
  // JWT operations
  jwtService,
  createAccessToken: jwtService.createAccessToken,
  createImpersonationToken: jwtService.createImpersonationToken,
  verifyToken: jwtService.verifyToken,
  decodeToken: jwtService.decodeToken,
  
  // Session/refresh token operations
  sessionService,
  generateRefreshToken: sessionService.generateRefreshToken,
  hashToken: sessionService.hashToken,
  storeRefreshToken: sessionService.storeRefreshToken,
  validateRefreshToken: sessionService.validateRefreshToken,
  rotateRefreshToken: sessionService.rotateRefreshToken,
  invalidateAllUserTokens: sessionService.invalidateAllUserTokens,
  
  // Permission operations
  permissionsService,
  buildPermissions: permissionsService.buildPermissions,
  buildRoles: permissionsService.buildRoles,
  hasPermission: permissionsService.hasPermission,
  hasRole: permissionsService.hasRole,
  isAdmin: permissionsService.isAdmin,
  PERMISSIONS: permissionsService.PERMISSIONS,
  ROLES: permissionsService.ROLES,
  
  // User operations
  userService,
  findUserByProvider: userService.findUserByProvider,
  findUserByEmail: userService.findUserByEmail,
  getUserWithRolesAndPermissions: userService.getUserWithRolesAndPermissions,
  createUser: userService.createUser,
};
