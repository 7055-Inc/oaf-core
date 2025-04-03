// /server/middleware/index.js
const { verifyToken, requireRole, optionalAuth } = require('./authMiddleware');
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

// 404 Not Found handler
const notFoundHandler = (req, res, next) => {
  res.status(404).json({ 
    success: false, 
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND'
    } 
  });
};

// Add COOP and COEP headers to all responses
const coopHeaders = (req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none'); // Fixed: Changed from 'require-corp' to 'unsafe-none'
  next();
};

// Export all middleware functions
module.exports = {
  verifyToken,
  requireRole,
  optionalAuth,
  errorHandler,
  initializeDb,
  dbConnectionMonitor,
  asyncHandler,
  safeQuery,
  notFoundHandler,
  coopHeaders
};