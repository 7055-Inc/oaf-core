/**
 * Truth Discoverers Index
 * 
 * Export all discoverer modules
 */

const ProductSimilarityDiscoverer = require('./ProductSimilarityDiscoverer');
const UserSimilarityDiscoverer = require('./UserSimilarityDiscoverer');
const MetaPatternDiscoverer = require('./MetaPatternDiscoverer');
const BehavioralPatternDiscoverer = require('./BehavioralPatternDiscoverer');
const EventPerformanceDiscoverer = require('./EventPerformanceDiscoverer');

module.exports = {
  ProductSimilarityDiscoverer,
  UserSimilarityDiscoverer,
  MetaPatternDiscoverer,
  BehavioralPatternDiscoverer,
  EventPerformanceDiscoverer
};
