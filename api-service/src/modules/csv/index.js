/**
 * CSV Module
 * Bulk import/export via CSV and Excel files
 */

const router = require('./routes');
const services = require('./services');
const { initWorker, shutdownWorker } = require('./worker');

module.exports = {
  router,
  ...services,
  initWorker,
  shutdownWorker,
};
