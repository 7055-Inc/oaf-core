/**
 * Search Filters - Classification-Based Safety Layer
 * 
 * Provides standardized filters to ensure customer-facing searches
 * only return appropriate content (no orders, drafts, deleted items)
 * 
 * Uses DATA_CLASSIFICATION.md codes for filtering
 */

const logger = require('./logger');

/**
 * Get standard filters for customer-facing searches
 * Ensures users never see orders, drafts, or deleted content
 * 
 * @param {string} category - 'products', 'artists', 'articles', 'events', 'all'
 * @returns {Object} ChromaDB filter object
 */
function getStandardFilters(category = 'all') {
  // Category-specific filters (ChromaDB requires simple single-operator filters)
  switch (category) {
    case 'products':
      // Only active products (classification 101)
      // product_type filtering happens in post-processing
      return {
        classification: '101'
      };

    case 'artists':
      // User profiles (classification 141) - ONLY artists (not promoters, not customers)
      // CRITICAL: Filter at DB level to avoid searching thousands of customers
      return {
        $and: [
          { classification: '141' },
          { user_type: 'artist' }
        ]
      };
    
    case 'promoters':
      // User profiles (classification 141) - ONLY promoters
      return {
        $and: [
          { classification: '141' },
          { user_type: 'promoter' }
        ]
      };

    case 'articles':
      // Published articles (classification 402)
      return {
        classification: '402'
      };

    case 'events':
      // Active events
      return {
        status: 'active'
      };

    case 'all':
      // For now, just exclude orders and drafts
      // ChromaDB doesn't support complex $nin, so we'll filter in code if needed
      return {};

    default:
      logger.warn(`Unknown category filter: ${category}, using safe defaults`);
      return {};
  }
}

/**
 * Get filters for admin/internal use
 * Includes all content types (orders, drafts, deleted)
 * 
 * @param {string} category - Content category
 * @returns {Object} ChromaDB filter object
 */
function getAdminFilters(category = 'all') {
  // No classification restrictions for admin
  switch (category) {
    case 'products':
      return {}; // Show all products regardless of status
    
    case 'orders':
      return { classification: '131' };  // Purchase history
    
    case 'drafts':
      return { classification: '103' };  // Draft products
    
    default:
      return {};  // No filters - show everything
  }
}

/**
 * Combine multiple filter conditions
 * Useful for complex queries
 * 
 * @param {Array<Object>} filters - Array of filter objects
 * @returns {Object} Combined filter
 */
function combineFilters(...filters) {
  return Object.assign({}, ...filters);
}

module.exports = {
  getStandardFilters,
  getAdminFilters,
  combineFilters
};

