-- Migration Script: Import Product Shipping Data from WordPress
-- Source: wordpress_import database (wp_postmeta)
-- Target: oaf.product_shipping table
-- Date: 2025-12-21
-- Purpose: Import shipping method, rates, dimensions, and services from WordPress

START TRANSACTION;

-- Insert shipping data for all products that have WordPress origins
INSERT INTO oaf.product_shipping (
    product_id,
    package_number,
    length,
    width,
    height,
    weight,
    dimension_unit,
    weight_unit,
    ship_method,
    ship_rate,
    shipping_type,
    shipping_services
)
SELECT 
    p.id as product_id,
    1 as package_number,
    -- Use product dimensions (depth = length for shipping)
    p.depth as length,
    p.width as width,
    p.height as height,
    p.weight as weight,
    COALESCE(p.dimension_unit, 'in') as dimension_unit,
    COALESCE(p.weight_unit, 'lbs') as weight_unit,
    -- Map mpl_shipping to ship_method enum
    CASE 
        WHEN MAX(pm_shipping.meta_value) = 'free' THEN 'free'
        WHEN MAX(pm_shipping.meta_value) = 'flat' THEN 'flat_rate'
        WHEN MAX(pm_shipping.meta_value) = 'calculated' THEN 'calculated'
        ELSE 'free'
    END as ship_method,
    -- Flat rate price (only relevant for flat_rate)
    CASE 
        WHEN MAX(pm_price.meta_value) IS NOT NULL 
             AND MAX(pm_price.meta_value) != '' 
             AND MAX(pm_price.meta_value) REGEXP '^[0-9.]+$'
        THEN CAST(MAX(pm_price.meta_value) AS DECIMAL(10,2))
        ELSE NULL
    END as ship_rate,
    -- shipping_type mirrors ship_method for compatibility
    CASE 
        WHEN MAX(pm_shipping.meta_value) = 'free' THEN 'free'
        WHEN MAX(pm_shipping.meta_value) = 'calculated' THEN 'calculated'
        ELSE 'free'
    END as shipping_type,
    -- Shipping services (serialized PHP array - store as-is for now)
    MAX(pm_services.meta_value) as shipping_services
FROM oaf.products p
JOIN wordpress_import.wp_posts wp ON p.wp_id = wp.ID
LEFT JOIN wordpress_import.wp_postmeta pm_shipping ON wp.ID = pm_shipping.post_id 
    AND pm_shipping.meta_key = 'mpl_shipping'
LEFT JOIN wordpress_import.wp_postmeta pm_price ON wp.ID = pm_price.post_id 
    AND pm_price.meta_key = 'mpl_shipping_price'
LEFT JOIN wordpress_import.wp_postmeta pm_services ON wp.ID = pm_services.post_id 
    AND pm_services.meta_key = 'mpl_shipping_services'
WHERE p.wp_id IS NOT NULL
AND p.id NOT IN (SELECT product_id FROM oaf.product_shipping)
GROUP BY p.id, p.depth, p.width, p.height, p.weight, p.dimension_unit, p.weight_unit;

COMMIT;

-- Verification
SELECT '=== PRODUCT SHIPPING IMPORT COMPLETE ===' as status;

SELECT 'Shipping records imported:' as info;
SELECT COUNT(*) as total_records FROM oaf.product_shipping;

SELECT 'Shipping method breakdown:' as info;
SELECT 
    ship_method, 
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM oaf.product_shipping), 1) as percentage
FROM oaf.product_shipping 
GROUP BY ship_method
ORDER BY count DESC;

SELECT 'Records with dimensions:' as info;
SELECT 
    SUM(CASE WHEN length IS NOT NULL THEN 1 ELSE 0 END) as has_length,
    SUM(CASE WHEN width IS NOT NULL THEN 1 ELSE 0 END) as has_width,
    SUM(CASE WHEN height IS NOT NULL THEN 1 ELSE 0 END) as has_height,
    SUM(CASE WHEN weight IS NOT NULL THEN 1 ELSE 0 END) as has_weight
FROM oaf.product_shipping;

SELECT 'Flat rate shipping prices:' as info;
SELECT 
    ship_rate,
    COUNT(*) as count
FROM oaf.product_shipping 
WHERE ship_method = 'flat_rate' AND ship_rate IS NOT NULL
GROUP BY ship_rate
ORDER BY count DESC
LIMIT 10;

SELECT 'Sample records:' as info;
SELECT 
    ps.product_id,
    p.name,
    ps.ship_method,
    ps.ship_rate,
    ps.length,
    ps.width,
    ps.height,
    ps.weight
FROM oaf.product_shipping ps
JOIN oaf.products p ON ps.product_id = p.id
LIMIT 10;

