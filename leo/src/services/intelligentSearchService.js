const VectorDatabase = require('../core/vectorDatabase');
const TruthVectorDatabase = require('../core/truthVectorDatabase');
const logger = require('../utils/logger');

class IntelligentSearchService {
  constructor() {
    this.mainDB = new VectorDatabase();
    this.truthDB = new TruthVectorDatabase();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      logger.info('🎨 [INTELLIGENT-SEARCH] Initializing intelligent search service...');
      
      await this.mainDB.initialize();
      await this.truthDB.initialize();
      
      this.isInitialized = true;
      logger.info('✅ Intelligent search service initialized');
      return { success: true };
    } catch (error) {
      logger.error('❌ Failed to initialize intelligent search service:', error);
      throw error;
    }
  }

  /**
   * Main intelligent search function - replaces the old search methodology
   */
  async search(query, options = {}) {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const {
        userId = 'anonymous',
        limit = 20,
        includeMetaTruths = true,
        applyPersonalization = true
      } = options;

      logger.info(`🔍 [INTELLIGENT-SEARCH] Starting search for: "${query}" (user: ${userId})`);
      const startTime = Date.now();

      // Step 1: Component Translation - convert user query to optimized search terms
      const translatedQuery = await this.translateQuery(query, userId);
      
      // Step 2: Main Vector Search - get initial results from your 5,509 documents
      const mainResults = await this.performMainVectorSearch(translatedQuery, limit * 2); // Get more for filtering
      
      // Step 3: Get Relevant Truths - find applicable behavioral patterns
      const relevantTruths = includeMetaTruths ? 
        await this.getRelevantTruths(query, userId, mainResults) : [];
      
      // Step 4: Apply Truth-Based Intelligence - reorder and enhance results
      const intelligentResults = await this.applyTruthIntelligence(
        mainResults, 
        relevantTruths, 
        query, 
        userId,
        applyPersonalization
      );
      
      // Step 5: Format for UI Compatibility - match your existing result format
      const formattedResults = await this.formatForUI(intelligentResults, query, userId);
      
      const responseTime = Date.now() - startTime;
      logger.info(`✅ Intelligent search completed in ${responseTime}ms - ${formattedResults.totalResults} results`);
      
      // Step 6: Log search for continuous learning
      await this.logSearchForLearning(query, userId, formattedResults, responseTime);
      
      return formattedResults;

    } catch (error) {
      logger.error('Intelligent search failed:', error);
      throw error;
    }
  }

  /**
   * Step 1: Component Translation - optimize the search query
   */
  async translateQuery(originalQuery, userId) {
    try {
      // Get user's search history and preferences from truths
      const userTruths = await this.truthDB.searchTruths(
        `user ${userId} search preferences behavior`, 
        'user_truths', 
        { limit: 5 }
      );

      // Use Llama to optimize the query based on user patterns
      const optimizationPrompt = `You are optimizing a search query for better results. 

ORIGINAL QUERY: "${originalQuery}"
USER ID: ${userId}

USER PATTERNS: ${JSON.stringify(userTruths.map(t => t.content), null, 2)}

INSTRUCTIONS:
1. Expand the query with relevant synonyms and related terms
2. Consider user's past preferences if available
3. Add context that would improve semantic search
4. Keep the core intent but make it more comprehensive

RESPOND WITH VALID JSON:
{
  "optimized_query": "enhanced search terms",
  "additional_terms": ["related", "terms", "to", "include"],
  "reasoning": "why these optimizations help"
}`;

      const llamaResponse = await this.queryLlama(optimizationPrompt);
      
      if (llamaResponse && llamaResponse.optimized_query) {
        logger.info(`🔄 Query optimized: "${originalQuery}" → "${llamaResponse.optimized_query}"`);
        return {
          original: originalQuery,
          optimized: llamaResponse.optimized_query,
          additional_terms: llamaResponse.additional_terms || [],
          reasoning: llamaResponse.reasoning
        };
      }
      
      // Fallback to original query
      return {
        original: originalQuery,
        optimized: originalQuery,
        additional_terms: [],
        reasoning: 'No optimization applied'
      };

    } catch (error) {
      logger.warn('Query translation failed, using original:', error);
      return {
        original: originalQuery,
        optimized: originalQuery,
        additional_terms: [],
        reasoning: 'Translation failed, using original'
      };
    }
  }

  /**
   * Step 2: Main Vector Search - search your 5,509 documents
   */
  async performMainVectorSearch(translatedQuery, limit) {
    try {
      // Search across all your collections
      const searchPromises = [
        this.mainDB.semanticSearch(translatedQuery.optimized, 'art_metadata', { limit: Math.ceil(limit * 0.4) }),
        this.mainDB.semanticSearch(translatedQuery.optimized, 'site_content', { limit: Math.ceil(limit * 0.3) }),
        this.mainDB.semanticSearch(translatedQuery.optimized, 'user_interactions', { limit: Math.ceil(limit * 0.2) }),
        this.mainDB.semanticSearch(translatedQuery.optimized, 'event_data', { limit: Math.ceil(limit * 0.1) })
      ];

      // Also search for additional terms if available
      if (translatedQuery.additional_terms.length > 0) {
        const additionalQuery = translatedQuery.additional_terms.join(' ');
        searchPromises.push(
          this.mainDB.semanticSearch(additionalQuery, 'art_metadata', { limit: 5 })
        );
      }

      const searchResults = await Promise.all(searchPromises);
      
      // Combine and deduplicate results
      const allResults = searchResults.flat();
      const uniqueResults = this.deduplicateResults(allResults);
      
      // Sort by similarity score
      uniqueResults.sort((a, b) => b.similarity - a.similarity);
      
      logger.info(`📊 Main vector search found ${uniqueResults.length} unique results`);
      return uniqueResults.slice(0, limit);

    } catch (error) {
      logger.error('Main vector search failed:', error);
      return [];
    }
  }

  /**
   * Step 3: Get Relevant Truths - find applicable behavioral patterns
   */
  async getRelevantTruths(query, userId, mainResults) {
    try {
      // Search for truths related to this query and user behavior
      const truthSearches = [
        this.truthDB.searchTruths(`${query} user behavior preferences`, 'behavioral_truths', { limit: 5 }),
        this.truthDB.searchTruths(`${query} content patterns`, 'content_truths', { limit: 5 }),
        this.truthDB.searchTruths(`user ${userId} preferences`, 'user_truths', { limit: 3 }),
        this.truthDB.searchTruths('search patterns correlations', 'pattern_truths', { limit: 3 })
      ];

      const truthResults = await Promise.all(truthSearches);
      const allTruths = truthResults.flat();
      
      // Filter truths by relevance and confidence
      const relevantTruths = allTruths.filter(truth => 
        truth.confidence >= 0.4 && truth.similarity >= 0.3
      );

      logger.info(`🧠 Found ${relevantTruths.length} relevant truths for query enhancement`);
      return relevantTruths;

    } catch (error) {
      logger.warn('Failed to get relevant truths:', error);
      return [];
    }
  }

  /**
   * Step 4: Apply Truth-Based Intelligence - the magic happens here
   */
  async applyTruthIntelligence(mainResults, relevantTruths, query, userId, applyPersonalization) {
    try {
      if (relevantTruths.length === 0) {
        logger.info('📊 No truths to apply, returning main results');
        return mainResults.map(result => ({
          ...result,
          intelligenceApplied: false,
          truthsUsed: []
        }));
      }

      // Use Llama to apply truths intelligently
      const intelligencePrompt = `You are applying learned behavioral patterns to reorder search results intelligently.

SEARCH QUERY: "${query}"
USER ID: ${userId}

CURRENT RESULTS (top 10):
${JSON.stringify(mainResults.slice(0, 10).map((r, i) => ({
  rank: i + 1,
  content: r.content?.substring(0, 100),
  similarity: r.similarity,
  collection: r.collection,
  metadata: r.metadata
})), null, 2)}

RELEVANT BEHAVIORAL TRUTHS:
${JSON.stringify(relevantTruths.map(t => ({
  pattern: t.content,
  confidence: t.confidence,
  type: t.type
})), null, 2)}

INSTRUCTIONS:
1. Analyze how the behavioral truths should influence result ranking
2. Identify which results should be promoted or demoted based on learned patterns
3. Consider user preferences and behavioral patterns
4. Provide specific reasoning for ranking changes

RESPOND WITH VALID JSON:
{
  "reordering_strategy": "description of how to reorder",
  "promoted_results": [{"original_rank": 1, "new_rank": 1, "reason": "why promoted"}],
  "demoted_results": [{"original_rank": 1, "new_rank": 5, "reason": "why demoted"}],
  "confidence": 0.1-1.0,
  "truths_applied": ["list of truth patterns that influenced this decision"]
}`;

      const llamaResponse = await this.queryLlama(intelligencePrompt);
      
      if (llamaResponse && llamaResponse.reordering_strategy) {
        // Apply the intelligent reordering
        const reorderedResults = this.applyReordering(mainResults, llamaResponse);
        
        logger.info(`🧠 Applied truth-based intelligence: ${llamaResponse.truths_applied?.length || 0} patterns used`);
        
        return reorderedResults.map(result => ({
          ...result,
          intelligenceApplied: true,
          truthsUsed: llamaResponse.truths_applied || [],
          intelligenceConfidence: llamaResponse.confidence || 0.5,
          reorderingReason: llamaResponse.reordering_strategy
        }));
      }

      // Fallback: simple truth-based scoring
      return this.applySimpleTruthScoring(mainResults, relevantTruths);

    } catch (error) {
      logger.warn('Failed to apply truth intelligence:', error);
      return mainResults.map(result => ({
        ...result,
        intelligenceApplied: false,
        truthsUsed: []
      }));
    }
  }

  /**
   * Step 5: Format for UI Compatibility - match your existing result structure
   */
  async formatForUI(intelligentResults, query, userId) {
    try {
      // Categorize results to match your existing UI structure
      const categorized = {
        products: [],
        artists: [],
        articles: [],
        events: [],
        other: []
      };

      intelligentResults.forEach(result => {
        const category = this.categorizeResult(result);
        const formattedResult = this.formatSingleResult(result);
        categorized[category].push(formattedResult);
      });

      // Calculate totals
      const totalResults = Object.values(categorized).reduce((sum, arr) => sum + arr.length, 0);
      
      // Determine if learning was applied
      const learningApplied = intelligentResults.some(r => r.intelligenceApplied);
      const truthsUsed = [...new Set(intelligentResults.flatMap(r => r.truthsUsed || []))];

      return {
        success: true,
        query,
        categories: categorized,
        totalResults,
        metadata: {
          confidence: this.calculateOverallConfidence(intelligentResults),
          learningApplied,
          userPatternsFound: truthsUsed.length > 0,
          truthsApplied: truthsUsed,
          searchTime: new Date().toISOString(),
          userId,
          intelligentSearch: true
        }
      };

    } catch (error) {
      logger.error('Failed to format results for UI:', error);
      throw error;
    }
  }

  /**
   * Helper: Query Llama via HTTP API
   */
  async queryLlama(prompt) {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2',
          prompt: prompt,
          stream: false,
          options: { temperature: 0.3, top_p: 0.9, max_tokens: 800 }
        })
      });

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
   * Helper: Deduplicate search results
   */
  deduplicateResults(results) {
    const seen = new Set();
    return results.filter(result => {
      const key = result.id || result.content?.substring(0, 50) || Math.random();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Helper: Apply reordering based on Llama's intelligence
   */
  applyReordering(results, reorderingInstructions) {
    const reordered = [...results];
    
    // Apply promotions and demotions
    const changes = [
      ...(reorderingInstructions.promoted_results || []),
      ...(reorderingInstructions.demoted_results || [])
    ];

    changes.forEach(change => {
      const originalIndex = change.original_rank - 1;
      const newIndex = change.new_rank - 1;
      
      if (originalIndex >= 0 && originalIndex < reordered.length && 
          newIndex >= 0 && newIndex < reordered.length) {
        // Move the item
        const item = reordered.splice(originalIndex, 1)[0];
        reordered.splice(newIndex, 0, item);
      }
    });

    return reordered;
  }

  /**
   * Helper: Simple truth-based scoring fallback
   */
  applySimpleTruthScoring(results, truths) {
    return results.map(result => {
      let boost = 0;
      const appliedTruths = [];

      truths.forEach(truth => {
        // Simple keyword matching boost
        if (result.content?.toLowerCase().includes(truth.content.toLowerCase().substring(0, 20))) {
          boost += truth.confidence * 0.1;
          appliedTruths.push(truth.content.substring(0, 50));
        }
      });

      return {
        ...result,
        similarity: Math.min(1, result.similarity + boost),
        intelligenceApplied: boost > 0,
        truthsUsed: appliedTruths,
        intelligenceConfidence: boost
      };
    }).sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Helper: Categorize result for UI
   */
  categorizeResult(result) {
    const collection = result.collection?.toLowerCase() || '';
    const content = result.content?.toLowerCase() || '';
    const metadata = result.metadata || {};

    if (collection.includes('art') || metadata.product_id || content.includes('product')) {
      return 'products';
    }
    if (collection.includes('user') && (content.includes('artist') || metadata.artist_id)) {
      return 'artists';
    }
    if (collection.includes('event') || content.includes('event')) {
      return 'events';
    }
    if (collection.includes('site') || content.includes('article')) {
      return 'articles';
    }
    return 'other';
  }

  /**
   * Helper: Format single result for UI
   */
  formatSingleResult(result) {
    return {
      id: result.id || `result_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: this.extractTitle(result),
      content: result.content,
      excerpt: result.content?.substring(0, 200) + (result.content?.length > 200 ? '...' : ''),
      relevance: result.similarity,
      originalRelevance: result.similarity,
      collection: result.collection,
      metadata: {
        ...result.metadata,
        intelligenceApplied: result.intelligenceApplied,
        truthsUsed: result.truthsUsed,
        intelligenceConfidence: result.intelligenceConfidence
      },
      learningEnhanced: result.intelligenceApplied || false
    };
  }

  /**
   * Helper: Extract meaningful title from result
   */
  extractTitle(result) {
    if (result.metadata?.title) return result.metadata.title;
    if (result.metadata?.name) return result.metadata.name;
    if (result.metadata?.display_name) return result.metadata.display_name;
    if (result.metadata?.value_name) return `${result.metadata.value_name} (Option)`;
    
    // Extract from content
    const content = result.content || '';
    if (content.includes('Table:')) {
      const parts = content.split(' ');
      return parts.slice(0, 5).join(' ') || 'Untitled';
    }
    
    return content.substring(0, 50) || 'Untitled';
  }

  /**
   * Helper: Calculate overall confidence
   */
  calculateOverallConfidence(results) {
    if (results.length === 0) return 0;
    
    const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
    const intelligenceBoost = results.filter(r => r.intelligenceApplied).length / results.length * 0.2;
    
    return Math.min(1, avgSimilarity + intelligenceBoost);
  }

  /**
   * Helper: Log search for continuous learning
   */
  async logSearchForLearning(query, userId, results, responseTime) {
    try {
      // This will be picked up by your continuous learning system
      const searchLog = {
        query,
        userId,
        totalResults: results.totalResults,
        responseTime,
        learningApplied: results.metadata.learningApplied,
        truthsApplied: results.metadata.truthsApplied,
        confidence: results.metadata.confidence,
        timestamp: new Date().toISOString()
      };

      logger.info(`📊 Search logged for learning: ${JSON.stringify(searchLog)}`);
      
      // Store this in your main database for future truth extraction
      // The continuous discovery system will pick this up automatically
      
    } catch (error) {
      logger.warn('Failed to log search for learning:', error);
    }
  }
}

module.exports = IntelligentSearchService;
