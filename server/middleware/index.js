// /server/middleware/index.js
const { errorHandler } = require('./errorHandler');
let db;

// Initialize the database connection for middleware
const initializeDb = (database) => {
  db = database;
};

// DB connection monitor middleware
const dbConnectionMonitor = (req, res, next) => {
  if (!db) {
    console.error('DB Monitor: No DB connection available');
    return next();
  }
  
  // Add diagnostic to response headers if in development
  if (process.env.NODE_ENV !== 'production') {
    res.setHeader('X-DB-Status', 'Connected');
  }
  
  next();
};

// Async handler to wrap async functions
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Safe query function using the DB pool
const safeQuery = (sql, params, callback) => {
  if (!db) {
    return callback(new Error('Database connection not available'));
  }

  db.query(sql, params, (err, results) => {
    callback(err, results);
  });
};

// Export all middleware functions
module.exports = {
  errorHandler,
  initializeDb,
  dbConnectionMonitor,
  asyncHandler,
  safeQuery
};