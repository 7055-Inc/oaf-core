/**
 * CSV Worker - WRAPPER
 * 
 * This file is a wrapper that points to the new modular CSV implementation.
 * The actual processing logic now lives in: api-service/src/modules/csv/
 * 
 * This wrapper exists for backward compatibility in case anything
 * still references the csv-workers service directly.
 * 
 * @deprecated Use api-service/src/modules/csv instead
 */

const path = require('path');

// Load environment variables
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '../api-service/.env') });

// Import the new module's worker
const csvModule = require('../api-service/src/modules/csv');

console.log('CSV Worker wrapper starting...');
console.log('NOTE: This is a wrapper pointing to api-service/src/modules/csv/');

// Initialize the worker from the new module
csvModule.initWorker();

console.log('CSV Worker wrapper initialized - using new modular implementation');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('CSV Worker wrapper shutting down...');
  await csvModule.shutdownWorker();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('CSV Worker wrapper shutting down...');
  await csvModule.shutdownWorker();
  process.exit(0);
});
