-- Marketplace & Wholesale System Database Migration
-- Phase 1: Core Marketplace Infrastructure
-- 
-- This script creates the fields and tables needed for:
-- - Marketplace product management and curation
-- - Wholesale pricing system
-- - User marketplace preferences and permissions
-- - Admin curation workflow

-- =============================================================================
-- PRODUCTS TABLE EXTENSIONS
-- =============================================================================
-- Add marketplace and wholesale fields to existing products table

ALTER TABLE products 
ADD COLUMN marketplace_enabled BOOLEAN DEFAULT FALSE COMMENT 'Auto-updated by permission cron job',
ADD COLUMN marketplace_category ENUM('unsorted', 'art', 'crafts') DEFAULT 'unsorted' COMMENT 'Admin curation: art=main site, crafts=crafts subdomain',
ADD COLUMN wholesale_price DECIMAL(10,2) NULL COMMENT 'Wholesale price (shows with MSRP for wholesale customers)',
ADD COLUMN wholesale_description TEXT NULL COMMENT 'Additional description shown only to wholesale customers';

-- Add indexes for performance
ALTER TABLE products
ADD INDEX idx_marketplace_enabled (marketplace_enabled, marketplace_category),
ADD INDEX idx_marketplace_category (marketplace_category, created_at),
ADD INDEX idx_wholesale_pricing (wholesale_price);

-- =============================================================================
-- USERS TABLE EXTENSIONS  
-- =============================================================================
-- Add marketplace auto-sort preference and extend user_type for wholesale

-- Add marketplace auto-sort preference
ALTER TABLE users 
ADD COLUMN marketplace_auto_sort ENUM('art', 'crafts', 'manual') DEFAULT 'manual' COMMENT 'Auto-assigns new products to marketplace category';

-- Extend user_type enum to include 'wholesale'
ALTER TABLE users 
MODIFY COLUMN user_type ENUM('artist','promoter','community','admin','Draft','wholesale') NOT NULL;

-- Add index for marketplace queries
ALTER TABLE users
ADD INDEX idx_marketplace_auto_sort (marketplace_auto_sort);

-- =============================================================================
-- MARKETPLACE PERMISSIONS TABLE
-- =============================================================================
-- Track marketplace-specific permissions and application status
-- Separate from general user permissions for cleaner separation of concerns

CREATE TABLE marketplace_permissions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  
  -- Permission Status
  status ENUM('pending', 'approved', 'rejected', 'suspended') DEFAULT 'pending',
  auto_sort_preference ENUM('art', 'crafts', 'manual') DEFAULT 'manual',
  
  -- Application Data
  application_data JSON NULL COMMENT 'Stores application form responses',
  terms_accepted_at TIMESTAMP NULL,
  terms_version VARCHAR(50) NULL,
  
  -- Admin Review
  reviewed_by BIGINT NULL,
  reviewed_at TIMESTAMP NULL,
  admin_notes TEXT NULL,
  
  -- Timestamps
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Constraints and Indexes
  UNIQUE KEY unique_user_marketplace (user_id),
  INDEX idx_status_applied (status, applied_at),
  INDEX idx_pending_review (status, applied_at),
  INDEX idx_reviewer (reviewed_by, reviewed_at)
);

-- =============================================================================
-- MARKETPLACE PRODUCT CURATION TABLE
-- =============================================================================
-- Track admin curation decisions and history
-- Allows for audit trail and bulk operations

CREATE TABLE marketplace_curation (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT NOT NULL,
  
  -- Curation Decision
  previous_category ENUM('unsorted', 'art', 'crafts') NULL,
  current_category ENUM('unsorted', 'art', 'crafts') NOT NULL,
  
  -- Admin Action
  curated_by BIGINT NOT NULL,
  curation_reason TEXT NULL,
  
  -- Timestamps
  curated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (curated_by) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes for Performance
  INDEX idx_product_history (product_id, curated_at),
  INDEX idx_curator_activity (curated_by, curated_at),
  INDEX idx_category_changes (current_category, curated_at)
);

-- =============================================================================
-- SUBSCRIPTION ADDONS EXTENSION
-- =============================================================================
-- Extend existing subscription system to support marketplace addons
-- Note: This assumes existing subscription tables exist

-- Check if vendor_subscriptions table exists, if so add marketplace fields
-- (This will be a conditional addition based on existing subscription system)

-- =============================================================================
-- SAMPLE CRON JOB LOGIC (REFERENCE)
-- =============================================================================
-- This SQL shows the logic for the permission cron job that will run every 6 hours

/*
-- Enable marketplace for approved users
UPDATE products p
JOIN marketplace_permissions mp ON p.vendor_id = mp.user_id
SET p.marketplace_enabled = TRUE
WHERE mp.status = 'approved' 
  AND p.marketplace_enabled = FALSE;

-- Disable marketplace for non-approved users  
UPDATE products p
LEFT JOIN marketplace_permissions mp ON p.vendor_id = mp.user_id
SET p.marketplace_enabled = FALSE
WHERE (mp.status IS NULL OR mp.status != 'approved')
  AND p.marketplace_enabled = TRUE;

-- Auto-assign categories for new products based on user preference
UPDATE products p
JOIN users u ON p.vendor_id = u.id
JOIN marketplace_permissions mp ON u.id = mp.user_id
SET p.marketplace_category = u.marketplace_auto_sort
WHERE p.marketplace_enabled = TRUE
  AND p.marketplace_category = 'unsorted'
  AND u.marketplace_auto_sort IN ('art', 'crafts')
  AND mp.status = 'approved';
*/

-- =============================================================================
-- SAMPLE ADMIN QUERIES (REFERENCE)
-- =============================================================================
-- These queries can be used in the admin interface

/*
-- Get products needing curation (unsorted)
SELECT 
  p.id,
  p.name,
  p.vendor_id,
  u.username,
  p.created_at
FROM products p
JOIN users u ON p.vendor_id = u.id
WHERE p.marketplace_enabled = TRUE
  AND p.marketplace_category = 'unsorted'
ORDER BY p.created_at DESC;

-- Get marketplace stats by category
SELECT 
  marketplace_category,
  COUNT(*) as product_count,
  COUNT(DISTINCT vendor_id) as vendor_count
FROM products
WHERE marketplace_enabled = TRUE
GROUP BY marketplace_category;

-- Get wholesale pricing coverage
SELECT 
  COUNT(*) as total_products,
  COUNT(wholesale_price) as wholesale_enabled,
  ROUND(COUNT(wholesale_price) * 100.0 / COUNT(*), 2) as wholesale_percentage
FROM products
WHERE marketplace_enabled = TRUE;
*/

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- Tables and fields created:
-- ✓ products.marketplace_enabled - Auto-updated by cron job
-- ✓ products.marketplace_category - Admin curation (art/crafts/unsorted)  
-- ✓ products.wholesale_price - Wholesale pricing
-- ✓ products.wholesale_description - Wholesale-specific description
-- ✓ users.marketplace_auto_sort - User preference for auto-categorization
-- ✓ users.user_type - Extended to include 'wholesale'
-- ✓ marketplace_permissions - Application and approval tracking
-- ✓ marketplace_curation - Admin curation audit trail
--
-- Ready for Phase 1 implementation!
-- Next: Create cron job script and update product creation endpoint
