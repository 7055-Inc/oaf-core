-- Add missing fields to existing products table
ALTER TABLE products 
ADD COLUMN is_parent BOOLEAN DEFAULT TRUE,
ADD COLUMN parent_id INT DEFAULT NULL,
ADD COLUMN variant_options JSON,
ADD INDEX idx_parent_products (parent_id),
ADD INDEX idx_brand (brand),
ADD INDEX idx_category (main_category);

-- Add foreign key for parent-child relationship
ALTER TABLE products 
ADD FOREIGN KEY (parent_id) REFERENCES products(id) ON DELETE CASCADE;

-- Create product variants metrics table
CREATE TABLE IF NOT EXISTS product_variant_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    metric_name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX (user_id),
    INDEX (product_id),
    UNIQUE KEY unique_product_metric (product_id, metric_name)
);

-- Create product variant options table
CREATE TABLE IF NOT EXISTS product_variant_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metric_id INT NOT NULL,
    option_value VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (metric_id) REFERENCES product_variant_metrics(id) ON DELETE CASCADE,
    INDEX (metric_id),
    UNIQUE KEY unique_metric_option (metric_id, option_value)
);

-- Create custom fields table for dynamic fields
CREATE TABLE IF NOT EXISTS product_custom_fields (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    field_value TEXT,
    field_type ENUM('text', 'number', 'boolean', 'date') DEFAULT 'text',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX (user_id),
    INDEX (product_id),
    INDEX (field_name)
);
