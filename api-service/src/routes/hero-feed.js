const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../../config/db');

// GET /api/hero-feed - Get hero feed tiles for homepage
router.get('/', async (req, res) => {
  try {
    const { userId = 'anonymous', limit = 6 } = req.query;
    
    // Let Leo AI handle everything intelligently
    const leoResponse = await axios.post('http://localhost:3003/api/learning/recommendations', {
      query: `return a list of ${limit} product recommendations for user ${userId} based on any preferences or interaction data you have. CRITICAL: ONLY return products where status='active', completely ignore any products with status='deleted' or any other status. Filter your results to status='active' only.`,
      userId: userId,
      options: {
        limitPerCollection: parseInt(limit),
        totalLimit: parseInt(limit),
        filter: { status: 'active' }
      }
    }, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });

    if (leoResponse.data && leoResponse.data.recommendations && leoResponse.data.recommendations.length > 0) {
      // Get product IDs from Leo AI recommendations - filter for active products only
      const productIds = leoResponse.data.recommendations
        .filter(rec => 
          rec.metadata?.source_table === 'products' && 
          rec.metadata?.original_id &&
          rec.metadata?.status === 'active'  // Only include active products
        )
        .map(rec => rec.metadata.original_id);

      if (productIds.length > 0) {
        console.log(`Found ${productIds.length} active products from Leo AI:`, productIds);
        
        // Get product data with images and vendor info directly from database
        const placeholders = productIds.map(() => '?').join(',');
        const [products] = await db.query(`
          SELECT p.id, p.name, p.price, p.vendor_id, p.status,
                 pi.image_url, pi.alt_text,
                 u.username, up.display_name, ap.business_name
          FROM products p
          LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = 1
          LEFT JOIN users u ON p.vendor_id = u.id
          LEFT JOIN user_profiles up ON u.id = up.user_id
          LEFT JOIN artist_profiles ap ON u.id = ap.user_id
          WHERE p.id IN (${placeholders}) 
            AND p.status = 'active'
          ORDER BY FIELD(p.id, ${productIds.join(',')})
        `, productIds);

        if (products.length > 0) {
          const tiles = products.map(product => {
            // Find the Leo recommendation for this product to get the confidence score
            const leoRec = leoResponse.data.recommendations.find(rec => rec.metadata.original_id == product.id);
            
            return {
              id: `leo-${product.id}`,
              type: 'recommendation',
              title: product.name,
              image: product.image_url 
                ? (product.image_url.startsWith('http') 
                    ? product.image_url 
                    : `${process.env.API_BASE_URL || 'https://api.brakebee.com'}${product.image_url}`)
                : null,
              alt: product.alt_text || product.name,
              href: `/products/${product.id}`,
              weight: leoRec?.enhancedScore || leoRec?.similarity || 1,
              confidence: leoRec?.enhancedScore || leoRec?.similarity || 1,
              price: product.price,
              vendor: {
                id: product.vendor_id,
                name: product.display_name || product.business_name || 'Artist'
              }
            };
          });

          return res.json({
            tiles,
            source: 'leo-ai',
            confidence: leoResponse.data.confidence || 0.8,
            metadata: {
              userId,
              requestTime: new Date().toISOString(),
              leoApplied: true,
              totalRecommendations: tiles.length,
              aiQuery: `return a list of currently active product recommendations for user ${userId} based on any preferences or interaction data you have`
            }
          });
        }
    }

    // If Leo returns no recommendations, return empty (let the frontend handle it)
    res.json({
      tiles: [],
      source: 'leo-ai-empty',
      confidence: 0,
      metadata: {
        userId,
        requestTime: new Date().toISOString(),
        leoApplied: true,
        totalRecommendations: 0,
        message: 'No recommendations available'
      }
    });
  }

  } catch (error) {
    console.error('Hero feed error:', error);
    res.status(500).json({ 
      error: 'Leo AI service unavailable',
      tiles: [],
      source: 'error',
      confidence: 0,
      metadata: {
        userId: req.query.userId || 'anonymous',
        requestTime: new Date().toISOString(),
        error: error.message || String(error)
      }
    });
  }
});

module.exports = router;