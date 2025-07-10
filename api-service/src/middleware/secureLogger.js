const winston = require('winston');

// List of sensitive fields to redact
const SENSITIVE_FIELDS = [
  'password', 'token', 'jwt', 'secret', 'key', 'auth', 'authorization',
  'cookie', 'session', 'credit_card', 'card_number', 'cvv', 'ssn',
  'social_security', 'email', 'phone', 'address', 'stripe_key',
  'api_key', 'private_key', 'public_key', 'access_token', 'refresh_token',
  'payment_intent', 'client_secret', 'webhook_secret', 'database_url',
  'db_password', 'db_user', 'oauth_token', 'oauth_secret'
];

// Create Winston logger with secure configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // File transport for errors
    new winston.transports.File({
      filename: '/var/www/main/api-service/logs/error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: '/var/www/main/api-service/logs/api.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Add console transport only in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

/**
 * Recursively sanitize an object to remove sensitive information
 * @param {any} obj - Object to sanitize
 * @param {number} depth - Current recursion depth
 * @param {WeakSet} visited - Set of visited objects to prevent circular references
 * @returns {any} - Sanitized object
 */
function sanitizeObject(obj, depth = 0, visited = new WeakSet()) {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[Object too deep]';
  }
  
  // Check for circular references
  if (obj !== null && typeof obj === 'object' && visited.has(obj)) {
    return '[Circular Reference]';
  }

  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    visited.add(obj);
    return obj.map(item => sanitizeObject(item, depth + 1, visited));
  }

  // Handle objects
  if (typeof obj === 'object') {
    visited.add(obj);
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      
      // Check if key contains sensitive information
      const isSensitive = SENSITIVE_FIELDS.some(field => 
        lowerKey.includes(field.toLowerCase())
      );
      
      if (isSensitive) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeObject(value, depth + 1, visited);
      }
    }
    return sanitized;
  }

  // Handle strings that might contain sensitive patterns
  if (typeof obj === 'string') {
    // Redact JWT tokens
    if (obj.match(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
      return '[REDACTED-JWT]';
    }
    
    // Redact API keys (common patterns)
    if (obj.match(/^[a-zA-Z0-9]{32,}$/) || obj.match(/^sk_[a-zA-Z0-9]+$/) || obj.match(/^pk_[a-zA-Z0-9]+$/)) {
      return '[REDACTED-API-KEY]';
    }
    
    // Redact email addresses
    if (obj.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return '[REDACTED-EMAIL]';
    }
    
    // Redact phone numbers
    if (obj.match(/^\+?[\d\s\-\(\)]{10,}$/)) {
      return '[REDACTED-PHONE]';
    }
  }

  return obj;
}

/**
 * Secure logging functions
 */
const secureLogger = {
  info: (message, meta = {}) => {
    logger.info(message, sanitizeObject(meta));
  },
  
  error: (message, error = null, meta = {}) => {
    const errorInfo = error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : {};
    
    logger.error(message, sanitizeObject({ ...errorInfo, ...meta }));
  },
  
  warn: (message, meta = {}) => {
    logger.warn(message, sanitizeObject(meta));
  },
  
  debug: (message, meta = {}) => {
    logger.debug(message, sanitizeObject(meta));
  },
  
  // Security-specific logging
  security: (message, meta = {}) => {
    logger.warn(`[SECURITY] ${message}`, sanitizeObject(meta));
  },
  
  // Audit logging for financial operations
  audit: (message, meta = {}) => {
    logger.info(`[AUDIT] ${message}`, sanitizeObject(meta));
  }
};

/**
 * Express middleware for request logging
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log incoming request (without sensitive data)
  const requestInfo = {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    // Don't log headers as they may contain auth tokens
  };
  
  secureLogger.info('Incoming request', requestInfo);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const responseInfo = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    };
    
    if (res.statusCode >= 400) {
      secureLogger.error('Request failed', null, responseInfo);
    } else {
      secureLogger.info('Request completed', responseInfo);
    }
  });
  
  next();
};

// Note: We don't override console methods to prevent circular references
// Use secureLogger explicitly throughout the application instead

module.exports = {
  secureLogger,
  requestLogger,
  sanitizeObject
}; 