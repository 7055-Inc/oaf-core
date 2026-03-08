/**
 * Websites module - v2 API routes
 * Mounted at /api/v2/websites
 * 
 * Complete replacement for legacy:
 * - /api/sites
 * - /api/domains
 * - /api/subscriptions/websites
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission, requireRole } = require('../auth/middleware');
const sitesService = require('./services/sites');
const subscriptionService = require('./services/subscription');
const domainsService = require('./services/domains');

function handleError(res, err) {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json(status === 500 ? { success: false, error: message } : { error: message });
}

// ============================================================================
// PUBLIC ROUTES (no auth required)
// ============================================================================

// Resolve subdomain to site data
router.get('/resolve/:subdomain', async (req, res) => {
  try {
    const data = await sitesService.resolveSubdomain(req.params.subdomain);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

// Get products for a site (public storefront)
router.get('/resolve/:subdomain/products', async (req, res) => {
  try {
    const products = await sitesService.resolveSubdomainProducts(req.params.subdomain, req.query);
    res.json(products);
  } catch (err) {
    handleError(res, err);
  }
});

// Get articles for a site (public storefront)
router.get('/resolve/:subdomain/articles', async (req, res) => {
  try {
    const articles = await sitesService.resolveSubdomainArticles(req.params.subdomain, req.query);
    res.json(articles);
  } catch (err) {
    handleError(res, err);
  }
});

// Get user categories for a site (public storefront)
router.get('/resolve/:subdomain/categories', async (req, res) => {
  try {
    const categories = await sitesService.resolveSubdomainCategories(req.params.subdomain);
    res.json(categories);
  } catch (err) {
    handleError(res, err);
  }
});

// Get social media links for a site (public storefront)
router.get('/resolve/:subdomain/socials', async (req, res) => {
  try {
    const socials = await sitesService.resolveSubdomainSocials(req.params.subdomain);
    res.json(socials);
  } catch (err) {
    handleError(res, err);
  }
});

// Get clipped note for a site (public storefront)
router.get('/resolve/:subdomain/clipped-note', async (req, res) => {
  try {
    const note = await sitesService.resolveSubdomainClippedNote(req.params.subdomain);
    res.json(note);
  } catch (err) {
    handleError(res, err);
  }
});

// Check subdomain availability (public)
router.get('/check-subdomain/:subdomain', async (req, res) => {
  try {
    const result = await sitesService.checkSubdomainAvailability(req.params.subdomain);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// Resolve custom domain to site (public)
router.get('/resolve-custom-domain/:domain', async (req, res) => {
  try {
    const result = await sitesService.resolveCustomDomain(req.params.domain);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// Get site addons (PUBLIC - for artist storefronts)
router.get('/sites/:id/addons', async (req, res) => {
  try {
    const result = await sitesService.getSiteAddonsPublic(req.params.id);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// Contact form submission (PUBLIC - rate-limited)
const rateLimit = require('express-rate-limit');
const contactFormLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests, please try again later.' } },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/addons/contact/submit', contactFormLimit, async (req, res) => {
  try {
    const db = require('../../../config/db');
    const { siteId, name, email, phone, message } = req.body;

    if (!name || !email || !message || !siteId) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing required fields: name, email, message, siteId' } });
    }
    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 100) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Name is required and must be less than 100 characters' } });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Please provide a valid email address' } });
    }
    if (phone && (typeof phone !== 'string' || phone.length > 20)) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Phone number must be less than 20 characters' } });
    }
    if (typeof message !== 'string' || message.trim().length < 10 || message.length > 2000) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Message must be between 10 and 2000 characters' } });
    }

    const sanitizedName = name.trim();
    const sanitizedEmail = email.toLowerCase().trim();
    const sanitizedPhone = phone ? phone.trim() : null;
    const sanitizedMessage = message.trim();

    const [siteResult] = await db.execute(
      'SELECT id, user_id, site_name, subdomain, custom_domain FROM sites WHERE id = ? AND status = "active"', [siteId]
    );
    if (siteResult.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Site not found' } });
    }
    const site = siteResult[0];

    const [addonResult] = await db.execute(
      `SELECT sa.* FROM site_addons sa JOIN website_addons wa ON sa.addon_id = wa.id WHERE sa.site_id = ? AND wa.addon_slug = 'contact-form' AND sa.is_active = 1`, [siteId]
    );
    if (addonResult.length === 0) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Contact form not available for this site' } });
    }

    await db.execute(
      `INSERT INTO contact_submissions (site_id, sender_name, sender_email, sender_phone, message, ip_address, user_agent, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [parseInt(siteId), sanitizedName, sanitizedEmail, sanitizedPhone, sanitizedMessage, req.ip, req.get('User-Agent') || null]
    );

    try {
      const EmailService = require('../../services/emailService');
      const emailSvc = new EmailService();
      await emailSvc.sendEmail(site.user_id, 'contact_form_notification', {
        sender_name: sanitizedName,
        sender_email: sanitizedEmail,
        sender_phone: sanitizedPhone || 'Not provided',
        message: sanitizedMessage,
        timestamp: new Date().toLocaleString(),
        site_name: site.site_name || 'Artist Site',
        site_url: site.custom_domain ? `https://${site.custom_domain}` : `https://${site.subdomain}.${(process.env.FRONTEND_URL || '').replace('https://', '') || 'brakebee.com'}`,
        siteId: parseInt(siteId)
      }, { replyTo: sanitizedEmail });
    } catch (emailError) {
      console.error('Contact form email notification failed (non-fatal):', emailError);
    }

    res.json({ success: true, data: { message: 'Your message has been sent successfully' } });
  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message } });
  }
});

// ============================================================================
// SITES (authenticated)
// ============================================================================

router.get('/sites/me', requireAuth, async (req, res) => {
  try {
    const sites = await sitesService.getMySites(req.userId);
    res.json(sites);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/sites/all', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const sites = await sitesService.getAllSites(req.userId);
    res.json(sites);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/sites', requireAuth, async (req, res) => {
  try {
    const site = await sitesService.createSite(req.userId, req.body);
    res.status(201).json(site);
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/sites/:id', requireAuth, async (req, res) => {
  try {
    const site = await sitesService.updateSite(req.userId, req.params.id, req.body);
    res.json(site);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/sites/:id', requireAuth, async (req, res) => {
  try {
    const result = await sitesService.deleteSite(req.userId, req.params.id);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/sites/:id/customizations', requireAuth, requirePermission('sites'), async (req, res) => {
  try {
    const customizations = await sitesService.getSiteCustomizations(req.userId, req.params.id);
    res.json({ success: true, customizations });
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/sites/:id/customizations', requireAuth, requirePermission('sites'), async (req, res) => {
  try {
    const customizations = await sitesService.updateSiteCustomizations(req.userId, req.params.id, req.body);
    res.json({ success: true, message: 'Customizations updated successfully', customizations });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/enforce-limits', requireAuth, async (req, res) => {
  try {
    const result = await sitesService.enforceLimits(req.userId);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// TEMPLATES
// ============================================================================

router.get('/templates', requireAuth, async (req, res) => {
  try {
    const templates = await sitesService.getTemplates();
    res.json({ success: true, templates });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/templates/:id', requireAuth, async (req, res) => {
  try {
    const template = await sitesService.getTemplate(req.params.id);
    res.json({ success: true, template });
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/template/:id', requireAuth, requirePermission('manage_sites'), async (req, res) => {
  try {
    const result = await sitesService.applyTemplate(req.userId, req.params.id);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/templates', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await sitesService.createTemplate(req.userId, req.body);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// TEMPLATE-SPECIFIC DATA
// ============================================================================

// Get template schema (PUBLIC - no auth required)
// Returns schema.json for a template
router.get('/templates/:templateId/schema', async (req, res) => {
  try {
    const schema = await sitesService.getTemplateSchema(parseInt(req.params.templateId));
    res.json({ success: true, data: schema });
  } catch (err) {
    handleError(res, err);
  }
});

// Get template-specific data for a site
// Returns template-specific field values for site's current template
router.get('/sites/:siteId/template-data', requireAuth, async (req, res) => {
  try {
    const siteId = parseInt(req.params.siteId);
    
    // Verify site ownership
    const [site] = await require('../../../config/db').query(
      'SELECT user_id, template_id FROM sites WHERE id = ?',
      [siteId]
    );
    
    if (!site[0]) {
      return res.status(404).json({ success: false, error: 'Site not found' });
    }
    
    // Check authorization
    const [user] = await require('../../../config/db').query(
      'SELECT user_type FROM users WHERE id = ?',
      [req.userId]
    );
    
    if (site[0].user_id !== req.userId && user[0]?.user_type !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // Get template data for site's current template
    if (!site[0].template_id) {
      return res.json({ success: true, data: {} });
    }
    
    const templateData = await sitesService.getTemplateDataForSite(siteId, site[0].template_id);
    res.json({ success: true, data: templateData });
  } catch (err) {
    handleError(res, err);
  }
});

// Get clipped note for a site (authenticated)
router.get('/sites/:siteId/clipped-note', requireAuth, async (req, res) => {
  try {
    const note = await sitesService.getSiteClippedNote(req.userId, req.params.siteId);
    res.json({ success: true, data: note });
  } catch (err) {
    handleError(res, err);
  }
});

// Create or update clipped note for a site
router.put('/sites/:siteId/clipped-note', requireAuth, async (req, res) => {
  try {
    const note = await sitesService.updateSiteClippedNote(req.userId, req.params.siteId, req.body);
    res.json({ success: true, data: note });
  } catch (err) {
    handleError(res, err);
  }
});

// Update template-specific data for a site
// Saves template-specific field values (validates against schema)
router.put('/sites/:siteId/template-data', requireAuth, async (req, res) => {
  try {
    const siteId = parseInt(req.params.siteId);
    
    // Verify site ownership and get template_id
    const [site] = await require('../../../config/db').query(
      'SELECT user_id, template_id FROM sites WHERE id = ?',
      [siteId]
    );
    
    if (!site[0]) {
      return res.status(404).json({ success: false, error: 'Site not found' });
    }
    
    // Check authorization
    const [user] = await require('../../../config/db').query(
      'SELECT user_type FROM users WHERE id = ?',
      [req.userId]
    );
    
    if (site[0].user_id !== req.userId && user[0]?.user_type !== 'admin') {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    
    // Site must have a template assigned
    if (!site[0].template_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Site does not have a template assigned' 
      });
    }
    
    // Update template data (validates against schema, checks tier requirements)
    const result = await sitesService.updateTemplateDataForSite(
      siteId, 
      site[0].template_id, 
      req.body
    );
    
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// ADDONS
// ============================================================================

router.get('/addons', requireAuth, async (req, res) => {
  try {
    const addons = await sitesService.getAddons(req.userId);
    res.json({ success: true, addons });
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/my-addons', requireAuth, requirePermission('manage_sites'), async (req, res) => {
  try {
    const addons = await sitesService.getMySiteAddons(req.userId);
    res.json({ success: true, addons });
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/addons/:id', requireAuth, requirePermission('manage_sites'), async (req, res) => {
  try {
    // Get user's site first
    const sites = await sitesService.getMySites(req.userId);
    if (!sites || sites.length === 0) {
      return res.status(404).json({ error: 'No site found' });
    }
    const result = await sitesService.enableSiteAddon(req.userId, sites[0].id, req.params.id);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/addons/:id', requireAuth, requirePermission('manage_sites'), async (req, res) => {
  try {
    const sites = await sitesService.getMySites(req.userId);
    if (!sites || sites.length === 0) {
      return res.status(404).json({ error: 'No site found' });
    }
    const result = await sitesService.disableSiteAddon(req.userId, sites[0].id, req.params.id);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// Site-specific addon routes (for multiple sites)
router.post('/sites/:siteId/addons/:addonId', requireAuth, requirePermission('manage_sites'), async (req, res) => {
  try {
    const result = await sitesService.enableSiteAddon(req.userId, req.params.siteId, req.params.addonId);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/sites/:siteId/addons/:addonId', requireAuth, requirePermission('manage_sites'), async (req, res) => {
  try {
    const result = await sitesService.disableSiteAddon(req.userId, req.params.siteId, req.params.addonId);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// User-level addons
router.post('/user-addons/:addonId', requireAuth, async (req, res) => {
  try {
    const result = await sitesService.enableUserAddon(req.userId, req.params.addonId);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/user-addons/:addonId', requireAuth, async (req, res) => {
  try {
    const result = await sitesService.disableUserAddon(req.userId, req.params.addonId);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// Admin create addon
router.post('/addons', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await sitesService.createAddon(req.userId, req.body);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// USER CATEGORIES
// ============================================================================

router.get('/categories', requireAuth, async (req, res) => {
  try {
    const categories = await sitesService.getUserCategories(req.userId);
    res.json(categories);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/categories', requireAuth, async (req, res) => {
  try {
    const category = await sitesService.createUserCategory(req.userId, req.body);
    res.status(201).json(category);
  } catch (err) {
    handleError(res, err);
  }
});

router.put('/categories/:id', requireAuth, async (req, res) => {
  try {
    const category = await sitesService.updateUserCategory(req.userId, req.params.id, req.body);
    res.json(category);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/categories/:id', requireAuth, async (req, res) => {
  try {
    const result = await sitesService.deleteUserCategory(req.userId, req.params.id);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// Get categories as hierarchical tree
router.get('/categories/tree', requireAuth, async (req, res) => {
  try {
    const tree = await sitesService.getUserCategoriesTree(req.userId);
    res.json({ success: true, categories: tree });
  } catch (err) {
    handleError(res, err);
  }
});

// Reorder categories
router.put('/categories/reorder', requireAuth, async (req, res) => {
  try {
    const result = await sitesService.reorderCategories(req.userId, req.body.categories);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// Get categories for a specific site (filtered by visibility)
router.get('/sites/:siteId/categories', requireAuth, async (req, res) => {
  try {
    const categories = await sitesService.getSiteCategories(req.params.siteId);
    res.json({ success: true, categories });
  } catch (err) {
    handleError(res, err);
  }
});

// Update category visibility for a specific site
router.put('/sites/:siteId/categories/visibility', requireAuth, async (req, res) => {
  try {
    const result = await sitesService.updateSiteCategoryVisibility(
      req.userId, 
      req.params.siteId, 
      req.body.visibility
    );
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// DISCOUNTS
// ============================================================================

router.get('/discounts/calculate', requireAuth, async (req, res) => {
  try {
    const result = await sitesService.calculateDiscounts(req.userId, req.query.subscription_type);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/discounts', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await sitesService.createDiscount(req.userId, req.body);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/discounts/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await sitesService.deleteDiscount(req.params.id);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// SUBSCRIPTION
// ============================================================================

router.get('/subscription/my', requireAuth, async (req, res) => {
  try {
    const data = await subscriptionService.getMySubscription(req.userId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/subscription/status', requireAuth, async (req, res) => {
  try {
    const data = await subscriptionService.getSubscriptionStatus(req.userId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/subscription/select-tier', requireAuth, async (req, res) => {
  try {
    const result = await subscriptionService.selectTier(req.userId, req.body);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/subscription/terms-check', requireAuth, async (req, res) => {
  try {
    const result = await subscriptionService.getTermsCheck(req.userId);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/subscription/terms-accept', requireAuth, async (req, res) => {
  try {
    const result = await subscriptionService.acceptTerms(req.userId, req.body.terms_version_id);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/subscription/change-tier', requireAuth, async (req, res) => {
  try {
    const result = await subscriptionService.changeTier(req.userId, req.body);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/subscription/confirm-tier-change', requireAuth, async (req, res) => {
  try {
    const result = await subscriptionService.confirmTierChange(req.userId, req.body);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/subscription/cancel', requireAuth, async (req, res) => {
  try {
    const result = await subscriptionService.cancelSubscription(req.userId, req.body);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/subscription/confirm-cancellation', requireAuth, async (req, res) => {
  try {
    const result = await subscriptionService.confirmCancellation(req.userId, req.body);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

// ============================================================================
// DOMAINS
// ============================================================================

router.get('/domains/status/:siteId', requireAuth, async (req, res) => {
  try {
    const data = await domainsService.getStatus(req.userId, req.params.siteId);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/domains/check-availability', requireAuth, async (req, res) => {
  try {
    const domain = req.query.domain;
    const data = await domainsService.checkAvailability(req.userId, domain);
    res.json(data);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/domains/start-validation', requireAuth, async (req, res) => {
  try {
    const { siteId, customDomain } = req.body;
    const result = await domainsService.startValidation(req.userId, siteId, customDomain);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/domains/retry-validation/:siteId', requireAuth, async (req, res) => {
  try {
    const result = await domainsService.retryValidation(req.userId, req.params.siteId);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.post('/domains/cancel-validation/:siteId', requireAuth, async (req, res) => {
  try {
    const result = await domainsService.cancelValidation(req.userId, req.params.siteId);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.delete('/domains/remove/:siteId', requireAuth, async (req, res) => {
  try {
    const result = await domainsService.remove(req.userId, req.params.siteId);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
});

router.get('/domains/list', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const domains = await domainsService.listAllDomains();
    res.json(domains);
  } catch (err) {
    handleError(res, err);
  }
});

module.exports = router;
