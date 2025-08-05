-- Vendor Shipping System Database Migration
-- Phase 1: Core Shipping Infrastructure Tables
-- 
-- This script creates the tables needed for vendor shipping management:
-- - order_item_tracking: Unlimited packages per order item with tracking
-- - shipping_labels: Purchased shipping labels and files
-- - vendor_shipping_preferences: Optional vendor preferences

-- =============================================================================
-- ORDER ITEM TRACKING TABLE
-- =============================================================================
-- Main table for tracking packages - supports unlimited packages per order item
-- Each record represents one package with one tracking number

CREATE TABLE order_item_tracking (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  order_item_id BIGINT NOT NULL,
  vendor_id BIGINT NOT NULL,
  package_sequence INT NOT NULL DEFAULT 1,
  
  -- Shipping Details
  carrier ENUM('ups', 'fedex', 'usps', 'other') NOT NULL,
  service_name VARCHAR(100) NULL,
  tracking_number VARCHAR(100) NOT NULL,
  tracking_method ENUM('label_purchase', 'manual_entry') NOT NULL,
  
  -- Status and Timestamps
  status ENUM('created', 'shipped', 'delivered') DEFAULT 'created',
  shipped_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Label Reference (if purchased)
  label_id BIGINT NULL,
  
  -- Foreign Keys
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes for Performance
  INDEX idx_order_item_packages (order_item_id, package_sequence),
  INDEX idx_vendor_tracking (vendor_id, created_at),
  INDEX idx_tracking_number (tracking_number),
  INDEX idx_status_tracking (status, updated_at)
);

-- =============================================================================
-- SHIPPING LABELS TABLE
-- =============================================================================
-- Stores purchased shipping labels with file paths and transaction details
-- Only for labels purchased through the system (not manual tracking)

CREATE TABLE shipping_labels (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  order_id BIGINT NOT NULL,
  order_item_id BIGINT NOT NULL,
  vendor_id BIGINT NOT NULL,
  package_sequence INT NOT NULL DEFAULT 1,
  
  -- Carrier and Service Info
  carrier ENUM('ups', 'fedex', 'usps') NOT NULL,
  service_code VARCHAR(50) NOT NULL,
  service_name VARCHAR(100) NOT NULL,
  tracking_number VARCHAR(100) NOT NULL,
  
  -- Label File and Format
  label_file_path VARCHAR(500) NULL,
  label_format ENUM('paper', 'label') NOT NULL,
  
  -- Financial Information
  cost DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  vendor_transaction_id BIGINT NULL,
  
  -- Status and Timestamps
  status ENUM('purchased', 'printed') DEFAULT 'purchased',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_transaction_id) REFERENCES vendor_transactions(id) ON DELETE SET NULL,
  
  -- Indexes for Performance
  INDEX idx_vendor_labels (vendor_id, created_at),
  INDEX idx_label_tracking (tracking_number),
  INDEX idx_order_labels (order_id, package_sequence),
  INDEX idx_file_cleanup (created_at, label_file_path)
);

-- =============================================================================
-- VENDOR SHIPPING PREFERENCES TABLE (Optional)
-- =============================================================================
-- Stores vendor preferences for shipping defaults
-- This is optional and can be added later if needed

CREATE TABLE vendor_shipping_preferences (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  vendor_id BIGINT NOT NULL,
  
  -- Shipping Preferences
  preferred_carrier ENUM('ups', 'fedex', 'usps') NULL,
  default_label_format ENUM('paper', 'label') DEFAULT 'paper',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Key and Unique Constraint
  FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_vendor_preferences (vendor_id)
);

-- =============================================================================
-- ADD FOREIGN KEY CONSTRAINT FOR LABEL REFERENCE
-- =============================================================================
-- Add the foreign key constraint from tracking to labels after both tables exist

ALTER TABLE order_item_tracking 
ADD FOREIGN KEY (label_id) REFERENCES shipping_labels(id) ON DELETE SET NULL;

-- =============================================================================
-- SAMPLE DATA VERIFICATION QUERIES
-- =============================================================================
-- These queries can be used to verify the tables were created correctly
-- and to understand the relationships

/*
-- Query to see all packages for an order item
SELECT 
  oit.*,
  sl.cost,
  sl.label_file_path
FROM order_item_tracking oit
LEFT JOIN shipping_labels sl ON oit.label_id = sl.id
WHERE oit.order_item_id = ?
ORDER BY oit.package_sequence;

-- Query to get vendor's shipping activity
SELECT 
  oit.order_id,
  oit.tracking_number,
  oit.carrier,
  oit.status,
  sl.cost,
  oit.created_at
FROM order_item_tracking oit
LEFT JOIN shipping_labels sl ON oit.label_id = sl.id
WHERE oit.vendor_id = ?
ORDER BY oit.created_at DESC;

-- Query to find orders ready to ship for a vendor
SELECT DISTINCT
  o.id as order_id,
  o.total_amount,
  o.created_at,
  COUNT(oi.id) as total_items,
  COUNT(oit.id) as shipped_items
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
LEFT JOIN order_item_tracking oit ON oi.id = oit.order_item_id
WHERE o.status = 'paid' 
  AND oi.vendor_id = ?
GROUP BY o.id
HAVING shipped_items = 0
ORDER BY o.created_at DESC;
*/

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
-- Tables created:
-- ✓ order_item_tracking - Main tracking table (unlimited packages)
-- ✓ shipping_labels - Purchased label storage and metadata
-- ✓ vendor_shipping_preferences - Optional vendor preferences
--
-- Ready for Phase 1 implementation!