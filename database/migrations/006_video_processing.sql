-- Migration 006: Video Processing System
-- Sprint C2: Video System with FFmpeg + Whisper
-- Created: 2026-02-07

-- Video processing jobs (async queue)
CREATE TABLE IF NOT EXISTS video_jobs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    type ENUM('convert', 'clip', 'caption', 'auto_clip', 'template', 'adapt', 'analyze') NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    input_asset_id BIGINT,
    output_asset_id BIGINT,
    config JSON,           -- Job-specific parameters
    progress INT DEFAULT 0, -- 0-100
    error_message TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (input_asset_id) REFERENCES marketing_assets(id) ON DELETE CASCADE,
    FOREIGN KEY (output_asset_id) REFERENCES marketing_assets(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_type (type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Video templates
CREATE TABLE IF NOT EXISTS video_templates (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),        -- 'product', 'testimonial', 'promo', 'tutorial', 'announcement', 'social'
    platform VARCHAR(50),         -- 'tiktok', 'instagram', 'youtube', 'facebook', or 'universal'
    config JSON NOT NULL,         -- Template definition (intro, outro, filters, transitions, etc.)
    thumbnail_path VARCHAR(500),
    tier ENUM('free', 'basic', 'premium', 'enterprise') DEFAULT 'free',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_platform (platform),
    INDEX idx_tier (tier)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Video analysis cache (scene detection, audio analysis, transcription)
CREATE TABLE IF NOT EXISTS video_analysis (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    asset_id BIGINT NOT NULL,
    scenes JSON,           -- Scene timestamps and descriptions
    audio_peaks JSON,      -- Audio analysis data (volume levels, peaks)
    highlights JSON,       -- Suggested clip points with confidence scores
    transcription JSON,    -- Full transcript with timestamps
    analyzed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (asset_id) REFERENCES marketing_assets(id) ON DELETE CASCADE,
    UNIQUE KEY unique_asset (asset_id),
    INDEX idx_analyzed (analyzed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default templates
INSERT INTO video_templates (name, description, category, platform, config, tier) VALUES
(
    'Product Showcase - Instagram',
    'Professional product showcase template optimized for Instagram with intro and outro',
    'product',
    'instagram',
    JSON_OBJECT(
        'intro', JSON_OBJECT(
            'duration', 2,
            'text', 'Product Showcase',
            'animation', 'fade'
        ),
        'outro', JSON_OBJECT(
            'duration', 3,
            'text', 'Shop Now',
            'animation', 'slide'
        ),
        'filters', JSON_OBJECT(
            'preset', 'warm',
            'brightness', 0.1,
            'contrast', 1.1,
            'saturation', 1.2
        ),
        'aspectRatio', '1:1'
    ),
    'free'
),
(
    'Testimonial - YouTube',
    'Customer testimonial template with lower thirds for YouTube',
    'testimonial',
    'youtube',
    JSON_OBJECT(
        'intro', JSON_OBJECT(
            'duration', 3,
            'text', 'Customer Stories',
            'animation', 'zoom'
        ),
        'lowerThirds', JSON_OBJECT(
            'enabled', true,
            'position', 'bottom',
            'style', 'modern'
        ),
        'outro', JSON_OBJECT(
            'duration', 5,
            'text', 'Learn More',
            'animation', 'fade'
        ),
        'filters', JSON_OBJECT(
            'brightness', 0.05,
            'contrast', 1.05
        ),
        'aspectRatio', '16:9'
    ),
    'free'
),
(
    'Quick Promo - TikTok',
    'Fast-paced promotional template for TikTok/Reels',
    'promo',
    'tiktok',
    JSON_OBJECT(
        'intro', JSON_OBJECT(
            'duration', 1,
            'text', 'SALE!',
            'animation', 'zoom'
        ),
        'filters', JSON_OBJECT(
            'preset', 'vintage',
            'saturation', 1.3
        ),
        'transitions', JSON_OBJECT(
            'type', 'quick',
            'style', 'crossfade'
        ),
        'outro', JSON_OBJECT(
            'duration', 2,
            'text', 'Swipe Up',
            'animation', 'bounce'
        ),
        'aspectRatio', '9:16'
    ),
    'basic'
),
(
    'Tutorial - Universal',
    'Educational tutorial template with chapter markers',
    'tutorial',
    'universal',
    JSON_OBJECT(
        'intro', JSON_OBJECT(
            'duration', 3,
            'text', 'Tutorial',
            'animation', 'slide'
        ),
        'lowerThirds', JSON_OBJECT(
            'enabled', true,
            'position', 'bottom',
            'showChapters', true
        ),
        'filters', JSON_OBJECT(
            'brightness', 0,
            'contrast', 1.1
        ),
        'outro', JSON_OBJECT(
            'duration', 4,
            'text', 'Subscribe for More',
            'animation', 'fade'
        )
    ),
    'free'
),
(
    'Brand Story - Premium',
    'High-end brand storytelling template with cinematic filters',
    'promo',
    'universal',
    JSON_OBJECT(
        'intro', JSON_OBJECT(
            'duration', 5,
            'text', 'Our Story',
            'animation', 'cinematic'
        ),
        'filters', JSON_OBJECT(
            'preset', 'cool',
            'brightness', -0.05,
            'contrast', 1.15,
            'saturation', 0.9
        ),
        'transitions', JSON_OBJECT(
            'type', 'smooth',
            'style', 'crossfade',
            'duration', 1.5
        ),
        'outro', JSON_OBJECT(
            'duration', 6,
            'text', 'Join Us',
            'animation', 'fade'
        ),
        'lowerThirds', JSON_OBJECT(
            'enabled', true,
            'style', 'elegant'
        )
    ),
    'premium'
);

-- Add comments for documentation
ALTER TABLE video_jobs COMMENT = 'Async video processing job queue';
ALTER TABLE video_templates COMMENT = 'Reusable video templates with intro/outro/filters';
ALTER TABLE video_analysis COMMENT = 'Cached video analysis results (scenes, audio, transcription)';
