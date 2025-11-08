-- ============================================
-- Import Product Inventory from WordPress
-- ============================================
-- This script imports stock quantities from WordPress wp_postmeta
-- into Brakebee's product_inventory table
-- 
-- Idempotent: Safe to run multiple times
-- ============================================

USE oaf;

START TRANSACTION;

-- Step 1: Import inventory for products with stock quantities
-- Only insert if product_inventory record doesn't already exist
INSERT INTO product_inventory (
    product_id,
    qty_on_hand,
    qty_on_order,
    reorder_qty,
    updated_by
)
SELECT 
    p.id as product_id,
    FLOOR(CAST(COALESCE(pm_stock.meta_value, 0) AS DECIMAL(10,6))) as qty_on_hand,
    0 as qty_on_order,
    0 as reorder_qty,
    p.vendor_id as updated_by
FROM oaf.products p
JOIN wordpress_import.wp_postmeta pm_stock 
    ON p.wp_id = pm_stock.post_id 
    AND pm_stock.meta_key COLLATE utf8mb4_unicode_520_ci = '_stock'
WHERE p.wp_id IS NOT NULL
    AND p.track_inventory = 1
    AND pm_stock.meta_value IS NOT NULL
    AND pm_stock.meta_value != ''
    AND pm_stock.meta_value REGEXP '^[0-9]+(\\.[0-9]+)?$'  -- Allow decimals
    AND NOT EXISTS (
        SELECT 1 
        FROM product_inventory pi 
        WHERE pi.product_id = p.id
    );

COMMIT;

-- ============================================
-- Verification Queries
-- ============================================

SELECT '========================================' as info;
SELECT 'INVENTORY IMPORT VERIFICATION' as info;
SELECT '========================================' as info;

-- Total inventory records
SELECT COUNT(*) as total_inventory_records 
FROM product_inventory;

-- Inventory by stock level
SELECT 
    CASE 
        WHEN qty_on_hand = 0 THEN 'Out of Stock'
        WHEN qty_on_hand BETWEEN 1 AND 5 THEN 'Low Stock (1-5)'
        WHEN qty_on_hand BETWEEN 6 AND 10 THEN 'Medium Stock (6-10)'
        ELSE 'High Stock (10+)'
    END as stock_level,
    COUNT(*) as product_count,
    SUM(qty_on_hand) as total_units
FROM product_inventory
GROUP BY stock_level
ORDER BY 
    CASE stock_level
        WHEN 'Out of Stock' THEN 1
        WHEN 'Low Stock (1-5)' THEN 2
        WHEN 'Medium Stock (6-10)' THEN 3
        ELSE 4
    END;

-- Sample inventory records
SELECT 
    p.name,
    p.sku,
    pi.qty_on_hand,
    pi.qty_available,
    CASE 
        WHEN p.parent_id IS NULL THEN 'Parent'
        ELSE 'Variation'
    END as product_type
FROM product_inventory pi
JOIN products p ON pi.product_id = p.id
WHERE p.wp_id IS NOT NULL
ORDER BY pi.qty_on_hand DESC
LIMIT 10;

-- Products with track_inventory but no inventory record
SELECT COUNT(*) as products_missing_inventory
FROM products p
WHERE p.track_inventory = 1
    AND p.wp_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 
        FROM product_inventory pi 
        WHERE pi.product_id = p.id
    );
