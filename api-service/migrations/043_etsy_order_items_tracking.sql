-- Migration 043: Add tracking columns to etsy_order_items for tracking sync cron
-- These columns mirror the pattern used by Shopify/eBay order items

ALTER TABLE etsy_order_items
  ADD COLUMN status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending' AFTER total_price,
  ADD COLUMN tracking_number VARCHAR(100) DEFAULT NULL AFTER status,
  ADD COLUMN tracking_carrier VARCHAR(100) DEFAULT NULL AFTER tracking_number,
  ADD COLUMN tracking_synced_at DATETIME DEFAULT NULL AFTER tracking_carrier;
