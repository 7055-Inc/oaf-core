/**
 * Connector Addon Subscription Configs
 * Factory function + per-connector presets for ChecklistController.
 * Each connector gets a single "tier" card showing its name, price, and features.
 */

export function getConnectorSubscriptionConfig(addonSlug, opts, dashboardComponent) {
  return {
    displayName: opts.displayName,
    subtitle: opts.subtitle,
    autoApprove: true,
    dashboardComponent,
    subscriptionApiBase: `api/v2/addons/connectors/${addonSlug}`,
    tiers: [{
      name: opts.addonName,
      description: opts.description,
      price: opts.monthlyPrice,
      priceDisplay: `$${opts.monthlyPrice}`,
      period: '/month',
      features: opts.features,
      buttonText: 'Subscribe Now'
    }]
  };
}

export const WALMART_CONNECTOR_OPTS = {
  addonName: 'Walmart Connector',
  displayName: 'Walmart Connector',
  subtitle: 'List your products on Walmart.com through Brakebee\'s seller account',
  description: 'Connect your catalog to Walmart Marketplace and manage product listings directly from your dashboard.',
  monthlyPrice: 25,
  features: [
    'List products on Walmart.com',
    'Sync inventory and pricing',
    'Manage listings from your dashboard',
    'Order fulfillment tracking',
    'Bulk product submission'
  ]
};

export const WAYFAIR_CONNECTOR_OPTS = {
  addonName: 'Wayfair Connector',
  displayName: 'Wayfair Connector',
  subtitle: 'List your products on Wayfair.com through Brakebee\'s supplier account',
  description: 'Connect your catalog to Wayfair and manage supplier product listings from your dashboard.',
  monthlyPrice: 25,
  features: [
    'List products on Wayfair.com',
    'Sync inventory and pricing',
    'Manage listings from your dashboard',
    'Supplier feed management',
    'Bulk product submission'
  ]
};

export const TIKTOK_CONNECTOR_OPTS = {
  addonName: 'TikTok Connector',
  displayName: 'TikTok Connector',
  subtitle: 'Connect your TikTok Shop and manage product listings',
  description: 'Connect your TikTok Shop account and list products directly from your Brakebee dashboard.',
  monthlyPrice: 9.99,
  features: [
    'Connect your TikTok Shop',
    'Sync products to TikTok',
    'Manage listings from your dashboard',
    'Order and fulfillment tracking',
    'Product performance insights'
  ]
};

export const ETSY_CONNECTOR_OPTS = {
  addonName: 'Etsy Connector',
  displayName: 'Etsy Connector',
  subtitle: 'Connect your Etsy shop and sync product listings',
  description: 'Link your Etsy shop to your Brakebee dashboard for product sync and order management.',
  monthlyPrice: 9.99,
  features: [
    'Connect your Etsy shop via OAuth',
    'Sync products to Etsy',
    'Manage listings from your dashboard',
    'Order and fulfillment tracking',
    'Inventory sync'
  ]
};

export const EBAY_CONNECTOR_OPTS = {
  addonName: 'eBay Connector',
  displayName: 'eBay Connector',
  subtitle: 'Connect your eBay seller account and list products',
  description: 'Link your eBay account to your Brakebee dashboard for product sync, inventory management, and order tracking.',
  monthlyPrice: 14.99,
  features: [
    'Connect your eBay seller account via OAuth',
    'Sync products via Inventory API',
    'Manage listings from your dashboard',
    'Order import and fulfillment tracking',
    'Inventory allocation and sync'
  ]
};

export const AMAZON_CONNECTOR_OPTS = {
  addonName: 'Amazon Connector',
  displayName: 'Amazon Connector',
  subtitle: 'Connect your Amazon Seller Central account and list products',
  description: 'Link your Amazon seller account to your Brakebee dashboard for product sync, inventory management, and order tracking via SP-API.',
  monthlyPrice: 19.99,
  features: [
    'Connect your Amazon Seller Central via OAuth',
    'Sync products via Listings API',
    'Manage listings from your dashboard',
    'Order import and fulfillment tracking',
    'Inventory allocation and sync'
  ]
};

export const FAIRE_CONNECTOR_OPTS = {
  addonName: 'Faire Connector',
  displayName: 'Faire Connector',
  subtitle: 'Connect your Faire brand and manage wholesale listings',
  description: 'Link your Faire brand to your Brakebee dashboard for wholesale product sync, order management, and inventory tracking.',
  monthlyPrice: 14.99,
  features: [
    'Connect your Faire brand via OAuth',
    'Sync products with wholesale pricing',
    'Manage listings from your dashboard',
    'Order import and shipment tracking',
    'Inventory allocation and sync'
  ]
};

export const META_CONNECTOR_OPTS = {
  addonName: 'Meta Connector',
  displayName: 'Meta / Facebook Connector',
  subtitle: 'Connect your Meta Commerce account and list products on Facebook & Instagram',
  description: 'Link your Meta Commerce account to your Brakebee dashboard for product sync, inventory management, and order tracking across Facebook and Instagram shops.',
  monthlyPrice: 14.99,
  features: [
    'Connect your Meta Commerce account via OAuth',
    'Sync products to Facebook & Instagram shops',
    'Manage listings from your dashboard',
    'Order import and fulfillment tracking',
    'Inventory allocation and sync'
  ]
};

export const SHOPIFY_CONNECTOR_OPTS = {
  addonName: 'Shopify Connector',
  displayName: 'Shopify Connector',
  subtitle: 'Connect your Shopify store and sync product listings',
  description: 'Link your Shopify store to your Brakebee dashboard for two-way product sync, inventory management, and order tracking.',
  monthlyPrice: 14.99,
  features: [
    'Connect your Shopify store via OAuth',
    'Two-way product sync',
    'Manage listings from your dashboard',
    'Order import and fulfillment tracking',
    'Inventory allocation and sync'
  ]
};
