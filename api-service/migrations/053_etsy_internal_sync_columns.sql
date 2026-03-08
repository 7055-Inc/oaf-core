-- Migration 053: Add internal sync columns to Etsy tables
-- Enables etsy_orders to flow into the main orders system via internal-marketplace-sync

-- Add processed_to_main and main_order_id to etsy_orders (matches TikTok/Walmart/Wayfair pattern)
ALTER TABLE etsy_orders
  ADD COLUMN processed_to_main TINYINT(1) NOT NULL DEFAULT 0 AFTER updated_at,
  ADD COLUMN main_order_id BIGINT NULL AFTER processed_to_main,
  ADD INDEX idx_etsy_order_processed (processed_to_main);

-- Add vendor_id to etsy_order_items so we can route to the correct vendor in main orders
ALTER TABLE etsy_order_items
  ADD COLUMN vendor_id BIGINT NULL AFTER product_id;

-- Add ready_for_api_sync to sync_status enum so internal sync can stage product changes
ALTER TABLE etsy_product_data
  MODIFY COLUMN sync_status ENUM('pending', 'syncing', 'synced', 'failed', 'ready_for_api_sync') DEFAULT 'pending';

-- Make etsy_sync_logs.user_id nullable (allow system-level admin actions)
ALTER TABLE etsy_sync_logs MODIFY COLUMN user_id BIGINT DEFAULT NULL;
