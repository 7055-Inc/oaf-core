/**
 * Amazon Selling Partner API (SP-API) Service
 * Handles all interactions with Amazon's SP-API.
 *
 * OAuth via Login with Amazon (LWA):
 *   - Access tokens expire (1 hour), refresh tokens do not expire
 *   - Token exchange at https://api.amazon.com/auth/o2/token
 *   - Authorization via Seller Central: https://sellercentral.amazon.com/apps/authorize/consent
 *
 * Regional Endpoints:
 *   NA: https://sellingpartnerapi-na.amazon.com
 *   EU: https://sellingpartnerapi-eu.amazon.com
 *   FE: https://sellingpartnerapi-fe.amazon.com
 *
 * API Docs: https://developer-docs.amazon.com/sp-api/
 */

const axios = require('axios');
const db = require('../../config/db');
const { encrypt, decrypt } = require('../utils/encryption');
const { validateConnectorEnv } = require('../utils/connectorEnv');

const REGION_ENDPOINTS = {
  'us-east-1': 'https://sellingpartnerapi-na.amazon.com',
  'eu-west-1': 'https://sellingpartnerapi-eu.amazon.com',
  'us-west-2': 'https://sellingpartnerapi-fe.amazon.com'
};

const MARKETPLACE_IDS = {
  US: 'ATVPDKIKX0DER',
  CA: 'A2EUQ1WTGCTBG2',
  MX: 'A1AM78C64UM0Y8',
  UK: 'A1F83G8C2ARO7P',
  DE: 'A1PA6795UKMFR9',
  FR: 'A13V1IB3VIYZZH',
  JP: 'A1VC38T7YXB528',
  AU: 'A39IBJ37TRP1C6'
};

class AmazonService {
  constructor() {
    validateConnectorEnv('amazon');

    this.clientId = process.env.AMAZON_CLIENT_ID;
    this.clientSecret = process.env.AMAZON_CLIENT_SECRET;
    this.callbackUrl = process.env.AMAZON_CALLBACK_URL ||
      `${process.env.API_BASE_URL}/api/v2/catalog/amazon/oauth/callback`;

    const region = process.env.AMAZON_SPAPI_REGION || 'us-east-1';
    this.apiBaseUrl = REGION_ENDPOINTS[region] || REGION_ENDPOINTS['us-east-1'];
    this.marketplaceId = process.env.AMAZON_MARKETPLACE_ID || MARKETPLACE_IDS.US;
    this.tokenUrl = 'https://api.amazon.com/auth/o2/token';
  }

  // ──────────────────────────────────────────────
  // OAUTH (Login with Amazon)
  // ──────────────────────────────────────────────

  getAuthorizationUrl(userId) {
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    const params = new URLSearchParams({
      application_id: this.clientId,
      redirect_uri: this.callbackUrl,
      state
    });
    return `https://sellercentral.amazon.com/apps/authorize/consent?${params.toString()}`;
  }

  async exchangeCodeForToken(code) {
    const response = await axios.post(this.tokenUrl, new URLSearchParams({
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
    const response = await axios.post(this.tokenUrl, new URLSearchParams({
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
      'SELECT access_token, refresh_token, token_expires_at FROM amazon_user_shops WHERE shop_id = ? AND user_id = ?',
      [shopId, userId]
    );
    if (shops.length === 0) throw new Error('Amazon account not found or not connected');

    const shop = shops[0];
    const accessToken = decrypt(shop.access_token);
    const refreshToken = decrypt(shop.refresh_token);
    const expiresAt = new Date(shop.token_expires_at);

    if (expiresAt.getTime() - Date.now() < 5 * 60 * 1000) {
      const newTokens = await this.refreshAccessToken(refreshToken);
      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

      await db.execute(`
        UPDATE amazon_user_shops
        SET access_token = ?, token_expires_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE shop_id = ? AND user_id = ?
      `, [encrypt(newTokens.access_token), newExpiresAt, shopId, userId]);

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
          'x-amz-access-token': accessToken,
          'Content-Type': 'application/json'
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
    const errors = error.response?.data?.errors;
    const message = errors?.[0]?.message || error.response?.data?.message || error.message;

    console.error('Amazon SP-API error:', { method, path, status, message, errors });

    if (status === 429) throw new Error('Amazon API rate limit exceeded. Please try again later.');
    if (status === 403) throw new Error('Amazon access forbidden. Please reconnect your account.');
    if (status === 401) throw new Error('Amazon authentication failed. Please reconnect your account.');

    throw new Error(`Amazon API error (${status}): ${message}`);
  }

  // ──────────────────────────────────────────────
  // SELLER ACCOUNT
  // ──────────────────────────────────────────────

  async getSellerInfo(accessToken) {
    return await this.makeRequest('GET', '/sellers/v1/marketplaceParticipations', accessToken);
  }

  // ──────────────────────────────────────────────
  // CATALOG / LISTINGS
  // ──────────────────────────────────────────────

  async searchCatalogItems(accessToken, keywords, opts = {}) {
    return await this.makeRequest('GET', '/catalog/2022-04-01/items', accessToken, null, {
      marketplaceIds: this.marketplaceId,
      keywords,
      ...opts
    });
  }

  async getCatalogItem(accessToken, asin) {
    return await this.makeRequest('GET', `/catalog/2022-04-01/items/${asin}`, accessToken, null, {
      marketplaceIds: this.marketplaceId,
      includedData: 'summaries,attributes,images'
    });
  }

  async putListingsItem(accessToken, sellerId, sku, body) {
    return await this.makeRequest(
      'PUT',
      `/listings/2021-08-01/items/${sellerId}/${encodeURIComponent(sku)}`,
      accessToken, body, { marketplaceIds: this.marketplaceId }
    );
  }

  async patchListingsItem(accessToken, sellerId, sku, patches) {
    return await this.makeRequest(
      'PATCH',
      `/listings/2021-08-01/items/${sellerId}/${encodeURIComponent(sku)}`,
      accessToken, patches, { marketplaceIds: this.marketplaceId }
    );
  }

  async deleteListingsItem(accessToken, sellerId, sku) {
    return await this.makeRequest(
      'DELETE',
      `/listings/2021-08-01/items/${sellerId}/${encodeURIComponent(sku)}`,
      accessToken, null, { marketplaceIds: this.marketplaceId }
    );
  }

  // ──────────────────────────────────────────────
  // INVENTORY
  // ──────────────────────────────────────────────

  async getInventorySummaries(accessToken, opts = {}) {
    return await this.makeRequest('GET', '/fba/inventory/v1/summaries', accessToken, null, {
      granularityType: 'Marketplace',
      granularityId: this.marketplaceId,
      marketplaceIds: this.marketplaceId,
      ...opts
    });
  }

  // ──────────────────────────────────────────────
  // ORDERS
  // ──────────────────────────────────────────────

  async getOrders(accessToken, opts = {}) {
    return await this.makeRequest('GET', '/orders/v0/orders', accessToken, null, {
      MarketplaceIds: this.marketplaceId,
      ...opts
    });
  }

  async getOrder(accessToken, orderId) {
    return await this.makeRequest('GET', `/orders/v0/orders/${orderId}`, accessToken);
  }

  async getOrderItems(accessToken, orderId) {
    return await this.makeRequest('GET', `/orders/v0/orders/${orderId}/orderItems`, accessToken);
  }

  // ──────────────────────────────────────────────
  // FEEDS (for inventory updates, tracking, etc.)
  // ──────────────────────────────────────────────

  async createFeed(accessToken, feedType, feedDocument) {
    return await this.makeRequest('POST', '/feeds/2021-06-30/feeds', accessToken, {
      feedType,
      marketplaceIds: [this.marketplaceId],
      inputFeedDocumentId: feedDocument
    });
  }

  async createFeedDocument(accessToken, contentType = 'text/xml; charset=UTF-8') {
    return await this.makeRequest('POST', '/feeds/2021-06-30/documents', accessToken, { contentType });
  }

  // ──────────────────────────────────────────────
  // SHIPPING / FULFILLMENT
  // ──────────────────────────────────────────────

  async getOrderFulfillment(accessToken, orderId) {
    return await this.makeRequest('GET', `/orders/v0/orders/${orderId}`, accessToken);
  }

  // ──────────────────────────────────────────────
  // CONNECTION TEST
  // ──────────────────────────────────────────────

  async testConnection() {
    return {
      success: true,
      message: 'Amazon SP-API service configured',
      clientId: this.clientId ? 'configured' : 'missing',
      region: process.env.AMAZON_SPAPI_REGION || 'us-east-1',
      marketplaceId: this.marketplaceId,
      callbackUrl: this.callbackUrl
    };
  }
}

module.exports = new AmazonService();
