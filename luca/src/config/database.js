const mysql = require('mysql2/promise');

// Database configuration for Luca Platform - Local MySQL
const dbConfig = {
  host: process.env.LUCA_DB_HOST || 'localhost',
  user: process.env.LUCA_DB_USER || 'luca_user', 
  password: process.env.LUCA_DB_PASSWORD || '',
  database: process.env.LUCA_DB_NAME || 'luca',
  port: process.env.LUCA_DB_PORT || 3306,
  charset: 'utf8mb4',
  timezone: '+00:00',
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
};

// Create connection pool
const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection function
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Luca Database connected successfully (Local MySQL)');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Luca Database connection failed:', error.message);
    return false;
  }
}

// Execute query with error handling
async function executeQuery(sql, params = []) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Get connection for transactions
async function getConnection() {
  return await pool.getConnection();
}

// Initialize database tables
async function initializeDatabase() {
  try {
    console.log('🔧 Initializing Luca database schema...');
    
    // Test connection first
    await testConnection();
    
    // Read and execute schema
    const fs = require('fs');
    const path = require('path');
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await executeQuery(statement);
      }
    }
    
    console.log('✅ Database schema initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    return false;
  }
}

module.exports = {
  pool,
  testConnection,
  executeQuery,
  getConnection,
  initializeDatabase,
  dbConfig
};
