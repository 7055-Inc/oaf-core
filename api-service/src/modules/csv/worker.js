/**
 * CSV Worker
 * Bull queue consumer that processes CSV jobs
 * 
 * This runs within the API server process, not as a separate service.
 * It uses module services directly instead of HTTP calls.
 */

const { getQueue } = require('./services/queue');
const { processJob } = require('./services/processor');

let isInitialized = false;

/**
 * Initialize the CSV worker
 * Registers the job processor with the Bull queue
 */
function initWorker() {
  if (isInitialized) {
    console.log('CSV Worker already initialized');
    return;
  }

  const csvQueue = getQueue();
  const maxConcurrentJobs = parseInt(process.env.MAX_CONCURRENT_JOBS) || 3;

  // Register job processor
  csvQueue.process('process-csv', maxConcurrentJobs, async (job) => {
    console.log(`Processing CSV job: ${job.data.jobId} (${job.data.jobType})`);
    
    try {
      const result = await processJob(job);
      console.log(`CSV job ${job.data.jobId} completed: ${result.processedRows} processed, ${result.failedRows} failed`);
      return result;
    } catch (error) {
      console.error(`CSV job ${job.data.jobId} failed:`, error.message);
      throw error;
    }
  });

  // Queue event handlers
  csvQueue.on('completed', (job, result) => {
    console.log(`Job ${job.data.jobId} completed`);
  });

  csvQueue.on('failed', (job, err) => {
    console.error(`Job ${job.data.jobId} failed:`, err.message);
  });

  csvQueue.on('error', (error) => {
    console.error('CSV Queue error:', error);
  });

  isInitialized = true;
  console.log('CSV Worker initialized');
}

/**
 * Shutdown the worker gracefully
 */
async function shutdownWorker() {
  const { close } = require('./services/queue');
  await close();
  console.log('CSV Worker shutdown complete');
}

module.exports = {
  initWorker,
  shutdownWorker,
};
