/**
 * CSV Reports Service
 * Saved report configurations
 */

const db = require('../../../../config/db');

/**
 * Get reports for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>}
 */
async function getReports(userId) {
  const [rows] = await db.execute(
    `SELECT id, name, report_type, config, created_at 
     FROM csv_saved_reports 
     WHERE user_id = ? 
     ORDER BY created_at DESC`,
    [userId]
  );
  
  return rows.map(row => ({
    ...row,
    config: JSON.parse(row.config || '{}')
  }));
}

/**
 * Create a saved report
 * @param {number} userId - User ID
 * @param {Object} reportData - Report data
 * @returns {Promise<Object>}
 */
async function createReport(userId, reportData) {
  const { name, reportType, config } = reportData;
  
  if (!name || !reportType) {
    throw new Error('Report name and type are required');
  }
  
  const [result] = await db.execute(
    `INSERT INTO csv_saved_reports (user_id, name, report_type, config) 
     VALUES (?, ?, ?, ?)`,
    [userId, name, reportType, JSON.stringify(config || {})]
  );
  
  return {
    id: result.insertId,
    name,
    reportType,
    config
  };
}

/**
 * Delete a saved report
 * @param {number} reportId - Report ID
 * @param {number} userId - User ID
 * @returns {Promise<{deleted: boolean}>}
 */
async function deleteReport(reportId, userId) {
  const [result] = await db.execute(
    'DELETE FROM csv_saved_reports WHERE id = ? AND user_id = ?',
    [reportId, userId]
  );
  
  if (result.affectedRows === 0) {
    throw new Error('Report not found or not authorized');
  }
  
  return { deleted: true };
}

module.exports = {
  getReports,
  createReport,
  deleteReport,
};
