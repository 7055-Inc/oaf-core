/**
 * Media Management Routes
 * Comprehensive media processing and file management system for the Beemeeart platform
 * Handles image uploads, processing workflows, AI analysis, and contextual data for media processing
 * Supports server-to-server communication with media processing VMs and external services
 */

const express = require('express');
const router = express.Router();
const db = require('../../config/db');
const path = require('path');
const fs = require('fs');
const { secureLogger } = require('../middleware/secureLogger');
const prefixAuth = require('../middleware/prefix'); // API key authentication

/**
 * GET /api/media/pending
 * Get pending images for processing with pagination support
 * Used by media processing workers to fetch images awaiting processing
 * 
 * @route GET /api/media/pending
 * @middleware prefixAuth - Requires API key authentication (media workers)
 * @param {number} [limit=10] - Number of images to return
 * @param {number} [offset=0] - Pagination offset
 * @returns {Object} Paginated list of pending images with metadata
 * @note No CSRF needed - server-to-server communication
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
 * GET /api/media/pending/all
 * Get ALL pending images for processing without pagination
 * Used by backend VMs for efficient batch processing of all pending images
 * 
 * @route GET /api/media/pending/all
 * @middleware prefixAuth - Requires API key authentication (media workers)
 * @returns {Object} Complete list of all pending images for batch processing
 * @note No CSRF needed - server-to-server communication
 * @purpose Backend VM uses this for efficient batch processing
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
 * GET /api/media/download/:id
 * Download temporary image file for processing
 * Streams image files to media processing workers with appropriate headers
 * 
 * @route GET /api/media/download/:id
 * @middleware prefixAuth - Requires API key authentication (media workers)
 * @param {string} id - Pending image ID to download
 * @returns {Stream} Image file stream with appropriate headers
 * @note No CSRF needed - server-to-server communication
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
 * POST /api/media/complete/:id
 * Mark image as processed with media ID and AI enhancement data
 * Updates pending image record with processing results and permanent URLs
 * 
 * @route POST /api/media/complete/:id
 * @middleware prefixAuth - Requires API key authentication (media workers)
 * @param {string} id - Pending image ID to mark as complete
 * @param {Object} req.body - Processing completion data
 * @param {string} req.body.media_id - Permanent media ID (required)
 * @param {string} [req.body.permanent_url] - Permanent URL for the processed image
 * @param {boolean} [req.body.processing_complete] - Whether processing is fully complete
 * @param {boolean} [req.body.ai_enhanced] - Whether AI enhancement was applied
 * @param {Array} [req.body.formats_available] - Available image formats
 * @param {Object} [req.body.ai_analysis] - AI analysis results
 * @returns {Object} Processing completion confirmation with smart URL
 * @note No CSRF needed - server-to-server communication
 */
router.post('/complete/:id', prefixAuth, async (req, res) => {
  try {
    const imageId = req.params.id;
    const { 
      media_id,
      permanent_url,
      processing_complete,
      ai_enhanced,
      formats_available,
      ai_analysis
    } = req.body;

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

    secureLogger.info('Image processing completed with AI enhancement', {
      imageId,
      mediaId: media_id,
      aiEnhanced: ai_enhanced || false,
      processingComplete: processing_complete || false,
      formatsAvailable: formats_available || [],
      smartUrl: `${process.env.SMART_MEDIA_BASE_URL || 'https://api.beemeeart.com/api/images'}/${media_id}`,
      requestedBy: req.userId
    });

    res.json({
      success: true,
      imageId,
      media_id,
      status: 'processed',
      smart_url_preview: `${process.env.SMART_MEDIA_BASE_URL || 'https://api.beemeeart.com/api/images'}/${media_id}`,
      ai_enhanced: ai_enhanced || false,
      processing_complete: processing_complete || false,
      message: 'Image processed successfully with AI enhancement - ready for URL replacement'
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
 * DELETE /api/media/cleanup/:id
 * Mark image as failed and preserve temporary file as fallback
 * Handles cleanup of failed processing attempts while maintaining file availability
 * 
 * @route DELETE /api/media/cleanup/:id
 * @middleware prefixAuth - Requires API key authentication (media workers)
 * @param {string} id - Pending image ID to mark as failed
 * @returns {Object} Cleanup confirmation with status update
 * @note No CSRF needed - server-to-server communication
 * @note Temporary files are preserved as fallbacks for failed processing
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

    // DO NOT DELETE TEMP FILES - they serve as fallbacks for failed processing
    // The temp file should remain available for users until processing succeeds
    secureLogger.info('Image marked as failed, temp file preserved as fallback', {
      imageId,
      imagePath: image.image_path
    });

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

// ============================================================================
// CONTEXTUAL DATA ENDPOINTS FOR MEDIA PROCESSING
// ============================================================================

/**
 * GET /api/media/event/:id
 * Get event details for media processing context
 * Provides event information to media processing workers for contextual AI analysis
 * 
 * @route GET /api/media/event/:id
 * @middleware prefixAuth - Requires API key authentication (media workers)
 * @param {string} id - Event ID
 * @returns {Object} Complete event details with type information
 */
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

/**
 * GET /api/media/product/:id
 * Get comprehensive product details for media processing context
 * Provides complete product family information including parent/child relationships
 * 
 * @route GET /api/media/product/:id
 * @middleware prefixAuth - Requires API key authentication (media workers)
 * @param {string} id - Product ID (can be parent or child product)
 * @param {string} [include] - Comma-separated list of related data to include
 * @returns {Object} Complete product family with contextual information
 * @note Supports both simple and variable product types with full family structure
 */
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

/**
 * GET /api/media/user/:id
 * Get comprehensive user profile details for media processing context
 * Provides complete user information including type-specific profile data
 * 
 * @route GET /api/media/user/:id
 * @middleware prefixAuth - Requires API key authentication (media workers)
 * @param {string} id - User ID
 * @returns {Object} Complete user profile with type-specific data (artist, community, promoter)
 */
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

/**
 * GET /api/media/analysis/:mediaId
 * Get AI analysis data for a media item by proxying to processing VM
 * Retrieves comprehensive AI analysis results from the media processing backend
 * 
 * @route GET /api/media/analysis/:mediaId
 * @middleware prefixAuth - Requires API key authentication (media workers)
 * @param {string} mediaId - Media ID to get analysis for (must be numeric)
 * @returns {Object} AI analysis data from processing VM
 * @note Proxies request to processing VM with timeout and error handling
 */
router.get('/analysis/:mediaId', prefixAuth, async (req, res) => {
  try {
    const { mediaId } = req.params;
    
    if (!mediaId || !/^\d+$/.test(mediaId)) {
      return res.status(400).json({ error: 'Valid media ID is required' });
    }

    // Proxy request to processing VM
    const axios = require('axios');
    const MEDIA_BACKEND_URL = process.env.MEDIA_BACKEND_URL || 'http://10.128.0.29:3001';
    const MEDIA_API_KEY = 'media_20074c47e0d2af1a90b1d9ba1d001648:eb7d555c29ce59c6202f3975b37a45cdc2e7a21eb09c6d684e982ebee5cc9e6a';

    const vmResponse = await axios.get(`${MEDIA_BACKEND_URL}/analysis/${mediaId}`, {
      headers: {
        'Authorization': MEDIA_API_KEY
      },
      timeout: 10000,
      validateStatus: (status) => status < 500
    });

    if (vmResponse.status === 404) {
      return res.status(404).json({ error: 'AI analysis not found for this media' });
    }

    if (vmResponse.status >= 400) {
      return res.status(vmResponse.status).json({ 
        error: 'Failed to fetch AI analysis from processing VM' 
      });
    }

    secureLogger.info('AI analysis fetched', {
      mediaId,
      requestedBy: req.userId
    });

    res.json({
      success: true,
      analysis: vmResponse.data
    });

  } catch (error) {
    secureLogger.error('Error fetching AI analysis', error);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Processing VM unavailable',
        message: 'AI analysis service is currently unavailable'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch AI analysis',
      details: error.message 
    });
  }
});

module.exports = router; 