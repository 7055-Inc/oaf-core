/**
 * Catalog Module
 * 
 * Handles product management including:
 * - Product CRUD operations
 * - Product listings (my products, all products)
 * - Inventory management
 * - Categories and collections
 */

const router = require('./routes');
const services = require('./services');

module.exports = {
  router,
  ...services,
};
