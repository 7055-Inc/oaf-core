const db = require('../../config/db');

class SearchService {
  constructor() {
    this.defaultLimit = 20;
    this.maxLimit = 100;
  }

  /**
   * Main search function - searches across all categories
   */
  async search(query, options = {}) {
    const {
      category = 'all',
      limit = this.defaultLimit,
      offset = 0,
      sortBy = 'relevance',
      filters = {}
    } = options;

    const startTime = Date.now();
    
    try {
      console.log(`[SearchService] Starting search for query: "${query}", category: ${category}`);
      
      let results = {};
      
      if (category === 'all' || category === 'products') {
        try {
          results.products = await this.searchProducts(query, { limit, offset, filters });
          console.log(`[SearchService] Found ${results.products?.length || 0} products`);
        } catch (error) {
          console.error('[SearchService] Error searching products:', error.message);
          results.products = [];
        }
      }
      
      if (category === 'all' || category === 'artists') {
        try {
          results.artists = await this.searchArtists(query, { limit, offset, filters });
          console.log(`[SearchService] Found ${results.artists?.length || 0} artists`);
        } catch (error) {
          console.error('[SearchService] Error searching artists:', error.message);
          results.artists = [];
        }
      }
      
      if (category === 'all' || category === 'promoters') {
        try {
          results.promoters = await this.searchPromoters(query, { limit, offset, filters });
          console.log(`[SearchService] Found ${results.promoters?.length || 0} promoters`);
        } catch (error) {
          console.error('[SearchService] Error searching promoters:', error.message);
          results.promoters = [];
        }
      }

      const responseTime = Date.now() - startTime;
      const totalResults = Object.values(results).reduce((sum, arr) => sum + (arr?.length || 0), 0);
      
      console.log(`[SearchService] Search completed in ${responseTime}ms, total results: ${totalResults}`);
      
      return {
        query,
        results,
        metadata: {
          totalResults,
          responseTime,
          category,
          hasMore: totalResults === limit // Simple pagination indicator
        }
      };
    } catch (error) {
      console.error('[SearchService] Critical search error:', error);
      throw new Error('Search failed');
    }
  }

  /**
   * Search products with simple LIKE matching
   */
  async searchProducts(query, options = {}) {
    query = typeof query === 'string' ? query : '';
    let { limit = this.defaultLimit, offset = 0 } = options;
    limit = Number.isFinite(Number(limit)) ? Number(limit) : this.defaultLimit;
    offset = Number.isFinite(Number(offset)) ? Number(offset) : 0;
    try {
      const sql = `
        SELECT 
          p.id,
          p.name,
          p.description,
          p.price,
          p.vendor_id,
          p.status,
          p.created_at,
          c.name as category_name,
          u.username as vendor_name
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.vendor_id = u.id
        WHERE (p.name LIKE ? OR p.description LIKE ?) AND p.parent_id IS NULL
        ORDER BY p.created_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
      const params = [`%${query}%`, `%${query}%`];
      const [results] = await db.execute(sql, params);
      return results || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Search artists with profile information
   */
  async searchArtists(query, options = {}) {
    query = typeof query === 'string' ? query : '';
    let { limit = this.defaultLimit, offset = 0 } = options;
    limit = Number.isFinite(Number(limit)) ? Number(limit) : this.defaultLimit;
    offset = Number.isFinite(Number(offset)) ? Number(offset) : 0;
    try {
      const sql = `
        SELECT 
          u.id,
          u.username,
          u.user_type,
          u.status,
          u.created_at,
          ap.business_name,
          ap.artist_biography,
          ap.studio_city,
          ap.studio_state
        FROM users u
        LEFT JOIN artist_profiles ap ON u.id = ap.user_id
        WHERE u.user_type = 'artist' 
        AND u.status = 'active'
        AND ap.user_id IS NOT NULL
        AND (ap.business_name LIKE ? OR ap.artist_biography LIKE ?)
        ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
      const params = [`%${query}%`, `%${query}%`];
      const [results] = await db.execute(sql, params);
      return results || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Search promoters with profile information
   */
  async searchPromoters(query, options = {}) {
    query = typeof query === 'string' ? query : '';
    let { limit = this.defaultLimit, offset = 0 } = options;
    limit = Number.isFinite(Number(limit)) ? Number(limit) : this.defaultLimit;
    offset = Number.isFinite(Number(offset)) ? Number(offset) : 0;
    try {
      const sql = `
        SELECT 
          u.id,
          u.username,
          u.user_type,
          u.status,
          u.created_at,
          pp.business_name,
          pp.artwork_description,
          pp.office_city,
          pp.office_state
        FROM users u
        LEFT JOIN promoter_profiles pp ON u.id = pp.user_id
        WHERE u.user_type = 'promoter' 
        AND u.status = 'active'
        AND pp.user_id IS NOT NULL
        AND (pp.business_name LIKE ? OR pp.artwork_description LIKE ?)
        ORDER BY u.created_at DESC LIMIT ${limit} OFFSET ${offset}
      `;
      const params = [`%${query}%`, `%${query}%`];
      const [results] = await db.execute(sql, params);
      return results || [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get autocomplete suggestions
   */
  async getAutocompleteSuggestions(query, limit = 10) {
    if (query.length < 2) return [];

    try {
      console.log(`[SearchService] Getting autocomplete suggestions for: "${query}"`);
      
      const suggestions = [];
      const limitPerCategory = Math.max(1, Math.floor(limit / 3));
      
      // Get product name suggestions
      try {
        const [productSuggestions] = await db.execute(`
          SELECT DISTINCT name as suggestion, 'product' as type, COUNT(*) as frequency
          FROM products 
          WHERE status = 'active' AND name LIKE ? AND parent_id IS NULL
          GROUP BY name
          ORDER BY frequency DESC, name ASC
          LIMIT ?
        `, [`${query}%`, limitPerCategory]);
        
        suggestions.push(...(productSuggestions || []));
      } catch (error) {
        console.error('[SearchService] Error getting product suggestions:', error.message);
      }
      
      // Get artist business name suggestions
      try {
        const [artistSuggestions] = await db.execute(`
          SELECT DISTINCT ap.business_name as suggestion, 'artist' as type, COUNT(*) as frequency
          FROM artist_profiles ap
          JOIN users u ON ap.user_id = u.id
          WHERE u.status = 'active' AND ap.business_name LIKE ?
          GROUP BY ap.business_name
          ORDER BY frequency DESC, ap.business_name ASC
          LIMIT ?
        `, [`${query}%`, limitPerCategory]);
        
        suggestions.push(...(artistSuggestions || []));
      } catch (error) {
        console.error('[SearchService] Error getting artist suggestions:', error.message);
      }
      
      // Get promoter business name suggestions
      try {
        const [promoterSuggestions] = await db.execute(`
          SELECT DISTINCT pp.business_name as suggestion, 'promoter' as type, COUNT(*) as frequency
          FROM promoter_profiles pp
          JOIN users u ON pp.user_id = u.id
          WHERE u.status = 'active' AND pp.business_name LIKE ?
          GROUP BY pp.business_name
          ORDER BY frequency DESC, pp.business_name ASC
          LIMIT ?
        `, [`${query}%`, limitPerCategory]);
        
        suggestions.push(...(promoterSuggestions || []));
      } catch (error) {
        console.error('[SearchService] Error getting promoter suggestions:', error.message);
      }

      const finalSuggestions = suggestions.slice(0, limit);
      console.log(`[SearchService] Returning ${finalSuggestions.length} autocomplete suggestions`);
      
      return finalSuggestions;
    } catch (error) {
      console.error('[SearchService] Autocomplete error:', error.message);
      return [];
    }
  }

  /**
   * Get available filters for a category
   */
  async getAvailableFilters(category = 'all') {
    const filters = {};

    try {
      console.log(`[SearchService] Getting filters for category: ${category}`);

      if (category === 'all' || category === 'products') {
        try {
          // Get categories
          const [categories] = await db.execute(`
            SELECT id, name FROM categories ORDER BY name
          `);
          
          // Get price ranges
          const [priceRanges] = await db.execute(`
            SELECT 
              MIN(price) as min_price,
              MAX(price) as max_price,
              AVG(price) as avg_price
            FROM products WHERE status = 'active'
          `);
          
          filters.products = {
            categories: categories || [],
            priceRange: priceRanges?.[0] || { min_price: 0, max_price: 1000, avg_price: 100 }
          };
        } catch (error) {
          console.error('[SearchService] Error getting product filters:', error.message);
          filters.products = {
            categories: [],
            priceRange: { min_price: 0, max_price: 1000, avg_price: 100 }
          };
        }
      }

      if (category === 'all' || category === 'artists') {
        try {
          // Get unique locations
          const [locations] = await db.execute(`
            SELECT DISTINCT 
              CONCAT(studio_city, ', ', studio_state) as location
            FROM artist_profiles 
            WHERE studio_city IS NOT NULL AND studio_state IS NOT NULL
            ORDER BY location
          `);
          
          filters.artists = {
            locations: (locations || []).map(l => l.location),
            customWork: [
              { value: 'yes', label: 'Accepts Custom Work' },
              { value: 'no', label: 'No Custom Work' }
            ]
          };
        } catch (error) {
          console.error('[SearchService] Error getting artist filters:', error.message);
          filters.artists = {
            locations: [],
            customWork: [
              { value: 'yes', label: 'Accepts Custom Work' },
              { value: 'no', label: 'No Custom Work' }
            ]
          };
        }
      }

      if (category === 'all' || category === 'promoters') {
        try {
          // Get unique locations
          const [locations] = await db.execute(`
            SELECT DISTINCT 
              CONCAT(office_city, ', ', office_state) as location
            FROM promoter_profiles 
            WHERE office_city IS NOT NULL AND office_state IS NOT NULL
            ORDER BY location
          `);
          
          filters.promoters = {
            locations: (locations || []).map(l => l.location),
            organizationType: [
              { value: 'yes', label: 'Non-Profit' },
              { value: 'no', label: 'For-Profit' }
            ]
          };
        } catch (error) {
          console.error('[SearchService] Error getting promoter filters:', error.message);
          filters.promoters = {
            locations: [],
            organizationType: [
              { value: 'yes', label: 'Non-Profit' },
              { value: 'no', label: 'For-Profit' }
            ]
          };
        }
      }

      console.log(`[SearchService] Filters retrieved successfully`);
      return filters;
    } catch (error) {
      console.error('[SearchService] Error getting filters:', error.message);
      return {};
    }
  }

  /**
   * Get popular/trending searches
   */
  async getPopularSearches(limit = 10) {
    try {
      console.log(`[SearchService] Getting popular searches, limit: ${limit}`);
      
      const [results] = await db.execute(`
        SELECT 
          query_text,
          COUNT(*) as search_count,
          AVG(result_count) as avg_results
        FROM search_queries 
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND result_count > 0
        GROUP BY query_text
        ORDER BY search_count DESC, avg_results DESC
        LIMIT ?
      `, [limit]);
      
      console.log(`[SearchService] Found ${results?.length || 0} popular searches`);
      return results || [];
    } catch (error) {
      console.error('[SearchService] Error getting popular searches:', error.message);
      return [];
    }
  }

  /**
   * Test database connection and table existence
   */
  async testConnection() {
    try {
      console.log('[SearchService] Testing database connection...');
      
      // Test basic connection
      await db.execute('SELECT 1');
      console.log('[SearchService] Database connection successful');
      
      // Test if required tables exist
      const requiredTables = ['products', 'users', 'artist_profiles', 'promoter_profiles', 'categories', 'search_queries'];
      
      for (const table of requiredTables) {
        try {
          await db.execute(`SELECT COUNT(*) FROM ${table} LIMIT 1`);
          console.log(`[SearchService] Table ${table} exists and accessible`);
        } catch (error) {
          console.error(`[SearchService] Table ${table} not accessible:`, error.message);
        }
      }
      
      return true;
    } catch (error) {
      console.error('[SearchService] Database connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = new SearchService(); 