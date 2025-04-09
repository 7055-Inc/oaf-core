const mysql = require('mysql2/promise');

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * Execute a safe database query
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @param {Function} callback - Callback function
 */
const safeQuery = async (sql, params, callback) => {
  try {
    const [results] = await pool.execute(sql, params);
    callback(null, results);
  } catch (error) {
    console.error('Database error:', error);
    callback(error);
  }
};

module.exports = {
  pool,
  safeQuery
}; 