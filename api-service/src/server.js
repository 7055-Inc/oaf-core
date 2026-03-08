require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
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
  apiLimiter,
  adminLimiter,
  uploadLimiter
} = require('./modules/shared/middleware/rateLimiter');
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
app.use('/webhooks', require('./modules/webhooks/stripe/stripe'));

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
app.use('/temp_images', express.static(path.join(__dirname, '../temp_images')));

// Apply shared API rate limiting once (RESTful: one limit for all /api/v2/* and legacy routes)
secureLogger.info('Applying shared rate limiting');
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
  // Legacy v1 auth routes (for backward compatibility)
  // Legacy auth routes disabled. Use v2 at /api/v2/auth.
  // app.use('/auth', smartAuthLimiter, require('./routes/auth'));
  
  // New v2 modular auth routes
  app.use('/api/v2/auth', smartAuthLimiter, require('./modules/auth').router);
  secureLogger.info('Loaded v2 auth module');
} catch (err) {
  secureLogger.error('Error loading auth routes', err);
  process.exit(1);
}

// Users module (v2)
secureLogger.info('Loading users module');
try {
  app.use('/api/v2/users', require('./modules/users').router);
  secureLogger.info('Loaded v2 users module');
} catch (err) {
  secureLogger.error('Error loading users module', err);
  // Don't exit - users module is not critical for startup
}

// Catalog module (v2)
secureLogger.info('Loading catalog module');
try {
  app.use('/api/v2/catalog', require('./modules/catalog').router);
  secureLogger.info('Loaded v2 catalog module');
} catch (err) {
  secureLogger.error('Error loading catalog module', err);
  // Don't exit - catalog module is not critical for startup
}

// Load CSV module (with integrated worker)
secureLogger.info('Loading CSV module');
try {
  const csvModule = require('./modules/csv');
  app.use('/api/v2/csv', csvModule.router);
  // Initialize the worker to process background jobs
  csvModule.initWorker();
  secureLogger.info('Loaded v2 CSV module with worker');
} catch (err) {
  secureLogger.error('Error loading CSV module', err);
}

// Load Commerce module (orders and returns)
secureLogger.info('Loading Commerce module');
try {
  app.use('/api/v2/commerce', apiLimiter, require('./modules/commerce').routes);
  secureLogger.info('Loaded v2 Commerce module');
} catch (err) {
  secureLogger.error('Error loading Commerce module', err);
}

// Load Finances module
secureLogger.info('Loading Finances module');
try {
  app.use('/api/v2/finances', require('./modules/finances').routes);
  secureLogger.info('Loaded v2 Finances module');
} catch (err) {
  secureLogger.error('Error loading Finances module', err);
}

// Load Communications module
secureLogger.info('Loading Communications module');
try {
  app.use('/api/v2/communications', require('./modules/communications').routes);
  secureLogger.info('Loaded v2 Communications module');
} catch (err) {
  secureLogger.error('Error loading Communications module', err);
}

// Load Content module (articles, topics, tags, series - v2 mount)
secureLogger.info('Loading Content module');
try {
  app.use('/api/v2/content', require('./modules/content').router);
  secureLogger.info('Loaded v2 Content module at /api/v2/content/articles');
} catch (err) {
  secureLogger.error('Error loading Content module', err);
}

// Load Events module
secureLogger.info('Loading Events module');
try {
  app.use('/api/v2/events', require('./modules/events').routes);
  secureLogger.info('Loaded v2 Events module');
} catch (err) {
  secureLogger.error('Error loading Events module', err);
}

// Load Applications module
secureLogger.info('Loading Applications module');
try {
  app.use('/api/v2/applications', require('./modules/applications').routes);
  secureLogger.info('Loaded v2 Applications module');
} catch (err) {
  secureLogger.error('Error loading Applications module', err);
}

// Load Media module (worker API + public proxy; v2 and legacy /api/media)
secureLogger.info('Loading Media module');
try {
  const mediaModule = require('./modules/media');
  app.use('/api/v2/media', mediaModule.router);
  app.use('/api/media', mediaModule.router);
  secureLogger.info('Loaded v2 Media module (worker + proxy at /api/v2/media and /api/media)');
} catch (err) {
  secureLogger.error('Error loading Media module', err);
}

// Load Websites module (sites, subscription, domains - v2 at /api/v2/websites)
secureLogger.info('Loading Websites module');
try {
  app.use('/api/v2/websites', require('./modules/websites').router);
  secureLogger.info('Loaded v2 Websites module at /api/v2/websites');
} catch (err) {
  secureLogger.error('Error loading Websites module', err);
}

// Load System module (hero settings, announcements - v2 at /api/v2/system)
secureLogger.info('Loading System module');
try {
  app.use('/api/v2/system', require('./modules/system').routes);
  secureLogger.info('Loaded v2 System module at /api/v2/system');
} catch (err) {
  secureLogger.error('Error loading System module', err);
}

// Load Leo AI module (search, recommendations, ingestion - v2 at /api/v2/leo)
secureLogger.info('Loading Leo AI module');
try {
  app.use('/api/v2/leo', require('./modules/leo').router);
  secureLogger.info('Loaded v2 Leo AI module at /api/v2/leo');
} catch (err) {
  secureLogger.error('Error loading Leo AI module', err);
}

// Load Marketing Core module (Leo marketing automation - v2 at /api/v2/marketing)
secureLogger.info('Loading Marketing Core module');
try {
  app.use('/api/v2/marketing', uploadLimiter, require('./modules/marketing').router);
  secureLogger.info('Loaded v2 Marketing Core module at /api/v2/marketing');
} catch (err) {
  secureLogger.error('Error loading Marketing Core module', err);
}

// Load Email module (admin email management - v2 at /api/v2/email)
secureLogger.info('Loading Email module');
try {
  app.use('/api/v2/email', require('./modules/email').routes);
  secureLogger.info('Loaded v2 Email module at /api/v2/email');
} catch (err) {
  secureLogger.error('Error loading Email module', err);
}

// Load Drip Campaigns module (automated email campaigns - v2 at /api/v2/drip-campaigns)
secureLogger.info('Loading Drip Campaigns module');
try {
  app.use('/api/v2/drip-campaigns', require('./modules/drip-campaigns').router);
  secureLogger.info('Loaded v2 Drip Campaigns module at /api/v2/drip-campaigns');
} catch (err) {
  secureLogger.error('Error loading Drip Campaigns module', err);
}

// Load Email Marketing module (subscriber lists, forms, campaigns - v2 at /api/v2/email-marketing)
secureLogger.info('Loading Email Marketing module');
try {
  app.use('/api/v2/email-marketing', require('./modules/email-marketing').router);
  secureLogger.info('Loaded v2 Email Marketing module at /api/v2/email-marketing');
} catch (err) {
  secureLogger.error('Error loading Email Marketing module', err);
}

// Load Addons module (connector addon subscription flow - v2 at /api/v2/addons)
secureLogger.info('Loading Addons module');
try {
  app.use('/api/v2/addons', require('./modules/addons').router);
  secureLogger.info('Loaded v2 Addons module at /api/v2/addons');
} catch (err) {
  secureLogger.error('Error loading Addons module', err);
}

// Apply CSRF token provider for all requests
secureLogger.info('Applying CSRF protection');
app.use(csrfTokenProvider);

// Add CSRF token endpoint for frontend
app.get('/csrf-token', csrfTokenRoute);

// Apply CSRF protection to v2 route groups only
// Legacy CSRF path guards are disabled with legacy route mounts.
app.use('/api/v2/content', csrfProtection());
app.use('/api/v2/websites', csrfProtection());
app.use('/api/v2/system', csrfProtection());
app.use('/api/v2/marketing', csrfProtection());
app.use('/api/v2/email', csrfProtection());
app.use('/api/v2/drip-campaigns', csrfProtection());
app.use('/api/v2/email-marketing', csrfProtection());
app.use('/api/v2/addons', csrfProtection());

// Strict CSRF protection for financial and sensitive operations
app.use('/api/keys', csrfProtection({ strict: true }));

// Load remaining routes with error handling and logging
secureLogger.info('Loading other routes');
try {
  
  // API keys: v2 only at /api/v2/auth/keys (auth module)

  // Legacy route mounts disabled (v2-only mode for migration testing).
  // app.use('/admin', adminLimiter, require('./routes/admin'));
  
  // Legacy users routes disabled. Use v2 at /api/v2/users.
  // app.use('/users', csrfProtection(), require('./routes/users'));
  
  // app.use('/products', require('./routes/products'));
  
  // app.use('/api/curated', require('./routes/curated'));
  
  // Categories - now handled by v2 catalog module at /api/v2/catalog/categories
  
  // app.use('/', require('./routes/policies'));
  
  // app.use('/cart', require('./routes/carts'));
  
  // const checkoutRouter = require('./routes/checkout');
  // app.use('/checkout', (req, res, next) => {
  //   if (req.path === '/orders/my') {
  //     return next();
  //   }
  //   return paymentLimiter(req, res, next);
  // }, checkoutRouter);
  
  // app.use('/vendor', require('./routes/vendor'));
  
  // app.use('/admin', adminLimiter, require('./routes/admin-financial'));
  
  // app.use('/api/admin/marketplace', adminLimiter, require('./routes/admin-marketplace'));
  
  // app.use('/api/admin/verified', adminLimiter, require('./routes/admin-verified'));
  
  // app.use('/api/vendor-financials', require('./routes/vendor-financials'));
  
  // Finance operations migrated to /api/v2/finances (modules/finances)
  
  // app.use('/api/leo', require('./routes/leo'));
  
  // app.use('/api/shipping', csrfProtection(), require('./routes/shipping'));
  
  // app.use('/api', require('./routes/payment-methods'));
  
  // app.use('/api/subscriptions/shipping', require('./routes/subscriptions/shipping'));
  // app.use('/api/subscriptions/shipping_labels', require('./routes/subscriptions/shipping'));
  
  // Websites subscription: v2 only at /api/v2/websites (legacy /api/subscriptions/sites|websites removed)

  // app.use('/api/subscriptions/marketplace', require('./routes/subscriptions/marketplace'));
  
  // app.use('/api/subscriptions/verified', require('./routes/subscriptions/verified'));
  
  // app.use('/api/subscriptions/wholesale', require('./routes/subscriptions/wholesale'));
  
  // app.use('/api/tiktok', require('./routes/tiktok'));
  
  // app.use('/api/walmart', require('./routes/walmart'));
  
  // app.use('/api/artist-contact', require('./routes/artist-contact'));
  // app.use('/api/applications', require('./routes/applications'));
  
  // app.use('/api/promoters', require('./routes/promoter-claim'));
  
  // app.use('/api/series', require('./routes/series'));
  
  // app.use('/api/dashboard-widgets', require('./routes/dashboard-widgets'));
  
  // app.use('/api/jury-packets', require('./routes/jury-packets'));
  
  // app.use('/api/personas', require('./routes/personas'));
  
  // app.use('/csv', require('./routes/csv'));
  
  // Media: served by v2 module at /api/v2/media and /api/media (see above)
  
  // Serve temp images directly (fallback when processing fails/pending)
  app.use('/temp_images', express.static(path.join(__dirname, '../temp_images')));
  

  
  // app.use('/api/articles', require('./routes/articles'));
  
  // Sites management - LEGACY DISABLED, now using /api/v2/websites
  // app.use('/api/sites', require('./routes/sites'));
  
  // Custom domain management - LEGACY DISABLED, now using /api/v2/websites/domains
  // app.use('/api/domains', csrfProtection(), require('./routes/domains'));
  
  // app.use('/api/terms', require('./routes/terms'));
  
  // Announcements: now using v2 at /api/v2/system/announcements (legacy route removed)
  
  // app.use('/dashboard', require('./routes/dashboard'));
  
  // app.use('/emails', require('./routes/emails'));
  
  // app.use('/api/addons', require('./routes/addons'));
  
  // app.use('/inventory', csrfProtection(), require('./routes/inventory'));

  // app.use('/api/returns', csrfProtection(), require('./routes/returns'));

  // app.use('/api/reviews', csrfProtection(), require('./routes/reviews'));

  // app.use('/api/tickets', csrfProtection(), require('./routes/tickets'));

  // Shared Library file uploads (with CSRF protection)
  app.use('/files', csrfProtection(), require('./legacy-routes/file-uploads'));

  // Affiliate program management
  app.use('/api/affiliates', csrfProtection(), require('./legacy-routes/affiliates'));

  // Site credits & gift cards
  app.use('/api/credits', csrfProtection(), require('./legacy-routes/credits'));

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