# TikTok Shop API Integration - Technical Documentation

**Created:** February 8, 2026  
**Status:** Implementation Complete  
**Pattern:** Follows Walmart Marketplace Connector Standard

---

## Overview

The TikTok Shop API integration provides a complete external API service layer for connecting artist products to TikTok Shop. This implementation follows the established marketplace connector pattern used by Walmart, Amazon, and other marketplace integrations.

## Architecture

### Three-Layer Pattern

```
Frontend (existing)
    ↓
Routes Layer (routesTiktok.js)
    ↓
Business Logic Layer (services/tiktok.js)
    ↓
External API Service (services/tiktokService.js) ← NEW
    ↓
TikTok Shop API
```

### File Structure

```
/api-service/src/
├── services/
│   └── tiktokService.js          # External API service (OAuth, request signing, API calls)
├── modules/catalog/
│   ├── routesTiktok.js           # API routes (mounted at /api/v2/catalog/tiktok)
│   └── services/
│       └── tiktok.js             # Business logic (database operations)
```

---

## Core Components

### 1. External API Service (`tiktokService.js`)

**Purpose:** Handles all direct communication with TikTok Shop Partner API

**Key Features:**
- OAuth 2.0 token management (authorization code flow)
- HMAC-SHA256 request signing (required by TikTok)
- Rate limiting (20 QPS max)
- Token refresh automation
- Comprehensive error handling

**Main Methods:**

#### OAuth & Authentication
```javascript
getAuthorizationUrl(userId)              // Get OAuth URL for shop connection
getAccessToken(authCode)                 // Exchange code for tokens
refreshAccessToken(refreshToken)         // Refresh expired token
getShopAccessToken(shopId, userId)       // Get valid token (auto-refresh)
```

#### Shop Management
```javascript
getShopInfo(shopId, userId)              // Get shop details
getWarehouses(shopId, userId)            // List warehouses
```

#### Product Management
```javascript
listProducts(shopId, userId, params)     // List products with pagination
getProduct(shopId, userId, productId)    // Get product details
createProduct(shopId, userId, productData) // Create new product
updateProduct(shopId, userId, productId, data) // Update product
deleteProduct(shopId, userId, productId) // Deactivate product
getCategories(shopId, userId)            // Get category list
getBrands(shopId, userId)                // Get brand list
```

#### Inventory Management
```javascript
updateInventory(shopId, userId, productId, skuId, qty) // Update stock
bulkUpdateInventory(shopId, userId, updates)           // Bulk stock update
```

#### Order Management
```javascript
getOrders(shopId, userId, params)        // List orders with filters
getOrderDetail(shopId, userId, orderId)  // Get order details
shipOrder(shopId, userId, orderId, info) // Mark order as shipped
cancelOrder(shopId, userId, orderId, reason) // Cancel order
```

#### Returns Management
```javascript
getReturns(shopId, userId, params)       // List return requests
getReturnDetail(shopId, userId, returnId) // Get return details
approveReturn(shopId, userId, returnId)  // Approve return
rejectReturn(shopId, userId, returnId, reason) // Reject return
```

---

### 2. Business Logic Layer (`services/tiktok.js`)

**Purpose:** Orchestrates database operations and calls to external API

**Key Functions:**

```javascript
// OAuth Flow
oauthAuthorize(userId)                   // Generate authorization URL
handleOAuthCallback(authCode, state)     // Complete OAuth flow, save tokens

// Product Sync
syncProductToTikTok(productId, userId, shopId) // Push product to TikTok
saveProduct(productId, userId, body)     // Save product data locally

// Order Sync
syncOrdersFromTikTok(userId, shopId)     // Pull orders from TikTok

// Inventory Sync
updateTikTokInventory(productId, userId, shopId, qty) // Update stock on TikTok
updateInventoryAllocation(productId, userId, qty)     // Update local allocation

// Connection Test
testConnection()                         // Verify API credentials
```

---

### 3. Routes Layer (`routesTiktok.js`)

**Purpose:** RESTful API endpoints for frontend

**New Endpoints:**

```
GET  /api/v2/catalog/tiktok/oauth/authorize       # Get OAuth URL
GET  /api/v2/catalog/tiktok/oauth/callback        # OAuth callback handler
POST /api/v2/catalog/tiktok/sync/product/:id      # Sync product to TikTok
POST /api/v2/catalog/tiktok/sync/orders           # Sync orders from TikTok
POST /api/v2/catalog/tiktok/inventory/update/:id  # Update inventory on TikTok
GET  /api/v2/catalog/tiktok/test                  # Test API connection
```

**Existing Endpoints:**
```
GET  /api/v2/catalog/tiktok/shops                 # List user's shops
GET  /api/v2/catalog/tiktok/products              # List products
POST /api/v2/catalog/tiktok/products/:id          # Save product data
GET  /api/v2/catalog/tiktok/inventory             # Get allocations
POST /api/v2/catalog/tiktok/inventory/:id         # Update allocation
GET  /api/v2/catalog/tiktok/logs                  # Get sync logs
```

---

## TikTok Shop API Specifics

### Request Signing Algorithm

TikTok requires HMAC-SHA256 signed requests:

```
1. Build signature string:
   app_secret + path + timestamp + app_key + access_token + body + app_secret

2. Generate HMAC-SHA256 hash using app_secret as key

3. Add signature to query params: ?sign={signature}
```

**Example:**
```javascript
const signString = 
  appSecret + 
  '/api/products/search' + 
  '1707408000' + 
  'your_app_key' + 
  'access_token_here' + 
  JSON.stringify(body) + 
  appSecret;

const signature = crypto
  .createHmac('sha256', appSecret)
  .update(signString)
  .digest('hex');
```

### Rate Limiting

TikTok enforces **20 queries per second (QPS)** limit.

Our implementation:
- Tracks requests in rolling 1-second window
- Automatically delays requests when limit reached
- Prevents rate limit errors

### Token Management

**Token Lifecycle:**
1. User authorizes app → receives `auth_code`
2. Exchange `auth_code` for `access_token` + `refresh_token`
3. Token stored in database with expiry timestamp
4. Service automatically refreshes when token expires (5-min buffer)

**Database Storage:**
```sql
tiktok_user_shops:
  - access_token (encrypted)
  - refresh_token (encrypted)
  - token_expires_at (timestamp)
  - token_refresh_count (tracking)
```

---

## Database Schema

### Migration: `007_tiktok_shop_enhancements.sql`

**New Columns:**
```sql
tiktok_product_data:
  + tiktok_sku_id VARCHAR(100)      -- TikTok's SKU identifier
  + shop_id VARCHAR(100)             -- Multi-shop support
  + last_sync_error TEXT             -- Error tracking

tiktok_user_shops:
  + app_key VARCHAR(255)             -- App credentials
  + token_refresh_count INT          -- Token refresh tracking
  + last_token_refresh_at TIMESTAMP
  + last_products_sync_at TIMESTAMP
  + last_orders_sync_at TIMESTAMP
  + last_inventory_sync_at TIMESTAMP
```

**New Tables:**
```sql
tiktok_api_logs:
  - Logs all API requests/responses
  - For debugging and audit trail

tiktok_webhooks:
  - Queue for TikTok webhook events
  - Future webhook integration support
```

---

## Environment Variables

### Required Configuration

```bash
# TikTok Shop Credentials
TIKTOK_CLIENT_KEY=your_app_key
TIKTOK_CLIENT_SECRET=your_app_secret

# API & Frontend URLs (already configured)
API_BASE_URL=https://staging-api.brakebee.com
FRONTEND_URL=https://staging.brakebee.com
```

### OAuth Redirect URL

Register this URL in TikTok Partner Center:
```
https://staging-api.brakebee.com/api/v2/catalog/tiktok/oauth/callback
```

---

## Testing

### 1. Test API Connection

```bash
curl -X GET "https://staging-api.brakebee.com/api/v2/catalog/tiktok/test" \
  -H "Authorization: Bearer {jwt_token}"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "TikTok API credentials configured",
  "app_key": "your_app_key"
}
```

### 2. Test OAuth Flow

```bash
# Step 1: Get authorization URL
curl -X GET "https://staging-api.brakebee.com/api/v2/catalog/tiktok/oauth/authorize" \
  -H "Authorization: Bearer {jwt_token}"

# Response:
{
  "success": true,
  "redirect_url": "https://services.tiktokshop.com/open/authorize?..."
}

# Step 2: User visits redirect_url and authorizes
# Step 3: TikTok redirects to callback URL
# Step 4: Callback handler exchanges code for tokens and saves shop connection
```

### 3. Test Product Sync

```bash
curl -X POST "https://staging-api.brakebee.com/api/v2/catalog/tiktok/sync/product/123" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{"shop_id": "shop_123456"}'
```

### 4. Test Order Sync

```bash
curl -X POST "https://staging-api.brakebee.com/api/v2/catalog/tiktok/sync/orders" \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{"shop_id": "shop_123456"}'
```

---

## Postman Testing

### Collection Setup

1. **Import Base URL:**
   ```
   {{base_url}} = https://staging-api.brakebee.com
   ```

2. **Set Auth Token:**
   ```
   {{jwt_token}} = your_jwt_token
   ```

3. **Key Endpoints to Test:**
   - Connection Test: `GET {{base_url}}/api/v2/catalog/tiktok/test`
   - Get OAuth URL: `GET {{base_url}}/api/v2/catalog/tiktok/oauth/authorize`
   - List Products: `GET {{base_url}}/api/v2/catalog/tiktok/products`
   - Sync Product: `POST {{base_url}}/api/v2/catalog/tiktok/sync/product/:id`

---

## Error Handling

### TikTok API Error Codes

| Code | Meaning | Handling |
|------|---------|----------|
| 0 | Success | Continue |
| 10001 | Invalid parameters | Validate input |
| 10002 | Authentication failed | Refresh token |
| 10003 | Authorization failed | Check permissions |
| 10004 | Rate limit exceeded | Retry with delay |
| 10005 | Service unavailable | Retry with backoff |

### Error Flow

```javascript
try {
  const result = await tiktokApiService.getOrders(shopId, userId);
} catch (error) {
  if (error.message.includes('Invalid or expired access token')) {
    // Token expired - service auto-refreshes
    // Retry once
  } else if (error.message.includes('rate limit')) {
    // Wait and retry
  } else {
    // Log and return error to user
  }
}
```

---

## Deployment Checklist

### Pre-Deployment

- [x] External API service created (`tiktokService.js`)
- [x] Business logic layer updated (`services/tiktok.js`)
- [x] Routes layer updated (`routesTiktok.js`)
- [x] Database migration created (`007_tiktok_shop_enhancements.sql`)
- [x] Environment variables documented
- [x] No linting errors

### Deployment Steps

1. **Apply Migration:**
   ```bash
   mysql -h 10.128.0.31 -u oafuser -poafpass wordpress_import < /var/www/staging/database/migrations/007_tiktok_shop_enhancements.sql
   ```

2. **Restart API Service:**
   ```bash
   pm2 restart staging-api
   ```

3. **Verify Service:**
   ```bash
   pm2 logs staging-api --lines 50
   ```

4. **Test Connection:**
   ```bash
   curl https://staging-api.brakebee.com/api/v2/catalog/tiktok/test
   ```

### Post-Deployment

- [ ] Register OAuth callback URL in TikTok Partner Center
- [ ] Test OAuth flow with production credentials
- [ ] Test product sync with sample product
- [ ] Monitor API logs for errors
- [ ] Update frontend to use new sync endpoints

---

## Frontend Integration

### Existing Frontend Components

- `/modules/catalog/components/addons/TikTokConnector.js` - Vendor UI
- `/modules/catalog/components/addons/TikTokConnectorAdmin.js` - Admin UI
- `/lib/catalog/api.js` - Frontend API helpers

### Frontend API Functions

**Already Available:**
```javascript
// From /lib/catalog/api.js
fetchTikTokShops()           // List shops
fetchTikTokProducts()        // List products
saveTikTokProduct()          // Save product data
fetchTikTokInventory()       // Get allocations
```

**New Functions Needed:**
```javascript
// Add these to /lib/catalog/api.js
async function initTikTokOAuth() {
  const response = await fetch(`${API_URL}/api/v2/catalog/tiktok/oauth/authorize`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  if (data.success) {
    window.location.href = data.redirect_url;
  }
}

async function syncProductToTikTok(productId, shopId) {
  return await fetch(`${API_URL}/api/v2/catalog/tiktok/sync/product/${productId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ shop_id: shopId })
  });
}

async function syncTikTokOrders(shopId) {
  return await fetch(`${API_URL}/api/v2/catalog/tiktok/sync/orders`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ shop_id: shopId })
  });
}
```

---

## Monitoring & Maintenance

### Logs to Monitor

1. **API Request Logs:**
   ```sql
   SELECT * FROM tiktok_api_logs 
   WHERE response_code != 200 
   ORDER BY created_at DESC LIMIT 50;
   ```

2. **Sync Logs:**
   ```sql
   SELECT * FROM tiktok_sync_logs 
   WHERE status = 'error' 
   ORDER BY created_at DESC LIMIT 50;
   ```

3. **Token Refresh Tracking:**
   ```sql
   SELECT shop_id, shop_name, token_refresh_count, last_token_refresh_at
   FROM tiktok_user_shops 
   WHERE is_active = 1
   ORDER BY token_refresh_count DESC;
   ```

### Common Issues

**Issue:** Token expired errors  
**Solution:** Service auto-refreshes, but check `tiktok_user_shops.token_expires_at`

**Issue:** Rate limit errors  
**Solution:** Built-in rate limiting handles this, check for QPS spikes

**Issue:** Invalid signature  
**Solution:** Verify `app_secret` is correct, check signature algorithm

---

## API Reference

Full TikTok Shop API documentation:  
https://partner.tiktokshop.com/docv2

**Key Endpoints Used:**
- `/api/token/get` - Get access token
- `/api/token/refresh` - Refresh token
- `/api/shop/get_authorized_shop` - Get shop info
- `/api/products/search` - List products
- `/api/products/create` - Create product
- `/api/products/update` - Update product
- `/api/products/stocks/update` - Update inventory
- `/api/orders/search` - List orders

---

## Success Criteria

✅ **External API Service Layer**
- Complete OAuth 2.0 implementation
- HMAC-SHA256 request signing
- Rate limiting (20 QPS)
- Token auto-refresh
- Comprehensive error handling

✅ **Integration with Business Logic**
- Routes call business logic
- Business logic calls external service
- Database operations remain in business logic layer
- Follows Walmart pattern exactly

✅ **Database Schema**
- Migration created and documented
- All required columns added
- Proper indexing for performance
- API logs and webhook tables ready

✅ **Documentation**
- Technical documentation complete
- Testing procedures documented
- Deployment checklist provided
- Frontend integration guide included

---

## Next Steps

1. **Apply Database Migration**
2. **Restart API Service**
3. **Register OAuth Callback in TikTok Partner Center**
4. **Test with Production Credentials**
5. **Update Frontend Components** (add sync buttons)
6. **Monitor Initial Shop Connections**
7. **Set Up Automated Order Sync** (cron job)

---

## Support & References

- **TikTok Partner Center:** https://partner.tiktokshop.com
- **API Documentation:** https://partner.tiktokshop.com/docv2
- **Postman Collection:** https://partner.tiktokshop.com/docv2/page/call-your-first-api-using-postman
- **Internal Reference:** Walmart connector (`walmartService.js`)

---

**Implementation Date:** February 8, 2026  
**Developer:** AI Assistant  
**Status:** Ready for Deployment ✅
