/**
 * Leo API Routes
 * 
 * Endpoints for AI-powered search, recommendations, and discovery
 * Mounted at /api/v2/leo/*
 */

const express = require('express');
const router = express.Router();
const { getVectorDB, SearchService } = require('./services');

// Initialize services (lazy loading)
let searchService = null;
let vectorDB = null;

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

module.exports = router;
