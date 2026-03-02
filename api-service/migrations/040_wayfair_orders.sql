-- Migration 040: Wayfair order tables
-- Mirrors walmart_orders + walmart_order_items for corporate connector parity

CREATE TABLE IF NOT EXISTS wayfair_orders (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED DEFAULT NULL,
  is_corporate TINYINT(1) NOT NULL DEFAULT 1,
  wayfair_po_number VARCHAR(100) NOT NULL,
  wayfair_order_date DATETIME DEFAULT NULL,
  order_data JSON DEFAULT NULL,
  customer_name VARCHAR(255) DEFAULT NULL,
  shipping_name VARCHAR(255) DEFAULT NULL,
  shipping_address1 VARCHAR(255) DEFAULT NULL,
  shipping_address2 VARCHAR(255) DEFAULT NULL,
  shipping_city VARCHAR(100) DEFAULT NULL,
  shipping_state VARCHAR(50) DEFAULT NULL,
  shipping_zip VARCHAR(20) DEFAULT NULL,
  shipping_country VARCHAR(10) DEFAULT 'US',
  shipping_phone VARCHAR(50) DEFAULT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  order_status ENUM('created','acknowledged','shipped','delivered','cancelled','returned') NOT NULL DEFAULT 'created',
  acknowledged_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_wayfair_po (wayfair_po_number),
  KEY idx_wayfair_orders_status (order_status),
  KEY idx_wayfair_orders_user (user_id),
  KEY idx_wayfair_orders_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wayfair_order_items (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  wayfair_order_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  vendor_id INT UNSIGNED NOT NULL,
  sku VARCHAR(100) NOT NULL,
  part_number VARCHAR(100) DEFAULT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  line_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status ENUM('pending','processing','shipped','delivered','cancelled','returned') NOT NULL DEFAULT 'pending',
  tracking_number VARCHAR(100) DEFAULT NULL,
  tracking_carrier VARCHAR(50) DEFAULT NULL,
  shipped_at DATETIME DEFAULT NULL,
  tracking_synced_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_wayfair_oi_order (wayfair_order_id),
  KEY idx_wayfair_oi_vendor (vendor_id),
  KEY idx_wayfair_oi_product (product_id),
  KEY idx_wayfair_oi_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
