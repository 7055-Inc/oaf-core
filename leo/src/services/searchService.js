const logger = require('../utils/logger');

class SearchService {
  constructor(mainDB = null, truthDB = null) {
    // Receive database instances from Central Brain - no direct connections
    this.mainDB = mainDB;
    this.truthDB = truthDB;
    this.isInitialized = false;
  }

  async initialize(mainDB = null, truthDB = null) {
    try {
      logger.info('🔍 [SEARCH-SERVICE] Initializing search service...');
      
      // Accept database instances from Central Brain
      if (mainDB) this.mainDB = mainDB;
      if (truthDB) this.truthDB = truthDB;
      
      if (!this.mainDB || !this.truthDB) {
        throw new Error('SearchService requires mainDB and truthDB instances from Central Brain');
      }
      
      this.isInitialized = true;
      logger.info('✅ Search service initialized successfully (using Central Brain databases)');
      return { success: true };
    } catch (error) {
      logger.error('❌ Failed to initialize search service:', error);
      throw error;
    }
  }

  /**
   * Query Llama via HTTP API
   */
  async queryLlama(prompt, max_tokens = 1000) {
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.2',
          prompt: prompt,
          stream: false,
          options: { temperature: 0.3, top_p: 0.9, num_predict: max_tokens }
        })
      });

      if (!response.ok) {
        logger.error(`Ollama API request failed: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      const cleanResponse = data.response?.replace(/[^\x20-\x7E\n]/g, '').trim();
      const jsonMatch = cleanResponse?.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      } else {
        logger.warn('No valid JSON found in Llama response:', cleanResponse.substring(0, 200));
        return null;
      }
    } catch (error) {
      logger.error('Failed to query Llama via HTTP API:', error);
      return null;
    }
  }

  /**
   * Perform main vector search across specified collections
   */
  async performMainVectorSearch(query, collections, limit) {
    try {
      if (!this.isInitialized) await this.initialize();

      const searchPromises = collections.map(collectionName => {
        const options = { limit: Math.ceil(limit / collections.length) };
        
        // Filter for active products when searching art_metadata collection
        if (collectionName === 'art_metadata') {
          options.filter = { status: 'active' };
        }
        
        return this.mainDB.semanticSearch(query, collectionName, options);
      });

      const searchResults = await Promise.all(searchPromises);
      const allResults = searchResults.flat();

      // Basic deduplication
      const uniqueResults = this.deduplicateResults(allResults);

      // Sort by similarity score
      uniqueResults.sort((a, b) => b.similarity - a.similarity);

      logger.info(`📊 Vector search found ${uniqueResults.length} unique results across ${collections.length} collections`);
      return uniqueResults.slice(0, limit);
    } catch (error) {
      logger.error('Main vector search failed in SearchService:', error);
      return [];
    }
  }

  /**
   * Get relevant truths for personalization
   */
  async getRelevantTruths(query, userId) {
    try {
      const truthSearches = [
        this.truthDB.searchTruths(`user ${userId} preferences behavior`, 'user_truths', { limit: 5 }),
        this.truthDB.searchTruths(`${query} content patterns`, 'content_truths', { limit: 5 }),
        this.truthDB.searchTruths('behavioral patterns', 'behavioral_truths', { limit: 3 })
      ];

      const truthResults = await Promise.all(truthSearches);
      const allTruths = truthResults.flat();

      const relevantTruths = allTruths.filter(truth =>
        truth.confidence >= 0.4 && truth.similarity >= 0.3
      );

      logger.info(`🧠 Found ${relevantTruths.length} relevant truths for search enhancement`);
      return relevantTruths;
    } catch (error) {
      logger.warn('Failed to get relevant truths in SearchService:', error);
      return [];
    }
  }

  /**
   * Apply truth-based intelligence to reorder results
   */
  async applyTruthIntelligence(mainResults, relevantTruths, query, userId) {
    try {
      if (relevantTruths.length === 0) {
        return mainResults.map(result => ({ ...result, intelligenceApplied: false, truthsUsed: [] }));
      }

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
        const reorderedResults = this.applyReordering(mainResults, llamaResponse);
        return reorderedResults.map(result => ({
          ...result,
          intelligenceApplied: true,
          truthsUsed: llamaResponse.truths_applied || [],
          intelligenceConfidence: llamaResponse.confidence || 0.5,
          reorderingReason: llamaResponse.reordering_strategy
        }));
      }

      return this.applySimpleTruthScoring(mainResults, relevantTruths);
    } catch (error) {
      logger.warn('Failed to apply truth intelligence in SearchService:', error);
      return mainResults.map(result => ({ ...result, intelligenceApplied: false, truthsUsed: [] }));
    }
  }

  /**
   * Main entry point for sitewide search from Central Brain
   */
  async handleSitewideSearch(query, context = {}) {
    try {
      if (!this.isInitialized) await this.initialize();

      const { userId = 'anonymous', displayMode = 'modal', limit = 20, categories = ['products', 'artists', 'articles', 'events'] } = context;

      logger.info(`🔍 [SEARCH-SERVICE] Handling sitewide search: "${query}" (user: ${userId}, mode: ${displayMode})`);

      // SIMPLIFIED VERSION - Skip Llama for now, use direct vector search
      const collectionsToSearch = ['art_metadata', 'site_content', 'event_data', 'user_interactions'];
      
      // Perform main vector search
      const rawResults = await this.performMainVectorSearch(query, collectionsToSearch, limit * 2);

      // Simple organization without Llama
      const organizedResults = this.fallbackOrganization(rawResults, categories, displayMode, limit);

      // Check if we have insufficient product results and need fallback
      const productResults = organizedResults.organized_results.products || [];
      const requestedProducts = categories.includes('products');
      
      if (Object.values(organizedResults.organized_results).every(arr => arr.length === 0)) {
        logger.warn('No results found, falling back to random sampling.');
        return await this.generateRandomSampling(limit, categories);
      } else if (requestedProducts && productResults.length < Math.min(limit, 5)) {
        logger.warn(`Insufficient products found (${productResults.length}), enhancing with random sampling.`);
        const fallbackResults = await this.generateRandomSampling(limit - productResults.length, ['products']);
        
        // Merge existing results with fallback, avoiding duplicates
        const existingIds = new Set(productResults.map(p => p.id));
        const additionalProducts = fallbackResults.organized_results.products.filter(p => !existingIds.has(p.id));
        
        organizedResults.organized_results.products = [...productResults, ...additionalProducts];
        organizedResults.organization_reasoning += ' + enhanced with random active products';
      }

      return {
        organized_results: organizedResults.organized_results,
        intelligence_applied: false,
        truths_used: [],
        confidence: 0.7,
        organization_reasoning: 'Direct vector search without Llama processing (simplified mode)'
      };

    } catch (error) {
      logger.error('Failed to handle sitewide search:', error);
      // Fallback to random sampling if search fails
      return await this.generateRandomSampling(limit, context.categories || ['products', 'artists', 'articles', 'events']);
    }
  }

  /**
   * Generate a search plan with Llama
   */
  async generateSearchPlanWithLlama(query, userId, categories, displayMode) {
    const prompt = `You are Leo AI's search planning assistant. Given a user query and context, create an optimal search plan.

USER QUERY: "${query}"
USER ID: ${userId}
AVAILABLE CATEGORIES: ${JSON.stringify(categories)}
DISPLAY MODE: ${displayMode} (e.g., 'modal' for quick preview, 'full_page' for comprehensive results)

INSTRUCTIONS:
1. Refine the query for semantic search.
2. Select the most relevant collections to search from: 'art_metadata', 'site_content', 'event_data', 'user_interactions'.
3. Determine if personalization and truth application are appropriate.
4. Suggest a result limit for the initial vector search.

RESPOND WITH VALID JSON:
{
  "optimized_query": "refined search query",
  "collections_to_search": ["art_metadata", "site_content"],
  "personalization_needed": true/false,
  "truth_application_needed": true/false,
  "initial_limit_multiplier": 2,
  "reasoning": "Explanation of the search plan"
}`;
    const llamaResponse = await this.queryLlama(prompt);
    if (llamaResponse && llamaResponse.optimized_query) {
      logger.info(`🧠 Search plan generated: ${llamaResponse.reasoning}`);
      return llamaResponse;
    }
    return {
      optimized_query: query,
      collections_to_search: ['art_metadata', 'site_content', 'event_data', 'user_interactions'],
      personalization_needed: true,
      truth_application_needed: true,
      initial_limit_multiplier: 2,
      reasoning: 'Fallback search plan'
    };
  }

  /**
   * Organize search results with Llama
   */
  async organizeSearchResultsWithLlama(intelligentResults, searchPlan, context) {
    const { displayMode = 'modal', limit = 20, categories = ['products', 'artists', 'articles', 'events'] } = context;
    const prompt = `You are Leo AI's result organization assistant. Organize the provided intelligent search results based on the search plan and display mode.

SEARCH PLAN: ${JSON.stringify(searchPlan, null, 2)}
INTELLIGENT RESULTS (first 20):
${JSON.stringify(intelligentResults.slice(0, 20).map(r => ({
  id: r.id,
  content: r.content?.substring(0, 100),
  metadata: r.metadata,
  relevance: r.similarity,
  collection: r.collection,
  intelligenceApplied: r.intelligenceApplied
})), null, 2)}

DISPLAY MODE: ${displayMode} (e.g., 'modal' for quick preview, 'full_page' for comprehensive results)
REQUESTED CATEGORIES: ${JSON.stringify(categories)}

INSTRUCTIONS:
1. Categorize results into 'products', 'artists', 'articles', 'events', 'other'.
2. For 'modal' display mode, prioritize and limit results per category (e.g., max 5 products, 5 artists, 3 articles, 2 events).
3. For 'full_page' display mode, provide more results per category (e.g., max 20 per category).
4. Extract clean IDs for each item.
5. Provide a reason for each item's inclusion and its relevance score.

RESPOND WITH VALID JSON:
{
  "organized_results": {
    "products": [{"id": "product_id", "relevance": 0.9, "reason": "why this product"}],
    "artists": [{"id": "artist_id", "relevance": 0.8, "reason": "why this artist"}],
    "articles": [{"id": "article_id", "relevance": 0.7, "reason": "why this article"}],
    "events": [{"id": "event_id", "relevance": 0.6, "reason": "why this event"}],
    "other": [{"id": "other_id", "relevance": 0.5, "reason": "miscellaneous item"}]
  },
  "intelligence_applied": true/false,
  "truths_used": ["list of truth patterns that influenced this organization"],
  "confidence": 0.1-1.0,
  "organization_reasoning": "How and why results were organized this way"
}`;
    const llamaResponse = await this.queryLlama(prompt, 1500); // Increased max_tokens for potentially larger output
    if (llamaResponse && llamaResponse.organized_results) {
      logger.info(`🧠 Results organized by Llama: ${llamaResponse.organization_reasoning}`);
      // Apply display mode specific limits
      if (displayMode === 'modal') {
        const modalLimits = { products: 5, artists: 5, articles: 3, events: 2 };
        for (const cat of Object.keys(llamaResponse.organized_results)) {
          llamaResponse.organized_results[cat] = llamaResponse.organized_results[cat].slice(0, modalLimits[cat] || 0);
        }
      } else if (displayMode === 'full_page') {
        const fullPageLimits = { products: 20, artists: 20, articles: 10, events: 10 };
        for (const cat of Object.keys(llamaResponse.organized_results)) {
          llamaResponse.organized_results[cat] = llamaResponse.organized_results[cat].slice(0, fullPageLimits[cat] || 0);
        }
      }
      return llamaResponse;
    }
    return this.fallbackOrganization(intelligentResults, categories, displayMode, limit);
  }

  /**
   * Fallback organization when Llama fails
   */
  fallbackOrganization(intelligentResults, categories, displayMode, limit) {
    const organized = {
      products: [],
      artists: [],
      articles: [],
      events: [],
      other: []
    };

    intelligentResults.forEach(result => {
      const id = result.metadata?.original_id || result.metadata?.product_id || result.id;
      const relevance = result.similarity || 0.5;
      const reason = result.intelligenceApplied ? 'AI enhanced match' : 'Vector similarity match';

      // Simple categorization based on collection and metadata
      if (result.collection === 'art_metadata' || result.metadata?.source_table === 'products' || result.metadata?.type === 'artwork') {
        if (categories.includes('products')) organized.products.push({ id, relevance, reason });
      } else if (result.collection === 'site_content' || result.metadata?.source_table === 'articles' || result.metadata?.type === 'site_content') {
        if (categories.includes('articles')) organized.articles.push({ id, relevance, reason });
      } else if (result.collection === 'event_data' || result.metadata?.source_table === 'events' || result.metadata?.type === 'event') {
        if (categories.includes('events')) organized.events.push({ id, relevance, reason });
      } else if (result.collection === 'user_interactions' || result.metadata?.source_table === 'users' || result.metadata?.type === 'user_interaction') {
        if (categories.includes('artists')) organized.artists.push({ id, relevance, reason });
      } else {
        organized.other.push({ id, relevance, reason });
      }
    });

    // Apply display mode specific limits for fallback
    if (displayMode === 'modal') {
      const modalLimits = { products: 5, artists: 5, articles: 3, events: 2 };
      for (const cat of Object.keys(organized)) {
        organized[cat] = organized[cat].slice(0, modalLimits[cat] || 0);
      }
    } else if (displayMode === 'full_page') {
      const fullPageLimits = { products: 20, artists: 20, articles: 10, events: 10 };
      for (const cat of Object.keys(organized)) {
        organized[cat] = organized[cat].slice(0, fullPageLimits[cat] || 0);
      }
    }

    return {
      organized_results: organized,
      intelligence_applied: false,
      truths_used: [],
      confidence: 0.3,
      organization_reasoning: 'Fallback organization by collection type due to Llama failure'
    };
  }

  /**
   * Generate random sampling of products from Leo's vector database
   */
  async generateRandomSampling(limit, categories) {
    try {
      logger.info(`🎲 [RANDOM-SAMPLING] Generating random product sampling (limit: ${limit})`);

      const randomQueries = {
        products: 'products artwork featured quality',
        artists: 'featured artists popular creators',
        articles: 'trending art articles blog posts',
        events: 'upcoming art events festivals'
      };

      const searchPromises = categories.map(category => {
        const query = randomQueries[category] || 'general content';
        const collectionMap = {
          products: 'art_metadata',
          artists: 'user_interactions', // Assuming artists are in user_interactions or a dedicated artist collection
          articles: 'site_content',
          events: 'event_data'
        };
        const collection = collectionMap[category] || 'site_content';
        return this.performMainVectorSearch(
          query,
          [collection],
          Math.ceil(limit * 6) // Increased multiplier to ensure enough active products
        );
      });

      const searchResults = await Promise.all(searchPromises);
      const allResults = searchResults.flat();

      // Shuffle and take the requested amount
      const shuffled = allResults.sort(() => Math.random() - 0.5);
      const selectedResults = shuffled.slice(0, limit * 2); // Get more to ensure enough for categories

      // Organize into categories for random sampling
      const organized = {
        products: [],
        artists: [],
        articles: [],
        events: [],
        other: []
      };

      selectedResults.forEach(result => {
        const id = result.metadata?.original_id || result.metadata?.product_id || result.id;
        const relevance = result.similarity || 0.5;
        const reason = 'Randomly selected from vector database';

        if (result.collection === 'art_metadata' || result.metadata?.source_table === 'products' || result.metadata?.type === 'artwork') {
          if (organized.products.length < 5) organized.products.push({ id, relevance, reason });
        } else if (result.collection === 'site_content' || result.metadata?.source_table === 'articles' || result.metadata?.type === 'site_content') {
          if (organized.articles.length < 5) organized.articles.push({ id, relevance, reason });
        } else if (result.collection === 'event_data' || result.metadata?.source_table === 'events' || result.metadata?.type === 'event') {
          if (organized.events.length < 3) organized.events.push({ id, relevance, reason });
        } else if (result.collection === 'user_interactions' || result.metadata?.source_table === 'users' || result.metadata?.type === 'user_interaction') {
          if (organized.artists.length < 2) organized.artists.push({ id, relevance, reason });
        } else {
          if (organized.other.length < 1) organized.other.push({ id, relevance, reason });
        }
      });

      return {
        organized_results: organized,
        intelligence_applied: false,
        truths_used: [],
        confidence: 0.2,
        organization_reasoning: 'Random sampling due to intelligent recommendation failure'
      };

    } catch (error) {
      logger.error('Failed to generate random sampling:', error);
      throw error;
    }
  }

  /**
   * Helper: Deduplicate search results
   */
  deduplicateResults(results) {
    const seen = new Set();
    return results.filter(result => {
      const key = result.id || result.metadata?.original_id || result.metadata?.product_id || result.content?.substring(0, 50) || Math.random();
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

    const changes = [
      ...(reorderingInstructions.promoted_results || []),
      ...(reorderingInstructions.demoted_results || [])
    ];

    changes.forEach(change => {
      const originalIndex = change.original_rank - 1;
      const newIndex = change.new_rank - 1;

      if (originalIndex >= 0 && originalIndex < reordered.length &&
        newIndex >= 0 && newIndex < reordered.length) {
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
}

module.exports = SearchService;
