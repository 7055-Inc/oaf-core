/**
 * Marketing API Routes
 * 
 * Endpoints for marketing automation system
 * Mounted at /api/v2/marketing/*
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/var/www/staging/temp_images/marketing');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images, videos, audio, and documents
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|mp3|wav|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
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
      filters.owner_id = req.user.id;
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
      req.user.id,
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
      data.owner_id = req.user.id;
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
      req.user.id,
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
      req.user.id,
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
      filters.owner_id = req.user.id;
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
      req.user.id,
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
      req.user.id,
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
      req.user.id,
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
      req.user.id
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
      req.user.id,
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
      req.user.id,
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
      req.user.id,
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
      req.user.id
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
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      filters.owner_type = 'user';
      filters.owner_id = req.user.id;
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
      filters.owner_id = req.user.id;
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
      req.user.id,
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
router.post('/assets/upload', requireAuth, upload.single('file'), async (req, res) => {
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
      owner_type: req.user.role === 'admin' || req.user.role === 'super_admin' ? 'admin' : 'user',
      owner_id: req.user.id,
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
      req.user.id,
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
      req.user.id,
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
router.get('/oauth/:platform/authorize', requireAuth, async (req, res) => {
  try {
    const { platform } = req.params;
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    const redirectUri = `${baseUrl}/api/v2/marketing/oauth/${platform}/callback`;
    
    // Generate state for CSRF protection
    const state = Buffer.from(JSON.stringify({
      userId: req.user.id,
      userRole: req.user.role,
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
              <a href="/dashboard/marketing/connections">View Connections</a> | 
              <a href="/dashboard/marketing">Back to Marketing</a>
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
            <a href="/dashboard/marketing/connections">Try Again</a>
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
    const ownerType = req.user.role === 'admin' || req.user.role === 'super_admin' ? 'admin' : 'user';
    const ownerId = req.user.id;

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

/**
 * GET /api/v2/marketing/connections/:id
 * Get single connection details
 */
router.get('/connections/:id', requireAuth, async (req, res) => {
  try {
    const result = await OAuthService.getConnection(req.params.id);
    
    if (result.success) {
      // Verify ownership
      const ownerType = req.user.role === 'admin' || req.user.role === 'super_admin' ? 'admin' : 'user';
      const ownerId = req.user.id;

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
    const ownerType = req.user.role === 'admin' || req.user.role === 'super_admin' ? 'admin' : 'user';
    const ownerId = req.user.id;

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
      [req.user.id]
    );

    if (connections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active Google Ads connection found. Please connect your Google Ads account first.'
      });
    }

    const connection = connections[0];
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

    const publisher = new GoogleAdsPublisher(connections[0]);

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

    const publisher = new GoogleAdsPublisher(connections[0]);
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
      [req.user.id]
    );

    if (connections.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active Bing Ads connection found. Please connect your Microsoft Ads account first.'
      });
    }

    const connection = connections[0];
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

    const publisher = new BingAdsPublisher(connections[0]);

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

    const publisher = new BingAdsPublisher(connections[0]);
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
    req.body.created_by = req.user.id;
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
      owner_id: req.user.id,
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
      owner_id: req.user.id,
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
      owner_id: req.user.id,
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
      owner_id: req.user.id,
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
      owner_id: req.user.id,
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
      owner_id: req.user.id,
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
        owner_id: req.user.id,
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
      owner_id: req.user.id,
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

/**
 * GET /api/v2/marketing/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Marketing module is healthy',
    version: '1.0.0',
    sprint: 'C2 - Video System'
  });
});

module.exports = router;
