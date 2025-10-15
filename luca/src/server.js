#!/usr/bin/env node

/**
 * Luca - Product Costing & Marketplace Optimization Platform
 * Named after Luca Pacioli, Leonardo da Vinci's collaborator who invented double-entry bookkeeping
 */

require('dotenv').config({ path: '/var/www/main/luca/.env' });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { testConnection, initializeDatabase } = require('./config/database');
const { createDashboard } = require('./views/index');
const { createMaterialsPage } = require('./views/materials');
const { createCatalogPage } = require('./views/catalog');
const { createProductsPage } = require('./views/products');
const { createShippingPage } = require('./views/shipping');
const { createSettingsPage } = require('./views/settings');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3004;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // We'll configure this later
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://imadesomestuff.com', 'https://www.imadesomestuff.com']
    : ['http://localhost:3004', 'http://127.0.0.1:3004'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/static', express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'luca-costing-platform',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    service: 'Luca Product Costing Platform',
    description: 'Leonardo & Luca are back together - Art meets Accounting!',
    status: 'operational',
    features: [
      'Material Cost Management',
      'Recipe & Batch Calculations', 
      'Catalog Core Management',
      'Multi-Marketplace Optimization (Coming Soon)'
    ],
    timestamp: new Date().toISOString()
  });
});

// Database test endpoint
app.get('/api/database/test', async (req, res) => {
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      res.json({
        status: 'success',
        message: 'Database connection successful',
        database: 'luca (local MySQL)',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Database connection failed',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Database test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Main application page
app.get('/', (req, res) => {
  res.send(createDashboard());
});

// Materials page
app.get('/costing/materials', (req, res) => {
  res.send(createMaterialsPage());
});

// Catalog page
app.get('/catalog', (req, res) => {
  res.send(createCatalogPage());
});

// Products page
app.get('/products', (req, res) => {
  res.send(createProductsPage());
});

// Shipping page
app.get('/shipping', (req, res) => {
  res.send(createShippingPage());
});

// Placeholder routes for navigation menu
const createPlaceholderPage = (title, description) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title} - Luca Platform</title>
        <link rel="stylesheet" href="/static/css/styles.css">
        <link rel="icon" type="image/png" href="/static/images/luca.png">
    </head>
    <body>
        <!-- Header -->
        <header class="header">
            <div class="header-container">
                <div class="logo-container">
                    <img src="/static/images/luca.png" alt="Luca Logo" class="logo">
                    <a href="/" class="logo-text">Luca</a>
                </div>
                <nav>
                    <ul class="nav-menu">
                        <li><a href="/">Dashboard</a></li>
                        <li><a href="/costing/materials">Costing</a></li>
                        <li><a href="/recipes">Recipes</a></li>
                        <li><a href="/catalog">Catalog</a></li>
                        <li><a href="/marketplace">Marketplace</a></li>
                        <li><a href="/settings">Settings</a></li>
                    </ul>
                </nav>
            </div>
        </header>

        <!-- Main Content -->
        <main class="main-content">
            <div class="content-area">
                <div class="placeholder-content">
                    <h2>🚧 ${title}</h2>
                    <p>${description}</p>
                    <p>This feature is coming soon!</p>
                    <br>
                    <a href="/" style="display: inline-block; padding: 12px 24px; background: #3498db; color: white; text-decoration: none; border-radius: 6px; font-weight: 500;">← Back to Dashboard</a>
                </div>
            </div>
        </main>

        <!-- Footer -->
        <footer class="footer">
            <div class="footer-container">
                <p>&copy; ${new Date().getFullYear()} Luca - Product Costing Platform. All rights reserved.</p>
            </div>
        </footer>

        <script src="/static/js/app.js"></script>
    </body>
    </html>
  `;
};

app.get('/materials', (req, res) => {
  res.send(createPlaceholderPage('Materials Management', 'Manage your material categories, costs per unit, and inventory tracking.'));
});

app.get('/recipes', (req, res) => {
  res.send(createPlaceholderPage('Recipe Builder', 'Create production recipes with material quantities and batch calculations.'));
});

app.get('/catalog', (req, res) => {
  res.send(createPlaceholderPage('Catalog Core', 'Build your internal product catalog with descriptions, images, and cost associations.'));
});

app.get('/marketplace', (req, res) => {
  res.send(createPlaceholderPage('Marketplace Optimization', 'AI-powered listing optimization for Amazon, eBay, and other marketplaces.'));
});

app.get('/settings', (req, res) => {
  res.send(createSettingsPage());
});

// Note: Email invitation system removed - users are now added directly

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    service: 'luca-costing-platform',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    service: 'luca-costing-platform',
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🎨 Luca Platform running on port ${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Ready to calculate costs and optimize marketplaces!`);
});

module.exports = app;
