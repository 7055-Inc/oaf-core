const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

// Import existing middleware
const db = require('../../config/db');
const jwt = require('jsonwebtoken');

const { requirePermission, requireAllAccess, canAccessAll } = require('../middleware/permissions');

// Middleware to verify JWT token
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.roles = decoded.roles;
    req.permissions = decoded.permissions || [];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Domain validation regex
const DOMAIN_REGEX = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

// Path to domain manager
const DOMAIN_MANAGER_PATH = '/opt/oaf-ssl-automation/domain-manager.js';

/**
 * POST /domains/start-validation
 * Start the domain validation process for a custom domain
 */
router.post('/start-validation', verifyToken, async (req, res) => {
  console.log('🔍 START-VALIDATION: Request received', { siteId: req.body?.siteId, customDomain: req.body?.customDomain, userId: req.userId });
  try {
    const { siteId, customDomain } = req.body;
    
    if (!siteId || !customDomain) {
      return res.status(400).json({ error: 'siteId and customDomain are required' });
    }

    // Validate domain format
    if (!DOMAIN_REGEX.test(customDomain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }

    // Check if user owns the site
    const [sites] = await db.execute(
      'SELECT id, user_id FROM sites WHERE id = ?',
      [siteId]
    );

    if (!sites[0]) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Check if user is the owner or admin
    const [user] = await db.execute(
      'SELECT user_type FROM users WHERE id = ?',
      [req.userId]
    );

    if (sites[0].user_id !== req.userId && user[0]?.user_type !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if domain is already in use
    const [existingDomain] = await db.execute(
      'SELECT id FROM sites WHERE custom_domain = ? AND id != ?',
      [customDomain, siteId]
    );

    if (existingDomain.length > 0) {
      return res.status(400).json({ error: 'Domain already in use' });
    }

    // Update the site with the custom domain
    await db.execute(
      'UPDATE sites SET custom_domain = ? WHERE id = ?',
      [customDomain, siteId]
    );

    // Start domain validation using the domain manager
    try {
      const { stdout } = await execAsync(`sudo node ${DOMAIN_MANAGER_PATH} start-validation ${siteId} ${customDomain}`);
      
      // Extract JSON from stdout (domain manager outputs logs + JSON)

      // Extract JSON from stdout (domain manager outputs logs + JSON)
      const lines = stdout.split('\n');
      const jsonStartIndex = lines.findIndex(line => line.trim().startsWith('{'));
      const jsonEndIndex = lines.findIndex((line, index) => index > jsonStartIndex && line.trim() === '}');
      
      if (jsonStartIndex === -1 || jsonEndIndex === -1) {
        throw new Error('No complete JSON response from domain manager');
      }
      
      const jsonLines = lines.slice(jsonStartIndex, jsonEndIndex + 1);
      const jsonString = jsonLines.join('\n');
      console.log('🔍 Complete JSON string:', jsonString);
      
      const result = JSON.parse(jsonString);
      
      if (result.success) {
        // Domain validation started
        res.json({
          success: true,
          message: 'Domain validation started',
          validationKey: result.validationKey,
          expiresAt: result.expiresAt,
          instructions: result.instructions
        });
      } else {
        // Failed to start domain validation
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      // Error calling domain manager
      console.error('🚨 START-VALIDATION: Domain manager error:', error);
      res.status(500).json({ error: 'Failed to start domain validation' });
    }

  } catch (err) {
    // Error starting domain validation
    console.error('🚨 START-VALIDATION: General error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /domains/status/:siteId
 * Get the domain validation status for a site
 */
router.get('/status/:siteId', verifyToken, async (req, res) => {
  try {
    const { siteId } = req.params;

    // Check if user owns the site
    const [sites] = await db.execute(
      `SELECT s.id, s.custom_domain, s.domain_validation_key, s.domain_validation_status, 
              s.domain_validation_expires, s.custom_domain_active, s.domain_validation_error,
              s.domain_validation_attempted_at, s.user_id
       FROM sites s WHERE s.id = ?`,
      [siteId]
    );

    if (!sites[0]) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Check if user is the owner or admin
    const [user] = await db.execute(
      'SELECT user_type FROM users WHERE id = ?',
      [req.userId]
    );

    if (sites[0].user_id !== req.userId && user[0]?.user_type !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const site = sites[0];
    
    res.json({
      siteId: site.id,
      customDomain: site.custom_domain,
      validationStatus: site.domain_validation_status,
      validationKey: site.domain_validation_key,
      expiresAt: site.domain_validation_expires,
      isActive: site.custom_domain_active,
      error: site.domain_validation_error,
      lastAttempt: site.domain_validation_attempted_at,
      dnsInstructions: site.domain_validation_key ? 
        `Add DNS TXT record: _oaf-site-verification.${site.custom_domain} = ${site.domain_validation_key}` : null
    });

  } catch (err) {
    // Error getting domain status
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /domains/retry-validation/:siteId
 * Retry domain validation for a site
 */
router.post('/retry-validation/:siteId', verifyToken, async (req, res) => {
  try {
    const { siteId } = req.params;

    // Check if user owns the site
    const [sites] = await db.execute(
      'SELECT id, user_id, custom_domain FROM sites WHERE id = ?',
      [siteId]
    );

    if (!sites[0]) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Check if user is the owner or admin
    const [user] = await db.execute(
      'SELECT user_type FROM users WHERE id = ?',
      [req.userId]
    );

    if (sites[0].user_id !== req.userId && user[0]?.user_type !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!sites[0].custom_domain) {
      return res.status(400).json({ error: 'No custom domain set for this site' });
    }

    // Process the domain validation
    try {
      const { stdout } = await execAsync(`sudo node ${DOMAIN_MANAGER_PATH} process-domain ${siteId}`);
      console.log('🔍 RETRY-VALIDATION: Raw stdout:', stdout);
      
      // Extract JSON from stdout (domain manager outputs logs + JSON)
      const lines = stdout.split('\n');
      const jsonStartIndex = lines.findIndex(line => line.trim().startsWith('{'));
      const jsonEndIndex = lines.findIndex((line, index) => index > jsonStartIndex && line.trim() === '}');
      
      if (jsonStartIndex === -1 || jsonEndIndex === -1) {
        throw new Error('No complete JSON response from domain manager');
      }
      
      const jsonLines = lines.slice(jsonStartIndex, jsonEndIndex + 1);
      const jsonString = jsonLines.join('\n');
      console.log('🔍 RETRY-VALIDATION: Complete JSON string:', jsonString);
      
      const result = JSON.parse(jsonString);
      
      if (result.success) {
        // Domain validation retried
        res.json({
          success: true,
          message: 'Domain validation processing started'
        });
      } else {
        // Failed to retry domain validation
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error('🚨 RETRY-VALIDATION: Domain manager error:', error);
      // Error calling domain manager for retry
      res.status(500).json({ error: 'Failed to retry domain validation' });
    }

  } catch (err) {
    // Error retrying domain validation
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /domains/cancel-validation/:siteId
 * Cancel domain validation for a site
 */
router.post('/cancel-validation/:siteId', verifyToken, async (req, res) => {
  try {
    const { siteId } = req.params;

    // Check if user owns the site
    const [sites] = await db.execute(
      'SELECT id, user_id, custom_domain FROM sites WHERE id = ?',
      [siteId]
    );

    if (!sites[0]) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Check if user is the owner or admin
    const [user] = await db.execute(
      'SELECT user_type FROM users WHERE id = ?',
      [req.userId]
    );

    if (sites[0].user_id !== req.userId && user[0]?.user_type !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!sites[0].custom_domain) {
      return res.status(400).json({ error: 'No custom domain set for this site' });
    }

    // Cancel domain validation by clearing validation fields but keeping the domain
    await db.execute(`
      UPDATE sites SET 
       domain_validation_status = NULL,
       domain_validation_key = NULL,
       domain_validation_expires = NULL,
       domain_validation_error = NULL,
       domain_validation_attempted_at = NULL
      WHERE id = ?
    `, [siteId]);

    res.json({
      success: true,
      message: 'Domain validation cancelled successfully'
    });

  } catch (err) {
    console.error('Error cancelling domain validation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /domains/remove/:siteId
 * Remove custom domain from a site
 */
router.delete('/remove/:siteId', verifyToken, async (req, res) => {
  try {
    const { siteId } = req.params;

    // Check if user owns the site
    const [sites] = await db.execute(
      'SELECT id, user_id, custom_domain FROM sites WHERE id = ?',
      [siteId]
    );

    if (!sites[0]) {
      return res.status(404).json({ error: 'Site not found' });
    }

    // Check if user is the owner or admin
    const [user] = await db.execute(
      'SELECT user_type FROM users WHERE id = ?',
      [req.userId]
    );

    if (sites[0].user_id !== req.userId && user[0]?.user_type !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Remove custom domain and reset validation fields
    await db.execute(
      `UPDATE sites SET 
       custom_domain = NULL,
       domain_validation_key = NULL,
       domain_validation_status = 'pending',
       domain_validation_expires = NULL,
       custom_domain_active = FALSE,
       domain_validation_attempted_at = NULL,
       domain_validation_error = NULL
       WHERE id = ?`,
      [siteId]
    );

    // TODO: Remove nginx configuration and SSL certificate
    // This would require additional cleanup in the domain manager

    // Custom domain removed
    res.json({ success: true, message: 'Custom domain removed' });

  } catch (err) {
    // Error removing custom domain
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /domains/check-availability
 * Check if a domain is available (not in use by another site)
 */
router.get('/check-availability', verifyToken, async (req, res) => {
  try {
    const { domain } = req.query;

    if (!domain) {
      return res.status(400).json({ error: 'Domain parameter is required' });
    }

    // Validate domain format
    if (!DOMAIN_REGEX.test(domain)) {
      return res.status(400).json({ 
        available: false, 
        error: 'Invalid domain format' 
      });
    }

    // Check if domain is already in use
    const [existingDomain] = await db.execute(
      'SELECT id, subdomain FROM sites WHERE custom_domain = ?',
      [domain]
    );

    if (existingDomain.length > 0) {
      return res.json({ 
        available: false, 
        error: 'Domain already in use',
        usedBy: existingDomain[0].subdomain
      });
    }

    res.json({ available: true });

  } catch (err) {
    // Error checking domain availability
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /domains/list
 * List all domains (admin only)
 */
router.get('/list', verifyToken, async (req, res) => {
  try {
    // Check if user has manage_system permission (admin only)
    if (!canAccessAll(req)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [domains] = await db.execute(
      `SELECT s.id, s.subdomain, s.custom_domain, s.domain_validation_status,
              s.custom_domain_active, s.domain_validation_expires, s.domain_validation_error,
              u.username
       FROM sites s
       JOIN users u ON s.user_id = u.id
       WHERE s.custom_domain IS NOT NULL
       ORDER BY s.created_at DESC`
    );

    res.json(domains);

  } catch (err) {
    // Error listing domains
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router; 