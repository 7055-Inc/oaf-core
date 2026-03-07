-- Migration 057: Auto-Blog System
-- Adds configuration and job tracking tables for automated blog article generation

CREATE TABLE IF NOT EXISTS `auto_blog_config` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `magazine` enum('artist-news','promoter-news','community-news') NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT 0,
  `posts_per_day` int NOT NULL DEFAULT 1,
  `topics` json DEFAULT NULL,
  `tone` varchar(500) DEFAULT NULL,
  `style_notes` text DEFAULT NULL,
  `target_word_count_min` int NOT NULL DEFAULT 800,
  `target_word_count_max` int NOT NULL DEFAULT 1500,
  `content_type_ratios` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_auto_blog_config_magazine` (`magazine`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS `auto_blog_jobs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `config_id` bigint NOT NULL,
  `article_id` bigint DEFAULT NULL,
  `status` enum('pending','generating','generated','published','failed','rejected') NOT NULL DEFAULT 'pending',
  `magazine` varchar(50) NOT NULL,
  `topic_used` varchar(255) DEFAULT NULL,
  `content_type_used` varchar(50) DEFAULT NULL,
  `angle_used` text DEFAULT NULL,
  `model_used` varchar(50) DEFAULT NULL,
  `generation_time_ms` int DEFAULT NULL,
  `token_count` int DEFAULT NULL,
  `error` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_auto_blog_jobs_config` (`config_id`),
  KEY `idx_auto_blog_jobs_article` (`article_id`),
  KEY `idx_auto_blog_jobs_status` (`status`),
  KEY `idx_auto_blog_jobs_magazine_date` (`magazine`, `created_at`),
  CONSTRAINT `fk_auto_blog_jobs_config` FOREIGN KEY (`config_id`) REFERENCES `auto_blog_config` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_auto_blog_jobs_article` FOREIGN KEY (`article_id`) REFERENCES `articles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Pre-seed configs from existing magazine page categories
INSERT INTO `auto_blog_config` (`magazine`, `enabled`, `posts_per_day`, `tone`, `target_word_count_min`, `target_word_count_max`, `topics`, `content_type_ratios`) VALUES
('artist-news', 0, 1, 'practical and encouraging', 800, 1500,
  JSON_ARRAY(
    JSON_OBJECT('topic', 'Selling Tips', 'content_type', 'how-to', 'weight', 3, 'search_intent', 'informational'),
    JSON_OBJECT('topic', 'Event Prep', 'content_type', 'how-to', 'weight', 2, 'search_intent', 'informational'),
    JSON_OBJECT('topic', 'Art Marketing & Social Media', 'content_type', 'listicle', 'weight', 2, 'search_intent', 'commercial'),
    JSON_OBJECT('topic', 'Art Business Management', 'content_type', 'pillar', 'weight', 2, 'search_intent', 'informational'),
    JSON_OBJECT('topic', 'Pricing & Valuing Artwork', 'content_type', 'faq', 'weight', 2, 'search_intent', 'informational'),
    JSON_OBJECT('topic', 'Booth Display & Presentation', 'content_type', 'how-to', 'weight', 1, 'search_intent', 'informational'),
    JSON_OBJECT('topic', 'Online Sales & E-commerce', 'content_type', 'comparison', 'weight', 1, 'search_intent', 'commercial'),
    JSON_OBJECT('topic', 'Artist Spotlight', 'content_type', 'spotlight', 'weight', 1, 'search_intent', 'navigational')
  ),
  JSON_OBJECT('how-to', 25, 'faq', 15, 'pillar', 15, 'news', 15, 'listicle', 10, 'spotlight', 10, 'comparison', 5, 'roundup', 5)
),
('promoter-news', 0, 1, 'professional and actionable', 800, 1500,
  JSON_ARRAY(
    JSON_OBJECT('topic', 'Event Planning & Logistics', 'content_type', 'how-to', 'weight', 3, 'search_intent', 'informational'),
    JSON_OBJECT('topic', 'Vendor & Artist Relations', 'content_type', 'how-to', 'weight', 2, 'search_intent', 'informational'),
    JSON_OBJECT('topic', 'Event Marketing & Promotion', 'content_type', 'listicle', 'weight', 2, 'search_intent', 'commercial'),
    JSON_OBJECT('topic', 'Event Operations & Management', 'content_type', 'pillar', 'weight', 2, 'search_intent', 'informational'),
    JSON_OBJECT('topic', 'Revenue & Sponsorship', 'content_type', 'faq', 'weight', 2, 'search_intent', 'commercial'),
    JSON_OBJECT('topic', 'Venue Selection & Setup', 'content_type', 'comparison', 'weight', 1, 'search_intent', 'commercial'),
    JSON_OBJECT('topic', 'Event Technology & Tools', 'content_type', 'roundup', 'weight', 1, 'search_intent', 'commercial'),
    JSON_OBJECT('topic', 'Promoter Spotlight', 'content_type', 'spotlight', 'weight', 1, 'search_intent', 'navigational')
  ),
  JSON_OBJECT('how-to', 25, 'faq', 15, 'pillar', 15, 'news', 15, 'listicle', 10, 'spotlight', 10, 'comparison', 5, 'roundup', 5)
),
('community-news', 0, 1, 'welcoming and discovery-focused', 800, 1500,
  JSON_ARRAY(
    JSON_OBJECT('topic', 'Event Discovery & Reviews', 'content_type', 'roundup', 'weight', 3, 'search_intent', 'informational'),
    JSON_OBJECT('topic', 'Collecting Tips & Guides', 'content_type', 'how-to', 'weight', 2, 'search_intent', 'informational'),
    JSON_OBJECT('topic', 'Artist Spotlights', 'content_type', 'spotlight', 'weight', 2, 'search_intent', 'navigational'),
    JSON_OBJECT('topic', 'Art Trends & Movements', 'content_type', 'news', 'weight', 2, 'search_intent', 'informational'),
    JSON_OBJECT('topic', 'Art Buying FAQ', 'content_type', 'faq', 'weight', 2, 'search_intent', 'informational'),
    JSON_OBJECT('topic', 'Gift Guides & Seasonal Picks', 'content_type', 'listicle', 'weight', 1, 'search_intent', 'commercial'),
    JSON_OBJECT('topic', 'Art Care & Display', 'content_type', 'how-to', 'weight', 1, 'search_intent', 'informational'),
    JSON_OBJECT('topic', 'Platform Comparisons', 'content_type', 'comparison', 'weight', 1, 'search_intent', 'commercial')
  ),
  JSON_OBJECT('how-to', 25, 'faq', 15, 'pillar', 15, 'news', 15, 'listicle', 10, 'spotlight', 10, 'comparison', 5, 'roundup', 5)
);
