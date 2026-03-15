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
const http = require('http');

// Load environment variables
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '../api-service/.env') });

// Import the new module's worker
const csvModule = require('../api-service/src/modules/csv');

const PORT = process.env.CSV_WORKER_PORT || 3006;

console.log('CSV Worker wrapper starting...');
console.log('NOTE: This is a wrapper pointing to api-service/src/modules/csv/');

// Initialize the worker from the new module
csvModule.initWorker();

http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'csv-worker', timestamp: new Date().toISOString() }));
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(PORT, () => {
  console.log(`CSV Worker health check on port ${PORT}`);
});

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
