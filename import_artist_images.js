#!/usr/bin/env node

/**
 * Import Artist Profile and Header Images from WordPress
 * 
 * This script:
 * 1. Parses PHP serialized dokan_profile_settings from WordPress
 * 2. Extracts banner (header) and gravatar (profile) image IDs
 * 3. Downloads images from WordPress URLs
 * 4. Saves to temp_images/profiles/ with proper naming
 * 5. Inserts into pending_images for automatic processing
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

// Temp images directory (must match multer config in api-service)
const TEMP_DIR = '/var/www/main/api-service/temp_images/profiles';

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * Parse PHP serialized string (simple version for our use case)
 */
function parsePhpSerialized(str) {
  const data = {};
  
  // Extract banner (can be string or integer)
  const bannerMatch = str.match(/s:6:"banner";(?:s:\d+:"(\d+)"|i:(\d+))/);
  if (bannerMatch) {
    data.banner = bannerMatch[1] || bannerMatch[2];
  }
  
  // Extract gravatar (can be string or integer)
  const gravatarMatch = str.match(/s:8:"gravatar";(?:s:\d+:"(\d+)"|i:(\d+))/);
  if (gravatarMatch) {
    data.gravatar = gravatarMatch[1] || gravatarMatch[2];
  }
  
  return data;
}

/**
 * Download image from URL (with redirect support)
 */
function downloadImage(url, filepath, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) {
      reject(new Error('Too many redirects'));
      return;
    }
    
    const protocol = url.startsWith('https') ? https : http;
    
    const file = fs.createWriteStream(filepath);
    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        fs.unlink(filepath, () => {}); // Clean up empty file
        const redirectUrl = response.headers.location;
        console.log(`   🔄 Following redirect to ${redirectUrl}`);
        downloadImage(redirectUrl, filepath, redirectCount + 1).then(resolve).catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(filepath, () => {});
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Clean up partial file
      reject(err);
    });
  });
}

/**
 * Get file extension from URL
 */
function getExtension(url, mimeType) {
  const urlExt = path.extname(url).toLowerCase().replace('.', '');
  if (urlExt) return urlExt;
  
  // Fallback to mime type
  const mimeMap = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp'
  };
  return mimeMap[mimeType] || 'jpg';
}

async function main() {
  let wpConn, oafConn;
  
  try {
    console.log('🔌 Connecting to databases...');
    wpConn = await mysql.createConnection(wpConfig);
    oafConn = await mysql.createConnection(oafConfig);
    
    console.log('✅ Connected to WordPress and OAF databases\n');
    
    // Get all WordPress users with images (both old Dokan format AND new business_ format)
    console.log('📊 Fetching WordPress artist image data...');
    const [wpUsers] = await wpConn.query(`
      SELECT DISTINCT
        wpu.ID as wp_user_id,
        wpu.user_login,
        MAX(CASE WHEN wpm.meta_key = 'dokan_profile_settings' THEN wpm.meta_value END) as dokan_settings,
        MAX(CASE WHEN wpm.meta_key = 'business_cover' THEN wpm.meta_value END) as business_cover,
        MAX(CASE WHEN wpm.meta_key = 'business_logo' THEN wpm.meta_value END) as business_logo
      FROM wp_users wpu
      JOIN wp_usermeta wpm ON wpu.ID = wpm.user_id
      WHERE wpm.meta_key IN ('dokan_profile_settings', 'business_cover', 'business_logo')
      GROUP BY wpu.ID, wpu.user_login
      HAVING dokan_settings IS NOT NULL 
         OR business_cover IS NOT NULL 
         OR business_logo IS NOT NULL
    `);
    
    console.log(`Found ${wpUsers.length} WordPress users with profile/banner settings\n`);
    
    let profileCount = 0;
    let bannerCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const wpUser of wpUsers) {
      try {
        // Find corresponding OAF user
        const [oafUsers] = await oafConn.query(
          'SELECT id FROM users WHERE wp_id = ?',
          [wpUser.wp_user_id]
        );
        
        if (oafUsers.length === 0) {
          console.log(`⚠️  Skipping ${wpUser.user_login} - no OAF user found`);
          skippedCount++;
          continue;
        }
        
        const oafUserId = oafUsers[0].id;
        
        // Parse dokan settings (old format)
        const settings = wpUser.dokan_settings ? parsePhpSerialized(wpUser.dokan_settings) : {};
        
        // Get image IDs from either format
        const bannerId = settings.banner || wpUser.business_cover;
        const gravatarId = settings.gravatar || wpUser.business_logo;
        
        // Process banner (header image)
        if (bannerId) {
          const [attachments] = await wpConn.query(
            'SELECT guid, post_mime_type FROM wp_posts WHERE ID = ? AND post_type = "attachment"',
            [bannerId]
          );
          
          if (attachments.length > 0) {
            const imageUrl = attachments[0].guid;
            const mimeType = attachments[0].post_mime_type;
            const ext = getExtension(imageUrl, mimeType);
            const timestamp = Date.now();
            const filename = `${oafUserId}-header-${timestamp}.${ext}`;
            const filepath = path.join(TEMP_DIR, filename);
            const dbPath = `/temp_images/profiles/${filename}`;
            
            // Check if already imported
            const [existing] = await oafConn.query(
              'SELECT id FROM pending_images WHERE user_id = ? AND image_path LIKE ?',
              [oafUserId, `%${oafUserId}-header-%`]
            );
            
            if (existing.length === 0) {
              console.log(`⬇️  Downloading banner for ${wpUser.user_login}...`);
              await downloadImage(imageUrl, filepath);
              
              // Insert into pending_images
              await oafConn.query(
                `INSERT INTO pending_images 
                (user_id, image_path, original_name, mime_type, status) 
                VALUES (?, ?, ?, ?, 'pending')`,
                [oafUserId, dbPath, `${wpUser.user_login}-banner.${ext}`, mimeType]
              );
              
              // Update user_profiles ONLY if header_image_path is NULL (not already set or processed)
              await oafConn.query(
                `UPDATE user_profiles 
                SET header_image_path = ? 
                WHERE user_id = ? 
                AND (header_image_path IS NULL OR header_image_path = '')`,
                [dbPath, oafUserId]
              );
              
              bannerCount++;
              console.log(`   ✅ Banner queued: ${filename}`);
            } else {
              console.log(`   ⏩ Banner already imported for ${wpUser.user_login}`);
            }
          }
        }
        
        // Process gravatar (profile image)
        if (gravatarId) {
          const [attachments] = await wpConn.query(
            'SELECT guid, post_mime_type FROM wp_posts WHERE ID = ? AND post_type = "attachment"',
            [gravatarId]
          );
          
          if (attachments.length > 0) {
            const imageUrl = attachments[0].guid;
            const mimeType = attachments[0].post_mime_type;
            const ext = getExtension(imageUrl, mimeType);
            const timestamp = Date.now() + 1; // Avoid collision with banner
            const filename = `${oafUserId}-profile-${timestamp}.${ext}`;
            const filepath = path.join(TEMP_DIR, filename);
            const dbPath = `/temp_images/profiles/${filename}`;
            
            // Check if already imported
            const [existing] = await oafConn.query(
              'SELECT id FROM pending_images WHERE user_id = ? AND image_path LIKE ?',
              [oafUserId, `%${oafUserId}-profile-%`]
            );
            
            if (existing.length === 0) {
              console.log(`⬇️  Downloading profile for ${wpUser.user_login}...`);
              await downloadImage(imageUrl, filepath);
              
              // Insert into pending_images
              await oafConn.query(
                `INSERT INTO pending_images 
                (user_id, image_path, original_name, mime_type, status) 
                VALUES (?, ?, ?, ?, 'pending')`,
                [oafUserId, dbPath, `${wpUser.user_login}-profile.${ext}`, mimeType]
              );
              
              // Update user_profiles ONLY if profile_image_path is NULL (not already set or processed)
              await oafConn.query(
                `UPDATE user_profiles 
                SET profile_image_path = ? 
                WHERE user_id = ? 
                AND (profile_image_path IS NULL OR profile_image_path = '')`,
                [dbPath, oafUserId]
              );
              
              profileCount++;
              console.log(`   ✅ Profile queued: ${filename}`);
            } else {
              console.log(`   ⏩ Profile already imported for ${wpUser.user_login}`);
            }
          }
        }
        
        // Small delay to avoid hammering the server
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (err) {
        console.error(`❌ Error processing ${wpUser.user_login}:`, err.message);
        errorCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Profile images imported: ${profileCount}`);
    console.log(`✅ Banner images imported: ${bannerCount}`);
    console.log(`⏩ Users skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('='.repeat(60));
    console.log('\n🎨 Images are now queued for AI processing by the media VM');
    console.log('   The processing system will automatically:');
    console.log('   - Create responsive variants (thumbnail, small, grid, detail, header, zoom)');
    console.log('   - Generate AVIF, WebP, and JPEG formats');
    console.log('   - Update user_profiles with permanent media IDs');
    console.log('   - Make images available via smart serving proxy\n');
    
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  } finally {
    if (wpConn) await wpConn.end();
    if (oafConn) await oafConn.end();
  }
}

main();

