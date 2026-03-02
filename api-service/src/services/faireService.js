/**
 * Faire API Service
 * Handles all interactions with Faire's Brand API (v2).
 *
 * OAuth 2.0 Authorization Code Grant:
 *   - Access tokens expire (~1 hour), refresh tokens available
 *   - Token exchange at https://www.faire.com/oauth2/token
 *   - Authorization: https://www.faire.com/oauth2/authorize
 *
 * API Base: https://www.faire.com/api/v2/
 * API Docs: https://www.faire.com/brand-api
 */

const axios = require('axios');
const db = require('../../config/db');
const { encrypt, decrypt } = require('../utils/encryption');
const { validateConnectorEnv } = require('../utils/connectorEnv');

class FaireService {
  constructor() {
    validateConnectorEnv('faire');

    this.clientId = process.env.FAIRE_CLIENT_ID;
    this.clientSecret = process.env.FAIRE_CLIENT_SECRET;
    this.callbackUrl = process.env.FAIRE_CALLBACK_URL ||
      `${process.env.API_BASE_URL}/api/v2/catalog/faire/oauth/callback`;
    this.scopes = process.env.FAIRE_SCOPES ||
      'READ_BRAND WRITE_BRAND READ_PRODUCTS WRITE_PRODUCTS READ_ORDERS WRITE_ORDERS READ_INVENTORIES WRITE_INVENTORIES';

    this.authBaseUrl = 'https://www.faire.com/oauth2';
    this.apiBaseUrl = 'https://www.faire.com/api/v2';
  }

  // ──────────────────────────────────────────────
  // OAUTH
  // ──────────────────────────────────────────────

  getAuthorizationUrl(userId) {
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      response_type: 'code',
      scope: this.scopes,
      state
    });
    return `${this.authBaseUrl}/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code) {
    const response = await axios.post(`${this.authBaseUrl}/token`, new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.callbackUrl
    }).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async refreshAccessToken(refreshToken) {
    const response = await axios.post(`${this.authBaseUrl}/token`, new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId,
      client_secret: this.clientSecret
    }).toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    return response.data;
  }

  async getShopAccessToken(shopId, userId) {
    const [shops] = await db.execute(
      'SELECT access_token, refresh_token, token_expires_at FROM faire_user_shops WHERE shop_id = ? AND user_id = ?',
      [shopId, userId]
    );
    if (shops.length === 0) throw new Error('Faire brand not found or not connected');

    const shop = shops[0];
    const accessToken = decrypt(shop.access_token);
    const refreshToken = decrypt(shop.refresh_token);
    const expiresAt = new Date(shop.token_expires_at);

    if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
      const newTokens = await this.refreshAccessToken(refreshToken);
      const newExpiresAt = new Date(Date.now() + (newTokens.expires_in || 3600) * 1000);

      await db.execute(`
        UPDATE faire_user_shops
        SET access_token = ?, refresh_token = COALESCE(?, refresh_token),
            token_expires_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE shop_id = ? AND user_id = ?
      `, [
        encrypt(newTokens.access_token),
        newTokens.refresh_token ? encrypt(newTokens.refresh_token) : null,
        newExpiresAt, shopId, userId
      ]);

      return newTokens.access_token;
    }

    return accessToken;
  }

  // ──────────────────────────────────────────────
  // API REQUEST HELPERS
  // ──────────────────────────────────────────────

  async makeRequest(method, path, accessToken, data = null, params = {}) {
    const url = path.startsWith('http') ? path : `${this.apiBaseUrl}${path}`;

    try {
      const config = {
        method, url,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-FAIRE-ACCESS-TOKEN': accessToken
        }
      };
      if (params && Object.keys(params).length > 0) config.params = params;
      if (data) config.data = data;

      const response = await axios(config);
      return response.data;
    } catch (error) {
      return this.handleError(error, method, path);
    }
  }

  handleError(error, method, path) {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.response?.data?.error || error.message;

    console.error('Faire API error:', { method, path, status, message });

    if (status === 429) throw new Error('Faire API rate limit exceeded. Please try again later.');
    if (status === 401) throw new Error('Faire authentication failed. Please reconnect your brand.');
    if (status === 403) throw new Error('Faire access forbidden. Please check your permissions.');

    throw new Error(`Faire API error (${status}): ${message}`);
  }

  // ──────────────────────────────────────────────
  // BRAND INFO
  // ──────────────────────────────────────────────

  async getBrandInfo(accessToken) {
    return await this.makeRequest('GET', '/brand', accessToken);
  }

  // ──────────────────────────────────────────────
  // PRODUCTS
  // ──────────────────────────────────────────────

  async listProducts(accessToken, params = {}) {
    return await this.makeRequest('GET', '/products', accessToken, null, {
      limit: 50,
      ...params
    });
  }

  async getProduct(accessToken, productId) {
    return await this.makeRequest('GET', `/products/${productId}`, accessToken);
  }

  async createProduct(accessToken, productData) {
    return await this.makeRequest('POST', '/products', accessToken, productData);
  }

  async updateProduct(accessToken, productId, productData) {
    return await this.makeRequest('PATCH', `/products/${productId}`, accessToken, productData);
  }

  async deleteProduct(accessToken, productId) {
    return await this.makeRequest('DELETE', `/products/${productId}`, accessToken);
  }

  // ──────────────────────────────────────────────
  // PRODUCT OPTIONS (variants)
  // ──────────────────────────────────────────────

  async listProductOptions(accessToken, productId) {
    return await this.makeRequest('GET', `/products/${productId}/options`, accessToken);
  }

  async updateProductOption(accessToken, optionId, optionData) {
    return await this.makeRequest('PATCH', `/options/${optionId}`, accessToken, optionData);
  }

  // ──────────────────────────────────────────────
  // INVENTORY
  // ──────────────────────────────────────────────

  async getInventoryLevels(accessToken, params = {}) {
    return await this.makeRequest('GET', '/inventories', accessToken, null, params);
  }

  async updateInventory(accessToken, optionId, inventoryData) {
    return await this.makeRequest('PATCH', `/options/${optionId}`, accessToken, {
      available_quantity: inventoryData.quantity
    });
  }

  // ──────────────────────────────────────────────
  // ORDERS
  // ──────────────────────────────────────────────

  async listOrders(accessToken, params = {}) {
    return await this.makeRequest('GET', '/orders', accessToken, null, {
      limit: 50,
      ...params
    });
  }

  async getOrder(accessToken, orderId) {
    return await this.makeRequest('GET', `/orders/${orderId}`, accessToken);
  }

  async acceptOrder(accessToken, orderId) {
    return await this.makeRequest('PUT', `/orders/${orderId}/processing`, accessToken);
  }

  // ──────────────────────────────────────────────
  // SHIPMENTS
  // ──────────────────────────────────────────────

  async createShipment(accessToken, orderId, shipmentData) {
    return await this.makeRequest('POST', `/orders/${orderId}/shipments`, accessToken, shipmentData);
  }

  async getShipments(accessToken, orderId) {
    return await this.makeRequest('GET', `/orders/${orderId}/shipments`, accessToken);
  }

  // ──────────────────────────────────────────────
  // CONNECTION TEST
  // ──────────────────────────────────────────────

  async testConnection() {
    return {
      success: true,
      message: 'Faire API service configured',
      clientId: this.clientId ? 'configured' : 'missing',
      callbackUrl: this.callbackUrl
    };
  }
}

module.exports = new FaireService();
