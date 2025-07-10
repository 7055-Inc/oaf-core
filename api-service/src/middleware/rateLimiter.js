const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for actual login attempts (google/email provider)
 * Uses hybrid key: IP + email for better brute force protection
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per email+IP combination per 15 minutes
  message: {
    error: 'Too many login attempts for this email',
    message: 'Please try again in 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  skipFailedRequests: false, // Count failed attempts to prevent brute force
  keyGenerator: (req) => {
    // For actual login attempts, combine IP + email for better isolation
    if (req.body && req.body.email && req.body.provider !== 'validate') {
      return `login_${req.ip}_${req.body.email}`;
    }
    return `login_${req.ip}`;
  },
  // Only apply to actual login attempts, not token validation
  skip: (req) => {
    return req.body && req.body.provider === 'validate';
  }
});

/**
 * Rate limiter for token validation requests
 * Higher limits since these are from authenticated users, but not excessive
 */
const tokenValidationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // 200 validation requests per 5 minutes per IP (office-friendly but reasonable)
  message: {
    error: 'Too many validation requests',
    message: 'Please wait a moment before trying again'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  keyGenerator: (req) => {
    return `validation_${req.ip}`;
  },
  // Only apply to token validation requests
  skip: (req) => {
    return !(req.body && req.body.provider === 'validate');
  }
});

/**
 * Combined auth limiter - applies to all auth requests as backup
 * Moderate increase to accommodate office environments
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 auth requests per 15 minutes per IP (reasonable increase from 50)
  message: {
    error: 'Too many authentication requests',
    message: 'Please try again in 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  keyGenerator: (req) => {
    return `auth_${req.ip}`;
  }
});

/**
 * Rate limiter for token refresh requests
 * Moderate limits for refresh operations
 */
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 refresh requests per 15 minutes per IP
  message: {
    error: 'Too many refresh requests',
    message: 'Please try again in 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  keyGenerator: (req) => {
    return `refresh_${req.ip}`;
  }
});

/**
 * Rate limiter for payment processing endpoints
 * Strict for financial operations
 */
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 payment attempts per minute per IP
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
  max: 20, // 20 API key operations per hour per IP
  message: {
    error: 'Too many API key requests',
    message: 'Please wait an hour before making more API key requests'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter
 * Reasonable increase for office environments without being excessive
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // 500 requests per 15 minutes per IP (reasonable increase from 100, not excessive like 2000)
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip some endpoints that need even higher limits
  skip: (req) => {
    return req.path.startsWith('/_next/') || 
           req.path.startsWith('/static/') ||
           req.path.startsWith('/temp_images/') ||
           req.path === '/health' ||
           req.path === '/csrf-token';
  }
});

/**
 * Rate limiter for admin operations
 * Moderate limits for admin functions
 */
const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // 50 admin requests per 5 minutes per IP (reasonable increase from 20)
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
  max: 10, // 10 uploads per minute per IP
  message: {
    error: 'Too many upload attempts',
    message: 'Please wait before uploading more files'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  loginLimiter,
  tokenValidationLimiter,
  authLimiter,
  refreshLimiter,
  paymentLimiter,
  apiKeyLimiter,
  apiLimiter,
  adminLimiter,
  uploadLimiter
}; 