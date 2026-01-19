/**
 * Users API Utilities
 * Frontend helpers for user management API calls
 */

import { authenticatedApiRequest } from '../auth';
import { getApiUrl } from '../config';

const USERS_BASE = '/api/v2/users';

// =============================================================================
// USERS
// =============================================================================

/**
 * Get current authenticated user
 * @returns {Promise<Object>} User data
 */
export async function getCurrentUser() {
  const response = await authenticatedApiRequest(getApiUrl(`${USERS_BASE}/me`));
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to get user');
  return data.data;
}

/**
 * Get user by ID
 * @param {number|string} userId - User ID
 * @returns {Promise<Object>} User data
 */
export async function getUser(userId) {
  const response = await authenticatedApiRequest(getApiUrl(`${USERS_BASE}/${userId}`));
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to get user');
  return data.data;
}

/**
 * Update user
 * @param {number|string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated user data
 */
export async function updateUser(userId, updates) {
  const response = await authenticatedApiRequest(getApiUrl(`${USERS_BASE}/${userId}`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to update user');
  return data.data;
}

/**
 * List users (admin only)
 * @param {Object} params - Query parameters (page, limit, search, etc.)
 * @returns {Promise<Object>} { users, meta }
 */
export async function listUsers(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `${USERS_BASE}?${queryString}` : USERS_BASE;
  const response = await authenticatedApiRequest(getApiUrl(url));
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to list users');
  return { users: data.data, meta: data.meta };
}

/**
 * Get full user data (admin only)
 * @param {number|string} userId - User ID
 * @returns {Promise<Object>} Full user data
 */
export async function adminGetUser(userId) {
  const response = await authenticatedApiRequest(getApiUrl(`${USERS_BASE}/${userId}/full`));
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to get user');
  return data.data;
}

/**
 * Update user (admin only)
 * @param {number|string} userId - User ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Result
 */
export async function adminUpdateUser(userId, updates) {
  const response = await authenticatedApiRequest(getApiUrl(`${USERS_BASE}/${userId}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to update user');
  return data.data;
}

/**
 * Delete user (admin only)
 * @param {number|string} userId - User ID
 * @returns {Promise<void>}
 */
export async function adminDeleteUser(userId) {
  const response = await authenticatedApiRequest(getApiUrl(`${USERS_BASE}/${userId}`), {
    method: 'DELETE',
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error?.message || 'Failed to delete user');
  }
}

/**
 * Get user permissions (admin only)
 * @param {number|string} userId - User ID
 * @returns {Promise<Object>} Permissions object
 */
export async function adminGetPermissions(userId) {
  const response = await authenticatedApiRequest(getApiUrl(`${USERS_BASE}/${userId}/permissions`));
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to get permissions');
  return data.data;
}

/**
 * Update user permissions (admin only)
 * @param {number|string} userId - User ID
 * @param {Object} permissions - Permissions to update
 * @returns {Promise<Object>} Updated permissions
 */
export async function adminUpdatePermissions(userId, permissions) {
  const response = await authenticatedApiRequest(getApiUrl(`${USERS_BASE}/${userId}/permissions`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(permissions),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to update permissions');
  return data.data;
}

// =============================================================================
// PROFILES
// =============================================================================

/**
 * Get user profile
 * @param {number|string} userId - User ID
 * @returns {Promise<Object>} Profile data
 */
export async function getProfile(userId) {
  const response = await authenticatedApiRequest(getApiUrl(`${USERS_BASE}/${userId}/profile`));
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to get profile');
  return data.data;
}

/**
 * Update user profile
 * @param {number|string} userId - User ID
 * @param {Object} updates - Profile fields to update
 * @returns {Promise<Object>} Updated profile data
 */
export async function updateProfile(userId, updates) {
  const response = await authenticatedApiRequest(getApiUrl(`${USERS_BASE}/${userId}/profile`), {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to update profile');
  return data.data;
}

// =============================================================================
// PERSONAS (uses /me/ endpoints - current user's personas)
// =============================================================================

/**
 * List current user's personas
 * @returns {Promise<Array>} Personas
 */
export async function getPersonas() {
  const response = await authenticatedApiRequest(getApiUrl(`${USERS_BASE}/me/personas`));
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to get personas');
  return data.data;
}

/**
 * Get single persona by ID
 * @param {number|string} personaId - Persona ID
 * @returns {Promise<Object>} Persona
 */
export async function getPersona(personaId) {
  const response = await authenticatedApiRequest(getApiUrl(`${USERS_BASE}/me/personas/${personaId}`));
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to get persona');
  return data.data;
}

/**
 * Create artist persona
 * @param {Object} persona - Persona data
 * @returns {Promise<Object>} Created persona
 */
export async function createPersona(persona) {
  const response = await authenticatedApiRequest(getApiUrl(`${USERS_BASE}/me/personas`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(persona),
  });
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to create persona');
  return data.data;
}

/**
 * Update artist persona
 * @param {number|string} personaId - Persona ID
 * @param {Object} updates - Persona fields to update
 * @returns {Promise<Object>} Updated persona
 */
export async function updatePersona(personaId, updates) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${USERS_BASE}/me/personas/${personaId}`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }
  );
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to update persona');
  return data.data;
}

/**
 * Delete artist persona
 * @param {number|string} personaId - Persona ID
 * @returns {Promise<void>}
 */
export async function deletePersona(personaId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${USERS_BASE}/me/personas/${personaId}`),
    { method: 'DELETE' }
  );
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error?.message || 'Failed to delete persona');
  }
}

/**
 * Set persona as default
 * @param {number|string} personaId - Persona ID
 * @returns {Promise<void>}
 */
export async function setDefaultPersona(personaId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${USERS_BASE}/me/personas/${personaId}/default`),
    { method: 'PATCH' }
  );
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error?.message || 'Failed to set default persona');
  }
}

/**
 * Upload persona profile image
 * @param {File} file - Image file to upload
 * @param {number|string} personaId - Persona ID (optional, for existing personas)
 * @returns {Promise<string>} Image URL path
 */
export async function uploadPersonaImage(file, personaId = null) {
  const formData = new FormData();
  formData.append('persona_image', file);
  
  const url = personaId 
    ? `${USERS_BASE}/me/personas/${personaId}/image`
    : `${USERS_BASE}/me/personas/upload-image`;
  
  const response = await authenticatedApiRequest(getApiUrl(url), {
    method: 'POST',
    body: formData,
    // Don't set Content-Type header - let browser set it with boundary for FormData
  });
  
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to upload image');
  return data.data.image_url;
}

// =============================================================================
// ADMIN PERSONAS
// =============================================================================

/**
 * List all personas system-wide (admin only)
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} { personas, meta }
 */
export async function adminListPersonas(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString 
    ? `${USERS_BASE}/admin/personas?${queryString}` 
    : `${USERS_BASE}/admin/personas`;
  const response = await authenticatedApiRequest(getApiUrl(url));
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to list personas');
  return { personas: data.data, meta: data.meta };
}

/**
 * Get persona by ID (admin only)
 * @param {number|string} personaId - Persona ID
 * @returns {Promise<Object>} Persona with artist info
 */
export async function adminGetPersona(personaId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${USERS_BASE}/admin/personas/${personaId}`)
  );
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to get persona');
  return data.data;
}

/**
 * Update persona (admin only)
 * @param {number|string} personaId - Persona ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function adminUpdatePersona(personaId, updates) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${USERS_BASE}/admin/personas/${personaId}`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }
  );
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to update persona');
}

/**
 * Delete persona (admin only)
 * @param {number|string} personaId - Persona ID
 * @param {boolean} hard - Hard delete (permanent)
 * @returns {Promise<void>}
 */
export async function adminDeletePersona(personaId, hard = false) {
  const url = hard 
    ? `${USERS_BASE}/admin/personas/${personaId}?hard=true`
    : `${USERS_BASE}/admin/personas/${personaId}`;
  const response = await authenticatedApiRequest(
    getApiUrl(url),
    { method: 'DELETE' }
  );
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error?.message || 'Failed to delete persona');
  }
}

// =============================================================================
// VERIFICATION
// =============================================================================

/**
 * Get verification status
 * @param {number|string} userId - User ID
 * @returns {Promise<Object>} Verification status
 */
export async function getVerificationStatus(userId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${USERS_BASE}/${userId}/verification`)
  );
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to get verification status');
  return data.data;
}

/**
 * Submit verification application
 * @param {number|string} userId - User ID
 * @param {Object} application - Verification application data
 * @returns {Promise<Object>} Application result
 */
export async function submitVerification(userId, application) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${USERS_BASE}/${userId}/verification`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(application),
    }
  );
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to submit verification');
  return data.data;
}
