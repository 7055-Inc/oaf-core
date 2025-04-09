const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

/**
 * Connect to MySQL
 * @returns {Promise<Pool>} MySQL connection pool
 */
async function connectDb() {
  try {
    if (pool) return pool;

    pool = mysql.createPool(dbConfig);
    console.log('Connected to MySQL');
    
    return pool;
  } catch (error) {
    console.error('MySQL connection error:', error);
    throw error;
  }
}

/**
 * Close the database connection
 */
async function closeDbConnection() {
  try {
    if (pool) {
      await pool.end();
      console.log('MySQL connection closed');
    }
  } catch (error) {
    console.error('Error closing MySQL connection:', error);
    throw error;
  }
}

module.exports = {
  connectDb,
  closeDbConnection
}; 