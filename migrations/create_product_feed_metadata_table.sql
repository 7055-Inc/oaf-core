-- Migration: Create product_feed_metadata table for Google Merchant Center and other feed integrations
-- Date: 2025-11-23
-- Purpose: Store third-party feed metadata separately from core products table

CREATE TABLE IF NOT EXISTS product_feed_metadata (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT NOT NULL,
  
  -- Google Merchant Center Fields
  `condition` ENUM('new', 'used', 'refurbished') DEFAULT 'new' COMMENT 'Product condition',
  mpn VARCHAR(70) DEFAULT NULL COMMENT 'Manufacturer Part Number',
  gtin VARCHAR(50) DEFAULT NULL COMMENT 'Global Trade Item Number (UPC/EAN/ISBN)',
  identifier_exists ENUM('yes', 'no') DEFAULT 'no' COMMENT 'Whether product has gtin/mpn',
  google_product_category VARCHAR(255) DEFAULT NULL COMMENT 'Google product taxonomy ID',
  product_type VARCHAR(750) DEFAULT NULL COMMENT 'Custom product categorization',
  item_group_id VARCHAR(50) DEFAULT NULL COMMENT 'For variants - groups related products',
  
  -- Custom Labels (for campaign segmentation in Google Ads)
  custom_label_0 VARCHAR(100) DEFAULT NULL COMMENT 'Custom label for campaign targeting',
  custom_label_1 VARCHAR(100) DEFAULT NULL COMMENT 'Custom label for campaign targeting',
  custom_label_2 VARCHAR(100) DEFAULT NULL COMMENT 'Custom label for campaign targeting',
  custom_label_3 VARCHAR(100) DEFAULT NULL COMMENT 'Custom label for campaign targeting',
  custom_label_4 VARCHAR(100) DEFAULT NULL COMMENT 'Custom label for campaign targeting',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_product_feed (product_id),
  KEY idx_condition (`condition`),
  KEY idx_identifier_exists (identifier_exists),
  KEY idx_item_group (item_group_id),
  
  CONSTRAINT fk_pfm_product_id FOREIGN KEY (product_id) 
    REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci 
COMMENT='Third-party feed metadata for products (Google Merchant, Facebook, etc)';

-- Create default entries for all existing active products
INSERT INTO product_feed_metadata (product_id, `condition`, identifier_exists)
SELECT id, 'new', 'no'
FROM products 
WHERE status = 'active'
ON DUPLICATE KEY UPDATE product_id = product_id;

-- For products with variants, set item_group_id to parent_id
UPDATE product_feed_metadata pfm
INNER JOIN products p ON pfm.product_id = p.id
SET pfm.item_group_id = p.parent_id
WHERE p.parent_id IS NOT NULL 
  AND p.product_type = 'variant';

