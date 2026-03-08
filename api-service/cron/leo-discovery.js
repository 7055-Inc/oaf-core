#!/usr/bin/env node
/**
 * Leo AI - Scheduled Truth Discovery Cron
 * 
 * Runs all truth discoverers to find patterns and similarities:
 * - Product Similarity
 * - User Similarity (look-alikes)
 * - Meta Patterns
 * 
 * Schedule: Daily at 2am (0 2 * * *)
 * 
 * Usage: node leo-discovery.js [--discoverer=name]
 *   --discoverer=name: Run only a specific discoverer
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const path = require('path');

// Add module paths
const modulePath = path.join(__dirname, '..', 'src', 'modules', 'leo', 'services');

async function runDiscovery() {
  const startTime = Date.now();
  
  // Check for specific discoverer flag
  const discovererArg = process.argv.find(arg => arg.startsWith('--discoverer='));
  const specificDiscoverer = discovererArg ? discovererArg.split('=')[1] : null;

  console.log(`[LEO CRON] Starting truth discovery...`);
  if (specificDiscoverer) {
    console.log(`[LEO CRON] Running specific discoverer: ${specificDiscoverer}`);
  }

  try {
    // Import orchestrator
    const { getTruthOrchestrator } = require(path.join(modulePath, 'truths'));
    const orchestrator = getTruthOrchestrator();
    
    // Initialize
    await orchestrator.initialize();
    
    let result;
    if (specificDiscoverer) {
      // Run specific discoverer
      result = await orchestrator.runDiscoverer(specificDiscoverer);
    } else {
      // Run all discoverers
      result = await orchestrator.runAll();
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[LEO CRON] Discovery complete in ${Math.round(totalDuration / 1000)}s`);
    console.log('[LEO CRON] Results:', JSON.stringify(result, null, 2));

    // Cleanup expired truths
    console.log('[LEO CRON] Running truth cleanup...');
    const cleanupResult = await orchestrator.cleanup();
    console.log('[LEO CRON] Cleanup:', cleanupResult);

    return result;

  } catch (error) {
    console.error('[LEO CRON] Discovery failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runDiscovery()
    .then(() => {
      console.log('[LEO CRON] Discovery cron finished');
      process.exit(0);
    })
    .catch(error => {
      console.error('[LEO CRON] Discovery cron failed:', error);
      process.exit(1);
    });
}

module.exports = runDiscovery;
