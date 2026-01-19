/**
 * CSV Parsers Service
 * File parsing utilities for CSV and Excel files
 */

const fs = require('fs');
const Papa = require('papaparse');
const ExcelJS = require('exceljs');

/**
 * Parse a CSV or Excel file
 * @param {string} filePath - Path to the file
 * @param {string} fileName - Original file name
 * @returns {Promise<Array>} Parsed data rows
 */
async function parseFile(filePath, fileName) {
  const fileExt = fileName.toLowerCase().split('.').pop();
  
  if (fileExt === 'xlsx' || fileExt === 'xls') {
    return parseExcel(filePath);
  } else {
    return parseCSV(filePath);
  }
}

/**
 * Parse CSV file
 * @param {string} filePath - Path to the file
 * @returns {Promise<Array>}
 */
async function parseCSV(filePath) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => {
      // Clean header: lowercase, trim, remove "(read-only)" suffix
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
  
  return parsed.data;
}

/**
 * Parse Excel file
 * @param {string} filePath - Path to the file
 * @returns {Promise<Array>}
 */
async function parseExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];
  
  if (!worksheet || worksheet.rowCount < 2) {
    throw new Error('Excel file is empty or has no data rows');
  }
  
  // Get headers from first row
  const headers = [];
  worksheet.getRow(1).eachCell((cell, colNumber) => {
    let header = String(cell.value || '').trim().toLowerCase();
    header = header.replace(/\s*\(read-only\)\s*$/i, '');
    headers[colNumber] = header;
  });
  
  // Parse data rows
  const parsedData = [];
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
  
  return parsedData;
}

/**
 * Count rows in a file without fully parsing
 * @param {string} filePath - Path to the file
 * @param {string} fileName - Original file name
 * @returns {Promise<number>}
 */
async function countRows(filePath, fileName) {
  const fileExt = fileName.toLowerCase().split('.').pop();
  
  if (fileExt === 'xlsx' || fileExt === 'xls') {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];
    return worksheet ? worksheet.rowCount - 1 : 0; // Subtract header
  } else {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsed = Papa.parse(fileContent, { header: true });
    return parsed.data.length;
  }
}

/**
 * Parse return policy from CSV value to valid enum
 * @param {string} value - Input value
 * @returns {string}
 */
function parseReturnPolicy(value) {
  if (!value) return '30_day';
  const normalized = value.toString().toLowerCase().trim();
  
  if (normalized === '30_day' || normalized === '30 day' || normalized === '30days' || normalized === '30') {
    return '30_day';
  }
  if (normalized === '14_day' || normalized === '14 day' || normalized === '14days' || normalized === '14') {
    return '14_day';
  }
  if (normalized === 'exchange_only' || normalized === 'exchange only' || normalized === 'exchange') {
    return 'exchange_only';
  }
  if (normalized === 'no_returns' || normalized === 'no returns' || normalized === 'no' || normalized === 'none') {
    return 'no_returns';
  }
  if (normalized === 'yes' || normalized === 'true' || normalized === '1') {
    return '30_day';
  }
  if (normalized === 'false' || normalized === '0') {
    return 'no_returns';
  }
  
  return '30_day';
}

/**
 * Parse boolean from various input formats
 * @param {*} value - Input value
 * @param {boolean} defaultValue - Default if not parseable
 * @returns {boolean}
 */
function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const normalized = String(value).toLowerCase().trim();
  return normalized === 'yes' || normalized === 'true' || normalized === '1';
}

module.exports = {
  parseFile,
  parseCSV,
  parseExcel,
  countRows,
  parseReturnPolicy,
  parseBoolean,
};
