/**
 * Search Service V2 - Classification-Based Intelligent Search
 * 
 * Fast, personalized search using:
 * - Classification filters (never show orders, drafts, deleted)
 * - User preferences (classification 141)
 * - Boost scoring (personalization math)
 * - Global trends (fallback for anonymous users)
 * 
 * NO LLM NEEDED - ~70ms response time!
 */

const logger = require('./logger');
const { getStandardFilters } = require('./utils/searchFilters');
const { getUserPreferences } = require('./utils/userPreferences');
const { scoreAndSort } = require('./utils/boostScoring');

class SearchService {
  constructor(vectorDB = null) {
    this.vectorDB = vectorDB;
    this.isInitialized = false;
  }

  async initialize(vectorDB = null) {
    try {
      logger.info('Initializing intelligent search service...');
      
      if (vectorDB) this.vectorDB = vectorDB;
      
      if (!this.vectorDB) {
        throw new Error('SearchService requires vectorDB instance');
      }
      
      if (!this.vectorDB.isInitialized) {
        await this.vectorDB.initialize();
      }
      
      this.isInitialized = true;
      logger.info('Search service initialized successfully');
      return { success: true };
    } catch (error) {
      logger.error('Failed to initialize search service:', error);
      throw error;
    }
  }

  /**
   * Main intelligent search entry point
   */
  async search(query, context = {}) {
    const startTime = Date.now();
    
    try {
      if (!this.isInitialized) await this.initialize();

      const {
        userId = 'anonymous',
        categories = ['products', 'artists', 'articles', 'events'],
        limit = 20,
        page = 1,
        sort = 'relevance'
      } = context;

      logger.info(`Search: "${query}" (user: ${userId}, categories: ${categories.join(',')})`);

      // Step 1: Load user preferences
      const userPrefs = await getUserPreferences(userId, this.vectorDB);

      // Step 2: Search each requested category
      const categoryResults = await Promise.all(
        categories.map(category => this.searchCategory(query, category, userPrefs, limit))
      );

      // Step 3: Organize results by category
      const organizedResults = this.organizeResults(categoryResults, categories);

      // Step 4: Calculate response metadata
      const responseTime = Date.now() - startTime;
      const totalResults = Object.values(organizedResults).reduce(
        (sum, arr) => sum + arr.length, 0
      );

      logger.info(`Search complete: ${totalResults} results in ${responseTime}ms`);

      return {
        success: true,
        results: organizedResults,
        metadata: {
          query,
          userId,
          response_time_ms: responseTime,
          total_results: totalResults,
          personalization_applied: userId !== 'anonymous',
          confidence: userPrefs.confidence,
          preferences_source: userPrefs.data_source
        }
      };

    } catch (error) {
      logger.error('Search failed:', error);
      return {
        success: false,
        error: error.message,
        results: {
          products: [],
          artists: [],
          articles: [],
          events: []
        }
      };
    }
  }

  /**
   * Search a specific category with filters and personalization
   */
  async searchCategory(query, category, userPrefs, limit) {
    try {
      const filters = getStandardFilters(category);
      
      const collectionMap = {
        products: 'art_metadata',
        artists: 'user_profiles',
        promoters: 'user_profiles',
        articles: 'site_content',
        events: 'event_data'
      };
      
      const collection = collectionMap[category] || 'art_metadata';
      
      let results = await this.vectorDB.semanticSearch(query, collection, {
        limit: limit * 2,
        filter: filters
      });
      
      // Filter out variations for products
      if (category === 'products') {
        results = results.filter(r => 
          r.metadata?.product_type === 'simple' || 
          r.metadata?.product_type === 'variable'
        );
      }
      
      if (results.length === 0) {
        return { category, results: [] };
      }
      
      // Apply personalization boosts
      const scoredResults = scoreAndSort(results, userPrefs);
      const topResults = scoredResults.slice(0, limit);
      
      const cleanResults = topResults.map(result => ({
        id: this.extractId(result, category),
        relevance: result.scoring?.final_score || result.similarity,
        personalized: result.scoring?.personalized || false,
        boost_details: result.scoring?.boost_details || {},
        metadata: {
          name: result.metadata?.name || result.metadata?.title || result.metadata?.username,
          price: result.metadata?.price,
          status: result.metadata?.status,
          classification: result.metadata?.classification
        }
      }));
      
      return { category, results: cleanResults };
      
    } catch (error) {
      logger.error(`Failed to search category ${category}:`, error);
      return { category, results: [] };
    }
  }

  extractId(result, category) {
    const meta = result.metadata;
    
    switch (category) {
      case 'products':
        return meta.product_id || meta.id || result.id.replace('product_', '');
      case 'artists':
      case 'promoters':
        return meta.user_id || meta.id || result.id.replace('user_', '');
      case 'articles':
        return meta.article_id || meta.id || result.id;
      case 'events':
        return meta.event_id || meta.id || result.id;
      default:
        return result.id;
    }
  }

  organizeResults(categoryResults, requestedCategories) {
    const organized = {
      products: [],
      artists: [],
      promoters: [],
      articles: [],
      events: []
    };
    
    categoryResults.forEach(({ category, results }) => {
      if (requestedCategories.includes(category)) {
        organized[category] = results;
      }
    });
    
    return organized;
  }

  /**
   * Get recommendations (no search query - just personalized feed)
   */
  async getRecommendations(context = {}) {
    const {
      userId = 'anonymous',
      limit = 20,
      category = 'products'
    } = context;
    
    logger.info(`Recommendations for user ${userId}, category: ${category}`);
    
    const query = category === 'products' 
      ? 'featured art products artwork quality'
      : `featured ${category}`;
    
    return this.search(query, {
      userId,
      categories: [category],
      limit
    });
  }

  /**
   * Discover feed (TikTok-style endless personalized content)
   */
  async getDiscoverFeed(context = {}) {
    const {
      userId = 'anonymous',
      offset = 0,
      limit = 20
    } = context;
    
    logger.info(`Discover feed for user ${userId}, offset: ${offset}`);
    
    try {
      const userPrefs = await getUserPreferences(userId, this.vectorDB);
      const filters = getStandardFilters('products');
      
      const results = await this.vectorDB.semanticSearch(
        'art products artwork creative', 
        'art_metadata',
        {
          limit: 100,
          filter: filters
        }
      );
      
      const scored = scoreAndSort(results, userPrefs);
      
      const feed = scored.slice(offset, offset + limit).map(result => ({
        id: this.extractId(result, 'products'),
        score: result.scoring?.final_score,
        personalized: result.scoring?.personalized,
        metadata: result.metadata
      }));
      
      return {
        success: true,
        feed,
        next_offset: offset + limit,
        has_more: scored.length > (offset + limit)
      };
      
    } catch (error) {
      logger.error('Discover feed failed:', error);
      return {
        success: false,
        feed: [],
        error: error.message
      };
    }
  }
}

module.exports = SearchService;
