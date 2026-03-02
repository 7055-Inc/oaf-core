-- Migration 050: Align wayfair_orders and wayfair_order_items with corporate connector pattern
--
-- wayfair_orders was created (migration 040) before the corporate order flow was
-- standardized across connectors. The pull-orders cron and internal-marketplace-sync
-- need columns that exist on walmart_orders but are missing here.
--
-- wayfair_order_items is missing vendor routing, tracking, and status columns
-- that the tracking sync cron and order flow require.

-- 1. wayfair_orders: add corporate flow columns
ALTER TABLE wayfair_orders
  ADD COLUMN is_corporate TINYINT(1) DEFAULT 0 AFTER user_id,
  ADD COLUMN order_data JSON DEFAULT NULL AFTER wayfair_po_date,
  ADD COLUMN acknowledged_at DATETIME DEFAULT NULL AFTER order_status,
  ADD COLUMN processed_to_main TINYINT(1) DEFAULT 0 AFTER acknowledged_at,
  ADD COLUMN main_order_id BIGINT DEFAULT NULL AFTER processed_to_main,
  ADD INDEX idx_wayfair_orders_processed (processed_to_main),
  ADD INDEX idx_wayfair_orders_main (main_order_id);

-- 2. wayfair_order_items: add vendor routing and tracking columns
ALTER TABLE wayfair_order_items
  ADD COLUMN vendor_id BIGINT NOT NULL DEFAULT 0 AFTER product_id,
  ADD COLUMN status ENUM('pending','processing','shipped','delivered','cancelled','returned') DEFAULT 'pending' AFTER total_price,
  ADD COLUMN tracking_number VARCHAR(100) DEFAULT NULL AFTER status,
  ADD COLUMN tracking_carrier VARCHAR(50) DEFAULT NULL AFTER tracking_number,
  ADD COLUMN shipped_at DATETIME DEFAULT NULL AFTER tracking_carrier,
  ADD COLUMN tracking_synced_at DATETIME DEFAULT NULL AFTER shipped_at,
  ADD INDEX idx_wayfair_oi_vendor (vendor_id),
  ADD INDEX idx_wayfair_oi_status (status);
