# Leo AI Marketing System - Master Specification

## Executive Summary

Leo is an AI-powered platform for personalized search, recommendations, customer service, and now **automated marketing**. This document specifies the complete marketing system architecture, broken into implementation sprints.

**Key Principle**: Leo (local Llama) acts as the **intelligent orchestrator** - it knows the business data, provides context, schedules, executes, and learns. Claude/external AI handles **creative generation** - writing copy, creating content strategies, generating ad variations.

---

## Current System State

### What Exists (Already Built)

```
/var/www/staging/api-service/src/modules/leo/
├── routes.js                    # API endpoints
├── services/
│   ├── vectorDB.js              # ChromaDB connection (port 8000)
│   ├── search.js                # Basic search service
│   ├── logger.js                # Logging utility
│   ├── ingestion/               # Data ingestion services
│   │   ├── users.js             # User profiles → user_profiles collection
│   │   ├── products.js          # Products → art_metadata collection
│   │   ├── orders.js            # Orders → user_interactions collection
│   │   ├── events.js            # Events → event_data collection
│   │   ├── reviews.js           # Reviews → reviews collection
│   │   ├── articles.js          # Articles → site_content collection
│   │   └── behavior.js          # ClickHouse → user_behavior collection
│   └── truths/                  # Truth discovery system
│       ├── TruthStore.js        # Truth storage (truth_* collections)
│       ├── TruthOrchestrator.js # Schedules discoverers
│       ├── BaseDiscoverer.js    # Base class for discoverers
│       └── discoverers/
│           ├── ProductSimilarityDiscoverer.js
│           ├── UserSimilarityDiscoverer.js
│           └── MetaPatternDiscoverer.js
```

### ChromaDB Collections

| Collection | Classification | Content |
|------------|----------------|---------|
| art_metadata | 101-103 | Products (active, deleted, draft) |
| user_profiles | 141 | User data with preferences |
| user_behavior | 142 | Behavioral patterns from ClickHouse |
| user_interactions | 131 | Purchase history (orders) |
| event_data | 151-153 | Events (active, past, draft) |
| reviews | 161-165 | Reviews (event, product, artist, etc.) |
| site_content | 171-174 | Articles, blog posts, help content |
| truth_similarities | - | Product/user similarity truths |
| truth_patterns | - | Behavioral patterns |
| truth_meta | - | Meta-patterns (patterns of patterns) |

### Cron Jobs (for production)

```bash
# Ingestion - every 6 hours
0 */6 * * * cd /var/www/main && node api-service/cron/leo-ingestion.js

# Discovery - daily at 2am
0 2 * * * cd /var/www/main && node api-service/cron/leo-discovery.js
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           LEO MARKETING SYSTEM                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                         LEO BRAIN                                │   │
│   │  (Sprint A - Llama integration for intelligent orchestration)   │   │
│   │                                                                  │   │
│   │  • Query analysis       • Context gathering                     │   │
│   │  • Intent detection     • Response organization                 │   │
│   │  • Truth lookups        • Personalization                       │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│                                    ▼                                     │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                      MARKETING CORE                              │   │
│   │  (Sprint B - Database, workflows, approval system)              │   │
│   │                                                                  │   │
│   │  • Campaign management    • Content queue                       │   │
│   │  • Approval workflow      • Scheduling engine                   │   │
│   │  • Asset management       • Analytics tracking                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                    │                                     │
│          ┌─────────────┬──────────┼──────────┬─────────────┐            │
│          ▼             ▼          ▼          ▼             ▼            │
│   ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐│
│   │  SOCIAL   │ │   VIDEO   │ │   EMAIL   │ │    ADS    │ │   BLOG    ││
│   │ Publishers│ │  System   │ │ Marketing │ │  Manager  │ │  Auto-pub ││
│   │(Sprint C1)│ │(Sprint C2)│ │(Sprint C3)│ │(Sprint C3)│ │(Sprint B) ││
│   │           │ │           │ │           │ │           │ │           ││
│   │ • Meta    │ │ • CapCut  │ │ • In-house│ │ • Google  │ │ • CMS     ││
│   │ • X       │ │ • Runway  │ │ • Active  │ │ • Bing    │ │ • SEO     ││
│   │ • TikTok  │ │ • FFmpeg  │ │   Campaign│ │ • Meta Ads│ │ • Auto    ││
│   │ • Pinterest│ │ • Clips  │ │ • Drips   │ │           │ │           ││
│   └───────────┘ └───────────┘ └───────────┘ └───────────┘ └───────────┘│
│                                    │                                     │
│                                    ▼                                     │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    SUBSCRIPTION LAYER                            │   │
│   │  (Sprint D - User-facing social media service)                  │   │
│   │                                                                  │   │
│   │  • Subscription tiers     • User media library                  │   │
│   │  • Usage tracking         • Self-service dashboard              │   │
│   │  • Billing integration    • Content calendar                    │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Sprint A: Leo Brain (Intelligence Layer)

### Objective
Migrate and enhance the Llama-powered brain from the old `/leo/src/` system into the new modular architecture.

### Source Files to Migrate
- `/leo/src/core/centralBrain.js`
- `/leo/src/services/searchService.js`
- `/leo/src/services/truthExtractor.js`
- `/leo/src/utils/boostScoring.js`
- `/leo/src/utils/userPreferences.js`
- `/leo/src/utils/globalTrends.js`
- `/leo/src/utils/searchFilters.js`

### Target Structure
```
/api-service/src/modules/leo/services/brain/
├── index.js
├── CentralBrain.js          # Main orchestrator
├── QueryAnalyzer.js         # Llama-powered query analysis
├── ResponseOrganizer.js     # Llama-powered response formatting
├── TruthExtractor.js        # Extract truths from documents
└── utils/
    ├── boostScoring.js      # Personalization math
    ├── userPreferences.js   # Load user prefs (class 141)
    ├── globalTrends.js      # Anonymous user fallback
    └── searchFilters.js     # Classification filters
```

### Key Integration Points
- Ollama API at `http://localhost:11434/api/generate`
- Model: `llama3.2`
- Existing VectorDB service
- Existing TruthStore service

### API Endpoints to Add
```
POST /api/v2/leo/query          # Main brain entry point
POST /api/v2/leo/analyze        # Query analysis only
POST /api/v2/leo/search         # Enhanced search with personalization
GET  /api/v2/leo/user/:id/prefs # Get user preferences
```

### Success Criteria
- Brain can analyze any query and decide execution plan
- Personalized search results using boost scoring
- Truth lookups enhance responses
- Response time < 500ms for simple queries

---

## Sprint B: Marketing Core

### Objective
Build the foundational marketing infrastructure: database schema, campaign management, approval workflows, and scheduling engine.

### Database Schema

```sql
-- Campaign management
CREATE TABLE marketing_campaigns (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type ENUM('social', 'email', 'blog', 'ad', 'video') NOT NULL,
    status ENUM('draft', 'planning', 'pending_approval', 'approved', 'active', 'paused', 'completed') DEFAULT 'draft',
    owner_type ENUM('admin', 'user') DEFAULT 'admin',
    owner_id BIGINT NOT NULL,
    budget_cents INT DEFAULT 0,
    start_date DATE,
    end_date DATE,
    goals JSON,  -- {impressions: 10000, clicks: 500, conversions: 50}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_owner (owner_type, owner_id)
);

-- Individual content items within campaigns
CREATE TABLE marketing_content (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    campaign_id BIGINT NOT NULL,
    type ENUM('post', 'story', 'reel', 'video', 'email', 'article', 'ad') NOT NULL,
    channel ENUM('instagram', 'facebook', 'tiktok', 'twitter', 'pinterest', 'email', 'blog', 'google_ads', 'bing_ads', 'meta_ads') NOT NULL,
    status ENUM('draft', 'pending_review', 'revision_requested', 'approved', 'scheduled', 'published', 'failed') DEFAULT 'draft',
    content JSON NOT NULL,  -- {text, media_urls, hashtags, cta, etc.}
    scheduled_at DATETIME,
    published_at DATETIME,
    external_id VARCHAR(255),  -- ID from the platform after posting
    revision_number INT DEFAULT 1,
    created_by ENUM('leo', 'claude', 'human') DEFAULT 'leo',
    approved_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_scheduled (scheduled_at),
    INDEX idx_channel (channel)
);

-- Feedback/revision history
CREATE TABLE marketing_feedback (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    content_id BIGINT NOT NULL,
    action ENUM('approve', 'reject', 'request_revision', 'comment') NOT NULL,
    feedback TEXT,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_id) REFERENCES marketing_content(id) ON DELETE CASCADE
);

-- Performance tracking
CREATE TABLE marketing_analytics (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    content_id BIGINT NOT NULL,
    recorded_at DATETIME NOT NULL,
    impressions INT DEFAULT 0,
    reach INT DEFAULT 0,
    engagements INT DEFAULT 0,
    clicks INT DEFAULT 0,
    shares INT DEFAULT 0,
    saves INT DEFAULT 0,
    comments INT DEFAULT 0,
    conversions INT DEFAULT 0,
    spend_cents INT DEFAULT 0,
    raw_data JSON,  -- Full API response
    FOREIGN KEY (content_id) REFERENCES marketing_content(id) ON DELETE CASCADE,
    INDEX idx_content_time (content_id, recorded_at)
);

-- Media assets for marketing
CREATE TABLE marketing_assets (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    owner_type ENUM('admin', 'user') DEFAULT 'admin',
    owner_id BIGINT NOT NULL,
    type ENUM('image', 'video', 'audio', 'document') NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500),
    metadata JSON,  -- {width, height, duration, format, etc.}
    tags VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_owner (owner_type, owner_id),
    INDEX idx_type (type)
);

-- Social account connections
CREATE TABLE social_connections (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    owner_type ENUM('admin', 'user') NOT NULL,
    owner_id BIGINT NOT NULL,
    platform ENUM('instagram', 'facebook', 'tiktok', 'twitter', 'pinterest', 'google', 'bing') NOT NULL,
    account_id VARCHAR(255) NOT NULL,
    account_name VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at DATETIME,
    permissions JSON,
    status ENUM('active', 'expired', 'revoked') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_connection (owner_type, owner_id, platform, account_id),
    INDEX idx_owner (owner_type, owner_id)
);
```

### Target Structure
```
/api-service/src/modules/marketing/
├── index.js
├── routes.js
├── services/
│   ├── CampaignService.js       # CRUD for campaigns
│   ├── ContentService.js        # Content management
│   ├── ApprovalService.js       # Approval workflow
│   ├── SchedulerService.js      # Scheduling engine
│   ├── AnalyticsService.js      # Performance tracking
│   └── AssetService.js          # Media asset management
└── middleware/
    └── marketingAuth.js         # Permission checks
```

### API Endpoints
```
# Campaigns
GET    /api/v2/marketing/campaigns
POST   /api/v2/marketing/campaigns
GET    /api/v2/marketing/campaigns/:id
PUT    /api/v2/marketing/campaigns/:id
DELETE /api/v2/marketing/campaigns/:id

# Content
GET    /api/v2/marketing/content
POST   /api/v2/marketing/content
GET    /api/v2/marketing/content/:id
PUT    /api/v2/marketing/content/:id
POST   /api/v2/marketing/content/:id/approve
POST   /api/v2/marketing/content/:id/reject
POST   /api/v2/marketing/content/:id/schedule

# Assets
GET    /api/v2/marketing/assets
POST   /api/v2/marketing/assets/upload
DELETE /api/v2/marketing/assets/:id

# Analytics
GET    /api/v2/marketing/analytics/campaign/:id
GET    /api/v2/marketing/analytics/content/:id
GET    /api/v2/marketing/analytics/overview
```

### Cron Jobs
```bash
# Process scheduled content - every 5 minutes
*/5 * * * * node api-service/cron/marketing-publisher.js

# Fetch analytics - every hour
0 * * * * node api-service/cron/marketing-analytics.js
```

### Success Criteria
- Full campaign CRUD operations
- Approval workflow with feedback loop
- Scheduled content publishes on time
- Analytics tracked and queryable

---

## Sprint C1: Social Publishers

### Objective
Integrate with social media platform APIs to enable posting, scheduling, and analytics retrieval.

### Platforms & APIs

| Platform | API | Documentation |
|----------|-----|---------------|
| Meta (FB/IG) | Graph API v18.0 | developers.facebook.com |
| Twitter/X | API v2 | developer.twitter.com |
| TikTok | Content Posting API | developers.tiktok.com |
| Pinterest | API v5 | developers.pinterest.com |

### Target Structure
```
/api-service/src/modules/marketing/publishers/
├── index.js
├── BasePublisher.js           # Abstract base class
├── MetaPublisher.js           # Facebook + Instagram
├── TwitterPublisher.js        # X/Twitter
├── TikTokPublisher.js         # TikTok
├── PinterestPublisher.js      # Pinterest
└── PublisherFactory.js        # Factory to get correct publisher
```

### BasePublisher Interface
```javascript
class BasePublisher {
    async connect(credentials) {}
    async post(content) {}
    async schedule(content, datetime) {}
    async delete(externalId) {}
    async getAnalytics(externalId) {}
    async refreshToken() {}
    validateContent(content) {}
}
```

### OAuth Flow
Each platform requires OAuth. Store tokens in `social_connections` table. Implement token refresh before expiry.

### Success Criteria
- Can connect accounts via OAuth
- Can post to all 4 platforms
- Can schedule future posts
- Can retrieve analytics
- Handles rate limits gracefully

---

## Sprint C2: Video System

### Objective
Integrate AI-powered video generation and editing capabilities.

### Capabilities Needed
1. **Clip extraction** - Cut long videos into short-form clips
2. **Compilation** - Combine multiple clips into one video
3. **Generation** - Create videos from images/text (promo videos)
4. **Auto-captioning** - Add captions/subtitles
5. **Format conversion** - Resize for different platforms

### Integration Options

| Service | Use Case | API |
|---------|----------|-----|
| Shotstack | API-first video editing | shotstack.io |
| Runway ML | AI video generation | runwayml.com |
| CapCut | Templates, auto-edit | (limited API) |
| Opus Clip | Long → short clips | opusclip.pro |
| FFmpeg | Local processing | CLI tool |

### Recommended Approach
1. **FFmpeg** for basic operations (resize, format, trim)
2. **Shotstack** for template-based compilation
3. **Runway ML** or similar for AI generation
4. Store processed videos in existing media system

### Target Structure
```
/api-service/src/modules/marketing/video/
├── index.js
├── VideoProcessor.js          # FFmpeg wrapper
├── VideoCompiler.js           # Shotstack integration
├── VideoGenerator.js          # AI generation (Runway/etc)
├── ClipExtractor.js           # Long → short clips
└── CaptionService.js          # Auto-captioning
```

### Success Criteria
- Can extract clips from long videos
- Can compile clips into new videos
- Can resize for platform requirements
- Can add captions
- Integrates with marketing asset system

---

## Sprint C3: Ads & Email

### Objective
Integrate Google Ads, Bing Ads, and email marketing capabilities.

### Ads Platforms

| Platform | API | Capabilities |
|----------|-----|--------------|
| Google Ads | Google Ads API | Search, Display, Shopping, Video |
| Microsoft Ads | Bing Ads API | Search, Audience |
| Meta Ads | Marketing API | FB/IG ads (via MetaPublisher) |

### Email System
Use existing in-house email service at `/api-service/src/services/emailService.js`. Extend with:
- Campaign-based sending
- A/B testing
- Drip sequences
- Unsubscribe handling
- Analytics tracking

### Target Structure
```
/api-service/src/modules/marketing/ads/
├── index.js
├── GoogleAdsManager.js
├── BingAdsManager.js
├── AdCampaignService.js       # Cross-platform campaign management
└── BudgetManager.js           # Budget allocation

/api-service/src/modules/marketing/email/
├── index.js
├── EmailCampaignService.js
├── EmailTemplateService.js
├── DripsService.js
├── ABTestService.js
└── EmailAnalyticsService.js
```

### Success Criteria
- Can create/manage Google Ads campaigns
- Can create/manage Bing Ads campaigns
- Can send marketing emails
- Budget tracking and alerts
- A/B testing for emails

---

## Sprint D: Subscription Layer

### Objective
Create a user-facing social media management subscription service. Artists pay monthly to have Leo manage their social media.

### Subscription Tiers (Example)

| Tier | Price | Posts/Month | Platforms | Features |
|------|-------|-------------|-----------|----------|
| Starter | $20 | 10 | 2 | Basic scheduling |
| Pro | $50 | 30 | 4 | + Analytics |
| Enterprise | $100 | Unlimited | All | + Ads + Priority |

### Integration with Existing System
- Use existing subscription infrastructure
- User profiles already in ChromaDB (context for content)
- User's products already ingested (can feature in posts)

### Database Additions
```sql
-- Link subscriptions to marketing
CREATE TABLE marketing_subscriptions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    subscription_id BIGINT NOT NULL,  -- FK to existing subscriptions table
    tier ENUM('starter', 'pro', 'enterprise') NOT NULL,
    posts_remaining INT DEFAULT 0,
    posts_used_this_month INT DEFAULT 0,
    platforms JSON,  -- ["instagram", "facebook"]
    settings JSON,   -- {auto_approve: false, posting_times: [...]}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user (user_id)
);
```

### User Dashboard Features
- Connect social accounts
- Upload media to asset library
- View content calendar
- Approve/reject suggested content
- View analytics
- Manage subscription

### Target Structure
```
/api-service/src/modules/marketing/subscription/
├── index.js
├── SubscriptionService.js     # Tier management
├── UsageTracker.js            # Posts used tracking
├── UserAssetService.js        # User's media library
└── UserCalendarService.js     # User's content calendar

/pages/dashboard/social/
├── index.js                   # Overview
├── calendar.js                # Content calendar
├── assets.js                  # Media library
├── analytics.js               # Performance
└── settings.js                # Account connections, preferences
```

### Success Criteria
- Users can subscribe to social media service
- Can connect their social accounts
- Can upload and manage media
- See AI-generated content suggestions
- Approve/reject before posting
- View performance analytics

---

## Implementation Order & Dependencies

```
Week 1-2:    Sprint A (Brain) ─────────────────────────────┐
                                                            │
Week 2-3:    Sprint B (Marketing Core) ◄───────────────────┘
                     │
                     ├─────────┬─────────┬─────────┐
                     ▼         ▼         ▼         ▼
Week 3-4:    Sprint C1    Sprint C2   Sprint C3   (parallel)
             (Social)     (Video)     (Ads/Email)
                     │         │         │
                     └─────────┴─────────┘
                               │
                               ▼
Week 4-5:              Sprint D (Subscriptions)
```

### Sprint Dependencies
- **Sprint A** (Brain): No dependencies, can start immediately
- **Sprint B** (Core): Should wait for Sprint A to define context APIs
- **Sprint C1-C3**: Depend on Sprint B database schema
- **Sprint D**: Depends on all above

### Parallel Work Possible
- Sprint C1, C2, C3 can run in parallel
- Sprint B can start schema work while Sprint A is in progress

---

## File Locations Reference

### Existing Code
- Leo module: `/var/www/staging/api-service/src/modules/leo/`
- Old Leo (reference): `/var/www/staging/leo/src/`
- Frontend pages: `/var/www/staging/pages/dashboard/`
- Cron scripts: `/var/www/staging/api-service/cron/`

### Database
- MySQL connection: `/var/www/staging/api-service/src/config/db.js`
- Migrations: `/var/www/staging/database/migrations/`

### Related Services
- Email service: `/var/www/staging/api-service/src/services/emailService.js`
- Media library: Uses `media_library` table
- Subscriptions: Existing subscription system in place

---

## Environment Variables Needed

```env
# Ollama (Brain)
OLLAMA_HOST=http://localhost:11434

# Social APIs
META_APP_ID=
META_APP_SECRET=
TWITTER_API_KEY=
TWITTER_API_SECRET=
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=
PINTEREST_APP_ID=
PINTEREST_APP_SECRET=

# Ads
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_DEVELOPER_TOKEN=
BING_ADS_CLIENT_ID=
BING_ADS_CLIENT_SECRET=

# Video Services
SHOTSTACK_API_KEY=
RUNWAY_API_KEY=
```

---

## Questions for Each Sprint Agent

### Sprint A Agent
1. Have you read the old centralBrain.js?
2. Is Ollama running and accessible?
3. Confirm VectorDB and TruthStore are working

### Sprint B Agent
1. Review existing database patterns in /database/schema.sql
2. Confirm migration system usage
3. Check existing subscription tables for reference

### Sprint C Agents
1. Confirm API credentials are available (or mock for now)
2. Review rate limits for each platform
3. Check media storage patterns

### Sprint D Agent
1. Review existing subscription system
2. Check user dashboard patterns
3. Confirm payment integration approach

---

## Success Metrics

### Technical
- All endpoints respond < 500ms
- 99.9% uptime for scheduled posts
- Zero data loss in approval workflow

### Business
- Reduce manual marketing time by 80%
- Subscription service generates recurring revenue
- Analytics enable data-driven decisions

---

*Document Version: 1.0*
*Last Updated: 2026-02-07*
*Author: Leo System Architect*
