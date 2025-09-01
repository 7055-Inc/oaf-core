# Image Processing System - Technical Reference

## Overview
The Online Art Festival platform uses a distributed image processing system with temporary uploads, background processing, and smart serving with responsive images.

## System Architecture

```
Frontend Upload → API Server → Temp Storage → Processing VM → Smart Serving Proxy
     ↓              ↓             ↓              ↓              ↓
   File Input    Multer       /temp_images/   Responsive     /api/images/
   Component     Upload       pending_images   Processing     {media_id}
```

## 1. Upload Flow

### Frontend → API Server
- **Endpoint**: `PATCH /users/me` (with multipart form data)
- **File Fields**: 
  - `profile_image` → Profile photo
  - `header_image` → Header/banner image  
  - `logo_image` → Business logo
  - `site_image` → Site/tenant media (banners, backgrounds, content)
- **File Limits**: 5MB max, image formats only
- **Storage**: Files saved to `/temp_images/profiles/` and `/temp_images/sites/` with format: `{userId}-{type}-{timestamp}.{ext}`

### Database Tracking
```sql
-- pending_images table structure
CREATE TABLE pending_images (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  image_path VARCHAR(255) NOT NULL,        -- /temp_images/profiles/123-profile-456.jpg
  original_name VARCHAR(255),
  mime_type VARCHAR(100),
  permanent_url VARCHAR(500),              -- Media ID after processing
  thumbnail_url VARCHAR(500),              -- Same as permanent_url (media ID)
  status ENUM('pending','processed','complete','failed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 2. Processing VM Integration

### VM Responsibilities
1. **Monitor**: Watch for `status = 'pending'` in `pending_images` table
2. **Download**: Fetch temp images from `/temp_images/` directory
3. **Process**: Create responsive image variants (thumbnail, small, grid, detail, header, zoom)
4. **Store**: Save processed images in VM's media storage system
5. **Notify**: Call completion API with media ID

### VM API Endpoints to Call

#### Get Pending Images
```http
GET /api/media/pending/all
Authorization: Bearer {MEDIA_API_KEY}

Response:
{
  "images": [
    {
      "id": 123,
      "user_id": 456,
      "image_path": "/temp_images/profiles/456-profile-789.jpg",
      "original_name": "my-photo.jpg",
      "mime_type": "image/jpeg",
      "status": "pending",
      "created_at": "2024-01-01T10:00:00Z"
    }
  ],
  "total": 25
}
```

#### Mark Processing Complete
```http
POST /api/media/complete/{pending_image_id}
Authorization: Bearer {MEDIA_API_KEY}
Content-Type: application/json

{
  "media_id": "789"  // Numeric ID from VM's media system
}

Response:
{
  "success": true,
  "imageId": 123,
  "media_id": "789",
  "status": "processed",
  "smart_url_preview": "https://api2.onlineartfestival.com/api/images/789"
}
```

#### Mark Processing Failed
```http
DELETE /api/media/cleanup/{pending_image_id}
Authorization: Bearer {MEDIA_API_KEY}

Response:
{
  "success": true,
  "message": "Image marked as failed and temp file cleaned up"
}
```

## 3. Smart Serving System

### Proxy Endpoint
- **URL Pattern**: `https://api2.onlineartfestival.com/api/images/{media_id}?size={size}`
- **Size Options**: `thumbnail`, `small`, `grid`, `detail`, `header`, `zoom`
- **Format Negotiation**: Supports AVIF, WebP, JPEG based on Accept header
- **Caching**: 1 hour cache headers

### Backend Integration
The proxy forwards requests to the media VM:
```
Frontend Request: /api/images/789?size=thumbnail
Proxied To: http://34.60.105.144:3001/serve/789?size=thumbnail
```

## 4. URL Replacement Process

### Automatic Background Script
- **File**: `/api-service/scripts/replace-temp-urls.js`
- **Frequency**: Run periodically (cron job recommended)
- **Function**: Replaces temp URLs with permanent smart serving URLs

### Database Updates Made by Script
```sql
-- Profile images
UPDATE user_profiles SET profile_image_path = 'https://api2.onlineartfestival.com/api/images/789?size=detail' 
WHERE profile_image_path = '/temp_images/profiles/456-profile-789.jpg';

-- Header images  
UPDATE user_profiles SET header_image_path = 'https://api2.onlineartfestival.com/api/images/790?size=detail'
WHERE header_image_path = '/temp_images/profiles/456-header-790.jpg';

-- Logo images (artist profiles)
UPDATE artist_profiles SET logo_path = 'https://api2.onlineartfestival.com/api/images/791?size=detail'
WHERE logo_path = '/temp_images/profiles/456-logo-791.jpg';

-- Logo images (promoter profiles)  
UPDATE promoter_profiles SET logo_path = 'https://api2.onlineartfestival.com/api/images/791?size=detail'
WHERE logo_path = '/temp_images/profiles/456-logo-791.jpg';

-- Site media (multisite environment)
UPDATE site_media SET media_path = 'https://api2.onlineartfestival.com/api/images/792?size=detail'
WHERE media_path = '/temp_images/sites/456-site-792.jpg';
```

## 5. Frontend Display Integration

### Media Enhancement Function
The API automatically enhances user profile data with smart serving URLs:

```javascript
// In /users/me endpoint
const enhancedUserData = await enhanceUserProfileWithMedia(userData);

// Converts:
{
  profile_image_path: "/temp_images/profiles/456-profile-789.jpg"
}

// To:
{
  profile_image_path: "https://api2.onlineartfestival.com/api/images/789?size=detail"
}
```

### Frontend Image Display
```javascript
// Profile thumbnails
<img src={`${userData.profile_image_path}?size=thumbnail`} alt="Profile" />

// Full size images
<img src={`${userData.profile_image_path}?size=detail`} alt="Profile" />

// Header images
<img src={`${userData.header_image_path}?size=header`} alt="Header" />

// Logo images  
<img src={`${userData.logo_path}?size=small`} alt="Logo" />

// Site/tenant media
<img src={`${siteData.banner_image}?size=header`} alt="Site Banner" />
<img src={`${siteData.background_image}?size=detail`} alt="Site Background" />
```

## 6. File Naming Convention

### Temp Files
Format: `{userId}-{type}-{timestamp}-{random}.{ext}`

Examples:
- `123-profile-1704110400-987654321.jpg`
- `123-header-1704110401-987654322.png`
- `123-logo-1704110402-987654323.webp`
- `123-site-1704110403-987654324.jpg`

### Type Mapping
- `profile` → Profile photo
- `header` → Header/banner image
- `logo` → Business logo (dedicated processing with brand-aware AI)
- `sites` → Site/tenant media (multisite environment content)

## 7. Error Handling

### Common Issues
1. **File too large**: 5MB limit enforced by multer
2. **Invalid format**: Only image files accepted
3. **Processing timeout**: VM should mark as failed after reasonable time
4. **Storage full**: VM should handle gracefully and report failure

### Status Flow
```
pending → processed → complete (via URL replacement script)
pending → failed (if processing fails)
```

## 8. Security Considerations

### API Authentication
- Media VM uses API key authentication
- Endpoint: `/api/media/*` requires `Authorization: Bearer {MEDIA_API_KEY}`
- API key should be environment variable

### File Access
- Temp files served directly by main API server
- Processed files served only through smart serving proxy
- No direct file system access from frontend

## 9. Monitoring & Debugging

### Key Metrics to Monitor
1. **Pending queue length**: `SELECT COUNT(*) FROM pending_images WHERE status = 'pending'`
2. **Processing failures**: `SELECT COUNT(*) FROM pending_images WHERE status = 'failed'`
3. **Average processing time**: Track time between `created_at` and status change
4. **Proxy response times**: Monitor `/api/images/*` endpoint performance

### Debug Queries
```sql
-- Find stuck images
SELECT * FROM pending_images 
WHERE status = 'pending' 
AND created_at < NOW() - INTERVAL 1 HOUR;

-- Find recent failures
SELECT * FROM pending_images 
WHERE status = 'failed' 
AND updated_at > NOW() - INTERVAL 1 DAY;

-- Check URL replacement progress
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN image_path LIKE '/temp_images/%' THEN 1 ELSE 0 END) as temp_urls,
  SUM(CASE WHEN image_path LIKE 'https://api2.onlineartfestival.com/api/images/%' THEN 1 ELSE 0 END) as permanent_urls
FROM user_profiles 
WHERE profile_image_path IS NOT NULL;
```

## 10. Configuration

### Environment Variables
```bash
# Main API Server
SMART_MEDIA_BASE_URL=https://api2.onlineartfestival.com/api/images
MEDIA_API_KEY=your-secure-api-key-here

# Media VM (configured)
MEDIA_BACKEND_URL=http://34.60.105.144:3001
MAIN_API_URL=https://api2.onlineartfestival.com
MAIN_API_KEY=your-secure-api-key-here
```

---

## 11. BACKEND IMPLEMENTATION STATUS ✅

### **Processing VM Architecture (IMPLEMENTED)**

The media backend VM is **fully operational** with the following confirmed implementation:

#### **1. Monitoring System (ACTIVE)**
- **Method**: Polling-based worker loop (not webhooks)
- **Endpoint**: `GET /api/media/pending/all` (not paginated as frontend expects)
- **Frequency**: Continuous polling with 10-minute downtime when no work available
- **Worker Coordination**: Multi-worker support with collision prevention

#### **2. Storage Architecture (CONFIRMED)**
```
/var/www/media-backend/storage/
├── bulk/           # Original preservation (date-organized: /2025-01-15/)
├── library/        # Processed files (/user_123/product|profile|event|logo|sites/img/)
│   └── user_123/
│       ├── product/img/     # Product catalog images
│       ├── profile/img/     # Profile photos & headers
│       ├── event/img/       # Event media
│       ├── logo/img/        # Brand logos (AI brand-aware processing)
│       └── sites/img/       # Multisite tenant media (context-enhanced)
└── thumbnails/     # Generated previews (legacy - now integrated)
```

#### **3. Size Variants (IMPLEMENTED)**
- **thumbnail**: 300x300 pixels (square crop)
- **small**: Variable dimensions, optimized for mobile
- **grid**: 500x500 pixels (gallery display)
- **detail**: 1200x1200 pixels (full view)
- **header**: Wide aspect ratio for banners
- **zoom**: High resolution for detailed viewing

#### **4. Format Strategy (CUTTING-EDGE)**
- **AVIF**: Next-generation format (50% better compression)
- **WebP**: Modern browser support
- **JPEG**: Universal fallback
- **Smart Negotiation**: Automatic format selection based on browser capabilities

#### **5. AI-Enhanced Processing (ACTIVE)**
- **Google Vision API**: Object detection, color analysis, text extraction
- **GPT-4 Vision**: Style classification, medium detection, quality scoring
- **Vector Embeddings**: Searchable visual characteristics
- **Smart Cropping**: AI-aware composition preservation
- **Logo-Specific AI**: Brand recognition, logo optimization, trademark-aware processing
- **Sites Context AI**: Multisite tenant context integration with profile and catalog data

#### **6. Self-Healing System (OPERATIONAL)**
- **Automatic Recovery**: Detects and retries failed processing steps
- **Smart Healing**: Processes up to 10 failed items per cycle
- **Retry Logic**: 3 attempts per module with exponential backoff
- **Module Tracking**: Complete step-by-step progress monitoring

### **Database Implementation (CONFIRMED)**

The backend uses its own database schema (MySQL `oaf_media`):

```sql
-- ACTUAL BACKEND TABLES (not pending_images)
CREATE TABLE media_files (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  main_api_id BIGINT NOT NULL,           -- Links to frontend pending_images.id
  user_id BIGINT NOT NULL,
  data_type ENUM('product', 'profile', 'event', 'logo', 'sites') NOT NULL,
  original_name VARCHAR(255),
  mime_type VARCHAR(100),
  file_size BIGINT,
  bulk_path VARCHAR(500),                -- Date-organized originals
  library_path VARCHAR(500),             -- Processed files location
  status ENUM('downloading', 'processing', 'completed', 'failed'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE processing_checklist (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  media_id BIGINT NOT NULL,              -- FK to media_files.id
  worker_id VARCHAR(50) NOT NULL,
  retrieve_file ENUM('pending','completed','failed') DEFAULT 'pending',
  ai_visual_analysis ENUM('pending','completed','failed') DEFAULT 'pending',
  resize_optimize ENUM('pending','completed','failed') DEFAULT 'pending',
  update_callback ENUM('pending','completed','failed') DEFAULT 'pending',
  -- Attempt counters for retry logic
  retrieve_file_attempts INT DEFAULT 0,
  ai_visual_analysis_attempts INT DEFAULT 0,
  resize_optimize_attempts INT DEFAULT 0,
  update_callback_attempts INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE media_ai_analysis (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  media_id BIGINT NOT NULL,              -- FK to media_files.id
  dominant_colors JSON,
  detected_objects JSON,
  detected_text TEXT,
  style_classification VARCHAR(255),
  medium_detected VARCHAR(255),
  subject_matter TEXT,
  quality_score INT,
  mood_keywords JSON,
  confidence_score FLOAT,
  raw_google_response JSON,
  raw_gpt4_response JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Smart Serving Implementation (LIVE)**

The smart serving system is **fully operational**:

```javascript
// CONFIRMED ENDPOINT
GET /serve/{mediaId}?size={size}&format={format}

// CONFIRMED FEATURES
- Intelligent format negotiation (AVIF → WebP → JPEG)
- Size fallbacks (thumbnail → small → grid → detail)
- 1-year browser caching
- Database-driven file location
- AI-enhanced filename parsing
```

---

## 12. INTEGRATION GAPS & REQUIRED CHANGES

### **🚨 CRITICAL API ENDPOINT MISMATCHES**

#### **Issue 1: Pending Images Endpoint** ✅ RESOLVED
**Frontend Must Use:**
```http
GET /api/media/pending/all
```

**Backend Implementation:** Timer-based steady processing with self-healing schedule handles all pending items efficiently. No pagination needed - backend manages processing pace automatically.

#### **Issue 2: Data Type Mapping** ✅ STANDARD DEFINED
**Frontend Must Implement:**

```javascript
// Required form fields and data type mapping
const MEDIA_TYPE_MAPPING = {
  'profile_image': 'profile',
  'header_image': 'profile', 
  'logo_image': 'logo',
  'site_image': 'sites',
  'product_image': 'product',
  'event_image': 'event'
};

// Upload endpoint expansion
PATCH /users/me (multipart form data)
- profile_image → data_type: 'profile'
- header_image → data_type: 'profile'  
- logo_image → data_type: 'logo'
- site_image → data_type: 'sites'
```

**Backend Processing:**
- `logo` → Brand-aware AI with background removal options
- `sites` → Context-enhanced with profile/catalog data integration

#### **Issue 3: Rich Callback Payload** ✅ STANDARD DEFINED
**Frontend Must Handle:**
```http
POST /api/media/complete/{main_api_id}
Body: { 
  "permanent_url": "https://media-backend/serve/789",
  "processing_complete": true,
  "ai_enhanced": true,
  "formats_available": ["avif", "webp", "jpeg", "png"],
  "ai_analysis": {
    "style": "Abstract Expressionist",
    "medium": "Oil on Canvas",
    "quality_score": 85,
    "mood_keywords": ["vibrant", "energetic"],
    "brand_colors": ["#FF5733", "#33A1FF"], // For logos
    "site_context": {...}, // For sites
    "background_removed": true // For logos with bg removal
  }
}
```

**Frontend Implementation:** Receive full payload, extract needed data, sort/display in frontend logic.

### **🔧 REQUIRED FRONTEND UPDATES**

#### **1. New API Endpoint for AI Analysis Access**
```javascript
// NEW ENDPOINT - Access AI analysis data
GET /api/media/analysis/{media_id}
Authorization: Bearer {API_KEY}

Response:
{
  "success": true,
  "analysis": {
    "style": "Abstract Expressionist",
    "medium": "Oil on Canvas", 
    "quality_score": 85,
    "mood_keywords": ["vibrant", "energetic"],
    "brand_colors": ["#FF5733", "#33A1FF"], // For logos
    "site_context": {...}, // For sites
    "dominant_colors": [...],
    "detected_objects": [...],
    "confidence_score": 0.92
  }
}
```

#### **2. Logo Background Removal Options**
```javascript
// Smart serving with background options
GET /serve/{mediaId}?size=thumbnail&bg=removed  // Background removed
GET /serve/{mediaId}?size=thumbnail&bg=original // Original with background

// Both versions generated automatically - user chooses after processing
```

#### **3. Enhanced Image Display Components**
```javascript
// REQUIRED - Smart image component with AI integration
<SmartImage 
  mediaId={mediaId} 
  size="thumbnail" 
  alt="Profile"
  backgroundOption="removed" // For logos: 'removed' or 'original'
  preferredFormats={['avif', 'webp', 'jpeg', 'png']}
  showAIData={true} // Optional: display AI analysis
/>
```

#### **4. AI Analysis Display Component**
```javascript
// OPTIONAL - Display AI analysis to users
<AIAnalysisDisplay 
  mediaId={mediaId}
  showStyle={true}
  showColors={true}
  showQuality={true}
  showMood={true}
/>
```

### **🎨 ENHANCED AI PROCESSING FOR NEW TYPES**

#### **Logo Processing (Brand-Aware AI)**
- **Brand Recognition**: Identifies existing brand elements and trademarks
- **Logo Optimization**: Specialized cropping and sizing for brand consistency
- **Color Palette Extraction**: Brand color identification for theme consistency
- **Vector-Style Processing**: Optimized for clean, scalable logo rendering
- **Background Removal**: Automatic background detection and removal options
- **Format Prioritization**: PNG with transparency support, AVIF for web optimization

#### **Sites Processing (Context-Enhanced AI)**
- **Multisite Context**: Integrates user profile and catalog data for enhanced analysis
- **Tenant-Aware Processing**: Considers site theme, brand guidelines, and content strategy
- **Content Classification**: Identifies banners, backgrounds, content images, UI elements
- **Responsive Optimization**: Generates variants optimized for different site layouts
- **Brand Consistency**: Ensures alignment with user's existing brand elements
- **SEO Enhancement**: Generates alt text and metadata aligned with site content strategy

### **📊 PERFORMANCE CHARACTERISTICS (CONFIRMED)**

- **Processing Time**: 
  - Standard images: 30-60 seconds (includes AI analysis)
  - Logo processing: 45-75 seconds (includes brand analysis)
  - Sites processing: 60-90 seconds (includes context integration)
- **Concurrent Processing**: 1 image per worker (scalable by adding workers)
- **File Sizes**: 
  - AVIF: ~50% smaller than WebP
  - WebP: ~30% smaller than JPEG
  - PNG: For logos with transparency
  - Multiple sizes: 300x300 to 1200x1200 pixels
- **AI Analysis**: Google Vision + GPT-4 Vision + Vector embeddings + Context integration
- **Storage Efficiency**: Date-organized originals + user-organized processed files

### **🎯 IMMEDIATE FRONTEND ACTION ITEMS**

1. ✅ **API Endpoint**: Use `GET /api/media/pending/all` (no pagination needed)
2. ✅ **Data Type Mapping**: Implement the defined MEDIA_TYPE_MAPPING object
3. ✅ **Rich Callback Handling**: Update to receive and process full AI metadata payload
4. **NEW ENDPOINT**: Implement `GET /api/media/analysis/{media_id}` for AI data access
5. **Background Options**: Add `?bg=removed|original` parameter support for logos
6. **Smart Components**: Create SmartImage component with AI integration
7. **Form Fields**: Add `site_image` field for multisite tenant media uploads
8. **Format Support**: Handle AVIF, WebP, JPEG, PNG format negotiation
9. **AI Display**: Optional AIAnalysisDisplay component for showing analysis data
10. **Error Handling**: Handle AI processing states in frontend logic

---

## Remaining Questions for Frontend Team

**RESOLVED ITEMS:** ✅ Data type mapping, API endpoints, callback payload handling, processing time expectations, background removal approach

**REMAINING DECISIONS:**

1. **AI Data Display**: Which AI analysis data should be visible to users?
   - Style classification and medium detection?
   - Quality scores and mood keywords?
   - Brand colors (for logos)?
   - Site context data (for multisite)?

2. **User Experience**: Should AI analysis be:
   - Always visible to users?
   - Available on-demand (click to view)?
   - Admin-only feature?

3. **Logo Background Choice**: Should users:
   - See both versions (original + background removed) and choose?
   - Get background removed by default with option to toggle?
   - Make the choice during upload?

4. **Sites Context Integration**: For multisite tenant media, should the frontend:
   - Display context-aware suggestions?
   - Show brand consistency recommendations?
   - Integrate with existing site theme settings?

5. **Error Handling UX**: How should the frontend display:
   - AI analysis failures (show generic image)?
   - Partial processing success (image processed but AI failed)?
   - Context integration failures for sites?

---

*Generated: $(date)*
*Last Updated: After backend system analysis - INTEGRATION READY*
