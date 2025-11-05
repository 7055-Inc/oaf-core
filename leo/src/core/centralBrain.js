/**
 * Leo AI Platform - Central Brain
 * Single intelligent coordinator that handles all user queries
 * Llama decides how to process requests and organize responses
 */

const VectorDatabase = require('./vectorDatabase');
const TruthVectorDatabase = require('./truthVectorDatabase');
const SearchService = require('../services/searchService');
const logger = require('../utils/logger');

class CentralBrain {
  constructor() {
    this.mainDB = new VectorDatabase();
    this.truthDB = new TruthVectorDatabase();
    this.searchService = new SearchService(); // Will receive DB instances during initialization
    this.isInitialized = false;
  }

  async initialize() {
    try {
      logger.info('🧠 [CENTRAL-BRAIN] Initializing central brain...');
      
      // Initialize databases first
      await this.mainDB.initialize();
      await this.truthDB.initialize();
      
      // Pass database instances to SearchService - Central Brain is the coordinator
      await this.searchService.initialize(this.mainDB, this.truthDB);
      
      this.isInitialized = true;
      logger.info('✅ Central brain initialized successfully (databases shared with SearchService)');
      return { success: true };
    } catch (error) {
      logger.error('❌ Failed to initialize central brain:', error);
      throw error;
    }
  }

  /**
   * Main entry point - Llama decides how to handle any query
   */
  async processQuery(query, context = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const {
        userId = 'anonymous',
        requestType = 'unknown', // search, recommendation, feedback, etc.
        page = 'unknown',
        limit = 20
      } = context;

      logger.info(`🧠 [CENTRAL-BRAIN] Processing query: "${query}" (user: ${userId}, type: ${requestType})`);
      const startTime = Date.now();

      // Use Llama analysis for ALL requests (no more SearchService bypass)
      // Step 1: Let Llama analyze the query and decide what to do
      const queryAnalysis = await this.analyzeQueryWithLlama(query, context);
      
      if (!queryAnalysis) {
        throw new Error('Failed to analyze query with Llama');
      }

      // Step 2: Execute Llama's plan
      const results = await this.executeQueryPlan(queryAnalysis, userId, limit);

      // Step 3: Let Llama organize the final response
      const organizedResponse = await this.organizeResponseWithLlama(results, queryAnalysis, context);

      const responseTime = Date.now() - startTime;
      logger.info(`✅ Central brain completed query in ${responseTime}ms`);

      return {
        success: true,
        query,
        context,
        analysis: queryAnalysis,
        response: organizedResponse,
        metadata: {
          responseTime,
          userId,
          timestamp: new Date().toISOString(),
          brainProcessed: true
        }
      };

    } catch (error) {
      logger.error('Central brain processing failed:', error);
      throw error;
    }
  }


  /**
   * Step 1: Let Llama analyze the query and create an execution plan
   */
  async analyzeQueryWithLlama(query, context) {
    try {
      const analysisPrompt = `Analyze query: "${query}"
Context: ${context.requestType || 'unknown'}, user: ${context.userId || 'anon'}

Return JSON:
{
  "intent": "recommendation|search|help",
  "data_sources": ["products"],
  "personalization": true,
  "result_limit": ${context.limit || 6},
  "reasoning": "brief reason"
}`;

      const llamaResponse = await this.queryLlama(analysisPrompt);
      
      if (llamaResponse && llamaResponse.intent) {
        logger.info(`🧠 Query analysis: ${llamaResponse.intent} - ${llamaResponse.reasoning}`);
        return llamaResponse;
      }
      
      // Fallback analysis
      return {
        intent: 'search',
        data_sources: ['products'],
        personalization: true,
        result_limit: context.limit || 6,
        reasoning: 'Fallback analysis'
      };

    } catch (error) {
      logger.warn('Query analysis failed, using fallback:', error);
      return null;
    }
  }

  /**
   * Step 2: Execute the plan Llama created
   */
  async executeQueryPlan(analysis, userId, limit) {
    try {
      const results = {
        main_vector_results: [],
        relevant_truths: [],
        user_context: {}
      };

      // Get main vector results based on data sources
      const vectorSearches = [];
      
      if (analysis.data_sources.includes('products')) {
        vectorSearches.push(
          this.mainDB.semanticSearch(analysis.query || 'products', 'art_metadata', { 
            limit: Math.ceil(limit * 0.4),
            filter: { status: 'active' } // Only return active products
          })
        );
      }
      if (analysis.data_sources.includes('articles')) {
        vectorSearches.push(
          this.mainDB.semanticSearch(analysis.query || 'articles', 'site_content', { limit: Math.ceil(limit * 0.3) })
        );
      }
      if (analysis.data_sources.includes('events')) {
        vectorSearches.push(
          this.mainDB.semanticSearch(analysis.query || 'events', 'event_data', { limit: Math.ceil(limit * 0.2) })
        );
      }
      if (analysis.data_sources.includes('users')) {
        vectorSearches.push(
          this.mainDB.semanticSearch(analysis.query || 'users', 'user_interactions', { limit: Math.ceil(limit * 0.1) })
        );
      }

      const vectorResults = await Promise.all(vectorSearches);
      results.main_vector_results = vectorResults.flat();

      // Get relevant truths if personalization is needed
      if (analysis.personalization && analysis.truth_application) {
        const truthSearches = [
          this.truthDB.searchTruths(`user ${userId} preferences`, 'user_truths', { limit: 5 }),
          this.truthDB.searchTruths(analysis.query || 'behavioral patterns', 'behavioral_truths', { limit: 5 }),
          this.truthDB.searchTruths('content patterns', 'content_truths', { limit: 3 })
        ];

        const truthResults = await Promise.all(truthSearches);
        results.relevant_truths = truthResults.flat();
      }

      logger.info(`📊 Executed plan: ${results.main_vector_results.length} vector results, ${results.relevant_truths.length} truths`);
      return results;

    } catch (error) {
      logger.error('Failed to execute query plan:', error);
      return { main_vector_results: [], relevant_truths: [], user_context: {} };
    }
  }

  /**
   * Step 3: Let Llama organize the final response
   */
  async organizeResponseWithLlama(results, analysis, context) {
    try {
      const organizationPrompt = `Organize results for ${analysis.intent}.
Results: ${JSON.stringify(results.main_vector_results.slice(0, 5).map(r => ({
  id: r.metadata?.original_id || r.id,
  similarity: r.similarity
})))}

Return JSON:
{
  "organized_results": {
    "products": [{"id": "123", "relevance": 0.9, "reason": "relevant"}]
  },
  "intelligence_applied": true,
  "confidence": 0.8
}`;

      const llamaResponse = await this.queryLlama(organizationPrompt);
      
      if (llamaResponse && llamaResponse.organized_results) {
        logger.info(`🧠 Results organized: ${llamaResponse.truths_used?.length || 0} truths applied`);
        return llamaResponse;
      }

      // Fallback organization
      return this.fallbackOrganization(results.main_vector_results);

    } catch (error) {
      logger.warn('Llama organization failed, using fallback:', error);
      return this.fallbackOrganization(results.main_vector_results);
    }
  }


  /**
   * Fallback organization when Llama fails
   */
  fallbackOrganization(vectorResults) {
    const organized = {
      products: [],
      articles: [],
      events: [],
      users: []
    };

    vectorResults.forEach(result => {
      const id = result.metadata?.original_id || result.metadata?.product_id || result.id;
      const relevance = result.similarity || 0.5;
      
      if (result.collection === 'art_metadata' || result.metadata?.source_table === 'products') {
        organized.products.push({ id, relevance, reason: 'Vector similarity match' });
      } else if (result.collection === 'site_content' || result.metadata?.source_table === 'articles') {
        organized.articles.push({ id, relevance, reason: 'Content similarity match' });
      } else if (result.collection === 'event_data' || result.metadata?.source_table === 'events') {
        organized.events.push({ id, relevance, reason: 'Event similarity match' });
      } else if (result.collection === 'user_interactions' || result.metadata?.source_table === 'users') {
        organized.users.push({ id, relevance, reason: 'User interaction match' });
      }
    });


    return {
      organized_results: organized,
      intelligence_applied: false,
      truths_used: [],
      confidence: 0.5,
      organization_reasoning: 'Fallback organization by collection type'
    };
  }

  /**
   * Query Llama via HTTP API
   */
  async queryLlama(prompt) {
    try {
      // Add timeout for faster failures
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: 'llama3.2',
          prompt: prompt,
          stream: false,
          options: { temperature: 0.3, top_p: 0.9, num_predict: 200 } // Reduced from 1000 to 200
        })
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) return null;
      
      const data = await response.json();
      const cleanResponse = data.response?.replace(/[^\x20-\x7E\n]/g, '').trim();
      const jsonMatch = cleanResponse?.match(/\{[\s\S]*\}/);
      
      return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (error) {
      logger.warn('Llama query failed:', error);
      return null;
    }
  }

  /**
   * Health check for central brain
   */
  async healthCheck() {
    try {
      const mainHealth = await this.mainDB.healthCheck();
      const truthHealth = await this.truthDB.healthCheck();

      return {
        healthy: mainHealth.healthy && truthHealth.healthy,
        initialized: this.isInitialized,
        main_database: mainHealth,
        truth_database: truthHealth,
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
}

module.exports = CentralBrain;
