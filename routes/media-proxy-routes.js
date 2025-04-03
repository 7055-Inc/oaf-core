const express = require('express');
const router = express.Router();
const axios = require('axios');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Set up multer for file handling
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tmpDir = path.join(__dirname, '../tmp');
    // Create directory if it doesn't exist
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    cb(null, tmpDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${req.params.userId}_product_${req.params.productId}_${uniqueSuffix}_${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 15 // max 15 files at once
  }
});

// Media server configuration
const MEDIA_VM_URL = 'http://34.60.105.144';

/**
 * Route to create a product folder on media-vm
 */
router.post('/create-product/:userId/:productId', async (req, res) => {
  try {
    const { userId, productId } = req.params;
    
    // Validate that the user is either an admin or the owner of this content
    if (req.user.id !== parseInt(userId) && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied: You can only create product folders for your own products'
      });
    }
    
    console.log(`Creating product folder for User ${userId}, Product ${productId}`);
    
    const response = await axios.post(
      `${MEDIA_VM_URL}/create-product/${userId}/${productId}`,
      { volume: "products" },
      { timeout: 10000 } // 10 second timeout
    );
    
    console.log(`Product folder created: ${JSON.stringify(response.data)}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying create-product request:', error);
    
    // Handle specific error types
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({
        success: false,
        error: 'Media server is unavailable. Please try again later.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create product folder'
    });
  }
});

/**
 * Route to upload a file to media-vm
 */
router.post('/upload/:userId/products/:productId', upload.single('file'), async (req, res) => {
  const tempFilePath = req.file ? req.file.path : null;
  
  try {
    const { userId, productId } = req.params;
    const { file } = req;
    
    // Validate that the user is either an admin or the owner of this content
    if (req.user.id !== parseInt(userId) && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Permission denied: You can only upload to your own product folders'
      });
    }
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file provided'
      });
    }
    
    let metadata = {};
    try {
      metadata = JSON.parse(req.body.metadata || '{}');
    } catch (parseError) {
      console.error('Failed to parse metadata:', parseError);
    }
    
    // Add additional metadata fields
    metadata.uploadedBy = req.user.username || 'Unknown';
    metadata.uploadTimestamp = new Date().toISOString();
    
    console.log(`Uploading file ${file.originalname} for Product ${productId}`);
    
    // Create form data to send to media-vm
    const formData = new FormData();
    formData.append('file', fs.createReadStream(file.path));
    formData.append('metadata', JSON.stringify(metadata));
    
    const response = await axios.post(
      `${MEDIA_VM_URL}/upload/${userId}/products/${productId}`,
      formData,
      { 
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000, // 30 second timeout for large files
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    console.log(`File uploaded successfully: ${JSON.stringify(response.data)}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying upload request:', error);
    
    // Handle specific error types
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(503).json({
        success: false,
        error: 'Media server is unavailable. Please try again later.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload file'
    });
  } finally {
    // Always clean up the temporary file
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlink(tempFilePath, (err) => {
        if (err) console.error('Failed to delete temp file:', err);
      });
    }
  }
});

/**
 * Route to check media-vm connectivity
 */
router.get('/status', async (req, res) => {
  try {
    const response = await axios.get(`${MEDIA_VM_URL}/status`, { timeout: 5000 });
    res.json({
      success: true,
      mediaServerStatus: response.data
    });
  } catch (error) {
    console.error('Media server status check failed:', error);
    res.status(503).json({
      success: false,
      mediaServerStatus: 'unavailable',
      error: error.message
    });
  }
});

module.exports = router;
