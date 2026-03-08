/**
 * SOP Users Service
 * Manages SOP user enrollment and access
 */

const { pool } = require('../config/database');

async function list() {
  const [rows] = await pool.execute(
    'SELECT id, email, brakebee_user_id, user_type, created_at FROM sop_users ORDER BY email'
  );
  return rows;
}

async function getById(id) {
  const [rows] = await pool.execute(
    'SELECT id, email, brakebee_user_id, user_type, created_at FROM sop_users WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function getByEmail(email) {
  const [rows] = await pool.execute(
    'SELECT id, email, brakebee_user_id, user_type FROM sop_users WHERE email = ?',
    [email]
  );
  return rows[0] || null;
}

async function getByBrakebeeUserId(brakebee_user_id) {
  const [rows] = await pool.execute(
    'SELECT id, email, brakebee_user_id, user_type FROM sop_users WHERE brakebee_user_id = ?',
    [brakebee_user_id]
  );
  return rows[0] || null;
}

async function create({ email, brakebee_user_id = null, user_type = 'frontline' }) {
  const [result] = await pool.execute(
    'INSERT INTO sop_users (email, brakebee_user_id, user_type) VALUES (?, ?, ?)',
    [email, brakebee_user_id, user_type]
  );
  return result.insertId;
}

async function update(id, { user_type }) {
  await pool.execute(
    'UPDATE sop_users SET user_type = ?, updated_at = NOW() WHERE id = ?',
    [user_type, id]
  );
  return getById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM sop_users WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = {
  list,
  getById,
  getByEmail,
  getByBrakebeeUserId,
  create,
  update,
  remove,
};
