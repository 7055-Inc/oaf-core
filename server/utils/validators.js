/**
 * Validate media file type
 * @param {string} mimeType - MIME type of the file
 * @returns {boolean} Whether the file type is valid
 */
function validateMediaType(mimeType) {
  const allowedTypes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Videos
    'video/mp4',
    'video/webm',
    'video/ogg'
  ];

  return allowedTypes.includes(mimeType);
}

/**
 * Validate file size
 * @param {number} size - File size in bytes
 * @param {number} maxSize - Maximum allowed size in bytes
 * @returns {boolean} Whether the file size is valid
 */
function validateFileSize(size, maxSize = 5 * 1024 * 1024) {
  return size <= maxSize;
}

/**
 * Validate image dimensions
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {Object} limits - Dimension limits
 * @returns {boolean} Whether the dimensions are valid
 */
function validateImageDimensions(width, height, limits = {
  maxWidth: 4096,
  maxHeight: 4096,
  minWidth: 50,
  minHeight: 50
}) {
  return width >= limits.minWidth &&
         width <= limits.maxWidth &&
         height >= limits.minHeight &&
         height <= limits.maxHeight;
}

module.exports = {
  validateMediaType,
  validateFileSize,
  validateImageDimensions
}; 