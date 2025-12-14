#!/usr/bin/env node
/**
 * Walmart Marketplace Inventory Feed
 * 
 * Updates inventory levels for Walmart-listed products
 * Run periodically to sync inventory with Walmart
 * 
 * Usage:
 *   node walmart-inventory-feed.js         # Generate feed only
 *   node walmart-inventory-feed.js --push  # Generate and submit to Walmart
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '../api-service/.env') });

// Use existing database configuration
const db = require('../api-service/config/db');

// Configuration
const FEED_OUTPUT_PATH = path.join(__dirname, '../public/feeds/walmart-inventory-feed.json');
const BASE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://brakebee.com';

// Ensure feeds directory exists
const feedsDir = path.dirname(FEED_OUTPUT_PATH);
if (!fs.existsSync(feedsDir)) {
  fs.mkdirSync(feedsDir, { recursive: true });
}

/**
 * Fetch products with Walmart allocations and their inventory
 */
async function fetchWalmartInventory() {
  const query = `
    SELECT 
      p.id,
      p.sku,
      p.name,
      
      -- Walmart allocation (primary source)
      COALESCE(wia.allocated_quantity, 0) as allocated_qty,
      
      -- General inventory (fallback)
      COALESCE(inv.qty_available, 0) as available_qty,
      
      -- Walmart listing info
      wcp.listing_status,
      wcp.is_active
      
    FROM products p
    
    -- Must have active Walmart listing
    INNER JOIN walmart_corporate_products wcp ON p.id = wcp.product_id
    
    -- Walmart inventory allocations
    LEFT JOIN walmart_inventory_allocations wia ON p.id = wia.product_id
    
    -- General inventory
    LEFT JOIN product_inventory inv ON p.id = inv.product_id
    
    WHERE p.status = 'active'
      AND wcp.is_active = 1
      AND wcp.listing_status IN ('pending', 'listed')
    
    ORDER BY p.id ASC
  `;

  const [rows] = await db.execute(query);
  return rows;
}

/**
 * Generate the inventory feed JSON
 */
async function generateFeed() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting Walmart Inventory feed generation...`);
  
  try {
    // Fetch products with inventory
    console.log('Fetching Walmart inventory allocations...');
    const products = await fetchWalmartInventory();
    console.log(`Found ${products.length} products with Walmart listings`);
    
    if (products.length === 0) {
      console.warn('No products found for inventory feed.');
      return { success: true, productsCount: 0, outputPath: FEED_OUTPUT_PATH };
    }
    
    // Build inventory items
    const inventoryItems = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const product of products) {
      try {
        if (!product.sku) {
          console.warn(`  Skipping product ${product.id}: No SKU`);
          errorCount++;
          continue;
        }
        
        // Use allocated qty if set, otherwise use available inventory
        const quantity = product.allocated_qty > 0 
          ? product.allocated_qty 
          : product.available_qty;
        
        inventoryItems.push({
          sku: product.sku,
          quantity: {
            unit: 'EACH',
            amount: parseInt(quantity) || 0
          }
        });
        
        successCount++;
      } catch (err) {
        console.error(`  Error processing product ${product.id}:`, err.message);
        errorCount++;
      }
    }
    
    // Build complete feed structure
    const feed = {
      InventoryHeader: {
        version: '1.4'
      },
      Inventory: inventoryItems
    };
    
    // Write to file
    console.log(`Writing feed to ${FEED_OUTPUT_PATH}...`);
    fs.writeFileSync(FEED_OUTPUT_PATH, JSON.stringify(feed, null, 2), 'utf8');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[${new Date().toISOString()}] Walmart Inventory feed generation complete!`);
    console.log(`  - Products processed: ${successCount}`);
    console.log(`  - Errors: ${errorCount}`);
    console.log(`  - Output: ${FEED_OUTPUT_PATH}`);
    console.log(`  - Duration: ${duration}s`);
    
    return {
      success: true,
      productsCount: successCount,
      errorCount,
      outputPath: FEED_OUTPUT_PATH,
      feed
    };
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Walmart inventory feed generation failed:`, error);
    throw error;
  }
}

/**
 * Push inventory feed to Walmart API
 */
async function pushFeedToWalmart(feedData) {
  const axios = require('axios');
  
  console.log('Pushing inventory feed to Walmart API...');
  
  // Use provided feedData or read from file
  let feed;
  if (feedData) {
    feed = feedData;
  } else if (fs.existsSync(FEED_OUTPUT_PATH)) {
    feed = JSON.parse(fs.readFileSync(FEED_OUTPUT_PATH, 'utf8'));
  } else {
    throw new Error('Feed file not found. Run generateFeed() first.');
  }
  
  if (!feed.Inventory || feed.Inventory.length === 0) {
    throw new Error('No inventory items in feed to submit.');
  }
  
  console.log(`Submitting inventory for ${feed.Inventory.length} item(s)...`);
  
  // Get Walmart credentials
  const baseUrl = 'https://marketplace.walmartapis.com';
  const clientId = process.env.WALMART_CLIENT_ID;
  const clientSecret = process.env.WALMART_CLIENT_SECRET;
  
  // Get access token
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const tokenRes = await axios.post(
    `${baseUrl}/v3/token`,
    'grant_type=client_credentials',
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'WM_SVC.NAME': 'Brakebee Marketplace',
        'WM_QOS.CORRELATION_ID': `brakebee-inv-${Date.now()}`
      }
    }
  );
  
  const token = tokenRes.data.access_token;
  
  // Submit inventory feed
  const feedRes = await axios.post(
    `${baseUrl}/v3/feeds?feedType=inventory`,
    JSON.stringify(feed),
    {
      headers: {
        'WM_SEC.ACCESS_TOKEN': token,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'WM_SVC.NAME': 'Brakebee Marketplace',
        'WM_QOS.CORRELATION_ID': `brakebee-inv-feed-${Date.now()}`
      }
    }
  );
  
  console.log('Inventory feed submitted successfully!');
  console.log('Feed ID:', feedRes.data.feedId);
  
  return feedRes.data;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Generate the feed
    const result = await generateFeed();
    
    // Optionally push to Walmart if --push flag provided
    if (process.argv.includes('--push')) {
      if (result.productsCount === 0) {
        console.log('\nNo inventory to push.');
      } else {
        console.log('\n--- Pushing to Walmart API ---');
        const pushResult = await pushFeedToWalmart(result.feed);
        console.log('Feed ID:', pushResult.feedId);
      }
    }
    
    // Close database connection
    await db.end();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error.message);
    await db.end();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateFeed, pushFeedToWalmart };

