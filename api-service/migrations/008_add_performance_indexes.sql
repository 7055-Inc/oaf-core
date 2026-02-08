-- Migration: Add Performance Indexes
-- Date: 2026-02-07
-- Purpose: Optimize common query patterns

-- sites table
ALTER TABLE sites 
ADD INDEX idx_domain_validation (domain_validation_status, custom_domain_active);

-- site_addons table (composite for common join)
ALTER TABLE site_addons 
ADD INDEX idx_site_active (site_id, is_active);

-- user_addons table
ALTER TABLE user_addons 
ADD INDEX idx_user_active (user_id, is_active);

-- user_categories table (already has good indexes)
-- site_customizations table (already has good indexes)

-- Show index analysis
SELECT 
  TABLE_NAME,
  INDEX_NAME,
  SEQ_IN_INDEX,
  COLUMN_NAME
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'wordpress_import'
  AND TABLE_NAME IN ('sites', 'site_addons', 'user_addons', 'site_customizations')
ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX;
