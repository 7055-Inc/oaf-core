#!/usr/bin/env node

/**
 * Marketplace Permissions Cron Job
 * 
 * Runs every 6 hours to:
 * 1. Enable marketplace for approved users
 * 2. Disable marketplace for non-approved users
 * 3. Auto-assign categories for new products based on user preference
 * 
 * Usage: node api-service/scripts/marketplace-permissions-cron.js
 * 
 * Add to crontab for every 6 hours:
 * 0 star-slash-6 star star star /usr/bin/node /var/www/main/api-service/scripts/marketplace-permissions-cron.js >> /var/log/marketplace-cron.log 2>&1
 */

const mysql = require('mysql2/promise');
const path = require('path');

// Database configuration
const dbConfig = {
  host: '10.128.0.31',
  user: 'oafuser', 
  password: 'oafpass',
  database: 'oaf',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

async function runMarketplacePermissionsCron() {
  let connection;
  
  try {
    console.log(`[${new Date().toISOString()}] Starting marketplace permissions cron job...`);
    
    // Create database connection
    connection = await mysql.createConnection(dbConfig);
    
    // 1. Enable marketplace for approved users
    console.log('Step 1: Enabling marketplace for approved users...');
    const [enableResult] = await connection.execute(`
      UPDATE products p
      JOIN marketplace_permissions mp ON p.vendor_id = mp.user_id
      SET p.marketplace_enabled = TRUE
      WHERE mp.status = 'approved' 
        AND p.marketplace_enabled = FALSE
    `);
    
    console.log(`Enabled marketplace for ${enableResult.affectedRows} products from approved users`);
    
    // 2. Disable marketplace for non-approved users
    console.log('Step 2: Disabling marketplace for non-approved users...');
    const [disableResult] = await connection.execute(`
      UPDATE products p
      LEFT JOIN marketplace_permissions mp ON p.vendor_id = mp.user_id
      SET p.marketplace_enabled = FALSE
      WHERE (mp.status IS NULL OR mp.status != 'approved')
        AND p.marketplace_enabled = TRUE
    `);
    
    console.log(`Disabled marketplace for ${disableResult.affectedRows} products from non-approved users`);
    
    // 3. Auto-assign categories for new products based on user preference
    console.log('Step 3: Auto-assigning categories for new products...');
    const [categoryResult] = await connection.execute(`
      UPDATE products p
      JOIN users u ON p.vendor_id = u.id
      JOIN marketplace_permissions mp ON u.id = mp.user_id
      SET p.marketplace_category = u.marketplace_auto_sort
      WHERE p.marketplace_enabled = TRUE
        AND p.marketplace_category = 'unsorted'
        AND u.marketplace_auto_sort IN ('art', 'crafts')
        AND mp.status = 'approved'
    `);
    
    console.log(`Auto-assigned categories for ${categoryResult.affectedRows} products`);
    
    // 4. Get summary statistics
    console.log('Step 4: Generating summary statistics...');
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_products,
        COUNT(CASE WHEN marketplace_enabled = TRUE THEN 1 END) as marketplace_enabled_count,
        COUNT(CASE WHEN marketplace_enabled = TRUE AND marketplace_category = 'art' THEN 1 END) as art_products,
        COUNT(CASE WHEN marketplace_enabled = TRUE AND marketplace_category = 'crafts' THEN 1 END) as crafts_products,
        COUNT(CASE WHEN marketplace_enabled = TRUE AND marketplace_category = 'unsorted' THEN 1 END) as unsorted_products
      FROM products
    `);
    
    const summary = stats[0];
    console.log('Summary Statistics:');
    console.log(`  Total products: ${summary.total_products}`);
    console.log(`  Marketplace enabled: ${summary.marketplace_enabled_count}`);
    console.log(`  Art category: ${summary.art_products}`);
    console.log(`  Crafts category: ${summary.crafts_products}`);
    console.log(`  Unsorted: ${summary.unsorted_products}`);
    
    // 5. Get user permission statistics
    const [userStats] = await connection.execute(`
      SELECT 
        status,
        COUNT(*) as user_count
      FROM marketplace_permissions
      GROUP BY status
      ORDER BY status
    `);
    
    console.log('User Permission Statistics:');
    userStats.forEach(stat => {
      console.log(`  ${stat.status}: ${stat.user_count} users`);
    });
    
    console.log(`[${new Date().toISOString()}] Marketplace permissions cron job completed successfully`);
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error in marketplace permissions cron job:`, error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the cron job
if (require.main === module) {
  runMarketplacePermissionsCron()
    .then(() => {
      console.log('Cron job finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cron job failed:', error);
      process.exit(1);
    });
}

module.exports = { runMarketplacePermissionsCron };
