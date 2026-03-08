/**
 * CSV Module Routes
 * API endpoints for CSV import/export operations
 * 
 * Base path: /api/v2/csv
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Import auth middleware
const { requireAuth } = require('../auth/middleware');
const { isAdmin } = require('../auth/services/permissions');

// Import services
const { addJob } = require('./services/queue');
const { createJob, getJob, getJobErrors, deleteJob } = require('./services/jobs');
const { countRows } = require('./services/parsers');
const { generateCSVTemplate, generateExcelTemplate } = require('./services/templates');
const { getReports, createReport, deleteReport } = require('./services/reports');

// Import catalog services for export
const { productService } = require('../catalog');

const db = require('../../../config/db');

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../../../temp-uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 52428800, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.csv', '.xlsx', '.xls'];
    
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'), false);
    }
  }
});

// =============================================================================
// UPLOAD
// =============================================================================

/**
 * POST /api/v2/csv/upload
 * Upload CSV/Excel file for processing
 */
router.post('/upload', requireAuth, upload.single('csv'), async (req, res) => {
  try {
    const { jobType } = req.body;
    const userId = req.userId;
    const userIsAdmin = isAdmin(req.roles || []);
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No file uploaded', status: 400 }
      });
    }

    if (!jobType) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Job type is required', status: 400 }
      });
    }

    // Validate job type and permissions
    const allowedJobTypes = {
      'inventory_upload': 'vendor',
      'user_upload': 'admin', 
      'product_upload': 'vendor',
      'event_upload': 'vendor'
    };

    if (!allowedJobTypes[jobType]) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid job type', status: 400 }
      });
    }

    // Check permissions
    const requiredPermission = allowedJobTypes[jobType];
    if (requiredPermission === 'admin' && !userIsAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required', status: 403 }
      });
    }

    // Generate job ID and count rows
    const jobId = uuidv4();
    const totalRows = await countRows(req.file.path, req.file.originalname);

    // Create job record
    await createJob({
      jobId,
      userId,
      jobType,
      fileName: req.file.originalname,
      totalRows
    });

    // Add to queue - worker will process using module services directly
    await addJob(jobId, {
      jobId,
      userId,
      jobType,
      filePath: req.file.path,
      fileName: req.file.originalname,
      totalRows,
      isAdmin: userIsAdmin
    });

    res.json({
      success: true,
      data: { jobId, totalRows },
      message: `File uploaded successfully. Processing ${totalRows} rows.`
    });

  } catch (error) {
    console.error('CSV upload error:', error);
    
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

// =============================================================================
// JOB STATUS
// =============================================================================

/**
 * GET /api/v2/csv/jobs/:jobId
 * Get job status
 */
router.get('/jobs/:jobId', requireAuth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.userId;
    const userIsAdmin = isAdmin(req.roles || []);

    const job = await getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job not found', status: 404 }
      });
    }

    // Check permission
    if (job.user_id !== userId && !userIsAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied', status: 403 }
      });
    }

    // Get errors if any
    let errors = [];
    if (job.status === 'failed' || job.failed_rows > 0) {
      errors = await getJobErrors(jobId);
    }

    res.json({
      success: true,
      data: {
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
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * DELETE /api/v2/csv/jobs/:jobId
 * Delete a job
 */
router.delete('/jobs/:jobId', requireAuth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.userId;
    const userIsAdmin = isAdmin(req.roles || []);

    await deleteJob(jobId, userId, userIsAdmin);

    res.status(204).send();
  } catch (error) {
    console.error('Delete job error:', error);
    
    if (error.message === 'Job not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message, status: 404 }
      });
    }
    if (error.message.includes('Not authorized')) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error.message, status: 403 }
      });
    }
    
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

// =============================================================================
// TEMPLATES
// =============================================================================

/**
 * GET /api/v2/csv/templates/:jobType
 * Download template for a job type
 */
router.get('/templates/:jobType', requireAuth, async (req, res) => {
  try {
    const { jobType } = req.params;
    const userId = req.userId;
    const userIsAdmin = isAdmin(req.roles || []);
    const format = req.query.format || 'xlsx';

    // Get user's addons for field filtering
    let userAddons = [];
    if (jobType === 'product_upload') {
      const [addons] = await db.execute(
        'SELECT addon_slug FROM user_addons WHERE user_id = ? AND is_active = 1',
        [userId]
      );
      userAddons = addons.map(a => a.addon_slug);
    }

    if (format === 'xlsx') {
      const workbook = await generateExcelTemplate(jobType, userIsAdmin, userAddons);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${jobType}_template.xlsx"`);
      
      await workbook.xlsx.write(res);
      res.end();
    } else {
      const csv = generateCSVTemplate(jobType, userIsAdmin, userAddons);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${jobType}_template.csv"`);
      res.send(csv);
    }

  } catch (error) {
    console.error('Generate template error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

// =============================================================================
// REPORTS
// =============================================================================

/**
 * GET /api/v2/csv/reports
 * List saved reports
 */
router.get('/reports', requireAuth, async (req, res) => {
  try {
    const reports = await getReports(req.userId);
    res.json({ success: true, data: reports });
  } catch (error) {
    console.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * POST /api/v2/csv/reports
 * Save a report configuration
 */
router.post('/reports', requireAuth, async (req, res) => {
  try {
    const report = await createReport(req.userId, req.body);
    res.status(201).json({
      success: true,
      data: report,
      message: 'Report saved'
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

/**
 * DELETE /api/v2/csv/reports/:reportId
 * Delete a saved report
 */
router.delete('/reports/:reportId', requireAuth, async (req, res) => {
  try {
    await deleteReport(req.params.reportId, req.userId);
    res.status(204).send();
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message, status: 500 }
    });
  }
});

module.exports = router;
