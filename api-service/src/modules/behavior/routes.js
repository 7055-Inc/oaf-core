/**
 * Behavior Tracking API Routes
 * 
 * Endpoints for collecting user behavioral data.
 * Mounted at /api/v2/behavior/*
 */

const express = require('express');
const router = express.Router();
const { getClickHouse } = require('./services/clickhouse');
const { verifyToken, requireAdmin } = require('../auth/middleware');

/**
 * POST /api/v2/behavior/track
 * Track a single event (PUBLIC - no auth required for tracking)
 * 
 * Body: { eventType, eventCategory?, eventAction?, eventData?, ... }
 */
router.post('/track', async (req, res) => {
  try {
    const clickhouse = getClickHouse();
    
    // Extract user ID from token if present (optional auth)
    let userId = 0;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwt = require('jsonwebtoken');
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId || decoded.id || 0;
      }
    } catch (e) {
      // No valid token, track as anonymous
    }

    const event = {
      userId,
      sessionId: req.body.sessionId || req.cookies?.session_id || '',
      anonymousId: req.body.anonymousId || req.cookies?.anonymous_id || '',
      eventType: req.body.eventType,
      eventCategory: req.body.eventCategory,
      eventAction: req.body.eventAction,
      eventData: req.body.eventData,
      pageUrl: req.body.pageUrl || req.headers.referer,
      pagePath: req.body.pagePath,
      referrer: req.body.referrer,
      deviceType: req.body.deviceType,
      deviceOs: req.body.deviceOs,
      browser: req.body.browser,
      screenWidth: req.body.screenWidth,
      screenHeight: req.body.screenHeight,
      source: req.body.source || 'web',
      utmSource: req.body.utmSource,
      utmMedium: req.body.utmMedium,
      utmCampaign: req.body.utmCampaign,
      clientTimestamp: req.body.clientTimestamp,
      gaClientId: req.body.gaClientId,
      fbClickId: req.body.fbClickId,
      // Geo will be filled from IP later
      country: '',
      region: '',
      city: ''
    };

    await clickhouse.insertEvent(event);

    res.status(204).send(); // No content - fastest response
  } catch (error) {
    console.error('[BEHAVIOR] Track error:', error);
    // Don't fail the request - tracking should never break the UX
    res.status(204).send();
  }
});

/**
 * POST /api/v2/behavior/track/batch
 * Track multiple events at once (for queued/batched tracking)
 */
router.post('/track/batch', async (req, res) => {
  try {
    const clickhouse = getClickHouse();
    const { events } = req.body;

    if (!events || !Array.isArray(events)) {
      return res.status(400).json({ success: false, error: 'events array required' });
    }

    // Extract user ID from token if present
    let userId = 0;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const jwt = require('jsonwebtoken');
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId || decoded.id || 0;
      }
    } catch (e) {
      // No valid token
    }

    const formattedEvents = events.map(e => ({
      userId: e.userId || userId,
      sessionId: e.sessionId || '',
      anonymousId: e.anonymousId || '',
      eventType: e.eventType,
      eventCategory: e.eventCategory,
      eventAction: e.eventAction,
      eventData: e.eventData,
      pageUrl: e.pageUrl,
      pagePath: e.pagePath,
      referrer: e.referrer,
      deviceType: e.deviceType,
      deviceOs: e.deviceOs,
      browser: e.browser,
      screenWidth: e.screenWidth,
      screenHeight: e.screenHeight,
      source: e.source || 'web',
      utmSource: e.utmSource,
      utmMedium: e.utmMedium,
      utmCampaign: e.utmCampaign,
      clientTimestamp: e.clientTimestamp,
      gaClientId: e.gaClientId,
      fbClickId: e.fbClickId,
    }));

    await clickhouse.insertEvents(formattedEvents);

    res.status(204).send();
  } catch (error) {
    console.error('[BEHAVIOR] Batch track error:', error);
    res.status(204).send();
  }
});

/**
 * GET /api/v2/behavior/health
 * Health check for behavior tracking system
 */
router.get('/health', async (req, res) => {
  try {
    const clickhouse = getClickHouse();
    const health = await clickhouse.healthCheck();
    
    res.json({
      status: health.healthy ? 'healthy' : 'unhealthy',
      service: 'behavior-tracking',
      clickhouse: health,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'behavior-tracking',
      error: error.message
    });
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

/**
 * GET /api/v2/behavior/admin/user/:userId
 * Get behavior summary for a specific user (admin only)
 */
router.get('/admin/user/:userId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const clickhouse = getClickHouse();
    const userId = parseInt(req.params.userId, 10);
    
    const summary = await clickhouse.getUserBehaviorSummary(userId);
    
    res.json({
      success: true,
      userId,
      summary
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/behavior/admin/user/:userId/events
 * Get recent events for a specific user (admin only)
 */
router.get('/admin/user/:userId/events', verifyToken, requireAdmin, async (req, res) => {
  try {
    const clickhouse = getClickHouse();
    const userId = parseInt(req.params.userId, 10);
    const limit = parseInt(req.query.limit, 10) || 100;
    
    const events = await clickhouse.getUserEvents(userId, { limit });
    
    res.json({
      success: true,
      userId,
      count: events.length,
      events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
