const { pool } = require('../config/database');

async function list(filters = {}) {
  const { folder_id, status, search, limit = 50, offset = 0 } = filters;
  let sql = 'SELECT id, folder_id, title, status, owner_role, submitted_by, created_at, updated_at FROM sop_sops WHERE 1=1';
  const params = [];
  if (folder_id !== undefined) {
    sql += ' AND folder_id <=> ?';
    params.push(folder_id);
  }
  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    sql += ' AND (title LIKE ? OR change_notes LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term);
  }
  // Use query() instead of execute() for LIMIT/OFFSET to avoid prepared statement issues
  sql += ` ORDER BY updated_at DESC LIMIT ${parseInt(limit, 10) || 50} OFFSET ${parseInt(offset, 10) || 0}`;
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function getById(id) {
  const [rows] = await pool.execute('SELECT * FROM sop_sops WHERE id = ?', [id]);
  return rows[0] || null;
}

async function getBreadcrumb(sop) {
  if (!sop || sop.folder_id == null) return [];
  const path = [];
  let folderId = sop.folder_id;
  while (folderId) {
    const [rows] = await pool.execute('SELECT id, title, parent_id FROM sop_folders WHERE id = ?', [folderId]);
    const folder = rows[0];
    if (!folder) break;
    path.unshift({ id: folder.id, title: folder.title });
    folderId = folder.parent_id;
  }
  return path;
}

async function create(data, created_by = null) {
  const {
    folder_id,
    title,
    status = 'draft',
    owner_role,
    change_notes,
    purpose_expected_outcome,
    when_to_use,
    when_not_to_use,
    standard_workflow,
    exit_points,
    escalation,
    transfer,
    related_sop_ids,
    additional_information,
    submitted_by,
  } = data;
  const [result] = await pool.execute(
    `INSERT INTO sop_sops (
      folder_id, title, status, owner_role, change_notes,
      purpose_expected_outcome, when_to_use, when_not_to_use,
      standard_workflow, exit_points, escalation, transfer,
      related_sop_ids, additional_information, submitted_by, created_by, updated_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      folder_id || null,
      title || '',
      status,
      owner_role || null,
      change_notes || null,
      purpose_expected_outcome || null,
      when_to_use || null,
      when_not_to_use || null,
      standard_workflow ? JSON.stringify(standard_workflow) : null,
      exit_points ? JSON.stringify(exit_points) : null,
      escalation ? JSON.stringify(escalation) : null,
      transfer ? JSON.stringify(transfer) : null,
      related_sop_ids ? JSON.stringify(related_sop_ids) : null,
      additional_information ? JSON.stringify(additional_information) : null,
      submitted_by || null,
      created_by,
      created_by,
    ]
  );
  return result.insertId;
}

async function update(id, data, updated_by = null) {
  const row = await getById(id);
  if (!row) return null;
  const fields = [
    'folder_id', 'title', 'status', 'owner_role', 'change_notes',
    'purpose_expected_outcome', 'when_to_use', 'when_not_to_use',
    'standard_workflow', 'exit_points', 'escalation', 'transfer',
    'related_sop_ids', 'additional_information', 'submitted_by',
  ];
  const set = [];
  const params = [];
  for (const key of fields) {
    if (data[key] === undefined) continue;
    if (['standard_workflow', 'exit_points', 'escalation', 'transfer', 'additional_information', 'related_sop_ids'].includes(key)) {
      set.push(`${key} = ?`);
      params.push(data[key] == null ? null : JSON.stringify(data[key]));
    } else {
      set.push(`${key} = ?`);
      params.push(data[key]);
    }
  }
  if (set.length === 0) return row;
  set.push('updated_at = NOW()', 'updated_by = ?');
  params.push(updated_by, id);
  await pool.execute(`UPDATE sop_sops SET ${set.join(', ')} WHERE id = ?`, params);
  return getById(id);
}

async function addVersion(sop_id, changed_by, change_summary, snapshot) {
  await pool.execute(
    'INSERT INTO sop_versions (sop_id, changed_by, change_summary, snapshot) VALUES (?, ?, ?, ?)',
    [sop_id, changed_by, change_summary || null, snapshot ? JSON.stringify(snapshot) : null]
  );
}

async function getVersions(sop_id, limit = 50) {
  const [rows] = await pool.execute(
    'SELECT id, sop_id, changed_at, changed_by, change_summary FROM sop_versions WHERE sop_id = ? ORDER BY changed_at DESC LIMIT ?',
    [sop_id, limit]
  );
  return rows;
}

module.exports = { list, getById, getBreadcrumb, create, update, addVersion, getVersions };
