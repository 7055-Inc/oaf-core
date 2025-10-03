#!/usr/bin/env node

/**
 * Replace temporary image URLs with smart serving URLs
 * 
 * This script:
 * 1. Finds all processed images in pending_images table
 * 2. Replaces temporary URLs with smart serving URLs (https://api.../api/images/123)
 * 3. Updates all relevant database tables
 * 4. Marks images as 'complete'
 */

require('dotenv').config({ path: '/var/www/main/api-service/.env' });
const mysql = require('mysql2/promise');

async function replaceTempUrls() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });

  try {
    console.log(`🔄 Starting temp URL replacement process - ${new Date().toISOString()}`);
    
    // Find processed images that need URL replacement
    const [processedImages] = await connection.execute(`
      SELECT id, image_path, permanent_url 
      FROM pending_images 
      WHERE status = 'processed' 
        AND permanent_url IS NOT NULL 
        AND permanent_url != ''
      ORDER BY created_at ASC
      LIMIT 50
    `);

    if (processedImages.length === 0) {
      console.log('✅ No processed images found that need URL replacement.');
      return;
    }

    console.log(`📋 Found ${processedImages.length} processed images to update`);

    let totalReplacements = 0;
    let successCount = 0;
    let errorCount = 0;

    for (const image of processedImages) {
      const { id, image_path, permanent_url } = image;
      
      try {
        console.log(`\n🔄 Processing image ID ${id}:`);
        console.log(`   Temp URL: ${image_path}`);
        console.log(`   Media ID: ${permanent_url}`);

        // Generate smart serving URLs
        const imagePermanentUrl = `https://api.beemeeart.com/api/media/images/${permanent_url}`;
        const thumbnailPermanentUrl = `https://api.beemeeart.com/api/media/images/${permanent_url}?size=thumbnail`;
        
        console.log(`   📱 Smart serving URL: ${imagePermanentUrl}`);

        let imageReplacements = 0;

        // 1. Update product_images table
        const [productResult] = await connection.execute(
          'UPDATE product_images SET image_url = ? WHERE image_url = ?',
          [imagePermanentUrl, image_path]
        );
        if (productResult.affectedRows > 0) {
          console.log(`   ✅ Updated ${productResult.affectedRows} product_images records`);
          imageReplacements += productResult.affectedRows;
        }

        // 2. Update event_images table  
        const [eventResult] = await connection.execute(
          'UPDATE event_images SET image_url = ? WHERE image_url = ?',
          [imagePermanentUrl, image_path]
        );
        if (eventResult.affectedRows > 0) {
          console.log(`   ✅ Updated ${eventResult.affectedRows} event_images records`);
          imageReplacements += eventResult.affectedRows;
        }

        // 3. Update user_profiles table for profile images
        if (image_path.includes('/temp_images/profiles/')) {
          const filename = image_path.split('/').pop();
          
          // Profile image
          if (filename.includes('-profile-')) {
            const [profileResult] = await connection.execute(
              'UPDATE user_profiles SET profile_image_path = ? WHERE profile_image_path = ?',
              [imagePermanentUrl, image_path]
            );
            if (profileResult.affectedRows > 0) {
              console.log(`   ✅ Updated ${profileResult.affectedRows} user profile images`);
              imageReplacements += profileResult.affectedRows;
            }
          }
          
          // Header image
          else if (filename.includes('-header-')) {
            const [headerResult] = await connection.execute(
              'UPDATE user_profiles SET header_image_path = ? WHERE header_image_path = ?',
              [imagePermanentUrl, image_path]
            );
            if (headerResult.affectedRows > 0) {
              console.log(`   ✅ Updated ${headerResult.affectedRows} user header images`);
              imageReplacements += headerResult.affectedRows;
            }
          }
          
          // Logo image (stored in artist_profiles and promoter_profiles)
          else if (filename.includes('-logo-')) {
            // Update artist_profiles logo_path
            const [artistLogoResult] = await connection.execute(
              'UPDATE artist_profiles SET logo_path = ? WHERE logo_path = ?',
              [imagePermanentUrl, image_path]
            );
            if (artistLogoResult.affectedRows > 0) {
              console.log(`   ✅ Updated ${artistLogoResult.affectedRows} artist logo images`);
              imageReplacements += artistLogoResult.affectedRows;
            }
            
            // Update promoter_profiles logo_path
            const [promoterLogoResult] = await connection.execute(
              'UPDATE promoter_profiles SET logo_path = ? WHERE logo_path = ?',
              [imagePermanentUrl, image_path]
            );
            if (promoterLogoResult.affectedRows > 0) {
              console.log(`   ✅ Updated ${promoterLogoResult.affectedRows} promoter logo images`);
              imageReplacements += promoterLogoResult.affectedRows;
            }
          }
        }

        // 4. Update site_media table for site images
        if (image_path.includes('/temp_images/sites/')) {
          const [siteMediaResult] = await connection.execute(
            'UPDATE site_media SET media_path = ? WHERE media_path = ?',
            [imagePermanentUrl, image_path]
          );
          if (siteMediaResult.affectedRows > 0) {
            console.log(`   ✅ Updated ${siteMediaResult.affectedRows} site_media records`);
            imageReplacements += siteMediaResult.affectedRows;
          }
        }

        // 5. Update marketplace_applications table for jury media
        if (image_path.includes('/temp_images/jury/')) {
          const filename = image_path.split('/').pop();
          
          // Map filename patterns to database columns
          const juryMediaMappings = [
            { pattern: '-raw_materials-', column: 'raw_materials_media_id' },
            { pattern: '-work_process_1-', column: 'work_process_1_media_id' },
            { pattern: '-work_process_2-', column: 'work_process_2_media_id' },
            { pattern: '-work_process_3-', column: 'work_process_3_media_id' },
            { pattern: '-artist_at_work-', column: 'artist_at_work_media_id' },
            { pattern: '-booth_display-', column: 'booth_display_media_id' },
            { pattern: '-artist_working_video-', column: 'artist_working_video_media_id' },
            { pattern: '-artist_bio_video-', column: 'artist_bio_video_media_id' },
            { pattern: '-additional_video-', column: 'additional_video_media_id' }
          ];

          // Find matching pattern and update the corresponding column
          for (const mapping of juryMediaMappings) {
            if (filename.includes(mapping.pattern)) {
              // First, find the pending_images.id that matches this temp path
              const [pendingImageResult] = await connection.execute(
                'SELECT id FROM pending_images WHERE image_path = ? AND status = ?',
                [image_path, 'processed']
              );

              if (pendingImageResult.length > 0) {
                const pendingImageId = pendingImageResult[0].id;
                
                // Update marketplace_applications to replace the pending_images ID reference
                // with the permanent URL in a new column (we'll add this logic later)
                // For now, we'll just log that jury media was processed
                console.log(`   📋 Jury media processed: ${mapping.column} (pending_images.id: ${pendingImageId})`);
                console.log(`   🎨 Permanent URL: ${imagePermanentUrl}`);
                
                // Note: The marketplace_applications table stores pending_images.id references
                // The frontend will use these IDs to construct URLs via the media proxy
                imageReplacements++;
              }
              break;
            }
          }
        }

        // 6. Safety net: search for URLs in text content fields
        const [miscResults] = await connection.execute(`
          SELECT 'articles' as table_name, 'content' as column_name, id, content as field_value
          FROM articles WHERE content LIKE ?
          UNION ALL
          SELECT 'categories' as table_name, 'description' as column_name, id, description as field_value
          FROM categories WHERE description LIKE ?
          UNION ALL
          SELECT 'events' as table_name, 'description' as column_name, id, description as field_value
          FROM events WHERE description LIKE ?
        `, [`%${image_path}%`, `%${image_path}%`, `%${image_path}%`]);

        // Update any miscellaneous text fields found
        for (const misc of miscResults) {
          const updatedContent = misc.field_value.replace(new RegExp(image_path, 'g'), imagePermanentUrl);
          
          if (misc.table_name === 'articles') {
            await connection.execute(
              'UPDATE articles SET content = ? WHERE id = ?',
              [updatedContent, misc.id]
            );
          } else if (misc.table_name === 'categories') {
            await connection.execute(
              'UPDATE categories SET description = ? WHERE id = ?',
              [updatedContent, misc.id]
            );
          } else if (misc.table_name === 'events') {
            await connection.execute(
              'UPDATE events SET description = ? WHERE id = ?',
              [updatedContent, misc.id]
            );
          }
          
          console.log(`   ✅ Updated ${misc.table_name}.${misc.column_name} for ID ${misc.id}`);
          imageReplacements++;
        }

        // 7. Mark the image as complete
        await connection.execute(
          'UPDATE pending_images SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          ['complete', id]
        );

        console.log(`   🎉 Image ${id} marked as complete (${imageReplacements} replacements)`);
        totalReplacements += imageReplacements;
        successCount++;

      } catch (error) {
        console.error(`   ❌ Error processing image ${id}:`, error.message);
        
        // Mark as failed
        try {
          await connection.execute(
            'UPDATE pending_images SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            ['failed', id]
          );
          console.log(`   ⚠️  Image ${id} marked as failed`);
        } catch (markFailedError) {
          console.error(`   💥 Could not mark image ${id} as failed:`, markFailedError.message);
        }
        
        errorCount++;
      }
    }

    // Summary
    console.log(`\n📊 URL Replacement Summary:`);
    console.log(`   ✅ Success: ${successCount} images`);
    console.log(`   ❌ Failed: ${errorCount} images`);
    console.log(`   🔄 Total URL replacements: ${totalReplacements}`);
    console.log(`   📅 Completed at: ${new Date().toISOString()}`);

  } catch (error) {
    console.error('💥 Fatal error in URL replacement process:', error.message, error.stack);
  } finally {
    await connection.end();
  }
}

// Run the replacement process
replaceTempUrls()
  .then(() => {
    console.log('🏁 URL replacement process finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  }); 