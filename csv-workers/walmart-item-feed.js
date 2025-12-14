#!/usr/bin/env node
/**
 * Walmart Marketplace Item Feed Generator
 * 
 * Generates an XML feed of products for Walmart Marketplace
 * Output: /var/www/main/public/feeds/walmart-item-feed.xml
 * 
 * Can run standalone or be triggered to push to Walmart API
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '../api-service/.env') });

// Use existing database configuration
const db = require('../api-service/config/db');

// Configuration
const FEED_OUTPUT_PATH = path.join(__dirname, '../public/feeds/walmart-item-feed.xml');
const BASE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://brakebee.com';
const API_BASE_URL = process.env.API_BASE_URL || 'https://api.brakebee.com';

// Ensure feeds directory exists
const feedsDir = path.dirname(FEED_OUTPUT_PATH);
if (!fs.existsSync(feedsDir)) {
  fs.mkdirSync(feedsDir, { recursive: true });
}

/**
 * Fetch products that are enabled for Walmart
 */
async function fetchWalmartProducts() {
  const query = `
    SELECT 
      p.id,
      p.sku,
      p.name,
      p.description,
      p.short_description,
      p.price,
      p.wholesale_price,
      p.status,
      p.vendor_id,
      p.parent_id,
      p.product_type,
      p.width,
      p.height,
      p.depth,
      p.weight,
      p.dimension_unit,
      p.weight_unit,
      p.marketplace_enabled,
      
      -- Walmart-specific data
      wcp.walmart_title,
      wcp.walmart_description,
      wcp.walmart_short_description,
      wcp.walmart_price,
      wcp.walmart_category_id,
      wcp.walmart_category_path,
      wcp.walmart_product_type,
      wcp.walmart_brand,
      wcp.walmart_manufacturer,
      wcp.walmart_key_features,
      wcp.walmart_main_image_url,
      wcp.walmart_additional_images,
      wcp.walmart_color,
      wcp.walmart_size,
      wcp.walmart_material,
      wcp.walmart_msrp,
      wcp.walmart_shipping_weight,
      wcp.walmart_shipping_length,
      wcp.walmart_shipping_width,
      wcp.walmart_shipping_height,
      wcp.walmart_tax_code,
      wcp.listing_status,
      wcp.is_active as walmart_active,
      wcp.terms_accepted_at,
      
      -- Feed metadata
      pfm.gtin,
      pfm.mpn,
      
      -- Brand info
      COALESCE(ap.business_name, 'Brakebee') as vendor_brand,
      
      -- Inventory
      COALESCE(inv.qty_available, 0) as qty_available,
      
      -- Inventory allocation for Walmart
      wia.allocated_quantity as walmart_allocated_qty
      
    FROM products p
    
    -- Join Walmart corporate products
    INNER JOIN walmart_corporate_products wcp ON p.id = wcp.product_id
    
    -- Join feed metadata
    LEFT JOIN product_feed_metadata pfm ON p.id = pfm.product_id
    
    -- Join vendor info
    LEFT JOIN artist_profiles ap ON p.vendor_id = ap.user_id
    
    -- Join inventory
    LEFT JOIN product_inventory inv ON p.id = inv.product_id
    
    -- Join Walmart allocations
    LEFT JOIN walmart_inventory_allocations wia ON p.id = wia.product_id
    
    WHERE p.status = 'active'
      AND wcp.is_active = 1
      AND wcp.listing_status IN ('pending', 'listed')
      AND p.price > 0
    
    ORDER BY p.id ASC
  `;

  const [rows] = await db.execute(query);
  return rows;
}

/**
 * Fetch primary image for a product
 */
async function fetchProductImage(productId, vendorId) {
  const [images] = await db.query(
    `SELECT image_url FROM product_images 
     WHERE product_id = ? 
     ORDER BY is_primary DESC, \`order\` ASC 
     LIMIT 1`,
    [productId]
  );
  
  if (images.length && images[0].image_url) {
    const url = images[0].image_url;
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL}${url}`;
  }
  
  // Fallback to pending_images
  const [pending] = await db.query(
    `SELECT image_path, permanent_url FROM pending_images 
     WHERE image_path LIKE ? 
     ORDER BY created_at ASC 
     LIMIT 1`,
    [`/temp_images/products/${vendorId}-${productId}-%`]
  );
  
  if (pending.length) {
    if (pending[0].permanent_url) return pending[0].permanent_url;
    return `${API_BASE_URL}${pending[0].image_path}`;
  }
  
  return null;
}

/**
 * Escape XML special characters
 */
function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Map product to Walmart category
 * Walmart requires specific product type for each category
 */
function getWalmartProductType(product) {
  // Use explicitly set category or default to ArtAndCraftItem
  const categoryId = product.walmart_category_id;
  
  // Map category IDs to Walmart product types
  const categoryMap = {
    '5123': 'ArtAndCraftItem',
    '5124': 'ArtAndCraftItem',
    '5125': 'HomeDecor',
    '5126': 'Jewelry',
    '5127': 'ClothingAccessories',
    '5128': 'HomeDecor',
    // Add more as needed
  };
  
  return categoryMap[categoryId] || 'ArtAndCraftItem';
}

/**
 * Calculate Walmart price based on wholesale or retail
 */
function calculateWalmartPrice(product) {
  // If explicit Walmart price set, use it
  if (product.walmart_price && parseFloat(product.walmart_price) > 0) {
    return parseFloat(product.walmart_price).toFixed(2);
  }
  
  // If wholesale available, double it
  if (product.wholesale_price && parseFloat(product.wholesale_price) > 0) {
    return (parseFloat(product.wholesale_price) * 2).toFixed(2);
  }
  
  // Otherwise add 20% to retail
  return (parseFloat(product.price) * 1.2).toFixed(2);
}

/**
 * Generate JSON item object for V5.0 MP_ITEM feed
 */
async function generateItemJson(product) {
  // Get image URL - use walmart_main_image_url or fetch from product_images
  const imageUrl = product.walmart_main_image_url || await fetchProductImage(product.id, product.vendor_id);
  const price = calculateWalmartPrice(product);
  const productType = product.walmart_product_type || 'Paintings'; // Default for art marketplace
  
  // Parse key features if stored as JSON
  let keyFeatures = ['Original artwork', 'Perfect for home or office decor', 'Ready to display'];
  if (product.walmart_key_features) {
    try {
      keyFeatures = typeof product.walmart_key_features === 'string' 
        ? JSON.parse(product.walmart_key_features) 
        : product.walmart_key_features;
    } catch (e) {
      // Split by newline if not JSON
      keyFeatures = product.walmart_key_features.split('\n').filter(f => f.trim());
    }
  }
  
  // Shipping weight
  const shippingWeight = parseFloat(product.walmart_shipping_weight || product.weight || 1);
  
  // Build Orderable section
  const orderable = {
    sku: product.sku,
    productIdentifiers: {
      productIdType: 'UPC',
      productId: product.gtin
    },
    price: parseFloat(price),
    ShippingWeight: shippingWeight,
    startDate: '2024-01-01T00:00:00+00:00',
    endDate: '2032-12-31T00:00:00+00:00',
    fulfillmentLagTime: 1,
    MustShipAlone: 'No'
  };
  
  // Build Visible section - product type is the KEY
  const visible = {
    [productType]: {
      productName: product.walmart_title || product.name,
      brand: product.walmart_brand || product.vendor_brand || 'Brakebee',
      shortDescription: (product.walmart_short_description || product.short_description || 'Original artwork').substring(0, 1000),
      mainImageUrl: imageUrl,
      countPerPack: 1,
      multipackQuantity: 1,
      isProp65WarningRequired: 'No',
      condition: 'New',
      has_written_warranty: 'No',
      color: product.walmart_color || 'Multicolor',
      framed: 'No',
      recommendedRooms: ['Living Room'],
      keyFeatures: keyFeatures.slice(0, 5),
      netContent: {
        productNetContentMeasure: 1,
        productNetContentUnit: 'Each'
      },
      assembledProductLength: { 
        measure: parseFloat(product.walmart_shipping_length || product.width || 12), 
        unit: 'in' 
      },
      assembledProductWidth: { 
        measure: parseFloat(product.walmart_shipping_width || product.height || 12), 
        unit: 'in' 
      },
      assembledProductHeight: { 
        measure: parseFloat(product.walmart_shipping_height || product.depth || 1), 
        unit: 'in' 
      },
      assembledProductWeight: { 
        measure: shippingWeight, 
        unit: 'lb' 
      }
    }
  };
  
  // Add manufacturer if available
  if (product.walmart_manufacturer) {
    visible[productType].manufacturer = product.walmart_manufacturer;
  }
  
  // Add MPN if available
  if (product.mpn) {
    visible[productType].manufacturerPartNumber = product.mpn;
  }
  
  return {
    Orderable: orderable,
    Visible: visible
  };
}

/**
 * Generate the complete Walmart Item Feed XML
 */
async function generateFeed() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting Walmart Item feed generation...`);
  
  try {
    // Fetch products
    console.log('Fetching Walmart-enabled products...');
    const products = await fetchWalmartProducts();
    console.log(`Found ${products.length} products for Walmart feed`);
    
    if (products.length === 0) {
      console.warn('No products found for Walmart feed.');
      return { success: true, productsCount: 0, outputPath: FEED_OUTPUT_PATH };
    }
    
    // Build JSON feed (V5.0 format)
    console.log('Generating JSON feed...');
    const mpItems = [];
    let successCount = 0;
    let errorCount = 0;
    
    for (const product of products) {
      try {
        // Skip products without required data
        if (!product.sku) {
          console.warn(`  Skipping product ${product.id}: No SKU`);
          errorCount++;
          continue;
        }
        if (!product.gtin) {
          console.warn(`  Skipping product ${product.id}: No UPC/GTIN`);
          errorCount++;
          continue;
        }
        if (!product.walmart_product_type) {
          console.warn(`  Skipping product ${product.id}: No Walmart product type`);
          errorCount++;
          continue;
        }
        
        const itemJson = await generateItemJson(product);
        mpItems.push(itemJson);
        successCount++;
      } catch (err) {
        console.error(`  Error generating JSON for product ${product.id}:`, err.message);
        errorCount++;
      }
    }
    
    // Build complete feed structure
    const feed = {
      MPItemFeedHeader: {
        businessUnit: 'WALMART_US',
        locale: 'en',
        version: '5.0.20240517-04_08_27-api'
      },
      MPItem: mpItems
    };
    
    // Write to file
    const jsonOutputPath = FEED_OUTPUT_PATH.replace('.xml', '.json');
    console.log(`Writing feed to ${jsonOutputPath}...`);
    fs.writeFileSync(jsonOutputPath, JSON.stringify(feed, null, 2), 'utf8');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[${new Date().toISOString()}] Walmart feed generation complete!`);
    console.log(`  - Products processed: ${successCount}`);
    console.log(`  - Errors: ${errorCount}`);
    console.log(`  - Output: ${jsonOutputPath}`);
    console.log(`  - Duration: ${duration}s`);
    console.log(`  - Feed URL: ${BASE_URL}/feeds/walmart-item-feed.json`);
    
    return {
      success: true,
      productsCount: successCount,
      errorCount,
      outputPath: jsonOutputPath,
      feed // Return the feed object for direct API submission
    };
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Walmart feed generation failed:`, error);
    throw error;
  }
}

/**
 * Push the generated feed to Walmart API
 * Uses JSON V5.0 format
 */
async function pushFeedToWalmart(feedData) {
  const axios = require('axios');
  
  console.log('Pushing feed to Walmart API...');
  
  // Read the generated JSON feed or use provided feedData
  const jsonOutputPath = FEED_OUTPUT_PATH.replace('.xml', '.json');
  let feed;
  
  if (feedData) {
    feed = feedData;
  } else if (fs.existsSync(jsonOutputPath)) {
    feed = JSON.parse(fs.readFileSync(jsonOutputPath, 'utf8'));
  } else {
    throw new Error('Feed file not found. Run generateFeed() first.');
  }
  
  if (!feed.MPItem || feed.MPItem.length === 0) {
    throw new Error('No items in feed to submit.');
  }
  
  console.log(`Submitting ${feed.MPItem.length} item(s)...`);
  
  // Get Walmart credentials (always use production for real submissions)
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
        'WM_QOS.CORRELATION_ID': `brakebee-${Date.now()}`
      }
    }
  );
  
  const token = tokenRes.data.access_token;
  
  // Submit JSON feed
  const feedRes = await axios.post(
    `${baseUrl}/v3/feeds?feedType=MP_ITEM`,
    JSON.stringify(feed),
    {
      headers: {
        'WM_SEC.ACCESS_TOKEN': token,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'WM_SVC.NAME': 'Brakebee Marketplace',
        'WM_QOS.CORRELATION_ID': `brakebee-feed-${Date.now()}`
      }
    }
  );
  
  console.log('Feed submitted successfully!');
  console.log('Feed ID:', feedRes.data.feedId);
  
  return feedRes.data;
}

/**
 * Find products that need to be retired from Walmart
 * - is_active = 0 (vendor turned off)
 * - listing_status = 'listed' (still live on Walmart)
 */
async function findProductsToRetire() {
  const [rows] = await db.query(`
    SELECT 
      wcp.id,
      wcp.product_id,
      p.sku,
      p.name
    FROM walmart_corporate_products wcp
    JOIN products p ON wcp.product_id = p.id
    WHERE wcp.is_active = 0
      AND wcp.listing_status = 'listed'
    ORDER BY wcp.product_id
  `);
  
  return rows;
}

/**
 * Retire a single item from Walmart
 */
async function retireItem(sku) {
  const baseUrl = process.env.WALMART_ENV === 'production' 
    ? 'https://marketplace.walmartapis.com' 
    : 'https://sandbox.walmartapis.com';
  
  const clientId = process.env.WALMART_CLIENT_ID;
  const clientSecret = process.env.WALMART_CLIENT_SECRET;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  // Get token
  const tokenRes = await axios.post(
    `${baseUrl}/v3/token`,
    'grant_type=client_credentials',
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'WM_SVC.NAME': 'Brakebee Marketplace'
      }
    }
  );
  
  const token = tokenRes.data.access_token;
  
  // Call retire endpoint
  const response = await axios.delete(
    `${baseUrl}/v3/items/${encodeURIComponent(sku)}`,
    {
      headers: {
        'WM_SEC.ACCESS_TOKEN': token,
        'Accept': 'application/json',
        'WM_SVC.NAME': 'Brakebee Marketplace',
        'WM_QOS.CORRELATION_ID': `brakebee-retire-${Date.now()}`
      }
    }
  );
  
  return response.data;
}

/**
 * Process all products that need to be retired
 */
async function processRetirements() {
  console.log('\n--- Checking for products to retire ---');
  
  const toRetire = await findProductsToRetire();
  console.log(`Found ${toRetire.length} products to retire from Walmart`);
  
  if (toRetire.length === 0) return { retired: 0, errors: 0 };
  
  let retired = 0;
  let errors = 0;
  
  for (const product of toRetire) {
    try {
      console.log(`Retiring: ${product.name} (SKU: ${product.sku})`);
      
      await retireItem(product.sku);
      
      // Update listing_status to retired
      await db.query(
        `UPDATE walmart_corporate_products SET listing_status = 'retired' WHERE id = ?`,
        [product.id]
      );
      
      console.log(`  ✓ Retired successfully`);
      retired++;
      
    } catch (error) {
      console.error(`  ✗ Failed to retire: ${error.response?.data?.errors?.[0]?.description || error.message}`);
      errors++;
    }
  }
  
  console.log(`Retirements complete: ${retired} retired, ${errors} errors`);
  return { retired, errors };
}

/**
 * Main execution
 */
async function main() {
  try {
    // First, process any retirements (deactivated products)
    await processRetirements();
    
    // Generate the feed for new/updated products
    const result = await generateFeed();
    
    // Optionally push to Walmart if --push flag provided
    if (process.argv.includes('--push')) {
      if (result.productsCount === 0) {
        console.log('\nNo products to push.');
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
    console.error('Fatal error:', error);
    await db.end();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateFeed, pushFeedToWalmart };

