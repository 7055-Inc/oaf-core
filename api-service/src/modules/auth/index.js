/**
 * Auth Module
 * Main entry point for authentication module
 * 
 * Usage:
 *   const { router, requireAuth, requirePermission } = require('./modules/auth');
 *   app.use('/api/v2/auth', router);
 */

const router = require('./routes');
const middleware = require('./middleware');
const services = require('./services');
const { PERMISSIONS, ROLES } = require('./helpers/permissions');

module.exports = {
  // Express router for mounting
  router,
  
  // Middleware (most common exports)
  requireAuth: middleware.requireAuth,
  verifyToken: middleware.verifyToken,  // Backward compat
  requirePermission: middleware.requirePermission,
  requireRole: middleware.requireRole,
  requireAdmin: middleware.requireAdmin,
  requireAnyRole: middleware.requireAnyRole,
  requireNotDraft: middleware.requireNotDraft,
  requireAllAccess: middleware.requireAllAccess,
  canAccessAll: middleware.canAccessAll,
  getEffectivePermissions: middleware.getEffectivePermissions,
  
  // Services (for cross-module use)
  services: {
    jwt: services.jwtService,
    session: services.sessionService,
    permissions: services.permissionsService,
    user: services.userService,
    createAccessToken: services.createAccessToken,
    verifyToken: services.verifyToken,
    buildPermissions: services.buildPermissions,
    buildRoles: services.buildRoles,
    hasPermission: services.hasPermission,
    hasRole: services.hasRole,
    isAdmin: services.isAdmin,
  },
  
  // Constants
  PERMISSIONS,
  ROLES,
  
  // All middleware and services (for specific needs)
  middleware,
  allServices: services,
};
