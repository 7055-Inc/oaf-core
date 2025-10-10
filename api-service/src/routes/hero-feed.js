const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const axios = require('axios');

/**
 * GET /api/hero-feed
 * Provides curated visual content for the homepage discovery band
 * First tries Leo AI recommendations, falls back to recent products
 */
router.get('/', async (req, res) => {
  try {
    const { userId = 'anonymous', limit = 6 } = req.query;
    
    // Try Leo AI first
    try {
      const leoResponse = await axios.post('http://localhost:3003/api/learning/recommendations', {
        query: 'art artwork painting sculpture visual creative',
        userId: userId,
        options: {
          limitPerCollection: parseInt(limit),
          totalLimit: parseInt(limit)
        }
      }, {
        timeout: 3000,
        headers: { 'Content-Type': 'application/json' }
      });

      if (leoResponse.data && leoResponse.data.recommendations && leoResponse.data.recommendations.length > 0) {
        const tiles = leoResponse.data.recommendations.slice(0, parseInt(limit)).map((rec, index) => ({
          id: `leo-${rec.id || index}`,
          type: 'recommendation',
          title: rec.metadata?.title || rec.metadata?.name || 'Recommended Art',
          image: rec.metadata?.image_url || rec.metadata?.image,
          alt: rec.metadata?.title || 'AI Recommended Art',
          href: rec.metadata?.product_id ? `/products/${rec.metadata.product_id}` : null,
          weight: rec.enhancedScore || rec.similarity || 1
        }));

        return res.json({
          tiles,
          source: 'leo-recommendations',
          confidence: leoResponse.data.confidence || 0.8,
          metadata: {
            userId,
            requestTime: new Date().toISOString(),
            leoApplied: true,
            totalRecommendations: tiles.length
          }
        });
      }
    } catch (leoError) {
      console.log('Leo AI unavailable, falling back to products:', leoError.message);
    }

    // Fallback to recent products
    const [products] = await db.query(`
      SELECT p.id, p.name, p.price, p.vendor_id,
             pi.image_url, pi.alt_text
      FROM products p
      LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
      WHERE p.status = 'active' 
        AND pi.image_url IS NOT NULL
      ORDER BY p.created_at DESC
      LIMIT ?
    `, [parseInt(limit)]);

    const tiles = products.map(product => ({
      id: `product-${product.id}`,
      type: 'product',
      title: product.name,
      image: product.image_url.startsWith('http') 
        ? product.image_url 
        : `${process.env.API_BASE_URL || 'https://api.brakebee.com'}${product.image_url}`,
      alt: product.alt_text || product.name,
      href: `/products/${product.id}`,
      weight: 1
    }));

    res.json({
      tiles,
      source: 'products-fallback',
      confidence: 0.6,
      metadata: {
        userId,
        requestTime: new Date().toISOString(),
        leoApplied: false,
        totalRecommendations: tiles.length
      }
    });

  } catch (error) {
    console.error('Hero feed error:', error);
    res.status(500).json({
      error: 'Failed to load hero feed',
      tiles: [],
      source: 'error',
      metadata: {
        userId: req.query.userId || 'anonymous',
        requestTime: new Date().toISOString(),
        error: error.message
      }
    });
  }
});

module.exports = router;
