/**
 * Catalog Module
 * 
 * Handles product management including:
 * - Product CRUD operations
 * - Product listings (my products, all products)
 * - Inventory management
 * - Categories and collections
 * - Product curation (marketplace sorting)
 * - Addons: Walmart connector (v2 under /api/v2/catalog/walmart)
 * - Addons: TikTok connector (v2 under /api/v2/catalog/tiktok)
 */

const router = require('./routes');
const walmartRoutes = require('./routesWalmart');
const tiktokRoutes = require('./routesTiktok');
const curationRoutes = require('./routesCuration');
const services = require('./services');

router.use('/walmart', walmartRoutes);
router.use('/tiktok', tiktokRoutes);
router.use('/curation', curationRoutes);

module.exports = {
  router,
  ...services,
};
