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
// PERSONAS
// =============================================================================

/**
 * List artist personas
 * @param {number|string} userId - User ID
 * @returns {Promise<Array>} Personas
 */
export async function getPersonas(userId) {
  const response = await authenticatedApiRequest(getApiUrl(`${USERS_BASE}/${userId}/personas`));
  const data = await response.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to get personas');
  return data.data;
}

/**
 * Create artist persona
 * @param {number|string} userId - User ID
 * @param {Object} persona - Persona data
 * @returns {Promise<Object>} Created persona
 */
export async function createPersona(userId, persona) {
  const response = await authenticatedApiRequest(getApiUrl(`${USERS_BASE}/${userId}/personas`), {
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
 * @param {number|string} userId - User ID
 * @param {number|string} personaId - Persona ID
 * @param {Object} updates - Persona fields to update
 * @returns {Promise<Object>} Updated persona
 */
export async function updatePersona(userId, personaId, updates) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${USERS_BASE}/${userId}/personas/${personaId}`),
    {
      method: 'PATCH',
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
 * @param {number|string} userId - User ID
 * @param {number|string} personaId - Persona ID
 * @returns {Promise<void>}
 */
export async function deletePersona(userId, personaId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${USERS_BASE}/${userId}/personas/${personaId}`),
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
