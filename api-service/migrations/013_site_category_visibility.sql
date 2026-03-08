-- Migration 013: Site-Category Visibility System
-- Sprint 9: Fix and Enhance Category System with SEO Pages
-- Enables per-site category visibility control (users choose which categories show per site)

-- Create junction table for site-specific category visibility
CREATE TABLE IF NOT EXISTS site_categories_visible (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  site_id BIGINT NOT NULL COMMENT 'Reference to sites table',
  category_id BIGINT NOT NULL COMMENT 'Reference to user_categories table',
  is_visible BOOLEAN DEFAULT TRUE COMMENT 'Whether this category is visible on this site',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Unique constraint: one entry per site-category pair
  UNIQUE KEY unique_site_category (site_id, category_id),
  
  -- Indexes for performance
  INDEX idx_site_visible (site_id, is_visible),
  INDEX idx_category_visible (category_id, is_visible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Controls which categories are visible on which sites';

-- Migration completed successfully
