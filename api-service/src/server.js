require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const path = require('path');
const mysql = require('mysql2/promise');
const cors = require('cors');
const { pool } = require('./middleware/db');
const { verifyToken, verifyApiToken } = require('./middleware/auth');

// Configuration from environment variables
const API_VERSION = process.env.API_VERSION || '1.0.0';
const API_INSTANCE = process.env.API_INSTANCE || '0';

// Initialize app
const app = express();

// Trust proxy settings (for Nginx)
app.set('trust proxy', 1); // Trust first proxy

// Configure CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'https://main.onlineartfestival.com',
      'http://localhost:3000',
      'https://onlineartfestival.com'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept', 'x-forwarded-for', 'x-forwarded-proto', 'x-forwarded-host'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

// Debug CORS
app.use((req, res, next) => {
  console.log('CORS Debug:', {
    origin: req.headers.origin,
    method: req.method,
    path: req.path,
    headers: req.headers
  });
  next();
});

// Handle preflight requests
app.options('*', cors(corsOptions));

// Apply CORS to all routes
app.use(cors(corsOptions));

// Add database to request object
app.use((req, res, next) => {
  req.db = pool;
  next();
});

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
    version: API_VERSION,
    instance: API_INSTANCE,
    docs: '/v1'
  });
});

// Import routes
const usersRouter = require('./routes/api/users');
const tokensRouter = require('./routes/api/tokens');
const profilesRouter = require('./routes/api/profiles');

// Mount routes with /v1 prefix
app.use('/v1/users', verifyApiToken, usersRouter);
app.use('/v1/tokens', verifyToken, tokensRouter);
app.use('/v1/user', verifyApiToken, profilesRouter);

// Export the app and pool for use in other files
module.exports = { app, pool };

// Start the server if this file is run directly
if (require.main === module) {
  const port = process.env.API_GATEWAY_PORT || 3001;
  app.listen(port, () => {
    console.log(`API Gateway listening on port ${port}`);
    console.log(`API Version: ${API_VERSION}`);
    console.log(`API Instance: ${API_INSTANCE}`);
  });
} 