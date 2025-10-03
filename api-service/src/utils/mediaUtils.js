const db = require('../../config/db');

/**
 * Base URL for smart media serving endpoint
 */
const SMART_MEDIA_BASE_URL = process.env.SMART_MEDIA_BASE_URL || 'https://api.beemeeart.com/api/images';

/**
 * Get best available media URLs for a specific image path with smart fallback
 * 
 * @param {string} tempImagePath - The temporary image path from pending_images
 * @param {string} size - Size parameter for smart serving (thumbnail|small|grid|detail|header|zoom)
 * @returns {Object|null} - Object with image_url and thumbnail_url, or null if not found
 */
async function getProcessedMediaUrls(tempImagePath, size = 'detail') {
  try {
    // Get processed URLs from database
    const [results] = await db.execute(
      'SELECT permanent_url, status FROM pending_images WHERE image_path = ? LIMIT 1',
      [tempImagePath]
    );
    
    if (results.length === 0) {
      return null;
    }
    
    const { permanent_url, status } = results[0];
    
    // If processing is complete and we have a media ID
    if (status === 'complete' && permanent_url) {
      // All processed images now use media ID format
      return {
        image_url: `${SMART_MEDIA_BASE_URL}/${permanent_url}?size=${size}`,
        thumbnail_url: `${SMART_MEDIA_BASE_URL}/${permanent_url}?size=thumbnail`,
        source: 'smart_serving'
      };
    }
    
    // Fallback: serve temp image directly for pending/failed processing
    if (tempImagePath) {
      return {
        image_url: `https://api.beemeeart.com${tempImagePath}`,
        thumbnail_url: null, // No thumbnail for temp images
        source: 'temp'
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('Error getting media URLs:', error);
    
    // Fallback to temp image
    if (tempImagePath) {
      return {
        image_url: `https://api.beemeeart.com${tempImagePath}`,
        thumbnail_url: null,
        source: 'fallback'
      };
    }
    
    return null;
  }
}

/**
 * Get best available media URLs for multiple image paths with smart fallback
 * 
 * @param {string[]} tempImagePaths - Array of temporary image paths
 * @param {string} size - Size parameter for smart serving (thumbnail|small|grid|detail|header|zoom)
 * @returns {Object} - Object mapping temp paths to best available URLs
 */
async function getBatchProcessedMediaUrls(tempImagePaths, size = 'detail') {
  if (!tempImagePaths || tempImagePaths.length === 0) {
    return {};
  }
  
  try {
    const placeholders = tempImagePaths.map(() => '?').join(',');
    const [results] = await db.execute(
      `SELECT image_path, permanent_url, status 
       FROM pending_images 
       WHERE image_path IN (${placeholders})`,
      tempImagePaths
    );
    
    const urlMap = {};
    
    // Handle images that have database records
    for (const result of results) {
      const { image_path, permanent_url, status } = result;
      
      // If processing complete and we have a media ID
      if (status === 'complete' && permanent_url) {
        // All processed images now use media ID format
        urlMap[image_path] = {
          image_url: `${SMART_MEDIA_BASE_URL}/${permanent_url}?size=${size}`,
          thumbnail_url: `${SMART_MEDIA_BASE_URL}/${permanent_url}?size=thumbnail`,
          source: 'smart_serving'
        };
      } else {
        // Fallback to temp image served directly
        urlMap[image_path] = {
          image_url: `https://api.beemeeart.com${image_path}`,
          thumbnail_url: null,
          source: 'temp'
        };
      }
    }
    
    // Handle images that don't have database records (serve temp directly)
    for (const tempPath of tempImagePaths) {
      if (!urlMap[tempPath]) {
        urlMap[tempPath] = {
          image_url: `https://api.beemeeart.com${tempPath}`,
          thumbnail_url: null,
          source: 'direct'
        };
      }
    }
    
    return urlMap;
    
  } catch (error) {
    console.error('Error getting batch media URLs:', error);
    
    // Fallback: serve all as temp images directly
    const fallbackMap = {};
    for (const tempPath of tempImagePaths) {
      fallbackMap[tempPath] = {
        image_url: `https://api.beemeeart.com${tempPath}`,
        thumbnail_url: null,
        source: 'fallback'
      };
    }
    return fallbackMap;
  }
}

/**
 * Enhance a product object with processed media URLs
 * Replaces temp image URLs with smart serving URLs when available
 * 
 * @param {Object} product - Product object from database
 * @param {string} size - Size parameter for main images (thumbnail|small|grid|detail|header|zoom)
 * @returns {Object} - Enhanced product with processed media URLs
 */
async function enhanceProductWithMedia(product, size = 'detail') {
  if (!product) return product;
  
  try {
    // Get all product images
    const [productImages] = await db.execute(
      'SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC',
      [product.id]
    );
    
    if (productImages.length === 0) {
      return product;
    }
    
    // Get processed URLs for all images with the specified size
    const tempPaths = productImages.map(img => img.image_url);
    const processedUrls = await getBatchProcessedMediaUrls(tempPaths, size);
    
    // Build the processed images array
    const processedImages = [];
    for (const productImage of productImages) {
      const processed = processedUrls[productImage.image_url];
      if (processed && processed.image_url) {
        processedImages.push({
          image_url: processed.image_url,
          thumbnail_url: processed.thumbnail_url,
          source: processed.source // For debugging
        });
      }
    }
    
    // Add processed images to product
    product.images = processedImages;
    
    // Set primary image (first in array)
    if (processedImages.length > 0) {
      product.image_url = processedImages[0].image_url;
      product.thumbnail_url = processedImages[0].thumbnail_url;
    }
    
    return product;
  } catch (error) {
    console.error('Error enhancing product with media:', error);
    return product;
  }
}

/**
 * Enhance an event object with processed media URLs
 * 
 * @param {Object} event - Event object from database
 * @returns {Object} - Enhanced event with processed media URLs
 */
async function enhanceEventWithMedia(event) {
  if (!event) return event;
  
  try {
    // Get all event images
    const [eventImages] = await db.execute(
      'SELECT image_url FROM event_images WHERE event_id = ? ORDER BY created_at ASC',
      [event.id]
    );
    
    if (eventImages.length === 0) {
      return event;
    }
    
    // Get processed URLs
    const tempPaths = eventImages.map(img => img.image_url);
    const processedUrls = await getBatchProcessedMediaUrls(tempPaths);
    
    // Build processed images array
    const processedImages = [];
    for (const eventImage of eventImages) {
      const processed = processedUrls[eventImage.image_url];
      if (processed && processed.image_url) {
        processedImages.push({
          image_url: processed.image_url,
          thumbnail_url: processed.thumbnail_url
        });
      }
    }
    
    // Add to event
    event.images = processedImages;
    
    // Set primary image
    if (processedImages.length > 0) {
      event.image_url = processedImages[0].image_url;
      event.thumbnail_url = processedImages[0].thumbnail_url;
    }
    
    return event;
  } catch (error) {
    console.error('Error enhancing event with media:', error);
    return event;
  }
}

/**
 * Enhance a user profile object with processed media URLs
 * 
 * @param {Object} userProfile - User profile object from database
 * @returns {Object} - Enhanced profile with processed media URLs
 */
async function enhanceUserProfileWithMedia(userProfile) {
  if (!userProfile) return userProfile;
  
  try {
    const mediaFields = ['profile_image_path', 'header_image_path', 'logo_path'];
    const tempPaths = [];
    
    // Collect temp paths from profile
    for (const field of mediaFields) {
      if (userProfile[field] && userProfile[field].includes('/temp_images/')) {
        tempPaths.push(userProfile[field]);
      }
    }
    
    if (tempPaths.length === 0) {
      return userProfile;
    }
    
    // Get processed URLs
    const processedUrls = await getBatchProcessedMediaUrls(tempPaths);
    
    // Replace temp URLs with processed URLs
    for (const field of mediaFields) {
      if (userProfile[field] && processedUrls[userProfile[field]]) {
        const processed = processedUrls[userProfile[field]];
        userProfile[field] = processed.image_url;
        
        // Add thumbnail variants
        const thumbnailField = field.replace('_url', '_thumbnail_url');
        if (processed.thumbnail_url) {
          userProfile[thumbnailField] = processed.thumbnail_url;
        }
      }
    }
    
    return userProfile;
  } catch (error) {
    console.error('Error enhancing user profile with media:', error);
    return userProfile;
  }
}

/**
 * Check if media processing is complete for a given temp path
 * 
 * @param {string} tempImagePath - Temporary image path
 * @returns {boolean} - True if processing is complete
 */
async function isMediaProcessingComplete(tempImagePath) {
  try {
    const [results] = await db.execute(
      'SELECT status FROM pending_images WHERE image_path = ? LIMIT 1',
      [tempImagePath]
    );
    
    return results.length > 0 && results[0].status === 'complete';
  } catch (error) {
    console.error('Error checking media processing status:', error);
    return false;
  }
}

/**
 * Helper function to generate smart serving URL from media ID
 * 
 * @param {string|number} mediaId - The media ID from permanent_url field
 * @param {string} size - Size parameter (thumbnail|small|grid|detail|header|zoom)
 * @returns {string} - Complete smart serving URL
 */
function generateSmartMediaUrl(mediaId, size = 'detail') {
  if (!mediaId) return null;
  
  // Validate that mediaId is numeric
  if (!/^\d+$/.test(mediaId.toString())) {
    console.warn('Invalid media ID format:', mediaId);
    return null;
  }
  
  return `${SMART_MEDIA_BASE_URL}/${mediaId}?size=${size}`;
}

module.exports = {
  getProcessedMediaUrls,
  getBatchProcessedMediaUrls,
  enhanceProductWithMedia,
  enhanceEventWithMedia,
  enhanceUserProfileWithMedia,
  isMediaProcessingComplete,
  generateSmartMediaUrl,
  SMART_MEDIA_BASE_URL
}; 