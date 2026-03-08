/**
 * Import/Export Service
 * CSV/Excel import/export for product catalog
 * 
 * Uses Papa (papaparse) for CSV and ExcelJS for Excel files.
 * Import jobs are queued to Redis for background processing.
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Papa = require('papaparse');
const ExcelJS = require('exceljs');
const Queue = require('bull');
const db = require('../../../../config/db');

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

// All available product fields for export
const PRODUCT_FIELDS = {
  // Required
  sku: { label: 'SKU', required: true },
  name: { label: 'Product Name', required: true },
  // Basic
  price: { label: 'Price' },
  category: { label: 'Category' },
  status: { label: 'Status' },
  // Descriptions
  short_description: { label: 'Short Description' },
  description: { label: 'Full Description' },
  // Dimensions
  width: { label: 'Width' },
  height: { label: 'Height' },
  depth: { label: 'Depth' },
  weight: { label: 'Weight' },
  dimension_unit: { label: 'Dimension Unit' },
  weight_unit: { label: 'Weight Unit' },
  // Inventory
  quantity: { label: 'Quantity' },
  reorder_qty: { label: 'Reorder Quantity' },
  // Shipping
  ship_method: { label: 'Ship Method' },
  ship_rate: { label: 'Ship Rate' },
  allow_returns: { label: 'Return Policy' },
  // Identifiers
  gtin: { label: 'GTIN/UPC' },
  mpn: { label: 'MPN' },
  // Search & Feeds
  google_product_category: { label: 'Google Category' },
  meta_description: { label: 'Meta Description' },
  custom_label_0: { label: 'Custom Label 0' },
  custom_label_1: { label: 'Custom Label 1' },
  custom_label_2: { label: 'Custom Label 2' },
  custom_label_3: { label: 'Custom Label 3' },
  custom_label_4: { label: 'Custom Label 4' },
  // Marketplace
  marketplace_enabled: { label: 'Marketplace Enabled' },
  // Parent/Child
  product_type: { label: 'Product Type' },
  parent_id: { label: 'Parent ID' },
  parent_sku: { label: 'Parent SKU' },
  // Wholesale
  wholesale_price: { label: 'Wholesale Price' },
  wholesale_description: { label: 'Wholesale Description' },
  // Admin-only
  vendor_username: { label: 'Vendor Username', adminOnly: true },
  marketplace_category: { label: 'Marketplace Category', adminOnly: true },
  product_id: { label: 'Product ID', adminOnly: true },
};

/**
 * Export products to CSV/Excel
 * @param {number} vendorId - Vendor ID (null for admin all)
 * @param {Object} options - Export options
 * @returns {Promise<{buffer: Buffer, filename: string, contentType: string}>}
 */
async function exportProducts(vendorId, options = {}) {
  const {
    fields = ['sku', 'name', 'price'],
    status = 'active',
    categoryId = null,
    format = 'csv',
    isAdmin = false
  } = options;

  // Build query
  let query = `
    SELECT p.*, 
           c.name as category_name,
           i.qty_on_hand as quantity,
           i.reorder_qty,
           u.username as vendor_username,
           parent.sku as parent_sku
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN inventory i ON p.id = i.product_id
    LEFT JOIN users u ON p.vendor_id = u.id
    LEFT JOIN products parent ON p.parent_id = parent.id
    WHERE 1=1
  `;
  const params = [];

  if (vendorId && !isAdmin) {
    query += ' AND p.vendor_id = ?';
    params.push(vendorId);
  }

  if (status) {
    query += ' AND p.status = ?';
    params.push(status);
  }

  if (categoryId) {
    query += ' AND p.category_id = ?';
    params.push(categoryId);
  }

  query += ' ORDER BY p.created_at DESC';

  const [products] = await db.query(query, params);

  // Filter to requested fields
  const exportFields = fields.filter(f => {
    const fieldDef = PRODUCT_FIELDS[f];
    if (!fieldDef) return false;
    if (fieldDef.adminOnly && !isAdmin) return false;
    return true;
  });

  // Always include sku and name at the beginning
  const requiredFields = ['sku', 'name'];
  for (const rf of requiredFields.reverse()) {
    const idx = exportFields.indexOf(rf);
    if (idx > -1) exportFields.splice(idx, 1);
    exportFields.unshift(rf);
  }

  // Map products to export format
  const rows = products.map(product => {
    const row = {};
    for (const field of exportFields) {
      if (field === 'category') {
        row[field] = product.category_name || '';
      } else if (field === 'quantity') {
        row[field] = product.quantity || 0;
      } else if (field === 'product_id') {
        row[field] = product.id;
      } else {
        row[field] = product[field] ?? '';
      }
    }
    return row;
  });

  const headers = exportFields.map(f => PRODUCT_FIELDS[f]?.label || f);
  const timestamp = new Date().toISOString().slice(0, 10);

  if (format === 'xlsx') {
    // Generate Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Products');

    // Add headers
    worksheet.addRow(headers);

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    for (const row of rows) {
      const rowData = exportFields.map(f => row[f]);
      worksheet.addRow(rowData);
    }

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(12, (column.header?.length || 0) + 2);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      buffer,
      filename: `products_${timestamp}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  } else {
    // Generate CSV
    const csvData = Papa.unparse({
      fields: headers,
      data: rows.map(row => exportFields.map(f => row[f]))
    });
    
    return {
      buffer: Buffer.from(csvData, 'utf-8'),
      filename: `products_${timestamp}.csv`,
      contentType: 'text/csv'
    };
  }
}

/**
 * Get import job status
 * @param {string} jobId - Job ID (UUID)
 * @param {number} vendorId - Vendor ID
 * @returns {Promise<Object|null>}
 */
async function getJobStatus(jobId, vendorId) {
  const [jobs] = await db.query(
    `SELECT job_id, job_type, file_path, total_rows, processed_rows, 
            success_count, error_count, status, error_log, created_at, completed_at
     FROM csv_jobs 
     WHERE job_id = ? AND user_id = ?`,
    [jobId, vendorId]
  );
  return jobs[0] || null;
}

/**
 * Generate import template
 * @param {string} templateType - Template type (new_products, update_products)
 * @param {string} format - Format (csv, xlsx)
 * @returns {Promise<{buffer: Buffer, filename: string, contentType: string}>}
 */
async function generateTemplate(templateType, format = 'xlsx') {
  let fields, sampleRow;

  if (templateType === 'new_products' || templateType === 'product_upload') {
    // New products need more fields
    fields = ['sku', 'name', 'price', 'category', 'quantity', 'description', 'short_description'];
    sampleRow = {
      sku: 'SAMPLE-001',
      name: 'Sample Product',
      price: '29.99',
      category: 'Prints',
      quantity: '10',
      description: 'A sample product description',
      short_description: 'Short description'
    };
  } else {
    // Updates just need sku and fields to update
    fields = ['sku', 'name', 'price', 'quantity', 'status'];
    sampleRow = {
      sku: 'EXISTING-SKU',
      name: 'Updated Name',
      price: '39.99',
      quantity: '25',
      status: 'active'
    };
  }

  const headers = fields.map(f => PRODUCT_FIELDS[f]?.label || f);

  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template');

    // Add headers
    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add sample row
    worksheet.addRow(fields.map(f => sampleRow[f] || ''));

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = Math.max(15, (column.header?.length || 0) + 2);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      buffer,
      filename: `${templateType}_template.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  } else {
    const csvData = Papa.unparse({
      fields: headers,
      data: [fields.map(f => sampleRow[f] || '')]
    });
    
    return {
      buffer: Buffer.from(csvData, 'utf-8'),
      filename: `${templateType}_template.csv`,
      contentType: 'text/csv'
    };
  }
}

module.exports = {
  PRODUCT_FIELDS,
  exportProducts,
  getJobStatus,
  generateTemplate,
};
