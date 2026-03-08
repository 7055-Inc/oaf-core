const Queue = require('bull');
const Papa = require('papaparse');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const clamscan = require('clamscan');

// Load worker-specific environment variables first
require('dotenv').config();
// Then load api-service environment variables for database credentials  
require('dotenv').config({ path: path.join(__dirname, '../api-service/.env') });

// Use existing database configuration for job tracking only
const db = require('../api-service/config/db');

// API configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.brakebee.com';

// Initialize Redis queue
const csvQueue = new Queue('CSV processing', {
  redis: {
    port: 6379,
    host: 'localhost'
  }
});

// Initialize ClamAV scanner
let clamscanInstance = null;
const initClamScan = async () => {
  try {
    clamscanInstance = await clamscan().init({
      removeInfected: false,
      quarantineInfected: false,
      scanLog: null,
      debugMode: false,
      fileList: null,
      scanRecursively: true,
      clamscan: {
        path: '/usr/bin/clamscan',
        scanArchives: true,
        active: true
      }
    });
  } catch (error) {
    // Continue without virus scanning if ClamAV fails
    clamscanInstance = null;
  }
};

// Check if JWT is expired and refresh if needed
const ensureValidJWT = async (userJWT, refreshToken) => {
  try {
    // Decode JWT without verification to check expiration
    const payload = JSON.parse(Buffer.from(userJWT.split('.')[1], 'base64').toString());
    const now = Math.floor(Date.now() / 1000);
    
    // If JWT expires within 5 minutes, refresh it
    if (payload.exp && (payload.exp - now) < 300) {
      // JWT is expired or about to expire, refresh it
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });
      
              if (!refreshResponse.ok) {
          throw new Error('Failed to refresh JWT token');
        }
      
      const refreshData = await refreshResponse.json();
      return `Bearer ${refreshData.token}`;
    }
    
    // JWT is still valid
    return userJWT;
  } catch (error) {
    throw new Error(`JWT validation/refresh failed: ${error.message}`);
  }
};

// Get CSRF token for API calls
const fetchCsrfToken = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/csrf-token`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch CSRF token');
    }

    const data = await response.json();
    return data.csrfToken;
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
};

// Make API call using user's JWT with CSRF protection
const makeAPICall = async (endpoint, options = {}, userJWT, refreshToken) => {
  // Ensure JWT is valid before making the call
  const validJWT = await ensureValidJWT(userJWT, refreshToken);
  
  const method = options.method || 'GET';
  const needsCsrf = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (validJWT) {
    headers['Authorization'] = validJWT;
  }

  // Add CSRF token for state-changing methods
  if (needsCsrf) {
    try {
      const csrfToken = await fetchCsrfToken();
      headers['X-CSRF-Token'] = csrfToken;
      
      // Add CSRF token to request body if it's JSON
      if (options.body && typeof options.body === 'string') {
        try {
          const bodyData = JSON.parse(options.body);
          bodyData._csrf = csrfToken;
          options.body = JSON.stringify(bodyData);
        } catch (e) {
          // Body isn't JSON, skip adding to body
        }
      }
    } catch (error) {
      console.error('Failed to add CSRF token:', error);
    }
  }
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: method,
    body: options.body,
    headers
  });
  
  return response;
};

// Update job status in database (direct DB access for job tracking only)
const updateJobStatus = async (jobId, status, updates = {}) => {
  try {
    const fields = ['status = ?'];
    const values = [status];
    
    Object.entries(updates).forEach(([key, value]) => {
      fields.push(`${key} = ?`);
      values.push(value);
    });
    
    if (status === 'completed' || status === 'failed') {
      fields.push('completed_at = NOW()');
    }
    
    values.push(jobId);
    
    const query = `UPDATE csv_upload_jobs SET ${fields.join(', ')} WHERE job_id = ?`;
    await db.execute(query, values);
  } catch (error) {
    throw error;
  }
};

// Log error for specific row (direct DB access for error logging only)
const logRowError = async (jobId, rowNumber, errorMessage, rawData) => {
  try {
    const query = `
      INSERT INTO csv_upload_errors (job_id, row_num, error_message, raw_data) 
      VALUES (?, ?, ?, ?)
    `;
    await db.execute(query, [jobId, rowNumber, errorMessage, JSON.stringify(rawData)]);
  } catch (error) {
    throw error;
  }
};

// Parse return policy from CSV value to valid enum
const parseReturnPolicy = (value) => {
  if (!value) return '30_day'; // Default
  const normalized = value.toString().toLowerCase().trim();
  
  // Map various input formats to valid enum values
  if (normalized === '30_day' || normalized === '30 day' || normalized === '30days' || normalized === '30') {
    return '30_day';
  }
  if (normalized === '14_day' || normalized === '14 day' || normalized === '14days' || normalized === '14') {
    return '14_day';
  }
  if (normalized === 'exchange_only' || normalized === 'exchange only' || normalized === 'exchange' || normalized === 'damage only') {
    return 'exchange_only';
  }
  if (normalized === 'no_returns' || normalized === 'no returns' || normalized === 'no' || normalized === 'none' || normalized === 'final sale' || normalized === 'all sales final') {
    return 'no_returns';
  }
  // Legacy boolean support
  if (normalized === 'yes' || normalized === 'true' || normalized === '1') {
    return '30_day';
  }
  if (normalized === 'false' || normalized === '0') {
    return 'no_returns';
  }
  
  return '30_day'; // Default fallback
};

// Process inventory upload using user's JWT with refresh capability
const processInventoryUpload = async (job, csvData) => {
  const { jobId, userId, userJWT, userRefreshToken } = job.data;
  let processedRows = 0;
  let failedRows = 0;
  const batchSize = parseInt(process.env.PROCESSING_BATCH_SIZE) || 20;
  
  for (let i = 0; i < csvData.length; i += batchSize) {
    const batch = csvData.slice(i, i + batchSize);
    
    for (const [index, row] of batch.entries()) {
      const rowNumber = i + index + 1;
      
      try {
        // Validate required fields
        if (!row.sku || row.sku.trim() === '') {
          throw new Error('SKU is required');
        }
        
        if (!row.quantity || isNaN(parseInt(row.quantity))) {
          throw new Error('Valid quantity is required');
        }
        
        const sku = row.sku.trim();
        const quantity = parseInt(row.quantity);
        const reason = row.reason || 'CSV bulk update';
        
                // Get user's products using internal CSV endpoint (no CSRF needed)
        const productsResponse = await makeAPICall(`/csv/internal/products/${userId}`, { method: 'GET' }, userJWT, userRefreshToken);
        if (!productsResponse.ok) {
          throw new Error('Failed to fetch user products');
        }
        
        const responseData = await productsResponse.json();
        const products = responseData.products || [];
        const product = products.find(p => p.sku === sku);
        
        if (!product) {
          throw new Error(`Product with SKU '${sku}' not found`);
        }
        
        // Update inventory using internal CSV endpoint (no CSRF needed)
        const inventoryResponse = await makeAPICall(`/csv/internal/inventory/${product.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            qty_on_hand: quantity,
            change_type: 'manual_adjustment',
            reason: reason
          })
        }, userJWT, userRefreshToken);
        
                  if (!inventoryResponse.ok) {
            const errorData = await inventoryResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to update inventory');
          }
        
        processedRows++;
        
      } catch (error) {
        await logRowError(jobId, rowNumber, error.message, row);
        failedRows++;
      }
      
      // Update progress every 10 rows
      if (rowNumber % 10 === 0) {
        await updateJobStatus(jobId, 'processing', {
          processed_rows: processedRows,
          failed_rows: failedRows
        });
        
        // Update job progress in Bull
        const progress = Math.round((rowNumber / csvData.length) * 100);
        job.progress(progress);
      }
    }
    
    // Small delay between batches
    if (i + batchSize < csvData.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return { processedRows, failedRows };
};

// Process product upload - create or update products via CSV
const processProductUpload = async (job, csvData) => {
  const { jobId, userId, userJWT, userRefreshToken } = job.data;
  let processedRows = 0;
  let failedRows = 0;
  const batchSize = parseInt(process.env.PROCESSING_BATCH_SIZE) || 10;
  
  // Check if user is admin (for vendor_username assignment)
  let isAdmin = false;
  try {
    const payload = JSON.parse(Buffer.from(userJWT.split('.')[1], 'base64').toString());
    isAdmin = payload.permissions?.includes('admin') || payload.roles?.includes('admin');
  } catch (e) {
    // Continue as non-admin
  }

  // Pre-fetch categories for name-to-id mapping
  const [categories] = await db.execute('SELECT id, name FROM categories');
  const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

  // Pre-fetch user's existing products for SKU lookup (update vs create)
  const [existingProducts] = await db.execute(
    'SELECT id, sku, vendor_id FROM products WHERE vendor_id = ? AND status != ?',
    [userId, 'deleted']
  );
  const skuToProductMap = new Map(existingProducts.map(p => [p.sku.toLowerCase(), p]));
  
  // If admin, also pre-fetch username to vendor_id mapping
  let usernameToVendorMap = new Map();
  if (isAdmin) {
    const [vendors] = await db.execute('SELECT id, username FROM users');
    usernameToVendorMap = new Map(vendors.map(v => [v.username.toLowerCase(), v.id]));
  }

  for (let i = 0; i < csvData.length; i += batchSize) {
    const batch = csvData.slice(i, i + batchSize);
    
    for (const [index, row] of batch.entries()) {
      const rowNumber = i + index + 1;
      
      try {
        // Determine vendor_id (admin can specify vendor_username)
        let vendorId = userId;
        if (isAdmin && row.vendor_username) {
          const lookupVendorId = usernameToVendorMap.get(row.vendor_username.toLowerCase());
          if (!lookupVendorId) {
            throw new Error(`Vendor username '${row.vendor_username}' not found`);
          }
          vendorId = lookupVendorId;
        }

        // Validate required fields for new products
        const sku = row.sku?.trim();
        const name = row.name?.trim();
        
        if (!name) {
          throw new Error('Product name is required');
        }

        // Check if this is an update or create
        const existingProduct = sku ? skuToProductMap.get(sku.toLowerCase()) : null;
        const isUpdate = !!existingProduct;

        // Map category name to ID
        let categoryId = 1; // Default to "Uncategorized"
        if (row.category) {
          const catId = categoryMap.get(row.category.toLowerCase());
          if (catId) {
            categoryId = catId;
          }
        }

        // Build product payload
        const productPayload = {
          name: name,
          sku: sku || undefined, // Let API generate if empty
          price: parseFloat(row.price) || 0,
          category_id: categoryId,
          status: row.status || 'draft',
          product_type: row.product_type || 'simple',
          description: row.description || '',
          short_description: row.short_description || '',
          allow_returns: parseReturnPolicy(row.allow_returns),
          // Dimensions
          width: row.width ? parseFloat(row.width) : null,
          height: row.height ? parseFloat(row.height) : null,
          depth: row.depth ? parseFloat(row.depth) : null,
          weight: row.weight ? parseFloat(row.weight) : null,
          dimension_unit: row.dimension_unit || 'in',
          weight_unit: row.weight_unit || 'lbs',
          // Shipping
          ship_method: row.ship_method || 'free',
          ship_rate: row.ship_rate ? parseFloat(row.ship_rate) : null,
          // Wholesale (optional)
          wholesale_price: row.wholesale_price ? parseFloat(row.wholesale_price) : null,
          wholesale_description: row.wholesale_description || '',
          // Marketplace
          marketplace_enabled: row.marketplace_enabled?.toLowerCase() === 'yes' || row.marketplace_enabled === '1' || row.marketplace_enabled === 'true',
          // Search/Feed metadata
          gtin: row.gtin || '',
          mpn: row.mpn || '',
          google_product_category: row.google_product_category || '',
          meta_description: row.meta_description || '',
          custom_label_0: row.custom_label_0 || '',
          custom_label_1: row.custom_label_1 || '',
          custom_label_2: row.custom_label_2 || '',
          custom_label_3: row.custom_label_3 || '',
          custom_label_4: row.custom_label_4 || ''
        };

        // Admin-only fields
        if (isAdmin) {
          productPayload.vendor_id = vendorId;
          if (row.marketplace_category) {
            productPayload.marketplace_category = row.marketplace_category;
          }
          if (row.parent_id) {
            productPayload.parent_id = parseInt(row.parent_id);
          }
        }

        // Inventory (handled separately after product create/update)
        const quantity = row.quantity ? parseInt(row.quantity) : null;
        const reorderQty = row.reorder_qty ? parseInt(row.reorder_qty) : null;

        let productId;
        
        if (isUpdate) {
          // Update existing product
          productId = existingProduct.id;
          
          const response = await makeAPICall(`/products/${productId}`, {
            method: 'PUT',
            body: JSON.stringify(productPayload)
          }, userJWT, userRefreshToken);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.error || 'Failed to update product');
          }
        } else {
          // Create new product
          const response = await makeAPICall('/products', {
            method: 'POST',
            body: JSON.stringify(productPayload)
          }, userJWT, userRefreshToken);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.error || 'Failed to create product');
          }
          
          const data = await response.json();
          productId = data.product?.id;
          
          // Add to SKU map for duplicate detection within same upload
          if (sku && productId) {
            skuToProductMap.set(sku.toLowerCase(), { id: productId, sku, vendor_id: vendorId });
          }
        }

        // Update inventory if quantity provided
        if (quantity !== null && productId) {
          const inventoryResponse = await makeAPICall(`/csv/internal/inventory/${productId}`, {
            method: 'PUT',
            body: JSON.stringify({
              qty_on_hand: quantity,
              reorder_qty: reorderQty,
              change_type: 'csv_import',
              reason: 'CSV product upload'
            })
          }, userJWT, userRefreshToken);
          
          // Don't fail the row if inventory update fails, just continue
          if (!inventoryResponse.ok) {
            // Inventory update failed but product was created/updated
          }
        }
        
        processedRows++;
        
      } catch (error) {
        await logRowError(jobId, rowNumber, error.message, row);
        failedRows++;
      }
      
      // Update progress every 5 rows (products are more complex)
      if (rowNumber % 5 === 0) {
        await updateJobStatus(jobId, 'processing', {
          processed_rows: processedRows,
          failed_rows: failedRows
        });
        
        const progress = Math.round((rowNumber / csvData.length) * 100);
        job.progress(progress);
      }
    }
    
    // Small delay between batches
    if (i + batchSize < csvData.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return { processedRows, failedRows };
};

// Main job processor
csvQueue.process('process-csv', parseInt(process.env.MAX_CONCURRENT_JOBS) || 3, async (job) => {
  const { jobId, userId, userJWT, userRefreshToken, jobType, filePath, fileName, totalRows } = job.data;
  
  try {
    // Update status to processing
    await updateJobStatus(jobId, 'processing');
    
    // Virus scan if available
    if (clamscanInstance && process.env.CLAM_SCAN_ENABLED === 'true') {
      const scanResult = await clamscanInstance.isInfected(filePath);
      
      if (scanResult.isInfected) {
        throw new Error(`File failed virus scan: ${scanResult.viruses.join(', ')}`);
      }
    }
    
    // Detect file type and parse accordingly
    const fileExt = path.extname(fileName).toLowerCase();
    let parsedData = [];
    
    if (fileExt === '.xlsx' || fileExt === '.xls') {
      // Parse Excel file
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      const worksheet = workbook.worksheets[0];
      
      if (!worksheet || worksheet.rowCount < 2) {
        throw new Error('Excel file is empty or has no data rows');
      }
      
      // Get headers from first row
      const headers = [];
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        // Clean header: lowercase, trim, remove " (read-only)" suffix
        let header = String(cell.value || '').trim().toLowerCase();
        header = header.replace(/\s*\(read-only\)\s*$/i, '');
        headers[colNumber] = header;
      });
      
      // Parse data rows
      for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
        const row = worksheet.getRow(rowNumber);
        const rowData = {};
        let hasData = false;
        
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            let value = cell.value;
            // Handle different cell types
            if (value && typeof value === 'object') {
              if (value.text) value = value.text; // Rich text
              else if (value.result) value = value.result; // Formula
              else if (value instanceof Date) value = value.toISOString().split('T')[0];
              else value = String(value);
            }
            rowData[header] = value !== null && value !== undefined ? String(value).trim() : '';
            if (rowData[header]) hasData = true;
          }
        });
        
        // Only add rows that have at least some data
        if (hasData) {
          parsedData.push(rowData);
        }
      }
      
      if (parsedData.length === 0) {
        throw new Error('Excel file has no valid data rows');
      }
    } else {
      // Parse CSV file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parsed = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => {
          // Clean header: lowercase, trim, remove " (read-only)" suffix
          let cleanHeader = header.trim().toLowerCase();
          cleanHeader = cleanHeader.replace(/\s*\(read-only\)\s*$/i, '');
          return cleanHeader;
        }
      });
      
      if (parsed.errors.length > 0) {
        const errorMessages = parsed.errors.map(err => `Line ${err.row}: ${err.message}`).join('; ');
        throw new Error(`CSV parsing errors: ${errorMessages}`);
      }
      
      if (parsed.data.length === 0) {
        throw new Error('CSV file is empty or has no valid data rows');
      }
      
      parsedData = parsed.data;
    }
    
    // Process based on job type using user's JWT with refresh capability
    let result;
    switch (jobType) {
      case 'inventory_upload':
        result = await processInventoryUpload(job, parsedData);
        break;
      case 'user_upload':
        throw new Error('User upload not yet implemented');
      case 'product_upload':
        result = await processProductUpload(job, parsedData);
        break;
      case 'event_upload':
        throw new Error('Event upload not yet implemented');
      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
    
    // Final status update
    const status = 'completed';
    const errorSummary = result.failedRows > 0 ? 
      `${result.failedRows} rows failed processing` : null;
    
    await updateJobStatus(jobId, status, {
      processed_rows: result.processedRows,
      failed_rows: result.failedRows,
      error_summary: errorSummary
    });
    
    return {
      success: true,
      processedRows: result.processedRows,
      failedRows: result.failedRows
    };
    
  } catch (error) {
    await updateJobStatus(jobId, 'failed', {
      error_summary: error.message
    });
    
    throw error;
  } finally {
    // Clean up uploaded file
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await csvQueue.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await csvQueue.close();
  process.exit(0);
});

// Initialize and start
const init = async () => {
  await initClamScan();
};

init().catch(() => {
  process.exit(1);
}); 