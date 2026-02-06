/**
 * Search Filters - Classification-Based Safety Layer
 * 
 * Provides standardized filters to ensure customer-facing searches
 * only return appropriate content (no orders, drafts, deleted items)
 * 
 * Uses DATA_CLASSIFICATION.md codes for filtering
 */

const logger = require('../logger');

/**
 * Get standard filters for customer-facing searches
 * Ensures users never see orders, drafts, or deleted content
 * 
 * @param {string} category - 'products', 'artists', 'articles', 'events', 'all'
 * @returns {Object} ChromaDB filter object
 */
function getStandardFilters(category = 'all') {
  switch (category) {
    case 'products':
      // Only active products (classification 101)
      return {
        classification: '101'
      };

    case 'artists':
      // User profiles (classification 141) - ONLY artists
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
    default:
      return {};
  }
}

/**
 * Get filters for admin/internal use
 * Includes all content types (orders, drafts, deleted)
 */
function getAdminFilters(category = 'all') {
  switch (category) {
    case 'products':
      return {}; // Show all products regardless of status
    case 'orders':
      return { classification: '131' };  // Purchase history
    case 'drafts':
      return { classification: '103' };  // Draft products
    default:
      return {};
  }
}

/**
 * Combine multiple filter conditions
 */
function combineFilters(...filters) {
  return Object.assign({}, ...filters);
}

module.exports = {
  getStandardFilters,
  getAdminFilters,
  combineFilters
};
