require('dotenv').config({ path: '/var/www/main/api-service/.env' });
const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const db = require('../config/db');
const path = require('path');
const { 
  loginLimiter,
  tokenValidationLimiter,
  authLimiter, 
  refreshLimiter,
  paymentLimiter, 
  apiKeyLimiter, 
  apiLimiter, 
  adminLimiter, 
  uploadLimiter 
} = require('./middleware/rateLimiter');
// const { secureLogger, requestLogger } = require('./middleware/secureLogger');
// Temporarily disable secure logger for debugging
const secureLogger = {
  info: console.log,
  error: console.error,
  warn: console.warn,
  debug: console.log,
  security: console.warn,
  audit: console.log
};
const requestLogger = (req, res, next) => next(); // Disable request logging
const { 
  csrfTokenProvider, 
  csrfProtection, 
  strictCsrfProtection,
  csrfTokenRoute 
} = require('./middleware/csrfProtection');
const app = express();

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

/**
 * Log startup information (no sensitive data)
 * Environment validation and startup diagnostics
 */
secureLogger.info('API Gateway starting', {
  port: process.env.API_GATEWAY_PORT || 3001,
  version: process.env.API_VERSION || '1.0.0',
  instance: process.env.API_INSTANCE || '0',
  corsOrigins: process.env.CORS_ALLOWED_ORIGINS ? 'configured' : 'missing',
  apiBaseUrl: process.env.API_BASE_URL ? 'configured' : 'missing',
  frontendUrl: process.env.FRONTEND_URL ? 'configured' : 'missing'
});

/**
 * CORS Middleware - Dynamic origin validation for multitenant platform
 * Supports: Static origins, subdomains, and verified custom domains
 */
app.use(async (req, res, next) => {
  // Get allowed origins from environment variables
  const corsOrigins = process.env.CORS_ALLOWED_ORIGINS ? 
    process.env.CORS_ALLOWED_ORIGINS.split(',') : [];
  
  const staticAllowedOrigins = [
    ...corsOrigins,
    'http://localhost:8081'  // Mobile app development
  ];
  
  const origin = req.headers.origin;
  let isAllowed = staticAllowedOrigins.includes(origin);
  
  // Check if origin is a subdomain of brakebee.com
  if (!isAllowed && origin && origin.match(/^https:\/\/[a-zA-Z0-9-]+\.brakebee\.com$/)) {
    isAllowed = true;
  }
  
  // Check if origin is a verified custom domain
  if (!isAllowed && origin && origin.startsWith('https://')) {
    try {
      const domain = origin.replace('https://', '');
      const [sites] = await db.execute(
        'SELECT id FROM sites WHERE custom_domain = ? AND domain_validation_status = "verified" AND custom_domain_active = 1',
        [domain]
      );
      isAllowed = sites.length > 0;
    } catch (error) {
      console.error('Error checking custom domain CORS:', error);
    }
  }
  
  if (isAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-CSRF-Token');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

// Add cookie parser middleware
app.use(cookieParser());

// IMPORTANT: Webhooks need raw body access for Stripe signature verification
// Load webhook routes BEFORE JSON parsing middleware
app.use('/webhooks', require('./routes/webhooks/stripe'));

// Parse JSON bodies for all other routes
app.use(express.json());

// Handle JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    secureLogger.error('JSON parsing error', err);
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  next();
});

// Serve static files from temp_images
app.use('/temp_images', express.static('/var/www/main/api-service/temp_images'));

// Apply general API rate limiting to all routes
secureLogger.info('Applying rate limiting');
app.use(apiLimiter);

// Apply secure request logging
app.use(requestLogger);

// Create smart auth rate limiter middleware
const smartAuthLimiter = (req, res, next) => {
  // Apply different rate limiters based on request type
  if (req.path === '/exchange' && req.body && req.body.provider === 'validate') {
    // Token validation requests
    tokenValidationLimiter(req, res, next);
  } else if (req.path === '/exchange') {
    // Actual login attempts
    loginLimiter(req, res, next);
  } else if (req.path === '/refresh') {
    // Token refresh requests
    refreshLimiter(req, res, next);
  } else {
    // Fallback to general auth limiter
    authLimiter(req, res, next);
  }
};

// Load authentication routes first (no CSRF protection needed for login)
secureLogger.info('Loading authentication routes');
try {
  app.use('/auth', smartAuthLimiter, require('./routes/auth'));
} catch (err) {
  secureLogger.error('Error loading auth routes', err);
  process.exit(1);
}

// Apply CSRF token provider for all requests
secureLogger.info('Applying CSRF protection');
app.use(csrfTokenProvider);

// Add CSRF token endpoint for frontend
app.get('/csrf-token', csrfTokenRoute);

// Apply CSRF protection to different route groups
// Regular CSRF protection for products, cart, events, articles
app.use('/products', csrfProtection());
app.use('/cart', csrfProtection());
app.use('/events', csrfProtection());
app.use('/api/articles', csrfProtection());
    // Series and tags routes consolidated into articles.js
app.use('/api/sites', csrfProtection());
app.use('/api/terms', csrfProtection());
app.use('/api/announcements', csrfProtection());
app.use('/inventory', csrfProtection());

// Strict CSRF protection for financial and sensitive operations
app.use('/checkout', csrfProtection({ strict: true }));
app.use('/payments', csrfProtection({ strict: true }));
app.use('/admin', csrfProtection({ strict: true }));
app.use('/vendor', csrfProtection({ strict: true }));
app.use('/api/keys', csrfProtection({ strict: true }));

// Load remaining routes with error handling and logging
secureLogger.info('Loading other routes');
try {
  
  // API key management (sensitive operations)
  app.use('/api-keys', apiKeyLimiter, require('./routes/api-keys'));
  
  // Admin routes (critical operations)
  app.use('/admin', adminLimiter, require('./routes/admin'));
  
  // User management (with CSRF protection)
  app.use('/users', csrfProtection(), require('./routes/users'));
  
  // Product management (rate limiting applied within the route after auth)
  app.use('/products', require('./routes/products'));
  
  // Curated marketplace routes
  app.use('/api/curated', require('./routes/curated'));
  
  // Categories (safe for now, mostly read operations)
  app.use('/categories', require('./routes/categories'));
  
  // Public policies (shipping, returns, etc.)
  app.use('/', require('./routes/policies'));
  
  // Cart operations
  app.use('/cart', require('./routes/carts'));
  
  // Checkout and payments (with selective payment rate limiting)
  const checkoutRouter = require('./routes/checkout');
  
  // Apply payment limiter to most checkout routes, but skip order history
  app.use('/checkout', (req, res, next) => {
    // Skip payment rate limiting for order history endpoints
    if (req.path === '/orders/my') {
      return next();
    }
    // Apply payment rate limiting to all other checkout endpoints
    return paymentLimiter(req, res, next);
  }, checkoutRouter);
  
  // Vendor management
  app.use('/vendor', require('./routes/vendor'));
  
  // Admin financial operations
  app.use('/admin', adminLimiter, require('./routes/admin-financial'));
  
  // Admin marketplace operations
  app.use('/api/admin/marketplace', adminLimiter, require('./routes/admin-marketplace'));
  
  // Admin verified operations
  app.use('/api/admin/verified', adminLimiter, require('./routes/admin-verified'));
  
  // Vendor financial operations
  app.use('/api/vendor-financials', require('./routes/vendor-financials'));
  
  // Finance operations (isolated financial data)
  app.use('/api/finance', adminLimiter, require('./routes/finance'));
  
  // Leo AI routes (search, recommendations, and future features)
  app.use('/api/leo', require('./routes/leo'));
  
  // Shipping services
  app.use('/api/shipping', csrfProtection(), require('./routes/shipping'));
  
  // Payment methods management (card on file)
  app.use('/api', require('./routes/payment-methods'));
  
  // Shipping subscription services (note: uses shipping_labels as the type)
  app.use('/api/subscriptions/shipping', require('./routes/subscriptions/shipping'));
  app.use('/api/subscriptions/shipping_labels', require('./routes/subscriptions/shipping'));
  
  // Sites subscription services
  app.use('/api/subscriptions/sites', require('./routes/subscriptions/websites'));
  app.use('/api/subscriptions/websites', require('./routes/subscriptions/websites')); // Alias for universal flow
  
  // Marketplace subscription services
  app.use('/api/subscriptions/marketplace', require('./routes/subscriptions/marketplace'));
  
  // Verified subscription services
  app.use('/api/subscriptions/verified', require('./routes/subscriptions/verified'));
  
  // Wholesale subscription services
  app.use('/api/subscriptions/wholesale', require('./routes/subscriptions/wholesale'));
  
  // TikTok marketplace connector
  app.use('/api/tiktok', require('./routes/tiktok'));
  
  // Event management
  app.use('/api/events', require('./routes/events'));
  // Event types route consolidated into events.js
  app.use('/api/artist-contact', require('./routes/artist-contact'));
  app.use('/api/applications', require('./routes/applications'));
  
  // Promoter claim routes (public - no auth required, token is auth)
  app.use('/api/promoters', require('./routes/promoter-claim'));
  
  // Event series management and automation
  app.use('/api/series', require('./routes/series'));
  
  // Dashboard widgets system
  app.use('/api/dashboard-widgets', require('./routes/dashboard-widgets'));
  
  // Jury packets management
  app.use('/api/jury-packets', require('./routes/jury-packets'));
  
  // Artist personas management
  app.use('/api/personas', require('./routes/personas'));
  
  // CSV processing (no CSRF needed - internal backend process)
  app.use('/csv', require('./routes/csv'));
  
  // Media processing (no CSRF needed - server-to-server API key auth)
  app.use('/api/media', require('./routes/media'));
  
  // Media proxy (no CSRF needed - public file serving)
  app.use('/api/media', require('./routes/media-proxy'));
  
  // Serve temp images directly (fallback when processing fails/pending)
  app.use('/temp_images', express.static(path.join(__dirname, '../temp_images')));
  

  
  // Articles management - all routes fixed
  app.use('/api/articles', require('./routes/articles'));
    // Series and tags routes consolidated into articles.js
  
  // Sites management (multisite functionality)
  app.use('/api/sites', require('./routes/sites'));
  
  // Custom domain management
  app.use('/api/domains', csrfProtection(), require('./routes/domains'));
  
  // Terms and conditions management
  app.use('/api/terms', require('./routes/terms'));
  
  // Announcements management
  app.use('/api/announcements', require('./routes/announcements'));
  
  // Dashboard API (consolidates vendor, admin, and permission-based functionality)
  app.use('/dashboard', require('./routes/dashboard'));
  
  // Email system routes
  app.use('/emails', require('./routes/emails'));
  
  // Website addons (contact forms, email collection, etc.)
  app.use('/api/addons', require('./routes/addons'));
  
  // Inventory management
  app.use('/inventory', csrfProtection(), require('./routes/inventory'));

  // Returns management
  app.use('/api/returns', csrfProtection(), require('./routes/returns'));

  // Reviews system
  app.use('/api/reviews', csrfProtection(), require('./routes/reviews'));

  secureLogger.info('All routes loaded successfully with CSRF protection');
} catch (err) {
  secureLogger.error('Error loading routes', err);
  process.exit(1);
}

/**
 * Health Check Endpoint
 * Provides system status and configuration validation
 * Used by load balancers and monitoring systems
 */
app.get('/health', (req, res) => {
  const healthStatus = {
    status: 'ok',
    version: process.env.API_VERSION || '1.0.0',
    instance: process.env.API_INSTANCE || '0',
    timestamp: new Date().toISOString(),
    environment: {
      corsConfigured: !!process.env.CORS_ALLOWED_ORIGINS,
      apiBaseConfigured: !!process.env.API_BASE_URL,
      frontendConfigured: !!process.env.FRONTEND_URL,
      cookieDomainConfigured: !!process.env.COOKIE_DOMAIN
    }
  };
  
  // Return 503 if critical environment variables are missing
  const criticalEnvMissing = !process.env.CORS_ALLOWED_ORIGINS || 
                            !process.env.API_BASE_URL || 
                            !process.env.FRONTEND_URL;
  
  if (criticalEnvMissing) {
    healthStatus.status = 'degraded';
    healthStatus.warnings = ['Critical environment variables missing'];
    return res.status(503).json(healthStatus);
  }
  
  res.json(healthStatus);
});

const port = process.env.API_GATEWAY_PORT || 3001;
app.listen(port, () => {
  secureLogger.info(`API Gateway running on port ${port}`);
});