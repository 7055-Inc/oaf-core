/**
 * Wayfair Supplier API Service
 * Handles all interactions with Wayfair's GraphQL API
 * Corporate integration only (no vendor OAuth)
 * 
 * Key Differences:
 * - Uses GraphQL instead of REST
 * - Single endpoint for all operations
 * - Queries and mutations instead of HTTP verbs
 * 
 * API Documentation: https://developer.wayfair.com/docs/
 */

const axios = require('axios');

class WayfairService {
  constructor() {
    // Determine base URL based on environment
    const isProduction = process.env.WAYFAIR_ENV === 'production';
    this.baseUrl = isProduction
      ? 'https://api.wayfair.com'
      : 'https://sandbox.api.wayfair.com';
    
    this.graphqlEndpoint = `${this.baseUrl}/v1/graphql`;
    this.tokenEndpoint = `${this.baseUrl}/oauth/token`;
    
    // Client credentials
    this.clientId = process.env.WAYFAIR_CLIENT_ID;
    this.clientSecret = process.env.WAYFAIR_CLIENT_SECRET;
    
    // Token cache
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get OAuth 2.0 access token (Client Credentials flow)
   * Wayfair tokens typically expire after 1 hour
   * 
   * @returns {Promise<string>} Access token
   */
  async getAccessToken() {
    // Return cached token if still valid (with 60s buffer)
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    try {
      const response = await axios.post(
        this.tokenEndpoint,
        {
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      this.accessToken = response.data.access_token;
      // Token expires in seconds (typically 3600 = 1 hour)
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      
      console.log('Wayfair access token obtained, expires in', response.data.expires_in, 'seconds');
      
      return this.accessToken;
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.error_description || error.response?.data?.message || error.message;
      console.error('Wayfair OAuth error:', { status, message, data: error.response?.data });
      throw new Error(`Wayfair authentication failed: ${message}`);
    }
  }

  /**
   * Make GraphQL request to Wayfair API
   * 
   * @param {string} query - GraphQL query or mutation
   * @param {object} variables - Query variables
   * @returns {Promise<object>} GraphQL response data
   */
  async graphqlRequest(query, variables = {}) {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.post(
        this.graphqlEndpoint,
        {
          query,
          variables
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );

      // Check for GraphQL errors
      if (response.data.errors && response.data.errors.length > 0) {
        const errorMessages = response.data.errors.map(e => e.message).join(', ');
        console.error('Wayfair GraphQL errors:', response.data.errors);
        throw new Error(`GraphQL errors: ${errorMessages}`);
      }

      return response.data.data;
    } catch (error) {
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map(e => e.message).join(', ');
        throw new Error(`Wayfair GraphQL error: ${errorMessages}`);
      }
      throw error;
    }
  }

  /**
   * Test API connection
   * Validates credentials and connectivity
   * 
   * @returns {Promise<object>} Connection status
   */
  async testConnection() {
    try {
      await this.getAccessToken();
      return {
        success: true,
        message: 'Successfully authenticated with Wayfair API',
        environment: process.env.WAYFAIR_ENV || 'sandbox',
        endpoint: this.graphqlEndpoint
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        environment: process.env.WAYFAIR_ENV || 'sandbox'
      };
    }
  }

  // ============================================
  // CATALOG MANAGEMENT
  // ============================================

  /**
   * Create or update product in Wayfair catalog
   * 
   * @param {object} productData - Product details
   * @returns {Promise<object>} Created/updated product info
   */
  async syncProduct(productData) {
    // GraphQL mutation for creating/updating a product
    // Note: Actual schema depends on Wayfair's API documentation
    const mutation = `
      mutation CreateOrUpdateProduct($input: ProductInput!) {
        createProduct(input: $input) {
          sku
          partNumber
          title
          status
          message
        }
      }
    `;

    const variables = {
      input: {
        sku: productData.wayfair_sku,
        partNumber: productData.wayfair_part_number || productData.wayfair_sku,
        title: productData.wayfair_title,
        description: productData.wayfair_description,
        shortDescription: productData.wayfair_short_description,
        brand: productData.wayfair_brand,
        category: productData.wayfair_category,
        price: parseFloat(productData.wayfair_price || 0),
        images: this.formatImages(productData),
        features: this.parseJsonField(productData.wayfair_key_features),
        dimensions: this.formatDimensions(productData),
        shipping: this.formatShipping(productData),
        color: productData.wayfair_color,
        material: productData.wayfair_material
      }
    };

    try {
      return await this.graphqlRequest(mutation, variables);
    } catch (error) {
      console.error('Wayfair product sync error:', error.message);
      throw new Error(`Failed to sync product to Wayfair: ${error.message}`);
    }
  }

  /**
   * Get product details from Wayfair
   * 
   * @param {string} sku - Wayfair supplier SKU
   * @returns {Promise<object>} Product details
   */
  async getProduct(sku) {
    const query = `
      query GetProduct($sku: String!) {
        product(sku: $sku) {
          sku
          partNumber
          title
          description
          price
          inventory
          status
        }
      }
    `;

    return await this.graphqlRequest(query, { sku });
  }

  /**
   * Deactivate product in Wayfair catalog
   * 
   * @param {string} sku - Wayfair supplier SKU
   * @returns {Promise<object>} Deactivation result
   */
  async deactivateProduct(sku) {
    const mutation = `
      mutation DeactivateProduct($sku: String!) {
        deactivateProduct(sku: $sku) {
          success
          message
        }
      }
    `;

    return await this.graphqlRequest(mutation, { sku });
  }

  // ============================================
  // INVENTORY MANAGEMENT
  // ============================================

  /**
   * Update inventory for a product
   * 
   * @param {string} sku - Wayfair supplier SKU
   * @param {number} quantity - Available quantity
   * @returns {Promise<object>} Inventory update result
   */
  async updateInventory(sku, quantity) {
    const mutation = `
      mutation UpdateInventory($sku: String!, $quantity: Int!) {
        updateInventory(sku: $sku, quantity: $quantity) {
          sku
          availableQuantity
          updatedAt
        }
      }
    `;

    return await this.graphqlRequest(mutation, { sku, quantity: parseInt(quantity) });
  }

  /**
   * Bulk update inventory for multiple products
   * 
   * @param {Array<object>} inventoryUpdates - Array of {sku, quantity}
   * @returns {Promise<object>} Bulk update results
   */
  async bulkUpdateInventory(inventoryUpdates) {
    const mutation = `
      mutation BulkUpdateInventory($items: [InventoryInput!]!) {
        bulkUpdateInventory(items: $items) {
          successCount
          failureCount
          results {
            sku
            success
            message
          }
        }
      }
    `;

    const items = inventoryUpdates.map(item => ({
      sku: item.sku,
      quantity: parseInt(item.quantity)
    }));

    return await this.graphqlRequest(mutation, { items });
  }

  // ============================================
  // ORDER MANAGEMENT
  // ============================================

  /**
   * Get purchase orders (dropship orders)
   * 
   * @param {object} params - Query parameters (limit, offset, status, etc.)
   * @returns {Promise<object>} Purchase orders list
   */
  async getPurchaseOrders(params = {}) {
    const query = `
      query GetPurchaseOrders($limit: Int, $offset: Int, $status: String) {
        getDropshipPurchaseOrders(limit: $limit, offset: $offset, status: $status) {
          totalCount
          orders {
            poNumber
            poDate
            orderDate
            customerName
            orderStatus
            totalAmount
            items {
              sku
              partNumber
              quantity
              unitPrice
              lineTotal
            }
            shippingAddress {
              name
              address1
              address2
              city
              state
              zip
              country
              phone
            }
          }
        }
      }
    `;

    const variables = {
      limit: params.limit || 50,
      offset: params.offset || 0,
      status: params.status || null
    };

    return await this.graphqlRequest(query, variables);
  }

  /**
   * Accept a purchase order
   * 
   * @param {string} poNumber - Purchase order number
   * @returns {Promise<object>} Acceptance result
   */
  async acceptOrder(poNumber) {
    const mutation = `
      mutation AcceptOrder($poNumber: String!) {
        acceptOrder(poNumber: $poNumber) {
          success
          message
          poNumber
        }
      }
    `;

    return await this.graphqlRequest(mutation, { poNumber });
  }

  /**
   * Send shipment notification (ASN - Advanced Shipping Notice)
   * 
   * @param {object} shipmentData - Shipment details
   * @returns {Promise<object>} Shipment notification result
   */
  async sendShipment(shipmentData) {
    const mutation = `
      mutation SendShipment($input: ShipmentInput!) {
        sendShipment(input: $input) {
          success
          message
          trackingNumber
          shipDate
        }
      }
    `;

    const variables = {
      input: {
        poNumber: shipmentData.poNumber,
        trackingNumber: shipmentData.trackingNumber,
        carrier: shipmentData.carrier,
        shipDate: shipmentData.shipDate || new Date().toISOString(),
        items: shipmentData.items || []
      }
    };

    return await this.graphqlRequest(mutation, variables);
  }

  /**
   * Cancel order line items
   * 
   * @param {string} poNumber - Purchase order number
   * @param {Array<string>} itemSkus - SKUs to cancel
   * @param {string} reason - Cancellation reason
   * @returns {Promise<object>} Cancellation result
   */
  async cancelOrderItems(poNumber, itemSkus, reason) {
    const mutation = `
      mutation CancelOrderItems($input: CancelInput!) {
        cancelOrderItems(input: $input) {
          success
          message
        }
      }
    `;

    const variables = {
      input: {
        poNumber,
        items: itemSkus,
        reason: reason || 'Out of stock'
      }
    };

    return await this.graphqlRequest(mutation, variables);
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Format images array for Wayfair API
   */
  formatImages(productData) {
    const images = [];
    
    if (productData.wayfair_main_image_url) {
      images.push({
        url: productData.wayfair_main_image_url,
        isPrimary: true
      });
    }
    
    const additionalImages = this.parseJsonField(productData.wayfair_additional_images);
    if (Array.isArray(additionalImages)) {
      additionalImages.forEach(url => {
        images.push({
          url,
          isPrimary: false
        });
      });
    }
    
    return images;
  }

  /**
   * Format dimensions object for Wayfair API
   */
  formatDimensions(productData) {
    const dimensions = this.parseJsonField(productData.wayfair_dimensions);
    
    return {
      width: dimensions?.width || productData.width || null,
      height: dimensions?.height || productData.height || null,
      depth: dimensions?.depth || productData.depth || null,
      weight: dimensions?.weight || productData.weight || null,
      unit: dimensions?.unit || 'inches'
    };
  }

  /**
   * Format shipping info for Wayfair API
   */
  formatShipping(productData) {
    return {
      weight: parseFloat(productData.wayfair_shipping_weight || 0),
      length: parseFloat(productData.wayfair_shipping_length || 0),
      width: parseFloat(productData.wayfair_shipping_width || 0),
      height: parseFloat(productData.wayfair_shipping_height || 0),
      unit: 'inches',
      weightUnit: 'lbs'
    };
  }

  /**
   * Parse JSON field safely
   */
  parseJsonField(field) {
    if (!field) return null;
    if (typeof field === 'object') return field;
    try {
      return JSON.parse(field);
    } catch (e) {
      console.error('Failed to parse JSON field:', e);
      return null;
    }
  }
}

module.exports = new WayfairService();
