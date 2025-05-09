require('dotenv').config();

// Core dependencies
const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const axios = require('axios');
const { coopMiddleware } = require('./server/middleware/security');
const fs = require('fs');
const { verifyToken } = require('./server/middleware/auth');
const getFirebaseAdmin = require('./server/firebase-admin');
const admin = getFirebaseAdmin();

// Initialize app
const app = express();
const port = process.env.PORT || 3000;

// API Gateway URL - use this for all API calls
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api2.onlineartfestival.com' 
  : 'http://localhost:3001';

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000,
  maxIdle: 5,
  idleTimeout: 60000,
};

// Create a DB pool only for session storage in the web app
const db = mysql.createPool(dbConfig);
console.log('DB Pool Config:', dbConfig);

// Add middleware to attach database to request
app.use((req, res, next) => {
  req.db = db;
  next();
});

console.log('Before loading middleware...');
let middleware;
try {
  middleware = require('./server/middleware');
  console.log('Middleware loaded successfully:', Object.keys(middleware));
} catch (err) {
  console.error('Error loading middleware:', err);
  throw err;
}
console.log('Before initializing middleware with db...');
middleware.initializeDb(db);
console.log('Middleware initialized with db');

const sessionStoreConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

const sessionStore = new MySQLStore(sessionStoreConfig);
console.log('Session Store Config:', sessionStoreConfig);

db.getConnection().then((connection) => {
  console.log('DB Connection Test Succeeded');
  connection.release();
}).catch((err) => {
  console.error('DB Connection Test Failed:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
});

// Basic middleware that should come first
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Add COOP middleware before other routes
app.use(coopMiddleware);

// Session middleware (needs to come before static files)
app.use(session({
  key: 'session_cookie_name',
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

// Serve static assets directly
app.use('/media', express.static(path.join(__dirname, 'media')));
app.use('/tmp', express.static(path.join(__dirname, 'tmp')));

// Add API proxy middleware
app.use('/api', async (req, res, next) => {
  try {
    const response = await axios({
      method: req.method,
      url: `${API_URL}${req.path}`,
      data: req.body,
      headers: {
        ...req.headers,
        'x-forwarded-for': req.ip,
        'x-forwarded-proto': req.protocol,
        'x-forwarded-host': req.get('host')
      },
      validateStatus: () => true // Accept all status codes
    });
    
    // Forward the response
    res.status(response.status).send(response.data);
  } catch (error) {
    console.error('API Proxy Error:', error);
    res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
});

// Serve static files from the React app
const staticPath = path.join(__dirname, 'client/build');
console.log('Static file path:', staticPath);
console.log('Directory exists:', fs.existsSync(staticPath));
console.log('Directory contents:', fs.readdirSync(staticPath));
app.use(express.static(staticPath));

// Handle React routing, return all requests to React app
app.get('*', function(req, res) {
  const indexPath = path.join(staticPath, 'index.html');
  console.log('Attempting to serve index.html from:', indexPath);
  console.log('File exists:', fs.existsSync(indexPath));
  res.sendFile(indexPath, function(err) {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).send('Error loading page');
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({ 
    error: 'Server Error',
    message: err.message 
  });
});

function checkDbConnection() {
  db.getConnection().then((connection) => {
    console.log('DB health check succeeded');
    connection.release();
  }).catch((err) => {
    console.error('DB health check failed:', err);
  });
}

setInterval(checkDbConnection, 60000);

console.log("Starting application...");
console.log("Application starting, working directory:", process.cwd());

sessionStore.on('error', (error) => {
  console.error('Session Store Error:', error);
});

// Export the app for use in other files
module.exports = app;