/**
 * Email Marketing Module
 * Email list management, forms, single blast campaigns, and analytics
 */

const router = require('./routes');

// Export services for internal use
const SubscriberService = require('./services/subscribers');
const TagService = require('./services/tags');
const FormService = require('./services/forms');
const CampaignService = require('./services/campaigns');
const AnalyticsService = require('./services/analytics');

module.exports = {
  router,
  routes: router, // Backward compatibility
  services: {
    subscribers: SubscriberService,
    tags: TagService,
    forms: FormService,
    campaigns: CampaignService,
    analytics: AnalyticsService
  }
};
