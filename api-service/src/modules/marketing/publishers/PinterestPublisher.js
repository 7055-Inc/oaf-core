/**
 * Pinterest Publisher
 * 
 * Handles publishing to Pinterest via Pinterest API v5
 * Documentation: https://developers.pinterest.com/docs/api/v5/
 */

const BasePublisher = require('./BasePublisher');
const fs = require('fs');

class PinterestPublisher extends BasePublisher {
  constructor(connection) {
    super(connection);
    this.apiBaseUrl = 'https://api.pinterest.com/v5';
  }

  /**
   * Publish content to Pinterest (create pin)
   */
  async publish(content, contentData) {
    try {
      // Validate content first
      const validation = this.validateContent(contentData);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Pinterest requires at least one image
      if (!contentData.media_urls || contentData.media_urls.length === 0) {
        return {
          success: false,
          error: 'Pinterest pins require at least one image'
        };
      }

      // Get user's boards
      const boardId = await this.getDefaultBoard();
      if (!boardId) {
        return {
          success: false,
          error: 'No Pinterest board found. Please create a board first.'
        };
      }

      // Create pin
      const pinData = {
        board_id: boardId,
        title: contentData.title || contentData.text?.substring(0, 100) || 'Untitled',
        description: contentData.text || '',
        link: contentData.link || contentData.cta?.url || null,
        media_source: {
          source_type: 'image_url',
          url: contentData.media_urls[0]
        }
      };

      // Add alt text if available
      if (contentData.alt_text) {
        pinData.alt_text = contentData.alt_text;
      }

      const result = await this.makeRequest({
        method: 'POST',
        url: `${this.apiBaseUrl}/pins`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: pinData
      });

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        externalId: result.data.id,
        platform: 'pinterest'
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Get default board for posting
   * In production, this should allow user to select board
   */
  async getDefaultBoard() {
    try {
      const result = await this.makeRequest({
        method: 'GET',
        url: `${this.apiBaseUrl}/boards`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        params: {
          page_size: 1
        }
      });

      if (result.success && result.data.items?.length > 0) {
        return result.data.items[0].id;
      }

      return null;
    } catch (error) {
      console.error('Error fetching Pinterest boards:', error);
      return null;
    }
  }

  /**
   * Create a board (optional utility method)
   */
  async createBoard(name, description = '', privacy = 'PUBLIC') {
    try {
      const result = await this.makeRequest({
        method: 'POST',
        url: `${this.apiBaseUrl}/boards`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          name: name,
          description: description,
          privacy: privacy
        }
      });

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        boardId: result.data.id,
        board: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Upload media to Pinterest (for local files)
   */
  async uploadMedia(filePath, mediaType = 'image') {
    try {
      // Pinterest API v5 doesn't support direct file upload
      // Files need to be hosted and provided as URLs
      // This is a placeholder for local file handling
      
      return {
        success: false,
        error: 'Pinterest requires media to be accessible via URL. Please host the file first.'
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Validate content for Pinterest
   */
  validateContent(contentData) {
    const errors = [];

    // Media is required
    if (!contentData.media_urls || contentData.media_urls.length === 0) {
      errors.push('Pinterest pins require at least one image');
    }

    // Title or text is recommended
    if (!contentData.title && !contentData.text) {
      errors.push('Title or description is recommended for Pinterest pins');
    }

    // Check title length (max 100 characters)
    if (contentData.title && contentData.title.length > 100) {
      errors.push('Pin title exceeds 100 character limit');
    }

    // Check description length (max 500 characters)
    if (contentData.text && contentData.text.length > 500) {
      errors.push('Pin description exceeds 500 character limit');
    }

    // Pinterest only allows one media per pin
    if (contentData.media_urls && contentData.media_urls.length > 1) {
      errors.push('Pinterest allows only one image per pin (will use first image)');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get media requirements for Pinterest
   */
  getMediaRequirements() {
    return {
      image: {
        formats: ['jpg', 'png'],
        maxSize: '32MB',
        minWidth: 600,
        maxWidth: 10000,
        minHeight: 900,
        maxHeight: 20000,
        aspectRatio: '2:3 (recommended), 1:2 to 1:3.5',
        recommendedSize: '1000x1500'
      },
      video: {
        formats: ['mp4', 'mov', 'm4v'],
        maxSize: '2GB',
        minDuration: '4 seconds',
        maxDuration: '15 minutes',
        minWidth: 600,
        maxWidth: 1920,
        minHeight: 900,
        maxHeight: 1920,
        aspectRatio: '1:2 to 1.91:1 (9:16 recommended)',
        encoding: 'H.264 or H.265',
        frameRate: 'Maximum 60 fps'
      },
      text: {
        title: 'Max 100 characters',
        description: 'Max 500 characters',
        alt_text: 'Max 500 characters'
      }
    };
  }

  /**
   * Get analytics for Pinterest pin
   */
  async getAnalytics(externalId) {
    try {
      const result = await this.makeRequest({
        method: 'GET',
        url: `${this.apiBaseUrl}/pins/${externalId}/analytics`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        params: {
          metric_types: 'IMPRESSION,PIN_CLICK,OUTBOUND_CLICK,SAVE'
        }
      });

      if (!result.success) {
        return result;
      }

      const metrics = result.data.all || {};
      const summary = metrics.summary_metrics || {};

      return {
        success: true,
        analytics: {
          impressions: summary.IMPRESSION || 0,
          clicks: summary.PIN_CLICK || 0,
          outboundClicks: summary.OUTBOUND_CLICK || 0,
          saves: summary.SAVE || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Delete pin from Pinterest
   */
  async deletePost(externalId) {
    try {
      const result = await this.makeRequest({
        method: 'DELETE',
        url: `${this.apiBaseUrl}/pins/${externalId}`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        message: 'Pin deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Update pin details
   */
  async updatePin(externalId, updates) {
    try {
      const allowedUpdates = {};

      if (updates.title) allowedUpdates.title = updates.title;
      if (updates.description) allowedUpdates.description = updates.description;
      if (updates.link) allowedUpdates.link = updates.link;
      if (updates.alt_text) allowedUpdates.alt_text = updates.alt_text;

      const result = await this.makeRequest({
        method: 'PATCH',
        url: `${this.apiBaseUrl}/pins/${externalId}`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: allowedUpdates
      });

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        pin: result.data
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Get boards for the connected account
   */
  async getBoards() {
    try {
      const result = await this.makeRequest({
        method: 'GET',
        url: `${this.apiBaseUrl}/boards`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        params: {
          page_size: 25
        }
      });

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        boards: result.data.items || []
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }
}

module.exports = PinterestPublisher;
