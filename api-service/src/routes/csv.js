const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Papa = require('papaparse');
const Queue = require('bull');
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { requirePermission } = require('../middleware/permissions');

const router = express.Router();

// Initialize Redis queue for CSV processing
const csvQueue = new Queue('CSV processing', {
  redis: {
    port: 6379,
    host: 'localhost'
  },
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
  }
});

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../../../csv-workers/temp-uploads'),
  limits: {
    fileSize: 52428800, // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

/**
 * Upload CSV file for processing
 * POST /csv/upload
 */
router.post('/upload', verifyToken, upload.single('csv'), async (req, res) => {
  try {
    const { jobType } = req.body;
    const userId = req.userId;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!jobType) {
      return res.status(400).json({ error: 'Job type is required' });
    }

    // Validate job type and permissions
    const allowedJobTypes = {
      'inventory_upload': 'vendor',
      'user_upload': 'admin', 
      'product_upload': 'vendor',
      'event_upload': 'vendor'
    };

    if (!allowedJobTypes[jobType]) {
      return res.status(400).json({ error: 'Invalid job type' });
    }

    // Check user permissions for this job type
    const requiredPermission = allowedJobTypes[jobType];
    
    // Use JWT permissions (already available from verifyToken middleware)
    const hasPermission = req.roles?.includes('admin') || 
                         req.permissions?.includes('admin') || 
                         req.permissions?.includes(requiredPermission);

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions for this job type' });
    }

    // Generate unique job ID
    const jobId = uuidv4();

    // Parse CSV to get row count
    const fileContent = fs.readFileSync(req.file.path, 'utf8');
    const parsed = Papa.parse(fileContent, { header: true });
    const totalRows = parsed.data.length;

    // Extract refresh token from cookies (same pattern as frontend)
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required for background processing' });
    }

    // Create job record in database
    const insertJobQuery = `
      INSERT INTO csv_upload_jobs (job_id, user_id, job_type, file_name, total_rows, user_jwt, user_refresh_token)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await db.execute(insertJobQuery, [jobId, userId, jobType, req.file.originalname, totalRows, req.headers.authorization, refreshToken]);

    // Add job to Redis queue
    await csvQueue.add('process-csv', {
      jobId,
      userId,
      userJWT: req.headers.authorization,
      userRefreshToken: refreshToken, // Pass refresh token to worker
      jobType,
      filePath: req.file.path,
      fileName: req.file.originalname,
      totalRows
    }, {
      jobId,
      delay: 1000 // Small delay to ensure database is updated
    });

    res.json({
      success: true,
      jobId,
      message: `File uploaded successfully. Processing ${totalRows} rows.`,
      totalRows
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message 
    });
  }
});

/**
 * Get job status and progress
 * GET /csv/job/:jobId
 */
router.get('/job/:jobId', verifyToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.userId;

    // Get job from database
    const jobQuery = `
      SELECT j.*, u.user_type
      FROM csv_upload_jobs j 
      JOIN users u ON j.user_id = u.id 
      WHERE j.job_id = ?
    `;
    const [jobRows] = await db.execute(jobQuery, [jobId]);

    if (jobRows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobRows[0];
    
    // Check if user has permission to view this job
    const isAdmin = req.roles?.includes('admin') || req.permissions?.includes('admin');
    const isOwner = job.user_id === userId;

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get error details if job failed
    let errors = [];
    if (job.status === 'failed' || job.failed_rows > 0) {
      const errorQuery = `
        SELECT row_num, error_message, raw_data 
        FROM csv_upload_errors 
        WHERE job_id = ? 
        ORDER BY row_num
        LIMIT 100
      `;
      const [errorRows] = await db.execute(errorQuery, [jobId]);
      errors = errorRows;
    }

    res.json({
      success: true,
      job: {
        id: job.job_id,
        type: job.job_type,
        status: job.status,
        fileName: job.file_name,
        totalRows: job.total_rows,
        processedRows: job.processed_rows,
        failedRows: job.failed_rows,
        progress: job.total_rows > 0 ? Math.round((job.processed_rows / job.total_rows) * 100) : 0,
        errorSummary: job.error_summary,
        createdAt: job.created_at,
        completedAt: job.completed_at,
        errors
      }
    });

  } catch (error) {
    console.error('Get job status error:', error);
    res.status(500).json({ 
      error: 'Failed to get job status',
      details: error.message
    });
  }
});

/**
 * Download CSV template
 * GET /csv/template/:jobType
 */
router.get('/template/:jobType', verifyToken, async (req, res) => {
  try {
    const { jobType } = req.params;
    const userId = req.userId;

    // Define templates for different job types
    const templates = {
      inventory_upload: [
        { sku: 'EXAMPLE-001', quantity: '10', reason: 'New stock received' },
        { sku: 'EXAMPLE-002', quantity: '5', reason: 'Inventory adjustment' }
      ],
      user_upload: [
        { email: 'user@example.com', username: 'exampleuser', display_name: 'Example User', user_type: 'vendor' }
      ],
      product_upload: [
        { name: 'Example Product', sku: 'PROD-001', price: '29.99', description: 'Example description', category: 'Art' }
      ],
      event_upload: [
        { name: 'Example Event', date: '2024-12-01', venue: 'Example Venue', description: 'Example event description' }
      ]
    };

    if (!templates[jobType]) {
      return res.status(400).json({ error: 'Invalid job type' });
    }

    const csv = Papa.unparse(templates[jobType]);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${jobType}_template.csv"`);
    res.send(csv);

  } catch (error) {
    console.error('Template download error:', error);
    res.status(500).json({ 
      error: 'Failed to generate template',
      details: error.message
    });
  }
});

/**
 * Download current data as CSV
 * GET /csv/export/:jobType
 */
router.get('/export/:jobType', verifyToken, async (req, res) => {
  try {
    const { jobType } = req.params;
    const userId = req.userId;

    let filename, data;
    
    switch (jobType) {
      case 'inventory_upload':
        // Use existing products/my endpoint (permissions already handled)
        const productsResponse = await fetch(`${req.protocol}://${req.get('host')}/products/my`, {
          headers: {
            'Authorization': req.headers.authorization,
            'Cookie': req.headers.cookie || ''
          }
        });
        
        if (!productsResponse.ok) {
          throw new Error('Failed to fetch products');
        }
        
        const responseData = await productsResponse.json();
        const products = responseData.products || []; // Handle the correct structure
        
        // Transform to CSV format
        data = products.map(product => ({
          sku: product.sku,
          quantity: product.available_qty || 0,
          reason: ''
        }));
        
        filename = 'current_inventory.csv';
        break;
      
      default:
        return res.status(400).json({ error: 'Export not available for this job type' });
    }
    
    const csv = Papa.unparse(data);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ 
      error: 'Failed to export data',
      details: error.message
    });
  }
});

/**
 * Internal endpoint for CSV worker to get user products (no CSRF needed)
 * GET /csv/internal/products/:userId
 */
router.get('/internal/products/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify the requester is the same user or admin
    if (req.userId !== parseInt(userId) && !req.permissions?.includes('admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const [products] = await db.execute(`
      SELECT id, sku, name, available_qty, status
      FROM products 
      WHERE vendor_id = ?
    `, [userId]);

    res.json({ products });

  } catch (error) {
    console.error('Internal products fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch products',
      details: error.message
    });
  }
});

/**
 * Internal endpoint for CSV worker to update inventory (no CSRF needed)
 * PUT /csv/internal/inventory/:productId
 */
router.put('/internal/inventory/:productId', verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { qty_on_hand, change_type, reason } = req.body;
    const userId = req.userId;

    // Verify the product belongs to the user
    const [products] = await db.execute(`
      SELECT id, vendor_id, sku, name
      FROM products 
      WHERE id = ?
    `, [productId]);

    if (products.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const product = products[0];
    
    if (product.vendor_id !== userId && !req.permissions?.includes('admin')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Calculate quantity change
    const currentQty = product.available_qty || 0;
    const quantityChange = qty_on_hand - currentQty;

    // Insert inventory transaction
    await db.execute(`
      INSERT INTO inventory_transactions (product_id, change_type, quantity_change, new_quantity, reason, created_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [productId, change_type || 'manual_adjustment', quantityChange, qty_on_hand, reason || 'CSV update', userId]);

    // Update product inventory
    await db.execute(`
      UPDATE products 
      SET available_qty = ?
      WHERE id = ?
    `, [qty_on_hand, productId]);

    res.json({ 
      success: true,
      product_id: productId,
      old_quantity: currentQty,
      new_quantity: qty_on_hand,
      quantity_change: quantityChange
    });

  } catch (error) {
    console.error('Internal inventory update error:', error);
    res.status(500).json({ 
      error: 'Failed to update inventory',
      details: error.message
    });
  }
});

/**
 * Cancel a pending job
 * DELETE /csv/job/:jobId
 */
router.delete('/job/:jobId', verifyToken, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.userId;

    // Get job details
    const jobQuery = `
      SELECT user_id, status, file_name 
      FROM csv_upload_jobs 
      WHERE job_id = ?
    `;
    const [jobRows] = await db.execute(jobQuery, [jobId]);

    if (jobRows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const job = jobRows[0];

    // Check if user owns this job or is admin
    if (job.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (job.status !== 'pending') {
      return res.status(400).json({ error: 'Can only cancel pending jobs' });
    }

    // Remove from Redis queue
    try {
      const bullJob = await csvQueue.getJob(jobId);
      if (bullJob) {
        await bullJob.remove();
      }
    } catch (queueError) {
      console.error('Queue removal error:', queueError);
    }

    // Update database
    const updateQuery = `
      UPDATE csv_upload_jobs 
      SET status = 'cancelled', completed_at = NOW() 
      WHERE job_id = ?
    `;
    await db.execute(updateQuery, [jobId]);

    res.json({
      success: true,
      message: 'Job cancelled successfully'
    });

  } catch (error) {
    console.error('Cancel job error:', error);
    res.status(500).json({ 
      error: 'Failed to cancel job',
      details: error.message
    });
  }
});

module.exports = router; 