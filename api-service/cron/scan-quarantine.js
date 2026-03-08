#!/usr/bin/env node
/**
 * Background Virus Scanner for Shared Library
 * Scans large files that were queued for async scanning
 * Run via cron: */2 * * * * cd /var/www/main && node api-service/cron/scan-quarantine.js
 */

const path = require('path');
const fs = require('fs').promises;

// Set up module paths
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const db = require('../config/db');
const { scanFile, isClamAvailable } = require('../src/utils/virusScanner');
const nodemailer = require('nodemailer');

const QUARANTINE_DIR = '/var/www/uploads/quarantine';
const UPLOAD_DIR = '/var/www/uploads/shared-library';
const BATCH_SIZE = 5; // Process up to 5 files per run
const MAX_QUARANTINE_AGE_HOURS = 24; // Auto-delete quarantined files after 24 hours

/**
 * Send notification email when file is quarantined
 */
async function sendQuarantineNotification(file, virusName) {
  const notifyEmail = process.env.FILE_UPLOAD_NOTIFY_EMAIL;
  
  if (!notifyEmail) return;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false, // Match EmailService configuration
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      }
    });

    // Get user info
    const [userRows] = await db.query(`
      SELECT u.username, up.first_name, up.last_name, up.display_name
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ?
    `, [file.user_id]);

    const user = userRows[0] || { username: 'unknown' };
    const userName = user.display_name || user.first_name || user.username;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@beemeeart.com',
      to: notifyEmail,
      subject: `⚠️ SECURITY ALERT: Malware Detected in Upload`,
      text: `
SECURITY ALERT: Malware Detected

A file uploaded to Shared Library has been quarantined due to malware detection.

User: ${userName}
Email: ${user.username}
User ID: ${file.user_id}

File: ${file.original_name}
Size: ${formatFileSize(file.file_size)}
Threat: ${virusName}

Upload Time: ${file.created_at}
Scan Time: ${new Date().toISOString()}

The file has been quarantined and will be automatically deleted after 24 hours.
      `.trim(),
      html: `
<h2 style="color: #dc3545;">⚠️ SECURITY ALERT: Malware Detected</h2>
<p>A file uploaded to Shared Library has been quarantined due to malware detection.</p>

<h3>User Details</h3>
<ul>
  <li><strong>User:</strong> ${userName}</li>
  <li><strong>Email:</strong> ${user.username}</li>
  <li><strong>User ID:</strong> ${file.user_id}</li>
</ul>

<h3>File Details</h3>
<ul>
  <li><strong>File:</strong> ${file.original_name}</li>
  <li><strong>Size:</strong> ${formatFileSize(file.file_size)}</li>
  <li><strong>Threat:</strong> <span style="color: #dc3545; font-weight: bold;">${virusName}</span></li>
</ul>

<p><em>Upload Time: ${file.created_at}</em><br>
<em>Scan Time: ${new Date().toISOString()}</em></p>

<p style="color: #666;">The file has been quarantined and will be automatically deleted after 24 hours.</p>
      `.trim()
    });

    console.log(`Quarantine notification sent for file ${file.id}`);
  } catch (error) {
    console.error('Failed to send quarantine notification:', error.message);
  }
}

/**
 * Send notification when file passes scan and becomes available
 */
async function sendAvailableNotification(file) {
  const notifyEmail = process.env.FILE_UPLOAD_NOTIFY_EMAIL;
  
  if (!notifyEmail) return;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false, // Match EmailService configuration
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      }
    });

    // Get user info
    const [userRows] = await db.query(`
      SELECT u.username, u.user_type, up.first_name, up.last_name, up.display_name
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = ?
    `, [file.user_id]);

    const user = userRows[0] || { username: 'unknown', user_type: 'unknown' };
    const userName = user.display_name || user.first_name || user.username;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@beemeeart.com',
      to: notifyEmail,
      subject: `New File Upload from ${userName}`,
      text: `
New file uploaded to Shared Library

User: ${userName}
Email: ${user.username}
User Type: ${user.user_type}
User ID: ${file.user_id}

File: ${file.original_name}
Size: ${formatFileSize(file.file_size)}
Type: ${file.mime_type}

Uploaded at: ${file.created_at}
Scan completed: ${new Date().toISOString()}
Status: Clean ✓
      `.trim()
    });

    console.log(`Available notification sent for file ${file.id}`);
  } catch (error) {
    console.error('Failed to send available notification:', error.message);
  }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

/**
 * Process files waiting to be scanned
 */
async function processPendingScans() {
  console.log('Starting background virus scan...');
  
  // Check if ClamAV is available
  const clamAvailable = await isClamAvailable();
  if (!clamAvailable) {
    console.log('ClamAV not available, moving files to available status without scanning');
  }

  // Get files in 'scanning' status
  const [pendingFiles] = await db.query(`
    SELECT * FROM user_file_uploads
    WHERE status = 'scanning'
    ORDER BY created_at ASC
    LIMIT ?
  `, [BATCH_SIZE]);

  console.log(`Found ${pendingFiles.length} files to scan`);

  for (const file of pendingFiles) {
    try {
      const quarantinePath = path.join(QUARANTINE_DIR, file.filename);
      const finalDir = path.join(UPLOAD_DIR, String(file.user_id));
      const finalPath = path.join(finalDir, file.filename);

      // Check if file exists in quarantine
      try {
        await fs.access(quarantinePath);
      } catch {
        console.error(`File not found in quarantine: ${file.filename}`);
        await db.query(`
          UPDATE user_file_uploads 
          SET status = 'quarantined', scan_result = 'File not found', scanned_at = NOW()
          WHERE id = ?
        `, [file.id]);
        continue;
      }

      if (clamAvailable) {
        // Scan the file
        console.log(`Scanning: ${file.original_name}`);
        const scanResult = await scanFile(quarantinePath);

        if (scanResult.isClean) {
          // Move to final location
          await fs.mkdir(finalDir, { recursive: true });
          await fs.rename(quarantinePath, finalPath);

          await db.query(`
            UPDATE user_file_uploads 
            SET status = 'available', scan_result = 'clean', scanned_at = NOW()
            WHERE id = ?
          `, [file.id]);

          console.log(`✓ Clean: ${file.original_name}`);
          
          // Send notification that file is now available
          await sendAvailableNotification(file);
        } else {
          // Keep in quarantine
          await db.query(`
            UPDATE user_file_uploads 
            SET status = 'quarantined', scan_result = ?, scanned_at = NOW()
            WHERE id = ?
          `, [scanResult.virusName, file.id]);

          console.log(`✗ INFECTED: ${file.original_name} - ${scanResult.virusName}`);
          
          // Send quarantine notification
          await sendQuarantineNotification(file, scanResult.virusName);
        }
      } else {
        // No ClamAV - move file and mark as available (with warning)
        await fs.mkdir(finalDir, { recursive: true });
        await fs.rename(quarantinePath, finalPath);

        await db.query(`
          UPDATE user_file_uploads 
          SET status = 'available', scan_result = 'skipped - ClamAV unavailable', scanned_at = NOW()
          WHERE id = ?
        `, [file.id]);

        console.log(`⚠ Skipped (no ClamAV): ${file.original_name}`);
        
        // Send notification that file is available
        await sendAvailableNotification(file);
      }

    } catch (error) {
      console.error(`Error processing file ${file.id}:`, error.message);
      
      // Mark as failed for retry
      await db.query(`
        UPDATE user_file_uploads 
        SET scan_result = ?
        WHERE id = ?
      `, [`Error: ${error.message}`, file.id]);
    }
  }
}

/**
 * Clean up old quarantined files
 */
async function cleanupQuarantinedFiles() {
  console.log('Cleaning up old quarantined files...');

  // Get quarantined files older than 24 hours
  const [oldFiles] = await db.query(`
    SELECT * FROM user_file_uploads
    WHERE status = 'quarantined'
    AND scanned_at < DATE_SUB(NOW(), INTERVAL ? HOUR)
  `, [MAX_QUARANTINE_AGE_HOURS]);

  console.log(`Found ${oldFiles.length} old quarantined files to clean up`);

  for (const file of oldFiles) {
    try {
      const quarantinePath = path.join(QUARANTINE_DIR, file.filename);
      
      // Delete file from disk
      try {
        await fs.unlink(quarantinePath);
        console.log(`Deleted quarantined file: ${file.filename}`);
      } catch {
        // File may already be gone
      }

      // Mark as deleted in database
      await db.query(`
        UPDATE user_file_uploads 
        SET status = 'deleted', deleted_at = NOW()
        WHERE id = ?
      `, [file.id]);

    } catch (error) {
      console.error(`Error cleaning up file ${file.id}:`, error.message);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    await processPendingScans();
    await cleanupQuarantinedFiles();
    console.log('Background scan complete');
    process.exit(0);
  } catch (error) {
    console.error('Background scan failed:', error);
    process.exit(1);
  }
}

main();
