-- Migration 051: Wayfair shipping label registration support
--
-- Wayfair provides prepaid shipping labels via a register→download flow.
-- This migration:
--   1. Widens carrier columns from restrictive enums to VARCHAR(50) so
--      Wayfair-assigned carrier codes (FDEG, MTVL, etc.) fit without
--      future ALTERs. Existing values are preserved.
--   2. Adds 'marketplace_label' tracking method for marketplace-provided labels.
--   3. Adds registration state columns to wayfair_orders.
--   4. Creates wayfair_shipping_units for vendor package input.

-- 1. Widen shipping_labels.carrier from enum to varchar
ALTER TABLE shipping_labels
  MODIFY COLUMN carrier VARCHAR(50) DEFAULT NULL;

-- 2. Widen order_item_tracking.carrier from enum to varchar
ALTER TABLE order_item_tracking
  MODIFY COLUMN carrier VARCHAR(50) DEFAULT NULL;

-- 3. Add marketplace_label to order_item_tracking.tracking_method
ALTER TABLE order_item_tracking
  MODIFY COLUMN tracking_method ENUM('label_purchase','manual_entry','marketplace_label') DEFAULT 'manual_entry';

-- 4. Registration state on wayfair_orders
ALTER TABLE wayfair_orders
  ADD COLUMN registration_status ENUM('unregistered','pending','registered','failed','error') DEFAULT 'unregistered',
  ADD COLUMN registration_attempts INT DEFAULT 0,
  ADD COLUMN last_registration_error TEXT DEFAULT NULL,
  ADD COLUMN last_registration_attempt_at DATETIME DEFAULT NULL,
  ADD COLUMN registered_at DATETIME DEFAULT NULL,
  ADD COLUMN label_event_id VARCHAR(100) DEFAULT NULL,
  ADD COLUMN wayfair_carrier VARCHAR(100) DEFAULT NULL,
  ADD COLUMN wayfair_carrier_code VARCHAR(50) DEFAULT NULL,
  ADD COLUMN wayfair_tracking_number VARCHAR(100) DEFAULT NULL,
  ADD COLUMN pickup_date DATE DEFAULT NULL,
  ADD COLUMN shipping_label_url VARCHAR(500) DEFAULT NULL,
  ADD COLUMN packing_slip_url VARCHAR(500) DEFAULT NULL,
  ADD COLUMN bol_url VARCHAR(500) DEFAULT NULL,
  ADD COLUMN shipping_units_data JSON DEFAULT NULL,
  ADD INDEX idx_wayfair_orders_reg_status (registration_status);

-- 5. Vendor package definitions for registration input
CREATE TABLE wayfair_shipping_units (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  wayfair_order_id BIGINT NOT NULL,
  part_number VARCHAR(100) NOT NULL,
  unit_type ENUM('CARTON','BAG','ROLL','OTHER') DEFAULT 'CARTON',
  weight_value DECIMAL(8,2) NOT NULL,
  weight_unit ENUM('POUNDS','KILOGRAMS') DEFAULT 'POUNDS',
  length_value DECIMAL(8,2) NOT NULL,
  width_value DECIMAL(8,2) NOT NULL,
  height_value DECIMAL(8,2) NOT NULL,
  dimension_unit ENUM('INCHES','CENTIMETERS') DEFAULT 'INCHES',
  group_identifier INT NOT NULL DEFAULT 1,
  sequence_identifier INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_wsu_order (wayfair_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
