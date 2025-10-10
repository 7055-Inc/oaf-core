/**
 * Leo AI Platform - Learning System
 * Continuous improvement through user feedback and interaction analysis
 */

const VectorDatabase = require('../core/vectorDatabase');
const winston = require('winston');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [LEO-LEARNING] ${level.toUpperCase()}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../logs/learning.log') }),
    new winston.transports.Console()
  ]
});

class AILearningSystem {
  constructor() {
    this.vectorDB = new VectorDatabase();
    this.learningMetrics = {
      totalInteractions: 0,
      positiveResponses: 0,
      negativeResponses: 0,
      averageConfidence: 0,
      improvementRate: 0
    };
  }

  /**
   * Initialize learning system
   */
  async initialize() {
    try {
      await this.vectorDB.initialize();
      await this.loadLearningMetrics();
      logger.info('AI Learning System initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize learning system:', error);
      throw error;
    }
  }

  /**
   * Process user feedback on AI recommendations
   */
  async processFeedback(feedbackData) {
    try {
      const {
        userId,
        query,
        aiResponse,
        userFeedback, // 'positive', 'negative', 'neutral'
        rating, // 1-5 scale
        context,
        responseTime,
        confidence
      } = feedbackData;

      // Create learning document
      const learningDoc = {
        id: uuidv4(),
        content: this.formatLearningContent(query, aiResponse, userFeedback, context),
        metadata: {
          type: 'feedback',
          user_id: userId,
          feedback_type: userFeedback,
          rating: rating,
          confidence: confidence,
          response_time: responseTime,
          query_category: await this.categorizeQuery(query),
          improvement_needed: rating < 3,
          timestamp: new Date().toISOString()
        },
        source: 'user_feedback'
      };

      // Store in learning collection
      await this.vectorDB.addDocuments('learning_feedback', [learningDoc]);

      // Update metrics
      await this.updateLearningMetrics(userFeedback, rating, confidence);

      // Analyze patterns for improvement
      const insights = await this.analyzePatterns(query, userFeedback, context);

      logger.info(`Processed feedback: ${userFeedback} (rating: ${rating})`, {
        userId,
        queryCategory: learningDoc.metadata.query_category,
        insights: insights.length
      });

      return {
        success: true,
        insights,
        learningDocId: learningDoc.id
      };

    } catch (error) {
      logger.error('Failed to process feedback:', error);
      throw error;
    }
  }

  /**
   * Generate AI recommendations with learning-enhanced context
   */
  async generateRecommendations(query, userId, options = {}) {
    try {
      // Get base recommendations from vector search
      const searchCollections = options.collections || [
        'art_metadata',
        'site_content',
        'user_interactions'
      ];
      
      const searchOptions = {
        limitPerCollection: options.limitPerCollection || 5,
        totalLimit: options.totalLimit || 15,
        ...options // Include any filters like { status: 'active' }
      };
      
      const searchResults = await this.vectorDB.multiSearch(query, searchCollections, searchOptions);

      // Get learning insights for this type of query
      const learningInsights = await this.getLearningInsights(query, userId);

      // Get user preference patterns
      const userPatterns = await this.getUserPatterns(userId);

      // Combine and rank recommendations
      const enhancedRecommendations = await this.enhanceWithLearning(
        searchResults,
        learningInsights,
        userPatterns,
        options
      );

      // Calculate confidence score
      const confidence = this.calculateConfidence(enhancedRecommendations, learningInsights);

      logger.info(`Generated recommendations for user ${userId}`, {
        query,
        resultCount: enhancedRecommendations.length,
        confidence,
        hasLearningInsights: learningInsights.length > 0
      });

      return {
        recommendations: enhancedRecommendations,
        confidence,
        learningApplied: learningInsights.length > 0,
        userPatternsFound: userPatterns.length > 0,
        metadata: {
          query,
          userId,
          timestamp: new Date().toISOString(),
          version: '1.0'
        }
      };

    } catch (error) {
      logger.error('Failed to generate recommendations:', error);
      throw error;
    }
  }

  /**
   * Analyze patterns in feedback to identify improvement areas
   */
  async analyzePatterns(query, feedback, context) {
    try {
      // Search for similar queries with feedback
      const similarFeedback = await this.vectorDB.semanticSearch(
        query,
        'learning_feedback',
        { limit: 20 }
      );

      const insights = [];

      // Analyze feedback patterns
      const feedbackTypes = similarFeedback.reduce((acc, item) => {
        const type = item.metadata.feedback_type;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      // Identify problematic patterns
      if (feedbackTypes.negative > feedbackTypes.positive) {
        insights.push({
          type: 'pattern_issue',
          description: 'Similar queries receiving negative feedback',
          severity: 'high',
          suggestion: 'Review response strategy for this query type'
        });
      }

      // Analyze rating patterns
      const avgRating = similarFeedback.reduce((sum, item) => 
        sum + (item.metadata.rating || 0), 0) / similarFeedback.length;

      if (avgRating < 3) {
        insights.push({
          type: 'low_satisfaction',
          description: `Low average rating (${avgRating.toFixed(1)}) for similar queries`,
          severity: 'medium',
          suggestion: 'Improve response quality and relevance'
        });
      }

      // Identify successful patterns
      const highRatedResponses = similarFeedback.filter(item => 
        item.metadata.rating >= 4
      );

      if (highRatedResponses.length > 0) {
        insights.push({
          type: 'success_pattern',
          description: 'Found successful response patterns',
          severity: 'info',
          suggestion: 'Apply successful patterns to similar queries'
        });
      }

      return insights;

    } catch (error) {
      logger.error('Pattern analysis failed:', error);
      return [];
    }
  }

  /**
   * Get learning insights for query optimization
   */
  async getLearningInsights(query, userId) {
    try {
      // Search learning feedback for similar queries
      const insights = await this.vectorDB.semanticSearch(
        query,
        'learning_feedback',
        { 
          limit: 10,
          filter: { feedback_type: 'positive' } // Focus on successful patterns
        }
      );

      return insights.map(insight => ({
        pattern: insight.content,
        confidence: insight.similarity,
        metadata: insight.metadata,
        applicability: this.calculateApplicability(insight, userId)
      }));

    } catch (error) {
      logger.error('Failed to get learning insights:', error);
      return [];
    }
  }

  /**
   * Get user behavior patterns for personalization
   */
  async getUserPatterns(userId) {
    try {
      const userInteractions = await this.vectorDB.semanticSearch(
        `user preferences behavior patterns`,
        'user_interactions',
        {
          limit: 20,
          filter: { user_id: userId }
        }
      );

      // Analyze patterns
      const patterns = this.extractUserPatterns(userInteractions);
      
      return patterns;

    } catch (error) {
      logger.error('Failed to get user patterns:', error);
      return [];
    }
  }

  /**
   * Enhance recommendations with learning insights
   */
  async enhanceWithLearning(baseResults, learningInsights, userPatterns, options) {
    try {
      // Apply learning weights
      const enhanced = baseResults.map(result => {
        let enhancedScore = result.similarity;

        // Apply learning insights
        learningInsights.forEach(insight => {
          if (insight.applicability > 0.7) {
            enhancedScore *= (1 + insight.confidence * 0.2);
          }
        });

        // Apply user patterns
        userPatterns.forEach(pattern => {
          if (this.matchesUserPattern(result, pattern)) {
            enhancedScore *= (1 + pattern.strength * 0.3);
          }
        });

        return {
          ...result,
          originalScore: result.similarity,
          enhancedScore,
          learningApplied: true
        };
      });

      // Re-sort by enhanced score
      enhanced.sort((a, b) => b.enhancedScore - a.enhancedScore);

      // Apply diversity if requested
      if (options.diversify) {
        return this.diversifyResults(enhanced);
      }

      return enhanced;

    } catch (error) {
      logger.error('Failed to enhance recommendations:', error);
      return baseResults;
    }
  }

  /**
   * Calculate confidence in recommendations
   */
  calculateConfidence(recommendations, learningInsights) {
    if (recommendations.length === 0) return 0;

    const avgScore = recommendations.reduce((sum, rec) => 
      sum + rec.enhancedScore, 0) / recommendations.length;
    
    const learningBoost = learningInsights.length > 0 ? 0.1 : 0;
    const diversityPenalty = this.calculateDiversityPenalty(recommendations);

    return Math.min(0.95, Math.max(0.1, avgScore + learningBoost - diversityPenalty));
  }

  /**
   * Update learning metrics
   */
  async updateLearningMetrics(feedback, rating, confidence) {
    this.learningMetrics.totalInteractions++;
    
    if (feedback === 'positive') {
      this.learningMetrics.positiveResponses++;
    } else if (feedback === 'negative') {
      this.learningMetrics.negativeResponses++;
    }

    // Update running averages
    const total = this.learningMetrics.totalInteractions;
    this.learningMetrics.averageConfidence = 
      (this.learningMetrics.averageConfidence * (total - 1) + confidence) / total;

    // Calculate improvement rate
    const positiveRate = this.learningMetrics.positiveResponses / total;
    this.learningMetrics.improvementRate = positiveRate;

    // Log metrics periodically
    if (total % 100 === 0) {
      logger.info('Learning metrics update', this.learningMetrics);
    }
  }

  /**
   * Helper methods
   */
  formatLearningContent(query, response, feedback, context) {
    return `Query: ${query} | Response: ${response} | Feedback: ${feedback} | Context: ${JSON.stringify(context)}`;
  }

  async categorizeQuery(query) {
    // Simple categorization - could be enhanced with ML
    const categories = {
      'art_search': ['art', 'painting', 'sculpture', 'artist', 'artwork'],
      'help_request': ['help', 'how', 'problem', 'issue', 'support'],
      'recommendation': ['recommend', 'suggest', 'similar', 'like'],
      'information': ['what', 'when', 'where', 'who', 'info']
    };

    const queryLower = query.toLowerCase();
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  calculateApplicability(insight, userId) {
    // Calculate how applicable an insight is to current context
    let score = 0.5; // Base score

    // Time decay
    const age = Date.now() - new Date(insight.metadata.timestamp).getTime();
    const daysSinceCreated = age / (1000 * 60 * 60 * 24);
    score *= Math.exp(-daysSinceCreated / 30); // Decay over 30 days

    // User similarity (if available)
    if (insight.metadata.user_id === userId) {
      score *= 1.5; // Boost for same user
    }

    return Math.min(1, score);
  }

  extractUserPatterns(interactions) {
    // Extract patterns from user interactions
    const patterns = [];
    
    // Analyze interaction types
    const actionCounts = {};
    interactions.forEach(interaction => {
      const action = interaction.metadata.action_type;
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    });

    // Create patterns
    Object.entries(actionCounts).forEach(([action, count]) => {
      if (count > 2) { // Minimum threshold
        patterns.push({
          type: 'action_preference',
          action,
          strength: Math.min(1, count / interactions.length),
          confidence: count / interactions.length
        });
      }
    });

    return patterns;
  }

  matchesUserPattern(result, pattern) {
    // Check if result matches user pattern
    if (pattern.type === 'action_preference') {
      return result.metadata.type === pattern.action;
    }
    return false;
  }

  diversifyResults(results) {
    // Simple diversification - ensure variety in result types
    const diversified = [];
    const typesSeen = new Set();
    
    for (const result of results) {
      const type = result.metadata.type;
      if (!typesSeen.has(type) || diversified.length < 5) {
        diversified.push(result);
        typesSeen.add(type);
      }
      
      if (diversified.length >= 10) break;
    }

    return diversified;
  }

  calculateDiversityPenalty(recommendations) {
    // Penalize lack of diversity
    const types = new Set(recommendations.map(r => r.metadata.type));
    const diversityRatio = types.size / recommendations.length;
    return (1 - diversityRatio) * 0.1;
  }

  async loadLearningMetrics() {
    // Load existing metrics from storage (could be enhanced)
    this.learningMetrics = {
      totalInteractions: 0,
      positiveResponses: 0,
      negativeResponses: 0,
      averageConfidence: 0,
      improvementRate: 0
    };
  }

  /**
   * Get learning system health and metrics
   */
  async getSystemHealth() {
    try {
      const vectorHealth = await this.vectorDB.healthCheck();
      
      return {
        status: vectorHealth.healthy ? 'healthy' : 'degraded',
        metrics: this.learningMetrics,
        vector_db: vectorHealth,
        last_check: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        last_check: new Date().toISOString()
      };
    }
  }
}

module.exports = AILearningSystem;
