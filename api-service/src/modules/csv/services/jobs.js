/**
 * CSV Jobs Service
 * Job tracking and status management
 */

const db = require('../../../../config/db');

/**
 * Create a new job record
 * @param {Object} jobData - Job data
 * @returns {Promise<Object>}
 */
async function createJob(jobData) {
  const { jobId, userId, jobType, fileName, totalRows } = jobData;
  
  await db.execute(
    `INSERT INTO csv_upload_jobs (job_id, user_id, job_type, file_name, total_rows, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [jobId, userId, jobType, fileName, totalRows]
  );
  
  return { jobId, status: 'pending' };
}

/**
 * Update job status
 * @param {string} jobId - Job ID
 * @param {string} status - New status
 * @param {Object} updates - Additional fields to update
 */
async function updateStatus(jobId, status, updates = {}) {
  const fields = ['status = ?'];
  const values = [status];
  
  Object.entries(updates).forEach(([key, value]) => {
    fields.push(`${key} = ?`);
    values.push(value);
  });
  
  if (status === 'completed' || status === 'failed') {
    fields.push('completed_at = NOW()');
  }
  
  values.push(jobId);
  
  await db.execute(
    `UPDATE csv_upload_jobs SET ${fields.join(', ')} WHERE job_id = ?`,
    values
  );
}

/**
 * Get job by ID
 * @param {string} jobId - Job ID
 * @returns {Promise<Object|null>}
 */
async function getJob(jobId) {
  const [rows] = await db.execute(
    `SELECT j.*, u.user_type
     FROM csv_upload_jobs j 
     JOIN users u ON j.user_id = u.id 
     WHERE j.job_id = ?`,
    [jobId]
  );
  return rows[0] || null;
}

/**
 * Get jobs for a user
 * @param {number} userId - User ID
 * @param {Object} options - Query options
 * @returns {Promise<Array>}
 */
async function getJobsByUser(userId, options = {}) {
  const { limit = 20, offset = 0 } = options;
  
  const [rows] = await db.execute(
    `SELECT * FROM csv_upload_jobs 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    [userId, limit, offset]
  );
  return rows;
}

/**
 * Log error for a specific row
 * @param {string} jobId - Job ID
 * @param {number} rowNumber - Row number
 * @param {string} errorMessage - Error message
 * @param {Object} rawData - Raw row data
 */
async function logRowError(jobId, rowNumber, errorMessage, rawData) {
  await db.execute(
    `INSERT INTO csv_upload_errors (job_id, row_num, error_message, raw_data) 
     VALUES (?, ?, ?, ?)`,
    [jobId, rowNumber, errorMessage, JSON.stringify(rawData)]
  );
}

/**
 * Get errors for a job
 * @param {string} jobId - Job ID
 * @param {number} limit - Max errors to return
 * @returns {Promise<Array>}
 */
async function getJobErrors(jobId, limit = 100) {
  const [rows] = await db.execute(
    `SELECT row_num, error_message, raw_data 
     FROM csv_upload_errors 
     WHERE job_id = ? 
     ORDER BY row_num
     LIMIT ?`,
    [jobId, limit]
  );
  return rows;
}

/**
 * Delete a job and its errors
 * @param {string} jobId - Job ID
 * @param {number} userId - User ID (for ownership check)
 * @param {boolean} isAdmin - Skip ownership check
 */
async function deleteJob(jobId, userId, isAdmin = false) {
  const job = await getJob(jobId);
  
  if (!job) {
    throw new Error('Job not found');
  }
  
  if (!isAdmin && job.user_id !== userId) {
    throw new Error('Not authorized to delete this job');
  }
  
  // Delete errors first (foreign key)
  await db.execute('DELETE FROM csv_upload_errors WHERE job_id = ?', [jobId]);
  
  // Delete job
  await db.execute('DELETE FROM csv_upload_jobs WHERE job_id = ?', [jobId]);
  
  return { deleted: true };
}

module.exports = {
  createJob,
  updateStatus,
  getJob,
  getJobsByUser,
  logRowError,
  getJobErrors,
  deleteJob,
};
