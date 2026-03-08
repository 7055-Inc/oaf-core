/**
 * Terms Service
 * Handles terms and conditions version management
 */

const db = require('../../../../config/db');

/**
 * Get all terms versions with creator info
 */
async function getAllTerms() {
  const [terms] = await db.query(
    `SELECT 
      tv.id, 
      tv.version, 
      tv.title, 
      tv.content, 
      tv.is_current, 
      tv.subscription_type,
      tv.created_at, 
      tv.created_by,
      CONCAT(up.first_name, ' ', up.last_name) as created_by_name
    FROM terms_versions tv
    LEFT JOIN user_profiles up ON tv.created_by = up.user_id
    ORDER BY tv.created_at DESC`
  );
  return terms;
}

/**
 * Get single terms version by ID
 */
async function getTermsById(id) {
  const [terms] = await db.query(
    `SELECT 
      tv.*, 
      CONCAT(up.first_name, ' ', up.last_name) as created_by_name
    FROM terms_versions tv
    LEFT JOIN user_profiles up ON tv.created_by = up.user_id
    WHERE tv.id = ?`,
    [id]
  );
  return terms.length > 0 ? terms[0] : null;
}

/**
 * Create new terms version
 */
async function createTerms(data, userId) {
  const { version, title, content, setCurrent = false, subscription_type = 'general' } = data;
  
  await db.query('START TRANSACTION');
  
  try {
    // If setting as current, unset all other current terms of same type
    if (setCurrent) {
      await db.query(
        'UPDATE terms_versions SET is_current = FALSE WHERE subscription_type = ?',
        [subscription_type]
      );
    }
    
    // Create new terms version
    const [result] = await db.query(
      `INSERT INTO terms_versions (version, title, content, is_current, subscription_type, created_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [version, title, content, setCurrent, subscription_type, userId]
    );
    
    await db.query('COMMIT');
    
    return { id: result.insertId, success: true };
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
}

/**
 * Update terms version
 */
async function updateTerms(id, data) {
  const { version, title, content, setCurrent = false, subscription_type } = data;
  
  // Check if exists
  const existing = await getTermsById(id);
  if (!existing) {
    throw new Error('Terms version not found');
  }
  
  await db.query('START TRANSACTION');
  
  try {
    // If setting as current, unset all other current terms of same type
    if (setCurrent) {
      const termType = subscription_type || existing.subscription_type || 'general';
      await db.query(
        'UPDATE terms_versions SET is_current = FALSE WHERE subscription_type = ?',
        [termType]
      );
    }
    
    // Update terms version
    await db.query(
      `UPDATE terms_versions 
       SET version = ?, title = ?, content = ?, is_current = ? 
       WHERE id = ?`,
      [version, title, content, setCurrent, id]
    );
    
    await db.query('COMMIT');
    
    return { success: true };
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
}

/**
 * Set terms version as current
 */
async function setCurrentTerms(id) {
  // Get the terms to find its type
  const terms = await getTermsById(id);
  if (!terms) {
    throw new Error('Terms version not found');
  }
  
  await db.query('START TRANSACTION');
  
  try {
    // Unset all current terms of same type
    await db.query(
      'UPDATE terms_versions SET is_current = FALSE WHERE subscription_type = ?',
      [terms.subscription_type || 'general']
    );
    
    // Set this version as current
    await db.query('UPDATE terms_versions SET is_current = TRUE WHERE id = ?', [id]);
    
    await db.query('COMMIT');
    
    return { success: true };
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
}

/**
 * Delete terms version
 */
async function deleteTerms(id) {
  // Check if exists and is not current
  const existing = await getTermsById(id);
  if (!existing) {
    throw new Error('Terms version not found');
  }
  
  if (existing.is_current) {
    throw new Error('Cannot delete current terms version');
  }
  
  await db.query('START TRANSACTION');
  
  try {
    // Delete user acceptances for this terms version
    await db.query('DELETE FROM user_terms_acceptance WHERE terms_version_id = ?', [id]);
    
    // Delete terms version
    await db.query('DELETE FROM terms_versions WHERE id = ?', [id]);
    
    await db.query('COMMIT');
    
    return { success: true };
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  }
}

/**
 * Get terms statistics
 */
async function getTermsStats() {
  const [stats] = await db.query(
    `SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN is_current = 1 THEN 1 ELSE 0 END) as current_count,
      SUM(CASE WHEN is_current = 0 THEN 1 ELSE 0 END) as draft_count
    FROM terms_versions`
  );
  
  // Get acceptance stats for current terms
  const [acceptanceStats] = await db.query(
    `SELECT COUNT(DISTINCT uta.user_id) as accepted_count
     FROM user_terms_acceptance uta
     JOIN terms_versions tv ON uta.terms_version_id = tv.id
     WHERE tv.is_current = 1`
  );
  
  return {
    total: stats[0]?.total || 0,
    current: stats[0]?.current_count || 0,
    drafts: stats[0]?.draft_count || 0,
    acceptedUsers: acceptanceStats[0]?.accepted_count || 0
  };
}

module.exports = {
  getAllTerms,
  getTermsById,
  createTerms,
  updateTerms,
  setCurrentTerms,
  deleteTerms,
  getTermsStats
};
