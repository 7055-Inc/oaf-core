/**
 * Permission Service
 * Handles permission building, checking, and inheritance
 * Consolidates logic that was duplicated 4x in the old system
 */

const { 
  PERMISSIONS, 
  ROLES, 
  PERMISSION_INHERITANCE, 
  ROLE_PERMISSIONS,
  PERMISSION_COLUMNS 
} = require('../helpers/permissions');

/**
 * Build permissions array from database row
 * @param {Object} userPermissionsRow - Row from user_permissions table
 * @returns {string[]} Array of permission strings
 */
function buildPermissionsFromRow(userPermissionsRow) {
  const permissions = [];
  
  if (!userPermissionsRow) {
    return permissions;
  }
  
  // Extract permissions from database columns
  for (const column of PERMISSION_COLUMNS) {
    if (userPermissionsRow[column]) {
      permissions.push(column);
    }
  }
  
  return permissions;
}

/**
 * Apply permission inheritance rules
 * @param {string[]} permissions - Base permissions array
 * @returns {string[]} Permissions with inherited permissions added
 */
function applyInheritance(permissions) {
  const result = [...permissions];
  
  for (const [grantingPerm, inheritedPerms] of Object.entries(PERMISSION_INHERITANCE)) {
    if (result.includes(grantingPerm)) {
      for (const inherited of inheritedPerms) {
        if (!result.includes(inherited)) {
          result.push(inherited);
        }
      }
    }
  }
  
  return result;
}

/**
 * Apply role-based auto-permissions
 * @param {string[]} permissions - Current permissions
 * @param {string[]} roles - User roles
 * @returns {string[]} Permissions with role-based permissions added
 */
function applyRolePermissions(permissions, roles) {
  const result = [...permissions];
  
  for (const role of roles) {
    const rolePerms = ROLE_PERMISSIONS[role];
    if (rolePerms) {
      for (const perm of rolePerms) {
        if (!result.includes(perm)) {
          result.push(perm);
        }
      }
    }
  }
  
  return result;
}

/**
 * Build complete permissions array for a user
 * This is the main function that replaces the 4x duplicated code
 * 
 * @param {Object} userPermissionsRow - Row from user_permissions table
 * @param {string[]} roles - User roles array
 * @returns {string[]} Complete permissions array with inheritance applied
 */
function buildPermissions(userPermissionsRow, roles) {
  // 1. Get base permissions from database
  let permissions = buildPermissionsFromRow(userPermissionsRow);
  
  // 2. Apply role-based auto-permissions (admin gets all, promoter gets events)
  permissions = applyRolePermissions(permissions, roles);
  
  // 3. Apply permission inheritance (vendor → shipping, etc.)
  permissions = applyInheritance(permissions);
  
  return permissions;
}

/**
 * Build roles array from user data
 * @param {string} userType - Primary user_type from users table
 * @param {Object[]} userTypesRows - Rows from user_types table
 * @returns {string[]} Array of role strings
 */
function buildRoles(userType, userTypesRows) {
  const roles = [];
  
  // Add primary user type
  if (userType) {
    roles.push(userType);
  }
  
  // Add additional types
  if (userTypesRows && Array.isArray(userTypesRows)) {
    for (const row of userTypesRows) {
      if (row.type && !roles.includes(row.type)) {
        roles.push(row.type);
      }
    }
  }
  
  return roles.filter(Boolean);
}

/**
 * Check if user has a specific permission
 * @param {string[]} permissions - User's permissions
 * @param {string[]} roles - User's roles
 * @param {string} requiredPermission - Permission to check
 * @returns {boolean}
 */
function hasPermission(permissions, roles, requiredPermission) {
  // Admin users get all permissions
  if (roles.includes(ROLES.ADMIN)) {
    return true;
  }
  
  // Promoters get events permission automatically
  if (requiredPermission === PERMISSIONS.EVENTS && roles.includes(ROLES.PROMOTER)) {
    return true;
  }
  
  // Check direct permission
  if (permissions.includes(requiredPermission)) {
    return true;
  }
  
  // Check inheritance (vendor has shipping, etc.)
  for (const [grantingPerm, inheritedPerms] of Object.entries(PERMISSION_INHERITANCE)) {
    if (inheritedPerms.includes(requiredPermission) && permissions.includes(grantingPerm)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if user has a specific role
 * @param {string[]} roles - User's roles
 * @param {string} requiredRole - Role to check
 * @returns {boolean}
 */
function hasRole(roles, requiredRole) {
  return roles.includes(requiredRole);
}

/**
 * Check if user is admin
 * @param {string[]} roles - User's roles
 * @returns {boolean}
 */
function isAdmin(roles) {
  return roles.includes(ROLES.ADMIN);
}

module.exports = {
  buildPermissions,
  buildPermissionsFromRow,
  buildRoles,
  applyInheritance,
  applyRolePermissions,
  hasPermission,
  hasRole,
  isAdmin,
  // Re-export constants for convenience
  PERMISSIONS,
  ROLES,
};
