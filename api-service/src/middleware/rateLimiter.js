const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for authentication endpoints
 * More reasonable limits for normal usage while still preventing abuse
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Increased limit - allow 50 requests per 15 minutes per IP
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again in 15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: true, // Don't count successful requests against the limit
  skipFailedRequests: false, // Still count failed requests to prevent brute force
  // Custom key generator to potentially track by user as well
  keyGenerator: (req) => {
    return req.ip; // Use IP address as the key
  }
});

/**
 * Rate limiter for payment processing endpoints
 * Very strict for financial operations
 */
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 payment attempts per minute per IP
  message: {
    error: 'Too many payment attempts',
    message: 'Please wait a moment before trying again'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
});

/**
 * Rate limiter for API key management endpoints
 * Strict to prevent API key abuse
 */
const apiKeyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 API key operations per hour
  message: {
    error: 'Too many API key requests',
    message: 'Please wait an hour before making more API key requests'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter
 * Moderate limits for general API usage
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes per IP
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip some endpoints that should have higher limits
  skip: (req) => {
    // Skip rate limiting for static files and some public endpoints
    return req.path.startsWith('/_next/') || 
           req.path.startsWith('/static/') ||
           req.path === '/api/search' || // Allow more search requests
           req.method === 'GET' && req.path.startsWith('/products/'); // Allow product browsing
  }
});

/**
 * Strict rate limiter for admin operations
 * Very conservative limits for administrative functions
 */
const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 admin requests per 5 minutes
  message: {
    error: 'Too many admin requests',
    message: 'Admin rate limit exceeded, please wait'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * File upload rate limiter
 * Prevent upload spam
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 uploads per minute
  message: {
    error: 'Too many upload attempts',
    message: 'Please wait before uploading more files'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  paymentLimiter,
  apiKeyLimiter,
  apiLimiter,
  adminLimiter,
  uploadLimiter
}; 