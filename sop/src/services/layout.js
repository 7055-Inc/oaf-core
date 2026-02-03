const { pool } = require('../config/database');

async function get() {
  const [rows] = await pool.execute('SELECT id, header_blocks, footer_blocks, updated_at, updated_by FROM sop_layout WHERE id = 1');
  return rows[0] || null;
}

async function update({ header_blocks, footer_blocks }, updated_by = null) {
  await pool.execute(
    'UPDATE sop_layout SET header_blocks = ?, footer_blocks = ?, updated_by = ? WHERE id = 1',
    [
      header_blocks != null ? JSON.stringify(header_blocks) : null,
      footer_blocks != null ? JSON.stringify(footer_blocks) : null,
      updated_by,
    ]
  );
  return get();
}

module.exports = { get, update };
