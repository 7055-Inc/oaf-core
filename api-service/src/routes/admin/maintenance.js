const express = require('express');
const router = express.Router();
const verifyToken = require('../../middleware/jwt');
const { requirePermission } = require('../../middleware/permissions');
const fs = require('fs');
const path = require('path');

/**
 * Admin Maintenance Control Routes
 * Provides API endpoints for managing system-wide maintenance mode
 * 
 * All routes require admin permissions
 */

/**
 * GET /api/admin/maintenance/status
 * Get current maintenance mode status and configuration
 * 
 * @route GET /api/admin/maintenance/status
 * @middleware verifyToken - Requires user authentication
 * @middleware requirePermission('manage_system') - Requires system management permission
 * @returns {Object} Current maintenance status and configuration
 */
router.get('/status', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const status = await getMaintenanceStatus();
    
    res.json({
      success: true,
      ...status
    });
  } catch (err) {
    console.error('Error getting maintenance status:', err);
    res.status(500).json({ error: 'Failed to get maintenance status' });
  }
});

/**
 * POST /api/admin/maintenance/enable
 * Enable maintenance mode with configuration
 * 
 * @route POST /api/admin/maintenance/enable
 * @middleware verifyToken - Requires user authentication
 * @middleware requirePermission('manage_system') - Requires system management permission
 * @param {string} req.body.title - Maintenance page title
 * @param {string} req.body.message - Maintenance message
 * @param {string} [req.body.estimatedTime] - Estimated completion time (ISO string)
 * @param {string} [req.body.contactEmail] - Support contact email
 * @param {boolean} [req.body.showProgress] - Whether to show progress bar
 * @param {string} [req.body.bypassUsers] - Comma-separated list of bypass users
 * @returns {Object} Success confirmation
 */
router.post('/enable', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const {
      title = "We'll Be Right Back!",
      message = "We're currently performing scheduled maintenance to improve your experience.",
      estimatedTime,
      contactEmail = 'support@beemeeart.com',
      showProgress = false,
      bypassUsers = ''
    } = req.body;

    const maintenanceConfig = {
      enabled: true,
      enabledAt: new Date().toISOString(),
      enabledBy: req.userId,
      config: {
        title,
        message,
        estimatedTime: estimatedTime || null,
        contactEmail,
        showProgress,
        bypassUsers: bypassUsers ? bypassUsers.split(',').map(u => u.trim()).filter(u => u) : []
      }
    };

    // Write maintenance configuration to file
    const maintenanceFile = path.join(process.cwd(), '.maintenance');
    fs.writeFileSync(maintenanceFile, JSON.stringify(maintenanceConfig, null, 2));

    // Log the maintenance activation
    console.log(`Maintenance mode enabled by user ${req.userId} at ${new Date().toISOString()}`);

    res.json({
      success: true,
      message: 'Maintenance mode enabled successfully',
      config: maintenanceConfig
    });
  } catch (err) {
    console.error('Error enabling maintenance mode:', err);
    res.status(500).json({ error: 'Failed to enable maintenance mode' });
  }
});

/**
 * POST /api/admin/maintenance/disable
 * Disable maintenance mode
 * 
 * @route POST /api/admin/maintenance/disable
 * @middleware verifyToken - Requires user authentication
 * @middleware requirePermission('manage_system') - Requires system management permission
 * @returns {Object} Success confirmation
 */
router.post('/disable', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const maintenanceFile = path.join(process.cwd(), '.maintenance');
    
    // Remove maintenance file if it exists
    if (fs.existsSync(maintenanceFile)) {
      fs.unlinkSync(maintenanceFile);
    }

    // Log the maintenance deactivation
    console.log(`Maintenance mode disabled by user ${req.userId} at ${new Date().toISOString()}`);

    res.json({
      success: true,
      message: 'Maintenance mode disabled successfully'
    });
  } catch (err) {
    console.error('Error disabling maintenance mode:', err);
    res.status(500).json({ error: 'Failed to disable maintenance mode' });
  }
});

/**
 * POST /api/admin/maintenance/update-config
 * Update maintenance configuration without changing enabled status
 * 
 * @route POST /api/admin/maintenance/update-config
 * @middleware verifyToken - Requires user authentication
 * @middleware requirePermission('manage_system') - Requires system management permission
 * @param {Object} req.body.config - Updated configuration object
 * @returns {Object} Success confirmation
 */
router.post('/update-config', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({ error: 'Configuration object is required' });
    }

    const maintenanceFile = path.join(process.cwd(), '.maintenance');
    
    let currentConfig = {
      enabled: true,
      enabledAt: new Date().toISOString(),
      enabledBy: req.userId,
      config: {}
    };

    // Read existing config if file exists
    if (fs.existsSync(maintenanceFile)) {
      try {
        const fileContent = fs.readFileSync(maintenanceFile, 'utf8');
        currentConfig = JSON.parse(fileContent);
      } catch (parseError) {
        console.error('Error parsing existing maintenance config:', parseError);
      }
    }

    // Update configuration
    currentConfig.config = {
      ...currentConfig.config,
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: req.userId
    };

    // Write updated configuration
    fs.writeFileSync(maintenanceFile, JSON.stringify(currentConfig, null, 2));

    res.json({
      success: true,
      message: 'Maintenance configuration updated successfully',
      config: currentConfig
    });
  } catch (err) {
    console.error('Error updating maintenance config:', err);
    res.status(500).json({ error: 'Failed to update maintenance configuration' });
  }
});

/**
 * GET /api/admin/maintenance/logs
 * Get maintenance mode activity logs
 * 
 * @route GET /api/admin/maintenance/logs
 * @middleware verifyToken - Requires user authentication
 * @middleware requirePermission('manage_system') - Requires system management permission
 * @param {number} [req.query.limit=50] - Number of log entries to return
 * @returns {Array} Maintenance activity logs
 */
router.get('/logs', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    // TODO: Implement proper logging system
    // For now, return basic information from maintenance file
    const maintenanceFile = path.join(process.cwd(), '.maintenance');
    const logs = [];

    if (fs.existsSync(maintenanceFile)) {
      try {
        const fileContent = fs.readFileSync(maintenanceFile, 'utf8');
        const config = JSON.parse(fileContent);
        
        logs.push({
          timestamp: config.enabledAt,
          action: 'enabled',
          userId: config.enabledBy,
          details: 'Maintenance mode enabled'
        });

        if (config.config?.updatedAt) {
          logs.push({
            timestamp: config.config.updatedAt,
            action: 'updated',
            userId: config.config.updatedBy,
            details: 'Maintenance configuration updated'
          });
        }
      } catch (parseError) {
        console.error('Error parsing maintenance config for logs:', parseError);
      }
    }

    res.json({
      success: true,
      logs: logs.slice(0, limit)
    });
  } catch (err) {
    console.error('Error getting maintenance logs:', err);
    res.status(500).json({ error: 'Failed to get maintenance logs' });
  }
});

/**
 * GET /api/admin/maintenance/public-status
 * Get maintenance status without authentication (for middleware)
 * 
 * @route GET /api/admin/maintenance/public-status
 * @returns {Object} Basic maintenance status
 */
router.get('/public-status', async (req, res) => {
  try {
    const status = await getMaintenanceStatus();
    
    res.json({
      active: status.active,
      method: status.method
    });
  } catch (err) {
    console.error('Error getting public maintenance status:', err);
    res.status(500).json({ error: 'Failed to get maintenance status' });
  }
});

/**
 * Utility function to get current maintenance status
 * @returns {Object} Current maintenance status and configuration
 */
async function getMaintenanceStatus() {
  const status = {
    active: false,
    method: null,
    config: null,
    bypassUsers: []
  };

  // Check environment variable
  if (process.env.MAINTENANCE_MODE === 'true') {
    status.active = true;
    status.method = 'environment';
    status.bypassUsers = getEnvBypassUsers();
    return status;
  }

  // Check maintenance file
  const maintenanceFile = path.join(process.cwd(), '.maintenance');
  
  if (fs.existsSync(maintenanceFile)) {
    try {
      const fileContent = fs.readFileSync(maintenanceFile, 'utf8');
      const config = JSON.parse(fileContent);
      
      if (config.enabled) {
        status.active = true;
        status.method = 'file';
        status.config = config.config || {};
        status.bypassUsers = config.config?.bypassUsers || [];
        status.enabledAt = config.enabledAt;
        status.enabledBy = config.enabledBy;
      }
    } catch (parseError) {
      console.error('Error parsing maintenance file:', parseError);
    }
  }

  return status;
}

/**
 * Get bypass users from environment variable
 * @returns {Array} Array of bypass usernames
 */
function getEnvBypassUsers() {
  const envBypassUsers = process.env.MAINTENANCE_BYPASS_USERS;
  
  if (envBypassUsers) {
    return envBypassUsers.split(',').map(user => user.trim()).filter(user => user);
  }

  return [];
}

module.exports = router;
