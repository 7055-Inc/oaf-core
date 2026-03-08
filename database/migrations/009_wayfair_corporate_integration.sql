-- Migration 009: Wayfair Corporate Integration
-- Adds Wayfair corporate product listings following Walmart pattern
-- Created: 2026-02-08

-- Wayfair Corporate Products Table
CREATE TABLE IF NOT EXISTS wayfair_corporate_products (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  
  -- Wayfair identifiers
  wayfair_sku VARCHAR(100) NULL COMMENT 'Wayfair supplier SKU',
  wayfair_part_number VARCHAR(100) NULL COMMENT 'Wayfair part number',
  
  -- Corporate listing data
  wayfair_title VARCHAR(255) NULL,
  wayfair_description TEXT NULL,
  wayfair_short_description VARCHAR(1000) NULL,
  wayfair_key_features JSON NULL COMMENT 'Array of product features',
  wayfair_price DECIMAL(10,2) NULL,
  
  -- Images
  wayfair_main_image_url VARCHAR(500) NULL,
  wayfair_additional_images JSON NULL COMMENT 'Array of additional image URLs',
  
  -- Product attributes
  wayfair_category VARCHAR(255) NULL,
  wayfair_brand VARCHAR(100) NULL,
  wayfair_color VARCHAR(100) NULL,
  wayfair_material VARCHAR(100) NULL,
  wayfair_dimensions JSON NULL COMMENT 'Width, height, depth, weight',
  
  -- Shipping info
  wayfair_shipping_weight DECIMAL(8,2) NULL COMMENT 'Weight in lbs',
  wayfair_shipping_length DECIMAL(8,2) NULL COMMENT 'Length in inches',
  wayfair_shipping_width DECIMAL(8,2) NULL COMMENT 'Width in inches',
  wayfair_shipping_height DECIMAL(8,2) NULL COMMENT 'Height in inches',
  
  -- Status tracking
  is_active TINYINT(1) DEFAULT 1,
  listing_status ENUM('pending', 'listed', 'paused', 'removing', 'removed', 'rejected') DEFAULT 'pending',
  sync_status ENUM('pending', 'syncing', 'synced', 'failed') DEFAULT 'pending',
  last_sync_at DATETIME NULL,
  last_sync_error TEXT NULL,
  
  -- Admin approval
  terms_accepted_at DATETIME NULL,
  rejection_reason TEXT NULL,
  removed_at DATETIME NULL,
  cooldown_ends_at DATETIME NULL COMMENT '60-day cooldown after removal',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  created_by BIGINT NULL COMMENT 'User ID who created listing',
  
  -- Constraints
  UNIQUE KEY unique_product_user (product_id, user_id),
  FOREIGN KEY fk_wayfair_product (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY fk_wayfair_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_wayfair_user_id (user_id),
  INDEX idx_wayfair_listing_status (listing_status),
  INDEX idx_wayfair_sync_status (sync_status),
  INDEX idx_wayfair_created_by (created_by),
  INDEX idx_wayfair_cooldown (cooldown_ends_at),
  INDEX idx_wayfair_sku (wayfair_sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Wayfair corporate product listings - Admin approval workflow for Brakebee Wayfair Supplier account';

-- Wayfair Inventory Allocations Table
CREATE TABLE IF NOT EXISTS wayfair_inventory_allocations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  product_id BIGINT NOT NULL,
  allocated_quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_user_product (user_id, product_id),
  FOREIGN KEY fk_wayfair_inv_user (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY fk_wayfair_inv_product (product_id) REFERENCES products(id) ON DELETE CASCADE,
  
  INDEX idx_wayfair_inv_user (user_id),
  INDEX idx_wayfair_inv_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Wayfair inventory allocations (corporate listings sync all inventory automatically)';

-- Wayfair Orders Table
CREATE TABLE IF NOT EXISTS wayfair_orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  wayfair_po_number VARCHAR(100) NOT NULL UNIQUE COMMENT 'Wayfair purchase order number',
  wayfair_po_date DATETIME NULL,
  user_id BIGINT NULL COMMENT 'Vendor who supplied the products',
  
  -- Order details
  customer_name VARCHAR(255) NULL,
  customer_address_1 VARCHAR(255) NULL,
  customer_address_2 VARCHAR(255) NULL,
  customer_city VARCHAR(100) NULL,
  customer_state VARCHAR(50) NULL,
  customer_zip VARCHAR(20) NULL,
  customer_country VARCHAR(50) NULL,
  customer_phone VARCHAR(50) NULL,
  
  -- Order status
  order_status ENUM('pending', 'accepted', 'shipped', 'delivered', 'cancelled', 'returned') DEFAULT 'pending',
  ship_by_date DATE NULL,
  delivery_by_date DATE NULL,
  
  -- Tracking
  tracking_number VARCHAR(100) NULL,
  carrier VARCHAR(100) NULL,
  shipped_at DATETIME NULL,
  
  -- Totals
  subtotal DECIMAL(10,2) NULL,
  shipping_cost DECIMAL(10,2) NULL,
  tax DECIMAL(10,2) NULL,
  total DECIMAL(10,2) NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY fk_wayfair_order_user (user_id) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_wayfair_order_user (user_id),
  INDEX idx_wayfair_order_status (order_status),
  INDEX idx_wayfair_po_date (wayfair_po_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Wayfair purchase orders';

-- Wayfair Order Items Table
CREATE TABLE IF NOT EXISTS wayfair_order_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  order_id BIGINT NOT NULL,
  product_id BIGINT NULL,
  
  -- Item details
  wayfair_sku VARCHAR(100) NULL,
  wayfair_part_number VARCHAR(100) NULL,
  product_name VARCHAR(255) NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NULL,
  total_price DECIMAL(10,2) NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY fk_wayfair_item_order (order_id) REFERENCES wayfair_orders(id) ON DELETE CASCADE,
  FOREIGN KEY fk_wayfair_item_product (product_id) REFERENCES products(id) ON DELETE SET NULL,
  
  INDEX idx_wayfair_item_order (order_id),
  INDEX idx_wayfair_item_product (product_id),
  INDEX idx_wayfair_item_sku (wayfair_sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Line items for Wayfair orders';

-- Wayfair Sync Logs Table
CREATE TABLE IF NOT EXISTS wayfair_sync_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id BIGINT NULL,
  sync_type ENUM('product', 'inventory', 'order', 'shipment') NOT NULL,
  operation VARCHAR(50) NULL COMMENT 'create, update, delete, fetch',
  reference_id BIGINT NULL COMMENT 'Product ID or Order ID',
  status ENUM('success', 'failed', 'warning') NOT NULL,
  message TEXT NULL,
  error_details TEXT NULL,
  duration_ms INT NULL,
  request_id VARCHAR(100) NULL COMMENT 'Wayfair API request ID',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY fk_wayfair_log_user (user_id) REFERENCES users(id) ON DELETE SET NULL,
  
  INDEX idx_wayfair_log_user (user_id),
  INDEX idx_wayfair_log_type (sync_type),
  INDEX idx_wayfair_log_status (status),
  INDEX idx_wayfair_log_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Wayfair API sync activity logs';

-- Wayfair Categories Table (if needed for future category mapping)
CREATE TABLE IF NOT EXISTS wayfair_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id VARCHAR(100) NOT NULL UNIQUE,
  category_name VARCHAR(255) NOT NULL,
  parent_id VARCHAR(100) NULL,
  category_path TEXT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_wayfair_cat_parent (parent_id),
  INDEX idx_wayfair_cat_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Wayfair category taxonomy';

-- Verification query
SELECT 'Wayfair corporate integration tables created successfully' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'wordpress_import' AND table_name LIKE 'wayfair_%') as tables_created;
