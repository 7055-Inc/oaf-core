/**
 * Query Analyzer - Llama-Powered Query Understanding
 * 
 * Analyzes user queries to determine:
 * - Intent (search, recommendation, help, etc.)
 * - Data sources needed (products, users, events, etc.)
 * - Personalization requirements
 * - Result limits and priorities
 * 
 * This is the "thinking" part of Leo Brain
 */

const logger = require('../logger');

class QueryAnalyzer {
  constructor() {
    this.ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.model = process.env.OLLAMA_MODEL || 'llama3.2';
  }

  /**
   * Analyze a query and create an execution plan
   * 
   * @param {string} query - The user's query
   * @param {Object} context - Request context (userId, page, etc.)
   * @returns {Promise<Object>} Analysis result with execution plan
   */
  async analyzeQuery(query, context = {}) {
    try {
      const {
        userId = 'anonymous',
        requestType = 'unknown',
        page = 'unknown',
        limit = 20
      } = context;

      logger.info(`[QueryAnalyzer] Analyzing: "${query}" (user: ${userId}, type: ${requestType})`);

      // Create analysis prompt for Llama
      const analysisPrompt = this.createAnalysisPrompt(query, context);
      
      // Query Llama for analysis
      const llamaResponse = await this.queryLlama(analysisPrompt);
      
      if (!llamaResponse) {
        logger.warn('Llama analysis failed, using fallback');
        return this.createFallbackAnalysis(query, context);
      }

      // Validate and enrich the analysis
      const analysis = this.enrichAnalysis(llamaResponse, query, context);
      
      logger.info(`[QueryAnalyzer] Intent: ${analysis.intent}, Sources: ${analysis.data_sources.join(', ')}`);
      
      return analysis;

    } catch (error) {
      logger.error('[QueryAnalyzer] Analysis failed:', error);
      return this.createFallbackAnalysis(query, context);
    }
  }

  /**
   * Create analysis prompt for Llama
   */
  createAnalysisPrompt(query, context) {
    const { userId, requestType, page, limit } = context;

    return `You are Leo AI's query analysis engine. Analyze the following user query and determine how to process it.

USER QUERY: "${query}"

CONTEXT:
- User ID: ${userId}
- Request Type: ${requestType}
- Page: ${page}
- Requested Limit: ${limit}

INSTRUCTIONS:
Analyze the query and determine:
1. User intent: What is the user trying to accomplish?
2. Data sources needed: Which collections should be searched? (products, users, events, articles, reviews)
3. Personalization: Should user preferences be applied?
4. Truth application: Should behavioral truths enhance the results?
5. Result limit: How many results to initially fetch (usually 1.5-2x requested limit)
6. Priority: How to prioritize and rank different result types

RESPOND WITH VALID JSON ONLY:
{
  "intent": "search|recommendation|discovery|help|comparison",
  "data_sources": ["products", "articles"],
  "personalization": true,
  "truth_application": true,
  "result_limit": ${limit * 2},
  "priority_order": ["products", "articles"],
  "reasoning": "Brief explanation of analysis",
  "confidence": 0.8,
  "query_refined": "Refined search query if needed"
}

IMPORTANT: Return only valid JSON, no other text.`;
  }

  /**
   * Query Llama via Ollama HTTP API
   */
  async queryLlama(prompt) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${this.ollamaHost}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: this.model,
          prompt: prompt,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9,
            num_predict: 300 // Reduced for faster response
          }
        })
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.error(`Ollama API request failed: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      const cleanResponse = data.response?.replace(/[^\x20-\x7E\n]/g, '').trim();
      
      // Extract JSON from response
      const jsonMatch = cleanResponse?.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        logger.warn('No valid JSON found in Llama response');
        return null;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        logger.warn('Llama query timeout');
      } else {
        logger.error('Failed to query Llama:', error);
      }
      return null;
    }
  }

  /**
   * Enrich and validate Llama's analysis
   */
  enrichAnalysis(llamaResponse, query, context) {
    const { limit = 20, userId } = context;

    return {
      query: query,
      query_refined: llamaResponse.query_refined || query,
      intent: llamaResponse.intent || 'search',
      data_sources: this.validateDataSources(llamaResponse.data_sources || ['products']),
      personalization: userId !== 'anonymous' && (llamaResponse.personalization !== false),
      truth_application: userId !== 'anonymous' && (llamaResponse.truth_application !== false),
      result_limit: llamaResponse.result_limit || (limit * 2),
      priority_order: llamaResponse.priority_order || llamaResponse.data_sources || ['products'],
      reasoning: llamaResponse.reasoning || 'Query analysis',
      confidence: llamaResponse.confidence || 0.5,
      timestamp: new Date().toISOString(),
      analyzer_version: '1.0.0'
    };
  }

  /**
   * Validate data sources are allowed
   */
  validateDataSources(sources) {
    const allowedSources = ['products', 'users', 'artists', 'promoters', 'events', 'articles', 'reviews'];
    return sources.filter(source => allowedSources.includes(source));
  }

  /**
   * Create fallback analysis when Llama fails
   */
  createFallbackAnalysis(query, context) {
    const { limit = 20, userId, requestType } = context;

    // Simple heuristic-based analysis
    const dataSources = this.inferDataSources(query, requestType);
    
    return {
      query: query,
      query_refined: query,
      intent: requestType === 'recommendation' ? 'recommendation' : 'search',
      data_sources: dataSources,
      personalization: userId !== 'anonymous',
      truth_application: userId !== 'anonymous',
      result_limit: limit * 2,
      priority_order: dataSources,
      reasoning: 'Fallback heuristic analysis (Llama unavailable)',
      confidence: 0.3,
      timestamp: new Date().toISOString(),
      analyzer_version: '1.0.0',
      fallback: true
    };
  }

  /**
   * Infer data sources from query keywords (fallback heuristic)
   */
  inferDataSources(query, requestType) {
    const lowerQuery = query.toLowerCase();
    const sources = [];

    // Default to products for most queries
    sources.push('products');

    // Check for specific keywords
    if (lowerQuery.includes('artist') || lowerQuery.includes('creator') || lowerQuery.includes('seller')) {
      sources.push('artists');
    }
    
    if (lowerQuery.includes('event') || lowerQuery.includes('festival') || lowerQuery.includes('show')) {
      sources.push('events');
    }
    
    if (lowerQuery.includes('article') || lowerQuery.includes('blog') || lowerQuery.includes('help') || lowerQuery.includes('guide')) {
      sources.push('articles');
    }
    
    if (lowerQuery.includes('review') || lowerQuery.includes('rating')) {
      sources.push('reviews');
    }

    return sources.length > 0 ? sources : ['products'];
  }

  /**
   * Batch analyze multiple queries (for testing/optimization)
   */
  async batchAnalyze(queries, sharedContext = {}) {
    const analyses = await Promise.all(
      queries.map(query => this.analyzeQuery(query, sharedContext))
    );
    
    return analyses;
  }

  /**
   * Health check for analyzer
   */
  async healthCheck() {
    try {
      const testQuery = 'test query';
      const testPrompt = `Respond with valid JSON only: {"status": "ok"}`;
      
      const response = await this.queryLlama(testPrompt);
      
      return {
        healthy: response !== null,
        ollama_host: this.ollamaHost,
        model: this.model,
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

module.exports = QueryAnalyzer;
