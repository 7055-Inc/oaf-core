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
 * - Addons: Shopify connector (v2 under /api/v2/catalog/shopify)
 * - Addons: eBay connector (v2 under /api/v2/catalog/ebay)
 * - Addons: Amazon connector (v2 under /api/v2/catalog/amazon)
 * - Addons: Faire connector (v2 under /api/v2/catalog/faire)
 */

const router = require('./routes');
const walmartRoutes = require('./routesWalmart');
const tiktokRoutes = require('./routesTiktok');
const wayfairRoutes = require('./routesWayfair');
const etsyRoutes = require('./routesEtsy');
const shopifyRoutes = require('./routesShopify');
const ebayRoutes = require('./routesEbay');
const amazonRoutes = require('./routesAmazon');
const faireRoutes = require('./routesFaire');
const metaRoutes = require('./routesMeta');
const curationRoutes = require('./routesCuration');
const services = require('./services');

router.use('/walmart', walmartRoutes);
router.use('/tiktok', tiktokRoutes);
router.use('/wayfair', wayfairRoutes);
router.use('/etsy', etsyRoutes);
router.use('/shopify', shopifyRoutes);
router.use('/ebay', ebayRoutes);
router.use('/amazon', amazonRoutes);
router.use('/faire', faireRoutes);
router.use('/meta', metaRoutes);
router.use('/curation', curationRoutes);

module.exports = {
  router,
  ...services,
};
