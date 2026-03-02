/**
 * Shopify Admin API Service
 * Handles all interactions with Shopify's REST Admin API.
 *
 * OAuth 2.0 flow (offline access tokens – no refresh needed):
 *   1. Redirect merchant to https://{shop}/admin/oauth/authorize
 *   2. Callback receives ?code=&hmac=&shop=&state=&timestamp=
 *   3. POST https://{shop}/admin/oauth/access_token → { access_token, scope }
 *
 * API Documentation: https://shopify.dev/docs/api/admin-rest
 */

const axios = require('axios');
const crypto = require('crypto');
const db = require('../../config/db');
const { encrypt, decrypt } = require('../utils/encryption');
const { validateConnectorEnv } = require('../utils/connectorEnv');

const API_VERSION = '2024-01';

class ShopifyService {
  constructor() {
    validateConnectorEnv('shopify');
    this.apiKey = process.env.SHOPIFY_API_KEY;
    this.apiSecret = process.env.SHOPIFY_API_SECRET;
    this.redirectUri = process.env.SHOPIFY_CALLBACK_URL ||
      `${process.env.API_BASE_URL}/api/v2/catalog/shopify/oauth/callback`;
    this.scopes = process.env.SHOPIFY_SCOPES ||
      'read_products,write_products,read_orders,read_inventory,write_inventory,read_shipping';
  }

  // ──────────────────────────────────────────────
  // OAUTH
  // ──────────────────────────────────────────────

  getAuthorizationUrl(shopDomain, userId, from) {
    const shop = this.normalizeShopDomain(shopDomain);
    const statePayload = { userId, shop };
    if (from) statePayload.from = from;
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64');
    const params = new URLSearchParams({
      client_id: this.apiKey,
      scope: this.scopes,
      redirect_uri: this.redirectUri,
      state
    });
    return `https://${shop}/admin/oauth/authorize?${params.toString()}`;
  }

  verifyHmac(query) {
    const { hmac, ...rest } = query;
    if (!hmac) return false;
    const sorted = Object.keys(rest).sort().map(k => `${k}=${rest[k]}`).join('&');
    const digest = crypto.createHmac('sha256', this.apiSecret).update(sorted).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
  }

  async exchangeCodeForToken(shop, code) {
    const url = `https://${shop}/admin/oauth/access_token`;
    const response = await axios.post(url, {
      client_id: this.apiKey,
      client_secret: this.apiSecret,
      code
    });
    return response.data; // { access_token, scope }
  }

  normalizeShopDomain(input) {
    let shop = input.trim().toLowerCase();
    shop = shop.replace(/^https?:\/\//, '');
    shop = shop.replace(/\/.*$/, '');
    if (!shop.includes('.')) shop += '.myshopify.com';
    return shop;
  }

  // ──────────────────────────────────────────────
  // TOKEN RETRIEVAL
  // ──────────────────────────────────────────────

  async getShopAccessToken(shopId, userId) {
    const [shops] = await db.execute(
      `SELECT access_token FROM shopify_user_shops
       WHERE shop_id = ? AND user_id = ? AND is_active = 1`,
      [shopId, userId]
    );
    if (shops.length === 0) throw new Error('Shop not found or not authorized');
    return decrypt(shops[0].access_token);
  }

  // ──────────────────────────────────────────────
  // GENERIC REQUEST
  // ──────────────────────────────────────────────

  async makeRequest(method, shopDomain, accessToken, path, data = null) {
    const url = `https://${shopDomain}/admin/api/${API_VERSION}${path}`;
    const config = {
      method,
      url,
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
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
    console.error('Shopify API Error:', { method, path, status, errorData });

    if (status === 401) throw new Error('Shopify authentication failed: Invalid or expired access token');
    if (status === 403) throw new Error('Shopify authorization failed: Insufficient scopes');
    if (status === 404) throw new Error('Shopify resource not found');
    if (status === 422) throw new Error(`Shopify validation error: ${JSON.stringify(errorData?.errors || errorData)}`);
    if (status === 429) throw new Error('Shopify rate limit exceeded – retry later');
    throw new Error(`Shopify API failed (${status}): ${error.message}`);
  }

  // ──────────────────────────────────────────────
  // SHOP
  // ──────────────────────────────────────────────

  async getShopInfo(shopDomain, accessToken) {
    const data = await this.makeRequest('GET', shopDomain, accessToken, '/shop.json');
    return data.shop;
  }

  // ──────────────────────────────────────────────
  // PRODUCTS
  // ──────────────────────────────────────────────

  async listProducts(shopDomain, accessToken, params = {}) {
    const qs = new URLSearchParams({
      limit: params.limit || 50,
      ...(params.since_id ? { since_id: params.since_id } : {}),
      ...(params.status ? { status: params.status } : {})
    }).toString();
    const data = await this.makeRequest('GET', shopDomain, accessToken, `/products.json?${qs}`);
    return data.products || [];
  }

  async getProduct(shopDomain, accessToken, productId) {
    const data = await this.makeRequest('GET', shopDomain, accessToken, `/products/${productId}.json`);
    return data.product;
  }

  async createProduct(shopDomain, accessToken, productData) {
    const data = await this.makeRequest('POST', shopDomain, accessToken, '/products.json', {
      product: productData
    });
    return data.product;
  }

  async updateProduct(shopDomain, accessToken, productId, productData) {
    const data = await this.makeRequest('PUT', shopDomain, accessToken, `/products/${productId}.json`, {
      product: { id: productId, ...productData }
    });
    return data.product;
  }

  async deleteProduct(shopDomain, accessToken, productId) {
    await this.makeRequest('DELETE', shopDomain, accessToken, `/products/${productId}.json`);
    return { deleted: true };
  }

  // ──────────────────────────────────────────────
  // INVENTORY
  // ──────────────────────────────────────────────

  async getInventoryLevels(shopDomain, accessToken, inventoryItemIds) {
    const ids = Array.isArray(inventoryItemIds) ? inventoryItemIds.join(',') : inventoryItemIds;
    const data = await this.makeRequest('GET', shopDomain, accessToken,
      `/inventory_levels.json?inventory_item_ids=${ids}`);
    return data.inventory_levels || [];
  }

  async setInventoryLevel(shopDomain, accessToken, locationId, inventoryItemId, available) {
    const data = await this.makeRequest('POST', shopDomain, accessToken,
      '/inventory_levels/set.json', {
        location_id: locationId,
        inventory_item_id: inventoryItemId,
        available
      });
    return data.inventory_level;
  }

  async getLocations(shopDomain, accessToken) {
    const data = await this.makeRequest('GET', shopDomain, accessToken, '/locations.json');
    return data.locations || [];
  }

  // ──────────────────────────────────────────────
  // ORDERS
  // ──────────────────────────────────────────────

  async getOrders(shopDomain, accessToken, params = {}) {
    const qs = new URLSearchParams({
      status: params.status || 'any',
      limit: params.limit || 50,
      ...(params.since_id ? { since_id: params.since_id } : {}),
      ...(params.created_at_min ? { created_at_min: params.created_at_min } : {})
    }).toString();
    const data = await this.makeRequest('GET', shopDomain, accessToken, `/orders.json?${qs}`);
    return data.orders || [];
  }

  async getOrder(shopDomain, accessToken, orderId) {
    const data = await this.makeRequest('GET', shopDomain, accessToken, `/orders/${orderId}.json`);
    return data.order;
  }

  // ──────────────────────────────────────────────
  // FULFILLMENTS
  // ──────────────────────────────────────────────

  async createFulfillment(shopDomain, accessToken, orderId, fulfillmentData) {
    const data = await this.makeRequest('POST', shopDomain, accessToken,
      `/orders/${orderId}/fulfillments.json`, { fulfillment: fulfillmentData });
    return data.fulfillment;
  }

  async getFulfillments(shopDomain, accessToken, orderId) {
    const data = await this.makeRequest('GET', shopDomain, accessToken,
      `/orders/${orderId}/fulfillments.json`);
    return data.fulfillments || [];
  }

  // ──────────────────────────────────────────────
  // CONNECTION TEST
  // ──────────────────────────────────────────────

  async testConnection() {
    if (!this.apiKey || !this.apiSecret) {
      return { success: false, message: 'Shopify credentials not configured' };
    }
    return { success: true, message: 'Shopify API credentials configured', api_key: this.apiKey };
  }

  async testShopConnection(shopDomain, accessToken) {
    try {
      const shop = await this.getShopInfo(shopDomain, accessToken);
      return { success: true, shop_name: shop.name, shop_domain: shop.domain };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = new ShopifyService();
