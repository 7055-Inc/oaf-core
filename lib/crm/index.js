/**
 * CRM Module - Frontend API Exports
 * Central export point for all CRM-related API functions
 */

// Subscription management
export {
  fetchCRMSubscription,
  selectCRMTier,
  fetchCRMTermsCheck,
  acceptCRMTerms,
  changeCRMTier,
  cancelCRMSubscription
} from './api';

// Drip campaigns (re-export from drip-campaigns module)
export {
  fetchMyCampaigns,
  fetchMyCampaign,
  createCampaign as createMyCampaign,
  updateCampaign as updateMyCampaign,
  deleteCampaign as deleteMyCampaign,
  getCampaignAnalytics as getMyCampaignAnalytics
} from '../drip-campaigns/api';
