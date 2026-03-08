/**
 * Auth module - API keys service (v2)
 * List, create, toggle, and delete API keys for the authenticated user.
 * Keys are used for server-to-server and third-party access (e.g. media worker, CSV, Leo).
 */

const db = require('../../../../config/db');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const KEY_PREFIX = process.env.API_KEY_PREFIX || 'bb_';

/**
 * List API keys for a user (public_key, name, created_at, is_active only).
 * @param {number} userId
 * @returns {Promise<Array<{ public_key, name, created_at, is_active }>>}
 */
async function listKeys(userId) {
  const [rows] = await db.query(
    'SELECT public_key, name, created_at, is_active FROM api_keys WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows;
}

/**
 * Create a new API key pair for the user.
 * @param {number} userId
 * @param {string} name - Display name for the key
 * @returns {Promise<{ public_key, private_key, name }>} Raw private_key only returned once
 */
async function createKey(userId, name) {
  const publicKey = KEY_PREFIX + uuidv4().replace(/-/g, '');
  const privateKey = crypto.randomBytes(32).toString('hex');
  const privateKeyHashed = await bcrypt.hash(privateKey, 10);

  await db.query(
    `INSERT INTO api_keys (user_id, public_key, private_key_hashed, name, prefix, is_active)
     VALUES (?, ?, ?, ?, ?, 1)`,
    [userId, publicKey, privateKeyHashed, name || 'API Key', KEY_PREFIX]
  );

  return { public_key: publicKey, private_key: privateKey, name: name || 'API Key' };
}

/**
 * Toggle is_active for a key owned by the user.
 * @param {number} userId
 * @param {string} publicKey
 * @returns {Promise<boolean>} true if updated
 */
async function toggleKey(userId, publicKey) {
  const [rows] = await db.query(
    'SELECT api_key_id, is_active FROM api_keys WHERE user_id = ? AND public_key = ?',
    [userId, publicKey]
  );
  if (!rows.length) return false;
  const newActive = rows[0].is_active ? 0 : 1;
  const [result] = await db.query(
    'UPDATE api_keys SET is_active = ?, updated_at = NOW() WHERE user_id = ? AND public_key = ?',
    [newActive, userId, publicKey]
  );
  return result.affectedRows > 0;
}

/**
 * Delete an API key owned by the user.
 * @param {number} userId
 * @param {string} publicKey
 * @returns {Promise<boolean>} true if deleted
 */
async function deleteKey(userId, publicKey) {
  const [result] = await db.query(
    'DELETE FROM api_keys WHERE user_id = ? AND public_key = ?',
    [userId, publicKey]
  );
  return result.affectedRows > 0;
}

module.exports = {
  listKeys,
  createKey,
  toggleKey,
  deleteKey
};
