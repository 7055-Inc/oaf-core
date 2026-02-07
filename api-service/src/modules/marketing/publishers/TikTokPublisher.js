/**
 * TikTok Publisher
 * 
 * Handles publishing to TikTok via TikTok Content Posting API
 * Documentation: https://developers.tiktok.com/doc/content-posting-api-get-started
 */

const BasePublisher = require('./BasePublisher');
const fs = require('fs');
const axios = require('axios');

class TikTokPublisher extends BasePublisher {
  constructor(connection) {
    super(connection);
    this.apiBaseUrl = 'https://open-api.tiktok.com';
  }

  /**
   * Publish content to TikTok
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

      // TikTok requires video content
      if (!contentData.media_urls || contentData.media_urls.length === 0) {
        return {
          success: false,
          error: 'TikTok posts require video content'
        };
      }

      const videoUrl = contentData.media_urls[0];

      // Determine if we need to upload video or can use URL
      let videoInfo;
      
      if (videoUrl.startsWith('/') || videoUrl.startsWith('./')) {
        // Local file - upload it
        videoInfo = await this.uploadVideo(videoUrl, contentData);
      } else {
        // Remote URL - use URL-based upload
        videoInfo = await this.uploadVideoByUrl(videoUrl, contentData);
      }

      if (!videoInfo.success) {
        return videoInfo;
      }

      return {
        success: true,
        externalId: videoInfo.shareId,
        platform: 'tiktok'
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Upload video by file
   */
  async uploadVideo(filePath, contentData) {
    try {
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `Video file not found: ${filePath}`
        };
      }

      const videoBuffer = fs.readFileSync(filePath);
      const videoSize = videoBuffer.length;

      // Step 1: Initialize upload
      const initResult = await this.makeRequest({
        method: 'POST',
        url: `${this.apiBaseUrl}/share/video/upload/`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          post_info: {
            title: contentData.text || '',
            privacy_level: contentData.privacy_level || 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 1000
          },
          source_info: {
            source: 'FILE_UPLOAD',
            video_size: videoSize
          }
        }
      });

      if (!initResult.success) {
        return initResult;
      }

      const publishId = initResult.data.data.publish_id;
      const uploadUrl = initResult.data.data.upload_url;

      // Step 2: Upload video to provided URL
      const uploadResult = await axios.put(uploadUrl, videoBuffer, {
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': videoSize
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });

      if (uploadResult.status !== 200) {
        return {
          success: false,
          error: 'Video upload failed'
        };
      }

      // Step 3: Check upload status
      const statusResult = await this.checkUploadStatus(publishId);

      return statusResult;
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Upload video by URL
   */
  async uploadVideoByUrl(videoUrl, contentData) {
    try {
      const result = await this.makeRequest({
        method: 'POST',
        url: `${this.apiBaseUrl}/share/video/upload/`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          post_info: {
            title: contentData.text || '',
            privacy_level: contentData.privacy_level || 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 1000
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: videoUrl
          }
        }
      });

      if (!result.success) {
        return result;
      }

      const publishId = result.data.data.publish_id;

      // Check upload status
      const statusResult = await this.checkUploadStatus(publishId);

      return statusResult;
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Check upload status
   */
  async checkUploadStatus(publishId, maxAttempts = 30) {
    let attempts = 0;

    while (attempts < maxAttempts) {
      await this.sleep(2000); // Wait 2 seconds

      const statusResult = await this.makeRequest({
        method: 'POST',
        url: `${this.apiBaseUrl}/share/status/`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          publish_id: publishId
        }
      });

      if (!statusResult.success) {
        return statusResult;
      }

      const status = statusResult.data.data.status;
      
      if (status === 'PUBLISH_COMPLETE') {
        return {
          success: true,
          shareId: statusResult.data.data.share_id,
          publishId: publishId
        };
      } else if (status === 'FAILED') {
        return {
          success: false,
          error: statusResult.data.data.fail_reason || 'Upload failed'
        };
      }

      // Status is still PROCESSING_UPLOAD or PROCESSING_DOWNLOAD
      attempts++;
    }

    return {
      success: false,
      error: 'Upload timeout - video is still processing'
    };
  }

  /**
   * Validate content for TikTok
   */
  validateContent(contentData) {
    const errors = [];

    // Video is required
    if (!contentData.media_urls || contentData.media_urls.length === 0) {
      errors.push('TikTok requires video content');
    }

    // Only one video per post
    if (contentData.media_urls && contentData.media_urls.length > 1) {
      errors.push('TikTok allows only one video per post');
    }

    // Check title length (150 characters)
    if (contentData.text && contentData.text.length > 150) {
      errors.push('TikTok title exceeds 150 character limit');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get media requirements for TikTok
   */
  getMediaRequirements() {
    return {
      video: {
        formats: ['mp4', 'mov', 'webm'],
        maxSize: '4GB',
        minDuration: '3 seconds',
        maxDuration: '10 minutes',
        minResolution: '720p',
        maxResolution: '4K',
        aspectRatio: '9:16 (recommended), 1:1, 16:9',
        frameRate: '23-60 fps',
        bitrate: 'Minimum 516 kbps'
      },
      audio: {
        formats: ['AAC', 'MP3'],
        sampleRate: '44.1 kHz or 48 kHz',
        channels: 'Stereo recommended'
      }
    };
  }

  /**
   * Get analytics for TikTok video
   * Note: TikTok analytics require separate API access
   */
  async getAnalytics(externalId) {
    try {
      // TikTok Analytics API requires special permissions
      // This is a placeholder for when analytics access is granted
      
      const result = await this.makeRequest({
        method: 'POST',
        url: `${this.apiBaseUrl}/video/query/`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          filters: {
            video_ids: [externalId]
          }
        }
      });

      if (!result.success) {
        return {
          success: false,
          error: 'Analytics not available. Ensure your app has analytics permissions.'
        };
      }

      const video = result.data.data.videos[0];
      
      return {
        success: true,
        analytics: {
          views: video.view_count || 0,
          likes: video.like_count || 0,
          comments: video.comment_count || 0,
          shares: video.share_count || 0
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'TikTok analytics require special API permissions'
      };
    }
  }

  /**
   * Delete TikTok video
   * Note: Direct deletion via API may not be supported
   */
  async deletePost(externalId) {
    return {
      success: false,
      error: 'TikTok does not currently support video deletion via API. Please delete manually from the app.'
    };
  }
}

module.exports = TikTokPublisher;
