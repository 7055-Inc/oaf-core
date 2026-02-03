/**
 * Email Module
 * 
 * Provides email management functionality including:
 * - Template CRUD operations
 * - Email logs and history
 * - Send preview/test emails
 * - Queue management
 * - Bounce tracking
 * 
 * @module modules/email
 */

const routes = require('./routes');
const services = require('./services');

module.exports = {
  routes,
  services
};
