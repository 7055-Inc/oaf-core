const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('config');
const rateLimit = require('express-rate-limit');

// Routes
const testRoutes = require('./routes/test');

// Initialize app
const app = express();

// Trust proxy settings (for Nginx)
app.set('trust proxy', true);

// Apply security middleware
app.use(helmet());

// Parse JSON
app.use(express.json());

// Request logging
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.get('security.rateLimits.windowMs'),
  max: config.get('security.rateLimits.max'),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Routes
app.use('/api/v1/test', testRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: {
      code: 'server_error',
      message: 'An unexpected error occurred',
    }
  });
});

// Start server
const PORT = config.get('server.port');
app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
});

module.exports = app; 