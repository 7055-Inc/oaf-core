/**
 * Leo Ingestion Services
 * 
 * Re-exports all ingestion modules
 */

const { UserIngestion, getUserIngestion } = require('./users');

module.exports = {
  UserIngestion,
  getUserIngestion
};
