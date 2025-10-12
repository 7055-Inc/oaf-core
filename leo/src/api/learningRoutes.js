/**
 * Leo AI Platform - Learning System API Routes
 * AI learning and recommendation endpoints
 */

const express = require('express');
const AILearningSystem = require('../learning/aiLearningSystem');
const SchemaLearningSystem = require('../learning/schemaLearning');
const IntelligentSearchService = require('../services/intelligentSearchService');
const winston = require('winston');
const path = require('path');

const router = express.Router();
const schemaLearner = new SchemaLearningSystem();

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [LEO-LEARNING-API] ${level.toUpperCase()}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../logs/learning-api.log') }),
    new winston.transports.Console()
  ]
});

// Initialize learning system and intelligent search
const learningSystem = new AILearningSystem();
const intelligentSearch = new IntelligentSearchService();

// Middleware to ensure learning system is initialized
const ensureLearningSystem = async (req, res, next) => {
  try {
    if (!learningSystem.vectorDB.isInitialized) {
      await learningSystem.initialize();
    }
    next();
  } catch (error) {
    logger.error('Learning system initialization failed:', error);
    res.status(500).json({
      error: 'Learning system unavailable',
      message: error.message
    });
  }
};

/**
 * POST /api/learning/recommendations
 * Get AI-powered recommendations with learning enhancement
 */
router.post('/recommendations', ensureLearningSystem, async (req, res) => {
  try {
    const { query, userId, options = {} } = req.body;

    if (!query) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Query is required'
      });
    }

    const recommendations = await learningSystem.generateRecommendations(
      query, 
      userId, 
      options
    );

    logger.info(`Generated recommendations for user ${userId}`, {
      query,
      resultCount: recommendations.recommendations.length,
      confidence: recommendations.confidence
    });

    res.json({
      success: true,
      ...recommendations
    });

  } catch (error) {
    logger.error('Recommendation generation failed:', error);
    res.status(500).json({
      error: 'Failed to generate recommendations',
      message: error.message
    });
  }
});

/**
 * POST /api/learning/feedback
 * Submit user feedback for AI learning
 */
router.post('/feedback', ensureLearningSystem, async (req, res) => {
  try {
    const feedbackData = req.body;

    // Validate required fields
    const required = ['userId', 'query', 'aiResponse', 'userFeedback'];
    const missing = required.filter(field => !feedbackData[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Invalid request',
        message: `Missing required fields: ${missing.join(', ')}`
      });
    }

    const result = await learningSystem.processFeedback(feedbackData);

    logger.info(`Processed feedback from user ${feedbackData.userId}`, {
      feedback: feedbackData.userFeedback,
      rating: feedbackData.rating,
      insights: result.insights.length
    });

    res.json({
      success: true,
      message: 'Feedback processed successfully',
      ...result
    });

  } catch (error) {
    logger.error('Feedback processing failed:', error);
    res.status(500).json({
      error: 'Failed to process feedback',
      message: error.message
    });
  }
});

/**
 * GET /api/learning/metrics
 * Get learning system metrics and performance
 */
router.get('/metrics', ensureLearningSystem, async (req, res) => {
  try {
    const health = await learningSystem.getSystemHealth();

    res.json({
      success: true,
      ...health
    });

  } catch (error) {
    logger.error('Failed to get learning metrics:', error);
    res.status(500).json({
      error: 'Failed to get metrics',
      message: error.message
    });
  }
});

/**
 * POST /api/learning/intelligent-search
 * New intelligent search with truth-based AI and Llama processing
 */
router.post('/intelligent-search', async (req, res) => {
  try {
    const { query, userId = 'anonymous', options = {} } = req.body;

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Query is required',
        message: 'Please provide a valid search query'
      });
    }

    logger.info(`🔍 Intelligent search request: "${query}" (user: ${userId})`);

    // Use the new intelligent search service
    const results = await intelligentSearch.search(query.trim(), {
      userId,
      limit: options.limit || 20,
      includeMetaTruths: options.includeMetaTruths !== false,
      applyPersonalization: options.applyPersonalization !== false
    });

    res.json(results);

  } catch (error) {
    logger.error('Intelligent search failed:', error);
    res.status(500).json({
      success: false,
      error: 'Intelligent search failed',
      message: error.message
    });
  }
});

/**
 * POST /api/learning/smart-search (legacy compatibility)
 * Enhanced search with AI learning and personalization
 */
router.post('/smart-search', ensureLearningSystem, async (req, res) => {
  try {
    const { query, userId, context = {}, options = {} } = req.body;

    if (!query) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Query is required'
      });
    }

    // Generate enhanced recommendations
    const recommendations = await learningSystem.generateRecommendations(
      query,
      userId,
      {
        ...options,
        diversify: true,
        includeContext: true
      }
    );

    // Filter and categorize results
    const rawResults = recommendations.recommendations || recommendations || [];
    const filteredResults = filterPrivateData(rawResults, userId);
    const categorizedResults = categorizeSearchResults(filteredResults);

    // Format for search response
    const searchResults = {
      query,
      categories: categorizedResults,
      totalResults: filteredResults.length,
      metadata: {
        confidence: recommendations.confidence,
        learningApplied: recommendations.learningApplied,
        userPatternsFound: recommendations.userPatternsFound,
        searchTime: new Date().toISOString(),
        userId
      }
    };

    logger.info(`Smart search completed for user ${userId}`, {
      query,
      resultCount: searchResults.totalResults,
      confidence: recommendations.confidence
    });

    res.json({
      success: true,
      ...searchResults
    });

  } catch (error) {
    logger.error('Smart search failed:', error);
    res.status(500).json({
      error: 'Smart search failed',
      message: error.message
    });
  }
});

/**
 * POST /api/learning/art-recommendations
 * Specialized art recommendation endpoint
 */
router.post('/art-recommendations', ensureLearningSystem, async (req, res) => {
  try {
    const { 
      userId, 
      preferences = {}, 
      budget = null, 
      style = null, 
      medium = null,
      limit = 10 
    } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'User ID is required'
      });
    }

    // Build query from preferences
    const queryParts = [
      'art artwork painting sculpture',
      style && `style ${style}`,
      medium && `medium ${medium}`,
      preferences.colors && `colors ${preferences.colors.join(' ')}`,
      preferences.themes && `themes ${preferences.themes.join(' ')}`
    ].filter(Boolean);

    const query = queryParts.join(' ');

    // Get recommendations with art-specific options
    const recommendations = await learningSystem.generateRecommendations(
      query,
      userId,
      {
        limitPerCollection: limit,
        totalLimit: limit,
        diversify: true,
        focusCollections: ['art_metadata']
      }
    );

    // Filter and format art recommendations
    const artRecommendations = recommendations.recommendations
      .filter(rec => rec.metadata.type === 'artwork')
      .filter(rec => !budget || !rec.metadata.price || rec.metadata.price <= budget)
      .map(rec => ({
        id: rec.metadata.original_id,
        title: rec.metadata.title,
        artist: rec.metadata.artist,
        medium: rec.metadata.medium,
        style: rec.metadata.style,
        price: rec.metadata.price,
        dimensions: rec.metadata.dimensions,
        year: rec.metadata.year,
        tags: rec.metadata.tags,
        relevanceScore: rec.enhancedScore,
        confidence: recommendations.confidence,
        reason: this.generateRecommendationReason(rec, preferences)
      }));

    logger.info(`Generated art recommendations for user ${userId}`, {
      count: artRecommendations.length,
      budget,
      style,
      medium
    });

    res.json({
      success: true,
      recommendations: artRecommendations,
      metadata: {
        userId,
        preferences,
        filters: { budget, style, medium },
        totalFound: artRecommendations.length,
        confidence: recommendations.confidence,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Art recommendations failed:', error);
    res.status(500).json({
      error: 'Failed to generate art recommendations',
      message: error.message
    });
  }
});

/**
 * GET /api/learning/health
 * Learning system health check
 */
router.get('/health', async (req, res) => {
  try {
    const health = await learningSystem.getSystemHealth();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(health);

  } catch (error) {
    logger.error('Learning system health check failed:', error);
    res.status(503).json({
      status: 'error',
      error: error.message,
      last_check: new Date().toISOString()
    });
  }
});

/**
 * Filter out private data that shouldn't be shown to users
 */
function filterPrivateData(results, currentUserId) {
  return results.filter(rec => {
    // Filter out private user interactions from other users
    if (rec.collection === 'user_interactions' && 
        rec.metadata.user_id && 
        rec.metadata.user_id !== currentUserId) {
      return false;
    }

    // Filter out order items from other users
    if (rec.metadata.source_table === 'order_items' && 
        rec.metadata.user_id && 
        rec.metadata.user_id !== currentUserId) {
      return false;
    }

    // Filter out deleted/inactive items
    if (rec.metadata.status && rec.metadata.status !== 'active') {
      return false;
    }

    // Filter out private metadata
    if (rec.metadata.type === 'private' || rec.metadata.visibility === 'private') {
      return false;
    }

    return true;
  });
}

/**
 * Smart categorization that learns data relationships
 */
function categorizeSearchResults(results) {
  const categories = {
    products: [],
    artists: [],
    articles: [],
    events: [],
    other: []
  };

  results.forEach(rec => {
    // Use intelligent quality filtering
    if (!schemaLearner.isQualityResult(rec)) {
      return; // Skip low-quality results
    }

    const formattedResult = {
      id: rec.id,
      title: rec.metadata.title || rec.metadata.name || 'Untitled',
      content: rec.content,
      relevance: rec.enhancedScore,
      originalRelevance: rec.originalScore,
      collection: rec.collection,
      metadata: rec.metadata,
      learningEnhanced: rec.learningApplied
    };

    // Use intelligent categorization
    const smartCategory = schemaLearner.smartCategorize(rec);
    
    if (smartCategory === 'products') {
      categories.products.push({
        ...formattedResult,
        price: rec.metadata.price,
        vendor: rec.metadata.vendor_id,
        image: rec.metadata.image_url,
        category: rec.metadata.category_id
      });
    } else if (rec.metadata.source_table === 'users' || 
               rec.metadata.source_table === 'artist_profiles' ||
               rec.metadata.type === 'artist') {
      categories.artists.push({
        ...formattedResult,
        displayName: rec.metadata.display_name,
        businessName: rec.metadata.business_name,
        location: rec.metadata.location
      });
    } else if (rec.metadata.source_table === 'articles' || 
               rec.metadata.type === 'article' ||
               rec.collection === 'site_content') {
      categories.articles.push({
        ...formattedResult,
        title: rec.metadata.title || rec.metadata.name || 'Untitled Article',
        excerpt: rec.content.substring(0, 200) + '...',
        publishDate: rec.metadata.created_at || rec.metadata.updated_at
      });
    } else if (rec.metadata.source_table === 'events' || 
               rec.metadata.type === 'event') {
      categories.events.push({
        ...formattedResult,
        startDate: rec.metadata.start_date,
        endDate: rec.metadata.end_date,
        location: rec.metadata.location,
        eventType: rec.metadata.event_type
      });
    } else {
      categories.other.push(formattedResult);
    }
  });

  // Sort each category by relevance
  Object.keys(categories).forEach(category => {
    categories[category].sort((a, b) => b.relevance - a.relevance);
  });

  return categories;
}

/**
 * Helper function to generate recommendation reasons
 */
function generateRecommendationReason(recommendation, preferences) {
  const reasons = [];
  
  if (preferences.style && recommendation.metadata.style === preferences.style) {
    reasons.push(`matches your preferred ${preferences.style} style`);
  }
  
  if (preferences.medium && recommendation.metadata.medium === preferences.medium) {
    reasons.push(`created in your preferred ${preferences.medium} medium`);
  }
  
  if (preferences.colors && recommendation.metadata.tags) {
    const matchingColors = preferences.colors.filter(color => 
      recommendation.metadata.tags.includes(color)
    );
    if (matchingColors.length > 0) {
      reasons.push(`features your preferred colors: ${matchingColors.join(', ')}`);
    }
  }
  
  if (recommendation.learningApplied) {
    reasons.push('recommended based on your past interactions');
  }
  
  if (reasons.length === 0) {
    reasons.push('highly relevant to your search');
  }
  
  return reasons.join(' and ');
}

module.exports = router;
