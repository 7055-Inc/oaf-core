-- Migration 045: Faire connector tables (oauth_only pattern - wholesale marketplace)

CREATE TABLE IF NOT EXISTS faire_user_shops (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  shop_id VARCHAR(100) NOT NULL,
  brand_id VARCHAR(100) DEFAULT NULL,
  shop_name VARCHAR(255) DEFAULT NULL,
  access_token TEXT DEFAULT NULL,
  refresh_token TEXT DEFAULT NULL,
  token_expires_at DATETIME DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  terms_accepted TINYINT(1) DEFAULT 0,
  last_sync_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_faire_user_shops_user (user_id),
  INDEX idx_faire_user_shops_shop (shop_id),
  INDEX idx_faire_user_shops_active (is_active),
  UNIQUE KEY uq_faire_user_shop (user_id, shop_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS faire_product_data (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  faire_product_id VARCHAR(100) DEFAULT NULL,
  faire_title VARCHAR(500) DEFAULT NULL,
  faire_description TEXT DEFAULT NULL,
  faire_wholesale_price DECIMAL(10,2) DEFAULT NULL,
  faire_retail_price DECIMAL(10,2) DEFAULT NULL,
  faire_category VARCHAR(255) DEFAULT NULL,
  faire_minimum_order_quantity INT DEFAULT 1,
  is_active TINYINT(1) DEFAULT 1,
  sync_status ENUM('pending','syncing','synced','failed') DEFAULT 'pending',
  last_sync_at DATETIME DEFAULT NULL,
  last_sync_error TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_faire_pd_user (user_id),
  INDEX idx_faire_pd_product (product_id),
  INDEX idx_faire_pd_sync (sync_status),
  UNIQUE KEY uq_faire_product (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS faire_inventory_allocations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  allocated_quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_faire_ia_user (user_id),
  INDEX idx_faire_ia_product (product_id),
  UNIQUE KEY uq_faire_allocation (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS faire_orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  shop_id VARCHAR(100) NOT NULL,
  faire_order_id VARCHAR(100) NOT NULL,
  order_status VARCHAR(50) DEFAULT 'NEW',
  customer_name VARCHAR(255) DEFAULT NULL,
  shipping_address1 VARCHAR(255) DEFAULT NULL,
  shipping_city VARCHAR(100) DEFAULT NULL,
  shipping_state VARCHAR(50) DEFAULT NULL,
  shipping_zip VARCHAR(20) DEFAULT NULL,
  shipping_country VARCHAR(10) DEFAULT 'US',
  total_amount DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  order_data JSON DEFAULT NULL,
  faire_created_at VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_faire_order (faire_order_id),
  INDEX idx_faire_orders_user (user_id),
  INDEX idx_faire_orders_shop (shop_id),
  INDEX idx_faire_orders_status (order_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS faire_order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  faire_order_id BIGINT NOT NULL,
  faire_item_id VARCHAR(100) DEFAULT NULL,
  product_name VARCHAR(500) DEFAULT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) DEFAULT 0,
  line_total DECIMAL(10,2) DEFAULT 0,
  status ENUM('pending','processing','shipped','delivered','cancelled') DEFAULT 'pending',
  tracking_number VARCHAR(100) DEFAULT NULL,
  tracking_carrier VARCHAR(100) DEFAULT NULL,
  tracking_synced_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_faire_oi_order (faire_order_id),
  INDEX idx_faire_oi_item (faire_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS faire_sync_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT DEFAULT NULL,
  sync_type ENUM('product','inventory','orders','shop') NOT NULL,
  operation VARCHAR(50) DEFAULT NULL,
  reference_id VARCHAR(100) DEFAULT NULL,
  status ENUM('success','failed','warning') NOT NULL,
  message TEXT DEFAULT NULL,
  error_details TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_faire_sl_user (user_id),
  INDEX idx_faire_sl_type (sync_type),
  INDEX idx_faire_sl_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
