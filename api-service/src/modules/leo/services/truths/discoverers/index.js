/**
 * Truth Discoverers Index
 * 
 * Export all discoverer modules
 */

const ProductSimilarityDiscoverer = require('./ProductSimilarityDiscoverer');
const UserSimilarityDiscoverer = require('./UserSimilarityDiscoverer');
const MetaPatternDiscoverer = require('./MetaPatternDiscoverer');

module.exports = {
  ProductSimilarityDiscoverer,
  UserSimilarityDiscoverer,
  MetaPatternDiscoverer
};
