-- Product Collections Table
CREATE TABLE IF NOT EXISTS product_collections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_user_collections (user_id),
    INDEX idx_collection_name (user_id, name),
    
    -- Ensure unique collection names per user
    UNIQUE KEY unique_user_collection (user_id, name)
);

-- Add collection_id to products table
ALTER TABLE products 
ADD COLUMN collection_id INT DEFAULT NULL,
ADD INDEX idx_product_collection (collection_id),
ADD FOREIGN KEY (collection_id) REFERENCES product_collections(id) ON DELETE SET NULL;
