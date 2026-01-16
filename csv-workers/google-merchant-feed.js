#!/usr/bin/env node
/**
 * Google Merchant Center Feed Generator
 * 
 * Generates a CSV feed of all active products for Google Merchant Center
 * Output: /var/www/main/public/feeds/google-merchant-feed.csv
 * 
 * Scheduled to run every 6 hours via cron
 */

const Papa = require('papaparse');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();
require('dotenv').config({ path: path.join(__dirname, '../api-service/.env') });

// Use existing database configuration
const db = require('../api-service/config/db');

// Use media utilities for image processing
const { getBatchProcessedMediaUrls } = require('../api-service/src/utils/mediaUtils');

// Configuration
const FEED_OUTPUT_PATH = path.join(__dirname, '../public/feeds/google-merchant-feed.csv');
const BASE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://brakebee.com';

// Ensure feeds directory exists
const feedsDir = path.dirname(FEED_OUTPUT_PATH);
if (!fs.existsSync(feedsDir)) {
  fs.mkdirSync(feedsDir, { recursive: true });
}

/**
 * Fetch all active products with related data for the feed
 */
async function fetchProducts() {
  const query = `
    SELECT 
      p.id,
      p.sku,
      p.name as title,
      p.description,
      p.price,
      p.status,
      p.vendor_id,
      p.parent_id,
      p.product_type,
      
      -- Primary product image from pending_images
      pi.image_path,
      pi.permanent_url,
      pi.status as image_status,
      
      -- Inventory availability
      COALESCE(inv.qty_available, 0) as qty_available,
      
      -- Brand (vendor business name, fallback to first/last name, then "Artist")
      -- Matches product page logic: business_name || (first && last ? "first last" : "Artist")
      COALESCE(
        NULLIF(ap.business_name, ''),
        CASE 
          WHEN up.first_name IS NOT NULL AND up.first_name != '' 
           AND up.last_name IS NOT NULL AND up.last_name != ''
          THEN CONCAT(up.first_name, ' ', up.last_name)
          ELSE NULL
        END,
        'Artist'
      ) as brand,
      
      -- Feed metadata
      pfm.condition,
      pfm.mpn,
      pfm.gtin,
      pfm.identifier_exists,
      pfm.google_product_category,
      pfm.product_type as feed_product_type,
      pfm.item_group_id,
      pfm.custom_label_0,
      pfm.custom_label_1,
      pfm.custom_label_2,
      pfm.custom_label_3,
      pfm.custom_label_4,
      
      -- Shipping information
      ps.ship_method,
      ps.ship_rate,
      ps.length,
      ps.width,
      ps.height,
      ps.weight,
      ps.dimension_unit,
      ps.weight_unit,
      
      -- Return policy
      p.allow_returns
      
    FROM products p
    
    -- Join product images from pending_images (get first image for each product)
    LEFT JOIN (
      SELECT 
        image_path,
        permanent_url,
        status,
        CONCAT(
          SUBSTRING_INDEX(SUBSTRING_INDEX(SUBSTRING_INDEX(image_path, '/', -1), '-', 1), '-', -1),
          '-',
          SUBSTRING_INDEX(SUBSTRING_INDEX(SUBSTRING_INDEX(image_path, '/', -1), '-', 2), '-', -1)
        ) as vendor_product_key,
        ROW_NUMBER() OVER (
          PARTITION BY CONCAT(
            SUBSTRING_INDEX(SUBSTRING_INDEX(SUBSTRING_INDEX(image_path, '/', -1), '-', 1), '-', -1),
            '-',
            SUBSTRING_INDEX(SUBSTRING_INDEX(SUBSTRING_INDEX(image_path, '/', -1), '-', 2), '-', -1)
          ) 
          ORDER BY created_at ASC
        ) as rn
      FROM pending_images
      WHERE image_path LIKE '/temp_images/products/%'
    ) pi ON CONCAT(p.vendor_id, '-', p.id) = pi.vendor_product_key AND pi.rn = 1
    
    -- Join inventory
    LEFT JOIN product_inventory inv ON p.id = inv.product_id
    
    -- Join feed metadata
    LEFT JOIN product_feed_metadata pfm ON p.id = pfm.product_id
    
    -- Join shipping info (package_number = 1 for primary package)
    LEFT JOIN product_shipping ps ON p.id = ps.product_id AND ps.package_number = 1
    
    -- Join vendor/user info for brand (matches product page API query)
    LEFT JOIN users u ON p.vendor_id = u.id
    LEFT JOIN user_profiles up ON u.id = up.user_id
    LEFT JOIN artist_profiles ap ON u.id = ap.user_id
    
    -- Only active products with valid prices (Google rejects $0 products)
    WHERE p.status = 'active'
      AND p.price > 0
    
    ORDER BY p.id ASC
  `;

  const [rows] = await db.execute(query);
  return rows;
}

/**
 * Map internal return policy to Google Merchant Center return_policy_label
 * These labels must match what's configured in Merchant Center > Settings > Return policies
 */
function mapReturnPolicyLabel(allowReturns) {
  const policyMap = {
    '30_day': '30_days',
    '14_day': '14_days',
    'exchange_only': 'exchange_only',
    'no_returns': 'no_returns'
  };
  return policyMap[allowReturns] || '30_days';
}

/**
 * Transform database row to Google Merchant Center format
 */
function transformToFeedFormat(product, processedImage = null) {
  // Determine availability
  const availability = product.qty_available > 0 ? 'in stock' : 'out of stock';
  
  // Format price (must include currency)
  const price = `${parseFloat(product.price).toFixed(2)} USD`;
  
  // Generate product link (use product ID, not SKU)
  const link = `${BASE_URL}/products/${product.id}`;
  
  // Use processed image URL from media system
  let imageLink = '';
  if (processedImage && processedImage.image_url) {
    imageLink = processedImage.image_url;
  } else if (product.image_url) {
    // Fallback if processing failed
    imageLink = product.image_url.startsWith('http') 
      ? product.image_url 
      : `${BASE_URL}${product.image_url}`;
  }
  
  // Clean description (remove HTML tags if any, limit length)
  let description = product.description || product.title || '';
  description = description.replace(/<[^>]*>/g, '').trim();
  if (description.length > 5000) {
    description = description.substring(0, 4997) + '...';
  }
  
  // For variants, use parent_id as item_group_id if not explicitly set
  let itemGroupId = product.item_group_id;
  if (!itemGroupId && product.parent_id && product.product_type === 'variant') {
    itemGroupId = product.parent_id.toString();
  }
  
  // Handle shipping weight
  let shippingWeight = '';
  if (product.weight && product.weight_unit) {
    shippingWeight = `${product.weight} ${product.weight_unit}`;
  }
  
  // Handle shipping dimensions
  const dimensionUnit = product.dimension_unit || 'in';
  let shippingLength = '';
  let shippingWidth = '';
  let shippingHeight = '';
  
  if (product.length) {
    shippingLength = `${product.length} ${dimensionUnit}`;
  }
  if (product.width) {
    shippingWidth = `${product.width} ${dimensionUnit}`;
  }
  if (product.height) {
    shippingHeight = `${product.height} ${dimensionUnit}`;
  }
  
  // Append "by [brand]" to title to match product page
  const titleWithBrand = product.title 
    ? `${product.title} by ${product.brand || 'Brakebee'}`
    : '';

  return {
    id: product.sku, // Use SKU as the unique identifier
    item_group_id: itemGroupId || '',
    title: titleWithBrand,
    description: description,
    link: link,
    image_link: imageLink,
    availability: availability,
    price: price,
    condition: product.condition || 'new',
    brand: product.brand || 'Brakebee',
    mpn: product.mpn || '',
    identifier_exists: product.identifier_exists || 'no',
    google_product_category: product.google_product_category || '',
    product_type: product.feed_product_type || '',
    custom_label_0: product.custom_label_0 || '',
    custom_label_1: product.custom_label_1 || '',
    custom_label_2: product.custom_label_2 || '',
    custom_label_3: product.custom_label_3 || '',
    custom_label_4: product.custom_label_4 || '',
    shipping_weight: shippingWeight,
    shipping_length: shippingLength,
    shipping_width: shippingWidth,
    shipping_height: shippingHeight,
    return_policy_label: mapReturnPolicyLabel(product.allow_returns)
  };
}

/**
 * Generate the Google Merchant Center feed
 */
async function generateFeed() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] Starting Google Merchant feed generation...`);
  
  try {
    // Fetch products from database
    console.log('Fetching products from database...');
    const products = await fetchProducts();
    console.log(`Found ${products.length} active products`);
    
    if (products.length === 0) {
      console.warn('No active products found. Feed will be empty.');
    }
    
    // Get all unique image temp paths for batch processing
    console.log('Processing product images...');
    const tempImagePaths = products
      .map(p => p.image_path)
      .filter(path => path); // Remove null/undefined
    
    // Get processed media URLs for all images in one batch
    const processedUrls = await getBatchProcessedMediaUrls(tempImagePaths, 'detail');
    
    // Transform to feed format with processed image URLs
    console.log('Transforming products to feed format...');
    const feedData = products.map(product => {
      // Get the processed URL for this product's image
      const processedImage = product.image_path ? processedUrls[product.image_path] : null;
      return transformToFeedFormat(product, processedImage);
    });
    
    // Generate CSV using Papa Parse
    console.log('Generating CSV...');
    const csv = Papa.unparse(feedData, {
      quotes: true, // Quote all fields
      header: true,
      columns: [
        'id',
        'item_group_id',
        'title',
        'description',
        'link',
        'image_link',
        'availability',
        'price',
        'condition',
        'brand',
        'mpn',
        'identifier_exists',
        'google_product_category',
        'product_type',
        'custom_label_0',
        'custom_label_1',
        'custom_label_2',
        'custom_label_3',
        'custom_label_4',
        'shipping_weight',
        'shipping_length',
        'shipping_width',
        'shipping_height',
        'return_policy_label'
      ]
    });
    
    // Write to file
    console.log(`Writing feed to ${FEED_OUTPUT_PATH}...`);
    fs.writeFileSync(FEED_OUTPUT_PATH, csv, 'utf8');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[${new Date().toISOString()}] Feed generation complete!`);
    console.log(`  - Products: ${products.length}`);
    console.log(`  - Output: ${FEED_OUTPUT_PATH}`);
    console.log(`  - Duration: ${duration}s`);
    console.log(`  - Feed URL: ${BASE_URL}/feeds/google-merchant-feed.csv`);
    
    return {
      success: true,
      productsCount: products.length,
      outputPath: FEED_OUTPUT_PATH
    };
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Feed generation failed:`, error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await generateFeed();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateFeed };

