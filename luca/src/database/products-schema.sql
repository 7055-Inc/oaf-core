-- Products and Product Materials Tables

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    sku VARCHAR(50),
    batch_quantity INT NOT NULL DEFAULT 1,
    total_batch_cost DECIMAL(10,2) DEFAULT 0.00,
    cost_per_item DECIMAL(10,4) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_user_products (user_id),
    INDEX idx_product_sku (user_id, sku),
    
    -- Unique SKU per user (if provided)
    UNIQUE KEY unique_user_sku (user_id, sku)
);

-- Product Materials Junction Table
CREATE TABLE IF NOT EXISTS product_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    material_id INT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    cost_per_unit DECIMAL(10,4) NOT NULL,
    line_cost DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES materials(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_product_materials (product_id),
    INDEX idx_material_products (material_id)
);
