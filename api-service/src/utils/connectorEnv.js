/**
 * Connector Environment Validation
 *
 * Validates required env vars are present at startup for each marketplace
 * connector. Missing vars produce a clear warning (not a hard crash) so
 * the app can still boot for connectors that ARE configured.
 *
 * Usage:
 *   const { validateConnectorEnv } = require('../../utils/connectorEnv');
 *   validateConnectorEnv('walmart');
 */

const CONNECTOR_ENV_SPECS = {
  walmart: {
    required: ['WALMART_ENV'],
    conditional: [
      { when: { WALMART_ENV: 'sandbox' }, vars: ['WALMART_SANDBOX_CLIENT_ID', 'WALMART_SANDBOX_CLIENT_SECRET'] },
      { when: { WALMART_ENV: 'production' }, vars: ['WALMART_CLIENT_ID', 'WALMART_CLIENT_SECRET'] }
    ]
  },
  wayfair: {
    required: ['WAYFAIR_ENV', 'WAYFAIR_CLIENT_ID', 'WAYFAIR_CLIENT_SECRET']
  },
  tiktok: {
    required: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET']
  },
  etsy: {
    required: ['ETSY_API_KEY', 'ETSY_CLIENT_ID', 'ETSY_CLIENT_SECRET', 'ETSY_CALLBACK_URL']
  },
  shopify: {
    required: ['SHOPIFY_API_KEY', 'SHOPIFY_API_SECRET', 'SHOPIFY_CALLBACK_URL', 'SHOPIFY_SCOPES']
  },
  ebay: {
    required: ['EBAY_CLIENT_ID', 'EBAY_CLIENT_SECRET', 'EBAY_RU_NAME', 'EBAY_CALLBACK_URL']
  },
  amazon: {
    required: ['AMAZON_CLIENT_ID', 'AMAZON_CLIENT_SECRET', 'AMAZON_CALLBACK_URL', 'AMAZON_SPAPI_REGION', 'AMAZON_MARKETPLACE_ID']
  },
  faire: {
    required: ['FAIRE_CLIENT_ID', 'FAIRE_CLIENT_SECRET', 'FAIRE_CALLBACK_URL']
  },
  meta: {
    required: ['META_APP_ID', 'META_APP_SECRET', 'META_CALLBACK_URL']
  }
};

function validateConnectorEnv(connectorName) {
  const spec = CONNECTOR_ENV_SPECS[connectorName];
  if (!spec) {
    console.warn(`[env-check] Unknown connector "${connectorName}", skipping validation`);
    return { valid: true, missing: [] };
  }

  const missing = [];

  for (const key of (spec.required || [])) {
    if (!process.env[key]) missing.push(key);
  }

  if (spec.conditional) {
    for (const rule of spec.conditional) {
      const matches = Object.entries(rule.when).every(([k, v]) => process.env[k] === v);
      if (matches) {
        for (const key of rule.vars) {
          if (!process.env[key]) missing.push(key);
        }
      }
    }
  }

  if (missing.length > 0) {
    console.warn(`[env-check] ${connectorName} connector: missing env vars: ${missing.join(', ')}`);
  }

  return { valid: missing.length === 0, missing };
}

function validateAllConnectors() {
  const results = {};
  for (const name of Object.keys(CONNECTOR_ENV_SPECS)) {
    results[name] = validateConnectorEnv(name);
  }
  return results;
}

module.exports = {
  validateConnectorEnv,
  validateAllConnectors,
  CONNECTOR_ENV_SPECS
};
