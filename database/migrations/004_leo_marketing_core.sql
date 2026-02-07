-- Migration: Leo Marketing Core System
-- Date: 2026-02-07
-- Description: Creates comprehensive marketing automation infrastructure
--              Includes campaigns, content, feedback, analytics, assets, and social connections
--              Part of Sprint B: Marketing Core

-- ============================================================================
-- STEP 1: Create marketing_campaigns table
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketing_campaigns (
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
    goals JSON COMMENT 'Campaign goals: {impressions: 10000, clicks: 500, conversions: 50}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_owner (owner_type, owner_id),
    INDEX idx_type (type),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 2: Create marketing_content table
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketing_content (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    campaign_id BIGINT NOT NULL,
    type ENUM('post', 'story', 'reel', 'video', 'email', 'article', 'ad') NOT NULL,
    channel ENUM('instagram', 'facebook', 'tiktok', 'twitter', 'pinterest', 'email', 'blog', 'google_ads', 'bing_ads', 'meta_ads') NOT NULL,
    status ENUM('draft', 'pending_review', 'revision_requested', 'approved', 'scheduled', 'published', 'failed') DEFAULT 'draft',
    content JSON NOT NULL COMMENT 'Content data: {text, media_urls, hashtags, cta, etc.}',
    scheduled_at DATETIME,
    published_at DATETIME,
    external_id VARCHAR(255) COMMENT 'Platform ID after posting',
    revision_number INT DEFAULT 1,
    created_by ENUM('leo', 'claude', 'human') DEFAULT 'leo',
    approved_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    INDEX idx_campaign (campaign_id),
    INDEX idx_status (status),
    INDEX idx_scheduled (scheduled_at),
    INDEX idx_channel (channel),
    INDEX idx_external (external_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 3: Create marketing_feedback table
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketing_feedback (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    content_id BIGINT NOT NULL,
    action ENUM('approve', 'reject', 'request_revision', 'comment') NOT NULL,
    feedback TEXT,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (content_id) REFERENCES marketing_content(id) ON DELETE CASCADE,
    INDEX idx_content (content_id),
    INDEX idx_created_by (created_by),
    INDEX idx_action (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 4: Create marketing_analytics table
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketing_analytics (
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
    raw_data JSON COMMENT 'Full API response from platform',
    FOREIGN KEY (content_id) REFERENCES marketing_content(id) ON DELETE CASCADE,
    INDEX idx_content_time (content_id, recorded_at),
    INDEX idx_recorded (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 5: Create marketing_assets table
-- ============================================================================

CREATE TABLE IF NOT EXISTS marketing_assets (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    owner_type ENUM('admin', 'user') DEFAULT 'admin',
    owner_id BIGINT NOT NULL,
    type ENUM('image', 'video', 'audio', 'document') NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    thumbnail_path VARCHAR(500),
    metadata JSON COMMENT 'File metadata: {width, height, duration, format, size, etc.}',
    tags VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_owner (owner_type, owner_id),
    INDEX idx_type (type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- STEP 6: Create social_connections table
-- ============================================================================

CREATE TABLE IF NOT EXISTS social_connections (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    owner_type ENUM('admin', 'user') NOT NULL,
    owner_id BIGINT NOT NULL,
    platform ENUM('instagram', 'facebook', 'tiktok', 'twitter', 'pinterest', 'google', 'bing') NOT NULL,
    account_id VARCHAR(255) NOT NULL,
    account_name VARCHAR(255),
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at DATETIME,
    permissions JSON COMMENT 'Platform-specific permissions granted',
    status ENUM('active', 'expired', 'revoked') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_connection (owner_type, owner_id, platform, account_id),
    INDEX idx_owner (owner_type, owner_id),
    INDEX idx_platform (platform),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

SELECT 'marketing_campaigns' as table_name, COUNT(*) as row_count FROM marketing_campaigns;
SELECT 'marketing_content' as table_name, COUNT(*) as row_count FROM marketing_content;
SELECT 'marketing_feedback' as table_name, COUNT(*) as row_count FROM marketing_feedback;
SELECT 'marketing_analytics' as table_name, COUNT(*) as row_count FROM marketing_analytics;
SELECT 'marketing_assets' as table_name, COUNT(*) as row_count FROM marketing_assets;
SELECT 'social_connections' as table_name, COUNT(*) as row_count FROM social_connections;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- DROP TABLE IF EXISTS marketing_analytics;
-- DROP TABLE IF EXISTS marketing_feedback;
-- DROP TABLE IF EXISTS marketing_content;
-- DROP TABLE IF EXISTS marketing_campaigns;
-- DROP TABLE IF EXISTS marketing_assets;
-- DROP TABLE IF EXISTS social_connections;
