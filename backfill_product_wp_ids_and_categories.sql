-- Backfill wp_id for existing products and assign categories
-- This script updates products that were imported before wp_id column was added

START TRANSACTION;

-- Step 1: Backfill wp_id for products based on their SKU pattern
-- Extract the WordPress ID from the SKU (format: "PRODUCTNAME-2222" where 2222 is the WordPress post ID)
UPDATE oaf.products pr
JOIN oaf.users u ON pr.created_by = u.id
JOIN wordpress_import.wp_posts wp ON wp.post_author = u.wp_id
SET pr.wp_id = wp.ID
WHERE pr.wp_id IS NULL
AND u.wp_id IS NOT NULL
AND wp.post_type = 'product'
AND CAST(SUBSTRING_INDEX(pr.sku, '-', -1) AS UNSIGNED) = wp.ID;

-- Step 2: Assign products to their WordPress categories
INSERT INTO oaf.product_categories (
    product_id,
    category_id
)
SELECT DISTINCT
    pr.id as product_id,
    oc.id as category_id
FROM oaf.products pr
JOIN wordpress_import.wp_posts wp ON pr.wp_id = wp.ID
JOIN wordpress_import.wp_term_relationships wtr ON wp.ID = wtr.object_id
JOIN wordpress_import.wp_term_taxonomy wtt ON wtr.term_taxonomy_id = wtt.term_taxonomy_id
JOIN oaf.categories oc ON oc.wp_term_id = wtt.term_id
WHERE pr.wp_id IS NOT NULL
AND wtt.taxonomy = 'product_cat'
AND NOT EXISTS (
    SELECT 1 FROM oaf.product_categories pc 
    WHERE pc.product_id = pr.id 
    AND pc.category_id = oc.id
);

COMMIT;

-- Verification
SELECT 'Products with wp_id:' as metric, COUNT(*) as count
FROM oaf.products WHERE wp_id IS NOT NULL
UNION ALL
SELECT 'Product-category assignments:' as metric, COUNT(*) as count
FROM oaf.product_categories
UNION ALL
SELECT 'Products categorized:' as metric, COUNT(DISTINCT product_id) as count
FROM oaf.product_categories;

-- Top categories by product count
SELECT 
    c.name,
    COUNT(pc.product_id) as product_count
FROM oaf.categories c
LEFT JOIN oaf.product_categories pc ON c.id = pc.category_id
WHERE c.wp_term_id IS NOT NULL
GROUP BY c.id
ORDER BY product_count DESC
LIMIT 10;

