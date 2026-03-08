/**
 * File Uploads Routes - Shared Library
 * Handles file uploads, downloads, and management for the Shared Library feature
 * Supports images, videos, and documents with virus scanning
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const db = require('../../config/db');
const verifyToken = require('../middleware/jwt');
const { secureLogger } = require('../middleware/secureLogger');
const { scanFile, isClamAvailable } = require('../utils/virusScanner');
const nodemailer = require('nodemailer');

// Configuration
const UPLOAD_DIR = '/var/www/uploads/shared-library';
const QUARANTINE_DIR = '/var/www/uploads/quarantine';
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB for long-form videos
const SMALL_FILE_THRESHOLD = 50 * 1024 * 1024; // 50MB - scan sync if smaller

// Allowed file types (MIME types)
const ALLOWED_TYPES = {
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  // Videos
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'video/x-msvideo': ['.avi'],
  'video/webm': ['.webm'],
  'video/x-matroska': ['.mkv'],
  // Documents
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv']
};

// Allowed user types for this feature
const ALLOWED_USER_TYPES = ['artist', 'promoter', 'admin'];

// Multer configuration
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    // Initially upload to quarantine, move after scan
    try {
      await fs.mkdir(QUARANTINE_DIR, { recursive: true });
      cb(null, QUARANTINE_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    // Sanitize original filename
    const sanitizedName = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, '')
      .substring(0, 100);
    const uniqueName = `${uuidv4()}_${Date.now()}_${sanitizedName}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10 // Max 10 files per upload
  }
});

/**
 * Middleware to check if user has access to Shared Library
 * Looks up user type from database since JWT doesn't include it
 */
const checkSharedLibraryAccess = async (req, res, next) => {
  try {
    const userId = req.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Look up user type from database
    const [rows] = await db.query('SELECT user_type FROM users WHERE id = ?', [userId]);
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userType = rows[0].user_type;
    req.userType = userType; // Store for later use
    
    if (!ALLOWED_USER_TYPES.includes(userType)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Shared Library is available for artists, promoters, and admins only'
      });
    }
    
    next();
  } catch (error) {
    secureLogger.error('Error checking shared library access', { error: error.message });
    return res.status(500).json({ error: 'Failed to verify access' });
  }
};

/**
 * Send notification email to team about new upload
 */
async function sendUploadNotification(userId, files, userData) {
  const notifyEmail = process.env.FILE_UPLOAD_NOTIFY_EMAIL;
  
  if (!notifyEmail) {
    secureLogger.warn('FILE_UPLOAD_NOTIFY_EMAIL not configured, skipping notification');
    return;
  }

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

    const fileList = files.map(f => 
      `• ${f.original_name} (${formatFileSize(f.file_size)}) - ${f.mime_type}`
    ).join('\n');

    const userName = userData.display_name || userData.first_name || userData.username || 'Unknown';

    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@beemeeart.com',
      to: notifyEmail,
      subject: `New File Upload from ${userName}`,
      text: `
New file(s) uploaded to Shared Library

User: ${userName}
Email: ${userData.username}
User Type: ${userData.user_type}
User ID: ${userId}

Files:
${fileList}

Uploaded at: ${new Date().toISOString()}
      `.trim(),
      html: `
<h2>New File Upload to Shared Library</h2>
<p><strong>User:</strong> ${userName}</p>
<p><strong>Email:</strong> ${userData.username}</p>
<p><strong>User Type:</strong> ${userData.user_type}</p>
<p><strong>User ID:</strong> ${userId}</p>

<h3>Files:</h3>
<ul>
${files.map(f => `<li>${f.original_name} (${formatFileSize(f.file_size)}) - ${f.mime_type}</li>`).join('\n')}
</ul>

<p><em>Uploaded at: ${new Date().toISOString()}</em></p>
      `.trim()
    });

    secureLogger.info('Upload notification sent', { 
      userId, 
      fileCount: files.length,
      notifyEmail 
    });
  } catch (error) {
    secureLogger.error('Failed to send upload notification', { 
      error: error.message,
      userId 
    });
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
 * POST /api/files/upload
 * Upload file(s) to Shared Library
 */
router.post('/upload', 
  verifyToken, 
  checkSharedLibraryAccess,
  upload.array('files', 10),
  async (req, res) => {
    const uploadedFiles = [];
    const userId = req.userId;
    
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const { note } = req.body;
      
      // Get user data for notification
      const [userRows] = await db.query(`
        SELECT u.id, u.username, u.user_type, up.first_name, up.last_name, up.display_name
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
        WHERE u.id = ?
      `, [userId]);
      
      const userData = userRows[0] || { username: 'unknown', user_type: 'unknown' };

      // Ensure user directory exists
      const userDir = path.join(UPLOAD_DIR, String(userId));
      await fs.mkdir(userDir, { recursive: true });

      // Process each file
      for (const file of req.files) {
        const quarantinePath = file.path;
        const finalPath = path.join(userDir, file.filename);
        
        // Insert record with uploading status
        const [insertResult] = await db.query(`
          INSERT INTO user_file_uploads 
          (user_id, filename, original_name, file_size, mime_type, note, status)
          VALUES (?, ?, ?, ?, ?, ?, 'uploading')
        `, [userId, file.filename, file.originalname, file.size, file.mimetype, note || null]);
        
        const fileId = insertResult.insertId;

        // Determine if we should scan synchronously or asynchronously
        const isSmallFile = file.size < SMALL_FILE_THRESHOLD;
        const clamAvailable = await isClamAvailable();

        if (clamAvailable && isSmallFile) {
          // Small file: scan synchronously
          try {
            await db.query(
              'UPDATE user_file_uploads SET status = ? WHERE id = ?',
              ['scanning', fileId]
            );

            const scanResult = await scanFile(quarantinePath);

            if (scanResult.isClean) {
              // Move to final location
              await fs.rename(quarantinePath, finalPath);
              
              await db.query(`
                UPDATE user_file_uploads 
                SET status = 'available', scan_result = 'clean', scanned_at = NOW()
                WHERE id = ?
              `, [fileId]);

              uploadedFiles.push({
                id: fileId,
                original_name: file.originalname,
                file_size: file.size,
                mime_type: file.mimetype,
                status: 'available'
              });
            } else {
              // Quarantined - keep in quarantine folder
              await db.query(`
                UPDATE user_file_uploads 
                SET status = 'quarantined', scan_result = ?, scanned_at = NOW()
                WHERE id = ?
              `, [scanResult.virusName, fileId]);

              uploadedFiles.push({
                id: fileId,
                original_name: file.originalname,
                file_size: file.size,
                mime_type: file.mimetype,
                status: 'quarantined',
                scan_result: scanResult.virusName
              });
            }
          } catch (scanError) {
            secureLogger.error('Sync scan failed', { fileId, error: scanError.message });
            // Leave in scanning status for background job to retry
            await db.query(
              'UPDATE user_file_uploads SET status = ? WHERE id = ?',
              ['scanning', fileId]
            );
            
            uploadedFiles.push({
              id: fileId,
              original_name: file.originalname,
              file_size: file.size,
              mime_type: file.mimetype,
              status: 'scanning'
            });
          }
        } else {
          // Large file or ClamAV not available: queue for background scan
          await db.query(
            'UPDATE user_file_uploads SET status = ? WHERE id = ?',
            ['scanning', fileId]
          );

          uploadedFiles.push({
            id: fileId,
            original_name: file.originalname,
            file_size: file.size,
            mime_type: file.mimetype,
            status: 'scanning'
          });
        }
      }

      // Send notification for available files
      const availableFiles = uploadedFiles.filter(f => f.status === 'available');
      if (availableFiles.length > 0) {
        sendUploadNotification(userId, availableFiles, userData);
      }

      secureLogger.info('Files uploaded to Shared Library', {
        userId,
        fileCount: uploadedFiles.length,
        files: uploadedFiles.map(f => ({ name: f.original_name, status: f.status }))
      });

      res.json({
        success: true,
        message: `${uploadedFiles.length} file(s) uploaded`,
        files: uploadedFiles
      });

    } catch (error) {
      secureLogger.error('File upload error', { userId, error: error.message });
      
      // Clean up any uploaded files on error
      for (const file of req.files || []) {
        try {
          await fs.unlink(file.path);
        } catch {}
      }

      res.status(500).json({ 
        error: 'Upload failed',
        message: error.message 
      });
    }
  }
);

// Error handler for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large',
        message: `Maximum file size is ${formatFileSize(MAX_FILE_SIZE)}`
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: 'Too many files',
        message: 'Maximum 10 files per upload'
      });
    }
  }
  
  if (error.message?.includes('File type not allowed')) {
    return res.status(400).json({ 
      error: 'Invalid file type',
      message: error.message
    });
  }
  
  next(error);
});

/**
 * GET /api/files/my-uploads
 * Get current user's uploads (both available files and processing status)
 */
router.get('/my-uploads', verifyToken, checkSharedLibraryAccess, async (req, res) => {
  try {
    const userId = req.userId;
    const { status, limit = 50, offset = 0 } = req.query;

    let whereClause = 'WHERE user_id = ?';
    const params = [userId];

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    } else {
      // Exclude deleted by default
      whereClause += ' AND status != ?';
      params.push('deleted');
    }

    // Get available files (My Media section)
    const [availableFiles] = await db.query(`
      SELECT id, filename, original_name, file_size, mime_type, note, status, created_at
      FROM user_file_uploads
      WHERE user_id = ? AND status = 'available'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, parseInt(limit), parseInt(offset)]);

    // Get processing/status files (Processing Status section)
    const [processingFiles] = await db.query(`
      SELECT id, filename, original_name, file_size, mime_type, note, status, 
             scan_result, scanned_at, created_at
      FROM user_file_uploads
      WHERE user_id = ? AND status IN ('uploading', 'scanning', 'quarantined')
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId]);

    // Get counts
    const [counts] = await db.query(`
      SELECT 
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available_count,
        COUNT(CASE WHEN status = 'scanning' THEN 1 END) as scanning_count,
        COUNT(CASE WHEN status = 'quarantined' THEN 1 END) as quarantined_count
      FROM user_file_uploads
      WHERE user_id = ?
    `, [userId]);

    res.json({
      success: true,
      available: availableFiles,
      processing: processingFiles,
      counts: counts[0]
    });

  } catch (error) {
    secureLogger.error('Error fetching user uploads', { 
      userId: req.userId, 
      error: error.message 
    });
    res.status(500).json({ error: 'Failed to fetch uploads' });
  }
});

/**
 * GET /api/files/download/:id
 * Download a file (with ownership check)
 */
router.get('/download/:id', verifyToken, async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userType === 'admin' || req.roles?.includes('admin');

    // Get file record
    const [files] = await db.query(`
      SELECT * FROM user_file_uploads WHERE id = ?
    `, [fileId]);

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];

    // Check ownership (admins can download any file)
    if (file.user_id !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Only allow downloading available files
    if (file.status !== 'available') {
      return res.status(400).json({ 
        error: 'File not available',
        message: `File status: ${file.status}`
      });
    }

    // Build file path
    const filePath = path.join(UPLOAD_DIR, String(file.user_id), file.filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    // Set secure headers
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('Cache-Control', 'private, no-cache');

    // Stream the file
    const fileStream = require('fs').createReadStream(filePath);
    fileStream.pipe(res);

    secureLogger.info('File downloaded', { 
      fileId, 
      userId,
      fileName: file.original_name 
    });

  } catch (error) {
    secureLogger.error('File download error', { 
      fileId: req.params.id,
      error: error.message 
    });
    res.status(500).json({ error: 'Download failed' });
  }
});

/**
 * DELETE /api/files/:id
 * Soft delete a file
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.userId;
    const isAdmin = req.userType === 'admin' || req.roles?.includes('admin');

    // Get file record
    const [files] = await db.query(`
      SELECT * FROM user_file_uploads WHERE id = ?
    `, [fileId]);

    if (files.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    const file = files[0];

    // Check ownership (admins can delete any file)
    if (file.user_id !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Soft delete
    await db.query(`
      UPDATE user_file_uploads 
      SET status = 'deleted', deleted_at = NOW()
      WHERE id = ?
    `, [fileId]);

    // Optionally delete the actual file (or leave for later cleanup)
    // For now, we'll delete it immediately
    try {
      const filePath = path.join(UPLOAD_DIR, String(file.user_id), file.filename);
      await fs.unlink(filePath);
    } catch (unlinkError) {
      secureLogger.warn('Could not delete file from disk', { 
        fileId, 
        error: unlinkError.message 
      });
    }

    secureLogger.info('File deleted', { fileId, userId, fileName: file.original_name });

    res.json({ 
      success: true, 
      message: 'File deleted' 
    });

  } catch (error) {
    secureLogger.error('File delete error', { 
      fileId: req.params.id,
      error: error.message 
    });
    res.status(500).json({ error: 'Delete failed' });
  }
});

/**
 * GET /api/files/admin/all
 * Admin: Get all uploads from all users (newest first)
 */
router.get('/admin/all', verifyToken, async (req, res) => {
  try {
    const isAdmin = req.userType === 'admin' || req.roles?.includes('admin');
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, limit = 50, offset = 0, search } = req.query;

    let whereClause = 'WHERE f.status != ?';
    const params = ['deleted'];

    if (status && status !== 'all') {
      whereClause += ' AND f.status = ?';
      params.push(status);
    }

    if (search) {
      whereClause += ' AND (f.original_name LIKE ? OR u.username LIKE ? OR up.first_name LIKE ? OR up.last_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    params.push(parseInt(limit), parseInt(offset));

    const [files] = await db.query(`
      SELECT 
        f.*,
        u.username as user_email,
        u.user_type,
        up.first_name,
        up.last_name,
        up.display_name
      FROM user_file_uploads f
      JOIN users u ON f.user_id = u.id
      LEFT JOIN user_profiles up ON f.user_id = up.user_id
      ${whereClause}
      ORDER BY f.created_at DESC
      LIMIT ? OFFSET ?
    `, params);

    // Get total count
    const countParams = params.slice(0, -2); // Remove limit and offset
    const [countResult] = await db.query(`
      SELECT COUNT(*) as total
      FROM user_file_uploads f
      JOIN users u ON f.user_id = u.id
      LEFT JOIN user_profiles up ON f.user_id = up.user_id
      ${whereClause}
    `, countParams);

    res.json({
      success: true,
      files,
      pagination: {
        total: countResult[0].total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    secureLogger.error('Admin files list error', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

module.exports = router;
