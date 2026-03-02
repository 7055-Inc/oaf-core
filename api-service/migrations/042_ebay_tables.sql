-- Migration 042: eBay connector tables
-- OAuth-only connector with token refresh (access tokens expire ~2h)

CREATE TABLE IF NOT EXISTS ebay_user_shops (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  shop_id VARCHAR(255) NOT NULL,
  shop_name VARCHAR(255) DEFAULT NULL,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP NULL DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  terms_accepted TINYINT(1) DEFAULT 0,
  last_sync_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ebay_user_shop (user_id, shop_id),
  KEY idx_ebay_shops_user (user_id),
  KEY idx_ebay_shops_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ebay_product_data (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  ebay_listing_id VARCHAR(100) DEFAULT NULL,
  ebay_offer_id VARCHAR(100) DEFAULT NULL,
  ebay_title VARCHAR(255) DEFAULT NULL,
  ebay_description TEXT DEFAULT NULL,
  ebay_price DECIMAL(10,2) DEFAULT NULL,
  ebay_category_id VARCHAR(50) DEFAULT NULL,
  ebay_condition VARCHAR(50) DEFAULT 'NEW',
  is_active TINYINT(1) DEFAULT 1,
  sync_status ENUM('pending','synced','error') DEFAULT 'pending',
  last_sync_at TIMESTAMP NULL DEFAULT NULL,
  last_sync_error TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ebay_user_product (user_id, product_id),
  KEY idx_ebay_pd_sync (sync_status),
  KEY idx_ebay_pd_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ebay_inventory_allocations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  allocated_quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ebay_alloc_user_product (user_id, product_id),
  KEY idx_ebay_alloc_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ebay_orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  shop_id VARCHAR(255) DEFAULT NULL,
  ebay_order_id VARCHAR(100) NOT NULL,
  order_status VARCHAR(50) DEFAULT 'NOT_STARTED',
  customer_name VARCHAR(255) DEFAULT NULL,
  shipping_address1 VARCHAR(255) DEFAULT NULL,
  shipping_city VARCHAR(100) DEFAULT NULL,
  shipping_state VARCHAR(50) DEFAULT NULL,
  shipping_zip VARCHAR(20) DEFAULT NULL,
  shipping_country VARCHAR(10) DEFAULT 'US',
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  order_data JSON DEFAULT NULL,
  ebay_created_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ebay_order (ebay_order_id),
  KEY idx_ebay_orders_user (user_id),
  KEY idx_ebay_orders_status (order_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ebay_order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  ebay_order_id BIGINT UNSIGNED NOT NULL,
  ebay_line_item_id VARCHAR(100) DEFAULT NULL,
  product_id BIGINT UNSIGNED DEFAULT NULL,
  sku VARCHAR(100) DEFAULT NULL,
  product_name VARCHAR(255) DEFAULT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  line_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  status ENUM('pending','processing','shipped','delivered','cancelled','returned') DEFAULT 'pending',
  tracking_number VARCHAR(100) DEFAULT NULL,
  tracking_carrier VARCHAR(50) DEFAULT NULL,
  shipped_at DATETIME DEFAULT NULL,
  tracking_synced_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_ebay_oi_order (ebay_order_id),
  KEY idx_ebay_oi_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ebay_sync_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  sync_type VARCHAR(50) DEFAULT NULL,
  operation VARCHAR(50) DEFAULT NULL,
  reference_id VARCHAR(100) DEFAULT NULL,
  status VARCHAR(20) DEFAULT NULL,
  message TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ebay_logs_user (user_id),
  KEY idx_ebay_logs_type (sync_type),
  KEY idx_ebay_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
