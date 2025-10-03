#!/usr/bin/env node
/**
 * Label File Cleanup Script
 * 
 * This script cleans up shipping label files older than 90 days
 * to prevent storage bloat. Runs daily via cron job.
 * 
 * Database records are kept for audit trail - only files are deleted.
 */

const fs = require('fs').promises;
const path = require('path');
const db = require('../config/db');

// Configuration
const RETENTION_DAYS = 90;
const LABELS_DIR = path.join(__dirname, '../../public/static_media/labels');
const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Main cleanup function
 */
async function cleanupOldLabels() {
  console.log(`🧹 Starting label cleanup (${RETENTION_DAYS} day retention)...`);
  console.log(`📁 Labels directory: ${LABELS_DIR}`);
  
  if (DRY_RUN) {
    console.log('🚨 DRY RUN MODE - No files will be deleted');
  }

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
    
    console.log(`📅 Cutoff date: ${cutoffDate.toISOString()}`);

    // Get old labels from database
    const oldLabels = await getOldLabels(cutoffDate);
    console.log(`📊 Found ${oldLabels.length} labels eligible for cleanup`);

    let deletedCount = 0;
    let errorCount = 0;

    for (const label of oldLabels) {
      try {
        if (label.label_file_path) {
          const fullPath = path.join(LABELS_DIR, '..', label.label_file_path);
          
          // Check if file exists
          try {
            await fs.access(fullPath);
            
            if (!DRY_RUN) {
              await fs.unlink(fullPath);
              await updateLabelFileDeleted(label.id);
            }
            
            console.log(`✅ ${DRY_RUN ? '[DRY RUN] Would delete' : 'Deleted'}: ${label.label_file_path}`);
            deletedCount++;
          } catch (fileError) {
            if (fileError.code === 'ENOENT') {
              // File doesn't exist, update database anyway
              if (!DRY_RUN) {
                await updateLabelFileDeleted(label.id);
              }
              console.log(`⚠️  File not found (already deleted?): ${label.label_file_path}`);
            } else {
              throw fileError;
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing label ${label.id}:`, error.message);
        errorCount++;
      }
    }

    // Clean up empty directories
    if (!DRY_RUN) {
      await cleanupEmptyDirectories(LABELS_DIR);
    }

    console.log(`\n📈 Cleanup Summary:`);
    console.log(`   Files processed: ${oldLabels.length}`);
    console.log(`   Files deleted: ${deletedCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`✨ Label cleanup completed successfully!`);

  } catch (error) {
    console.error('💥 Fatal error during cleanup:', error);
    process.exit(1);
  }
}

/**
 * Get old labels from database
 */
async function getOldLabels(cutoffDate) {
  const query = `
    SELECT id, label_file_path, tracking_number, created_at
    FROM shipping_labels 
    WHERE created_at < ? 
      AND label_file_path IS NOT NULL
      AND status != 'file_deleted'
    ORDER BY created_at ASC
  `;
  
  const [rows] = await db.query(query, [cutoffDate]);
  return rows;
}

/**
 * Mark label file as deleted in database
 */
async function updateLabelFileDeleted(labelId) {
  const query = `
    UPDATE shipping_labels 
    SET status = 'file_deleted', 
        updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `;
  
  await db.query(query, [labelId]);
}

/**
 * Clean up empty directories recursively
 */
async function cleanupEmptyDirectories(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    // Recursively clean subdirectories first
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subdirPath = path.join(dir, entry.name);
        await cleanupEmptyDirectories(subdirPath);
      }
    }
    
    // Check if directory is now empty (after cleaning subdirs)
    const updatedEntries = await fs.readdir(dir);
    if (updatedEntries.length === 0 && dir !== LABELS_DIR) {
      await fs.rmdir(dir);
      console.log(`🗂️  Removed empty directory: ${dir}`);
    }
  } catch (error) {
    // Directory might not exist or might not be empty, which is fine
    if (error.code !== 'ENOENT' && error.code !== 'ENOTEMPTY') {
      console.error(`⚠️  Warning cleaning directory ${dir}:`, error.message);
    }
  }
}

/**
 * Validate environment and setup
 */
async function validateSetup() {
  try {
    // Check if labels directory exists
    await fs.access(LABELS_DIR);
  } catch (error) {
    console.error(`❌ Labels directory not found: ${LABELS_DIR}`);
    console.error('   Please create the directory or check the path');
    process.exit(1);
  }

  // Test database connection
  try {
    await db.query('SELECT 1');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

// Run the cleanup
if (require.main === module) {
  validateSetup()
    .then(() => cleanupOldLabels())
    .then(() => {
      console.log('👋 Cleanup script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Cleanup script failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupOldLabels };