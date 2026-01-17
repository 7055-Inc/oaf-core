/**
 * Permission Constants and Inheritance Rules
 * Single source of truth for all permissions in the system
 */

/**
 * All available permissions
 */
const PERMISSIONS = {
  VENDOR: 'vendor',
  EVENTS: 'events',
  STRIPE_CONNECT: 'stripe_connect',
  MANAGE_SITES: 'manage_sites',
  MANAGE_CONTENT: 'manage_content',
  MANAGE_SYSTEM: 'manage_system',
  VERIFIED: 'verified',
  MARKETPLACE: 'marketplace',
  SHIPPING: 'shipping',
  SITES: 'sites',
  PROFESSIONAL_SITES: 'professional_sites',
};

/**
 * All available roles
 */
const ROLES = {
  DRAFT: 'Draft',
  BUYER: 'buyer',
  ARTIST: 'artist',
  VENDOR: 'vendor',
  PROMOTER: 'promoter',
  ADMIN: 'admin',
};

/**
 * Permission inheritance rules
 * Key = permission that grants, Value = array of permissions granted
 */
const PERMISSION_INHERITANCE = {
  // Vendor permission grants shipping, stripe_connect, and marketplace
  [PERMISSIONS.VENDOR]: [
    PERMISSIONS.SHIPPING,
    PERMISSIONS.STRIPE_CONNECT,
    PERMISSIONS.MARKETPLACE,
  ],
  // Events permission grants stripe_connect
  [PERMISSIONS.EVENTS]: [
    PERMISSIONS.STRIPE_CONNECT,
  ],
};

/**
 * Role-based auto-permissions
 * Key = role, Value = array of permissions automatically granted
 */
const ROLE_PERMISSIONS = {
  // Admin gets all permissions
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  // Promoter gets events and stripe_connect
  [ROLES.PROMOTER]: [
    PERMISSIONS.EVENTS,
    PERMISSIONS.STRIPE_CONNECT,
  ],
};

/**
 * Permission columns in user_permissions table
 * Maps permission name to database column
 */
const PERMISSION_COLUMNS = [
  'vendor',
  'events',
  'stripe_connect',
  'manage_sites',
  'manage_content',
  'manage_system',
  'verified',
  'marketplace',
  'shipping',
  'sites',
  'professional_sites',
];

module.exports = {
  PERMISSIONS,
  ROLES,
  PERMISSION_INHERITANCE,
  ROLE_PERMISSIONS,
  PERMISSION_COLUMNS,
};
