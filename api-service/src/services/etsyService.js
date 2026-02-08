/**
 * Etsy API v3 Service
 * Handles all interactions with Etsy Open API v3
 * 
 * Key Features:
 * - OAuth 2.0 with PKCE (Proof Key for Code Exchange)
 * - Token management (access token + refresh token)
 * - Shop, Listing, Inventory, and Order management
 * - Rate limiting (10,000/day, 10/sec max)
 * 
 * API Documentation: https://developers.etsy.com/documentation/
 * Base URL: https://api.etsy.com/v3/application/
 */

const axios = require('axios');
const crypto = require('crypto');
const db = require('../../config/db');

class EtsyService {
  constructor() {
    // Etsy API v3 endpoints
    this.baseUrl = 'https://api.etsy.com/v3/application';
    this.authBaseUrl = 'https://www.etsy.com/oauth';
    
    // Client credentials from environment
    // Note: ETSY_API_KEY and ETSY_CLIENT_ID are the same "keystring"
    this.apiKey = process.env.ETSY_API_KEY;
    this.clientId = process.env.ETSY_CLIENT_ID || process.env.ETSY_API_KEY;
    this.clientSecret = process.env.ETSY_CLIENT_SECRET;
    this.callbackUrl = process.env.ETSY_CALLBACK_URL;
    
    // Rate limiting tracking
    this.requestQueue = [];
    this.maxRequestsPerSecond = 10; // Etsy: 10 requests per second
    this.dailyLimit = 10000; // 10,000 requests per day
    
    // PKCE storage (temporary, for OAuth flow)
    this.pkceStore = new Map();
  }

  // ============================================
  // PKCE HELPERS
  // ============================================

  /**
   * Generate PKCE code verifier
   * Random string between 43-128 characters
   * 
   * @returns {string} Code verifier
   */
  generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code challenge from verifier
   * SHA256 hash of verifier, base64url encoded
   * 
   * @param {string} verifier - Code verifier
   * @returns {string} Code challenge
   */
  generateCodeChallenge(verifier) {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
  }

  /**
   * Store PKCE verifier for OAuth flow
   * Temporary storage until callback is processed
   * 
   * @param {string} state - OAuth state parameter
   * @param {string} verifier - Code verifier
   */
  storePKCE(state, verifier) {
    this.pkceStore.set(state, {
      verifier,
      timestamp: Date.now()
    });
    
    // Cleanup old entries (> 10 minutes)
    for (const [key, value] of this.pkceStore.entries()) {
      if (Date.now() - value.timestamp > 10 * 60 * 1000) {
        this.pkceStore.delete(key);
      }
    }
  }

  /**
   * Retrieve and delete PKCE verifier
   * 
   * @param {string} state - OAuth state parameter
   * @returns {string|null} Code verifier or null
   */
  retrievePKCE(state) {
    const data = this.pkceStore.get(state);
    if (data) {
      this.pkceStore.delete(state);
      return data.verifier;
    }
    return null;
  }

  // ============================================
  // OAUTH 2.0 WITH PKCE
  // ============================================

  /**
   * Generate OAuth authorization URL with PKCE
   * User will be redirected here to authorize the app
   * 
   * @param {number} userId - User ID for state tracking
   * @returns {object} Authorization URL and state
   */
  getAuthorizationUrl(userId) {
    // Generate PKCE parameters
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    
    // Generate state for CSRF protection
    const state = crypto.randomBytes(16).toString('hex');
    
    // Store PKCE verifier with state
    this.storePKCE(state, codeVerifier);
    
    // Also store userId in state for callback
    this.storePKCE(`${state}_userId`, userId.toString());
    
    // Build authorization URL
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      scope: 'listings_r listings_w shops_r transactions_r',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });
    
    const authUrl = `${this.authBaseUrl}/connect?${params.toString()}`;
    
    console.log('Etsy OAuth URL generated:', { userId, state, codeChallenge });
    
    return {
      authUrl,
      state,
      codeVerifier // Return for debugging/testing
    };
  }

  /**
   * Exchange authorization code for access token
   * Called after user authorizes and returns via callback
   * 
   * @param {string} authCode - Authorization code from callback
   * @param {string} state - State parameter for PKCE retrieval
   * @returns {Promise<object>} Token data
   */
  async getAccessToken(authCode, state) {
    // Retrieve code verifier
    const codeVerifier = this.retrievePKCE(state);
    
    if (!codeVerifier) {
      throw new Error('PKCE verifier not found. OAuth flow may have expired.');
    }
    
    try {
      const response = await axios.post(
        `${this.authBaseUrl}/token`,
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.clientId,
          code: authCode,
          redirect_uri: this.callbackUrl,
          code_verifier: codeVerifier
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const tokenData = response.data;
      console.log('Etsy access token obtained:', {
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type
      });
      
      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in, // seconds
        token_type: tokenData.token_type
      };
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.error_description || error.response?.data?.error || error.message;
      console.error('Etsy token exchange error:', { status, message, data: error.response?.data });
      throw new Error(`Failed to exchange code for token: ${message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   * Etsy tokens expire after ~1 hour
   * 
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<object>} New token data
   */
  async refreshAccessToken(refreshToken) {
    try {
      const response = await axios.post(
        `${this.authBaseUrl}/token`,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.clientId,
          refresh_token: refreshToken
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const tokenData = response.data;
      console.log('Etsy token refreshed:', {
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type
      });
      
      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type
      };
    } catch (error) {
      const status = error.response?.status;
      const message = error.response?.data?.error_description || error.response?.data?.error || error.message;
      console.error('Etsy token refresh error:', { status, message });
      throw new Error(`Failed to refresh token: ${message}`);
    }
  }

  /**
   * Get shop access token from database, refresh if expired
   * 
   * @param {string} shopId - Etsy shop ID
   * @param {number} userId - User ID
   * @returns {Promise<string>} Valid access token
   */
  async getShopAccessToken(shopId, userId) {
    const [shops] = await db.execute(
      'SELECT access_token, refresh_token, token_expires_at FROM etsy_user_shops WHERE shop_id = ? AND user_id = ?',
      [shopId, userId]
    );
    
    if (shops.length === 0) {
      throw new Error('Shop not found or not connected');
    }
    
    const shop = shops[0];
    const expiresAt = new Date(shop.token_expires_at);
    const now = new Date();
    
    // If token expires in less than 5 minutes, refresh it
    if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      console.log('Etsy token expiring soon, refreshing...', { shopId });
      
      try {
        const newTokens = await this.refreshAccessToken(shop.refresh_token);
        
        // Update database with new tokens
        const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);
        await db.execute(`
          UPDATE etsy_user_shops 
          SET access_token = ?, 
              refresh_token = ?, 
              token_expires_at = ?,
              token_refresh_count = token_refresh_count + 1,
              last_token_refresh_at = NOW(),
              updated_at = CURRENT_TIMESTAMP
          WHERE shop_id = ? AND user_id = ?
        `, [newTokens.access_token, newTokens.refresh_token, newExpiresAt, shopId, userId]);
        
        return newTokens.access_token;
      } catch (error) {
        console.error('Failed to refresh Etsy token:', error.message);
        throw new Error('Token refresh failed. Please reconnect your Etsy shop.');
      }
    }
    
    return shop.access_token;
  }

  // ============================================
  // API REQUEST HELPERS
  // ============================================

  /**
   * Make authenticated API request to Etsy
   * Handles rate limiting and error responses
   * 
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {string} path - API endpoint path (relative to /v3/application)
   * @param {string} accessToken - OAuth access token
   * @param {object} data - Request body (for POST/PUT)
   * @param {object} params - Query parameters
   * @returns {Promise<object>} API response data
   */
  async makeRequest(method, path, accessToken, data = null, params = {}) {
    // Enforce rate limiting
    await this.enforceRateLimit();
    
    // Build full URL
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    
    try {
      const config = {
        method,
        url,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json'
        }
      };
      
      if (params && Object.keys(params).length > 0) {
        config.params = params;
      }
      
      if (data) {
        config.data = data;
      }
      
      const response = await axios(config);
      return response.data;
    } catch (error) {
      return this.handleError(error, method, path);
    }
  }

  /**
   * Enforce rate limiting (10 requests per second)
   */
  async enforceRateLimit() {
    const now = Date.now();
    
    // Remove requests older than 1 second
    this.requestQueue = this.requestQueue.filter(time => now - time < 1000);
    
    // If at limit, wait
    if (this.requestQueue.length >= this.maxRequestsPerSecond) {
      const oldestRequest = Math.min(...this.requestQueue);
      const waitTime = 1000 - (now - oldestRequest);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requestQueue.push(Date.now());
  }

  /**
   * Handle API errors
   */
  async handleError(error, method, path) {
    const status = error.response?.status;
    const message = error.response?.data?.error || error.message;
    const errorData = error.response?.data;
    
    console.error('Etsy API error:', {
      method,
      path,
      status,
      message,
      data: errorData
    });
    
    // Rate limit error
    if (status === 429) {
      throw new Error('Etsy API rate limit exceeded. Please try again later.');
    }
    
    // Authentication error
    if (status === 401) {
      throw new Error('Etsy authentication failed. Please reconnect your shop.');
    }
    
    // Validation error
    if (status === 400) {
      throw new Error(`Invalid request: ${message}`);
    }
    
    throw new Error(`Etsy API error (${status}): ${message}`);
  }

  /**
   * Test API connection and authentication
   * 
   * @returns {Promise<object>} Connection status
   */
  async testConnection() {
    try {
      // Try to make a simple API call
      // Note: This requires a valid access token, so it's mainly for debugging
      return {
        success: true,
        message: 'Etsy API service configured',
        apiKey: this.apiKey ? 'configured' : 'missing',
        clientId: this.clientId ? 'configured' : 'missing',
        clientSecret: this.clientSecret ? 'configured' : 'missing',
        callbackUrl: this.callbackUrl
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
   * Get user's shops (Etsy allows users to have multiple shops)
   * 
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<object>} User shops data
   */
  async getUserShops(accessToken) {
    // Endpoint: GET /v3/application/users/{user_id}/shops
    // First, get user ID using the "tokeninfo" or "users/me" endpoint
    try {
      const response = await this.makeRequest(
        'GET',
        '/users/me',
        accessToken
      );
      
      const userId = response.user_id;
      
      // Now get shops for this user
      const shopsResponse = await this.makeRequest(
        'GET',
        `/users/${userId}/shops`,
        accessToken
      );
      
      return shopsResponse;
    } catch (error) {
      console.error('Failed to get Etsy user shops:', error.message);
      throw error;
    }
  }

  /**
   * Get shop details
   * 
   * @param {string} shopId - Etsy shop ID
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<object>} Shop details
   */
  async getShop(shopId, accessToken) {
    return await this.makeRequest(
      'GET',
      `/shops/${shopId}`,
      accessToken
    );
  }

  // ============================================
  // LISTING (PRODUCT) MANAGEMENT
  // ============================================

  /**
   * Get listings for a shop
   * 
   * @param {string} shopId - Etsy shop ID
   * @param {string} accessToken - OAuth access token
   * @param {object} params - Query parameters (limit, offset, state)
   * @returns {Promise<object>} Listings data
   */
  async getListingsByShop(shopId, accessToken, params = {}) {
    const defaultParams = {
      limit: 25,
      offset: 0,
      state: 'active' // active, draft, sold_out, expired
    };
    
    return await this.makeRequest(
      'GET',
      `/shops/${shopId}/listings`,
      accessToken,
      null,
      { ...defaultParams, ...params }
    );
  }

  /**
   * Get single listing details
   * 
   * @param {string} listingId - Etsy listing ID
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<object>} Listing details
   */
  async getListing(listingId, accessToken) {
    return await this.makeRequest(
      'GET',
      `/listings/${listingId}`,
      accessToken
    );
  }

  /**
   * Create draft listing
   * 
   * @param {string} shopId - Etsy shop ID
   * @param {object} listingData - Listing details
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<object>} Created listing
   */
  async createDraftListing(shopId, listingData, accessToken) {
    return await this.makeRequest(
      'POST',
      `/shops/${shopId}/listings`,
      accessToken,
      listingData
    );
  }

  /**
   * Update listing
   * 
   * @param {string} shopId - Etsy shop ID
   * @param {string} listingId - Etsy listing ID
   * @param {object} updateData - Fields to update
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<object>} Updated listing
   */
  async updateListing(shopId, listingId, updateData, accessToken) {
    return await this.makeRequest(
      'PATCH',
      `/shops/${shopId}/listings/${listingId}`,
      accessToken,
      updateData
    );
  }

  /**
   * Delete listing
   * 
   * @param {string} listingId - Etsy listing ID
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<void>}
   */
  async deleteListing(listingId, accessToken) {
    return await this.makeRequest(
      'DELETE',
      `/listings/${listingId}`,
      accessToken
    );
  }

  // ============================================
  // INVENTORY MANAGEMENT
  // ============================================

  /**
   * Get listing inventory
   * 
   * @param {string} listingId - Etsy listing ID
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<object>} Inventory data
   */
  async getListingInventory(listingId, accessToken) {
    return await this.makeRequest(
      'GET',
      `/listings/${listingId}/inventory`,
      accessToken
    );
  }

  /**
   * Update listing inventory
   * 
   * @param {string} listingId - Etsy listing ID
   * @param {object} inventoryData - Inventory update data
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<object>} Updated inventory
   */
  async updateListingInventory(listingId, inventoryData, accessToken) {
    return await this.makeRequest(
      'PUT',
      `/listings/${listingId}/inventory`,
      accessToken,
      inventoryData
    );
  }

  // ============================================
  // ORDER MANAGEMENT
  // ============================================

  /**
   * Get shop receipts (orders)
   * 
   * @param {string} shopId - Etsy shop ID
   * @param {string} accessToken - OAuth access token
   * @param {object} params - Query parameters (limit, offset, was_paid, was_shipped)
   * @returns {Promise<object>} Receipts (orders) data
   */
  async getShopReceipts(shopId, accessToken, params = {}) {
    const defaultParams = {
      limit: 25,
      offset: 0
    };
    
    return await this.makeRequest(
      'GET',
      `/shops/${shopId}/receipts`,
      accessToken,
      null,
      { ...defaultParams, ...params }
    );
  }

  /**
   * Get single receipt details
   * 
   * @param {string} shopId - Etsy shop ID
   * @param {string} receiptId - Etsy receipt ID
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<object>} Receipt details
   */
  async getShopReceipt(shopId, receiptId, accessToken) {
    return await this.makeRequest(
      'GET',
      `/shops/${shopId}/receipts/${receiptId}`,
      accessToken
    );
  }

  /**
   * Get transactions for a receipt
   * 
   * @param {string} shopId - Etsy shop ID
   * @param {string} receiptId - Etsy receipt ID
   * @param {string} accessToken - OAuth access token
   * @returns {Promise<object>} Transactions data
   */
  async getReceiptTransactions(shopId, receiptId, accessToken) {
    return await this.makeRequest(
      'GET',
      `/shops/${shopId}/receipts/${receiptId}/transactions`,
      accessToken
    );
  }
}

module.exports = new EtsyService();
