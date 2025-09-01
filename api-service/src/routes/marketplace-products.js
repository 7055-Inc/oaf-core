const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const { secureLogger } = require('../middleware/secureLogger');

/**
 * Marketplace Products API Routes
 * 
 * These endpoints serve marketplace-enabled products for:
 * - Main art site (marketplace_category = 'art')
 * - Crafts subdomain (marketplace_category = 'crafts') 
 * - Admin management (all categories)
 */

// GET /api/marketplace/products - Get marketplace products with filtering
router.get('/products', async (req, res) => {
  try {
    const { 
      category = 'all',        // 'art', 'crafts', 'unsorted', 'all'
      limit = 50,
      offset = 0,
      include = '',            // 'images,vendor,categories'
      sort = 'created_at',     // 'created_at', 'name', 'price', 'updated_at'
      order = 'DESC'           // 'ASC', 'DESC'
    } = req.query;

    // Validate parameters
    const validCategories = ['art', 'crafts', 'unsorted', 'all'];
    const validSorts = ['created_at', 'name', 'price', 'updated_at'];
    const validOrders = ['ASC', 'DESC'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category parameter' });
    }

    if (!validSorts.includes(sort)) {
      return res.status(400).json({ error: 'Invalid sort parameter' });
    }

    if (!validOrders.includes(order)) {
      return res.status(400).json({ error: 'Invalid order parameter' });
    }

    // Build base query - only marketplace-enabled products with active status
    let query = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.short_description,
        p.price,
        p.wholesale_price,
        p.wholesale_description,
        p.sku,
        p.status,
        p.marketplace_enabled,
        p.marketplace_category,
        p.created_at,
        p.updated_at,
        p.vendor_id
    `;

    let joinClauses = '';
    let selectClauses = '';

    // Add optional includes
    const includes = include.split(',').filter(Boolean);
    
    if (includes.includes('vendor')) {
      joinClauses += ` LEFT JOIN users u ON p.vendor_id = u.id`;
      selectClauses += `, u.business_name, u.first_name, u.last_name, u.username`;
    }

    if (includes.includes('categories')) {
      joinClauses += ` LEFT JOIN categories cat ON p.category_id = cat.id`;
      selectClauses += `, cat.name as category_name`;
    }

    if (includes.includes('images')) {
      joinClauses += ` LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1`;
      selectClauses += `, pi.image_url, pi.image_path`;
    }

    query += selectClauses + ` FROM products p` + joinClauses;

    // Add WHERE conditions
    let whereConditions = [`p.marketplace_enabled = TRUE`, `p.status = 'active'`];
    let queryParams = [];

    // Filter by marketplace category
    if (category !== 'all') {
      whereConditions.push(`p.marketplace_category = ?`);
      queryParams.push(category);
    }

    query += ` WHERE ` + whereConditions.join(' AND ');

    // Add ORDER BY
    query += ` ORDER BY p.${sort} ${order}`;

    // Add LIMIT and OFFSET
    query += ` LIMIT ? OFFSET ?`;
    queryParams.push(parseInt(limit), parseInt(offset));

    // Execute query
    const [products] = await db.query(query, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM products p 
      WHERE p.marketplace_enabled = TRUE AND p.status = 'active'
    `;
    let countParams = [];

    if (category !== 'all') {
      countQuery += ` AND p.marketplace_category = ?`;
      countParams.push(category);
    }

    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;

    // Process images for products that include images
    if (includes.includes('images')) {
      for (let product of products) {
        // If we have image data, construct proper URLs
        if (product.image_url || product.image_path) {
          product.images = [{
            url: product.image_url || `https://api2.onlineartfestival.com/media-proxy/${product.image_path}`,
            is_primary: true
          }];
        }
        
        // Clean up the individual image fields
        delete product.image_url;
        delete product.image_path;
      }
    }

    // Format response
    res.json({
      products,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      },
      filters: {
        category,
        sort,
        order
      }
    });

  } catch (error) {
    secureLogger.error('Error fetching marketplace products:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace products' });
  }
});

// GET /api/marketplace/products/featured - Get featured marketplace products
router.get('/products/featured', async (req, res) => {
  try {
    const { 
      category = 'art',        // 'art' or 'crafts'
      limit = 12
    } = req.query;

    if (!['art', 'crafts'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category. Must be "art" or "crafts"' });
    }

    // Get featured products (most recent, highest rated, or manually featured)
    // For now, we'll use most recent as "featured"
    const query = `
      SELECT 
        p.id,
        p.name,
        p.description,
        p.short_description,
        p.price,
        p.wholesale_price,
        p.sku,
        p.marketplace_category,
        p.created_at,
        p.vendor_id,
        u.business_name,
        u.first_name,
        u.last_name,
        pi.image_url,
        pi.image_path,
        cat.name as category_name
      FROM products p
      LEFT JOIN users u ON p.vendor_id = u.id
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
      LEFT JOIN categories cat ON p.category_id = cat.id
      WHERE p.marketplace_enabled = TRUE 
        AND p.status = 'active'
        AND p.marketplace_category = ?
      ORDER BY p.created_at DESC
      LIMIT ?
    `;

    const [products] = await db.query(query, [category, parseInt(limit)]);

    // Process images
    for (let product of products) {
      if (product.image_url || product.image_path) {
        product.images = [{
          url: product.image_url || `https://api2.onlineartfestival.com/media-proxy/${product.image_path}`,
          is_primary: true
        }];
      }
      
      delete product.image_url;
      delete product.image_path;
    }

    res.json({
      products,
      category,
      featured: true
    });

  } catch (error) {
    secureLogger.error('Error fetching featured marketplace products:', error);
    res.status(500).json({ error: 'Failed to fetch featured products' });
  }
});

// GET /api/marketplace/stats - Get marketplace statistics
router.get('/stats', async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN marketplace_category = 'art' THEN 1 END) as art_products,
        COUNT(CASE WHEN marketplace_category = 'crafts' THEN 1 END) as crafts_products,
        COUNT(CASE WHEN marketplace_category = 'unsorted' THEN 1 END) as unsorted_products,
        COUNT(DISTINCT vendor_id) as total_vendors
      FROM products 
      WHERE marketplace_enabled = TRUE AND status = 'active'
    `;

    const [stats] = await db.query(query);

    res.json({
      marketplace_stats: stats[0],
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    secureLogger.error('Error fetching marketplace stats:', error);
    res.status(500).json({ error: 'Failed to fetch marketplace statistics' });
  }
});

module.exports = router;
