/**
 * Google Ads Publisher
 * 
 * Manages Google Ads campaign creation and management
 * Docs: https://developers.google.com/google-ads/api/docs/start
 */

const BasePublisher = require('./BasePublisher');
const axios = require('axios');

class GoogleAdsPublisher extends BasePublisher {
  constructor(connection) {
    super(connection);
    
    this.apiVersion = 'v16';
    this.baseUrl = `https://googleads.googleapis.com/${this.apiVersion}`;
    this.customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;
    this.developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  }

  /**
   * Validate content before creating ad campaign
   * @param {object} contentData - Campaign configuration
   * @returns {object} - { valid, errors }
   */
  validateContent(contentData) {
    const errors = [];

    // Required fields
    if (!contentData.name || contentData.name.length === 0) {
      errors.push('Campaign name is required');
    }

    if (!contentData.campaignType) {
      errors.push('Campaign type is required (SEARCH, DISPLAY, VIDEO, SHOPPING)');
    }

    if (!contentData.budget && !contentData.budgetCents) {
      errors.push('Budget is required');
    }

    if (!contentData.targeting) {
      errors.push('Targeting configuration is required');
    }

    // Budget validation
    if (contentData.budgetCents && contentData.budgetCents < 100) {
      errors.push('Minimum budget is $1.00 (100 cents)');
    }

    // Campaign type validation
    const validTypes = ['SEARCH', 'DISPLAY', 'VIDEO', 'SHOPPING', 'PERFORMANCE_MAX'];
    if (contentData.campaignType && !validTypes.includes(contentData.campaignType)) {
      errors.push(`Invalid campaign type. Must be one of: ${validTypes.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create Google Ads campaign
   * @param {object} content - Content data from marketing_content table
   * @param {object} contentData - Parsed content.content JSON
   * @returns {Promise<object>} - { success, externalId, error }
   */
  async publish(content, contentData) {
    try {
      // Validate content
      const validation = this.validateContent(contentData);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      // Create campaign
      const campaign = await this.createCampaign(contentData);
      
      if (!campaign.success) {
        return campaign;
      }

      // Create ad groups if specified
      if (contentData.adGroups && contentData.adGroups.length > 0) {
        for (const adGroupData of contentData.adGroups) {
          const adGroup = await this.createAdGroup(campaign.campaignId, adGroupData);
          if (!adGroup.success) {
            console.warn(`Failed to create ad group: ${adGroup.error}`);
          }
        }
      }

      return {
        success: true,
        externalId: campaign.campaignId,
        campaignId: campaign.campaignId
      };
    } catch (error) {
      console.error('Google Ads publish error:', error);
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Create Google Ads campaign
   * @param {object} contentData - Campaign configuration
   * @returns {Promise<object>}
   */
  async createCampaign(contentData) {
    try {
      const budgetAmount = contentData.budgetCents || contentData.budget * 100;
      const dailyBudget = contentData.dailyBudgetCents || Math.floor(budgetAmount / 30);

      // Create campaign budget first
      const budgetResult = await this.createCampaignBudget(
        contentData.name + ' Budget',
        dailyBudget
      );

      if (!budgetResult.success) {
        return budgetResult;
      }

      // Prepare campaign data
      const campaignResource = {
        name: contentData.name,
        status: 'PAUSED', // Start paused for safety
        advertisingChannelType: contentData.campaignType || 'SEARCH',
        campaignBudget: budgetResult.budgetResourceName,
        biddingStrategyType: contentData.bidStrategy || 'MANUAL_CPC',
        targetGoogleSearch: true,
        targetSearchNetwork: true,
        targetContentNetwork: contentData.campaignType === 'DISPLAY',
      };

      // Add targeting if provided
      if (contentData.targeting) {
        if (contentData.targeting.locations) {
          campaignResource.geoTargetTypeSetting = {
            positiveGeoTargetType: 'LOCATION_OF_PRESENCE'
          };
        }
        if (contentData.targeting.languages) {
          campaignResource.languageSettings = contentData.targeting.languages.map(lang => ({
            languageConstant: `languageConstants/${lang}`
          }));
        }
      }

      // Create campaign
      const result = await this.makeRequest({
        method: 'POST',
        url: `${this.baseUrl}/customers/${this.customerId}/campaigns:mutate`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'developer-token': this.developerToken,
          'Content-Type': 'application/json'
        },
        data: {
          operations: [{
            create: campaignResource
          }]
        }
      });

      if (result.success) {
        const campaignId = result.data.results[0].resourceName.split('/').pop();
        return {
          success: true,
          campaignId: campaignId,
          resourceName: result.data.results[0].resourceName
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to create campaign'
      };
    } catch (error) {
      console.error('Create campaign error:', error);
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Create campaign budget
   * @param {string} name - Budget name
   * @param {number} amountMicros - Daily budget in micros (cents * 10000)
   * @returns {Promise<object>}
   */
  async createCampaignBudget(name, amountCents) {
    try {
      const amountMicros = amountCents * 10000; // Convert cents to micros

      const result = await this.makeRequest({
        method: 'POST',
        url: `${this.baseUrl}/customers/${this.customerId}/campaignBudgets:mutate`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'developer-token': this.developerToken,
          'Content-Type': 'application/json'
        },
        data: {
          operations: [{
            create: {
              name: name,
              amountMicros: amountMicros,
              deliveryMethod: 'STANDARD'
            }
          }]
        }
      });

      if (result.success) {
        return {
          success: true,
          budgetResourceName: result.data.results[0].resourceName
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to create budget'
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Create ad group within campaign
   * @param {string} campaignId - Campaign ID
   * @param {object} adGroupData - Ad group configuration
   * @returns {Promise<object>}
   */
  async createAdGroup(campaignId, adGroupData) {
    try {
      const result = await this.makeRequest({
        method: 'POST',
        url: `${this.baseUrl}/customers/${this.customerId}/adGroups:mutate`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'developer-token': this.developerToken,
          'Content-Type': 'application/json'
        },
        data: {
          operations: [{
            create: {
              name: adGroupData.name,
              campaign: `customers/${this.customerId}/campaigns/${campaignId}`,
              status: 'PAUSED',
              type: 'SEARCH_STANDARD',
              cpcBidMicros: (adGroupData.bidCents || 100) * 10000 // Default $1.00
            }
          }]
        }
      });

      if (result.success) {
        const adGroupId = result.data.results[0].resourceName.split('/').pop();
        
        // Create ads if provided
        if (adGroupData.ads && adGroupData.ads.length > 0) {
          for (const adData of adGroupData.ads) {
            await this.createAd(adGroupId, adData);
          }
        }

        return {
          success: true,
          adGroupId: adGroupId
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to create ad group'
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Create ad within ad group
   * @param {string} adGroupId - Ad group ID
   * @param {object} adData - Ad configuration
   * @returns {Promise<object>}
   */
  async createAd(adGroupId, adData) {
    try {
      const result = await this.makeRequest({
        method: 'POST',
        url: `${this.baseUrl}/customers/${this.customerId}/adGroupAds:mutate`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'developer-token': this.developerToken,
          'Content-Type': 'application/json'
        },
        data: {
          operations: [{
            create: {
              adGroup: `customers/${this.customerId}/adGroups/${adGroupId}`,
              status: 'PAUSED',
              ad: {
                expandedTextAd: {
                  headlinePart1: adData.headline1,
                  headlinePart2: adData.headline2,
                  headlinePart3: adData.headline3 || '',
                  description: adData.description1,
                  description2: adData.description2 || '',
                  path1: adData.path1 || '',
                  path2: adData.path2 || ''
                },
                finalUrls: [adData.finalUrl]
              }
            }
          }]
        }
      });

      if (result.success) {
        return {
          success: true,
          adId: result.data.results[0].resourceName.split('/').pop()
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to create ad'
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Get campaign performance metrics
   * @param {string} externalId - Campaign ID
   * @returns {Promise<object>}
   */
  async getAnalytics(externalId) {
    try {
      const query = `
        SELECT 
          campaign.id,
          campaign.name,
          metrics.impressions,
          metrics.clicks,
          metrics.cost_micros,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc
        FROM campaign
        WHERE campaign.id = ${externalId}
      `;

      const result = await this.makeRequest({
        method: 'POST',
        url: `${this.baseUrl}/customers/${this.customerId}/googleAds:search`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'developer-token': this.developerToken,
          'Content-Type': 'application/json'
        },
        data: {
          query: query
        }
      });

      if (result.success && result.data.results && result.data.results.length > 0) {
        const metrics = result.data.results[0].metrics;
        
        return {
          success: true,
          data: {
            impressions: parseInt(metrics.impressions) || 0,
            clicks: parseInt(metrics.clicks) || 0,
            spend_cents: Math.round(parseInt(metrics.costMicros) / 10000), // micros to cents
            conversions: parseInt(metrics.conversions) || 0,
            ctr: parseFloat(metrics.ctr) || 0,
            average_cpc_cents: Math.round(parseInt(metrics.averageCpc) / 10000)
          }
        };
      }

      return {
        success: false,
        error: 'No analytics data available'
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Update campaign status
   * @param {string} campaignId - Campaign ID
   * @param {string} status - New status (ENABLED, PAUSED, REMOVED)
   * @returns {Promise<object>}
   */
  async updateCampaignStatus(campaignId, status) {
    try {
      const result = await this.makeRequest({
        method: 'POST',
        url: `${this.baseUrl}/customers/${this.customerId}/campaigns:mutate`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'developer-token': this.developerToken,
          'Content-Type': 'application/json'
        },
        data: {
          operations: [{
            update: {
              resourceName: `customers/${this.customerId}/campaigns/${campaignId}`,
              status: status
            },
            updateMask: 'status'
          }]
        }
      });

      return {
        success: result.success,
        error: result.error
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Get media requirements for Google Ads
   * @returns {object}
   */
  getMediaRequirements() {
    return {
      images: {
        formats: ['jpg', 'png', 'gif'],
        maxSize: '5MB',
        aspectRatios: {
          landscapeImage: '1.91:1',
          squareImage: '1:1',
          logoSquare: '1:1',
          logoLandscape: '4:1'
        },
        dimensions: {
          landscapeImage: '1200x628',
          squareImage: '1200x1200',
          logoSquare: '1200x1200',
          logoLandscape: '1200x300'
        }
      },
      video: {
        formats: ['mp4', 'mov', 'avi'],
        maxSize: '1GB',
        maxDuration: '15 minutes',
        aspectRatios: ['16:9', '9:16', '1:1', '4:5']
      },
      text: {
        headlines: {
          max: 15,
          maxLength: 30
        },
        descriptions: {
          max: 4,
          maxLength: 90
        }
      },
      notes: [
        'Responsive Search Ads can have up to 15 headlines and 4 descriptions',
        'Display ads require at least one landscape image (1200x628)',
        'Video ads require YouTube video URL',
        'All ads must comply with Google Ads policies'
      ]
    };
  }
}

module.exports = GoogleAdsPublisher;
