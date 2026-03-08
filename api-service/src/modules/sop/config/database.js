/**
 * SOP Database Configuration
 * Separate connection pool for the brakebee_sop database
 */

const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.SOP_DB_HOST || 'localhost',
  user: process.env.SOP_DB_USER,
  password: process.env.SOP_DB_PASS,
  database: process.env.SOP_DB_NAME || 'brakebee_sop',
  port: parseInt(process.env.SOP_DB_PORT || '3306', 10),
  charset: 'utf8mb4',
  timezone: '-07:00',
};

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    conn.release();
    return true;
  } catch (err) {
    console.error('SOP DB connection failed:', err.message);
    return false;
  }
}

module.exports = { pool, testConnection };
