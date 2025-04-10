require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const mysql = require('mysql2/promise');
const cors = require('cors');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

// Set config directory to the correct path
process.env.NODE_CONFIG_DIR = path.join(__dirname, '../config');
const config = require('config');
const routes = require('./routes');

// Initialize app
const app = express();

// Trust proxy settings (for Nginx)
app.set('trust proxy', 1); // Trust first proxy

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Database connection
let pool;
(async () => {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    console.log('Database connection pool created successfully');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
})();

// Add database to request object
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Session store configuration
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  clearExpired: true,
  checkExpirationInterval: 900000, // Check every 15 minutes
  expiration: 86400000 // 24 hours
});

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Debug middleware - log all requests
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    headers: req.headers
  });
  next();
});

// Apply security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com", "https://accounts.google.com", "https://www.gstatic.com"],
      'script-src-elem': ["'self'", "'unsafe-inline'", "https://apis.google.com", "https://accounts.google.com", "https://www.gstatic.com"],
      'connect-src': ["'self'", "https://apis.google.com", "https://*.googleapis.com", "https://accounts.google.com", "https://www.googleapis.com"],
      'frame-src': ["'self'", "https://accounts.google.com", "https://apis.google.com", "https://www.gstatic.com"],
      'img-src': ["'self'", "https://*.googleapis.com", "https://*.googleusercontent.com", "data:", "https://www.gstatic.com"],
      'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      'font-src': ["'self'", "https://fonts.gstatic.com"]
    }
  }
}));

// Parse JSON
app.use(express.json());

// Request logging
app.use(morgan('combined'));

// Root route - health check
app.get('/', (req, res) => {
  console.log('Root route hit');
  res.json({
    status: 'ok',
    message: 'API Gateway is running',
    docs: '/v1'
  });
});

// Mount API routes at /v1
app.use('/v1', routes);

// Handle 404s
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: [
      '/',
      '/v1',
      '/v1/session',
      '/v1/logout',
      '/v1/user/profile',
      '/v1/user/profile/update'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error occurred:', err);
  res.status(500).json({
    success: false,
    error: {
      code: err.code || 'server_error',
      message: err.message || 'An unexpected error occurred',
    }
  });
});

// Start the server
const port = process.env.API_GATEWAY_PORT || 3001;
app.listen(port, '0.0.0.0', () => {
  console.log(`API Gateway server running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Database host: ${process.env.DB_HOST}`);
  console.log(`Client URL: ${process.env.CLIENT_URL}`);
}).on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

// Export the app for use in other files
module.exports = app; 