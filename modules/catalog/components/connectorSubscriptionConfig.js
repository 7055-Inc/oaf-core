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
