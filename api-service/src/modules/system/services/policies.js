/**
 * Policies Service
 * Handles site-wide policy management (shipping, returns, privacy, etc.)
 */

const db = require('../../../../config/db');

// All policy types and their tables
const POLICY_TYPES = {
  shipping: { table: 'shipping_policies', label: 'Shipping Policy' },
  return: { table: 'return_policies', label: 'Return Policy' },
  privacy: { table: 'privacy_policies', label: 'Privacy Policy' },
  cookie: { table: 'cookie_policies', label: 'Cookie Policy' },
  copyright: { table: 'copyright_policies', label: 'Copyright Policy' },
  transparency: { table: 'transparency_policies', label: 'Marketplace Transparency' },
  'data-retention': { table: 'data_retention_policies', label: 'Data Retention Policy' }
};

/**
 * Get all policies (current/default for each type)
 */
async function getAllPolicies() {
  const policies = [];
  
  for (const [type, config] of Object.entries(POLICY_TYPES)) {
    try {
      const [rows] = await db.query(
        `SELECT id, policy_text, status, created_at 
         FROM ${config.table} 
         WHERE user_id IS NULL 
         ORDER BY created_at DESC 
         LIMIT 1`
      );
      
      policies.push({
        type,
        label: config.label,
        ...rows[0] || { policy_text: '', status: 'inactive' }
      });
    } catch (err) {
      console.error(`Error fetching ${type} policy:`, err);
      policies.push({
        type,
        label: config.label,
        policy_text: '',
        status: 'error'
      });
    }
  }
  
  return policies;
}

/**
 * Get a single policy by type
 */
async function getPolicyByType(type) {
  const config = POLICY_TYPES[type];
  if (!config) {
    throw new Error('Invalid policy type');
  }
  
  const [rows] = await db.query(
    `SELECT id, policy_text, status, created_at 
     FROM ${config.table} 
     WHERE user_id IS NULL 
     ORDER BY created_at DESC 
     LIMIT 1`
  );
  
  return {
    type,
    label: config.label,
    ...rows[0] || { policy_text: '', status: 'inactive' }
  };
}

/**
 * Update or create a policy
 */
async function updatePolicy(type, policyText, userId) {
  const config = POLICY_TYPES[type];
  if (!config) {
    throw new Error('Invalid policy type');
  }
  
  // Check if default policy exists
  const [existing] = await db.query(
    `SELECT id FROM ${config.table} WHERE user_id IS NULL LIMIT 1`
  );
  
  if (existing.length > 0) {
    // Update existing
    await db.query(
      `UPDATE ${config.table} 
       SET policy_text = ?, status = 'active', created_at = NOW() 
       WHERE id = ?`,
      [policyText, existing[0].id]
    );
    return { id: existing[0].id, updated: true };
  } else {
    // Create new
    const [result] = await db.query(
      `INSERT INTO ${config.table} (user_id, policy_text, status, created_at) 
       VALUES (NULL, ?, 'active', NOW())`,
      [policyText]
    );
    return { id: result.insertId, created: true };
  }
}

/**
 * Get policy types list
 */
function getPolicyTypes() {
  return Object.entries(POLICY_TYPES).map(([type, config]) => ({
    type,
    label: config.label
  }));
}

module.exports = {
  getAllPolicies,
  getPolicyByType,
  updatePolicy,
  getPolicyTypes,
  POLICY_TYPES
};
