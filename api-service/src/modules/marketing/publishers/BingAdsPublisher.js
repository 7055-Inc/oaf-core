/**
 * Bing/Microsoft Ads Publisher
 * 
 * Manages Microsoft Advertising (Bing Ads) campaign creation and management
 * Docs: https://docs.microsoft.com/en-us/advertising/guides/
 */

const BasePublisher = require('./BasePublisher');
const axios = require('axios');

class BingAdsPublisher extends BasePublisher {
  constructor(connection) {
    super(connection);
    
    this.apiVersion = 'v13';
    this.baseUrl = 'https://campaign.api.bingads.microsoft.com/Api/Advertiser/CampaignManagement';
    this.customerId = process.env.BING_ADS_CUSTOMER_ID;
    this.developerToken = process.env.BING_ADS_DEVELOPER_TOKEN;
    this.accountId = connection.account_id;
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
      errors.push('Campaign type is required (Search, Shopping, Audience, DynamicSearchAds)');
    }

    if (!contentData.budget && !contentData.budgetCents) {
      errors.push('Budget is required');
    }

    if (!contentData.targeting) {
      errors.push('Targeting configuration is required');
    }

    // Budget validation
    if (contentData.budgetCents && contentData.budgetCents < 500) {
      errors.push('Minimum daily budget is $5.00 (500 cents)');
    }

    // Campaign type validation
    const validTypes = ['Search', 'Shopping', 'Audience', 'DynamicSearchAds'];
    if (contentData.campaignType && !validTypes.includes(contentData.campaignType)) {
      errors.push(`Invalid campaign type. Must be one of: ${validTypes.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create Bing Ads campaign
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
      console.error('Bing Ads publish error:', error);
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Create Bing Ads campaign
   * @param {object} contentData - Campaign configuration
   * @returns {Promise<object>}
   */
  async createCampaign(contentData) {
    try {
      const budgetAmount = contentData.dailyBudgetCents || contentData.budgetCents || contentData.budget * 100;

      // Prepare campaign SOAP request
      const soapEnvelope = this.buildSoapEnvelope('AddCampaigns', {
        AccountId: this.accountId,
        Campaigns: {
          Campaign: {
            '@i:type': 'Campaign',
            BudgetType: 'DailyBudgetStandard',
            DailyBudget: (budgetAmount / 100).toFixed(2), // Convert cents to dollars
            Name: contentData.name,
            TimeZone: 'EasternTimeUSCanada',
            Status: 'Paused', // Start paused for safety
            CampaignType: contentData.campaignType || 'Search',
            Languages: {
              'string': ['English']
            },
            BiddingScheme: {
              '@i:type': contentData.bidStrategy === 'MANUAL_CPC' ? 'ManualCpcBiddingScheme' : 'EnhancedCpcBiddingScheme'
            }
          }
        }
      });

      const result = await this.makeSoapRequest('AddCampaigns', soapEnvelope);

      if (result.success) {
        const campaignId = result.data.CampaignIds?.long;
        
        // Apply targeting if provided
        if (contentData.targeting && campaignId) {
          await this.applyTargeting(campaignId, contentData.targeting);
        }

        return {
          success: true,
          campaignId: campaignId
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
   * Apply targeting to campaign
   * @param {string} campaignId - Campaign ID
   * @param {object} targeting - Targeting configuration
   * @returns {Promise<object>}
   */
  async applyTargeting(campaignId, targeting) {
    try {
      const criterions = [];

      // Location targeting
      if (targeting.locations && targeting.locations.length > 0) {
        targeting.locations.forEach(locationId => {
          criterions.push({
            '@i:type': 'LocationCriterion',
            LocationId: locationId,
            BidAdjustment: 0
          });
        });
      }

      // Age targeting
      if (targeting.ages && targeting.ages.length > 0) {
        targeting.ages.forEach(age => {
          criterions.push({
            '@i:type': 'AgeCriterion',
            AgeRange: age
          });
        });
      }

      // Gender targeting
      if (targeting.genders && targeting.genders.length > 0) {
        targeting.genders.forEach(gender => {
          criterions.push({
            '@i:type': 'GenderCriterion',
            GenderType: gender
          });
        });
      }

      if (criterions.length > 0) {
        const soapEnvelope = this.buildSoapEnvelope('AddCampaignCriterions', {
          CampaignCriterions: {
            CampaignCriterion: criterions.map(criterion => ({
              CampaignId: campaignId,
              Criterion: criterion
            }))
          },
          CriterionType: 'Targets'
        });

        return await this.makeSoapRequest('AddCampaignCriterions', soapEnvelope);
      }

      return { success: true };
    } catch (error) {
      console.error('Apply targeting error:', error);
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
      const soapEnvelope = this.buildSoapEnvelope('AddAdGroups', {
        CampaignId: campaignId,
        AdGroups: {
          AdGroup: {
            Name: adGroupData.name,
            Status: 'Paused',
            Network: 'OwnedAndOperatedAndSyndicatedSearch',
            PricingModel: 'Cpc',
            SearchBid: {
              Amount: ((adGroupData.bidCents || 100) / 100).toFixed(2) // Convert cents to dollars
            }
          }
        }
      });

      const result = await this.makeSoapRequest('AddAdGroups', soapEnvelope);

      if (result.success) {
        const adGroupId = result.data.AdGroupIds?.long;
        
        // Create ads if provided
        if (adGroupData.ads && adGroupData.ads.length > 0 && adGroupId) {
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
      const soapEnvelope = this.buildSoapEnvelope('AddAds', {
        AdGroupId: adGroupId,
        Ads: {
          Ad: {
            '@i:type': 'ExpandedTextAd',
            Status: 'Paused',
            TitlePart1: adData.headline1,
            TitlePart2: adData.headline2,
            TitlePart3: adData.headline3 || '',
            Text: adData.description1,
            TextPart2: adData.description2 || '',
            Path1: adData.path1 || '',
            Path2: adData.path2 || '',
            FinalUrls: {
              'string': [adData.finalUrl]
            }
          }
        }
      });

      const result = await this.makeSoapRequest('AddAds', soapEnvelope);

      if (result.success) {
        return {
          success: true,
          adId: result.data.AdIds?.long
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
      const soapEnvelope = this.buildSoapEnvelope('SubmitGenerateReport', {
        ReportRequest: {
          '@i:type': 'CampaignPerformanceReportRequest',
          Format: 'Csv',
          ReportName: 'Campaign Performance Report',
          ReturnOnlyCompleteData: false,
          Aggregation: 'Summary',
          Columns: {
            CampaignPerformanceReportColumn: [
              'Impressions',
              'Clicks',
              'Spend',
              'Conversions',
              'Ctr',
              'AverageCpc'
            ]
          },
          Filter: {
            CampaignIds: {
              'long': [externalId]
            }
          },
          Time: {
            PredefinedTime: 'Last30Days'
          }
        }
      });

      const result = await this.makeSoapRequest('SubmitGenerateReport', soapEnvelope);

      if (result.success && result.data.ReportRequestId) {
        // Poll for report completion
        const reportData = await this.pollReportStatus(result.data.ReportRequestId);
        
        if (reportData.success) {
          return {
            success: true,
            data: reportData.metrics
          };
        }
      }

      return {
        success: false,
        error: 'Failed to retrieve analytics'
      };
    } catch (error) {
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Poll report status until complete
   * @param {string} reportRequestId - Report request ID
   * @returns {Promise<object>}
   */
  async pollReportStatus(reportRequestId, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      await this.sleep(5000); // Wait 5 seconds between polls

      const soapEnvelope = this.buildSoapEnvelope('PollGenerateReport', {
        ReportRequestId: reportRequestId
      });

      const result = await this.makeSoapRequest('PollGenerateReport', soapEnvelope);

      if (result.success && result.data.ReportRequestStatus?.Status === 'Success') {
        // Download and parse report
        const reportUrl = result.data.ReportRequestStatus.ReportDownloadUrl;
        const metrics = await this.downloadAndParseReport(reportUrl);
        return { success: true, metrics };
      }

      if (result.data.ReportRequestStatus?.Status === 'Error') {
        return {
          success: false,
          error: 'Report generation failed'
        };
      }
    }

    return {
      success: false,
      error: 'Report generation timeout'
    };
  }

  /**
   * Download and parse report CSV
   * @param {string} reportUrl - Report download URL
   * @returns {Promise<object>}
   */
  async downloadAndParseReport(reportUrl) {
    try {
      const response = await axios.get(reportUrl);
      const csv = response.data;
      
      // Parse CSV (simple parser for demo - production should use proper CSV library)
      const lines = csv.split('\n');
      const dataLine = lines.find(line => !line.startsWith('Report'));
      
      if (!dataLine) {
        return {
          impressions: 0,
          clicks: 0,
          spend_cents: 0,
          conversions: 0
        };
      }

      const values = dataLine.split(',');
      
      return {
        impressions: parseInt(values[0]) || 0,
        clicks: parseInt(values[1]) || 0,
        spend_cents: Math.round(parseFloat(values[2]) * 100) || 0, // Convert dollars to cents
        conversions: parseInt(values[3]) || 0,
        ctr: parseFloat(values[4]) || 0,
        average_cpc_cents: Math.round(parseFloat(values[5]) * 100) || 0
      };
    } catch (error) {
      console.error('Report download error:', error);
      return {
        impressions: 0,
        clicks: 0,
        spend_cents: 0,
        conversions: 0
      };
    }
  }

  /**
   * Update campaign status
   * @param {string} campaignId - Campaign ID
   * @param {string} status - New status (Active, Paused)
   * @returns {Promise<object>}
   */
  async updateCampaignStatus(campaignId, status) {
    try {
      const soapEnvelope = this.buildSoapEnvelope('UpdateCampaigns', {
        AccountId: this.accountId,
        Campaigns: {
          Campaign: {
            Id: campaignId,
            Status: status
          }
        }
      });

      const result = await this.makeSoapRequest('UpdateCampaigns', soapEnvelope);

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
   * Build SOAP envelope for Bing Ads API
   * @param {string} action - SOAP action
   * @param {object} body - Request body
   * @returns {string}
   */
  buildSoapEnvelope(action, body) {
    const bodyXml = this.objectToXml(body);
    
    return `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" xmlns:i="http://www.w3.org/2001/XMLSchema-instance">
  <s:Header>
    <h:AuthenticationToken xmlns:h="https://bingads.microsoft.com/CampaignManagement/v13">${this.accessToken}</h:AuthenticationToken>
    <h:DeveloperToken xmlns:h="https://bingads.microsoft.com/CampaignManagement/v13">${this.developerToken}</h:DeveloperToken>
    <h:CustomerId xmlns:h="https://bingads.microsoft.com/CampaignManagement/v13">${this.customerId}</h:CustomerId>
  </s:Header>
  <s:Body>
    <${action}Request xmlns="https://bingads.microsoft.com/CampaignManagement/v13">
      ${bodyXml}
    </${action}Request>
  </s:Body>
</s:Envelope>`;
  }

  /**
   * Convert object to XML
   * @param {object} obj - Object to convert
   * @returns {string}
   */
  objectToXml(obj, indent = '      ') {
    let xml = '';
    
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) continue;
      
      if (typeof value === 'object' && !Array.isArray(value)) {
        xml += `${indent}<${key}>\n${this.objectToXml(value, indent + '  ')}${indent}</${key}>\n`;
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'object') {
            xml += `${indent}<${key}>\n${this.objectToXml(item, indent + '  ')}${indent}</${key}>\n`;
          } else {
            xml += `${indent}<${key}>${item}</${key}>\n`;
          }
        });
      } else {
        xml += `${indent}<${key}>${value}</${key}>\n`;
      }
    }
    
    return xml;
  }

  /**
   * Make SOAP request to Bing Ads API
   * @param {string} action - SOAP action
   * @param {string} envelope - SOAP envelope
   * @returns {Promise<object>}
   */
  async makeSoapRequest(action, envelope) {
    try {
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/${this.apiVersion}`,
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': `https://bingads.microsoft.com/CampaignManagement/${this.apiVersion}/${action}`
        },
        data: envelope
      });

      // Parse XML response (simplified - production should use proper XML parser)
      const data = this.parseSimpleXmlResponse(response.data);

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('SOAP request error:', error);
      return {
        success: false,
        error: this.formatError(error)
      };
    }
  }

  /**
   * Parse simple XML response
   * @param {string} xml - XML string
   * @returns {object}
   */
  parseSimpleXmlResponse(xml) {
    // Very simple XML parser for demo - production should use proper library like xml2js
    const result = {};
    
    // Extract campaign/ad group/ad IDs
    const idMatch = xml.match(/<(CampaignIds|AdGroupIds|AdIds)>.*?<long>(\d+)<\/long>/s);
    if (idMatch) {
      result[idMatch[1]] = { long: idMatch[2] };
    }

    // Extract report request ID
    const reportMatch = xml.match(/<ReportRequestId>(.*?)<\/ReportRequestId>/);
    if (reportMatch) {
      result.ReportRequestId = reportMatch[1];
    }

    // Extract report status
    const statusMatch = xml.match(/<Status>(.*?)<\/Status>/);
    if (statusMatch) {
      result.ReportRequestStatus = { Status: statusMatch[1] };
    }

    // Extract download URL
    const urlMatch = xml.match(/<ReportDownloadUrl>(.*?)<\/ReportDownloadUrl>/);
    if (urlMatch) {
      result.ReportRequestStatus = result.ReportRequestStatus || {};
      result.ReportRequestStatus.ReportDownloadUrl = urlMatch[1];
    }

    return result;
  }

  /**
   * Get media requirements for Bing Ads
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
          imageIcon: '1:1'
        },
        dimensions: {
          landscapeImage: '1200x628',
          squareImage: '1200x1200',
          imageIcon: '40x40'
        }
      },
      text: {
        titlePart1: {
          maxLength: 30,
          required: true
        },
        titlePart2: {
          maxLength: 30,
          required: true
        },
        titlePart3: {
          maxLength: 30,
          required: false
        },
        text: {
          maxLength: 90,
          required: true
        },
        textPart2: {
          maxLength: 90,
          required: false
        }
      },
      notes: [
        'Expanded Text Ads support up to 3 title parts and 2 description parts',
        'Responsive Search Ads support up to 15 headlines and 4 descriptions',
        'All ads must comply with Microsoft Advertising policies',
        'Minimum daily budget is $5.00'
      ]
    };
  }
}

module.exports = BingAdsPublisher;
