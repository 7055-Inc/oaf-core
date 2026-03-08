/**
 * Catalog Services
 * Re-exports all catalog service modules
 */

module.exports = {
  productService: require('./product'),
  categoryService: require('./category'),
  collectionService: require('./collection'),
  importExportService: require('./importExport'),
  walmartService: require('./walmart'),
  wayfairService: require('./wayfair'),
  tiktokService: require('./tiktok'),
  etsyService: require('./etsy'),
  shopifyService: require('./shopify'),
  ebayService: require('./ebay'),
  amazonService: require('./amazon'),
  faireService: require('./faire'),
  metaService: require('./meta'),
  curationService: require('./curation'),
};
