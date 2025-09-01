const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const rateLimit = require('express-rate-limit');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');
const EmailService = require('../services/emailService');

const emailService = new EmailService();

// Rate limiting for addon API endpoints
const addonRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: {
    error: 'Too many addon requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================================================
// MASTER ADDON ENDPOINT
// ============================================================================

/**
 * GET /api/addons/sites/:id/addons
 * Get active addons for a site - MASTER ENDPOINT that triggers all addon functionality
 */
router.get('/sites/:id/addons', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get active addons for this site
    const [addons] = await db.execute(`
      SELECT sa.*, wa.addon_name, wa.addon_slug, wa.addon_script_path, wa.tier_required, wa.monthly_price
      FROM site_addons sa 
      JOIN website_addons wa ON sa.addon_id = wa.id 
      WHERE sa.site_id = ? AND sa.is_active = 1 AND wa.is_active = 1
      ORDER BY wa.display_order ASC
    `, [id]);

    res.json(addons);

  } catch (error) {
    console.error('Error fetching site addons:', error);
    res.status(500).json({ error: 'Failed to fetch site addons' });
  }
});

// ============================================================================
// CONTACT FORM ADDON
// ============================================================================

// Helper function for email validation
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * POST /api/addons/contact/submit
 * Submit a contact form message
 */
router.post('/contact/submit', addonRateLimit, async (req, res) => {
  try {
    const { siteId, name, email, phone, message } = req.body;

    // Manual validation following existing codebase patterns
    if (!name || !email || !message || !siteId) {
      return res.status(400).json({ error: 'Missing required fields: name, email, message, siteId' });
    }

    // Validate field lengths and formats
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
      return res.status(400).json({ error: 'Name is required and must be less than 100 characters' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    if (phone && (typeof phone !== 'string' || phone.length > 20)) {
      return res.status(400).json({ error: 'Phone number must be less than 20 characters' });
    }

    if (typeof message !== 'string' || message.trim().length < 10 || message.length > 2000) {
      return res.status(400).json({ error: 'Message must be between 10 and 2000 characters' });
    }

    if (!Number.isInteger(parseInt(siteId)) || parseInt(siteId) < 1) {
      return res.status(400).json({ error: 'Valid site ID is required' });
    }

    // Sanitize inputs
    const sanitizedName = name.trim();
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedPhone = phone ? phone.trim() : null;
    const sanitizedMessage = message.trim();
    
    // Verify the site exists
    const [siteResult] = await db.execute(
      'SELECT id, user_id, site_name, subdomain, custom_domain FROM sites WHERE id = ? AND status = "active"',
      [siteId]
    );

    if (siteResult.length === 0) {
      return res.status(404).json({ error: 'Site not found' });
    }

    const site = siteResult[0];

    // Check if the site has the contact form addon enabled
    const [addonResult] = await db.execute(
      `SELECT sa.*, wa.addon_name 
       FROM site_addons sa 
       JOIN website_addons wa ON sa.addon_id = wa.id 
       WHERE sa.site_id = ? AND wa.addon_slug = 'contact-form' AND sa.is_active = 1`,
      [siteId]
    );

    if (addonResult.length === 0) {
      return res.status(403).json({ error: 'Contact form not available for this site' });
    }

    // Store the contact form submission
    const [insertResult] = await db.execute(
      `INSERT INTO contact_submissions 
       (site_id, sender_name, sender_email, sender_phone, message, ip_address, user_agent, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        parseInt(siteId),
        sanitizedName,
        sanitizedEmail,
        sanitizedPhone,
        sanitizedMessage,
        req.ip,
        req.get('User-Agent') || null
      ]
    );

    const submissionId = insertResult.insertId;

    // Send email notification to site owner using proper template system
    try {
      // Find the site owner's user ID
      const [ownerResult] = await db.execute(
        'SELECT id FROM users WHERE id = ?',
        [site.user_id]
      );

      if (ownerResult.length > 0) {
        const templateData = {
          sender_name: sanitizedName,
          sender_email: sanitizedEmail,
          sender_phone: sanitizedPhone || 'Not provided',
          message: sanitizedMessage,
          timestamp: new Date().toLocaleString(),
          site_name: site.site_name || `${site.first_name} ${site.last_name}'s Site`,
          site_url: site.custom_domain 
            ? `https://${site.custom_domain}` 
            : `https://${site.subdomain}.onlineartfestival.com`,
          siteId: parseInt(siteId) // Pass siteId for artist layout data
        };

        // Send email immediately (contact forms are transactional)
        await emailService.sendEmail(
          site.user_id, 
          'contact_form_notification', 
          templateData,
          {
            replyTo: sanitizedEmail // Allow direct reply to the sender
          }
        );
      }
    } catch (emailError) {
      console.error('Failed to send contact form notification:', emailError);
      // Don't fail the request if email fails - the submission is still recorded
    }

    res.json({
      success: true,
      message: 'Your message has been sent successfully'
    });

  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({
      error: 'Failed to submit contact form'
    });
  }
});

// ============================================================================
// EMAIL COLLECTION ADDON (placeholder for future implementation)
// ============================================================================

/**
 * POST /api/addons/email-collection/subscribe
 * Subscribe to newsletter
 */
router.post('/email-collection/subscribe', addonRateLimit, async (req, res) => {
  // TODO: Implement email collection functionality
  res.status(501).json({ error: 'Email collection addon not yet implemented' });
});

// ============================================================================
// SOCIAL POSTING ADDON (placeholder for future implementation)
// ============================================================================

/**
 * POST /api/addons/social-posting/connect
 * Connect social media account
 */
router.post('/social-posting/connect', addonRateLimit, async (req, res) => {
  // TODO: Implement social posting functionality
  res.status(501).json({ error: 'Social posting addon not yet implemented' });
});



module.exports = router;
