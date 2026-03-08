/**
 * Base Publisher Class
 * 
 * Abstract base class for all social media publishers
 * Defines the common interface and utility methods
 */

const axios = require('axios');
const db = require('../../../../config/db');

class BasePublisher {
  constructor(connection) {
    if (this.constructor === BasePublisher) {
      throw new Error('BasePublisher is an abstract class and cannot be instantiated directly');
    }

    this.connection = connection;
    this.platform = connection.platform;
    this.accessToken = connection.access_token;
    this.accountId = connection.account_id;
  }

  /**
   * Publish content to platform
   * Must be implemented by subclasses
   * @param {object} content - Content data from marketing_content table
   * @param {object} contentData - Parsed content.content JSON
   * @returns {Promise<object>} - { success, externalId, error }
   */
  async publish(content, contentData) {
    throw new Error('publish() must be implemented by subclass');
  }

  /**
   * Validate content before publishing
   * Must be implemented by subclasses
   * @param {object} contentData - Content to validate
   * @returns {object} - { valid, errors }
   */
  validateContent(contentData) {
    throw new Error('validateContent() must be implemented by subclass');
  }

  /**
   * Get media requirements for the platform
   * Must be implemented by subclasses
   * @returns {object} - Media requirements
   */
  getMediaRequirements() {
    throw new Error('getMediaRequirements() must be implemented by subclass');
  }

  /**
   * Check if token is expired or about to expire
   * @returns {boolean}
   */
  isTokenExpired() {
    if (!this.connection.token_expires_at) {
      return false; // No expiry set
    }

    const expiresAt = new Date(this.connection.token_expires_at);
    const now = new Date();
    const bufferMinutes = 10; // Refresh 10 minutes before expiry

    return expiresAt.getTime() - now.getTime() < bufferMinutes * 60 * 1000;
  }

  /**
   * Make HTTP request with retry logic and rate limit handling
   * @param {object} config - Axios config
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<object>}
   */
  async makeRequest(config, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios(config);
        return {
          success: true,
          data: response.data,
          status: response.status
        };
      } catch (error) {
        lastError = error;

        // Check if rate limited
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
          console.log(`Rate limited. Retry after ${retryAfter}s (attempt ${attempt}/${maxRetries})`);

          if (attempt < maxRetries) {
            await this.sleep(retryAfter * 1000);
            continue;
          }
        }

        // Check if token expired
        if (error.response?.status === 401) {
          console.log('Token expired or invalid');
          
          // Mark connection as expired
          await this.markConnectionExpired();
          
          return {
            success: false,
            error: 'Authentication failed - token may be expired',
            tokenExpired: true
          };
        }

        // For other errors, use exponential backoff
        if (attempt < maxRetries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`Request failed, retrying in ${backoffMs}ms (attempt ${attempt}/${maxRetries})`);
          await this.sleep(backoffMs);
          continue;
        }
      }
    }

    // All retries failed
    return {
      success: false,
      error: lastError.response?.data?.error?.message || 
             lastError.response?.data?.message ||
             lastError.message,
      status: lastError.response?.status
    };
  }

  /**
   * Mark connection as expired in database
   */
  async markConnectionExpired() {
    try {
      await db.execute(
        `UPDATE social_connections SET status = 'expired' WHERE id = ?`,
        [this.connection.id]
      );
    } catch (error) {
      console.error('Error marking connection expired:', error);
    }
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Format error message
   * @param {Error|object} error
   * @returns {string}
   */
  formatError(error) {
    if (typeof error === 'string') {
      return error;
    }

    if (error.response) {
      return error.response.data?.error?.message || 
             error.response.data?.message || 
             `HTTP ${error.response.status}: ${error.response.statusText}`;
    }

    return error.message || 'Unknown error';
  }

  /**
   * Upload media file to platform
   * Must be implemented by subclasses if media upload is needed
   * @param {string} mediaPath - Path to media file
   * @param {string} mediaType - Type of media (image/video)
   * @returns {Promise<object>} - { success, mediaId, error }
   */
  async uploadMedia(mediaPath, mediaType) {
    throw new Error('uploadMedia() must be implemented by subclass if media upload is needed');
  }

  /**
   * Get analytics for published content
   * Optional - can be implemented by subclasses
   * @param {string} externalId - Platform post ID
   * @returns {Promise<object>} - Analytics data
   */
  async getAnalytics(externalId) {
    return {
      success: false,
      error: 'Analytics not implemented for this platform'
    };
  }

  /**
   * Delete published content from platform
   * Optional - can be implemented by subclasses
   * @param {string} externalId - Platform post ID
   * @returns {Promise<object>} - { success, error }
   */
  async deletePost(externalId) {
    return {
      success: false,
      error: 'Delete not implemented for this platform'
    };
  }
}

module.exports = BasePublisher;
