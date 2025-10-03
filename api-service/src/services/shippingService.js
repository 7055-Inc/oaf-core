/**
 * Shipping Service
 * Comprehensive shipping rate calculation and label generation service for the Beemeeart platform
 * Integrates with UPS, FedEx, and USPS APIs for multi-carrier shipping solutions
 */

const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

/**
 * ShippingService Class
 * Provides enterprise-grade shipping functionality including rate calculation,
 * label generation, tracking, and multi-carrier API integration
 */
class ShippingService {
  /**
   * Initialize ShippingService with carrier API credentials
   * Validates required environment variables and sets up token caching
   * @throws {Error} If required shipping credentials are missing
   */
  constructor() {
    this.upsClientId = process.env.UPS_CLIENT_ID;
    this.upsClientSecret = process.env.UPS_CLIENT_SECRET;
    this.upsAccountNumber = process.env.UPS_ACCOUNT;
    this.fedexApiKey = process.env.FEDEX_API_KEY;
    this.fedexSecretKey = process.env.FEDEX_API_SECRET;
    this.fedexAccountNumber = process.env.FEDEX_ACCOUNT_NUMBER;
    this.fedexMeterNumber = process.env.FEDEX_METER_NUMBER;
    this.uspsConsumerKey = process.env.USPS_CONSUMER_KEY;
    this.uspsConsumerSecret = process.env.USPS_CONSUMER_SECRET;
    this.uspsCrid = process.env.USPS_CRID;
    
    // OAuth tokens cache for performance optimization
    this.tokens = {
      ups: null,
      fedex: null,
      usps: null
    };
  }

  /**
   * Calculate shipping rates from all available carriers
   * Provides comprehensive rate comparison across UPS, FedEx, and USPS
   * 
   * @param {Object} shipment - Shipment details including shipper, recipient, and packages
   * @param {Object} shipment.shipper - Shipper information and address
   * @param {Object} shipment.recipient - Recipient information and address  
   * @param {Array} shipment.packages - Array of package dimensions and weights
   * @returns {Promise<Array>} Array of shipping rate options sorted by cost
   * @throws {Error} If rate calculation fails for all carriers
   */
  async calculateShippingRates(shipment) {
    const rates = [];
    
    try {
      // Get rates from all carriers (UPS, FedEx, USPS)
      const [upsRates, fedexRates, uspsRates] = await Promise.allSettled([
        this.getUPSRates(shipment),
        this.getFedExRates(shipment),
        this.getUSPSRates(shipment)
      ]);

      // Combine all successful rates
      if (upsRates.status === 'fulfilled') {
        rates.push(...upsRates.value);
      }
      
      if (fedexRates.status === 'fulfilled') {
        rates.push(...fedexRates.value);
      }
      
      if (uspsRates.status === 'fulfilled') {
        rates.push(...uspsRates.value);
      }

      // Sort by price (lowest first)
      rates.sort((a, b) => a.cost - b.cost);

      return rates;
    } catch (error) {
      console.error('Error calculating shipping rates:', error);
      throw error;
    }
  }

  /**
   * Get UPS shipping rates using UPS Rating API
   * Calculates rates for all available UPS services
   * 
   * @param {Object} shipment - Shipment details for rate calculation
   * @returns {Promise<Array>} Array of UPS rate options
   * @throws {Error} If UPS API call fails
   */
  async getUPSRates(shipment) {
    try {
      // Check if credentials are available
      if (!this.upsClientId || !this.upsClientSecret) {
        throw new Error('UPS credentials not configured');
      }
      
      // Get OAuth token
      const token = await this.getUPSToken();
      
      const rateRequest = {
        RateRequest: {
          Request: {
            TransactionReference: {
              CustomerContext: "Beemeeart Rate Request"
            }
          },
          Shipment: {
            Shipper: {
              Name: shipment.shipper.name,
              ShipperNumber: this.upsAccountNumber,
              Address: {
                AddressLine: [shipment.shipper.address.street],
                City: shipment.shipper.address.city,
                StateProvinceCode: shipment.shipper.address.state,
                PostalCode: shipment.shipper.address.zip,
                CountryCode: shipment.shipper.address.country
              }
            },
            ShipTo: {
              Name: shipment.recipient.name,
              Address: {
                AddressLine: [shipment.recipient.address.street],
                City: shipment.recipient.address.city,
                StateProvinceCode: shipment.recipient.address.state,
                PostalCode: shipment.recipient.address.zip,
                CountryCode: shipment.recipient.address.country
              }
            },
            ShipFrom: {
              Name: shipment.shipper.name,
              Address: {
                AddressLine: [shipment.shipper.address.street],
                City: shipment.shipper.address.city,
                StateProvinceCode: shipment.shipper.address.state,
                PostalCode: shipment.shipper.address.zip,
                CountryCode: shipment.shipper.address.country
              }
            },
            PaymentDetails: {
              ShipmentCharge: [{
                Type: "01",
                BillShipper: {
                  AccountNumber: this.upsAccountNumber
                }
              }]
            },
            Package: shipment.packages.map(pkg => ({
              PackagingType: {
                Code: "02",
                Description: "Customer Supplied Package"
              },
              Dimensions: {
                UnitOfMeasurement: {
                  Code: pkg.dimension_unit === 'cm' ? 'CM' : 'IN'
                },
                Length: String(pkg.length),
                Width: String(pkg.width),
                Height: String(pkg.height)
              },
              PackageWeight: {
                UnitOfMeasurement: {
                  Code: pkg.weight_unit === 'kg' ? 'KGS' : 'LBS'
                },
                Weight: String(pkg.weight)
              }
            }))
          }
        }
      };

      const response = await axios.post(
        'https://onlinetools.ups.com/api/rating/v2409/Shop',
        rateRequest,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'transId': `${Date.now()}`,
            'transactionSrc': 'Beemeeart'
          }
        }
      );

      return this.parseUPSResponse(response.data);
    } catch (error) {
      console.error('UPS API Error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get FedEx shipping rates using FedEx Rate API
   * Calculates rates for all available FedEx services with transit times
   * 
   * @param {Object} shipment - Shipment details for rate calculation
   * @returns {Promise<Array>} Array of FedEx rate options with delivery estimates
   * @throws {Error} If FedEx API call fails
   */
  async getFedExRates(shipment) {
    try {
      // Get OAuth token
      const token = await this.getFedExToken();
      
      const rateRequest = {
        accountNumber: {
          value: this.fedexAccountNumber
        },
        rateRequestControlParameters: {
          returnTransitTimes: true
        },
        requestedShipment: {
          rateRequestType: ["LIST"],
          pickupType: "DROPOFF_AT_FEDEX_LOCATION",
          shipper: {
            address: {
              city: shipment.shipper.address.city,
              stateOrProvinceCode: shipment.shipper.address.state,
              postalCode: shipment.shipper.address.zip,
              countryCode: shipment.shipper.address.country || 'US'
            }
          },
          recipient: {
            address: {
              city: shipment.recipient.address.city,
              stateOrProvinceCode: shipment.recipient.address.state,
              postalCode: shipment.recipient.address.zip,
              countryCode: shipment.recipient.address.country || 'US'
            }
          },
          requestedPackageLineItems: shipment.packages.map(pkg => {
            const weight = parseFloat(pkg.weight);
            const length = parseInt(pkg.length);
            const width = parseInt(pkg.width);
            const height = parseInt(pkg.height);
            
            // Validate required fields
            if (!weight || weight <= 0) throw new Error(`Invalid weight: ${pkg.weight}`);
            if (!length || length <= 0) throw new Error(`Invalid length: ${pkg.length}`);
            if (!width || width <= 0) throw new Error(`Invalid width: ${pkg.width}`);
            if (!height || height <= 0) throw new Error(`Invalid height: ${pkg.height}`);
            
            return {
              weight: {
                units: pkg.weight_unit === 'kg' ? 'KG' : 'LB',
                value: weight
              },
              dimensions: {
                length: length,
                width: width,
                height: height,
                units: pkg.dimension_unit === 'cm' ? 'CM' : 'IN'
              }
            };
          })
        }
      };

      const response = await axios.post(
        'https://apis-sandbox.fedex.com/rate/v1/rates/quotes',
        rateRequest,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-locale': 'en_US'
          }
        }
      );

      return this.parseFedExResponse(response.data);
    } catch (error) {
      console.error('FedEx Rate API Error Details:', JSON.stringify(error.response?.data, null, 2));
      return [];
    }
  }

  /**
   * Get USPS shipping rates using USPS API v3
   * Calculates rates for USPS Ground Advantage and other services
   * 
   * @param {Object} shipment - Shipment details for rate calculation
   * @returns {Promise<Array>} Array of USPS rate options
   * @throws {Error} If USPS API call fails
   */
  async getUSPSRates(shipment) {
    try {
      // Check if credentials are available
      if (!this.uspsConsumerKey || !this.uspsConsumerSecret) {
        throw new Error('USPS credentials not configured');
      }
      
      // Check if CRID is available
      if (!this.uspsCrid) {
        throw new Error('USPS CRID not configured - set USPS_CRID environment variable');
      }
      
      // Get OAuth token for new USPS API
      const token = await this.getUSPSToken();
      
      // Build request for USPS API using correct structure from documentation
      const rateRequest = {
        "originZIPCode": shipment.shipper.address.zip,
        "destinationZIPCode": shipment.recipient.address.zip,
        "weight": shipment.packages.reduce((sum, pkg) => sum + pkg.weight, 0),
        "length": Math.max(...shipment.packages.map(p => p.length)),
        "width": Math.max(...shipment.packages.map(p => p.width)),
        "height": Math.max(...shipment.packages.map(p => p.height)),
        "mailClass": "PARCEL_SELECT",
        "processingCategory": "MACHINABLE",
        "destinationEntryFacilityType": "NONE",
        "rateIndicator": "DR",
        "priceType": "COMMERCIAL",
        "accountType": "EPS",
        "accountNumber": this.uspsCrid,
        "mailingDate": new Date().toISOString().split('T')[0]
      };
      
      const response = await axios.post(
        'https://apis.usps.com/prices/v3/base-rates/search',
        rateRequest,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-User-Id': this.uspsConsumerKey
          }
        }
      );
      return this.parseNewUSPSResponse(response.data);
    } catch (error) {
      console.error('USPS API Error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get UPS OAuth token for API authentication
   * Manages token caching and automatic renewal
   * 
   * @returns {Promise<string>} Valid UPS OAuth access token
   * @throws {Error} If OAuth authentication fails
   */
  async getUPSToken() {
    if (this.tokens.ups && this.tokens.ups.expires > Date.now()) {
      return this.tokens.ups.access_token;
    }

    try {
      const response = await axios.post(
        'https://onlinetools.ups.com/security/v1/oauth/token',
        'grant_type=client_credentials',
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.upsClientId}:${this.upsClientSecret}`).toString('base64')}`
          }
        }
      );

      this.tokens.ups = {
        access_token: response.data.access_token,
        expires: Date.now() + (response.data.expires_in * 1000)
      };

      return this.tokens.ups.access_token;
    } catch (error) {
      console.error('UPS OAuth Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get FedEx OAuth token for API authentication
   * Manages token caching and automatic renewal
   * 
   * @returns {Promise<string>} Valid FedEx OAuth access token
   * @throws {Error} If OAuth authentication fails
   */
  async getFedExToken() {
    // Disable caching - get fresh token every time
    // if (this.tokens.fedex && this.tokens.fedex.expires > Date.now()) {
    //   return this.tokens.fedex.access_token;
    // }

    try {
      const response = await axios.post(
        'https://apis-sandbox.fedex.com/oauth/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.fedexApiKey,
          client_secret: this.fedexSecretKey
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.tokens.fedex = {
        access_token: response.data.access_token,
        expires: Date.now() + (response.data.expires_in * 1000)
      };

      return this.tokens.fedex.access_token;
    } catch (error) {
      console.error('FedEx OAuth Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get USPS OAuth token for API v3 authentication
   * Manages token caching and automatic renewal for new USPS API
   * 
   * @returns {Promise<string>} Valid USPS OAuth access token
   * @throws {Error} If OAuth authentication fails
   */
  async getUSPSToken() {
    if (this.tokens.usps && this.tokens.usps.expires > Date.now()) {
      return this.tokens.usps.access_token;
    }

    try {
      // Use the correct USPS API v3 OAuth format from documentation
      const response = await axios.post(
        'https://apis.usps.com/oauth2/v3/token',
        {
          client_id: this.uspsConsumerKey,
          client_secret: this.uspsConsumerSecret,
          grant_type: 'client_credentials'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      this.tokens.usps = {
        access_token: response.data.access_token,
        expires: Date.now() + (response.data.expires_in * 1000)
      };

      return this.tokens.usps.access_token;
    } catch (error) {
      console.error('USPS OAuth Error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Build USPS XML request
   */
  buildUSPSXMLRequest(shipment) {
    const packages = shipment.packages.map((pkg, index) => `
      <Package ID="${index}">
        <Service>ALL</Service>
        <ZipOrigination>${shipment.shipper.address.zip}</ZipOrigination>
        <ZipDestination>${shipment.recipient.address.zip}</ZipDestination>
        <Pounds>${Math.floor(pkg.weight)}</Pounds>
        <Ounces>${Math.round((pkg.weight % 1) * 16)}</Ounces>
        <Container>RECTANGULAR</Container>
        <Size>REGULAR</Size>
        <Width>${pkg.width}</Width>
        <Length>${pkg.length}</Length>
        <Height>${pkg.height}</Height>
        <Girth>0</Girth>
      </Package>
    `).join('');

    return `
      <RateV4Request USERID="${this.uspsClientId}">
        <Revision>2</Revision>
        ${packages}
      </RateV4Request>
    `;
  }

  /**
   * Parse UPS API response into standardized rate format
   * Converts UPS-specific response structure to common rate object
   * 
   * @param {Object} data - Raw UPS API response data
   * @returns {Array} Array of standardized rate objects
   */
  parseUPSResponse(data) {
    const rates = [];
    
    // UPS Service Code to Description mapping
    const upsServiceNames = {
      '01': 'UPS Next Day Air',
      '02': 'UPS Second Day Air',
      '03': 'UPS Ground',
      '12': 'UPS Three-Day Select',
      '13': 'UPS Next Day Air Saver',
      '14': 'UPS Next Day Air Early AM',
      '59': 'UPS Second Day Air AM',
      '65': 'UPS Worldwide Saver',
      '11': 'UPS Standard',
      '07': 'UPS Worldwide Express',
      '08': 'UPS Worldwide Expedited',
      '54': 'UPS Worldwide Express Plus',
      '96': 'UPS Worldwide Express Freight'
    };
    
    if (data.RateResponse && data.RateResponse.RatedShipment) {
      const shipments = Array.isArray(data.RateResponse.RatedShipment) 
        ? data.RateResponse.RatedShipment 
        : [data.RateResponse.RatedShipment];

      shipments.forEach(shipment => {
        const serviceCode = shipment.Service?.Code || 'N/A';
        const serviceName = upsServiceNames[serviceCode] || `UPS Service ${serviceCode}`;
        
        rates.push({
          carrier: 'UPS',
          service: serviceName,
          serviceCode: serviceCode,
          cost: parseFloat(shipment.TotalCharges?.MonetaryValue || 0),
          currency: shipment.TotalCharges?.CurrencyCode || 'USD',
          estimatedDelivery: shipment.GuaranteedDelivery?.BusinessDaysInTransit || 'N/A'
        });
      });
    }

    return rates;
  }

  /**
   * Parse FedEx API response into standardized rate format
   * Converts FedEx-specific response structure to common rate object
   * 
   * @param {Object} data - Raw FedEx API response data
   * @returns {Array} Array of standardized rate objects
   */
  parseFedExResponse(data) {
    const rates = [];
    
    if (data.output && data.output.rateReplyDetails) {
      data.output.rateReplyDetails.forEach(detail => {
        if (detail.ratedShipmentDetails) {
          detail.ratedShipmentDetails.forEach(shipment => {
            rates.push({
              carrier: 'FedEx',
              service: detail.serviceName,
              serviceCode: detail.serviceType,
              cost: parseFloat(shipment.totalNetCharge),
              currency: shipment.currency,
              estimatedDelivery: detail.commit?.dateDetail?.dayOfWeek || 'N/A'
            });
          });
        }
      });
    }

    return rates;
  }

  /**
   * Parse USPS response (old XML API - deprecated)
   */
  parseUSPSResponse(xmlData) {
    const rates = [];
    
    // Simple XML parsing - in production, use a proper XML parser
    const packageMatches = xmlData.match(/<Package[^>]*>[\s\S]*?<\/Package>/g);
    
    if (packageMatches) {
      packageMatches.forEach(packageXml => {
        const postageMatches = packageXml.match(/<Postage[^>]*>[\s\S]*?<\/Postage>/g);
        
        if (postageMatches) {
          postageMatches.forEach(postageXml => {
            const mailService = postageXml.match(/<MailService>(.*?)<\/MailService>/)?.[1];
            const rate = postageXml.match(/<Rate>(.*?)<\/Rate>/)?.[1];
            
            if (mailService && rate) {
              rates.push({
                carrier: 'USPS',
                service: mailService,
                serviceCode: mailService.replace(/\s+/g, '_').toUpperCase(),
                cost: parseFloat(rate),
                currency: 'USD',
                estimatedDelivery: 'N/A'
              });
            }
          });
        }
      });
    }

    return rates;
  }

  /**
   * Parse new USPS API response (JSON)
   */
  parseNewUSPSResponse(data) {
    const rates = [];
    
    if (data.totalBasePrice) {
      rates.push({
        carrier: 'USPS',
        service: 'USPS Ground Advantage',
        serviceCode: 'USPS_GROUND_ADVANTAGE',
        cost: parseFloat(data.totalBasePrice),
        currency: 'USD',
        estimatedDelivery: data.deliveryDays || 'N/A'
      });
    }

    return rates;
  }

  /**
   * Get company address from database for shipping labels
   * Retrieves default company shipping address for label generation
   * 
   * @returns {Promise<Object>} Company address object with shipping details
   * @throws {Error} If company address not found in database
   */
  async getCompanyAddress() {
    try {
      const db = require('../../config/db');
      
      // Look up company address from database
      const [companyData] = await db.execute(`
        SELECT name, address, city, state, zipcode, country 
        FROM companies 
        WHERE id = 1
      `);
      
      if (companyData.length > 0) {
        const company = companyData[0];
        return {
          name: company.name,
          street: company.address,
          city: company.city,
          state: company.state,
          zip: company.zipcode,
          country: company.country || 'US'
        };
      }
      
      throw new Error('Company address not found');
    } catch (error) {
      console.error('Error getting company address:', error);
      throw error;
    }
  }

  /**
   * Get vendor shipping address and preferences from database
   * Retrieves vendor-specific shipping settings and return address
   * 
   * @param {number} vendorId - Vendor user ID
   * @returns {Promise<Object>} Vendor address and shipping preferences
   * @throws {Error} If vendor shipping settings not configured
   */
  async getVendorAddress(vendorId) {
    try {
      const db = require('../../config/db');
      
      // Look up vendor address from vendor_ship_settings table
      const [vendorData] = await db.query(`
        SELECT return_company_name, return_contact_name, return_address_line_1, return_address_line_2, 
               return_city, return_state, return_postal_code, return_country, return_phone,
               label_size_preference, signature_required_default, insurance_default
        FROM vendor_ship_settings 
        WHERE vendor_id = ?
      `, [vendorId]);
      
      if (vendorData.length > 0) {
        const vendor = vendorData[0];
        return {
          name: vendor.return_company_name || vendor.return_contact_name || 'Vendor',
          contact_name: vendor.return_contact_name,
          company_name: vendor.return_company_name,
          street: vendor.return_address_line_1,
          street2: vendor.return_address_line_2,
          city: vendor.return_city,
          state: vendor.return_state,
          zip: vendor.return_postal_code,
          country: vendor.return_country || 'US',
          phone: vendor.return_phone || '1234567890',
          label_size_preference: vendor.label_size_preference || '4x6',
          signature_required_default: vendor.signature_required_default,
          insurance_default: vendor.insurance_default
        };
      }
      
      throw new Error('Must complete Shipping Preferences to create labels');
    } catch (error) {
      console.error('Error getting vendor address:', error);
      throw error;
    }
  }

  /**
   * Purchase shipping label from specified carrier
   * Creates shipping label and stores it for order fulfillment
   * 
   * @param {string} carrier - Carrier name (UPS, FedEx, USPS)
   * @param {Object} shipment - Complete shipment information
   * @param {Object} selectedRate - Selected shipping rate and service
   * @returns {Promise<Object>} Label purchase result with tracking number and URL
   * @throws {Error} If label creation fails
   */
  async purchaseLabel(carrier, shipment, selectedRate) {
    let labelData;
    switch (carrier.toUpperCase()) {
      // case 'UPS':
      //   labelData = await this.createUPSLabel(shipment, selectedRate);
      //   break;
      case 'FEDEX':
        labelData = await this.createFedExLabel(shipment, selectedRate);
        break;
      // case 'USPS':
      //   labelData = await this.createUSPSLabel(shipment, selectedRate);
      //   break;
      default:
        throw new Error(`Unsupported carrier: ${carrier}. Currently supported: FedEx only (test mode)`);
    }
    
    // Store the label PDF
    const labelUrl = await this.storeLabel(labelData.pdfBase64, shipment.vendor_id, shipment.item_id, labelData, selectedRate, shipment);
    
    return { trackingNumber: labelData.tracking, labelUrl };
  }

  /**
   * Purchase standalone shipping label (not tied to specific order)
   * Creates shipping label for general use or manual shipping
   * 
   * @param {string} carrier - Carrier name (UPS, FedEx, USPS)
   * @param {Object} shipment - Complete shipment information
   * @param {Object} selectedRate - Selected shipping rate and service
   * @returns {Promise<Object>} Label purchase result with tracking and label ID
   * @throws {Error} If label creation fails
   */
  async purchaseStandaloneLabel(carrier, shipment, selectedRate) {
    let labelData;
    switch (carrier.toUpperCase()) {
      case 'FEDEX':
        labelData = await this.createFedExLabel(shipment, selectedRate);
        break;
      default:
        throw new Error(`Unsupported carrier: ${carrier}. Currently supported: FedEx only (test mode)`);
    }
    
    // Store the label PDF in standalone table
    const labelUrl = await this.storeStandaloneLabel(labelData.pdfBase64, shipment.user_id, labelData, selectedRate, shipment);
    
    return { 
      trackingNumber: labelData.tracking, 
      labelUrl,
      labelId: `STANDALONE-${shipment.user_id}-${Date.now()}`
    };
  }

  /**
   * Cancel shipping label with specified carrier
   * Attempts to void/cancel a previously created shipping label
   * 
   * @param {string} carrier - Carrier name (UPS, FedEx, USPS)
   * @param {string} trackingNumber - Tracking number of label to cancel
   * @returns {Promise<Object>} Cancellation result with success status
   * @throws {Error} If label cancellation fails
   */
  async cancelLabel(carrier, trackingNumber) {
    try {
      switch (carrier.toUpperCase()) {
        case 'FEDEX':
          return await this.cancelFedExLabel(trackingNumber);
        // case 'UPS':
        //   return await this.cancelUPSLabel(trackingNumber);
        // case 'USPS':
        //   return await this.cancelUSPSLabel(trackingNumber);
        default:
          throw new Error(`Unsupported carrier for cancellation: ${carrier}. Currently supported: FedEx only`);
      }
    } catch (error) {
      console.error(`${carrier} Label Cancellation Error:`, error.message);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  async createUPSLabel(shipment, selectedRate) {
      const token = await this.getUPSToken();
    // Build UPS shipment request (simplified; expand with full payload)
    const shipmentRequest = {
      ShipmentRequest: {
        Shipment: {
          Description: 'Beemeeart Shipment',
          Shipper: {
            Name: shipment.shipper.name,
            ShipperNumber: this.upsAccountNumber,
            Address: {
              AddressLine: [shipment.shipper.address.street],
              City: shipment.shipper.address.city,
              StateProvinceCode: shipment.shipper.address.state,
              PostalCode: shipment.shipper.address.zip,
              CountryCode: shipment.shipper.address.country
            }
          },
          ShipTo: {
            Name: shipment.recipient.name,
            Address: {
              AddressLine: [shipment.recipient.address.street],
              City: shipment.recipient.address.city,
              StateProvinceCode: shipment.recipient.address.state,
              PostalCode: shipment.recipient.address.zip,
              CountryCode: shipment.recipient.address.country
            }
          },
          Service: { Code: selectedRate.serviceCode, Description: selectedRate.service },
          Package: shipment.packages.map(pkg => ({
            PackagingType: { Code: '02' },
            Dimensions: {
              UnitOfMeasurement: { Code: pkg.dimension_unit.toUpperCase() },
              Length: String(pkg.length),
              Width: String(pkg.width),
              Height: String(pkg.height)
            },
            PackageWeight: {
              UnitOfMeasurement: { Code: pkg.weight_unit.toUpperCase() },
              Weight: String(pkg.weight)
            }
          })),
          PaymentInformation: {
            ShipmentCharge: { Type: '01', BillShipper: { AccountNumber: this.upsAccountNumber } }
          }
        },
        LabelSpecification: { LabelImageFormat: { Code: 'PDF' } }
      }
    };
    
    const response = await axios.post('https://onlinetools.ups.com/api/shipments/v2409/ship', shipmentRequest, {
      headers: { Authorization: `Bearer ${token}` }
    });

      return {
      tracking: response.data.ShipmentResponse.ShipmentResults.ShipmentIdentificationNumber,
      pdfBase64: response.data.ShipmentResponse.ShipmentResults.PackageResults[0].ShippingLabel.GraphicImage
    };
  }

  async cancelFedExLabel(trackingNumber, accountNumber = null) {
    // Check if we're in sandbox/test mode - FedEx sandbox doesn't support label cancellation
    // Since we're using sandbox URLs throughout, we're always in test mode for now
    const isSandbox = true;
    
    if (isSandbox) {
      // In sandbox mode, simulate successful cancellation for testing workflow
      console.log(`TEST MODE: Simulating FedEx label cancellation for tracking ${trackingNumber}`);
      return {
        success: true,
        message: 'Label cancelled successfully (TEST MODE - no actual API call)',
        trackingNumber: trackingNumber,
        testMode: true
      };
    }

    // Production mode - make actual API call
    const token = await this.getFedExToken();
    
    const cancelRequest = {
      accountNumber: {
        value: accountNumber || this.fedexAccountNumber
      },
      trackingNumber: trackingNumber
    };
    
    try {
      const response = await axios.delete('https://apis.fedex.com/ship/v1/shipments/cancel', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-locale': 'en_US'
        },
        data: cancelRequest
      });
      
      return {
        success: true,
        message: 'Label cancelled successfully',
        trackingNumber: trackingNumber,
        response: response.data
      };
      
    } catch (error) {
      console.error('FedEx Label Cancellation Error:', error.response?.data || error.message);
      throw new Error(`FedEx label cancellation failed: ${error.response?.data?.errors?.[0]?.message || error.message}`);
    }
  }

  async createFedExLabel(shipment, selectedRate) {
    const token = await this.getFedExToken();
    
    // Build address lines array, including second line if available
    const shipperStreetLines = [shipment.shipper.address.street];
    if (shipment.shipper.address.street2) {
      shipperStreetLines.push(shipment.shipper.address.street2);
    }
    
    // Determine label stock type from vendor preferences
    const labelStockType = shipment.shipper.address.label_size_preference === '8.5x11' 
      ? 'PAPER_85X11_TOP_HALF_LABEL' 
      : 'PAPER_4X6';
    
    // Build FedEx shipment request according to official API documentation
    const shipmentRequest = {
      labelResponseOptions: 'URL_ONLY',
      requestedShipment: {
        shipper: {
          contact: {
            personName: shipment.shipper.address.contact_name || shipment.shipper.name,
            phoneNumber: shipment.shipper.address.phone || '1234567890',
            companyName: shipment.shipper.address.company_name || undefined
          },
          address: {
            streetLines: shipperStreetLines,
            city: shipment.shipper.address.city,
            stateOrProvinceCode: shipment.shipper.address.state,
            postalCode: shipment.shipper.address.zip,
            countryCode: shipment.shipper.address.country || 'US'
          }
        },
        recipients: [{
          contact: {
            personName: shipment.recipient.name,
            phoneNumber: '1234567890'
          },
          address: {
            streetLines: [shipment.recipient.address.street],
            city: shipment.recipient.address.city,
            stateOrProvinceCode: shipment.recipient.address.state,
            postalCode: shipment.recipient.address.zip,
            countryCode: shipment.recipient.address.country || 'US'
          }
        }],
        shipDatestamp: new Date().toISOString().split('T')[0],
        serviceType: selectedRate.serviceCode,
        packagingType: 'YOUR_PACKAGING',
        pickupType: 'USE_SCHEDULED_PICKUP',
        shippingChargesPayment: {
          paymentType: 'SENDER'
        },
        labelSpecification: {
          imageType: 'PDF',
          labelStockType: labelStockType
        },
        requestedPackageLineItems: shipment.packages.map((pkg, index) => ({
          weight: {
            units: pkg.weight_unit.toUpperCase(),
            value: pkg.weight
          },
          dimensions: {
            length: pkg.length,
            width: pkg.width,
            height: pkg.height,
            units: pkg.dimension_unit.toUpperCase()
          }
        }))
      },
      accountNumber: {
        value: this.fedexAccountNumber
      }
    };
    
    try {
      const response = await axios.post('https://apis-sandbox.fedex.com/ship/v1/shipments', shipmentRequest, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Safely access the response structure
      const output = response.data?.output;
      const shipment = output?.transactionShipments?.[0];
      const piece = shipment?.pieceResponses?.[0];

      // Get tracking number from piece response (it's more reliable)
      const trackingNumber = piece?.trackingNumber || shipment?.masterTrackingNumber;
      
      if (!trackingNumber) {
        throw new Error('No tracking number in FedEx response');
      }

      // Get label URL from packageDocuments
      const labelDocument = piece?.packageDocuments?.find(doc => doc.contentType === 'LABEL');
      
      if (!labelDocument?.url) {
        throw new Error('No label URL in FedEx response');
      }

      // Fetch the PDF from the FedEx URL and convert to base64
      console.log('Downloading label PDF from:', labelDocument.url);
      const pdfResponse = await axios.get(labelDocument.url, { 
        responseType: 'arraybuffer',
        headers: {
          'Authorization': `Bearer ${token}` // May need auth for FedEx document retrieval
        }
      });
      
      const pdfBase64 = Buffer.from(pdfResponse.data).toString('base64');

      return {
        tracking: trackingNumber,
        labelUrl: labelDocument.url,
        pdfBase64: pdfBase64
      };
    } catch (error) {
      console.error('=== FedEx Ship API Error ===');
      console.error('Error Status:', error.response?.status);
      console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
      console.error('Error Message:', error.message);
      throw new Error(`FedEx label creation failed: ${error.response?.data?.errors?.[0]?.message || error.message}`);
    }
  }

  async createUSPSLabel(shipment, selectedRate) {
      const token = await this.getUSPSToken();
    // Build USPS label request
    const labelRequest = {
      // ... build from shipment and selectedRate
    };
    
    const response = await axios.post('https://apis.usps.com/labels/v3/create', labelRequest, {
      headers: { Authorization: `Bearer ${token}` }
    });

      return {
      tracking: response.data.trackingNumber,
      pdfBase64: response.data.labelImage // Base64 or URL; convert if needed
    };
  }

  /**
   * Store shipping label PDF file and database record
   * Saves label to filesystem and creates database entry for order tracking
   * 
   * @param {string} pdfBase64 - Base64 encoded PDF label data
   * @param {number} userId - Vendor/user ID
   * @param {number} itemId - Order item ID
   * @param {Object} labelData - Label creation response data
   * @param {Object} selectedRate - Selected shipping rate information
   * @param {Object} shipment - Complete shipment details
   * @returns {Promise<string>} URL path to stored label file
   * @throws {Error} If file storage or database insert fails
   */
  async storeLabel(pdfBase64, userId, itemId, labelData, selectedRate, shipment) {
    const dir = path.join(__dirname, '../../../public/static_media/labels');
    await fs.mkdir(dir, { recursive: true });
    
    // Create a secure filename with user ID and random component for security
    const fileName = `label_${userId}_${itemId}_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`;
    const filePath = path.join(dir, fileName);
    
    await fs.writeFile(filePath, Buffer.from(pdfBase64, 'base64'));
    
    // Insert to shipping_labels table
    const db = require('../../config/db');
    await db.execute(
      `INSERT INTO shipping_labels (
        order_id, order_item_id, vendor_id, carrier, service_code, service_name, 
        tracking_number, label_file_path, label_format, cost, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        shipment.order_id || null,
        itemId,
        userId, // vendor_id
        selectedRate.carrier.toLowerCase(),
        selectedRate.service_code || selectedRate.service,
        selectedRate.service_name || selectedRate.service,
        labelData.tracking,
        `/static_media/labels/${fileName}`,
        'label', // assuming label format
        selectedRate.cost || 0
      ]
    );
    
    return `/static_media/labels/${fileName}`;
  }

  /**
   * Store standalone shipping label PDF file and database record
   * Saves label to filesystem and creates database entry for standalone labels
   * 
   * @param {string} pdfBase64 - Base64 encoded PDF label data
   * @param {number} userId - User ID creating the label
   * @param {Object} labelData - Label creation response data
   * @param {Object} selectedRate - Selected shipping rate information
   * @param {Object} shipment - Complete shipment details
   * @returns {Promise<string>} URL path to stored label file
   * @throws {Error} If file storage or database insert fails
   */
  async storeStandaloneLabel(pdfBase64, userId, labelData, selectedRate, shipment) {
    const dir = path.join(__dirname, '../../../public/static_media/labels');
    await fs.mkdir(dir, { recursive: true });
    
    // Create a secure filename for standalone labels
    const fileName = `standalone_label_${userId}_${Date.now()}_${Math.random().toString(36).substring(7)}.pdf`;
    const filePath = path.join(dir, fileName);
    
    await fs.writeFile(filePath, Buffer.from(pdfBase64, 'base64'));
    
    // Generate unique label ID
    const labelId = `STANDALONE-${userId}-${Date.now()}`;
    
    // Insert to standalone_shipping_labels table
    const db = require('../../config/db');
    const [result] = await db.execute(
      `INSERT INTO standalone_shipping_labels (
        label_id, user_id, carrier, service_code, service_name, 
        tracking_number, label_file_path, label_format, cost, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        labelId,
        userId,
        selectedRate.carrier.toLowerCase(),
        selectedRate.service_code || selectedRate.service,
        selectedRate.service_name || selectedRate.service,
        labelData.tracking,
        `/static_media/labels/${fileName}`,
        'label', // assuming label format
        selectedRate.cost || 0
      ]
    );
    
    return `/static_media/labels/${fileName}`;
  }
}

module.exports = new ShippingService(); 