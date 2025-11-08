-- ============================================================
-- Verify Product Data Integrity
-- Checks variations, photos, and inventory alignment
-- ============================================================

-- 1. VARIATION DATA
SELECT '=== VARIATION DATA ===' as '';

SELECT 
    COUNT(DISTINCT uvt.id) as variation_types,
    COUNT(DISTINCT uvv.id) as variation_values,
    COUNT(DISTINCT pv.id) as product_variation_links
FROM oaf.user_variation_types uvt
LEFT JOIN oaf.user_variation_values uvv ON uvt.id = uvv.variation_type_id
LEFT JOIN oaf.product_variations pv ON uvt.id = pv.variation_type_id;

-- 2. PARENT/CHILD PRODUCT COUNTS
SELECT '=== PRODUCTS ===' as '';

SELECT 
    COUNT(*) as total_products,
    SUM(CASE WHEN parent_id IS NULL THEN 1 ELSE 0 END) as parent_products,
    SUM(CASE WHEN parent_id IS NOT NULL THEN 1 ELSE 0 END) as child_products
FROM oaf.products
WHERE wp_id IS NOT NULL;

-- 3. CHILDREN WITH VARIATIONS
SELECT '=== CHILDREN WITH VARIATIONS ===' as '';

SELECT 
    COUNT(DISTINCT p.id) as total_children,
    COUNT(DISTINCT pv.product_id) as children_with_variations,
    COUNT(DISTINCT p.id) - COUNT(DISTINCT pv.product_id) as children_missing_variations
FROM oaf.products p
LEFT JOIN oaf.product_variations pv ON p.id = pv.product_id
WHERE p.parent_id IS NOT NULL AND p.wp_id IS NOT NULL;

-- 4. CHILDREN WITH IMAGES
SELECT '=== CHILDREN WITH IMAGES ===' as '';

SELECT 
    COUNT(DISTINCT p.id) as total_children,
    COUNT(DISTINCT pi.product_id) as children_with_images,
    COUNT(DISTINCT p.id) - COUNT(DISTINCT pi.product_id) as children_missing_images
FROM oaf.products p
LEFT JOIN oaf.product_images pi ON p.id = pi.product_id
WHERE p.parent_id IS NOT NULL AND p.wp_id IS NOT NULL;

-- 5. CHILDREN WITH INVENTORY
SELECT '=== CHILDREN WITH INVENTORY ===' as '';

SELECT 
    COUNT(DISTINCT p.id) as total_children,
    COUNT(DISTINCT inv.product_id) as children_with_inventory,
    COUNT(DISTINCT p.id) - COUNT(DISTINCT inv.product_id) as children_missing_inventory
FROM oaf.products p
LEFT JOIN oaf.product_inventory inv ON p.id = inv.product_id
WHERE p.parent_id IS NOT NULL 
  AND p.wp_id IS NOT NULL 
  AND p.track_inventory = 1;

-- 6. SAMPLE PARENT WITH FULL DATA
SELECT '=== SAMPLE: SIDEWAVE METAL DECOR ===' as '';

SELECT 
    p.id,
    p.name,
    p.product_type,
    COUNT(DISTINCT c.id) as children_count,
    COUNT(DISTINCT pi.id) as images_count,
    COUNT(DISTINCT uvt.id) as variation_types_count
FROM oaf.products p
LEFT JOIN oaf.products c ON c.parent_id = p.id
LEFT JOIN oaf.product_images pi ON p.id = pi.product_id
LEFT JOIN oaf.user_variation_values uvv ON uvv.product_id = p.id
LEFT JOIN oaf.user_variation_types uvt ON uvv.variation_type_id = uvt.id
WHERE p.name LIKE '%Sidewave%'
  AND p.parent_id IS NULL
GROUP BY p.id, p.name, p.product_type;

-- 7. SAMPLE CHILDREN FOR SIDEWAVE
SELECT '=== SAMPLE: SIDEWAVE CHILDREN ===' as '';

SELECT 
    c.id,
    c.name,
    COUNT(DISTINCT pv.id) as variation_links,
    COUNT(DISTINCT pi.id) as images,
    COALESCE(inv.qty_on_hand, 0) as stock
FROM oaf.products c
LEFT JOIN oaf.product_variations pv ON c.id = pv.product_id
LEFT JOIN oaf.product_images pi ON c.id = pi.product_id
LEFT JOIN oaf.product_inventory inv ON c.id = inv.product_id
WHERE c.parent_id = (SELECT id FROM oaf.products WHERE name LIKE '%Sidewave%' AND parent_id IS NULL LIMIT 1)
GROUP BY c.id, c.name, inv.qty_on_hand
LIMIT 10;

SELECT '=== VERIFICATION COMPLETE ===' as '';

