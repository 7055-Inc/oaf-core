-- Migration 054: Add internal sync columns to Amazon tables
-- Enables amazon_orders to flow into the main orders system via internal-marketplace-sync

ALTER TABLE amazon_orders
  ADD COLUMN processed_to_main TINYINT(1) NOT NULL DEFAULT 0 AFTER updated_at,
  ADD COLUMN main_order_id BIGINT NULL AFTER processed_to_main,
  ADD INDEX idx_amazon_order_processed (processed_to_main);

ALTER TABLE amazon_order_items
  ADD COLUMN product_id BIGINT NULL AFTER amazon_order_item_id,
  ADD COLUMN vendor_id BIGINT NULL AFTER product_id;

ALTER TABLE amazon_product_data
  MODIFY COLUMN sync_status ENUM('pending','syncing','synced','failed','ready_for_api_sync') DEFAULT 'pending';
