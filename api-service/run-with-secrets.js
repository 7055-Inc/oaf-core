#!/usr/bin/env node

/**
 * Generic wrapper that loads secrets from GCP Secret Manager before
 * running any Node.js script. Used by cron jobs and one-off scripts.
 * 
 * Usage:
 *   node api-service/run-with-secrets.js <script-path> [args...]
 * 
 * Example:
 *   node api-service/run-with-secrets.js api-service/cron/process-email-queue.js
 *   node api-service/run-with-secrets.js csv-workers/walmart-order-sync.js
 */

const path = require('path');
const { loadSecrets } = require('./src/utils/loadSecrets');

const scriptPath = process.argv[2];
if (!scriptPath) {
  console.error('Usage: node api-service/run-with-secrets.js <script-path> [args...]');
  process.exit(1);
}

const envPath = path.join(__dirname, '.env');

process.argv.splice(1, 1);

loadSecrets({ envPath })
  .then(() => {
    require(path.resolve(scriptPath));
  })
  .catch(err => {
    console.error('Failed to load secrets:', err.message);
    process.exit(1);
  });
