# Image Processing System - Technical Reference

## Overview
The Brakebee platform uses a distributed **image, video, and document** processing system with temporary uploads, background processing, smart serving with responsive images/video, and a **smart search system** (semantic + filter search, search logging, missed-concept detection, and pattern-based recommendations for adding new analysis fields). **Documents** (PDF, Word, CSV, etc.) use a separate pipeline: text extraction, optional GPT summary/entities, stored in `document_analysis` and linked to user profile / overall data.

## API v2 (main API media module)
Worker endpoints have been moved into the v2 module. Use the **main API** base URL (e.g. `MAIN_API_URL`):

- **Preferred base path:** `{MAIN_API_URL}/api/v2/media`
- **Legacy base path (still supported):** `{MAIN_API_URL}/api/media`

**Authentication:** Send one of:
1. **Bearer token (recommended):** Set `MAIN_API_KEY` on main API and media backend to the same value. Send `Authorization: Bearer {MAIN_API_KEY}`.
2. **API key pair:** Send `Authorization: {publicKey}:{privateKey}` (no "Bearer " prefix).

Public proxy (no auth): `GET /api/v2/media/images/{media_id}?size=...`, `GET /api/v2/media/serve/*`.

## System Architecture

```
Frontend Upload → API Server → Temp Storage → Media Backend (Processing) → Smart Serving Proxy
     ↓              ↓             ↓              ↓                              ↓
   File Input    Multer       /temp_images/   Images + Video same pipeline    /api/images/
   Component     Upload       pending_images   AI analysis + vectors           {media_id}
                                                                                + /api/search
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

### VM API Endpoints to Call (v2)

**Base URL:** Use main API base (e.g. `MAIN_API_URL`). Worker endpoints are available at **both** paths for compatibility:

- **Preferred (v2):** `{MAIN_API_URL}/api/v2/media`
- **Legacy:** `{MAIN_API_URL}/api/media`

**Authentication:** The main API accepts **either** of the following:

1. **Bearer token (recommended for media server):** Set `MAIN_API_KEY` on both main API and media backend to the same secret. Send:
   ```http
   Authorization: Bearer {MAIN_API_KEY}
   ```
2. **API key pair:** Create an API key in the dashboard (Developers → API Keys). Send:
   ```http
   Authorization: {publicKey}:{privateKey}
   ```
   (No "Bearer " prefix; colon-separated pair.)

#### Get Pending Images
```http
GET /api/v2/media/pending?limit=10&offset=0
# or GET /api/media/pending?limit=10&offset=0
Authorization: Bearer {MAIN_API_KEY}

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
  "pagination": { "total": 25, "limit": 10, "offset": 0, "hasMore": true }
}
```

#### Get All Pending (no pagination)
```http
GET /api/v2/media/pending/all
# or GET /api/media/pending/all
Authorization: Bearer {MAIN_API_KEY}
```

#### Download Temp File
```http
GET /api/v2/media/download/{pending_image_id}
# or GET /api/media/download/{pending_image_id}
Authorization: Bearer {MAIN_API_KEY}
```
Returns file stream with headers `X-Image-ID`, `X-User-ID`, `X-Created-At`.

#### Mark Processing Complete
```http
POST /api/v2/media/complete/{pending_image_id}
# or POST /api/media/complete/{pending_image_id}
Authorization: Bearer {MAIN_API_KEY}
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
  "smart_url_preview": "https://your-api-domain.com/api/v2/media/images/789"
}
```

#### Mark Processing Failed
```http
DELETE /api/v2/media/cleanup/{pending_image_id}
# or DELETE /api/media/cleanup/{pending_image_id}
Authorization: Bearer {MAIN_API_KEY}

Response:
{
  "success": true,
  "imageId": 123,
  "status": "failed",
  "message": "Temporary file deleted and marked as failed"
}
```

#### Context Endpoints (event, product, user)
```http
GET /api/v2/media/event/{event_id}
GET /api/v2/media/product/{product_id}?include=inventory,images,shipping,categories,vendor
GET /api/v2/media/user/{user_id}
Authorization: Bearer {MAIN_API_KEY}
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
Proxied To: http://media-backend:3001/serve/789?size=thumbnail
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

-- Site/tenant media (multisite environment)
UPDATE site_media SET media_path = 'https://api2.onlineartfestival.com/api/images/792?size=detail'
WHERE media_path = '/temp_images/sites/456-site-792.jpg';

-- Site banners and backgrounds
UPDATE tenant_settings SET banner_image = 'https://api2.onlineartfestival.com/api/images/793?size=header'
WHERE banner_image = '/temp_images/sites/456-banner-793.jpg';
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

**Main API Server (Brakebee API):**
```bash
# Base URL for smart-serving image URLs (used in responses and frontend)
SMART_MEDIA_BASE_URL=https://your-api-domain.com/api/v2/media/images

# Auth for media worker: shared secret; media backend sends Authorization: Bearer MAIN_API_KEY
MAIN_API_KEY=your-secure-media-worker-secret

# Optional: same as MAIN_API_KEY; used by media module for Bearer auth
MEDIA_API_KEY=your-secure-media-worker-secret

# Used when main API calls media backend (e.g. analysis proxy, proxy to serve/images)
MEDIA_BACKEND_URL=https://your-media-backend-domain.com   # or http://host:3001
```

**Media Backend (processing VM):**
```bash
# Base URL of the main API (no trailing slash). Worker calls: {MAIN_API_URL}/api/v2/media/...
MAIN_API_URL=https://your-api-domain.com

# Same secret as main API MAIN_API_KEY. Send as: Authorization: Bearer MAIN_API_KEY
MAIN_API_KEY=your-secure-media-worker-secret
```

---

## 11. BACKEND IMPLEMENTATION STATUS ✅

### **Processing VM Architecture (IMPLEMENTED)**

The media backend VM is **fully operational** with the following confirmed implementation:

#### **1. Monitoring System (ACTIVE)**
- **Method**: Polling-based worker loop (not webhooks)
- **Endpoint**: `GET {MAIN_API_URL}/api/v2/media/pending/all` (or `/api/media/pending/all`)
- **Auth**: `Authorization: Bearer {MAIN_API_KEY}` (or API key pair `publicKey:privateKey`)
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
- **Vector Embeddings**: Searchable visual characteristics (visual, style, emotion)
- **Smart Cropping**: AI-aware composition preservation
- **Logo-Specific AI**: Brand recognition, logo optimization, trademark-aware processing
- **Sites Context AI**: Multisite tenant context integration with profile and catalog data

#### **5b. Video in Same Pipeline (ACTIVE)**
- **Single pipeline**: Images and video share retrieve → AI analysis → optimize → update_callback.
- **Video AI**: Key-frame extraction (0%, 25%, 50%, 75%, 100%) → Google Vision on each frame → aggregate results → GPT-4 Vision on middle frame → same embeddings + `media_ai_analysis` / `media_vectors`.
- **Video optimize**: Poster (first frame JPEG) + MP4/WebM transcodes per size from `config/optimization.json` `video_sizes`. Output under `.../user_X/{data_type}/video/`.
- **No new AI packages**: Uses existing Vision, GPT-4V, embeddings; FFmpeg (system) for key-frame extraction and transcode.

#### **5c. Document / Spreadsheet / Presentation Pipeline (ACTIVE)**
- **Branch by file kind**: After retrieve, `getFileKind(mime, path)` routes to **visual pipeline** (image/video) or **document pipeline** (document/spreadsheet/presentation).
- **Document pipeline**: retrieve → **document_analysis** (text extraction + optional GPT summary/entities) → update_callback. No Vision, no resize/optimize; `document_analysis` table stores extracted text, summary, language, page/sheet/slide counts, key_entities, word_count.
- **Additional document types** (beyond images and video):

| Category       | Extensions              | MIME / notes |
|----------------|-------------------------|--------------|
| **Documents**  | .pdf, .doc, .docx, .txt, .rtf, .md, .odt | PDF, Word, plain text, Markdown, RTF, OpenDocument Text |
| **Spreadsheets** | .csv, .xls, .xlsx, .ods | CSV, Excel, OpenDocument Spreadsheet |
| **Presentations** | .ppt, .pptx, .odp | PowerPoint, OpenDocument Presentation |

- **Text extraction**: PDF (pdf-parse), Word .doc/.docx (mammoth), .txt/.md (fs), CSV (csv-parse), .xls/.xlsx/.ods (xlsx). Presentations (.ppt/.pptx/.odp) stored with placeholder (no extractor yet).
- **Callback**: Documents get `formats_available: ['original']`, `ai_analysis: { type: 'document', file_kind, summary, language, key_entities, ... }`. Same entry point (main API pending) and completion callback; document results feed user profile / overall data.
- **Storage for documents**: Original is stored in **bulk** (date-organized path from retrieve); a **copy** is filed in the user library at `library/user_{userId}/{data_type}/docs/{mediaId}_original{ext}` and `media_files.library_path` is set. `/serve/:mediaId` serves from **library_path** (library copy) when set, else bulk_path. Documents do **not** smart-serve sizes (single file only).
- **Video smart-serve**: Video is optimized (poster + transcodes per size to `library/.../video/`) and **smart-serves like images**: `/serve/:mediaId?size=...&format=...` picks the best size (thumbnail/preview/detail) and format (mp4/webm) from library. Poster image is used for thumbnail/small when requested.

#### **6. Self-Healing System (OPERATIONAL)**
- **Automatic Recovery**: Detects and retries failed processing steps
- **Smart Healing**: Processes up to 10 failed items per cycle; healing query includes `update_callback = 'pending'` so items that finished processing but never reported back get retried
- **Healing mediaInfo**: Includes `main_api_id` and `bulk_path` so the completion callback POSTs to `/api/media/complete/{main_api_id}` correctly
- **Retry Logic**: 3 attempts per module with exponential backoff
- **Module Tracking**: Complete step-by-step progress monitoring

#### **6b. Alternative Data Types (LOGGED)**
- **Known data types**: `product`, `profile`, `event`, `logo`, `sites`. Any other value is logged as **ALTERNATIVE DATA TYPE**.
- **Where logged**: Pipeline start, incoming API media, retrieve start, retry/existing record (healing), and healing (retry). Enables spotting new media kinds (e.g. new `data_type` from main API) so schema can be extended.

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
**Media backend should call:**
```http
GET {MAIN_API_URL}/api/v2/media/pending/all
Authorization: Bearer {MAIN_API_KEY}
```
Legacy path still supported: `GET /api/media/pending/all`.

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
**Media backend should call:**
```http
POST {MAIN_API_URL}/api/v2/media/complete/{main_api_id}
Authorization: Bearer {MAIN_API_KEY}
Content-Type: application/json
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

## 13. SMART SEARCH SYSTEM & APIS FOR MAIN SERVER / WEB

The media backend exposes **search APIs** so the main server (and web UI) can query analyzed media by content, style, mood, colors, and semantic similarity. Search is logged locally; missed concepts (e.g. seasonal terms we don’t yet track) are detected and, when a concept crosses a threshold, a pattern recommendation is recorded for adding new analysis (e.g. `seasonal_theme`).

### Base URL for Media Backend

All endpoints below are on the **media backend** (e.g. `https://your-media-backend-domain.com`). The main server can call them directly or proxy them so the web side uses a single origin.

- **Direct**: Main server → HTTP to media backend with API key (if you add auth).
- **Proxy**: Main server exposes e.g. `GET /api/media/search?q=...` and proxies to media backend `GET /api/search?q=...`.

### APIs the Main Server / Web Can Call

#### 1. Smart serving (existing)

```http
GET {MEDIA_BACKEND_URL}/serve/{mediaId}?size={size}&format={format}&bg={removed|original}
```

- **Size**: `thumbnail`, `small`, `grid`, `detail`, `header`, `zoom`
- **Format**: Optional; otherwise negotiated (AVIF → WebP → JPEG)
- **bg**: For logos, `removed` or `original`
- **No auth** in current implementation (main server typically proxies and adds auth)

#### 2. Single-media AI analysis (existing)

```http
GET {MEDIA_BACKEND_URL}/api/media/analysis/{mediaId}
```

- **Response**: `{ success, analysis: { style, medium, subject_matter, quality_score, mood_keywords, dominant_colors, ... } }`

#### 3. Search (NEW – call from web/admin)

```http
GET {MEDIA_BACKEND_URL}/api/search?q={query}&style={style}&mood={mood}&medium={medium}&quality_min={n}&data_type={type}&limit={n}&source=api
```

- **q**: Free-text query (semantic search over vectors + analysis).
- **style**, **mood**, **medium**: Filter by analysis fields (e.g. `style=Abstract`, `mood=warm`).
- **quality_min**: Minimum quality score (number).
- **data_type**: `product`, `profile`, `event`, `logo`, `sites`.
- **limit**: Max results (default 50, max 100).
- **source**: Optional (e.g. `api`, `admin`); stored in search log.

**Response:**

```json
{
  "success": true,
  "total": 25,
  "results": [
    {
      "media_id": 123,
      "main_api_id": 456,
      "user_id": 789,
      "data_type": "product",
      "original_name": "artwork.jpg",
      "style_classification": "Abstract",
      "medium_detected": "Oil on Canvas",
      "quality_score": 85,
      "mood_keywords": ["vibrant", "warm"],
      "subject_matter": "...",
      "score": 0.92,
      "source": "semantic"
    }
  ]
}
```

- **main_api_id**: Use this to link back to main server entities (e.g. products, pending_images).
- **score**: Relevance/similarity; **source**: `filter` or `semantic`.

**Example (photography with fall/autumn theme):**

```http
GET {MEDIA_BACKEND_URL}/api/search?q=photography%20fall%20autumn%20theme&medium=Photography&limit=20
```

Search returns the best it can (semantic + filters). The query is logged; if it contains seasonal terms and we don’t yet have a `seasonal_theme` field, it counts as a “missed” concept for seasonality.

#### 4. Similar media (NEW)

```http
GET {MEDIA_BACKEND_URL}/api/search/similar/{mediaId}?limit=10
```

- **mediaId**: Media backend `media_files.id` (local id).
- **limit**: Max similar items (default 10, max 50).

**Response:**

```json
{
  "success": true,
  "total": 10,
  "results": [
    {
      "media_id": 124,
      "main_api_id": 457,
      "user_id": 789,
      "data_type": "product",
      "original_name": "...",
      "style_classification": "...",
      "medium_detected": "...",
      "quality_score": 80,
      "score": 0.88
    }
  ]
}
```

#### 5. Pattern recommendations (NEW – admin)

```http
GET {MEDIA_BACKEND_URL}/api/search/patterns
```

- **Response**: `{ success, recommendations: [ { id, concept_key, missed_count, threshold, recommended_at, status, notes } ] }`
- **Use**: “Seasonality missed in 17 searches” → add `seasonal_theme` to analysis and backfill.

#### 6. Missed concepts (NEW – admin)

```http
GET {MEDIA_BACKEND_URL}/api/search/missed
```

- **Response**: `{ success, concepts: [ { concept_key, display_name, keywords, analysis_field, missed_count, threshold, status, first_missed_at, last_missed_at } ] }`
- **Use**: See which concepts we’re tracking and how often they’re “missed” (query has the concept but we have no analysis field for it).

#### 7. File serving (for main API proxy – existing)

```http
GET {MEDIA_BACKEND_URL}/files/{path}
Authorization: {MAIN_API_KEY}
```

- **path**: e.g. `user_123/product/img/123_processed.jpg`
- Main server proxies frontend requests to this endpoint when serving media.

#### 8. Health & queue (existing)

```http
GET {MEDIA_BACKEND_URL}/health
GET {MEDIA_BACKEND_URL}/queue-status
```

### Search logging and patterns (local DB)

- **search_log**: Every search is logged (query_text, filters_used, result_count, source).
- **search_missed_concept**: Tracked concepts (e.g. seasonality) with keywords; when a query matches and we have no analysis field, `missed_count` is incremented.
- **search_pattern_recommendation**: When a concept’s `missed_count` reaches its threshold, a row is added (status `pending`) so you “record patterns” and can add new analysis (e.g. `seasonal_theme`) and backfill.

Schema: run **`config/search_log_schema.sql`** on the media backend DB (`oaf_media`). Search still returns results if the schema isn’t run; logging and pattern watcher no-op and log a message.

### Calling search from the web side

- **Option A – Proxy**: Main server adds e.g. `GET /api/media/search` that forwards to `GET {MEDIA_BACKEND_URL}/api/search` (and optionally adds auth). Web calls `/api/media/search?q=...`.
- **Option B – Direct**: Web calls media backend `GET {MEDIA_BACKEND_URL}/api/search?q=...` (CORS and auth must be configured on media backend if needed).

Use **main_api_id** from search results to link back to your products/pending_images and build detail or edit URLs on the main server.

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

### Quick reference: Media backend APIs (for main server / web)

| Method | Path | Purpose |
|--------|------|--------|
| GET | `/serve/:mediaId` | Smart serving (size, format, bg) |
| GET | `/api/media/analysis/:mediaId` | Single-media AI analysis |
| GET | `/api/search?q=...&style=...&mood=...&medium=...&quality_min=...&data_type=...&limit=50` | Search (semantic + filters); logs search and missed concepts |
| GET | `/api/search/similar/:mediaId?limit=10` | Similar media by vector similarity |
| GET | `/api/search/patterns` | Admin: pattern recommendations (concepts that crossed threshold) |
| GET | `/api/search/missed` | Admin: tracked concepts and missed counts |
| GET | `/files/*` | File serving (main API proxy; requires `Authorization: MAIN_API_KEY`) |
| GET | `/health` | Health check |
| GET | `/queue-status` | Queue/worker status |

---

*Last Updated: After document/spreadsheet/presentation pipeline (5c), smart search system, video-in-pipeline, healing fixes, alternative data-type logging, and search APIs for main server / web*
