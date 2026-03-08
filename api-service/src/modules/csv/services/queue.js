/**
 * CSV Queue Service
 * Bull queue setup for background job processing
 */

const Queue = require('bull');

// Initialize Redis queue
const csvQueue = new Queue('CSV processing', {
  redis: {
    port: 6379,
    host: 'localhost'
  },
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
  }
});

/**
 * Add a job to the queue
 * @param {string} jobId - Unique job ID
 * @param {Object} jobData - Job data
 * @returns {Promise<Object>}
 */
async function addJob(jobId, jobData) {
  return csvQueue.add('process-csv', jobData, {
    jobId,
    delay: 1000 // Small delay to ensure database is updated
  });
}

/**
 * Get queue for direct access (worker registration)
 */
function getQueue() {
  return csvQueue;
}

/**
 * Close the queue gracefully
 */
async function close() {
  await csvQueue.close();
}

module.exports = {
  csvQueue,
  addJob,
  getQueue,
  close,
};
