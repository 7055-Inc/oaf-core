/**
 * Drip Campaigns Routes
 * RESTful API endpoints for automated email drip campaigns
 * 
 * Sections:
 * - Admin endpoints (campaign management, analytics)
 * - User endpoints (available campaigns, preferences)
 * - Internal endpoints (queue processing, event tracking)
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requirePermission } = require('../auth/middleware');

// Services
const CampaignService = require('./services/campaigns');
const EnrollmentService = require('./services/enrollments');
const FrequencyManager = require('./services/frequency');
const AnalyticsService = require('./services/analytics');
const EmailService = require('../../services/emailService');

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * 1. GET /api/v2/drip-campaigns/admin/campaigns
 * Get all campaigns with filters
 */
router.get('/admin/campaigns', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const result = await CampaignService.getAllCampaigns(req.query, req.query);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get campaigns error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 2. GET /api/v2/drip-campaigns/admin/campaigns/:id
 * Get single campaign with details
 */
router.get('/admin/campaigns/:id', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const campaign = await CampaignService.getCampaignById(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    
    return res.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Get campaign error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 3. POST /api/v2/drip-campaigns/admin/campaigns
 * Create new campaign
 */
router.post('/admin/campaigns', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const campaign = await CampaignService.createCampaign(req.body);
    return res.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Create campaign error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 4. PUT /api/v2/drip-campaigns/admin/campaigns/:id
 * Update campaign
 */
router.put('/admin/campaigns/:id', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const campaign = await CampaignService.updateCampaign(req.params.id, req.body);
    return res.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Update campaign error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 5. DELETE /api/v2/drip-campaigns/admin/campaigns/:id
 * Delete campaign
 */
router.delete('/admin/campaigns/:id', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const deleted = await CampaignService.deleteCampaign(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Campaign not found' });
    }
    
    return res.json({ success: true, message: 'Campaign deleted' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 6. POST /api/v2/drip-campaigns/admin/campaigns/:id/publish
 * Publish campaign
 */
router.post('/admin/campaigns/:id/publish', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const campaign = await CampaignService.publishCampaign(req.params.id);
    return res.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Publish campaign error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 7. POST /api/v2/drip-campaigns/admin/campaigns/:id/unpublish
 * Unpublish campaign
 */
router.post('/admin/campaigns/:id/unpublish', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const campaign = await CampaignService.unpublishCampaign(req.params.id);
    return res.json({ success: true, data: campaign });
  } catch (error) {
    console.error('Unpublish campaign error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 8. POST /api/v2/drip-campaigns/admin/campaigns/:campaignId/steps
 * Add step to campaign
 */
router.post('/admin/campaigns/:campaignId/steps', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const step = await CampaignService.addStep(req.params.campaignId, req.body);
    return res.json({ success: true, data: { step } });
  } catch (error) {
    console.error('Add step error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 9. PUT /api/v2/drip-campaigns/admin/steps/:id
 * Update step
 */
router.put('/admin/steps/:id', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const step = await CampaignService.updateStep(req.params.id, req.body);
    return res.json({ success: true, data: { step } });
  } catch (error) {
    console.error('Update step error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 10. DELETE /api/v2/drip-campaigns/admin/steps/:id
 * Delete step
 */
router.delete('/admin/steps/:id', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const deleted = await CampaignService.deleteStep(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Step not found' });
    }
    
    return res.json({ success: true, message: 'Step deleted' });
  } catch (error) {
    console.error('Delete step error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 11. POST /api/v2/drip-campaigns/admin/campaigns/:campaignId/steps/reorder
 * Reorder steps
 */
router.post('/admin/campaigns/:campaignId/steps/reorder', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { step_ids } = req.body;
    
    if (!step_ids || !Array.isArray(step_ids)) {
      return res.status(400).json({ success: false, error: 'step_ids array required' });
    }
    
    const steps = await CampaignService.reorderSteps(req.params.campaignId, step_ids);
    return res.json({ success: true, data: { steps } });
  } catch (error) {
    console.error('Reorder steps error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 12. POST /api/v2/drip-campaigns/admin/campaigns/:campaignId/triggers
 * Add trigger to campaign
 */
router.post('/admin/campaigns/:campaignId/triggers', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const trigger = await CampaignService.addTrigger(req.params.campaignId, req.body);
    return res.json({ success: true, data: { trigger } });
  } catch (error) {
    console.error('Add trigger error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 13. PUT /api/v2/drip-campaigns/admin/triggers/:id
 * Update trigger
 */
router.put('/admin/triggers/:id', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const trigger = await CampaignService.updateTrigger(req.params.id, req.body);
    return res.json({ success: true, data: { trigger } });
  } catch (error) {
    console.error('Update trigger error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 14. DELETE /api/v2/drip-campaigns/admin/triggers/:id
 * Delete trigger
 */
router.delete('/admin/triggers/:id', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const deleted = await CampaignService.deleteTrigger(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Trigger not found' });
    }
    
    return res.json({ success: true, message: 'Trigger deleted' });
  } catch (error) {
    console.error('Delete trigger error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 15. GET /api/v2/drip-campaigns/admin/campaigns/:campaignId/enrollments
 * Get campaign enrollments
 */
router.get('/admin/campaigns/:campaignId/enrollments', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const result = await EnrollmentService.getCampaignEnrollments(req.params.campaignId, req.query);
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Get campaign enrollments error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 16. GET /api/v2/drip-campaigns/admin/users/:userId/enrollments
 * Get user's enrollments
 */
router.get('/admin/users/:userId/enrollments', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const enrollments = await EnrollmentService.getUserEnrollments(req.params.userId, req.query);
    return res.json({ success: true, data: { enrollments } });
  } catch (error) {
    console.error('Get user enrollments error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 17. POST /api/v2/drip-campaigns/admin/enroll
 * Manually enroll user
 */
router.post('/admin/enroll', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { user_id, campaign_id, context_data } = req.body;
    
    if (!user_id || !campaign_id) {
      return res.status(400).json({ success: false, error: 'user_id and campaign_id required' });
    }
    
    const enrollment = await EnrollmentService.enrollUser(user_id, campaign_id, context_data || {});
    return res.json({ success: true, data: { enrollment } });
  } catch (error) {
    console.error('Enroll user error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 18. POST /api/v2/drip-campaigns/admin/enrollments/:id/exit
 * Exit user from campaign
 */
router.post('/admin/enrollments/:id/exit', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const { exit_reason } = req.body;
    const enrollment = await EnrollmentService.exitEnrollment(req.params.id, exit_reason || 'manual_exit');
    return res.json({ success: true, data: { enrollment } });
  } catch (error) {
    console.error('Exit enrollment error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 19. POST /api/v2/drip-campaigns/admin/enrollments/:id/pause
 * Pause enrollment
 */
router.post('/admin/enrollments/:id/pause', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const enrollment = await EnrollmentService.pauseEnrollment(req.params.id);
    return res.json({ success: true, data: { enrollment } });
  } catch (error) {
    console.error('Pause enrollment error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 20. POST /api/v2/drip-campaigns/admin/enrollments/:id/resume
 * Resume enrollment
 */
router.post('/admin/enrollments/:id/resume', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const enrollment = await EnrollmentService.resumeEnrollment(req.params.id);
    return res.json({ success: true, data: { enrollment } });
  } catch (error) {
    console.error('Resume enrollment error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 21. GET /api/v2/drip-campaigns/admin/campaigns/:campaignId/analytics
 * Get campaign analytics
 */
router.get('/admin/campaigns/:campaignId/analytics', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const analytics = await AnalyticsService.getCampaignAnalytics(req.params.campaignId, req.query);
    return res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Get campaign analytics error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 22. GET /api/v2/drip-campaigns/admin/analytics/summary
 * Get all campaigns analytics summary
 */
router.get('/admin/analytics/summary', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const summary = await AnalyticsService.getAllCampaignsAnalyticsSummary();
    return res.json({ success: true, data: { campaigns: summary } });
  } catch (error) {
    console.error('Get analytics summary error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 23. GET /api/v2/drip-campaigns/admin/analytics/conversions
 * Get conversion report
 */
router.get('/admin/analytics/conversions', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const report = await AnalyticsService.getConversionReport(req.query);
    return res.json({ success: true, data: report });
  } catch (error) {
    console.error('Get conversion report error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 24. GET /api/v2/drip-campaigns/admin/analytics/frequency
 * Get frequency analytics
 */
router.get('/admin/analytics/frequency', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const analytics = await AnalyticsService.getFrequencyAnalytics();
    return res.json({ success: true, data: analytics });
  } catch (error) {
    console.error('Get frequency analytics error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// USER ENDPOINTS
// ============================================

/**
 * 25. GET /api/v2/drip-campaigns/campaigns
 * Get available campaigns for user
 */
router.get('/campaigns', requireAuth, async (req, res) => {
  try {
    const db = require('../../../config/db');
    
    // Get published system campaigns
    const [campaigns] = await db.execute(
      `SELECT 
        dc.id, dc.campaign_key, dc.name, dc.description, dc.category,
        CASE WHEN udp.is_enabled = 1 THEN 1 ELSE 0 END as is_enabled,
        CASE WHEN de.id IS NOT NULL THEN 1 ELSE 0 END as is_enrolled
      FROM drip_campaigns dc
      LEFT JOIN user_drip_preferences udp ON dc.id = udp.campaign_id AND udp.user_id = ?
      LEFT JOIN drip_enrollments de ON dc.id = de.campaign_id AND de.user_id = ? AND de.status = 'active'
      WHERE dc.is_system = 1 AND dc.is_published = 1 AND dc.is_active = 1
      ORDER BY dc.priority_level DESC, dc.name ASC`,
      [req.userId, req.userId]
    );
    
    return res.json({ success: true, data: { campaigns } });
  } catch (error) {
    console.error('Get campaigns error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 26. GET /api/v2/drip-campaigns/my-campaigns
 * Get user's active campaigns with progress
 */
router.get('/my-campaigns', requireAuth, async (req, res) => {
  try {
    const enrollments = await EnrollmentService.getUserEnrollments(req.userId, { status: 'active' });
    return res.json({ success: true, data: { enrollments } });
  } catch (error) {
    console.error('Get my campaigns error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 27. POST /api/v2/drip-campaigns/campaigns/:campaignId/enable
 * Enable campaign for user
 */
router.post('/campaigns/:campaignId/enable', requireAuth, async (req, res) => {
  try {
    const db = require('../../../config/db');
    
    // Add to preferences
    await db.execute(
      `INSERT INTO user_drip_preferences (user_id, campaign_id, is_enabled)
      VALUES (?, ?, 1)
      ON DUPLICATE KEY UPDATE is_enabled = 1, updated_at = CURRENT_TIMESTAMP`,
      [req.userId, req.params.campaignId]
    );
    
    // Check if should auto-enroll (depends on campaign triggers)
    // For now, we'll let triggers handle enrollment
    
    return res.json({ success: true, message: 'Campaign enabled' });
  } catch (error) {
    console.error('Enable campaign error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 28. POST /api/v2/drip-campaigns/campaigns/:campaignId/disable
 * Disable campaign for user
 */
router.post('/campaigns/:campaignId/disable', requireAuth, async (req, res) => {
  try {
    const db = require('../../../config/db');
    
    // Update preference
    await db.execute(
      `UPDATE user_drip_preferences SET is_enabled = 0, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND campaign_id = ?`,
      [req.userId, req.params.campaignId]
    );
    
    // Exit active enrollment
    const [enrollments] = await db.execute(
      'SELECT id FROM drip_enrollments WHERE user_id = ? AND campaign_id = ? AND status = \'active\'',
      [req.userId, req.params.campaignId]
    );
    
    if (enrollments.length > 0) {
      await EnrollmentService.exitEnrollment(enrollments[0].id, 'user_disabled');
    }
    
    return res.json({ success: true, message: 'Campaign disabled' });
  } catch (error) {
    console.error('Disable campaign error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 29. GET /api/v2/drip-campaigns/my-campaigns/:campaignId/analytics
 * Get user's campaign analytics
 */
router.get('/my-campaigns/:campaignId/analytics', requireAuth, async (req, res) => {
  try {
    const db = require('../../../config/db');
    
    // Get user's enrollment
    const [enrollments] = await db.execute(
      'SELECT * FROM drip_enrollments WHERE user_id = ? AND campaign_id = ?',
      [req.userId, req.params.campaignId]
    );
    
    if (enrollments.length === 0) {
      return res.status(404).json({ success: false, error: 'Not enrolled in this campaign' });
    }
    
    const enrollment = enrollments[0];
    
    // Get events for this enrollment
    const [events] = await db.execute(
      `SELECT event_type, COUNT(*) as count
      FROM drip_events
      WHERE enrollment_id = ?
      GROUP BY event_type`,
      [enrollment.id]
    );
    
    // Get conversions
    const [conversions] = await db.execute(
      'SELECT * FROM drip_conversions WHERE enrollment_id = ?',
      [enrollment.id]
    );
    
    return res.json({
      success: true,
      data: {
        enrollment,
        events,
        conversions
      }
    });
  } catch (error) {
    console.error('Get my campaign analytics error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 30. POST /api/v2/drip-campaigns/enrollments/:id/unsubscribe
 * Unsubscribe from campaign
 */
router.post('/enrollments/:id/unsubscribe', async (req, res) => {
  try {
    await EnrollmentService.exitEnrollment(req.params.id, 'unsubscribed');
    return res.json({ success: true, message: 'Unsubscribed from campaign' });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

// ============================================
// INTERNAL/SERVICE ENDPOINTS
// ============================================

/**
 * 31. POST /api/v2/drip-campaigns/internal/process-queue
 * Process queue (called by cron)
 */
router.post('/internal/process-queue', async (req, res) => {
  try {
    const results = {
      processed: 0,
      sent: 0,
      suppressed: 0,
      expired: 0,
      errors: 0
    };
    
    // Get enrollments ready to send
    const enrollments = await EnrollmentService.getEnrollmentsReadyToSend();
    results.processed = enrollments.length;
    
    // Prioritize by frequency limits
    const prioritized = await FrequencyManager.prioritizeQueue(enrollments);
    
    // Process each enrollment
    for (const enrollment of prioritized) {
      try {
        // Check if user can receive email
        const canSend = await FrequencyManager.canSendToUser(enrollment.user_id);
        
        if (!canSend.canSend) {
          results.suppressed++;
          continue;
        }
        
        // Process send
        const result = await EnrollmentService.processNextSend(enrollment);
        
        if (result.status === 'sent') {
          results.sent++;
          // Record frequency
          await FrequencyManager.recordEmailSent(
            enrollment.user_id,
            enrollment.campaign_id,
            enrollment.id
          );
        } else if (result.status === 'expired') {
          results.expired++;
        }
      } catch (error) {
        console.error(`Error processing enrollment ${enrollment.id}:`, error);
        results.errors++;
      }
    }
    
    return res.json({ success: true, data: results });
  } catch (error) {
    console.error('Process queue error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 32. POST /api/v2/drip-campaigns/internal/trigger
 * Handle behavior trigger
 */
router.post('/internal/trigger', async (req, res) => {
  try {
    const { trigger_type, user_id, behavior_type, behavior_data } = req.body;
    
    if (!trigger_type || !user_id) {
      return res.status(400).json({ success: false, error: 'trigger_type and user_id required' });
    }
    
    const results = {
      enrollments_created: 0,
      campaigns: []
    };
    
    // Find matching triggers
    const triggers = await CampaignService.getActiveTriggers(trigger_type);
    
    for (const trigger of triggers) {
      // Check if user already enrolled
      const db = require('../../../config/db');
      const [existing] = await db.execute(
        'SELECT id FROM drip_enrollments WHERE user_id = ? AND campaign_id = ? AND status IN (\'active\', \'paused\')',
        [user_id, trigger.campaign_id]
      );
      
      if (existing.length > 0) {
        continue; // Already enrolled
      }
      
      // TODO: Evaluate trigger conditions (behavior thresholds, etc.)
      // For now, enroll if trigger matches
      
      try {
        await EnrollmentService.enrollUser(user_id, trigger.campaign_id, behavior_data || {});
        results.enrollments_created++;
        results.campaigns.push(trigger.campaign_key);
      } catch (error) {
        console.error(`Error enrolling in campaign ${trigger.campaign_id}:`, error);
      }
    }
    
    return res.json({ success: true, data: results });
  } catch (error) {
    console.error('Handle trigger error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 33. POST /api/v2/drip-campaigns/internal/track-event
 * Track email event
 */
router.post('/internal/track-event', async (req, res) => {
  try {
    const { enrollment_id, event_type, event_data } = req.body;
    
    if (!enrollment_id || !event_type) {
      return res.status(400).json({ success: false, error: 'enrollment_id and event_type required' });
    }
    
    await AnalyticsService.trackEvent(enrollment_id, event_type, event_data || {});
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Track event error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 34. POST /api/v2/drip-campaigns/internal/track-conversion
 * Track conversion
 */
router.post('/internal/track-conversion', async (req, res) => {
  try {
    const { user_id, conversion_type, conversion_value, conversion_data } = req.body;
    
    if (!user_id || !conversion_type) {
      return res.status(400).json({ success: false, error: 'user_id and conversion_type required' });
    }
    
    const result = await AnalyticsService.trackConversion(
      user_id,
      conversion_type,
      conversion_value || 0,
      conversion_data || {}
    );
    
    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('Track conversion error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * 35. POST /api/v2/drip-campaigns/internal/update-analytics
 * Update analytics (batch processing)
 */
router.post('/internal/update-analytics', async (req, res) => {
  try {
    const { campaign_id, step_number } = req.body;
    
    if (!campaign_id) {
      return res.status(400).json({ success: false, error: 'campaign_id required' });
    }
    
    await AnalyticsService.aggregateMetrics(campaign_id, step_number || null);
    
    return res.json({ success: true, message: 'Analytics updated' });
  } catch (error) {
    console.error('Update analytics error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// TESTING/DEBUG ENDPOINTS
// ============================================

/**
 * POST /api/v2/drip-campaigns/test/reset-frequency/:userId
 * Reset frequency tracking for user (dev/testing only)
 */
router.post('/test/reset-frequency/:userId', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    await FrequencyManager.resetFrequency(req.params.userId);
    return res.json({ success: true, message: 'Frequency tracking reset' });
  } catch (error) {
    console.error('Reset frequency error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/v2/drip-campaigns/test/trigger-campaign/:campaignId/:userId
 * Manually trigger campaign enrollment (dev/testing only)
 */
router.post('/test/trigger-campaign/:campaignId/:userId', requireAuth, requirePermission('manage_system'), async (req, res) => {
  try {
    const enrollment = await EnrollmentService.enrollUser(
      parseInt(req.params.userId),
      parseInt(req.params.campaignId),
      req.body || {}
    );
    return res.json({ success: true, data: { enrollment } });
  } catch (error) {
    console.error('Trigger campaign error:', error);
    return res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
