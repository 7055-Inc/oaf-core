/**
 * CSV Templates Service
 * Generate download templates for different job types
 */

const Papa = require('papaparse');
const ExcelJS = require('exceljs');

/**
 * Get column width based on header name
 */
function getColumnWidth(header) {
  const widths = {
    'description': 40,
    'short_description': 30,
    'meta_description': 35,
    'name': 25,
    'sku': 15,
    'price': 12,
    'category': 20,
    'status': 12,
    'quantity': 12,
    'email': 25,
    'username': 20,
    'display_name': 25
  };
  return widths[header] || 15;
}

/**
 * Get product template data
 * @param {boolean} isAdmin - Include admin-only fields
 * @param {Array} userAddons - User's active addons
 * @returns {Array}
 */
function getProductTemplate(isAdmin, userAddons = []) {
  const template = {
    sku: 'EXAMPLE-001',
    name: 'Example Product',
    price: '29.99',
    category: 'Prints',
    status: 'draft',
    product_type: 'simple',
    quantity: '10',
    reorder_qty: '5',
    description: 'Full product description goes here',
    short_description: 'Brief description',
    allow_returns: '30_day',
    width: '8',
    height: '10',
    depth: '0.5',
    weight: '0.5',
    dimension_unit: 'in',
    weight_unit: 'lbs',
    ship_method: 'free',
    ship_rate: '',
    marketplace_enabled: 'yes',
    gtin: '',
    mpn: '',
    google_product_category: 'Arts & Entertainment > Hobbies & Creative Arts > Arts & Crafts',
    meta_description: 'SEO description for search engines'
  };

  // Add wholesale fields if user has addon
  if (userAddons.includes('wholesale-addon')) {
    template.wholesale_price = '19.99';
    template.wholesale_description = 'Wholesale pricing available';
  }

  // Add admin-only fields
  if (isAdmin) {
    template.vendor_username = '';
    template.marketplace_category = 'unsorted';
    template.parent_id = '';
  }

  return [template];
}

/**
 * Get template data for a job type
 * @param {string} jobType - Job type
 * @param {boolean} isAdmin - Include admin fields
 * @param {Array} userAddons - User's active addons
 * @returns {Array}
 */
function getTemplateData(jobType, isAdmin = false, userAddons = []) {
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

  return templates[jobType] || [];
}

/**
 * Generate CSV template
 * @param {string} jobType - Job type
 * @param {boolean} isAdmin - Include admin fields
 * @param {Array} userAddons - User's active addons
 * @returns {string}
 */
function generateCSVTemplate(jobType, isAdmin = false, userAddons = []) {
  const data = getTemplateData(jobType, isAdmin, userAddons);
  return Papa.unparse(data);
}

/**
 * Generate Excel template
 * @param {string} jobType - Job type
 * @param {boolean} isAdmin - Include admin fields
 * @param {Array} userAddons - User's active addons
 * @returns {Promise<ExcelJS.Workbook>}
 */
async function generateExcelTemplate(jobType, isAdmin = false, userAddons = []) {
  const data = getTemplateData(jobType, isAdmin, userAddons);
  
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Brakebee';
  workbook.created = new Date();
  
  const sheetName = jobType.replace('_upload', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  const worksheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: 1 }]
  });
  
  if (data.length === 0) {
    return workbook;
  }
  
  const headers = Object.keys(data[0]);
  
  // Set up columns
  worksheet.columns = headers.map(header => ({
    header: header,
    key: header,
    width: getColumnWidth(header)
  }));
  
  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4A90A4' }
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  
  // Add data rows
  data.forEach(row => {
    const rowValues = headers.map(h => row[h] || '');
    worksheet.addRow(rowValues);
  });
  
  return workbook;
}

module.exports = {
  getTemplateData,
  generateCSVTemplate,
  generateExcelTemplate,
  getProductTemplate,
};
