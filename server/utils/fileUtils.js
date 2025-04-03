const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

/**
 * Get file type from MIME type
 * @param {string} mimeType - MIME type of the file
 * @returns {string} File type ('image', 'video', or 'unknown')
 */
function getFileType(mimeType) {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  return 'unknown';
}

/**
 * Generate a unique filename
 * @param {string} originalFilename - Original filename
 * @returns {string} Unique filename
 */
function generateUniqueFilename(originalFilename) {
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  const ext = path.extname(originalFilename);
  return `${timestamp}-${random}${ext}`;
}

/**
 * Ensure directory exists
 * @param {string} dirPath - Directory path
 */
async function ensureDirectoryExists(dirPath) {
  try {
    await fs.access(dirPath);
  } catch (error) {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Delete file if exists
 * @param {string} filePath - File path
 */
async function deleteFileIfExists(filePath) {
  try {
    await fs.access(filePath);
    await fs.unlink(filePath);
  } catch (error) {
    // File doesn't exist or can't be accessed, ignore
  }
}

/**
 * Get file extension from MIME type
 * @param {string} mimeType - MIME type
 * @returns {string} File extension with dot
 */
function getExtensionFromMimeType(mimeType) {
  const mimeToExt = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/ogg': '.ogv'
  };

  return mimeToExt[mimeType] || path.extname(mimeType);
}

module.exports = {
  getFileType,
  generateUniqueFilename,
  ensureDirectoryExists,
  deleteFileIfExists,
  getExtensionFromMimeType
}; 