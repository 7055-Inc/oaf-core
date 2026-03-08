-- Migration 008: TikTok Corporate Shop Integration Enhancements
-- Adds corporate product approval workflow following Walmart pattern
-- Created: 2026-02-08

-- Enhance tiktok_corporate_products table to match Walmart corporate pattern
-- Add necessary columns for admin approval workflow

ALTER TABLE tiktok_corporate_products
ADD COLUMN user_id BIGINT NOT NULL AFTER product_id,
ADD COLUMN tiktok_sku_id VARCHAR(100) NULL AFTER tiktok_product_id,
ADD COLUMN corporate_short_description VARCHAR(1000) NULL AFTER corporate_description,
ADD COLUMN corporate_key_features JSON NULL AFTER corporate_short_description,
ADD COLUMN corporate_main_image_url VARCHAR(500) NULL AFTER corporate_key_features,
ADD COLUMN corporate_additional_images JSON NULL AFTER corporate_main_image_url,
ADD COLUMN corporate_category_id VARCHAR(100) NULL AFTER corporate_additional_images,
ADD COLUMN corporate_brand VARCHAR(100) NULL AFTER corporate_category_id,
ADD COLUMN listing_status ENUM('pending', 'listed', 'paused', 'removing', 'removed', 'rejected') DEFAULT 'pending' AFTER is_active,
ADD COLUMN sync_status ENUM('pending', 'syncing', 'synced', 'failed') DEFAULT 'pending' AFTER listing_status,
ADD COLUMN last_sync_at DATETIME NULL AFTER sync_status,
ADD COLUMN last_sync_error TEXT NULL AFTER last_sync_at,
ADD COLUMN terms_accepted_at DATETIME NULL AFTER last_sync_error,
ADD COLUMN rejection_reason TEXT NULL AFTER terms_accepted_at,
ADD COLUMN removed_at DATETIME NULL AFTER rejection_reason,
ADD COLUMN cooldown_ends_at DATETIME NULL AFTER removed_at;

-- Add foreign key constraint for user_id
ALTER TABLE tiktok_corporate_products
ADD CONSTRAINT fk_tiktok_corporate_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add foreign key constraint for product_id
ALTER TABLE tiktok_corporate_products
ADD CONSTRAINT fk_tiktok_corporate_product
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX idx_tiktok_corp_user_id ON tiktok_corporate_products(user_id);
CREATE INDEX idx_tiktok_corp_listing_status ON tiktok_corporate_products(listing_status);
CREATE INDEX idx_tiktok_corp_sync_status ON tiktok_corporate_products(sync_status);
CREATE INDEX idx_tiktok_corp_created_by ON tiktok_corporate_products(created_by);
CREATE INDEX idx_tiktok_corp_cooldown ON tiktok_corporate_products(cooldown_ends_at);
CREATE INDEX idx_tiktok_corp_tiktok_sku ON tiktok_corporate_products(tiktok_sku_id);

-- Add table comment for documentation
ALTER TABLE tiktok_corporate_products COMMENT = 'TikTok Shop corporate product listings - Admin approval workflow for Brakebee TikTok Shop';

-- Update existing records to have default values
UPDATE tiktok_corporate_products 
SET listing_status = 'pending', 
    sync_status = 'pending'
WHERE listing_status IS NULL OR sync_status IS NULL;

-- Verification queries
SELECT 'tiktok_corporate_products enhancement complete' as status,
       COUNT(*) as existing_products
FROM tiktok_corporate_products;
