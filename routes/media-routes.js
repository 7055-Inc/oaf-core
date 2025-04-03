const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const { db } = require('../db');
const { isAuthenticated } = require('../middleware/auth');
const { validateMediaType } = require('../utils/validators');
const { getFileType } = require('../utils/fileUtils');
const { BadRequestError, NotFoundError } = require('../utils/errors');
const productService = require('../services/productService');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 15 // Maximum 15 files per request
  },
  fileFilter: (req, file, cb) => {
    // Accept only images and videos
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed'));
    }
  }
});

/**
 * Upload media files
 * POST /api/media
 */
router.post('/', isAuthenticated, upload.array('productMedia', 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new BadRequestError('No files were uploaded.');
    }

    const uploadedFiles = [];
    const userId = req.user.id;

    for (const file of req.files) {
      const fileType = getFileType(file.mimetype);
      let width = null;
      let height = null;

      // Process images with sharp
      if (fileType === 'image') {
        const metadata = await sharp(file.path).metadata();
        width = metadata.width;
        height = metadata.height;
      }

      // Insert into media_library
      const [mediaId] = await db('media_library').insert({
        user_id: userId,
        file_path: file.filename,
        file_type: fileType,
        mime_type: file.mimetype,
        original_filename: file.originalname,
        size_bytes: file.size,
        width,
        height,
        title: file.originalname,
        status: 'active'
      });

      uploadedFiles.push({
        id: mediaId,
        url: `/uploads/${file.filename}`,
        originalName: file.originalname,
        fileType,
        size: file.size,
        width,
        height
      });
    }

    res.status(201).json({
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    // Clean up uploaded files if database insertion fails
    if (req.files) {
      await Promise.all(req.files.map(file => 
        fs.unlink(file.path).catch(err => console.error('File cleanup failed:', err))
      ));
    }
    next(error);
  }
});

/**
 * Upload product-specific media files
 * POST /api/media/products/:productId
 */
router.post('/products/:productId', isAuthenticated, upload.array('productMedia', 15), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw new BadRequestError('No files were uploaded.');
    }

    const uploadedFiles = [];
    const userId = req.user.id;
    const productId = req.params.productId;

    // Verify product exists and user has access
    const product = await db('products')
      .where({ id: productId })
      .first();

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Check if user has permission to modify this product
    if (product.user_id !== userId) {
      throw new BadRequestError('You do not have permission to modify this product');
    }

    for (const file of req.files) {
      const fileType = getFileType(file.mimetype);
      let width = null;
      let height = null;

      // Process images with sharp
      if (fileType === 'image') {
        const metadata = await sharp(file.path).metadata();
        width = metadata.width;
        height = metadata.height;
      }

      // Insert into media_library
      const [mediaId] = await db('media_library').insert({
        user_id: userId,
        file_path: file.filename,
        file_type: fileType,
        mime_type: file.mimetype,
        original_filename: file.originalname,
        size_bytes: file.size,
        width,
        height,
        title: file.originalname,
        status: 'active'
      });

      // Link media to product
      await db('product_images').insert({
        product_id: productId,
        media_id: mediaId,
        image_url: `/uploads/${file.filename}`,
        is_primary: false
      });

      uploadedFiles.push({
        id: mediaId,
        url: `/uploads/${file.filename}`,
        originalName: file.originalname,
        fileType,
        size: file.size,
        width,
        height
      });
    }

    res.status(201).json({
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    // Clean up uploaded files if database insertion fails
    if (req.files) {
      await Promise.all(req.files.map(file => 
        fs.unlink(file.path).catch(err => console.error('File cleanup failed:', err))
      ));
    }
    next(error);
  }
});

/**
 * Publish product media (transfer to permanent storage)
 * POST /api/media/products/:productId/publish
 */
router.post('/products/:productId/publish', isAuthenticated, async (req, res, next) => {
  try {
    const productId = req.params.productId;
    const userId = req.user.id;

    // Get product and its media
    const product = await db('products')
      .where({ id: productId })
      .first();

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product.user_id !== userId) {
      throw new BadRequestError('You do not have permission to modify this product');
    }

    const media = await db('product_images')
      .join('media_library', 'product_images.media_id', 'media_library.id')
      .where('product_images.product_id', productId)
      .select('media_library.*', 'product_images.is_primary');

    // Process each media file
    const processedFiles = await Promise.all(media.map(async (file) => {
      try {
        // Move file to permanent storage
        const sourcePath = path.join(__dirname, '../uploads', file.file_path);
        const destPath = path.join(__dirname, '../../media/products', file.file_path);
        
        await fs.mkdir(path.dirname(destPath), { recursive: true });
        await fs.copyFile(sourcePath, destPath);
        
        // Update database with permanent URL
        const permanentUrl = `/media/products/${file.file_path}`;
        await db('product_images')
          .where({ product_id: productId, media_id: file.id })
          .update({ image_url: permanentUrl });

        return {
          id: file.id,
          url: permanentUrl,
          isPrimary: file.is_primary
        };
      } catch (err) {
        console.error(`Failed to process file ${file.id}:`, err);
        return null;
      }
    }));

    const successfulFiles = processedFiles.filter(f => f !== null);

    res.status(200).json({
      success: true,
      message: 'Media files published successfully',
      files: successfulFiles
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete media file
 * DELETE /api/media/:id
 */
router.delete('/:id', isAuthenticated, async (req, res, next) => {
  try {
    const mediaId = req.params.id;
    const userId = req.user.id;

    const media = await db('media_library')
      .where({ id: mediaId, user_id: userId })
      .first();

    if (!media) {
      throw new NotFoundError('Media not found or access denied.');
    }

    // Delete file from disk
    const filePath = path.join(__dirname, '../uploads', media.file_path);
    await fs.unlink(filePath);

    // Delete from database
    await db('media_library')
      .where({ id: mediaId })
      .delete();

    // Also remove any product image associations
    await db('product_images')
      .where({ media_id: mediaId })
      .delete();

    res.status(200).json({
      success: true,
      message: 'Media deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update media metadata
 * PATCH /api/media/:id
 */
router.patch('/:id', isAuthenticated, async (req, res, next) => {
  try {
    const mediaId = req.params.id;
    const userId = req.user.id;
    const { title, description } = req.body;

    const media = await db('media_library')
      .where({ id: mediaId, user_id: userId })
      .first();

    if (!media) {
      throw new NotFoundError('Media not found or access denied.');
    }

    await db('media_library')
      .where({ id: mediaId })
      .update({
        title: title || media.title,
        description: description || media.description,
        updated_at: db.fn.now()
      });

    res.status(200).json({
      success: true,
      message: 'Media metadata updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Set primary product image
 * POST /api/media/products/:productId/primary/:mediaId
 */
router.post('/products/:productId/primary/:mediaId', isAuthenticated, async (req, res, next) => {
  try {
    const { productId, mediaId } = req.params;
    const userId = req.user.id;

    // Verify product and ownership
    const product = await db('products')
      .where({ id: productId })
      .first();

    if (!product || product.user_id !== userId) {
      throw new NotFoundError('Product not found or access denied');
    }

    // Verify media exists and is associated with product
    const mediaExists = await db('product_images')
      .where({ product_id: productId, media_id: mediaId })
      .first();

    if (!mediaExists) {
      throw new NotFoundError('Media not found or not associated with this product');
    }

    // Update all product images to non-primary
    await db('product_images')
      .where({ product_id: productId })
      .update({ is_primary: false });

    // Set the selected image as primary
    await db('product_images')
      .where({ product_id: productId, media_id: mediaId })
      .update({ is_primary: true });

    res.status(200).json({
      success: true,
      message: 'Primary image updated successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Handle media upload for products
router.post('/products/:productId/media', upload.array('productMedia'), async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const productId = req.params.productId;
    const uploadedFiles = [];

    for (const file of req.files) {
      try {
        const result = await productService.handleMediaUpload(productId, file, userId);
        uploadedFiles.push(result);
      } catch (fileError) {
        console.error(`Error uploading file ${file.originalname}:`, fileError);
        // Continue with other files even if one fails
      }
    }

    if (uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'No files were successfully uploaded' });
    }

    res.json({
      message: `Successfully uploaded ${uploadedFiles.length} files`,
      files: uploadedFiles
    });
  } catch (err) {
    console.error('Error in media upload:', err);
    res.status(500).json({ error: err.message });
  }
});

// Set featured image for a product
router.post('/products/:productId/media/:mediaId/featured', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await productService.setFeaturedImage(
      req.params.productId,
      req.params.mediaId,
      userId
    );
    res.json(result);
  } catch (err) {
    console.error('Error setting featured image:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete media from a product
router.delete('/products/:productId/media/:mediaId', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await productService.deleteMedia(
      req.params.productId,
      req.params.mediaId,
      userId
    );
    res.json(result);
  } catch (err) {
    console.error('Error deleting media:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 