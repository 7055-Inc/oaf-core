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
const admin = require('./server/firebase-admin');
const { coopMiddleware } = require('./server/middleware/security');

// Initialize app
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

// Serve static files and React app
if (process.env.NODE_ENV === 'production') {
  console.log('Serving static client files from client/build');
  app.use(express.static(path.join(__dirname, 'client/build')));
}

// Other middleware that should come after static files
app.use(middleware.dbConnectionMonitor);

app.use('/media', express.static(process.env.NODE_ENV === 'production' ? '/var/www/main/media' : path.join(__dirname, 'media')));
app.use('/tmp', express.static(process.env.NODE_ENV === 'production' ? '/var/www/main/tmp' : path.join(__dirname, 'tmp')));

// Import routes
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
console.log('Loading checklistRoutes...');
const usersModule = require('./server/routes/api/users');
const { initialize: initializeEmailRoutes } = require('./routes/email-routes');

// Import verifyToken middleware
const { verifyToken } = require('./server/middleware/auth');

// API Routes - these should come before the catch-all route
app.use('/api/products', productRoutes);
app.use('/api/vendor/products', productRoutes);
app.use('/shipping', shippingRoutes);
app.use('/mail', mailRoutes);
app.use('/api/media-vm', mediaProxyRoutes);

// Mount the API routes from server/api.js
const apiApp = require('./server/api');
app.use('/v1', apiApp);

// Mount the user routes
app.use('/v1', usersModule.router);

// Initialize routes with database connection
const registrationRoutes = registrationModule.initialize(db);
const emailRoutes = initializeEmailRoutes(db);

// Session check endpoint
app.all('/v1/auth/session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.json({ 
        isLoggedIn: false, 
        user: null 
      });
    }

    const idToken = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    if (decodedToken) {
      res.json({ 
        isLoggedIn: true, 
        user: {
          uid: decodedToken.uid,
          email: decodedToken.email,
          name: decodedToken.name
        }
      });
    } else {
      res.json({ 
        isLoggedIn: false, 
        user: null 
      });
    }
  } catch (error) {
    console.error('Session check error:', error);
    res.json({ 
      isLoggedIn: false, 
      user: null,
      error: error.message 
    });
  }
});

app.get('/api/email-preferences', (req, res) => {
  res.json({ message: 'Email preferences placeholder' });
});

app.post('/api/email-preferences', (req, res) => {
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

app.get('/api/v1/permissions', (req, res, next) => {
  middleware.safeQuery(
    'SELECT u.id, u.username, u.user_type, p.profile_access, p.marketplace_vendor, p.gallery_access, p.is_admin, p.is_artist, p.is_promoter, p.is_customer, p.is_community, p.is_verified FROM users u LEFT JOIN permissions p ON u.id = p.user_id', 
    [], 
    (err, results) => {
      if (err) return next(err);
      res.json(results);
    }
  );
});

app.post('/api/v1/permissions/update', (req, res, next) => {
  const { userId, permission, value, reason } = req.body;
  const adminId = 1; // Just use a placeholder admin ID
  
  const sql = `
    INSERT INTO permissions (user_id, profile_access, marketplace_vendor, gallery_access, is_admin, is_artist, is_promoter, is_customer, is_community, is_verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    profile_access = VALUES(profile_access),
    marketplace_vendor = VALUES(marketplace_vendor),
    gallery_access = VALUES(gallery_access),
    is_admin = VALUES(is_admin),
    is_artist = VALUES(is_artist),
    is_promoter = VALUES(is_promoter),
    is_customer = VALUES(is_customer),
    is_community = VALUES(is_community),
    is_verified = VALUES(is_verified)
  `;
  
  const values = [
    userId,
    permission === 'profile_access' ? value : 0,
    permission === 'marketplace_vendor' ? value : 0,
    permission === 'gallery_access' ? value : 0,
    permission === 'is_admin' ? value : 0,
    permission === 'is_artist' ? value : 0,
    permission === 'is_promoter' ? value : 0,
    permission === 'is_customer' ? value : 0,
    permission === 'is_community' ? value : 0,
    permission === 'is_verified' ? value : 0
  ];
  
  middleware.safeQuery(sql, values, (err, result) => {
    if (err) return next(err);
    
    // Log the permission change
    const logSql = 'INSERT INTO permission_logs (user_id, admin_id, permission, new_value, reason) VALUES (?, ?, ?, ?, ?)';
    middleware.safeQuery(logSql, [userId, adminId, permission, value, reason], (err) => {
      if (err) return next(err);
      res.json({ success: true });
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

// Password authentication
app.post('/api/v1/auth/password', async (req, res) => {
  try {
    const { email, password } = req.body;
    const userCredential = await admin.auth().getUserByEmail(email);
    const user = userCredential.toJSON();
    
    // Set session
    req.session.user = {
      id: user.uid,
      email: user.email
    };
    
    res.json({ success: true });
  } catch (error) {
    console.error('Password auth error:', error);
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Google authentication
app.get('/api/v1/auth/google', (req, res) => {
  const authUrl = admin.auth().generateSignInWithGoogleLink({
    requestUri: `${req.protocol}://${req.get('host')}/auth/google/callback`,
    clientId: process.env.GOOGLE_CLIENT_ID
  });
  
  res.json({ url: authUrl });
});

// Verify token endpoint
app.post('/api/v1/auth/verify', verifyToken, (req, res) => {
  res.status(200).json({ 
    uid: req.user.uid,
    message: 'Token verified successfully' 
  });
});

// Cart routes
app.get('/v1/cart', async (req, res) => {
  try {
    const [cart] = await db.query(`
      SELECT c.*, p.name, p.price, p.image_url, p.stock_available
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `, [req.user.id]);
    res.json(cart);
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: 'Failed to fetch cart' });
  }
});

app.patch('/v1/cart/items/:itemId', async (req, res) => {
  try {
    const { quantity } = req.body;
    await db.query(`
      UPDATE cart 
      SET quantity = ?
      WHERE id = ? AND user_id = ?
    `, [quantity, req.params.itemId, req.user.id]);
    
    const [updatedCart] = await db.query(`
      SELECT c.*, p.name, p.price, p.image_url, p.stock_available
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `, [req.user.id]);
    
    res.json(updatedCart);
  } catch (error) {
    console.error('Error updating cart item:', error);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

app.delete('/v1/cart/items/:itemId', async (req, res) => {
  try {
    await db.query(`
      DELETE FROM cart 
      WHERE id = ? AND user_id = ?
    `, [req.params.itemId, req.user.id]);
    
    const [updatedCart] = await db.query(`
      SELECT c.*, p.name, p.price, p.image_url, p.stock_available
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `, [req.user.id]);
    
    res.json(updatedCart);
  } catch (error) {
    console.error('Error removing cart item:', error);
    res.status(500).json({ error: 'Failed to remove cart item' });
  }
});

app.patch('/v1/cart/items/:itemId/save', async (req, res) => {
  try {
    await db.query(`
      UPDATE cart 
      SET saved_for_later = true
      WHERE id = ? AND user_id = ?
    `, [req.params.itemId, req.user.id]);
    
    const [updatedCart] = await db.query(`
      SELECT c.*, p.name, p.price, p.image_url, p.stock_available
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `, [req.user.id]);
    
    res.json(updatedCart);
  } catch (error) {
    console.error('Error saving cart item:', error);
    res.status(500).json({ error: 'Failed to save cart item' });
  }
});

app.patch('/v1/cart/items/:itemId/move-to-cart', async (req, res) => {
  try {
    await db.query(`
      UPDATE cart 
      SET saved_for_later = false
      WHERE id = ? AND user_id = ?
    `, [req.params.itemId, req.user.id]);
    
    const [updatedCart] = await db.query(`
      SELECT c.*, p.name, p.price, p.image_url, p.stock_available
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `, [req.user.id]);
    
    res.json(updatedCart);
  } catch (error) {
    console.error('Error moving cart item:', error);
    res.status(500).json({ error: 'Failed to move cart item' });
  }
});

app.patch('/v1/cart/vendor/:vendorId/shipping', async (req, res) => {
  try {
    const { shippingMethod } = req.body;
    await db.query(`
      UPDATE cart 
      SET shipping_method = ?
      WHERE vendor_id = ? AND user_id = ?
    `, [shippingMethod, req.params.vendorId, req.user.id]);
    
    const [updatedCart] = await db.query(`
      SELECT c.*, p.name, p.price, p.image_url, p.stock_available
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `, [req.user.id]);
    
    res.json(updatedCart);
  } catch (error) {
    console.error('Error updating shipping:', error);
    res.status(500).json({ error: 'Failed to update shipping' });
  }
});

app.post('/v1/cart/coupons', async (req, res) => {
  try {
    const { couponCode } = req.body;
    const [coupon] = await db.query(`
      SELECT * FROM coupons 
      WHERE code = ? AND valid_until > NOW()
    `, [couponCode]);
    
    if (!coupon) {
      return res.status(400).json({ error: 'Invalid or expired coupon' });
    }
    
    await db.query(`
      INSERT INTO cart_coupons (cart_id, coupon_id)
      VALUES (?, ?)
    `, [req.user.id, coupon.id]);
    
    const [updatedCart] = await db.query(`
      SELECT c.*, p.name, p.price, p.image_url, p.stock_available
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `, [req.user.id]);
    
    res.json(updatedCart);
  } catch (error) {
    console.error('Error applying coupon:', error);
    res.status(500).json({ error: 'Failed to apply coupon' });
  }
});

app.delete('/v1/cart/coupons/:couponId', async (req, res) => {
  try {
    await db.query(`
      DELETE FROM cart_coupons 
      WHERE cart_id = ? AND coupon_id = ?
    `, [req.user.id, req.params.couponId]);
    
    const [updatedCart] = await db.query(`
      SELECT c.*, p.name, p.price, p.image_url, p.stock_available
      FROM cart c
      JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
    `, [req.user.id]);
    
    res.json(updatedCart);
  } catch (error) {
    console.error('Error removing coupon:', error);
    res.status(500).json({ error: 'Failed to remove coupon' });
  }
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

// React routing - catch all routes should be LAST
app.get('*', (req, res) => {
  console.log('Root route accessed');
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

// Export the app for use in other files
module.exports = app;