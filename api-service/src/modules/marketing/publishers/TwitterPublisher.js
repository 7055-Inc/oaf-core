/**
 * Twitter/X Publisher
 * 
 * Handles publishing to Twitter/X via Twitter API v2
 * Documentation: https://developer.twitter.com/en/docs/twitter-api
 */

const BasePublisher = require('./BasePublisher');
const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

class TwitterPublisher extends BasePublisher {
  constructor(connection) {
    super(connection);
    this.apiBaseUrl = 'https://api.twitter.com/2';
    this.uploadBaseUrl = 'https://upload.twitter.com/1.1';
  }

  /**
   * Publish content to Twitter
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

      // Prepare tweet data
      const tweetData = {
        text: contentData.text
      };

      // Handle media if present
      if (contentData.media_urls && contentData.media_urls.length > 0) {
        const mediaIds = await this.uploadMediaFiles(contentData.media_urls);
        
        if (mediaIds.length > 0) {
          tweetData.media = {
            media_ids: mediaIds
          };
        }
      }

      // Post tweet
      const result = await this.makeRequest({
        method: 'POST',
        url: `${this.apiBaseUrl}/tweets`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: tweetData
      });

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        externalId: result.data.data.id,
        platform: 'twitter'
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Upload media files to Twitter
   * @param {array} mediaUrls - Array of media URLs
   * @returns {array} - Array of media IDs
   */
  async uploadMediaFiles(mediaUrls) {
    const mediaIds = [];

    for (const mediaUrl of mediaUrls) {
      try {
        // For URLs, we need to download first, then upload
        // In production, this should handle local files from marketing_assets
        
        // Check if it's a local file path
        if (mediaUrl.startsWith('/') || mediaUrl.startsWith('./')) {
          const mediaId = await this.uploadMediaFile(mediaUrl);
          if (mediaId) {
            mediaIds.push(mediaId);
          }
        } else {
          // For remote URLs, we'd need to download first
          console.warn(`Twitter upload from URL not fully implemented: ${mediaUrl}`);
          // TODO: Download media from URL, then upload
        }
      } catch (error) {
        console.error('Error uploading media to Twitter:', error);
        // Continue with other media
      }
    }

    return mediaIds;
  }

  /**
   * Upload a single media file to Twitter
   * @param {string} filePath - Path to media file
   * @returns {string|null} - Media ID or null
   */
  async uploadMediaFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        return null;
      }

      const media = fs.readFileSync(filePath);
      const mediaSize = media.length;
      const mediaType = this.getMediaType(filePath);

      // INIT
      const initResult = await this.makeRequest({
        method: 'POST',
        url: `${this.uploadBaseUrl}/media/upload.json`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        data: {
          command: 'INIT',
          total_bytes: mediaSize,
          media_type: mediaType
        }
      });

      if (!initResult.success) {
        console.error('Twitter media init failed:', initResult.error);
        return null;
      }

      const mediaId = initResult.data.media_id_string;

      // APPEND
      const chunkSize = 5 * 1024 * 1024; // 5MB chunks
      let segmentIndex = 0;

      for (let i = 0; i < mediaSize; i += chunkSize) {
        const chunk = media.slice(i, Math.min(i + chunkSize, mediaSize));
        
        const formData = new FormData();
        formData.append('command', 'APPEND');
        formData.append('media_id', mediaId);
        formData.append('segment_index', segmentIndex);
        formData.append('media', chunk);

        const appendResult = await this.makeRequest({
          method: 'POST',
          url: `${this.uploadBaseUrl}/media/upload.json`,
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            ...formData.getHeaders()
          },
          data: formData
        });

        if (!appendResult.success) {
          console.error('Twitter media append failed:', appendResult.error);
          return null;
        }

        segmentIndex++;
      }

      // FINALIZE
      const finalizeResult = await this.makeRequest({
        method: 'POST',
        url: `${this.uploadBaseUrl}/media/upload.json`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        data: {
          command: 'FINALIZE',
          media_id: mediaId
        }
      });

      if (!finalizeResult.success) {
        console.error('Twitter media finalize failed:', finalizeResult.error);
        return null;
      }

      // Check if processing needed (for videos)
      if (finalizeResult.data.processing_info) {
        await this.waitForProcessing(mediaId);
      }

      return mediaId;
    } catch (error) {
      console.error('Error in uploadMediaFile:', error);
      return null;
    }
  }

  /**
   * Wait for media processing to complete
   */
  async waitForProcessing(mediaId) {
    const maxAttempts = 20;
    let attempts = 0;

    while (attempts < maxAttempts) {
      await this.sleep(2000); // Wait 2 seconds

      const statusResult = await this.makeRequest({
        method: 'GET',
        url: `${this.uploadBaseUrl}/media/upload.json`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        params: {
          command: 'STATUS',
          media_id: mediaId
        }
      });

      if (statusResult.success) {
        const state = statusResult.data.processing_info?.state;
        
        if (state === 'succeeded') {
          return true;
        } else if (state === 'failed') {
          throw new Error('Media processing failed');
        }
      }

      attempts++;
    }

    throw new Error('Media processing timeout');
  }

  /**
   * Get media type from file path
   */
  getMediaType(filePath) {
    const ext = filePath.toLowerCase().split('.').pop();
    
    const imageTypes = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp'
    };

    const videoTypes = {
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo'
    };

    return imageTypes[ext] || videoTypes[ext] || 'application/octet-stream';
  }

  /**
   * Validate content for Twitter
   */
  validateContent(contentData) {
    const errors = [];

    // Text is required
    if (!contentData.text || contentData.text.trim() === '') {
      errors.push('Tweet text is required');
    }

    // Check text length (280 characters)
    if (contentData.text && contentData.text.length > 280) {
      errors.push('Tweet exceeds 280 character limit');
    }

    // Check media count (max 4 images or 1 video)
    if (contentData.media_urls && contentData.media_urls.length > 4) {
      errors.push('Maximum 4 media items allowed per tweet');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get media requirements for Twitter
   */
  getMediaRequirements() {
    return {
      image: {
        formats: ['jpg', 'png', 'gif', 'webp'],
        maxSize: '5MB',
        maxCount: 4,
        maxWidth: 8192,
        maxHeight: 8192
      },
      video: {
        formats: ['mp4', 'mov'],
        maxSize: '512MB',
        maxLength: '2 minutes 20 seconds',
        maxCount: 1,
        aspectRatio: '1:2.39 to 2.39:1'
      },
      gif: {
        maxSize: '15MB',
        maxCount: 1
      }
    };
  }

  /**
   * Get analytics for Twitter post
   */
  async getAnalytics(externalId) {
    try {
      const result = await this.makeRequest({
        method: 'GET',
        url: `${this.apiBaseUrl}/tweets/${externalId}`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        params: {
          'tweet.fields': 'public_metrics'
        }
      });

      if (!result.success) {
        return result;
      }

      const metrics = result.data.data.public_metrics || {};

      return {
        success: true,
        analytics: {
          impressions: metrics.impression_count || 0,
          engagements: (metrics.like_count || 0) + (metrics.reply_count || 0),
          likes: metrics.like_count || 0,
          retweets: metrics.retweet_count || 0,
          replies: metrics.reply_count || 0,
          quotes: metrics.quote_count || 0
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
   * Delete tweet
   */
  async deletePost(externalId) {
    try {
      const result = await this.makeRequest({
        method: 'DELETE',
        url: `${this.apiBaseUrl}/tweets/${externalId}`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }
}

module.exports = TwitterPublisher;
