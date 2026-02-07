#!/usr/bin/env node
/**
 * Leo AI - Scheduled Ingestion Cron
 * 
 * Runs all data ingestions into ChromaDB:
 * - Users, Products, Orders, Events, Reviews, Articles, Behavior
 * 
 * Schedule: Every 6 hours (0 */6 * * *)
 * 
 * Usage: node leo-ingestion.js [--full]
 *   --full: Re-ingest all data (default: incremental, last 24 hours)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require('path');

// Add module paths
const modulePath = path.join(__dirname, '..', 'src', 'modules', 'leo', 'services');

async function runIngestions() {
  const startTime = Date.now();
  const full = process.argv.includes('--full');
  const lastRun = full 
    ? '1970-01-01 00:00:00'
    : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

  console.log(`[LEO CRON] Starting ingestion run (${full ? 'FULL' : 'incremental'})...`);
  console.log(`[LEO CRON] Last run threshold: ${lastRun}`);

  const results = {};
  const ingestions = [
    { name: 'users', getter: 'getUserIngestion' },
    { name: 'products', getter: 'getProductIngestion' },
    { name: 'orders', getter: 'getOrderIngestion' },
    { name: 'events', getter: 'getEventIngestion' },
    { name: 'reviews', getter: 'getReviewIngestion' },
    { name: 'articles', getter: 'getArticleIngestion' },
    { name: 'behavior', getter: 'getBehaviorIngestion' }
  ];

  // Import services
  const services = require(path.join(modulePath, 'ingestion'));

  for (const { name, getter } of ingestions) {
    try {
      console.log(`[LEO CRON] Running ${name} ingestion...`);
      const ingestion = services[getter]();
      await ingestion.initialize();
      const result = await ingestion.run(lastRun);
      results[name] = { success: true, stats: result.stats, duration: result.duration };
      console.log(`[LEO CRON] ${name} complete:`, result.stats?.total || 0, 'processed');
    } catch (error) {
      console.error(`[LEO CRON] ${name} failed:`, error.message);
      results[name] = { success: false, error: error.message };
    }
  }

  const totalDuration = Date.now() - startTime;
  console.log(`[LEO CRON] All ingestions complete in ${Math.round(totalDuration / 1000)}s`);
  console.log('[LEO CRON] Results:', JSON.stringify(results, null, 2));

  return results;
}

// Run if called directly
if (require.main === module) {
  runIngestions()
    .then(() => {
      console.log('[LEO CRON] Ingestion cron finished');
      process.exit(0);
    })
    .catch(error => {
      console.error('[LEO CRON] Ingestion cron failed:', error);
      process.exit(1);
    });
}

module.exports = runIngestions;
