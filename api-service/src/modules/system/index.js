/**
 * System Module
 * 
 * Handles system-wide administrative functions including:
 * - Homepage hero settings (text, videos, CTA)
 * - Site-wide announcements
 * - Future: categories, terms, maintenance mode
 * 
 * @module system
 */

const routes = require('./routes');
const services = require('./services');

module.exports = {
  routes,
  services
};
