const csrf = require('csrf');
const { secureLogger } = require('./secureLogger');

// Initialize CSRF instance
const csrfInstance = new csrf();

// Generate a secret for CSRF tokens (should be stored securely)
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

// Middleware to generate and provide CSRF token
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
        domain: '.onlineartfestival.com',
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
      domain: '.onlineartfestival.com',
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

// Middleware to validate CSRF token
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
          domain: '.onlineartfestival.com',
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

// Route to get CSRF token for frontend
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
      domain: '.onlineartfestival.com',
      maxAge: 60 * 60 * 1000 // 1 hour
    });
    
    res.json({ csrfToken: token });
  } catch (error) {
    console.error('Error generating CSRF token:', error);
    res.status(500).json({ error: 'Failed to generate CSRF token' });
  }
};

// Middleware for sensitive operations (stricter validation)
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

// Helper function to generate tokens
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