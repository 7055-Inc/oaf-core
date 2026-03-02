-- Migration 052: TikTok connector sync readiness
--
-- Adds columns needed by the internal/external marketplace sync crons.
-- Expands sync_status enum to support the ready_for_api_sync workflow state.

-- 1. tiktok_orders: tracking sync and API push timestamps
ALTER TABLE tiktok_orders
  ADD COLUMN tracking_synced_at DATETIME DEFAULT NULL,
  ADD COLUMN api_tracking_pushed_at DATETIME DEFAULT NULL;

-- 2. tiktok_product_data: inventory sync and API push timestamps, expand sync_status
ALTER TABLE tiktok_product_data
  ADD COLUMN inventory_synced_at DATETIME DEFAULT NULL,
  ADD COLUMN api_inventory_pushed_at DATETIME DEFAULT NULL,
  ADD COLUMN api_synced_at DATETIME DEFAULT NULL,
  MODIFY COLUMN sync_status ENUM('pending','synced','error','ready_for_api_sync') DEFAULT 'pending';

-- 3. tiktok_user_shops: last_order_sync and last_return_sync for external sync cron
ALTER TABLE tiktok_user_shops
  ADD COLUMN last_order_sync DATETIME DEFAULT NULL,
  ADD COLUMN last_return_sync DATETIME DEFAULT NULL;

-- 4. tiktok_sync_logs: allow NULL user_id for system-level admin actions
ALTER TABLE tiktok_sync_logs DROP FOREIGN KEY tiktok_sync_logs_ibfk_1;
ALTER TABLE tiktok_sync_logs MODIFY COLUMN user_id BIGINT DEFAULT NULL;
ALTER TABLE tiktok_sync_logs ADD CONSTRAINT tiktok_sync_logs_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
