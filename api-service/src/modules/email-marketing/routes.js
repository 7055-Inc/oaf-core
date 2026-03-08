/**
 * Email Marketing Routes
 * API endpoints for email marketing module
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../auth/middleware');
const { getTemplatesForTier } = require('../../../../lib/crm/emailTemplates');
const db = require('../../../config/db');

// Services
const SubscriberService = require('./services/subscribers');
const TagService = require('./services/tags');
const FormService = require('./services/forms');
const CampaignService = require('./services/campaigns');
const AnalyticsService = require('./services/analytics');

// ============================================
// SUBSCRIBER MANAGEMENT ENDPOINTS
// ============================================

/**
 * 1. GET /api/v2/email-marketing/subscribers
 * List user's subscribers
 */
router.get('/subscribers', requireAuth, async (req, res) => {
  try {
    const result = await SubscriberService.listSubscribers(req.userId, req.query);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('List subscribers error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 2. GET /api/v2/email-marketing/subscribers/:id
 * Get single subscriber
 */
router.get('/subscribers/:id', requireAuth, async (req, res) => {
  try {
    const subscriber = await SubscriberService.getSubscriber(req.userId, req.params.id);
    
    if (!subscriber) {
      return res.status(404).json({ success: false, error: 'Subscriber not found' });
    }
    
    return res.json({ success: true, data: { subscriber } });
  } catch (error) {
    console.error('Get subscriber error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 3. POST /api/v2/email-marketing/subscribers
 * Add subscriber manually
 */
router.post('/subscribers', requireAuth, async (req, res) => {
  try {
    const subscriber = await SubscriberService.addSubscriber(req.userId, req.body);
    return res.json({ success: true, data: { subscriber } });
  } catch (error) {
    console.error('Add subscriber error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 4. PUT /api/v2/email-marketing/subscribers/:id
 * Update subscriber
 */
router.put('/subscribers/:id', requireAuth, async (req, res) => {
  try {
    const subscriber = await SubscriberService.updateSubscriber(req.userId, req.params.id, req.body);
    return res.json({ success: true, data: { subscriber } });
  } catch (error) {
    console.error('Update subscriber error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 5. DELETE /api/v2/email-marketing/subscribers/:id
 * Remove subscriber (unsubscribe)
 */
router.delete('/subscribers/:id', requireAuth, async (req, res) => {
  try {
    const success = await SubscriberService.removeSubscriber(req.userId, req.params.id);
    
    if (!success) {
      return res.status(404).json({ success: false, error: 'Subscriber not found' });
    }
    
    return res.json({ success: true, message: 'Subscriber unsubscribed' });
  } catch (error) {
    console.error('Remove subscriber error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 6. POST /api/v2/email-marketing/subscribers/import
 * CSV import
 */
router.post('/subscribers/import', requireAuth, async (req, res) => {
  try {
    const { csv_data, options } = req.body;
    
    if (!csv_data || !Array.isArray(csv_data)) {
      return res.status(400).json({ success: false, error: 'csv_data array required' });
    }
    
    const result = await SubscriberService.importSubscribers(req.userId, csv_data, options || {});
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Import subscribers error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 7. GET /api/v2/email-marketing/subscribers/export
 * CSV export
 */
router.get('/subscribers/export', requireAuth, async (req, res) => {
  try {
    const data = await SubscriberService.exportSubscribers(req.userId, req.query);
    return res.json({ success: true, data: { subscribers: data } });
  } catch (error) {
    console.error('Export subscribers error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// TAG MANAGEMENT ENDPOINTS
// ============================================

/**
 * 8. GET /api/v2/email-marketing/tags
 * List all unique tags
 */
router.get('/tags', requireAuth, async (req, res) => {
  try {
    const tags = await TagService.getAllTags(req.userId);
    return res.json({ success: true, data: { tags } });
  } catch (error) {
    console.error('Get tags error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 9. GET /api/v2/email-marketing/tags/stats
 * Get tag statistics
 */
router.get('/tags/stats', requireAuth, async (req, res) => {
  try {
    const stats = await TagService.getTagStats(req.userId);
    return res.json({ success: true, data: { tag_stats: stats } });
  } catch (error) {
    console.error('Get tag stats error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 10. POST /api/v2/email-marketing/subscribers/:id/tags
 * Add tags to subscriber
 */
router.post('/subscribers/:id/tags', requireAuth, async (req, res) => {
  try {
    const { tags } = req.body;
    
    if (!tags) {
      return res.status(400).json({ success: false, error: 'tags required' });
    }
    
    const result = await TagService.addTags(req.userId, req.params.id, tags);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Add tags error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 11. DELETE /api/v2/email-marketing/subscribers/:id/tags
 * Remove tags from subscriber
 */
router.delete('/subscribers/:id/tags', requireAuth, async (req, res) => {
  try {
    const { tags } = req.body;
    
    if (!tags) {
      return res.status(400).json({ success: false, error: 'tags required' });
    }
    
    const result = await TagService.removeTags(req.userId, req.params.id, tags);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Remove tags error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 12. POST /api/v2/email-marketing/subscribers/bulk-tag
 * Bulk tag operation
 */
router.post('/subscribers/bulk-tag', requireAuth, async (req, res) => {
  try {
    const { tag, filters } = req.body;
    
    if (!tag) {
      return res.status(400).json({ success: false, error: 'tag required' });
    }
    
    const result = await TagService.bulkTag(req.userId, tag, filters || {});
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Bulk tag error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// FORM MANAGEMENT ENDPOINTS
// ============================================

/**
 * 13. GET /api/v2/email-marketing/forms
 * List user's forms
 */
router.get('/forms', requireAuth, async (req, res) => {
  try {
    const forms = await FormService.listForms(req.userId, req.query);
    return res.json({ success: true, data: { forms } });
  } catch (error) {
    console.error('List forms error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 14. GET /api/v2/email-marketing/forms/:id
 * Get single form
 */
router.get('/forms/:id', requireAuth, async (req, res) => {
  try {
    const form = await FormService.getForm(req.userId, req.params.id);
    
    if (!form) {
      return res.status(404).json({ success: false, error: 'Form not found' });
    }
    
    return res.json({ success: true, data: { form } });
  } catch (error) {
    console.error('Get form error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 15. POST /api/v2/email-marketing/forms
 * Create form
 */
router.post('/forms', requireAuth, async (req, res) => {
  try {
    const form = await FormService.createForm(req.userId, req.body);
    return res.json({ success: true, data: { form } });
  } catch (error) {
    console.error('Create form error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 16. PUT /api/v2/email-marketing/forms/:id
 * Update form
 */
router.put('/forms/:id', requireAuth, async (req, res) => {
  try {
    const form = await FormService.updateForm(req.userId, req.params.id, req.body);
    return res.json({ success: true, data: { form } });
  } catch (error) {
    console.error('Update form error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 17. DELETE /api/v2/email-marketing/forms/:id
 * Delete form
 */
router.delete('/forms/:id', requireAuth, async (req, res) => {
  try {
    const success = await FormService.deleteForm(req.userId, req.params.id);
    
    if (!success) {
      return res.status(404).json({ success: false, error: 'Form not found' });
    }
    
    return res.json({ success: true, message: 'Form deleted' });
  } catch (error) {
    console.error('Delete form error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 18. GET /api/v2/email-marketing/forms/:id/embed-code
 * Generate embed code
 */
router.get('/forms/:id/embed-code', requireAuth, async (req, res) => {
  try {
    const apiBaseUrl = process.env.API_BASE_URL || 'https://staging-api.brakebee.com';
    const embedCode = await FormService.getEmbedCode(req.params.id, apiBaseUrl);
    return res.json({ success: true, data: embedCode });
  } catch (error) {
    console.error('Get embed code error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 19. POST /api/v2/email-marketing/public/subscribe/:formId
 * Public form submission (NO AUTH)
 */
router.post('/public/subscribe/:formId', async (req, res) => {
  try {
    const result = await FormService.handlePublicSubmission(req.params.formId, req.body);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error('Public subscription error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// CAMPAIGN MANAGEMENT ENDPOINTS
// ============================================

/**
 * 20. GET /api/v2/email-marketing/campaigns
 * List user's campaigns
 */
router.get('/campaigns', requireAuth, async (req, res) => {
  try {
    const campaigns = await CampaignService.listCampaigns(req.userId, req.query);
    return res.json({ success: true, data: { campaigns } });
  } catch (error) {
    console.error('List campaigns error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 20b. GET /api/v2/email-marketing/templates
 * List CRM email templates available for user's tier (tier-based)
 */
router.get('/templates', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT tier FROM user_subscriptions
       WHERE user_id = ? AND subscription_type = 'crm' AND status = 'active'
       LIMIT 1`,
      [req.userId]
    );
    const tier = rows[0]?.tier || 'free';
    const templates = getTemplatesForTier(tier);
    return res.json({ success: true, data: { templates, tier } });
  } catch (error) {
    console.error('List templates error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 21. POST /api/v2/email-marketing/campaigns/single-blast
 * Create single blast campaign
 */
router.post('/campaigns/single-blast', requireAuth, async (req, res) => {
  try {
    const campaign = await CampaignService.createSingleBlast(req.userId, req.body);
    return res.json({ success: true, data: { campaign } });
  } catch (error) {
    console.error('Create campaign error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 22. PUT /api/v2/email-marketing/campaigns/:id/schedule
 * Schedule campaign send
 */
router.put('/campaigns/:id/schedule', requireAuth, async (req, res) => {
  try {
    const scheduledAt = req.body.scheduled_at || req.body.scheduled_send_at;
    
    if (!scheduledAt) {
      return res.status(400).json({ success: false, error: 'scheduled_at or scheduled_send_at required' });
    }
    
    const campaign = await CampaignService.scheduleCampaign(req.userId, req.params.id, scheduledAt);
    return res.json({ success: true, data: { campaign } });
  } catch (error) {
    console.error('Schedule campaign error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 23. POST /api/v2/email-marketing/campaigns/:id/send-now
 * Send campaign immediately
 */
router.post('/campaigns/:id/send-now', requireAuth, async (req, res) => {
  try {
    const result = await CampaignService.sendNow(req.userId, req.params.id);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Send campaign error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 24. GET /api/v2/email-marketing/campaigns/:id/recipients
 * Preview campaign recipients
 */
router.get('/campaigns/:id/recipients', requireAuth, async (req, res) => {
  try {
    const recipients = await CampaignService.getRecipients(req.userId, req.params.id);
    return res.json({ success: true, data: { recipients, count: recipients.length } });
  } catch (error) {
    console.error('Get recipients error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 25. POST /api/v2/email-marketing/campaigns/:id/cancel
 * Cancel scheduled campaign
 */
router.post('/campaigns/:id/cancel', requireAuth, async (req, res) => {
  try {
    const campaign = await CampaignService.cancelCampaign(req.userId, req.params.id);
    return res.json({ success: true, data: { campaign } });
  } catch (error) {
    console.error('Cancel campaign error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// ANALYTICS ENDPOINTS
// ============================================

/**
 * 26. GET /api/v2/email-marketing/analytics/overview
 * Get overview analytics
 */
router.get('/analytics/overview', requireAuth, async (req, res) => {
  try {
    const overview = await AnalyticsService.getOverview(req.userId);
    return res.json({ success: true, data: overview });
  } catch (error) {
    console.error('Get overview error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 27. GET /api/v2/email-marketing/analytics/campaigns/:id
 * Get campaign-specific analytics
 */
router.get('/analytics/campaigns/:id', requireAuth, async (req, res) => {
  try {
    const analytics = await AnalyticsService.getCampaignAnalytics(req.userId, req.params.id);
    return res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Get campaign analytics error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 28. GET /api/v2/email-marketing/analytics/list-growth
 * Get list growth over time
 */
router.get('/analytics/list-growth', requireAuth, async (req, res) => {
  try {
    const growth = await AnalyticsService.getListGrowth(req.userId, req.query);
    return res.json({ success: true, data: { growth } });
  } catch (error) {
    console.error('Get list growth error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 29. GET /api/v2/email-marketing/analytics/engagement
 * Get top engaged subscribers
 */
router.get('/analytics/engagement', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const subscribers = await AnalyticsService.getTopEngaged(req.userId, limit);
    return res.json({ success: true, data: { subscribers } });
  } catch (error) {
    console.error('Get engagement error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// WEBHOOK ENDPOINTS (for email service callbacks)
// ============================================

/**
 * 30. POST /api/v2/email-marketing/webhooks/email/open
 * Track email open
 */
router.post('/webhooks/email/open', async (req, res) => {
  try {
    const { analytics_id, ...trackingData } = req.body;
    
    if (!analytics_id) {
      return res.status(400).json({ success: false, error: 'analytics_id required' });
    }
    
    await AnalyticsService.trackOpen(analytics_id, trackingData);
    return res.json({ success: true });
  } catch (error) {
    console.error('Track open error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 31. POST /api/v2/email-marketing/webhooks/email/click
 * Track link click
 */
router.post('/webhooks/email/click', async (req, res) => {
  try {
    const { analytics_id, ...trackingData } = req.body;
    
    if (!analytics_id) {
      return res.status(400).json({ success: false, error: 'analytics_id required' });
    }
    
    await AnalyticsService.trackClick(analytics_id, trackingData);
    return res.json({ success: true });
  } catch (error) {
    console.error('Track click error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 32. POST /api/v2/email-marketing/webhooks/email/bounce
 * Track email bounce
 */
router.post('/webhooks/email/bounce', async (req, res) => {
  try {
    const { analytics_id, ...bounceData } = req.body;
    
    if (!analytics_id) {
      return res.status(400).json({ success: false, error: 'analytics_id required' });
    }
    
    await AnalyticsService.trackBounce(analytics_id, bounceData);
    return res.json({ success: true });
  } catch (error) {
    console.error('Track bounce error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 33. POST /api/v2/email-marketing/webhooks/email/spam
 * Track spam complaint
 */
router.post('/webhooks/email/spam', async (req, res) => {
  try {
    const { analytics_id } = req.body;
    
    if (!analytics_id) {
      return res.status(400).json({ success: false, error: 'analytics_id required' });
    }
    
    await AnalyticsService.trackSpam(analytics_id);
    return res.json({ success: true });
  } catch (error) {
    console.error('Track spam error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
