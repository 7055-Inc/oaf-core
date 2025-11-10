const express = require('express');
const router = express.Router();
const path = require('path');

/**
 * Leo AI Routes - V2 (Direct SearchService)
 * 
 * FAST, classification-based intelligent search
 * No LLM needed for real-time search (~70ms)
 * 
 * Central Brain is for batch jobs (truth extraction, deep analysis)
 */

// Initialize SearchServiceV2 (singleton)
let searchService = null;
let vectorDB = null;

async function initializeSearchService() {
  if (searchService) return searchService;
  
  // Lazy load to avoid startup issues
  const VectorDatabase = require(path.join(__dirname, '../../../leo/src/core/vectorDatabase'));
  const SearchServiceV2 = require(path.join(__dirname, '../../../leo/src/services/searchService-v2'));
  
  vectorDB = new VectorDatabase();
  await vectorDB.initialize();
  
  searchService = new SearchServiceV2(vectorDB);
  await searchService.initialize();
  
  console.log('✅ SearchServiceV2 initialized for API routes');
  return searchService;
}

/**
 * Leo AI Search - Fast, personalized, classification-based
 * Uses SearchServiceV2 directly (no Central Brain needed)
 */
router.post('/search', async (req, res) => {
  try {
    const { query, userId, options = {} } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    // Initialize search service if needed
    const service = await initializeSearchService();

    // Prepare context
    const context = {
      userId: userId || 'anonymous',
      categories: options.categories || ['products', 'artists', 'articles', 'events'],
      limit: options.limit || 20,
      page: options.page || 1,
      sort: options.sort || 'relevance'
    };

    // Call SearchServiceV2 directly
    const results = await service.search(query, context);

    // Return results in format frontend expects
    res.json({
      success: results.success,
      results: results.results,
      metadata: results.metadata
    });

  } catch (error) {
    console.error('Leo AI search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search service unavailable',
      message: error.message
    });
  }
});

/**
 * Homepage Recommendations - Personalized product feed
 * Uses SearchServiceV2.getRecommendations()
 */
router.post('/recommendations', async (req, res) => {
  try {
    const { userId = 'anonymous', limit = 6, category = 'products' } = req.body;

    // Initialize search service if needed
    const service = await initializeSearchService();

    // Get personalized recommendations
    const results = await service.getRecommendations({
      userId,
      category,
      limit
    });

    // Extract products from results
    const recommendations = results.results?.[category] || [];

    res.json({
      success: true,
      recommendations,
      metadata: {
        userId,
        personalization_applied: results.metadata?.personalization_applied || false,
        confidence: results.metadata?.confidence || 0.5,
        response_time: results.metadata?.response_time_ms || 0,
        source: results.metadata?.preferences_source || 'global_trends'
      }
    });

  } catch (error) {
    console.error('Leo AI recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Recommendation service unavailable',
      message: error.message
    });
  }
});

/**
 * Discover Feed - TikTok-style endless personalized feed
 * Uses SearchServiceV2.getDiscoverFeed()
 */
router.post('/discover', async (req, res) => {
  try {
    const { userId = 'anonymous', offset = 0, limit = 20 } = req.body;

    // Initialize search service if needed
    const service = await initializeSearchService();

    // Get discover feed
    const results = await service.getDiscoverFeed({
      userId,
      offset,
      limit
    });

    res.json({
      success: results.success,
      feed: results.feed,
      next_offset: results.next_offset,
      has_more: results.has_more
    });

  } catch (error) {
    console.error('Leo AI discover feed error:', error);
    res.status(500).json({
      success: false,
      error: 'Discover feed unavailable',
      message: error.message
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    if (!searchService || !vectorDB) {
      return res.json({
        healthy: false,
        message: 'Search service not initialized yet',
        timestamp: new Date().toISOString()
      });
    }

    const health = await vectorDB.healthCheck();
    
    res.json({
      healthy: health.healthy,
      search_service: 'v2',
      vector_db: health,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      healthy: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
