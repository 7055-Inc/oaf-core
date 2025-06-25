const db = require('../../config/db');

class SearchAnalytics {
  /**
   * Log a search query
   */
  async logSearchQuery(data) {
    const {
      userId = null,
      queryText,
      categoryFilter = null,
      resultCount,
      sessionId,
      ipAddress,
      userAgent,
      responseTime
    } = data;

    try {
      const [result] = await db.execute(`
        INSERT INTO search_queries (
          user_id, query_text, category_filter, result_count, 
          session_id, ip_address, user_agent, response_time_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, queryText, categoryFilter, resultCount,
        sessionId, ipAddress, userAgent, responseTime
      ]);

      return result.insertId;
    } catch (error) {
      console.error('Error logging search query:', error);
      // Don't throw - analytics shouldn't break search functionality
      return null;
    }
  }

  /**
   * Log when a user clicks on a search result
   */
  async logResultClick(searchQueryId, resultId, resultType) {
    try {
      await db.execute(`
        UPDATE search_queries 
        SET clicked_result_id = ?, clicked_result_type = ?
        WHERE id = ?
      `, [resultId, resultType, searchQueryId]);

      return true;
    } catch (error) {
      console.error('Error logging result click:', error);
      return false;
    }
  }

  /**
   * Get search analytics dashboard data
   */
  async getSearchAnalytics(timeframe = '7d') {
    let dateFilter;
    switch (timeframe) {
      case '1d':
        dateFilter = 'DATE_SUB(NOW(), INTERVAL 1 DAY)';
        break;
      case '7d':
        dateFilter = 'DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case '30d':
        dateFilter = 'DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      default:
        dateFilter = 'DATE_SUB(NOW(), INTERVAL 7 DAY)';
    }

    try {
      // Total searches
      const [totalSearches] = await db.execute(`
        SELECT COUNT(*) as total_searches
        FROM search_queries 
        WHERE created_at >= ${dateFilter}
      `);

      // Average response time
      const [avgResponseTime] = await db.execute(`
        SELECT AVG(response_time_ms) as avg_response_time
        FROM search_queries 
        WHERE created_at >= ${dateFilter}
        AND response_time_ms IS NOT NULL
      `);

      // Zero result queries
      const [zeroResults] = await db.execute(`
        SELECT COUNT(*) as zero_result_count
        FROM search_queries 
        WHERE created_at >= ${dateFilter}
        AND result_count = 0
      `);

      // Click-through rate
      const [clickThrough] = await db.execute(`
        SELECT 
          COUNT(*) as total_with_results,
          SUM(CASE WHEN clicked_result_id IS NOT NULL THEN 1 ELSE 0 END) as clicked_results
        FROM search_queries 
        WHERE created_at >= ${dateFilter}
        AND result_count > 0
      `);

      // Top search terms
      const [topSearches] = await db.execute(`
        SELECT 
          query_text,
          COUNT(*) as search_count,
          AVG(result_count) as avg_results,
          AVG(response_time_ms) as avg_response_time
        FROM search_queries 
        WHERE created_at >= ${dateFilter}
        GROUP BY query_text
        ORDER BY search_count DESC
        LIMIT 10
      `);

      // Search trends by day
      const [searchTrends] = await db.execute(`
        SELECT 
          DATE(created_at) as search_date,
          COUNT(*) as search_count,
          AVG(result_count) as avg_results,
          AVG(response_time_ms) as avg_response_time
        FROM search_queries 
        WHERE created_at >= ${dateFilter}
        GROUP BY DATE(created_at)
        ORDER BY search_date DESC
      `);

      // Category breakdown
      const [categoryBreakdown] = await db.execute(`
        SELECT 
          COALESCE(category_filter, 'all') as category,
          COUNT(*) as search_count,
          AVG(result_count) as avg_results
        FROM search_queries 
        WHERE created_at >= ${dateFilter}
        GROUP BY category_filter
        ORDER BY search_count DESC
      `);

      const totalSearchCount = totalSearches[0]?.total_searches || 0;
      const zeroResultCount = zeroResults[0]?.zero_result_count || 0;
      const clickData = clickThrough[0] || { total_with_results: 0, clicked_results: 0 };

      return {
        summary: {
          totalSearches: totalSearchCount,
          averageResponseTime: Math.round(avgResponseTime[0]?.avg_response_time || 0),
          zeroResultRate: totalSearchCount > 0 ? ((zeroResultCount / totalSearchCount) * 100).toFixed(1) : 0,
          clickThroughRate: clickData.total_with_results > 0 ? 
            ((clickData.clicked_results / clickData.total_with_results) * 100).toFixed(1) : 0
        },
        topSearches,
        searchTrends,
        categoryBreakdown,
        timeframe
      };
    } catch (error) {
      console.error('Error getting search analytics:', error);
      throw new Error('Failed to retrieve search analytics');
    }
  }

  /**
   * Get user search history
   */
  async getUserSearchHistory(userId, limit = 20) {
    try {
      const [history] = await db.execute(`
        SELECT 
          query_text,
          category_filter,
          result_count,
          clicked_result_type,
          created_at
        FROM search_queries 
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `, [userId, limit]);

      return history;
    } catch (error) {
      console.error('Error getting user search history:', error);
      return [];
    }
  }

  /**
   * Get search suggestions based on popular queries
   */
  async getSearchSuggestions(partialQuery, limit = 5) {
    if (!partialQuery || partialQuery.length < 2) return [];

    try {
      const [suggestions] = await db.execute(`
        SELECT 
          query_text,
          COUNT(*) as frequency,
          AVG(result_count) as avg_results
        FROM search_queries 
        WHERE query_text LIKE ?
        AND result_count > 0
        AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY query_text
        ORDER BY frequency DESC, avg_results DESC
        LIMIT ?
      `, [`${partialQuery}%`, limit]);

      return suggestions.map(s => ({
        suggestion: s.query_text,
        frequency: s.frequency,
        avgResults: Math.round(s.avg_results)
      }));
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  /**
   * Track search performance issues
   */
  async getPerformanceIssues(limit = 50) {
    try {
      // Slow queries (>1 second)
      const [slowQueries] = await db.execute(`
        SELECT 
          query_text,
          response_time_ms,
          result_count,
          created_at
        FROM search_queries 
        WHERE response_time_ms > 1000
        ORDER BY response_time_ms DESC
        LIMIT ?
      `, [limit]);

      // Queries with no results
      const [noResultQueries] = await db.execute(`
        SELECT 
          query_text,
          COUNT(*) as frequency,
          MAX(created_at) as last_searched
        FROM search_queries 
        WHERE result_count = 0
        AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY query_text
        ORDER BY frequency DESC
        LIMIT ?
      `, [limit]);

      return {
        slowQueries,
        noResultQueries
      };
    } catch (error) {
      console.error('Error getting performance issues:', error);
      return { slowQueries: [], noResultQueries: [] };
    }
  }

  /**
   * Clean up old search data (for maintenance)
   */
  async cleanupOldData(daysToKeep = 90) {
    try {
      const [result] = await db.execute(`
        DELETE FROM search_queries 
        WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
      `, [daysToKeep]);

      return {
        deletedRows: result.affectedRows,
        daysToKeep
      };
    } catch (error) {
      console.error('Error cleaning up search data:', error);
      throw new Error('Failed to cleanup old search data');
    }
  }
}

module.exports = new SearchAnalytics(); 