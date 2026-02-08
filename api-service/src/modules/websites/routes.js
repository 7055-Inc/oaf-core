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
