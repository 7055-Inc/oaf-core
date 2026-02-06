/**
 * SOP API Client
 * v2 API for Standard Operating Procedures
 */

import { authenticatedApiRequest } from '../csrf';
import { getApiUrl } from '../config';

const SOP_BASE = '/api/v2/sop';

// ============================================================================
// AUTH
// ============================================================================

/**
 * Get current SOP user info
 * Returns userId and user_type if enrolled
 */
export async function fetchSopUser() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${SOP_BASE}/auth/me`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || error.error?.code || 'Failed to fetch SOP user');
  }

  const data = await response.json();
  return data.data;
}

// ============================================================================
// FOLDERS
// ============================================================================

/**
 * Fetch folders as tree structure
 */
export async function fetchFolderTree() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${SOP_BASE}/folders`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch folders');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Fetch folders as flat list
 */
export async function fetchFoldersFlat() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${SOP_BASE}/folders?flat=1`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch folders');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Fetch single folder
 */
export async function fetchFolder(folderId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${SOP_BASE}/folders/${folderId}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch folder');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Create a folder
 */
export async function createFolder(folderData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${SOP_BASE}/folders`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(folderData)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create folder');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Update a folder
 */
export async function updateFolder(folderId, folderData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${SOP_BASE}/folders/${folderId}`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(folderData)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update folder');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Delete a folder
 */
export async function deleteFolder(folderId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${SOP_BASE}/folders/${folderId}`),
    { method: 'DELETE' }
  );

  if (!response.ok && response.status !== 204) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to delete folder');
  }

  return true;
}

// ============================================================================
// SOPs
// ============================================================================

/**
 * Fetch SOPs with optional filters
 */
export async function fetchSops(options = {}) {
  const { folder_id, status, search, limit = 50, offset = 0 } = options;

  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset)
  });
  
  if (folder_id !== undefined) {
    params.append('folder_id', folder_id === null ? '' : String(folder_id));
  }
  if (status) params.append('status', status);
  if (search) params.append('search', search);

  const response = await authenticatedApiRequest(
    getApiUrl(`${SOP_BASE}/sops?${params}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch SOPs');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Fetch single SOP with breadcrumb
 */
export async function fetchSop(sopId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${SOP_BASE}/sops/${sopId}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch SOP');
  }

  const data = await response.json();
  return {
    sop: data.data,
    breadcrumb: data.breadcrumb || []
  };
}

/**
 * Create a new SOP
 */
export async function createSop(sopData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${SOP_BASE}/sops`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sopData)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create SOP');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Update an SOP
 */
export async function updateSop(sopId, sopData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${SOP_BASE}/sops/${sopId}`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sopData)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update SOP');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Fetch SOP version history
 */
export async function fetchSopVersions(sopId, limit = 50) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${SOP_BASE}/sops/${sopId}/versions?limit=${limit}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch versions');
  }

  const data = await response.json();
  return data.data;
}

// ============================================================================
// USERS (Admin)
// ============================================================================

/**
 * Fetch all enrolled SOP users
 */
export async function fetchSopUsers() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${SOP_BASE}/users`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch users');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Get single SOP user
 */
export async function fetchSopUserById(userId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${SOP_BASE}/users/${userId}`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch user');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Enroll a new user in SOP
 */
export async function createSopUser(userData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${SOP_BASE}/users`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to create user');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Update SOP user (change user_type)
 */
export async function updateSopUser(userId, userData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${SOP_BASE}/users/${userId}`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update user');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Remove user from SOP
 */
export async function deleteSopUser(userId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${SOP_BASE}/users/${userId}`),
    { method: 'DELETE' }
  );

  if (!response.ok && response.status !== 204) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to delete user');
  }

  return true;
}

// ============================================================================
// LAYOUT
// ============================================================================

/**
 * Fetch global SOP layout (header/footer blocks)
 */
export async function fetchSopLayout() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${SOP_BASE}/layout`),
    { method: 'GET' }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to fetch layout');
  }

  const data = await response.json();
  return data.data;
}

/**
 * Update global SOP layout
 */
export async function updateSopLayout(layoutData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${SOP_BASE}/layout`),
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(layoutData)
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to update layout');
  }

  const data = await response.json();
  return data.data;
}
