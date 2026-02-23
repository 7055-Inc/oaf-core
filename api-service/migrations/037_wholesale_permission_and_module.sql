-- Wholesale Module Completion Migration
-- Phase 0: Fix permission model (wholesale as permission, not user_type)
-- Phase 1: Checkout integration (price_type on order_items)
-- Phase 2: Volume pricing tiers
-- Phase 3: MOQ + vendor wholesale cart minimums
-- Phase 4: Email template rows
-- Phase 5: Reapplication policy

-- ============================================================================
-- PHASE 0: Permission model fix
-- ============================================================================

-- Add wholesale column to user_permissions
ALTER TABLE user_permissions ADD COLUMN wholesale tinyint(1) DEFAULT 0;

-- Migrate existing wholesale users to permission-based
UPDATE user_permissions up
JOIN users u ON up.user_id = u.id
SET up.wholesale = 1
WHERE u.user_type = 'wholesale';

-- Also ensure any user with an approved wholesale_application gets the permission
INSERT INTO user_permissions (user_id, wholesale)
SELECT wa.user_id, 1
FROM wholesale_applications wa
WHERE wa.status = 'approved'
  AND wa.user_id NOT IN (SELECT user_id FROM user_permissions WHERE wholesale = 1)
ON DUPLICATE KEY UPDATE wholesale = 1;

-- Reset wholesale users back to community
UPDATE users SET user_type = 'community' WHERE user_type = 'wholesale';

-- Remove 'wholesale' from user_type enum
ALTER TABLE users MODIFY COLUMN user_type ENUM('artist','promoter','community','admin','Draft') NOT NULL;

-- ============================================================================
-- PHASE 1: Checkout integration
-- ============================================================================

ALTER TABLE order_items ADD COLUMN price_type ENUM('retail', 'wholesale') DEFAULT 'retail' AFTER price;

-- ============================================================================
-- PHASE 2: Volume pricing tiers
-- ============================================================================

ALTER TABLE products ADD COLUMN wholesale_pricing_tiers JSON DEFAULT NULL AFTER wholesale_description;

-- ============================================================================
-- PHASE 3: MOQ + vendor wholesale cart minimums
-- ============================================================================

ALTER TABLE products ADD COLUMN wholesale_moq INT DEFAULT NULL AFTER wholesale_pricing_tiers;

ALTER TABLE vendor_settings ADD COLUMN vendor_wholesale_cart_minimum DECIMAL(10,2) DEFAULT NULL;

-- ============================================================================
-- PHASE 4: Email template rows (NULL body/subject = use config file defaults)
-- ============================================================================

INSERT INTO email_templates (template_key, name, priority_level, is_transactional, layout_key)
VALUES 
  ('wholesale_application_received', 'Wholesale Application Received', 2, 1, 'default'),
  ('wholesale_application_approved', 'Wholesale Application Approved', 2, 1, 'default'),
  ('wholesale_application_denied', 'Wholesale Application Denied', 2, 1, 'default');

-- ============================================================================
-- PHASE 5: Reapplication policy
-- ============================================================================

ALTER TABLE wholesale_applications 
  ADD COLUMN reapplication_policy ENUM('allowed', 'blocked', 'cooldown_90') DEFAULT 'allowed' AFTER denial_reason;
