/**
 * CSV Main Processor
 * Routes jobs to appropriate handlers
 */

const fs = require('fs');
const path = require('path');
const { parseFile } = require('./parsers');
const { updateStatus } = require('./jobs');
const { processProductUpload } = require('./products');
const { processInventoryUpload } = require('./inventory');

/**
 * Process a CSV job
 * @param {Object} job - Bull job object
 */
async function processJob(job) {
  const { jobId, userId, jobType, filePath, fileName, totalRows, isAdmin } = job.data;
  
  try {
    // Update status to processing
    await updateStatus(jobId, 'processing');
    
    // Parse the file
    const parsedData = await parseFile(filePath, fileName);
    
    // Process based on job type
    let result;
    switch (jobType) {
      case 'inventory_upload':
        result = await processInventoryUpload(job, parsedData);
        break;
        
      case 'product_upload':
        result = await processProductUpload(job, parsedData);
        break;
        
      case 'user_upload':
        // TODO: Implement user import using users module
        throw new Error('User upload not yet implemented');
        
      case 'event_upload':
        // TODO: Implement event import using events module
        throw new Error('Event upload not yet implemented');
        
      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
    
    // Final status update
    const errorSummary = result.failedRows > 0 ? 
      `${result.failedRows} rows failed processing` : null;
    
    await updateStatus(jobId, 'completed', {
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
    await updateStatus(jobId, 'failed', {
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
      console.error('Failed to clean up file:', cleanupError);
    }
  }
}

module.exports = {
  processJob,
};
