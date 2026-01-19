/**
 * CSV API Client
 * 
 * Frontend wrapper functions for the v2 CSV API.
 */

import { authenticatedApiRequest } from '../auth';
import { getApiUrl } from '../config';

const CSV_BASE = '/api/v2/csv';

// =============================================================================
// UPLOAD
// =============================================================================

/**
 * Upload a CSV/Excel file for processing
 * @param {File} file - The file to upload
 * @param {string} jobType - Job type (product_upload, inventory_upload, etc.)
 * @returns {Promise<{jobId: string, totalRows: number}>}
 */
export async function uploadFile(file, jobType) {
  const formData = new FormData();
  formData.append('csv', file);
  formData.append('jobType', jobType);
  
  const response = await authenticatedApiRequest(
    getApiUrl(`${CSV_BASE}/upload`),
    {
      method: 'POST',
      body: formData,
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Upload failed');
  }
  
  const data = await response.json();
  return data.data;
}

// =============================================================================
// JOB STATUS
// =============================================================================

/**
 * Get job status
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>}
 */
export async function getJobStatus(jobId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CSV_BASE}/jobs/${jobId}`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get job status');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Delete a job
 * @param {string} jobId - Job ID
 * @returns {Promise<void>}
 */
export async function deleteJob(jobId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CSV_BASE}/jobs/${jobId}`),
    { method: 'DELETE' }
  );
  
  if (!response.ok && response.status !== 204) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to delete job');
  }
}

// =============================================================================
// TEMPLATES
// =============================================================================

/**
 * Download import template
 * @param {string} jobType - Job type
 * @param {'csv'|'xlsx'} format - File format
 * @returns {Promise<Blob>}
 */
export async function downloadTemplate(jobType, format = 'xlsx') {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CSV_BASE}/templates/${jobType}?format=${format}`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to download template');
  }
  
  return response.blob();
}

// =============================================================================
// REPORTS
// =============================================================================

/**
 * Get saved reports
 * @returns {Promise<Array>}
 */
export async function getReports() {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CSV_BASE}/reports`),
    { method: 'GET' }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to get reports');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Save a report configuration
 * @param {Object} reportData - Report data
 * @returns {Promise<Object>}
 */
export async function saveReport(reportData) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CSV_BASE}/reports`),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportData),
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to save report');
  }
  
  const data = await response.json();
  return data.data;
}

/**
 * Delete a saved report
 * @param {number} reportId - Report ID
 * @returns {Promise<void>}
 */
export async function deleteReport(reportId) {
  const response = await authenticatedApiRequest(
    getApiUrl(`${CSV_BASE}/reports/${reportId}`),
    { method: 'DELETE' }
  );
  
  if (!response.ok && response.status !== 204) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to delete report');
  }
}
