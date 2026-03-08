const { pool } = require('../config/database');

async function listFlat() {
  const [rows] = await pool.execute(
    'SELECT id, title, parent_id, created_at, updated_at, created_by FROM sop_folders ORDER BY title'
  );
  return rows;
}

function buildTree(items, parentId = null) {
  return items
    .filter((item) => (item.parent_id === null && parentId === null) || (item.parent_id === parentId))
    .map((item) => ({
      ...item,
      children: buildTree(items, item.id),
    }));
}

async function getTree() {
  const flat = await listFlat();
  return buildTree(flat, null);
}

async function getById(id) {
  const [rows] = await pool.execute(
    'SELECT id, title, parent_id, created_at, updated_at, created_by FROM sop_folders WHERE id = ?',
    [id]
  );
  return rows[0] || null;
}

async function create({ title, parent_id = null, created_by = null }) {
  const [result] = await pool.execute(
    'INSERT INTO sop_folders (title, parent_id, created_by) VALUES (?, ?, ?)',
    [title, parent_id || null, created_by]
  );
  return result.insertId;
}

async function update(id, { title, parent_id }, updated_by = null) {
  const updates = [];
  const params = [];
  if (title !== undefined) {
    updates.push('title = ?');
    params.push(title);
  }
  if (parent_id !== undefined) {
    updates.push('parent_id = ?');
    params.push(parent_id || null);
  }
  if (updated_by !== undefined) updates.push('created_by = ?');
  if (updated_by !== undefined) params.push(updated_by);
  updates.push('updated_at = NOW()');
  params.push(id);
  await pool.execute(`UPDATE sop_folders SET ${updates.join(', ')} WHERE id = ?`, params);
  return getById(id);
}

async function remove(id) {
  const [result] = await pool.execute('DELETE FROM sop_folders WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

module.exports = { listFlat, getTree, getById, create, update, remove };
