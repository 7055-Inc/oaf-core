/**
 * EXAMPLE: Media Integration with Existing Endpoints
 * 
 * This file shows how to integrate the media proxy system with your existing
 * API endpoints. Copy these patterns into your actual route files.
 */

const { enhanceProductWithMedia, enhanceEventWithMedia, enhanceUserProfileWithMedia } = require('../utils/mediaUtils');

// ===== PRODUCT ENDPOINT EXAMPLE =====

/**
 * GET /api/products/:id - Get single product with processed media
 * 
 * Before: Returns temp image URLs like "/temp_images/products/123-456-timestamp.jpg"
 * After: Returns proxy URLs like "https://api.beemeeart.com/api/media/serve/user_123/product/img/processed.jpg"
 */
async function getProductById(req, res) {
  try {
    const productId = req.params.id;
    
    // Get product from database (your existing logic)
    const [products] = await db.execute(
      'SELECT * FROM products WHERE id = ?',
      [productId]
    );
    
    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    let product = products[0];
    
    // 🚀 NEW: Enhance with processed media URLs
    product = await enhanceProductWithMedia(product);
    
    res.json(product);
    
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
}

/**
 * GET /api/products - Get all products with processed media
 */
async function getAllProducts(req, res) {
  try {
    // Get products (your existing logic)
    const [products] = await db.execute(
      'SELECT * FROM products WHERE status = "active" ORDER BY created_at DESC'
    );
    
    // 🚀 NEW: Enhance each product with media
    const enhancedProducts = await Promise.all(
      products.map(product => enhanceProductWithMedia(product))
    );
    
    res.json({
      products: enhancedProducts,
      total: enhancedProducts.length
    });
    
  } catch (error) {
    console.error('Error getting products:', error);
    res.status(500).json({ error: 'Failed to get products' });
  }
}

// ===== EVENT ENDPOINT EXAMPLE =====

/**
 * GET /api/events/:id - Get single event with processed media
 */
async function getEventById(req, res) {
  try {
    const eventId = req.params.id;
    
    // Get event from database
    const [events] = await db.execute(
      'SELECT * FROM events WHERE id = ?',
      [eventId]
    );
    
    if (events.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    let event = events[0];
    
    // 🚀 NEW: Enhance with processed media URLs
    event = await enhanceEventWithMedia(event);
    
    res.json(event);
    
  } catch (error) {
    console.error('Error getting event:', error);
    res.status(500).json({ error: 'Failed to get event' });
  }
}

// ===== USER PROFILE EXAMPLE =====

/**
 * GET /api/users/profile/:id - Get user profile with processed media
 */
async function getUserProfile(req, res) {
  try {
    const userId = req.params.id;
    
    // Get user profile from database
    const [profiles] = await db.execute(`
      SELECT u.id, u.username, u.user_type, 
             up.profile_image_url, up.header_image_url, up.logo_image_url,
             up.bio, up.location
      FROM users u 
      LEFT JOIN user_profiles up ON u.id = up.user_id 
      WHERE u.id = ?
    `, [userId]);
    
    if (profiles.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    let userProfile = profiles[0];
    
    // 🚀 NEW: Enhance with processed media URLs
    userProfile = await enhanceUserProfileWithMedia(userProfile);
    
    res.json(userProfile);
    
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
}

// ===== RESPONSE EXAMPLES =====

/**
 * SMART FALLBACK RESPONSES:
 * 
 * SCENARIO 1 - Processing Complete (Best Case):
 * {
 *   "id": 123,
 *   "name": "Cool Product",
 *   "image_url": "https://api.beemeeart.com/api/media/serve/user_123/product/img/processed.jpg",
 *   "thumbnail_url": "https://api.beemeeart.com/api/media/serve/user_123/product/img/thumb.jpg",
 *   "images": [
 *     {
 *       "image_url": "https://api.beemeeart.com/api/media/serve/user_123/product/img/processed.jpg",
 *       "thumbnail_url": "https://api.beemeeart.com/api/media/serve/user_123/product/img/thumb.jpg",
 *       "source": "processed"
 *     }
 *   ]
 * }
 * 
 * SCENARIO 2 - Processing Failed/Pending (Fallback):
 * {
 *   "id": 123,
 *   "name": "Cool Product", 
 *   "image_url": "https://api.beemeeart.com/temp_images/products/123-456-timestamp.jpg",
 *   "thumbnail_url": null,
 *   "images": [
 *     {
 *       "image_url": "https://api.beemeeart.com/temp_images/products/123-456-timestamp.jpg",
 *       "thumbnail_url": null,
 *       "source": "temp"
 *     }
 *   ]
 * }
 * 
 * SCENARIO 3 - No Image Available:
 * {
 *   "id": 123,
 *   "name": "Cool Product",
 *   "images": []
 * }
 */

// ===== INTEGRATION STEPS =====

/**
 * TO INTEGRATE INTO YOUR EXISTING ENDPOINTS:
 * 
 * 1. Import the media utilities:
 *    const { enhanceProductWithMedia, enhanceEventWithMedia, enhanceUserProfileWithMedia } = require('../utils/mediaUtils');
 * 
 * 2. After getting data from database, enhance with media:
 *    product = await enhanceProductWithMedia(product);
 * 
 * 3. For arrays of objects, use Promise.all:
 *    const enhanced = await Promise.all(products.map(p => enhanceProductWithMedia(p)));
 * 
 * 4. SMART FALLBACK SYSTEM:
 *    - If processing complete → serve via proxy (best quality)
 *    - If processing failed/pending → serve temp image directly (fallback)
 *    - If no image → graceful handling (no broken images)
 * 
 * 5. UX BENEFIT: Users NEVER see broken images, always get the best available!
 */

// ===== FRONTEND USAGE =====

/**
 * Your frontend can now use images like this:
 * 
 * <img src={product.image_url} alt={product.name} />
 * <img src={product.thumbnail_url} alt={product.name} className="thumbnail" />
 * 
 * The frontend doesn't know about the media backend - it just uses the proxy URLs!
 */

module.exports = {
  getProductById,
  getAllProducts,
  getEventById,
  getUserProfile
}; 