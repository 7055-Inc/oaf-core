/**
 * Leo AI Platform Server
 * Named after Leonardo da Vinci - Master of Art and Innovation
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'leo-ai-platform',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Import routes and manager
const vectorRoutes = require('./api/vectorRoutes');
const learningRoutes = require('./api/learningRoutes');
const LeoManager = require('./utils/leoManager');

// API routes
app.get('/api/status', (req, res) => {
  res.json({
    message: '🎨 Leo AI Platform is running',
    service: 'leo-ai-platform',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Vector database routes
app.use('/api/vector', vectorRoutes);

// AI Learning system routes
app.use('/api/learning', learningRoutes);

// Initialize Leo Manager
const leoManager = new LeoManager();

// Management endpoints
app.get('/api/system/health', async (req, res) => {
  try {
    const health = await leoManager.getSystemHealth();
    const statusCode = health.overall === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    res.status(500).json({
      overall: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/system/status', async (req, res) => {
  try {
    const report = await leoManager.generateStatusReport();
    res.json(report);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate status report',
      message: error.message
    });
  }
});

app.post('/api/system/initialize', async (req, res) => {
  try {
    const result = await leoManager.initialize();
    res.json({
      success: true,
      message: '🎨 Leo AI Platform initialized successfully',
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Initialization failed',
      message: error.message
    });
  }
});

app.post('/api/system/ingest', async (req, res) => {
  try {
    const result = await leoManager.runInitialIngestion();
    res.json({
      success: true,
      message: 'Data ingestion completed',
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Ingestion failed',
      message: error.message
    });
  }
});

app.post('/api/system/test', async (req, res) => {
  try {
    const results = await leoManager.runSystemTest();
    const statusCode = results.overall ? 200 : 503;
    res.status(statusCode).json({
      success: results.overall,
      message: results.overall ? 'All systems operational' : 'Some systems failed',
      results
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'System test failed',
      message: error.message
    });
  }
});

// Scraper endpoint (placeholder for now)
app.post('/api/scraper/run', (req, res) => {
  console.log('🎨 [LEO] Scraper run requested');
  res.json({
    success: true,
    message: 'Leo AI scraper initiated',
    timestamp: new Date().toISOString()
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('🎨 [LEO] Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    service: 'leo-ai-platform'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    service: 'leo-ai-platform'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎨 [LEO] AI Platform running on port ${PORT}`);
  console.log(`🎨 [LEO] Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🎨 [LEO] Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🎨 [LEO] Received SIGINT, shutting down gracefully');
  process.exit(0);
});
