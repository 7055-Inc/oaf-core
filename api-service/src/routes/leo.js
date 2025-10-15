const express = require('express');
const router = express.Router();

/**
 * Leo AI Routes
 * Handles all Leo AI features: search, recommendations, and future AI capabilities
 * Named after Leonardo da Vinci - Master of Art and Innovation
 */

// Leo AI Search endpoint
router.post('/search', async (req, res) => {
  try {
    const { query, userId, options = {} } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query parameter is required'
      });
    }

    // Prepare context for Central Brain
    const context = {
      userId: userId || 'anonymous',
      requestType: options.recommendationMode ? 'sitewide_search' : 'search',
      limit: options.limit || 20,
      categories: options.categories || ['products', 'artists', 'articles', 'events'],
      recommendationMode: options.recommendationMode || false,
      page: 'search'
    };

    // Make request to Leo AI Central Brain
    const leoResponse = await fetch('http://localhost:3003/api/brain/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        context
      })
    });

    if (!leoResponse.ok) {
      throw new Error(`Leo AI responded with status: ${leoResponse.status}`);
    }

    const leoData = await leoResponse.json();

    // Extract the organized results from Central Brain response
    const organizedResults = leoData.response?.organized_results || {
      products: [],
      artists: [],
      articles: [],
      events: []
    };

    // Return in the format expected by frontend components
    res.json({
      success: true,
      results: organizedResults,
      metadata: {
        query,
        userId: context.userId,
        intelligence_applied: leoData.response?.intelligence_applied || false,
        confidence: leoData.response?.confidence || 0.5,
        response_time: leoData.metadata?.responseTime || 0,
        search_service_used: leoData.metadata?.searchServiceUsed || false
      }
    });

  } catch (error) {
    console.error('Leo AI search error:', error);
    res.status(500).json({
      success: false,
      error: 'Leo AI search service unavailable',
      message: error.message
    });
  }
});

// Homepage recommendations endpoint
router.post('/recommendations', async (req, res) => {
  try {
    const { userId = 'anonymous', limit = 6 } = req.body;

    // Prepare context for homepage recommendations
    const context = {
      userId,
      requestType: 'sitewide_search',
      limit,
      categories: ['products'],
      recommendationMode: true,
      page: 'homepage'
    };

    // Request recommendations from Central Brain
    const leoResponse = await fetch('http://localhost:3003/api/brain/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: 'homepage recommendations',
        context
      })
    });

    if (!leoResponse.ok) {
      throw new Error(`Leo AI responded with status: ${leoResponse.status}`);
    }

    const leoData = await leoResponse.json();

    // Extract product recommendations
    const products = leoData.response?.organized_results?.products || [];

    res.json({
      success: true,
      recommendations: products,
      metadata: {
        userId,
        intelligence_applied: leoData.response?.intelligence_applied || false,
        confidence: leoData.response?.confidence || 0.5,
        response_time: leoData.metadata?.responseTime || 0
      }
    });

  } catch (error) {
    console.error('Leo AI recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Leo AI recommendation service unavailable',
      message: error.message
    });
  }
});

module.exports = router;
