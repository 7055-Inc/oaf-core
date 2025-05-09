const mysql = require('mysql2/promise');
require('dotenv').config();

// Create a connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'oaf',
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

/**
 * Execute a database query and return a promise
 * @param {string} sql - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise} - Promise that resolves with query results
 */
const query = async (sql, params = []) => {
  const [results] = await pool.execute(sql, params);
  return results;
};

// Add query method to pool for backward compatibility
pool.query = query;

/**
 * Ensures consistent handling of user IDs across the application
 * @param {string|number} id - The user ID to normalize 
 * @returns {number} - The normalized ID as a number
 */
const normalizeId = (id) => {
  if (id === undefined || id === null) {
    return null;
  }
  return Number(id);
};

module.exports = {
  pool,
  safeQuery,
  query,
  normalizeId
}; 