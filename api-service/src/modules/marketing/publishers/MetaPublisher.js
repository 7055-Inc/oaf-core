/**
 * Meta Publisher
 * 
 * Handles publishing to Facebook and Instagram via Meta Graph API
 * Documentation: https://developers.facebook.com/docs/graph-api
 */

const BasePublisher = require('./BasePublisher');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class MetaPublisher extends BasePublisher {
  constructor(connection) {
    super(connection);
    this.apiVersion = 'v18.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /**
   * Publish content to Facebook or Instagram
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

      // Check if posting to Facebook or Instagram
      if (content.channel === 'facebook') {
        return await this.publishToFacebook(contentData);
      } else if (content.channel === 'instagram') {
        return await this.publishToInstagram(contentData);
      } else {
        return {
          success: false,
          error: `Unsupported channel: ${content.channel}`
        };
      }
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Publish to Facebook Page
   */
  async publishToFacebook(contentData) {
    try {
      // Get Facebook pages managed by this account
      const pagesResult = await this.makeRequest({
        method: 'GET',
        url: `${this.baseUrl}/me/accounts`,
        params: {
          access_token: this.accessToken
        }
      });

      if (!pagesResult.success || !pagesResult.data.data?.length) {
        return {
          success: false,
          error: 'No Facebook pages found for this account'
        };
      }

      // Use first page (in production, should let user select)
      const page = pagesResult.data.data[0];
      const pageAccessToken = page.access_token;
      const pageId = page.id;

      // Prepare post data
      const postData = {
        message: contentData.text || '',
        access_token: pageAccessToken
      };

      // Handle media
      if (contentData.media_urls && contentData.media_urls.length > 0) {
        if (contentData.media_urls.length === 1) {
          // Single media post
          const mediaUrl = contentData.media_urls[0];
          
          if (this.isVideo(mediaUrl)) {
            postData.file_url = mediaUrl;
            // Post video
            const result = await this.makeRequest({
              method: 'POST',
              url: `${this.baseUrl}/${pageId}/videos`,
              data: postData
            });

            if (!result.success) {
              return result;
            }

            return {
              success: true,
              externalId: result.data.id,
              platform: 'facebook'
            };
          } else {
            postData.url = mediaUrl;
            // Post photo
            const result = await this.makeRequest({
              method: 'POST',
              url: `${this.baseUrl}/${pageId}/photos`,
              data: postData
            });

            if (!result.success) {
              return result;
            }

            return {
              success: true,
              externalId: result.data.id,
              platform: 'facebook'
            };
          }
        } else {
          // Multiple photos - create album post
          return await this.publishFacebookAlbum(pageId, pageAccessToken, contentData);
        }
      } else {
        // Text-only post
        const result = await this.makeRequest({
          method: 'POST',
          url: `${this.baseUrl}/${pageId}/feed`,
          data: postData
        });

        if (!result.success) {
          return result;
        }

        return {
          success: true,
          externalId: result.data.id,
          platform: 'facebook'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Publish multiple photos as album to Facebook
   */
  async publishFacebookAlbum(pageId, pageAccessToken, contentData) {
    try {
      // Upload photos first
      const photoIds = [];
      
      for (const mediaUrl of contentData.media_urls) {
        if (!this.isVideo(mediaUrl)) {
          const uploadResult = await this.makeRequest({
            method: 'POST',
            url: `${this.baseUrl}/${pageId}/photos`,
            data: {
              url: mediaUrl,
              published: false,
              access_token: pageAccessToken
            }
          });

          if (uploadResult.success) {
            photoIds.push({ media_fbid: uploadResult.data.id });
          }
        }
      }

      if (photoIds.length === 0) {
        return {
          success: false,
          error: 'No photos could be uploaded'
        };
      }

      // Create album post with photos
      const result = await this.makeRequest({
        method: 'POST',
        url: `${this.baseUrl}/${pageId}/feed`,
        data: {
          message: contentData.text || '',
          attached_media: JSON.stringify(photoIds),
          access_token: pageAccessToken
        }
      });

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        externalId: result.data.id,
        platform: 'facebook'
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Publish to Instagram Business Account
   */
  async publishToInstagram(contentData) {
    try {
      // Get Instagram Business account ID
      const igAccountResult = await this.makeRequest({
        method: 'GET',
        url: `${this.baseUrl}/me/accounts`,
        params: {
          fields: 'instagram_business_account',
          access_token: this.accessToken
        }
      });

      if (!igAccountResult.success) {
        return igAccountResult;
      }

      const pages = igAccountResult.data.data || [];
      let igAccountId = null;

      for (const page of pages) {
        if (page.instagram_business_account) {
          igAccountId = page.instagram_business_account.id;
          break;
        }
      }

      if (!igAccountId) {
        return {
          success: false,
          error: 'No Instagram Business account found. Please connect an Instagram Business account to your Facebook Page.'
        };
      }

      // Determine post type
      const hasMedia = contentData.media_urls && contentData.media_urls.length > 0;
      const hasVideo = hasMedia && this.isVideo(contentData.media_urls[0]);

      if (!hasMedia) {
        return {
          success: false,
          error: 'Instagram posts require at least one image or video'
        };
      }

      // Create container
      const containerData = {
        access_token: this.accessToken,
        caption: this.formatInstagramCaption(contentData)
      };

      if (hasVideo) {
        containerData.media_type = 'VIDEO';
        containerData.video_url = contentData.media_urls[0];
      } else if (contentData.media_urls.length > 1) {
        // Carousel post
        containerData.media_type = 'CAROUSEL';
        
        // Create containers for each image
        const childContainers = [];
        for (const mediaUrl of contentData.media_urls) {
          const childResult = await this.makeRequest({
            method: 'POST',
            url: `${this.baseUrl}/${igAccountId}/media`,
            data: {
              image_url: mediaUrl,
              is_carousel_item: true,
              access_token: this.accessToken
            }
          });

          if (childResult.success) {
            childContainers.push(childResult.data.id);
          }
        }

        containerData.children = childContainers.join(',');
      } else {
        // Single image
        containerData.image_url = contentData.media_urls[0];
      }

      // Create media container
      const containerResult = await this.makeRequest({
        method: 'POST',
        url: `${this.baseUrl}/${igAccountId}/media`,
        data: containerData
      });

      if (!containerResult.success) {
        return containerResult;
      }

      const creationId = containerResult.data.id;

      // Wait for container to be ready (for videos)
      if (hasVideo) {
        await this.sleep(5000); // Wait 5 seconds for video processing
      }

      // Publish the container
      const publishResult = await this.makeRequest({
        method: 'POST',
        url: `${this.baseUrl}/${igAccountId}/media_publish`,
        data: {
          creation_id: creationId,
          access_token: this.accessToken
        }
      });

      if (!publishResult.success) {
        return publishResult;
      }

      return {
        success: true,
        externalId: publishResult.data.id,
        platform: 'instagram'
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Format caption for Instagram (includes hashtags)
   */
  formatInstagramCaption(contentData) {
    let caption = contentData.text || '';
    
    if (contentData.hashtags && contentData.hashtags.length > 0) {
      const hashtagStr = contentData.hashtags
        .map(tag => tag.startsWith('#') ? tag : `#${tag}`)
        .join(' ');
      caption = `${caption}\n\n${hashtagStr}`;
    }

    return caption;
  }

  /**
   * Check if URL is a video
   */
  isVideo(url) {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  }

  /**
   * Validate content for Meta platforms
   */
  validateContent(contentData) {
    const errors = [];

    // Facebook allows text-only posts, Instagram requires media
    if (!contentData.text && (!contentData.media_urls || contentData.media_urls.length === 0)) {
      errors.push('Content must have text or media');
    }

    // Check text length
    if (contentData.text && contentData.text.length > 63206) {
      errors.push('Text exceeds maximum length (63,206 characters for Facebook)');
    }

    // Check media count
    if (contentData.media_urls && contentData.media_urls.length > 10) {
      errors.push('Maximum 10 media items allowed');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get media requirements for Meta platforms
   */
  getMediaRequirements() {
    return {
      facebook: {
        image: {
          formats: ['jpg', 'png', 'gif', 'webp'],
          maxSize: '10MB',
          minWidth: 200,
          maxWidth: 8192,
          aspectRatio: 'Any'
        },
        video: {
          formats: ['mp4', 'mov'],
          maxSize: '10GB',
          maxLength: '240 minutes',
          minWidth: 120,
          maxWidth: 1920
        }
      },
      instagram: {
        image: {
          formats: ['jpg', 'png'],
          maxSize: '8MB',
          minWidth: 320,
          maxWidth: 1440,
          aspectRatio: '4:5 to 1.91:1'
        },
        video: {
          formats: ['mp4', 'mov'],
          maxSize: '100MB',
          maxLength: '60 seconds (feed), 15 seconds (stories)',
          minWidth: 320,
          aspectRatio: '4:5 to 16:9'
        }
      }
    };
  }

  /**
   * Get analytics for Meta post
   */
  async getAnalytics(externalId) {
    try {
      const result = await this.makeRequest({
        method: 'GET',
        url: `${this.baseUrl}/${externalId}/insights`,
        params: {
          metric: 'post_impressions,post_engaged_users,post_clicks',
          access_token: this.accessToken
        }
      });

      if (!result.success) {
        return result;
      }

      const insights = result.data.data || [];
      const analytics = {};

      insights.forEach(insight => {
        if (insight.name === 'post_impressions') {
          analytics.impressions = insight.values[0]?.value || 0;
        } else if (insight.name === 'post_engaged_users') {
          analytics.engagements = insight.values[0]?.value || 0;
        } else if (insight.name === 'post_clicks') {
          analytics.clicks = insight.values[0]?.value || 0;
        }
      });

      return {
        success: true,
        analytics
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Delete post from Meta platform
   */
  async deletePost(externalId) {
    try {
      const result = await this.makeRequest({
        method: 'DELETE',
        url: `${this.baseUrl}/${externalId}`,
        params: {
          access_token: this.accessToken
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

module.exports = MetaPublisher;
