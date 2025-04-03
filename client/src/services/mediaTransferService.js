import { apiCall } from '../utils/apiUtils';

/**
 * Service for handling media transfers to the dedicated media server
 */
const mediaTransferService = {
  /**
   * Create a product folder on the media server
   * @param {string|number} userId - User ID
   * @param {string|number} productId - Product ID
   * @returns {Promise<Object>} Result of folder creation
   */
  async createProductFolder(userId, productId) {
    try {
      console.log(`[MEDIA] Creating product folder for User ${userId}, Product ${productId}`);
      const result = await apiCall(`/api/media-vm/create-product/${userId}/${productId}`, 'POST', { 
        volume: "products" 
      });
      
      console.log(`[MEDIA] Folder created: ${result.path || 'unknown path'}`);
      return result;
    } catch (error) {
      console.error(`[MEDIA] Failed to create product folder:`, error);
      throw error;
    }
  },
  
  /**
   * Upload a file to the media server
   * @param {string|number} userId - User ID
   * @param {string|number} productId - Product ID
   * @param {File|Blob} fileData - File to upload
   * @param {Object} metadata - File metadata
   * @returns {Promise<Object>} Result of file upload
   */
  async uploadFile(userId, productId, fileData, metadata) {
    try {
      console.log(`[MEDIA] Uploading file for Product ${productId}`);
      
      // Create form data with file and metadata
      const formData = new FormData();
      formData.append('file', fileData);
      formData.append('metadata', JSON.stringify(metadata));
      
      // Call the proxy endpoint with formData
      const result = await apiCall(`/api/media-vm/upload/${userId}/products/${productId}`, 'POST', formData, true);
      
      console.log(`[MEDIA] File uploaded successfully: ${result.url || 'unknown url'}`);
      return result;
    } catch (error) {
      console.error(`[MEDIA] Failed to upload file:`, error);
      throw error;
    }
  },
  
  /**
   * Retry a failed upload with exponential backoff
   * @param {Function} uploadFn - Upload function to retry
   * @param {number} maxRetries - Maximum number of retries
   * @returns {Promise<Object>} Result of upload attempt
   */
  async retryUpload(uploadFn, maxRetries = 3) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[MEDIA] Upload attempt ${attempt} of ${maxRetries}`);
        return await uploadFn();
      } catch (error) {
        console.warn(`[MEDIA] Upload attempt ${attempt} failed:`, error);
        lastError = error;
        
        // Exponential backoff
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.log(`[MEDIA] Retrying in ${Math.round(delay/1000)} seconds`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    throw lastError;
  }
};

export default mediaTransferService;