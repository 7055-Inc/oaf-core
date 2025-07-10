const axios = require('axios');

class ShippingService {
  constructor() {
    this.upsClientId = process.env.UPS_CLIENT_ID;
    this.upsClientSecret = process.env.UPS_CLIENT_SECRET;
    this.upsAccountNumber = process.env.UPS_ACCOUNT;
    this.fedexApiKey = process.env.FEDEX_API_KEY;
    this.fedexSecretKey = process.env.FEDEX_API_SECRET;
    this.uspsConsumerKey = process.env.USPS_CONSUMER_KEY;
    this.uspsConsumerSecret = process.env.USPS_CONSUMER_SECRET;
    this.uspsCrid = process.env.USPS_CRID;
    
    // OAuth tokens cache
    this.tokens = {
      ups: null,
      fedex: null,
      usps: null
    };
  }

  /**
   * Calculate shipping rates for all carriers
   * @param {Object} shipment - Shipment details
   * @returns {Array} Array of shipping rate options
   */
  async calculateShippingRates(shipment) {
    const rates = [];
    
    try {
      // Get rates from all carriers in parallel
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
   * Get UPS shipping rates
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
              CustomerContext: "OAF Rate Request"
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
        'https://wwwcie.ups.com/api/rating/v2409/Shop',
        rateRequest,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'transId': `${Date.now()}`,
            'transactionSrc': 'OAF'
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
   * Get FedEx shipping rates
   */
  async getFedExRates(shipment) {
    try {
      // Get OAuth token
      const token = await this.getFedExToken();
      
      const rateRequest = {
        requestedShipment: {
          shipper: {
            address: {
              streetLines: [shipment.shipper.address.street],
              city: shipment.shipper.address.city,
              stateOrProvinceCode: shipment.shipper.address.state,
              postalCode: shipment.shipper.address.zip,
              countryCode: shipment.shipper.address.country
            }
          },
          recipient: {
            address: {
              streetLines: [shipment.recipient.address.street],
              city: shipment.recipient.address.city,
              stateOrProvinceCode: shipment.recipient.address.state,
              postalCode: shipment.recipient.address.zip,
              countryCode: shipment.recipient.address.country
            }
          },
          pickupType: "DROPOFF_AT_FEDEX_LOCATION",
          packagingType: "YOUR_PACKAGING",
          requestedPackageLineItems: shipment.packages.map(pkg => ({
            weight: {
              units: pkg.weight_unit === 'kg' ? 'KG' : 'LB',
              value: pkg.weight
            },
            dimensions: {
              length: pkg.length,
              width: pkg.width,
              height: pkg.height,
              units: pkg.dimension_unit === 'cm' ? 'CM' : 'IN'
            }
          }))
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
      console.error('FedEx API Error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Get USPS shipping rates
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
        "weight": shipment.packages[0].weight,
        "length": shipment.packages[0].length,
        "width": shipment.packages[0].width,
        "height": shipment.packages[0].height,
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
   * Get UPS OAuth token
   */
  async getUPSToken() {
    if (this.tokens.ups && this.tokens.ups.expires > Date.now()) {
      return this.tokens.ups.access_token;
    }

    try {
      const response = await axios.post(
        'https://wwwcie.ups.com/security/v1/oauth/token',
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
   * Get FedEx OAuth token
   */
  async getFedExToken() {
    if (this.tokens.fedex && this.tokens.fedex.expires > Date.now()) {
      return this.tokens.fedex.access_token;
    }

    try {
      const response = await axios.post(
        'https://apis-sandbox.fedex.com/auth/oauth/v2/token',
        {
          grant_type: 'client_credentials',
          client_id: this.fedexApiKey,
          client_secret: this.fedexSecretKey
        },
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
   * Get USPS OAuth token (new API v3)
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
   * Parse UPS response
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
   * Parse FedEx response
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
   * Get company address from database
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
      
      // Fallback to hardcoded address if no company data found
      return {
        name: 'Online Art Festival',
        street: '123 Art Street',
        city: 'Denver',
        state: 'CO',
        zip: '80202',
        country: 'US'
      };
    } catch (error) {
      console.error('Error getting company address:', error);
      // Return hardcoded address on error
      return {
        name: 'Online Art Festival',
        street: '123 Art Street',
        city: 'Denver',
        state: 'CO',
        zip: '80202',
        country: 'US'
      };
    }
  }
}

module.exports = new ShippingService(); 