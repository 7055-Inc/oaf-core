-- Luca Platform Database Schema
-- Multi-tenant costing system with user isolation

-- Material Categories Table
CREATE TABLE IF NOT EXISTS material_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_user_categories (user_id),
    INDEX idx_category_name (user_id, name),
    
    -- Ensure unique category names per user
    UNIQUE KEY unique_user_category (user_id, name)
);

-- Materials Table
CREATE TABLE IF NOT EXISTS materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    measure_unit VARCHAR(20) NOT NULL, -- oz, lb, hour, piece, etc.
    purchase_unit_qty DECIMAL(10,3) NOT NULL, -- 12 (for 12 oz can)
    purchase_bundle_price DECIMAL(10,2) NOT NULL, -- 4.95 (price for the bundle)
    cost_per_unit DECIMAL(10,4) GENERATED ALWAYS AS (purchase_bundle_price / purchase_unit_qty) STORED,
    notes TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key to categories
    FOREIGN KEY (category_id) REFERENCES material_categories(id) ON DELETE RESTRICT,
    
    -- Indexes for performance
    INDEX idx_user_materials (user_id),
    INDEX idx_category_materials (category_id),
    INDEX idx_material_name (user_id, name),
    INDEX idx_cost_lookup (user_id, active),
    
    -- Ensure unique material names per user
    UNIQUE KEY unique_user_material (user_id, name)
);

-- Insert default categories for new users (will be handled by application logic)
-- This is just for reference of common categories
/*
Common categories:
- Paint & Finishes
- Hardware & Fasteners  
- Fabric & Textiles
- Labor
- Packaging & Shipping
- Tools & Equipment
- Raw Materials
*/
