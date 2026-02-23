const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Papa = require('papaparse');
const ExcelJS = require('exceljs');
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

// Configure multer for file uploads (CSV and Excel)
const upload = multer({
  dest: path.join(__dirname, '../../../csv-workers/temp-uploads'),
  limits: {
    fileSize: 52428800, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedMimes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls (legacy)
    ];
    const allowedExts = ['.csv', '.xlsx', '.xls'];
    
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'), false);
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

    // Parse file to get row count (supports both CSV and Excel)
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    let totalRows = 0;
    
    if (fileExt === '.xlsx' || fileExt === '.xls') {
      // Parse Excel file
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(req.file.path);
      const worksheet = workbook.worksheets[0];
      totalRows = worksheet.rowCount - 1; // Subtract header row
    } else {
      // Parse CSV file
      const fileContent = fs.readFileSync(req.file.path, 'utf8');
      const parsed = Papa.parse(fileContent, { header: true });
      totalRows = parsed.data.length;
    }

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
 * Download template (CSV or Excel)
 * GET /csv/template/:jobType
 * Query param: ?format=csv|xlsx (default: csv)
 */
router.get('/template/:jobType', verifyToken, async (req, res) => {
  try {
    const { jobType } = req.params;
    const userId = req.userId;
    const isAdmin = req.permissions?.includes('admin') || req.roles?.includes('admin');
    const format = req.query.format || 'csv';

    // Fetch user's active addons for permission-based field filtering
    let userAddons = [];
    if (jobType === 'product_upload') {
      const [addons] = await db.execute(
        'SELECT addon_slug FROM user_addons WHERE user_id = ? AND is_active = 1',
        [userId]
      );
      userAddons = addons.map(a => a.addon_slug);
    }

    // Define templates for different job types
    const templates = {
      inventory_upload: [
        { sku: 'EXAMPLE-001', quantity: '10', reason: 'New stock received' },
        { sku: 'EXAMPLE-002', quantity: '5', reason: 'Inventory adjustment' }
      ],
      user_upload: [
        { email: 'user@example.com', username: 'exampleuser', display_name: 'Example User', user_type: 'vendor' }
      ],
      product_upload: getProductTemplate(isAdmin, userAddons),
      event_upload: [
        { name: 'Example Event', date: '2024-12-01', venue: 'Example Venue', description: 'Example event description' }
      ]
    };

    if (!templates[jobType]) {
      return res.status(400).json({ error: 'Invalid job type' });
    }

    const templateData = templates[jobType];
    
    // Output as Excel or CSV based on format parameter
    if (format === 'xlsx') {
      const workbook = await createExcelWorkbook(templateData, {
        sheetName: jobType.replace('_upload', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        lockedColumns: [] // Templates don't need locked columns
      });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${jobType}_template.xlsx"`);
      
      await workbook.xlsx.write(res);
      res.end();
    } else {
      const csv = Papa.unparse(templateData);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${jobType}_template.csv"`);
      res.send(csv);
    }

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to generate template',
      details: error.message
    });
  }
});

/**
 * Create Excel workbook with formatting
 * @param {Array} data - Array of row objects
 * @param {Object} options - Formatting options
 * @returns {ExcelJS.Workbook}
 */
async function createExcelWorkbook(data, options = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Brakebee';
  workbook.created = new Date();
  
  const worksheet = workbook.addWorksheet(options.sheetName || 'Data', {
    views: [{ state: 'frozen', ySplit: 1 }] // Freeze header row
  });
  
  if (data.length === 0) {
    return workbook;
  }
  
  // Get headers from first row
  const headers = Object.keys(data[0]);
  
  // Define which columns should be locked/readonly (typically ID columns)
  const lockedColumns = options.lockedColumns || ['id', 'product_id', 'parent_id'];
  
  // Set up columns with proper widths
  worksheet.columns = headers.map(header => ({
    header: header,
    key: header,
    width: getColumnWidth(header)
  }));
  
  // Style the header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4A5568' } // Dark gray
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 25;
  
  // Add data rows
  data.forEach((row, index) => {
    const dataRow = worksheet.addRow(row);
    
    // Alternate row colors for readability
    if (index % 2 === 1) {
      dataRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF7FAFC' } // Light gray
      };
    }
  });
  
  // Apply locked column styling (yellow background to indicate read-only)
  headers.forEach((header, colIndex) => {
    if (lockedColumns.includes(header)) {
      const col = worksheet.getColumn(colIndex + 1);
      col.eachCell((cell, rowNumber) => {
        if (rowNumber > 1) { // Skip header
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF3CD' } // Light yellow
          };
          cell.protection = { locked: true };
        }
      });
      // Update header to indicate read-only
      const headerCell = worksheet.getCell(1, colIndex + 1);
      headerCell.value = `${header} (read-only)`;
      headerCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFC107' } // Yellow header for locked columns
      };
      headerCell.font = { bold: true, color: { argb: 'FF000000' } };
    }
  });
  
  // Enable worksheet protection (locked cells can't be edited)
  await worksheet.protect('', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: true, // Allow adding rows
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: true, // Allow deleting rows
    sort: true,
    autoFilter: true,
    pivotTables: false
  });
  
  // Add auto-filter to header row
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length }
  };
  
  return workbook;
}

/**
 * Get appropriate column width based on header name
 */
function getColumnWidth(header) {
  const widths = {
    id: 10,
    product_id: 12,
    sku: 18,
    name: 35,
    description: 50,
    short_description: 40,
    price: 12,
    wholesale_price: 15,
    quantity: 12,
    category: 20,
    status: 12,
    parent_id: 12,
    parent_sku: 18,
    vendor_username: 20,
    google_product_category: 30,
    meta_description: 40
  };
  return widths[header] || 15;
}

/**
 * Generate product template based on user role and addons
 * @param {boolean} isAdmin - Whether user is admin
 * @param {Array} userAddons - User's active addon slugs
 */
function getProductTemplate(isAdmin, userAddons = []) {
  // Base template for vendors
  const vendorTemplate = {
    // Identification (SKU required for updates, empty = new product)
    sku: 'EXAMPLE-SKU-001',
    // Basic Info
    name: 'Example Product',
    price: '29.99',
    category: 'Art',
    status: 'draft',
    // Descriptions
    short_description: 'Brief product description',
    description: 'Full product description with details',
    // Dimensions & Weight
    width: '10',
    height: '8',
    depth: '2',
    weight: '1.5',
    dimension_unit: 'in',
    weight_unit: 'lbs',
    // Inventory
    quantity: '10',
    reorder_qty: '5',
    // Shipping
    ship_method: 'free',
    ship_rate: '',
    allow_returns: 'yes',
    // Search & Feeds
    gtin: '',
    mpn: '',
    google_product_category: '',
    meta_description: '',
    custom_label_0: '',
    custom_label_1: '',
    custom_label_2: '',
    custom_label_3: '',
    custom_label_4: '',
    // Marketplace
    marketplace_enabled: 'yes',
    // Parent/Child (for variants: set product_type to 'variant' and provide parent_sku)
    product_type: 'simple',
    parent_id: '',
    parent_sku: ''
  };

  // Add wholesale fields only if user has wholesale addon or is admin
  const hasWholesale = isAdmin || userAddons.includes('wholesale-addon');
  if (hasWholesale) {
    vendorTemplate.wholesale_price = '';
    vendorTemplate.wholesale_description = '';
  }

  // Admin gets additional fields
  if (isAdmin) {
    return [{
      // Admin can assign to vendor by username
      vendor_username: 'artist_username',
      ...vendorTemplate,
      // Admin-only fields
      marketplace_category: 'unsorted',
      parent_id: ''
    }];
  }

  return [vendorTemplate];
}

/**
 * Download current data as CSV or Excel
 * GET /csv/export/:jobType
 * Query params:
 *   - format=csv|xlsx (default: csv)
 *   - all=true (admin only) - export all products across all vendors
 */
router.get('/export/:jobType', verifyToken, async (req, res) => {
  try {
    const { jobType } = req.params;
    const userId = req.userId;
    const isAdmin = req.permissions?.includes('admin') || req.roles?.includes('admin');
    const exportAll = req.query.all === 'true' && isAdmin;
    const format = req.query.format || 'csv'; // Default to CSV for backward compatibility

    let filename, data;
    
    switch (jobType) {
      case 'inventory_upload':
        // Query database directly for user's products with inventory
        const [invProducts] = await db.execute(`
          SELECT p.id, p.sku, p.name, p.available_qty,
                 COALESCE(pi.qty_on_hand, p.available_qty, 0) as qty_on_hand
          FROM products p
          LEFT JOIN product_inventory pi ON p.id = pi.product_id
          WHERE p.vendor_id = ? AND p.status != 'deleted'
          ORDER BY p.name ASC
        `, [userId]);
        
        // Transform to export format for inventory upload
        data = invProducts.map(product => ({
          id: product.id, // Read-only reference
          sku: product.sku || '',
          name: product.name || '',
          quantity: product.qty_on_hand || 0,
          reason: ''
        }));
        
        filename = 'current_inventory';
        break;
      
      case 'product_upload':
        // Fetch user's addons for field filtering
        const [userAddons] = await db.execute(
          'SELECT addon_slug FROM user_addons WHERE user_id = ? AND is_active = 1',
          [userId]
        );
        const addonSlugs = userAddons.map(a => a.addon_slug);
        const hasWholesaleAddon = isAdmin || addonSlugs.includes('wholesale-addon');
        
        // Parse filter parameters
        const statusFilter = req.query.status || 'active';
        const categoryFilter = req.query.category_id;
        // Support both single vendor_id and multiple vendor_ids
        const vendorIds = req.query.vendor_ids 
          ? req.query.vendor_ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))
          : (req.query.vendor_id ? [parseInt(req.query.vendor_id)] : []);
        const priceMin = req.query.price_min ? parseFloat(req.query.price_min) : null;
        const priceMax = req.query.price_max ? parseFloat(req.query.price_max) : null;
        const wholesaleMin = req.query.wholesale_min ? parseFloat(req.query.wholesale_min) : null;
        const wholesaleMax = req.query.wholesale_max ? parseFloat(req.query.wholesale_max) : null;
        
        // Build WHERE conditions
        let whereConditions = [];
        let queryParams = [];
        
        // Status filter (admin can see deleted, others cannot)
        if (statusFilter === 'deleted' && isAdmin) {
          whereConditions.push('p.status = ?');
          queryParams.push('deleted');
        } else if (statusFilter === 'deleted') {
          // Non-admin tried to see deleted - show active instead
          whereConditions.push('p.status = ?');
          queryParams.push('active');
        } else {
          whereConditions.push('p.status = ?');
          queryParams.push(statusFilter);
        }
        
        // Vendor filter (only for admin with exportAll)
        if (exportAll && vendorIds.length > 0) {
          // Multiple vendors selected - use IN clause
          const placeholders = vendorIds.map(() => '?').join(',');
          whereConditions.push(`p.vendor_id IN (${placeholders})`);
          queryParams.push(...vendorIds);
        } else if (!exportAll) {
          // Non-admin: only their own products
          whereConditions.push('p.vendor_id = ?');
          queryParams.push(userId);
        }
        // If admin with no vendor filter, show all (no vendor WHERE clause)
        
        // Category filter
        if (categoryFilter) {
          whereConditions.push('p.category_id = ?');
          queryParams.push(categoryFilter);
        }
        
        // Price range filter
        if (priceMin !== null) {
          whereConditions.push('p.price >= ?');
          queryParams.push(priceMin);
        }
        if (priceMax !== null) {
          whereConditions.push('p.price <= ?');
          queryParams.push(priceMax);
        }
        
        // Wholesale price range filter (only if user has addon or is admin)
        if (hasWholesaleAddon) {
          if (wholesaleMin !== null) {
            whereConditions.push('p.wholesale_price >= ?');
            queryParams.push(wholesaleMin);
          }
          if (wholesaleMax !== null) {
            whereConditions.push('p.wholesale_price <= ?');
            queryParams.push(wholesaleMax);
          }
        }
        
        // Build query based on admin/vendor and exportAll flag
        let productQuery = `
          SELECT 
            p.id, p.sku, p.name, p.price, p.description, p.short_description,
            p.status, p.product_type, p.allow_returns,
            p.width, p.height, p.depth, p.weight, p.dimension_unit, p.weight_unit,
            p.wholesale_price, p.wholesale_description,
            p.marketplace_enabled, p.marketplace_category,
            pfm.gtin, pfm.mpn,
            p.parent_id, parent_prod.sku as parent_sku,
            p.vendor_id, p.created_at, p.updated_at,
            COALESCE(pi.qty_on_hand, 0) as quantity,
            COALESCE(pi.reorder_qty, 0) as reorder_qty,
            c.name as category_name,
            ps.ship_method, ps.ship_rate,
            pfm.google_product_category, pfm.meta_description,
            pfm.custom_label_0, pfm.custom_label_1, pfm.custom_label_2,
            pfm.custom_label_3, pfm.custom_label_4
            ${exportAll ? ', u.username as vendor_username' : ''}
          FROM products p
          LEFT JOIN products parent_prod ON p.parent_id = parent_prod.id
          LEFT JOIN product_inventory pi ON p.id = pi.product_id
          LEFT JOIN categories c ON p.category_id = c.id
          LEFT JOIN product_shipping ps ON p.id = ps.product_id
          LEFT JOIN product_feed_metadata pfm ON p.id = pfm.product_id
          ${exportAll ? 'LEFT JOIN users u ON p.vendor_id = u.id' : ''}
          WHERE ${whereConditions.join(' AND ')}
          ORDER BY p.name ASC
        `;
        
        const [products] = await db.execute(productQuery, queryParams);
        
        // Parse selected fields from query param (if provided)
        const selectedFields = req.query.fields ? req.query.fields.split(',') : null;
        
        // All available field mappings
        // Note: 'id' is always included for reference but marked as read-only in Excel exports
        const fieldMappings = {
          id: p => p.id, // Product ID - always included, read-only
          sku: p => p.sku || '',
          name: p => p.name || '',
          price: p => p.price || '',
          category: p => p.category_name || '',
          status: p => p.status || 'draft',
          short_description: p => p.short_description || '',
          description: p => p.description || '',
          width: p => p.width || '',
          height: p => p.height || '',
          depth: p => p.depth || '',
          weight: p => p.weight || '',
          dimension_unit: p => p.dimension_unit || 'in',
          weight_unit: p => p.weight_unit || 'lbs',
          quantity: p => p.quantity || 0,
          reorder_qty: p => p.reorder_qty || 0,
          ship_method: p => p.ship_method || 'free',
          ship_rate: p => p.ship_rate || '',
          allow_returns: p => p.allow_returns ? 'yes' : 'no',
          gtin: p => p.gtin || '',
          mpn: p => p.mpn || '',
          google_product_category: p => p.google_product_category || '',
          meta_description: p => p.meta_description || '',
          custom_label_0: p => p.custom_label_0 || '',
          custom_label_1: p => p.custom_label_1 || '',
          custom_label_2: p => p.custom_label_2 || '',
          custom_label_3: p => p.custom_label_3 || '',
          custom_label_4: p => p.custom_label_4 || '',
          marketplace_enabled: p => p.marketplace_enabled ? 'yes' : 'no',
          // Parent/Child relationship fields (available to all)
          product_type: p => p.product_type || 'simple',
          parent_id: p => p.parent_id || '',
          parent_sku: p => p.parent_sku || '',
          // Wholesale fields (addon-dependent)
          wholesale_price: p => hasWholesaleAddon ? (p.wholesale_price || '') : undefined,
          wholesale_description: p => hasWholesaleAddon ? (p.wholesale_description || '') : undefined,
          // Admin-only fields
          vendor_username: p => exportAll ? (p.vendor_username || '') : undefined,
          marketplace_category: p => exportAll ? (p.marketplace_category || 'unsorted') : undefined,
          product_id: p => exportAll ? p.id : undefined
        };
        
        // Transform to export format - filter by selected fields if provided
        data = products.map(p => {
          const row = {};
          const fieldsToInclude = selectedFields || Object.keys(fieldMappings);
          
          // Always include id first (read-only reference)
          if (fieldsToInclude.includes('id') || !selectedFields) {
            row.id = fieldMappings.id(p);
          }
          // Then sku and name
          if (fieldsToInclude.includes('sku') || !selectedFields) {
            row.sku = fieldMappings.sku(p);
          }
          if (fieldsToInclude.includes('name') || !selectedFields) {
            row.name = fieldMappings.name(p);
          }
          
          // Add other selected fields
          fieldsToInclude.forEach(field => {
            if (field !== 'id' && field !== 'sku' && field !== 'name' && fieldMappings[field]) {
              const value = fieldMappings[field](p);
              if (value !== undefined) {
                row[field] = value;
              }
            }
          });
          
          return row;
        });
        
        filename = exportAll ? 'all_products_export' : 'my_products_export';
        break;
      
      default:
        return res.status(400).json({ error: 'Export not available for this job type' });
    }
    
    // Output as Excel or CSV based on format parameter
    if (format === 'xlsx') {
      const workbook = await createExcelWorkbook(data, {
        sheetName: jobType === 'product_upload' ? 'Products' : 'Data',
        lockedColumns: ['id', 'product_id', 'parent_id'] // These columns will be locked/read-only
      });
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      
      await workbook.xlsx.write(res);
      res.end();
    } else {
      // Default: CSV output
      const csv = Papa.unparse(data);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      res.send(csv);
    }

  } catch (error) {
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

// ============================================================================
// SAVED REPORT CONFIGURATIONS
// ============================================================================

/**
 * Get user's saved report configurations
 * GET /csv/reports
 */
router.get('/reports', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    const [reports] = await db.execute(`
      SELECT id, name, fields, created_at, updated_at
      FROM csv_report_configs
      WHERE user_id = ?
      ORDER BY name ASC
    `, [userId]);

    // Handle JSON fields - MySQL JSON columns are already parsed as objects
    const parsedReports = reports.map(r => ({
      ...r,
      fields: typeof r.fields === 'string' ? JSON.parse(r.fields) : (r.fields || [])
    }));

    res.json({ success: true, reports: parsedReports });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch saved reports',
      details: error.message
    });
  }
});

/**
 * Save a new report configuration
 * POST /csv/reports
 */
router.post('/reports', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { name, fields } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Report name is required' });
    }

    if (!fields || !Array.isArray(fields) || fields.length < 2) {
      return res.status(400).json({ error: 'At least 2 fields are required' });
    }

    // Check for duplicate names
    const [existing] = await db.execute(
      'SELECT id FROM csv_report_configs WHERE user_id = ? AND name = ?',
      [userId, name.trim()]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'A report with this name already exists' });
    }

    // Insert new report config
    const [result] = await db.execute(`
      INSERT INTO csv_report_configs (user_id, name, fields)
      VALUES (?, ?, ?)
    `, [userId, name.trim(), JSON.stringify(fields)]);

    res.json({ 
      success: true, 
      report: {
        id: result.insertId,
        name: name.trim(),
        fields
      }
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to save report',
      details: error.message
    });
  }
});

/**
 * Delete a saved report configuration
 * DELETE /csv/reports/:reportId
 */
router.delete('/reports/:reportId', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { reportId } = req.params;

    // Verify ownership
    const [report] = await db.execute(
      'SELECT id FROM csv_report_configs WHERE id = ? AND user_id = ?',
      [reportId, userId]
    );

    if (report.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    await db.execute('DELETE FROM csv_report_configs WHERE id = ?', [reportId]);

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to delete report',
      details: error.message
    });
  }
});

module.exports = router; 