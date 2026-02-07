/**
 * Leo Ingestion Services
 * 
 * Re-exports all ingestion modules
 */

const { UserIngestion, getUserIngestion } = require('./users');
const { ProductIngestion, getProductIngestion } = require('./products');
const { BehaviorIngestion, getBehaviorIngestion } = require('./behavior');
const { OrderIngestion, getOrderIngestion } = require('./orders');
const { EventIngestion, getEventIngestion } = require('./events');
const { ReviewIngestion, getReviewIngestion } = require('./reviews');
const { ArticleIngestion, getArticleIngestion } = require('./articles');

module.exports = {
  UserIngestion,
  getUserIngestion,
  ProductIngestion,
  getProductIngestion,
  BehaviorIngestion,
  getBehaviorIngestion,
  OrderIngestion,
  getOrderIngestion,
  EventIngestion,
  getEventIngestion,
  ReviewIngestion,
  getReviewIngestion,
  ArticleIngestion,
  getArticleIngestion
};
