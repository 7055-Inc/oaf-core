import { NextResponse } from 'next/server';

/**
 * Maintenance Mode Middleware
 * Handles system-wide maintenance mode for the Online Art Festival platform
 * 
 * Features:
 * - Environment-based maintenance mode toggle
 * - Admin user bypass capability
 * - API endpoint exclusions
 * - Static asset passthrough
 * - Configurable maintenance page
 */

export async function maintenanceMode(req) {
  const path = req.nextUrl.pathname;
  const hostname = req.headers.get('host') || '';
  
  // Skip maintenance check for static assets and API endpoints that need to stay active
  const skipPaths = [
    '/_next',
    '/static',
    '/favicon.ico',
    '/api/auth', // Keep auth endpoints active
    '/api/maintenance', // Maintenance control endpoints
    '/maintenance', // The maintenance page itself
    '/api/media/serve' // Allow media serving for maintenance page assets
  ];
  
  if (skipPaths.some(skipPath => path.startsWith(skipPath))) {
    return NextResponse.next();
  }

  // Check if maintenance mode is enabled
  const isMaintenanceMode = await checkMaintenanceMode();
  
  if (!isMaintenanceMode) {
    return NextResponse.next();
  }

  // Check if user is allowed to bypass maintenance mode
  const canBypass = await checkMaintenanceBypass(req);
  
  if (canBypass) {
    return NextResponse.next();
  }

  // Redirect to maintenance page
  return NextResponse.redirect(new URL('/maintenance', req.url));
}

/**
 * Check if maintenance mode is currently enabled
 * Priority order:
 * 1. Environment variable MAINTENANCE_MODE
 * 2. Database setting (if implemented)
 * 3. File-based flag (for emergency use)
 */
async function checkMaintenanceMode() {
  // Check environment variable first
  if (process.env.MAINTENANCE_MODE === 'true') {
    return true;
  }

  // Check API for maintenance mode status
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_URL || 'http://localhost:3001'}/admin/maintenance/public-status`);
    
    if (response.ok) {
      const data = await response.json();
      return data.active === true;
    }
  } catch (error) {
    // API check failed, continue with other checks
    console.log('Maintenance API check failed:', error.message);
  }

  return false;
}

/**
 * Check if the current user can bypass maintenance mode
 * Admins and specified users can access the site during maintenance
 */
async function checkMaintenanceBypass(req) {
  const token = req.cookies.get('token')?.value;
  
  if (!token) {
    return false;
  }

  try {
    // Verify token and check user permissions
    const response = await fetch(`${process.env.API_URL || 'http://localhost:3001'}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      return false;
    }

    const userData = await response.json();
    
    // Allow admins to bypass maintenance
    if (userData.user_type === 'admin') {
      return true;
    }

    // Check if user is in allowed bypass list
    const allowedUsers = getMaintenanceBypassUsers();
    if (allowedUsers.includes(userData.id) || allowedUsers.includes(userData.username)) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking maintenance bypass:', error);
    return false;
  }
}

/**
 * Get list of users allowed to bypass maintenance mode
 * Can be configured via environment variables or database
 */
function getMaintenanceBypassUsers() {
  const envBypassUsers = process.env.MAINTENANCE_BYPASS_USERS;
  
  if (envBypassUsers) {
    return envBypassUsers.split(',').map(user => user.trim());
  }

  // Default: empty array (only admins can bypass)
  return [];
}

/**
 * Utility functions for maintenance mode control
 */
export const maintenanceUtils = {
  /**
   * Enable maintenance mode via API (recommended for Edge Runtime)
   */
  enableEmergencyMaintenance: async () => {
    try {
      // Use API endpoint instead of direct file system access
      const response = await fetch(`${process.env.API_URL || 'http://localhost:3001'}/api/admin/maintenance/enable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SYSTEM_API_KEY}`
        },
        body: JSON.stringify({
          title: 'Emergency Maintenance',
          message: 'Emergency maintenance is in progress. We will be back online shortly.'
        })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Failed to enable emergency maintenance:', error);
      return false;
    }
  },

  /**
   * Disable maintenance mode via API
   */
  disableEmergencyMaintenance: async () => {
    try {
      // Use API endpoint instead of direct file system access
      const response = await fetch(`${process.env.API_URL || 'http://localhost:3001'}/api/admin/maintenance/disable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SYSTEM_API_KEY}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Failed to disable emergency maintenance:', error);
      return false;
    }
  },

  /**
   * Check current maintenance status
   */
  getMaintenanceStatus: async () => {
    const isActive = await checkMaintenanceMode();
    const method = process.env.MAINTENANCE_MODE === 'true' ? 'environment' : 'api';
    
    return {
      active: isActive,
      method: isActive ? method : null,
      bypassUsers: getMaintenanceBypassUsers()
    };
  }
};

export default maintenanceMode;
