/**
 * User Utility Functions
 * Helper functions for determining user types and permissions
 */

/**
 * Check if user is a wholesale customer
 * @param {Object} userData - User data from JWT or API
 * @returns {boolean} - True if user has wholesale permissions
 */
export const isWholesaleCustomer = (userData) => {
  if (!userData) return false;
  
  // Check user_type for wholesale
  if (userData.user_type === 'wholesale') return true;
  
  // Check permissions array for wholesale permission
  if (userData.permissions && Array.isArray(userData.permissions)) {
    return userData.permissions.includes('wholesale');
  }
  
  return false;
};

/**
 * Check if user is an admin
 * @param {Object} userData - User data from JWT or API
 * @returns {boolean} - True if user has admin permissions
 */
export const isAdmin = (userData) => {
  if (!userData) return false;
  
  // Check user_type for admin
  if (userData.user_type === 'admin') return true;
  
  // Check permissions array for admin permission
  if (userData.permissions && Array.isArray(userData.permissions)) {
    return userData.permissions.includes('admin');
  }
  
  return false;
};

/**
 * Check if user is a vendor
 * @param {Object} userData - User data from JWT or API
 * @returns {boolean} - True if user has vendor permissions
 */
export const isVendor = (userData) => {
  if (!userData) return false;
  
  // Check user_type for artist (artists are vendors)
  if (userData.user_type === 'artist') return true;
  
  // Check permissions array for vendor permission
  if (userData.permissions && Array.isArray(userData.permissions)) {
    return userData.permissions.includes('vendor');
  }
  
  return false;
};

/**
 * Get user display name
 * @param {Object} userData - User data from JWT or API
 * @returns {string} - User's display name
 */
export const getUserDisplayName = (userData) => {
  if (!userData) return 'Guest';
  
  // Try display_name first
  if (userData.display_name) return userData.display_name;
  
  // Try first_name + last_name
  if (userData.first_name || userData.last_name) {
    return `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
  }
  
  // Fallback to username
  return userData.username || 'User';
};

/**
 * Check if user has specific permission
 * @param {Object} userData - User data from JWT or API
 * @param {string} permission - Permission to check for
 * @returns {boolean} - True if user has the permission
 */
export const hasPermission = (userData, permission) => {
  if (!userData || !permission) return false;
  
  // Admins have all permissions
  if (isAdmin(userData)) return true;
  
  // Check permissions array
  if (userData.permissions && Array.isArray(userData.permissions)) {
    return userData.permissions.includes(permission);
  }
  
  return false;
};

/**
 * Check if user has a specific addon
 * @param {Object} userData - User data from JWT or API
 * @param {string} addonSlug - Addon slug to check for (e.g., 'wholesale-pricing')
 * @returns {boolean} - True if user has the addon
 */
export const hasAddon = (userData, addonSlug) => {
  if (!userData || !addonSlug) return false;
  
  // Check if userData has addons array
  if (userData.addons && Array.isArray(userData.addons)) {
    return userData.addons.some(addon => 
      addon.addon_slug === addonSlug && addon.is_active
    );
  }
  
  // Check if userData has addon_slugs array (simplified format)
  if (userData.addon_slugs && Array.isArray(userData.addon_slugs)) {
    return userData.addon_slugs.includes(addonSlug);
  }
  
  return false;
};

/**
 * Get user's active addons
 * @param {Object} userData - User data from JWT or API
 * @returns {Array} - Array of active addon objects
 */
export const getUserAddons = (userData) => {
  if (!userData) return [];
  
  // Return full addon objects if available
  if (userData.addons && Array.isArray(userData.addons)) {
    return userData.addons.filter(addon => addon.is_active);
  }
  
  // Return simplified array if available
  if (userData.addon_slugs && Array.isArray(userData.addon_slugs)) {
    return userData.addon_slugs.map(slug => ({ addon_slug: slug, is_active: true }));
  }
  
  return [];
};

/**
 * Get user type display string
 * @param {Object} userData - User data from JWT or API
 * @returns {string} - Formatted user type
 */
export const getUserTypeDisplay = (userData) => {
  if (!userData || !userData.user_type) return 'Customer';
  
  const typeMap = {
    'admin': 'Administrator',
    'artist': 'Artist',
    'promoter': 'Event Promoter',
    'community': 'Community Member',
    'wholesale': 'Wholesale Customer',
    'Draft': 'Draft User'
  };
  
  return typeMap[userData.user_type] || userData.user_type;
};
