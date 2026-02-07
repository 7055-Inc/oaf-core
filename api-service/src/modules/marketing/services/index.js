/**
 * Marketing Services Index
 * 
 * Exports all marketing services for easy import
 */

const CampaignService = require('./CampaignService');
const ContentService = require('./ContentService');
const ApprovalService = require('./ApprovalService');
const SchedulerService = require('./SchedulerService');
const AnalyticsService = require('./AnalyticsService');
const AssetService = require('./AssetService');
const OAuthService = require('./OAuthService');
const EmailMarketingService = require('./EmailMarketingService');

// Video processing services (Sprint C2)
const { getVideoService } = require('./VideoService');
const { getCaptionService } = require('./CaptionService');
const { getAutoClipService } = require('./AutoClipService');
const { getVideoTemplateService } = require('./VideoTemplateService');

module.exports = {
  CampaignService,
  ContentService,
  ApprovalService,
  SchedulerService,
  AnalyticsService,
  AssetService,
  OAuthService,
  EmailMarketingService,
  // Video services
  getVideoService,
  getCaptionService,
  getAutoClipService,
  getVideoTemplateService
};
