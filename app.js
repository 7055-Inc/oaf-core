console.log('Starting app.js...');

// Load environment variables
require('dotenv').config();
console.log('Environment variables loaded');

console.log('Loading express...');
const express = require('express');
console.log('Express loaded');

console.log('Loading session...');
const session = require('express-session');
console.log('Session loaded');

console.log('Loading express-mysql-session...');
const MySQLStore = require('express-mysql-session')(session);
console.log('Express-mysql-session loaded');

console.log('Loading mysql2/promise...');
const mysql = require('mysql2/promise'); // Switch to Promise version
console.log('mysql2/promise loaded');

console.log('Loading bcryptjs...');
const bcrypt = require('bcryptjs');
console.log('bcryptjs loaded');

console.log('Loading crypto...');
const crypto = require('crypto');
console.log('crypto loaded');

console.log('Loading path...');
const path = require('path');
console.log('path loaded');

console.log('Loading cookie-parser...');
const cookieParser = require('cookie-parser');
console.log('cookie-parser loaded');

const app = express();
const port = 3000;

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

const db = mysql.createPool(dbConfig);
console.log('DB Pool Config:', dbConfig);

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(middleware.coopHeaders);

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

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

app.use(middleware.dbConnectionMonitor);

app.use('/media', express.static(process.env.NODE_ENV === 'production' ? '/var/www/main/media' : path.join(__dirname, 'media')));
app.use('/tmp', express.static(process.env.NODE_ENV === 'production' ? '/var/www/main/tmp' : path.join(__dirname, 'tmp')));

// Import routes
console.log('Loading apiRoutes...');
const apiRoutes = require('./routes/api');
console.log('Loading authRoutes...');
const authRoutes = require('./routes/auth').initialize(db);
console.log('Loading registrationModule...');
const registrationModule = require('./routes/registration');
console.log('Loading productRoutes...');
const productRoutes = require('./routes/product-routes');
console.log('Loading shippingRoutes...');
const shippingRoutes = require('./routes/shipping');
console.log('Loading mailRoutes...');
const mailRoutes = require('./routes/mail');
console.log('Loading mediaProxyRoutes...');
const mediaProxyRoutes = require('./routes/media-proxy-routes');
const { initialize: initializeEmailRoutes } = require('./routes/email-routes');

// Use routes
app.use('/api', apiRoutes);
app.use('/', authRoutes);  // Mount at root level to match redirect URI
app.use('/users/register', registrationModule.initialize(db));
app.use('/api/products', productRoutes);
app.use('/api/vendor/products', productRoutes);
app.use('/shipping', shippingRoutes);
app.use('/mail', mailRoutes);
app.use('/api/media-vm', mediaProxyRoutes);

// Initialize routes
const registrationRoutes = registrationModule.initialize(db);
const emailRoutes = initializeEmailRoutes(db);

// Use routes
app.use('/api/registration', registrationRoutes);
app.use('/api', emailRoutes);

console.log("Auth routes mounted");

app.get('/api/email-preferences', (req, res) => {
  if (!req.session.user) return res.status(403).json({ error: 'Unauthorized' });
  res.json({ message: 'Email preferences placeholder' });
});

app.post('/api/email-preferences', (req, res) => {
  if (!req.session.user) return res.status(403).json({ error: 'Unauthorized' });
  res.json({ message: 'Email preferences update placeholder' });
});

app.post('/api/draft-login', (req, res) => {
  const { username, password } = req.body;
  console.log('Draft login request:', { username });
  if (!req.session.registration || req.session.registration.username !== username) {
    return res.status(401).json({ error: 'No draft found for this username' });
  }
  if (req.session.registration.password !== password) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  console.log('Draft login successful:', username);
  res.json({ success: true });
});

app.get('/api/permissions', (req, res, next) => {
  middleware.safeQuery(
    'SELECT u.id, u.username, u.user_type, p.profile_access, p.marketplace_vendor, p.gallery_access, p.is_admin, p.is_artist, p.is_promoter, p.is_customer, p.is_community, p.is_verified FROM users u LEFT JOIN permissions p ON u.id = p.user_id', 
    [], 
    (err, results) => {
      if (err) return next(err);
      res.json(results);
    }
  );
});

app.post('/api/permissions/update', (req, res, next) => {
  const { username, profile_access, marketplace_vendor, gallery_access, is_admin, is_artist, is_promoter, is_customer, is_community, is_verified, reason } = req.body;
  const adminId = req.session.user?.id;
  if (!adminId) return res.status(403).json({ error: 'Unauthorized' });

  const sql = `
    INSERT INTO permissions (user_id, profile_access, marketplace_vendor, gallery_access, is_admin, is_artist, is_promoter, is_customer, is_community, is_verified)
    VALUES ((SELECT id FROM users WHERE username = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      profile_access = ?, marketplace_vendor = ?, gallery_access = ?, 
      is_admin = ?, is_artist = ?, is_promoter = ?, is_customer = ?, is_community = ?, is_verified = ?`;
  const values = [
    username,
    profile_access ? 'yes' : 'no', marketplace_vendor ? 'yes' : 'no', gallery_access ? 'yes' : 'no',
    is_admin ? 'yes' : 'no', is_artist ? 'yes' : 'no', is_promoter ? 'yes' : 'no', is_customer ? 'yes' : 'no', is_community ? 'yes' : 'no', is_verified ? 'yes' : 'no',
    profile_access ? 'yes' : 'no', marketplace_vendor ? 'yes' : 'no', gallery_access ? 'yes' : 'no',
    is_admin ? 'yes' : 'no', is_artist ? 'yes' : 'no', is_promoter ? 'yes' : 'no', is_customer ? 'yes' : 'no', is_community ? 'yes' : 'no', is_verified ? 'yes' : 'no'
  ];

  middleware.safeQuery(sql, values, (err, result) => {
    if (err) return next(err);
    
    middleware.safeQuery('SELECT id FROM users WHERE username = ?', [username], (e, r) => {
      if (e) return next(e);
      
      const userId = result.insertId || r[0].id;
      const changes = JSON.stringify({
        profile_access, marketplace_vendor, gallery_access, is_admin, is_artist, is_promoter, is_customer, is_community, is_verified
      });
      
      middleware.safeQuery(
        'INSERT INTO permissions_log (permission_id, user_id_changed, changed_by, what_changed, from_where, reason) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, userId, adminId, changes, req.ip, reason],
        (err) => {
          if (err) return next(err);
          res.json({ success: true });
        }
      );
    });
  });
});

app.get('/api/verify/:token', middleware.asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  
  try {
    // Get token info
    const [tokenResults] = await db.query('SELECT user_id, expires_at FROM email_verification_tokens WHERE token = ?', [token]);
    
    if (!tokenResults || tokenResults.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    const { user_id, expires_at } = tokenResults[0];
    if (new Date(expires_at) < new Date()) {
      return res.status(400).json({ error: 'Token expired' });
    }
    
    // Check if user is already verified
    const [userResults] = await db.query('SELECT email_verified FROM users WHERE id = ?', [user_id]);
    const isAlreadyVerified = userResults[0]?.email_verified === 'yes';
    
    if (!isAlreadyVerified) {
      // Update verification status
      await db.query('UPDATE users SET email_verified = ? WHERE id = ?', ['yes', user_id]);
      await db.query('UPDATE permissions SET is_verified = ? WHERE user_id = ?', ['yes', user_id]);
    }
    
    // Clean up token regardless of verification status
    await db.query('DELETE FROM email_verification_tokens WHERE token = ?', [token]);
    
    // Redirect to the verify step in registration
    res.redirect('/register/verify');
    
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Failed to verify email. Please try again.' });
  }
}));

app.get('/api/test-direct', (req, res) => {
  res.json({ message: 'Direct route works' });
});

app.get('/direct-test', (req, res) => {
  console.log("Direct test route accessed!");
  res.send('Direct route works!');
});

// Static files middleware - moved after all API routes
app.use(express.static(path.join(__dirname, 'client', 'build')));

app.use('/api', middleware.notFoundHandler);
app.use(middleware.errorHandler);

function checkDbConnection() {
  db.getConnection().then((connection) => {
    console.log('DB health check succeeded');
    connection.release();
  }).catch((err) => {
    console.error('DB health check failed:', err);
  });
}

setInterval(checkDbConnection, 60000);

console.log("==== REGISTERED ROUTES ====");
app._router.stack.forEach(r => {
  if (r.route && r.route.path) {
    console.log(`${Object.keys(r.route.methods)} ${r.route.path}`);
  } else if (r.name === 'router') {
    console.log(`\nROUTER: ${r.regexp}`);
    r.handle.stack.forEach(route => {
      if (route.route) {
        console.log(`  ${Object.keys(route.route.methods)} ${route.route.path}`);
      }
    });
  }
});

console.log("Starting application...");
console.log("Application starting, working directory:", process.cwd());

sessionStore.on('error', (error) => {
  console.error('Session Store Error:', error);
});

app.listen(port, () => console.log(`Server running on port ${port}`));