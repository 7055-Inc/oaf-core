/**
 * TikTok Shop API Service
 * Handles all interactions with TikTok Shop Partner API
 * 
 * Key Features:
 * - OAuth 2.0 token management (authorization code flow)
 * - HMAC-SHA256 request signing (required for all API calls)
 * - Rate limiting and error handling
 * - Shop, Product, Order, and Inventory management
 * 
 * API Documentation: https://partner.tiktokshop.com/docv2
 * Base URL: https://open-api.tiktokglobalshop.com
 */

const axios = require('axios');
const crypto = require('crypto');
const db = require('../../config/db');

class TikTokService {
  constructor() {
    // TikTok Shop uses a single global API endpoint
    this.baseUrl = 'https://open-api.tiktokglobalshop.com';
    
    // Client credentials from environment
    this.appKey = process.env.TIKTOK_CLIENT_KEY;
    this.appSecret = process.env.TIKTOK_CLIENT_SECRET;
    
    // OAuth redirect URL
    this.redirectUri = `${process.env.API_BASE_URL}/api/v2/catalog/tiktok/oauth/callback`;
    
    // Rate limiting tracking
    this.requestQueue = [];
    this.maxQPS = 20; // TikTok rate limit: 20 queries per second
  }

  /**
   * Generate HMAC-SHA256 signature for API requests
   * TikTok requires signed requests for security
   * 
   * Signature Algorithm:
   * 1. Build input string: app_secret + path + timestamp + app_key + access_token + body + app_secret
   * 2. Generate HMAC-SHA256 hash
   * 3. Return hex digest
   * 
   * @param {string} path - API endpoint path (e.g., /api/products/search)
   * @param {string} timestamp - Unix timestamp in seconds
   * @param {string} accessToken - OAuth access token
   * @param {object} body - Request body (for POST/PUT requests)
   * @returns {string} HMAC-SHA256 signature (hex)
   */
  generateSignature(path, timestamp, accessToken = '', body = null) {
    // Build the signature string according to TikTok's spec
    // Format: app_secret + path + timestamp + app_key + access_token + body + app_secret
    let signString = this.appSecret;
    signString += path;
    signString += timestamp.toString();
    signString += this.appKey;
    signString += accessToken || '';
    
    // Add body if present (for POST/PUT requests)
    if (body && typeof body === 'object') {
      signString += JSON.stringify(body);
    }
    
    signString += this.appSecret;
    
    // Generate HMAC-SHA256 hash
    const hmac = crypto.createHmac('sha256', this.appSecret);
    hmac.update(signString);
    return hmac.digest('hex');
  }

  /**
   * Build common query parameters for all API requests
   * TikTok requires these params in every request
   * 
   * @param {string} accessToken - OAuth access token (optional for some endpoints)
   * @returns {object} Common query parameters
   */
  getCommonParams(accessToken = '') {
    const timestamp = Math.floor(Date.now() / 1000);
    return {
      app_key: this.appKey,
      timestamp: timestamp,
      access_token: accessToken || '',
      version: '202309' // API version
    };
  }

  /**
   * Make authenticated API request with signature
   * Handles rate limiting, retries, and error responses
   * 
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {string} path - API endpoint path
   * @param {string} accessToken - OAuth access token
   * @param {object} data - Request body (for POST/PUT)
   * @param {object} additionalParams - Additional query parameters
   * @returns {Promise<object>} API response data
   */
  async makeRequest(method, path, accessToken = '', data = null, additionalParams = {}) {
    const timestamp = Math.floor(Date.now() / 1000);
    
    // Build query parameters
    const params = {
      ...this.getCommonParams(accessToken),
      ...additionalParams
    };
    
    // Generate signature
    const signature = this.generateSignature(path, timestamp, accessToken, data);
    params.sign = signature;
    
    // Build request config
    const config = {
      method,
      url: `${this.baseUrl}${path}`,
      params,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }
    
    try {
      // Rate limiting: ensure we don't exceed 20 QPS
      await this.enforceRateLimit();
      
      const response = await axios(config);
      
      // TikTok API response format: { code, message, data }
      if (response.data && response.data.code !== 0) {
        throw new Error(`TikTok API Error (${response.data.code}): ${response.data.message}`);
      }
      
      return response.data.data || response.data;
      
    } catch (error) {
      return this.handleError(error, method, path);
    }
  }

  /**
   * Enforce rate limiting (20 QPS max)
   * Tracks requests in a rolling window
   */
  async enforceRateLimit() {
    const now = Date.now();
    
    // Clean old requests (older than 1 second)
    this.requestQueue = this.requestQueue.filter(time => now - time < 1000);
    
    // If we're at the limit, wait
    if (this.requestQueue.length >= this.maxQPS) {
      const oldestRequest = this.requestQueue[0];
      const waitTime = 1000 - (now - oldestRequest);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      this.requestQueue = [];
    }
    
    this.requestQueue.push(now);
  }

  /**
   * Handle API errors with detailed logging and retry logic
   * 
   * @param {Error} error - Axios error object
   * @param {string} method - HTTP method
   * @param {string} path - API endpoint path
   * @returns {Promise<never>} Throws formatted error
   */
  async handleError(error, method, path) {
    const status = error.response?.status;
    const errorData = error.response?.data;
    const errorCode = errorData?.code;
    const errorMessage = errorData?.message || error.message;
    
    // Log detailed error info
    console.error('TikTok API Error:', {
      method,
      path,
      status,
      errorCode,
      errorMessage,
      fullError: errorData
    });
    
    // Handle specific error codes
    if (status === 401 || errorCode === 10002) {
      throw new Error('TikTok authentication failed: Invalid or expired access token');
    }
    
    if (status === 403 || errorCode === 10003) {
      throw new Error('TikTok authorization failed: Insufficient permissions');
    }
    
    if (status === 429 || errorCode === 10004) {
      throw new Error('TikTok rate limit exceeded: Too many requests');
    }
    
    if (errorCode === 10001) {
      throw new Error('TikTok API Error: Invalid parameters');
    }
    
    // Generic error
    throw new Error(`TikTok API failed (${status || errorCode}): ${errorMessage}`);
  }

  // ============================================
  // OAUTH & AUTHORIZATION
  // ============================================

  /**
   * Get OAuth authorization URL for shop connection
   * User is redirected to TikTok to authorize the app
   * 
   * @param {string} userId - Internal user ID (passed as state)
   * @returns {string} Authorization URL
   */
  getAuthorizationUrl(userId) {
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    
    const params = new URLSearchParams({
      app_key: this.appKey,
      state: state,
      redirect_uri: this.redirectUri
    });
    
    return `https://services.tiktokshop.com/open/authorize?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   * Called after user authorizes the app
   * 
   * @param {string} authCode - Authorization code from OAuth callback
   * @returns {Promise<object>} Token data (access_token, refresh_token, expires_in)
   */
  async getAccessToken(authCode) {
    const path = '/api/token/get';
    const timestamp = Math.floor(Date.now() / 1000);
    
    const body = {
      app_key: this.appKey,
      app_secret: this.appSecret,
      auth_code: authCode,
      grant_type: 'authorized_code'
    };
    
    const signature = this.generateSignature(path, timestamp, '', body);
    
    try {
      const response = await axios.post(
        `${this.baseUrl}${path}`,
        body,
        {
          params: {
            app_key: this.appKey,
            timestamp: timestamp,
            sign: signature
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.code !== 0) {
        throw new Error(`Token exchange failed: ${response.data.message}`);
      }
      
      return response.data.data;
      
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to get access token: ${message}`);
    }
  }

  /**
   * Refresh expired access token using refresh token
   * 
   * @param {string} refreshToken - Refresh token from database
   * @returns {Promise<object>} New token data
   */
  async refreshAccessToken(refreshToken) {
    const path = '/api/token/refresh';
    const timestamp = Math.floor(Date.now() / 1000);
    
    const body = {
      app_key: this.appKey,
      app_secret: this.appSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    };
    
    const signature = this.generateSignature(path, timestamp, '', body);
    
    try {
      const response = await axios.post(
        `${this.baseUrl}${path}`,
        body,
        {
          params: {
            app_key: this.appKey,
            timestamp: timestamp,
            sign: signature
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data.code !== 0) {
        throw new Error(`Token refresh failed: ${response.data.message}`);
      }
      
      return response.data.data;
      
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      throw new Error(`Failed to refresh token: ${message}`);
    }
  }

  /**
   * Get valid access token for a shop
   * Automatically refreshes if expired
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @returns {Promise<string>} Valid access token
   */
  async getShopAccessToken(shopId, userId) {
    // Get shop credentials from database
    const [shops] = await db.execute(
      'SELECT access_token, refresh_token, token_expires_at FROM tiktok_user_shops WHERE shop_id = ? AND user_id = ? AND is_active = 1',
      [shopId, userId]
    );
    
    if (shops.length === 0) {
      throw new Error('Shop not found or not authorized');
    }
    
    const shop = shops[0];
    const now = new Date();
    const expiresAt = new Date(shop.token_expires_at);
    
    // Check if token is still valid (with 5-minute buffer)
    const bufferTime = 5 * 60 * 1000; // 5 minutes
    if (expiresAt.getTime() - now.getTime() > bufferTime) {
      return shop.access_token;
    }
    
    // Token expired, refresh it
    console.log(`Refreshing TikTok access token for shop ${shopId}`);
    const tokenData = await this.refreshAccessToken(shop.refresh_token);
    
    // Update token in database
    const newExpiresAt = new Date(now.getTime() + (tokenData.expires_in * 1000));
    await db.execute(
      `UPDATE tiktok_user_shops 
       SET access_token = ?, refresh_token = ?, token_expires_at = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE shop_id = ? AND user_id = ?`,
      [tokenData.access_token, tokenData.refresh_token, newExpiresAt, shopId, userId]
    );
    
    return tokenData.access_token;
  }

  /**
   * Test API connection
   * Validates credentials and connectivity
   * 
   * @returns {Promise<object>} Connection status
   */
  async testConnection() {
    try {
      // TikTok doesn't have a simple "ping" endpoint
      // We'll just verify that credentials are configured
      if (!this.appKey || !this.appSecret) {
        return {
          success: false,
          message: 'TikTok credentials not configured'
        };
      }
      
      return {
        success: true,
        message: 'TikTok API credentials configured',
        app_key: this.appKey
      };
      
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // ============================================
  // SHOP MANAGEMENT
  // ============================================

  /**
   * Get shop information
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @returns {Promise<object>} Shop details
   */
  async getShopInfo(shopId, userId) {
    const accessToken = await this.getShopAccessToken(shopId, userId);
    const path = '/api/shop/get_authorized_shop';
    
    return await this.makeRequest('GET', path, accessToken);
  }

  /**
   * Get shop warehouses
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @returns {Promise<Array>} List of warehouses
   */
  async getWarehouses(shopId, userId) {
    const accessToken = await this.getShopAccessToken(shopId, userId);
    const path = '/api/logistics/get_warehouse_list';
    
    return await this.makeRequest('GET', path, accessToken);
  }

  // ============================================
  // PRODUCT MANAGEMENT
  // ============================================

  /**
   * List products in shop
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @param {object} params - Query parameters (page_number, page_size, search_status)
   * @returns {Promise<object>} Product list with pagination
   */
  async listProducts(shopId, userId, params = {}) {
    const accessToken = await this.getShopAccessToken(shopId, userId);
    const path = '/api/products/search';
    
    const queryParams = {
      page_number: params.page_number || 1,
      page_size: params.page_size || 20,
      search_status: params.search_status || 0 // 0: all, 1: live, 2: frozen
    };
    
    return await this.makeRequest('POST', path, accessToken, queryParams);
  }

  /**
   * Get detailed product information
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @param {string} productId - TikTok product ID
   * @returns {Promise<object>} Product details
   */
  async getProduct(shopId, userId, productId) {
    const accessToken = await this.getShopAccessToken(shopId, userId);
    const path = '/api/products/details';
    
    return await this.makeRequest('GET', path, accessToken, null, { product_id: productId });
  }

  /**
   * Create a new product
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @param {object} productData - Product details
   * @returns {Promise<object>} Created product info
   */
  async createProduct(shopId, userId, productData) {
    const accessToken = await this.getShopAccessToken(shopId, userId);
    const path = '/api/products/create';
    
    // TikTok requires specific product structure
    const product = {
      title: productData.title,
      description: productData.description,
      category_id: productData.category_id,
      brand_id: productData.brand_id || null,
      main_images: productData.main_images || [], // Array of image objects
      skus: productData.skus || [], // Array of SKU objects with price, stock, etc.
      package_weight: productData.package_weight || null,
      package_dimensions: productData.package_dimensions || null,
      ...productData // Include any additional fields
    };
    
    return await this.makeRequest('POST', path, accessToken, product);
  }

  /**
   * Update existing product
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @param {string} productId - TikTok product ID
   * @param {object} productData - Updated product details
   * @returns {Promise<object>} Update result
   */
  async updateProduct(shopId, userId, productId, productData) {
    const accessToken = await this.getShopAccessToken(shopId, userId);
    const path = '/api/products/update';
    
    const updateData = {
      product_id: productId,
      ...productData
    };
    
    return await this.makeRequest('PUT', path, accessToken, updateData);
  }

  /**
   * Delete/deactivate product
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @param {string} productId - TikTok product ID
   * @returns {Promise<object>} Deletion result
   */
  async deleteProduct(shopId, userId, productId) {
    const accessToken = await this.getShopAccessToken(shopId, userId);
    const path = '/api/products/inactivated_products';
    
    const data = {
      product_ids: [productId]
    };
    
    return await this.makeRequest('POST', path, accessToken, data);
  }

  /**
   * Get product categories
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Category list
   */
  async getCategories(shopId, userId) {
    const accessToken = await this.getShopAccessToken(shopId, userId);
    const path = '/api/products/categories';
    
    return await this.makeRequest('GET', path, accessToken);
  }

  /**
   * Get product brands (optional)
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Brand list
   */
  async getBrands(shopId, userId) {
    const accessToken = await this.getShopAccessToken(shopId, userId);
    const path = '/api/products/brands';
    
    return await this.makeRequest('GET', path, accessToken);
  }

  // ============================================
  // INVENTORY MANAGEMENT
  // ============================================

  /**
   * Update product inventory/stock
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @param {string} productId - TikTok product ID
   * @param {string} skuId - SKU ID
   * @param {number} quantity - New stock quantity
   * @returns {Promise<object>} Update result
   */
  async updateInventory(shopId, userId, productId, skuId, quantity) {
    const accessToken = await this.getShopAccessToken(shopId, userId);
    const path = '/api/products/stocks/update';
    
    const data = {
      product_id: productId,
      skus: [
        {
          id: skuId,
          available_stock: quantity
        }
      ]
    };
    
    return await this.makeRequest('POST', path, accessToken, data);
  }

  /**
   * Bulk update inventory for multiple SKUs
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @param {Array} stockUpdates - Array of {product_id, sku_id, quantity}
   * @returns {Promise<object>} Bulk update result
   */
  async bulkUpdateInventory(shopId, userId, stockUpdates) {
    const results = [];
    
    // Group updates by product_id
    const groupedUpdates = stockUpdates.reduce((acc, update) => {
      if (!acc[update.product_id]) {
        acc[update.product_id] = [];
      }
      acc[update.product_id].push({
        id: update.sku_id,
        available_stock: update.quantity
      });
      return acc;
    }, {});
    
    // Update each product's SKUs
    for (const [productId, skus] of Object.entries(groupedUpdates)) {
      try {
        const result = await this.updateInventory(shopId, userId, productId, skus[0].id, skus[0].available_stock);
        results.push({ product_id: productId, success: true, result });
      } catch (error) {
        results.push({ product_id: productId, success: false, error: error.message });
      }
    }
    
    return { results };
  }

  // ============================================
  // ORDER MANAGEMENT
  // ============================================

  /**
   * Get orders with filtering
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @param {object} params - Query parameters
   * @returns {Promise<object>} Order list
   */
  async getOrders(shopId, userId, params = {}) {
    const accessToken = await this.getShopAccessToken(shopId, userId);
    const path = '/api/orders/search';
    
    const queryParams = {
      page_number: params.page_number || 1,
      page_size: params.page_size || 50,
      order_status: params.order_status || null, // 100: unpaid, 111: awaiting_shipment, 112: awaiting_collection, 114: in_transit, 122: delivered, 130: completed, 140: cancelled
      create_time_from: params.create_time_from || null,
      create_time_to: params.create_time_to || null
    };
    
    return await this.makeRequest('POST', path, accessToken, queryParams);
  }

  /**
   * Get order details
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @param {string} orderId - TikTok order ID
   * @returns {Promise<object>} Order details
   */
  async getOrderDetail(shopId, userId, orderId) {
    const accessToken = await this.getShopAccessToken(shopId, userId);
    const path = '/api/orders/detail/query';
    
    return await this.makeRequest('POST', path, accessToken, { order_id_list: [orderId] });
  }

  /**
   * Ship an order (fulfill)
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @param {string} orderId - TikTok order ID
   * @param {object} shipmentInfo - Tracking info
   * @returns {Promise<object>} Shipping result
   */
  async shipOrder(shopId, userId, orderId, shipmentInfo) {
    const accessToken = await this.getShopAccessToken(shopId, userId);
    const path = '/api/fulfillment/rts';
    
    const data = {
      order_id: orderId,
      tracking_number: shipmentInfo.tracking_number,
      shipping_provider_id: shipmentInfo.shipping_provider_id,
      ...shipmentInfo
    };
    
    return await this.makeRequest('POST', path, accessToken, data);
  }

  /**
   * Cancel an order
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @param {string} orderId - TikTok order ID
   * @param {string} cancelReason - Reason for cancellation
   * @returns {Promise<object>} Cancellation result
   */
  async cancelOrder(shopId, userId, orderId, cancelReason) {
    const accessToken = await this.getShopAccessToken(shopId, userId);
    const path = '/api/orders/cancel';
    
    const data = {
      order_id: orderId,
      cancel_reason: cancelReason
    };
    
    return await this.makeRequest('POST', path, accessToken, data);
  }

  // ============================================
  // RETURNS MANAGEMENT
  // ============================================

  /**
   * Get returns/refunds
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @param {object} params - Query parameters
   * @returns {Promise<object>} Returns list
   */
  async getReturns(shopId, userId, params = {}) {
    const accessToken = await this.getShopAccessToken(shopId, userId);
    const path = '/api/reverse/reverse_request/list';
    
    const queryParams = {
      page_number: params.page_number || 1,
      page_size: params.page_size || 50,
      create_time_from: params.create_time_from || null,
      create_time_to: params.create_time_to || null
    };
    
    return await this.makeRequest('POST', path, accessToken, queryParams);
  }

  /**
   * Get return details
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @param {string} returnId - Return request ID
   * @returns {Promise<object>} Return details
   */
  async getReturnDetail(shopId, userId, returnId) {
    const accessToken = await this.getShopAccessToken(shopId, userId);
    const path = '/api/reverse/reverse_request/detail';
    
    return await this.makeRequest('GET', path, accessToken, null, { reverse_request_id: returnId });
  }

  /**
   * Approve return request
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @param {string} returnId - Return request ID
   * @returns {Promise<object>} Approval result
   */
  async approveReturn(shopId, userId, returnId) {
    const accessToken = await this.getShopAccessToken(shopId, userId);
    const path = '/api/reverse/reverse_request/confirm';
    
    const data = {
      reverse_request_id: returnId,
      action: 'APPROVE'
    };
    
    return await this.makeRequest('POST', path, accessToken, data);
  }

  /**
   * Reject return request
   * 
   * @param {string} shopId - TikTok shop ID
   * @param {number} userId - User ID
   * @param {string} returnId - Return request ID
   * @param {string} rejectReason - Reason for rejection
   * @returns {Promise<object>} Rejection result
   */
  async rejectReturn(shopId, userId, returnId, rejectReason) {
    const accessToken = await this.getShopAccessToken(shopId, userId);
    const path = '/api/reverse/reverse_request/confirm';
    
    const data = {
      reverse_request_id: returnId,
      action: 'REJECT',
      reject_reason: rejectReason
    };
    
    return await this.makeRequest('POST', path, accessToken, data);
  }

  // ============================================
  // CORPORATE SHOP METHODS (Brakebee TikTok Shop)
  // ============================================

  /**
   * Get Brakebee corporate shop access token
   * Uses a dedicated admin shop connection
   * 
   * @returns {Promise<string>} Corporate shop access token
   */
  async getCorporateShopToken() {
    // Query for Brakebee's corporate shop connection
    // Look for a shop with a special marker (e.g., shop_name = 'Brakebee Corporate' or user_id = 1)
    const [shops] = await db.execute(
      `SELECT shop_id, access_token, refresh_token, token_expires_at 
       FROM tiktok_user_shops 
       WHERE shop_name LIKE '%Brakebee%' OR shop_name LIKE '%Corporate%'
       AND is_active = 1 
       ORDER BY created_at DESC 
       LIMIT 1`
    );
    
    if (shops.length === 0) {
      throw new Error('Corporate TikTok Shop not configured. Please connect Brakebee corporate shop first.');
    }
    
    const shop = shops[0];
    const now = new Date();
    const expiresAt = new Date(shop.token_expires_at);
    
    // Check if token is still valid (with 5-minute buffer)
    const bufferTime = 5 * 60 * 1000;
    if (expiresAt.getTime() - now.getTime() > bufferTime) {
      return { shop_id: shop.shop_id, access_token: shop.access_token };
    }
    
    // Token expired, refresh it
    console.log('Refreshing corporate TikTok shop access token');
    const tokenData = await this.refreshAccessToken(shop.refresh_token);
    
    // Update token in database
    const newExpiresAt = new Date(now.getTime() + (tokenData.expires_in * 1000));
    await db.execute(
      `UPDATE tiktok_user_shops 
       SET access_token = ?, refresh_token = ?, token_expires_at = ?, updated_at = CURRENT_TIMESTAMP 
       WHERE shop_id = ?`,
      [tokenData.access_token, tokenData.refresh_token, newExpiresAt, shop.shop_id]
    );
    
    return { shop_id: shop.shop_id, access_token: tokenData.access_token };
  }

  /**
   * Sync corporate product to Brakebee TikTok Shop
   * Uses corporate shop credentials (not user OAuth)
   * 
   * @param {number} productId - Internal product ID
   * @param {object} productData - Product details from database
   * @returns {Promise<object>} Sync result with TikTok product ID
   */
  async syncCorporateProduct(productId, productData) {
    try {
      // Get corporate shop credentials
      const { shop_id, access_token } = await this.getCorporateShopToken();
      
      // Format product data for TikTok API
      const tiktokProduct = {
        title: productData.corporate_title || productData.name,
        description: productData.corporate_description || productData.description || '',
        category_id: productData.corporate_category_id || null,
        brand_id: productData.corporate_brand || null,
        main_images: [],
        skus: [
          {
            seller_sku: `CORP-${productId}`, // Corporate SKU prefix
            price: {
              amount: Math.round((productData.corporate_price || productData.price) * 100), // Convert to cents
              currency: 'USD'
            },
            stock_infos: [
              {
                available_stock: productData.inventory_count || 0
              }
            ]
          }
        ],
        package_weight: {
          value: productData.weight || 1,
          unit: productData.weight_unit || 'POUND'
        }
      };
      
      // Add main image if available
      if (productData.corporate_main_image_url || productData.primary_image) {
        tiktokProduct.main_images.push({
          url: productData.corporate_main_image_url || productData.primary_image
        });
      }
      
      // Add additional images if available
      if (productData.corporate_additional_images) {
        try {
          const additionalImages = typeof productData.corporate_additional_images === 'string' 
            ? JSON.parse(productData.corporate_additional_images) 
            : productData.corporate_additional_images;
          
          if (Array.isArray(additionalImages)) {
            additionalImages.forEach(img => {
              tiktokProduct.main_images.push({ url: img });
            });
          }
        } catch (e) {
          console.error('Error parsing additional images:', e);
        }
      }
      
      // Check if product already exists on TikTok
      let result;
      if (productData.tiktok_product_id) {
        // Update existing product
        result = await this.updateProduct(
          shop_id, 
          null, // No userId for corporate shop
          productData.tiktok_product_id, 
          tiktokProduct
        );
        result.action = 'updated';
      } else {
        // Create new product
        result = await this.createProduct(
          shop_id, 
          null, // No userId for corporate shop
          tiktokProduct
        );
        result.action = 'created';
      }
      
      return {
        success: true,
        tiktok_product_id: result.product_id || productData.tiktok_product_id,
        tiktok_sku_id: result.sku_id || null,
        action: result.action
      };
      
    } catch (error) {
      console.error('Corporate product sync error:', error);
      throw new Error(`Failed to sync corporate product: ${error.message}`);
    }
  }

  /**
   * Update corporate product inventory on TikTok Shop
   * 
   * @param {string} tiktokProductId - TikTok product ID
   * @param {string} tiktokSkuId - TikTok SKU ID
   * @param {number} quantity - New stock quantity
   * @returns {Promise<object>} Update result
   */
  async updateCorporateInventory(tiktokProductId, tiktokSkuId, quantity) {
    try {
      const { shop_id, access_token } = await this.getCorporateShopToken();
      
      return await this.updateInventory(
        shop_id,
        null, // No userId for corporate shop
        tiktokProductId,
        tiktokSkuId,
        quantity
      );
    } catch (error) {
      console.error('Corporate inventory update error:', error);
      throw new Error(`Failed to update corporate inventory: ${error.message}`);
    }
  }

  /**
   * Remove corporate product from Brakebee TikTok Shop
   * 
   * @param {string} tiktokProductId - TikTok product ID
   * @returns {Promise<object>} Deletion result
   */
  async removeCorporateProduct(tiktokProductId) {
    try {
      const { shop_id, access_token } = await this.getCorporateShopToken();
      
      return await this.deleteProduct(
        shop_id,
        null, // No userId for corporate shop
        tiktokProductId
      );
    } catch (error) {
      console.error('Corporate product removal error:', error);
      throw new Error(`Failed to remove corporate product: ${error.message}`);
    }
  }
}

module.exports = new TikTokService();
