/**
 * Behavior Services - Re-export all services
 */

const { ClickHouseService, getClickHouse } = require('./clickhouse');

module.exports = {
  ClickHouseService,
  getClickHouse
};
