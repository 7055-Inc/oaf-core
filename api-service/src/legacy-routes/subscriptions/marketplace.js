const express = require('express');
const router = express.Router();
const db = require('../../../config/db');
const verifyToken = require('../../middleware/jwt');

/**
 * @fileoverview Marketplace subscription management routes
 * 
 * Handles marketplace subscription functionality including:
 * - Terms and conditions acceptance tracking
 * - Latest terms version retrieval
 * - User terms acceptance verification
 * - Terms acceptance recording with duplicate protection
 * 
 * @author Beemeeart Development Team
 * @version 1.0.0
 */

// ============================================================================
// MARKETPLACE SUBSCRIPTION ROUTES
// ============================================================================
// All routes for marketplace subscription management
// Modular approach - all marketplace subscription logic contained here

/**
 * Check if user has accepted the latest marketplace terms
 * @route GET /api/subscriptions/marketplace/terms-check
 * @access Private
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Terms acceptance status and latest terms details
 */
router.get('/terms-check', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    
    // Get latest marketplace terms version
    const [latestTerms] = await db.execute(`
      SELECT id, title, content, version, created_at
      FROM terms_versions 
      WHERE subscription_type = 'marketplace' AND is_current = 1
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (latestTerms.length === 0) {
      return res.status(404).json({ error: 'No marketplace terms found' });
    }

    const terms = latestTerms[0];

    // Check if user has accepted these terms
    const [acceptance] = await db.execute(`
      SELECT id, accepted_at
      FROM user_terms_acceptance 
      WHERE user_id = ? AND subscription_type = 'marketplace' AND terms_version_id = ?
    `, [userId, terms.id]);

    const termsAccepted = acceptance.length > 0;

    res.json({
      success: true,
      termsAccepted,
      latestTerms: {
        id: terms.id,
        title: terms.title,
        content: terms.content,
        version: terms.version,
        created_at: terms.created_at
      }
    });

  } catch (error) {
    console.error('Error checking marketplace terms acceptance:', error);
    res.status(500).json({ error: 'Failed to check terms acceptance' });
  }
});

/**
 * Record user acceptance of marketplace terms
 * @route POST /api/subscriptions/marketplace/terms-accept
 * @access Private
 * @param {Object} req - Express request object
 * @param {number} req.body.terms_version_id - ID of the terms version being accepted
 * @param {Object} res - Express response object
 * @returns {Object} Confirmation of terms acceptance recording
 */
router.post('/terms-accept', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { terms_version_id } = req.body;

    if (!terms_version_id) {
      return res.status(400).json({ error: 'terms_version_id is required' });
    }

    // Verify the terms version exists and is for marketplace
    const [termsCheck] = await db.execute(`
      SELECT id FROM terms_versions 
      WHERE id = ? AND subscription_type = 'marketplace'
    `, [terms_version_id]);

    if (termsCheck.length === 0) {
      return res.status(404).json({ error: 'Invalid terms version' });
    }

    // Record acceptance (INSERT IGNORE to handle duplicate attempts)
    await db.execute(`
      INSERT IGNORE INTO user_terms_acceptance (user_id, subscription_type, terms_version_id, accepted_at)
      VALUES (?, 'marketplace', ?, NOW())
    `, [userId, terms_version_id]);

    res.json({
      success: true,
      message: 'Terms acceptance recorded successfully'
    });

  } catch (error) {
    console.error('Error recording marketplace terms acceptance:', error);
    res.status(500).json({ error: 'Failed to record terms acceptance' });
  }
});


module.exports = router;
