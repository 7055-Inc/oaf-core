/**
 * Central Brain - The Main Intelligence Orchestrator
 * 
 * Coordinates all Leo Brain components:
 * - QueryAnalyzer: Understands user intent
 * - VectorDB: Retrieves relevant data
 * - TruthStore: Applies learned patterns
 * - ResponseOrganizer: Formats results
 * 
 * This is the "conductor" of the Leo Brain orchestra
 */

const QueryAnalyzer = require('./QueryAnalyzer');
const ResponseOrganizer = require('./ResponseOrganizer');
const TruthExtractor = require('./TruthExtractor');
const { getUserPreferences } = require('../utils/userPreferences');
const { scoreAndSort } = require('../utils/boostScoring');
const logger = require('../logger');

class CentralBrain {
  constructor() {
    this.queryAnalyzer = new QueryAnalyzer();
    this.responseOrganizer = new ResponseOrganizer();
    this.truthExtractor = new TruthExtractor();
    this.vectorDB = null;
    this.truthStore = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the Central Brain with required services
   * 
   * @param {Object} vectorDB - VectorDatabase instance
   * @param {Object} truthStore - TruthStore instance (optional)
   */
  async initialize(vectorDB, truthStore = null) {
    try {
      logger.info('🧠 [CENTRAL-BRAIN] Initializing...');

      if (!vectorDB) {
        throw new Error('VectorDB instance is required');
      }

      this.vectorDB = vectorDB;
      this.truthStore = truthStore;

      // Ensure VectorDB is initialized
      if (!this.vectorDB.isInitialized) {
        await this.vectorDB.initialize();
      }

      // Health check on Llama
      const analyzerHealth = await this.queryAnalyzer.healthCheck();
      if (!analyzerHealth.healthy) {
        logger.warn('Llama/Ollama not available - brain will use fallback mode');
      }

      this.isInitialized = true;
      logger.info('✅ Central brain initialized successfully');

      return { success: true };

    } catch (error) {
      logger.error('❌ Failed to initialize central brain:', error);
      throw error;
    }
  }

  /**
   * Main entry point - Process any query through the brain
   * 
   * @param {string} query - User's query
   * @param {Object} context - Request context (userId, page, etc.)
   * @returns {Promise<Object>} Complete brain response
   */
  async processQuery(query, context = {}) {
    const startTime = Date.now();

    try {
      if (!this.isInitialized) {
        throw new Error('Central brain not initialized');
      }

      const {
        userId = 'anonymous',
        requestType = 'search',
        page = 'unknown',
        limit = 20,
        displayMode = 'standard'
      } = context;

      logger.info(`🧠 [CENTRAL-BRAIN] Processing: "${query}" (user: ${userId}, type: ${requestType})`);

      // Step 1: Analyze the query with Llama
      const analysis = await this.queryAnalyzer.analyzeQuery(query, context);

      // Step 2: Execute the analysis plan (fetch data)
      const executionResults = await this.executePlan(analysis, userId);

      // Step 3: Apply personalization boost scoring
      const personalizedResults = await this.applyPersonalization(
        executionResults.results,
        userId,
        analysis
      );

      // Step 4: Organize response with Llama
      const organizedResponse = await this.responseOrganizer.organizeResponse(
        personalizedResults,
        analysis,
        { userId, displayMode, limit }
      );

      const responseTime = Date.now() - startTime;
      logger.info(`✅ Central brain completed in ${responseTime}ms`);

      return {
        success: true,
        query,
        analysis,
        response: organizedResponse,
        metadata: {
          response_time_ms: responseTime,
          user_id: userId,
          request_type: requestType,
          personalization_applied: userId !== 'anonymous',
          llama_used: !analysis.fallback && !organizedResponse.fallback,
          timestamp: new Date().toISOString(),
          brain_version: '1.0.0'
        }
      };

    } catch (error) {
      logger.error('🧠 [CENTRAL-BRAIN] Processing failed:', error);
      return {
        success: false,
        error: error.message,
        response: {
          organized_results: {},
          confidence: 0,
          reasoning: 'Brain processing failed'
        }
      };
    }
  }

  /**
   * Execute the query analysis plan
   * Fetches data from VectorDB based on analysis
   */
  async executePlan(analysis, userId) {
    try {
      logger.info(`📊 [CENTRAL-BRAIN] Executing plan for ${analysis.data_sources.join(', ')}`);

      const results = [];
      const truthsUsed = [];

      // Map data sources to collections
      const collectionMap = {
        products: 'art_metadata',
        artists: 'user_profiles',
        promoters: 'user_profiles',
        users: 'user_profiles',
        events: 'event_data',
        articles: 'site_content',
        reviews: 'reviews'
      };

      // Execute parallel searches
      const searchPromises = analysis.data_sources.map(async (source) => {
        const collection = collectionMap[source];
        if (!collection) {
          logger.warn(`Unknown data source: ${source}`);
          return [];
        }

        try {
          // Apply appropriate filters
          const filters = this.getFiltersForSource(source);

          const searchResults = await this.vectorDB.semanticSearch(
            analysis.query_refined || analysis.query,
            collection,
            {
              limit: Math.ceil(analysis.result_limit / analysis.data_sources.length),
              filter: filters
            }
          );

          // Tag results with source
          return searchResults.map(r => ({
            ...r,
            source: source,
            collection: collection
          }));

        } catch (error) {
          logger.error(`Search failed for ${source}:`, error);
          return [];
        }
      });

      const searchResults = await Promise.all(searchPromises);
      const allResults = searchResults.flat();

      // Get truths if requested and available
      if (analysis.truth_application && this.truthStore && userId !== 'anonymous') {
        try {
          const truths = await this.getTruthsForUser(userId, analysis.query);
          truthsUsed.push(...truths);
        } catch (error) {
          logger.warn('Failed to fetch truths:', error);
        }
      }

      logger.info(`📊 Found ${allResults.length} results from ${analysis.data_sources.length} sources`);

      return {
        results: allResults,
        truths: truthsUsed
      };

    } catch (error) {
      logger.error('Plan execution failed:', error);
      return {
        results: [],
        truths: []
      };
    }
  }

  /**
   * Get filters for a specific data source
   */
  getFiltersForSource(source) {
    const filterMap = {
      products: { classification: '101' }, // Active products only
      artists: { classification: '141', user_type: 'artist' },
      promoters: { classification: '141', user_type: 'promoter' },
      articles: { classification: '402' }, // Published articles
      events: { status: 'active' },
      reviews: {}
    };

    return filterMap[source] || {};
  }

  /**
   * Apply personalization using boost scoring
   */
  async applyPersonalization(results, userId, analysis) {
    try {
      if (!analysis.personalization || userId === 'anonymous') {
        logger.info('Skipping personalization (anonymous user or not requested)');
        return results;
      }

      // Load user preferences
      const userPrefs = await getUserPreferences(userId, this.vectorDB);

      // Apply boost scoring
      const scoredResults = scoreAndSort(results, userPrefs);

      logger.info(`🎯 Applied personalization for user ${userId}`);

      return scoredResults;

    } catch (error) {
      logger.warn('Personalization failed, using unpersonalized results:', error);
      return results;
    }
  }

  /**
   * Get relevant truths for a user and query
   */
  async getTruthsForUser(userId, query) {
    try {
      if (!this.truthStore || !this.truthStore.isInitialized) {
        return [];
      }

      // Search for user-specific truths
      const truthResults = await this.truthStore.searchTruths(
        `user ${userId} ${query}`,
        'truth_similarities',
        { limit: 5 }
      );

      return truthResults.map(t => ({
        content: t.content || t.pattern,
        confidence: t.confidence,
        type: t.type
      }));

    } catch (error) {
      logger.warn('Failed to fetch user truths:', error);
      return [];
    }
  }

  /**
   * Analyze query only (no execution)
   * Useful for debugging and testing
   */
  async analyzeOnly(query, context = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Central brain not initialized');
      }

      const analysis = await this.queryAnalyzer.analyzeQuery(query, context);

      return {
        success: true,
        analysis,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Query analysis failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract truths from documents
   * Delegates to TruthExtractor
   */
  async extractTruths(documents, context = {}) {
    try {
      return await this.truthExtractor.extractTruths(documents, context);
    } catch (error) {
      logger.error('Truth extraction failed:', error);
      return {
        success: false,
        error: error.message,
        truths: []
      };
    }
  }

  /**
   * Health check for entire brain system
   */
  async healthCheck() {
    try {
      const checks = {
        analyzer: await this.queryAnalyzer.healthCheck(),
        organizer: await this.responseOrganizer.healthCheck(),
        extractor: await this.truthExtractor.healthCheck(),
        vectorDB: this.vectorDB ? await this.vectorDB.healthCheck() : { healthy: false },
        truthStore: this.truthStore && this.truthStore.isInitialized
          ? { healthy: true }
          : { healthy: false }
      };

      const allHealthy = Object.values(checks).every(c => c.healthy);

      return {
        healthy: allHealthy,
        initialized: this.isInitialized,
        components: checks,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get brain statistics
   */
  getStats() {
    return {
      initialized: this.isInitialized,
      has_vectordb: this.vectorDB !== null,
      has_truthstore: this.truthStore !== null,
      version: '1.0.0',
      components: {
        query_analyzer: 'QueryAnalyzer',
        response_organizer: 'ResponseOrganizer',
        truth_extractor: 'TruthExtractor'
      }
    };
  }
}

// Singleton instance
let instance = null;

/**
 * Get singleton instance of Central Brain
 */
function getBrain() {
  if (!instance) {
    instance = new CentralBrain();
  }
  return instance;
}

module.exports = CentralBrain;
module.exports.getBrain = getBrain;
