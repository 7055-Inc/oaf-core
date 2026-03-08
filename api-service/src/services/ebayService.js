/**
 * eBay REST API Service
 * Handles all interactions with eBay's REST APIs (Sell, Browse, Taxonomy).
 *
 * OAuth 2.0 Authorization Code Grant:
 *   - Access tokens expire (~2 hours), refresh tokens last ~18 months
 *   - Token exchange uses Basic auth: base64(client_id:client_secret)
 *   - redirect_uri param is the RuName (registered in eBay Developer Portal)
 *
 * API Docs: https://developer.ebay.com/docs
 */

const axios = require('axios');
const db = require('../../config/db');
const { encrypt, decrypt } = require('../utils/encryption');
const { validateConnectorEnv } = require('../utils/connectorEnv');

class EbayService {
  constructor() {
    validateConnectorEnv('ebay');

    this.clientId = process.env.EBAY_CLIENT_ID;
    this.clientSecret = process.env.EBAY_CLIENT_SECRET;
    this.ruName = process.env.EBAY_RU_NAME;
    this.callbackUrl = process.env.EBAY_CALLBACK_URL ||
      `${process.env.API_BASE_URL}/api/v2/catalog/ebay/oauth/callback`;
    this.scopes = process.env.EBAY_SCOPES ||
      'https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.fulfillment https://api.ebay.com/oauth/api_scope/sell.account';

    const isSandbox = (process.env.EBAY_ENV || 'production') === 'sandbox';
    this.authBaseUrl = isSandbox ? 'https://auth.sandbox.ebay.com' : 'https://auth.ebay.com';
    this.apiBaseUrl = isSandbox ? 'https://api.sandbox.ebay.com' : 'https://api.ebay.com';
  }

  get basicAuthHeader() {
    return 'Basic ' + Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
  }

  // ──────────────────────────────────────────────
  // OAUTH
  // ──────────────────────────────────────────────

  getAuthorizationUrl(userId) {
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.ruName,
      response_type: 'code',
      scope: this.scopes,
      state
    });
    return `${this.authBaseUrl}/oauth2/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code) {
    const response = await axios.post(
      `${this.apiBaseUrl}/identity/v1/oauth2/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.ruName
      }).toString(),
      {
        headers: {
          'Authorization': this.basicAuthHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    return response.data; // { access_token, refresh_token, expires_in, token_type }
  }

  async refreshAccessToken(refreshToken) {
    const response = await axios.post(
      `${this.apiBaseUrl}/identity/v1/oauth2/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        scope: this.scopes
      }).toString(),
      {
        headers: {
          'Authorization': this.basicAuthHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    return response.data;
  }

  async getShopAccessToken(shopId, userId) {
    const [shops] = await db.execute(
      `SELECT access_token, refresh_token, token_expires_at
       FROM ebay_user_shops WHERE shop_id = ? AND user_id = ? AND is_active = 1`,
      [shopId, userId]
    );
    if (shops.length === 0) throw new Error('eBay account not found or not authorized');

    const shop = shops[0];
    const accessToken = decrypt(shop.access_token);
    const refreshToken = decrypt(shop.refresh_token);
    const now = new Date();
    const expiresAt = new Date(shop.token_expires_at);

    const bufferMs = 5 * 60 * 1000;
    if (expiresAt.getTime() - now.getTime() > bufferMs) return accessToken;

    console.log(`Refreshing eBay access token for shop ${shopId}`);
    const tokenData = await this.refreshAccessToken(refreshToken);
    const newExpiresAt = new Date(now.getTime() + (tokenData.expires_in * 1000));

    await db.execute(
      `UPDATE ebay_user_shops
       SET access_token = ?, token_expires_at = ?, updated_at = CURRENT_TIMESTAMP
       WHERE shop_id = ? AND user_id = ?`,
      [encrypt(tokenData.access_token), newExpiresAt, shopId, userId]
    );

    return tokenData.access_token;
  }

  // ──────────────────────────────────────────────
  // GENERIC REQUEST
  // ──────────────────────────────────────────────

  async makeRequest(method, path, accessToken, data = null, extraHeaders = {}) {
    const config = {
      method,
      url: `${this.apiBaseUrl}${path}`,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...extraHeaders
      }
    };
    if (data && (method === 'POST' || method === 'PUT')) config.data = data;

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      return this.handleError(error, method, path);
    }
  }

  handleError(error, method, path) {
    const status = error.response?.status;
    const errorData = error.response?.data;
    console.error('eBay API Error:', { method, path, status, errorData });

    if (status === 401) throw new Error('eBay authentication failed: Invalid or expired token');
    if (status === 403) throw new Error('eBay authorization failed: Insufficient scopes');
    if (status === 404) throw new Error('eBay resource not found');
    if (status === 429) throw new Error('eBay rate limit exceeded – retry later');
    const msg = errorData?.errors?.[0]?.message || error.message;
    throw new Error(`eBay API failed (${status}): ${msg}`);
  }

  // ──────────────────────────────────────────────
  // ACCOUNT
  // ──────────────────────────────────────────────

  async getAccountInfo(accessToken) {
    return await this.makeRequest('GET', '/sell/account/v1/privilege', accessToken);
  }

  // ──────────────────────────────────────────────
  // TAXONOMY / CATEGORIES
  // ──────────────────────────────────────────────

  async getCategoryTree(accessToken, marketplaceId = 'EBAY_US') {
    return await this.makeRequest('GET',
      `/commerce/taxonomy/v1/get_default_category_tree_id?marketplace_id=${marketplaceId}`,
      accessToken);
  }

  async getCategorySubtree(accessToken, categoryTreeId, categoryId) {
    return await this.makeRequest('GET',
      `/commerce/taxonomy/v1/category_tree/${categoryTreeId}/get_category_subtree?category_id=${categoryId}`,
      accessToken);
  }

  async getCategorySuggestions(accessToken, categoryTreeId, query) {
    return await this.makeRequest('GET',
      `/commerce/taxonomy/v1/category_tree/${categoryTreeId}/get_category_suggestions?q=${encodeURIComponent(query)}`,
      accessToken);
  }

  // ──────────────────────────────────────────────
  // INVENTORY (Sell Inventory API)
  // ──────────────────────────────────────────────

  async createOrReplaceInventoryItem(accessToken, sku, itemData) {
    return await this.makeRequest('PUT',
      `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
      accessToken, itemData);
  }

  async getInventoryItem(accessToken, sku) {
    return await this.makeRequest('GET',
      `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
      accessToken);
  }

  async getInventoryItems(accessToken, limit = 25, offset = 0) {
    return await this.makeRequest('GET',
      `/sell/inventory/v1/inventory_item?limit=${limit}&offset=${offset}`,
      accessToken);
  }

  async deleteInventoryItem(accessToken, sku) {
    return await this.makeRequest('DELETE',
      `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
      accessToken);
  }

  // ──────────────────────────────────────────────
  // OFFERS (Sell Inventory API - makes items live)
  // ──────────────────────────────────────────────

  async createOffer(accessToken, offerData) {
    return await this.makeRequest('POST', '/sell/inventory/v1/offer', accessToken, offerData);
  }

  async publishOffer(accessToken, offerId) {
    return await this.makeRequest('POST',
      `/sell/inventory/v1/offer/${offerId}/publish`,
      accessToken);
  }

  async withdrawOffer(accessToken, offerId) {
    return await this.makeRequest('POST',
      `/sell/inventory/v1/offer/${offerId}/withdraw`,
      accessToken);
  }

  async getOffers(accessToken, sku) {
    return await this.makeRequest('GET',
      `/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}`,
      accessToken);
  }

  // ──────────────────────────────────────────────
  // ORDERS (Sell Fulfillment API)
  // ──────────────────────────────────────────────

  async getOrders(accessToken, params = {}) {
    const qs = new URLSearchParams({
      limit: params.limit || 50,
      offset: params.offset || 0,
      ...(params.filter ? { filter: params.filter } : {})
    }).toString();
    return await this.makeRequest('GET',
      `/sell/fulfillment/v1/order?${qs}`, accessToken);
  }

  async getOrder(accessToken, orderId) {
    return await this.makeRequest('GET',
      `/sell/fulfillment/v1/order/${orderId}`, accessToken);
  }

  async createShippingFulfillment(accessToken, orderId, fulfillmentData) {
    return await this.makeRequest('POST',
      `/sell/fulfillment/v1/order/${orderId}/shipping_fulfillment`,
      accessToken, fulfillmentData);
  }

  // ──────────────────────────────────────────────
  // CONNECTION TEST
  // ──────────────────────────────────────────────

  async testConnection() {
    if (!this.clientId || !this.clientSecret) {
      return { success: false, message: 'eBay credentials not configured' };
    }
    return { success: true, message: 'eBay API credentials configured', client_id: this.clientId };
  }
}

module.exports = new EbayService();
