-- Migration 047: Meta/Facebook connector tables (hybrid - OAuth + Corporate)

CREATE TABLE IF NOT EXISTS meta_user_shops (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  shop_id VARCHAR(100) NOT NULL,
  meta_user_id VARCHAR(100) DEFAULT NULL,
  catalog_id VARCHAR(100) DEFAULT NULL,
  shop_name VARCHAR(255) DEFAULT NULL,
  access_token TEXT DEFAULT NULL,
  token_expires_at DATETIME DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  terms_accepted TINYINT(1) DEFAULT 0,
  last_sync_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_meta_user_shops_user (user_id),
  INDEX idx_meta_user_shops_shop (shop_id),
  INDEX idx_meta_user_shops_active (is_active),
  UNIQUE KEY uq_meta_user_shop (user_id, shop_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS meta_product_data (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  meta_product_id VARCHAR(100) DEFAULT NULL,
  meta_title VARCHAR(500) DEFAULT NULL,
  meta_description TEXT DEFAULT NULL,
  meta_price DECIMAL(10,2) DEFAULT NULL,
  meta_category VARCHAR(255) DEFAULT NULL,
  meta_product_url VARCHAR(500) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  sync_status ENUM('pending','syncing','synced','failed') DEFAULT 'pending',
  last_sync_at DATETIME DEFAULT NULL,
  last_sync_error TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_meta_pd_user (user_id),
  INDEX idx_meta_pd_product (product_id),
  INDEX idx_meta_pd_sync (sync_status),
  UNIQUE KEY uq_meta_product (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS meta_inventory_allocations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  allocated_quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_meta_ia_user (user_id),
  INDEX idx_meta_ia_product (product_id),
  UNIQUE KEY uq_meta_allocation (user_id, product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS meta_orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  shop_id VARCHAR(100) NOT NULL,
  meta_order_id VARCHAR(100) NOT NULL,
  order_status VARCHAR(50) DEFAULT 'CREATED',
  customer_name VARCHAR(255) DEFAULT NULL,
  shipping_address1 VARCHAR(255) DEFAULT NULL,
  shipping_city VARCHAR(100) DEFAULT NULL,
  shipping_state VARCHAR(50) DEFAULT NULL,
  shipping_zip VARCHAR(20) DEFAULT NULL,
  shipping_country VARCHAR(10) DEFAULT 'US',
  total_amount DECIMAL(10,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  order_data JSON DEFAULT NULL,
  meta_created_at VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_meta_order (meta_order_id),
  INDEX idx_meta_orders_user (user_id),
  INDEX idx_meta_orders_shop (shop_id),
  INDEX idx_meta_orders_status (order_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS meta_order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  meta_order_id BIGINT NOT NULL,
  meta_item_id VARCHAR(100) DEFAULT NULL,
  product_name VARCHAR(500) DEFAULT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) DEFAULT 0,
  line_total DECIMAL(10,2) DEFAULT 0,
  status ENUM('pending','processing','shipped','delivered','cancelled') DEFAULT 'pending',
  tracking_number VARCHAR(100) DEFAULT NULL,
  tracking_carrier VARCHAR(100) DEFAULT NULL,
  tracking_synced_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_meta_oi_order (meta_order_id),
  INDEX idx_meta_oi_item (meta_item_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS meta_sync_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT DEFAULT NULL,
  sync_type ENUM('product','inventory','orders','shop') NOT NULL,
  operation VARCHAR(50) DEFAULT NULL,
  reference_id VARCHAR(100) DEFAULT NULL,
  status ENUM('success','failed','warning') NOT NULL,
  message TEXT DEFAULT NULL,
  error_details TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_meta_sl_user (user_id),
  INDEX idx_meta_sl_type (sync_type),
  INDEX idx_meta_sl_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS meta_corporate_products (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  meta_product_id VARCHAR(100) DEFAULT NULL,
  corporate_title VARCHAR(500) DEFAULT NULL,
  corporate_description TEXT DEFAULT NULL,
  corporate_short_description VARCHAR(1000) DEFAULT NULL,
  corporate_key_features JSON DEFAULT NULL,
  corporate_main_image_url VARCHAR(500) DEFAULT NULL,
  corporate_additional_images JSON DEFAULT NULL,
  corporate_category VARCHAR(255) DEFAULT NULL,
  corporate_brand VARCHAR(255) DEFAULT NULL,
  corporate_price DECIMAL(10,2) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  listing_status ENUM('pending','listed','paused','removing','removed','rejected') DEFAULT 'pending',
  sync_status ENUM('pending','syncing','synced','failed') DEFAULT 'pending',
  last_sync_at DATETIME DEFAULT NULL,
  last_sync_error TEXT DEFAULT NULL,
  terms_accepted_at DATETIME DEFAULT NULL,
  rejection_reason TEXT DEFAULT NULL,
  removed_at DATETIME DEFAULT NULL,
  cooldown_ends_at DATETIME DEFAULT NULL,
  created_by BIGINT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_meta_corp_product (product_id),
  INDEX idx_meta_corp_user (user_id),
  INDEX idx_meta_corp_listing (listing_status),
  INDEX idx_meta_corp_sync (sync_status),
  INDEX idx_meta_corp_active (is_active),
  INDEX idx_meta_corp_cooldown (cooldown_ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
