# media.js - Internal Documentation

## Overview
Comprehensive media processing and file management system for the Beemeeart platform. Handles image uploads, processing workflows, AI analysis, and contextual data for media processing. Supports server-to-server communication with media processing VMs and external services. Designed for high-throughput media processing with robust error handling and logging.

## Architecture
- **Type:** Route Layer (API Endpoints) - Media Processing System
- **Dependencies:** express, database connection, path, fs, secureLogger, prefixAuth (API key authentication)
- **Database Tables:**
  - `pending_images` - Temporary images awaiting processing
  - `events` - Event context for media processing
  - `event_types` - Event type classifications
  - `products` - Product catalog for media context
  - `product_inventory` - Product inventory data
  - `product_images` - Permanent product images
  - `product_shipping` - Product shipping information
  - `categories` - Product categories
  - `product_categories` - Product-category relationships
  - `users` - User accounts
  - `user_profiles` - User profile information
  - `artist_profiles` - Artist-specific profile data
  - `community_profiles` - Community user profiles
  - `promoter_profiles` - Promoter user profiles
- **External Services:** Media processing VMs, AI analysis backend, file storage system

## Media Processing Workflow

### Processing Pipeline
1. **Image Upload:** Images uploaded to temporary storage (`/temp_images/`)
2. **Pending Queue:** Images added to `pending_images` table with status 'pending'
3. **Worker Fetch:** Media processing workers fetch pending images via API
4. **Processing:** External VMs process images with AI enhancement
5. **Completion:** Workers mark images as processed with permanent media IDs
6. **URL Replacement:** Smart URLs replace temporary paths throughout system

### Status Flow
```
pending → processing → processed
       ↘ failed (with temp file preserved as fallback)
```

## Pending Image Management

### GET /api/media/pending
**Purpose:** Get pending images for processing with pagination support

**Authentication:** API Key (media workers) - Uses `prefixAuth` middleware

**Query Parameters:**
- `limit` (number, default: 10): Number of images to return
- `offset` (number, default: 0): Pagination offset

**Database Query:**
```sql
SELECT id, user_id, image_path, original_name, mime_type, status, created_at, updated_at
FROM pending_images 
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT ${limit} OFFSET ${offset}
```

**Response Structure:**
```json
{
  "images": [
    {
      "id": 123,
      "user_id": 456,
      "image_path": "/temp_images/products/456-789-image1.jpg",
      "original_name": "artwork.jpg",
      "mime_type": "image/jpeg",
      "status": "pending",
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

**Logging:** Comprehensive logging with secure logger including count, pagination details, and requester information

### GET /api/media/pending/all
**Purpose:** Get ALL pending images without pagination for batch processing

**Authentication:** API Key (media workers)

**Use Case:** Backend VMs use this for efficient batch processing of all pending images

**Database Query:**
```sql
SELECT id, user_id, image_path, original_name, mime_type, status, created_at, updated_at
FROM pending_images 
WHERE status = 'pending'
ORDER BY created_at ASC
```

**Response Structure:**
```json
{
  "images": [...], // All pending images
  "total": 150
}
```

**Performance Consideration:** No pagination - returns all pending images for batch processing efficiency

## File Download System

### GET /api/media/download/:id
**Purpose:** Download temporary image file for processing

**Authentication:** API Key (media workers)

**Process Flow:**
1. **Validation:** Verify image exists and has 'pending' status
2. **File Check:** Verify file exists on disk
3. **Error Handling:** Mark as failed if file missing
4. **Streaming:** Stream file with appropriate headers

**Database Query:**
```sql
SELECT id, user_id, image_path, original_name, mime_type, status, created_at
FROM pending_images 
WHERE id = ${imageId} AND status = 'pending'
```

**Response Headers:**
- `Content-Type`: Image MIME type or 'application/octet-stream'
- `Content-Disposition`: `attachment; filename="${filename}"`
- `X-Image-ID`: Pending image ID
- `X-User-ID`: Owner user ID
- `X-Created-At`: Creation timestamp

**File Path Resolution:**
```javascript
const fullPath = path.join(__dirname, '../../', image.image_path.replace(/^\//, ''));
```

**Error Handling:**
- **404:** Image not found or not pending
- **404:** File not found on disk (marks as failed)
- **500:** File streaming errors

**Security:** API key authentication ensures only authorized media workers can download files

## Processing Completion System

### POST /api/media/complete/:id
**Purpose:** Mark image as processed with media ID and AI enhancement data

**Authentication:** API Key (media workers)

**Request Body Parameters:**
- `media_id` (string, required): Permanent media ID (must be numeric)
- `permanent_url` (string, optional): Permanent URL for processed image
- `processing_complete` (boolean, optional): Whether processing is fully complete
- `ai_enhanced` (boolean, optional): Whether AI enhancement was applied
- `formats_available` (array, optional): Available image formats
- `ai_analysis` (object, optional): AI analysis results

**Validation:**
- `media_id` is required and must be numeric
- Validates image exists and has 'pending' status

**Database Update:**
```sql
UPDATE pending_images 
SET permanent_url = ?, 
    thumbnail_url = ?,
    status = 'processed',
    updated_at = NOW()
WHERE id = ? AND status = 'pending'
```

**Smart URL Generation:**
- **Environment Variable:** Uses `process.env.SMART_MEDIA_BASE_URL`
- **Fallback:** Defaults to `https://api.beemeeart.com/api/images`
- **Format:** `${SMART_MEDIA_BASE_URL}/${media_id}`

**Response Structure:**
```json
{
  "success": true,
  "imageId": "123",
  "media_id": "789",
  "status": "processed",
  "smart_url_preview": "https://api.beemeeart.com/api/images/789",
  "ai_enhanced": true,
  "processing_complete": true,
  "message": "Image processed successfully with AI enhancement - ready for URL replacement"
}
```

**Logging:** Comprehensive logging including AI enhancement status, formats, and smart URL

## Cleanup and Error Handling

### DELETE /api/media/cleanup/:id
**Purpose:** Mark image as failed while preserving temporary file as fallback

**Authentication:** API Key (media workers)

**File Preservation Strategy:**
- **DO NOT DELETE** temporary files
- Files serve as fallbacks for failed processing
- Maintains availability for users until processing succeeds

**Database Update:**
```sql
UPDATE pending_images 
SET status = 'failed', updated_at = NOW() 
WHERE id = ${imageId}
```

**Response Structure:**
```json
{
  "success": true,
  "imageId": "123",
  "status": "failed",
  "message": "Temporary file deleted and marked as failed"
}
```

**Rationale:** Temporary files preserved to ensure user content remains accessible even if processing fails

## Contextual Data Endpoints

### Event Context - GET /api/media/event/:id
**Purpose:** Get event details for media processing context

**Authentication:** API Key (media workers)

**Database Query:**
```sql
SELECT e.*, et.name as event_type_name, et.description as event_type_description
FROM events e
LEFT JOIN event_types et ON e.event_type_id = et.id
WHERE e.id = ?
```

**Use Case:** Provides event information to media processing workers for contextual AI analysis

**Response:** Complete event details with type information for enhanced AI processing

### Product Context - GET /api/media/product/:id
**Purpose:** Get comprehensive product details for media processing context

**Authentication:** API Key (media workers)

**Query Parameters:**
- `include` (string, optional): Comma-separated list of related data to include
  - `inventory`: Product inventory data
  - `images`: Product images (temp and permanent)
  - `shipping`: Shipping information
  - `categories`: Product categories
  - `vendor`: Vendor/artist information

**Product Family Logic:**
- **Parent Product:** Simple or variable product (parent_id = null)
- **Child Product:** Product variation (has parent_id)
- **Family Structure:** Returns complete product family with parent/child relationships

**Database Queries:**
```sql
-- Base product
SELECT * FROM products WHERE id = ?

-- Parent product (if child requested)
SELECT * FROM products WHERE id = ?

-- Child products (if parent requested)
SELECT * FROM products WHERE parent_id = ? AND status = ? ORDER BY name ASC

-- Related data queries based on include parameter
SELECT * FROM product_inventory WHERE product_id = ?
SELECT image_path FROM pending_images WHERE image_path LIKE ? AND status = ?
SELECT image_url FROM product_images WHERE product_id = ? ORDER BY `order` ASC
SELECT * FROM product_shipping WHERE product_id = ?
-- ... additional queries based on include parameter
```

**Response Structure:**
```json
{
  "id": 789,
  "name": "Abstract Painting",
  "product_type": "variable",
  "vendor_id": 456,
  "children": [
    {
      "id": 790,
      "name": "Abstract Painting - Small",
      "parent_id": 789,
      "inventory": {...},
      "images": [...],
      "shipping": {...}
    }
  ],
  "family_size": 3,
  "requested_product_id": 789,
  "is_requested_product_parent": true,
  "vendor": {...},
  "inventory": {...},
  "images": [...],
  "shipping": {...}
}
```

**Image Handling:**
- **Temporary Images:** Uses naming pattern `/temp_images/products/${vendor_id}-${product_id}-%`
- **Permanent Images:** From `product_images` table ordered by display order
- **Combined Response:** Merges both temporary and permanent images

### User Context - GET /api/media/user/:id
**Purpose:** Get comprehensive user profile details for media processing context

**Authentication:** API Key (media workers)

**Database Queries:**
```sql
-- Base user data
SELECT u.id, u.username, u.email_verified, u.status, u.user_type, up.*
FROM users u LEFT JOIN user_profiles up ON u.id = up.user_id 
WHERE u.id = ?

-- Type-specific profiles
SELECT * FROM artist_profiles WHERE user_id = ?
SELECT * FROM community_profiles WHERE user_id = ?
SELECT * FROM promoter_profiles WHERE user_id = ?
```

**User Type Support:**
- **Artist:** Includes artist-specific profile data
- **Community:** Includes community profile information
- **Promoter:** Includes promoter profile details
- **Admin:** Base profile only

**Response:** Complete user profile with type-specific data merged into single object

**Validation:** Only returns active users with valid profiles

## AI Analysis Integration

### GET /api/media/analysis/:mediaId
**Purpose:** Get AI analysis data by proxying to processing VM

**Authentication:** API Key (media workers)

**External Service Integration:**
- **Backend URL:** `process.env.MEDIA_BACKEND_URL` or `http://10.128.0.29:3001`
- **API Key:** Hardcoded media processing API key
- **Timeout:** 10 second timeout for VM requests
- **Error Handling:** Comprehensive error handling for VM communication

**Proxy Configuration:**
```javascript
const vmResponse = await axios.get(`${MEDIA_BACKEND_URL}/analysis/${mediaId}`, {
  headers: {
    'Authorization': MEDIA_API_KEY
  },
  timeout: 10000,
  validateStatus: (status) => status < 500
});
```

**Response Structure:**
```json
{
  "success": true,
  "analysis": {
    // AI analysis data from processing VM
    "objects_detected": [...],
    "colors": [...],
    "composition": {...},
    "quality_score": 0.95,
    "enhancement_applied": true
  }
}
```

**Error Handling:**
- **404:** AI analysis not found for media
- **503:** Processing VM unavailable (ECONNREFUSED)
- **4xx/5xx:** VM error responses passed through
- **Timeout:** 10 second timeout with appropriate error response

## Environment Variables

### SMART_MEDIA_BASE_URL
**Usage:** Base URL for smart media URLs in processing completion

**Implementation:**
```javascript
smartUrl: `${process.env.SMART_MEDIA_BASE_URL || 'https://api.beemeeart.com/api/images'}/${media_id}`
```

**Purpose:**
- Constructs smart URLs for processed images
- Replaces hardcoded `api2.onlineartfestival.com` with configurable domain
- Provides fallback to `api.beemeeart.com/api/images` if not configured

### MEDIA_BACKEND_URL
**Usage:** URL for media processing VM communication

**Default:** `http://10.128.0.29:3001`

**Purpose:** Configures backend VM endpoint for AI analysis requests

## Security Considerations

### API Key Authentication
- **Middleware:** Uses `prefixAuth` for all endpoints
- **Purpose:** Ensures only authorized media workers can access endpoints
- **No CSRF:** Server-to-server communication doesn't require CSRF protection
- **Logging:** All requests logged with requester identification

### File Access Control
- **Path Validation:** Secure path resolution to prevent directory traversal
- **Status Validation:** Only pending images can be downloaded
- **File Existence:** Validates file exists before streaming
- **Error Handling:** Secure error responses without exposing system details

### Data Validation
- **Media ID Validation:** Numeric validation for media IDs
- **Parameter Sanitization:** Input validation for all parameters
- **SQL Injection Protection:** Parameterized queries throughout
- **Error Logging:** Comprehensive error logging without exposing sensitive data

## Performance Considerations

### Database Optimization
- **Indexed Queries:** Optimized queries on status, created_at, user_id
- **Pagination:** Efficient pagination for large datasets
- **Batch Processing:** Support for batch operations via `/pending/all`
- **Connection Pooling:** Efficient database connection management

### File Streaming
- **Stream Processing:** Efficient file streaming without loading into memory
- **Error Handling:** Proper stream error handling and cleanup
- **Headers:** Appropriate caching and content headers
- **Path Resolution:** Efficient path resolution and validation

### External Service Integration
- **Timeout Handling:** 10 second timeout for VM requests
- **Connection Pooling:** Efficient HTTP connection management
- **Error Recovery:** Graceful handling of VM unavailability
- **Status Validation:** Proper HTTP status code handling

## Error Handling

### Database Errors
- **Connection Errors:** Graceful handling of database connectivity issues
- **Query Errors:** Proper error logging and user-friendly responses
- **Transaction Handling:** Proper transaction management for data consistency
- **Validation Errors:** Clear validation error messages

### File System Errors
- **File Not Found:** Proper handling when files don't exist on disk
- **Permission Errors:** Handling of file system permission issues
- **Stream Errors:** Proper cleanup of file streams on errors
- **Path Errors:** Validation of file paths and directory traversal prevention

### External Service Errors
- **VM Unavailable:** Graceful handling when processing VM is down
- **Timeout Errors:** Proper timeout handling with user-friendly messages
- **Network Errors:** Handling of network connectivity issues
- **Authentication Errors:** Proper handling of API key authentication failures

## Logging and Monitoring

### Secure Logging
- **Request Logging:** All requests logged with context and requester info
- **Error Logging:** Comprehensive error logging with stack traces
- **Performance Logging:** Query timing and performance metrics
- **Security Logging:** Authentication attempts and access patterns

### Monitoring Points
- **Processing Queue:** Monitor pending image queue depth
- **Processing Success Rate:** Track completion vs failure rates
- **VM Communication:** Monitor external service health and response times
- **File System Health:** Monitor disk space and file system performance

## Usage Examples

### Fetch Pending Images for Processing
```javascript
// Get paginated pending images
const response = await fetch('/api/media/pending?limit=50&offset=0', {
  headers: {
    'Authorization': 'media_api_key_here'
  }
});

const data = await response.json();
console.log(`Found ${data.images.length} pending images`);
console.log(`Total pending: ${data.pagination.total}`);

// Process each image
for (const image of data.images) {
  console.log(`Processing image ${image.id}: ${image.original_name}`);
  
  // Download image for processing
  const downloadResponse = await fetch(`/api/media/download/${image.id}`, {
    headers: {
      'Authorization': 'media_api_key_here'
    }
  });
  
  // Process image...
  
  // Mark as complete
  await fetch(`/api/media/complete/${image.id}`, {
    method: 'POST',
    headers: {
      'Authorization': 'media_api_key_here',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      media_id: '12345',
      ai_enhanced: true,
      processing_complete: true,
      formats_available: ['webp', 'jpg', 'png']
    })
  });
}
```

### Get Contextual Data for Processing
```javascript
// Get product context for image processing
const productResponse = await fetch('/api/media/product/789?include=inventory,images,vendor', {
  headers: {
    'Authorization': 'media_api_key_here'
  }
});

const product = await productResponse.json();
console.log(`Processing images for ${product.name}`);
console.log(`Product type: ${product.product_type}`);
console.log(`Family size: ${product.family_size}`);
console.log(`Vendor: ${product.vendor.display_name}`);

// Get user context
const userResponse = await fetch('/api/media/user/456', {
  headers: {
    'Authorization': 'media_api_key_here'
  }
});

const user = await userResponse.json();
console.log(`User: ${user.display_name} (${user.user_type})`);
```

### Handle Processing Completion
```javascript
// Mark image as processed with AI enhancement
const completionResponse = await fetch('/api/media/complete/123', {
  method: 'POST',
  headers: {
    'Authorization': 'media_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    media_id: '789',
    permanent_url: 'https://api.beemeeart.com/api/images/789',
    processing_complete: true,
    ai_enhanced: true,
    formats_available: ['webp', 'jpg', 'png'],
    ai_analysis: {
      objects_detected: ['painting', 'canvas', 'frame'],
      dominant_colors: ['#ff6b6b', '#4ecdc4', '#45b7d1'],
      quality_score: 0.95
    }
  })
});

const result = await completionResponse.json();
console.log(`Image processed: ${result.smart_url_preview}`);
console.log(`AI enhanced: ${result.ai_enhanced}`);
```

### Get AI Analysis
```javascript
// Get AI analysis for processed media
const analysisResponse = await fetch('/api/media/analysis/789', {
  headers: {
    'Authorization': 'media_api_key_here'
  }
});

if (analysisResponse.ok) {
  const analysis = await analysisResponse.json();
  console.log('AI Analysis:', analysis.analysis);
} else if (analysisResponse.status === 503) {
  console.log('Processing VM unavailable');
} else if (analysisResponse.status === 404) {
  console.log('No AI analysis available for this media');
}
```
