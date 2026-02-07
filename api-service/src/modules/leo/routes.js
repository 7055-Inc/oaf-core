/**
 * Leo API Routes
 * 
 * Endpoints for AI-powered search, recommendations, and discovery
 * Mounted at /api/v2/leo/*
 */

const express = require('express');
const router = express.Router();
const { getVectorDB, SearchService, getUserIngestion, getBehaviorIngestion, getProductIngestion, getOrderIngestion, getEventIngestion, getReviewIngestion, getArticleIngestion, getTruthOrchestrator, getTruthStore } = require('./services');
const { verifyToken, requireAdmin } = require('../auth/middleware');

// Initialize services (lazy loading)
let searchService = null;
let vectorDB = null;

// In-memory job tracking for async ingestion
const ingestionJobs = new Map();
const MAX_JOB_AGE = 60 * 60 * 1000; // Keep job results for 1 hour

// Clean old jobs periodically
setInterval(() => {
  const now = Date.now();
  for (const [jobId, job] of ingestionJobs) {
    if (now - job.startedAt > MAX_JOB_AGE) {
      ingestionJobs.delete(jobId);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes

async function getSearchService() {
  if (!searchService) {
    vectorDB = getVectorDB();
    await vectorDB.initialize();
    searchService = new SearchService(vectorDB);
    await searchService.initialize();
  }
  return searchService;
}

/**
 * GET /api/v2/leo/health
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const vdb = getVectorDB();
    const health = await vdb.healthCheck();
    
    res.json({
      status: health.healthy ? 'healthy' : 'unhealthy',
      service: 'leo-ai',
      timestamp: new Date().toISOString(),
      ...health
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'leo-ai',
      error: error.message
    });
  }
});

/**
 * POST /api/v2/leo/search
 * Main intelligent search endpoint (PUBLIC)
 * 
 * Body: { query: string, userId?: string, categories?: string[], limit?: number }
 */
router.post('/search', async (req, res) => {
  try {
    const { query, userId, categories, limit, page } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    const service = await getSearchService();
    const results = await service.search(query, {
      userId: userId || req.user?.id || 'anonymous',
      categories: categories || ['products', 'artists', 'articles'],
      limit: limit || 20,
      page: page || 1
    });

    res.json(results);

  } catch (error) {
    console.error('[LEO] Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * POST /api/v2/leo/recommendations
 * Get personalized recommendations (PUBLIC)
 * 
 * Body: { userId?: string, limit?: number, category?: string }
 */
router.post('/recommendations', async (req, res) => {
  try {
    const { userId, limit, category } = req.body;

    const service = await getSearchService();
    const results = await service.getRecommendations({
      userId: userId || req.user?.id || 'anonymous',
      limit: limit || 20,
      category: category || 'products'
    });

    res.json(results);

  } catch (error) {
    console.error('[LEO] Recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Recommendations failed',
      message: error.message
    });
  }
});

/**
 * POST /api/v2/leo/discover
 * TikTok-style endless personalized feed (PUBLIC)
 * 
 * Body: { userId?: string, offset?: number, limit?: number }
 */
router.post('/discover', async (req, res) => {
  try {
    const { userId, offset, limit } = req.body;

    const service = await getSearchService();
    const results = await service.getDiscoverFeed({
      userId: userId || req.user?.id || 'anonymous',
      offset: offset || 0,
      limit: limit || 20
    });

    res.json(results);

  } catch (error) {
    console.error('[LEO] Discover error:', error);
    res.status(500).json({
      success: false,
      error: 'Discover feed failed',
      message: error.message
    });
  }
});

/**
 * GET /api/v2/leo/stats
 * Get vector database statistics (for debugging)
 */
router.get('/stats', async (req, res) => {
  try {
    const vdb = getVectorDB();
    if (!vdb.isInitialized) {
      await vdb.initialize();
    }
    
    const stats = await vdb.getCollectionStats();
    
    res.json({
      success: true,
      collections: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// ADMIN ENDPOINTS (require authentication)
// ============================================

/**
 * Helper to run ingestion asynchronously
 */
function runIngestionAsync(jobId, scriptType, ingestionFn) {
  const job = {
    id: jobId,
    type: scriptType,
    status: 'running',
    startedAt: Date.now(),
    completedAt: null,
    result: null,
    error: null
  };
  ingestionJobs.set(jobId, job);

  // Run in background
  setImmediate(async () => {
    try {
      const result = await ingestionFn();
      job.status = 'completed';
      job.completedAt = Date.now();
      job.result = result;
      console.log(`[LEO] ${scriptType} ingestion completed:`, result.stats);
    } catch (error) {
      job.status = 'failed';
      job.completedAt = Date.now();
      job.error = error.message;
      console.error(`[LEO] ${scriptType} ingestion failed:`, error);
    }
  });

  return job;
}

/**
 * GET /api/v2/leo/admin/ingest/job/:jobId
 * Check status of an async ingestion job
 */
router.get('/admin/ingest/job/:jobId', verifyToken, requireAdmin, async (req, res) => {
  const { jobId } = req.params;
  const job = ingestionJobs.get(jobId);

  if (!job) {
    return res.status(404).json({
      success: false,
      error: 'Job not found'
    });
  }

  const response = {
    success: true,
    job: {
      id: job.id,
      type: job.type,
      status: job.status,
      startedAt: new Date(job.startedAt).toISOString(),
      duration_ms: job.completedAt ? job.completedAt - job.startedAt : Date.now() - job.startedAt
    }
  };

  if (job.status === 'completed') {
    response.job.completedAt = new Date(job.completedAt).toISOString();
    response.stats = job.result?.stats;
    response.message = `${job.type} ingestion complete`;
  } else if (job.status === 'failed') {
    response.job.completedAt = new Date(job.completedAt).toISOString();
    response.error = job.error;
  }

  res.json(response);
});

/**
 * POST /api/v2/leo/admin/ingest/users
 * Manually trigger user ingestion (admin only)
 * 
 * Body: { full?: boolean } - if true, re-ingest all users; otherwise incremental
 */
router.post('/admin/ingest/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { full = false } = req.body;
    
    // If full sync, use epoch start; otherwise use 24 hours ago
    const lastRun = full 
      ? '1970-01-01 00:00:00'
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const jobId = `users_${Date.now()}`;
    
    const job = runIngestionAsync(jobId, 'users', async () => {
      const ingestion = getUserIngestion();
      await ingestion.initialize();
      return await ingestion.run(lastRun);
    });

    res.json({
      success: true,
      message: `User ingestion started (${full ? 'full' : 'incremental'})`,
      jobId: job.id,
      status: 'running',
      pollUrl: `/api/v2/leo/admin/ingest/job/${job.id}`
    });

  } catch (error) {
    console.error('[LEO] User ingestion error:', error);
    res.status(500).json({
      success: false,
      error: 'User ingestion failed to start',
      message: error.message
    });
  }
});

/**
 * POST /api/v2/leo/admin/ingest/behavior
 * Manually trigger behavior ingestion (admin only)
 * 
 * Body: { dayRange?: number } - how many days of behavior to analyze (default 90)
 */
router.post('/admin/ingest/behavior', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { dayRange = 90, full = false } = req.body;
    const effectiveDayRange = full ? 90 : (dayRange || 7);

    const jobId = `behavior_${Date.now()}`;
    
    const job = runIngestionAsync(jobId, 'behavior', async () => {
      const ingestion = getBehaviorIngestion();
      await ingestion.initialize();
      return await ingestion.run(effectiveDayRange);
    });

    res.json({
      success: true,
      message: `Behavior ingestion started (${effectiveDayRange} day lookback)`,
      jobId: job.id,
      status: 'running',
      pollUrl: `/api/v2/leo/admin/ingest/job/${job.id}`
    });

  } catch (error) {
    console.error('[LEO] Behavior ingestion error:', error);
    res.status(500).json({
      success: false,
      error: 'Behavior ingestion failed to start',
      message: error.message
    });
  }
});

/**
 * POST /api/v2/leo/admin/ingest/products
 * Manually trigger product ingestion (admin only)
 * 
 * Body: { full?: boolean } - if true, re-ingest all products; otherwise incremental
 */
router.post('/admin/ingest/products', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { full = false } = req.body;
    
    // If full sync, use epoch start; otherwise use 24 hours ago
    const lastRun = full 
      ? '1970-01-01 00:00:00'
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const jobId = `products_${Date.now()}`;
    
    const job = runIngestionAsync(jobId, 'products', async () => {
      const ingestion = getProductIngestion();
      await ingestion.initialize();
      return await ingestion.run(lastRun);
    });

    res.json({
      success: true,
      message: `Product ingestion started (${full ? 'full' : 'incremental'})`,
      jobId: job.id,
      status: 'running',
      pollUrl: `/api/v2/leo/admin/ingest/job/${job.id}`
    });

  } catch (error) {
    console.error('[LEO] Product ingestion error:', error);
    res.status(500).json({
      success: false,
      error: 'Product ingestion failed to start',
      message: error.message
    });
  }
});

/**
 * POST /api/v2/leo/admin/ingest/orders
 * Manually trigger order ingestion (admin only)
 * 
 * Body: { full?: boolean } - if true, re-ingest all orders; otherwise incremental
 */
router.post('/admin/ingest/orders', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { full = false } = req.body;
    
    // If full sync, use epoch start; otherwise use 24 hours ago
    const lastRun = full 
      ? '1970-01-01 00:00:00'
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const jobId = `orders_${Date.now()}`;
    
    const job = runIngestionAsync(jobId, 'orders', async () => {
      const ingestion = getOrderIngestion();
      await ingestion.initialize();
      return await ingestion.run(lastRun);
    });

    res.json({
      success: true,
      message: `Order ingestion started (${full ? 'full' : 'incremental'})`,
      jobId: job.id,
      status: 'running',
      pollUrl: `/api/v2/leo/admin/ingest/job/${job.id}`
    });

  } catch (error) {
    console.error('[LEO] Order ingestion error:', error);
    res.status(500).json({
      success: false,
      error: 'Order ingestion failed to start',
      message: error.message
    });
  }
});

/**
 * POST /api/v2/leo/admin/ingest/events
 * Manually trigger event ingestion (admin only)
 * 
 * Body: { full?: boolean } - if true, re-ingest all events; otherwise incremental
 */
router.post('/admin/ingest/events', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { full = false } = req.body;
    
    // If full sync, use epoch start; otherwise use 24 hours ago
    const lastRun = full 
      ? '1970-01-01 00:00:00'
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const jobId = `events_${Date.now()}`;
    
    const job = runIngestionAsync(jobId, 'events', async () => {
      const ingestion = getEventIngestion();
      await ingestion.initialize();
      return await ingestion.run(lastRun);
    });

    res.json({
      success: true,
      message: `Event ingestion started (${full ? 'full' : 'incremental'})`,
      jobId: job.id,
      status: 'running',
      pollUrl: `/api/v2/leo/admin/ingest/job/${job.id}`
    });

  } catch (error) {
    console.error('[LEO] Event ingestion error:', error);
    res.status(500).json({
      success: false,
      error: 'Event ingestion failed to start',
      message: error.message
    });
  }
});

/**
 * POST /api/v2/leo/admin/ingest/reviews
 * Manually trigger review ingestion (admin only)
 * 
 * Body: { full?: boolean } - if true, re-ingest all reviews; otherwise incremental
 */
router.post('/admin/ingest/reviews', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { full = false } = req.body;
    
    // If full sync, use epoch start; otherwise use 24 hours ago
    const lastRun = full 
      ? '1970-01-01 00:00:00'
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const jobId = `reviews_${Date.now()}`;
    
    const job = runIngestionAsync(jobId, 'reviews', async () => {
      const ingestion = getReviewIngestion();
      await ingestion.initialize();
      return await ingestion.run(lastRun);
    });

    res.json({
      success: true,
      message: `Review ingestion started (${full ? 'full' : 'incremental'})`,
      jobId: job.id,
      status: 'running',
      pollUrl: `/api/v2/leo/admin/ingest/job/${job.id}`
    });

  } catch (error) {
    console.error('[LEO] Review ingestion error:', error);
    res.status(500).json({
      success: false,
      error: 'Review ingestion failed to start',
      message: error.message
    });
  }
});

/**
 * POST /api/v2/leo/admin/ingest/articles
 * Manually trigger article ingestion (admin only)
 * 
 * Body: { full?: boolean } - if true, re-ingest all articles; otherwise incremental
 */
router.post('/admin/ingest/articles', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { full = false } = req.body;
    
    // If full sync, use epoch start; otherwise use 24 hours ago
    const lastRun = full 
      ? '1970-01-01 00:00:00'
      : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

    const jobId = `articles_${Date.now()}`;
    
    const job = runIngestionAsync(jobId, 'articles', async () => {
      const ingestion = getArticleIngestion();
      await ingestion.initialize();
      return await ingestion.run(lastRun);
    });

    res.json({
      success: true,
      message: `Article ingestion started (${full ? 'full' : 'incremental'})`,
      jobId: job.id,
      status: 'running',
      pollUrl: `/api/v2/leo/admin/ingest/job/${job.id}`
    });

  } catch (error) {
    console.error('[LEO] Article ingestion error:', error);
    res.status(500).json({
      success: false,
      error: 'Article ingestion failed to start',
      message: error.message
    });
  }
});

/**
 * GET /api/v2/leo/admin/ingest/status
 * Get available ingestion scripts and their status
 */
router.get('/admin/ingest/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    // List available ingestion scripts
    const scripts = [
      {
        id: 'users',
        name: 'User Profiles',
        endpoint: '/api/v2/leo/admin/ingest/users',
        collection: 'user_profiles',
        description: 'Ingests user data with all profile types (artist, promoter, community)',
        status: 'ready'
      },
      {
        id: 'behavior',
        name: 'User Behavior',
        endpoint: '/api/v2/leo/admin/ingest/behavior',
        collection: 'user_behavior',
        description: 'Aggregates behavioral data from ClickHouse into ChromaDB for personalization',
        status: 'ready'
      },
      {
        id: 'products',
        name: 'Products',
        endpoint: '/api/v2/leo/admin/ingest/products',
        collection: 'art_metadata',
        description: 'Ingests products with categories, inventory, images, variations, and performance metrics',
        status: 'ready'
      },
      {
        id: 'orders',
        name: 'Orders',
        endpoint: '/api/v2/leo/admin/ingest/orders',
        collection: 'user_interactions',
        description: 'Ingests orders with items, user context, and purchase patterns for recommendation',
        status: 'ready'
      },
      {
        id: 'events',
        name: 'Events',
        endpoint: '/api/v2/leo/admin/ingest/events',
        collection: 'event_data',
        description: 'Ingests events with venue, dates, categories, applications, and review aggregates',
        status: 'ready'
      },
      {
        id: 'reviews',
        name: 'Reviews',
        endpoint: '/api/v2/leo/admin/ingest/reviews',
        collection: 'reviews',
        description: 'Ingests reviews for events, products, artists, and promoters with sentiment data',
        status: 'ready'
      },
      {
        id: 'articles',
        name: 'Articles',
        endpoint: '/api/v2/leo/admin/ingest/articles',
        collection: 'site_content',
        description: 'Ingests articles, blog posts, help articles, and pages with tags and topics',
        status: 'ready'
      }
    ];

    res.json({
      success: true,
      scripts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ==========================================
// TRUTH DISCOVERY ENDPOINTS
// ==========================================

// In-memory job tracking for async truth discovery
const truthJobs = new Map();

/**
 * Helper to run truth discovery asynchronously
 */
function runTruthDiscoveryAsync(jobId, discovererName, runFn) {
  const job = {
    id: jobId,
    discoverer: discovererName,
    status: 'running',
    startedAt: Date.now(),
    result: null,
    error: null
  };

  truthJobs.set(jobId, job);

  // Run in background
  runFn()
    .then(result => {
      job.status = 'completed';
      job.result = result;
      job.completedAt = Date.now();
      job.duration_ms = job.completedAt - job.startedAt;
    })
    .catch(error => {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = Date.now();
      job.duration_ms = job.completedAt - job.startedAt;
    });

  return job;
}

/**
 * GET /api/v2/leo/admin/truths/status
 * Get truth discovery system status
 */
router.get('/admin/truths/status', verifyToken, requireAdmin, async (req, res) => {
  try {
    const orchestrator = getTruthOrchestrator();
    
    if (!orchestrator.isInitialized) {
      await orchestrator.initialize();
    }

    const status = orchestrator.getStatus();
    
    // Add truth store stats
    const truthStore = getTruthStore();
    if (truthStore.isInitialized) {
      status.truthStats = await truthStore.getStats();
    }

    res.json({
      success: true,
      ...status
    });

  } catch (error) {
    console.error('[LEO] Truth status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/leo/admin/truths/stats
 * Get truth collection statistics
 */
router.get('/admin/truths/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    const truthStore = getTruthStore();
    
    if (!truthStore.isInitialized) {
      await truthStore.initialize();
    }

    const stats = await truthStore.getStats();

    res.json({
      success: true,
      ...stats
    });

  } catch (error) {
    console.error('[LEO] Truth stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/leo/admin/truths/discover/all
 * Run all truth discoverers
 */
router.post('/admin/truths/discover/all', verifyToken, requireAdmin, async (req, res) => {
  try {
    const orchestrator = getTruthOrchestrator();
    
    if (!orchestrator.isInitialized) {
      await orchestrator.initialize();
    }

    const jobId = `truths_all_${Date.now()}`;
    
    const job = runTruthDiscoveryAsync(jobId, 'all', async () => {
      return await orchestrator.runAll();
    });

    res.json({
      success: true,
      message: 'Truth discovery started (all discoverers)',
      jobId: job.id,
      status: 'running',
      pollUrl: `/api/v2/leo/admin/truths/job/${job.id}`
    });

  } catch (error) {
    console.error('[LEO] Truth discovery error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/leo/admin/truths/discover/:discoverer
 * Run a specific truth discoverer
 */
router.post('/admin/truths/discover/:discoverer', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { discoverer } = req.params;
    const orchestrator = getTruthOrchestrator();
    
    if (!orchestrator.isInitialized) {
      await orchestrator.initialize();
    }

    // Check if discoverer exists
    const discovererList = orchestrator.getDiscovererList();
    const exists = discovererList.some(d => d.name === discoverer);
    
    if (!exists) {
      return res.status(404).json({
        success: false,
        error: `Discoverer '${discoverer}' not found`,
        available: discovererList.map(d => d.name)
      });
    }

    const jobId = `truths_${discoverer}_${Date.now()}`;
    
    const job = runTruthDiscoveryAsync(jobId, discoverer, async () => {
      return await orchestrator.runDiscoverer(discoverer);
    });

    res.json({
      success: true,
      message: `Truth discovery started (${discoverer})`,
      jobId: job.id,
      status: 'running',
      pollUrl: `/api/v2/leo/admin/truths/job/${job.id}`
    });

  } catch (error) {
    console.error('[LEO] Truth discovery error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/leo/admin/truths/job/:jobId
 * Get status of a truth discovery job
 */
router.get('/admin/truths/job/:jobId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = truthJobs.get(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    const response = {
      success: true,
      job: {
        id: job.id,
        discoverer: job.discoverer,
        status: job.status,
        duration_ms: job.status === 'running' 
          ? Date.now() - job.startedAt 
          : job.duration_ms
      }
    };

    if (job.status === 'completed') {
      response.message = 'Truth discovery completed';
      response.stats = job.result?.stats || job.result?.results;
    } else if (job.status === 'failed') {
      response.error = job.error;
    } else {
      response.message = `Truth discovery running... (${Math.round((Date.now() - job.startedAt) / 1000)}s elapsed)`;
    }

    res.json(response);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/leo/admin/truths/similarities/:entityType/:entityId
 * Get similarity truths for an entity
 */
router.get('/admin/truths/similarities/:entityType/:entityId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const truthStore = getTruthStore();
    
    if (!truthStore.isInitialized) {
      await truthStore.initialize();
    }

    const similarities = await truthStore.getSimilarities(entityType, entityId, limit);

    res.json({
      success: true,
      entityType,
      entityId,
      similarities,
      count: similarities.length
    });

  } catch (error) {
    console.error('[LEO] Get similarities error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/leo/admin/truths/cleanup
 * Clean up expired truths
 */
router.post('/admin/truths/cleanup', verifyToken, requireAdmin, async (req, res) => {
  try {
    const orchestrator = getTruthOrchestrator();
    
    if (!orchestrator.isInitialized) {
      await orchestrator.initialize();
    }

    const result = await orchestrator.cleanup();

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('[LEO] Truth cleanup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
