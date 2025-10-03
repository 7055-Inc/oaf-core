/**
 * Dashboard Management Routes
 * Comprehensive dashboard system consolidating functionality from vendor.js, admin.js, and other permission-based routes
 * Provides unified dashboard interface with role-based access control and permission-specific data views
 * Supports multi-role users with dynamic permission evaluation and dashboard section generation
 */

const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { 
  requirePermission, 
  requireAllAccess, 
  canAccessAll,
  hasPermission,
  getEffectivePermissions 
} = require('../middleware/permissions');

/**
 * Dashboard API Routes Architecture
 * 
 * This file consolidates dashboard functionality that was previously scattered
 * across vendor.js, admin.js, and other permission-based route files.
 * 
 * URL Structure: /dashboard/{usertype}?permissions={permission1,permission2}
 * 
 * Examples:
 * - /dashboard/artist?permissions=vendor,manage_sites
 * - /dashboard/promoter?permissions=vendor  
 * - /dashboard/admin (gets all permissions automatically)
 * - /dashboard/community
 */

// ============================================================================
// DASHBOARD OVERVIEW ROUTES
// ============================================================================

/**
 * GET /dashboard/overview
 * Get comprehensive dashboard overview for current user
 * Returns user-specific dashboard data based on their user type and permissions
 * Dynamically generates available sections based on effective permissions
 * 
 * @route GET /dashboard/overview
 * @middleware verifyToken - Requires valid JWT token
 * @returns {Object} Dashboard overview with user info, permissions, and available sections
 */
router.get('/overview', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const userType = req.roles.find(role => ['admin', 'artist', 'promoter', 'community'].includes(role));
    const permissions = getEffectivePermissions(req);
    
    // Base user info
    const [userInfo] = await db.query(
      'SELECT u.username, u.user_type, up.display_name FROM users u ' +
      'LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = ?',
      [userId]
    );

    const dashboardData = {
      user: userInfo[0],
      userType,
      permissions,
      sections: []
    };

    // Add sections based on permissions
    if (hasPermission(req, 'vendor')) {
      dashboardData.sections.push({
        name: 'vendor',
        title: 'E-commerce & Sales',
        description: 'Manage products, orders, and financial information',
        endpoints: ['/dashboard/vendor/overview', '/dashboard/vendor/products', '/dashboard/vendor/orders']
      });
    }

    if (hasPermission(req, 'manage_sites')) {
      dashboardData.sections.push({
        name: 'sites',
        title: 'Website Management', 
        description: 'Create and manage your websites',
        endpoints: ['/dashboard/sites/my', '/dashboard/sites/domains']
      });
    }

    if (hasPermission(req, 'manage_content')) {
      dashboardData.sections.push({
        name: 'content',
        title: 'Content Creation',
        description: 'Create and manage articles, topics, and content',
        endpoints: ['/dashboard/content/articles', '/dashboard/content/topics']
      });
    }

    if (hasPermission(req, 'manage_system')) {
      dashboardData.sections.push({
        name: 'system',
        title: 'System Administration',
        description: 'Manage users, announcements, and system settings',
        endpoints: ['/dashboard/system/users', '/dashboard/system/announcements']
      });
    }

    res.json(dashboardData);
  } catch (err) {
    console.error('Error fetching dashboard overview:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// ============================================================================
// VENDOR DASHBOARD ROUTES (consolidated from vendor.js)
// ============================================================================

/**
 * GET /dashboard/vendor/overview
 * Vendor financial dashboard with sales analytics and e-commerce metrics
 * Consolidates vendor dashboard functionality from legacy vendor.js routes
 * 
 * @route GET /dashboard/vendor/overview
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requirePermission('vendor') - Requires vendor permissions
 * @returns {Object} Vendor dashboard data with financial metrics and sales analytics
 * @replaces GET /vendor/dashboard
 */
router.get('/vendor/overview', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    // TODO: Move vendor dashboard logic from vendor.js here
    // For now, return placeholder that demonstrates the structure
    res.json({
      message: 'Vendor dashboard - to be implemented',
      userId: req.userId,
      permissions: getEffectivePermissions(req),
      todo: 'Move vendor dashboard logic from vendor.js to here'
    });
  } catch (err) {
    console.error('Error fetching vendor dashboard:', err);
    res.status(500).json({ error: 'Failed to fetch vendor dashboard' });
  }
});

/**
 * GET /dashboard/vendor/products
 * Vendor product management dashboard with analytics and inventory insights
 * Consolidates product management views with vendor-specific analytics
 * 
 * @route GET /dashboard/vendor/products
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requirePermission('vendor') - Requires vendor permissions
 * @returns {Object} Vendor product dashboard with analytics and management tools
 */
router.get('/vendor/products', verifyToken, requirePermission('vendor'), async (req, res) => {
  try {
    // This could consolidate product views from products.js with vendor-specific data
    res.json({
      message: 'Vendor products dashboard - to be implemented',
      note: 'Will show vendor-specific product analytics and management tools'
    });
  } catch (err) {
    console.error('Error fetching vendor products:', err);
    res.status(500).json({ error: 'Failed to fetch vendor products' });
  }
});

// ============================================================================
// ADMIN DASHBOARD ROUTES (consolidated from admin.js)
// ============================================================================

/**
 * GET /dashboard/system/users
 * System user management dashboard (admin only)
 * Provides comprehensive user listing with status and type information
 * 
 * @route GET /dashboard/system/users
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requirePermission('manage_system') - Requires system management permissions
 * @returns {Array} All users with basic information for administrative purposes
 * @replaces GET /admin/users
 */
router.get('/system/users', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    // Admin can see all users, others cannot access this endpoint
    const [users] = await db.query('SELECT id, username, status, user_type FROM users');
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * POST /dashboard/system/users
 * Create new user account (admin only)
 * Consolidates user creation functionality from legacy admin.js routes
 * 
 * @route POST /dashboard/system/users
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requirePermission('manage_system') - Requires system management permissions
 * @param {Object} req.body - User creation data
 * @returns {Object} Created user confirmation
 * @replaces POST /admin/users
 */
router.post('/system/users', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    // TODO: Move user creation logic from admin.js here
    res.json({
      message: 'User creation - to be implemented',
      note: 'Move user creation logic from admin.js to here'
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// ============================================================================
// SITES DASHBOARD ROUTES
// ============================================================================

/**
 * GET /dashboard/sites/my
 * Current user's sites dashboard with enhanced metadata
 * Provides dashboard-specific view of sites with analytics and quick actions
 * 
 * @route GET /dashboard/sites/my
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requirePermission('manage_sites') - Requires site management permissions
 * @returns {Array} User's sites with dashboard metadata and public URLs
 * @note Existing sites.js routes remain for direct API access
 */
router.get('/sites/my', verifyToken, requirePermission('manage_sites'), async (req, res) => {
  try {
    const [sites] = await db.query(
      'SELECT * FROM sites WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    
    // Add dashboard-specific metadata
    const sitesWithStats = sites.map(site => ({
      ...site,
      dashboardUrl: `/dashboard/sites/${site.id}`,
      publicUrl: site.custom_domain || `${site.subdomain}.${process.env.FRONTEND_URL?.replace('https://', '') || 'beemeeart.com'}`
    }));
    
    res.json(sitesWithStats);
  } catch (err) {
    console.error('Error fetching sites dashboard:', err);
    res.status(500).json({ error: 'Failed to fetch sites' });
  }
});

// ============================================================================
// CONTENT DASHBOARD ROUTES
// ============================================================================

/**
 * GET /dashboard/content/articles
 * Content creator's articles dashboard with analytics and management tools
 * Provides comprehensive article overview with status statistics and access control
 * 
 * @route GET /dashboard/content/articles
 * @middleware verifyToken - Requires valid JWT token
 * @middleware requirePermission('manage_content') - Requires content management permissions
 * @returns {Object} Articles dashboard with statistics and access information
 */
router.get('/content/articles', verifyToken, requirePermission('manage_content'), async (req, res) => {
  try {
    // Get user's articles with dashboard-specific data
    const accessFilter = canAccessAll(req) ? '' : 'WHERE author_id = ?';
    const params = canAccessAll(req) ? [] : [req.userId];
    
    const [articles] = await db.query(
      `SELECT id, title, slug, status, author_id, published_at, created_at 
       FROM articles ${accessFilter} 
       ORDER BY created_at DESC`,
      params
    );
    
    res.json({
      articles,
      canAccessAll: canAccessAll(req),
      stats: {
        total: articles.length,
        published: articles.filter(a => a.status === 'published').length,
        draft: articles.filter(a => a.status === 'draft').length
      }
    });
  } catch (err) {
    console.error('Error fetching content dashboard:', err);
    res.status(500).json({ error: 'Failed to fetch content dashboard' });
  }
});

// ============================================================================
// PERMISSION MANAGEMENT ROUTES
// ============================================================================

/**
 * GET /dashboard/permissions/my
 * Get current user's effective permissions with detailed descriptions
 * Provides comprehensive permission information for frontend dashboard rendering
 * 
 * @route GET /dashboard/permissions/my
 * @middleware verifyToken - Requires valid JWT token
 * @returns {Object} Complete permission information with descriptions and access levels
 */
router.get('/permissions/my', verifyToken, async (req, res) => {
  try {
    const effectivePermissions = getEffectivePermissions(req);
    const userType = req.roles.find(role => ['admin', 'artist', 'promoter', 'community'].includes(role));
    
    // Create permission descriptions (no longer using permission_restrictions table)
    const permissionDescriptions = {
      'vendor': 'E-commerce capabilities: products, orders, policies',
      'events': 'Event management and ticketing',
      'manage_sites': 'Website management capabilities',
      'manage_content': 'Content creation: articles, topics, SEO',
      'manage_system': 'System administration: users, announcements, domains',
      'stripe_connect': 'Payment processing integration',
      'verified': 'Artist verification status',
      'marketplace': 'Marketplace participation',
      'shipping': 'Shipping label management',
      'sites': 'Basic site access',
      'professional_sites': 'Professional site features'
    };
    
    const permissionDetails = effectivePermissions.map(permission => ({
      permission_name: permission,
      description: permissionDescriptions[permission] || 'Permission access'
    }));
    
    res.json({
      userType,
      permissions: effectivePermissions,
      permissionDetails: permissionDetails,
      canAccessAll: canAccessAll(req),
      isAdmin: req.roles.includes('admin')
    });
  } catch (err) {
    console.error('Error fetching permissions:', err);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

module.exports = router; 