require('dotenv').config({ path: '/var/www/main/api-service/.env' });
const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { 
  authLimiter, 
  paymentLimiter, 
  apiKeyLimiter, 
  apiLimiter, 
  adminLimiter, 
  uploadLimiter 
} = require('./middleware/rateLimiter');
const { secureLogger, requestLogger } = require('./middleware/secureLogger');
const { 
  csrfTokenProvider, 
  csrfProtection, 
  strictCsrfProtection,
  csrfTokenRoute 
} = require('./middleware/csrfProtection');
const app = express();

// Log startup information (no sensitive data)
secureLogger.info('API Gateway starting', {
  port: process.env.API_GATEWAY_PORT,
  version: process.env.API_VERSION,
  instance: process.env.API_INSTANCE
});

// Manual CORS middleware - moved to top
app.use((req, res, next) => {
  const allowedOrigins = [
    'https://main.onlineartfestival.com',
    'https://api2.onlineartfestival.com'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
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

// Handle JSON parsing errors
app.use(express.json(), (err, req, res, next) => {
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

// Load authentication routes first (no CSRF protection needed for login)
secureLogger.info('Loading authentication routes');
try {
  app.use('/auth', authLimiter, require('./routes/auth'));
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
app.use('/api/topics', csrfProtection());
app.use('/api/series', csrfProtection());
app.use('/api/tags', csrfProtection());
app.use('/api/sites', csrfProtection());
app.use('/api/domains', csrfProtection());
app.use('/api/terms', csrfProtection());
app.use('/api/announcements', csrfProtection());

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
  
  // Product management
  app.use('/products', uploadLimiter, require('./routes/products'));
  
  // Categories (safe for now, mostly read operations)
  app.use('/categories', require('./routes/categories'));
  
  // Cart operations
  app.use('/cart', require('./routes/carts'));
  
  // Checkout and payments (with payment rate limiting)
  app.use('/checkout', paymentLimiter, require('./routes/checkout'));
  
  // Webhooks (no CSRF needed - they have signature validation)
  app.use('/webhooks', require('./routes/webhooks/stripe'));
  
  // Vendor management
  app.use('/vendor', require('./routes/vendor'));
  
  // Admin financial operations
  app.use('/admin', adminLimiter, require('./routes/admin-financial'));
  
  // Search (read-only, no CSRF needed)
  app.use('/search', require('./routes/search'));
  
  // Event management
  app.use('/api/events', require('./routes/events'));
  app.use('/api/event-types', require('./routes/event-types'));
  app.use('/api/applications', require('./routes/applications'));
  app.use('/api/custom-events', require('./routes/custom-events'));
  
  // Articles management - all routes fixed
  app.use('/api/articles', require('./routes/articles'));
  app.use('/api/topics', require('./routes/topics'));
  app.use('/api/series', require('./routes/series'));
  app.use('/api/tags', require('./routes/tags'));
  
  // Sites management (multisite functionality)
  app.use('/api/sites', require('./routes/sites'));
  
  // Custom domain management
  app.use('/api/domains', require('./routes/domains'));
  
  // Terms and conditions management
  app.use('/api/terms', require('./routes/terms'));
  
  // Announcements management
  app.use('/api/announcements', require('./routes/announcements'));
  
  secureLogger.info('All routes loaded successfully with CSRF protection');
} catch (err) {
  secureLogger.error('Error loading routes', err);
  process.exit(1);
}

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: process.env.API_VERSION || '1.0.0', 
    instance: process.env.API_INSTANCE || '0',
    timestamp: new Date().toISOString()
  });
});

const port = process.env.API_GATEWAY_PORT || 3001;
app.listen(port, () => {
  secureLogger.info(`API Gateway running on port ${port}`);
});