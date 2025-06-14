require('dotenv').config({ path: '/var/www/main/api-service/.env' });
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();

// Log environment variables for debugging (excluding sensitive ones)
console.log('[Server] Environment Variables:', {
  API_GATEWAY_PORT: process.env.API_GATEWAY_PORT,
  API_VERSION: process.env.API_VERSION,
  API_INSTANCE: process.env.API_INSTANCE
});

// Manual CORS middleware - moved to top
app.use((req, res, next) => {
  console.log(`[Request] ${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  const allowedOrigins = [
    'https://main.onlineartfestival.com',
    'https://api2.onlineartfestival.com'
  ];
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    console.log('[CORS] Handling OPTIONS request');
    res.status(204).end();
    return;
  }
  console.log(`[After CORS] Headers: ${JSON.stringify(res.getHeaders())}`);
  next();
});

// Handle JSON parsing errors
app.use(express.json(), (err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.error('[Server] JSON parsing error:', err.message, 'Body:', req.body);
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  next();
});

// Serve static files from temp_images
app.use('/temp_images', express.static('/var/www/main/api-service/temp_images'));

// Load routes with error handling and logging
console.log('[Server] Loading routes...');
try {
  console.log('[Server] Loading /auth route');
  app.use('/auth', require('./routes/auth'));
  console.log('[Server] Loading /api-keys route');
  app.use('/api-keys', require('./routes/api-keys'));
  console.log('[Server] Loading /admin route');
  app.use('/admin', require('./routes/admin'));
  console.log('[Server] Loading /users route');
  app.use('/users', require('./routes/users'));
  console.log('[Server] Loading /products route');
  app.use('/products', require('./routes/products'));
  console.log('[Server] Loading /cart route');
  app.use('/cart', require('./routes/carts'));
  console.log('[Server] Loading /checkout route');
  app.use('/checkout', require('./routes/checkout'));
  console.log('[Server] Loading /webhooks route');
  app.use('/webhooks', require('./routes/webhooks/stripe'));
  console.log('[Server] Loading /vendor route');
  app.use('/vendor', require('./routes/vendor'));
  console.log('[Server] Loading /admin route (financial)');
  app.use('/admin', require('./routes/admin-financial'));
} catch (err) {
  console.error('[Server] Error loading routes:', err.message, err.stack);
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
  console.log(`> API running on http://api2.onlineartfestival.com:${port}`);
});