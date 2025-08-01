const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const path = require('path');
const fs = require('fs');
const { secureLogger } = require('../middleware/secureLogger');
const prefixAuth = require('../middleware/prefix'); // API key authentication

/**
 * GET /api/media/pending - Get pending images for processing
 * Authentication: API Key (media workers)
 * No CSRF needed - server-to-server communication
 */
router.get('/pending', prefixAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const [pendingImages] = await db.query(`
      SELECT 
        id,
        user_id,
        image_path,
        original_name,
        mime_type,
        status,
        created_at,
        updated_at
      FROM pending_images 
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT ${limit} OFFSET ${offset}
    `);

    // Get total count for pagination
    const [countResult] = await db.query(
      "SELECT COUNT(*) as total FROM pending_images WHERE status = 'pending'"
    );

    secureLogger.info('Media pending images fetched', {
      count: pendingImages.length,
      total: countResult[0].total,
      limit,
      offset,
      requestedBy: req.userId
    });

    res.json({
      images: pendingImages,
      pagination: {
        total: countResult[0].total,
        limit,
        offset,
        hasMore: (offset + limit) < countResult[0].total
      }
    });

  } catch (error) {
    secureLogger.error('Error fetching pending images', error);
    res.status(500).json({ 
      error: 'Failed to fetch pending images',
      details: error.message 
    });
  }
});

/**
 * GET /api/media/pending/all - Get ALL pending images for processing (no pagination)
 * Authentication: API Key (media workers)
 * No CSRF needed - server-to-server communication
 * Purpose: Prevents infinite loops when oldest items are already downloaded
 */
router.get('/pending/all', prefixAuth, async (req, res) => {
  try {
    const [pendingImages] = await db.query(`
      SELECT 
        id,
        user_id,
        image_path,
        original_name,
        mime_type,
        status,
        created_at,
        updated_at
      FROM pending_images 
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `);

    secureLogger.info('All pending images fetched', {
      count: pendingImages.length,
      requestedBy: req.userId
    });

    res.json({
      images: pendingImages,
      total: pendingImages.length
    });

  } catch (error) {
    secureLogger.error('Error fetching all pending images', error);
    res.status(500).json({ 
      error: 'Failed to fetch all pending images',
      details: error.message 
    });
  }
});

/**
 * GET /api/media/download/:id - Download temporary image file
 * Authentication: API Key (media workers)
 * No CSRF needed - server-to-server communication
 */
router.get('/download/:id', prefixAuth, async (req, res) => {
  try {
    const imageId = req.params.id;

    // Get image record (must be pending)
    const [images] = await db.query(`
      SELECT id, user_id, image_path, original_name, mime_type, status, created_at
      FROM pending_images 
      WHERE id = ${imageId} AND status = 'pending'
    `);

    if (images.length === 0) {
      return res.status(404).json({ error: 'Image not found or not in pending status' });
    }

    const image = images[0];
    const fullPath = path.join(__dirname, '../../', image.image_path.replace(/^\//, ''));

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      // Mark as failed if file doesn't exist
      await db.query(`UPDATE pending_images SET status = 'failed' WHERE id = ${imageId}`);
      return res.status(404).json({ error: 'Image file not found on disk' });
    }

    // Set appropriate headers
    const filename = image.original_name || path.basename(image.image_path) || 'download';
    res.setHeader('Content-Type', image.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Image-ID', imageId);
    res.setHeader('X-User-ID', image.user_id);
    res.setHeader('X-Created-At', image.created_at);

    // Stream the file
    const fileStream = fs.createReadStream(fullPath);
    
    fileStream.on('error', (error) => {
      secureLogger.error('Error streaming file', { imageId, error: error.message });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error reading file' });
      }
    });

    fileStream.pipe(res);

    secureLogger.info('Image downloaded', {
      imageId,
      imagePath: image.image_path,
      originalName: image.original_name,
      requestedBy: req.userId
    });

  } catch (error) {
    secureLogger.error('Error in download endpoint', error);
    res.status(500).json({ 
      error: 'Failed to download image',
      details: error.message 
    });
  }
});

/**
 * POST /api/media/complete/:id - Mark image as processed with media ID
 * Authentication: API Key (media workers)
 * No CSRF needed - server-to-server communication
 */
router.post('/complete/:id', prefixAuth, async (req, res) => {
  try {
    const imageId = req.params.id;
    const { media_id } = req.body;

    if (!media_id) {
      return res.status(400).json({ error: 'media_id is required' });
    }

    // Validate media_id is numeric
    if (!/^\d+$/.test(media_id.toString())) {
      return res.status(400).json({ error: 'media_id must be numeric' });
    }

    // Update the pending_images record with media ID and mark as processed
    const [result] = await db.query(`
      UPDATE pending_images 
      SET permanent_url = ?, 
          thumbnail_url = ?,
          status = 'processed',
          updated_at = NOW()
      WHERE id = ? AND status = 'pending'
    `, [media_id.toString(), media_id.toString(), imageId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Image not found or not in pending status' });
    }

    secureLogger.info('Image processing completed with smart serving', {
      imageId,
      mediaId: media_id,
      smartUrl: `https://api2.onlineartfestival.com/api/images/${media_id}`,
      requestedBy: req.userId
    });

    res.json({
      success: true,
      imageId,
      media_id,
      status: 'processed',
      smart_url_preview: `https://api2.onlineartfestival.com/api/images/${media_id}`,
      message: 'Image processed successfully with smart serving - ready for URL replacement'
    });

  } catch (error) {
    secureLogger.error('Error completing image processing', error);
    res.status(500).json({ 
      error: 'Failed to complete image processing',
      details: error.message 
    });
  }
});

/**
 * DELETE /api/media/cleanup/:id - Delete temporary file and mark as failed
 * Authentication: API Key (media workers)
 * No CSRF needed - server-to-server communication
 */
router.delete('/cleanup/:id', prefixAuth, async (req, res) => {
  try {
    const imageId = req.params.id;

    // Get image record first
    const [images] = await db.query(`
      SELECT id, image_path, status 
      FROM pending_images 
      WHERE id = ${imageId}
    `);

    if (images.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const image = images[0];
    const fullPath = path.join(__dirname, '../../', image.image_path.replace(/^\//, ''));

    // Delete the temporary file if it exists
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      secureLogger.info('Temporary file deleted', {
        imageId,
        imagePath: image.image_path
      });
    }

    // Mark as failed
    await db.query(`
      UPDATE pending_images 
      SET status = 'failed', updated_at = NOW() 
      WHERE id = ${imageId}
    `);

    secureLogger.info('Image cleanup completed', {
      imageId,
      status: 'failed',
      requestedBy: req.userId
    });

    res.json({
      success: true,
      imageId,
      status: 'failed',
      message: 'Temporary file deleted and marked as failed'
    });

  } catch (error) {
    secureLogger.error('Error in cleanup endpoint', error);
    res.status(500).json({ 
      error: 'Failed to cleanup image',
      details: error.message 
    });
  }
});

// NEW CONTEXTUAL DATA ENDPOINTS FOR MEDIA PROCESSING

// GET /event/:id - Get event details for media processing context
router.get('/event/:id', prefixAuth, async (req, res) => {
  try {
    const [event] = await db.query(`
      SELECT 
        e.*,
        et.name as event_type_name,
        et.description as event_type_description
      FROM events e
      LEFT JOIN event_types et ON e.event_type_id = et.id
      WHERE e.id = ?
    `, [req.params.id]);
    
    if (event.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    secureLogger.info('Event context fetched for media processing', { 
      eventId: req.params.id, 
      requestedBy: req.userId 
    });
    
    res.json(event[0]);
  } catch (error) {
    secureLogger.error('Error fetching event context', { 
      error: error.message, 
      eventId: req.params.id 
    });
    res.status(500).json({ error: 'Failed to get event', details: error.message });
  }
});

// GET /product/:id - Get product details for media processing context
router.get('/product/:id', prefixAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { include } = req.query;
    
    // Parse include parameter
    const includes = include ? include.split(',').map(i => i.trim()) : [];
    
    // Get base product data
    const [product] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    if (!product.length) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const requestedProduct = product[0];
    let parentProduct = null;
    let childProducts = [];

    // Determine if we're dealing with a parent or child product
    if (requestedProduct.parent_id === null) {
      // This is a parent product (simple or variable)
      parentProduct = requestedProduct;
      
      // If it's a variable product, get all children
      if (requestedProduct.product_type === 'variable') {
        const [children] = await db.query(
          'SELECT * FROM products WHERE parent_id = ? AND status = ? ORDER BY name ASC',
          [requestedProduct.id, 'active']
        );
        childProducts = children;
      }
    } else {
      // This is a child product - get parent and all siblings
      const [parent] = await db.query(
        'SELECT * FROM products WHERE id = ?',
        [requestedProduct.parent_id]
      );
      
      if (parent.length === 0) {
        return res.status(404).json({ error: 'Parent product not found' });
      }
      
      parentProduct = parent[0];
      
      // Get all siblings (including the requested product)
      const [siblings] = await db.query(
        'SELECT * FROM products WHERE parent_id = ? AND status = ? ORDER BY name ASC',
        [requestedProduct.parent_id, 'active']
      );
      childProducts = siblings;
    }

    // Helper function to add related data to a product
    const addRelatedData = async (productData) => {
      const response = { ...productData };

      // Add inventory data
      if (includes.includes('inventory') || !include) {
        const [inventory] = await db.query(
          'SELECT * FROM product_inventory WHERE product_id = ?',
          [productData.id]
        );
        response.inventory = inventory[0] || {
          qty_on_hand: 0,
          qty_on_order: 0,
          qty_available: 0,
          reorder_qty: 0
        };
      }

      // Add images
      if (includes.includes('images') || !include) {
        // Get temp images for this product using the new naming pattern
        const [tempImages] = await db.query(
          'SELECT image_path FROM pending_images WHERE image_path LIKE ? AND status = ?',
          [`/temp_images/products/${productData.vendor_id}-${productData.id}-%`, 'pending']
        );

        // Get permanent product images
        const [permanentImages] = await db.query(
          'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC',
          [productData.id]
        );

        // Combine both sets of images
        response.images = [
          ...permanentImages.map(img => img.image_url),
          ...tempImages.map(img => img.image_path)
        ];
      }

      // Add shipping data
      if (includes.includes('shipping') || !include) {
        const [shipping] = await db.query(
          'SELECT * FROM product_shipping WHERE product_id = ?',
          [productData.id]
        );
        response.shipping = shipping[0] || {};
      }

      // Add categories
      if (includes.includes('categories')) {
        const [categories] = await db.query(`
          SELECT c.id, c.name, c.description 
          FROM categories c 
          JOIN product_categories pc ON c.id = pc.category_id 
          WHERE pc.product_id = ?
        `, [productData.id]);
        response.categories = categories;
      }

      return response;
    };

    // Process parent product with related data
    const processedParent = await addRelatedData(parentProduct);

    // Process child products with related data
    const processedChildren = await Promise.all(
      childProducts.map(child => addRelatedData(child))
    );

    // Add vendor data to parent (applies to whole family)
    if (includes.includes('vendor')) {
      const [vendor] = await db.query(`
        SELECT u.id, u.username, up.first_name, up.last_name, up.display_name,
               ap.business_name, ap.business_website
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        LEFT JOIN artist_profiles ap ON u.id = ap.user_id
        WHERE u.id = ?
      `, [parentProduct.vendor_id]);
      processedParent.vendor = vendor[0] || {};
    }

    // Build the response
    const response = {
      ...processedParent,
      // Add family structure
      product_type: parentProduct.product_type,
      children: processedChildren,
      // Add metadata about the family
      family_size: processedChildren.length,
      requested_product_id: parseInt(id),
      is_requested_product_parent: requestedProduct.parent_id === null
    };

    secureLogger.info('Product context fetched for media processing', {
      requestedId: id,
      parentId: parentProduct.id,
      childCount: processedChildren.length,
      productType: parentProduct.product_type,
      requestedBy: req.userId
    });

    res.json(response);
  } catch (error) {
    secureLogger.error('Error fetching product context', { 
      error: error.message, 
      productId: req.params.id 
    });
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// GET /user/:id - Get user profile details for media processing context
router.get('/user/:id', prefixAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [user] = await db.query(
      'SELECT u.id, u.username, u.email_verified, u.status, u.user_type, up.* ' +
      'FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id WHERE u.id = ?',
      [id]
    );
    
    if (!user[0] || user[0].status !== 'active') {
      return res.status(404).json({ error: 'User not found or profile not active' });
    }
    
    const userData = user[0];
    
    // Add type-specific profile data
    if (userData.user_type === 'artist') {
      const [artistProfile] = await db.query(
        'SELECT * FROM artist_profiles WHERE user_id = ?',
        [userData.id]
      );
      Object.assign(userData, artistProfile[0]);
    } else if (userData.user_type === 'community') {
      const [communityProfile] = await db.query(
        'SELECT * FROM community_profiles WHERE user_id = ?',
        [userData.id]
      );
      Object.assign(userData, communityProfile[0]);
    } else if (userData.user_type === 'promoter') {
      const [promoterProfile] = await db.query(
        'SELECT * FROM promoter_profiles WHERE user_id = ?',
        [userData.id]
      );
      Object.assign(userData, promoterProfile[0]);
    }
    
    secureLogger.info('User context fetched for media processing', { 
      userId: id, 
      userType: userData.user_type,
      requestedBy: req.userId 
    });
    
    res.json(userData);
  } catch (error) {
    secureLogger.error('Error fetching user context', { 
      error: error.message, 
      userId: req.params.id 
    });
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

module.exports = router; 