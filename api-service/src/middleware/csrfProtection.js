/**
 * CSRF Protection Middleware
 * Provides Cross-Site Request Forgery protection for the Beemeeart API
 * Supports token generation, validation, and cookie-based secret management
 */

const csrf = require('csrf');
const { secureLogger } = require('./secureLogger');

// Initialize CSRF instance
const csrfInstance = new csrf();

/**
 * Generate a secret for CSRF tokens (should be stored securely in production)
 * Uses environment variable or generates a secure random secret
 */
const csrfSecret = process.env.CSRF_SECRET || 'your-csrf-secret-change-in-production-' + Math.random().toString(36);

// Special middleware to handle auth validation exemption
const authValidationExemption = (req, res, next) => {
  // Check if this is a validation request by parsing the body manually
  if (req.path === '/exchange' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body);
        if (parsed.provider === 'validate') {
          // Skip CSRF for validation requests
          req.skipCSRF = true;
        }
        // Restore the body for express.json()
        req.body = parsed;
        next();
      } catch (err) {
        // If parsing fails, continue with normal flow
        next();
      }
    });
  } else {
    next();
  }
};

/**
 * CSRF Token Provider Middleware
 * Generates and provides CSRF tokens for client requests
 * Manages cookie-based secret storage with environment-configured domain
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const csrfTokenProvider = (req, res, next) => {
  try {
    // Get or create secret from cookies
    let secret = req.cookies['csrf-secret'];
    
    if (!secret) {
      // Generate new secret
      secret = csrfInstance.secretSync();
      res.cookie('csrf-secret', secret, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        domain: process.env.COOKIE_DOMAIN || '.beemeeart.com',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });
    }
    
    // Make secret available to token routes
    req.csrfSecret = secret;
    
    // Generate CSRF token for this request
    const token = csrfInstance.create(secret);
    
    // Make token available to routes
    req.csrfToken = token;
    
    // Store token in session or as a cookie
    res.cookie('csrf-token', token, {
      httpOnly: false, // Frontend needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: process.env.COOKIE_DOMAIN || '.beemeeart.com',
      maxAge: 3600000 // 1 hour
    });
    
    // Log CSRF token generation (without the actual token)
    secureLogger.info('CSRF token generated', { 
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent')
    });
    
    next();
  } catch (error) {
    secureLogger.error('CSRF token generation failed', error);
    res.status(500).json({ error: 'Security token generation failed' });
  }
};

/**
 * CSRF Protection Middleware
 * Validates CSRF tokens for state-changing requests
 * Supports multiple token sources and configurable strict mode
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.strict - Enable strict validation mode
 * @returns {Function} Express middleware function
 */
const csrfProtection = (options = {}) => {
  const { strict = false } = options;
  
  return async (req, res, next) => {
    try {
      // Skip CSRF for safe methods (GET, HEAD, OPTIONS)
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
      }
      
      // Skip CSRF for Stripe webhooks
      if (req.path.startsWith('/stripe/webhook')) {
        return next();
      }
      
      // Skip CSRF if marked by auth exemption middleware
      if (req.skipCSRF) {
        return next();
      }
      
      // Skip CSRF for token validation requests (used by middleware)
      if (req.path === '/exchange' && req.body && req.body.provider === 'validate') {
        return next();
      }
      
      // Get secret from session/cookies
      let secret = req.cookies['csrf-secret'];
      
      if (!secret) {
        // Generate new secret
        secret = csrfInstance.secretSync();
        res.cookie('csrf-secret', secret, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          domain: process.env.COOKIE_DOMAIN || '.beemeeart.com',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
      }
      
      // Get token from various sources
      const token = req.headers['x-csrf-token'] || 
                   req.body['_csrf'] || 
                   req.query['_csrf'] ||
                   req.cookies['csrf-token'];
      
      if (!token) {
        return res.status(403).json({ 
          error: 'CSRF token missing',
          message: 'Please include a valid CSRF token with your request'
        });
      }
      
      // Verify token
      const isValid = csrfInstance.verify(secret, token);
      
      if (!isValid) {
        return res.status(403).json({ 
          error: 'Invalid CSRF token',
          message: 'The CSRF token is invalid or expired'
        });
      }
      
      // Store secret in request for token generation
      req.csrfSecret = secret;
      
      next();
    } catch (error) {
      console.error('CSRF protection error:', error);
      return res.status(500).json({ 
        error: 'CSRF protection error',
        message: 'An error occurred while validating the CSRF token'
      });
    }
  };
};

/**
 * CSRF Token Route Handler
 * Provides CSRF tokens to frontend applications
 * Returns token in both cookie and JSON response
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const csrfTokenRoute = (req, res) => {
  try {
    if (!req.csrfSecret) {
      return res.status(500).json({ error: 'CSRF secret not available' });
    }
    
    const token = csrfInstance.create(req.csrfSecret);
    res.cookie('csrf-token', token, {
      httpOnly: false, // Frontend needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: process.env.COOKIE_DOMAIN || '.beemeeart.com',
      maxAge: 60 * 60 * 1000 // 1 hour
    });
    
    res.json({ csrfToken: token });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    res.status(500).json({ error: 'Failed to generate CSRF token' });
  }
};

/**
 * Strict CSRF Protection Middleware
 * Enhanced validation for sensitive operations (payments, admin actions)
 * Provides additional security logging and validation
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const strictCsrfProtection = (req, res, next) => {
  try {
    // Get token from multiple sources
    const token = req.body._csrf || 
                  req.headers['x-csrf-token'] || 
                  req.headers['csrf-token'] ||
                  req.query._csrf ||
                  req.cookies['csrf-token'];
    
    if (!token) {
      secureLogger.security('Strict CSRF token missing for sensitive operation', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(403).json({ 
        error: 'Security token required. Please refresh and try again.' 
      });
    }
    
    // Always validate for sensitive operations
    const isValid = csrfInstance.verify(csrfSecret, token);
    
    if (!isValid) {
      secureLogger.security('Strict CSRF validation failed for sensitive operation', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      return res.status(403).json({ 
        error: 'Security validation failed. Please refresh and try again.' 
      });
    }
    
    next();
  } catch (error) {
    secureLogger.error('Strict CSRF validation error', error);
    res.status(500).json({ error: 'Security validation failed' });
  }
};

/**
 * Generate CSRF Token Helper
 * Creates a new CSRF token using the request's secret
 * 
 * @param {Object} req - Express request object with csrfSecret
 * @returns {string} Generated CSRF token
 * @throws {Error} If CSRF secret is not available
 */
const generateToken = (req) => {
  if (!req.csrfSecret) {
    throw new Error('CSRF secret not available');
  }
  return csrfInstance.create(req.csrfSecret);
};

module.exports = {
  csrfTokenProvider,
  csrfProtection,
  strictCsrfProtection,
  csrfTokenRoute,
  generateToken,
  authValidationExemption
}; 