-- User-Level Addon System
-- Creates user addon tracking for subscription-based features
-- 
-- This enables:
-- - User-level addon purchases (wholesale, analytics, etc.)
-- - Cross-site addon access (one purchase = all user's sites)
-- - Dashboard menu display based on addons
-- - Scalable feature management

-- =============================================================================
-- USER ADDONS TABLE
-- =============================================================================
-- Track which addons each user has purchased/activated

CREATE TABLE user_addons (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  addon_slug VARCHAR(100) NOT NULL COMMENT 'Matches website_addons.addon_slug',
  is_active TINYINT(1) DEFAULT 1 COMMENT 'Whether addon is currently active',
  activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When addon was purchased/activated',
  deactivated_at TIMESTAMP NULL COMMENT 'When addon was cancelled (if applicable)',
  subscription_source ENUM('website_subscription', 'marketplace_subscription', 'manual') DEFAULT 'website_subscription' COMMENT 'How the addon was acquired',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  INDEX idx_user_addons_lookup (user_id, addon_slug, is_active),
  INDEX idx_addon_slug (addon_slug),
  INDEX idx_user_active_addons (user_id, is_active),
  
  -- Foreign key constraint
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Unique constraint: one addon per user
  UNIQUE KEY unique_user_addon (user_id, addon_slug)
) COMMENT='User-level addon tracking for subscription features';

-- =============================================================================
-- EXTEND WEBSITE_ADDONS TABLE
-- =============================================================================
-- Add user_level flag to distinguish user vs site addons

ALTER TABLE website_addons 
ADD COLUMN user_level TINYINT(1) DEFAULT 0 COMMENT 'Whether this addon applies to user (1) or site (0)',
ADD COLUMN category ENUM('site_features', 'user_features', 'marketplace', 'analytics', 'integrations') DEFAULT 'site_features' COMMENT 'Addon category for organization';

-- =============================================================================
-- UPDATE EXISTING WHOLESALE ADDON TO BE USER-LEVEL
-- =============================================================================

-- Update existing wholesale addon to be user-level
UPDATE website_addons 
SET 
  user_level = 1,
  category = 'user_features',
  description = 'Enable wholesale pricing for your products. Show MSRP and wholesale prices to wholesale customers. Applies across all your sites.'
WHERE addon_name = 'Wholesale Pricing' OR addon_slug LIKE '%wholesale%';

-- =============================================================================
-- INSERT ADDITIONAL USER-LEVEL ADDONS
-- =============================================================================

-- Marketplace Analytics Addon (User-level) - only if doesn't exist
INSERT INTO website_addons (
  addon_name, 
  addon_slug, 
  description, 
  addon_script_path, 
  tier_required, 
  monthly_price, 
  display_order,
  user_level,
  category,
  is_active
) VALUES (
  'Marketplace Analytics',
  'marketplace-analytics',
  'Advanced analytics and insights for your marketplace performance. Track sales, customer behavior, and product performance.',
  '/addons/marketplace-analytics.js',
  'pro',
  14.99,
  20,
  1,
  'analytics',
  1
) ON DUPLICATE KEY UPDATE 
  user_level = 1, 
  category = 'analytics';

-- Advanced Inventory Management (User-level) - only if doesn't exist
INSERT INTO website_addons (
  addon_name, 
  addon_slug, 
  description, 
  addon_script_path, 
  tier_required, 
  monthly_price, 
  display_order,
  user_level,
  category,
  is_active
) VALUES (
  'Advanced Inventory Management',
  'advanced-inventory',
  'Advanced inventory tracking, low stock alerts, and automated reorder suggestions across all your products.',
  '/addons/advanced-inventory.js',
  'pro',
  12.99,
  30,
  1,
  'user_features',
  1
) ON DUPLICATE KEY UPDATE 
  user_level = 1, 
  category = 'user_features';

-- =============================================================================
-- UPDATE EXISTING SITE ADDONS TO BE SITE-LEVEL
-- =============================================================================

-- Mark existing addons as site-level (default behavior)
UPDATE website_addons 
SET user_level = 0, category = 'site_features' 
WHERE user_level IS NULL OR user_level = 0;

-- =============================================================================
-- SAMPLE DATA FOR TESTING
-- =============================================================================

-- Give admin user the wholesale pricing addon for testing
-- (Replace 1000000007 with actual admin user ID if different)
-- First check what the actual addon_slug is, then use it
INSERT INTO user_addons (user_id, addon_slug, subscription_source) 
SELECT 1000000007, addon_slug, 'manual'
FROM website_addons 
WHERE addon_name = 'Wholesale Pricing' 
LIMIT 1
ON DUPLICATE KEY UPDATE 
  is_active = 1, 
  activated_at = CURRENT_TIMESTAMP,
  deactivated_at = NULL;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Check user addons
-- SELECT * FROM user_addons WHERE user_id = 1000000007;

-- Check user-level website addons
-- SELECT * FROM website_addons WHERE user_level = 1;

-- Check user's active addons with details
-- SELECT ua.*, wa.addon_name, wa.description, wa.monthly_price
-- FROM user_addons ua
-- JOIN website_addons wa ON ua.addon_slug = wa.addon_slug
-- WHERE ua.user_id = 1000000007 AND ua.is_active = 1;
