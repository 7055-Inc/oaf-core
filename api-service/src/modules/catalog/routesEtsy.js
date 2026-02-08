/**
 * Etsy Connector Routes (v2)
 * RESTful endpoints under /api/v2/catalog/etsy
 * OAuth-only integration (no corporate catalog)
 * Follows TikTok OAuth pattern
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../auth/middleware');
const etsyService = require('./services/etsy');

// ============================================
// OAUTH ROUTES
// ============================================

/**
 * GET /api/v2/catalog/etsy/oauth/authorize
 * Generate Etsy OAuth authorization URL with PKCE
 */
router.get('/oauth/authorize', requireAuth, async (req, res) => {
  try {
    const authUrl = etsyService.oauthAuthorize(req.userId);
    return res.json({ success: true, authUrl });
  } catch (error) {
    console.error('Etsy OAuth authorize error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to generate authorization URL' });
  }
});

/**
 * GET /api/v2/catalog/etsy/oauth/callback
 * Handle OAuth callback from Etsy
 * Exchange authorization code for access token
 */
router.get('/oauth/callback', async (req, res) => {
  const { code, state, error } = req.query;
  
  // Handle OAuth errors
  if (error) {
    console.error('Etsy OAuth error:', error);
    return res.redirect(`${process.env.FRONTEND_URL}/catalog?etsy_error=${encodeURIComponent(error)}`);
  }
  
  if (!code || !state) {
    return res.redirect(`${process.env.FRONTEND_URL}/catalog?etsy_error=missing_parameters`);
  }
  
  try {
    const result = await etsyService.handleOAuthCallback(code, state);
    
    // Redirect to frontend with success
    const successMessage = encodeURIComponent(result.message);
    return res.redirect(`${process.env.FRONTEND_URL}/catalog?etsy_success=${successMessage}`);
  } catch (error) {
    console.error('Etsy OAuth callback error:', error.message);
    const errorMessage = encodeURIComponent(error.message);
    return res.redirect(`${process.env.FRONTEND_URL}/catalog?etsy_error=${errorMessage}`);
  }
});

// ============================================
// SHOP ROUTES
// ============================================

/**
 * GET /api/v2/catalog/etsy/shops
 * List user's connected Etsy shops
 */
router.get('/shops', requireAuth, async (req, res) => {
  try {
    const shops = await etsyService.getShops(req.userId);
    return res.json({ success: true, shops });
  } catch (error) {
    console.error('Etsy shops list error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch shops' });
  }
});

// ============================================
// PRODUCT ROUTES
// ============================================

/**
 * GET /api/v2/catalog/etsy/products
 * List user's products with Etsy listing data
 */
router.get('/products', requireAuth, async (req, res) => {
  try {
    const products = await etsyService.listProducts(req.userId);
    return res.json({ success: true, products });
  } catch (error) {
    console.error('Etsy products list error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch products' });
  }
});

/**
 * GET /api/v2/catalog/etsy/products/:productId
 * Get single product with Etsy data
 */
router.get('/products/:productId', requireAuth, async (req, res) => {
  try {
    const product = await etsyService.getProduct(req.params.productId, req.userId);
    
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    return res.json({ success: true, product });
  } catch (error) {
    console.error('Etsy product get error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
});

/**
 * POST /api/v2/catalog/etsy/products/:productId
 * Save/update Etsy listing configuration
 */
router.post('/products/:productId', requireAuth, async (req, res) => {
  try {
    const result = await etsyService.saveProduct(req.params.productId, req.userId, req.body);
    
    if (!result.found) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    if (result.error) {
      return res.status(400).json({ success: false, error: result.error });
    }
    
    return res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Etsy product save error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to save product' });
  }
});

// ============================================
// INVENTORY ROUTES
// ============================================

/**
 * POST /api/v2/catalog/etsy/inventory/:productId
 * Update inventory allocation for a product
 */
router.post('/inventory/:productId', requireAuth, async (req, res) => {
  try {
    const { quantity, shop_id } = req.body;
    
    if (quantity === undefined || !shop_id) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: quantity, shop_id' 
      });
    }
    
    const result = await etsyService.updateInventory(
      req.params.productId, 
      req.userId, 
      quantity, 
      shop_id
    );
    
    if (!result.found) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    if (result.error) {
      return res.status(400).json({ success: false, error: result.error });
    }
    
    return res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Etsy inventory update error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update inventory' });
  }
});

// ============================================
// SYNC LOGS ROUTES
// ============================================

/**
 * GET /api/v2/catalog/etsy/logs
 * Get sync logs for user
 */
router.get('/logs', requireAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const logs = await etsyService.getSyncLogs(req.userId, limit);
    return res.json({ success: true, logs });
  } catch (error) {
    console.error('Etsy logs fetch error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch logs' });
  }
});

// ============================================
// TEST ROUTE
// ============================================

/**
 * GET /api/v2/catalog/etsy/test
 * Test Etsy API connection and configuration
 */
router.get('/test', requireAuth, async (req, res) => {
  try {
    const result = await etsyService.testConnection();
    return res.json(result);
  } catch (error) {
    console.error('Etsy test error:', error.message);
    return res.status(500).json({ success: false, error: 'Connection test failed' });
  }
});

module.exports = router;
