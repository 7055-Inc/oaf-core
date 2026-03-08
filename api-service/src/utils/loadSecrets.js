/**
 * Secret Manager Bootstrap
 * 
 * Loads secrets from GCP Secret Manager and merges them into process.env.
 * Falls back to .env file when GCP is unavailable (local development).
 * 
 * Usage:
 *   const { loadSecrets } = require('./utils/loadSecrets');
 *   await loadSecrets({ envPath: path.join(__dirname, '../.env') });
 * 
 * The .env file is always loaded first for non-secret config (ports, URLs, etc.).
 * GCP secrets overlay on top, replacing any matching keys.
 */

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const dotenv = require('dotenv');
const path = require('path');

const GCP_PROJECT_ID = 'onlineartfestival-com';

const SECRET_KEYS = new Set([
  'DB_USER', 'DB_PASS', 'DB_ROOT_PASSWORD',
  'SOP_DB_USER', 'SOP_DB_PASS',
  'STAGING_DB_USER', 'STAGING_DB_PASSWORD', 'STAGING_DB_ROOT_PASSWORD',
  'JWT_SECRET', 'CSRF_SECRET', 'ENCRYPTION_KEY',
  'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY',
  'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_CONNECT_CLIENT_ID',
  'GOOGLE_MAPS_API_KEY',
  'USPS_CONSUMER_KEY', 'USPS_CONSUMER_SECRET', 'USPS_CRID',
  'UPS_CLIENT_ID', 'UPS_CLIENT_SECRET', 'UPS_ACCOUNT',
  'FEDEX_API_KEY', 'FEDEX_API_SECRET', 'FEDEX_ACCOUNT_NUMBER',
  'SMTP_USERNAME', 'SMTP_PASSWORD',
  'WALMART_SANDBOX_CLIENT_ID', 'WALMART_SANDBOX_CLIENT_SECRET',
  'WALMART_CLIENT_ID', 'WALMART_CLIENT_SECRET',
  'TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET',
  'WAYFAIR_CLIENT_ID', 'WAYFAIR_CLIENT_SECRET',
  'ETSY_API_KEY', 'ETSY_CLIENT_ID', 'ETSY_CLIENT_SECRET',
  'META_APP_ID', 'META_APP_SECRET',
  'TWITTER_CLIENT_ID', 'TWITTER_CLIENT_SECRET',
  'PINTEREST_APP_ID', 'PINTEREST_APP_SECRET',
  'GOOGLE_ADS_CLIENT_ID', 'GOOGLE_ADS_CLIENT_SECRET', 'GOOGLE_ADS_DEVELOPER_TOKEN',
  'BING_ADS_CLIENT_ID', 'BING_ADS_CLIENT_SECRET',
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'CANVA_API_KEY',
  'MEDIA_API_KEY', 'MAIN_API_KEY',
  'CLICKHOUSE_USER', 'CLICKHOUSE_PASSWORD',
  'ACTIVECAMPAIGN_API_KEY',
  'GOOGLE_CLIENT_ID',
]);

function getSecretName() {
  const instance = process.env.API_INSTANCE || 'staging';
  return `${instance}-env-secrets`;
}

async function fetchGCPSecrets() {
  const client = new SecretManagerServiceClient();
  const secretName = getSecretName();
  const name = `projects/${GCP_PROJECT_ID}/secrets/${secretName}/versions/latest`;

  const [version] = await client.accessSecretVersion({ name });
  const payload = version.payload.data.toString('utf8');
  return JSON.parse(payload);
}

/**
 * Load environment: .env first for config, then GCP secrets on top.
 * 
 * @param {Object} options
 * @param {string} options.envPath - Path to the .env file
 */
async function loadSecrets(options = {}) {
  const envPath = options.envPath || path.join(__dirname, '../../.env');

  dotenv.config({ path: envPath });

  try {
    const secrets = await fetchGCPSecrets();
    for (const [key, value] of Object.entries(secrets)) {
      if (value !== undefined && value !== null) {
        process.env[key] = String(value);
      }
    }
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      console.warn(`[loadSecrets] GCP Secret Manager unavailable (${err.message}). Using .env fallback.`);
    }
  }
}

module.exports = { loadSecrets, SECRET_KEYS, fetchGCPSecrets };
