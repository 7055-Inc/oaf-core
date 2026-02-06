/**
 * Leo AI Module
 * 
 * AI-powered search, recommendations, and discovery for the Brakebee platform
 * 
 * Features:
 * - Intelligent search with classification filters
 * - User preference-based personalization
 * - TikTok-style discover feed
 * - Vector database (ChromaDB) integration
 * 
 * Endpoints:
 * - POST /api/v2/leo/search - Main search
 * - POST /api/v2/leo/recommendations - Personalized recommendations
 * - POST /api/v2/leo/discover - Endless feed
 * - GET /api/v2/leo/health - Health check
 * - GET /api/v2/leo/stats - Collection statistics
 */

const router = require('./routes');
const services = require('./services');

module.exports = {
  router,
  ...services
};
