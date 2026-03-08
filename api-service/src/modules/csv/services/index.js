/**
 * CSV Services Index
 */

module.exports = {
  queueService: require('./queue'),
  jobsService: require('./jobs'),
  parsersService: require('./parsers'),
  processorService: require('./processor'),
  productsService: require('./products'),
  inventoryService: require('./inventory'),
  templatesService: require('./templates'),
  reportsService: require('./reports'),
};
