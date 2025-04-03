const express = require('express');
const router = express.Router();
const productService = require('../services/productService');

// Simple test route to verify router is working
router.get('/test', (req, res) => {
  res.json({ status: 'OK', message: 'Product routes are working' });
});

// Test database connection
router.get('/test-db', async (req, res) => {
  try {
    const conn = await productService.getConnection();
    const [result] = await conn.execute('SELECT 1 as test');
    conn.release();
    res.json({ 
      status: 'OK', 
      message: 'Database connection successful',
      user: req.session.user?.id || 'Not logged in', 
      environment: {
        node: process.version,
        os: process.platform
      }
    });
  } catch (err) {
    console.error('Database test failed:', err);
    res.status(500).json({ status: 'ERROR', error: err.message });
  }
});

// Add a debug endpoint
router.get('/debug-info', (req, res) => {
  res.json({
    routes: router.stack.map(r => ({
      path: r.route?.path,
      methods: r.route?.methods ? Object.keys(r.route.methods) : []
    })).filter(r => r.path),
    session: {
      active: !!req.session,
      user: req.session?.user?.id || 'No user in session'
    },
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl
  });
});

// Create draft product
router.post('/draft', async (req, res) => {
  try {
    const userId = req.session?.user?.id || req.body.user_id;
    if (!userId) {
      return res.status(401).json({ error: 'User ID is required' });
    }

    // Ensure we have valid data by removing undefined values
    const cleanData = Object.entries(req.body || {}).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});

    const draftData = {
      ...cleanData,
      user_id: userId,
      status: 'draft',
      created_at: new Date(),
      updated_at: new Date()
    };

    const draft = await productService.createDraft(draftData);
    res.json({ draftId: draft.id, ...draft });
  } catch (err) {
    console.error('Error creating draft:', err);
    res.status(500).json({ 
      error: err.message || 'Failed to create draft product',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

// Get draft product
router.get('/draft/:draftId', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const draft = await productService.getDraft(req.params.draftId, userId);
    res.json(draft);
  } catch (err) {
    console.error('Error getting draft:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update draft product
router.put('/draft/:draftId', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    console.log(`Draft update request for draft ${req.params.draftId} by user ${userId || 'unknown'}`);
    console.log('Session data:', req.session);
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('Draft update data:', req.body);
    const draft = await productService.updateDraft(req.params.draftId, req.body, userId);
    console.log('Draft update successful');
    res.json(draft);
  } catch (err) {
    console.error('Error updating draft:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get shipping services
router.get('/shipping/services', async (req, res) => {
  try {
    const services = await productService.getShippingServices();
    res.json(services);
  } catch (err) {
    console.error('Error getting shipping services:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await productService.getCategories();
    res.json(categories);
  } catch (err) {
    console.error('Error getting categories:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get categories (vendor endpoint)
router.get('/vendor/products/categories', async (req, res) => {
  try {
    console.log('Vendor products categories endpoint called');
    const categories = await productService.getCategories();
    res.json(categories);
  } catch (err) {
    console.error('Error getting vendor categories:', err);
    res.status(500).json({ error: err.message });
  }
});

// Handle media upload for draft products
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid').v4;

// Configure multer for file uploads using the existing temp directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = '/var/www/main/tmp';
    // Ensure the directory exists
    if (!fs.existsSync(uploadDir)) {
      console.warn('Temp directory does not exist, creating it');
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create a unique filename but preserve the original extension
    const fileExt = path.extname(file.originalname);
    const uniqueFilename = `${uuid()}${fileExt}`;
    cb(null, uniqueFilename);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
          } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WebP are allowed.'));
    }
  }
});

// Add media to a draft product
router.post('/draft/:draftId/media', upload.array('productMedia', 10), async (req, res) => {
  try {
    const { draftId } = req.params;
    const userId = req.session?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify the draft exists
    const draft = await productService.getDraft(draftId, userId);
    if (!draft) {
      return res.status(404).json({ error: 'Draft product not found' });
    }
    
    // Process uploaded files
    const uploadedFiles = req.files.map(file => ({
        filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
        path: file.path,
      tempPath: file.path // Keep track of the actual file path
    }));
    
    // Save media info to the database
    const savedMedia = await productService.addMediaToDraft(draftId, uploadedFiles, userId);
    
    res.status(200).json(savedMedia);
  } catch (err) {
    console.error('Error uploading media to draft:', err);
    res.status(500).json({ error: err.message });
  }
});

// Add vendor-specific media endpoint for draft products
router.post('/vendor/products/draft/:draftId/media', upload.array('productMedia', 10), async (req, res) => {
  try {
    console.log('Vendor draft media upload endpoint called for draft:', req.params.draftId);
    const { draftId } = req.params;
    const userId = req.session?.user?.id;
    
    console.log(`Media upload request for draft ${draftId} by user ${userId || 'unknown'}`);
    console.log('Session data:', req.session);
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify the temp directory exists and is writable
    const uploadDir = '/var/www/main/tmp';
    try {
      if (!fs.existsSync(uploadDir)) {
        console.warn('Temp directory does not exist, creating it');
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.accessSync(uploadDir, fs.constants.W_OK);
      console.log(`Temp directory ${uploadDir} exists and is writable`);
    } catch (fsError) {
      console.error(`Temp directory problem: ${fsError.message}`);
      return res.status(500).json({ error: `Server upload directory issue: ${fsError.message}` });
    }
    
    // Log the received files
    console.log(`Received ${req.files.length} files for draft ${draftId}`);
    req.files.forEach((file, i) => {
      console.log(`File ${i+1}: ${file.originalname}, ${file.size} bytes, saved as ${file.filename} in ${file.path}`);
    });
    
    // Verify the draft exists
    let draft;
    try {
      draft = await productService.getDraft(draftId, userId);
      console.log('Found draft product:', draft.id);
    } catch (draftError) {
      console.error('Draft retrieval error:', draftError);
      return res.status(404).json({ error: 'Draft product not found' });
    }
    
    if (!draft) {
      console.error('Draft not found for ID:', draftId);
      return res.status(404).json({ error: 'Draft product not found' });
    }
    
    // Process uploaded files
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      tempPath: file.path
    }));
    
    // Save media info to the database
    const savedMedia = await productService.addMediaToDraft(draftId, uploadedFiles, userId);
    
    // Log success
    console.log(`Successfully saved ${savedMedia.length} media files for draft ${draftId}`);
    
    res.status(200).json(savedMedia);
  } catch (err) {
    console.error('Error uploading media to vendor draft:', err);
    res.status(500).json({ error: err.message });
  }
});

// Media debug endpoint
router.get('/media-debug', (req, res) => {
  // Check if tmp directory exists and is accessible
  const uploadDir = '/var/www/main/tmp';
  try {
    if (!fs.existsSync(uploadDir)) {
      res.status(500).json({ 
        error: 'Temp directory does not exist',
        tmpPath: uploadDir
      });
      return;
    }
    
    // List files in the directory
    const files = fs.readdirSync(uploadDir);
    
    // Create test URLs
    const testUrls = files.slice(0, 3).map(filename => {
      return {
        filename,
        fullPath: path.join(uploadDir, filename),
        urlPath: `/tmp/${filename}`,
        fullUrl: `http://${req.headers.host}/tmp/${filename}`
      };
    });

    res.json({
      success: true,
      directoryExists: true,
      directoryPath: uploadDir,
      fileCount: files.length,
      sampleFiles: testUrls,
      host: req.headers.host,
      serverInfo: {
        hostname: require('os').hostname(),
        platform: process.platform,
        tmpdir: require('os').tmpdir()
      }
    });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to access temp directory',
      message: err.message,
      stack: err.stack
    });
  }
});

// Simplified media upload endpoint for testing
router.post('/draft/:draftId/media-test', upload.single('file'), async (req, res) => {
  try {
    const { draftId } = req.params;
    const userId = req.session?.user?.id || 1000000007; // Fallback for testing
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const file = req.file;
    const fileUrl = `http://${req.headers.host}/tmp/${file.filename}`;
    
    res.json({
      success: true,
      file: {
        originalname: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
        url: fileUrl
      },
      draftId,
      userId
    });
  } catch (err) {
    console.error('Error in test upload:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
