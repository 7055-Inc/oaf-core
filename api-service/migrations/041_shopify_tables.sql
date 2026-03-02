-- Migration 041: Shopify connector tables
-- OAuth-only connector following TikTok pattern

-- Shop connections (OAuth tokens, shop info)
CREATE TABLE IF NOT EXISTS shopify_user_shops (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  shop_id VARCHAR(255) NOT NULL,
  shop_name VARCHAR(255) DEFAULT NULL,
  shop_domain VARCHAR(255) DEFAULT NULL,
  shop_email VARCHAR(255) DEFAULT NULL,
  access_token TEXT,
  scopes TEXT DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  terms_accepted TINYINT(1) DEFAULT 0,
  last_sync_at TIMESTAMP NULL DEFAULT NULL,
  last_products_sync_at TIMESTAMP NULL DEFAULT NULL,
  last_orders_sync_at TIMESTAMP NULL DEFAULT NULL,
  last_inventory_sync_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shopify_user_shop (user_id, shop_id),
  KEY idx_shopify_shops_user (user_id),
  KEY idx_shopify_shops_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product data mapping (local product → Shopify listing)
CREATE TABLE IF NOT EXISTS shopify_product_data (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  shopify_product_id VARCHAR(100) DEFAULT NULL,
  shopify_variant_id VARCHAR(100) DEFAULT NULL,
  shopify_title VARCHAR(255) DEFAULT NULL,
  shopify_description TEXT DEFAULT NULL,
  shopify_price DECIMAL(10,2) DEFAULT NULL,
  shopify_tags VARCHAR(500) DEFAULT NULL,
  shopify_product_type VARCHAR(100) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  sync_status ENUM('pending','synced','error') DEFAULT 'pending',
  last_sync_at TIMESTAMP NULL DEFAULT NULL,
  last_sync_error TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shopify_user_product (user_id, product_id),
  KEY idx_shopify_pd_sync (sync_status),
  KEY idx_shopify_pd_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inventory allocations
CREATE TABLE IF NOT EXISTS shopify_inventory_allocations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED NOT NULL,
  product_id BIGINT UNSIGNED NOT NULL,
  allocated_quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shopify_alloc_user_product (user_id, product_id),
  KEY idx_shopify_alloc_user (user_id),
  KEY idx_shopify_alloc_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders
CREATE TABLE IF NOT EXISTS shopify_orders (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  shop_id VARCHAR(255) DEFAULT NULL,
  shopify_order_id VARCHAR(100) NOT NULL,
  shopify_order_number VARCHAR(100) DEFAULT NULL,
  order_status VARCHAR(50) DEFAULT 'unfulfilled',
  customer_name VARCHAR(255) DEFAULT NULL,
  shipping_address1 VARCHAR(255) DEFAULT NULL,
  shipping_address2 VARCHAR(255) DEFAULT NULL,
  shipping_city VARCHAR(100) DEFAULT NULL,
  shipping_state VARCHAR(50) DEFAULT NULL,
  shipping_zip VARCHAR(20) DEFAULT NULL,
  shipping_country VARCHAR(10) DEFAULT 'US',
  shipping_phone VARCHAR(50) DEFAULT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  order_data JSON DEFAULT NULL,
  shopify_created_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shopify_order (shopify_order_id),
  KEY idx_shopify_orders_user (user_id),
  KEY idx_shopify_orders_status (order_status),
  KEY idx_shopify_orders_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order line items
CREATE TABLE IF NOT EXISTS shopify_order_items (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  shopify_order_id BIGINT UNSIGNED NOT NULL,
  shopify_line_item_id VARCHAR(100) DEFAULT NULL,
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
  KEY idx_shopify_oi_order (shopify_order_id),
  KEY idx_shopify_oi_product (product_id),
  KEY idx_shopify_oi_sku (sku),
  KEY idx_shopify_oi_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sync logs
CREATE TABLE IF NOT EXISTS shopify_sync_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT UNSIGNED DEFAULT NULL,
  sync_type VARCHAR(50) DEFAULT NULL,
  operation VARCHAR(50) DEFAULT NULL,
  reference_id VARCHAR(100) DEFAULT NULL,
  status VARCHAR(20) DEFAULT NULL,
  message TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_shopify_logs_user (user_id),
  KEY idx_shopify_logs_type (sync_type),
  KEY idx_shopify_logs_status (status),
  KEY idx_shopify_logs_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
