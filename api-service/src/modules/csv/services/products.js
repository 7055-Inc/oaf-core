/**
 * CSV Product Processor
 * Handles bulk product import using catalog module services directly
 */

const db = require('../../../../config/db');
const { productService } = require('../../catalog');
const { parseReturnPolicy, parseBoolean } = require('./parsers');
const { updateStatus, logRowError } = require('./jobs');

/**
 * Process product upload
 * @param {Object} job - Bull job object
 * @param {Array} csvData - Parsed CSV data
 * @returns {Promise<{processedRows: number, failedRows: number}>}
 */
async function processProductUpload(job, csvData) {
  const { jobId, userId, isAdmin } = job.data;
  let processedRows = 0;
  let failedRows = 0;
  const batchSize = parseInt(process.env.PROCESSING_BATCH_SIZE) || 10;

  // Pre-fetch categories for name-to-id mapping
  const [categories] = await db.execute('SELECT id, name FROM categories');
  const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));

  // Pre-fetch user's existing products for SKU lookup (update vs create)
  const [existingProducts] = await db.execute(
    'SELECT id, sku, vendor_id FROM products WHERE vendor_id = ? AND status != ?',
    [userId, 'deleted']
  );
  const skuToProductMap = new Map(existingProducts.map(p => [p.sku.toLowerCase(), p]));
  
  // If admin, pre-fetch username to vendor_id mapping
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

        // Validate required fields
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

        // Build product data
        const productData = {
          name: name,
          sku: sku || undefined,
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
          // Wholesale
          wholesale_price: row.wholesale_price ? parseFloat(row.wholesale_price) : null,
          wholesale_description: row.wholesale_description || '',
          // Marketplace
          marketplace_enabled: parseBoolean(row.marketplace_enabled, true),
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
          if (row.marketplace_category) {
            productData.marketplace_category = row.marketplace_category;
          }
          if (row.parent_id) {
            productData.parent_id = parseInt(row.parent_id);
          }
        }

        // Inventory data
        const quantity = row.quantity ? parseInt(row.quantity) : null;
        const reorderQty = row.reorder_qty ? parseInt(row.reorder_qty) : null;
        
        if (quantity !== null) {
          productData.qty_on_hand = quantity;
        }
        if (reorderQty !== null) {
          productData.reorder_qty = reorderQty;
        }

        let product;
        
        if (isUpdate) {
          // Update existing product using catalog service
          product = await productService.update(
            existingProduct.id, 
            vendorId, 
            productData, 
            isAdmin
          );
        } else {
          // Create new product using catalog service
          product = await productService.create(vendorId, productData);
          
          // Add to SKU map for duplicate detection within same upload
          if (sku && product.id) {
            skuToProductMap.set(sku.toLowerCase(), { id: product.id, sku, vendor_id: vendorId });
          }
        }
        
        processedRows++;
        
      } catch (error) {
        await logRowError(jobId, rowNumber, error.message, row);
        failedRows++;
      }
      
      // Update progress every 5 rows
      if (rowNumber % 5 === 0) {
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
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  return { processedRows, failedRows };
}

module.exports = {
  processProductUpload,
};
