/**
 * Marketing Module
 * 
 * AI-powered marketing automation system for Leo
 * 
 * Features:
 * - Campaign management
 * - Content creation and approval workflow
 * - Scheduling and publishing
 * - Analytics tracking
 * - Asset management
 * - Social media integration (Sprint C)
 * 
 * Endpoints:
 * - /api/v2/marketing/campaigns - Campaign CRUD
 * - /api/v2/marketing/content - Content management
 * - /api/v2/marketing/assets - Asset management
 * - /api/v2/marketing/analytics - Performance tracking
 * - /api/v2/marketing/schedule - Scheduling
 * - /api/v2/marketing/approvals - Approval workflow
 */

const router = require('./routes');
const services = require('./services');

module.exports = {
  router,
  ...services
};
