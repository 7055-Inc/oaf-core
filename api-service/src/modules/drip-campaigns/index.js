/**
 * Drip Campaigns Module
 * Automated email drip campaigns with behavior triggers and frequency management
 */

const router = require('./routes');

// Export services for internal use
const CampaignService = require('./services/campaigns');
const EnrollmentService = require('./services/enrollments');
const FrequencyManager = require('./services/frequency');
const AnalyticsService = require('./services/analytics');

module.exports = {
  router,
  services: {
    campaigns: CampaignService,
    enrollments: EnrollmentService,
    frequency: FrequencyManager,
    analytics: AnalyticsService
  }
};
