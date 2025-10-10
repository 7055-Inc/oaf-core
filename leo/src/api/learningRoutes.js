/**
 * Leo AI Platform - Learning System API Routes
 * AI learning and recommendation endpoints
 */

const express = require('express');
const AILearningSystem = require('../learning/aiLearningSystem');
const winston = require('winston');
const path = require('path');

const router = express.Router();

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

// Initialize learning system
const learningSystem = new AILearningSystem();

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
 * POST /api/learning/smart-search
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

    // Format for search response
    const searchResults = {
      query,
      results: recommendations.recommendations.map(rec => ({
        id: rec.id,
        title: rec.metadata.title || 'Untitled',
        content: rec.content,
        type: rec.metadata.type,
        relevance: rec.enhancedScore,
        originalRelevance: rec.originalScore,
        collection: rec.collection,
        metadata: rec.metadata,
        learningEnhanced: rec.learningApplied
      })),
      metadata: {
        totalResults: recommendations.recommendations.length,
        confidence: recommendations.confidence,
        learningApplied: recommendations.learningApplied,
        userPatternsFound: recommendations.userPatternsFound,
        searchTime: new Date().toISOString(),
        userId
      }
    };

    logger.info(`Smart search completed for user ${userId}`, {
      query,
      resultCount: searchResults.results.length,
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
