/**
 * Catalog Curation Routes (v2)
 * RESTful API endpoints for marketplace product curation
 * 
 * Base path: /api/v2/catalog/curation
 */

const express = require('express');
const router = express.Router();

// Import curation service
const curationService = require('./services/curation');

// Import auth middleware
const { requireAuth, requirePermission } = require('../auth');

// =============================================================================
// STATS
// =============================================================================

/**
 * GET /api/v2/catalog/curation/stats
 * Get curation statistics (unsorted count, art count, crafts count)
 * Requires: admin permission
 */
router.get('/stats', requireAuth, requirePermission('admin'), async (req, res) => {
  try {
    const stats = await curationService.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching curation stats:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch curation statistics' }
    });
  }
});

// =============================================================================
// PRODUCTS
// =============================================================================

/**
 * GET /api/v2/catalog/curation/products
 * List products by marketplace category for curation
 * Requires: admin permission
 * Query params: category (unsorted|art|crafts), limit, offset
 */
router.get('/products', requireAuth, requirePermission('admin'), async (req, res) => {
  try {
    const { 
      category = 'unsorted', 
      limit = 50, 
      offset = 0,
      include_images = 'true'
    } = req.query;

    const result = await curationService.listProducts({
      category,
      limit: parseInt(limit),
      offset: parseInt(offset),
      includeImages: include_images === 'true'
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching curation products:', error);
    
    if (error.message.includes('Invalid category')) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'INVALID_CATEGORY', message: error.message }
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch products' }
    });
  }
});

/**
 * PUT /api/v2/catalog/curation/products/:id/categorize
 * Move a product to a different marketplace category
 * Requires: admin permission
 */
router.put('/products/:id/categorize', requireAuth, requirePermission('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { category, reason } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_CATEGORY', message: 'Category is required' }
      });
    }

    const result = await curationService.categorizeProduct(
      parseInt(id),
      category,
      req.userId,
      reason
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error categorizing product:', error);
    
    if (error.status === 404) {
      return res.status(404).json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: error.message }
      });
    }
    
    if (error.message.includes('Invalid category')) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'INVALID_CATEGORY', message: error.message }
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to categorize product' }
    });
  }
});

/**
 * PUT /api/v2/catalog/curation/products/bulk
 * Bulk categorize multiple products
 * Requires: admin permission
 */
router.put('/products/bulk', requireAuth, requirePermission('admin'), async (req, res) => {
  try {
    const { product_ids, category, reason } = req.body;

    if (!category) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_CATEGORY', message: 'Category is required' }
      });
    }

    if (!product_ids || !Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_PRODUCTS', message: 'product_ids must be a non-empty array' }
      });
    }

    const result = await curationService.bulkCategorize(
      product_ids,
      category,
      req.userId,
      reason
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error bulk categorizing products:', error);
    
    if (error.status === 400) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'INVALID_PRODUCTS', 
          message: error.message,
          found: error.found,
          requested: error.requested
        }
      });
    }
    
    if (error.message.includes('Invalid category')) {
      return res.status(400).json({ 
        success: false, 
        error: { code: 'INVALID_CATEGORY', message: error.message }
      });
    }
    
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to bulk categorize products' }
    });
  }
});

// =============================================================================
// CURATION LOG
// =============================================================================

/**
 * GET /api/v2/catalog/curation/log
 * Get curation history log
 * Requires: admin permission
 */
router.get('/log', requireAuth, requirePermission('admin'), async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const result = await curationService.getCurationLog({
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching curation log:', error);
    res.status(500).json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch curation log' }
    });
  }
});

module.exports = router;
