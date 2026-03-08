-- Migration 012: Expand user_categories with SEO and Visibility Fields
-- Sprint 9: Fix and Enhance Category System with SEO Pages
-- Adds SEO fields matching main site catalog categories functionality

-- Add SEO and visibility columns to user_categories table
ALTER TABLE user_categories
ADD COLUMN image_url VARCHAR(500) DEFAULT NULL COMMENT 'Category hero/featured image URL' AFTER description,
ADD COLUMN page_title VARCHAR(255) DEFAULT NULL COMMENT 'SEO page title override (overrides name for display)' AFTER image_url,
ADD COLUMN meta_description TEXT DEFAULT NULL COMMENT 'SEO meta description for category pages (150-160 chars recommended)' AFTER page_title,
ADD COLUMN slug VARCHAR(255) DEFAULT NULL COMMENT 'URL-friendly slug for category pages' AFTER meta_description,
ADD COLUMN is_visible BOOLEAN DEFAULT TRUE COMMENT 'Master visibility toggle for category' AFTER slug,
ADD COLUMN sort_order INT DEFAULT 0 COMMENT 'Manual sorting order (in addition to display_order)' AFTER is_visible;

-- Add unique constraint on slug per user (slugs must be unique within a user's categories)
ALTER TABLE user_categories
ADD UNIQUE KEY unique_user_slug (user_id, slug);

-- Add indexes for frequently queried fields
ALTER TABLE user_categories 
ADD INDEX idx_is_visible (is_visible),
ADD INDEX idx_sort_order (sort_order),
ADD INDEX idx_slug (slug);

-- Migration completed successfully
