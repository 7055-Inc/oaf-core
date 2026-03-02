-- Migration 039: Add wayfair_inventory_allocations table
-- Mirrors walmart_inventory_allocations for corporate connector parity

CREATE TABLE IF NOT EXISTS wayfair_inventory_allocations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  allocated_quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_wayfair_alloc_user_product (user_id, product_id),
  KEY idx_wayfair_alloc_user (user_id),
  KEY idx_wayfair_alloc_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add rejection_reason column to walmart_corporate_products if missing
-- (Wayfair already has it; Walmart needs it for the new reject endpoint)
-- Note: MySQL <8.0.1 doesn't support ADD COLUMN IF NOT EXISTS; using procedure workaround
DROP PROCEDURE IF EXISTS _add_rejection_reason;
DELIMITER $$
CREATE PROCEDURE _add_rejection_reason()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'walmart_corporate_products'
      AND COLUMN_NAME = 'rejection_reason'
  ) THEN
    ALTER TABLE walmart_corporate_products
      ADD COLUMN rejection_reason TEXT DEFAULT NULL AFTER listing_status;
  END IF;
END$$
DELIMITER ;
CALL _add_rejection_reason();
DROP PROCEDURE IF EXISTS _add_rejection_reason;
