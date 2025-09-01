const express = require('express');
const router = express.Router();
const searchService = require('../services/searchService');
const searchAnalytics = require('../services/searchAnalytics');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');

// Helper function to get client info from request
const getClientInfo = (req) => {
  return {
    sessionId: req.sessionID || req.headers['x-session-id'] || 'anonymous',
    ipAddress: req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0],
    userAgent: req.headers['user-agent'] || 'unknown'
  };
};

/**
 * Main search endpoint
 * GET /api/search?q=query&category=all&limit=20&offset=0&filters={}
 */
router.get('/', async (req, res) => {
  try {
    const {
      q: query,
      category = 'all',
      limit = 20,
      offset = 0,
      ...filterParams
    } = req.query;

    // Validate required query parameter
    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        error: 'Query parameter is required',
        message: 'Please provide a search query'
      });
    }

    // Validate and sanitize inputs
    const sanitizedQuery = query.trim();
    const searchLimit = Math.min(parseInt(limit) || 20, 100); // Max 100 results
    const searchOffset = Math.max(parseInt(offset) || 0, 0);
    
    // Parse filters from query parameters
    const filters = {};
    if (filterParams.category_id) filters.category_id = parseInt(filterParams.category_id);
    if (filterParams.price_min) filters.price_min = parseFloat(filterParams.price_min);
    if (filterParams.price_max) filters.price_max = parseFloat(filterParams.price_max);
    if (filterParams.location) filters.location = filterParams.location;
    if (filterParams.does_custom) filters.does_custom = filterParams.does_custom;
    if (filterParams.is_non_profit !== undefined) filters.is_non_profit = filterParams.is_non_profit;

    // Perform the search
    const searchResults = await searchService.search(sanitizedQuery, {
      category,
      limit: searchLimit,
      offset: searchOffset,
      filters
    });

    // Log the search query for analytics
    const clientInfo = getClientInfo(req);
    const searchQueryId = await searchAnalytics.logSearchQuery({
      userId: req.user?.id || null,
      queryText: sanitizedQuery,
      categoryFilter: category !== 'all' ? category : null,
      resultCount: searchResults.metadata.totalResults,
      sessionId: clientInfo.sessionId,
      ipAddress: clientInfo.ipAddress,
      userAgent: clientInfo.userAgent,
      responseTime: searchResults.metadata.responseTime
    });

    // Add search query ID to response for click tracking
    searchResults.searchQueryId = searchQueryId;

    res.json(searchResults);
  } catch (error) {
    console.error('Search API error:', error);
    res.status(500).json({
      error: 'Search failed',
      message: 'An error occurred while searching. Please try again.'
    });
  }
});

/**
 * Autocomplete suggestions endpoint
 * GET /api/search/autocomplete?q=partial_query&limit=10
 */
router.get('/autocomplete', async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;

    if (!query || query.length < 2) {
      return res.json([]);
    }

    const suggestions = await searchService.getAutocompleteSuggestions(
      query.trim(),
      Math.min(parseInt(limit) || 10, 20)
    );

    res.json(suggestions);
  } catch (error) {
    console.error('Autocomplete API error:', error);
    res.status(500).json({
      error: 'Autocomplete failed',
      message: 'Failed to get search suggestions'
    });
  }
});

/**
 * Get available filters for a category
 * GET /api/search/filters?category=products
 */
router.get('/filters', async (req, res) => {
  try {
    const { category = 'all' } = req.query;
    
    const filters = await searchService.getAvailableFilters(category);
    
    res.json(filters);
  } catch (error) {
    console.error('Filters API error:', error);
    res.status(500).json({
      error: 'Failed to get filters',
      message: 'Could not retrieve available filters'
    });
  }
});

/**
 * Get popular/trending searches
 * GET /api/search/popular?limit=10
 */
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const popularSearches = await searchService.getPopularSearches(
      Math.min(parseInt(limit) || 10, 50)
    );
    
    res.json(popularSearches);
  } catch (error) {
    console.error('Popular searches API error:', error);
    res.status(500).json({
      error: 'Failed to get popular searches',
      message: 'Could not retrieve popular searches'
    });
  }
});

/**
 * Track search result clicks
 * POST /api/search/analytics/click
 */
router.post('/analytics/click', async (req, res) => {
  try {
    const { searchQueryId, resultId, resultType } = req.body;

    if (!searchQueryId || !resultId || !resultType) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'searchQueryId, resultId, and resultType are required'
      });
    }

    const success = await searchAnalytics.logResultClick(
      searchQueryId,
      resultId,
      resultType
    );

    if (success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: 'Failed to log click' });
    }
  } catch (error) {
    console.error('Click tracking error:', error);
    res.status(500).json({
      error: 'Click tracking failed',
      message: 'Failed to track result click'
    });
  }
});

/**
 * Get user search history (requires authentication)
 * GET /api/search/history?limit=20
 */
router.get('/history', verifyToken, async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const history = await searchAnalytics.getUserSearchHistory(
      req.user.id,
      Math.min(parseInt(limit) || 20, 100)
    );
    
    res.json(history);
  } catch (error) {
    console.error('Search history API error:', error);
    res.status(500).json({
      error: 'Failed to get search history',
      message: 'Could not retrieve search history'
    });
  }
});

/**
 * Get search analytics (admin only)
 * GET /api/search/analytics?timeframe=7d
 */
router.get('/analytics', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const { timeframe = '7d' } = req.query;
    
    const analytics = await searchAnalytics.getSearchAnalytics(timeframe);
    
    res.json(analytics);
  } catch (error) {
    console.error('Search analytics API error:', error);
    res.status(500).json({
      error: 'Failed to get analytics',
      message: 'Could not retrieve search analytics'
    });
  }
});

/**
 * Get search suggestions based on popular queries
 * GET /api/search/suggestions?q=partial&limit=5
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { q: query, limit = 5 } = req.query;
    
    if (!query || query.length < 2) {
      return res.json([]);
    }
    
    const suggestions = await searchAnalytics.getSearchSuggestions(
      query.trim(),
      Math.min(parseInt(limit) || 5, 10)
    );
    
    res.json(suggestions);
  } catch (error) {
    console.error('Search suggestions API error:', error);
    res.status(500).json({
      error: 'Failed to get suggestions',
      message: 'Could not retrieve search suggestions'
    });
  }
});

/**
 * Get search performance issues (admin only)
 * GET /api/search/performance
 */
router.get('/performance', verifyToken, requirePermission('manage_system'), async (req, res) => {
  try {
    const issues = await searchAnalytics.getPerformanceIssues();
    
    res.json(issues);
  } catch (error) {
    console.error('Search performance API error:', error);
    res.status(500).json({
      error: 'Failed to get performance data',
      message: 'Could not retrieve performance issues'
    });
  }
});

/**
 * Test endpoint to check search system health
 * GET /api/search/test
 */
router.get('/test', async (req, res) => {
  try {
    console.log('[Search] Testing search system health...');
    
    // Test database connection
    const searchService = require('../services/searchService');
    const dbConnected = await searchService.testConnection();
    
    // Test basic search functionality
    let searchTest = false;
    try {
      const testResults = await searchService.search('test', { limit: 1 });
      searchTest = true;
      console.log('[Search] Basic search test passed');
    } catch (error) {
      console.error('[Search] Basic search test failed:', error.message);
    }
    
    // Test autocomplete
    let autocompleteTest = false;
    try {
      const suggestions = await searchService.getAutocompleteSuggestions('test', 1);
      autocompleteTest = true;
      console.log('[Search] Autocomplete test passed');
    } catch (error) {
      console.error('[Search] Autocomplete test failed:', error.message);
    }
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      tests: {
        databaseConnection: dbConnected,
        basicSearch: searchTest,
        autocomplete: autocompleteTest
      },
      message: 'Search system health check completed'
    });
  } catch (error) {
    console.error('[Search] Health check error:', error);
    res.status(500).json({
      error: 'Health check failed',
      message: error.message
    });
  }
});

module.exports = router; 