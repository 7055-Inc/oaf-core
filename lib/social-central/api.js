/**
 * Social Central API Utility
 * Frontend helpers for Social Central (social media connections, publishing, etc.)
 */

import { authApiRequest } from '../apiUtils';
import { getApiUrl } from '../config';

const API_BASE = 'api/v2/marketing';

/**
 * Fetch all social connections for the current user
 */
export const fetchConnections = async () => {
  const response = await authApiRequest(`${API_BASE}/connections`, { method: 'GET' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch connections');
  }
  return response.json();
};

/**
 * Fetch a single connection by ID
 */
export const fetchConnection = async (id) => {
  const response = await authApiRequest(`${API_BASE}/connections/${id}`, { method: 'GET' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch connection');
  }
  return response.json();
};

/**
 * Disconnect a social account
 */
export const disconnectAccount = async (id) => {
  const response = await authApiRequest(`${API_BASE}/connections/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to disconnect account');
  }
  return response.json();
};

/**
 * Get the OAuth authorization URL for a platform.
 * The backend redirects the browser, so this returns the URL to navigate to.
 */
export const getOAuthUrl = (platform) => {
  // This endpoint redirects the browser via window.location.href (full navigation),
  // so the Authorization header won't be sent. Pass the JWT as a query param instead.
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const url = getApiUrl(`${API_BASE}/oauth/${platform}/authorize`);
  return token ? `${url}?token=${encodeURIComponent(token)}` : url;
};

/**
 * Platform metadata for UI display
 */
// =============================================================================
// AI CONTENT GENERATION
// =============================================================================

/**
 * Check if AI generation is available
 */
export const checkAIStatus = async () => {
  const response = await authApiRequest(`${API_BASE}/ai/status`, { method: 'GET' });
  if (!response.ok) return { available: false };
  return response.json();
};

/**
 * Generate a caption for a single post
 * @param {Object} params - { platform, mediaDescription?, tone?, goal?, additionalNotes? }
 */
export const generateCaption = async (params) => {
  const response = await authApiRequest(`${API_BASE}/ai/caption`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate caption');
  }
  return response.json();
};

/**
 * Generate a full campaign with AI post concepts
 * @param {Object} params - { campaignName, campaignGoal, platforms[], startDate, endDate, postCount? }
 */
export const generateCampaign = async (params) => {
  const response = await authApiRequest(`${API_BASE}/ai/campaign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to generate campaign');
  }
  return response.json();
};

/**
 * Revise a post based on feedback
 * @param {Object} params - { originalPost, feedback, platform }
 */
export const revisePost = async (params) => {
  const response = await authApiRequest(`${API_BASE}/ai/revise`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to revise post');
  }
  return response.json();
};

/**
 * Reimagine a post with a completely fresh approach
 * @param {Object} params - { originalPost, platform, mediaDescription? }
 */
export const reimaginePost = async (params) => {
  const response = await authApiRequest(`${API_BASE}/ai/reimagine`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to reimagine post');
  }
  return response.json();
};

/**
 * Get AI-suggested posting time
 * @param {Object} params - { platform, contentType?, timezone? }
 */
export const suggestPostingTime = async (params) => {
  const response = await authApiRequest(`${API_BASE}/ai/suggest-time`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to suggest posting time');
  }
  return response.json();
};

// =============================================================================
// CAMPAIGNS
// =============================================================================

/**
 * Fetch all campaigns for the current user
 */
export const fetchCampaigns = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await authApiRequest(`${API_BASE}/campaigns${query ? `?${query}` : ''}`, { method: 'GET' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch campaigns');
  }
  return response.json();
};

/**
 * Create a new campaign
 */
export const createCampaign = async (data) => {
  const response = await authApiRequest(`${API_BASE}/campaigns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create campaign');
  }
  return response.json();
};

/**
 * Fetch campaign details
 */
export const fetchCampaign = async (id) => {
  const response = await authApiRequest(`${API_BASE}/campaigns/${id}`, { method: 'GET' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch campaign');
  }
  return response.json();
};

// =============================================================================
// CONTENT
// =============================================================================

/**
 * Create marketing content (post)
 */
export const createContent = async (data) => {
  const response = await authApiRequest(`${API_BASE}/content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create content');
  }
  return response.json();
};

/**
 * Submit content for review
 */
export const submitContent = async (id) => {
  const response = await authApiRequest(`${API_BASE}/content/${id}/submit`, { method: 'POST' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit content');
  }
  return response.json();
};

/**
 * Approve content
 */
export const approveContent = async (id) => {
  const response = await authApiRequest(`${API_BASE}/content/${id}/approve`, { method: 'POST' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to approve content');
  }
  return response.json();
};

/**
 * Schedule content
 */
export const scheduleContent = async (id, scheduledAt) => {
  const response = await authApiRequest(`${API_BASE}/content/${id}/schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scheduled_at: scheduledAt }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to schedule content');
  }
  return response.json();
};

/**
 * Approve + optionally schedule in one step (for AI-generated content)
 * @param {number} id - Content ID
 * @param {string} [scheduledAt] - ISO date string. If omitted, approves only.
 */
export const approveAndSchedule = async (id, scheduledAt = null) => {
  const body = scheduledAt ? { scheduled_at: scheduledAt } : {};
  const response = await authApiRequest(`${API_BASE}/content/${id}/approve-schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to approve content');
  }
  return response.json();
};

// =============================================================================
// SCHEDULE & CALENDAR
// =============================================================================

/**
 * Fetch the scheduled content queue
 */
export const fetchScheduleQueue = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await authApiRequest(`${API_BASE}/schedule/queue${query ? `?${query}` : ''}`, { method: 'GET' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch schedule queue');
  }
  return response.json();
};

/**
 * Fetch calendar data for a date range
 */
export const fetchCalendar = async (startDate, endDate, params = {}) => {
  const query = new URLSearchParams({ start_date: startDate, end_date: endDate, ...params }).toString();
  const response = await authApiRequest(`${API_BASE}/schedule/calendar?${query}`, { method: 'GET' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch calendar');
  }
  return response.json();
};

// =============================================================================
// ANALYTICS
// =============================================================================

/**
 * Fetch analytics overview
 */
export const fetchAnalyticsOverview = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await authApiRequest(`${API_BASE}/analytics/overview${query ? `?${query}` : ''}`, { method: 'GET' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch analytics');
  }
  return response.json();
};

/**
 * Fetch channel performance
 */
export const fetchChannelPerformance = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await authApiRequest(`${API_BASE}/analytics/channels${query ? `?${query}` : ''}`, { method: 'GET' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch channel performance');
  }
  return response.json();
};

// =============================================================================
// ASSETS
// =============================================================================

/**
 * Fetch media assets
 */
export const fetchAssets = async (params = {}) => {
  const query = new URLSearchParams(params).toString();
  const response = await authApiRequest(`${API_BASE}/assets${query ? `?${query}` : ''}`, { method: 'GET' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch assets');
  }
  return response.json();
};

/**
 * Delete an asset
 */
export const deleteAsset = async (id) => {
  const response = await authApiRequest(`${API_BASE}/assets/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete asset');
  }
  return response.json();
};

// =============================================================================
// PLATFORM METADATA
// =============================================================================

export const PLATFORMS = {
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    icon: 'fa-facebook',
    color: '#1877F2',
    colorLight: '#E7F0FD',
    description: 'Pages, posts, images, and videos',
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    icon: 'fa-instagram',
    color: '#E4405F',
    colorLight: '#FDE7EB',
    description: 'Images, carousels, and Reels',
  },
  twitter: {
    id: 'twitter',
    name: 'X (Twitter)',
    icon: 'fa-x-twitter',
    color: '#000000',
    colorLight: '#E8E8E8',
    description: 'Tweets with text, images, and video',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'fa-tiktok',
    color: '#000000',
    colorLight: '#E8E8E8',
    description: 'Short-form video content',
  },
  pinterest: {
    id: 'pinterest',
    name: 'Pinterest',
    icon: 'fa-pinterest',
    color: '#BD081C',
    colorLight: '#FDE7E9',
    description: 'Pins with images and links',
  },
  email: {
    id: 'email',
    name: 'Email (CRM)',
    icon: 'fa-envelope',
    color: '#055474',
    colorLight: '#E8F4FD',
    description: 'Newsletters, announcements, and promotions via CRM',
    isInternal: true,
    isCRM: true,
  },
  drip: {
    id: 'drip',
    name: 'Drip Campaigns',
    icon: 'fa-filter',
    color: '#6f42c1',
    colorLight: '#F0EBF8',
    description: 'Automated email sequences — welcome, nurture, re-engagement',
    isInternal: true,
    adminOnly: true,
  },
  collection: {
    id: 'collection',
    name: 'Product Collections',
    icon: 'fa-th-large',
    color: '#d63384',
    colorLight: '#FBE8F2',
    description: 'Catalog data, featured products, and showcase content',
    isInternal: true,
    adminOnly: true,
  },
};

// =============================================================================
// Brand Voice Configuration
// =============================================================================

/**
 * Fetch the current user's brand voice configuration
 */
export const fetchBrandVoice = async () => {
  const response = await authApiRequest(`${API_BASE}/brand-voice`, { method: 'GET' });
  return response.ok ? response.json() : { success: false, brandVoice: {} };
};

/**
 * Save/update brand voice configuration
 * @param {Object} brandVoice - { voice_tone, writing_style, brand_personality, emoji_usage, banned_phrases, example_posts, target_audience }
 */
export const saveBrandVoice = async (brandVoice) => {
  const response = await authApiRequest(`${API_BASE}/brand-voice`, {
    method: 'PUT',
    body: JSON.stringify(brandVoice),
  });
  return response.ok ? response.json() : { success: false };
};
