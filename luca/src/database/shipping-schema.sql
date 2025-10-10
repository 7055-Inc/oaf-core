-- Shipping Material Groups (like categories)
CREATE TABLE IF NOT EXISTS shipping_material_groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (user_id),
    UNIQUE KEY unique_user_group (user_id, name)
);

-- Packing Materials
CREATE TABLE IF NOT EXISTS packing_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    group_id INT NOT NULL,
    name VARCHAR(150) NOT NULL,
    measure_unit VARCHAR(20) NOT NULL,
    purchase_unit_qty DECIMAL(10,3) NOT NULL,
    purchase_bundle_price DECIMAL(10,2) NOT NULL,
    cost_per_unit DECIMAL(10,4) AS (purchase_bundle_price / purchase_unit_qty) STORED,
    notes TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES shipping_material_groups(id) ON DELETE RESTRICT,
    INDEX (user_id),
    INDEX (group_id)
);

-- Product Shipping Packages
CREATE TABLE IF NOT EXISTS product_shipping_packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    product_id INT NOT NULL,
    package_number INT NOT NULL,
    length DECIMAL(8,2),
    width DECIMAL(8,2),
    height DECIMAL(8,2),
    dimension_unit ENUM('in', 'ft', 'cm', 'm') DEFAULT 'in',
    weight DECIMAL(8,2),
    weight_unit ENUM('oz', 'lb', 'g', 'kg') DEFAULT 'lb',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX (user_id),
    INDEX (product_id),
    UNIQUE KEY unique_product_package (product_id, package_number)
);

-- Package Materials (what materials are used in each package)
CREATE TABLE IF NOT EXISTS package_materials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    package_id INT NOT NULL,
    material_id INT NOT NULL,
    quantity DECIMAL(10,3) NOT NULL,
    cost_per_unit DECIMAL(10,4) NOT NULL,
    line_cost DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (package_id) REFERENCES product_shipping_packages(id) ON DELETE CASCADE,
    FOREIGN KEY (material_id) REFERENCES packing_materials(id) ON DELETE RESTRICT,
    INDEX (package_id),
    INDEX (material_id)
);
