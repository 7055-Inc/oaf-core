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
 * - Addons: Wayfair connector (v2 under /api/v2/catalog/wayfair)
 * - Addons: Etsy connector (v2 under /api/v2/catalog/etsy)
 */

const router = require('./routes');
const walmartRoutes = require('./routesWalmart');
const tiktokRoutes = require('./routesTiktok');
const wayfairRoutes = require('./routesWayfair');
const etsyRoutes = require('./routesEtsy');
const curationRoutes = require('./routesCuration');
const services = require('./services');

router.use('/walmart', walmartRoutes);
router.use('/tiktok', tiktokRoutes);
router.use('/wayfair', wayfairRoutes);
router.use('/etsy', etsyRoutes);
router.use('/curation', curationRoutes);

module.exports = {
  router,
  ...services,
};
