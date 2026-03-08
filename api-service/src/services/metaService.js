/**
 * Meta Commerce API Service
 * Handles all interactions with Meta's Commerce / Catalog APIs
 * for Facebook Shops and Instagram Shopping.
 *
 * OAuth 2.0 via Facebook Login:
 *   - Access tokens: short-lived (~1 hour) exchanged for long-lived (~60 days)
 *   - Auth URL: https://www.facebook.com/v19.0/dialog/oauth
 *   - Token exchange: https://graph.facebook.com/v19.0/oauth/access_token
 *
 * Graph API Base: https://graph.facebook.com/v19.0
 * Commerce API: catalog management, orders, inventory via Graph API
 *
 * Docs: https://developers.facebook.com/docs/commerce-platform/
 */

const axios = require('axios');
const db = require('../../config/db');
const { encrypt, decrypt } = require('../utils/encryption');
const { validateConnectorEnv } = require('../utils/connectorEnv');

class MetaService {
  constructor() {
    validateConnectorEnv('meta');

    this.appId = process.env.META_APP_ID;
    this.appSecret = process.env.META_APP_SECRET;
    this.callbackUrl = process.env.META_CALLBACK_URL ||
      `${process.env.API_BASE_URL}/api/v2/catalog/meta/oauth/callback`;
    this.scopes = process.env.META_SCOPES ||
      'catalog_management,commerce_manage_orders,pages_read_engagement,business_management';

    this.graphApiVersion = 'v19.0';
    this.graphBaseUrl = `https://graph.facebook.com/${this.graphApiVersion}`;
    this.authBaseUrl = `https://www.facebook.com/${this.graphApiVersion}/dialog/oauth`;
  }

  // ──────────────────────────────────────────────
  // OAUTH (Facebook Login)
  // ──────────────────────────────────────────────

  getAuthorizationUrl(userId) {
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    const params = new URLSearchParams({
      client_id: this.appId,
      redirect_uri: this.callbackUrl,
      response_type: 'code',
      scope: this.scopes,
      state
    });
    return `${this.authBaseUrl}?${params.toString()}`;
  }

  async exchangeCodeForToken(code) {
    const response = await axios.get(`${this.graphBaseUrl}/oauth/access_token`, {
      params: {
        client_id: this.appId,
        client_secret: this.appSecret,
        redirect_uri: this.callbackUrl,
        code
      }
    });
    return response.data;
  }

  async exchangeForLongLivedToken(shortLivedToken) {
    const response = await axios.get(`${this.graphBaseUrl}/oauth/access_token`, {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: this.appId,
        client_secret: this.appSecret,
        fb_exchange_token: shortLivedToken
      }
    });
    return response.data;
  }

  async getShopAccessToken(shopId, userId) {
    const [shops] = await db.execute(
      'SELECT access_token, token_expires_at FROM meta_user_shops WHERE shop_id = ? AND user_id = ?',
      [shopId, userId]
    );
    if (shops.length === 0) throw new Error('Meta account not found or not connected');

    const shop = shops[0];
    return decrypt(shop.access_token);
  }

  // ──────────────────────────────────────────────
  // API REQUEST HELPERS
  // ──────────────────────────────────────────────

  async makeRequest(method, path, accessToken, data = null, params = {}) {
    const url = path.startsWith('http') ? path : `${this.graphBaseUrl}${path}`;

    try {
      const config = {
        method, url,
        headers: { 'Content-Type': 'application/json' },
        params: { access_token: accessToken, ...params }
      };
      if (data) config.data = data;

      const response = await axios(config);
      return response.data;
    } catch (error) {
      return this.handleError(error, method, path);
    }
  }

  handleError(error, method, path) {
    const status = error.response?.status;
    const fbError = error.response?.data?.error;
    const message = fbError?.message || error.message;
    const code = fbError?.code;

    console.error('Meta Graph API error:', { method, path, status, code, message });

    if (code === 190 || status === 401) throw new Error('Meta authentication expired. Please reconnect your account.');
    if (status === 429 || code === 32) throw new Error('Meta API rate limit exceeded. Please try again later.');
    if (status === 403) throw new Error('Meta access forbidden. Please check your permissions.');

    throw new Error(`Meta API error (${status}): ${message}`);
  }

  // ──────────────────────────────────────────────
  // USER / PAGE INFO
  // ──────────────────────────────────────────────

  async getUserInfo(accessToken) {
    return await this.makeRequest('GET', '/me', accessToken, null, {
      fields: 'id,name,email'
    });
  }

  async getUserPages(accessToken) {
    return await this.makeRequest('GET', '/me/accounts', accessToken, null, {
      fields: 'id,name,access_token,category'
    });
  }

  async getCommerceAccounts(accessToken) {
    return await this.makeRequest('GET', '/me/businesses', accessToken, null, {
      fields: 'id,name,owned_product_catalogs{id,name}'
    });
  }

  // ──────────────────────────────────────────────
  // CATALOG MANAGEMENT
  // ──────────────────────────────────────────────

  async getCatalogs(accessToken, businessId) {
    return await this.makeRequest('GET', `/${businessId}/owned_product_catalogs`, accessToken, null, {
      fields: 'id,name,product_count'
    });
  }

  async getCatalogProducts(accessToken, catalogId, params = {}) {
    return await this.makeRequest('GET', `/${catalogId}/products`, accessToken, null, {
      fields: 'id,name,description,price,currency,image_url,url,availability,retailer_id',
      limit: 50,
      ...params
    });
  }

  async createProduct(accessToken, catalogId, productData) {
    return await this.makeRequest('POST', `/${catalogId}/products`, accessToken, productData);
  }

  async updateProduct(accessToken, productId, productData) {
    return await this.makeRequest('POST', `/${productId}`, accessToken, productData);
  }

  async deleteProduct(accessToken, productId) {
    return await this.makeRequest('DELETE', `/${productId}`, accessToken);
  }

  // ──────────────────────────────────────────────
  // INVENTORY
  // ──────────────────────────────────────────────

  async updateProductInventory(accessToken, productId, quantity) {
    return await this.makeRequest('POST', `/${productId}`, accessToken, {
      availability: quantity > 0 ? 'in stock' : 'out of stock',
      inventory: quantity
    });
  }

  // ──────────────────────────────────────────────
  // ORDERS (Commerce Manager)
  // ──────────────────────────────────────────────

  async getOrders(accessToken, commerceAccountId, params = {}) {
    return await this.makeRequest('GET', `/${commerceAccountId}/orders`, accessToken, null, {
      fields: 'id,order_status,created,updated,items{id,product_name,quantity,price_per_unit},shipping_address',
      ...params
    });
  }

  async getOrder(accessToken, orderId) {
    return await this.makeRequest('GET', `/${orderId}`, accessToken, null, {
      fields: 'id,order_status,created,updated,items{id,product_name,quantity,price_per_unit},shipping_address,buyer_details'
    });
  }

  async acknowledgeOrder(accessToken, orderId) {
    return await this.makeRequest('POST', `/${orderId}/acknowledge_order`, accessToken);
  }

  // ──────────────────────────────────────────────
  // SHIPPING / FULFILLMENT
  // ──────────────────────────────────────────────

  async createShipment(accessToken, orderId, shipmentData) {
    return await this.makeRequest('POST', `/${orderId}/shipments`, accessToken, {
      tracking_info: {
        tracking_number: shipmentData.tracking_number,
        carrier: shipmentData.carrier || 'OTHER'
      },
      items: shipmentData.items || []
    });
  }

  // ──────────────────────────────────────────────
  // CONNECTION TEST
  // ──────────────────────────────────────────────

  async testConnection() {
    return {
      success: true,
      message: 'Meta Commerce API service configured',
      appId: this.appId ? 'configured' : 'missing',
      callbackUrl: this.callbackUrl,
      graphApiVersion: this.graphApiVersion
    };
  }
}

module.exports = new MetaService();
