/**
 * Walmart Marketplace API Service
 * Handles all interactions with Walmart's Marketplace API
 */

const axios = require('axios');

class WalmartService {
  constructor() {
    this.baseUrl = process.env.WALMART_ENV === 'production'
      ? 'https://marketplace.walmartapis.com'
      : 'https://sandbox.walmartapis.com';
    
    this.clientId = process.env.WALMART_ENV === 'production'
      ? process.env.WALMART_CLIENT_ID
      : process.env.WALMART_SANDBOX_CLIENT_ID;
    
    this.clientSecret = process.env.WALMART_ENV === 'production'
      ? process.env.WALMART_CLIENT_SECRET
      : process.env.WALMART_SANDBOX_CLIENT_SECRET;
    
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get access token using OAuth 2.0 Client Credentials
   * Token lifetime: 15 minutes (900 seconds)
   */
  async getAccessToken() {
    // Return cached token if still valid (with 60s buffer)
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/v3/token`,
        'grant_type=client_credentials',
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'WM_SVC.NAME': 'Walmart Marketplace',
            'WM_QOS.CORRELATION_ID': this.generateCorrelationId()
          }
        }
      );

      this.accessToken = response.data.access_token;
      // Token expires in 900 seconds (15 minutes)
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      
      return this.accessToken;
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.error_description || error.message;
      throw new Error(`Walmart auth failed (${status}): ${message}`);
    }
  }

  /**
   * Generate unique correlation ID for request tracking
   */
  generateCorrelationId() {
    return `brakebee-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get common headers for API requests
   */
  async getHeaders() {
    const token = await this.getAccessToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'WM_SVC.NAME': 'Walmart Marketplace',
      'WM_QOS.CORRELATION_ID': this.generateCorrelationId()
    };
  }

  /**
   * Test API connection - simple ping
   */
  async testConnection() {
    try {
      await this.getAccessToken();
      return { 
        success: true, 
        environment: process.env.WALMART_ENV || 'sandbox',
        message: 'Successfully authenticated with Walmart API'
      };
    } catch (error) {
      return { 
        success: false, 
        environment: process.env.WALMART_ENV || 'sandbox',
        message: error.message 
      };
    }
  }

  // ============================================
  // ITEM MANAGEMENT
  // ============================================

  /**
   * Push products to Walmart via feed
   * @param {Array} items - Array of product objects
   */
  async pushProducts(items) {
    const headers = await this.getHeaders();
    
    // Walmart uses XML feeds for bulk item setup
    // We'll need to convert our products to their spec format
    try {
      const response = await axios.post(
        `${this.baseUrl}/v3/feeds?feedType=item`,
        { items },
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to push products: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get all items from our Walmart catalog
   */
  async getItems(options = {}) {
    const headers = await this.getHeaders();
    const params = new URLSearchParams({
      limit: options.limit || 20,
      offset: options.offset || 0
    });
    
    if (options.sku) params.append('sku', options.sku);
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/v3/items?${params}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get items: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Retire/remove an item from Walmart
   */
  async retireItem(sku) {
    const headers = await this.getHeaders();
    
    try {
      const response = await axios.delete(
        `${this.baseUrl}/v3/items/${sku}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to retire item: ${error.response?.data?.error || error.message}`);
    }
  }

  // ============================================
  // INVENTORY MANAGEMENT
  // ============================================

  /**
   * Update inventory for a single item
   */
  async updateInventory(sku, quantity) {
    const headers = await this.getHeaders();
    
    try {
      const response = await axios.put(
        `${this.baseUrl}/v3/inventory`,
        {
          sku,
          quantity: {
            unit: 'EACH',
            amount: quantity
          }
        },
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update inventory: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Bulk update inventory
   */
  async bulkUpdateInventory(items) {
    const headers = await this.getHeaders();
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/v3/feeds?feedType=inventory`,
        { 
          inventoryHeader: { version: '1.4' },
          inventory: items.map(item => ({
            sku: item.sku,
            quantity: { unit: 'EACH', amount: item.quantity }
          }))
        },
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to bulk update inventory: ${error.response?.data?.error || error.message}`);
    }
  }

  // ============================================
  // ORDER MANAGEMENT
  // ============================================

  /**
   * Get released orders (ready to fulfill)
   */
  async getReleasedOrders(options = {}) {
    const headers = await this.getHeaders();
    const params = new URLSearchParams({
      limit: options.limit || 100
    });
    
    if (options.createdStartDate) params.append('createdStartDate', options.createdStartDate);
    if (options.createdEndDate) params.append('createdEndDate', options.createdEndDate);
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/v3/orders/released?${params}`,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get orders: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Acknowledge an order
   */
  async acknowledgeOrder(purchaseOrderId) {
    const headers = await this.getHeaders();
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/v3/orders/${purchaseOrderId}/acknowledge`,
        {},
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to acknowledge order: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Ship order lines (add tracking)
   */
  async shipOrder(purchaseOrderId, shipmentInfo) {
    const headers = await this.getHeaders();
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/v3/orders/${purchaseOrderId}/shipping`,
        {
          orderShipment: {
            orderLines: shipmentInfo.orderLines.map(line => ({
              lineNumber: line.lineNumber,
              orderLineStatuses: {
                orderLineStatus: [{
                  status: 'Shipped',
                  statusQuantity: {
                    unitOfMeasurement: 'EACH',
                    amount: line.quantity
                  },
                  trackingInfo: {
                    shipDateTime: new Date().toISOString(),
                    carrierName: {
                      carrier: line.carrier
                    },
                    trackingNumber: line.trackingNumber,
                    trackingURL: line.trackingUrl
                  }
                }]
              }
            }))
          }
        },
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to ship order: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Cancel order lines
   */
  async cancelOrder(purchaseOrderId, lineNumber, reason = 'CANCEL_BY_SELLER') {
    const headers = await this.getHeaders();
    
    try {
      const response = await axios.post(
        `${this.baseUrl}/v3/orders/${purchaseOrderId}/cancel`,
        {
          orderCancellation: {
            orderLines: [{
              lineNumber,
              orderLineStatuses: {
                orderLineStatus: [{
                  status: 'Cancelled',
                  cancellationReason: reason,
                  statusQuantity: {
                    unitOfMeasurement: 'EACH',
                    amount: 1
                  }
                }]
              }
            }]
          }
        },
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to cancel order: ${error.response?.data?.error || error.message}`);
    }
  }

  // ============================================
  // FEED MANAGEMENT
  // ============================================

  /**
   * Get feed status (for bulk operations)
   */
  async getFeedStatus(feedId) {
    const headers = await this.getHeaders();
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/v3/feeds/${feedId}?includeDetails=true`,
        { headers }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get feed status: ${error.response?.data?.error || error.message}`);
    }
  }
}

module.exports = new WalmartService();

