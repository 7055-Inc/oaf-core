/**
 * Shared rate limiters for the API.
 * Applied globally (apiLimiter) or per-route for stricter limits.
 * RESTful: one general limit for all /api/v2/*; special-case limiters only where needed.
 */
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
    if (req.body && req.body.email && req.body.provider !== 'validate') {
      return `login_${req.ip}_${req.body.email}`;
    }
    return `login_${req.ip}`;
  },
  skip: (req) => {
    return req.body && req.body.provider === 'validate';
  }
});

/**
 * Rate limiter for token validation requests
 */
const tokenValidationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200,
  message: {
    error: 'Too many validation requests',
    message: 'Please wait a moment before trying again'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  keyGenerator: (req) => `validation_${req.ip}`,
  skip: (req) => !(req.body && req.body.provider === 'validate')
});

/**
 * Combined auth limiter - applies to all auth requests as backup
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many authentication requests',
    message: 'Please try again in 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  keyGenerator: (req) => `auth_${req.ip}`
});

/**
 * Rate limiter for token refresh requests
 */
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: {
    error: 'Too many refresh requests',
    message: 'Please try again in 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  keyGenerator: (req) => `refresh_${req.ip}`
});

/**
 * Rate limiter for payment processing endpoints
 */
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
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
 */
const apiKeyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: {
    error: 'Too many API key requests',
    message: 'Please wait an hour before making more API key requests'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API rate limiter - applied once globally to all routes.
 * RESTful: same limit for all /api/v2/* resources; no per-module duplication.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per 15 min per IP (increased for dashboard heavy usage)
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
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
 */
const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50,
  message: {
    error: 'Too many admin requests',
    message: 'Admin rate limit exceeded, please wait'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS'
});

/**
 * Smart upload rate limiter with role-based limits
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: async (req) => {
    if (req.roles && req.roles.includes('admin')) return 100;
    if (req.permissions && req.permissions.includes('vendor')) return 50;
    return 10;
  },
  message: {
    error: 'Too many upload attempts',
    message: 'Please wait before uploading more files'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.userId ? `user_${req.userId}` : `ip_${req.ip}`),
  skip: (req) => req.path.startsWith('/temp_images/') || req.path === '/health'
});

/**
 * Rate limiter for order history and read-only order operations
 */
const orderHistoryLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    error: 'Too many order history requests',
    message: 'Please wait a moment before refreshing order history'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
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
  uploadLimiter,
  orderHistoryLimiter
};
