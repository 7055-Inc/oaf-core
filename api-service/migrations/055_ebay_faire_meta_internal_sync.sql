-- Migration 055: Add internal sync columns to eBay, Faire, and Meta tables
-- Same pattern applied to Etsy (053) and Amazon (054)

-- ═══════════════════════════════════════════
-- eBay
-- ═══════════════════════════════════════════
ALTER TABLE ebay_orders
  ADD COLUMN processed_to_main TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN main_order_id BIGINT NULL,
  ADD INDEX idx_ebay_order_processed (processed_to_main);

ALTER TABLE ebay_order_items
  ADD COLUMN vendor_id BIGINT NULL AFTER product_id;

ALTER TABLE ebay_product_data
  MODIFY COLUMN sync_status ENUM('pending','synced','error','ready_for_api_sync') DEFAULT 'pending';

-- ═══════════════════════════════════════════
-- Faire
-- ═══════════════════════════════════════════
ALTER TABLE faire_orders
  ADD COLUMN processed_to_main TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN main_order_id BIGINT NULL,
  ADD INDEX idx_faire_order_processed (processed_to_main);

-- faire_order_items already has product_id and vendor_id from migration 045

ALTER TABLE faire_product_data
  MODIFY COLUMN sync_status ENUM('pending','syncing','synced','failed','ready_for_api_sync') DEFAULT 'pending';

-- ═══════════════════════════════════════════
-- Meta
-- ═══════════════════════════════════════════
ALTER TABLE meta_orders
  ADD COLUMN processed_to_main TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN main_order_id BIGINT NULL,
  ADD INDEX idx_meta_order_processed (processed_to_main);

ALTER TABLE meta_order_items
  ADD COLUMN product_id BIGINT NULL AFTER meta_item_id,
  ADD COLUMN vendor_id BIGINT NULL AFTER product_id;

ALTER TABLE meta_product_data
  MODIFY COLUMN sync_status ENUM('pending','syncing','synced','failed','ready_for_api_sync') DEFAULT 'pending';
