/**
 * Marketing API Routes
 * 
 * Endpoints for marketing automation system
 * Mounted at /api/v2/marketing/*
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../../../config/db');
const sharedUpload = require('../../config/multer');
const { getProcessedMediaUrls } = require('../../utils/mediaUtils');
const { uploadLimiter } = require('../shared/middleware/rateLimiter');
const { decrypt } = require('../../utils/encryption');

// Helper: resolve admin status from req (the auth middleware sets req.roles as an array)
function _isAdmin(req) {
  if (req.user?.role === 'admin' || req.user?.role === 'super_admin') return true;
  if (Array.isArray(req.roles) && (req.roles.includes('admin') || req.roles.includes('super_admin'))) return true;
  return false;
}
// Normalize: some routes use _uid(req), but the auth middleware sets req.userId
function _uid(req) { return req.userId || req.user?.userId || req.user?.id; }
const { verifyToken } = require('../auth/middleware');
const { 
  requireAuth, 
  requireAdmin, 
  canAccessCampaign,
  canModifyContent 
} = require('./middleware/marketingAuth');

const {
  CampaignService,
  ContentService,
  ApprovalService,
  SchedulerService,
  AnalyticsService,
  AssetService,
  OAuthService,
  getVideoService,
  getCaptionService,
  getAutoClipService,
  getVideoTemplateService
} = require('./services');

// Use the shared multer config (proper directories, naming, and file type handling)
const upload = sharedUpload;

// ============================================================================
// SOCIAL SUBSCRIPTION ROUTES (ChecklistController-compatible)
// ============================================================================

const { getUserSocialTier } = require('./utils/tierEnforcement');
const { getAllSocialTiersForDisplay, getSocialTierForDisplay } = require('../../../../lib/social-central/tierConfig');
const stripeService = require('../../services/stripeService');

/**
 * GET /api/v2/marketing/subscription/my
 * Returns the ChecklistController-compatible shape:
 *   { subscription: { id, status, tier, tierPrice, termsAccepted, cardLast4, application_status }, has_permission }
 */
router.get('/subscription/my', requireAuth, async (req, res) => {
  try {
    const userId = _uid(req);

    // 1. Get subscription record
    const [subscriptions] = await db.query(
      `SELECT id, status, tier, tier_price, stripe_customer_id, created_at
       FROM user_subscriptions WHERE user_id = ? AND subscription_type = 'social' LIMIT 1`,
      [userId]
    );
    const subscription = subscriptions[0] || null;

    // 2. Check terms acceptance
    const [termsCheck] = await db.query(
      `SELECT uta.id FROM user_terms_acceptance uta
       JOIN terms_versions tv ON uta.terms_version_id = tv.id
       WHERE uta.user_id = ? AND uta.subscription_type = 'social' AND tv.is_current = 1
       LIMIT 1`,
      [userId]
    );
    const termsAccepted = termsCheck.length > 0;

    // 3. Check card on file
    let cardLast4 = null;
    const cust = subscription?.stripe_customer_id ||
      (await db.query(
        'SELECT stripe_customer_id FROM user_subscriptions WHERE user_id = ? AND stripe_customer_id IS NOT NULL LIMIT 1',
        [userId]
      ))[0]?.[0]?.stripe_customer_id;
    if (cust) {
      try {
        const pm = await stripeService.stripe.paymentMethods.list({
          customer: cust, type: 'card', limit: 1
        });
        if (pm.data.length > 0) cardLast4 = pm.data[0].card.last4;
      } catch (e) { console.error('Error fetching payment method:', e.message); }
    }

    // 4. Check permission
    const [perms] = await db.query('SELECT leo_social FROM user_permissions WHERE user_id = ?', [userId]);
    let hasPermission = perms.length > 0 && perms[0].leo_social === 1;

    // 5. Auto-activate if all requirements met
    if (subscription && termsAccepted && cardLast4) {
      if (!hasPermission) {
        await db.query(
          'INSERT INTO user_permissions (user_id, leo_social) VALUES (?, 1) ON DUPLICATE KEY UPDATE leo_social = 1',
          [userId]
        );
        hasPermission = true;
      }
      if (subscription.status === 'incomplete') {
        await db.query('UPDATE user_subscriptions SET status = ? WHERE id = ?', ['active', subscription.id]);
        subscription.status = 'active';
      }
    }

    const tier = subscription?.tier != null && String(subscription.tier).trim() !== ''
      ? String(subscription.tier).trim()
      : null;

    res.json({
      success: true,
      subscription: {
        id: subscription?.id ?? null,
        status: subscription?.status || 'inactive',
        tier,
        tierPrice: subscription?.tier_price != null ? Number(subscription.tier_price) : null,
        termsAccepted: Boolean(termsAccepted),
        cardLast4: cardLast4 != null && String(cardLast4).trim() !== '' ? String(cardLast4).trim() : null,
        application_status: 'approved',  // Social Central auto-approves
      },
      has_permission: hasPermission,
    });
  } catch (error) {
    console.error('Get social subscription error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v2/marketing/subscription/tiers
 * Get all available tiers for pricing display
 */
router.get('/subscription/tiers', async (req, res) => {
  try {
    const tiers = getAllSocialTiersForDisplay();
    res.json({ success: true, tiers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v2/marketing/subscription/select-tier
 * ChecklistController sends: { subscription_type, tier_name, tier_price }
 * Sets status = 'incomplete' so the user continues through terms + card steps.
 */
router.post('/subscription/select-tier', requireAuth, async (req, res) => {
  try {
    const { subscription_type, tier_name, tier_price } = req.body;

    // Accept both old format (tier) and new format (tier_name)
    const tierKey = tier_name || req.body.tier;
    if (!tierKey) {
      return res.status(400).json({ success: false, error: 'tier_name is required' });
    }

    const userId = _uid(req);

    const [existing] = await db.query(
      `SELECT id FROM user_subscriptions WHERE user_id = ? AND subscription_type = 'social' LIMIT 1`,
      [userId]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE user_subscriptions SET tier = ?, tier_price = ?, status = 'incomplete', updated_at = NOW() WHERE id = ?`,
        [tierKey, tier_price || 0, existing[0].id]
      );
      res.json({ success: true, action: 'updated', subscription_id: existing[0].id });
    } else {
      const [result] = await db.query(
        `INSERT INTO user_subscriptions (user_id, subscription_type, tier, tier_price, status)
         VALUES (?, 'social', ?, ?, 'incomplete')`,
        [userId, tierKey, tier_price || 0]
      );
      res.json({ success: true, action: 'created', subscription_id: result.insertId });
    }
  } catch (error) {
    console.error('Select social tier error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v2/marketing/subscription/terms-check
 * Returns current terms and whether user has accepted them
 */
router.get('/subscription/terms-check', requireAuth, async (req, res) => {
  try {
    const userId = _uid(req);

    const [latestTerms] = await db.query(
      `SELECT id, title, content, version, created_at
       FROM terms_versions
       WHERE subscription_type = 'social' AND is_current = 1
       ORDER BY created_at DESC LIMIT 1`
    );

    if (latestTerms.length === 0) {
      return res.status(404).json({ success: false, error: 'No social terms found' });
    }

    const terms = latestTerms[0];

    const [acceptance] = await db.query(
      'SELECT id FROM user_terms_acceptance WHERE user_id = ? AND subscription_type = ? AND terms_version_id = ?',
      [userId, 'social', terms.id]
    );

    res.json({
      success: true,
      termsAccepted: acceptance.length > 0,
      latestTerms: {
        id: terms.id,
        title: terms.title,
        content: terms.content,
        version: terms.version,
        created_at: terms.created_at,
      },
    });
  } catch (error) {
    console.error('Social terms check error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v2/marketing/subscription/terms-accept
 * Accept the current terms version
 */
router.post('/subscription/terms-accept', requireAuth, async (req, res) => {
  try {
    const userId = _uid(req);
    const { terms_version_id } = req.body;

    if (!terms_version_id) {
      return res.status(400).json({ success: false, error: 'terms_version_id is required' });
    }

    // Validate terms version exists and is for social
    const [termsCheck] = await db.query(
      'SELECT id FROM terms_versions WHERE id = ? AND subscription_type = ?',
      [terms_version_id, 'social']
    );
    if (termsCheck.length === 0) {
      return res.status(404).json({ success: false, error: 'Invalid terms version' });
    }

    await db.query(
      `INSERT IGNORE INTO user_terms_acceptance (user_id, subscription_type, terms_version_id, accepted_at)
       VALUES (?, 'social', ?, NOW())`,
      [userId, terms_version_id]
    );

    res.json({ success: true, message: 'Terms acceptance recorded successfully' });
  } catch (error) {
    console.error('Social terms accept error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v2/marketing/subscription/cancel
 * Cancel the user's Social Central subscription
 */
router.post('/subscription/cancel', requireAuth, async (req, res) => {
  try {
    const userId = _uid(req);

    const [subscription] = await db.query(
      `SELECT id, status FROM user_subscriptions
       WHERE user_id = ? AND subscription_type = 'social' AND status IN ('active','incomplete')
       LIMIT 1`,
      [userId]
    );

    if (subscription.length === 0) {
      return res.status(404).json({ success: false, error: 'No active Social Central subscription found' });
    }

    // Cancel the subscription
    await db.query(
      `UPDATE user_subscriptions SET status = 'cancelled', updated_at = NOW() WHERE id = ?`,
      [subscription[0].id]
    );

    // Remove leo_social permission
    await db.query(
      'UPDATE user_permissions SET leo_social = 0 WHERE user_id = ?',
      [userId]
    );

    res.json({ success: true, message: 'Social Central subscription cancelled. You retain access until the end of your billing period.' });
  } catch (error) {
    console.error('Cancel social subscription error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// CAMPAIGN ROUTES
// ============================================================================

/**
 * GET /api/v2/marketing/campaigns
 * Get all campaigns (filtered by user access)
 */
router.get('/campaigns', requireAuth, canAccessCampaign, async (req, res) => {
  try {
    const filters = { ...req.query };
    
    // Non-admin users can only see their own campaigns
    if (!req.isAdmin) {
      filters.owner_type = 'user';
      filters.owner_id = _uid(req);
    }

    const result = await CampaignService.getCampaigns(filters);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/campaigns/:id
 * Get single campaign by ID
 */
router.get('/campaigns/:id', requireAuth, canAccessCampaign, async (req, res) => {
  try {
    const result = await CampaignService.getCampaignById(
      req.params.id,
      _uid(req),
      req.isAdmin
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v2/marketing/campaigns
 * Create new campaign
 */
router.post('/campaigns', requireAuth, canAccessCampaign, async (req, res) => {
  try {
    const data = { ...req.body };
    
    // Set owner based on user role
    if (!req.isAdmin) {
      data.owner_type = 'user';
      data.owner_id = _uid(req);
    }

    const result = await CampaignService.createCampaign(data);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PUT /api/v2/marketing/campaigns/:id
 * Update campaign
 */
router.put('/campaigns/:id', requireAuth, canAccessCampaign, async (req, res) => {
  try {
    const result = await CampaignService.updateCampaign(
      req.params.id,
      req.body,
      _uid(req),
      req.isAdmin
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v2/marketing/campaigns/:id
 * Delete campaign
 */
router.delete('/campaigns/:id', requireAuth, canAccessCampaign, async (req, res) => {
  try {
    const result = await CampaignService.deleteCampaign(
      req.params.id,
      _uid(req),
      req.isAdmin
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/campaigns/:id/stats
 * Get campaign statistics
 */
router.get('/campaigns/:id/stats', requireAuth, canAccessCampaign, async (req, res) => {
  try {
    const result = await CampaignService.getCampaignStats(req.params.id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get campaign stats error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// CONTENT ROUTES
// ============================================================================

/**
 * GET /api/v2/marketing/content
 * Get all content (filtered by user access)
 */
router.get('/content', requireAuth, canAccessCampaign, async (req, res) => {
  try {
    const filters = { ...req.query };
    
    // Non-admin users can only see their own content
    if (!req.isAdmin) {
      filters.owner_type = 'user';
      filters.owner_id = _uid(req);
    }

    const result = await ContentService.getContent(filters);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/content/:id
 * Get single content by ID
 */
router.get('/content/:id', requireAuth, canAccessCampaign, async (req, res) => {
  try {
    const result = await ContentService.getContentById(
      req.params.id,
      _uid(req),
      req.isAdmin
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v2/marketing/content
 * Create new content
 */
router.post('/content', requireAuth, canAccessCampaign, async (req, res) => {
  try {
    const result = await ContentService.createContent(req.body);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Create content error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PUT /api/v2/marketing/content/:id
 * Update content
 */
router.put('/content/:id', requireAuth, canModifyContent, async (req, res) => {
  try {
    const result = await ContentService.updateContent(
      req.params.id,
      req.body,
      _uid(req),
      req.canModify
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Update content error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v2/marketing/content/:id
 * Delete content
 */
router.delete('/content/:id', requireAuth, canModifyContent, async (req, res) => {
  try {
    const result = await ContentService.deleteContent(
      req.params.id,
      _uid(req),
      req.canModify
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Delete content error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// APPROVAL WORKFLOW ROUTES
// ============================================================================

/**
 * POST /api/v2/marketing/content/:id/submit
 * Submit content for review
 */
router.post('/content/:id/submit', requireAuth, async (req, res) => {
  try {
    const result = await ApprovalService.submitForReview(
      req.params.id,
      _uid(req)
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Submit for review error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v2/marketing/content/:id/approve
 * Approve content (admin only)
 */
router.post('/content/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await ApprovalService.approveContent(
      req.params.id,
      _uid(req),
      req.body.feedback
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Approve content error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v2/marketing/content/:id/reject
 * Reject content with feedback (admin only)
 */
router.post('/content/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await ApprovalService.rejectContent(
      req.params.id,
      _uid(req),
      req.body.feedback
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Reject content error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v2/marketing/content/:id/comment
 * Add comment to content
 */
router.post('/content/:id/comment', requireAuth, async (req, res) => {
  try {
    const result = await ApprovalService.addComment(
      req.params.id,
      _uid(req),
      req.body.comment
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/content/:id/feedback
 * Get feedback history for content
 */
router.get('/content/:id/feedback', requireAuth, async (req, res) => {
  try {
    const result = await ApprovalService.getFeedbackHistory(req.params.id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/approvals/pending
 * Get pending approvals (admin only)
 */
router.get('/approvals/pending', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await ApprovalService.getPendingApprovals(req.query);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// SCHEDULING ROUTES
// ============================================================================

/**
 * POST /api/v2/marketing/content/:id/schedule
 * Schedule content for publishing
 */
router.post('/content/:id/schedule', requireAuth, async (req, res) => {
  try {
    const result = await SchedulerService.scheduleContent(
      req.params.id,
      req.body.scheduled_at,
      _uid(req)
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Schedule content error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PUT /api/v2/marketing/content/:id/reschedule
 * Reschedule content
 */
router.put('/content/:id/reschedule', requireAuth, async (req, res) => {
  try {
    const result = await SchedulerService.rescheduleContent(
      req.params.id,
      req.body.scheduled_at
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Reschedule content error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v2/marketing/content/:id/schedule
 * Cancel scheduled content
 */
router.delete('/content/:id/schedule', requireAuth, async (req, res) => {
  try {
    const result = await SchedulerService.cancelSchedule(req.params.id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Cancel schedule error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v2/marketing/content/:id/approve-schedule
 * Streamlined: approve AI-generated content + optionally schedule in one step.
 * For content owned by the current user (no admin review required).
 * Body: { scheduled_at? } — if provided, also schedules. If omitted, just approves.
 */
router.post('/content/:id/approve-schedule', requireAuth, async (req, res) => {
  try {
    const contentId = req.params.id;
    const { scheduled_at } = req.body;
    const isAdmin = _isAdmin(req);

    // Get content to verify ownership
    const contentResult = await ContentService.getContentById(contentId, req.userId, isAdmin);
    if (!contentResult.success) {
      return res.status(404).json(contentResult);
    }

    const content = contentResult.content;

    // Must be draft or revision_requested to approve
    if (!['draft', 'revision_requested', 'pending_review'].includes(content.status)) {
      return res.status(400).json({ success: false, error: `Cannot approve content with status: ${content.status}` });
    }

    // Approve — set to approved
    await db.execute(
      'UPDATE marketing_content SET status = ?, approved_by = ? WHERE id = ?',
      ['approved', req.userId, contentId]
    );

    // Optionally schedule
    if (scheduled_at) {
      const scheduleDate = new Date(scheduled_at);
      if (scheduleDate <= new Date()) {
        return res.status(400).json({ success: false, error: 'Scheduled time must be in the future' });
      }

      // Check for conflicts
      const conflictResult = await SchedulerService.checkConflicts(content.channel, scheduled_at, contentId);

      await db.execute(
        'UPDATE marketing_content SET status = ?, scheduled_at = ? WHERE id = ?',
        ['scheduled', scheduled_at, contentId]
      );

      return res.json({
        success: true,
        status: 'scheduled',
        scheduled_at,
        has_conflicts: conflictResult.has_conflicts || false,
        message: `Post approved and scheduled for ${scheduleDate.toLocaleString()}`,
      });
    }

    res.json({
      success: true,
      status: 'approved',
      message: 'Post approved. Ready to schedule.',
    });
  } catch (error) {
    console.error('Approve-schedule error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to approve content' });
  }
});

/**
 * GET /api/v2/marketing/schedule/queue
 * Get scheduled content queue
 */
router.get('/schedule/queue', requireAuth, async (req, res) => {
  try {
    const result = await SchedulerService.getScheduledQueue(req.query);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get schedule queue error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/schedule/calendar
 * Get content calendar
 */
router.get('/schedule/calendar', requireAuth, async (req, res) => {
  try {
    const { start_date, end_date, ...filters } = req.query;
    
    if (!start_date || !end_date) {
      return res.status(400).json({ 
        success: false, 
        error: 'start_date and end_date are required' 
      });
    }

    const result = await SchedulerService.getCalendar(
      start_date,
      end_date,
      filters
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get calendar error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

/**
 * POST /api/v2/marketing/analytics/:contentId
 * Record analytics data
 */
router.post('/analytics/:contentId', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await AnalyticsService.recordAnalytics(
      req.params.contentId,
      req.body
    );
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Record analytics error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/analytics/content/:id
 * Get analytics for specific content
 */
router.get('/analytics/content/:id', requireAuth, async (req, res) => {
  try {
    const result = await AnalyticsService.getContentAnalytics(req.params.id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get content analytics error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/analytics/campaign/:id
 * Get analytics for campaign
 */
router.get('/analytics/campaign/:id', requireAuth, async (req, res) => {
  try {
    const result = await AnalyticsService.getCampaignAnalytics(req.params.id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get campaign analytics error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/analytics/overview
 * Get overview analytics
 */
router.get('/analytics/overview', requireAuth, async (req, res) => {
  try {
    const filters = { ...req.query };
    
    // Non-admin users can only see their own analytics
    if (!_isAdmin(req)) {
      filters.owner_type = 'user';
      filters.owner_id = _uid(req);
    }

    const result = await AnalyticsService.getOverview(filters);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get overview analytics error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/analytics/channels
 * Get performance by channel
 */
router.get('/analytics/channels', requireAuth, async (req, res) => {
  try {
    const result = await AnalyticsService.getChannelPerformance(req.query);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get channel performance error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/analytics/top
 * Get top performing content
 */
router.get('/analytics/top', requireAuth, async (req, res) => {
  try {
    const { metric = 'impressions', limit = 10, ...filters } = req.query;
    
    const result = await AnalyticsService.getTopPerforming(
      metric,
      parseInt(limit),
      filters
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get top performing error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// PENDING IMAGE STATUS ROUTES (media processing pipeline)
// ============================================================================

/**
 * GET /api/v2/marketing/media/pending/:id
 * Check the processing status of a pending image (marketing media)
 */
router.get('/media/pending/:id', requireAuth, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, status, permanent_url, thumbnail_url, metadata, created_at, updated_at
       FROM pending_images WHERE id = ? AND user_id = ?`,
      [req.params.id, _uid(req)]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Pending image not found' });
    }
    const row = rows[0];
    if (row.metadata && typeof row.metadata === 'string') {
      row.metadata = JSON.parse(row.metadata);
    }
    res.json({
      success: true,
      pendingImage: {
        id: row.id,
        status: row.status,
        permanentUrl: row.permanent_url,
        thumbnailUrl: row.thumbnail_url,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error('Get pending image status error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v2/marketing/media/pending/batch
 * Check statuses for multiple pending images at once
 * Body: { ids: [1, 2, 3] }
 */
router.post('/media/pending/batch', requireAuth, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.json({ success: true, pendingImages: [] });
    }
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await db.query(
      `SELECT id, status, permanent_url, thumbnail_url, image_path, metadata, updated_at
       FROM pending_images WHERE id IN (${placeholders}) AND user_id = ?`,
      [...ids, _uid(req)]
    );
    const smartBase = process.env.SMART_MEDIA_BASE_URL || (process.env.API_BASE_URL ? `${process.env.API_BASE_URL}/api/v2/media/images` : '');
    const pendingImages = rows.map(row => {
      if (row.metadata && typeof row.metadata === 'string') {
        row.metadata = JSON.parse(row.metadata);
      }
      // Convert media IDs to full smart-serve URLs
      const mediaId = row.permanent_url;
      const permanentUrl = mediaId && /^\d+$/.test(String(mediaId))
        ? `${smartBase}/${mediaId}?size=detail`
        : row.permanent_url;
      const thumbnailUrl = mediaId && /^\d+$/.test(String(mediaId))
        ? `${smartBase}/${mediaId}?size=thumbnail`
        : row.thumbnail_url;

      // For composed images, extract the URL-relative path from the absolute filesystem path
      let composedUrl = null;
      if (row.metadata?.strategy === 'sharp_compose' && row.metadata?.compositionType === 'campaign_media') {
        const imgPath = row.image_path || '';
        const tempIdx = imgPath.indexOf('/temp_images/');
        if (tempIdx !== -1) {
          composedUrl = imgPath.substring(tempIdx); // e.g. /temp_images/marketing/composed/file.jpg
        }
      }

      return {
        id: row.id,
        status: row.status,
        permanentUrl,
        thumbnailUrl,
        composedUrl,
        metadata: row.metadata,
        updatedAt: row.updated_at,
      };
    });
    res.json({ success: true, pendingImages });
  } catch (error) {
    console.error('Batch pending image status error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// ASSET ROUTES
// ============================================================================

/**
 * GET /api/v2/marketing/assets
 * Get all assets
 */
router.get('/assets', requireAuth, canAccessCampaign, async (req, res) => {
  try {
    const filters = { ...req.query };
    
    // Non-admin users can only see their own assets
    if (!req.isAdmin) {
      filters.owner_type = 'user';
      filters.owner_id = _uid(req);
    }

    const result = await AssetService.getAssets(filters);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get assets error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/assets/:id
 * Get single asset
 */
router.get('/assets/:id', requireAuth, canAccessCampaign, async (req, res) => {
  try {
    const result = await AssetService.getAssetById(
      req.params.id,
      _uid(req),
      req.isAdmin
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Get asset error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v2/marketing/assets/upload
 * Upload new asset
 */
router.post('/assets/upload', requireAuth, uploadLimiter, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No file uploaded' 
      });
    }

    // Determine asset type from mimetype
    let type = 'document';
    if (req.file.mimetype.startsWith('image/')) {
      type = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      type = 'video';
    } else if (req.file.mimetype.startsWith('audio/')) {
      type = 'audio';
    }

    const metadata = {
      original_name: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    };

    const data = {
      owner_type: _isAdmin(req) ? 'admin' : 'user',
      owner_id: _uid(req),
      type: type,
      file_path: req.file.path,
      metadata: metadata,
      tags: req.body.tags || null
    };

    const result = await AssetService.createAsset(data);
    
    if (result.success) {
      res.status(201).json({
        ...result,
        file: {
          path: req.file.path,
          filename: req.file.filename,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Upload asset error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PUT /api/v2/marketing/assets/:id
 * Update asset metadata
 */
router.put('/assets/:id', requireAuth, canAccessCampaign, async (req, res) => {
  try {
    const result = await AssetService.updateAsset(
      req.params.id,
      req.body,
      _uid(req),
      req.isAdmin
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Update asset error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v2/marketing/assets/:id
 * Delete asset
 */
router.delete('/assets/:id', requireAuth, canAccessCampaign, async (req, res) => {
  try {
    const result = await AssetService.deleteAsset(
      req.params.id,
      _uid(req),
      req.isAdmin
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Delete asset error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/assets/search
 * Search assets
 */
router.get('/assets/search', requireAuth, async (req, res) => {
  try {
    const { q, ...filters } = req.query;
    
    if (!q) {
      return res.status(400).json({ 
        success: false, 
        error: 'Search query (q) is required' 
      });
    }

    const result = await AssetService.searchAssets(q, filters);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Search assets error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// OAUTH & SOCIAL CONNECTIONS ROUTES (Sprint C1)
// ============================================================================

/**
 * GET /api/v2/marketing/oauth/:platform/authorize
 * Start OAuth flow - redirects user to platform authorization
 */
router.get('/oauth/:platform/authorize', (req, res, next) => {
  // OAuth authorize is called via browser navigation (window.location.href),
  // so the Authorization header isn't sent. Accept token from query param.
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}, requireAuth, async (req, res) => {
  try {
    const { platform } = req.params;
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    const redirectUri = `${baseUrl}/api/v2/marketing/oauth/${platform}/callback`;
    
    // Generate state for CSRF protection
    const state = Buffer.from(JSON.stringify({
      userId: _uid(req),
      userRole: _isAdmin(req) ? 'admin' : 'user',
      timestamp: Date.now()
    })).toString('base64');

    const result = await OAuthService.generateAuthUrl(platform, redirectUri, state);
    
    if (result.success) {
      // Redirect to platform OAuth
      res.redirect(result.authUrl);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('OAuth authorize error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/oauth/:platform/callback
 * Handle OAuth callback from platform
 */
router.get('/oauth/:platform/callback', async (req, res) => {
  try {
    const { platform } = req.params;
    const { code, state, error, error_description } = req.query;

    // Handle OAuth error
    if (error) {
      return res.status(400).send(`
        <html>
          <body>
            <h1>Authorization Failed</h1>
            <p>Error: ${error}</p>
            <p>${error_description || ''}</p>
            <a href="/dashboard">Return to Dashboard</a>
          </body>
        </html>
      `);
    }

    if (!code || !state) {
      return res.status(400).send('Missing authorization code or state');
    }

    // Verify state and extract user info
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (e) {
      return res.status(400).send('Invalid state parameter');
    }

    // Check state timestamp (prevent replay attacks)
    const stateAge = Date.now() - stateData.timestamp;
    if (stateAge > 10 * 60 * 1000) { // 10 minutes
      return res.status(400).send('Authorization expired. Please try again.');
    }

    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    const redirectUri = `${baseUrl}/api/v2/marketing/oauth/${platform}/callback`;

    const ownerInfo = {
      owner_type: stateData.userRole === 'admin' || stateData.userRole === 'super_admin' ? 'admin' : 'user',
      owner_id: stateData.userId
    };

    const result = await OAuthService.handleCallback(platform, code, redirectUri, ownerInfo);
    
    if (result.success) {
      res.send(`
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
              .success { color: #28a745; }
              .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1 class="success">✓ Connected Successfully!</h1>
              <p>Your ${platform} account has been connected.</p>
              <p><strong>Account:</strong> ${result.connection.account_name || result.connection.account_id}</p>
              <p><strong>Platform:</strong> ${result.connection.platform}</p>
              <br>
              <a href="/dashboard/marketing/social-central/connections">View Connections</a> | 
              <a href="/dashboard/marketing/social-central">Back to Social Central</a>
            </div>
          </body>
        </html>
      `);
    } else {
      res.status(400).send(`
        <html>
          <body>
            <h1>Connection Failed</h1>
            <p>Error: ${result.error}</p>
            <a href="/dashboard/marketing/social-central/connections">Try Again</a>
          </body>
        </html>
      `);
    }
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Internal server error during OAuth callback');
  }
});

/**
 * POST /api/v2/marketing/oauth/:platform/refresh
 * Manually refresh access token
 */
router.post('/oauth/:platform/refresh', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { connectionId } = req.body;

    if (!connectionId) {
      return res.status(400).json({ 
        success: false, 
        error: 'connectionId is required' 
      });
    }

    const result = await OAuthService.refreshToken(connectionId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/connections
 * Get all social connections for user
 */
router.get('/connections', requireAuth, async (req, res) => {
  try {
    const ownerType = _isAdmin(req) ? 'admin' : 'user';
    const ownerId = _uid(req);

    const result = await OAuthService.getConnections(ownerType, ownerId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// CRM / EMAIL CONNECTION ROUTES (must be before :id param routes)
// ============================================================================

/**
 * POST /api/v2/marketing/connections/crm
 * Enable CRM email as a campaign channel (creates an internal "email" connection)
 */
router.post('/connections/crm', requireAuth, async (req, res) => {
  try {
    const userId = _uid(req);
    const ownerType = _isAdmin(req) ? 'admin' : 'user';

    // Check if already active
    const [existing] = await db.execute(
      `SELECT id, status FROM social_connections WHERE platform = 'email' AND owner_id = ? AND owner_type = ?`,
      [userId, ownerType]
    );
    if (existing.length > 0) {
      if (existing[0].status === 'active') {
        return res.json({ success: true, message: 'CRM email already connected', connectionId: existing[0].id });
      }
      // Re-activate revoked/expired row
      await db.execute(`UPDATE social_connections SET status = 'active' WHERE id = ?`, [existing[0].id]);
      return res.json({ success: true, message: 'CRM email system reconnected', connectionId: existing[0].id });
    }

    // Insert new internal connection record
    const [result] = await db.execute(
      `INSERT INTO social_connections (platform, owner_id, owner_type, account_id, account_name, status, permissions)
       VALUES ('email', ?, ?, ?, 'CRM Email System', 'active', ?)`,
      [userId, ownerType, `crm_${userId}`, JSON.stringify({ channels: ['newsletter', 'announcement', 'promotion'] })]
    );

    res.json({ success: true, message: 'CRM email system connected', connectionId: result.insertId });
  } catch (error) {
    console.error('Connect CRM error:', error);
    res.status(500).json({ success: false, error: 'Failed to connect CRM email system' });
  }
});

/**
 * DELETE /api/v2/marketing/connections/crm
 * Disable CRM email channel
 */
router.delete('/connections/crm', requireAuth, async (req, res) => {
  try {
    const userId = _uid(req);
    const ownerType = _isAdmin(req) ? 'admin' : 'user';

    await db.execute(
      `UPDATE social_connections SET status = 'revoked' WHERE platform = 'email' AND owner_id = ? AND owner_type = ?`,
      [userId, ownerType]
    );

    res.json({ success: true, message: 'CRM email system disconnected' });
  } catch (error) {
    console.error('Disconnect CRM error:', error);
    res.status(500).json({ success: false, error: 'Failed to disconnect CRM email system' });
  }
});

// ============================================================================
// INTERNAL SYSTEM TOGGLES — Drip Campaigns & Product Collections
// (admin-only toggles, same pattern as CRM email above)
// ============================================================================

const INTERNAL_TOGGLES = {
  drip: { accountId: (uid) => `drip_${uid}`, accountName: 'Drip Campaign System', permissions: { channels: ['welcome', 'nurture', 'reengagement', 'promotional'] } },
  collection: { accountId: (uid) => `collection_${uid}`, accountName: 'Product Collections', permissions: { channels: ['catalog', 'showcase', 'featured'] } },
};

/**
 * POST /api/v2/marketing/connections/:system(drip|collection)
 * Enable an internal system as an admin campaign channel
 */
router.post('/connections/drip', requireAuth, async (req, res) => { return _toggleInternal(req, res, 'drip', true); });
router.post('/connections/collection', requireAuth, async (req, res) => { return _toggleInternal(req, res, 'collection', true); });

/**
 * DELETE /api/v2/marketing/connections/:system(drip|collection)
 * Disable an internal system channel
 */
router.delete('/connections/drip', requireAuth, async (req, res) => { return _toggleInternal(req, res, 'drip', false); });
router.delete('/connections/collection', requireAuth, async (req, res) => { return _toggleInternal(req, res, 'collection', false); });

async function _toggleInternal(req, res, platform, enable) {
  try {
    if (!_isAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    const userId = _uid(req);
    const cfg = INTERNAL_TOGGLES[platform];

    if (enable) {
      // Check if row already exists (active or revoked)
      const [existing] = await db.execute(
        `SELECT id, status FROM social_connections WHERE platform = ? AND owner_id = ? AND owner_type = 'admin'`,
        [platform, userId]
      );
      if (existing.length > 0) {
        if (existing[0].status === 'active') {
          return res.json({ success: true, message: `${cfg.accountName} already enabled`, connectionId: existing[0].id });
        }
        // Re-activate revoked/expired row
        await db.execute(`UPDATE social_connections SET status = 'active' WHERE id = ?`, [existing[0].id]);
        return res.json({ success: true, message: `${cfg.accountName} re-enabled for campaigns`, connectionId: existing[0].id });
      }
      const [result] = await db.execute(
        `INSERT INTO social_connections (platform, owner_id, owner_type, account_id, account_name, status, permissions)
         VALUES (?, ?, 'admin', ?, ?, 'active', ?)`,
        [platform, userId, cfg.accountId(userId), cfg.accountName, JSON.stringify(cfg.permissions)]
      );
      return res.json({ success: true, message: `${cfg.accountName} enabled for campaigns`, connectionId: result.insertId });
    } else {
      await db.execute(
        `UPDATE social_connections SET status = 'revoked' WHERE platform = ? AND owner_id = ? AND owner_type = 'admin'`,
        [platform, userId]
      );
      return res.json({ success: true, message: `${cfg.accountName} disabled` });
    }
  } catch (error) {
    console.error(`Toggle ${platform} error:`, error);
    res.status(500).json({ success: false, error: `Failed to toggle ${platform}` });
  }
}

// ============================================================================
// ADMIN CONNECTION MANAGEMENT ROUTES (must be before :id param routes)
// ============================================================================

/**
 * GET /api/v2/marketing/connections/admin/all
 * Get ALL connections across all users and admin (admin oversight)
 */
router.get('/connections/admin/all', requireAuth, async (req, res) => {
  try {
    if (!_isAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { platform, status, owner_type, search } = req.query;

    let query = `
      SELECT sc.id, sc.owner_type, sc.owner_id, sc.platform, sc.account_id,
             sc.account_name, sc.label, sc.status, sc.token_expires_at,
             sc.created_at, sc.updated_at,
             u.username AS owner_username
      FROM social_connections sc
      LEFT JOIN users u ON sc.owner_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (platform) { query += ' AND sc.platform = ?'; params.push(platform); }
    if (status) { query += ' AND sc.status = ?'; params.push(status); }
    if (owner_type) { query += ' AND sc.owner_type = ?'; params.push(owner_type); }
    if (search) {
      query += ' AND (sc.account_name LIKE ? OR sc.label LIKE ? OR u.username LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ' ORDER BY sc.owner_type DESC, sc.platform, sc.created_at DESC';

    const [connections] = await db.execute(query, params);

    res.json({
      success: true,
      connections,
      total: connections.length,
    });
  } catch (error) {
    console.error('Get all connections (admin) error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch connections' });
  }
});

/**
 * PUT /api/v2/marketing/connections/:id/label
 * Update label/nickname on a connection (admin only)
 */
router.put('/connections/:id/label', requireAuth, async (req, res) => {
  try {
    if (!_isAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const { label } = req.body;
    if (label !== undefined && label !== null && label.length > 100) {
      return res.status(400).json({ success: false, error: 'Label must be 100 characters or fewer' });
    }

    await db.execute(
      'UPDATE social_connections SET label = ? WHERE id = ?',
      [label || null, req.params.id]
    );

    res.json({ success: true, message: 'Label updated' });
  } catch (error) {
    console.error('Update connection label error:', error);
    res.status(500).json({ success: false, error: 'Failed to update label' });
  }
});

/**
 * GET /api/v2/marketing/connections/:id
 * Get single connection details
 */
router.get('/connections/:id', requireAuth, async (req, res) => {
  try {
    const result = await OAuthService.getConnection(req.params.id);
    
    if (result.success) {
      // Verify ownership
      const ownerType = _isAdmin(req) ? 'admin' : 'user';
      const ownerId = _uid(req);

      if (result.connection.owner_type !== ownerType || result.connection.owner_id !== ownerId) {
        return res.status(403).json({ 
          success: false, 
          error: 'Access denied' 
        });
      }

      // Don't expose sensitive tokens
      delete result.connection.access_token;
      delete result.connection.refresh_token;

      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Get connection error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * DELETE /api/v2/marketing/connections/:id
 * Disconnect social account
 */
router.delete('/connections/:id', requireAuth, async (req, res) => {
  try {
    const ownerType = _isAdmin(req) ? 'admin' : 'user';
    const ownerId = _uid(req);

    const result = await OAuthService.deleteConnection(
      req.params.id,
      ownerType,
      ownerId
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Delete connection error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// GOOGLE ADS ROUTES
// ============================================================================

const { GoogleAdsPublisher } = require('./publishers');

/**
 * POST /api/v2/marketing/ads/google/campaigns
 * Create Google Ads campaign
 */
router.post('/ads/google/campaigns', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = require('../../config/db');
    
    // Get Google connection
    const [connections] = await db.execute(
      `SELECT * FROM social_connections 
       WHERE owner_type = 'admin' 
         AND owner_id = ? 
         AND platform = 'google' 
         AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [_uid(req)]
    );

    if (connections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active Google Ads connection found. Please connect your Google Ads account first.'
      });
    }

    const connection = connections[0];
    if (connection.access_token) connection.access_token = decrypt(connection.access_token);
    if (connection.refresh_token) connection.refresh_token = decrypt(connection.refresh_token);
    const publisher = new GoogleAdsPublisher(connection);

    // Create campaign
    const result = await publisher.publish({}, req.body);

    if (result.success) {
      // Save to ad_campaigns table
      await db.execute(
        `INSERT INTO ad_campaigns 
         (marketing_campaign_id, platform, external_campaign_id, name, status, 
          campaign_type, budget_cents, daily_budget_cents, bid_strategy, targeting)
         VALUES (?, 'google', ?, ?, 'pending', ?, ?, ?, ?, ?)`,
        [
          req.body.marketing_campaign_id || null,
          result.campaignId,
          req.body.name,
          req.body.campaignType,
          req.body.budgetCents || 0,
          req.body.dailyBudgetCents || 0,
          req.body.bidStrategy || 'MANUAL_CPC',
          JSON.stringify(req.body.targeting || {})
        ]
      );

      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Create Google Ads campaign error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/ads/google/campaigns
 * List Google Ads campaigns
 */
router.get('/ads/google/campaigns', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = require('../../config/db');
    
    const [campaigns] = await db.execute(
      `SELECT * FROM ad_campaigns WHERE platform = 'google' ORDER BY created_at DESC`
    );

    // Parse JSON fields
    campaigns.forEach(campaign => {
      if (campaign.targeting && typeof campaign.targeting === 'string') {
        campaign.targeting = JSON.parse(campaign.targeting);
      }
      if (campaign.settings && typeof campaign.settings === 'string') {
        campaign.settings = JSON.parse(campaign.settings);
      }
    });

    res.json({ success: true, campaigns });
  } catch (error) {
    console.error('Get Google Ads campaigns error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PUT /api/v2/marketing/ads/google/campaigns/:id
 * Update Google Ads campaign status
 */
router.put('/ads/google/campaigns/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = require('../../config/db');
    
    // Get campaign
    const [campaigns] = await db.execute(
      'SELECT * FROM ad_campaigns WHERE id = ? AND platform = "google"',
      [req.params.id]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const campaign = campaigns[0];

    // Get Google connection
    const [connections] = await db.execute(
      `SELECT * FROM social_connections 
       WHERE owner_type = 'admin' 
         AND platform = 'google' 
         AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`
    );

    if (connections.length === 0) {
      return res.status(400).json({ success: false, error: 'No active Google Ads connection found' });
    }

    const googleConn = connections[0];
    if (googleConn.access_token) googleConn.access_token = decrypt(googleConn.access_token);
    if (googleConn.refresh_token) googleConn.refresh_token = decrypt(googleConn.refresh_token);
    const publisher = new GoogleAdsPublisher(googleConn);

    // Update status on Google
    if (req.body.status) {
      const statusMap = {
        'active': 'ENABLED',
        'paused': 'PAUSED',
        'ended': 'REMOVED'
      };
      
      const googleStatus = statusMap[req.body.status];
      if (googleStatus) {
        const result = await publisher.updateCampaignStatus(campaign.external_campaign_id, googleStatus);
        
        if (!result.success) {
          return res.status(400).json(result);
        }
      }
    }

    // Update database
    await db.execute(
      'UPDATE ad_campaigns SET status = ? WHERE id = ?',
      [req.body.status, req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update Google Ads campaign error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/ads/google/performance
 * Get Google Ads performance data
 */
router.get('/ads/google/performance', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = require('../../config/db');
    const campaignId = req.query.campaignId;

    if (!campaignId) {
      return res.status(400).json({ success: false, error: 'campaignId is required' });
    }

    // Get campaign
    const [campaigns] = await db.execute(
      'SELECT * FROM ad_campaigns WHERE id = ? AND platform = "google"',
      [campaignId]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const campaign = campaigns[0];

    // Get Google connection
    const [connections] = await db.execute(
      `SELECT * FROM social_connections 
       WHERE owner_type = 'admin' 
         AND platform = 'google' 
         AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`
    );

    if (connections.length === 0) {
      return res.status(400).json({ success: false, error: 'No active Google Ads connection found' });
    }

    const googleConn2 = connections[0];
    if (googleConn2.access_token) googleConn2.access_token = decrypt(googleConn2.access_token);
    if (googleConn2.refresh_token) googleConn2.refresh_token = decrypt(googleConn2.refresh_token);
    const publisher = new GoogleAdsPublisher(googleConn2);
    const result = await publisher.getAnalytics(campaign.external_campaign_id);

    res.json(result);
  } catch (error) {
    console.error('Get Google Ads performance error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// BING ADS ROUTES
// ============================================================================

const { BingAdsPublisher } = require('./publishers');

/**
 * POST /api/v2/marketing/ads/bing/campaigns
 * Create Bing Ads campaign
 */
router.post('/ads/bing/campaigns', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = require('../../config/db');
    
    // Get Bing connection
    const [connections] = await db.execute(
      `SELECT * FROM social_connections 
       WHERE owner_type = 'admin' 
         AND owner_id = ? 
         AND platform = 'bing' 
         AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`,
      [_uid(req)]
    );

    if (connections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active Bing Ads connection found. Please connect your Microsoft Ads account first.'
      });
    }

    const connection = connections[0];
    if (connection.access_token) connection.access_token = decrypt(connection.access_token);
    if (connection.refresh_token) connection.refresh_token = decrypt(connection.refresh_token);
    const publisher = new BingAdsPublisher(connection);

    // Create campaign
    const result = await publisher.publish({}, req.body);

    if (result.success) {
      // Save to ad_campaigns table
      await db.execute(
        `INSERT INTO ad_campaigns 
         (marketing_campaign_id, platform, external_campaign_id, name, status, 
          campaign_type, budget_cents, daily_budget_cents, bid_strategy, targeting)
         VALUES (?, 'bing', ?, ?, 'pending', ?, ?, ?, ?, ?)`,
        [
          req.body.marketing_campaign_id || null,
          result.campaignId,
          req.body.name,
          req.body.campaignType,
          req.body.budgetCents || 0,
          req.body.dailyBudgetCents || 0,
          req.body.bidStrategy || 'MANUAL_CPC',
          JSON.stringify(req.body.targeting || {})
        ]
      );

      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Create Bing Ads campaign error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/ads/bing/campaigns
 * List Bing Ads campaigns
 */
router.get('/ads/bing/campaigns', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = require('../../config/db');
    
    const [campaigns] = await db.execute(
      `SELECT * FROM ad_campaigns WHERE platform = 'bing' ORDER BY created_at DESC`
    );

    // Parse JSON fields
    campaigns.forEach(campaign => {
      if (campaign.targeting && typeof campaign.targeting === 'string') {
        campaign.targeting = JSON.parse(campaign.targeting);
      }
      if (campaign.settings && typeof campaign.settings === 'string') {
        campaign.settings = JSON.parse(campaign.settings);
      }
    });

    res.json({ success: true, campaigns });
  } catch (error) {
    console.error('Get Bing Ads campaigns error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PUT /api/v2/marketing/ads/bing/campaigns/:id
 * Update Bing Ads campaign status
 */
router.put('/ads/bing/campaigns/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = require('../../config/db');
    
    // Get campaign
    const [campaigns] = await db.execute(
      'SELECT * FROM ad_campaigns WHERE id = ? AND platform = "bing"',
      [req.params.id]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const campaign = campaigns[0];

    // Get Bing connection
    const [connections] = await db.execute(
      `SELECT * FROM social_connections 
       WHERE owner_type = 'admin' 
         AND platform = 'bing' 
         AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`
    );

    if (connections.length === 0) {
      return res.status(400).json({ success: false, error: 'No active Bing Ads connection found' });
    }

    const bingConn = connections[0];
    if (bingConn.access_token) bingConn.access_token = decrypt(bingConn.access_token);
    if (bingConn.refresh_token) bingConn.refresh_token = decrypt(bingConn.refresh_token);
    const publisher = new BingAdsPublisher(bingConn);

    // Update status on Bing
    if (req.body.status) {
      const statusMap = {
        'active': 'Active',
        'paused': 'Paused'
      };
      
      const bingStatus = statusMap[req.body.status];
      if (bingStatus) {
        const result = await publisher.updateCampaignStatus(campaign.external_campaign_id, bingStatus);
        
        if (!result.success) {
          return res.status(400).json(result);
        }
      }
    }

    // Update database
    await db.execute(
      'UPDATE ad_campaigns SET status = ? WHERE id = ?',
      [req.body.status, req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Update Bing Ads campaign error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/ads/bing/performance
 * Get Bing Ads performance data
 */
router.get('/ads/bing/performance', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = require('../../config/db');
    const campaignId = req.query.campaignId;

    if (!campaignId) {
      return res.status(400).json({ success: false, error: 'campaignId is required' });
    }

    // Get campaign
    const [campaigns] = await db.execute(
      'SELECT * FROM ad_campaigns WHERE id = ? AND platform = "bing"',
      [campaignId]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }

    const campaign = campaigns[0];

    // Get Bing connection
    const [connections] = await db.execute(
      `SELECT * FROM social_connections 
       WHERE owner_type = 'admin' 
         AND platform = 'bing' 
         AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`
    );

    if (connections.length === 0) {
      return res.status(400).json({ success: false, error: 'No active Bing Ads connection found' });
    }

    const bingConn2 = connections[0];
    if (bingConn2.access_token) bingConn2.access_token = decrypt(bingConn2.access_token);
    if (bingConn2.refresh_token) bingConn2.refresh_token = decrypt(bingConn2.refresh_token);
    const publisher = new BingAdsPublisher(bingConn2);
    const result = await publisher.getAnalytics(campaign.external_campaign_id);

    res.json(result);
  } catch (error) {
    console.error('Get Bing Ads performance error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// EMAIL MARKETING ROUTES
// ============================================================================

/**
 * POST /api/v2/marketing/email/campaigns
 * Create email campaign
 */
router.post('/email/campaigns', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await EmailMarketingService.createCampaign(req.body);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Create email campaign error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/email/campaigns
 * List email campaigns
 */
router.get('/email/campaigns', requireAuth, async (req, res) => {
  try {
    const filters = { ...req.query };
    
    const result = await EmailMarketingService.getCampaigns(filters);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get email campaigns error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/email/campaigns/:id
 * Get email campaign by ID
 */
router.get('/email/campaigns/:id', requireAuth, async (req, res) => {
  try {
    const result = await EmailMarketingService.getCampaignById(req.params.id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Get email campaign error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * PUT /api/v2/marketing/email/campaigns/:id
 * Update email campaign
 */
router.put('/email/campaigns/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await EmailMarketingService.updateCampaign(req.params.id, req.body);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Update email campaign error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v2/marketing/email/campaigns/:id/send
 * Send email campaign
 */
router.post('/email/campaigns/:id/send', requireAuth, requireAdmin, async (req, res) => {
  try {
    const options = {
      test: req.body.test || false,
      recipients: req.body.recipients || null,
      listId: req.body.listId || null
    };

    const result = await EmailMarketingService.sendCampaign(req.params.id, options);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Send email campaign error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/email/campaigns/:id/stats
 * Get email campaign statistics
 */
router.get('/email/campaigns/:id/stats', requireAuth, async (req, res) => {
  try {
    const result = await EmailMarketingService.getCampaignStats(req.params.id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Get email campaign stats error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v2/marketing/email/templates
 * Create email template
 */
router.post('/email/templates', requireAuth, requireAdmin, async (req, res) => {
  try {
    req.body.created_by = _uid(req);
    const result = await EmailMarketingService.createTemplate(req.body);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Create email template error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/email/templates
 * List email templates
 */
router.get('/email/templates', requireAuth, async (req, res) => {
  try {
    const filters = { ...req.query };
    const result = await EmailMarketingService.getTemplates(filters);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get email templates error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/email/templates/:id
 * Get email template by ID
 */
router.get('/email/templates/:id', requireAuth, async (req, res) => {
  try {
    const result = await EmailMarketingService.getTemplate(req.params.id);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('Get email template error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * GET /api/v2/marketing/email/lists
 * Get subscriber lists
 */
router.get('/email/lists', requireAuth, async (req, res) => {
  try {
    const result = await EmailMarketingService.getSubscriberList(req.query.listId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Get subscriber lists error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v2/marketing/email/unsubscribe
 * Handle email unsubscribe
 */
router.post('/email/unsubscribe', async (req, res) => {
  try {
    const { email, campaignId } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }

    const result = await EmailMarketingService.handleUnsubscribe(email, campaignId);
    
    if (result.success) {
      res.json({ success: true, message: 'Successfully unsubscribed' });
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// ============================================================================
// VIDEO PROCESSING ROUTES (Sprint C2)
// ============================================================================

/**
 * POST /api/v2/marketing/video/process
 * Create a general video processing job
 */
router.post('/video/process', requireAuth, upload.single('video'), async (req, res) => {
  try {
    const { type, config } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ success: false, error: 'Video file is required' });
    }

    if (!type) {
      return res.status(400).json({ success: false, error: 'Job type is required' });
    }

    // Create asset record first
    const assetResult = await AssetService.createAsset({
      owner_type: req.isAdmin ? 'admin' : 'user',
      owner_id: _uid(req),
      type: 'video',
      file_path: videoFile.path,
      metadata: JSON.stringify({
        originalName: videoFile.originalname,
        size: videoFile.size,
        mimetype: videoFile.mimetype
      })
    });

    if (!assetResult.success) {
      return res.status(500).json({ success: false, error: 'Failed to create asset' });
    }

    // Create video job
    const db = require('../../config/db');
    const { promisify } = require('util');
    const query = promisify(db.query).bind(db);

    const result = await query(
      'INSERT INTO video_jobs (type, input_asset_id, config, status) VALUES (?, ?, ?, ?)',
      [type, assetResult.assetId, config || '{}', 'pending']
    );

    res.json({
      success: true,
      jobId: result.insertId,
      assetId: assetResult.assetId,
      message: 'Video processing job created'
    });
  } catch (error) {
    console.error('Video process error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v2/marketing/video/convert
 * Convert video format
 */
router.post('/video/convert', requireAuth, upload.single('video'), async (req, res) => {
  try {
    const { outputFormat = 'mp4', quality = 'medium' } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ success: false, error: 'Video file is required' });
    }

    const videoService = getVideoService();
    const outputPath = await videoService.convertFormat(
      videoFile.path,
      outputFormat,
      { quality }
    );

    // Create asset for output
    const assetResult = await AssetService.createAsset({
      owner_type: req.isAdmin ? 'admin' : 'user',
      owner_id: _uid(req),
      type: 'video',
      file_path: outputPath,
      metadata: JSON.stringify({
        originalName: videoFile.originalname,
        outputFormat,
        quality
      })
    });

    res.json({
      success: true,
      assetId: assetResult.assetId,
      outputPath,
      message: 'Video converted successfully'
    });
  } catch (error) {
    console.error('Video convert error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v2/marketing/video/clip
 * Extract clip from video
 */
router.post('/video/clip', requireAuth, upload.single('video'), async (req, res) => {
  try {
    const { startTime, duration } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ success: false, error: 'Video file is required' });
    }

    if (startTime === undefined || duration === undefined) {
      return res.status(400).json({ success: false, error: 'Start time and duration are required' });
    }

    const videoService = getVideoService();
    const clipPath = await videoService.extractClip(
      videoFile.path,
      parseFloat(startTime),
      parseFloat(duration)
    );

    // Create asset for clip
    const assetResult = await AssetService.createAsset({
      owner_type: req.isAdmin ? 'admin' : 'user',
      owner_id: _uid(req),
      type: 'video',
      file_path: clipPath,
      metadata: JSON.stringify({
        originalName: videoFile.originalname,
        startTime,
        duration
      })
    });

    res.json({
      success: true,
      assetId: assetResult.assetId,
      clipPath,
      message: 'Clip extracted successfully'
    });
  } catch (error) {
    console.error('Video clip error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v2/marketing/video/adapt
 * Adapt video for platform
 */
router.post('/video/adapt', requireAuth, upload.single('video'), async (req, res) => {
  try {
    const { platform } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ success: false, error: 'Video file is required' });
    }

    if (!platform) {
      return res.status(400).json({ success: false, error: 'Platform is required' });
    }

    const videoService = getVideoService();
    const adaptedPath = await videoService.adaptForPlatform(
      videoFile.path,
      platform
    );

    // Create asset for adapted video
    const assetResult = await AssetService.createAsset({
      owner_type: req.isAdmin ? 'admin' : 'user',
      owner_id: _uid(req),
      type: 'video',
      file_path: adaptedPath,
      metadata: JSON.stringify({
        originalName: videoFile.originalname,
        platform
      })
    });

    res.json({
      success: true,
      assetId: assetResult.assetId,
      adaptedPath,
      message: `Video adapted for ${platform}`
    });
  } catch (error) {
    console.error('Video adapt error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v2/marketing/video/job/:jobId
 * Check video processing job status
 */
router.get('/video/job/:jobId', requireAuth, async (req, res) => {
  try {
    const db = require('../../config/db');
    const { promisify } = require('util');
    const query = promisify(db.query).bind(db);

    const [job] = await query(
      'SELECT * FROM video_jobs WHERE id = ?',
      [req.params.jobId]
    );

    if (!job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    res.json({
      success: true,
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        error: job.error_message,
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        inputAssetId: job.input_asset_id,
        outputAssetId: job.output_asset_id
      }
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/v2/marketing/video/transcribe
 * Transcribe video audio
 */
router.post('/video/transcribe', requireAuth, upload.single('video'), async (req, res) => {
  try {
    const { language = 'en' } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ success: false, error: 'Video file is required' });
    }

    const captionService = getCaptionService();
    const transcription = await captionService.transcribeVideo(
      videoFile.path,
      { language }
    );

    res.json({
      success: true,
      transcription,
      message: 'Video transcribed successfully'
    });
  } catch (error) {
    console.error('Video transcribe error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v2/marketing/video/captions
 * Add captions to video
 */
router.post('/video/captions', requireAuth, upload.single('video'), async (req, res) => {
  try {
    const { language = 'en', style = {} } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ success: false, error: 'Video file is required' });
    }

    const captionService = getCaptionService();
    const result = await captionService.addCaptionsToVideo(
      videoFile.path,
      {
        language,
        style: typeof style === 'string' ? JSON.parse(style) : style,
        burnCaptions: true
      }
    );

    // Create asset for captioned video
    const assetResult = await AssetService.createAsset({
      owner_type: req.isAdmin ? 'admin' : 'user',
      owner_id: _uid(req),
      type: 'video',
      file_path: result.captionedVideoPath,
      metadata: JSON.stringify({
        originalName: videoFile.originalname,
        hasCaptions: true,
        language
      })
    });

    res.json({
      success: true,
      assetId: assetResult.assetId,
      videoPath: result.captionedVideoPath,
      srtPath: result.srtPath,
      vttPath: result.vttPath,
      transcription: result.transcription,
      message: 'Captions added successfully'
    });
  } catch (error) {
    console.error('Video captions error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v2/marketing/video/analyze
 * Analyze video for highlights
 */
router.post('/video/analyze', requireAuth, upload.single('video'), async (req, res) => {
  try {
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ success: false, error: 'Video file is required' });
    }

    const autoClipService = getAutoClipService();
    
    // Run analysis in parallel
    const [scenes, audioAnalysis] = await Promise.all([
      autoClipService.detectScenes(videoFile.path),
      autoClipService.analyzeAudio(videoFile.path)
    ]);

    // Store analysis in database
    const db = require('../../config/db');
    const { promisify } = require('util');
    const query = promisify(db.query).bind(db);

    // Create asset first if needed
    const assetResult = await AssetService.createAsset({
      owner_type: req.isAdmin ? 'admin' : 'user',
      owner_id: _uid(req),
      type: 'video',
      file_path: videoFile.path,
      metadata: JSON.stringify({
        originalName: videoFile.originalname
      })
    });

    // Store analysis
    await query(
      `INSERT INTO video_analysis (asset_id, scenes, audio_peaks, analyzed_at) 
       VALUES (?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE scenes = ?, audio_peaks = ?, analyzed_at = NOW()`,
      [
        assetResult.assetId,
        JSON.stringify(scenes),
        JSON.stringify(audioAnalysis),
        JSON.stringify(scenes),
        JSON.stringify(audioAnalysis)
      ]
    );

    res.json({
      success: true,
      assetId: assetResult.assetId,
      analysis: {
        scenes,
        audioAnalysis
      },
      message: 'Video analyzed successfully'
    });
  } catch (error) {
    console.error('Video analyze error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v2/marketing/video/auto-clip
 * Generate automatic clips from video
 */
router.post('/video/auto-clip', requireAuth, upload.single('video'), async (req, res) => {
  try {
    const { targetDuration = 30, maxClips = 5 } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ success: false, error: 'Video file is required' });
    }

    const autoClipService = getAutoClipService();
    
    // Find highlights
    const highlights = await autoClipService.findHighlights(
      videoFile.path,
      parseFloat(targetDuration),
      { maxHighlights: parseInt(maxClips) }
    );

    // Generate clip files
    const clipPaths = await autoClipService.generateHighlightClips(
      videoFile.path,
      highlights
    );

    // Create assets for all clips
    const clipAssets = [];
    for (let i = 0; i < clipPaths.length; i++) {
      const assetResult = await AssetService.createAsset({
        owner_type: req.isAdmin ? 'admin' : 'user',
        owner_id: _uid(req),
        type: 'video',
        file_path: clipPaths[i],
        metadata: JSON.stringify({
          originalName: videoFile.originalname,
          clipIndex: i + 1,
          highlight: highlights[i]
        })
      });
      clipAssets.push({
        assetId: assetResult.assetId,
        clipPath: clipPaths[i],
        highlight: highlights[i]
      });
    }

    res.json({
      success: true,
      clips: clipAssets,
      message: `${clipAssets.length} clips generated successfully`
    });
  } catch (error) {
    console.error('Auto-clip error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v2/marketing/video/templates
 * List video templates
 */
router.get('/video/templates', requireAuth, async (req, res) => {
  try {
    const { category, platform, tier } = req.query;
    
    const templateService = getVideoTemplateService();
    const templates = await templateService.listTemplates({
      category,
      platform,
      tier
    });

    res.json({
      success: true,
      templates
    });
  } catch (error) {
    console.error('List templates error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/v2/marketing/video/templates/:id
 * Get template by ID
 */
router.get('/video/templates/:id', requireAuth, async (req, res) => {
  try {
    const templateService = getVideoTemplateService();
    const template = await templateService.getTemplate(req.params.id);

    res.json({
      success: true,
      template
    });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v2/marketing/video/apply-template
 * Apply template to video
 */
router.post('/video/apply-template', requireAuth, upload.single('video'), async (req, res) => {
  try {
    const { templateId, options = {} } = req.body;
    const videoFile = req.file;

    if (!videoFile) {
      return res.status(400).json({ success: false, error: 'Video file is required' });
    }

    if (!templateId) {
      return res.status(400).json({ success: false, error: 'Template ID is required' });
    }

    const templateService = getVideoTemplateService();
    const outputPath = await templateService.applyTemplate(
      videoFile.path,
      templateId,
      typeof options === 'string' ? JSON.parse(options) : options
    );

    // Create asset for templated video
    const assetResult = await AssetService.createAsset({
      owner_type: req.isAdmin ? 'admin' : 'user',
      owner_id: _uid(req),
      type: 'video',
      file_path: outputPath,
      metadata: JSON.stringify({
        originalName: videoFile.originalname,
        templateId
      })
    });

    res.json({
      success: true,
      assetId: assetResult.assetId,
      outputPath,
      message: 'Template applied successfully'
    });
  } catch (error) {
    console.error('Apply template error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v2/marketing/video/templates
 * Create new template (admin only)
 */
router.post('/video/templates', requireAdmin, async (req, res) => {
  try {
    const templateService = getVideoTemplateService();
    const templateId = await templateService.createTemplate(req.body);

    res.json({
      success: true,
      templateId,
      message: 'Template created successfully'
    });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================================
// HEALTH CHECK
// ============================================================================

// =============================================================================
// AI CONTENT GENERATION ROUTES
// =============================================================================

const { getContentGenerationService } = require('./services/ai/ContentGenerationService');

/**
 * GET /api/v2/marketing/ai/status
 * Check if AI generation is available
 */
router.get('/ai/status', requireAuth, (req, res) => {
  const aiService = getContentGenerationService();
  res.json({
    success: true,
    available: aiService.isAvailable(),
  });
});

/**
 * POST /api/v2/marketing/ai/caption
 * Generate a caption for a single post (Build-a-Post flow)
 * Body: { platform, mediaDescription?, tone?, goal?, additionalNotes? }
 */
router.post('/ai/caption', requireAuth, async (req, res) => {
  try {
    const aiService = getContentGenerationService();
    if (!aiService.isAvailable()) {
      return res.status(503).json({ success: false, error: 'AI service not configured' });
    }

    const { platform, mediaDescription, tone, goal, additionalNotes } = req.body;
    if (!platform) {
      return res.status(400).json({ success: false, error: 'Platform is required' });
    }

    const result = await aiService.generateCaption({
      userId: req.userId,
      platform,
      mediaDescription,
      tone,
      goal,
      additionalNotes,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('AI caption generation error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate caption' });
  }
});

/**
 * GET /api/v2/marketing/ai/composition-templates
 * List available composition templates for post media styling.
 * Higher tiers can select templates; free tier gets auto-assigned.
 */
router.get('/ai/composition-templates', requireAuth, (req, res) => {
  try {
    const { getMediaComposerService } = require('./services/ai/MediaComposerService');
    // Read templates from the COMPOSITION_TEMPLATES constant
    const templates = require('./services/ai/MediaComposerService').COMPOSITION_TEMPLATES || [];
    const list = templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
    }));
    res.json({ success: true, templates: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v2/marketing/ai/campaign
 * Generate a full campaign with AI-created post concepts
 * Body: { campaignName, campaignGoal, platforms[], startDate, endDate, postCount? }
 */
router.post('/ai/campaign', requireAuth, async (req, res) => {
  try {
    const aiService = getContentGenerationService();
    if (!aiService.isAvailable()) {
      return res.status(503).json({ success: false, error: 'AI service not configured' });
    }

    const { campaignName, campaignGoal, platforms, startDate, endDate, postCount, connectCRM, crmEmailEnabled, connectDrip, connectCollection } = req.body;
    if (!campaignName || !campaignGoal || !platforms || !startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Missing required fields: campaignName, campaignGoal, platforms, startDate, endDate' });
    }

    const ownerType = _isAdmin(req) ? 'admin' : 'user';
    const platformList = Array.isArray(platforms) ? platforms : [platforms];

    // Phase 1-3: Generate text → match media → compose platform-ready assets
    const result = await aiService.generateCampaignContent({
      userId: _uid(req),
      ownerType,
      campaignName,
      campaignGoal,
      platforms: platformList,
      startDate,
      endDate,
      postCount,
      crmEmailEnabled: !!(connectCRM && crmEmailEnabled),
      dripEnabled: !!connectDrip,
      collectionEnabled: !!connectCollection,
    });

    // Persist: Create the campaign record
    const campaignResult = await CampaignService.createCampaign({
      name: campaignName,
      description: `AI-generated campaign. Goal: ${campaignGoal}. Platforms: ${platformList.join(', ')}.`,
      type: 'social',
      status: 'draft',
      owner_type: ownerType,
      owner_id: req.userId,
      start_date: startDate,
      end_date: endDate,
      goals: JSON.stringify({
        goal: campaignGoal,
        platforms: platformList,
        dataRichness: result.dataRichness,
        mediaMatchStats: result.mediaMatchStats,
      }),
    });

    if (!campaignResult.success) {
      return res.status(500).json({ success: false, error: 'Campaign generated but failed to save: ' + campaignResult.error });
    }

    const campaignId = campaignResult.campaign_id;

    // Persist: Create content records for each generated post
    const savedPosts = [];
    for (const post of (result.posts || [])) {
      try {
        const contentPayload = {
          caption: post.caption || '',
          hashtags: post.hashtags || [],
          callToAction: post.callToAction || '',
          title: post.title || '',
          suggestedMediaDescription: post.suggestedMediaDescription || '',
          visualDirection: post.visualDirection || '',
          rationale: post.rationale || '',
          suggestedDay: post.suggestedDay,
          suggestedTime: post.suggestedTime,
          // Media matching results
          matchedMedia: post.matchedMedia || null,
          mediaCandidates: post.mediaCandidates || [],
          mediaSource: post.mediaSource || 'none',
          composition: post.composition || null,
        };

        const contentResult = await ContentService.createContent({
          campaign_id: campaignId,
          type: post.type || 'post',
          channel: post.platform || platformList[0],
          content: contentPayload,
          status: 'draft',
          created_by: 'ai',
        });

        if (contentResult.success) {
          savedPosts.push({ ...contentPayload, id: contentResult.content.id, platform: post.platform });
        }
      } catch (postErr) {
        console.error(`Failed to save post "${post.title}":`, postErr.message);
      }
    }

    res.json({
      success: true,
      data: {
        campaignId,
        campaignName,
        posts: savedPosts,
        totalPosts: savedPosts.length,
        brandContext: result.brandContext ? { name: result.brandContext.name, style: result.brandContext.style, dataRichness: result.dataRichness } : null,
        mediaMatchStats: result.mediaMatchStats,
      },
    });
  } catch (error) {
    console.error('AI campaign generation error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to generate campaign content' });
  }
});

/**
 * POST /api/v2/marketing/ai/revise
 * Revise a post based on user feedback
 * Body: { originalPost, feedback, platform }
 */
router.post('/ai/revise', requireAuth, async (req, res) => {
  try {
    const aiService = getContentGenerationService();
    if (!aiService.isAvailable()) {
      return res.status(503).json({ success: false, error: 'AI service not configured' });
    }

    const { originalPost, feedback, platform } = req.body;
    if (!originalPost || !feedback || !platform) {
      return res.status(400).json({ success: false, error: 'Missing required fields: originalPost, feedback, platform' });
    }

    const result = await aiService.revisePost({
      userId: req.userId,
      originalPost,
      feedback,
      platform,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('AI revision error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to revise post' });
  }
});

/**
 * POST /api/v2/marketing/ai/reimagine
 * Generate a completely different take on a post
 * Body: { originalPost, platform, mediaDescription? }
 */
router.post('/ai/reimagine', requireAuth, async (req, res) => {
  try {
    const aiService = getContentGenerationService();
    if (!aiService.isAvailable()) {
      return res.status(503).json({ success: false, error: 'AI service not configured' });
    }

    const { originalPost, platform, mediaDescription } = req.body;
    if (!originalPost || !platform) {
      return res.status(400).json({ success: false, error: 'Missing required fields: originalPost, platform' });
    }

    const result = await aiService.reimaginePost({
      userId: req.userId,
      originalPost,
      platform,
      mediaDescription,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('AI reimagine error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to reimagine post' });
  }
});

/**
 * POST /api/v2/marketing/ai/suggest-time
 * Suggest optimal posting time
 * Body: { platform, contentType?, timezone? }
 */
router.post('/ai/suggest-time', requireAuth, async (req, res) => {
  try {
    const aiService = getContentGenerationService();
    if (!aiService.isAvailable()) {
      return res.status(503).json({ success: false, error: 'AI service not configured' });
    }

    const { platform, contentType, timezone } = req.body;
    if (!platform) {
      return res.status(400).json({ success: false, error: 'Platform is required' });
    }

    const ownerType = _isAdmin(req) ? 'admin' : 'user';

    const result = await aiService.suggestPostingTime({
      userId: req.userId,
      ownerType,
      platform,
      contentType,
      timezone,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('AI time suggestion error:', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to suggest posting time' });
  }
});

// =============================================================================
// CONTENT SUBMISSION ROUTES (Share Content page)
// =============================================================================

const contentSubmissionService = require('./services/content');

/**
 * GET /api/v2/marketing/user-info
 * Get user info for share-content form prefill
 */
router.get('/user-info', requireAuth, async (req, res) => {
  try {
    const userId = _uid(req);
    const [users] = await db.execute(
      `SELECT u.id, u.username, u.user_type,
              up.display_name, up.first_name, up.last_name,
              ap.business_name AS artist_business_name,
              pp.business_name AS promoter_business_name
       FROM users u
       LEFT JOIN user_profiles up ON u.id = up.user_id
       LEFT JOIN artist_profiles ap ON u.id = ap.user_id
       LEFT JOIN promoter_profiles pp ON u.id = pp.user_id
       WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const user = users[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.username,
        user_type: user.user_type,
        display_name: user.display_name,
        first_name: user.first_name,
        last_name: user.last_name,
        business_name: user.artist_business_name || user.promoter_business_name || null
      }
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user info' });
  }
});

/**
 * GET /api/v2/marketing/my-submissions
 * Get current user's content submissions
 */
router.get('/my-submissions', requireAuth, async (req, res) => {
  try {
    const userId = _uid(req);
    const [rows] = await db.execute(
      `SELECT id, image_path, original_filename, mime_type, file_size,
              description, status, media_used, created_at
       FROM user_media_submissions
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    for (const row of rows) {
      const media = await getProcessedMediaUrls(row.image_path, 'detail');
      row.image_url = media?.image_url || null;
      row.thumbnail_url = media?.thumbnail_url || null;
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Get my submissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
  }
});

/**
 * POST /api/v2/marketing/submit
 * Submit marketing content with files
 */
router.post('/submit', requireAuth, uploadLimiter, upload.array('marketing_media', 10), async (req, res) => {
  try {
    const userId = _uid(req);
    const { description } = req.body;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'At least one file is required' });
    }

    const insertedIds = [];
    for (const file of req.files) {
      const imagePath = `/temp_images/marketing/${file.filename}`;

      // Insert into pending_images for remote VM processing
      const [pendingResult] = await db.execute(
        `INSERT INTO pending_images (user_id, image_path, original_name, mime_type, status)
         VALUES (?, ?, ?, ?, 'pending')`,
        [userId, imagePath, file.originalname, file.mimetype]
      );

      // Insert into user_media_submissions
      const [subResult] = await db.execute(
        `INSERT INTO user_media_submissions
         (user_id, pending_image_id, image_path, original_filename, mime_type, file_size, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, pendingResult.insertId, imagePath, file.originalname, file.mimetype, file.size, description || null]
      );
      insertedIds.push(subResult.insertId);
    }

    res.json({
      success: true,
      data: { ids: insertedIds, count: insertedIds.length },
      message: 'Content submitted successfully'
    });
  } catch (error) {
    console.error('Submit content error:', error);
    res.status(500).json({ success: false, error: 'Failed to submit content' });
  }
});

/**
 * GET /api/v2/marketing/admin/submissions
 * Get all content submissions (admin only)
 */
router.get('/admin/submissions', requireAuth, async (req, res) => {
  try {
    if (!_isAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 24));
    const offset = (page - 1) * limit;

    let baseQuery = `
      FROM user_media_submissions s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      LEFT JOIN artist_profiles ap ON u.id = ap.user_id
      LEFT JOIN promoter_profiles pp ON u.id = pp.user_id
    `;
    const conditions = [];
    const params = [];

    if (req.query.status) { conditions.push('s.status = ?'); params.push(req.query.status); }
    if (req.query.user_id) { conditions.push('s.user_id = ?'); params.push(req.query.user_id); }
    if (req.query.media_used !== undefined) { conditions.push('s.media_used = ?'); params.push(req.query.media_used === 'true' ? 1 : 0); }
    if (req.query.mime_type) { conditions.push('s.mime_type LIKE ?'); params.push(req.query.mime_type + '%'); }

    if (req.query.search) {
      const term = `%${req.query.search}%`;
      conditions.push(`(s.description LIKE ? OR s.original_filename LIKE ? OR up.first_name LIKE ? OR up.last_name LIKE ? OR u.username LIKE ? OR COALESCE(ap.business_name, pp.business_name) LIKE ?)`);
      params.push(term, term, term, term, term, term);
    }

    if (conditions.length) baseQuery += ' WHERE ' + conditions.join(' AND ');

    const sortableColumns = { created_at: 's.created_at', original_filename: 's.original_filename', status: 's.status', media_used: 's.media_used' };
    const sortCol = sortableColumns[req.query.sort] || 's.created_at';
    const sortOrder = req.query.order === 'asc' ? 'ASC' : 'DESC';

    const [countResult] = await db.execute(`SELECT COUNT(*) as total ${baseQuery}`, params);
    const total = countResult[0].total;

    const [rows] = await db.execute(
      `SELECT s.*, u.username as email, up.first_name, up.last_name, up.display_name, COALESCE(ap.business_name, pp.business_name) as business_name ${baseQuery} ORDER BY ${sortCol} ${sortOrder} LIMIT ${limit} OFFSET ${offset}`,
      params
    );

    for (const row of rows) {
      const media = await getProcessedMediaUrls(row.image_path, 'detail');
      row.image_url = media?.image_url || null;
      row.thumbnail_url = media?.thumbnail_url || null;
    }

    res.json({ success: true, data: rows, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('Get all submissions error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch submissions' });
  }
});

/**
 * GET /api/v2/marketing/admin/submissions/:id
 * Get a single submission (admin only)
 */
router.get('/admin/submissions/:id', requireAuth, async (req, res) => {
  try {
    if (!_isAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    const [rows] = await db.execute(
      `SELECT s.*, u.first_name, u.last_name, u.email, u.business_name
       FROM user_media_submissions s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Submission not found' });
    }
    const item = rows[0];
    const media = await getProcessedMediaUrls(item.image_path, 'detail');
    item.image_url = media?.image_url || null;
    item.thumbnail_url = media?.thumbnail_url || null;
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch submission' });
  }
});

/**
 * PUT /api/v2/marketing/admin/submissions/:id/notes
 * Update admin notes on a submission
 */
router.put('/admin/submissions/:id/notes', requireAuth, async (req, res) => {
  try {
    if (!_isAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    await db.execute(
      'UPDATE user_media_submissions SET admin_notes = ? WHERE id = ?',
      [req.body.admin_notes, req.params.id]
    );
    res.json({ success: true, message: 'Notes updated' });
  } catch (error) {
    console.error('Update notes error:', error);
    res.status(500).json({ success: false, error: 'Failed to update notes' });
  }
});

/**
 * PUT /api/v2/marketing/admin/submissions/:id/status
 * Update submission status
 */
router.put('/admin/submissions/:id/status', requireAuth, async (req, res) => {
  try {
    if (!_isAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    await db.execute(
      'UPDATE user_media_submissions SET status = ? WHERE id = ?',
      [req.body.status, req.params.id]
    );
    res.json({ success: true, message: 'Status updated' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

/**
 * PUT /api/v2/marketing/admin/submissions/:id/media-used
 * Toggle media_used flag
 */
router.put('/admin/submissions/:id/media-used', requireAuth, async (req, res) => {
  try {
    if (!_isAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    await db.execute(
      'UPDATE user_media_submissions SET media_used = ? WHERE id = ?',
      [req.body.media_used ? 1 : 0, req.params.id]
    );
    res.json({ success: true, message: 'Media used flag updated' });
  } catch (error) {
    console.error('Update media_used error:', error);
    res.status(500).json({ success: false, error: 'Failed to update media used flag' });
  }
});

/**
 * DELETE /api/v2/marketing/admin/submissions/:id
 * Delete a submission
 */
router.delete('/admin/submissions/:id', requireAuth, async (req, res) => {
  try {
    if (!_isAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }
    await db.execute('DELETE FROM user_media_submissions WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Submission deleted' });
  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete submission' });
  }
});

/**
 * GET /api/v2/marketing/admin/submissions/:id/download
 * Download the original (uncompressed) file for a submission
 */
router.get('/admin/submissions/:id/download', requireAuth, async (req, res) => {
  try {
    if (!_isAdmin(req)) {
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const [rows] = await db.execute(
      'SELECT s.*, pi.permanent_url, pi.status as processing_status FROM user_media_submissions s LEFT JOIN pending_images pi ON s.pending_image_id = pi.id WHERE s.id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, error: 'Submission not found' });

    const item = rows[0];
    const filename = item.original_filename || item.image_path.split('/').pop();

    // If VM has processed it, proxy the original from the media backend
    if ((item.processing_status === 'processed' || item.processing_status === 'complete') && item.permanent_url) {
      const MEDIA_BACKEND_URL = process.env.MEDIA_BACKEND_URL || 'http://10.128.0.29:3001';
      const MEDIA_API_KEY = process.env.MEDIA_API_KEY || process.env.MAIN_API_KEY || '';
      try {
        const axios = require('axios');
        const mediaResponse = await axios.get(`${MEDIA_BACKEND_URL}/serve/${item.permanent_url}?size=zoom`, {
          headers: { Authorization: `Bearer ${MEDIA_API_KEY}` },
          responseType: 'stream',
          timeout: 30000
        });
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        if (mediaResponse.headers['content-type']) res.setHeader('Content-Type', mediaResponse.headers['content-type']);
        mediaResponse.data.pipe(res);
        return;
      } catch (proxyErr) {
        console.error('Media backend download failed, falling back to temp:', proxyErr.message);
      }
    }

    // Fallback: serve temp file from disk
    const fs = require('fs');
    const fullPath = path.join(__dirname, '../../../../', item.image_path.replace(/^\//, ''));
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, error: 'File not found on disk' });
    }
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', item.mime_type || 'application/octet-stream');
    fs.createReadStream(fullPath).pipe(res);
  } catch (error) {
    console.error('Download submission error:', error);
    res.status(500).json({ success: false, error: 'Failed to download file' });
  }
});

// =============================================================================
// HEALTH CHECK
// =============================================================================

// =============================================================================
// BRAND VOICE CONFIGURATION
// =============================================================================

/**
 * GET /api/v2/marketing/brand-voice
 * Get the current user's brand voice configuration
 */
router.get('/brand-voice', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const [rows] = await db.query('SELECT brand_voice FROM users WHERE id = ?', [userId]);
    const brandVoice = rows[0]?.brand_voice
      ? (typeof rows[0].brand_voice === 'string' ? JSON.parse(rows[0].brand_voice) : rows[0].brand_voice)
      : null;

    res.json({ success: true, brandVoice: brandVoice || {} });
  } catch (error) {
    console.error('[Marketing] Error fetching brand voice:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch brand voice' });
  }
});

/**
 * PUT /api/v2/marketing/brand-voice
 * Update the current user's brand voice configuration
 *
 * Body: { voice_tone, writing_style, brand_personality, emoji_usage,
 *         banned_phrases (array), example_posts (array), target_audience }
 */
router.put('/brand-voice', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    const allowed = ['voice_tone', 'writing_style', 'brand_personality', 'emoji_usage',
                     'banned_phrases', 'example_posts', 'target_audience'];
    const brandVoice = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        brandVoice[key] = req.body[key];
      }
    }

    await db.query('UPDATE users SET brand_voice = ? WHERE id = ?', [JSON.stringify(brandVoice), userId]);
    res.json({ success: true, brandVoice });
  } catch (error) {
    console.error('[Marketing] Error saving brand voice:', error.message);
    res.status(500).json({ success: false, error: 'Failed to save brand voice' });
  }
});

/**
 * GET /api/v2/marketing/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  const aiService = getContentGenerationService();
  res.json({
    success: true,
    message: 'Marketing module is healthy',
    version: '2.0.0',
    sprint: 'Social Central - AI Content Generation',
    aiAvailable: aiService.isAvailable(),
  });
});

module.exports = router;
