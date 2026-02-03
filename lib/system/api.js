/**
 * System API Client (v2)
 * 
 * Frontend API functions for system management:
 * - Hero settings
 * - Announcements
 */

import { authApiRequest } from '../apiUtils';
import { getApiUrl } from '../config';

// ============================================================
// HERO SETTINGS API
// ============================================================

/**
 * Get hero data
 * @returns {Promise<Object>} Hero configuration
 */
export async function getHeroData() {
  const response = await authApiRequest('api/v2/system/hero');
  if (!response.ok) {
    throw new Error('Failed to load hero data');
  }
  return response.json();
}

/**
 * Save hero data (text fields and video config)
 * @param {Object} heroData - Hero configuration
 * @returns {Promise<Object>} Save result
 */
export async function saveHeroData(heroData) {
  const response = await authApiRequest('api/v2/system/hero', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(heroData)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to save hero data');
  }
  return response.json();
}

/**
 * Upload hero videos
 * @param {FileList|File[]} files - Video files to upload
 * @returns {Promise<Object>} Upload result with video info
 */
export async function uploadHeroVideos(files) {
  const formData = new FormData();
  Array.from(files).forEach(file => {
    formData.append('videos', file);
  });

  const response = await authApiRequest('api/v2/system/hero/videos', {
    method: 'POST',
    body: formData
    // Note: Don't set Content-Type header, let browser set it with boundary
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload videos');
  }
  return response.json();
}

/**
 * Delete a hero video
 * @param {string} videoId - ID of video to delete
 * @returns {Promise<Object>} Delete result
 */
export async function deleteHeroVideo(videoId) {
  const response = await authApiRequest(`api/v2/system/hero/videos/${videoId}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete video');
  }
  return response.json();
}

// ============================================================
// ANNOUNCEMENTS API
// ============================================================

/**
 * Get all announcements (admin)
 * @returns {Promise<Array>} List of announcements
 */
export async function getAllAnnouncements() {
  const response = await authApiRequest('api/v2/system/announcements');
  if (!response.ok) {
    throw new Error('Failed to load announcements');
  }
  return response.json();
}

/**
 * Get pending announcements for current user
 * @returns {Promise<Array>} List of pending announcements
 */
export async function getPendingAnnouncements() {
  const response = await authApiRequest('api/v2/system/announcements/pending');
  if (!response.ok) {
    throw new Error('Failed to load pending announcements');
  }
  return response.json();
}

/**
 * Check if user has pending announcements
 * @returns {Promise<Object>} Pending status { hasPending, requiresAcknowledgment, pendingCount }
 */
export async function checkPendingAnnouncements() {
  const response = await authApiRequest('api/v2/system/announcements/check-pending');
  if (!response.ok) {
    throw new Error('Failed to check pending announcements');
  }
  return response.json();
}

/**
 * Create a new announcement
 * @param {Object} data - Announcement data
 * @returns {Promise<Object>} Created announcement
 */
export async function createAnnouncement(data) {
  const response = await authApiRequest('api/v2/system/announcements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create announcement');
  }
  return response.json();
}

/**
 * Update an announcement
 * @param {number} id - Announcement ID
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Update result
 */
export async function updateAnnouncement(id, data) {
  const response = await authApiRequest(`api/v2/system/announcements/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update announcement');
  }
  return response.json();
}

/**
 * Delete an announcement
 * @param {number} id - Announcement ID
 * @returns {Promise<Object>} Delete result
 */
export async function deleteAnnouncement(id) {
  const response = await authApiRequest(`api/v2/system/announcements/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete announcement');
  }
  return response.json();
}

/**
 * Get announcement statistics
 * @param {number} id - Announcement ID
 * @returns {Promise<Object>} Announcement stats
 */
export async function getAnnouncementStats(id) {
  const response = await authApiRequest(`api/v2/system/announcements/${id}/stats`);
  if (!response.ok) {
    throw new Error('Failed to load announcement statistics');
  }
  return response.json();
}

/**
 * Acknowledge an announcement
 * @param {number} id - Announcement ID
 * @returns {Promise<Object>} Acknowledgment result
 */
export async function acknowledgeAnnouncement(id) {
  const response = await authApiRequest(`api/v2/system/announcements/${id}/acknowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to acknowledge announcement');
  }
  return response.json();
}

/**
 * Set reminder for an announcement
 * @param {number} id - Announcement ID
 * @returns {Promise<Object>} Reminder result
 */
export async function setAnnouncementReminder(id) {
  const response = await authApiRequest(`api/v2/system/announcements/${id}/remind-later`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to set reminder');
  }
  return response.json();
}

// ============================================================
// TERMS & CONDITIONS API
// ============================================================

/**
 * Get all terms versions (admin)
 * @returns {Promise<Object>} List of terms versions
 */
export async function getAllTerms() {
  const response = await authApiRequest('api/v2/system/terms');
  if (!response.ok) {
    throw new Error('Failed to load terms');
  }
  return response.json();
}

/**
 * Get terms statistics (admin)
 * @returns {Promise<Object>} Terms stats
 */
export async function getTermsStats() {
  const response = await authApiRequest('api/v2/system/terms/stats');
  if (!response.ok) {
    throw new Error('Failed to load terms statistics');
  }
  return response.json();
}

/**
 * Get single terms version (admin)
 * @param {number} id - Terms ID
 * @returns {Promise<Object>} Terms version data
 */
export async function getTermsById(id) {
  const response = await authApiRequest(`api/v2/system/terms/${id}`);
  if (!response.ok) {
    throw new Error('Failed to load terms');
  }
  return response.json();
}

/**
 * Create new terms version (admin)
 * @param {Object} data - Terms data
 * @returns {Promise<Object>} Created terms
 */
export async function createTerms(data) {
  const response = await authApiRequest('api/v2/system/terms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create terms');
  }
  return response.json();
}

/**
 * Update terms version (admin)
 * @param {number} id - Terms ID
 * @param {Object} data - Fields to update
 * @returns {Promise<Object>} Update result
 */
export async function updateTerms(id, data) {
  const response = await authApiRequest(`api/v2/system/terms/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update terms');
  }
  return response.json();
}

/**
 * Set terms version as current (admin)
 * @param {number} id - Terms ID
 * @returns {Promise<Object>} Result
 */
export async function setCurrentTerms(id) {
  const response = await authApiRequest(`api/v2/system/terms/${id}/set-current`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to set current terms');
  }
  return response.json();
}

/**
 * Delete terms version (admin)
 * @param {number} id - Terms ID
 * @returns {Promise<Object>} Delete result
 */
export async function deleteTerms(id) {
  const response = await authApiRequest(`api/v2/system/terms/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete terms');
  }
  return response.json();
}

// ============================================================
// POLICIES API
// ============================================================

/**
 * Get policy types list (admin)
 * @returns {Promise<Object>} List of policy types
 */
export async function getPolicyTypes() {
  const response = await authApiRequest('api/v2/system/policies/types');
  if (!response.ok) {
    throw new Error('Failed to load policy types');
  }
  return response.json();
}

/**
 * Get all policies (admin)
 * @returns {Promise<Object>} All policies with current content
 */
export async function getAllPolicies() {
  const response = await authApiRequest('api/v2/system/policies');
  if (!response.ok) {
    throw new Error('Failed to load policies');
  }
  return response.json();
}

/**
 * Get single policy by type (admin)
 * @param {string} type - Policy type (shipping, return, privacy, etc.)
 * @returns {Promise<Object>} Policy data
 */
export async function getPolicyByType(type) {
  const response = await authApiRequest(`api/v2/system/policies/${type}`);
  if (!response.ok) {
    throw new Error('Failed to load policy');
  }
  return response.json();
}

/**
 * Update policy (admin)
 * @param {string} type - Policy type
 * @param {string} policyText - New policy content
 * @returns {Promise<Object>} Update result
 */
export async function updatePolicy(type, policyText) {
  const response = await authApiRequest(`api/v2/system/policies/${type}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ policy_text: policyText })
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update policy');
  }
  return response.json();
}
