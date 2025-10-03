const Queue = require('bull');
const Papa = require('papaparse');
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
const API_BASE_URL = 'https://api.beemeeart.com';

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
    
    // Read and parse CSV
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase()
    });
    
    if (parsed.errors.length > 0) {
      const errorMessages = parsed.errors.map(err => `Line ${err.row}: ${err.message}`).join('; ');
      throw new Error(`CSV parsing errors: ${errorMessages}`);
    }
    
    if (parsed.data.length === 0) {
      throw new Error('CSV file is empty or has no valid data rows');
    }
    
    // Process based on job type using user's JWT with refresh capability
    let result;
    switch (jobType) {
      case 'inventory_upload':
        result = await processInventoryUpload(job, parsed.data);
        break;
      case 'user_upload':
        throw new Error('User upload not yet implemented');
      case 'product_upload':
        throw new Error('Product upload not yet implemented');
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