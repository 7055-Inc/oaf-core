# Media Management API

## Overview
The Beemeeart Media Management API provides comprehensive media processing and file management capabilities. It handles image uploads, processing workflows, AI analysis, and contextual data for media processing. This API is designed for server-to-server communication with media processing workers and external services.

## Authentication
All endpoints require API key authentication. This API is designed for server-to-server communication and does not use standard user authentication.

## Base URL
```
https://api.beemeeart.com/media
```

## Media Processing Workflow

The media processing system follows this workflow:
1. **Upload:** Images uploaded to temporary storage
2. **Queue:** Images added to pending queue
3. **Processing:** External workers fetch and process images
4. **Completion:** Workers mark images as processed with permanent URLs
5. **Integration:** Smart URLs replace temporary paths throughout the system

## Pending Image Management

### Get Pending Images
`GET /api/media/pending`

Get pending images for processing with pagination support.

**Authentication:** Required - API Key (media workers)

**Query Parameters:**
- `limit` (number, default: 10): Number of images to return
- `offset` (number, default: 0): Pagination offset

**Response (200 OK):**
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

### Get All Pending Images
`GET /api/media/pending/all`

Get ALL pending images without pagination for batch processing.

**Authentication:** Required - API Key (media workers)

**Response (200 OK):**
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
  "total": 150
}
```

**Use Case:** Backend VMs use this endpoint for efficient batch processing of all pending images.

## File Download

### Download Image File
`GET /api/media/download/{id}`

Download temporary image file for processing.

**Authentication:** Required - API Key (media workers)

**Parameters:**
- `id` (path): Pending image ID

**Response Headers:**
- `Content-Type`: Image MIME type
- `Content-Disposition`: Attachment with filename
- `X-Image-ID`: Pending image ID
- `X-User-ID`: Owner user ID
- `X-Created-At`: Creation timestamp

**Response (200 OK):** Binary image file stream

**Error Responses:**
- `404` - Image not found or not in pending status
- `404` - Image file not found on disk
- `500` - Error reading file

## Processing Completion

### Mark Image as Processed
`POST /api/media/complete/{id}`

Mark image as processed with media ID and AI enhancement data.

**Authentication:** Required - API Key (media workers)

**Parameters:**
- `id` (path): Pending image ID

**Request Body:**
```json
{
  "media_id": "789",
  "permanent_url": "https://api.beemeeart.com/api/images/789",
  "processing_complete": true,
  "ai_enhanced": true,
  "formats_available": ["webp", "jpg", "png"],
  "ai_analysis": {
    "objects_detected": ["painting", "canvas", "frame"],
    "dominant_colors": ["#ff6b6b", "#4ecdc4", "#45b7d1"],
    "quality_score": 0.95
  }
}
```

**Required Fields:**
- `media_id` (string): Permanent media ID (must be numeric)

**Optional Fields:**
- `permanent_url` (string): Permanent URL for processed image
- `processing_complete` (boolean): Whether processing is fully complete
- `ai_enhanced` (boolean): Whether AI enhancement was applied
- `formats_available` (array): Available image formats
- `ai_analysis` (object): AI analysis results

**Response (200 OK):**
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

## Cleanup and Error Handling

### Mark Image as Failed
`DELETE /api/media/cleanup/{id}`

Mark image as failed while preserving temporary file as fallback.

**Authentication:** Required - API Key (media workers)

**Parameters:**
- `id` (path): Pending image ID

**Response (200 OK):**
```json
{
  "success": true,
  "imageId": "123",
  "status": "failed",
  "message": "Temporary file deleted and marked as failed"
}
```

**Note:** Temporary files are preserved as fallbacks to ensure user content remains accessible even if processing fails.

## Contextual Data Endpoints

### Get Event Context
`GET /api/media/event/{id}`

Get event details for media processing context.

**Authentication:** Required - API Key (media workers)

**Parameters:**
- `id` (path): Event ID

**Response (200 OK):**
```json
{
  "id": 123,
  "title": "Art Exhibition 2024",
  "description": "Contemporary art showcase",
  "start_date": "2024-03-15T18:00:00Z",
  "end_date": "2024-03-17T22:00:00Z",
  "event_type_name": "Exhibition",
  "event_type_description": "Art gallery exhibition",
  "location": "Downtown Gallery",
  "status": "active"
}
```

**Use Case:** Provides event information to media processing workers for contextual AI analysis.

### Get Product Context
`GET /api/media/product/{id}`

Get comprehensive product details for media processing context.

**Authentication:** Required - API Key (media workers)

**Parameters:**
- `id` (path): Product ID (can be parent or child product)

**Query Parameters:**
- `include` (string, optional): Comma-separated list of related data to include
  - `inventory`: Product inventory data
  - `images`: Product images (temporary and permanent)
  - `shipping`: Shipping information
  - `categories`: Product categories
  - `vendor`: Vendor/artist information

**Response (200 OK):**
```json
{
  "id": 789,
  "name": "Abstract Painting",
  "description": "Contemporary abstract artwork",
  "price": 1200.00,
  "product_type": "variable",
  "vendor_id": 456,
  "status": "active",
  "children": [
    {
      "id": 790,
      "name": "Abstract Painting - Small",
      "parent_id": 789,
      "price": 800.00,
      "inventory": {
        "qty_on_hand": 5,
        "qty_available": 5,
        "reorder_qty": 2
      },
      "images": [
        "/temp_images/products/456-790-image1.jpg",
        "https://api.beemeeart.com/api/images/123"
      ],
      "shipping": {
        "weight": 2.5,
        "dimensions": "24x18x2"
      }
    }
  ],
  "family_size": 3,
  "requested_product_id": 789,
  "is_requested_product_parent": true,
  "vendor": {
    "id": 456,
    "username": "artist123",
    "display_name": "Jane Smith",
    "business_name": "Smith Art Studio"
  },
  "inventory": {
    "qty_on_hand": 15,
    "qty_available": 12,
    "reorder_qty": 5
  },
  "images": [
    "/temp_images/products/456-789-image1.jpg",
    "https://api.beemeeart.com/api/images/456"
  ],
  "shipping": {
    "weight": 3.0,
    "dimensions": "30x24x3"
  }
}
```

**Product Family Logic:**
- Returns complete product family with parent/child relationships
- Supports both simple and variable product types
- Includes all related data based on `include` parameter

### Get User Context
`GET /api/media/user/{id}`

Get comprehensive user profile details for media processing context.

**Authentication:** Required - API Key (media workers)

**Parameters:**
- `id` (path): User ID

**Response (200 OK):**
```json
{
  "id": 456,
  "username": "artist123",
  "email_verified": true,
  "status": "active",
  "user_type": "artist",
  "first_name": "Jane",
  "last_name": "Smith",
  "display_name": "Jane Smith",
  "bio": "Contemporary artist specializing in abstract paintings",
  "profile_image_path": "/profiles/artist123.jpg",
  "business_name": "Smith Art Studio",
  "business_website": "https://janesmithart.com",
  "art_style": "Abstract Expressionism",
  "years_experience": 15
}
```

**User Types Supported:**
- **Artist:** Includes artist-specific profile data
- **Community:** Includes community profile information
- **Promoter:** Includes promoter profile details
- **Admin:** Base profile only

## AI Analysis

### Get AI Analysis
`GET /api/media/analysis/{mediaId}`

Get AI analysis data for a media item by proxying to processing VM.

**Authentication:** Required - API Key (media workers)

**Parameters:**
- `mediaId` (path): Media ID (must be numeric)

**Response (200 OK):**
```json
{
  "success": true,
  "analysis": {
    "objects_detected": [
      {
        "object": "painting",
        "confidence": 0.98,
        "bounding_box": [100, 50, 400, 300]
      },
      {
        "object": "canvas",
        "confidence": 0.95,
        "bounding_box": [80, 30, 420, 320]
      }
    ],
    "dominant_colors": [
      {
        "color": "#ff6b6b",
        "percentage": 35.2
      },
      {
        "color": "#4ecdc4",
        "percentage": 28.7
      }
    ],
    "composition": {
      "balance": "asymmetrical",
      "focal_points": 2,
      "complexity": "medium"
    },
    "quality_score": 0.95,
    "enhancement_applied": true,
    "processing_time": 2.3
  }
}
```

**Error Responses:**
- `404` - AI analysis not found for this media
- `503` - Processing VM unavailable
- `500` - Failed to fetch AI analysis

**Note:** This endpoint proxies requests to the media processing VM with a 10-second timeout.

## Error Responses

### Standard Error Format
```json
{
  "error": "Error description",
  "details": "Additional error details"
}
```

### Common Error Codes
- `400` - Bad Request (validation errors, invalid data)
- `401` - Unauthorized (invalid API key)
- `404` - Not Found (resource not found)
- `500` - Internal Server Error (server error)
- `503` - Service Unavailable (external service unavailable)

## Rate Limits
- **Pending image queries:** 1000 requests per hour per API key
- **File downloads:** 500 requests per hour per API key
- **Processing completion:** 1000 requests per hour per API key
- **Context queries:** 2000 requests per hour per API key

## Integration Examples

### Complete Processing Workflow
```javascript
// 1. Get pending images for processing
const pendingResponse = await fetch('/api/media/pending?limit=50', {
  headers: {
    'Authorization': 'your_media_api_key'
  }
});

const pendingData = await pendingResponse.json();
console.log(`Found ${pendingData.images.length} pending images`);

// 2. Process each image
for (const image of pendingData.images) {
  console.log(`Processing image ${image.id}: ${image.original_name}`);
  
  // Download image file
  const downloadResponse = await fetch(`/api/media/download/${image.id}`, {
    headers: {
      'Authorization': 'your_media_api_key'
    }
  });
  
  if (!downloadResponse.ok) {
    console.error(`Failed to download image ${image.id}`);
    continue;
  }
  
  // Get image buffer for processing
  const imageBuffer = await downloadResponse.arrayBuffer();
  
  // Process image with AI enhancement (your processing logic here)
  const processedResult = await processImageWithAI(imageBuffer);
  
  // Mark as complete
  const completeResponse = await fetch(`/api/media/complete/${image.id}`, {
    method: 'POST',
    headers: {
      'Authorization': 'your_media_api_key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      media_id: processedResult.mediaId,
      ai_enhanced: true,
      processing_complete: true,
      formats_available: ['webp', 'jpg', 'png'],
      ai_analysis: processedResult.analysis
    })
  });
  
  if (completeResponse.ok) {
    const result = await completeResponse.json();
    console.log(`Image processed successfully: ${result.smart_url_preview}`);
  }
}
```

### Contextual Processing with Product Data
```javascript
// Get product context for enhanced processing
const getProductContext = async (productId) => {
  const response = await fetch(`/api/media/product/${productId}?include=inventory,images,vendor,categories`, {
    headers: {
      'Authorization': 'your_media_api_key'
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to get product context');
  }
  
  return await response.json();
};

// Use context for AI processing
const processImageWithContext = async (imageId, productId) => {
  // Get product context
  const product = await getProductContext(productId);
  
  console.log(`Processing image for ${product.name}`);
  console.log(`Product type: ${product.product_type}`);
  console.log(`Vendor: ${product.vendor.display_name}`);
  console.log(`Categories: ${product.categories?.map(c => c.name).join(', ')}`);
  
  // Download image
  const downloadResponse = await fetch(`/api/media/download/${imageId}`, {
    headers: {
      'Authorization': 'your_media_api_key'
    }
  });
  
  const imageBuffer = await downloadResponse.arrayBuffer();
  
  // Process with context-aware AI
  const aiResult = await processWithContext(imageBuffer, {
    productType: product.product_type,
    categories: product.categories,
    vendorStyle: product.vendor.art_style
  });
  
  // Complete processing
  await fetch(`/api/media/complete/${imageId}`, {
    method: 'POST',
    headers: {
      'Authorization': 'your_media_api_key',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      media_id: aiResult.mediaId,
      ai_enhanced: true,
      processing_complete: true,
      ai_analysis: aiResult.analysis
    })
  });
};
```

### Batch Processing with Error Handling
```javascript
// Batch process all pending images
const batchProcessImages = async () => {
  try {
    // Get all pending images
    const response = await fetch('/api/media/pending/all', {
      headers: {
        'Authorization': 'your_media_api_key'
      }
    });
    
    const data = await response.json();
    console.log(`Starting batch processing of ${data.total} images`);
    
    const results = {
      processed: 0,
      failed: 0,
      errors: []
    };
    
    // Process in batches of 10
    const batchSize = 10;
    for (let i = 0; i < data.images.length; i += batchSize) {
      const batch = data.images.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (image) => {
        try {
          await processImage(image.id);
          results.processed++;
          console.log(`✓ Processed image ${image.id}`);
        } catch (error) {
          results.failed++;
          results.errors.push({
            imageId: image.id,
            error: error.message
          });
          
          // Mark as failed
          await fetch(`/api/media/cleanup/${image.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': 'your_media_api_key'
            }
          });
          
          console.error(`✗ Failed to process image ${image.id}: ${error.message}`);
        }
      });
      
      await Promise.all(batchPromises);
      console.log(`Completed batch ${Math.floor(i / batchSize) + 1}`);
    }
    
    console.log(`Batch processing complete:`);
    console.log(`- Processed: ${results.processed}`);
    console.log(`- Failed: ${results.failed}`);
    
    return results;
    
  } catch (error) {
    console.error('Batch processing failed:', error);
    throw error;
  }
};
```

### AI Analysis Integration
```javascript
// Get AI analysis for processed media
const getAIAnalysis = async (mediaId) => {
  try {
    const response = await fetch(`/api/media/analysis/${mediaId}`, {
      headers: {
        'Authorization': 'your_media_api_key'
      }
    });
    
    if (response.status === 404) {
      console.log('No AI analysis available for this media');
      return null;
    }
    
    if (response.status === 503) {
      console.log('Processing VM unavailable, retrying later...');
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`Failed to get AI analysis: ${response.status}`);
    }
    
    const data = await response.json();
    return data.analysis;
    
  } catch (error) {
    console.error('Error getting AI analysis:', error);
    return null;
  }
};

// Use AI analysis data
const analysis = await getAIAnalysis('789');
if (analysis) {
  console.log('Objects detected:', analysis.objects_detected);
  console.log('Dominant colors:', analysis.dominant_colors);
  console.log('Quality score:', analysis.quality_score);
  console.log('Enhancement applied:', analysis.enhancement_applied);
}
```
