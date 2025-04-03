const { APIError } = require('../utils/errors');

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Handle multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error: {
        message: err.message,
        code: 'UPLOAD_ERROR'
      }
    });
  }

  // Handle custom API errors
  if (err instanceof APIError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.name.replace('Error', '').toUpperCase(),
        errors: err.errors // For ValidationError
      }
    });
  }

  // Handle database errors
  if (err.code && err.code.startsWith('ER_')) {
    return res.status(503).json({
      success: false,
      error: {
        message: 'Database operation failed',
        code: 'DATABASE_ERROR'
      }
    });
  }

  // Handle unknown errors
  return res.status(500).json({
    success: false,
    error: {
      message: 'Internal server error',
      code: 'SERVER_ERROR'
    }
  });
}

module.exports = {
  errorHandler
}; 