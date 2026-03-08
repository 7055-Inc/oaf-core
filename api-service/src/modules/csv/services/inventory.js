/**
 * CSV Inventory Processor
 * Handles bulk inventory updates using catalog module services
 */

const db = require('../../../../config/db');
const { productService } = require('../../catalog');
const { updateStatus, logRowError } = require('./jobs');

/**
 * Process inventory upload
 * @param {Object} job - Bull job object
 * @param {Array} csvData - Parsed CSV data
 * @returns {Promise<{processedRows: number, failedRows: number}>}
 */
async function processInventoryUpload(job, csvData) {
  const { jobId, userId, isAdmin } = job.data;
  let processedRows = 0;
  let failedRows = 0;
  const batchSize = parseInt(process.env.PROCESSING_BATCH_SIZE) || 20;
  
  // Pre-fetch user's products for SKU lookup
  let productsQuery = 'SELECT id, sku, vendor_id FROM products WHERE status != ?';
  const queryParams = ['deleted'];
  
  if (!isAdmin) {
    productsQuery += ' AND vendor_id = ?';
    queryParams.push(userId);
  }
  
  const [products] = await db.execute(productsQuery, queryParams);
  const skuToProductMap = new Map(products.map(p => [p.sku.toLowerCase(), p]));

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
        const reorderQty = row.reorder_qty ? parseInt(row.reorder_qty) : undefined;
        
        // Find product by SKU
        const product = skuToProductMap.get(sku.toLowerCase());
        
        if (!product) {
          throw new Error(`Product with SKU '${sku}' not found`);
        }
        
        // Check ownership (unless admin)
        if (!isAdmin && product.vendor_id !== userId) {
          throw new Error(`Not authorized to update product '${sku}'`);
        }
        
        // Update inventory using catalog service
        await productService.updateInventory(product.id, {
          qty_on_hand: quantity,
          reorder_qty: reorderQty
        });
        
        processedRows++;
        
      } catch (error) {
        await logRowError(jobId, rowNumber, error.message, row);
        failedRows++;
      }
      
      // Update progress every 10 rows
      if (rowNumber % 10 === 0) {
        await updateStatus(jobId, 'processing', {
          processed_rows: processedRows,
          failed_rows: failedRows
        });
        
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
}

module.exports = {
  processInventoryUpload,
};
