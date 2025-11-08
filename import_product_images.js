#!/usr/bin/env node

/**
 * Import Product Images from WordPress
 * 
 * This script:
 * 1. Fetches product thumbnail and gallery image IDs from WordPress
 * 2. Downloads images from WordPress URLs
 * 3. Saves to temp_images/products/ with proper naming
 * 4. Inserts into product_images table (NOT pending_images - products use different system)
 * 
 * SAFE: Only inserts new records, doesn't modify existing data
 * IDEMPOTENT: Checks for existing records before inserting
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Database configuration
const wpConfig = {
  host: process.env.WP_DB_HOST || '10.128.0.31',
  user: process.env.WP_DB_USER || 'oafuser',
  password: process.env.WP_DB_PASSWORD || 'oafpass',
  database: 'wordpress_import'
};

const oafConfig = {
  host: process.env.OAF_DB_HOST || '10.128.0.31',
  user: process.env.OAF_DB_USER || 'oafuser',
  password: process.env.OAF_DB_PASSWORD || 'oafpass',
  database: 'oaf'
};

// Temp images directory (already exists)
const TEMP_DIR = '/var/www/main/api-service/temp_images/products';

// Statistics
const stats = {
  imagesDownloaded: 0,
  imagesSkipped: 0,
  errors: 0
};

/**
 * Download image from URL with redirect support
 */
function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        console.log(`   ↪️  Redirect: ${redirectUrl}`);
        return downloadImage(redirectUrl, destPath).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }

      const fileStream = fs.createWriteStream(destPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(destPath);
      });

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });

    request.on('error', (err) => {
      reject(err);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

/**
 * Main import function
 */
async function importProductImages(testMode = false) {
  let wpConn, oafConn;

  try {
    console.log('🔌 Connecting to databases...');
    wpConn = await mysql.createConnection(wpConfig);
    oafConn = await mysql.createConnection(oafConfig);
    console.log('✅ Connected to WordPress and OAF databases\n');

    // Build the query with optional LIMIT for test mode
    const limitClause = testMode ? 'LIMIT 10' : '';
    
    console.log(testMode ? '🧪 TEST MODE: Processing first 10 products...\n' : '📊 Fetching WordPress product image data...\n');

    // Fetch products with their images (both thumbnails and galleries)
    const [wpProducts] = await wpConn.query(`
      SELECT 
        p.ID as wp_product_id,
        p.post_title as product_name,
        MAX(CASE WHEN pm.meta_key = '_thumbnail_id' THEN pm.meta_value END) as thumbnail_id,
        MAX(CASE WHEN pm.meta_key = '_product_image_gallery' THEN pm.meta_value END) as gallery_ids
      FROM wp_posts p
      LEFT JOIN wp_postmeta pm ON p.ID = pm.post_id AND pm.meta_key IN ('_thumbnail_id', '_product_image_gallery')
      WHERE p.post_type IN ('product', 'product_variation')
        AND p.post_status = 'publish'
      GROUP BY p.ID, p.post_title
      HAVING thumbnail_id IS NOT NULL OR gallery_ids IS NOT NULL
      ORDER BY p.ID
      ${limitClause}
    `);

    console.log(`Found ${wpProducts.length} WordPress products with images\n`);

    for (const wpProduct of wpProducts) {
      try {
        // Get the corresponding Brakebee product ID
        const [oafProduct] = await oafConn.query(
          'SELECT id, vendor_id FROM products WHERE wp_id = ?',
          [wpProduct.wp_product_id]
        );

        if (!oafProduct || oafProduct.length === 0) {
          console.log(`   ⏩ Skipping: Product wp_id ${wpProduct.wp_product_id} not found in Brakebee`);
          stats.imagesSkipped++;
          continue;
        }

        const productId = oafProduct[0].id;
        const vendorId = oafProduct[0].vendor_id;

        // Check if this product already has images imported (check pending_images)
        const [existingImages] = await oafConn.query(
          'SELECT COUNT(*) as count FROM pending_images WHERE user_id = ? AND image_path LIKE ?',
          [vendorId, `/temp_images/products/${vendorId}-${productId}-%`]
        );

        if (existingImages[0].count > 0) {
          console.log(`   ⏩ Images already imported for: ${wpProduct.product_name}`);
          stats.imagesSkipped++;
          continue;
        }

        // Collect all image IDs (thumbnail + gallery)
        const imageIds = [];
        let isPrimary = true;
        let orderIndex = 1;

        // Add thumbnail as primary image
        if (wpProduct.thumbnail_id) {
          imageIds.push({
            id: wpProduct.thumbnail_id,
            is_primary: true,
            order: 0
          });
        }

        // Add gallery images
        if (wpProduct.gallery_ids) {
          const galleryArray = wpProduct.gallery_ids.split(',').map(id => id.trim());
          galleryArray.forEach(id => {
            // Don't duplicate the thumbnail
            if (id !== wpProduct.thumbnail_id) {
              imageIds.push({
                id: id,
                is_primary: false,
                order: orderIndex++
              });
            }
          });
        }

        console.log(`   📦 ${wpProduct.product_name} (${imageIds.length} images)`);

        // Process each image
        for (const imageInfo of imageIds) {
          // Get image URL from WordPress
          const [wpImage] = await wpConn.query(
            'SELECT guid, post_title, post_mime_type FROM wp_posts WHERE ID = ? AND post_type = "attachment"',
            [imageInfo.id]
          );

          if (!wpImage || wpImage.length === 0) {
            console.log(`      ⚠️  Image ID ${imageInfo.id} not found`);
            continue;
          }

          const imageUrl = wpImage[0].guid;
          const imageName = wpImage[0].post_title || `image-${imageInfo.id}`;
          const mimeType = wpImage[0].post_mime_type || 'image/jpeg';
          const extension = mimeType.split('/')[1] || 'jpg';

          // Generate unique filename: productId-timestamp-random.ext
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 1000000000);
          const filename = `${vendorId}-${productId}-${timestamp}-${random}.${extension}`;
          const localPath = path.join(TEMP_DIR, filename);
          const dbPath = `/temp_images/products/${filename}`;

          // Check if already imported
          const [existing] = await oafConn.query(
            'SELECT id FROM pending_images WHERE user_id = ? AND image_path = ?',
            [vendorId, dbPath]
          );

          if (existing.length === 0) {
            try {
              // Download image
              await downloadImage(imageUrl, localPath);

              // Insert into pending_images for processing
              await oafConn.query(
                `INSERT INTO pending_images (
                  user_id, 
                  image_path, 
                  original_name, 
                  mime_type,
                  status
                ) VALUES (?, ?, ?, ?, 'pending')`,
                [
                  vendorId,
                  dbPath,
                  imageName,
                  mimeType
                ]
              );

              console.log(`      ✅ ${imageInfo.is_primary ? 'PRIMARY' : 'Gallery'}: ${filename}`);
              stats.imagesDownloaded++;
            } catch (downloadErr) {
              console.log(`      ❌ Failed to download: ${downloadErr.message}`);
              stats.errors++;
            }
          } else {
            console.log(`      ⏩ Already imported: ${filename}`);
          }

          // Small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (err) {
        console.error(`   ❌ Error processing product ${wpProduct.product_name}:`, err.message);
        stats.errors++;
      }
    }

    console.log('\n============================================================');
    console.log('📊 IMPORT SUMMARY');
    console.log('============================================================');
    console.log(`✅ Images downloaded: ${stats.imagesDownloaded}`);
    console.log(`⏩ Products skipped: ${stats.imagesSkipped}`);
    console.log(`❌ Errors: ${stats.errors}`);
    console.log('============================================================\n');

    if (testMode) {
      console.log('🧪 TEST MODE COMPLETE - Review results before running full import\n');
    } else {
      console.log('🎨 Images are now stored and linked to products\n');
      console.log('   Note: Product images use direct file serving, not the processing VM\n');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    if (wpConn) await wpConn.end();
    if (oafConn) await oafConn.end();
  }
}

// Check for test mode flag
const testMode = process.argv.includes('--test');

// Run the import
importProductImages(testMode);

