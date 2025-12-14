#!/usr/bin/env node
/**
 * Migration: Add walmart_product_type column
 */
require('dotenv').config();
const db = require('../config/db');

async function migrate() {
  try {
    // Check if column exists
    const [cols] = await db.query("SHOW COLUMNS FROM walmart_corporate_products LIKE 'walmart_product_type'");
    
    if (cols.length === 0) {
      console.log('Adding walmart_product_type column...');
      await db.query('ALTER TABLE walmart_corporate_products ADD COLUMN walmart_product_type VARCHAR(255) NULL AFTER walmart_category_path');
      console.log('✓ Column added successfully!');
    } else {
      console.log('✓ Column already exists');
    }
    
    // Verify
    const [verify] = await db.query("SHOW COLUMNS FROM walmart_corporate_products LIKE 'walmart_product_type'");
    console.log('Verified:', verify.length > 0 ? 'Column exists' : 'Column missing');
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

migrate();

