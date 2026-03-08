-- Migration 010: Etsy OAuth Integration
-- OAuth-only integration (no corporate catalog)
-- Follows TikTok OAuth pattern for user shop connections
-- Created: 2026-02-08

-- Etsy User Shops Table (OAuth Connections)
CREATE TABLE IF NOT EXISTS etsy_user_shops (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  shop_id VARCHAR(100) NOT NULL COMMENT 'Etsy shop ID',
  shop_name VARCHAR(255) NULL,
  shop_url VARCHAR(500) NULL,
  
  -- OAuth tokens
  access_token TEXT NULL,
  refresh_token TEXT NULL,
  token_expires_at DATETIME NULL,
  token_refresh_count INT DEFAULT 0,
  last_token_refresh_at DATETIME NULL,
  
  -- Shop status
  is_active TINYINT(1) DEFAULT 1,
  terms_accepted TINYINT(1) DEFAULT 0,
  
  -- Sync tracking
  last_products_sync_at DATETIME NULL,
  last_orders_sync_at DATETIME NULL,
  last_inventory_sync_at DATETIME NULL,
  last_sync_at DATETIME NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_user_shop (user_id, shop_id),
  FOREIGN KEY fk_etsy_shop_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_etsy_shop_user (user_id),
  INDEX idx_etsy_shop_id (shop_id),
  INDEX idx_etsy_shop_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Etsy OAuth shop connections - User personal shops';

-- Etsy Product Data Table (Listings)
CREATE TABLE IF NOT EXISTS etsy_product_data (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  shop_id VARCHAR(100) NOT NULL COMMENT 'Etsy shop ID',
  
  -- Etsy identifiers
  etsy_listing_id VARCHAR(100) NULL UNIQUE COMMENT 'Etsy listing ID',
  
  -- Listing data
  etsy_title VARCHAR(255) NULL,
  etsy_description TEXT NULL,
  etsy_price DECIMAL(10,2) NULL,
  etsy_quantity INT NULL,
  etsy_sku VARCHAR(100) NULL,
  
  -- Listing attributes
  etsy_tags JSON NULL COMMENT 'Array of tags',
  etsy_materials JSON NULL COMMENT 'Array of materials',
  etsy_category_id VARCHAR(100) NULL,
  etsy_taxonomy_id VARCHAR(100) NULL,
  
  -- Images
  etsy_images JSON NULL COMMENT 'Array of image URLs',
  
  -- Shipping
  etsy_shipping_profile_id VARCHAR(100) NULL,
  
  -- Status
  is_active TINYINT(1) DEFAULT 1,
  listing_state ENUM('active', 'inactive', 'draft', 'sold_out', 'expired') DEFAULT 'draft',
  sync_status ENUM('pending', 'syncing', 'synced', 'failed') DEFAULT 'pending',
  last_sync_at DATETIME NULL,
  last_sync_error TEXT NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_user_product (user_id, product_id),
  FOREIGN KEY fk_etsy_product_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY fk_etsy_product (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY fk_etsy_product_shop (shop_id) REFERENCES etsy_user_shops(shop_id) ON DELETE CASCADE,
  
  INDEX idx_etsy_product_user (user_id),
  INDEX idx_etsy_product_id (product_id),
  INDEX idx_etsy_product_shop (shop_id),
  INDEX idx_etsy_listing_id (etsy_listing_id),
  INDEX idx_etsy_sync_status (sync_status),
  INDEX idx_etsy_listing_state (listing_state)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Etsy product listings - User shop products';

-- Etsy Inventory Allocations Table
CREATE TABLE IF NOT EXISTS etsy_inventory_allocations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  shop_id VARCHAR(100) NOT NULL,
  allocated_quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_user_product_shop (user_id, product_id, shop_id),
  FOREIGN KEY fk_etsy_inv_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY fk_etsy_inv_product (product_id) REFERENCES products(id) ON DELETE CASCADE,
  
  INDEX idx_etsy_inv_user (user_id),
  INDEX idx_etsy_inv_product (product_id),
  INDEX idx_etsy_inv_shop (shop_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Etsy inventory allocations per shop';

-- Etsy Orders Table
CREATE TABLE IF NOT EXISTS etsy_orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  shop_id VARCHAR(100) NOT NULL,
  etsy_receipt_id VARCHAR(100) NOT NULL UNIQUE COMMENT 'Etsy receipt/order ID',
  
  -- Order details
  buyer_user_id VARCHAR(100) NULL,
  buyer_email VARCHAR(255) NULL,
  
  -- Shipping address
  ship_name VARCHAR(255) NULL,
  ship_address_1 VARCHAR(255) NULL,
  ship_address_2 VARCHAR(255) NULL,
  ship_city VARCHAR(100) NULL,
  ship_state VARCHAR(50) NULL,
  ship_zip VARCHAR(20) NULL,
  ship_country VARCHAR(50) NULL,
  
  -- Order status
  order_status ENUM('pending', 'paid', 'shipped', 'completed', 'cancelled') DEFAULT 'pending',
  payment_status VARCHAR(50) NULL,
  
  -- Amounts
  subtotal DECIMAL(10,2) NULL,
  shipping_cost DECIMAL(10,2) NULL,
  tax DECIMAL(10,2) NULL,
  total DECIMAL(10,2) NULL,
  
  -- Dates
  order_date DATETIME NULL,
  shipped_date DATETIME NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY fk_etsy_order_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_etsy_order_user (user_id),
  INDEX idx_etsy_order_shop (shop_id),
  INDEX idx_etsy_order_status (order_status),
  INDEX idx_etsy_order_date (order_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Etsy orders/receipts';

-- Etsy Order Items Table
CREATE TABLE IF NOT EXISTS etsy_order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  product_id BIGINT NULL,
  etsy_transaction_id VARCHAR(100) NULL COMMENT 'Etsy transaction ID',
  etsy_listing_id VARCHAR(100) NULL,
  
  -- Item details
  product_name VARCHAR(255) NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NULL,
  total_price DECIMAL(10,2) NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY fk_etsy_item_order (order_id) REFERENCES etsy_orders(id) ON DELETE CASCADE,
  FOREIGN KEY fk_etsy_item_product (product_id) REFERENCES products(id) ON DELETE SET NULL,
  
  INDEX idx_etsy_item_order (order_id),
  INDEX idx_etsy_item_product (product_id),
  INDEX idx_etsy_transaction_id (etsy_transaction_id),
  INDEX idx_etsy_item_listing (etsy_listing_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Line items for Etsy orders';

-- Etsy Sync Logs Table
CREATE TABLE IF NOT EXISTS etsy_sync_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NULL,
  shop_id VARCHAR(100) NULL,
  sync_type ENUM('product', 'inventory', 'order', 'shop') NOT NULL,
  operation VARCHAR(50) NULL COMMENT 'create, update, delete, fetch',
  reference_id VARCHAR(100) NULL COMMENT 'Product ID, Order ID, or Listing ID',
  status ENUM('success', 'failed', 'warning') NOT NULL,
  message TEXT NULL,
  error_details TEXT NULL,
  duration_ms INT NULL,
  request_id VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY fk_etsy_log_user (user_id) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_etsy_log_user (user_id),
  INDEX idx_etsy_log_shop (shop_id),
  INDEX idx_etsy_log_type (sync_type),
  INDEX idx_etsy_log_status (status),
  INDEX idx_etsy_log_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Etsy API sync activity logs';

-- Verification query
SELECT 'Etsy OAuth integration tables created successfully' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'wordpress_import' AND table_name LIKE 'etsy_%') as tables_created;
